// Finder result curation: keep the results readable and useful.
// - Show at most five recommendations at a time.
// - Collapse repeated versions of the same artifact composition.
// - When a requirements-met build exists, show the best one first and prefer
//   close alternatives that do not quite meet the target before showing another
//   fully-matched composition.

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
  // Deliberately ignores quality/Potential so the same artifact lineup does not
  // fill the page several times just because one roll changed slightly.
  return [...(result?.picks || [])]
    .map(pick => String(pick.artifactId || pick.artifactName || ''))
    .sort()
    .join('|');
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

function curateFinderResults(results = []) {
  const unique = uniqueFinderCandidates(results);
  if (unique.length <= 1) return unique.slice(0, FINDER_RESULT_LIMIT);

  const primary = unique[0];
  const rest = unique.slice(1);
  const chosen = [primary];

  if (finderResultIsMatched(primary)) {
    // Prefer genuinely near / not-quite alternatives after the best successful
    // build. This gives the player useful fallback options instead of five near-
    // duplicate "requirements met" cards.
    const near = rest.filter(result => finderResultFitKind(result) === 'near');
    const misses = rest.filter(result => !finderResultIsMatched(result) && finderResultFitKind(result) !== 'near');
    const otherMatches = rest.filter(result => finderResultIsMatched(result) && finderResultFitKind(result) !== 'near');

    for (const bucket of [near, misses, otherMatches]) {
      for (const result of bucket) {
        if (chosen.length >= FINDER_RESULT_LIMIT) break;
        if (!chosen.includes(result)) chosen.push(result);
      }
      if (chosen.length >= FINDER_RESULT_LIMIT) break;
    }
  } else {
    for (const result of rest) {
      if (chosen.length >= FINDER_RESULT_LIMIT) break;
      chosen.push(result);
    }
  }

  return chosen.slice(0, FINDER_RESULT_LIMIT);
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

    const cards = [...(ui.optimizerResults?.querySelectorAll('.result-card') || [])];
    cards.forEach((card, index) => {
      card.classList.toggle('primary-recommendation', index === 0);
      card.classList.toggle('similar-recommendation', index > 0);
    });

    if (ui.resultCount) ui.resultCount.textContent = String(curated.length);
    if (ui.searchSummary && curated.length) {
      const note = ' Showing up to 5 unique builds; repeated artifact lineups are collapsed and similar alternatives are shown after the best fit.';
      if (!ui.searchSummary.textContent.includes('up to 5 unique builds')) ui.searchSummary.textContent += note;
    }
    return rendered;
  };
}

const resultCurationStyle = document.createElement('style');
resultCurationStyle.textContent = `
  .result-card.primary-recommendation{box-shadow:inset 0 0 0 1px rgba(174,190,216,.10)}
  .result-card.similar-recommendation{opacity:.96}
`;
document.head.appendChild(resultCurationStyle);
