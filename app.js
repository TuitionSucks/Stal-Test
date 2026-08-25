const ui = {
  databaseStatus: document.getElementById("databaseStatus"),
  artifactCount: document.getElementById("artifactCount"),
  containerSelect: document.getElementById("containerSelect"),
  containerCapacity: document.getElementById("containerCapacity"),
  containerProtection: document.getElementById("containerProtection"),
  containerEffectiveness: document.getElementById("containerEffectiveness"),
  clearLoadout: document.getElementById("clearLoadout"),
  loadoutSlots: document.getElementById("loadoutSlots"),
  filledSlots: document.getElementById("filledSlots"),
  totalSlots: document.getElementById("totalSlots"),
  buildTitle: document.getElementById("buildTitle"),
  containerBonuses: document.getElementById("containerBonuses"),
  buildStats: document.getElementById("buildStats"),
  emptyBuildMessage: document.getElementById("emptyBuildMessage"),
  tests: document.getElementById("tests")
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
let currentContainer = null;
let loadout = [];

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

function calculateRawStat(stat, quality, potential) {
  if (!isStandardArtifactStat(stat)) {
    return { value: beneficialEndpoint(stat), special: true };
  }

  if (stat.isPositive) {
    return {
      value: beneficialEndpoint(stat) * (quality / 100) * potentialMultiplier(potential),
      special: false
    };
  }

  return { value: interpolateHarmful(stat, quality), special: false };
}

function applyContainerEffects(stat, value, container, special = false) {
  if (!container || stat.origin !== "artefact" || special) return value;

  let finalValue = value;
  const effectiveness = Number(container.effectiveness) || 100;
  const protection = Number(container.protection) || 0;

  if (stat.isPositive) {
    if (ACCUMULATION_STATS.has(stat.key)) {
      if (finalValue > 0) finalValue *= effectiveness / 100;
    } else {
      finalValue *= effectiveness / 100;
    }
  }

  if (CONTAINER_PROTECTABLE_STATS.has(stat.key)) {
    finalValue *= 1 - (protection / 100);
  }

  return finalValue;
}

function formatValue(value, isPercentage = false) {
  const normalized = Math.abs(value) < 0.0005 ? 0 : value;
  const sign = normalized >= 0 ? "+" : "";
  return `${sign}${normalized.toFixed(2)}${isPercentage ? "%" : ""}`;
}

function formatPercent(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

function clampQuality(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return Math.min(190, Math.max(85, numeric));
}

function newSlot() {
  return {
    artifactId: "",
    quality: 135,
    potential: 6,
    additionalIds: new Set()
  };
}

function resizeLoadout(capacity) {
  const nextCapacity = Math.max(0, Number(capacity) || 0);
  if (loadout.length > nextCapacity) loadout = loadout.slice(0, nextCapacity);
  while (loadout.length < nextCapacity) loadout.push(newSlot());
}

function findArtifact(id) {
  return artifacts.find((artifact) => artifact.id === id) || null;
}

function additionalId(stat, index) {
  return `${index}:${stat.key}`;
}

function selectedAdditionalStats(artifact, slot) {
  return (artifact.additionalStats || []).filter((stat, index) => slot.additionalIds.has(additionalId(stat, index)));
}

function calculateArtifactForBuild(artifact, slot, container) {
  const stats = [
    ...(artifact.stats || []),
    ...selectedAdditionalStats(artifact, slot)
  ];

  return stats.map((stat) => {
    const raw = calculateRawStat(stat, slot.quality, slot.potential);
    return {
      key: stat.key,
      name: stat.name,
      value: applyContainerEffects(stat, raw.value, container, raw.special),
      isPercentage: stat.isPercentage,
      isPositive: stat.isPositive,
      special: raw.special,
      origin: stat.origin
    };
  });
}

function calculateContainerStats(container) {
  return (container?.stats || []).map((stat) => ({
    key: stat.key,
    name: stat.name,
    value: Number(stat.max),
    isPercentage: stat.isPercentage,
    isPositive: stat.isPositive,
    special: false,
    origin: stat.origin
  }));
}

function sumBuildStats(container) {
  const summed = new Map();
  const allStats = [
    ...calculateContainerStats(container),
    ...loadout.flatMap((slot) => {
      const artifact = findArtifact(slot.artifactId);
      return artifact ? calculateArtifactForBuild(artifact, slot, container) : [];
    })
  ];

  allStats.forEach((stat) => {
    const existing = summed.get(stat.key);
    if (!existing) {
      summed.set(stat.key, { ...stat, sources: 1 });
      return;
    }
    existing.value += stat.value;
    existing.sources += 1;
    existing.special = existing.special || stat.special;
  });

  return [...summed.values()].sort((a, b) => {
    if (a.isPositive !== b.isPositive) return a.isPositive ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function artifactOptions(selectedId) {
  const options = ["<option value=\"\">Empty slot</option>"];
  artifacts.forEach((artifact) => {
    const selected = artifact.id === selectedId ? " selected" : "";
    options.push(`<option value="${artifact.id}"${selected}>${escapeHtml(artifact.name)}</option>`);
  });
  return options.join("");
}

function potentialOptions(selectedLevel) {
  const options = [];
  for (let level = 0; level <= 15; level++) {
    options.push(`<option value="${level}"${level === selectedLevel ? " selected" : ""}>+${level}</option>`);
  }
  return options.join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderAdditionalEditor(slotIndex, artifact, slot, container) {
  const additionals = artifact.additionalStats || [];
  const maxSlots = unlockedSlots(slot.potential);
  if (!additionals.length) {
    return '<p class="slot-note">No additional-property data available.</p>';
  }
  if (maxSlots === 0) {
    return '<p class="slot-note">Additional properties unlock at +5.</p>';
  }

  return `
    <div class="additional-heading">
      <span>Additional properties</span>
      <span>${slot.additionalIds.size}/${maxSlots}</span>
    </div>
    <div class="additional-grid">
      ${additionals.map((stat, index) => {
        const id = additionalId(stat, index);
        const checked = slot.additionalIds.has(id);
        const disabled = !checked && slot.additionalIds.size >= maxSlots;
        const previewRaw = calculateRawStat(stat, slot.quality, slot.potential);
        const preview = applyContainerEffects(stat, previewRaw.value, container, previewRaw.special);
        return `
          <label class="additional-option ${disabled ? "disabled" : ""}">
            <input type="checkbox" data-action="additional" data-slot="${slotIndex}" data-additional="${escapeHtml(id)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
            <span>${escapeHtml(stat.name)}</span>
            <b>${formatValue(preview, stat.isPercentage)}</b>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderLoadoutSlots() {
  ui.loadoutSlots.innerHTML = loadout.map((slot, index) => {
    const artifact = findArtifact(slot.artifactId);
    const rarity = qualityBand(slot.quality).name;
    const title = artifact ? artifact.name : `Slot ${index + 1}`;

    return `
      <article class="artifact-slot ${artifact ? "filled" : "empty"}">
        <div class="slot-topline">
          <div>
            <span class="slot-label">Slot ${index + 1}</span>
            <h3>${escapeHtml(title)}</h3>
          </div>
          ${artifact ? `<span class="rarity-pill rarity-${rarity.toLowerCase()}">${rarity}</span>` : ""}
        </div>

        <label class="field compact-field">
          <span>Artifact</span>
          <select data-action="artifact" data-slot="${index}">
            ${artifactOptions(slot.artifactId)}
          </select>
        </label>

        <div class="slot-controls">
          <label class="field compact-field">
            <span>Quality</span>
            <div class="quality-control">
              <input data-action="quality" data-slot="${index}" type="number" min="85" max="190" step="0.1" value="${slot.quality}" ${artifact ? "" : "disabled"} />
              <span>%</span>
            </div>
          </label>
          <label class="field compact-field">
            <span>Potential</span>
            <select data-action="potential" data-slot="${index}" ${artifact ? "" : "disabled"}>
              ${potentialOptions(slot.potential)}
            </select>
          </label>
        </div>

        ${artifact ? `<div class="additional-editor">${renderAdditionalEditor(index, artifact, slot, currentContainer)}</div>` : ""}
      </article>
    `;
  }).join("");

  const filled = loadout.filter((slot) => slot.artifactId).length;
  ui.filledSlots.textContent = filled;
  ui.totalSlots.textContent = loadout.length;
}

function renderContainer() {
  if (!currentContainer) return;
  ui.containerCapacity.textContent = currentContainer.capacity;
  ui.containerProtection.textContent = formatPercent(currentContainer.protection);
  ui.containerEffectiveness.textContent = formatPercent(currentContainer.effectiveness);

  const bonuses = calculateContainerStats(currentContainer);
  ui.containerBonuses.innerHTML = bonuses.length
    ? bonuses.map((stat) => `<span><small>${escapeHtml(stat.name)}</small><b>${formatValue(stat.value, stat.isPercentage)}</b></span>`).join("")
    : '<span class="no-bonus">No fixed container stat bonuses</span>';
}

function renderBuildStats() {
  const filled = loadout.filter((slot) => slot.artifactId).length;
  const stats = sumBuildStats(currentContainer);
  ui.buildTitle.textContent = filled
    ? `${currentContainer?.name || "Container"} · ${filled} artifact${filled === 1 ? "" : "s"}`
    : "Empty loadout";

  ui.emptyBuildMessage.hidden = filled > 0 || stats.length > 0;
  ui.buildStats.innerHTML = stats.map((stat) => `
    <div class="build-stat ${stat.isPositive ? "positive" : "negative"}">
      <div>
        <strong>${escapeHtml(stat.name)}</strong>
        ${stat.special ? '<small>Special mechanic shown at verified base endpoint</small>' : ""}
      </div>
      <b>${formatValue(stat.value, stat.isPercentage)}</b>
    </div>
  `).join("");
}

function renderAll() {
  renderContainer();
  renderLoadoutSlots();
  renderBuildStats();
}

function populateContainers(preferredId = "p92d") {
  ui.containerSelect.innerHTML = containers.map((container) => (
    `<option value="${container.id}"${container.id === preferredId ? " selected" : ""}>${escapeHtml(container.name)}</option>`
  )).join("");

  currentContainer = containers.find((container) => container.id === ui.containerSelect.value)
    || containers[0]
    || null;

  if (currentContainer) {
    ui.containerSelect.value = currentContainer.id;
    resizeLoadout(currentContainer.capacity);
  }
}

function normalizeAdditionalLimit(slot) {
  const limit = unlockedSlots(slot.potential);
  if (slot.additionalIds.size > limit) {
    slot.additionalIds = new Set([...slot.additionalIds].slice(0, limit));
  }
}

ui.containerSelect.addEventListener("change", () => {
  currentContainer = containers.find((container) => container.id === ui.containerSelect.value) || null;
  resizeLoadout(currentContainer?.capacity || 0);
  renderAll();
});

ui.clearLoadout.addEventListener("click", () => {
  loadout = loadout.map(() => newSlot());
  renderAll();
});

ui.loadoutSlots.addEventListener("change", (event) => {
  const target = event.target;
  const action = target.dataset.action;
  const index = Number(target.dataset.slot);
  const slot = loadout[index];
  if (!slot) return;

  if (action === "artifact") {
    slot.artifactId = target.value;
    slot.additionalIds.clear();
  } else if (action === "quality") {
    slot.quality = clampQuality(target.value);
  } else if (action === "potential") {
    slot.potential = Math.max(0, Math.min(15, Number(target.value) || 0));
    normalizeAdditionalLimit(slot);
  } else if (action === "additional") {
    const id = target.dataset.additional;
    if (target.checked) {
      const limit = unlockedSlots(slot.potential);
      if (slot.additionalIds.size < limit) slot.additionalIds.add(id);
    } else {
      slot.additionalIds.delete(id);
    }
  }

  renderAll();
});

ui.loadoutSlots.addEventListener("input", (event) => {
  const target = event.target;
  if (target.dataset.action !== "quality") return;
  const slot = loadout[Number(target.dataset.slot)];
  if (!slot) return;
  const numeric = Number(target.value);
  if (Number.isFinite(numeric) && numeric >= 85 && numeric <= 190) {
    slot.quality = numeric;
    renderBuildStats();
  }
});

function runKnownTests() {
  const chilly = artifacts.find((artifact) => artifact.id === "ljn2" || artifact.name === "Chilly");
  if (!chilly) {
    ui.tests.textContent = "⚠ Chilly was not found, so the known-value checks could not run.";
    ui.tests.className = "fail";
    return;
  }

  const find = (quality, potential, name) => {
    const stat = (chilly.stats || []).find((row) => row.name === name);
    return stat ? Number(calculateRawStat(stat, quality, potential).value.toFixed(2)) : NaN;
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

  const passed = checks.every(([actual, expected]) => actual === expected);
  ui.tests.textContent = passed
    ? "✓ Chilly formula checks still pass at 143% +8 and 135% +6."
    : "⚠ A Chilly formula check failed. New build totals should not be trusted until corrected.";
  ui.tests.className = passed ? "pass" : "fail";
}

(async function init() {
  ui.databaseStatus.textContent = "Loading database…";
  const loaded = await loadGameDatabase();
  artifacts = [...loaded.artifacts].sort((a, b) => a.name.localeCompare(b.name));
  containers = [...loaded.containers].sort((a, b) => a.name.localeCompare(b.name));

  ui.artifactCount.textContent = artifacts.length;
  ui.databaseStatus.textContent = loaded.source === "live"
    ? "Artifact + container database loaded"
    : loaded.source === "partial"
      ? "Database partially loaded"
      : "Fallback data loaded";
  ui.databaseStatus.className = loaded.source === "live" ? "status live" : "status fallback";

  populateContainers("p92d");
  renderAll();
  runKnownTests();
})();
