// Monitoring windows for one year of a plot.
//
// Live mode:   day 0 = the day the baseline is locked. The year is four 3-month windows after
//              it; each quarterly check can only run once its window has ended.
// Replay mode: for demos. Day 0 = start of the last 4 completed calendar quarters, so a whole
//              year of real past satellite data can be processed at once.
// In both modes the baseline's pre-period is the 4 windows just before day 0.

const pad2 = (value) => String(value).padStart(2, '0');
const fmtDate = (date) => `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
const utcMidnight = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const addMonths = (date, months) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
const addDays = (date, days) => new Date(date.getTime() + days * 86_400_000);

/** Four consecutive 3-month windows starting at `start`, as [startDate, endDateInclusive] strings. */
const fourWindowsFrom = (start) => [0, 1, 2, 3].map((i) => {
  const from = addMonths(start, 3 * i);
  const to = addDays(addMonths(start, 3 * (i + 1)), -1);
  return [fmtDate(from), fmtDate(to)];
});

const yearWindows = (mode, now = new Date()) => {
  let dayZero;
  if (mode === 'replay') {
    const today = utcMidnight(now);
    const currentQuarterStart = new Date(Date.UTC(today.getUTCFullYear(), Math.floor(today.getUTCMonth() / 3) * 3, 1));
    dayZero = addMonths(currentQuarterStart, -12);
  } else {
    dayZero = utcMidnight(now);
  }
  return {
    mode,
    dayZero: fmtDate(dayZero),
    preWindows: fourWindowsFrom(addMonths(dayZero, -12)),
    monitoringWindows: fourWindowsFrom(dayZero),
  };
};

/** The next year's windows for a plot, continuing straight after the previous year. */
const nextYearWindows = (previousDayZero, mode) => {
  const dayZero = addMonths(new Date(`${previousDayZero}T00:00:00Z`), 12);
  return {
    mode,
    dayZero: fmtDate(dayZero),
    preWindows: fourWindowsFrom(addMonths(dayZero, -12)),
    monitoringWindows: fourWindowsFrom(dayZero),
  };
};

const windowHasEnded = ([, endInclusive], now = new Date()) => new Date(`${endInclusive}T23:59:59Z`) < now;

module.exports = { fmtDate, yearWindows, nextYearWindows, windowHasEnded };
