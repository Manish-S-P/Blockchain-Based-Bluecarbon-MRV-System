import { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Plus, RefreshCcw, ShieldCheck, CheckCircle2, Circle, Loader2, Trash2, Satellite,
  AlertTriangle, CloudOff, Award, MapPin, ChevronDown, ChevronRight, ExternalLink, Info, X,
} from 'lucide-react';
import SuccessModal from '../components/SuccessModal';

// ---------------------------------------------------------------------------
// Plain-language helpers
// ---------------------------------------------------------------------------

const ECOSYSTEM_LABELS = { mangrove: 'Mangrove', seagrass: 'Seagrass', saltmarsh: 'Saltmarsh', other: 'Not a coastal ecosystem', unknown: 'Unknown' };
const ecosystemLabel = (value) => ECOSYSTEM_LABELS[value] || value || 'Unknown';

const monthYear = (iso) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
const quarterLabel = (cycle) => (cycle.windowStart && cycle.windowEnd
  ? `${monthYear(cycle.windowStart)} – ${monthYear(cycle.windowEnd)}`
  : `Quarter ${cycle.cycleNumber}`);

const SERVICE_NAMES = {
  database: 'database',
  mlService: 'satellite analysis',
  pinata: 'IPFS report storage (using a local placeholder)',
  blockchain: 'blockchain',
  gee: 'Google Earth Engine',
};

const percent = (value) => `${Math.round((value || 0) * 100)}%`;
const shortHash = (hash) => (hash && hash.length > 16 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash);

// What one quarter's satellite check found, in plain words.
const quarterResult = (cycle) => {
  if (cycle.anomalyStatus === 'anomaly' || cycle.anomalyDetected) {
    return { tone: 'bad', icon: AlertTriangle, text: 'Possible damage found', hint: 'The plants changed much more than normal compared with the same season last year.' };
  }
  if (cycle.anomalyStatus === 'insufficient_data') {
    return { tone: 'muted', icon: CloudOff, text: 'Too cloudy to check', hint: 'Not enough clear satellite images this quarter. This does not count against you.' };
  }
  return { tone: 'good', icon: CheckCircle2, text: 'Healthy, no damage found', hint: 'Plants look as expected compared with the same season last year.' };
};

const TONE_CLASSES = {
  good: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
  bad: 'text-rose-300 bg-rose-500/10 border-rose-500/25',
  warn: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
  muted: 'text-slate-300 bg-slate-500/10 border-slate-500/25',
};

const explorerUrl = (project) => (
  project.mintNetwork === 'amoy' && project.mintTxHash?.startsWith('0x')
    ? `https://amoy.polygonscan.com/tx/${project.mintTxHash}`
    : null
);

// Turns long blockchain errors into one readable sentence.
const readableError = (raw, fallback) => {
  let msg = raw || fallback;
  const reason = msg.match(/reason="([^"]+)"/);
  if (reason) msg = reason[1];
  else if (msg.includes('execution reverted:')) msg = msg.split('execution reverted:')[1].split('(')[0].trim();
  if (msg.toLowerCase().includes('insufficient funds')) msg = 'The backend wallet has no test tokens left to pay for the blockchain transaction.';
  return msg.length > 240 ? `${msg.slice(0, 240)}…` : msg;
};

// The single next thing to do for a plot.
const nextStep = (project) => {
  const cycles = project.monitoringCycles || [];
  if (project.creditTokenId) return { id: 'done' };
  if (project.reportIpfsHash) return { id: 'no-gain' };
  const damaged = cycles.filter((c) => c.anomalyStatus === 'anomaly' || c.anomalyDetected);
  if (damaged.length > 0) return { id: 'blocked', reason: `Possible damage was found in ${damaged.map(quarterLabel).join(', ')}, so no credits can be issued for this year.` };
  const mismatched = cycles.filter((c) => c.ecosystemMatchesClaim === false);
  if (mismatched.length > 0) return { id: 'blocked', reason: `The satellite did not recognise this plot as ${ecosystemLabel(project.vegetationType).toLowerCase()} in ${mismatched.map(quarterLabel).join(', ')}, so no credits can be issued.` };
  if (cycles.length >= 4) return { id: 'finalize' };
  if (cycles.length === 0) return { id: 'first-check' };
  return { id: 'next-check' };
};

const LOADING_MESSAGES = {
  quarterly: 'Downloading satellite images for this quarter and checking the plot…',
  runall: 'Checking every remaining quarter with satellite images…',
  backfill: 'Checking the last 4 quarters with satellite images…',
  finalize: 'Saving the yearly report and creating your carbon credit on the blockchain…',
};

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

const Stat = ({ label, value, hint }) => (
  <div className="card p-3 sm:p-5">
    <p className="text-sm text-slate-400">{label}</p>
    <p className="text-xl sm:text-2xl font-bold text-white mt-1">{value}</p>
    {hint && <p className="text-xs text-slate-500 mt-1 hidden sm:block">{hint}</p>}
  </div>
);

const Pill = ({ tone, icon: Icon, children, title }) => (
  <span title={title} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${TONE_CLASSES[tone]}`}>
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </span>
);

const statusPill = (project) => {
  const step = nextStep(project);
  if (step.id === 'done') return <Pill tone="good" icon={Award}>Credit received</Pill>;
  if (step.id === 'no-gain') return <Pill tone="muted">Year done, no credits</Pill>;
  if (step.id === 'blocked') return <Pill tone="bad" icon={AlertTriangle}>Not eligible this year</Pill>;
  if (step.id === 'finalize') return <Pill tone="warn">Ready for credits</Pill>;
  return <Pill tone="muted">Checks: {(project.monitoringCycles || []).length} of 4</Pill>;
};

const Journey = ({ project }) => {
  const cycles = (project.monitoringCycles || []).length;
  const steps = [
    { label: 'Plot registered', done: true },
    { label: `Quarterly checks (${cycles}/4)`, done: cycles >= 4 },
    { label: 'Year completed', done: Boolean(project.reportIpfsHash) },
    { label: project.reportIpfsHash && !project.creditTokenId ? 'No credit this year' : 'Credit received', done: Boolean(project.creditTokenId) },
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

const GreennessChart = ({ cycles }) => {
  const data = cycles
    .filter((c) => typeof c.ndvi === 'number')
    .map((c) => ({ name: monthYear(c.windowEnd) || `Q${c.cycleNumber}`, greenness: Number(c.ndvi.toFixed(2)) }));
  if (data.length < 2) return null;
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 1]} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
            formatter={(value) => [value, 'Greenness']}
          />
          <Line type="monotone" dataKey="greenness" stroke="#34d399" strokeWidth={2.5} dot={{ r: 4, fill: '#34d399' }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const fmt = (value, digits = 0) => (typeof value === 'number' ? value.toFixed(digits) : '–');

// Tree carbon stored in the plot for the latest quarter that has an estimate.
const CarbonCard = ({ cycles, area }) => {
  const latest = [...cycles].reverse().find((c) => c.carbon?.status === 'ok');
  if (!latest) return null;
  const c = latest.carbon;
  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Carbon stored in the trees</h3>
        <p className="text-sm text-slate-400">Latest check: {quarterLabel(latest)}</p>
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
      {c.applicableShare < 0.5 && (
        <p className="text-sm text-amber-200">This plot looks unlike the mangroves the model learned from, so its estimate is not used for credits.</p>
      )}
      <p className="text-xs text-slate-500">
        How it is measured: satellite images → canopy height (trained on NASA GEDI laser) → tree weight (Simard et al. 2019 mangrove equation) → carbon (IPCC factors). See docs/carbon-calculation.md.
      </p>
    </div>
  );
};

// The annual credit calculation, line by line.
const CreditBreakdown = ({ breakdown }) => {
  if (!breakdown?.eligible) return null;
  const rows = [
    ['Tree carbon gain vs. same season last year', `${fmt(breakdown.treeGainPerHa, 1)} ± ${fmt(breakdown.treeGainHalfWidthPerHa, 1)} t CO₂/ha`],
    ['Part of that gain we can prove', `${fmt(breakdown.provenTreeGainPerHa, 1)} t CO₂/ha`],
    [`Soil carbon (official rate, ${Math.round(breakdown.mangroveCover * 100)}% mangrove cover)`, `+ ${fmt(breakdown.soilGainPerHa, 2)} t CO₂/ha`],
    ['Per hectare', `${fmt(breakdown.perHectare, 2)} t CO₂/ha`],
    [`× plot area (${fmt(breakdown.areaHa, 2)} ha)`, `${fmt(breakdown.beforeBuffer, 2)} t CO₂`],
    [`− safety buffer (${Math.round(breakdown.bufferShare * 100)}%)`, `− ${fmt(breakdown.buffer, 2)}`],
    ['Credits', `${fmt(breakdown.credits, 2)}`],
  ];
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-slate-300 mb-2">How the credits were calculated</p>
      <dl className="divide-y divide-white/10 text-sm rounded-lg border border-white/10">
        {rows.map(([label, value], index) => (
          <div key={label} className={`flex justify-between gap-4 px-3 py-2 ${index === rows.length - 1 ? 'font-semibold text-white' : 'text-slate-300'}`}>
            <dt>{label}</dt>
            <dd className="text-right whitespace-nowrap">{value}</dd>
          </div>
        ))}
      </dl>
      {breakdown.uncertaintyDiscountShare > 0 && (
        <p className="text-xs text-slate-500 mt-2">
          The measurement range was {breakdown.relativeUncertainty === null ? 'larger than the gain' : `±${Math.round(breakdown.relativeUncertainty * 100)}% of the gain`},
          so under India's official uncertainty rule (CDM AR-TOOL14) only the lower end of the gain is counted.
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const Dashboard = () => {
  const { account, authFetch } = useWallet();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activePlotAction, setActivePlotAction] = useState('');
  const [apiStatus, setApiStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [mintOnAmoy, setMintOnAmoy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [successLink, setSuccessLink] = useState(null);

  const selected = projects.find((p) => p._id === selectedProjectId) || projects[0] || null;
  const totalArea = projects.reduce((sum, p) => sum + (p.area || 0), 0);
  const totalCredits = projects.reduce((sum, p) => sum + (p.carbonCredits || 0), 0);

  const loadProjects = async () => {
    if (!account) return;
    const res = await authFetch('/api/projects/' + account);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Could not load your plots');
    setProjects(data.projects);
    if (!data.projects.some((p) => p._id === selectedProjectId)) {
      setSelectedProjectId(data.projects[0]?._id || '');
    }
  };

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (res.ok && data.success) setApiStatus(data.services);
    } catch (error) {
      console.error('Status fetch failed', error);
    }
  };

  // Runs one backend action for a plot with a loading screen and readable errors.
  const runAction = async (plotId, kind, request, fallbackError) => {
    setActivePlotAction(`${plotId}:${kind}`);
    setErrorMessage('');
    try {
      const data = await request();
      await loadProjects();
      await loadStatus();
      return data;
    } catch (err) {
      setErrorMessage(readableError(err.message, fallbackError));
      return null;
    } finally {
      setActivePlotAction('');
    }
  };

  const postJson = async (url, body) => {
    const res = await authFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
    return data;
  };

  const runQuarterlyCheck = (project) => runAction(project.plotId, 'quarterly',
    () => postJson(`/api/mrv/quarterly-run/${project.plotId}`), 'The quarterly check failed.');

  const runRemainingChecks = (project) => runAction(project.plotId, 'runall', async () => {
    for (let i = project.monitoringCycles?.length || 0; i < 4; i += 1) {
      await postJson(`/api/mrv/quarterly-run/${project.plotId}`);
    }
  }, 'The quarterly checks failed.');

  const runBackfill = (project) => runAction(project.plotId, 'backfill',
    () => postJson(`/api/mrv/backfill/${project.plotId}`), 'Loading past quarters failed.');

  const finishYear = async (project) => {
    const data = await runAction(project.plotId, 'finalize',
      () => postJson(`/api/mrv/annual-finalize/${project.plotId}`, { chain: mintOnAmoy ? 'amoy' : 'local' }),
      'Finishing the year failed.');
    if (data?.txHash?.startsWith('0x') && mintOnAmoy) setSuccessLink(data.txHash);
  };

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

  useEffect(() => {
    if (account) loadProjects().catch((err) => setErrorMessage(err.message));
  }, [account]);

  useEffect(() => {
    loadStatus();
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

  const busy = activePlotAction !== '';
  const cycles = selected?.monitoringCycles || [];
  const step = selected ? nextStep(selected) : null;
  const offline = apiStatus ? Object.entries(apiStatus).filter(([, up]) => !up).map(([name]) => name) : [];

  return (
    <>
      <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My plots</h1>
            <p className="text-slate-400 mt-1">Each plot is checked with satellite images every 3 months. After 4 healthy checks, you receive a carbon credit.</p>
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
          <Stat label="Plots" value={projects.length} />
          <Stat label="Total land" value={`${Number(totalArea.toFixed(2))} ha`} hint="1 hectare = 10,000 m²" />
          <Stat label="Credits earned" value={Number(totalCredits.toFixed(2))} hint="1 credit = 1 tonne of CO₂ removed" />
        </div>

        {projects.length === 0 ? (
          <div className="card p-10 text-center">
            <MapPin className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <p className="text-xl text-white font-semibold mb-2">No plots yet</p>
            <p className="text-slate-400 mb-6">Draw your land on the map and tell us what grows there. We check it with satellite images straight away.</p>
            <button onClick={() => navigate('/register')} className="btn-primary px-6 py-2.5">Add your first plot</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Plot list */}
            <div className="space-y-2">
              {projects.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => { setSelectedProjectId(p._id); setShowDetails(false); }}
                  className={`w-full text-left card p-4 transition-colors ${selected?._id === p._id ? 'border-emerald-500/50 bg-emerald-500/5' : 'hover:border-white/20'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{ecosystemLabel(p.vegetationType)} plot</p>
                      <p className="text-sm text-slate-400 truncate">{p.address || p.name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
                  </div>
                  <div className="flex items-center justify-between mt-3 gap-2">
                    <span className="text-sm text-slate-400">{p.area} ha</span>
                    {statusPill(p)}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected plot */}
            {selected && (
              <div className="lg:col-span-2 space-y-4">
                <div className="card p-5 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{ecosystemLabel(selected.vegetationType)} plot</h2>
                      <p className="text-slate-400">{selected.area} hectares · {selected.address || selected.name}</p>
                    </div>
                    <button onClick={() => deleteProject(selected)} className="p-2 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-rose-500/10" title="Delete plot">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Journey project={selected} />

                  {selected.initialIdentifiedEcosystem && (
                    <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] border border-white/10 p-3">
                      <Satellite className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-slate-300">
                        <span className="text-white font-medium">Satellite check at registration: </span>
                        looks like {ecosystemLabel(selected.initialIdentifiedEcosystem).toLowerCase()} ({percent(selected.initialEcosystemConfidence)} sure)
                        {selected.initialIdentifiedEcosystem === selected.vegetationType ? ', which matches what you told us.' : `, but you registered it as ${ecosystemLabel(selected.vegetationType).toLowerCase()}.`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Next step */}
                <div className="card p-5">
                  <p className={`text-sm font-semibold uppercase tracking-wide mb-2 ${step.id === 'blocked' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {{ done: 'Finished', 'no-gain': 'Year finished', blocked: 'No credits this year' }[step.id] || 'Next step'}
                  </p>

                  {step.id === 'first-check' && (
                    <>
                      <p className="text-white text-lg">Run the first quarterly satellite check.</p>
                      <p className="text-slate-400 mt-1">We compare your plot with the same season last year to make sure the plants are healthy.</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button disabled={busy} onClick={() => runQuarterlyCheck(selected)} className="btn-primary px-5 py-2.5 disabled:opacity-50">Run quarterly check</button>
                        <button disabled={busy} onClick={() => runBackfill(selected)} className="btn-ghost px-5 py-2.5 disabled:opacity-50" title="For demos: checks the last 4 completed quarters in one go">
                          Demo: check the last 4 quarters now
                        </button>
                      </div>
                    </>
                  )}

                  {step.id === 'next-check' && (
                    <>
                      <p className="text-white text-lg">Run quarterly check {cycles.length + 1} of 4.</p>
                      <p className="text-slate-400 mt-1">{4 - cycles.length} more check{4 - cycles.length === 1 ? '' : 's'} until you can receive credits for this year.</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button disabled={busy} onClick={() => runQuarterlyCheck(selected)} className="btn-primary px-5 py-2.5 disabled:opacity-50">Run next check</button>
                        <button disabled={busy} onClick={() => runRemainingChecks(selected)} className="btn-ghost px-5 py-2.5 disabled:opacity-50">Run all remaining checks</button>
                      </div>
                    </>
                  )}

                  {step.id === 'finalize' && (
                    <>
                      <p className="text-white text-lg">All 4 checks are done. Finish the year to calculate your credits.</p>
                      <p className="text-slate-400 mt-1">We compare the carbon in your trees with the same season last year, count only the part of the gain we can prove, add official soil carbon, keep 12% as a safety buffer, and record the result on the blockchain with a public report.</p>
                      <div className="flex flex-wrap items-center gap-4 mt-4">
                        <button disabled={busy} onClick={() => finishYear(selected)} className="btn-primary px-5 py-2.5 disabled:opacity-50 flex items-center gap-2">
                          <Award className="w-4 h-4" /> Finish year & get credit
                        </button>
                        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer" title="Uses the public Polygon Amoy test network instead of the local test chain">
                          <input type="checkbox" className="accent-emerald-500" checked={mintOnAmoy} onChange={(e) => setMintOnAmoy(e.target.checked)} disabled={busy} />
                          Use public test network (Polygon Amoy)
                        </label>
                      </div>
                    </>
                  )}

                  {step.id === 'blocked' && (
                    <p className="text-rose-200">{step.reason}</p>
                  )}

                  {step.id === 'done' && (
                    <div className="flex items-start gap-3">
                      <Award className="w-8 h-8 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-white text-lg">You received <strong>{Number(selected.carbonCredits.toFixed(2))} credits</strong> for this plot.</p>
                        <p className="text-slate-400 mt-1">
                          Carbon credit #{selected.creditTokenId} is owned by your wallet
                          {selected.mintNetwork === 'amoy' ? ' on the Polygon Amoy test network.' : ' on the local test chain.'}
                        </p>
                        {explorerUrl(selected) && (
                          <a href={explorerUrl(selected)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-emerald-300 hover:underline">
                            View on Polygonscan <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <CreditBreakdown breakdown={selected.creditBreakdown} />
                      </div>
                    </div>
                  )}

                  {step.id === 'no-gain' && (
                    <div>
                      <p className="text-white text-lg">The year is complete, but no credits were issued this time.</p>
                      <p className="text-slate-400 mt-1">The measured carbon gain was smaller than the satellite measurement uncertainty. Gains keep adding up, and are credited once they are clearly larger than the uncertainty.</p>
                      <CreditBreakdown breakdown={selected.creditBreakdown} />
                    </div>
                  )}
                </div>

                <CarbonCard cycles={cycles} area={selected.area} />

                {/* Quarterly results */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Quarterly satellite checks</h3>
                    <span className="text-sm text-slate-400">{cycles.length} of 4 done</span>
                  </div>

                  {cycles.length === 0 ? (
                    <p className="text-slate-400">No checks yet. Results appear here after each quarter.</p>
                  ) : (
                    <>
                      <ul className="divide-y divide-white/10">
                        {cycles.map((cycle) => {
                          const result = quarterResult(cycle);
                          return (
                            <li key={cycle.cycleNumber} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <p className="text-white font-medium">{quarterLabel(cycle)}</p>
                                <p className="text-sm text-slate-400">
                                  {cycle.carbon?.status === 'ok' && `Tree carbon ${fmt(cycle.carbon.treeCo2.mid)} t CO₂/ha (${fmt(cycle.carbon.treeCo2.low)}–${fmt(cycle.carbon.treeCo2.high)}) · `}
                                  Greenness {typeof cycle.ndvi === 'number' ? cycle.ndvi.toFixed(2) : '–'}
                                  {cycle.geeImageCount ? ` · ${cycle.geeImageCount} satellite images` : ''}
                                  {cycle.ecosystemMatchesClaim === false && ` · satellite saw ${ecosystemLabel(cycle.identifiedEcosystem).toLowerCase()}`}
                                </p>
                              </div>
                              <Pill tone={result.tone} icon={result.icon} title={result.hint}>{result.text}</Pill>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-4">
                        <p className="text-sm text-slate-400 mb-1 flex items-center gap-1.5">
                          <Info className="w-4 h-4" /> Greenness (NDVI) goes from 0 to 1. Higher means more healthy plants.
                        </p>
                        <GreennessChart cycles={cycles} />
                      </div>
                    </>
                  )}
                </div>

                {/* Technical details for examiners */}
                <div className="card">
                  <button onClick={() => setShowDetails(!showDetails)} className="w-full flex items-center justify-between p-4 text-left text-slate-300 hover:text-white">
                    <span className="font-medium">Technical details</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showDetails && (
                    <dl className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-sm">
                      {[
                        ['Plot ID', selected.plotId],
                        ['Owner wallet', selected.walletAddress],
                        ['Registration transaction', selected.registerTxHash],
                        ['Credit transaction', selected.mintTxHash],
                        ['Credit token ID', selected.creditTokenId],
                        ['Yearly report (IPFS)', selected.reportIpfsHash],
                        ['Average greenness', selected.averageNdvi ? selected.averageNdvi.toFixed(4) : ''],
                        ['Corner points', (selected.coordinates || []).map(([lat, lon]) => `${lat.toFixed(5)}, ${lon.toFixed(5)}`).join('  |  ')],
                      ].filter(([, value]) => value).map(([label, value]) => (
                        <div key={label} className="contents">
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="text-slate-300 font-mono break-all" title={value}>{label.includes('transaction') ? shortHash(value) : value}</dd>
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
              ? 'All services are running.'
              : `Some services are offline: ${offline.map((name) => SERVICE_NAMES[name] || name).join(', ')}.`}
          </p>
        )}
      </div>

      {busy && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-6">
          <div className="card p-8 max-w-md text-center">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-2">Please wait</p>
            <p className="text-slate-300">{LOADING_MESSAGES[activePlotAction.split(':')[1]] || 'Working…'}</p>
            <p className="text-sm text-slate-500 mt-3">This usually takes 10–60 seconds.</p>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={!!successLink}
        onClose={() => setSuccessLink(null)}
        title="Credit received"
        message="Your carbon credit was created on the Polygon Amoy test network."
        txHash={successLink}
      />
    </>
  );
};

export default Dashboard;
