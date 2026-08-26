// Armor upgrade-level support + integrated searchable item selectors.
// Armor +0 through +15 values come from EXBO's official _variants files, synced
// into armors.json by scripts/build-armors.mjs. The searchable combobox keeps the
// existing native selects underneath so the calculator's existing change hooks
// continue to work normally.

let armorUpgradeLevel = 0;
const ARMOR_MAX_UPGRADE = 15;

function armorLevelStats(armor, level = armorUpgradeLevel) {
  if (!armor) return [];
  const levels = armor.levels || {};
  return levels[String(level)] || levels[level] || (Number(level) === 0 ? armor.stats || [] : []);
}

// Replace the +0-only armor helper. currentContainer is rebuilt from this helper,
// so Finder targets, Final Stats, and equipment-credit calculations all see the
// selected armor upgrade level automatically.
armorStats = function armorStatsAtSelectedUpgrade(armor) {
  const source = armorLevelStats(armor);
  return source.map(stat => {
    const value = Number(stat.value ?? stat.max ?? stat.min ?? 0);
    return {
      key: stat.key,
      name: stat.name,
      min: value,
      max: value,
      isPercentage: Boolean(stat.isPercentage),
      isPositive: Boolean(stat.isPositive ?? value >= 0),
      origin: 'armor'
    };
  });
};

// equipment-targets.js normally reads currentArmor.stats directly. Point it at
// the selected EXBO upgrade variant too so a +9/+15 armor is credited correctly.
if (typeof armorBreakdownMap === 'function' && typeof statsToFixedMap === 'function') {
  armorBreakdownMap = function armorBreakdownMapAtUpgrade() {
    if (!currentArmor) return new Map();
    return statsToFixedMap(armorStats(currentArmor));
  };
}

function armorAvailableLevels(armor) {
  if (!armor) return new Set([0]);
  const levels = armor.levels || {};
  const available = new Set(Object.keys(levels).map(Number).filter(Number.isFinite));
  if (!available.size) available.add(0);
  return available;
}

function refreshArmorUpgradeControl() {
  const select = document.getElementById('armorUpgradeLevel');
  const note = document.getElementById('armorUpgradeNote');
  if (!select) return;

  const available = armorAvailableLevels(currentArmor);
  if (!available.has(armorUpgradeLevel)) armorUpgradeLevel = 0;
  select.value = String(armorUpgradeLevel);

  [...select.options].forEach(option => {
    const level = Number(option.value);
    option.disabled = !available.has(level);
  });

  if (note) {
    if (!currentArmor) {
      note.textContent = 'Select armor to choose its enhancement level.';
    } else if (available.size <= 1) {
      note.textContent = 'This armor currently has no synced upgrade variants; +0 is being used.';
    } else {
      note.textContent = `Using ${currentArmor.name} +${armorUpgradeLevel} stats from the official EXBO upgrade variant.`;
    }
  }
}

function injectArmorUpgradeControl() {
  if (document.getElementById('armorUpgradeLevel')) return;
  const armorSelect = document.getElementById('armorSelect');
  const armorPanel = armorSelect?.closest('.armor-panel');
  const armorField = armorSelect?.closest('.field');
  if (!armorSelect || !armorPanel || !armorField) return;

  const field = document.createElement('label');
  field.className = 'field armor-upgrade-field';
  field.innerHTML = `
    <span>Armor upgrade</span>
    <select id="armorUpgradeLevel" aria-label="Armor upgrade level">
      ${Array.from({ length: ARMOR_MAX_UPGRADE + 1 }, (_, level) => `<option value="${level}">+${level}</option>`).join('')}
    </select>
    <small id="armorUpgradeNote" class="armor-upgrade-note"></small>
  `;
  armorField.insertAdjacentElement('afterend', field);

  const select = document.getElementById('armorUpgradeLevel');
  select.addEventListener('change', () => {
    armorUpgradeLevel = Math.max(0, Math.min(ARMOR_MAX_UPGRADE, Number(select.value) || 0));
    applyArmorToCurrentContainer();
    if (typeof clearStaleFinderResults === 'function') {
      clearStaleFinderResults(`Armor upgrade changed to +${armorUpgradeLevel}. Run the finder again for updated combinations.`);
    }
    if (typeof updateEquipmentTargetPreview === 'function') updateEquipmentTargetPreview();
    renderAll();
    refreshArmorUpgradeControl();
  });

  armorSelect.addEventListener('change', () => {
    setTimeout(() => {
      const available = armorAvailableLevels(currentArmor);
      if (!available.has(armorUpgradeLevel)) armorUpgradeLevel = 0;
      applyArmorToCurrentContainer();
      refreshArmorUpgradeControl();
      if (typeof updateEquipmentTargetPreview === 'function') updateEquipmentTargetPreview();
      renderAll();
    }, 0);
  });

  refreshArmorUpgradeControl();
}

// Keep the selected upgrade visible in the Final Stats context.
if (typeof renderTotalStatsSheet === 'function') {
  const renderTotalStatsBeforeArmorLevel = renderTotalStatsSheet;
  renderTotalStatsSheet = function renderTotalStatsWithArmorLevel(...args) {
    const result = renderTotalStatsBeforeArmorLevel(...args);
    if (ui.totalStatsContext && currentArmor) {
      const current = ui.totalStatsContext.textContent || '';
      const armorName = currentArmor.name;
      if (current.includes(armorName) && !current.includes(`${armorName} +${armorUpgradeLevel}`)) {
        ui.totalStatsContext.textContent = current.replace(armorName, `${armorName} +${armorUpgradeLevel}`);
      }
    }
    return result;
  };
}

// ---------- Integrated searchable item combobox ----------

const comboRegistry = new WeakMap();
let openItemCombo = null;

function comboPlaceholder(select) {
  if (select.id === 'armorSelect') return 'Search or choose armor…';
  if (select.id === 'containerSelect') return 'Search or choose backpack / container…';
  if (select.matches('select[data-action="artifact"]')) return 'Search or choose artifact…';
  return 'Search or choose item…';
}

function optionDisplayColor(option) {
  return option?.style?.color || '';
}

function selectedOption(select) {
  return [...select.options].find(option => option.value === select.value) || select.options[select.selectedIndex] || null;
}

function itemOptionRecords(select) {
  const records = [];
  for (const child of select.children) {
    if (child.tagName === 'OPTGROUP') {
      for (const option of child.children) {
        if (option.tagName !== 'OPTION') continue;
        records.push({ option, group: child.label || '' });
      }
    } else if (child.tagName === 'OPTION') {
      records.push({ option: child, group: '' });
    }
  }
  return records;
}

function closeItemCombo(combo, restore = true) {
  if (!combo) return;
  combo.menu.hidden = true;
  combo.root.classList.remove('open');
  combo.input.setAttribute('aria-expanded', 'false');
  combo.activeIndex = -1;
  if (restore) syncItemCombo(combo.select);
  if (openItemCombo === combo) openItemCombo = null;
}

function syncItemCombo(select) {
  const combo = comboRegistry.get(select);
  if (!combo) return;
  const option = selectedOption(select);
  combo.input.value = option?.textContent?.trim() || '';
  combo.input.style.color = optionDisplayColor(option) || select.style.color || '';
  combo.input.title = combo.input.value;
}

function renderItemComboMenu(combo, rawTerm = '') {
  const term = String(rawTerm).trim().toLowerCase();
  const selected = combo.select.value;
  const records = itemOptionRecords(combo.select).filter(({ option, group }) => {
    if (option.disabled && option.value !== selected) return false;
    const text = `${option.textContent || ''} ${group}`.toLowerCase();
    return !term || text.includes(term);
  });

  combo.filtered = records;
  combo.activeIndex = -1;
  if (!records.length) {
    combo.menu.innerHTML = '<div class="item-combo-empty">No matching items</div>';
    return;
  }

  let lastGroup = null;
  combo.menu.innerHTML = records.map(({ option, group }, index) => {
    const heading = group && group !== lastGroup
      ? `<div class="item-combo-group">${escapeHtml(group)}</div>`
      : '';
    lastGroup = group || lastGroup;
    const isSelected = option.value === selected;
    const color = optionDisplayColor(option);
    return `${heading}<button type="button" class="item-combo-option${isSelected ? ' selected' : ''}" data-combo-index="${index}" role="option" aria-selected="${String(isSelected)}"${color ? ` style="color:${escapeHtml(color)}"` : ''}>${escapeHtml(option.textContent.trim())}</button>`;
  }).join('');
}

function openCombo(combo, showAll = false) {
  if (openItemCombo && openItemCombo !== combo) closeItemCombo(openItemCombo);
  openItemCombo = combo;
  const chosen = selectedOption(combo.select)?.textContent?.trim() || '';
  const term = showAll || combo.input.value === chosen ? '' : combo.input.value;
  renderItemComboMenu(combo, term);
  combo.menu.hidden = false;
  combo.root.classList.add('open');
  combo.input.setAttribute('aria-expanded', 'true');
}

function chooseComboRecord(combo, record) {
  if (!record?.option) return;
  combo.select.value = record.option.value;
  combo.select.dispatchEvent(new Event('change', { bubbles: true }));
  syncItemCombo(combo.select);
  closeItemCombo(combo, false);
  combo.input.focus();
  combo.input.select();
}

function moveComboActive(combo, direction) {
  if (combo.menu.hidden) openCombo(combo, true);
  if (!combo.filtered.length) return;
  combo.activeIndex = Math.max(0, Math.min(combo.filtered.length - 1, combo.activeIndex + direction));
  const buttons = [...combo.menu.querySelectorAll('.item-combo-option')];
  buttons.forEach((button, index) => button.classList.toggle('active', index === combo.activeIndex));
  buttons[combo.activeIndex]?.scrollIntoView({ block: 'nearest' });
}

function enhanceItemSelect(select) {
  if (!select || comboRegistry.has(select)) return;
  const isSupported = select.id === 'armorSelect' || select.id === 'containerSelect' || select.matches('select[data-action="artifact"]');
  if (!isSupported) return;

  // Retire the older two-control search UI. The native select stays in the DOM as
  // the calculator's source of truth, but the player now sees one searchable field.
  const legacySearch = select.previousElementSibling?.classList?.contains('item-search')
    ? select.previousElementSibling
    : select.parentElement?.querySelector(':scope > .item-search');
  if (legacySearch) {
    legacySearch.value = '';
    legacySearch.classList.add('legacy-item-search-hidden');
  }

  [...select.options].forEach(option => {
    if (option.value) {
      option.hidden = false;
      option.disabled = false;
    }
  });

  const root = document.createElement('div');
  root.className = 'item-combobox';
  root.innerHTML = `
    <div class="item-combo-input-row">
      <input class="item-combo-input" type="search" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" placeholder="${escapeHtml(comboPlaceholder(select))}" />
      <button class="item-combo-toggle" type="button" tabindex="-1" aria-label="Open item list">⌄</button>
    </div>
    <div class="item-combo-menu" role="listbox" hidden></div>
  `;
  select.insertAdjacentElement('beforebegin', root);
  select.classList.add('combo-native-select');

  const combo = {
    select,
    root,
    input: root.querySelector('.item-combo-input'),
    toggle: root.querySelector('.item-combo-toggle'),
    menu: root.querySelector('.item-combo-menu'),
    filtered: [],
    activeIndex: -1,
    observer: null
  };
  comboRegistry.set(select, combo);

  combo.input.addEventListener('focus', () => {
    combo.input.select();
    openCombo(combo, true);
  });
  combo.input.addEventListener('click', () => openCombo(combo, true));
  combo.input.addEventListener('input', () => {
    openCombo(combo, false);
    renderItemComboMenu(combo, combo.input.value);
  });
  combo.input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveComboActive(combo, 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveComboActive(combo, -1);
    } else if (event.key === 'Enter' && combo.activeIndex >= 0) {
      event.preventDefault();
      chooseComboRecord(combo, combo.filtered[combo.activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeItemCombo(combo);
      combo.input.blur();
    }
  });
  combo.toggle.addEventListener('click', event => {
    event.preventDefault();
    if (combo.menu.hidden) {
      combo.input.focus();
      openCombo(combo, true);
    } else {
      closeItemCombo(combo);
    }
  });
  combo.menu.addEventListener('mousedown', event => event.preventDefault());
  combo.menu.addEventListener('click', event => {
    const button = event.target.closest('[data-combo-index]');
    if (!button) return;
    chooseComboRecord(combo, combo.filtered[Number(button.dataset.comboIndex)]);
  });
  select.addEventListener('change', () => setTimeout(() => syncItemCombo(select), 0));

  combo.observer = new MutationObserver(() => {
    if (!combo.menu.hidden) renderItemComboMenu(combo, combo.input.value === selectedOption(select)?.textContent?.trim() ? '' : combo.input.value);
    syncItemCombo(select);
  });
  combo.observer.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'style'] });

  syncItemCombo(select);
}

function enhanceAllItemSelectors() {
  enhanceItemSelect(document.getElementById('containerSelect'));
  enhanceItemSelect(document.getElementById('armorSelect'));
  document.querySelectorAll('select[data-action="artifact"]').forEach(enhanceItemSelect);
}

// Re-apply after dynamic render/population functions replace controls.
if (typeof renderLoadoutSlots === 'function') {
  const renderLoadoutBeforeIntegratedSearch = renderLoadoutSlots;
  renderLoadoutSlots = function renderLoadoutWithIntegratedSearch(...args) {
    const result = renderLoadoutBeforeIntegratedSearch(...args);
    enhanceAllItemSelectors();
    return result;
  };
}
if (typeof populateContainers === 'function') {
  const populateContainersBeforeIntegratedSearch = populateContainers;
  populateContainers = function populateContainersWithIntegratedSearch(...args) {
    const result = populateContainersBeforeIntegratedSearch(...args);
    enhanceAllItemSelectors();
    return result;
  };
}
if (typeof populateArmorSelect === 'function') {
  const populateArmorBeforeIntegratedSearch = populateArmorSelect;
  populateArmorSelect = function populateArmorWithIntegratedSearch(...args) {
    const result = populateArmorBeforeIntegratedSearch(...args);
    enhanceAllItemSelectors();
    refreshArmorUpgradeControl();
    return result;
  };
}

document.addEventListener('mousedown', event => {
  if (openItemCombo && !openItemCombo.root.contains(event.target)) closeItemCombo(openItemCombo);
});

const itemComboObserver = new MutationObserver(() => enhanceAllItemSelectors());
itemComboObserver.observe(document.body, { childList: true, subtree: true });

const armorUpgradeComboStyle = document.createElement('style');
armorUpgradeComboStyle.textContent = `
  .armor-upgrade-field{margin-top:10px}.armor-upgrade-note{display:block;color:var(--muted);font-size:11px;line-height:1.4;margin-top:1px}
  .legacy-item-search-hidden{display:none!important}.combo-native-select{display:none!important}
  .item-combobox{position:relative;width:100%;min-width:0}.item-combo-input-row{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 38px}
  .item-combo-input{width:100%;height:43px;border:1px solid #313d4b;border-right:0;border-radius:7px 0 0 7px;background:#0d141c;color:var(--text);padding:0 11px;outline:none;font-size:13.5px;font-weight:600;min-width:0}
  .item-combo-toggle{height:43px;border:1px solid #313d4b;border-radius:0 7px 7px 0;background:#111923;color:var(--muted);font-size:17px;cursor:pointer}
  .item-combobox.open .item-combo-input,.item-combobox.open .item-combo-toggle,.item-combo-input:focus{border-color:var(--accent-dim)}
  .item-combo-menu{position:absolute;z-index:80;left:0;right:0;top:calc(100% + 5px);max-height:330px;overflow:auto;padding:5px;border:1px solid var(--border);border-radius:8px;background:#0b1118;box-shadow:0 18px 38px rgba(0,0,0,.48);scrollbar-width:thin;scrollbar-color:var(--border) transparent}
  .item-combo-group{padding:7px 8px 4px;color:var(--muted);font:800 10px var(--mono);letter-spacing:.08em;text-transform:uppercase}
  .item-combo-option{display:block;width:100%;min-height:36px;padding:7px 9px;border:0;border-radius:5px;background:transparent;text-align:left;font-size:13px;font-weight:650;cursor:pointer}
  .item-combo-option:hover,.item-combo-option.active{background:var(--panel-2)}.item-combo-option.selected{background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent-dim)}
  .item-combo-empty{padding:12px;color:var(--muted);font-size:12px;text-align:center}
  @media(max-width:700px){.item-combo-input{font-size:16px}.item-combo-option{font-size:14px;min-height:42px}}
`;
document.head.appendChild(armorUpgradeComboStyle);

injectArmorUpgradeControl();
enhanceAllItemSelectors();
refreshArmorUpgradeControl();
