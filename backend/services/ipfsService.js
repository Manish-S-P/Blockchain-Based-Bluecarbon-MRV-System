const crypto = require('crypto');

// Used only when Pinata credentials are not configured (local development).
const fallbackIpfsHash = (payload) => {
  const deterministicHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return `ipfs://${deterministicHash}`;
};

const uploadMrvReportToIpfs = async (reportPayload) => {
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  if (!apiKey || !apiSecret) {
    return fallbackIpfsHash(reportPayload);
  }

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    },
    body: JSON.stringify({
      pinataContent: reportPayload,
      pinataMetadata: {
        name: `mrv-report-${reportPayload.plotId}`,
      },
    }),
  });

  // Pinata is configured, so a failed upload must not be replaced by a fake hash
  // that would end up as the NFT's token URI.
  if (!response.ok) {
    throw new Error(`Pinata upload failed with status ${response.status}`);
  }

  const data = await response.json();
  return `ipfs://${data.IpfsHash}`;
};

module.exports = {
  uploadMrvReportToIpfs,
};
