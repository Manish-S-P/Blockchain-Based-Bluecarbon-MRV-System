import { useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Satellite, Award } from 'lucide-react';

const STEPS = [
  {
    icon: MapPin,
    title: '1. Draw your land',
    text: 'Mark your mangrove, seagrass or saltmarsh plot on a satellite map. We check straight away that it really is that ecosystem.',
  },
  {
    icon: Satellite,
    title: '2. We check it every 3 months',
    text: 'Satellite images show whether the plants stay healthy. Damage like cutting or clearing is spotted automatically.',
  },
  {
    icon: Award,
    title: '3. Receive carbon credits',
    text: 'After a healthy year you receive carbon credits. They are recorded on a blockchain, so anyone can verify them and nobody can change them.',
  },
];

const LandingPage = () => {
  const { account, connectWallet } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (account) {
      navigate('/dashboard');
    }
  }, [account, navigate]);

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-950 via-slate-950 to-emerald-950/40">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 space-y-16">

        <div className="text-center space-y-6">
          <p className="text-emerald-400 font-medium">Blue Carbon Registry</p>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            Get rewarded for protecting<br className="hidden md:block" /> coastal ecosystems
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            Mangroves, seagrass and saltmarshes take carbon out of the air. Register your plot, and we use satellite images to confirm it stays healthy, so you can earn carbon credits for it.
          </p>
          <div>
            <button onClick={connectWallet} className="btn-primary px-8 py-3.5 text-lg inline-flex items-center gap-2">
              Connect wallet to start <ArrowRight className="w-5 h-5" />
            </button>
            <p className="mt-3 text-sm text-slate-500">You need the MetaMask browser extension. Your wallet is your login, and no password is needed.</p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-white text-center mb-6">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <div key={step.title} className="card p-6">
                <step.icon className="w-8 h-8 text-emerald-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 max-w-2xl mx-auto">
          1 carbon credit = 1 tonne of carbon dioxide (CO₂) kept out of the air. Satellite data: Sentinel-1 and Sentinel-2 via Google Earth Engine.
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
