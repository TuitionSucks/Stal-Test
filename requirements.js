// Requirement picker enhancement: show every searchable stat up front so users
// can enable targets quickly instead of manually adding one row at a time.

const requirementPanel = ui.requirements.closest(".panel");
const requirementSectionRow = requirementPanel?.querySelector(".section-row");
const oldRequirementButton = ui.addRequirement;

const requirementTools = document.createElement("div");
requirementTools.className = "requirement-tools";
requirementTools.innerHTML = `
  <label class="requirement-search">
    <span>Filter requirements</span>
    <input id="requirementFilter" type="search" placeholder="Search Vitality, speed, frost…" autocomplete="off" />
  </label>
  <p class="requirement-help">Stats are grouped in the same practical order as Final Stats instead of alphabetically. Turn on only the requirements you care about.</p>
`;
requirementSectionRow?.insertAdjacentElement("afterend", requirementTools);

const requirementStyle = document.createElement("style");
requirementStyle.textContent = `
  .requirement-tools{margin:-2px 0 11px;display:grid;gap:7px}
  .requirement-search{display:grid;gap:5px}
  .requirement-search>span{font:10px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .requirement-help{margin:0;color:var(--muted);font-size:10.5px;line-height:1.4}
  .requirements{max-height:560px;overflow:auto;padding-right:3px;scrollbar-width:thin;scrollbar-color:var(--border) transparent;display:grid;gap:8px}
  .requirements::-webkit-scrollbar{width:8px}.requirements::-webkit-scrollbar-thumb{background:var(--border);border-radius:99px}
  .requirement-group{display:grid;gap:3px}
  .requirement-group-title{padding:5px 2px 2px;font:700 9px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  .requirement-row{grid-template-columns:minmax(0,1fr) 72px 78px!important;opacity:.58;transition:opacity .12s ease,background .12s ease,border-color .12s ease;border:1px solid transparent;border-radius:7px;padding:5px}
  .requirement-row.enabled{opacity:1;background:var(--panel-2);border-color:var(--border-soft)}
  .requirement-toggle{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:8px;min-width:0;cursor:pointer;color:var(--text-dim);font-size:11.5px}
  .requirement-toggle input{width:14px;height:14px;margin:0;accent-color:var(--accent)}
  .requirement-toggle span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .requirement-row:not(.enabled) select,.requirement-row:not(.enabled) input[type="number"]{opacity:.45}
`;
document.head.appendChild(requirementStyle);

const REQUIREMENT_GROUP_ORDER = ['Survivability', 'Mobility', 'Protection', 'Exposure', 'Other'];
const REQUIREMENT_SURVIVABILITY_ORDER = [
  'effective health',
  'healing per second',
  'vitality',
  'healing effectiveness',
  'health regeneration',
  'periodic healing'
];
const REQUIREMENT_MOBILITY_ORDER = [
  'movement speed',
  'running speed',
  'stamina',
  'stamina regeneration',
  'carry weight'
];
const REQUIREMENT_PROTECTION_ORDER = [
  'bullet resistance',
  'laceration protection',
  'stability',
  'explosion protection',
  'fire resistance',
  'electricity resistance',
  'chemical resistance',
  'radiation protection',
  'thermal protection',
  'bioinfection protection',
  'psy-emission protection',
  'bleeding protection'
];
const REQUIREMENT_EXPOSURE_ORDER = [
  'radiation',
  'temperature',
  'biological infection',
  'psy-emissions',
  'psyonics',
  'frost',
  'bleeding',
  'burning'
];

const REQUIREMENT_NAME_ALIASES = new Map([
  ['electric resistance', 'electricity resistance'],
  ['electrical resistance', 'electricity resistance'],
  ['resistance to fire', 'fire resistance'],
  ['resistance to electricity', 'electricity resistance'],
  ['resistance to chemicals', 'chemical resistance'],
  ['bio infection protection', 'bioinfection protection'],
  ['biological infection protection', 'bioinfection protection'],
  ['psy emission protection', 'psy-emission protection'],
  ['psy protection', 'psy-emission protection']
]);

function normalizedRequirementName(value = '') {
  const clean = String(value).trim().toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  return REQUIREMENT_NAME_ALIASES.get(clean) || clean;
}

function requirementGroup(stat) {
  const haystack = `${stat?.key || ''} ${stat?.name || ''}`.toLowerCase();
  if (ACCUMULATION_STATS.has(stat?.key)) return 'Exposure';
  if (/health|heal|regeneration|recovery|vitality/.test(haystack)) return 'Survivability';
  if (/speed|stamina|weight|carry/.test(haystack)) return 'Mobility';
  if (/protection|resistance|dmg_factor|stopping|stability/.test(haystack)) return 'Protection';
  return 'Other';
}

function namedOrderIndex(name, orderedNames) {
  const normalized = normalizedRequirementName(name);
  const index = orderedNames.indexOf(normalized);
  return index === -1 ? orderedNames.length : index;
}

function requirementStatOrderIndex(stat) {
  const group = requirementGroup(stat);
  if (group === 'Survivability') return namedOrderIndex(stat.name, REQUIREMENT_SURVIVABILITY_ORDER);
  if (group === 'Mobility') return namedOrderIndex(stat.name, REQUIREMENT_MOBILITY_ORDER);
  if (group === 'Protection') return namedOrderIndex(stat.name, REQUIREMENT_PROTECTION_ORDER);
  if (group === 'Exposure') return namedOrderIndex(stat.name, REQUIREMENT_EXPOSURE_ORDER);
  return Number.MAX_SAFE_INTEGER;
}

function orderedRequirementStats() {
  return [...statCatalog].sort((a, b) => {
    const groupDiff = REQUIREMENT_GROUP_ORDER.indexOf(requirementGroup(a)) - REQUIREMENT_GROUP_ORDER.indexOf(requirementGroup(b));
    if (groupDiff) return groupDiff;
    const orderDiff = requirementStatOrderIndex(a) - requirementStatOrderIndex(b);
    if (orderDiff) return orderDiff;
    return a.name.localeCompare(b.name);
  });
}

function defaultRequirementOperator(stat) {
  return ACCUMULATION_STATS.has(stat.key) ? "<=" : ">=";
}

function buildAllRequirementRows(preserveExisting = true) {
  const previous = preserveExisting
    ? new Map(requirementRows.filter(row => row.key).map(row => [row.key, row]))
    : new Map();

  requirementRows = orderedRequirementStats().map(stat => {
    const old = previous.get(stat.key);
    return {
      id: stat.key,
      key: stat.key,
      op: old?.op || defaultRequirementOperator(stat),
      target: old?.target ?? "",
      enabled: Boolean(old?.enabled)
    };
  });
}

function requirementRowHtml(row, stat) {
  return `
    <div class="requirement-row ${row.enabled ? "enabled" : ""}" data-requirement-id="${escapeHtml(row.id)}">
      <label class="requirement-toggle" title="${escapeHtml(stat.name)}">
        <input type="checkbox" data-enable-requirement="${escapeHtml(row.id)}" ${row.enabled ? "checked" : ""} />
        <span>${escapeHtml(stat.name)}${stat.isPercentage ? " (%)" : ""}</span>
      </label>
      <select data-req-field="op" aria-label="Requirement comparison" ${row.enabled ? "" : "disabled"}>
        <option value=">="${row.op === ">=" ? " selected" : ""}>≥ min</option>
        <option value="<="${row.op === "<=" ? " selected" : ""}>≤ max</option>
      </select>
      <input data-req-field="target" type="number" step="0.01" value="${escapeHtml(row.target)}" placeholder="Value" aria-label="Target value" ${row.enabled ? "" : "disabled"} />
    </div>`;
}

renderRequirements = function renderAllRequirements() {
  const filter = document.getElementById("requirementFilter")?.value.trim().toLowerCase() || "";
  const groups = new Map(REQUIREMENT_GROUP_ORDER.map(name => [name, []]));
  for (const row of requirementRows) {
    const stat = statCatalog.find(item => item.key === row.key);
    if (!stat) continue;
    if (filter && !stat.name.toLowerCase().includes(filter)) continue;
    groups.get(requirementGroup(stat)).push({ row, stat });
  }

  ui.requirements.innerHTML = REQUIREMENT_GROUP_ORDER.map(group => {
    const entries = groups.get(group) || [];
    if (!entries.length) return '';
    return `
      <section class="requirement-group">
        <div class="requirement-group-title">${escapeHtml(group)}</div>
        ${entries.map(({ row, stat }) => requirementRowHtml(row, stat)).join('')}
      </section>`;
  }).join("") || '<p class="requirement-help">No matching stats.</p>';
};

collectRequirements = function collectEnabledRequirements() {
  return requirementRows
    .filter(row => row.enabled && row.key && row.target !== "" && Number.isFinite(Number(row.target)))
    .map(row => ({
      ...row,
      target: Number(row.target),
      stat: statCatalog.find(stat => stat.key === row.key)
    }));
};

resetFinder = function resetFinderWithAllStats() {
  ui.qualityMin.value = 130;
  ui.qualityMax.value = 160;
  ui.potentialMin.value = 5;
  ui.potentialMax.value = 10;
  ui.includeAdditionals.checked = true;
  ui.artifactPoolFilter.value = "";
  const filter = document.getElementById("requirementFilter");
  if (filter) filter.value = "";
  buildAllRequirementRows(false);
  renderRequirements();
  lastFinderResults = [];
  ui.optimizerResults.innerHTML = "";
  ui.resultCount.textContent = "0";
  ui.searchSummary.textContent = "Choose any requirements below, then click Find loadouts.";
  ui.finderEmpty.hidden = false;
  eligibleArtifacts();
};

ui.requirements.addEventListener("change", event => {
  const id = event.target.dataset.enableRequirement;
  if (!id) return;
  const row = requirementRows.find(item => item.id === id);
  if (!row) return;
  row.enabled = event.target.checked;
  renderRequirements();
});

document.getElementById("requirementFilter")?.addEventListener("input", renderRequirements);

if (oldRequirementButton) {
  const clearButton = oldRequirementButton.cloneNode(true);
  clearButton.textContent = "Clear";
  clearButton.title = "Clear active requirements";
  oldRequirementButton.replaceWith(clearButton);
  ui.addRequirement = clearButton;
  clearButton.addEventListener("click", () => {
    requirementRows.forEach(row => {
      row.enabled = false;
      row.target = "";
      row.op = defaultRequirementOperator(statCatalog.find(stat => stat.key === row.key) || { key: row.key });
    });
    renderRequirements();
  });
}

if (ui.resetFinder) {
  const freshReset = ui.resetFinder.cloneNode(true);
  ui.resetFinder.replaceWith(freshReset);
  ui.resetFinder = freshReset;
  freshReset.addEventListener("click", resetFinder);
}
