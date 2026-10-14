// Plain-language formatting helpers shared by the dashboard and the public page.
import { CheckCircle2, AlertTriangle, CloudOff } from 'lucide-react';

export const fmt = (value, digits = 0) => (typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '–');
export const shortHash = (hash) => (hash && hash.length > 18 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash || '–');

export const monthYear = (iso) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
export const windowLabel = ([start, end] = []) => (start && end ? `${monthYear(start)} – ${monthYear(end)}` : '');

export const TONES = {
  good: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
  bad: 'text-rose-300 bg-rose-500/10 border-rose-500/25',
  warn: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
  muted: 'text-slate-300 bg-slate-500/10 border-slate-500/25',
};


export const quarterHealth = (anomalyStatus) => {
  if (anomalyStatus === 'anomaly') return { tone: 'bad', icon: AlertTriangle, text: 'Possible damage found' };
  if (anomalyStatus === 'insufficient_data') return { tone: 'muted', icon: CloudOff, text: 'Too cloudy to check' };
  return { tone: 'good', icon: CheckCircle2, text: 'Healthy, no damage found' };
};

