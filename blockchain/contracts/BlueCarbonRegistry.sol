// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

// Credits are computed off-chain by the MRV pipeline (satellite carbon model + official
// conversion factors + uncertainty discount + buffer) and recorded here together with the
// IPFS hash of the audit report that lets anyone recompute them.
contract BlueCarbonRegistry is ERC721URIStorage, Ownable {

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
    mapping(uint256 => uint256) public tokenCreditsWad; // tonnes CO2e, 18 decimals
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

        tokenId = nextTokenId++;
        _safeMint(farmer, tokenId);
        _setTokenURI(tokenId, reportIpfsHash);
        plot.credited = true;
        tokenIdToPlotId[tokenId] = plotId;
        tokenCreditsWad[tokenId] = submittedCreditsWad;

        emit CreditMinted(plotId, tokenId, farmer, submittedCreditsWad, reportIpfsHash);
    }
}
