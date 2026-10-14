// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title Blue Carbon Registry (prototype)
/// @notice Mangrove MRV with a sealed (commit-reveal) baseline and on-chain credit calculation.
///
/// Yearly cycle per plot (see docs/baseline-and-verification.md):
///   1. commitBaseline     - day 0: only a hash of the baseline forecast is stored.
///   2. recordObservation  - every quarter: the plot's measured tree-carbon change.
///   3. finalizeYear       - month 12: the baseline is revealed and re-hashed (BaselineMismatch
///                           if it differs), credits are computed here and minted as an NFT
///                           whose token URI is the IPFS audit report.
///
/// All carbon values are t CO2 per hectare with 18 decimals ("wad"). The owner is the MRV
/// backend (oracle): the chain proves that inputs were fixed in advance and that the credit
/// rule was applied, not that the satellite model is correct.
contract BlueCarbonRegistry is ERC721URIStorage, Ownable {
    int256 private constant WAD = 1e18;

    // ---- Credit policy (mirrored in backend/services/credits.js) ----
    /// Soil accrual: 0.5 t C/ha/yr (India BEE BM FR05.001) x 44/12 = 1.8333 t CO2/ha/yr.
    int256 public constant SOIL_CO2_PER_HA_YEAR = 1_833_333_333_333_333_333;
    uint256 public constant SOIL_MAX_YEARS = 20;
    /// Cover factor: no soil accrual below 15% mangrove cover, full rate from 50%.
    uint256 public constant COVER_MIN_BPS = 1_500;
    uint256 public constant COVER_FULL_BPS = 5_000;
    /// Non-permanence buffer withheld from every issuance.
    uint256 public constant BUFFER_BPS = 1_200;
    uint8 public constant MIN_USABLE_QUARTERS = 2;

    enum EcosystemType { Mangrove, Seagrass, Saltmarsh }
    enum Outcome { Minted, NoProvableGain, AnomalyDetected, InsufficientData }

    struct Plot {
        string plotId;
        address farmer;
        uint256 areaWad;            // hectares
        EcosystemType ecosystemType;
        bool exists;
        uint16 year;                // current monitoring year, starting at 1
        int256 cumulativeTreeGain;  // sum of yearly additional tree gains (t CO2/ha)
        int256 cumulativeSoil;      // soil accrual credited so far (t CO2/ha)
        uint256 issuedWad;          // credits already issued (t CO2)
    }

    struct Year {
        bytes32 commitment;
        uint64 dayZero;             // unix time the year started
        uint8 observations;
        bool finalized;
    }

    struct Observation {
        bool recorded;
        bool usable;                // clear data and model applicable
        bool anomaly;               // damage detected this quarter
        int256 plotChange;          // tree carbon now - same season a year earlier
        uint256 plotHalfWidth;      // 90% half-width of that change
        uint16 coverBps;            // mangrove cover of the plot, basis points
        bytes32 dataHash;           // hash of the quarter's full evidence (off-chain JSON)
    }

    struct Reveal {
        int256[4] baselineChange;     // committed forecast, per quarter
        uint256[4] baselineHalfWidth;
        bytes32 auditHash;            // sha256 of the baseline audit file (donors, weights, ...)
        bytes32 salt;
        int256[4] actualDonorChange;  // what the donors really did (can only raise the baseline)
    }

    mapping(string => Plot) public plots;
    mapping(string => mapping(uint16 => Year)) public yearRecords;
    mapping(string => mapping(uint16 => mapping(uint8 => Observation))) public observations;
    mapping(uint256 => string) public tokenIdToPlotId;
    mapping(uint256 => uint256) public tokenCreditsWad;
    uint256 public nextTokenId = 1;

    error BaselineMismatch();

    event PlotRegistered(string indexed plotId, address indexed farmer, uint256 areaWad, EcosystemType ecosystemType);
    event BaselineCommitted(string indexed plotId, uint16 year, bytes32 commitment, uint64 dayZero);
    event ObservationRecorded(string indexed plotId, uint16 year, uint8 quarter, int256 plotChange,
                              uint256 plotHalfWidth, uint16 coverBps, bool usable, bool anomaly, bytes32 dataHash);
    event YearFinalized(string indexed plotId, uint16 year, Outcome outcome, int256 yearGain, uint256 yearHalfWidth,
                        int256 provenTreeGain, int256 cumulativeSoil, uint256 credits, uint256 tokenId, string reportIpfsHash);
    event CreditMinted(string indexed plotId, uint256 indexed tokenId, address indexed farmer, uint256 submittedCreditsWad, string reportIpfsHash);

    constructor(address initialOwner) ERC721("Blue Carbon Credit", "BCC") Ownable(initialOwner) {}

    // ------------------------------------------------------------------ registration

    function registerPlot(string memory plotId, address farmer, uint256 areaWad, uint8 ecosystemTypeRaw) external onlyOwner {
        require(!plots[plotId].exists, "Plot already exists");
        require(farmer != address(0), "Invalid farmer");
        require(areaWad > 0, "Invalid area");
        require(ecosystemTypeRaw <= uint8(EcosystemType.Saltmarsh), "Invalid ecosystem");

        Plot storage plot = plots[plotId];
        plot.plotId = plotId;
        plot.farmer = farmer;
        plot.areaWad = areaWad;
        plot.ecosystemType = EcosystemType(ecosystemTypeRaw);
        plot.exists = true;
        plot.year = 1;
        emit PlotRegistered(plotId, farmer, areaWad, plot.ecosystemType);
    }

    // ------------------------------------------------------------------ yearly cycle

    /// @notice Seal the baseline for the plot's current year. Only its hash is stored.
    function commitBaseline(string memory plotId, bytes32 commitment, uint64 dayZero) external onlyOwner {
        Plot storage plot = plots[plotId];
        require(plot.exists, "Plot does not exist");
        Year storage y = yearRecords[plotId][plot.year];
        require(y.commitment == bytes32(0), "Baseline already committed");
        require(commitment != bytes32(0), "Empty commitment");
        y.commitment = commitment;
        y.dayZero = dayZero;
        emit BaselineCommitted(plotId, plot.year, commitment, dayZero);
    }

    function recordObservation(
        string memory plotId, uint8 quarter, int256 plotChange, uint256 plotHalfWidth,
        uint16 coverBps, bool usable, bool anomaly, bytes32 dataHash
    ) external onlyOwner {
        Plot storage plot = plots[plotId];
        require(plot.exists, "Plot does not exist");
        Year storage y = yearRecords[plotId][plot.year];
        require(y.commitment != bytes32(0), "Baseline not committed");
        require(!y.finalized, "Year finalized");
        require(quarter >= 1 && quarter <= 4, "Quarter must be 1-4");
        Observation storage o = observations[plotId][plot.year][quarter];
        require(!o.recorded, "Quarter already recorded");
        require(coverBps <= 10_000, "Invalid cover");

        observations[plotId][plot.year][quarter] = Observation(true, usable, anomaly, plotChange, plotHalfWidth, coverBps, dataHash);
        y.observations += 1;
        emit ObservationRecorded(plotId, plot.year, quarter, plotChange, plotHalfWidth, coverBps, usable, anomaly, dataHash);
    }

    /// @notice The commitment formula. Public so anyone can re-check a revealed baseline.
    function computeCommitment(
        string memory plotId, uint16 year, uint64 dayZero,
        int256[4] memory baselineChange, uint256[4] memory baselineHalfWidth, bytes32 auditHash, bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(plotId, year, dayZero, baselineChange, baselineHalfWidth, auditHash, salt));
    }

    /// @notice Reveal the baseline, compute the year's credits on-chain and mint them.
    function finalizeYear(string memory plotId, Reveal memory r, string memory reportIpfsHash)
        external onlyOwner returns (uint256 credits, uint256 tokenId)
    {
        Plot storage plot = plots[plotId];
        require(plot.exists, "Plot does not exist");
        uint16 yearNo = plot.year;
        Year storage y = yearRecords[plotId][yearNo];
        require(y.commitment != bytes32(0), "Baseline not committed");
        require(y.observations == 4, "Need 4 quarterly observations");
        require(bytes(reportIpfsHash).length > 0, "Missing report hash");

        bytes32 recomputed = computeCommitment(plotId, yearNo, y.dayZero, r.baselineChange, r.baselineHalfWidth, r.auditHash, r.salt);
        if (recomputed != y.commitment) revert BaselineMismatch();
        y.finalized = true;
        plot.year = yearNo + 1;

        (Outcome outcome, int256 yearGain, uint256 yearHalf, uint256 minCover) = _yearResult(plotId, yearNo, r);
        if (outcome != Outcome.Minted) {
            emit YearFinalized(plotId, yearNo, outcome, 0, 0, 0, plot.cumulativeSoil, 0, 0, reportIpfsHash);
            return (0, 0);
        }

        // Tree carbon: gains add up over the years; the uncertainty of the total is that of
        // one start-to-end comparison, so it does not grow with the number of years.
        plot.cumulativeTreeGain += yearGain;
        int256 provenTree = _provenGain(plot.cumulativeTreeGain, yearHalf);

        if (yearNo <= SOIL_MAX_YEARS) {
            plot.cumulativeSoil += (SOIL_CO2_PER_HA_YEAR * int256(_coverFactorBps(minCover))) / 10_000;
        }

        uint256 perHa = uint256(provenTree + plot.cumulativeSoil);
        uint256 total = (perHa * plot.areaWad) / uint256(WAD);
        uint256 afterBuffer = (total * (10_000 - BUFFER_BPS)) / 10_000;
        credits = afterBuffer > plot.issuedWad ? afterBuffer - plot.issuedWad : 0;

        if (credits == 0) {
            emit YearFinalized(plotId, yearNo, Outcome.NoProvableGain, yearGain, yearHalf, provenTree, plot.cumulativeSoil, 0, 0, reportIpfsHash);
            return (0, 0);
        }

        plot.issuedWad += credits;
        tokenId = nextTokenId++;
        _safeMint(plot.farmer, tokenId);
        _setTokenURI(tokenId, reportIpfsHash);
        tokenIdToPlotId[tokenId] = plotId;
        tokenCreditsWad[tokenId] = credits;
        emit CreditMinted(plotId, tokenId, plot.farmer, credits, reportIpfsHash);
        emit YearFinalized(plotId, yearNo, Outcome.Minted, yearGain, yearHalf, provenTree, plot.cumulativeSoil, credits, tokenId, reportIpfsHash);
    }

    // ------------------------------------------------------------------ credit rules

    /// Average additional gain and its half-width over usable quarters.
    function _yearResult(string memory plotId, uint16 yearNo, Reveal memory r)
        private view returns (Outcome, int256 gain, uint256 half, uint256 minCover)
    {
        uint8 usable;
        minCover = 10_000;
        for (uint8 q = 1; q <= 4; q++) {
            Observation storage o = observations[plotId][yearNo][q];
            if (o.anomaly) return (Outcome.AnomalyDetected, 0, 0, 0);
            if (!o.usable) continue;
            // Never credit growth the donors show would have happened anyway.
            int256 baseline = r.baselineChange[q - 1] > r.actualDonorChange[q - 1] ? r.baselineChange[q - 1] : r.actualDonorChange[q - 1];
            gain += o.plotChange - baseline;
            half += Math.sqrt(o.plotHalfWidth * o.plotHalfWidth + r.baselineHalfWidth[q - 1] * r.baselineHalfWidth[q - 1]);
            if (o.coverBps < minCover) minCover = o.coverBps;
            usable++;
        }
        if (usable < MIN_USABLE_QUARTERS) return (Outcome.InsufficientData, 0, 0, 0);
        return (Outcome.Minted, gain / int256(uint256(usable)), half / usable, minCover);
    }

    /// CDM AR-TOOL14 v4.2: deduct a share of the 90% half-width depending on relative uncertainty.
    function _provenGain(int256 gain, uint256 halfWidth) private pure returns (int256) {
        if (gain <= 0) return 0;
        uint256 relBps = (halfWidth * 10_000) / uint256(gain);
        uint256 shareBps = relBps <= 1_000 ? 0 : relBps <= 1_500 ? 2_500 : relBps <= 2_000 ? 5_000 : relBps <= 3_000 ? 7_500 : 10_000;
        int256 proven = gain - int256((halfWidth * shareBps) / 10_000);
        return proven > 0 ? proven : int256(0);
    }

    function _coverFactorBps(uint256 coverBps) private pure returns (uint256) {
        if (coverBps <= COVER_MIN_BPS) return 0;
        if (coverBps >= COVER_FULL_BPS) return 10_000;
        return ((coverBps - COVER_MIN_BPS) * 10_000) / (COVER_FULL_BPS - COVER_MIN_BPS);
    }
}
