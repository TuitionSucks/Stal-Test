// Group equipment selectors by game rank/rarity while keeping item labels name-only.
// Loaded after the UI/color extensions so it can reuse their color helpers.

const ITEM_RANK_ALIASES = {
  ordinary: 'common',
  novice: 'newbie',
  unusual: 'uncommon',
  exceptional: 'exclusive'
};

const ITEM_RANK_ORDER = [
  'common',
  'newbie',
  'uncommon',
  'stalker',
  'special',
  'veteran',
  'rare',
  'master',
  'exclusive',
  'legend',
  'legendary',
  'unique'
];

const ITEM_RANK_LABELS = {
  common: 'Common',
  newbie: 'Newbie',
  uncommon: 'Uncommon',
  stalker: 'Stalker',
  special: 'Special',
  veteran: 'Veteran',
  rare: 'Rare',
  master: 'Master',
  exclusive: 'Exclusive',
  legend: 'Legend',
  legendary: 'Legendary',
  unique: 'Unique'
};

function rawItemRankKey(value = '') {
  if (typeof normalizedRank === 'function') return normalizedRank(value) || 'common';
  return String(value)
    .toLowerCase()
    .replace(/^rarity\./, '')
    .replace(/^rank_/, '')
    .replace(/[^a-z0-9_-]/g, '') || 'common';
}

function itemRankKey(value = '') {
  const raw = rawItemRankKey(value);
  return ITEM_RANK_ALIASES[raw] || raw;
}

function itemRankIndex(value) {
  const key = itemRankKey(value);
  const index = ITEM_RANK_ORDER.indexOf(key);
  return index === -1 ? ITEM_RANK_ORDER.length : index;
}

function itemRankLabel(value) {
  const key = itemRankKey(value);
  return ITEM_RANK_LABELS[key] || key.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
}

function groupItemsByRank(items, rankGetter) {
  const groups = new Map();
  for (const item of items || []) {
    const rawRank = rankGetter(item) || 'common';
    const key = itemRankKey(rawRank);
    if (!groups.has(key)) groups.set(key, { key, rawRanks: [], items: [] });
    const group = groups.get(key);
    group.rawRanks.push(rawRank);
    group.items.push(item);
  }
  return [...groups.values()]
    .sort((a, b) => itemRankIndex(a.key) - itemRankIndex(b.key) || itemRankLabel(a.key).localeCompare(itemRankLabel(b.key)))
    .map(group => ({
      ...group,
      items: group.items.sort((a, b) => a.name.localeCompare(b.name))
    }));
}

function groupedOptionsHtml(items, rankGetter, selectedValue = '', emptyLabel = null) {
  const first = emptyLabel == null ? '' : `<option value="">${escapeHtml(emptyLabel)}</option>`;
  const groups = groupItemsByRank(items, rankGetter);
  return first + groups.map(group => {
    const options = group.items.map(item => {
      const selected = item.id === selectedValue ? ' selected' : '';
      const rankValue = rankGetter(item) || group.key;
      const color = typeof itemColor === 'function' ? itemColor(rankValue) : '';
      const style = color ? ` style="color:${color}"` : '';
      return `<option value="${escapeHtml(item.id)}"${selected}${style}>${escapeHtml(item.name)}</option>`;
    }).join('');
    return `<optgroup label="${escapeHtml(itemRankLabel(group.key))}">${options}</optgroup>`;
  }).join('');
}

function regroupExistingSelect(select, items, rankGetter, emptyLabel = null) {
  if (!select || !Array.isArray(items) || !items.length) return;
  const selectedValue = select.value;
  select.innerHTML = groupedOptionsHtml(items, rankGetter, selectedValue, emptyLabel);
  if (selectedValue && [...select.options].some(option => option.value === selectedValue)) select.value = selectedValue;
}

// Containers/backpacks: actual equipment rank, alphabetical inside each rank.
const previousPopulateContainersByRank = populateContainers;
populateContainers = function populateContainersGroupedByRank(preferredId = 'p92d') {
  previousPopulateContainersByRank(preferredId);
  regroupExistingSelect(ui.containerSelect, containers, item => item.rank);
  if (currentContainer?.id) ui.containerSelect.value = currentContainer.id;
  if (typeof decorateContainerSelect === 'function') decorateContainerSelect();
};

// Armor: actual equipment rank, alphabetical inside each rank.
if (typeof populateArmorSelect === 'function') {
  const previousPopulateArmorByRank = populateArmorSelect;
  populateArmorSelect = function populateArmorGroupedByRank(...args) {
    const result = previousPopulateArmorByRank(...args);
    regroupExistingSelect(ui.armorSelect, armorDatabase, item => item.rank, 'No armor');
    if (currentArmor?.id) ui.armorSelect.value = currentArmor.id;
    if (typeof decorateArmorSelect === 'function') decorateArmorSelect();
    return result;
  };
}

// Artifacts keep name-only labels, but are grouped by rarity metadata from the data feed.
// Exact quality/rank for the equipped artifact is still controlled independently per slot.
artifactOptions = function artifactOptionsGroupedByRank(selectedId) {
  return groupedOptionsHtml(artifacts, artifact => artifact.rarity, selectedId, 'Empty slot');
};

// Search inputs should also hide empty rank headings when a filter is active.
if (typeof filterNativeSelect === 'function') {
  const previousFilterNativeSelectByRank = filterNativeSelect;
  filterNativeSelect = function filterNativeSelectAndGroups(searchInput, select) {
    previousFilterNativeSelectByRank(searchInput, select);
    select?.querySelectorAll('optgroup').forEach(group => {
      group.hidden = ![...group.querySelectorAll('option')].some(option => !option.hidden);
    });
  };
}

// Re-group already-rendered controls too, in case the async database finished before this file loaded.
function organizeCurrentItemDropdowns() {
  if (Array.isArray(containers) && containers.length && ui.containerSelect?.options?.length) {
    regroupExistingSelect(ui.containerSelect, containers, item => item.rank);
    if (currentContainer?.id) ui.containerSelect.value = currentContainer.id;
    if (typeof decorateContainerSelect === 'function') decorateContainerSelect();
  }
  if (Array.isArray(armorDatabase) && armorDatabase.length && ui.armorSelect?.options?.length) {
    regroupExistingSelect(ui.armorSelect, armorDatabase, item => item.rank, 'No armor');
    if (currentArmor?.id) ui.armorSelect.value = currentArmor.id;
    if (typeof decorateArmorSelect === 'function') decorateArmorSelect();
  }
  ui.loadoutSlots?.querySelectorAll('select[data-action="artifact"]').forEach(select => {
    const selected = select.value;
    select.innerHTML = artifactOptions(selected);
    select.value = selected;
    if (typeof styleOptions === 'function') styleOptions(select, id => itemColor(artifacts.find(item => item.id === id)?.rarity));
  });
}

setTimeout(organizeCurrentItemDropdowns, 0);
