// End-to-end test of a whole monitoring year, through the same API the app uses:
//   npm run smoke-test  [-- http://localhost:5173]  [--keep]
// Registers a small plot in the Thane Creek mangroves (Mumbai), replays the last year
// (seal baseline -> 4 quarterly checks -> reveal and credit), re-checks the seal like the
// public page does, then deletes the plot again (unless --keep). Takes about 1-2 minutes.
import crypto from 'node:crypto';
import { ethers } from 'ethers';

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith('http')) || process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const keep = args.includes('--keep');
const t0 = Date.now();
const log = (...m) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(3)}s]`, ...m);

const call = async (method, path, body, token) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(`${method} ${path} -> ${res.status}: ${data.error}`);
  return data;
};

// ~120 m square plot at a random spot in the creek's mangroves (south of the demo jump-to point).
const plotAround = () => {
  const lat = 19.139 + (Math.random() - 0.5) * 0.004;
  const lon = 72.9591 + (Math.random() - 0.5) * 0.002;
  const dLat = 60 / 111320;
  const dLon = 60 / (111320 * Math.cos((lat * Math.PI) / 180));
  return [[lat - dLat, lon - dLon], [lat - dLat, lon + dLon], [lat + dLat, lon + dLon], [lat + dLat, lon - dLon]];
};

let token;
let project;
try {
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address.toLowerCase();
  const { message } = await call('POST', '/api/auth/nonce', { address });
  ({ token } = await call('POST', '/api/auth/verify', { address, signature: await wallet.signMessage(message) }));
  log('Signed in with a throwaway test wallet');

  // A random spot may overlap an existing plot or touch a road, so try a few.
  for (let attempt = 1; !project; attempt += 1) {
    try {
      ({ project } = await call('POST', '/api/projects', {
        name: 'Smoke Test', phone: '0000000000', address: 'Thane Creek, Mumbai (test)', vegetationType: 'mangrove', coordinates: plotAround(),
      }, token));
    } catch (error) {
      if (attempt >= 4) throw error;
      log(`Spot ${attempt} not accepted (${error.message.split(': ').slice(1).join(': ').slice(0, 80)}...), trying another`);
    }
  }
  log(`Registered ${project.plotId}: ${project.area} ha, satellite says ${project.initialIdentifiedEcosystem} (${Math.round(project.initialEcosystemConfidence * 100)}%)`);

  const sealed = await call('POST', `/api/mrv/baseline/${project.plotId}`, { mode: 'replay' }, token);
  const b = sealed.project.baseline;
  log(`Baseline sealed: day 0 ${b.dayZero}, ${b.summary.donors} look-alikes, fit ±${b.summary.fitRmse} t CO2/ha`);

  for (let q = 1; q <= 4; q += 1) {
    const { cycle } = await call('POST', `/api/mrv/quarterly-run/${project.plotId}`, {}, token);
    const o = cycle.observation;
    log(`Quarter ${q} (${cycle.windowStart}): ${cycle.anomalyStatus}, change ${o.usable ? `${o.plotChange.toFixed(1)} ± ${o.plotHalfWidth.toFixed(1)}` : 'not usable'} t CO2/ha`);
  }

  const { result } = await call('POST', `/api/mrv/annual-finalize/${project.plotId}`, {}, token);
  log(`Year finished: ${result.outcome}, ${result.credits.toFixed(4)} credits (backend mirror ${result.calculation.credits.toFixed(4)}), on-chain: ${result.onChain}`);

  const { plot, chain } = await call('GET', `/api/public/plots/${project.plotId}`);
  const year = plot.years[0].baseline;
  const auditOk = `0x${crypto.createHash('sha256').update(year.auditJson).digest('hex')}` === year.auditHash;
  const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ['string', 'uint16', 'uint64', 'int256[4]', 'uint256[4]', 'bytes32', 'bytes32'],
    [project.plotId, 1, year.dayZeroUnix, year.changesWad, year.halfWidthsWad, year.auditHash, year.salt],
  ));
  const sealOk = commitment === year.commitment;
  const chainOk = chain['1'] ? chain['1'].commitment === commitment : null;
  log(`Public re-check: audit file ${auditOk ? 'OK' : 'FAIL'}, seal ${sealOk ? 'OK' : 'FAIL'}, on-chain ${chainOk === null ? 'not configured' : chainOk ? 'OK' : 'FAIL'}`);

  const passed = auditOk && sealOk && chainOk !== false && Math.abs(result.credits - result.calculation.credits) < 1e-6;
  console.log(passed ? '\nSMOKE TEST PASSED\n' : '\nSMOKE TEST FAILED\n');
  process.exitCode = passed ? 0 : 1;
} catch (error) {
  console.error(`\nSMOKE TEST FAILED: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  if (project && token && !keep) {
    await call('DELETE', `/api/projects/${project._id}`, null, token).catch(() => {});
    log('Deleted the test plot (use --keep to keep it)');
  }
}
