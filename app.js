const ui = {
  databaseStatus: document.getElementById("databaseStatus"),
  artifactCount: document.getElementById("artifactCount"),
  tests: document.getElementById("tests"),
  containerSelect: document.getElementById("containerSelect"),
  containerCapacity: document.getElementById("containerCapacity"),
  containerProtection: document.getElementById("containerProtection"),
  containerEffectiveness: document.getElementById("containerEffectiveness"),
  finderModeBtn: document.getElementById("finderModeBtn"),
  loadoutModeBtn: document.getElementById("loadoutModeBtn"),
  finderControls: document.getElementById("finderControls"),
  loadoutControls: document.getElementById("loadoutControls"),
  finderResults: document.getElementById("finderResults"),
  loadoutResults: document.getElementById("loadoutResults"),
  findBuilds: document.getElementById("findBuilds"),
  resetFinder: document.getElementById("resetFinder"),
  qualityMin: document.getElementById("qualityMin"),
  qualityMax: document.getElementById("qualityMax"),
  potentialMin: document.getElementById("potentialMin"),
  potentialMax: document.getElementById("potentialMax"),
  includeAdditionals: document.getElementById("includeAdditionals"),
  addRequirement: document.getElementById("addRequirement"),
  requirements: document.getElementById("requirements"),
  artifactPoolFilter: document.getElementById("artifactPoolFilter"),
  eligibleArtifactCount: document.getElementById("eligibleArtifactCount"),
  searchSummary: document.getElementById("searchSummary"),
  searchProgress: document.getElementById("searchProgress"),
  optimizerResults: document.getElementById("optimizerResults"),
  finderEmpty: document.getElementById("finderEmpty"),
  resultCount: document.getElementById("resultCount"),
  clearLoadout: document.getElementById("clearLoadout"),
  loadoutSlots: document.getElementById("loadoutSlots"),
  filledSlots: document.getElementById("filledSlots"),
  totalSlots: document.getElementById("totalSlots"),
  buildTitle: document.getElementById("buildTitle"),
  containerBonuses: document.getElementById("containerBonuses"),
  buildStats: document.getElementById("buildStats"),
  emptyBuildMessage: document.getElementById("emptyBuildMessage")
};

const QUALITY_BANDS = [
  { name: "Common", min: 85, max: 100 },
  { name: "Uncommon", min: 100, max: 115 },
  { name: "Special", min: 115, max: 130 },
  { name: "Rare", min: 130, max: 145 },
  { name: "Exclusive", min: 145, max: 160 },
  { name: "Legendary", min: 160, max: 175 },
  { name: "Unique", min: 175, max: 190 }
];

const RADIATION = "stalker.artefact_properties.factor.radiation_accumulation";
const BIOLOGICAL = "stalker.artefact_properties.factor.biological_accumulation";
const PSYCHO = "stalker.artefact_properties.factor.psycho_accumulation";
const THERMAL = "stalker.artefact_properties.factor.thermal_accumulation";
const FROST = "stalker.artefact_properties.factor.frost_accumulation";
const BLEEDING = "stalker.artefact_properties.factor.bleeding_accumulation";
const BURNING = "stalker.artefact_properties.factor.combustion_accumulation";
const ACCUMULATION_STATS = new Set([RADIATION, BIOLOGICAL, PSYCHO, THERMAL, FROST, BLEEDING, BURNING]);
const CONTAINER_PROTECTABLE_STATS = new Set([RADIATION, BIOLOGICAL, PSYCHO, THERMAL, BLEEDING]);

let artifacts = [];
let containers = [];
let statCatalog = [];
let currentContainer = null;
let loadout = [];
let requirementRows = [];
let lastFinderResults = [];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function potentialMultiplier(level) {
  return 1 + (0.02 * level);
}

function unlockedSlots(level) {
  if (level >= 15) return 3;
  if (level >= 10) return 2;
  if (level >= 5) return 1;
  return 0;
}

function qualityBand(quality) {
  if (quality >= 175) return QUALITY_BANDS[6];
  if (quality >= 160) return QUALITY_BANDS[5];
  if (quality >= 145) return QUALITY_BANDS[4];
  if (quality >= 130) return QUALITY_BANDS[3];
  if (quality >= 115) return QUALITY_BANDS[2];
  if (quality >= 100) return QUALITY_BANDS[1];
  return QUALITY_BANDS[0];
}

function isStandardArtifactStat(stat) {
  return stat.key?.startsWith("stalker.artefact_properties.factor.");
}

function wikiRange(stat) {
  const rawMax = Number(stat.max);
  const rawMin = Number(stat.min);
  let max = Math.max(rawMax, rawMin);
  let min = Math.min(rawMax, rawMin);
  if (rawMax <= 0 && rawMin <= 0) {
    max = Math.min(rawMax, rawMin);
    min = Math.max(rawMax, rawMin);
  }
  return { max, min };
}

function calculateNegativeRawStat(stat, quality) {
  const { max, min } = wikiRange(stat);
  if (quality <= 100) {
    return min + ((max - min) / 100) * quality;
  }
  const rarityBand = Math.max(0, Math.min(Math.floor((quality - 100) / 15), 5));
  const progress = Math.max(0, Math.min(quality - (100 + 15 * rarityBand), 15)) / 15;
  const bandStart = 0.85 * max;
  return bandStart + (max - bandStart) * progress;
}

function calculateRawStat(stat, quality, potential) {
  if (!isStandardArtifactStat(stat)) {
    return { value: wikiRange(stat).max, special: true };
  }
  if (stat.isPositive) {
    return {
      value: wikiRange(stat).max * (quality / 100) * potentialMultiplier(potential),
      special: false
    };
  }
  return { value: calculateNegativeRawStat(stat, quality), special: false };
}

function applyContainerEffects(stat, rawValue, container) {
  if (!container || stat.origin !== "artefact") return rawValue;
  let value = rawValue;
  if (ACCUMULATION_STATS.has(stat.key) && value > 0) {
    value *= Number(container.effectiveness || 100) / 100;
  } else if (!ACCUMULATION_STATS.has(stat.key) && stat.isPositive) {
    value *= Number(container.effectiveness || 100) / 100;
  }
  if (CONTAINER_PROTECTABLE_STATS.has(stat.key)) {
    value *= 1 - Number(container.protection || 0) / 100;
  }
  return value;
}

function formatValue(value, isPercentage = false) {
  const normalized = Math.abs(Number(value)) < 0.0005 ? 0 : Number(value);
  const sign = normalized >= 0 ? "+" : "";
  return `${sign}${normalized.toFixed(2)}${isPercentage ? "%" : ""}`;
}

function formatPercent(value) {
  const n = Math.round(Number(value) * 10) / 10;
  return `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function newSlot() {
  return { artifactId: "", quality: 135, potential: 6, additionalIds: new Set() };
}

function resizeLoadout(capacity) {
  const size = Math.max(0, Number(capacity) || 0);
  if (loadout.length > size) loadout = loadout.slice(0, size);
  while (loadout.length < size) loadout.push(newSlot());
}

function findArtifact(id) {
  return artifacts.find(a => a.id === id) || null;
}

function additionalId(stat, index) {
  return `${index}:${stat.key}`;
}

function selectedAdditionalStats(artifact, slot) {
  return (artifact.additionalStats || []).filter((stat, index) => slot.additionalIds.has(additionalId(stat, index)));
}

function calculateArtifactStats(artifact, quality, potential, selectedAdditionalIds, container) {
  const selected = selectedAdditionalIds || new Set();
  const stats = [
    ...(artifact.stats || []),
    ...(artifact.additionalStats || []).filter((stat, index) => selected.has(additionalId(stat, index)))
  ];
  return stats.map(stat => {
    const raw = calculateRawStat(stat, quality, potential);
    return {
      key: stat.key,
      name: stat.name,
      value: applyContainerEffects(stat, raw.value, container),
      isPercentage: stat.isPercentage,
      isPositive: stat.isPositive,
      special: raw.special,
      origin: stat.origin
    };
  });
}

function calculateContainerStats(container) {
  return (container?.stats || []).map(stat => ({
    key: stat.key,
    name: stat.name,
    value: Number(stat.max),
    isPercentage: stat.isPercentage,
    isPositive: stat.isPositive,
    special: false,
    origin: stat.origin
  }));
}

function statsArrayToMap(stats) {
  const map = new Map();
  stats.forEach(stat => {
    const existing = map.get(stat.key);
    if (existing) existing.value += stat.value;
    else map.set(stat.key, { ...stat });
  });
  return map;
}

function cloneTotals(map) {
  const next = new Map();
  map.forEach((value, key) => next.set(key, { ...value }));
  return next;
}

function addStatsToTotals(totals, stats) {
  const next = cloneTotals(totals);
  stats.forEach(stat => {
    const existing = next.get(stat.key);
    if (existing) existing.value += stat.value;
    else next.set(stat.key, { ...stat });
  });
  return next;
}

function sumManualBuildStats() {
  let totals = statsArrayToMap(calculateContainerStats(currentContainer));
  loadout.forEach(slot => {
    const artifact = findArtifact(slot.artifactId);
    if (!artifact) return;
    totals = addStatsToTotals(totals, calculateArtifactStats(artifact, slot.quality, slot.potential, slot.additionalIds, currentContainer));
  });
  return [...totals.values()].sort((a, b) => {
    if (a.isPositive !== b.isPositive) return a.isPositive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function buildStatCatalog() {
  const map = new Map();
  const allStats = [
    ...artifacts.flatMap(a => [...(a.stats || []), ...(a.additionalStats || [])]),
    ...containers.flatMap(c => c.stats || [])
  ];
  allStats.forEach(stat => {
    if (!isStandardArtifactStat(stat)) return;
    if (!map.has(stat.key)) {
      map.set(stat.key, {
        key: stat.key,
        name: stat.name,
        isPercentage: Boolean(stat.isPercentage),
        isPositive: Boolean(stat.isPositive)
      });
    }
  });
  statCatalog = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function statOptions(selectedKey = "") {
  const first = '<option value="">Choose stat…</option>';
  return first + statCatalog.map(stat => {
    const selected = stat.key === selectedKey ? " selected" : "";
    return `<option value="${escapeHtml(stat.key)}"${selected}>${escapeHtml(stat.name)}</option>`;
  }).join("");
}

function addRequirementRow(initial = {}) {
  const row = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    key: initial.key || "",
    op: initial.op || ">=",
    target: initial.target ?? ""
  };
  requirementRows.push(row);
  renderRequirements();
}

function renderRequirements() {
  ui.requirements.innerHTML = requirementRows.map(row => `
    <div class="requirement-row" data-requirement-id="${row.id}">
      <select data-req-field="key">${statOptions(row.key)}</select>
      <select data-req-field="op">
        <option value=">="${row.op === ">=" ? " selected" : ""}>≥ min</option>
        <option value="<="${row.op === "<=" ? " selected" : ""}>≤ max</option>
      </select>
      <input data-req-field="target" type="number" step="0.01" value="${escapeHtml(row.target)}" placeholder="Value" />
      <button class="remove-requirement" data-remove-requirement="${row.id}" type="button" aria-label="Remove requirement">×</button>
    </div>
  `).join("");
}

function collectRequirements() {
  return requirementRows
    .filter(row => row.key && Number.isFinite(Number(row.target)))
    .map(row => ({
      ...row,
      target: Number(row.target),
      stat: statCatalog.find(stat => stat.key === row.key)
    }));
}

function eligibleArtifacts() {
  const term = ui.artifactPoolFilter.value.trim().toLowerCase();
  const list = artifacts.filter(a => !term || a.name.toLowerCase().includes(term));
  ui.eligibleArtifactCount.textContent = list.length;
  return list;
}

function evaluateRequirements(totals, requirements) {
  let deficit = 0;
  let passed = 0;
  const details = requirements.map(req => {
    const actual = totals.get(req.key)?.value ?? 0;
    const scale = Math.max(1, Math.abs(req.target));
    const pass = req.op === ">=" ? actual >= req.target : actual <= req.target;
    let miss = 0;
    if (!pass) miss = req.op === ">=" ? (req.target - actual) / scale : (actual - req.target) / scale;
    if (pass) passed += 1;
    deficit += Math.max(0, miss);
    return { ...req, actual, pass, miss };
  });
  return { deficit, passed, matched: passed === requirements.length, details };
}

function variantCost(quality, potential, additionalCount) {
  return (potential * 10) + Math.max(0, quality - 85) + (additionalCount * 4);
}

function combinations(items, maxSize) {
  const result = [[]];
  function walk(start, current) {
    if (current.length >= maxSize) return;
    for (let i = start; i < items.length; i++) {
      const next = [...current, items[i]];
      result.push(next);
      if (result.length >= 64) return;
      walk(i + 1, next);
      if (result.length >= 64) return;
    }
  }
  walk(0, []);
  return result;
}

function relevantAdditionalSets(artifact, potential, requirements, enabled) {
  if (!enabled) return [[]];
  const slots = unlockedSlots(potential);
  if (slots === 0) return [[]];
  const keys = new Set(requirements.map(r => r.key));
  const relevant = (artifact.additionalStats || [])
    .map((stat, index) => ({ stat, index, id: additionalId(stat, index) }))
    .filter(item => keys.has(item.stat.key));
  if (!relevant.length) return [[]];
  return combinations(relevant, Math.min(slots, 3)).map(set => set.map(item => item.id));
}

function variantDirectedVector(stats, requirements) {
  const map = statsArrayToMap(stats);
  return requirements.map(req => {
    const value = map.get(req.key)?.value ?? 0;
    return req.op === ">=" ? value : -value;
  });
}

function dominates(a, b) {
  if (a.cost > b.cost) return false;
  let strict = a.cost < b.cost;
  for (let i = 0; i < a.vector.length; i++) {
    if (a.vector[i] < b.vector[i] - 1e-9) return false;
    if (a.vector[i] > b.vector[i] + 1e-9) strict = true;
  }
  return strict;
}

function paretoPruneVariants(variants, limit = 8) {
  const frontier = [];
  for (const candidate of variants) {
    let dominated = false;
    for (const kept of frontier) {
      if (dominates(kept, candidate)) {
        dominated = true;
        break;
      }
    }
    if (dominated) continue;
    for (let i = frontier.length - 1; i >= 0; i--) {
      if (dominates(candidate, frontier[i])) frontier.splice(i, 1);
    }
    frontier.push(candidate);
  }
  frontier.sort((a, b) => a.cost - b.cost);
  if (frontier.length <= limit) return frontier;
  const sampled = [];
  for (let i = 0; i < limit; i++) {
    const index = Math.round((i * (frontier.length - 1)) / (limit - 1));
    if (!sampled.includes(frontier[index])) sampled.push(frontier[index]);
  }
  return sampled;
}

function buildArtifactVariants(artifact, requirements, qualityMin, qualityMax, potentialMin, potentialMax, includeAdditionals) {
  const variants = [];
  for (let potential = potentialMin; potential <= potentialMax; potential++) {
    const additionalSets = relevantAdditionalSets(artifact, potential, requirements, includeAdditionals);
    for (let quality = qualityMin; quality <= qualityMax; quality++) {
      for (const ids of additionalSets) {
        const selected = new Set(ids);
        const stats = calculateArtifactStats(artifact, quality, potential, selected, currentContainer)
          .filter(stat => !stat.special);
        variants.push({
          artifactId: artifact.id,
          artifactName: artifact.name,
          quality,
          potential,
          additionalIds: ids,
          additionalNames: (artifact.additionalStats || [])
            .filter((stat, index) => selected.has(additionalId(stat, index)))
            .map(stat => stat.name),
          stats,
          cost: variantCost(quality, potential, ids.length),
          vector: variantDirectedVector(stats, requirements)
        });
      }
    }
  }
  return paretoPruneVariants(variants, 8);
}

function stateRank(state, requirements) {
  const evaluation = evaluateRequirements(state.totals, requirements);
  return (evaluation.deficit * 100000) - (evaluation.passed * 1000) + state.cost;
}

function stateSignature(state) {
  return state.picks.map(p => `${p.artifactId}:${p.quality}:${p.potential}:${p.additionalIds.join("|")}`).join(";");
}

function runBeamSearch(requirements, pool, qualityMin, qualityMax, potentialMin, potentialMax, includeAdditionals) {
  const relevantPool = pool.filter(artifact => {
    const keys = new Set([...(artifact.stats || []), ...(artifact.additionalStats || [])].map(stat => stat.key));
    return requirements.some(req => keys.has(req.key));
  });
  const searchPool = relevantPool.length ? relevantPool : pool;
  const variantsByArtifact = searchPool.map(artifact => buildArtifactVariants(
    artifact,
    requirements,
    qualityMin,
    qualityMax,
    potentialMin,
    potentialMax,
    includeAdditionals
  ));

  const baseTotals = statsArrayToMap(calculateContainerStats(currentContainer));
  const capacity = Number(currentContainer?.capacity || 0);
  let beam = [{ picks: [], totals: baseTotals, cost: 0, minArtifactIndex: 0 }];
  const BEAM_WIDTH = 240;

  for (let slot = 0; slot < capacity; slot++) {
    const next = [];
    for (const state of beam) {
      for (let artifactIndex = state.minArtifactIndex; artifactIndex < searchPool.length; artifactIndex++) {
        for (const variant of variantsByArtifact[artifactIndex]) {
          next.push({
            picks: [...state.picks, variant],
            totals: addStatsToTotals(state.totals, variant.stats),
            cost: state.cost + variant.cost,
            minArtifactIndex: artifactIndex
          });
        }
      }
    }
    next.sort((a, b) => stateRank(a, requirements) - stateRank(b, requirements));
    const deduped = [];
    const seen = new Set();
    for (const state of next) {
      const sig = stateSignature(state);
      if (seen.has(sig)) continue;
      seen.add(sig);
      deduped.push(state);
      if (deduped.length >= BEAM_WIDTH) break;
    }
    beam = deduped;
    if (!beam.length) break;
  }

  return beam
    .map(state => ({ ...state, evaluation: evaluateRequirements(state.totals, requirements) }))
    .sort((a, b) => {
      if (a.evaluation.matched !== b.evaluation.matched) return a.evaluation.matched ? -1 : 1;
      if (a.evaluation.deficit !== b.evaluation.deficit) return a.evaluation.deficit - b.evaluation.deficit;
      return a.cost - b.cost;
    })
    .slice(0, 20);
}

function renderFinderResults(results) {
  lastFinderResults = results;
  ui.optimizerResults.innerHTML = "";
  ui.resultCount.textContent = results.length;
  ui.finderEmpty.hidden = results.length > 0;
  if (!results.length) {
    ui.searchSummary.textContent = "No combinations were generated for those settings.";
    return;
  }
  const matches = results.filter(r => r.evaluation.matched).length;
  ui.searchSummary.textContent = matches
    ? `${matches} matching build${matches === 1 ? "" : "s"} shown first. Lower upgrade burden ranks ahead when requirements are met.`
    : "No exact match found in the searched range. Showing the closest combinations.";

  ui.optimizerResults.innerHTML = results.map((result, index) => {
    const match = result.evaluation.matched;
    return `
      <article class="result-card ${match ? "match" : "closest"}">
        <div class="result-card-head">
          <strong>Build ${index + 1}</strong>
          <span class="match-badge">${match ? "Requirements met" : "Closest match"}</span>
        </div>
        <div class="result-artifacts">
          ${result.picks.map(pick => `
            <div class="result-artifact">
              <strong>${escapeHtml(pick.artifactName)}</strong>
              <span>${pick.quality}% · +${pick.potential}</span>
              ${pick.additionalNames.length ? `<small>${escapeHtml(pick.additionalNames.join(", "))}</small>` : ""}
            </div>
          `).join("")}
        </div>
        <div class="result-requirements">
          ${result.evaluation.details.map(detail => `
            <span class="requirement-pill ${detail.pass ? "pass" : "fail"}">
              ${escapeHtml(detail.stat?.name || detail.key)} ${detail.op} ${detail.target}: ${formatValue(detail.actual, detail.stat?.isPercentage)}
            </span>
          `).join("")}
        </div>
        <div class="result-actions">
          <span class="result-cost">Upgrade burden ${result.cost.toFixed(0)} · relative ranking only</span>
          <button class="use-build" type="button" data-use-build="${index}">Use build</button>
        </div>
      </article>
    `;
  }).join("");
}

async function findBuilds() {
  const requirements = collectRequirements();
  if (!requirements.length) {
    ui.searchSummary.textContent = "Add at least one stat requirement first.";
    return;
  }
  if (!currentContainer) return;

  let qualityMin = Math.round(clamp(ui.qualityMin.value, 85, 190));
  let qualityMax = Math.round(clamp(ui.qualityMax.value, 85, 190));
  let potentialMin = Math.round(clamp(ui.potentialMin.value, 0, 15));
  let potentialMax = Math.round(clamp(ui.potentialMax.value, 0, 15));
  if (qualityMin > qualityMax) [qualityMin, qualityMax] = [qualityMax, qualityMin];
  if (potentialMin > potentialMax) [potentialMin, potentialMax] = [potentialMax, potentialMin];
  ui.qualityMin.value = qualityMin;
  ui.qualityMax.value = qualityMax;
  ui.potentialMin.value = potentialMin;
  ui.potentialMax.value = potentialMax;

  const pool = eligibleArtifacts();
  if (!pool.length) {
    ui.searchSummary.textContent = "No artifacts match the artifact-name filter.";
    return;
  }

  ui.findBuilds.disabled = true;
  ui.searchProgress.hidden = false;
  ui.finderEmpty.hidden = true;
  ui.optimizerResults.innerHTML = "";
  ui.resultCount.textContent = "…";
  ui.searchSummary.textContent = `Testing ${pool.length} artifacts at quality ${qualityMin}–${qualityMax}% and Potential +${potentialMin}–+${potentialMax}…`;
  await new Promise(resolve => setTimeout(resolve, 30));

  try {
    const results = runBeamSearch(
      requirements,
      pool,
      qualityMin,
      qualityMax,
      potentialMin,
      potentialMax,
      ui.includeAdditionals.checked
    );
    renderFinderResults(results);
  } catch (error) {
    console.error(error);
    ui.searchSummary.textContent = "The finder hit an error. Try a smaller range while we tune the search engine.";
    ui.resultCount.textContent = "0";
    ui.finderEmpty.hidden = false;
  } finally {
    ui.searchProgress.hidden = true;
    ui.findBuilds.disabled = false;
  }
}

function artifactOptions(selectedId) {
  return '<option value="">Empty slot</option>' + artifacts.map(artifact => {
    const selected = artifact.id === selectedId ? " selected" : "";
    return `<option value="${artifact.id}"${selected}>${escapeHtml(artifact.name)}</option>`;
  }).join("");
}

function potentialOptions(selectedLevel) {
  let html = "";
  for (let level = 0; level <= 15; level++) {
    html += `<option value="${level}"${level === selectedLevel ? " selected" : ""}>+${level}</option>`;
  }
  return html;
}

function renderAdditionalEditor(slotIndex, artifact, slot) {
  const additionals = artifact.additionalStats || [];
  const maxSlots = unlockedSlots(slot.potential);
  if (!additionals.length) return '<p class="slot-note">No additional-property data available.</p>';
  if (maxSlots === 0) return '<p class="slot-note">Additional properties unlock at +5.</p>';
  return `
    <div class="additional-heading"><span>Additional properties</span><span>${slot.additionalIds.size}/${maxSlots}</span></div>
    <div class="additional-grid">
      ${additionals.map((stat, index) => {
        const id = additionalId(stat, index);
        const checked = slot.additionalIds.has(id);
        const disabled = !checked && slot.additionalIds.size >= maxSlots;
        const raw = calculateRawStat(stat, slot.quality, slot.potential);
        const preview = applyContainerEffects(stat, raw.value, currentContainer);
        return `
          <label class="additional-option ${disabled ? "disabled" : ""}">
            <input type="checkbox" data-action="additional" data-slot="${slotIndex}" data-additional="${escapeHtml(id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
            <span>${escapeHtml(stat.name)}</span><b>${formatValue(preview, stat.isPercentage)}</b>
          </label>`;
      }).join("")}
    </div>`;
}

function renderLoadoutSlots() {
  ui.loadoutSlots.innerHTML = loadout.map((slot, index) => {
    const artifact = findArtifact(slot.artifactId);
    const rarity = qualityBand(slot.quality).name;
    return `
      <article class="artifact-slot ${artifact ? "filled" : "empty"}">
        <div class="slot-topline">
          <div><span class="slot-label">Slot ${index + 1}</span><h3>${escapeHtml(artifact?.name || "Empty")}</h3></div>
          ${artifact ? `<span class="rarity-pill rarity-${rarity.toLowerCase()}">${rarity}</span>` : ""}
        </div>
        <label class="field compact-field"><span>Artifact</span><select data-action="artifact" data-slot="${index}">${artifactOptions(slot.artifactId)}</select></label>
        <div class="slot-controls">
          <label class="field compact-field"><span>Quality</span><input data-action="quality" data-slot="${index}" type="number" min="85" max="190" step="1" value="${slot.quality}" ${artifact ? "" : "disabled"} /></label>
          <label class="field compact-field"><span>Potential</span><select data-action="potential" data-slot="${index}" ${artifact ? "" : "disabled"}>${potentialOptions(slot.potential)}</select></label>
        </div>
        ${artifact ? `<div class="additional-editor">${renderAdditionalEditor(index, artifact, slot)}</div>` : ""}
      </article>`;
  }).join("");
  const filled = loadout.filter(slot => slot.artifactId).length;
  ui.filledSlots.textContent = filled;
  ui.totalSlots.textContent = loadout.length;
}

function renderContainer() {
  if (!currentContainer) return;
  ui.containerCapacity.textContent = currentContainer.capacity;
  ui.containerProtection.textContent = formatPercent(currentContainer.protection);
  ui.containerEffectiveness.textContent = formatPercent(currentContainer.effectiveness);
}

function renderManualBuild() {
  const filled = loadout.filter(slot => slot.artifactId).length;
  ui.buildTitle.textContent = filled ? `${currentContainer?.name || "Container"} · ${filled} artifact${filled === 1 ? "" : "s"}` : "Empty loadout";
  const bonuses = calculateContainerStats(currentContainer);
  ui.containerBonuses.innerHTML = bonuses.length
    ? bonuses.map(stat => `<span><small>${escapeHtml(stat.name)}</small><b>${formatValue(stat.value, stat.isPercentage)}</b></span>`).join("")
    : '<span class="no-bonus">No fixed container stat bonuses</span>';
  const stats = sumManualBuildStats();
  ui.buildStats.innerHTML = stats.map(stat => `
    <div class="build-stat ${stat.isPositive ? "positive" : "negative"}"><strong>${escapeHtml(stat.name)}</strong><b>${formatValue(stat.value, stat.isPercentage)}</b></div>
  `).join("");
  ui.emptyBuildMessage.hidden = filled > 0 || stats.length > 0;
}

function renderAll() {
  renderContainer();
  renderLoadoutSlots();
  renderManualBuild();
  eligibleArtifacts();
}

function populateContainers(preferredId = "p92d") {
  ui.containerSelect.innerHTML = containers.map(container => {
    const selected = container.id === preferredId ? " selected" : "";
    return `<option value="${container.id}"${selected}>${escapeHtml(container.name)}</option>`;
  }).join("");
  currentContainer = containers.find(c => c.id === ui.containerSelect.value) || containers[0] || null;
  if (currentContainer) {
    ui.containerSelect.value = currentContainer.id;
    resizeLoadout(currentContainer.capacity);
  }
}

function normalizeAdditionalLimit(slot) {
  const max = unlockedSlots(slot.potential);
  if (slot.additionalIds.size > max) slot.additionalIds = new Set([...slot.additionalIds].slice(0, max));
}

function setMode(mode) {
  const finder = mode === "finder";
  ui.finderModeBtn.classList.toggle("active", finder);
  ui.loadoutModeBtn.classList.toggle("active", !finder);
  ui.finderModeBtn.setAttribute("aria-selected", String(finder));
  ui.loadoutModeBtn.setAttribute("aria-selected", String(!finder));
  ui.finderControls.hidden = !finder;
  ui.finderResults.hidden = !finder;
  ui.loadoutControls.hidden = finder;
  ui.loadoutResults.hidden = finder;
  ui.findBuilds.hidden = !finder;
  ui.resetFinder.hidden = !finder;
}

function loadFinderResult(index) {
  const result = lastFinderResults[index];
  if (!result) return;
  resizeLoadout(currentContainer?.capacity || result.picks.length);
  loadout = loadout.map((slot, i) => {
    const pick = result.picks[i];
    if (!pick) return newSlot();
    return {
      artifactId: pick.artifactId,
      quality: pick.quality,
      potential: pick.potential,
      additionalIds: new Set(pick.additionalIds)
    };
  });
  setMode("loadout");
  renderAll();
}

function resetFinder() {
  ui.qualityMin.value = 130;
  ui.qualityMax.value = 160;
  ui.potentialMin.value = 5;
  ui.potentialMax.value = 10;
  ui.includeAdditionals.checked = true;
  ui.artifactPoolFilter.value = "";
  requirementRows = [];
  const vitality = statCatalog.find(stat => stat.name.toLowerCase() === "vitality");
  addRequirementRow({ key: vitality?.key || "", op: ">=", target: vitality ? 5 : "" });
  lastFinderResults = [];
  ui.optimizerResults.innerHTML = "";
  ui.resultCount.textContent = "0";
  ui.searchSummary.textContent = "Set your requirements, then click Find loadouts.";
  ui.finderEmpty.hidden = false;
  eligibleArtifacts();
}

function runKnownTests() {
  const chilly = artifacts.find(a => a.id === "ljn2" || a.name === "Chilly");
  if (!chilly) {
    ui.tests.textContent = "Chilly safety check unavailable.";
    ui.tests.className = "fail";
    return;
  }
  const stat = (name, quality, potential) => {
    const source = (chilly.stats || []).find(s => s.name === name);
    return source ? Number(calculateRawStat(source, quality, potential).value.toFixed(2)) : NaN;
  };
  const passed = [
    [stat("Vitality", 143, 8), 4.48],
    [stat("Temperature", 143, 8), -0.64],
    [stat("Frost", 143, 8), 0.98],
    [stat("Burning", 143, 8), -0.66],
    [stat("Vitality", 135, 6), 4.08],
    [stat("Temperature", 135, 6), -0.58],
    [stat("Frost", 135, 6), 0.90],
    [stat("Burning", 135, 6), -0.60]
  ].every(([actual, expected]) => actual === expected);
  ui.tests.textContent = passed ? "✓ Chilly formula checks passed." : "⚠ Chilly formula check failed.";
  ui.tests.className = passed ? "pass" : "fail";
}

for (let level = 0; level <= 15; level++) {
  const minOption = document.createElement("option");
  minOption.value = level;
  minOption.textContent = `+${level}`;
  if (level === 5) minOption.selected = true;
  ui.potentialMin.appendChild(minOption);
  const maxOption = document.createElement("option");
  maxOption.value = level;
  maxOption.textContent = `+${level}`;
  if (level === 10) maxOption.selected = true;
  ui.potentialMax.appendChild(maxOption);
}

document.querySelectorAll(".theme-btn").forEach(button => {
  button.addEventListener("click", () => {
    const theme = button.dataset.theme;
    if (theme === "grey") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    document.querySelectorAll(".theme-btn").forEach(btn => btn.setAttribute("aria-pressed", String(btn === button)));
    localStorage.setItem("stalzone-theme", theme);
  });
});

ui.finderModeBtn.addEventListener("click", () => setMode("finder"));
ui.loadoutModeBtn.addEventListener("click", () => setMode("loadout"));
ui.findBuilds.addEventListener("click", findBuilds);
ui.resetFinder.addEventListener("click", resetFinder);
ui.addRequirement.addEventListener("click", () => addRequirementRow());
ui.artifactPoolFilter.addEventListener("input", eligibleArtifacts);

ui.requirements.addEventListener("input", event => {
  const rowEl = event.target.closest("[data-requirement-id]");
  if (!rowEl) return;
  const row = requirementRows.find(r => r.id === rowEl.dataset.requirementId);
  if (!row) return;
  const field = event.target.dataset.reqField;
  if (field) row[field] = event.target.value;
});
ui.requirements.addEventListener("change", event => {
  const rowEl = event.target.closest("[data-requirement-id]");
  if (!rowEl) return;
  const row = requirementRows.find(r => r.id === rowEl.dataset.requirementId);
  if (!row) return;
  const field = event.target.dataset.reqField;
  if (field) row[field] = event.target.value;
});
ui.requirements.addEventListener("click", event => {
  const id = event.target.dataset.removeRequirement;
  if (!id) return;
  requirementRows = requirementRows.filter(row => row.id !== id);
  renderRequirements();
});

ui.optimizerResults.addEventListener("click", event => {
  const button = event.target.closest("[data-use-build]");
  if (!button) return;
  loadFinderResult(Number(button.dataset.useBuild));
});

ui.containerSelect.addEventListener("change", () => {
  currentContainer = containers.find(c => c.id === ui.containerSelect.value) || null;
  resizeLoadout(currentContainer?.capacity || 0);
  renderAll();
});

ui.clearLoadout.addEventListener("click", () => {
  loadout = Array.from({ length: Number(currentContainer?.capacity || 0) }, () => newSlot());
  renderAll();
});

ui.loadoutSlots.addEventListener("change", event => {
  const action = event.target.dataset.action;
  const index = Number(event.target.dataset.slot);
  const slot = loadout[index];
  if (!slot) return;
  if (action === "artifact") {
    slot.artifactId = event.target.value;
    slot.additionalIds.clear();
  } else if (action === "quality") {
    slot.quality = Math.round(clamp(event.target.value, 85, 190));
  } else if (action === "potential") {
    slot.potential = Math.round(clamp(event.target.value, 0, 15));
    normalizeAdditionalLimit(slot);
  } else if (action === "additional") {
    const id = event.target.dataset.additional;
    if (event.target.checked) slot.additionalIds.add(id);
    else slot.additionalIds.delete(id);
    normalizeAdditionalLimit(slot);
  }
  renderAll();
});

ui.loadoutSlots.addEventListener("input", event => {
  if (event.target.dataset.action !== "quality") return;
  const slot = loadout[Number(event.target.dataset.slot)];
  if (!slot) return;
  const value = Number(event.target.value);
  if (!Number.isFinite(value)) return;
  slot.quality = clamp(value, 85, 190);
  renderManualBuild();
});

(async function init() {
  const savedTheme = localStorage.getItem("stalzone-theme") || "grey";
  const themeButton = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`) || document.querySelector('.theme-btn[data-theme="grey"]');
  themeButton?.click();

  ui.databaseStatus.textContent = "Loading database…";
  const loaded = await loadGameDatabase();
  artifacts = [...loaded.artifacts].sort((a, b) => a.name.localeCompare(b.name));
  containers = [...loaded.containers].sort((a, b) => a.name.localeCompare(b.name));
  buildStatCatalog();
  ui.artifactCount.textContent = artifacts.length;
  ui.databaseStatus.textContent = loaded.source === "live" ? "Full database loaded" : loaded.source === "partial" ? "Partial database loaded" : "Fallback data loaded";
  populateContainers("p92d");
  resetFinder();
  runKnownTests();
  renderAll();
  setMode("finder");
})();
