// Automatic exposure balancing for finder searches.
// A net accumulation of +0.50 or higher is treated as unsafe, so the finder
// automatically keeps every accumulation stat at +0.49 or lower unless the
// user has already supplied an equal-or-stricter maximum for that stat.

const AUTO_EXPOSURE_LIMIT = 0.49;

const AUTO_EXPOSURE_KEYS = [
  RADIATION,
  BIOLOGICAL,
  PSYCHO,
  THERMAL,
  FROST,
  BLEEDING,
  BURNING
];

const AUTO_EXPOSURE_FALLBACK_NAMES = new Map([
  [RADIATION, 'Radiation'],
  [BIOLOGICAL, 'Biological infection'],
  [PSYCHO, 'Psy-emissions'],
  [THERMAL, 'Temperature'],
  [FROST, 'Frost'],
  [BLEEDING, 'Bleeding'],
  [BURNING, 'Burning']
]);

function exposureSafetyRequirement(key) {
  const catalogStat = statCatalog.find(stat => stat.key === key);
  return {
    id: `auto-exposure:${key}`,
    key,
    op: '<=',
    target: AUTO_EXPOSURE_LIMIT,
    stat: catalogStat || {
      key,
      name: AUTO_EXPOSURE_FALLBACK_NAMES.get(key) || key,
      isPercentage: false,
      isPositive: false
    },
    autoExposure: true
  };
}

function addAutomaticExposureRequirements(requirements = []) {
  const merged = [...requirements];
  for (const key of AUTO_EXPOSURE_KEYS) {
    const stricterExistingMax = merged.some(req =>
      req.key === key && req.op === '<=' && Number.isFinite(Number(req.target)) && Number(req.target) <= AUTO_EXPOSURE_LIMIT
    );
    if (!stricterExistingMax) merged.push(exposureSafetyRequirement(key));
  }
  return merged;
}

// The optimizer must consider balancing artifacts even when the user only asks
// for an unrelated positive stat such as Vitality or Movement Speed.
const previousRunBeamSearchExposureSafety = runBeamSearch;
runBeamSearch = function runBeamSearchWithExposureSafety(requirements, ...args) {
  return previousRunBeamSearchExposureSafety(addAutomaticExposureRequirements(requirements), ...args);
};

// Keep the automatic safety constraints out of the normal requirement-pill list;
// users still see the resulting net exposure values in Final Stats.
const previousRenderFinderResultsExposureSafety = renderFinderResults;
renderFinderResults = function renderFinderResultsWithExposureSafety(results) {
  const displayResults = (results || []).map(result => ({
    ...result,
    evaluation: result.evaluation ? {
      ...result.evaluation,
      details: (result.evaluation.details || []).filter(detail => !detail.autoExposure)
    } : result.evaluation
  }));
  const rendered = previousRenderFinderResultsExposureSafety(displayResults);

  const summary = document.getElementById('searchSummary');
  if (summary && displayResults.length) {
    const safetyNote = ' Exposure balance is enforced automatically below +0.50.';
    if (!summary.textContent.includes('Exposure balance')) summary.textContent += safetyNote;
  }
  return rendered;
};

// Small persistent note in Finder controls so the rule is visible before search.
function injectExposureSafetyNote() {
  const finder = document.getElementById('finderControls');
  if (!finder || document.getElementById('exposureSafetyNote')) return;
  const requirementsPanel = document.getElementById('requirements')?.closest('.panel');
  if (!requirementsPanel) return;
  const note = document.createElement('div');
  note.id = 'exposureSafetyNote';
  note.className = 'exposure-safety-note';
  note.innerHTML = '<strong>Automatic exposure balancing</strong><span>Radiation, bio, psy, temperature, frost, bleeding, and burning are kept below +0.50 net accumulation while searching.</span>';
  requirementsPanel.insertAdjacentElement('beforeend', note);
}

const exposureSafetyStyle = document.createElement('style');
exposureSafetyStyle.textContent = `
  .exposure-safety-note{margin-top:10px;padding:9px 10px;border:1px solid var(--border-soft);border-radius:7px;background:rgba(70,201,125,.06);display:flex;flex-direction:column;gap:2px}
  .exposure-safety-note strong{font-size:11px;color:var(--good);font-weight:650}
  .exposure-safety-note span{font-size:10.5px;color:var(--muted);line-height:1.4}
`;
document.head.appendChild(exposureSafetyStyle);
setTimeout(injectExposureSafetyNote, 0);
