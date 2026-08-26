// Finder result curation: keep the results readable and useful.
// - Show at most five recommendations at a time.
// - Collapse repeated versions of the same artifact composition.
// - In Exact mode, show a successful target-hit build only once.
// - Use the remaining cards for close, genuinely different alternatives that
//   trade a little target accuracy for stronger secondary stats.

const FINDER_RESULT_LIMIT = 5;

function normalizedAdditionalSignature(pick) {
  return [...(pick?.additionalIds || [])].map(String).sort().join(',');
}

function exactBuildSignature(result) {
  return [...(result?.picks || [])]
    .map(pick => [
      pick.artifactId || pick.artifactName || '',
      Number(pick.quality || 0),
      Number(pick.potential || 0),
      normalizedAdditionalSignature(pick)
    ].join(':'))
    .sort()
    .join('|');
}

function artifactCompositionSignature(result) {
  // Ignore quality/Potential here so the same artifact lineup does not fill the
  // page several times just because one roll moved by a point.
  return [...(result?.picks || [])]
    .map(pick => String(pick.artifactId || pick.artifactName || ''))
    .sort()
    .join('|');
}

function artifactIdSet(result) {
  return new Set((result?.picks || []).map(pick => String(pick.artifactId || pick.artifactName || '')));
}

function uniqueFinderCandidates(results = []) {
  const seenExact = new Set();
  const seenComposition = new Set();
  const unique = [];

  for (const result of results || []) {
    const exact = exactBuildSignature(result);
    const composition = artifactCompositionSignature(result);
    if (!exact || seenExact.has(exact) || seenComposition.has(composition)) continue;
    seenExact.add(exact);
    seenComposition.add(composition);
    unique.push(result);
  }
  return unique;
}

function finderResultIsMatched(result) {
  return Boolean(result?.evaluation?.matched);
}

function finderResultFitKind(result) {
  if (typeof assessTargetFit !== 'function') return null;
  try {
    return assessTargetFit(result)?.kind || null;
  } catch {
    return null;
  }
}

function activeFinderTargetKeys() {
  const keys = new Set();

  if (typeof finderSearchStyle !== 'undefined' && finderSearchStyle === 'priority' && typeof selectedPriorities === 'function') {
    try {
      selectedPriorities().forEach(entry => {
        if (entry?.stat?.key) keys.add(entry.stat.key);
        else if (entry?.key) keys.add(entry.key);
      });
    } catch {}
  } else {
    for (const row of requirementRows || []) {
      if (row?.enabled && row?.key) keys.add(row.key);
    }
  }

  return keys;
}

function isUsefulAltStat(stat, targetKeys) {
  if (!stat?.key || targetKeys.has(stat.key)) return false;
  if (typeof ACCUMULATION_STATS !== 'undefined' && ACCUMULATION_STATS.has(stat.key)) return false;
  if (stat.isPositive === false) return false;
  return Number.isFinite(Number(stat.value));
}

function alternativeStatGains(result, primary) {
  if (!(result?.totals instanceof Map) || !(primary?.totals instanceof Map)) return [];
  const targetKeys = activeFinderTargetKeys();
  const gains = [];

  for (const [key, stat] of result.totals.entries()) {
    if (!isUsefulAltStat(stat, targetKeys)) continue;
    const actual = Number(stat.value || 0);
    const baseline = Number(primary.totals.get(key)?.value || 0);
    const gain = actual - baseline;
    const threshold = stat.isPercentage ? 0.05 : 0.10;
    if (gain <= threshold) continue;

    const scale = Math.max(1, Math.abs(actual), Math.abs(baseline));
    gains.push({
      key,
      name: stat.name || key,
      gain,
      actual,
      isPercentage: Boolean(stat.isPercentage),
      normalizedGain: gain / scale
    });
  }

  return gains
    .sort((a, b) => b.normalizedGain - a.normalizedGain || b.gain - a.gain)
    .slice(0, 4);
}

function artifactNovelty(a, b) {
  const aSet = artifactIdSet(a);
  const bSet = artifactIdSet(b);
  if (!aSet.size && !bSet.size) return 0;
  let overlap = 0;
  aSet.forEach(id => { if (bSet.has(id)) overlap += 1; });
  const union = new Set([...aSet, ...bSet]).size || 1;
  return 1 - (overlap / union);
}

function minimumNovelty(candidate, chosen) {
  if (!chosen.length) return 1;
  return Math.min(...chosen.map(result => artifactNovelty(candidate, result)));
}

function targetClosenessScore(result) {
  const deficit = Math.max(0, Number(result?.evaluation?.deficit || 0));
  return 1 / (1 + (deficit * 8));
}

function alternativeUsefulnessScore(candidate, primary, chosen) {
  const gains = alternativeStatGains(candidate, primary);
  const altStrength = gains.slice(0, 3).reduce((sum, gain) => sum + Math.min(1.5, gain.normalizedGain), 0);
  const novelty = minimumNovelty(candidate, chosen);
  const fitKind = finderResultFitKind(candidate);
  const nearBonus = fitKind === 'near' ? 0.85 : 0;
  const closeness = targetClosenessScore(candidate);

  // Target closeness still matters most, but side-stat strength and a different
  // artifact mix are deliberately rewarded so the five cards are useful choices.
  return (closeness * 2.4) + (altStrength * 1.25) + (novelty * 0.9) + nearBonus;
}

function selectVariedAlternatives(candidates, primary, slots) {
  const remaining = [...candidates];
  const chosen = [];

  while (remaining.length && chosen.length < slots) {
    remaining.sort((a, b) =>
      alternativeUsefulnessScore(b, primary, chosen) - alternativeUsefulnessScore(a, primary, chosen)
      || Number(a?.evaluation?.deficit || 0) - Number(b?.evaluation?.deficit || 0)
      || Number(a?.cost || 0) - Number(b?.cost || 0)
    );
    chosen.push(remaining.shift());
  }

  return chosen;
}

function curateFinderResults(results = []) {
  const unique = uniqueFinderCandidates(results);
  if (!unique.length) return [];

  const primary = unique[0];
  const exactMode = typeof finderSearchStyle === 'undefined' || finderSearchStyle === 'exact';
  let alternatives = unique.slice(1);

  // If we have the exact requested build, do not fill the page with four more
  // target-hit builds. Keep the best hit once and use the rest for close tradeoffs.
  if (exactMode && finderResultIsMatched(primary)) {
    alternatives = alternatives.filter(result => !finderResultIsMatched(result));
  }

  return [
    primary,
    ...selectVariedAlternatives(alternatives, primary, FINDER_RESULT_LIMIT - 1)
  ].slice(0, FINDER_RESULT_LIMIT);
}

function variationSummaryHtml(result, primary) {
  const gains = alternativeStatGains(result, primary).slice(0, 2);
  if (!gains.length) {
    return '<div class="variation-summary"><strong>Alternative mix</strong><span>Different artifact combination with a similar overall fit.</span></div>';
  }

  return `<div class="variation-summary">
    <strong>Stronger side stats</strong>
    <div>${gains.map(gain => `<span title="${escapeHtml(`${gain.name}: ${formatValue(gain.actual, gain.isPercentage)} total`)}">↑ ${escapeHtml(gain.name)} ${formatValue(gain.gain, gain.isPercentage)} vs Build 1</span>`).join('')}</div>
  </div>`;
}

function decorateVariationCards(results = []) {
  const cards = [...(ui.optimizerResults?.querySelectorAll('.result-card') || [])];
  const primary = results[0];

  cards.forEach((card, index) => {
    card.querySelector('.variation-summary')?.remove();
    card.classList.toggle('primary-recommendation', index === 0);
    card.classList.toggle('similar-recommendation', index > 0);
    if (index === 0 || !primary || !results[index]) return;

    const artifactsArea = card.querySelector('.result-artifacts');
    const exposureBlock = card.querySelector('.build-exposure-safe,.build-exposure-flaw');
    const html = variationSummaryHtml(results[index], primary);
    if (exposureBlock) exposureBlock.insertAdjacentHTML('beforebegin', html);
    else artifactsArea?.insertAdjacentHTML('afterend', html);
  });
}

if (typeof runBeamSearch === 'function') {
  const coreRunBeamSearchForCuration = runBeamSearch;
  runBeamSearch = function runBeamSearchWithCuratedResults(...args) {
    return curateFinderResults(coreRunBeamSearchForCuration(...args));
  };
}

if (typeof renderFinderResults === 'function') {
  const coreRenderFinderResultsForCuration = renderFinderResults;
  renderFinderResults = function renderFinderResultsCurated(results = []) {
    const curated = curateFinderResults(results);
    const rendered = coreRenderFinderResultsForCuration(curated);
    decorateVariationCards(curated);

    if (ui.resultCount) ui.resultCount.textContent = String(curated.length);
    if (ui.searchSummary && curated.length) {
      const note = ' Showing up to 5 unique builds. A target-hit build appears once; the other cards favor close alternatives with stronger side stats and different artifact mixes.';
      if (!ui.searchSummary.textContent.includes('up to 5 unique builds')) ui.searchSummary.textContent += note;
    }
    return rendered;
  };
}

const resultCurationStyle = document.createElement('style');
resultCurationStyle.textContent = `
  .result-card.primary-recommendation{box-shadow:inset 0 0 0 1px rgba(174,190,216,.10)}
  .result-card.similar-recommendation{opacity:.97}
  .variation-summary{display:grid;gap:5px;margin:9px 0 2px;padding:8px 9px;border:1px solid var(--border-soft);border-radius:7px;background:rgba(127,180,255,.045)}
  .variation-summary>strong{font:800 9px var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--accent-hi)}
  .variation-summary>span{font-size:10.5px;color:var(--muted)}
  .variation-summary>div{display:flex;flex-wrap:wrap;gap:5px}
  .variation-summary>div>span{padding:4px 6px;border-radius:5px;border:1px solid rgba(70,201,125,.22);background:rgba(70,201,125,.055);color:var(--good);font:700 9px var(--mono)}
`;
document.head.appendChild(resultCurationStyle);
