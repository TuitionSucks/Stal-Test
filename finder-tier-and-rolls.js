// Finder tier-range controls + mixed exact-target tuning + max-roll highlighting.
// Artifact data exposes quality rarity bands (Common -> Unique), so these controls
// operate on the exact quality bands used by the calculator. Each artifact in a
// Mixed search may land at a different quality/tier inside the selected range.

let finderTierSearchMode = 'mixed';
let finderTierFromIndex = 3; // Rare
let finderTierToIndex = 4;   // Exclusive

const FINDER_TIER_BANDS = QUALITY_BANDS.map((band, index) => ({
  ...band,
  index
}));

function finderTierBounds() {
  const from = FINDER_TIER_BANDS[Math.min(finderTierFromIndex, finderTierToIndex)] || FINDER_TIER_BANDS[0];
  const to = FINDER_TIER_BANDS[Math.max(finderTierFromIndex, finderTierToIndex)] || FINDER_TIER_BANDS[FINDER_TIER_BANDS.length - 1];
  if (finderTierSearchMode === 'single') return { min: from.min, max: from.max, from, to: from };
  return { min: from.min, max: to.max, from, to };
}

function finderTierSelectOptions(selectedIndex) {
  return FINDER_TIER_BANDS.map((band, index) =>
    `<option value="${index}"${index === selectedIndex ? ' selected' : ''}>${escapeHtml(band.name)} (${band.min}-${band.max}%)</option>`
  ).join('');
}

function markFinderSettingsStale(message = 'Artifact tier range changed. Run the finder again.') {
  if (typeof clearStaleFinderResults === 'function') clearStaleFinderResults(message);
  else {
    lastFinderResults = [];
    if (ui.optimizerResults) ui.optimizerResults.innerHTML = '';
    if (ui.resultCount) ui.resultCount.textContent = '0';
    if (ui.searchSummary) ui.searchSummary.textContent = message;
  }
}

function syncQualityInputsToTierRange() {
  const bounds = finderTierBounds();
  ui.qualityMin.value = bounds.min;
  ui.qualityMax.value = bounds.max;
  updateFinderTierUI();
}

function clampQualityInputsToTierRange() {
  const bounds = finderTierBounds();
  let min = Math.round(clamp(ui.qualityMin.value, bounds.min, bounds.max));
  let max = Math.round(clamp(ui.qualityMax.value, bounds.min, bounds.max));
  if (min > max) [min, max] = [max, min];
  ui.qualityMin.value = min;
  ui.qualityMax.value = max;
}

function updateFinderTierUI() {
  const host = document.getElementById('finderTierControls');
  if (!host) return;
  host.querySelectorAll('[data-tier-mode]').forEach(button => {
    const active = button.dataset.tierMode === finderTierSearchMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  const from = document.getElementById('finderTierFrom');
  const to = document.getElementById('finderTierTo');
  const toWrap = document.getElementById('finderTierToWrap');
  if (from) from.value = String(finderTierFromIndex);
  if (to) to.value = String(finderTierToIndex);
  if (toWrap) toWrap.hidden = finderTierSearchMode === 'single';
  const summary = document.getElementById('finderTierSummary');
  if (summary) {
    const bounds = finderTierBounds();
    summary.textContent = finderTierSearchMode === 'single'
      ? `All suggested artifacts stay in ${bounds.from.name} quality (${bounds.min}-${bounds.max}%).`
      : `Mixed allows different artifacts from ${bounds.from.name} through ${bounds.to.name} (${bounds.min}-${bounds.max}%) so the finder can tune closer to requested rolls.`;
  }
}

function injectFinderTierControls() {
  if (document.getElementById('finderTierControls')) return;
  const rangePanel = ui.qualityMin?.closest('.panel');
  const rangeGrid = ui.qualityMin?.closest('.range-grid');
  if (!rangePanel || !rangeGrid) return;

  const controls = document.createElement('div');
  controls.id = 'finderTierControls';
  controls.className = 'finder-tier-controls';
  controls.innerHTML = `
    <div class="finder-tier-head">
      <span>Quality tier search</span>
      <div class="finder-tier-mode" role="tablist" aria-label="Artifact tier search mode">
        <button type="button" class="finder-tier-mode-btn" data-tier-mode="single">Single tier</button>
        <button type="button" class="finder-tier-mode-btn active" data-tier-mode="mixed">Mixed</button>
      </div>
    </div>
    <div class="finder-tier-selects">
      <label class="field compact-field">
        <span id="finderTierFromLabel">From tier</span>
        <select id="finderTierFrom">${finderTierSelectOptions(finderTierFromIndex)}</select>
      </label>
      <label id="finderTierToWrap" class="field compact-field">
        <span>To tier</span>
        <select id="finderTierTo">${finderTierSelectOptions(finderTierToIndex)}</select>
      </label>
    </div>
    <p id="finderTierSummary" class="finder-tier-summary"></p>
  `;
  rangeGrid.insertAdjacentElement('beforebegin', controls);

  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-tier-mode]');
    if (!button) return;
    finderTierSearchMode = button.dataset.tierMode === 'single' ? 'single' : 'mixed';
    if (finderTierSearchMode === 'single') finderTierToIndex = finderTierFromIndex;
    syncQualityInputsToTierRange();
    markFinderSettingsStale();
  });

  document.getElementById('finderTierFrom')?.addEventListener('change', event => {
    finderTierFromIndex = Number(event.target.value) || 0;
    if (finderTierSearchMode === 'single') finderTierToIndex = finderTierFromIndex;
    else if (finderTierFromIndex > finderTierToIndex) finderTierToIndex = finderTierFromIndex;
    syncQualityInputsToTierRange();
    markFinderSettingsStale();
  });

  document.getElementById('finderTierTo')?.addEventListener('change', event => {
    finderTierToIndex = Number(event.target.value) || 0;
    if (finderTierToIndex < finderTierFromIndex) finderTierFromIndex = finderTierToIndex;
    syncQualityInputsToTierRange();
    markFinderSettingsStale();
  });

  // Keep exact numeric quality fields as fine-tuning inside the selected tier range.
  [ui.qualityMin, ui.qualityMax].forEach(input => input?.addEventListener('change', () => {
    clampQualityInputsToTierRange();
    markFinderSettingsStale('Quality range changed. Run the finder again.');
  }));

  // Capture runs before the calculator's normal click handler and guarantees the
  // numeric quality fields cannot escape the selected tier range.
  ui.findBuilds?.addEventListener('click', clampQualityInputsToTierRange, true);
  updateFinderTierUI();
}

// In Mixed + Exact mode, prefer builds that land close to the requested number,
// not merely any build that clears a >= / <= threshold by a huge amount.
function mixedExactClosenessFromTotals(totals, requirements) {
  if (!(totals instanceof Map)) return Number.POSITIVE_INFINITY;
  const userRequirements = (requirements || []).filter(req => !req.autoExposure && !req.prioritySynthetic);
  if (!userRequirements.length) return 0;
  return userRequirements.reduce((score, req) => {
    const actual = Number(totals.get(req.key)?.value || 0);
    const target = Number(req.target) || 0;
    const scale = Math.max(1, Math.abs(target));
    return score + (Math.abs(actual - target) / scale);
  }, 0);
}

if (typeof stateRank === 'function') {
  const coreStateRankForTierMix = stateRank;
  stateRank = function stateRankWithMixedExactTuning(state, requirements) {
    let score = coreStateRankForTierMix(state, requirements);
    if (finderTierSearchMode === 'mixed' && typeof finderSearchStyle !== 'undefined' && finderSearchStyle === 'exact') {
      score += mixedExactClosenessFromTotals(state.totals, requirements) * 2500;
    }
    return score;
  };
}

if (typeof runBeamSearch === 'function') {
  const coreRunBeamSearchForTierMix = runBeamSearch;
  runBeamSearch = function runBeamSearchWithMixedTierTuning(requirements, ...args) {
    const results = coreRunBeamSearchForTierMix(requirements, ...args);
    if (finderTierSearchMode !== 'mixed' || typeof finderSearchStyle === 'undefined' || finderSearchStyle !== 'exact') return results;
    return [...results].sort((a, b) => {
      const aSafe = a.evaluation?.matched ? 0 : 1;
      const bSafe = b.evaluation?.matched ? 0 : 1;
      if (aSafe !== bSafe) return aSafe - bSafe;
      const close = mixedExactClosenessFromTotals(a.totals, requirements) - mixedExactClosenessFromTotals(b.totals, requirements);
      if (Math.abs(close) > 1e-9) return close;
      return Number(a.cost || 0) - Number(b.cost || 0);
    });
  };
}

// Reset back to the old default quality window, expressed as a Mixed Rare -> Exclusive search.
if (typeof resetFinder === 'function') {
  const coreResetFinderForTierRange = resetFinder;
  resetFinder = function resetFinderWithTierRange() {
    const result = coreResetFinderForTierRange();
    finderTierSearchMode = 'mixed';
    finderTierFromIndex = 3;
    finderTierToIndex = 4;
    syncQualityInputsToTierRange();
    return result;
  };
}

// Correct boundary display so a band's documented upper edge (for example Rare 145%)
// is shown as the max roll of that band rather than the start of the next one.
qualityBand = function qualityBandInclusiveUpperEdge(quality) {
  const q = Number(quality);
  for (const band of QUALITY_BANDS) {
    if (q <= band.max + 1e-9) return band;
  }
  return QUALITY_BANDS[QUALITY_BANDS.length - 1];
};

function finderMaxRollInfo(quality) {
  const q = Number(quality);
  const band = qualityBand(q);
  const isMax = Math.abs(q - Number(band.max)) < 1e-9;
  return { band, isMax };
}

function annotateFinderMaxRolls(results) {
  const cards = [...ui.optimizerResults.querySelectorAll('.result-card')];
  cards.forEach((card, resultIndex) => {
    const result = results?.[resultIndex];
    const artifactCards = [...card.querySelectorAll('.result-artifact')];
    artifactCards.forEach((artifactCard, pickIndex) => {
      const pick = result?.picks?.[pickIndex];
      if (!pick) return;
      const info = finderMaxRollInfo(pick.quality);
      if (!info.isMax || artifactCard.querySelector('.max-roll-badge')) return;
      artifactCard.classList.add('max-roll-artifact');
      artifactCard.insertAdjacentHTML('beforeend', `<span class="max-roll-badge" title="${escapeHtml(`${pick.quality}% is the maximum quality roll for the ${info.band.name} band. Quality-scaled positive and additional properties are at that tier's maximum before container effects.`)}">★ MAX ROLL</span>`);
    });
  });
}

if (typeof renderFinderResults === 'function') {
  const coreRenderFinderForMaxRoll = renderFinderResults;
  renderFinderResults = function renderFinderWithMaxRolls(results) {
    const rendered = coreRenderFinderForMaxRoll(results);
    annotateFinderMaxRolls(results);
    return rendered;
  };
}

if (typeof renderLoadoutSlots === 'function') {
  const coreRenderLoadoutForMaxRoll = renderLoadoutSlots;
  renderLoadoutSlots = function renderLoadoutWithMaxRolls() {
    const rendered = coreRenderLoadoutForMaxRoll();
    [...ui.loadoutSlots.querySelectorAll('.artifact-slot')].forEach((slotCard, index) => {
      const slot = loadout[index];
      if (!slot?.artifactId) return;
      const info = finderMaxRollInfo(slot.quality);
      if (!info.isMax) return;
      slotCard.classList.add('max-roll-artifact');
      const top = slotCard.querySelector('.slot-topline');
      if (top && !top.querySelector('.max-roll-badge')) {
        top.insertAdjacentHTML('beforeend', `<span class="max-roll-badge" title="Maximum ${escapeHtml(info.band.name)} quality roll">★ MAX ROLL</span>`);
      }
    });
    return rendered;
  };
}

const finderTierStyle = document.createElement('style');
finderTierStyle.textContent = `
  .finder-tier-controls{display:grid;gap:8px;margin:1px 0 11px;padding:9px;border:1px solid var(--border-soft);border-radius:7px;background:var(--panel-2)}
  .finder-tier-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.finder-tier-head>span{font:10px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .finder-tier-mode{display:grid;grid-template-columns:1fr 1fr;gap:4px}.finder-tier-mode-btn{height:28px;padding:0 9px;border:1px solid var(--border);border-radius:5px;background:#0b1118;color:var(--muted);font-size:9.5px;cursor:pointer}.finder-tier-mode-btn.active{border-color:var(--accent-dim);background:var(--accent-soft);color:var(--accent)}
  .finder-tier-selects{display:grid;grid-template-columns:1fr 1fr;gap:6px}.finder-tier-summary{margin:0;color:var(--text-dim);font-size:10px;line-height:1.4}
  .max-roll-artifact{border-color:rgba(241,196,90,.48)!important;box-shadow:inset 0 0 0 1px rgba(241,196,90,.08)}
  .max-roll-badge{display:inline-flex;align-items:center;width:max-content;margin-top:4px;padding:3px 6px;border:1px solid rgba(241,196,90,.42);border-radius:5px;background:rgba(241,196,90,.09);color:#f1c45a;font:700 8.5px var(--mono);letter-spacing:.04em;white-space:nowrap}
  .slot-topline>.max-roll-badge{margin-top:0;margin-left:auto}
  @media(max-width:700px){.finder-tier-head{align-items:flex-start;flex-direction:column}.finder-tier-selects{grid-template-columns:1fr}.finder-tier-mode{width:100%}}
`;
document.head.appendChild(finderTierStyle);

injectFinderTierControls();
updateFinderTierUI();
