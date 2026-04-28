// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract BlueCarbonRegistry is ERC721URIStorage, Ownable {
    uint256 public constant WAD = 1e18;
    uint256 public constant BASE_RATE_WAD = 8e17; // 0.8
    uint256 public constant TIME_YEARS_WAD = 1e18; // 1 year
    uint256 public constant TOLERANCE_BPS = 500; // 5%

    enum EcosystemType {
        Mangrove,
        Seagrass,
        Saltmarsh
    }

    struct Plot {
        string plotId;
        address farmer;
        uint256 areaWad;
        EcosystemType ecosystemType;
        bool exists;
        bool credited;
    }

    mapping(string => Plot) public plots;
    mapping(uint256 => string) public tokenIdToPlotId;
    uint256 public nextTokenId = 1;

    event PlotRegistered(string indexed plotId, address indexed farmer, uint256 areaWad, EcosystemType ecosystemType);
    event CreditMinted(string indexed plotId, uint256 indexed tokenId, address indexed farmer, uint256 submittedCreditsWad, string reportIpfsHash);

    constructor(address initialOwner) ERC721("Blue Carbon Credit", "BCC") Ownable(initialOwner) {}

    function registerPlot(
        string memory plotId,
        address farmer,
        uint256 areaWad,
        uint8 ecosystemTypeRaw
    ) external onlyOwner {
        require(!plots[plotId].exists, "Plot already exists");
        require(farmer != address(0), "Invalid farmer");
        require(areaWad > 0, "Invalid area");
        require(ecosystemTypeRaw <= uint8(EcosystemType.Saltmarsh), "Invalid ecosystem");

        EcosystemType eco = EcosystemType(ecosystemTypeRaw);
        plots[plotId] = Plot({
            plotId: plotId,
            farmer: farmer,
            areaWad: areaWad,
            ecosystemType: eco,
            exists: true,
            credited: false
        });

        emit PlotRegistered(plotId, farmer, areaWad, eco);
    }

    function mintCredit(
        address farmer,
        string memory plotId,
        uint256 submittedCreditsWad,
        string memory reportIpfsHash
    ) external onlyOwner returns (uint256 tokenId) {
        Plot storage plot = plots[plotId];
        require(plot.exists, "Plot does not exist");
        require(!plot.credited, "Credits already minted");
        require(plot.farmer == farmer, "Farmer mismatch");
        require(submittedCreditsWad > 0, "Invalid credits");
        require(bytes(reportIpfsHash).length > 0, "Missing report hash");

        uint256 expectedCreditsWad = _calculateExpectedCredits(plot.areaWad, plot.ecosystemType);
        uint256 maxDeviation = (expectedCreditsWad * TOLERANCE_BPS) / 10000;
        uint256 diff = submittedCreditsWad > expectedCreditsWad
            ? submittedCreditsWad - expectedCreditsWad
            : expectedCreditsWad - submittedCreditsWad;
        require(diff <= maxDeviation, "Credits outside tolerance");

        tokenId = nextTokenId++;
        _safeMint(farmer, tokenId);
        _setTokenURI(tokenId, reportIpfsHash);
        plot.credited = true;
        tokenIdToPlotId[tokenId] = plotId;

        emit CreditMinted(plotId, tokenId, farmer, submittedCreditsWad, reportIpfsHash);
    }

    function previewExpectedCredits(string memory plotId) external view returns (uint256) {
        Plot memory plot = plots[plotId];
        require(plot.exists, "Plot does not exist");
        return _calculateExpectedCredits(plot.areaWad, plot.ecosystemType);
    }

    function _calculateExpectedCredits(uint256 areaWad, EcosystemType ecosystemType) internal pure returns (uint256) {
        uint256 densityWad = _densityFor(ecosystemType);
        return _mulWad(_mulWad(_mulWad(areaWad, BASE_RATE_WAD), densityWad), TIME_YEARS_WAD);
    }

    function _densityFor(EcosystemType ecosystemType) internal pure returns (uint256) {
        if (ecosystemType == EcosystemType.Mangrove) return 135e16; // 1.35
        if (ecosystemType == EcosystemType.Seagrass) return 110e16; // 1.10
        return 95e16; // 0.95
    }

    function _mulWad(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a * b) / WAD;
    }
}
