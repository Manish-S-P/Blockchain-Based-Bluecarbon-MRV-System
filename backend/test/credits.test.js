// Run with: npm test
const test = require('node:test');
const assert = require('node:assert');
const { computeYearCredits, quarterObservation, arTool14Discount } = require('../services/credits');
const { yearWindows, windowHasEnded } = require('../services/windows');

const forecast = [1, 2, 3, 4].map(() => ({ change: 5, halfWidth: 20 }));
const start = { year: 1, cumulativeTreeGain: 0, cumulativeSoil: 0, issued: 0 };
const obs = (plotChange, plotHalfWidth, extra = {}) => ({ usable: true, anomaly: false, plotChange, plotHalfWidth, cover: 0.9, ...extra });

test('AR-TOOL14 discount steps', () => {
  assert.deepStrictEqual([0.05, 0.12, 0.18, 0.25, 0.9].map(arTool14Discount), [0, 0.25, 0.5, 0.75, 1]);
});

test('uncertain tree gain earns soil credits only', () => {
  const r = computeYearCredits({ observations: [1, 2, 3, 4].map(() => obs(10, 150)), baseline: forecast,
    actualDonorChange: [null, null, null, null], areaHa: 2, state: start });
  assert.strictEqual(r.provenTreeGain, 0);
  assert.ok(Math.abs(r.credits - 0.5 * (44 / 12) * 2 * 0.88) < 1e-9);
});

test('baseline uses the larger of forecast and actual donor change', () => {
  const r = computeYearCredits({ observations: [1, 2, 3, 4].map(() => obs(40, 1)), baseline: forecast,
    actualDonorChange: [30, null, 2, 30], areaHa: 1, state: start });
  assert.deepStrictEqual(r.perQuarter.map((q) => q.baselineUsed), [30, 5, 5, 30]);
});

test('damage in any quarter means no credits', () => {
  const r = computeYearCredits({ observations: [obs(40, 1), obs(40, 1, { anomaly: true }), obs(40, 1), obs(40, 1)],
    baseline: forecast, actualDonorChange: [null, null, null, null], areaHa: 1, state: start });
  assert.strictEqual(r.outcome, 'AnomalyDetected');
  assert.strictEqual(r.credits, 0);
});

test('quarter observation uses same-season carbon with combined range', () => {
  const o = quarterObservation({
    anomalyStatus: 'normal',
    carbon: { status: 'ok', applicableShare: 1, mangroveCover: 0.8, treeCo2: { low: 80, mid: 100, high: 120 } },
    carbonPreviousYear: { status: 'ok', treeCo2: { low: 70, mid: 90, high: 110 } },
  });
  assert.strictEqual(o.plotChange, 10);
  assert.ok(Math.abs(o.plotHalfWidth - Math.hypot(20, 20)) < 1e-9);
});

test('replay year is the last 4 completed calendar quarters', () => {
  const w = yearWindows('replay', new Date('2026-10-14T10:00:00Z'));
  assert.strictEqual(w.dayZero, '2025-10-01');
  assert.deepStrictEqual(w.monitoringWindows[3], ['2026-07-01', '2026-09-30']);
  assert.ok(w.monitoringWindows.every((window) => windowHasEnded(window, new Date('2026-10-14'))));
});
