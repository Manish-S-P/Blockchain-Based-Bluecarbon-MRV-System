import { useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe, Shield, Activity, Database, Cpu, Blocks, Waves, TreePine, Zap } from 'lucide-react';

const LandingPage = () => {
  const { account, connectWallet } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (account) {
      navigate('/dashboard');
    }
  }, [account, navigate]);

  const features = [
    {
      icon: Globe,
      title: 'Satellite NDVI',
      description: 'Quarterly Sentinel-2 NDVI retrieval through Google Earth Engine for objective vegetation health signals.',
      gradient: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      icon: Cpu,
      title: 'ML Verification',
      description: 'Random Forest, Isolation Forest, and regression models validate ecosystem claims, anomalies, and CO₂ estimates.',
      gradient: 'from-cyan-500/20 to-blue-500/20',
      iconColor: 'text-cyan-400',
    },
    {
      icon: Blocks,
      title: 'On-chain Credits',
      description: 'MRV reports are pinned to IPFS and final credits are minted as ERC-721 tokens for verifiable ownership.',
      gradient: 'from-violet-500/20 to-purple-500/20',
      iconColor: 'text-violet-400',
    },
  ];

  const techStack = [
    { icon: Database, label: 'MongoDB + IPFS', tag: 'Storage' },
    { icon: Activity, label: 'FastAPI ML Pipeline', tag: 'Compute' },
    { icon: Shield, label: 'Smart Contract Checks', tag: 'Integrity' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at center, #34d399 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/8 rounded-full blur-[120px] animate-float-delayed" />
      <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-cyan-500/8 rounded-full blur-[80px] animate-float-slow" />

      {/* Main content */}
      <div className="max-w-6xl w-full text-center z-10 px-6 py-16 md:py-24 space-y-10">

        {/* Badge */}
        <div className="opacity-0 animate-fade-up">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-emerald-300 tracking-wide uppercase">
            <Waves className="w-3.5 h-3.5" />
            Blockchain-Verified Carbon Credits
          </span>
        </div>

        {/* Headline */}
        <div className="space-y-4 opacity-0 animate-fade-up-delay">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9]">
            <span className="text-white">Blue Carbon</span>
            <br />
            <span className="text-gradient">Registry</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            End-to-end MRV for mangroves, seagrass, and saltmarsh. Register plots, run quarterly monitoring, and mint verifiable carbon credit NFTs.
          </p>
        </div>

        {/* CTA */}
        <div className="opacity-0 animate-fade-up-delay-2">
          <button
            onClick={connectWallet}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl hover:from-emerald-400 hover:to-teal-400 hover:-translate-y-1 animate-pulse-glow"
          >
            <span className="mr-3 text-lg">Connect Wallet & Start</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
          <p className="mt-4 text-sm text-slate-500 flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            MetaMask login required for farmer onboarding
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-20 pt-12 border-t border-white/[0.06]">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card-hover p-8 text-left group"
              style={{ animationDelay: `${index * 100 + 400}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Tech stack pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          {techStack.map((item) => (
            <div key={item.label} className="glass-card px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">{item.tag}</p>
                <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-emerald-400" />
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom ecosystem icons */}
        <div className="flex items-center justify-center gap-8 pt-8 opacity-40">
          <TreePine className="w-5 h-5 text-emerald-500" />
          <Waves className="w-5 h-5 text-teal-500" />
          <Globe className="w-5 h-5 text-cyan-500" />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
