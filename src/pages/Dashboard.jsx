import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '../context/walletContextValue';
import {
  Plus, RefreshCcw, ShieldCheck, CheckCircle2, Circle, Loader2, Trash2, Satellite, AlertTriangle,
  Award, MapPin, ChevronDown, ChevronRight, X, Lock, PlayCircle, ExternalLink, History,
} from 'lucide-react';
import { Pill, TwinChart, BaselineVsObserved, CreditBreakdown, QuarterBaselineTable } from '../components/mrv';
import { fmt, shortHash, windowLabel, quarterHealth } from '../lib/format';

const percent = (value) => `${Math.round((value || 0) * 100)}%`;

const SERVICE_NAMES = {
  database: 'database',
  mlService: 'satellite analysis',
  pinata: 'IPFS report storage',
  blockchain: 'blockchain',
  gee: 'Google Earth Engine',
};

const readableError = (raw, fallback) => {
  let msg = raw || fallback;
  const reason = msg.match(/reason="([^"]+)"/);
  if (reason) msg = reason[1];
  if (msg.toLowerCase().includes('insufficient funds')) msg = 'The backend wallet has no test tokens left to pay for the blockchain transaction.';
  return msg.length > 300 ? `${msg.slice(0, 300)}…` : msg;
};

const currentCycles = (p) => (p.monitoringCycles || []).filter((c) => (c.year || 1) === p.year);
const lastResult = (p) => (p.yearResults || []).at(-1) || null;

// The single next thing to do for a plot.
const nextStep = (p) => {
  const cycles = currentCycles(p);
  if (!p.baseline) {
    if (p.yearResults?.length && p.mode === 'replay') return { id: 'replay-done' };
    return { id: 'lock' };
  }
  if (cycles.length < 4) return { id: p.mode === 'replay' ? 'check-replay' : 'check-live' };
  return { id: 'finalize' };
};

const statusPill = (p) => {
  const result = lastResult(p);
  if (result?.outcome === 'Minted' && !p.baseline) return <Pill tone="good" icon={Award}>{fmt(p.carbonCredits, 2)} credits</Pill>;
  if (!p.baseline && result) return <Pill tone="muted">Year {result.year} done</Pill>;
  if (!p.baseline) return <Pill tone="warn">Baseline needed</Pill>;
  return <Pill tone="muted">Year {p.year}: {currentCycles(p).length}/4 checks</Pill>;
};

const LOADING_MESSAGES = {
  baseline: 'Finding look-alike mangroves nearby, matching them to your plot and sealing the baseline on the blockchain… (about 30–90 seconds)',
  quarterly: 'Checking this quarter with satellite images and recording the result on the blockchain…',
  replay: 'Replaying last year: sealing the baseline, then checking 4 quarters of real satellite data… (a few minutes)',
  finalize: 'Revealing the baseline, checking what the look-alikes really did, and calculating credits on the blockchain…',
};

const Journey = ({ project }) => {
  const done = currentCycles(project).length;
  const finishedYears = project.yearResults?.length || 0;
  const steps = [
    { label: 'Plot registered', done: true },
    { label: 'Baseline sealed', done: Boolean(project.baseline) || finishedYears > 0 },
    { label: `Quarterly checks (${project.baseline ? done : finishedYears ? 4 : 0}/4)`, done: (project.baseline && done >= 4) || (!project.baseline && finishedYears > 0) },
    { label: 'Year finished', done: !project.baseline && finishedYears > 0 },
  ];
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {steps.map((step, index) => (
        <li key={step.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${step.done ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 text-slate-400'}`}>
          {step.done ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <Circle className="w-4 h-4 shrink-0" />}
          <span><span className="text-slate-500 mr-1">{index + 1}.</span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
};

const CarbonCard = ({ cycles, area }) => {
  const latest = [...cycles].reverse().find((c) => c.carbon?.status === 'ok');
  if (!latest) return null;
  const c = latest.carbon;
  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Carbon stored in the trees</h3>
        <p className="text-sm text-slate-400">Latest check: {windowLabel([latest.windowStart, latest.windowEnd])}</p>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <p className="text-3xl font-bold text-white">{fmt(c.treeCo2.mid)} <span className="text-base font-normal text-slate-400">t CO₂ per hectare</span></p>
        <p className="text-slate-300">likely between <strong>{fmt(c.treeCo2.low)}</strong> and <strong>{fmt(c.treeCo2.high)}</strong> (90% range)</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        {[
          ['Whole plot', `${fmt(c.treeCo2.mid * area, 1)} t CO₂`],
          ['Above ground', `${fmt(c.treeCo2Above)} t/ha`],
          ['Roots (below ground)', `${fmt(c.treeCo2Below)} t/ha`],
          ['Canopy height', `${fmt(c.canopyHeight?.mid, 1)} m`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
            <p className="text-slate-400">{label}</p>
            <p className="text-white font-medium">{value}</p>
          </div>
        ))}
      </div>
      {c.explanation?.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-300 mb-1">What drives this number</p>
          <ul className="space-y-1 text-sm">
            {c.explanation.map((item) => (
              <li key={item.factor} className="flex justify-between gap-4 text-slate-300">
                <span>{item.factor}</span>
                <span className={item.effect_t_co2_ha >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                  {item.effect_t_co2_ha >= 0 ? '+' : ''}{fmt(item.effect_t_co2_ha)} t/ha
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-1">Compared with an average mangrove pixel in the training data (SHAP values).</p>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Satellite images → canopy height (trained on NASA GEDI laser) → tree weight (Simard et al. 2019 mangrove equation) → carbon (IPCC factors). See docs/carbon-calculation.md.
      </p>
    </div>
  );
};

const Dashboard = () => {
  const { account, authFetch } = useWallet();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [busy, setBusy] = useState('');
  const [apiStatus, setApiStatus] = useState(null);
  const [statusDetails, setStatusDetails] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const selected = projects.find((p) => p._id === selectedProjectId) || projects[0] || null;
  const totalArea = projects.reduce((sum, p) => sum + (p.area || 0), 0);
  const totalCredits = projects.reduce((sum, p) => sum + (p.carbonCredits || 0), 0);

  const fetchProjects = async () => {
    const res = await authFetch('/api/projects/' + account);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Could not load your plots');
    return data.projects;
  };

  const applyProjects = (list) => {
    setProjects(list);
    setSelectedProjectId((current) => (list.some((p) => p._id === current) ? current : list[0]?._id || ''));
  };

  const loadProjects = async () => {
    if (account) applyProjects(await fetchProjects());
  };

  const fetchStatus = async () => {
    const res = await fetch('/api/system/status');
    const data = await res.json();
    return res.ok && data.success ? data : null;
  };

  const applyStatus = (data) => {
    setApiStatus(data?.services || null);
    setStatusDetails(data?.details || {});
  };

  const loadStatus = () => fetchStatus().then(applyStatus).catch((error) => console.error('Status fetch failed', error));

  const post = async (url, body) => {
    const res = await authFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
    return data;
  };

  const run = async (kind, steps) => {
    setBusy(kind);
    setErrorMessage('');
    try {
      await steps();
    } catch (err) {
      setErrorMessage(readableError(err.message, 'Something went wrong.'));
    } finally {
      await loadProjects().catch(() => {});
      await loadStatus();
      setBusy('');
    }
  };

  const lockBaseline = (p, mode) => run('baseline', () => post(`/api/mrv/baseline/${p.plotId}`, { mode }));
  const runCheck = (p) => run('quarterly', () => post(`/api/mrv/quarterly-run/${p.plotId}`));
  const runRemaining = (p) => run('quarterly', async () => {
    for (let i = currentCycles(p).length; i < 4; i += 1) await post(`/api/mrv/quarterly-run/${p.plotId}`);
  });
  const replayYear = (p) => run('replay', async () => {
    await post(`/api/mrv/baseline/${p.plotId}`, { mode: 'replay' });
    for (let i = 0; i < 4; i += 1) await post(`/api/mrv/quarterly-run/${p.plotId}`);
  });
  const finishYear = (p) => run('finalize', () => post(`/api/mrv/annual-finalize/${p.plotId}`));

  const deleteProject = async (project) => {
    if (!confirm('Delete this plot from the registry? This cannot be undone.')) return;
    setErrorMessage('');
    try {
      const res = await authFetch('/api/projects/' + project._id, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not delete the plot');
      setSelectedProjectId('');
      await loadProjects();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  // Load the wallet's plots, and the service status, when the page opens or the wallet changes.
  useEffect(() => {
    if (!account) return undefined;
    let active = true;
    fetchProjects()
      .then((list) => active && applyProjects(list))
      .catch((err) => active && setErrorMessage(err.message));
    return () => { active = false; };
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true;
    fetchStatus().then((data) => active && applyStatus(data)).catch(() => {});
    return () => { active = false; };
  }, []);

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="card p-10 max-w-md text-center">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <p className="text-xl text-white font-semibold mb-2">Connect your wallet</p>
          <p className="text-slate-400 mb-6">Your wallet is your login. Connect MetaMask to see your plots.</p>
          <button onClick={() => navigate('/')} className="btn-primary px-6 py-2.5">Go to home page</button>
        </div>
      </div>
    );
  }

  const cycles = selected ? currentCycles(selected) : [];
  const step = selected ? nextStep(selected) : null;
  const result = selected ? lastResult(selected) : null;
  // Pinata (real IPFS uploads) is optional; without it reports get a local placeholder hash.
  const offline = apiStatus ? Object.entries(apiStatus).filter(([name, up]) => !up && name !== 'pinata').map(([name]) => name) : [];
  const ipfsNote = apiStatus && !apiStatus.pinata ? ' Reports use local placeholder hashes (IPFS uploads are optional).' : '';
  const disabled = busy !== '';

  return (
    <>
      <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My plots</h1>
            <p className="text-slate-400 mt-1">Each year: seal a baseline, check the plot every 3 months with satellites, then receive credits for the extra carbon you can prove.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => Promise.all([loadProjects(), loadStatus()]).catch((err) => setErrorMessage(err.message))} className="btn-ghost px-4 py-2.5 flex items-center gap-2" title="Reload">
              <RefreshCcw className="w-4 h-4" /> <span className="hidden sm:inline">Reload</span>
            </button>
            <button onClick={() => navigate('/register')} className="btn-primary px-5 py-2.5 flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Add a plot
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="flex-1">{errorMessage}</p>
            <button onClick={() => setErrorMessage('')} className="text-rose-300 hover:text-white" title="Dismiss"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            ['Plots', projects.length, ''],
            ['Total land', `${Number(totalArea.toFixed(2))} ha`, '1 hectare = 10,000 m²'],
            ['Credits earned', Number(totalCredits.toFixed(2)), '1 credit = 1 tonne of CO₂'],
          ].map(([label, value, hint]) => (
            <div key={label} className="card p-3 sm:p-5">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="text-xl sm:text-2xl font-bold text-white mt-1">{value}</p>
              {hint && <p className="text-xs text-slate-500 mt-1 hidden sm:block">{hint}</p>}
            </div>
          ))}
        </div>

        {projects.length === 0 ? (
          <div className="card p-10 text-center">
            <MapPin className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <p className="text-xl text-white font-semibold mb-2">No plots yet</p>
            <p className="text-slate-400 mb-6">Draw your mangrove land on the map. We check it with satellite images straight away.</p>
            <button onClick={() => navigate('/register')} className="btn-primary px-6 py-2.5">Add your first plot</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="space-y-2">
              {projects.map((p) => (
                <button key={p._id} type="button" onClick={() => { setSelectedProjectId(p._id); setShowDetails(false); }}
                  className={`w-full text-left card p-4 transition-colors ${selected?._id === p._id ? 'border-emerald-500/50 bg-emerald-500/5' : 'hover:border-white/20'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">Mangrove plot</p>
                      <p className="text-sm text-slate-400 truncate">{p.address}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                  </div>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <span className="text-sm text-slate-400">{fmt(p.area, 2)} ha</span>
                    {statusPill(p)}
                  </div>
                </button>
              ))}
            </div>

            {selected && (
              <div className="lg:col-span-2 space-y-4">
                <div className="card p-5 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        Mangrove plot · {!selected.baseline && result ? `Year ${result.year} finished` : `Year ${selected.year}`}
                      </h2>
                      <p className="text-slate-400">{fmt(selected.area, 2)} hectares · {selected.address}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link to={`/verify/${selected.plotId}`} className="btn-ghost text-sm px-3 py-1.5 flex items-center gap-1.5" title="Public page anyone can use to check this plot">
                        Public page <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => deleteProject(selected)} className="p-2 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10" title="Delete plot">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <Journey project={selected} />
                  {selected.initialIdentifiedEcosystem && (
                    <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] border border-white/10 p-3">
                      <Satellite className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-slate-300">
                        <span className="text-white font-medium">Satellite check at registration: </span>
                        looks like {selected.initialIdentifiedEcosystem} ({percent(selected.initialEcosystemConfidence)} sure), which matches what you told us.
                      </p>
                    </div>
                  )}
                </div>

                {/* Next step */}
                <div className="card p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400 mb-2">Next step</p>

                  {step.id === 'lock' && (
                    <>
                      <p className="text-white text-lg">{selected.year === 1 ? 'Seal the baseline to start the first year.' : `Seal the baseline for year ${selected.year}.`}</p>
                      <p className="text-slate-400 mt-1">
                        We find mangroves nearby that are <em>not</em> in the registry and combine them into a "twin" that matched your plot over the past year.
                        Its forecast for the coming year is sealed on the blockchain now and revealed at the end of the year, so it cannot be changed later.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button disabled={disabled} onClick={() => lockBaseline(selected, 'live')} className="btn-primary px-5 py-2.5 disabled:opacity-50 flex items-center gap-2">
                          <Lock className="w-4 h-4" /> Seal baseline and start today
                        </button>
                        {selected.year === 1 && (
                          <button disabled={disabled} onClick={() => replayYear(selected)} className="btn-ghost px-5 py-2.5 disabled:opacity-50 flex items-center gap-2"
                            title="Demo: run a whole year on real past satellite data in a few minutes">
                            <PlayCircle className="w-4 h-4" /> Demo: replay last year
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        "Start today" runs in real time (one check every 3 months). "Replay last year" uses the last 4 completed quarters of real satellite data, to demonstrate the full year now.
                      </p>
                    </>
                  )}

                  {step.id === 'check-live' && (
                    <>
                      <p className="text-white text-lg">Quarterly check {cycles.length + 1} of 4 is due after {selected.baseline.monitoringWindows[cycles.length][1]}.</p>
                      <p className="text-slate-400 mt-1">Window: {windowLabel(selected.baseline.monitoringWindows[cycles.length])}. You can run it once that window has ended.</p>
                      <button disabled={disabled} onClick={() => runCheck(selected)} className="btn-ghost px-5 py-2.5 mt-4 disabled:opacity-50">Try the check now</button>
                    </>
                  )}

                  {step.id === 'check-replay' && (
                    <>
                      <p className="text-white text-lg">Replay: quarterly check {cycles.length + 1} of 4.</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button disabled={disabled} onClick={() => runCheck(selected)} className="btn-primary px-5 py-2.5 disabled:opacity-50">Run next check</button>
                        <button disabled={disabled} onClick={() => runRemaining(selected)} className="btn-ghost px-5 py-2.5 disabled:opacity-50">Run all remaining checks</button>
                      </div>
                    </>
                  )}

                  {step.id === 'finalize' && (
                    <>
                      <p className="text-white text-lg">All 4 checks are done. Finish the year to calculate your credits.</p>
                      <p className="text-slate-400 mt-1">
                        The sealed baseline is revealed and the blockchain re-checks it against what was sealed on day 0. Then the contract compares your plot with the baseline,
                        counts only the extra carbon it can prove, adds official soil carbon, keeps 12% as a safety buffer and issues the credits to your wallet.
                      </p>
                      <button disabled={disabled} onClick={() => finishYear(selected)} className="btn-primary px-5 py-2.5 mt-4 disabled:opacity-50 flex items-center gap-2">
                        <Award className="w-4 h-4" /> Reveal baseline and finish the year
                      </button>
                    </>
                  )}

                  {step.id === 'replay-done' && (
                    <p className="text-white text-lg">The replayed year is complete. See the results below. In a live project, the next year would start straight after.</p>
                  )}
                </div>

                {/* Latest year result */}
                {result && !selected.baseline && (
                  <div className="card p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <Award className={`w-8 h-8 shrink-0 ${result.outcome === 'Minted' ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <div>
                        <h3 className="text-lg font-semibold text-white">Year {result.year} result</h3>
                        <p className="text-slate-300">
                          {result.outcome === 'Minted' && <>You received <strong>{fmt(result.credits, 2)} credits</strong> as carbon credit #{result.tokenId}, owned by your wallet.</>}
                          {result.outcome === 'NoProvableGain' && 'No credits this year: the extra carbon was not larger than the measurement uncertainty.'}
                          {result.outcome === 'AnomalyDetected' && 'No credits this year: damage was detected.'}
                          {result.outcome === 'InsufficientData' && 'No credits this year: not enough clear satellite data.'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          The baseline was revealed and matched the seal from day 0 ({shortHash(result.baseline?.commitment)}). Calculated on {result.onChain ? 'the blockchain' : 'the backend (blockchain simulation)'}.
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-300 mb-2">Your plot vs the baseline (what would have happened anyway)</p>
                      <BaselineVsObserved calculation={result.calculation} windows={result.baseline?.monitoringWindows} />
                    </div>
                    <QuarterBaselineTable calculation={result.calculation} windows={result.baseline?.monitoringWindows} />
                    <div>
                      <p className="text-sm font-medium text-slate-300 mb-2">How the credits were calculated</p>
                      <CreditBreakdown calculation={result.calculation} />
                    </div>
                  </div>
                )}

                {/* Sealed baseline */}
                {selected.baseline && (
                  <div className="card p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <Lock className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">Baseline sealed for year {selected.year}</h3>
                        <p className="text-slate-400">
                          Day 0: {selected.baseline.dayZero} ({selected.mode === 'replay' ? 'replay of a past year' : 'live'}). {selected.baseline.summary?.donors} look-alike mangrove spots
                          (from {selected.baseline.summary?.candidates} nearby candidates) were combined into a twin that matches your plot's past carbon within ±{fmt(selected.baseline.summary?.fitRmse, 1)} t CO₂/ha.
                          The forecast stays hidden until the end of the year.
                        </p>
                        <p className="text-xs text-slate-500 mt-1 font-mono break-all">Seal (commitment): {selected.baseline.commitment}</p>
                      </div>
                    </div>
                    <TwinChart preWindows={selected.baseline.preWindows} plotLevels={selected.baseline.summary?.plotLevels} syntheticLevels={selected.baseline.summary?.syntheticLevels} />
                  </div>
                )}

                <CarbonCard cycles={cycles.length ? cycles : (selected.monitoringCycles || [])} area={selected.area} />

                {/* Quarterly checks this year */}
                {(cycles.length > 0 || selected.baseline) && (
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">Quarterly satellite checks · year {selected.year}</h3>
                      <span className="text-sm text-slate-400">{cycles.length} of 4 done</span>
                    </div>
                    {cycles.length === 0 ? (
                      <p className="text-slate-400">No checks yet this year.</p>
                    ) : (
                      <ul className="divide-y divide-white/10">
                        {cycles.map((cycle) => {
                          const health = quarterHealth(cycle.anomalyStatus);
                          return (
                            <li key={cycle.cycleNumber} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <p className="text-white font-medium">{windowLabel([cycle.windowStart, cycle.windowEnd])}</p>
                                <p className="text-sm text-slate-400">
                                  {cycle.carbon?.status === 'ok'
                                    ? `Tree carbon ${fmt(cycle.carbon.treeCo2.mid)} t CO₂/ha (${fmt(cycle.carbon.treeCo2.low)}–${fmt(cycle.carbon.treeCo2.high)}), ${cycle.observation?.plotChange >= 0 ? '+' : ''}${fmt(cycle.observation?.plotChange, 1)} vs a year earlier`
                                    : 'No carbon estimate (clouds)'}
                                  {` · greenness ${fmt(cycle.ndvi, 2)}`}
                                </p>
                                <p className="text-xs text-slate-500 font-mono">On-chain record: {shortHash(cycle.observationTxHash)}</p>
                              </div>
                              <Pill tone={health.tone} icon={health.icon}>{health.text}</Pill>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Earlier years */}
                {(selected.yearResults || []).length > 1 && (
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2"><History className="w-5 h-5" /> Earlier years</h3>
                    <ul className="text-sm text-slate-300 space-y-1">
                      {selected.yearResults.map((r) => <li key={r.year}>Year {r.year}: {r.outcome} · {fmt(r.credits, 2)} credits</li>)}
                    </ul>
                  </div>
                )}

                <div className="card">
                  <button onClick={() => setShowDetails(!showDetails)} className="w-full flex items-center justify-between p-4 text-left text-slate-300 hover:text-white">
                    <span className="font-medium">Technical details</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showDetails && (
                    <dl className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-4 gap-y-2 text-sm">
                      {[
                        ['Plot ID', selected.plotId],
                        ['Owner wallet', selected.walletAddress],
                        ['Demo identity', `${selected.identityId} (mock, no real ID documents in this prototype)`],
                        ['Registration transaction', selected.registerTxHash],
                        ['Baseline seal transaction', selected.baselineTxHash],
                        ['Latest report (IPFS)', result?.reportIpfsHash],
                        ['Latest credit transaction', result?.txHash],
                        ['Corner points', (selected.coordinates || []).map(([lat, lon]) => `${lat.toFixed(5)}, ${lon.toFixed(5)}`).join('  |  ')],
                      ].filter(([, value]) => value).map(([label, value]) => (
                        <div key={label} className="contents">
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="text-slate-300 font-mono break-all">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {apiStatus && (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${offline.length ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {offline.length === 0
              ? `All services are running.${ipfsNote}`
              : `Not ready: ${offline.map((n) => `${SERVICE_NAMES[n] || n}${statusDetails[n] ? ` (${statusDetails[n]})` : ''}`).join('; ')}.`}
          </p>
        )}
      </div>

      {busy && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-6">
          <div className="card p-8 max-w-md text-center">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-2">Please wait</p>
            <p className="text-slate-300">{LOADING_MESSAGES[busy]}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
