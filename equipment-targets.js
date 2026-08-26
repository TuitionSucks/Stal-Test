// Equipment-aware Finder controls.
// Exact targets can credit armor and/or backpack/container bonuses before artifacts
// are searched. Recommendation cards can also show the equipment/artifact split.

function fixedStatValue(stat) {
  const value = Number(stat?.value ?? stat?.max ?? stat?.min ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function statsToFixedMap(stats = []) {
  const map = new Map();
  for (const stat of stats) {
    if (!stat?.key) continue;
    const value = fixedStatValue(stat);
    const existing = map.get(stat.key);
    if (existing) existing.value += value;
    else map.set(stat.key, {
      key: stat.key,
      name: stat.name || stat.key,
      value,
      isPercentage: Boolean(stat.isPercentage),
      isPositive: Boolean(stat.isPositive),
      origin: stat.origin
    });
  }
  return map;
}

function armorBreakdownMap() {
  if (typeof currentArmor === 'undefined' || !currentArmor) return new Map();
  return statsToFixedMap(currentArmor.stats || []);
}

function carrierBaseStats() {
  if (!currentContainer) return [];
  if (typeof baseContainerStatsById !== 'undefined' && baseContainerStatsById?.get) {
    const base = baseContainerStatsById.get(currentContainer.id);
    if (Array.isArray(base)) return base;
  }
  return (currentContainer.stats || []).filter(stat => stat.origin !== 'armor');
}

function carrierBreakdownMap() {
  return statsToFixedMap(carrierBaseStats());
}

function mapValue(map, key) {
  return Number(map?.get?.(key)?.value || 0);
}

function equipmentMaps() {
  return {
    armor: armorBreakdownMap(),
    carrier: carrierBreakdownMap()
  };
}

function equipmentToggle(id, fallback = true) {
  const input = document.getElementById(id);
  return input ? input.checked : fallback;
}

function countArmorForExactTargets() {
  return equipmentToggle('countArmorTargets', true);
}

function countCarrierForExactTargets() {
  return equipmentToggle('countCarrierTargets', true);
}

function showEquipmentOnRecommendations() {
  return equipmentToggle('showEquipmentResults', true);
}

function totalEquipmentContribution(key) {
  const maps = equipmentMaps();
  return mapValue(maps.armor, key) + mapValue(maps.carrier, key);
}

function countedEquipmentContribution(key) {
  const maps = equipmentMaps();
  return (countArmorForExactTargets() ? mapValue(maps.armor, key) : 0)
    + (countCarrierForExactTargets() ? mapValue(maps.carrier, key) : 0);
}

function excludedEquipmentContribution(key) {
  return totalEquipmentContribution(key) - countedEquipmentContribution(key);
}

function exactUserRequirements() {
  if (typeof finderSearchStyle !== 'undefined' && finderSearchStyle !== 'exact') return [];
  return (requirementRows || [])
    .filter(row => row.enabled && row.key && row.target !== '' && Number.isFinite(Number(row.target)))
    .map(row => ({
      key: row.key,
      op: row.op || '>=',
      target: Number(row.target),
      stat: statCatalog.find(stat => stat.key === row.key)
    }));
}

function carrierLabel() {
  return currentContainer?.category === 'backpacks' ? 'Backpack' : 'Container';
}

function markEquipmentSearchStale(message = 'Equipment target settings changed. Run the finder again.') {
  if (typeof clearStaleFinderResults === 'function') clearStaleFinderResults(message);
  else {
    lastFinderResults = [];
    if (ui.optimizerResults) ui.optimizerResults.innerHTML = '';
    if (ui.resultCount) ui.resultCount.textContent = '0';
    if (ui.searchSummary) ui.searchSummary.textContent = message;
  }
}

function injectEquipmentTargetControls() {
  if (document.getElementById('equipmentTargetControls')) return;
  const panel = document.getElementById('requirements')?.closest('.panel');
  if (!panel) return;

  const host = document.createElement('div');
  host.id = 'equipmentTargetControls';
  host.className = 'equipment-target-controls';
  host.innerHTML = `
    <div class="equipment-target-heading">
      <strong>Equipment target credit</strong>
      <span>Choose what already-equipped gear should contribute before artifacts are searched.</span>
    </div>
    <div id="exactEquipmentTargetToggles" class="equipment-target-toggles">
      <label class="switch-row compact-switch">
        <input id="countArmorTargets" type="checkbox" checked />
        <span><strong>Count armor bonuses</strong><small>Armor stats reduce the amount artifacts need to supply.</small></span>
      </label>
      <label class="switch-row compact-switch">
        <input id="countCarrierTargets" type="checkbox" checked />
        <span><strong>Count backpack / container bonuses</strong><small>Carrier stats reduce the amount artifacts need to supply.</small></span>
      </label>
    </div>
    <label class="switch-row compact-switch result-equipment-toggle">
      <input id="showEquipmentResults" type="checkbox" checked />
      <span><strong>Show equipment contribution on recommendations</strong><small>Displays armor, carrier, artifact, and final values on each suggested build.</small></span>
    </label>
    <div id="equipmentTargetPreview" class="equipment-target-preview"></div>
  `;

  const searchStyle = panel.querySelector('.search-style-switch');
  if (searchStyle) searchStyle.insertAdjacentElement('afterend', host);
  else panel.insertBefore(host, document.getElementById('requirements'));

  ['countArmorTargets', 'countCarrierTargets'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      updateEquipmentTargetPreview();
      markEquipmentSearchStale();
    });
  });

  document.getElementById('showEquipmentResults')?.addEventListener('change', () => {
    decorateEquipmentRecommendationCards(lastFinderResults || []);
  });

  updateEquipmentTargetModeVisibility();
  updateEquipmentTargetPreview();
}

function updateEquipmentTargetModeVisibility() {
  const exactControls = document.getElementById('exactEquipmentTargetToggles');
  const preview = document.getElementById('equipmentTargetPreview');
  const exactMode = typeof finderSearchStyle === 'undefined' || finderSearchStyle === 'exact';
  if (exactControls) exactControls.hidden = !exactMode;
  if (preview) preview.hidden = !exactMode;
}

function updateEquipmentTargetPreview() {
  const host = document.getElementById('equipmentTargetPreview');
  if (!host) return;
  const requirements = exactUserRequirements();
  if (!requirements.length) {
    host.innerHTML = '<span class="equipment-preview-empty">Enable an Exact Target to see how much armor and your backpack/container already cover.</span>';
    return;
  }

  const maps = equipmentMaps();
  host.innerHTML = requirements.map(req => {
    const armor = countArmorForExactTargets() ? mapValue(maps.armor, req.key) : 0;
    const carrier = countCarrierForExactTargets() ? mapValue(maps.carrier, req.key) : 0;
    const equipment = armor + carrier;
    const artifactTarget = req.target - equipment;
    const pct = Boolean(req.stat?.isPercentage);
    return `
      <div class="equipment-preview-row">
        <strong>${escapeHtml(req.stat?.name || req.key)}</strong>
        <span>Target ${escapeHtml(req.op)} ${formatValue(req.target, pct)}</span>
        <span class="equipment-credit">Equipment ${formatValue(equipment, pct)}</span>
        <span class="artifact-need">Artifacts ${escapeHtml(req.op)} ${formatValue(artifactTarget, pct)}</span>
      </div>`;
  }).join('');
}

// The core finder already starts from armor + carrier stats. For exact targets,
// leaving a source checked means the user's target is the FINAL desired value.
// If a source is unchecked, shift the internal target by that excluded source so
// the optimizer effectively requires the artifacts/remaining selected sources to
// hit the user's requested number on their own.
if (typeof collectRequirements === 'function') {
  const coreCollectRequirementsForEquipment = collectRequirements;
  collectRequirements = function collectRequirementsWithEquipmentCredit(...args) {
    const requirements = coreCollectRequirementsForEquipment(...args);
    if (typeof finderSearchStyle !== 'undefined' && finderSearchStyle !== 'exact') return requirements;
    return requirements.map(req => {
      const excluded = excludedEquipmentContribution(req.key);
      return {
        ...req,
        displayTarget: Number(req.target),
        target: Number(req.target) + excluded,
        equipmentTargetAdjusted: Math.abs(excluded) > 0.0000001
      };
    });
  };
}

function effectiveExactActual(result, key) {
  const physical = Number(result?.totals?.get?.(key)?.value || 0);
  return physical - excludedEquipmentContribution(key);
}

// Keep ★ Target Hit / ☆ Near Target aligned with the equipment-credit toggles.
if (typeof assessTargetFit === 'function') {
  assessTargetFit = function assessTargetFitWithEquipmentCredit(result) {
    const requirements = exactUserRequirements();
    if (!requirements.length || !(result?.totals instanceof Map)) {
      return { kind: null, requirements: 0, exact: 0, near: 0 };
    }
    let exact = 0;
    let near = 0;
    for (const req of requirements) {
      const actual = effectiveExactActual(result, req.key);
      const pass = req.op === '>=' ? actual >= req.target : actual <= req.target;
      if (pass) {
        exact += 1;
        near += 1;
        continue;
      }
      const miss = req.op === '>=' ? req.target - actual : actual - req.target;
      const tolerance = typeof targetFitTolerance === 'function'
        ? targetFitTolerance(req)
        : Math.max(req.stat?.isPercentage ? 0.10 : 0.05, Math.abs(req.target) * 0.05);
      if (miss <= tolerance) near += 1;
    }
    if (exact === requirements.length) return { kind: 'hit', requirements: requirements.length, exact, near };
    if (near === requirements.length) return { kind: 'near', requirements: requirements.length, exact, near };
    return { kind: null, requirements: requirements.length, exact, near };
  };
}

function recommendationCriteria() {
  if (typeof finderSearchStyle !== 'undefined' && finderSearchStyle === 'priority' && typeof selectedPriorities === 'function') {
    return selectedPriorities().map(({ stat, level }) => ({ stat, key: stat.key, label: level }));
  }
  return exactUserRequirements().map(req => ({ ...req, key: req.key }));
}

function equipmentContributionRow(result, criterion) {
  const stat = criterion.stat || statCatalog.find(item => item.key === criterion.key) || { name: criterion.key, isPercentage: false };
  const key = criterion.key;
  const maps = equipmentMaps();
  const armor = mapValue(maps.armor, key);
  const carrier = mapValue(maps.carrier, key);
  const physicalFinal = Number(result?.totals?.get?.(key)?.value || 0);
  const artifactsOnly = physicalFinal - armor - carrier;
  const pct = Boolean(stat.isPercentage);

  const pieces = [];
  if (Math.abs(armor) >= 0.0005) pieces.push(`<span><small>Armor</small><b class="${armor >= 0 ? 'good' : 'bad'}">${formatValue(armor, pct)}</b></span>`);
  if (Math.abs(carrier) >= 0.0005) pieces.push(`<span><small>${escapeHtml(carrierLabel())}</small><b class="${carrier >= 0 ? 'good' : 'bad'}">${formatValue(carrier, pct)}</b></span>`);
  pieces.push(`<span><small>Artifacts</small><b class="${artifactsOnly >= 0 ? 'good' : 'bad'}">${formatValue(artifactsOnly, pct)}</b></span>`);
  pieces.push(`<span class="equipment-final-value"><small>Final</small><b class="${physicalFinal >= 0 ? 'good' : 'bad'}">${formatValue(physicalFinal, pct)}</b></span>`);

  return `
    <div class="equipment-contribution-row">
      <strong>${escapeHtml(stat.name || key)}</strong>
      <div class="equipment-contribution-values">${pieces.join('')}</div>
    </div>`;
}

function decorateExactRequirementPills(card, result) {
  if (typeof finderSearchStyle !== 'undefined' && finderSearchStyle !== 'exact') return;
  const requirements = exactUserRequirements();
  if (!requirements.length) return;
  const area = card.querySelector('.result-requirements');
  if (!area) return;
  area.innerHTML = requirements.map(req => {
    const actual = effectiveExactActual(result, req.key);
    const pass = req.op === '>=' ? actual >= req.target : actual <= req.target;
    return `
      <span class="requirement-pill ${pass ? 'pass' : 'fail'}">
        ${escapeHtml(req.stat?.name || req.key)} ${escapeHtml(req.op)} ${req.target}: ${formatValue(actual, req.stat?.isPercentage)}
      </span>`;
  }).join('');
}

function decorateEquipmentRecommendationCards(results = []) {
  const cards = [...(ui.optimizerResults?.querySelectorAll('.result-card') || [])];
  cards.forEach(card => card.querySelector('.equipment-build-breakdown')?.remove());
  if (!showEquipmentOnRecommendations()) return;

  const criteria = recommendationCriteria();
  if (!criteria.length) return;

  cards.forEach((card, index) => {
    const result = results[index];
    if (!result) return;
    const artifactGrid = card.querySelector('.result-artifacts');
    if (!artifactGrid) return;
    const block = document.createElement('div');
    block.className = 'equipment-build-breakdown';
    block.innerHTML = `
      <div class="equipment-build-head">
        <span>Equipment contribution</span>
        <small>${escapeHtml(currentArmor?.name || 'No armor')} · ${escapeHtml(currentContainer?.name || 'No backpack/container')}</small>
      </div>
      <div class="equipment-contribution-grid">
        ${criteria.map(criterion => equipmentContributionRow(result, criterion)).join('')}
      </div>`;
    artifactGrid.insertAdjacentElement('afterend', block);
    decorateExactRequirementPills(card, result);
  });
}

if (typeof renderFinderResults === 'function') {
  const coreRenderFinderResultsForEquipment = renderFinderResults;
  renderFinderResults = function renderFinderResultsWithEquipmentBreakdown(results) {
    const rendered = coreRenderFinderResultsForEquipment(results);
    decorateEquipmentRecommendationCards(results || []);
    if (!showEquipmentOnRecommendations()) {
      [...(ui.optimizerResults?.querySelectorAll('.result-card') || [])].forEach((card, index) => decorateExactRequirementPills(card, results?.[index]));
    }
    return rendered;
  };
}

if (typeof renderRequirements === 'function') {
  const coreRenderRequirementsForEquipment = renderRequirements;
  renderRequirements = function renderRequirementsWithEquipmentPreview(...args) {
    const rendered = coreRenderRequirementsForEquipment(...args);
    updateEquipmentTargetPreview();
    return rendered;
  };
}

if (typeof updateSearchStyleUI === 'function') {
  const coreUpdateSearchStyleUIForEquipment = updateSearchStyleUI;
  updateSearchStyleUI = function updateSearchStyleUIWithEquipment(...args) {
    const rendered = coreUpdateSearchStyleUIForEquipment(...args);
    updateEquipmentTargetModeVisibility();
    updateEquipmentTargetPreview();
    return rendered;
  };
}

// Keep the preview current when targets, armor, or carrier change.
document.getElementById('requirements')?.addEventListener('input', () => setTimeout(updateEquipmentTargetPreview, 0));
document.getElementById('requirements')?.addEventListener('change', () => setTimeout(updateEquipmentTargetPreview, 0));
document.getElementById('containerSelect')?.addEventListener('change', () => setTimeout(updateEquipmentTargetPreview, 0));

const equipmentTargetStyle = document.createElement('style');
equipmentTargetStyle.textContent = `
  .equipment-target-controls{display:grid;gap:8px;margin:0 0 11px;padding:9px;border:1px solid var(--border-soft);border-radius:7px;background:var(--panel-2)}
  .equipment-target-heading{display:grid;gap:2px}.equipment-target-heading strong{font-size:11px;color:var(--text-dim)}.equipment-target-heading span{font-size:10px;color:var(--muted);line-height:1.4}
  .equipment-target-toggles{display:grid;gap:5px}.compact-switch{padding:7px 8px!important;border:1px solid var(--border-soft);border-radius:6px;background:#0b1118}.compact-switch span strong{font-size:10.5px}.compact-switch span small{font-size:9.5px;line-height:1.35}
  .result-equipment-toggle{margin-top:1px}.equipment-target-preview{display:grid;gap:4px;padding-top:2px}.equipment-preview-empty{font-size:9.5px;color:var(--muted);line-height:1.4}
  .equipment-preview-row{display:grid;grid-template-columns:minmax(100px,1fr) auto auto auto;gap:7px;align-items:center;padding:6px 7px;border-radius:5px;background:#0b1118;border:1px solid var(--border-soft);font:9.5px var(--mono)}
  .equipment-preview-row strong{font-family:var(--sans);font-size:10.5px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.equipment-preview-row span{color:var(--muted);white-space:nowrap}.equipment-preview-row .equipment-credit{color:#79aefc}.equipment-preview-row .artifact-need{color:#43dc6e}
  .equipment-build-breakdown{margin:9px 0 0;padding:9px;border:1px solid var(--border-soft);border-radius:7px;background:rgba(121,174,252,.035)}
  .equipment-build-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}.equipment-build-head>span{font:700 9px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:#79aefc}.equipment-build-head>small{font-size:9px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .equipment-contribution-grid{display:grid;gap:5px}.equipment-contribution-row{display:grid;grid-template-columns:minmax(110px,1fr) auto;gap:8px;align-items:center}.equipment-contribution-row>strong{font-size:10.5px;color:var(--text-dim);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .equipment-contribution-values{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:wrap}.equipment-contribution-values>span{display:inline-flex;align-items:center;gap:4px;padding:3px 5px;border:1px solid var(--border-soft);border-radius:4px;background:#0b1118}.equipment-contribution-values small{font:8px var(--mono);text-transform:uppercase;color:var(--muted)}.equipment-contribution-values b{font:9px var(--mono)}.equipment-contribution-values b.good{color:#43dc6e}.equipment-contribution-values b.bad{color:#f05a5d}.equipment-final-value{border-color:rgba(121,174,252,.25)!important}
  @media(max-width:760px){.equipment-preview-row{grid-template-columns:1fr 1fr}.equipment-contribution-row{grid-template-columns:1fr}.equipment-contribution-values{justify-content:flex-start}.equipment-build-head{align-items:flex-start;flex-direction:column}}
`;
document.head.appendChild(equipmentTargetStyle);

injectEquipmentTargetControls();

// Armor UI is injected by armor.js before this file executes, but its change listener
// is attached there. Add our lightweight preview refresh after the select exists.
document.getElementById('armorSelect')?.addEventListener('change', () => setTimeout(updateEquipmentTargetPreview, 0));
