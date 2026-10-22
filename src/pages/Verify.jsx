// Public verification: anyone (no login) can inspect a plot and re-check its sealed baseline.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AbiCoder, keccak256 } from 'ethers';
import { ShieldCheck, CheckCircle2, XCircle, Download, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { Pill, BaselineVsObserved, CreditBreakdown, QuarterBaselineTable } from '../components/mrv';
import { fmt, shortHash, windowLabel, quarterHealth } from '../lib/format';

const sha256Hex = async (text) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `0x${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
};

// Same formula as BlueCarbonRegistry.computeCommitment.
const commitmentOf = (plotId, year, baseline) => keccak256(AbiCoder.defaultAbiCoder().encode(
  ['string', 'uint16', 'uint64', 'int256[4]', 'uint256[4]', 'bytes32', 'bytes32'],
  [plotId, year, baseline.dayZeroUnix, baseline.changesWad, baseline.halfWidthsWad, baseline.auditHash, baseline.salt],
));

const Check = ({ ok, children }) => (
  <li className="flex items-start gap-2">
    {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
    <span className={ok ? 'text-slate-200' : 'text-rose-200'}>{children}</span>
  </li>
);

const YearVerification = ({ plotId, result, onChain }) => {
  const [checks, setChecks] = useState(null);
  const baseline = result.baseline;
  const audit = JSON.parse(baseline.auditJson);

  const verify = async () => {
    const auditHash = await sha256Hex(baseline.auditJson);
    const commitment = commitmentOf(plotId, result.year, baseline);
    const forecastMatches = audit.forecast.every((f, i) => Math.abs(Number(baseline.changesWad[i]) / 1e18 - f.change) < 1e-6);
    setChecks({
      auditHash: auditHash === baseline.auditHash,
      commitment: commitment === baseline.commitment,
      onChain: onChain ? onChain.commitment === commitment : null,
      forecastMatches,
    });
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([baseline.auditJson], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${plotId}-year${result.year}-baseline-audit.json` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Year {result.year}: {result.outcome === 'Minted' ? `${fmt(result.credits, 2)} credits issued` : result.outcome.replace(/([A-Z])/g, ' $1').trim()}</h2>
          <p className="text-slate-400">Day 0: {baseline.dayZero} ({baseline.mode}) · finished {result.finalizedAt?.slice(0, 10)}</p>
        </div>
        {result.tokenId && <Pill tone="good">Credit NFT #{result.tokenId}</Pill>}
      </div>

      <div>
        <h3 className="text-white font-medium mb-1">Check it yourself</h3>
        <p className="text-sm text-slate-400 mb-3">
          These checks run in your browser. They prove the baseline used at month 12 is exactly the one sealed on the blockchain at day 0, so it could not be adjusted after seeing the results.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={verify} className="btn-primary px-4 py-2 text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Verify the baseline</button>
          <button onClick={download} className="btn-ghost px-4 py-2 text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Download audit file</button>
        </div>
        {checks && (
          <ul className="mt-3 space-y-1.5 text-sm">
            <Check ok={checks.auditHash}>The audit file's SHA-256 fingerprint matches the one inside the seal ({shortHash(baseline.auditHash)}).</Check>
            <Check ok={checks.forecastMatches}>The forecast numbers in the audit file are the ones that were sealed.</Check>
            <Check ok={checks.commitment}>Re-hashing plot, year, day 0, forecast, audit fingerprint and the revealed salt gives the seal {shortHash(baseline.commitment)}.</Check>
            {checks.onChain === null
              ? <li className="text-slate-400 text-sm">The blockchain is not reachable from this server, so the on-chain copy could not be compared.</li>
              : <Check ok={checks.onChain}>That seal is the one stored on the blockchain at day 0 (contract {shortHash(onChain.contract)}).</Check>}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-white font-medium mb-2">The baseline: {audit.donors.length} look-alike mangrove spots</h3>
        <p className="text-sm text-slate-400 mb-2">
          Chosen from {audit.candidates} unenrolled mangrove pixels 1–30 km away and weighted to match this plot's carbon over the year before day 0 (fit error ±{fmt(audit.fitRmse, 1)} t CO₂/ha).
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {audit.donors.map((d) => (
            <span key={`${d.longitude},${d.latitude}`} className="rounded border border-white/10 px-2 py-1 text-slate-300 font-mono">
              {d.latitude.toFixed(4)}, {d.longitude.toFixed(4)} · {Math.round(d.weight * 100)}%
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium mb-2">Plot vs baseline</h3>
        <BaselineVsObserved calculation={result.calculation} windows={baseline.monitoringWindows} />
      </div>
      <QuarterBaselineTable calculation={result.calculation} windows={baseline.monitoringWindows} />
      <div>
        <h3 className="text-white font-medium mb-2">Credit calculation</h3>
        <CreditBreakdown calculation={result.calculation} />
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-4 gap-y-1 text-sm">
        {[
          ['Full report (IPFS)', result.reportIpfsHash],
          ['Credit transaction', result.txHash],
          ['Seal (commitment)', baseline.commitment],
          ['Revealed salt', baseline.salt],
        ].map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-slate-300 font-mono break-all">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const Verify = () => {
  const { plotId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/public/plots/${encodeURIComponent(plotId)}`)
      .then((res) => res.json())
      .then((json) => (json.success ? setData(json) : setError(json.error || 'Plot not found')))
      .catch((err) => setError(err.message));
  }, [plotId]);

  if (error) return <div className="p-8 text-center text-rose-200">{error}</div>;
  if (!data) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>;

  const { plot, chain } = data;
  const sealed = plot.currentBaseline;
  const checks = plot.quarterlyChecks.filter((c) => c.year === plot.year);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <Link to="/verify" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Public registry</Link>
      <div>
        <p className="text-emerald-400 font-medium">Public verification · no login needed</p>
        <h1 className="text-3xl font-bold text-white">Mangrove plot {plot.plotId}</h1>
        <p className="text-slate-400 mt-1">
          {fmt(plot.area, 2)} hectares · registered {plot.registeredAt?.slice(0, 10)} · satellite check at registration: {plot.initialIdentifiedEcosystem} ({Math.round((plot.initialEcosystemConfidence || 0) * 100)}% sure)
          · {fmt(plot.carbonCredits, 2)} credits issued so far. Personal details of the owner are not shown.
        </p>
      </div>

      {plot.coordinates?.length > 2 && (
        <div className="h-72 rounded-xl overflow-hidden border border-white/15 relative z-0">
          <MapContainer bounds={plot.coordinates} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Imagery &copy; Esri" />
            <Polygon positions={plot.coordinates} pathOptions={{ color: '#34d399', weight: 2, fillOpacity: 0.2 }} />
          </MapContainer>
        </div>
      )}

      {sealed && (
        <div className="card p-5 space-y-2">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Lock className="w-5 h-5 text-emerald-400" /> Year {plot.year}: baseline sealed, monitoring in progress</h2>
          <p className="text-slate-400">
            Day 0: {sealed.dayZero}. The forecast is hidden until the end of the year; only its seal is public. {checks.length} of 4 quarterly checks recorded.
          </p>
          <p className="text-sm font-mono text-slate-300 break-all">Seal: {sealed.commitment}</p>
          {chain?.[plot.year] && (
            <p className="text-sm">
              {chain[plot.year].commitment === sealed.commitment
                ? <span className="text-emerald-300">✓ Matches the seal stored on the blockchain.</span>
                : <span className="text-rose-300">✗ Does not match the blockchain record.</span>}
            </p>
          )}
        </div>
      )}

      {checks.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xl font-semibold text-white mb-3">Quarterly checks · year {plot.year}</h2>
          <ul className="divide-y divide-white/10">
            {checks.map((c) => {
              const health = quarterHealth(c.anomalyStatus);
              return (
                <li key={c.quarter} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-white">{windowLabel(c.window)}</p>
                    <p className="text-sm text-slate-400">
                      {c.carbon?.status === 'ok' ? `Tree carbon ${fmt(c.carbon.treeCo2.mid)} t CO₂/ha (${fmt(c.carbon.treeCo2.low)}–${fmt(c.carbon.treeCo2.high)})` : 'No carbon estimate (clouds)'}
                      {c.carbon?.explanation?.[0] && ` · main driver: ${c.carbon.explanation[0].factor}`}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">Evidence fingerprint {shortHash(c.dataHash)} · on-chain record {shortHash(c.txHash)}</p>
                  </div>
                  <Pill tone={health.tone} icon={health.icon}>{health.text}</Pill>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {[...plot.years].reverse().map((result) => (
        <YearVerification key={result.year} plotId={plot.plotId} result={result} onChain={chain?.[result.year]} />
      ))}

      {!sealed && plot.years.length === 0 && <p className="text-slate-400">This plot has not started its first monitoring year yet.</p>}
    </div>
  );
};

export const Registry = () => {
  const [plots, setPlots] = useState(null);
  useEffect(() => {
    fetch('/api/public/plots').then((r) => r.json()).then((json) => setPlots(json.plots || []));
  }, []);
  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <div>
        <p className="text-emerald-400 font-medium">Public registry · no login needed</p>
        <h1 className="text-3xl font-bold text-white">All registered plots</h1>
        <p className="text-slate-400 mt-1">Open any plot to see its satellite checks, its sealed baseline and its credits, and to verify them yourself.</p>
      </div>
      {!plots ? <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /> : (
        <div className="card divide-y divide-white/10">
          {plots.length === 0 && <p className="p-4 text-slate-400">No plots registered yet.</p>}
          {plots.map((p) => (
            <Link key={p.plotId} to={`/verify/${p.plotId}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-white/[0.03]">
              <div>
                <p className="text-white font-medium font-mono">{p.plotId}</p>
                <p className="text-sm text-slate-400">{fmt(p.area, 2)} ha · {p.status} · year {p.year}</p>
              </div>
              <span className="text-emerald-300">{fmt(p.carbonCredits, 2)} credits</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Verify;
