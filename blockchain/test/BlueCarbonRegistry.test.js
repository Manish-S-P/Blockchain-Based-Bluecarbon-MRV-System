// Tests for the yearly MRV cycle: sealed baseline, quarterly observations, on-chain credits.
// Every credit amount is checked against the backend's mirror of the rule
// (backend/services/credits.js), so the two cannot silently drift apart.
const assert = require("assert");
const { ethers } = require("hardhat");
const { computeYearCredits } = require("../../backend/services/credits");

const wad = (x) => ethers.utils.parseUnits(Number(x).toFixed(12), 18);
const fromWad = (v) => Number(ethers.utils.formatUnits(v, 18));
const PLOT = "PLOT-TEST-1";
const AREA_HA = 2;
const DAY_ZERO = 1_700_000_000;
const ZERO_HASH = ethers.constants.HashZero;

const baseline = [
  { change: 5, halfWidth: 20 },
  { change: 4, halfWidth: 20 },
  { change: 3, halfWidth: 20 },
  { change: 6, halfWidth: 20 },
];

const encodeCommitment = (year, b, auditHash, salt) => ethers.utils.keccak256(
  ethers.utils.defaultAbiCoder.encode(
    ["string", "uint16", "uint64", "int256[4]", "uint256[4]", "bytes32", "bytes32"],
    [PLOT, year, DAY_ZERO, b.map((q) => wad(q.change)), b.map((q) => wad(q.halfWidth)), auditHash, salt],
  ),
);

const reveal = (b, auditHash, salt, actual) => ({
  baselineChange: b.map((q) => wad(q.change)),
  baselineHalfWidth: b.map((q) => wad(q.halfWidth)),
  auditHash,
  salt,
  actualDonorChange: actual.map((a) => wad(a ?? -1e6)), // "unknown" = very low, so the forecast is used
});

const observation = (plotChange, plotHalfWidth, extra = {}) => ({
  usable: true, anomaly: false, plotChange, plotHalfWidth, cover: 0.9, ...extra,
});

async function deploy() {
  const [owner, farmer, stranger] = await ethers.getSigners();
  const Registry = await ethers.getContractFactory("BlueCarbonRegistry");
  const registry = await Registry.deploy(owner.address);
  await registry.deployed();
  await registry.registerPlot(PLOT, farmer.address, wad(AREA_HA), 0);
  return { registry, owner, farmer, stranger };
}

async function runYear(registry, year, observations, { actual = [null, null, null, null], salt, revealBaseline } = {}) {
  const auditHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(`audit-year-${year}`));
  const s = salt || ethers.utils.hexlify(ethers.utils.randomBytes(32));
  await registry.commitBaseline(PLOT, encodeCommitment(year, baseline, auditHash, s), DAY_ZERO);
  for (const [i, o] of observations.entries()) {
    await registry.recordObservation(PLOT, i + 1, wad(o.plotChange), wad(o.plotHalfWidth),
      Math.round(o.cover * 10_000), o.usable, o.anomaly, ZERO_HASH);
  }
  const tx = await registry.finalizeYear(PLOT, reveal(revealBaseline || baseline, auditHash, s, actual), `ipfs://report-${year}`);
  const receipt = await tx.wait();
  const parsed = receipt.logs.map((log) => { try { return registry.interface.parseLog(log); } catch { return null; } });
  const event = parsed.find((e) => e && e.name === "YearFinalized");
  // Name the values by their position in the ABI (this ethers version returns them positionally).
  return Object.fromEntries(event.eventFragment.inputs.map((input, i) => [input.name, event.args[i]]));
}

const assertClose = (actual, expected, label) => {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: contract ${actual} vs mirror ${expected}`);
};

describe("BlueCarbonRegistry yearly cycle", () => {
  it("credits only soil when the tree gain is smaller than its uncertainty", async () => {
    const { registry, farmer } = await deploy();
    const obs = [observation(10, 150), observation(12, 150), observation(8, 150), observation(10, 150)];
    const args = await runYear(registry, 1, obs);

    const expected = computeYearCredits({
      observations: obs, baseline, actualDonorChange: [null, null, null, null], areaHa: AREA_HA,
      state: { year: 1, cumulativeTreeGain: 0, cumulativeSoil: 0, issued: 0 },
    });
    assert.equal(args.outcome, 0); // Minted
    assertClose(fromWad(args.provenTreeGain), 0, "proven tree gain");
    assertClose(fromWad(args.credits), expected.credits, "credits");
    assertClose(fromWad(args.credits), 1.8333333333 * 0.88 * AREA_HA, "soil-only credits");
    assert.equal(await registry.ownerOf(args.tokenId), farmer.address);
    assert.equal(await registry.tokenURI(args.tokenId), "ipfs://report-1");
  });

  it("rejects a baseline that differs from the sealed one (BaselineMismatch)", async () => {
    const { registry } = await deploy();
    const obs = [1, 2, 3, 4].map(() => observation(10, 20));
    const tampered = baseline.map((q) => ({ ...q, change: q.change - 3 })); // lower baseline = more credits
    await assert.rejects(runYear(registry, 1, obs, { revealBaseline: tampered }), /BaselineMismatch/);
  });

  it("issues no credits in a year with a damage anomaly", async () => {
    const { registry } = await deploy();
    const obs = [observation(30, 5), observation(30, 5, { anomaly: true }), observation(30, 5), observation(30, 5)];
    const args = await runYear(registry, 1, obs);
    assert.equal(args.outcome, 2); // AnomalyDetected
    assert.equal(args.credits.toString(), "0");
    assert.equal((await registry.plots(PLOT)).year, 2); // the next year can still start
  });

  it("needs at least 2 usable quarters", async () => {
    const { registry } = await deploy();
    const obs = [observation(30, 5), observation(0, 0, { usable: false }), observation(0, 0, { usable: false }), observation(0, 0, { usable: false })];
    const args = await runYear(registry, 1, obs);
    assert.equal(args.outcome, 3); // InsufficientData
  });

  it("uses the donors' actual change when it is larger than the forecast", async () => {
    const { registry } = await deploy();
    const obs = [1, 2, 3, 4].map(() => observation(40, 2));
    const actual = [30, 30, 30, 30]; // donors grew more than forecast (5, 4, 3, 6)
    const args = await runYear(registry, 1, obs, { actual });
    const expected = computeYearCredits({
      observations: obs, baseline, actualDonorChange: actual, areaHa: AREA_HA,
      state: { year: 1, cumulativeTreeGain: 0, cumulativeSoil: 0, issued: 0 },
    });
    assertClose(fromWad(args.yearGain), 10, "additional gain = 40 - 30");
    assertClose(fromWad(args.credits), expected.credits, "credits");
  });

  it("adds gains up over years and subtracts credits already issued", async () => {
    const { registry } = await deploy();
    let state = { year: 1, cumulativeTreeGain: 0, cumulativeSoil: 0, issued: 0 };
    const obs = [1, 2, 3, 4].map(() => observation(30, 40)); // 25 t/ha extra per year, +-~45
    let total = 0;
    for (let year = 1; year <= 3; year++) {
      const args = await runYear(registry, year, obs);
      const expected = computeYearCredits({ observations: obs, baseline, actualDonorChange: [null, null, null, null], areaHa: AREA_HA, state });
      assertClose(fromWad(args.credits), expected.credits, `year ${year} credits`);
      total += fromWad(args.credits);
      state = expected.newState;
    }
    // By year 3 the cumulative tree gain (~75) is clearly larger than its uncertainty, so trees are credited.
    assert.ok(state.cumulativeTreeGain > 70);
    assertClose(total, state.issued, "total issued");
    assert.ok(total > 3 * 1.8333 * 0.88 * AREA_HA, "more than soil alone by year 3");
  });

  it("only the owner (MRV backend) can write", async () => {
    const { registry, stranger } = await deploy();
    await assert.rejects(registry.connect(stranger).commitBaseline(PLOT, ethers.utils.formatBytes32String("x"), DAY_ZERO));
  });

  it("exposes the commitment formula so anyone can re-check a reveal", async () => {
    const { registry } = await deploy();
    const auditHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes("audit"));
    const salt = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const onChain = await registry.computeCommitment(PLOT, 1, DAY_ZERO, baseline.map((q) => wad(q.change)), baseline.map((q) => wad(q.halfWidth)), auditHash, salt);
    assert.equal(onChain, encodeCommitment(1, baseline, auditHash, salt));
  });
});
