// Shared, plain-language MRV display pieces used by the dashboard and the public verification page.
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fmt, monthYear, windowLabel, TONES } from '../lib/format';

export const Pill = ({ tone, icon: Icon, children, title }) => (
  <span title={title} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${TONES[tone]}`}>
    {Icon && <Icon className="w-3.5 h-3.5" />}
    {children}
  </span>
);

const tooltipStyle = { backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' };

/** Day-0 matching: the plot vs its synthetic "twin" over the 4 quarters before day 0. */
export const TwinChart = ({ preWindows, plotLevels, syntheticLevels }) => {
  if (!plotLevels?.length) return null;
  const data = plotLevels.map((plot, i) => ({
    name: preWindows?.[i] ? monthYear(preWindows[i][1]) : `Q${i + 1}`,
    'Your plot': Number(plot.toFixed(1)),
    'Look-alike twin': Number(syntheticLevels[i].toFixed(1)),
  }));
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} t CO₂/ha`]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Your plot" stroke="#34d399" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="Look-alike twin" stroke="#94a3b8" strokeDasharray="5 4" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Month 12: how much the plot changed vs how much the baseline says it would have anyway. */
export const BaselineVsObserved = ({ calculation, windows }) => {
  if (!calculation?.perQuarter) return null;
  const data = calculation.perQuarter.map((q, i) => ({
    name: windows?.[i] ? monthYear(windows[i][1]) : `Q${i + 1}`,
    'Your plot': q.usable ? Number(q.plotChange.toFixed(1)) : null,
    'Baseline (no project)': Number(q.baselineUsed.toFixed(1)),
  }));
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <ReferenceLine y={0} stroke="#475569" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} t CO₂/ha`]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Your plot" fill="#34d399" isAnimationActive={false} />
          <Bar dataKey="Baseline (no project)" fill="#64748b" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** The year's credit calculation, line by line. */
export const CreditBreakdown = ({ calculation }) => {
  if (!calculation) return null;
  if (calculation.outcome === 'AnomalyDetected') {
    return <p className="text-rose-200">Damage was detected in at least one quarter, so no credits were issued for this year.</p>;
  }
  if (calculation.outcome === 'InsufficientData') {
    return <p className="text-slate-300">Fewer than 2 quarters had clear satellite data and a reliable carbon estimate, so no credits were issued.</p>;
  }
  const rows = [
    ['Extra tree carbon this year (your plot − baseline)', `${fmt(calculation.yearGain, 1)} ± ${fmt(calculation.yearHalfWidth, 1)} t CO₂/ha`],
    ['Extra tree carbon since the start (all years)', `${fmt(calculation.cumulativeTreeGain, 1)} t CO₂/ha`],
    ['Part of that we can prove', `${fmt(calculation.provenTreeGain, 1)} t CO₂/ha`],
    [`Soil carbon so far (official rate, ${Math.round((calculation.minCover || 0) * 100)}% mangrove cover)`, `+ ${fmt(calculation.cumulativeSoil, 2)} t CO₂/ha`],
    ['Per hectare', `${fmt(calculation.perHectare, 2)} t CO₂/ha`],
    [`× plot area (${fmt(calculation.areaHa, 2)} ha)`, `${fmt(calculation.total, 2)} t CO₂`],
    [`− safety buffer (${Math.round(calculation.bufferShare * 100)}%)`, `− ${fmt(calculation.buffer, 2)}`],
    ['− credits issued in earlier years', `− ${fmt(calculation.alreadyIssued, 2)}`],
    ['Credits this year', fmt(calculation.credits, 2)],
  ];
  return (
    <div>
      <dl className="divide-y divide-white/10 text-sm rounded-lg border border-white/10">
        {rows.map(([label, value], index) => (
          <div key={label} className={`flex justify-between gap-4 px-3 py-2 ${index === rows.length - 1 ? 'font-semibold text-white' : 'text-slate-300'}`}>
            <dt>{label}</dt>
            <dd className="text-right whitespace-nowrap">{value}</dd>
          </div>
        ))}
      </dl>
      {calculation.discountShare > 0 && (
        <p className="text-xs text-slate-500 mt-2">
          The measurement range was {calculation.relativeUncertainty === null ? 'larger than the gain' : `±${Math.round(calculation.relativeUncertainty * 100)}% of the gain`},
          so under India's official uncertainty rule (CDM AR-TOOL14) only the lower end of the gain counts. Gains keep adding up year by year, while the range does not, so tree credits appear once the gain is clearly larger.
        </p>
      )}
    </div>
  );
};

/** Per-quarter table: plot change, forecast, what the donors actually did, and the baseline used. */
export const QuarterBaselineTable = ({ calculation, windows }) => {
  if (!calculation?.perQuarter) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-slate-400 text-left">
          <tr>
            <th className="py-1.5 pr-3 font-medium">Quarter</th>
            <th className="py-1.5 pr-3 font-medium">Your plot</th>
            <th className="py-1.5 pr-3 font-medium">Forecast (sealed day 0)</th>
            <th className="py-1.5 pr-3 font-medium">Look-alikes actually</th>
            <th className="py-1.5 pr-3 font-medium">Baseline used</th>
            <th className="py-1.5 font-medium">Extra</th>
          </tr>
        </thead>
        <tbody className="text-slate-200 divide-y divide-white/5">
          {calculation.perQuarter.map((q, i) => (
            <tr key={i}>
              <td className="py-1.5 pr-3">{windowLabel(windows?.[i]) || `Q${i + 1}`}</td>
              <td className="py-1.5 pr-3">{q.usable ? fmt(q.plotChange, 1) : 'not usable'}</td>
              <td className="py-1.5 pr-3">{fmt(q.forecastChange, 1)}</td>
              <td className="py-1.5 pr-3">{q.actualDonorChange === null ? '–' : fmt(q.actualDonorChange, 1)}</td>
              <td className="py-1.5 pr-3">{fmt(q.baselineUsed, 1)}</td>
              <td className="py-1.5">{q.usable ? fmt(q.additional, 1) : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500 mt-2">Change in tree carbon vs the same season a year earlier, t CO₂/ha. The baseline used is the larger of the sealed forecast and what the look-alikes actually did, so growth that would have happened anyway is never credited.</p>
    </div>
  );
};
