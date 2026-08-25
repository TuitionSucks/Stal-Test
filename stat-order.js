// Keep the Final Stats -> Protection section in the same practical order as the reference UI.
// Any future protection stat that is not in this list is kept after the known rows, alphabetically.

const FINAL_PROTECTION_ORDER = [
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

const FINAL_PROTECTION_ALIASES = new Map([
  ['electric resistance', 'electricity resistance'],
  ['electrical resistance', 'electricity resistance'],
  ['bio infection protection', 'bioinfection protection'],
  ['biological infection protection', 'bioinfection protection'],
  ['psy emission protection', 'psy-emission protection'],
  ['psy protection', 'psy-emission protection']
]);

function normalizeProtectionName(value = '') {
  const clean = String(value)
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ');
  return FINAL_PROTECTION_ALIASES.get(clean) || clean;
}

function protectionOrderIndex(name) {
  const index = FINAL_PROTECTION_ORDER.indexOf(normalizeProtectionName(name));
  return index === -1 ? FINAL_PROTECTION_ORDER.length : index;
}

function reorderProtectionRows() {
  const sheet = document.getElementById('totalStatsSheet');
  if (!sheet) return;

  const section = [...sheet.querySelectorAll('.final-stat-group')].find(group => {
    const heading = group.querySelector('.final-group-heading span:last-child');
    return heading?.textContent?.trim().toLowerCase() === 'protection';
  });
  const rowsContainer = section?.querySelector('.final-group-rows');
  if (!rowsContainer) return;

  const rows = [...rowsContainer.querySelectorAll('.final-stat-row')];
  rows.sort((a, b) => {
    const aName = a.querySelector('.final-stat-name')?.textContent || '';
    const bName = b.querySelector('.final-stat-name')?.textContent || '';
    const orderDiff = protectionOrderIndex(aName) - protectionOrderIndex(bName);
    if (orderDiff) return orderDiff;
    return aName.localeCompare(bName);
  });
  rows.forEach(row => rowsContainer.appendChild(row));
}

const previousRenderTotalStatsSheetProtectionOrder = renderTotalStatsSheet;
renderTotalStatsSheet = function renderTotalStatsSheetWithProtectionOrder(...args) {
  const result = previousRenderTotalStatsSheetProtectionOrder(...args);
  reorderProtectionRows();
  return result;
};

// Reorder the already-rendered first frame too.
reorderProtectionRows();
