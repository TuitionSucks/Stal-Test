// Small visual cleanup for Finder/loadout results.
// Keep HIGH-roll hints, remove MAX-roll clutter, and color displayed numbers
// by their literal sign: positive = green, negative = red.

function signedNumberClass(text) {
  const value = String(text || '').trim();
  if (value.startsWith('+')) return 'signed-positive';
  if (value.startsWith('-')) return 'signed-negative';
  return 'signed-neutral';
}

function applySignedClass(element) {
  if (!element) return;
  element.classList.remove('signed-positive', 'signed-negative', 'signed-neutral');
  element.classList.add(signedNumberClass(element.textContent));
}

function cleanFinderBuildVisuals() {
  // Remove both the old quality MAX ROLL badge and the newer per-stat MAX tag.
  document.querySelectorAll('.max-roll-badge, .stat-roll-max').forEach(node => node.remove());
  document.querySelectorAll('.max-roll-artifact').forEach(node => node.classList.remove('max-roll-artifact'));

  // Per-artifact calculated outcomes.
  document.querySelectorAll('.artifact-outcome-stat > b').forEach(applySignedClass);

  // Priority-mode result values shown under the artifact cards.
  document.querySelectorAll('.priority-result-stat > em').forEach(applySignedClass);

  // Manual loadout / Final Stats values.
  document.querySelectorAll('#buildStats .build-stat > b, #totalStatsBody .total-stat-row > b').forEach(applySignedClass);

  // Exposure summary chips keep their safety box, but the number itself follows
  // the same sign-color convention by coloring the whole compact chip.
  document.querySelectorAll('.exposure-chip').forEach(chip => {
    const match = chip.textContent.match(/([+-]\d+(?:\.\d+)?)/);
    chip.classList.remove('signed-positive', 'signed-negative', 'signed-neutral');
    chip.classList.add(match ? signedNumberClass(match[1]) : 'signed-neutral');
  });
}

if (typeof renderFinderResults === 'function') {
  const previousRenderFinderForVisualCleanup = renderFinderResults;
  renderFinderResults = function renderFinderWithVisualCleanup(results) {
    const rendered = previousRenderFinderForVisualCleanup(results);
    cleanFinderBuildVisuals();
    return rendered;
  };
}

if (typeof renderManualBuild === 'function') {
  const previousRenderManualForVisualCleanup = renderManualBuild;
  renderManualBuild = function renderManualWithVisualCleanup(...args) {
    const rendered = previousRenderManualForVisualCleanup(...args);
    cleanFinderBuildVisuals();
    return rendered;
  };
}

if (typeof renderTotalStatsSheet === 'function') {
  const previousRenderTotalsForVisualCleanup = renderTotalStatsSheet;
  renderTotalStatsSheet = function renderTotalsWithVisualCleanup(...args) {
    const rendered = previousRenderTotalsForVisualCleanup(...args);
    cleanFinderBuildVisuals();
    return rendered;
  };
}

const finderVisualCleanupStyle = document.createElement('style');
finderVisualCleanupStyle.textContent = `
  .signed-positive{color:var(--good)!important}
  .signed-negative{color:var(--bad)!important}
  .signed-neutral{color:var(--text-dim)!important}
  .stat-roll-max,.max-roll-badge{display:none!important}
`;
document.head.appendChild(finderVisualCleanupStyle);

setTimeout(cleanFinderBuildVisuals, 0);
