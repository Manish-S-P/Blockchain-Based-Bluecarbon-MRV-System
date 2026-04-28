const crypto = require('crypto');

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

  try {
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

    if (!response.ok) {
      throw new Error(`Pinata responded with ${response.status}`);
    }

    const data = await response.json();
    return `ipfs://${data.IpfsHash}`;
  } catch (error) {
    console.warn('Pinata upload failed, using fallback hash:', error.message);
    return fallbackIpfsHash(reportPayload);
  }
};

module.exports = {
  uploadMrvReportToIpfs,
};
