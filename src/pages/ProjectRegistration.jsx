import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import MapPolygonSelector from '../components/MapPolygonSelector';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, ShieldCheck, TreePine, Waves, Leaf, Satellite, AlertTriangle } from 'lucide-react';

const STEPS = ['About you', 'Draw your land', 'What grows there'];

const ECOSYSTEMS = [
  { value: 'mangrove', label: 'Mangrove', icon: TreePine, description: 'Trees growing in salty coastal water, often with roots above the mud.' },
  { value: 'seagrass', label: 'Seagrass', icon: Waves, description: 'Grass-like plants growing underwater in shallow sea.', comingSoon: true },
  { value: 'saltmarsh', label: 'Saltmarsh', icon: Leaf, description: 'Low grasses and shrubs on land flooded by the tide.', comingSoon: true },
];

const ECOSYSTEM_NAMES = { mangrove: 'Mangrove', seagrass: 'Seagrass', saltmarsh: 'Saltmarsh', other: 'Not a coastal ecosystem' };

const ProjectRegistration = () => {
  const { account, authFetch } = useWallet();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '', phone: '', address: '', aadhar: '', rtcNumber: '', vegetationType: 'mangrove', area: '',
  });
  const [coordinates, setCoordinates] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState('');
  const [rejection, setRejection] = useState(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const goTo = (step) => {
    if (step > 1 && !(formData.name && formData.phone && formData.address && formData.aadhar)) {
      setStepError('Please fill in all your details first.');
      setCurrentStep(1);
      return;
    }
    if (step > 2 && coordinates.length < 3) {
      setStepError('Please click at least 3 corners of your land on the map.');
      setCurrentStep(2);
      return;
    }
    setStepError('');
    setCurrentStep(step);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRejection(null);
    setStepError('');
    setIsSubmitting(true);
    try {
      const response = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, landMethod: 'map', coordinates }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        navigate('/dashboard');
        return;
      }
      setRejection({
        message: data.error || 'Registration failed.',
        probabilities: data.classProbabilities || null,
      });
    } catch (err) {
      setRejection({ message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="card p-10 max-w-md text-center">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connect your wallet</h2>
          <p className="text-slate-400">Your wallet is your login. Connect MetaMask to register a plot.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-white">Add a plot</h1>
          <p className="text-slate-400 mt-1">Tell us about your land. When you finish, we check it with satellite images right away.</p>
        </div>

        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((label, index) => {
            const step = index + 1;
            const done = currentStep > step;
            const active = currentStep === step;
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => goTo(step)}
                  className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm text-left ${
                    active ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                      : done ? 'border-emerald-500/25 text-emerald-200' : 'border-white/10 text-slate-400'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <span className="w-5 text-center font-semibold">{step}</span>}
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {stepError && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200">{stepError}</p>
        )}

        <form onSubmit={handleSubmit} className="card p-6 md:p-8">

          {currentStep === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-white">About you</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="label" htmlFor="name">Full name</label>
                  <input id="name" required name="name" value={formData.name} onChange={handleChange} className="input-dark" placeholder="e.g. Priya Sharma" />
                </div>
                <div>
                  <label className="label" htmlFor="phone">Phone number</label>
                  <input id="phone" required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-dark" placeholder="+91 98765 43210" />
                </div>
                <div className="md:col-span-2">
                  <label className="label" htmlFor="address">Village / town and district</label>
                  <input id="address" required name="address" value={formData.address} onChange={handleChange} className="input-dark" placeholder="e.g. Pichavaram, Cuddalore, Tamil Nadu" />
                </div>
                <div className="md:col-span-2">
                  <label className="label" htmlFor="aadhar">Aadhaar number</label>
                  <input id="aadhar" required name="aadhar" value={formData.aadhar} onChange={handleChange} className="input-dark" placeholder="1234 5678 9012" />
                  <p className="text-sm text-slate-500 mt-1">Kept private. It is never shown in the app or stored on the blockchain.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => goTo(2)} className="btn-primary px-6 py-2.5 flex items-center gap-2">
                  Next: draw your land <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-white">Draw your land</h2>
              <MapPolygonSelector
                initialPoints={coordinates}
                onCoordinatesGenerated={setCoordinates}
                onAreaComputed={(value) => setFormData((prev) => ({ ...prev, area: value > 0 ? String(value) : '' }))}
              />
              <div>
                <label className="label" htmlFor="rtcNumber">Land record number (RTC) <span className="text-slate-500 font-normal">(optional)</span></label>
                <input id="rtcNumber" name="rtcNumber" value={formData.rtcNumber} onChange={handleChange} className="input-dark" placeholder="e.g. KA-1234-567" />
              </div>
              <div className="flex justify-between">
                <button type="button" onClick={() => goTo(1)} className="btn-ghost px-5 py-2.5 flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button type="button" onClick={() => goTo(3)} className="btn-primary px-6 py-2.5 flex items-center gap-2">
                  Next: what grows there <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-white">What grows on your land?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ECOSYSTEMS.map((eco) => {
                  const selected = formData.vegetationType === eco.value;
                  return (
                    <label
                      key={eco.value}
                      className={`rounded-xl border-2 p-5 transition-colors ${
                        eco.comingSoon ? 'border-white/5 opacity-50 cursor-not-allowed'
                          : selected ? 'cursor-pointer border-emerald-500 bg-emerald-500/10' : 'cursor-pointer border-white/10 hover:border-white/25'
                      }`}
                    >
                      <input type="radio" name="vegetationType" value={eco.value} checked={selected} onChange={handleChange} disabled={eco.comingSoon} className="sr-only" />
                      <div className="flex items-start justify-between">
                        <eco.icon className={`w-7 h-7 mb-2 ${selected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        {eco.comingSoon && <span className="text-xs font-medium text-slate-300 border border-white/15 rounded-full px-2 py-0.5">Coming soon</span>}
                      </div>
                      <p className="font-semibold text-white">{eco.label}</p>
                      <p className="text-sm text-slate-400 mt-1">{eco.description}</p>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] border border-white/10 p-4 text-slate-300">
                <Satellite className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p>When you register, our model looks at a year of satellite images of your plot and decides what grows there. Your plot is accepted only if it agrees with your choice.</p>
              </div>

              {rejection && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
                  <p className="text-rose-200 flex items-start gap-2"><AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />{rejection.message}</p>
                  {rejection.probabilities && (
                    <div className="space-y-1.5">
                      <p className="text-sm text-slate-300">What the satellite saw:</p>
                      {Object.entries(rejection.probabilities).sort((a, b) => b[1] - a[1]).map(([name, p]) => (
                        <div key={name} className="flex items-center gap-3 text-sm">
                          <span className="w-44 text-slate-300">{ECOSYSTEM_NAMES[name] || name}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.round(p * 100)}%` }} />
                          </div>
                          <span className="w-10 text-right text-slate-400">{Math.round(p * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <button type="button" onClick={() => goTo(2)} className="btn-ghost px-5 py-2.5 flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Back</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-60">
                  {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Checking satellite images…</>) : 'Register plot'}
                </button>
              </div>
              {isSubmitting && <p className="text-sm text-slate-500 text-right">This usually takes 10–20 seconds.</p>}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProjectRegistration;
