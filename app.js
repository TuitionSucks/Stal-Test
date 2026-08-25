const ui = {
  artifactSearch: document.getElementById("artifactSearch"),
  artifactSelect: document.getElementById("artifactSelect"),
  category: document.getElementById("category"),
  quality: document.getElementById("quality"),
  potential: document.getElementById("potential"),
  rarity: document.getElementById("rarity"),
  slotCount: document.getElementById("slotCount"),
  additionalOptions: document.getElementById("additionalOptions"),
  warning: document.getElementById("warning"),
  artifactTitle: document.getElementById("artifactTitle"),
  stats: document.getElementById("stats"),
  tests: document.getElementById("tests"),
  databaseStatus: document.getElementById("databaseStatus"),
  artifactCount: document.getElementById("artifactCount")
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

const CATEGORY_NAMES = {
  "artefact/biochemical": "Biochemical",
  "artefact/electrophysical": "Electrophysical",
  "artefact/gravity": "Gravity",
  "artefact/other_arts": "Other",
  "artefact/thermal": "Thermal"
};

let artifacts = [];
let filteredArtifacts = [];
let currentArtifact = null;
let selectedAdditionalKeys = new Set();

for (let level = 0; level <= 15; level++) {
  const option = document.createElement("option");
  option.value = level;
  option.textContent = `+${level}`;
  if (level === 6) option.selected = true;
  ui.potential.appendChild(option);
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
  // At exact thresholds, use the higher rarity (130 => Rare, 145 => Exclusive, etc.).
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

function beneficialEndpoint(stat) {
  if (stat.min < 0 && stat.max <= 0) return Math.min(stat.min, stat.max);
  return Math.max(stat.min, stat.max);
}

function harmfulEndpoints(stat) {
  const bothNegative = stat.min < 0 && stat.max <= 0;
  if (bothNegative) {
    return { better: Math.max(stat.min, stat.max), worse: Math.min(stat.min, stat.max) };
  }
  return { better: Math.min(stat.min, stat.max), worse: Math.max(stat.min, stat.max) };
}

function interpolateHarmful(stat, quality) {
  const band = qualityBand(quality);
  const span = band.max - band.min;
  const progress = span === 0 ? 0 : Math.max(0, Math.min(1, (quality - band.min) / span));
  const { better, worse } = harmfulEndpoints(stat);
  return better + ((worse - better) * progress);
}

function calculateStat(stat, quality, potential) {
  // Non-standard mechanic rows (for example Polyhedron trigger/reload rows) do not
  // follow the ordinary artifact-property formula. Keep their Q100 endpoint visible
  // rather than pretending they use the normal quality/potential rules.
  if (!isStandardArtifactStat(stat)) {
    return { value: beneficialEndpoint(stat), special: true };
  }

  if (stat.isPositive) {
    const value = beneficialEndpoint(stat) * (quality / 100) * potentialMultiplier(potential);
    return { value, special: false };
  }

  return { value: interpolateHarmful(stat, quality), special: false };
}

function formatValue(value, isPercentage = false) {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  const sign = normalized >= 0 ? "+" : "";
  return `${sign}${normalized.toFixed(2)}${isPercentage ? "%" : ""}`;
}

function categoryLabel(category) {
  return CATEGORY_NAMES[category] || category.replace("artefact/", "");
}

function clampQuality() {
  let quality = Number(ui.quality.value);
  if (!Number.isFinite(quality)) quality = 100;
  quality = Math.min(190, Math.max(85, quality));
  ui.quality.value = quality;
  return quality;
}

function additionalSelectionId(stat, index) {
  return `${index}:${stat.key}`;
}

function renderAdditionalOptions() {
  if (!currentArtifact) return;
  const potential = Number(ui.potential.value);
  const slots = unlockedSlots(potential);
  ui.slotCount.textContent = slots;
  ui.additionalOptions.innerHTML = "";

  const additionals = currentArtifact.additionalStats || [];
  if (additionals.length === 0) {
    ui.additionalOptions.innerHTML = '<p class="muted">No additional-property data is available for this artifact.</p>';
    return;
  }

  additionals.forEach((stat, index) => {
    const id = additionalSelectionId(stat, index);
    const label = document.createElement("label");
    label.className = "check-card";
    const checked = selectedAdditionalKeys.has(id);
    const disabled = slots === 0 || (!checked && selectedAdditionalKeys.size >= slots);
    label.innerHTML = `
      <input type="checkbox" value="${id}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
      <span>
        <strong>${stat.name}</strong>
        <small>100% base: ${formatValue(beneficialEndpoint(stat), stat.isPercentage)}</small>
      </span>
    `;
    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedAdditionalKeys.add(id);
      else selectedAdditionalKeys.delete(id);
      enforceSlotLimit();
      render();
    });
    ui.additionalOptions.appendChild(label);
  });
}

function enforceSlotLimit() {
  const slots = unlockedSlots(Number(ui.potential.value));
  if (selectedAdditionalKeys.size > slots) {
    selectedAdditionalKeys = new Set([...selectedAdditionalKeys].slice(0, slots));
    ui.warning.textContent = `Potential +${ui.potential.value} only unlocks ${slots} additional propert${slots === 1 ? "y" : "ies"}.`;
  } else {
    ui.warning.textContent = "";
  }
}

function calculateArtifact(artifact, quality, potential) {
  const rows = new Map();

  (artifact.stats || []).forEach((stat) => {
    const result = calculateStat(stat, quality, potential);
    rows.set(stat.key, {
      key: stat.key,
      name: stat.name,
      value: result.value,
      isPercentage: stat.isPercentage,
      isPositive: stat.isPositive,
      special: result.special,
      hasMain: true,
      hasAdditional: false
    });
  });

  (artifact.additionalStats || []).forEach((stat, index) => {
    const id = additionalSelectionId(stat, index);
    if (!selectedAdditionalKeys.has(id)) return;
    const result = calculateStat(stat, quality, potential);
    const existing = rows.get(stat.key);
    if (existing && !existing.special && !result.special) {
      existing.value += result.value;
      existing.hasAdditional = true;
    } else if (existing) {
      existing.hasAdditional = true;
    } else {
      rows.set(stat.key, {
        key: stat.key,
        name: stat.name,
        value: result.value,
        isPercentage: stat.isPercentage,
        isPositive: stat.isPositive,
        special: result.special,
        hasMain: false,
        hasAdditional: true
      });
    }
  });

  return [...rows.values()];
}

function renderStats() {
  if (!currentArtifact) return;
  const quality = clampQuality();
  const potential = Number(ui.potential.value);
  const band = qualityBand(quality);
  ui.rarity.textContent = band.name;
  ui.category.textContent = categoryLabel(currentArtifact.category);
  ui.artifactTitle.textContent = `${currentArtifact.name} — ${quality}% +${potential}`;

  const rows = calculateArtifact(currentArtifact, quality, potential);
  ui.stats.innerHTML = "";

  rows.forEach((row) => {
    const div = document.createElement("div");
    div.className = `stat-row ${row.isPositive ? "positive" : "negative"}`;
    const note = row.special
      ? "Special mechanic — shown at its base endpoint; generic scaling intentionally disabled"
      : row.hasAdditional
        ? "Main + selected additional"
        : row.hasMain
          ? (row.isPositive ? "Main property" : `${band.name} downside interpolation`)
          : "Selected additional";
    div.innerHTML = `
      <span>
        <strong>${row.name}</strong>
        <small>${note}</small>
      </span>
      <b>${formatValue(row.value, row.isPercentage)}</b>
    `;
    ui.stats.appendChild(div);
  });
}

function render() {
  enforceSlotLimit();
  renderAdditionalOptions();
  renderStats();
}

function sortArtifacts(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

function populateArtifactSelect(preferredId = null) {
  const previous = preferredId || currentArtifact?.id || ui.artifactSelect.value;
  ui.artifactSelect.innerHTML = "";

  filteredArtifacts.forEach((artifact) => {
    const option = document.createElement("option");
    option.value = artifact.id;
    option.textContent = `${artifact.name} — ${categoryLabel(artifact.category)}`;
    ui.artifactSelect.appendChild(option);
  });

  const preferredExists = filteredArtifacts.some(a => a.id === previous);
  if (preferredExists) ui.artifactSelect.value = previous;

  currentArtifact = filteredArtifacts.find(a => a.id === ui.artifactSelect.value) || filteredArtifacts[0] || null;
  if (currentArtifact) ui.artifactSelect.value = currentArtifact.id;
  selectedAdditionalKeys.clear();
  render();
}

function filterArtifacts() {
  const term = ui.artifactSearch.value.trim().toLowerCase();
  filteredArtifacts = artifacts.filter((artifact) => {
    const haystack = `${artifact.name} ${categoryLabel(artifact.category)}`.toLowerCase();
    return haystack.includes(term);
  });
  populateArtifactSelect();
}

function runKnownTests() {
  const chilly = artifacts.find(a => a.id === "ljn2" || a.name === "Chilly");
  if (!chilly) {
    ui.tests.textContent = "⚠ Chilly was not found, so the known-value checks could not run.";
    ui.tests.className = "fail";
    return;
  }

  const oldSelection = selectedAdditionalKeys;
  selectedAdditionalKeys = new Set();
  const find = (quality, potential, name) => {
    const row = calculateArtifact(chilly, quality, potential).find(x => x.name === name);
    return Number(row.value.toFixed(2));
  };

  const checks = [
    [find(143, 8, "Vitality"), 4.48],
    [find(143, 8, "Temperature"), -0.64],
    [find(143, 8, "Frost"), 0.98],
    [find(143, 8, "Burning"), -0.66],
    [find(135, 6, "Vitality"), 4.08],
    [find(135, 6, "Temperature"), -0.58],
    [find(135, 6, "Frost"), 0.90],
    [find(135, 6, "Burning"), -0.60]
  ];
  selectedAdditionalKeys = oldSelection;

  const passed = checks.every(([actual, expected]) => actual === expected);
  ui.tests.textContent = passed
    ? "✓ Chilly checks passed: 143% +8 and 135% +6 still match our verified values."
    : "⚠ A Chilly formula check failed. Do not trust new calculations until this is corrected.";
  ui.tests.className = passed ? "pass" : "fail";
}

ui.artifactSearch.addEventListener("input", filterArtifacts);
ui.artifactSelect.addEventListener("change", () => {
  currentArtifact = artifacts.find(a => a.id === ui.artifactSelect.value) || null;
  selectedAdditionalKeys.clear();
  render();
});
ui.quality.addEventListener("input", renderStats);
ui.potential.addEventListener("change", render);

(async function init() {
  ui.databaseStatus.textContent = "Loading artifact database…";
  const loaded = await loadArtifactDatabase();
  artifacts = sortArtifacts(loaded.artifacts);
  filteredArtifacts = artifacts;
  ui.artifactCount.textContent = artifacts.length;
  ui.databaseStatus.textContent = loaded.source === "live"
    ? "Full normalized artifact database loaded"
    : "Database fetch failed — Chilly fallback loaded";
  ui.databaseStatus.className = loaded.source === "live" ? "status live" : "status fallback";
  populateArtifactSelect("ljn2");
  runKnownTests();
})();
