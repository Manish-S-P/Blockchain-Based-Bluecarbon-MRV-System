const ECOSYSTEM_CARBON_DENSITY = {
  mangrove: 1.35,
  seagrass: 1.1,
  saltmarsh: 0.95,
};

const BASE_RATE = Number(process.env.CARBON_BASE_RATE || 0.8);
const DEFAULT_TIME_YEARS = Number(process.env.CARBON_DEFAULT_TIME_YEARS || 1);
const CONTRACT_TOLERANCE = Number(process.env.CONTRACT_TOLERANCE || 0.05);

const calculateExpectedCredits = (project, timeYears = DEFAULT_TIME_YEARS) => {
  const density = ECOSYSTEM_CARBON_DENSITY[project.vegetationType] || 1;
  return Number((project.area * BASE_RATE * density * timeYears).toFixed(4));
};

module.exports = {
  ECOSYSTEM_CARBON_DENSITY,
  BASE_RATE,
  DEFAULT_TIME_YEARS,
  CONTRACT_TOLERANCE,
  calculateExpectedCredits,
};
