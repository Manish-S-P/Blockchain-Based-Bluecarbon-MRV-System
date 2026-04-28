import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useNavigate } from 'react-router-dom';
import MapPolygonSelector from '../components/MapPolygonSelector';
import SuccessModal from '../components/SuccessModal';
import { CheckCircle, MapPin, Sprout, User, ChevronRight, Loader2, ShieldCheck, TreePine, Waves, Leaf } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Personal', icon: User },
  { id: 2, label: 'Land', icon: MapPin },
  { id: 3, label: 'Ecosystem', icon: Sprout },
];

const ecosystemOptions = [
  { value: 'mangrove', label: 'Mangrove', icon: TreePine, description: 'Coastal forests in tidal zones', color: 'emerald' },
  { value: 'seagrass', label: 'Seagrass', icon: Waves, description: 'Underwater meadows in shallow marine waters', color: 'cyan' },
  { value: 'saltmarsh', label: 'Saltmarsh', icon: Leaf, description: 'Grassy wetlands flooded by tides', color: 'teal' },
];

const ProjectRegistration = () => {
  const { account } = useWallet();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '', phone: '', address: '', aadhar: '',
    landMethod: 'map', rtcNumber: '', vegetationType: 'mangrove', area: '',
  });

  const [coordinates, setCoordinates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [txnHash, setTxnHash] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.landMethod === 'map' && coordinates.length < 3) {
      alert("Please plot at least 3 points on the map for the polygon boundary.");
      return;
    }
    if (formData.landMethod === 'map' && Number(formData.area || 0) <= 0) {
      alert("Unable to compute land area from polygon. Please redraw the plot.");
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, coordinates, walletAddress: account })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setTxnHash(data.registerTxHash || '');
        setShowSuccessModal(true);
      } else {
        let msg = data.error || 'Unknown server error';
        // Clean up verbose ethers errors
        const reasonMatch = msg.match(/reason="([^"]+)"/);
        if (reasonMatch) {
          msg = reasonMatch[1];
        } else if (msg.includes('execution reverted:')) {
          msg = msg.split('execution reverted:')[1].split('(')[0].trim();
        }
        
        if (msg.toLowerCase().includes('insufficient funds') || msg.toLowerCase().includes('reverted')) {
          msg = '⚠️ Insufficient Gas Funds on Amoy! Please add testnet MATIC to your wallet.';
        }

        if (msg.length > 200) {
          msg = msg.substring(0, 200) + '...';
        }

        alert('Failed to register project: ' + msg);
      }
    } catch (err) {
      alert('Error: ' + (err.message.length > 200 ? err.message.substring(0, 200) + '...' : err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="glass-card p-12 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">MetaMask Required</h2>
          <p className="text-sm text-slate-500">Please connect your wallet to access the registration portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header + step indicator */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Project Registration</h1>
          <p className="text-slate-500 text-sm mt-2">Register your coastal ecosystem plot into the blockchain registry.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  currentStep === step.id
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : currentStep > step.id
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-white/[0.03] text-slate-500 border border-white/[0.06]'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep > step.id ? 'bg-emerald-500 text-white' : currentStep === step.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.08] text-slate-500'
                }`}>
                  {currentStep > step.id ? <CheckCircle className="w-3.5 h-3.5" /> : step.id}
                </div>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-600" />
              )}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Step 1: Personal Details */}
          {currentStep === 1 && (
            <div className="glass-card p-6 md:p-8 animate-fade-up">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
                Personal Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Full Name</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} className="input-dark" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Phone Number</label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="input-dark" placeholder="+91 9876543210" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Address</label>
                  <textarea required name="address" value={formData.address} onChange={handleChange} rows="2" className="input-dark" placeholder="Street, City, State, Zip" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Aadhar Number</label>
                  <input required type="text" name="aadhar" value={formData.aadhar} onChange={handleChange} className="input-dark" placeholder="1234 5678 9012" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Land Area (Hectares)</label>
                  <input
                    required
                    min="0.0001"
                    step="0.0001"
                    type="number"
                    name="area"
                    value={formData.area}
                    onChange={handleChange}
                    readOnly={formData.landMethod === 'map'}
                    className="input-dark read-only:opacity-60"
                    placeholder={formData.landMethod === 'map' ? 'Auto-computed from map polygon' : '12.5'}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => setCurrentStep(2)} className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Land Identification */}
          {currentStep === 2 && (
            <div className="glass-card p-6 md:p-8 animate-fade-up">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-blue-400" />
                </div>
                Land Identification
              </h2>

              <div className="flex gap-3 mb-6">
                {[
                  { value: 'map', label: 'Map Polygons' },
                  { value: 'rtc', label: 'RTC Number' },
                ].map(opt => (
                  <label key={opt.value} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 border ${
                    formData.landMethod === opt.value
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                  }`}>
                    <input type="radio" name="landMethod" value={opt.value} checked={formData.landMethod === opt.value} onChange={handleChange} className="hidden" />
                    {opt.label}
                  </label>
                ))}
              </div>

              {formData.landMethod === 'rtc' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">RTC Document Number</label>
                  <input type="text" name="rtcNumber" value={formData.rtcNumber} onChange={handleChange} className="input-dark" placeholder="e.g. KA-1234-567" />
                </div>
              ) : (
                <div>
                  <MapPolygonSelector
                    onCoordinatesGenerated={setCoordinates}
                    onAreaComputed={(value) => {
                      setFormData((prev) => ({ ...prev, area: value > 0 ? String(value) : '' }));
                    }}
                  />
                  {coordinates.length > 0 && (
                    <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <p className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Coordinates Generated
                      </p>
                      <div className="text-xs font-mono text-emerald-300/60 max-h-20 overflow-y-auto break-all">
                        {JSON.stringify(coordinates)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button type="button" onClick={() => setCurrentStep(1)} className="btn-ghost px-6 py-2.5 text-sm">Back</button>
                <button type="button" onClick={() => setCurrentStep(3)} className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Ecosystem */}
          {currentStep === 3 && (
            <div className="glass-card p-6 md:p-8 animate-fade-up">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
                  <Sprout className="w-4 h-4 text-teal-400" />
                </div>
                Ecosystem Type
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ecosystemOptions.map(eco => {
                  const isSelected = formData.vegetationType === eco.value;
                  const colorMap = {
                    emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
                    cyan: { border: 'border-cyan-500/40', bg: 'bg-cyan-500/10', text: 'text-cyan-400', iconBg: 'bg-cyan-500/20' },
                    teal: { border: 'border-teal-500/40', bg: 'bg-teal-500/10', text: 'text-teal-400', iconBg: 'bg-teal-500/20' },
                  };
                  const c = colorMap[eco.color];
                  return (
                    <label
                      key={eco.value}
                      className={`cursor-pointer border-2 rounded-2xl p-6 flex flex-col items-center text-center transition-all duration-300 ${
                        isSelected
                          ? `${c.border} ${c.bg} ${c.text}`
                          : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/[0.15] hover:bg-white/[0.04]'
                      }`}
                    >
                      <input type="radio" name="vegetationType" value={eco.value} checked={isSelected} onChange={handleChange} className="hidden" />
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all duration-200 ${isSelected ? c.iconBg : 'bg-white/[0.05]'}`}>
                        <eco.icon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-base text-white mb-1">{eco.label}</span>
                      <span className="text-xs text-slate-500 leading-relaxed">{eco.description}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setCurrentStep(2)} className="btn-ghost px-6 py-2.5 text-sm">Back</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`btn-primary px-8 py-3 text-sm flex items-center gap-2 ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'glow-emerald'}`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Confirm & Register'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => navigate('/dashboard')}
        title="Deployed to Amoy!"
        message="Your project has been successfully registered on the Polygon Amoy testnet. All land data and ecosystem metrics have been secured on-chain."
        txHash={txnHash}
      />
    </div>
  );
};

export default ProjectRegistration;
