// Strict finder safety + per-artifact stat outcome display.
// Safety is mandatory: Finder recommendations are never shown when any net
// accumulation is >= +0.50. Artifact cards also show their calculated stat
// outcomes and highlight HIGH / MAX beneficial rolls inside the searched range.

const STRICT_EXPOSURE_LIMIT = 0.49;
let finderSafetyRejectedAll = false;

function strictExposureValue(totals, key) {
  return Number(totals?.get?.(key)?.value || 0);
}

function strictExposureSafe(totals) {
  return AUTO_EXPOSURE_KEYS.every(key => strictExposureValue(totals, key) <= STRICT_EXPOSURE_LIMIT + 1e-9);
}

function strictExposureSnapshot(totals) {
  return AUTO_EXPOSURE_KEYS
    .map(key => ({
      key,
      name: AUTO_EXPOSURE_FALLBACK_NAMES.get(key) || key,
      value: strictExposureValue(totals, key)
    }))
    .filter(item => Math.abs(item.value) >= 0.0005);
}

function strictExposurePenalty(totals, remainingSlots, bestReducerByKey) {
  let penalty = 0;
  for (const key of AUTO_EXPOSURE_KEYS) {
    const actual = strictExposureValue(totals, key);
    const reducer = Math.min(0, Number(bestReducerByKey.get(key) || 0));
    const optimisticFinal = actual + (remainingSlots * reducer);

    // If even the strongest possible reducers cannot bring this state below the
    // damage threshold, make it essentially impossible for the beam to keep it.
    if (optimisticFinal > STRICT_EXPOSURE_LIMIT) {
      penalty += 1e9 + ((optimisticFinal - STRICT_EXPOSURE_LIMIT) * 1e7);
    } else if (actual > STRICT_EXPOSURE_LIMIT) {
      // Recoverable unsafe partial states are allowed so a later balancing
      // artifact can rescue them, but safer partial states get a small preference.
      penalty += (actual - STRICT_EXPOSURE_LIMIT) * 250;
    }
  }
  return penalty;
}

function bestExposureReducers(variantsByArtifact) {
  const reducers = new Map(AUTO_EXPOSURE_KEYS.map(key => [key, 0]));
  for (const variants of variantsByArtifact) {
    for (const variant of variants) {
      const map = statsArrayToMap(variant.stats || []);
      for (const key of AUTO_EXPOSURE_KEYS) {
        const value = Number(map.get(key)?.value || 0);
        if (value < Number(reducers.get(key) || 0)) reducers.set(key, value);
      }
    }
  }
  return reducers;
}

// Replace the previous soft-safety wrapper with a beam search that treats safety
// as a hard final constraint while still allowing temporarily unsafe partial builds
// when remaining slots can realistically balance them.
runBeamSearch = function runStrictSafeBeamSearch(requirements, pool, qualityMin, qualityMax, potentialMin, potentialMax, includeAdditionals) {
  finderSafetyRejectedAll = false;
  const safeRequirements = addAutomaticExposureRequirements(requirements || []);

  const relevantPool = pool.filter(artifact => {
    const keys = new Set([...(artifact.stats || []), ...(artifact.additionalStats || [])].map(stat => stat.key));
    return safeRequirements.some(req => keys.has(req.key));
  });
  const searchPool = relevantPool.length ? relevantPool : pool;
  const variantsByArtifact = searchPool.map(artifact => buildArtifactVariants(
    artifact,
    safeRequirements,
    qualityMin,
    qualityMax,
    potentialMin,
    potentialMax,
    includeAdditionals
  ));

  const reducers = bestExposureReducers(variantsByArtifact);
  const baseTotals = statsArrayToMap(calculateContainerStats(currentContainer));
  const capacity = Number(currentContainer?.capacity || 0);
  let beam = [{ picks: [], totals: baseTotals, cost: 0, minArtifactIndex: 0 }];
  const BEAM_WIDTH = 360;

  for (let slot = 0; slot < capacity; slot++) {
    const next = [];
    const remainingSlots = capacity - slot - 1;
    for (const state of beam) {
      for (let artifactIndex = state.minArtifactIndex; artifactIndex < searchPool.length; artifactIndex++) {
        const variants = variantsByArtifact[artifactIndex] || [];
        for (const variant of variants) {
          const candidate = {
            picks: [...state.picks, variant],
            totals: addStatsToTotals(state.totals, variant.stats),
            cost: state.cost + variant.cost,
            minArtifactIndex: artifactIndex
          };
          candidate.__strictRank = stateRank(candidate, safeRequirements)
            + strictExposurePenalty(candidate.totals, remainingSlots, reducers);
          next.push(candidate);
        }
      }
    }

    next.sort((a, b) => a.__strictRank - b.__strictRank);
    const deduped = [];
    const seen = new Set();
    for (const state of next) {
      const sig = stateSignature(state);
      if (seen.has(sig)) continue;
      seen.add(sig);
      deduped.push(state);
      if (deduped.length >= BEAM_WIDTH) break;
    }
    beam = deduped;
    if (!beam.length) break;
  }

  const finished = beam.map(state => ({
    ...state,
    evaluation: evaluateRequirements(state.totals, safeRequirements)
  }));
  const safe = finished.filter(state => strictExposureSafe(state.totals));
  finderSafetyRejectedAll = finished.length > 0 && safe.length === 0;

  return safe
    .sort((a, b) => {
      if (a.evaluation.matched !== b.evaluation.matched) return a.evaluation.matched ? -1 : 1;
      if (typeof finderSearchStyle !== 'undefined' && finderSearchStyle === 'exact' && typeof mixedExactClosenessFromTotals === 'function') {
        const close = mixedExactClosenessFromTotals(a.totals, safeRequirements) - mixedExactClosenessFromTotals(b.totals, safeRequirements);
        if (Math.abs(close) > 1e-9) return close;
      }
      if (a.evaluation.deficit !== b.evaluation.deficit) return a.evaluation.deficit - b.evaluation.deficit;
      return a.cost - b.cost;
    })
    .slice(0, 20);
};

// Exact quality thresholds belong to the higher band (130 = Rare, 145 = Exclusive,
// 160 = Legendary, 175 = Unique). This restores the calculator's verified behavior.
qualityBand = function qualityBandVerifiedThresholds(quality) {
  const q = Number(quality);
  if (q >= 175) return QUALITY_BANDS[6];
  if (q >= 160) return QUALITY_BANDS[5];
  if (q >= 145) return QUALITY_BANDS[4];
  if (q >= 130) return QUALITY_BANDS[3];
  if (q >= 115) return QUALITY_BANDS[2];
  if (q >= 100) return QUALITY_BANDS[1];
  return QUALITY_BANDS[0];
};

// Finder uses integer quality values, so 144 is the highest Rare value before
// 145 becomes Exclusive, 159 is the highest Exclusive value, etc.
function finderIntegerTierMax(index) {
  const band = QUALITY_BANDS[index];
  if (!band) return 190;
  return index < QUALITY_BANDS.length - 1 ? band.max - 1 : band.max;
}

if (typeof finderTierBounds === 'function') {
  finderTierBounds = function finderTierBoundsVerified() {
    const lowIndex = Math.min(finderTierFromIndex, finderTierToIndex);
    const highIndex = Math.max(finderTierFromIndex, finderTierToIndex);
    const from = FINDER_TIER_BANDS[lowIndex] || FINDER_TIER_BANDS[0];
    const to = FINDER_TIER_BANDS[highIndex] || FINDER_TIER_BANDS[FINDER_TIER_BANDS.length - 1];
    if (finderTierSearchMode === 'single') {
      return { min: from.min, max: finderIntegerTierMax(lowIndex), from, to: from };
    }
    return { min: from.min, max: finderIntegerTierMax(highIndex), from, to };
  };
}

function aggregatePickStats(stats) {
  const map = new Map();
  for (const stat of stats || []) {
    const existing = map.get(stat.key);
    if (existing) existing.value += Number(stat.value || 0);
    else map.set(stat.key, { ...stat, value: Number(stat.value || 0) });
  }
  return [...map.values()];
}

function pickMaxComparisonStats(pick) {
  const artifact = findArtifact(pick.artifactId);
  if (!artifact) return new Map();
  const selected = new Set(pick.additionalIds || []);
  const maxQuality = Math.max(Number(pick.quality), Number(ui.qualityMax?.value || pick.quality));
  const maxPotential = Math.max(Number(pick.potential), Number(ui.potentialMax?.value || pick.potential));
  const comparison = calculateArtifactStats(artifact, maxQuality, maxPotential, selected, currentContainer)
    .filter(stat => !stat.special);
  return statsArrayToMap(comparison);
}

function statRollLevel(stat, comparison) {
  if (!stat || ACCUMULATION_STATS.has(stat.key) && Number(stat.value) > 0) return null;
  if (stat.isPositive === false) return null;
  const best = Number(comparison?.get?.(stat.key)?.value || 0);
  const actual = Number(stat.value || 0);
  if (Math.abs(best) < 1e-9) return null;

  // Beneficial reducers are negative; larger magnitude is the stronger roll.
  const ratio = best < 0
    ? Math.abs(actual) / Math.abs(best)
    : actual / best;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  if (ratio >= 0.995) return 'max';
  if (ratio >= 0.90) return 'high';
  return null;
}

function artifactOutcomeHtml(pick) {
  const stats = aggregatePickStats(pick.stats || []);
  const comparison = pickMaxComparisonStats(pick);
  if (!stats.length) return '';
  return `<div class="artifact-outcome-stats">${stats.map(stat => {
    const level = statRollLevel(stat, comparison);
    const exposure = ACCUMULATION_STATS.has(stat.key);
    const unsafeContribution = exposure && Number(stat.value) > 0;
    return `<div class="artifact-outcome-stat ${exposure ? 'exposure' : ''} ${unsafeContribution ? 'harmful' : ''}">
      <span>${escapeHtml(stat.name)}</span>
      <b>${formatValue(stat.value, stat.isPercentage)}</b>
      ${level ? `<em class="stat-roll-${level}" title="${level === 'max' ? 'At the maximum beneficial outcome available in this search range' : 'Within 90% of the maximum beneficial outcome available in this search range'}">${level === 'max' ? '★ MAX' : '▲ HIGH'}</em>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function buildExposureStatusHtml(result) {
  const snapshot = strictExposureSnapshot(result?.totals);
  if (!snapshot.length) return '<div class="build-exposure-safe"><strong>✓ Exposure safe</strong><span>No positive accumulation remains.</span></div>';
  return `<div class="build-exposure-safe"><strong>✓ Exposure safe</strong><div>${snapshot.map(item =>
    `<span class="exposure-chip ${item.value > 0 ? 'positive-exposure' : 'negative-exposure'}">${escapeHtml(item.name)} ${formatValue(item.value, false)}</span>`
  ).join('')}</div></div>`;
}

const coreRenderFinderStrictSafety = renderFinderResults;
renderFinderResults = function renderFinderResultsWithStrictSafetyAndRolls(results) {
  const rendered = coreRenderFinderStrictSafety(results);

  // The old quality-level MAX ROLL badge was misleading (for example 130% is
  // the start of Rare, not a max Rare roll). Remove it and show actual stat outcomes.
  [...ui.optimizerResults.querySelectorAll('.result-card')].forEach((card, index) => {
    card.querySelectorAll('.max-roll-badge').forEach(node => node.remove());
    card.querySelectorAll('.max-roll-artifact').forEach(node => node.classList.remove('max-roll-artifact'));
    const result = results?.[index];
    const artifactCards = [...card.querySelectorAll('.result-artifact')];
    artifactCards.forEach((artifactCard, pickIndex) => {
      artifactCard.querySelector('.artifact-outcome-stats')?.remove();
      const pick = result?.picks?.[pickIndex];
      if (pick) artifactCard.insertAdjacentHTML('beforeend', artifactOutcomeHtml(pick));
    });
    if (result && !card.querySelector('.build-exposure-safe')) {
      const artifactsArea = card.querySelector('.result-artifacts');
      artifactsArea?.insertAdjacentHTML('afterend', buildExposureStatusHtml(result));
    }
  });

  if (!results?.length && finderSafetyRejectedAll && ui.searchSummary) {
    ui.searchSummary.textContent = 'No safe build was found in this search range. Unsafe recommendations are hidden — broaden the tier/quality range or allow more balancing options.';
  } else if (results?.length && ui.searchSummary && !ui.searchSummary.textContent.includes('Every shown build is exposure-safe')) {
    ui.searchSummary.textContent += ' Every shown build is exposure-safe (< +0.50 net Radiation/Bio/Psy/Temperature/Frost/Bleeding/Burning).';
  }
  return rendered;
};

const strictFinderStyle = document.createElement('style');
strictFinderStyle.textContent = `
  .artifact-outcome-stats{display:grid;gap:3px;margin-top:9px;padding-top:7px;border-top:1px solid var(--border-soft)}
  .artifact-outcome-stat{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:6px;min-height:20px;font-size:9.5px;color:var(--muted)}
  .artifact-outcome-stat>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.artifact-outcome-stat>b{font:700 9px var(--mono);color:var(--text-dim);white-space:nowrap}.artifact-outcome-stat.exposure>b{color:#93a2b4}.artifact-outcome-stat.harmful>b{color:var(--bad)}
  .artifact-outcome-stat em{font:800 8px var(--mono);font-style:normal;white-space:nowrap;padding:2px 4px;border-radius:4px}.stat-roll-max{color:#f1c45a;background:rgba(241,196,90,.10);border:1px solid rgba(241,196,90,.30)}.stat-roll-high{color:var(--good);background:rgba(70,201,125,.08);border:1px solid rgba(70,201,125,.24)}
  .build-exposure-safe{display:flex;align-items:flex-start;gap:8px;justify-content:space-between;margin:10px 0 2px;padding:7px 9px;border:1px solid rgba(70,201,125,.26);border-radius:7px;background:rgba(70,201,125,.055)}.build-exposure-safe>strong{font:800 9px var(--mono);color:var(--good);white-space:nowrap;padding-top:2px}.build-exposure-safe>div{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px}.build-exposure-safe>span{font-size:9px;color:var(--muted)}
  .exposure-chip{font:700 8px var(--mono);padding:3px 5px;border-radius:4px;background:var(--panel-2);border:1px solid var(--border-soft);white-space:nowrap}.positive-exposure{color:#d6b46f}.negative-exposure{color:var(--good)}
  @media(max-width:760px){.artifact-outcome-stat{grid-template-columns:minmax(0,1fr) auto}.artifact-outcome-stat em{grid-column:1/-1;justify-self:start}.build-exposure-safe{flex-direction:column}.build-exposure-safe>div{justify-content:flex-start}}
`;
document.head.appendChild(strictFinderStyle);
