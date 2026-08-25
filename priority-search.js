// Priority-based finder mode.
// Lets users describe what matters (High / Medium / Low) instead of guessing exact target values.
// Exact numeric requirements remain available as an advanced search style.

let finderSearchStyle = 'priority';
const statPriorities = new Map();

const PRIORITY_LEVELS = {
  off: { weight: 0, repeats: 0, label: 'Off' },
  low: { weight: 1, repeats: 1, label: 'Low' },
  medium: { weight: 3, repeats: 3, label: 'Medium' },
  high: { weight: 6, repeats: 6, label: 'High' }
};

function priorityStats() {
  return (statCatalog || [])
    .filter(stat => !ACCUMULATION_STATS.has(stat.key))
    .sort((a, b) => {
      const groupA = typeof finalStatGroup === 'function' ? finalStatGroup(statForPriorityGroup(a)) : 'Other';
      const groupB = typeof finalStatGroup === 'function' ? finalStatGroup(statForPriorityGroup(b)) : 'Other';
      const order = ['Survivability', 'Mobility', 'Protection', 'Other'];
      const groupDiff = order.indexOf(groupA) - order.indexOf(groupB);
      return groupDiff || a.name.localeCompare(b.name);
    });
}

function statForPriorityGroup(stat) {
  return { ...stat, value: 0 };
}

function selectedPriorities() {
  return priorityStats()
    .map(stat => ({ stat, level: statPriorities.get(stat.key) || 'off' }))
    .filter(item => item.level !== 'off');
}

function priorityGroup(stat) {
  if (typeof finalStatGroup === 'function') {
    const group = finalStatGroup(statForPriorityGroup(stat));
    return group === 'Exposure' ? 'Other' : group;
  }
  const text = `${stat.key || ''} ${stat.name || ''}`.toLowerCase();
  if (/health|heal|regen|recovery|vitality/.test(text)) return 'Survivability';
  if (/speed|stamina|weight|carry/.test(text)) return 'Mobility';
  if (/protection|resistance|stability|dmg_factor/.test(text)) return 'Protection';
  return 'Other';
}

function injectPriorityInterface() {
  const requirementsPanel = document.getElementById('requirements')?.closest('.panel');
  if (!requirementsPanel || document.getElementById('prioritySearchTools')) return;

  const sectionRow = requirementsPanel.querySelector('.section-row');
  const mode = document.createElement('div');
  mode.className = 'search-style-switch';
  mode.innerHTML = `
    <span>Search style</span>
    <div class="search-style-buttons" role="tablist" aria-label="Finder search style">
      <button type="button" class="search-style-button active" data-search-style="priority" aria-selected="true">Priorities</button>
      <button type="button" class="search-style-button" data-search-style="exact" aria-selected="false">Exact targets</button>
    </div>
  `;
  sectionRow?.insertAdjacentElement('afterend', mode);

  const priority = document.createElement('div');
  priority.id = 'prioritySearchTools';
  priority.innerHTML = `
    <p class="priority-help">Pick what matters most. The finder will trade stats against each other automatically while still keeping exposure values below the safety limit.</p>
    <label class="priority-filter"><span>Filter stats</span><input id="priorityFilter" type="search" placeholder="Search movement, stamina, carry…" autocomplete="off" /></label>
    <div id="priorityRows" class="priority-rows"></div>
  `;
  mode.insertAdjacentElement('afterend', priority);

  mode.addEventListener('click', event => {
    const button = event.target.closest('[data-search-style]');
    if (!button) return;
    finderSearchStyle = button.dataset.searchStyle === 'exact' ? 'exact' : 'priority';
    updateSearchStyleUI();
    if (typeof clearStaleFinderResults === 'function') {
      clearStaleFinderResults('Search style changed. Run the finder again.');
    }
  });

  document.getElementById('priorityFilter')?.addEventListener('input', renderPriorityRows);
  document.getElementById('priorityRows')?.addEventListener('click', event => {
    const button = event.target.closest('[data-priority-key][data-priority-level]');
    if (!button) return;
    const key = button.dataset.priorityKey;
    const level = button.dataset.priorityLevel;
    if (!PRIORITY_LEVELS[level]) return;
    statPriorities.set(key, level);
    renderPriorityRows();
    if (typeof clearStaleFinderResults === 'function') {
      clearStaleFinderResults('Priorities changed. Run the finder again.');
    }
  });

  updateSearchStyleUI();
  renderPriorityRows();
}

function updateSearchStyleUI() {
  const panel = document.getElementById('requirements')?.closest('.panel');
  const priority = document.getElementById('prioritySearchTools');
  if (!panel || !priority) return;
  const priorityMode = finderSearchStyle === 'priority';
  priority.hidden = !priorityMode;
  panel.querySelector('.requirement-tools')?.toggleAttribute('hidden', priorityMode);
  document.getElementById('requirements')?.toggleAttribute('hidden', priorityMode);
  panel.querySelectorAll('[data-search-style]').forEach(button => {
    const active = button.dataset.searchStyle === finderSearchStyle;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  const clearButton = ui.addRequirement;
  if (clearButton) {
    clearButton.textContent = priorityMode ? 'Clear priorities' : 'Clear';
    clearButton.title = priorityMode ? 'Clear selected priorities' : 'Clear active requirements';
  }
}

function renderPriorityRows() {
  const host = document.getElementById('priorityRows');
  if (!host) return;
  const filter = document.getElementById('priorityFilter')?.value.trim().toLowerCase() || '';
  const groups = new Map([
    ['Survivability', []],
    ['Mobility', []],
    ['Protection', []],
    ['Other', []]
  ]);
  for (const stat of priorityStats()) {
    if (filter && !stat.name.toLowerCase().includes(filter)) continue;
    const group = priorityGroup(stat);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(stat);
  }

  host.innerHTML = [...groups.entries()].map(([group, stats]) => {
    if (!stats.length) return '';
    return `
      <section class="priority-group">
        <div class="priority-group-title">${escapeHtml(group)}</div>
        ${stats.map(stat => {
          const level = statPriorities.get(stat.key) || 'off';
          return `
            <div class="priority-row">
              <span class="priority-stat-name" title="${escapeHtml(stat.name)}">${escapeHtml(stat.name)}${stat.isPercentage ? ' (%)' : ''}</span>
              <div class="priority-level-buttons" role="group" aria-label="${escapeHtml(stat.name)} priority">
                ${['off','low','medium','high'].map(option => `<button type="button" class="priority-level-button ${level === option ? 'active' : ''} priority-${option}" data-priority-key="${escapeHtml(stat.key)}" data-priority-level="${option}">${PRIORITY_LEVELS[option].label}</button>`).join('')}
              </div>
            </div>`;
        }).join('')}
      </section>`;
  }).join('') || '<p class="priority-empty">No matching stats.</p>';
}

function priorityBaseValue(key) {
  const map = statsArrayToMap(calculateContainerStats(currentContainer));
  return Number(map.get(key)?.value || 0);
}

function bestPriorityArtifactContribution(key, pool, quality, potential, includeAdditionals) {
  let best = 0;
  const maxAdditional = includeAdditionals ? unlockedSlots(potential) : 0;
  for (const artifact of pool) {
    let total = 0;
    for (const stat of artifact.stats || []) {
      if (stat.key !== key) continue;
      const raw = calculateRawStat(stat, quality, potential);
      const value = applyContainerEffects(stat, raw.value, currentContainer);
      if (Number.isFinite(value)) total += value;
    }
    if (maxAdditional > 0) {
      const additions = (artifact.additionalStats || [])
        .filter(stat => stat.key === key)
        .map(stat => {
          const raw = calculateRawStat(stat, quality, potential);
          return applyContainerEffects(stat, raw.value, currentContainer);
        })
        .filter(Number.isFinite)
        .sort((a, b) => b - a)
        .slice(0, maxAdditional);
      total += additions.reduce((sum, value) => sum + value, 0);
    }
    best = Math.max(best, total);
  }
  return best;
}

function priorityTargetFor(stat, pool) {
  const quality = Math.round(clamp(ui.qualityMax.value, 85, 190));
  const potential = Math.round(clamp(ui.potentialMax.value, 0, 15));
  const capacity = Math.max(1, Number(currentContainer?.capacity || 1));
  const base = priorityBaseValue(stat.key);
  const bestPerSlot = bestPriorityArtifactContribution(stat.key, pool, quality, potential, ui.includeAdditionals.checked);
  const ceiling = base + Math.max(0, bestPerSlot) * capacity;
  // A positive, per-stat ceiling gives evaluateRequirements a natural normalization scale.
  return Math.max(1, ceiling, Math.abs(base));
}

function collectPriorityRequirements() {
  const selected = selectedPriorities();
  if (!selected.length) return [];
  const pool = eligibleArtifacts();
  const requirements = [];
  for (const { stat, level } of selected) {
    const target = priorityTargetFor(stat, pool);
    const repeats = PRIORITY_LEVELS[level].repeats;
    for (let i = 0; i < repeats; i++) {
      requirements.push({
        id: `priority:${stat.key}:${i}`,
        key: stat.key,
        op: '>=',
        target,
        stat,
        prioritySynthetic: true,
        priorityLevel: level,
        priorityWeight: PRIORITY_LEVELS[level].weight
      });
    }
  }
  return requirements;
}

const exactCollectRequirementsForPriorityMode = collectRequirements;
collectRequirements = function collectRequirementsBySearchStyle() {
  return finderSearchStyle === 'priority'
    ? collectPriorityRequirements()
    : exactCollectRequirementsForPriorityMode();
};

function priorityActual(result, key) {
  return Number(result?.totals?.get?.(key)?.value || 0);
}

function priorityDisplayHtml(result) {
  return selectedPriorities().map(({ stat, level }) => {
    const actual = priorityActual(result, stat.key);
    return `<span class="priority-result-stat priority-${level}"><small>${PRIORITY_LEVELS[level].label}</small><b>${escapeHtml(stat.name)}</b><em>${formatValue(actual, stat.isPercentage)}</em></span>`;
  }).join('');
}

const coreRenderFinderResultsForPriorities = renderFinderResults;
renderFinderResults = function renderFinderResultsWithPriorities(results) {
  if (finderSearchStyle !== 'priority') return coreRenderFinderResultsForPriorities(results);

  const displayResults = (results || []).map(result => {
    const details = result.evaluation?.details || [];
    const safetyDetails = details.filter(detail => detail.autoExposure);
    const safe = safetyDetails.length ? safetyDetails.every(detail => detail.pass) : true;
    return {
      ...result,
      evaluation: result.evaluation ? {
        ...result.evaluation,
        matched: safe,
        details: details.filter(detail => !detail.prioritySynthetic)
      } : result.evaluation
    };
  });

  const rendered = coreRenderFinderResultsForPriorities(displayResults);
  [...ui.optimizerResults.querySelectorAll('.result-card')].forEach((card, index) => {
    const badge = card.querySelector('.match-badge');
    if (badge) badge.textContent = 'Best fit';
    const requirementArea = card.querySelector('.result-requirements');
    if (requirementArea) {
      requirementArea.innerHTML = `<div class="priority-result-grid">${priorityDisplayHtml(displayResults[index])}</div>`;
    }
    const cost = card.querySelector('.result-cost');
    if (cost) cost.textContent = `Priority-ranked · ${cost.textContent}`;
  });
  if (ui.searchSummary && displayResults.length) {
    const selected = selectedPriorities();
    const description = selected.map(({ stat, level }) => `${PRIORITY_LEVELS[level].label}: ${stat.name}`).join(' · ');
    ui.searchSummary.textContent = `Ranked by your priorities — ${description}. Exposure balancing stays automatic below +0.50.`;
  }
  return rendered;
};

// Re-purpose the existing Clear button while priority mode is active.
const priorityClearButton = ui.addRequirement;
priorityClearButton?.addEventListener('click', () => {
  if (finderSearchStyle !== 'priority') return;
  statPriorities.clear();
  renderPriorityRows();
});

const coreResetFinderForPriorities = resetFinder;
resetFinder = function resetFinderWithPriorities() {
  const result = coreResetFinderForPriorities();
  statPriorities.clear();
  finderSearchStyle = 'priority';
  updateSearchStyleUI();
  renderPriorityRows();
  if (ui.searchSummary) ui.searchSummary.textContent = 'Choose High, Medium, or Low priorities, then click Find loadouts.';
  return result;
};

// Refresh the priority catalog whenever game/armor data extends the stat catalog.
if (typeof buildStatCatalog === 'function') {
  const coreBuildStatCatalogForPriorities = buildStatCatalog;
  buildStatCatalog = function buildStatCatalogAndPriorities(...args) {
    const result = coreBuildStatCatalogForPriorities(...args);
    renderPriorityRows();
    return result;
  };
}
if (typeof rebuildStatCatalogWithArmor === 'function') {
  const coreRebuildCatalogForPriorities = rebuildStatCatalogWithArmor;
  rebuildStatCatalogWithArmor = function rebuildCatalogAndPriorities(...args) {
    const result = coreRebuildCatalogForPriorities(...args);
    renderPriorityRows();
    return result;
  };
}

const priorityStyle = document.createElement('style');
priorityStyle.textContent = `
  .search-style-switch{display:grid;gap:6px;margin:0 0 10px;padding-top:2px}.search-style-switch>span,.priority-filter>span{font:10px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .search-style-buttons{display:grid;grid-template-columns:1fr 1fr;gap:5px}.search-style-button{height:34px;border:1px solid var(--border);border-radius:7px;background:var(--panel-2);color:var(--muted);font-size:11px;font-weight:650;cursor:pointer}.search-style-button.active{border-color:var(--accent-dim);background:var(--accent-soft);color:var(--accent)}
  #prioritySearchTools{display:grid;gap:9px}.priority-help{margin:0;color:var(--text-dim);font-size:11px;line-height:1.45}.priority-filter{display:grid;gap:5px}.priority-filter input{width:100%}
  .priority-rows{max-height:560px;overflow:auto;padding-right:3px;display:grid;gap:8px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}.priority-group{display:grid;gap:3px}.priority-group-title{padding:5px 2px 2px;font:700 9px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  .priority-row{display:grid;grid-template-columns:minmax(110px,1fr) minmax(210px,auto);align-items:center;gap:8px;padding:5px 6px;border:1px solid var(--border-soft);border-radius:7px;background:var(--panel-2)}.priority-stat-name{font-size:11px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .priority-level-buttons{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}.priority-level-button{height:25px;padding:0 6px;border:1px solid transparent;border-radius:5px;background:#0b1118;color:#69727d;font-size:9px;cursor:pointer}.priority-level-button:hover{color:var(--text-dim);border-color:var(--border)}.priority-level-button.active.priority-off{background:#151b22;color:#8c949f}.priority-level-button.active.priority-low{background:rgba(87,156,255,.12);border-color:rgba(87,156,255,.35);color:#75afff}.priority-level-button.active.priority-medium{background:rgba(233,167,60,.12);border-color:rgba(233,167,60,.38);color:var(--warn)}.priority-level-button.active.priority-high{background:rgba(70,201,125,.12);border-color:rgba(70,201,125,.38);color:var(--good)}
  .priority-result-grid{display:flex;flex-wrap:wrap;gap:5px;width:100%}.priority-result-stat{display:grid;grid-template-columns:auto auto auto;align-items:center;gap:5px;padding:4px 6px;border:1px solid var(--border-soft);border-radius:5px;background:var(--panel-2);font-size:9px}.priority-result-stat small{font:700 8px var(--mono);text-transform:uppercase}.priority-result-stat b{color:var(--text-dim);font-weight:600}.priority-result-stat em{font:700 9px var(--mono);font-style:normal;color:var(--text)}.priority-result-stat.priority-high small{color:var(--good)}.priority-result-stat.priority-medium small{color:var(--warn)}.priority-result-stat.priority-low small{color:#75afff}
  .priority-empty{margin:8px 0;color:var(--muted);font-size:10px}
  @media(max-width:700px){.priority-row{grid-template-columns:1fr}.priority-level-buttons{grid-template-columns:repeat(4,minmax(0,1fr))}}
`;
document.head.appendChild(priorityStyle);

injectPriorityInterface();
setTimeout(() => { renderPriorityRows(); updateSearchStyleUI(); }, 100);
