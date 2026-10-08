const crypto = require('crypto');
const { ethers } = require('ethers');

// Wallet-signature login: the client signs a one-time nonce message with MetaMask,
// the backend recovers the signer and issues a short-lived HMAC session token.

const NONCE_TTL_MS = 5 * 60 * 1000;
const TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS || 12 * 60 * 60 * 1000);

const AUTH_SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.AUTH_SECRET) {
  console.warn('AUTH_SECRET not set in backend/.env; using a random secret (sessions reset on restart).');
}

const pendingNonces = new Map();

const isWalletAddress = (value) => typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);

const buildLoginMessage = (address, nonce, issuedAt) => [
  'Blue Carbon Registry login',
  `Wallet: ${address}`,
  `Nonce: ${nonce}`,
  `Issued At: ${issuedAt}`,
].join('\n');

const createLoginChallenge = (rawAddress) => {
  if (!isWalletAddress(rawAddress)) {
    throw new Error('Invalid wallet address');
  }
  const address = rawAddress.toLowerCase();
  const nonce = crypto.randomBytes(16).toString('hex');
  const issuedAt = new Date().toISOString();
  const message = buildLoginMessage(address, nonce, issuedAt);
  pendingNonces.set(address, { message, expiresAt: Date.now() + NONCE_TTL_MS });
  return message;
};

const sign = (payload) => crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');

const verifyLoginSignature = (rawAddress, signature) => {
  if (!isWalletAddress(rawAddress) || typeof signature !== 'string') {
    throw new Error('Invalid login request');
  }
  const address = rawAddress.toLowerCase();
  const pending = pendingNonces.get(address);
  pendingNonces.delete(address);
  if (!pending || pending.expiresAt < Date.now()) {
    throw new Error('Login challenge expired. Please try again.');
  }

  const recovered = ethers.verifyMessage(pending.message, signature).toLowerCase();
  if (recovered !== address) {
    throw new Error('Signature does not match wallet address');
  }

  const payload = Buffer.from(JSON.stringify({ address, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

const readToken = (token) => {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (!isWalletAddress(data.address) || data.exp < Date.now()) return null;
    return data.address;
  } catch {
    return null;
  }
};

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const address = header.startsWith('Bearer ') ? readToken(header.slice(7)) : null;
  if (!address) {
    return res.status(401).json({ success: false, error: 'Wallet authentication required' });
  }
  req.walletAddress = address;
  next();
};

module.exports = {
  isWalletAddress,
  createLoginChallenge,
  verifyLoginSignature,
  requireAuth,
};
