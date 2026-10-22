// Readiness check before a demo:  npm run check  [-- http://localhost:5173]
const base = (process.argv[2] || process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

const labels = {
  database: 'Database (MongoDB)',
  mlService: 'Satellite analysis (ML service + models)',
  gee: 'Google Earth Engine sign-in',
  blockchain: 'Blockchain + contract',
  pinata: 'IPFS uploads via Pinata (optional)',
};

try {
  const res = await fetch(`${base}/api/system/status`, { signal: AbortSignal.timeout(10000) });
  const data = await res.json();
  let ready = true;
  console.log(`\nSystem check for ${base}\n`);
  for (const [key, label] of Object.entries(labels)) {
    const ok = data.services[key];
    if (!ok && key !== 'pinata') ready = false;
    console.log(`  ${ok ? '✔' : key === 'pinata' ? '–' : '✖'} ${label.padEnd(44)} ${data.details?.[key] || (ok ? 'ok' : 'not ready')}`);
  }
  console.log(ready ? '\nReady for the demo.\n' : '\nNot ready: fix the items marked ✖ (see README "Troubleshooting").\n');
  process.exit(ready ? 0 : 1);
} catch (error) {
  console.error(`\nCould not reach ${base} (${error.message}). Is the frontend running, and is the backend behind it?\n`);
  process.exit(1);
}
