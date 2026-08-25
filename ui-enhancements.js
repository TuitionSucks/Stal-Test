// UI polish: searchable item selectors, rank/rarity colors, and a cleaner final-stat sheet.

const ITEM_COLORS = {
  common: '#b8bec7',
  default: '#b8bec7',
  ordinary: '#b8bec7',
  newbie: '#58c878',
  novice: '#58c878',
  stalker: '#61a8ff',
  unusual: '#58c878',
  special: '#61a8ff',
  veteran: '#c77be5',
  rare: '#c77be5',
  master: '#f05f72',
  exceptional: '#f05f72',
  exclusive: '#f05f72',
  legendary: '#f0b34c',
  legend: '#f0b34c',
  unique: '#e8dc9d'
};

function normalizedRank(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/^rarity\./, '')
    .replace(/^rank_/, '')
    .replace(/[^a-z0-9_-]/g, '');
}

function itemColor(value) {
  return ITEM_COLORS[normalizedRank(value)] || ITEM_COLORS.common;
}

function qualityColor(quality) {
  const band = qualityBand(Number(quality) || 100)?.name?.toLowerCase();
  return itemColor(band);
}

function styleOptions(select, resolver) {
  if (!select) return;
  [...select.options].forEach(option => {
    if (!option.value) return;
    option.style.color = resolver(option.value) || ITEM_COLORS.common;
  });
}

function filterNativeSelect(searchInput, select) {
  if (!searchInput || !select) return;
  const term = searchInput.value.trim().toLowerCase();
  [...select.options].forEach(option => {
    if (!option.value) {
      option.hidden = false;
      option.disabled = false;
      return;
    }
    const selected = option.value === select.value;
    const matches = !term || option.textContent.toLowerCase().includes(term);
    option.hidden = !matches && !selected;
    option.disabled = !matches && !selected;
  });
}

function injectStaticSearch(select, placeholder) {
  if (!select || select.previousElementSibling?.classList?.contains('item-search')) return;
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'item-search';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  select.parentNode.insertBefore(input, select);
  input.addEventListener('input', () => filterNativeSelect(input, select));
  select.addEventListener('change', () => {
    input.value = '';
    filterNativeSelect(input, select);
  });
}

function decorateContainerSelect() {
  if (!ui.containerSelect) return;
  injectStaticSearch(ui.containerSelect, 'Search containers…');
  styleOptions(ui.containerSelect, id => itemColor(containers.find(item => item.id === id)?.rank));
  const selected = containers.find(item => item.id === ui.containerSelect.value);
  ui.containerSelect.style.color = itemColor(selected?.rank);
}

function decorateArmorSelect() {
  if (!ui.armorSelect) return;
  injectStaticSearch(ui.armorSelect, 'Search armor…');
  styleOptions(ui.armorSelect, id => itemColor(armorDatabase.find(item => item.id === id)?.rank));
  ui.armorSelect.style.color = itemColor(currentArmor?.rank);
}

const originalPopulateContainersEnhanced = populateContainers;
populateContainers = function populateContainersWithSearch(...args) {
  const result = originalPopulateContainersEnhanced(...args);
  decorateContainerSelect();
  return result;
};

const originalPopulateArmorSelectEnhanced = populateArmorSelect;
populateArmorSelect = function populateArmorWithSearch(...args) {
  const result = originalPopulateArmorSelectEnhanced(...args);
  decorateArmorSelect();
  return result;
};

const originalRenderLoadoutSlotsEnhanced = renderLoadoutSlots;
renderLoadoutSlots = function renderLoadoutSlotsWithSearch() {
  originalRenderLoadoutSlotsEnhanced();
  ui.loadoutSlots.querySelectorAll('select[data-action="artifact"]').forEach(select => {
    styleOptions(select, id => itemColor(artifacts.find(item => item.id === id)?.rarity));
    const slot = loadout[Number(select.dataset.slot)];
    if (slot?.artifactId) select.style.color = qualityColor(slot.quality);

    if (!select.previousElementSibling?.classList?.contains('item-search')) {
      const input = document.createElement('input');
      input.type = 'search';
      input.className = 'item-search artifact-search';
      input.placeholder = 'Search artifacts…';
      input.autocomplete = 'off';
      select.parentNode.insertBefore(input, select);
      input.addEventListener('input', () => filterNativeSelect(input, select));
    }
  });
};

ui.containerSelect?.addEventListener('change', decorateContainerSelect);

const FINAL_GROUP_ORDER = ['Survivability', 'Mobility', 'Protection', 'Exposure', 'Other'];
const finalStatsCollapsed = new Set();
let showStatDeltas = true;

function finalStatGroup(stat) {
  const haystack = `${stat.key || ''} ${stat.name || ''}`.toLowerCase();
  if (ACCUMULATION_STATS.has(stat.key)) return 'Exposure';
  if (/health|heal|regeneration|recovery|vitality/.test(haystack)) return 'Survivability';
  if (/speed|stamina|weight|carry/.test(haystack)) return 'Mobility';
  if (/protection|resistance|dmg_factor|stopping|stability/.test(haystack)) return 'Protection';
  return 'Other';
}

function finalStatGood(stat, value) {
  if (ACCUMULATION_STATS.has(stat.key)) return Number(value) <= 0;
  return Number(value) >= 0;
}

function finalStatDeltaGood(stat, delta) {
  if (ACCUMULATION_STATS.has(stat.key)) return Number(delta) <= 0;
  return Number(delta) >= 0;
}

function mapStatsByKey(stats) {
  const map = new Map();
  (stats || []).forEach(stat => {
    const existing = map.get(stat.key);
    if (existing) existing.value += Number(stat.value) || 0;
    else map.set(stat.key, { ...stat, value: Number(stat.value) || 0 });
  });
  return map;
}

function equipmentBaseStats() {
  return calculateContainerStats(currentContainer);
}

function deltaBadge(stat, delta) {
  if (!showStatDeltas || Math.abs(delta) < 0.0005) return '';
  const good = finalStatDeltaGood(stat, delta);
  const arrow = good ? '▲' : '▼';
  return `<span class="stat-delta ${good ? 'good' : 'bad'}">${arrow} ${formatValue(delta, stat.isPercentage)}</span>`;
}

renderTotalStatsSheet = function renderCleanFinalStats() {
  if (!ui.totalStatsBody) return;
  const finderMode = !ui.finderResults.hidden;
  const finderStats = finderMode ? finderTotals() : null;
  const stats = finderStats || manualTotals();
  const visibleStats = (stats || [])
    .filter(stat => Number.isFinite(Number(stat.value)) && Math.abs(Number(stat.value)) >= 0.0005);

  const baseMap = mapStatsByKey(equipmentBaseStats());
  const groups = new Map(FINAL_GROUP_ORDER.map(name => [name, []]));
  for (const stat of visibleStats) groups.get(finalStatGroup(stat)).push(stat);
  groups.forEach(rows => rows.sort((a, b) => a.name.localeCompare(b.name)));

  ui.totalStatsCount.textContent = visibleStats.length;
  ui.totalStatsCount.hidden = true;
  ui.totalStatsContext.textContent = finderMode && finderStats
    ? `Finder build ${selectedFinderResultIndex + 1}`
    : `${currentArmor?.name || 'No armor'} · ${currentContainer?.name || 'No container'}`;
  ui.totalStatsMeta.innerHTML = '';
  ui.totalStatsEmpty.hidden = visibleStats.length > 0;

  ui.totalStatsBody.innerHTML = FINAL_GROUP_ORDER.map(group => {
    const rows = groups.get(group) || [];
    if (!rows.length) return '';
    const collapsed = finalStatsCollapsed.has(group);
    return `
      <section class="final-stat-group ${collapsed ? 'collapsed' : ''}" data-final-group="${escapeHtml(group)}">
        <button class="final-group-heading" type="button" data-toggle-final-group="${escapeHtml(group)}" aria-expanded="${String(!collapsed)}">
          <span class="group-chevron">⌄</span><span>${escapeHtml(group)}</span>
        </button>
        <div class="final-group-rows">
          ${rows.map(stat => {
            const baseValue = baseMap.get(stat.key)?.value || 0;
            const delta = Number(stat.value) - baseValue;
            return `
              <div class="final-stat-row">
                <span class="final-stat-name" title="${escapeHtml(stat.name)}">${escapeHtml(stat.name)}</span>
                <span class="final-stat-values">
                  ${deltaBadge(stat, delta)}
                  <b class="${finalStatGood(stat, stat.value) ? 'good' : 'bad'}">${formatValue(stat.value, stat.isPercentage)}</b>
                </span>
              </div>`;
          }).join('')}
        </div>
      </section>`;
  }).join('');
};

function polishFinalStatsHeader() {
  const sheet = document.getElementById('totalStatsSheet');
  if (!sheet) return;
  const heading = sheet.querySelector('.total-sheet-head h2');
  if (heading) heading.textContent = 'Final Stats';
  const head = sheet.querySelector('.total-sheet-head');
  if (head && !document.getElementById('toggleStatDeltas')) {
    const button = document.createElement('button');
    button.id = 'toggleStatDeltas';
    button.className = 'stat-visibility-button';
    button.type = 'button';
    button.title = 'Show or hide artifact contribution badges';
    button.setAttribute('aria-label', 'Show or hide artifact contribution badges');
    button.textContent = '◉';
    button.addEventListener('click', () => {
      showStatDeltas = !showStatDeltas;
      button.classList.toggle('muted', !showStatDeltas);
      renderTotalStatsSheet();
    });
    head.appendChild(button);
  }
}

ui.totalStatsBody?.addEventListener('click', event => {
  const button = event.target.closest('[data-toggle-final-group]');
  if (!button) return;
  const group = button.dataset.toggleFinalGroup;
  if (finalStatsCollapsed.has(group)) finalStatsCollapsed.delete(group);
  else finalStatsCollapsed.add(group);
  renderTotalStatsSheet();
});

const uiPolishStyle = document.createElement('style');
uiPolishStyle.textContent = `
  .item-search{width:100%;height:34px;margin:0 0 6px;padding:0 10px;border:1px solid #313d4b;border-radius:7px;background:#0b1118;color:var(--text);outline:none;font-size:11px}
  .item-search:focus{border-color:var(--accent-dim);box-shadow:0 0 0 2px var(--accent-soft)}
  select[data-action="artifact"]{font-weight:600}
  .total-stats-sheet{padding:16px 17px 17px!important;background:#090d12!important;border-color:#2a2f36!important}
  .total-sheet-head{align-items:center!important;margin-bottom:2px}
  .total-sheet-head h2{font-family:var(--sans)!important;font-size:18px!important;letter-spacing:0!important;text-transform:none!important;font-weight:500!important;margin:0!important;color:#f0f2f5!important}
  .total-sheet-head h2::before{display:none!important}
  .total-stats-meta{display:none!important}
  #totalStatsContext{margin:2px 0 10px!important;color:#707780!important;font-size:10px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .stat-visibility-button{margin-left:auto;width:28px;height:28px;border:0;background:transparent;color:#d8dde3;border-radius:6px;cursor:pointer;font-size:15px;line-height:1}
  .stat-visibility-button:hover{background:#151a20}.stat-visibility-button.muted{color:#616872}
  .total-stats-body{gap:5px!important;padding:0 2px 0 0!important}
  .final-stat-group{display:block}.final-group-heading{width:100%;height:24px;padding:0;border:0;background:transparent;color:#666d76;display:flex;align-items:center;gap:5px;text-align:left;font:700 9px var(--sans);text-transform:uppercase;letter-spacing:.04em;cursor:pointer}
  .group-chevron{font-size:12px;transition:transform .12s ease;transform:rotate(0deg)}.final-stat-group.collapsed .group-chevron{transform:rotate(-90deg)}
  .final-stat-group.collapsed .final-group-rows{display:none}
  .final-group-rows{display:grid;gap:1px;margin-bottom:5px}
  .final-stat-row{min-height:27px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;padding:2px 0;border:0;background:transparent;font-size:13.5px}
  .final-stat-name{color:#d8dce2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .final-stat-values{display:flex;align-items:center;justify-content:flex-end;gap:7px;white-space:nowrap}
  .final-stat-values>b{min-width:56px;text-align:right;font:13px var(--sans);font-weight:500}.final-stat-values>b.good{color:#38d067}.final-stat-values>b.bad{color:#db5559}
  .stat-delta{display:inline-flex;align-items:center;justify-content:center;min-width:76px;padding:3px 6px;border-radius:3px;font:10px var(--mono);font-weight:700}
  .stat-delta.good{background:#0b2b14;color:#43dc6e}.stat-delta.bad{background:#321011;color:#f05a5d}
  .armor-panel select,.panel select{font-weight:600}
  @media (max-width:700px){.stat-delta{min-width:0}.final-stat-row{font-size:12px}.final-stat-values>b{font-size:12px}}
`;
document.head.appendChild(uiPolishStyle);

polishFinalStatsHeader();
decorateContainerSelect();
decorateArmorSelect();
