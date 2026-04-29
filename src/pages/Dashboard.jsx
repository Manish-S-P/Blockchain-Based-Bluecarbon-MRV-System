import { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Plus, TreePine, Map, Award, TrendingUp, RefreshCcw, ShieldCheck,
  CheckCircle2, Clock3, Play, Zap, History, ChevronRight, Layers,
  BarChart3, FileText, Activity, Trash2, Loader2
} from 'lucide-react';
import SuccessModal from '../components/SuccessModal';

const getChartData = (project) => {
  if (!project?.monitoringCycles?.length) return [];
  return project.monitoringCycles.map((cycle) => ({
    name: `Q${cycle.cycleNumber}`,
    ndvi: Number(cycle.ndvi?.toFixed(4) || 0),
    co2: Number(cycle.estimatedCo2Tonnes?.toFixed(2) || 0),
    label: cycle.windowStart && cycle.windowEnd
      ? `${cycle.windowStart} → ${cycle.windowEnd}`
      : `Cycle ${cycle.cycleNumber}`,
  }));
};

const getExplorerUrl = (txHash) => {
  if (!txHash) return null;
  if (txHash.startsWith('0x')) {
    return `https://amoy.polygonscan.com/tx/${txHash}`;
  }
  return null;
};

const LOADING_MESSAGES = {
  quarterly: '🛰️ Fetching satellite imagery from GEE & running ML models...',
  runall: '🛰️ Running all quarterly cycles — fetching GEE data for each quarter...',
  backfill: '🛰️ Backfilling 4 quarters of historical satellite data from GEE...',
  finalize: '📝 Finalizing MRV report, uploading to IPFS & minting NFT...',
};

const StatusBadge = ({ status }) => {
  const colors = {
    'Registered': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'Monitoring In Progress': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    'Ready For Annual MRV': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    'Credit Minted': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${colors[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
      {status}
    </span>
  );
};

const KpiCard = ({ icon: Icon, label, value, gradient, iconBg }) => (
  <div className="glass-card p-5 group hover:bg-white/[0.08] transition-all duration-300">
    <div className="flex items-center gap-4 min-w-0">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradient} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-5 h-5 ${iconBg}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-lg md:text-2xl font-bold text-white mt-0.5 truncate">{value}</p>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { account } = useWallet();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [totalArea, setTotalArea] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [activePlotAction, setActivePlotAction] = useState('');
  const [apiStatus, setApiStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [mintOnAmoy, setMintOnAmoy] = useState(false);
  const [successLink, setSuccessLink] = useState(null);

  const avgNdvi = projects.length > 0
    ? Number((projects.reduce((sum, p) => sum + (p.averageNdvi || 0), 0) / projects.length).toFixed(3))
    : 0;
  const selectedProject = projects.find((project) => project._id === selectedProjectId) || projects[0] || null;

  const getWorkflowSteps = (project) => {
    if (!project) return [];
    const cycleCount = project.monitoringCycles?.length || 0;
    const regUrl = getExplorerUrl(project.registerTxHash);
    const mintUrl = getExplorerUrl(project.mintTxHash);

    return [
      {
        title: 'Plot Registered',
        done: Boolean(project.plotId),
        detail: regUrl ? (
          <a href={regUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">
            Tx: {project.registerTxHash.slice(0, 10)}... <ChevronRight className="w-2.5 h-2.5"/>
          </a>
        ) : (project.registerTxHash || 'Waiting for blockchain registration'),
      },
      {
        title: 'Quarterly Monitoring',
        done: cycleCount >= 4,
        detail: `${cycleCount}/4 cycles completed`,
      },
      {
        title: 'Annual MRV Finalized',
        done: Boolean(project.reportIpfsHash),
        detail: project.reportIpfsHash || 'IPFS report not generated yet',
      },
      {
        title: 'NFT Credit Minted',
        done: Boolean(project.creditTokenId),
        detail: mintUrl ? (
          <a href={mintUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">
            Tx: {project.mintTxHash.slice(0, 10)}... <ChevronRight className="w-2.5 h-2.5"/>
          </a>
        ) : (project.mintTxHash || 'Awaiting mint transaction'),
      },
    ];
  };

  const loadProjects = async () => {
    if (!account) return;
    const res = await fetch('/api/projects/' + account);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Unable to fetch projects');
    }
    setProjects(data.projects);
    if (!selectedProjectId && data.projects.length > 0) {
      setSelectedProjectId(data.projects[0]._id);
    }
    if (selectedProjectId && !data.projects.some((project) => project._id === selectedProjectId)) {
      setSelectedProjectId(data.projects[0]?._id || '');
    }
    const areaSum = data.projects.reduce((acc, p) => acc + (p.area || 0), 0);
    const creditSum = data.projects.reduce((acc, p) => acc + (p.carbonCredits || 0), 0);
    setTotalArea(areaSum);
    setTotalCredits(creditSum);
  };

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (res.ok && data.success) {
        setApiStatus(data.services);
      }
    } catch (error) {
      console.error('Status fetch failed', error);
    }
  };

  const runQuarterlyMrv = async (plotId) => {
    setActivePlotAction(plotId + ':quarterly');
    setErrorMessage('');
    setSuccessLink(null);
    try {
      const res = await fetch('/api/mrv/quarterly-run/' + plotId, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Quarterly MRV failed');
      }
      await loadProjects();
      await loadStatus();
    } catch (err) {
      setErrorMessage(err.message);
      alert(err.message);
    } finally {
      setActivePlotAction('');
    }
  };

  const finalizeAnnualMrv = async (plotId) => {
    setActivePlotAction(plotId + ':finalize');
    setErrorMessage('');
    setSuccessLink(null);
    try {
      const res = await fetch('/api/mrv/annual-finalize/' + plotId, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain: mintOnAmoy ? 'amoy' : 'local' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        let msg = data.error || 'Annual finalize failed';
        
        // Clean up verbose ethers errors
        const reasonMatch = msg.match(/reason="([^"]+)"/);
        if (reasonMatch) {
          msg = reasonMatch[1];
        } else if (msg.includes('execution reverted:')) {
          msg = msg.split('execution reverted:')[1].split('(')[0].trim();
        }

        if (msg.toLowerCase().includes('insufficient funds')) {
          msg = '⚠️ Insufficient Gas Funds on Amoy! Please add testnet MATIC to the backend wallet.';
        } else if (msg.includes('Plot does not exist')) {
          msg = '❌ Plot not registered on-chain! This usually happens if you switch contracts. The system will try to auto-register next time.';
        }

        // Final safety truncation
        if (msg.length > 200) {
          msg = msg.substring(0, 200) + '...';
        }
        
        throw new Error(msg);
      }
      await loadStatus();
      if (data.txHash && data.txHash.startsWith('0x') && mintOnAmoy) {
        setSuccessLink(data.txHash);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setActivePlotAction('');
    }
  };

  const runAllQuarterlyCycles = async (proj) => {
    const completed = proj.monitoringCycles?.length || 0;
    if (completed >= 4 || !proj.plotId) return;

    setActivePlotAction(proj.plotId + ':runall');
    setErrorMessage('');
    try {
      for (let i = completed; i < 4; i += 1) {
        const res = await fetch('/api/mrv/quarterly-run/' + proj.plotId, { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Quarterly MRV run failed');
        }
      }
      await loadProjects();
      await loadStatus();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setActivePlotAction('');
    }
  };

  const runHistoricalBackfill = async (proj) => {
    if (!proj?.plotId) return;
    setActivePlotAction(proj.plotId + ':backfill');
    setErrorMessage('');
    try {
      const res = await fetch('/api/mrv/backfill/' + proj.plotId, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Historical backfill failed');
      }
      await loadProjects();
      await loadStatus();
    } catch (err) {
      setErrorMessage(err.message);
      alert(err.message);
    } finally {
      setActivePlotAction('');
    }
  };

  const deleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    setErrorMessage('');
    try {
      const res = await fetch('/api/projects/' + projectId, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete project');
      }
      if (selectedProjectId === projectId) {
        setSelectedProjectId('');
      }
      await loadProjects();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  useEffect(() => {
    if (account) {
      loadProjects()
        .catch(err => setErrorMessage(err.message));
    }
  }, [account]);

  useEffect(() => {
    loadStatus();
  }, []);

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center glass-card p-12 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-xl text-slate-300 mb-2 font-semibold">Wallet Required</p>
          <p className="text-sm text-slate-500 mb-6">Connect your MetaMask wallet to access the dashboard.</p>
          <button onClick={() => navigate('/')} className="btn-primary px-6 py-2.5 text-sm">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'actions', label: 'MRV Actions', icon: Zap },
    { id: 'evidence', label: 'Evidence', icon: FileText },
  ];

  return (
    <>
      <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Control Room</h1>
          <p className="text-slate-500 text-sm mt-1">Run MRV cycles, verify evidence, and mint credits from one place.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => Promise.all([loadProjects(), loadStatus()]).catch((err) => setErrorMessage(err.message))}
            className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => navigate('/register')}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Register Project
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400 animate-scale-in">
          {errorMessage}
        </div>
      )}

      {apiStatus && (
        <div className="glass-card p-4">
          <h2 className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            System Integrations
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            {Object.entries(apiStatus).map(([service, up]) => (
              <div key={service} className={`px-3 py-2 rounded-lg border ${up ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'}`}>
                <p className="font-semibold capitalize">{service}</p>
                <p className="opacity-70">{up ? 'Connected' : 'Offline'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activePlotAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
          <div className="glass-card p-8 max-w-md text-center animate-scale-in">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-2">Processing MRV Pipeline</p>
            <p className="text-slate-400 text-sm">
              {LOADING_MESSAGES[activePlotAction.split(':')[1]] || 'Processing...'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard icon={TrendingUp} label="Avg NDVI" value={avgNdvi} gradient="from-emerald-500/20 to-teal-500/20" iconBg="text-emerald-400" />
        <KpiCard icon={Map} label="Total Area" value={`${totalArea} Ha`} gradient="from-blue-500/20 to-cyan-500/20" iconBg="text-blue-400" />
        <KpiCard icon={TreePine} label="Projects" value={projects.length} gradient="from-amber-500/20 to-orange-500/20" iconBg="text-amber-400" />
        <KpiCard icon={Award} label="Credits" value={totalCredits} gradient="from-violet-500/20 to-purple-500/20" iconBg="text-violet-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              NDVI — {selectedProject?.name || 'Select a project'}
            </h2>
            {selectedProject?.monitoringCycles?.length > 0 && (
              <span className="text-[10px] text-slate-500 font-mono bg-white/[0.05] px-2 py-1 rounded-lg">
                {selectedProject.monitoringCycles.length} cycle{selectedProject.monitoringCycles.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="h-64 w-full">
            {getChartData(selectedProject).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <BarChart3 className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm">No monitoring data yet.</p>
                <p className="text-xs mt-1">Run quarterly MRV cycles to see NDVI chart.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData(selectedProject)} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} domain={[0, 1]} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      color: '#e2e8f0',
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#34d399' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value, name) => [
                      name === 'ndvi' ? value.toFixed(4) : `${value} t`,
                      name === 'ndvi' ? 'NDVI' : 'Est. CO₂',
                    ]}
                  />
                  <Area type="monotone" dataKey="ndvi" stroke="#34d399" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNdvi)" dot={{ r: 4, fill: '#34d399', stroke: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#34d399', stroke: '#0f172a', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 glass-card p-4 flex flex-col max-h-[480px]">
          <h2 className="text-sm font-bold text-white mb-4 px-1">Registered Projects</h2>
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {projects.length === 0 && (
              <p className="text-xs text-slate-500 px-1">No plots registered yet.</p>
            )}
            {projects.map(proj => (
              <button
                type="button"
                key={proj._id}
                onClick={() => { setSelectedProjectId(proj._id); setActiveTab('overview'); }}
                className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 border group ${
                  selectedProjectId === proj._id
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-transparent hover:bg-white/[0.05] hover:border-white/[0.08]'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <span className="font-semibold text-sm text-white truncate max-w-[140px]">{proj.name}</span>
                  <StatusBadge status={proj.status} />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{proj.area} Ha</span>
                  <span className="font-medium text-slate-400">{proj.carbonCredits || 0} CC</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-600 font-mono">{proj.plotId || 'pending'}</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-colors ${selectedProjectId === proj._id ? 'text-emerald-400' : 'text-slate-600'}`} />
                </div>
                <div className="flex gap-1 mt-2.5">
                  {[0,1,2,3].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i < (proj.monitoringCycles?.length || 0) ? 'bg-emerald-500' : 'bg-white/[0.08]'
                      }`}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/register')}
            className="mt-3 w-full py-3 border border-dashed border-white/[0.1] rounded-xl text-slate-500 font-medium hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Plot
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white">
              {selectedProject ? selectedProject.name : 'Project Details'}
            </h2>
            {selectedProject && (
              <button
                type="button"
                onClick={() => deleteProject(selectedProject._id)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {selectedProject && (
            <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white/[0.1] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {!selectedProject ? (
          <div className="text-center py-12 text-slate-500">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Register a project to see details here.</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-up">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Plot ID', value: selectedProject.plotId || 'N/A', mono: true },
                      { label: 'Ecosystem', value: selectedProject.vegetationType, capitalize: true },
                      { label: 'Area', value: `${selectedProject.area} hectares` },
                      { label: 'Avg NDVI', value: selectedProject.averageNdvi || '—' },
                      { label: 'Carbon Credits', value: selectedProject.carbonCredits || '—' },
                      { label: 'Credit Token', value: selectedProject.creditTokenId || 'Not minted' },
                    ].map((item) => (
                      <div key={item.label} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{item.label}</p>
                        <p className={`text-sm text-white font-medium ${item.mono ? 'font-mono' : ''} ${item.capitalize ? 'capitalize' : ''} truncate`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Wallet</p>
                    <p className="text-xs text-slate-300 font-mono break-all">{selectedProject.walletAddress}</p>
                  </div>
                  {selectedProject.reportIpfsHash && (
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">IPFS Report</p>
                      <p className="text-xs text-slate-300 font-mono break-all">{selectedProject.reportIpfsHash}</p>
                    </div>
                  )}
                  {selectedProject.initialIdentifiedEcosystem && (
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">ML Identification at Registration</p>
                      <p className="text-sm text-white capitalize">
                        {selectedProject.initialIdentifiedEcosystem}
                        {selectedProject.initialEcosystemConfidence ? ` (${(selectedProject.initialEcosystemConfidence * 100).toFixed(1)}%)` : ''}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">MRV Pipeline</p>
                  {getWorkflowSteps(selectedProject).map((step, index) => (
                    <div key={step.title} className={`p-3.5 rounded-xl border flex items-start gap-3 ${step.done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${step.done ? 'bg-emerald-500/20' : 'bg-white/[0.05]'}`}>
                        {step.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <span className="text-xs font-bold text-slate-500">{index + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{step.title}</p>
                        <p className="text-[11px] text-slate-500 break-all mt-0.5">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="animate-fade-up space-y-4">
                {errorMessage && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400 animate-scale-in flex items-start gap-3 max-h-32 overflow-y-auto">
                    <History className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-70" />
                    <p className="break-words line-clamp-4">{errorMessage}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4 bg-white/[0.03] p-3 rounded-xl border border-white/[0.05]">
                  <div>
                    <p className="text-sm font-semibold text-white">Target Network</p>
                    <p className="text-[11px] text-slate-500">Mint NFTs on a public testnet instead of local blockchain</p>
                  </div>
                  <label className="relative flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={mintOnAmoy} onChange={(e) => { setMintOnAmoy(e.target.checked); setSuccessLink(null); }} disabled={activePlotAction !== ''} />
                    <div className={`w-9 h-5 bg-white/[0.1] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${activePlotAction ? 'opacity-50' : 'peer-checked:bg-emerald-500'}`}></div>
                    <span className="ml-2 text-[11px] font-bold text-slate-300 w-8">{mintOnAmoy ? 'Amoy' : 'Local'}</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => runQuarterlyMrv(selectedProject.plotId)}
                    disabled={!selectedProject.plotId || selectedProject.monitoringCycles?.length >= 4 || activePlotAction !== ''}
                    className="glass-card-hover p-5 text-left disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
                        <Play className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Run Quarterly MRV</p>
                        <p className="text-[11px] text-slate-500">Execute single monitoring cycle</p>
                      </div>
                    </div>
                    {activePlotAction === selectedProject.plotId + ':quarterly' && (
                      <p className="text-xs text-emerald-400 animate-pulse mt-1">Running...</p>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => runAllQuarterlyCycles(selectedProject)}
                    disabled={!selectedProject.plotId || (selectedProject.monitoringCycles?.length || 0) >= 4 || activePlotAction !== ''}
                    className="glass-card-hover p-5 text-left disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
                        <Zap className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Run All Cycles</p>
                        <p className="text-[11px] text-slate-500">Execute remaining quarterly cycles</p>
                      </div>
                    </div>
                    {activePlotAction === selectedProject.plotId + ':runall' && (
                      <p className="text-xs text-blue-400 animate-pulse mt-1">Running all...</p>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => runHistoricalBackfill(selectedProject)}
                    disabled={!selectedProject.plotId || (selectedProject.monitoringCycles?.length || 0) > 0 || activePlotAction !== ''}
                    className="glass-card-hover p-5 text-left disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center group-hover:bg-indigo-500/25 transition-colors">
                        <History className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Backfill 4 Quarters</p>
                        <p className="text-[11px] text-slate-500">Import historical satellite data</p>
                      </div>
                    </div>
                    {activePlotAction === selectedProject.plotId + ':backfill' && (
                      <p className="text-xs text-indigo-400 animate-pulse mt-1">Backfilling...</p>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => finalizeAnnualMrv(selectedProject.plotId)}
                    disabled={!selectedProject.plotId || (selectedProject.monitoringCycles?.length || 0) < 4 || activePlotAction !== ''}
                    className="glass-card-hover p-5 text-left disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center group-hover:bg-violet-500/25 transition-colors">
                        <Award className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Finalize + Mint</p>
                        <p className="text-[11px] text-slate-500">Finalize annual MRV & mint NFT</p>
                      </div>
                    </div>
                    {activePlotAction === selectedProject.plotId + ':finalize' && (
                      <p className="text-xs text-violet-400 animate-pulse mt-1">Finalizing...</p>
                    )}
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-600">
                  <Clock3 className="w-3.5 h-3.5" />
                  Cycles completed: {selectedProject.monitoringCycles?.length || 0} / 4
                </div>
              </div>
            )}

            {activeTab === 'evidence' && (
              <div className="animate-fade-up">
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {(selectedProject.monitoringCycles || []).length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No cycles recorded yet. Run a quarterly MRV to generate evidence.</p>
                    </div>
                  ) : (
                    selectedProject.monitoringCycles.map((cycle) => (
                      <div key={cycle.cycleNumber} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                              <span className="text-xs font-bold text-emerald-400">{cycle.cycleNumber}</span>
                            </div>
                            <span className="text-sm font-semibold text-white">Cycle {cycle.cycleNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {cycle.anomalyDetected && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                                Anomaly
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cycle.ecosystemMatchesClaim ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border-amber-500/20'}`}>
                              {cycle.ecosystemMatchesClaim ? 'Match' : 'Mismatch'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { label: 'NDVI', value: cycle.ndvi },
                            { label: 'Ecosystem', value: cycle.identifiedEcosystem || 'N/A' },
                            { label: 'Confidence', value: cycle.ecosystemConfidence ? `${(cycle.ecosystemConfidence * 100).toFixed(1)}%` : 'N/A' },
                            { label: 'Est. CO₂', value: `${cycle.estimatedCo2Tonnes} t` },
                          ].map(item => (
                            <div key={item.label} className="bg-white/[0.03] rounded-lg p-2 border border-white/[0.04]">
                              <p className="text-[9px] text-slate-500 uppercase tracking-wider">{item.label}</p>
                              <p className="text-xs text-white font-medium mt-0.5 capitalize">{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-4 mt-2 text-[10px] text-slate-600">
                          <span>Source: {cycle.source || 'N/A'}</span>
                          <span>Window: {cycle.windowStart || 'N/A'} → {cycle.windowEnd || 'N/A'}</span>
                          <span>GEE Images: {cycle.geeImageCount || 0}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>

      <SuccessModal
        isOpen={!!successLink}
        onClose={() => { setSuccessLink(null); loadProjects(); }}
        title="NFT Minted Successfully!"
        message="Your annual Blue Carbon credits have been finalized and minted as a premium NFT on the Polygon Amoy testnet."
        txHash={successLink}
      />
    </>
  );
};

export default Dashboard;
