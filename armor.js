// Armor + total-stat-sheet extension for the artifact calculator.
// Armors are synced from EXBO into armors.json by the GitHub Action in this repo.

let armorDatabase = [];
let currentArmor = null;
let selectedFinderResultIndex = -1;
let baseContainerStatsById = new Map();

const ARMOR_FALLBACK = [
  {
    id: "0rn7d",
    name: "Vanguard Armored Suit",
    category: "armor/combat",
    rank: "master",
    stats: [
      { key: "stalker.artefact_properties.factor.stamina_bonus", name: "Stamina", value: 20, isPercentage: true, isPositive: true, origin: "armor" },
      { key: "stalker.artefact_properties.factor.speed_modifier", name: "Movement speed", value: -2, isPercentage: true, isPositive: false, origin: "armor" },
      { key: "stalker.artefact_properties.factor.max_weight_bonus", name: "Carry weight", value: 35, isPercentage: false, isPositive: true, origin: "armor" },
      { key: "stalker.artefact_properties.factor.stopping_protection", name: "Stability", value: 10, isPercentage: true, isPositive: true, origin: "armor" },
      { key: "stalker.artefact_properties.factor.bullet_dmg_factor", name: "Bullet resistance", value: 236, isPercentage: false, isPositive: true, origin: "armor" },
      { key: "stalker.artefact_properties.factor.tear_dmg_factor", name: "Laceration protection", value: 281, isPercentage: false, isPositive: true, origin: "armor" },
      { key: "stalker.artefact_properties.factor.explosion_dmg_factor", name: "Explosion protection", value: 175, isPercentage: false, isPositive: true, origin: "armor" },
      { key: "stalker.artefact_properties.factor.electra_dmg_factor", name: "Electricity resistance", value: 50, isPercentage: false, isPositive: true, origin: "armor" },
      { key: "stalker.artefact_properties.factor.burn_dmg_factor", name: "Fire resistance", value: 50, isPercentage: false, isPositive: true, origin: "armor" },
      { key: "stalker.artefact_properties.factor.chemical_burn_dmg_factor", name: "Chemical resistance", value: 50, isPercentage: false, isPositive: true, origin: "armor" },
      { key: "stalker.artefact_properties.factor.radiation_protection", name: "Radiation protection", value: 200, isPercentage: false, isPositive: true, origin: "armor" }
    ]
  }
];

async function loadArmorDatabase() {
  try {
    const response = await fetch("armors.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Armor database request failed (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error("Armor database was empty");
    return { armors: data, source: "live" };
  } catch (error) {
    console.warn("Full armor database is not available yet; using the Vanguard fallback.", error);
    return { armors: ARMOR_FALLBACK, source: "fallback" };
  }
}

function armorStats(armor) {
  // The core calculator treats fixed container/armor stats as min/max endpoints.
  // Mirror each armor value into both fields so the existing summation engine can
  // include armor without running it through artifact quality/Potential scaling.
  return (armor?.stats || []).map(stat => {
    const value = Number(stat.value);
    return {
      key: stat.key,
      name: stat.name,
      min: value,
      max: value,
      isPercentage: Boolean(stat.isPercentage),
      isPositive: Boolean(stat.isPositive),
      origin: "armor"
    };
  });
}

function injectArmorInterface() {
  const containerPanel = ui.containerSelect?.closest(".panel");
  if (!containerPanel || document.getElementById("armorSelect")) return;

  const panel = document.createElement("section");
  panel.className = "panel armor-panel";
  panel.innerHTML = `
    <h2>Armor</h2>
    <p class="panel-hint">Armor bonuses are included in Finder requirements and the total stat sheet.</p>
    <label class="field">
      <span>Armor</span>
      <select id="armorSelect"></select>
    </label>
    <div class="armor-meta">
      <span><small>Class</small><strong id="armorClass">—</strong></span>
      <span><small>Rank</small><strong id="armorRank">—</strong></span>
    </div>
  `;
  containerPanel.parentNode.insertBefore(panel, containerPanel);

  ui.armorSelect = document.getElementById("armorSelect");
  ui.armorClass = document.getElementById("armorClass");
  ui.armorRank = document.getElementById("armorRank");

  const resultsColumn = document.querySelector(".results-column");
  if (resultsColumn && !document.getElementById("totalStatsSheet")) {
    const sheet = document.createElement("aside");
    sheet.id = "totalStatsSheet";
    sheet.className = "panel total-stats-sheet";
    sheet.innerHTML = `
      <div class="total-sheet-head">
        <div>
          <h2>Total stats</h2>
          <p id="totalStatsContext" class="panel-hint">Armor + container + artifacts</p>
        </div>
        <span id="totalStatsCount" class="result-count">0</span>
      </div>
      <div id="totalStatsMeta" class="total-stats-meta"></div>
      <div id="totalStatsBody" class="total-stats-body"></div>
      <div id="totalStatsEmpty" class="empty-state compact-empty">
        <strong>No build selected</strong>
        <span>Select armor/container settings or a finder result.</span>
      </div>
    `;
    resultsColumn.appendChild(sheet);
    ui.totalStatsSheet = sheet;
    ui.totalStatsContext = document.getElementById("totalStatsContext");
    ui.totalStatsCount = document.getElementById("totalStatsCount");
    ui.totalStatsMeta = document.getElementById("totalStatsMeta");
    ui.totalStatsBody = document.getElementById("totalStatsBody");
    ui.totalStatsEmpty = document.getElementById("totalStatsEmpty");
  }

  const style = document.createElement("style");
  style.textContent = `
    .armor-meta{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}
    .armor-meta span{display:grid;gap:1px;padding:8px 9px;border-radius:6px;background:var(--panel-2);border:1px solid var(--border-soft)}
    .armor-meta small{color:var(--muted);font-size:9px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em}
    .armor-meta strong{font-size:11px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:capitalize}
    .results-column{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:14px;align-items:start}
    #finderResults,#loadoutResults{grid-column:1;grid-row:1}
    .total-stats-sheet{grid-column:2;grid-row:1;position:sticky;top:14px;max-height:calc(100vh - 28px);overflow:hidden;display:flex;flex-direction:column;min-height:360px}
    .total-sheet-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
    .total-stats-meta{display:grid;gap:5px;margin-bottom:10px}
    .total-stats-meta span{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;border-radius:6px;background:var(--panel-2);border:1px solid var(--border-soft);font-size:10px;color:var(--muted)}
    .total-stats-meta em{font-style:normal}
    .total-stats-meta b{color:var(--text-dim);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .total-stats-body{overflow:auto;padding-right:3px;display:grid;gap:10px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
    .total-stat-group{display:grid;gap:5px}
    .total-stat-group-title{font:9px var(--mono);letter-spacing:.13em;text-transform:uppercase;color:var(--muted);padding:0 2px}
    .total-stat-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 8px;border-radius:6px;background:#0d141c;border:1px solid var(--border-soft);font-size:10.5px}
    .total-stat-row span{color:var(--text-dim);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .total-stat-row b{font:10px var(--mono);white-space:nowrap}
    .total-stat-row.good b{color:var(--good)}
    .total-stat-row.bad b{color:var(--bad)}
    .compact-empty{margin:8px 0 0;padding:14px}
    .result-card.selected-result{box-shadow:inset 0 0 0 1px var(--accent);border-color:var(--accent-dim)}
    #containerBonuses{display:none}
    @media (max-width:1260px){.results-column{grid-template-columns:1fr}.total-stats-sheet{grid-column:1;grid-row:auto;position:static;max-height:none}.total-stats-body{max-height:none}}
  `;
  document.head.appendChild(style);
}

function populateArmorSelect() {
  if (!ui.armorSelect) return;
  ui.armorSelect.innerHTML = [
    '<option value="">No armor</option>',
    ...armorDatabase.map(armor => `<option value="${escapeHtml(armor.id)}">${escapeHtml(armor.name)}</option>`)
  ].join("");
  ui.armorSelect.value = currentArmor?.id || "";
  renderArmorMeta();
}

function renderArmorMeta() {
  if (!ui.armorClass || !ui.armorRank) return;
  if (!currentArmor) {
    ui.armorClass.textContent = "None";
    ui.armorRank.textContent = "—";
    return;
  }
  ui.armorClass.textContent = currentArmor.category?.replace("armor/", "") || "Armor";
  ui.armorRank.textContent = currentArmor.rank || "—";
}

function rememberBaseContainerStats() {
  baseContainerStatsById = new Map(containers.map(container => [container.id, [...(container.stats || [])]]));
}

function applyArmorToCurrentContainer() {
  const base = containers.find(container => container.id === ui.containerSelect?.value) || currentContainer;
  if (!base) return;
  const baseStats = baseContainerStatsById.get(base.id) || [...(base.stats || [])];
  currentContainer = {
    ...base,
    stats: [...baseStats, ...armorStats(currentArmor)]
  };
}

function rebuildStatCatalogWithArmor() {
  const map = new Map();
  const allStats = [
    ...artifacts.flatMap(a => [...(a.stats || []), ...(a.additionalStats || [])]),
    ...containers.flatMap(c => c.stats || []),
    ...armorDatabase.flatMap(a => a.stats || [])
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
  if (typeof buildAllRequirementRows === "function") {
    buildAllRequirementRows(true);
    renderRequirements();
  }
}

function totalStatGroup(stat) {
  if (ACCUMULATION_STATS.has(stat.key)) return "Exposure";
  if (/(_dmg_factor|_protection|resistance|stopping_protection)/i.test(stat.key)) return "Protection";
  return "Bonuses";
}

function totalStatIsGood(stat) {
  const value = Number(stat.value || 0);
  if (ACCUMULATION_STATS.has(stat.key)) return value <= 0;
  return value >= 0;
}

function finderTotals() {
  const result = lastFinderResults[selectedFinderResultIndex];
  if (result?.totals instanceof Map) return [...result.totals.values()];
  return null;
}

function manualTotals() {
  return sumManualBuildStats();
}

function renderTotalStatsSheet() {
  if (!ui.totalStatsBody) return;
  const finderMode = !ui.finderResults.hidden;
  const finderStats = finderMode ? finderTotals() : null;
  const stats = finderStats || manualTotals();
  const visibleStats = stats
    .filter(stat => Number.isFinite(Number(stat.value)) && Math.abs(Number(stat.value)) >= 0.0005)
    .sort((a, b) => totalStatGroup(a).localeCompare(totalStatGroup(b)) || a.name.localeCompare(b.name));

  ui.totalStatsCount.textContent = visibleStats.length;
  ui.totalStatsContext.textContent = finderMode && finderStats
    ? `Finder build ${selectedFinderResultIndex + 1}`
    : "Armor + container + artifacts";
  ui.totalStatsMeta.innerHTML = `
    <span><em>Armor</em><b>${escapeHtml(currentArmor?.name || "None")}</b></span>
    <span><em>Container</em><b>${escapeHtml(currentContainer?.name || "None")}</b></span>
  `;
  ui.totalStatsEmpty.hidden = visibleStats.length > 0;

  const groups = new Map();
  for (const stat of visibleStats) {
    const group = totalStatGroup(stat);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(stat);
  }

  ui.totalStatsBody.innerHTML = [...groups.entries()].map(([group, rows]) => `
    <section class="total-stat-group">
      <div class="total-stat-group-title">${escapeHtml(group)}</div>
      ${rows.map(stat => `
        <div class="total-stat-row ${totalStatIsGood(stat) ? "good" : "bad"}">
          <span title="${escapeHtml(stat.name)}">${escapeHtml(stat.name)}</span>
          <b>${formatValue(stat.value, stat.isPercentage)}</b>
        </div>
      `).join("")}
    </section>
  `).join("");
}

function clearStaleFinderResults(message = "Armor or container changed. Run the finder again for updated combinations.") {
  selectedFinderResultIndex = -1;
  lastFinderResults = [];
  if (ui.optimizerResults) ui.optimizerResults.innerHTML = "";
  if (ui.resultCount) ui.resultCount.textContent = "0";
  if (ui.searchSummary && !ui.finderResults.hidden) ui.searchSummary.textContent = message;
  if (ui.finderEmpty) ui.finderEmpty.hidden = false;
}

function installArmorHooks() {
  const originalRenderAll = renderAll;
  renderAll = function renderAllWithTotalSheet() {
    originalRenderAll();
    renderArmorMeta();
    renderTotalStatsSheet();
  };

  const originalRenderFinderResults = renderFinderResults;
  renderFinderResults = function renderFinderResultsWithTotals(results) {
    originalRenderFinderResults(results);
    selectedFinderResultIndex = results.length ? 0 : -1;
    const cards = ui.optimizerResults.querySelectorAll(".result-card");
    cards.forEach((card, index) => card.classList.toggle("selected-result", index === selectedFinderResultIndex));
    renderTotalStatsSheet();
  };

  const originalSetMode = setMode;
  setMode = function setModeWithTotals(mode) {
    originalSetMode(mode);
    renderTotalStatsSheet();
  };

  ui.optimizerResults.addEventListener("click", event => {
    if (event.target.closest("[data-use-build]")) return;
    const card = event.target.closest(".result-card");
    if (!card) return;
    const cards = [...ui.optimizerResults.querySelectorAll(".result-card")];
    selectedFinderResultIndex = cards.indexOf(card);
    cards.forEach((item, index) => item.classList.toggle("selected-result", index === selectedFinderResultIndex));
    renderTotalStatsSheet();
  });

  ui.armorSelect.addEventListener("change", () => {
    currentArmor = armorDatabase.find(armor => armor.id === ui.armorSelect.value) || null;
    applyArmorToCurrentContainer();
    clearStaleFinderResults();
    renderAll();
  });

  ui.containerSelect.addEventListener("change", () => {
    applyArmorToCurrentContainer();
    clearStaleFinderResults("Container changed. Run the finder again for updated combinations.");
    renderAll();
  });
}

async function waitForCoreData(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (Array.isArray(artifacts) && artifacts.length && Array.isArray(containers) && containers.length && currentContainer) return true;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return false;
}

(async function initArmorSupport() {
  const armorLoad = loadArmorDatabase();
  injectArmorInterface();
  const coreReady = await waitForCoreData();
  const loaded = await armorLoad;
  armorDatabase = [...loaded.armors].sort((a, b) => a.name.localeCompare(b.name));

  if (!coreReady) {
    console.warn("Armor UI loaded before the calculator database was ready.");
    populateArmorSelect();
    return;
  }

  rememberBaseContainerStats();
  populateArmorSelect();
  applyArmorToCurrentContainer();
  rebuildStatCatalogWithArmor();
  installArmorHooks();
  renderAll();

  const armorStatus = document.createElement("span");
  armorStatus.className = "armor-database-status";
  armorStatus.textContent = ` · ${armorDatabase.length} armor${armorDatabase.length === 1 ? "" : "s"}${loaded.source === "live" ? "" : " (fallback)"}`;
  document.querySelector(".mast-notes p")?.appendChild(armorStatus);
})();
