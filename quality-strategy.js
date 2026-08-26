// Finder quality strategy: search the full selected quality range, or use a
// realistic average-quality representative for every selected rarity.
// Potential remains exact (+0 through +15) in either mode.

let finderQualityStrategy = 'range';

function qualityStrategyTierBounds(index) {
  const band = QUALITY_BANDS[index];
  if (!band) return null;
  const min = Number(band.min);
  // Threshold values belong to the next rarity. Example: Rare = 130-144.
  const max = index < QUALITY_BANDS.length - 1 ? Number(band.max) - 1 : Number(band.max);
  return { ...band, index, min, max };
}

function averageQualityForTier(index) {
  const band = qualityStrategyTierBounds(index);
  if (!band) return null;
  // Finder quality is normally integer-valued, so use the nearest attainable
  // whole-number quality to the mathematical midpoint.
  return Math.round((band.min + band.max) / 2);
}

function averageQualityCandidates(qualityMin, qualityMax) {
  const low = Math.min(Number(qualityMin), Number(qualityMax));
  const high = Math.max(Number(qualityMin), Number(qualityMax));
  const values = [];
  QUALITY_BANDS.forEach((_, index) => {
    const band = qualityStrategyTierBounds(index);
    if (!band || band.max < low || band.min > high) return;
    const average = averageQualityForTier(index);
    if (average >= low - 1e-9 && average <= high + 1e-9) values.push(average);
  });
  return values;
}

function averageQualityLabel(quality) {
  const q = Number(quality);
  const index = QUALITY_BANDS.findIndex((band, i) => {
    const bounds = qualityStrategyTierBounds(i);
    return bounds && q >= bounds.min && q <= bounds.max;
  });
  const band = QUALITY_BANDS[index];
  return band ? `${band.name} ${q}%` : `${q}%`;
}

function buildArtifactVariantsAtQualities(artifact, requirements, qualities, potentialMin, potentialMax, includeAdditionals) {
  const variants = [];
  for (let potential = potentialMin; potential <= potentialMax; potential++) {
    const additionalSets = relevantAdditionalSets(artifact, potential, requirements, includeAdditionals);
    for (const quality of qualities) {
      for (const ids of additionalSets) {
        const selected = new Set(ids);
        const stats = calculateArtifactStats(artifact, quality, potential, selected, currentContainer)
          .filter(stat => !stat.special);
        variants.push({
          artifactId: artifact.id,
          artifactName: artifact.name,
          quality,
          potential,
          additionalIds: ids,
          additionalNames: (artifact.additionalStats || [])
            .filter((stat, index) => selected.has(additionalId(stat, index)))
            .map(stat => stat.name),
          stats,
          cost: variantCost(quality, potential, ids.length),
          vector: variantDirectedVector(stats, requirements)
        });
      }
    }
  }
  return paretoPruneVariants(variants, 8);
}

const coreBuildArtifactVariantsForQualityStrategy = buildArtifactVariants;
buildArtifactVariants = function buildArtifactVariantsWithQualityStrategy(
  artifact,
  requirements,
  qualityMin,
  qualityMax,
  potentialMin,
  potentialMax,
  includeAdditionals
) {
  if (finderQualityStrategy !== 'average') {
    return coreBuildArtifactVariantsForQualityStrategy(
      artifact,
      requirements,
      qualityMin,
      qualityMax,
      potentialMin,
      potentialMax,
      includeAdditionals
    );
  }

  const qualities = averageQualityCandidates(qualityMin, qualityMax);
  if (!qualities.length) qualities.push(Math.round((Number(qualityMin) + Number(qualityMax)) / 2));
  return buildArtifactVariantsAtQualities(
    artifact,
    requirements,
    qualities,
    potentialMin,
    potentialMax,
    includeAdditionals
  );
};

function markQualityStrategyStale() {
  if (typeof clearStaleFinderResults === 'function') {
    clearStaleFinderResults('Quality assumption changed. Run the finder again.');
  } else {
    lastFinderResults = [];
    if (ui.optimizerResults) ui.optimizerResults.innerHTML = '';
    if (ui.resultCount) ui.resultCount.textContent = '0';
  }
}

function updateQualityStrategyUI() {
  const host = document.getElementById('qualityStrategyControls');
  if (!host) return;
  host.querySelectorAll('[data-quality-strategy]').forEach(button => {
    const active = button.dataset.qualityStrategy === finderQualityStrategy;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const summary = document.getElementById('qualityStrategySummary');
  if (!summary) return;
  if (finderQualityStrategy === 'range') {
    summary.innerHTML = '<strong>Full range:</strong> finder can use any quality inside the selected rarity/quality window.';
    return;
  }

  const low = Number(ui.qualityMin?.value || 85);
  const high = Number(ui.qualityMax?.value || 190);
  const values = averageQualityCandidates(low, high);
  summary.innerHTML = `<strong>Average rarity:</strong> ${values.length ? values.map(averageQualityLabel).join(' · ') : 'selected-range midpoint'} only. Potential still searches every selected +0 to +15 level.`;
}

function injectQualityStrategyControls() {
  if (document.getElementById('qualityStrategyControls')) return;
  const rangePanel = ui.qualityMin?.closest('.panel');
  const rangeGrid = ui.qualityMin?.closest('.range-grid');
  if (!rangePanel || !rangeGrid) return;

  const host = document.createElement('div');
  host.id = 'qualityStrategyControls';
  host.className = 'quality-strategy-controls';
  host.innerHTML = `
    <div class="quality-strategy-head">
      <div>
        <strong>Quality assumption</strong>
        <span>Use realistic average rolls when max-quality artifacts are too hard to source.</span>
      </div>
      <div class="quality-strategy-buttons" role="group" aria-label="Finder quality assumption">
        <button type="button" data-quality-strategy="range" class="quality-strategy-button active">Full range</button>
        <button type="button" data-quality-strategy="average" class="quality-strategy-button">Average rarity</button>
      </div>
    </div>
    <p id="qualityStrategySummary" class="quality-strategy-summary"></p>
  `;

  rangeGrid.insertAdjacentElement('beforebegin', host);
  host.addEventListener('click', event => {
    const button = event.target.closest('[data-quality-strategy]');
    if (!button) return;
    finderQualityStrategy = button.dataset.qualityStrategy === 'average' ? 'average' : 'range';
    updateQualityStrategyUI();
    markQualityStrategyStale();
  });

  [ui.qualityMin, ui.qualityMax].forEach(input => input?.addEventListener('change', updateQualityStrategyUI));
  document.getElementById('finderTierFrom')?.addEventListener('change', () => setTimeout(updateQualityStrategyUI, 0));
  document.getElementById('finderTierTo')?.addEventListener('change', () => setTimeout(updateQualityStrategyUI, 0));
  document.getElementById('finderTierControls')?.addEventListener('click', () => setTimeout(updateQualityStrategyUI, 0));

  updateQualityStrategyUI();
}

if (typeof resetFinder === 'function') {
  const coreResetFinderForQualityStrategy = resetFinder;
  resetFinder = function resetFinderWithQualityStrategy() {
    const result = coreResetFinderForQualityStrategy();
    finderQualityStrategy = 'range';
    updateQualityStrategyUI();
    return result;
  };
}

const qualityStrategyStyle = document.createElement('style');
qualityStrategyStyle.textContent = `
  .quality-strategy-controls{display:grid;gap:8px;margin:1px 0 11px;padding:10px;border:1px solid var(--border-soft);border-radius:8px;background:var(--panel-2)}
  .quality-strategy-head{display:grid;gap:8px}.quality-strategy-head>div:first-child{display:grid;gap:2px}.quality-strategy-head strong{font-size:12px;color:var(--text-dim)}.quality-strategy-head span{font-size:11px;color:var(--muted);line-height:1.4}
  .quality-strategy-buttons{display:grid;grid-template-columns:1fr 1fr;gap:5px}.quality-strategy-button{height:34px;border:1px solid var(--border);border-radius:6px;background:#0b1118;color:var(--muted);font-size:11px;font-weight:650;cursor:pointer}.quality-strategy-button.active{border-color:var(--accent-dim);background:var(--accent-soft);color:var(--accent-hi)}
  .quality-strategy-summary{margin:0;color:var(--text-dim);font-size:10.5px;line-height:1.45}.quality-strategy-summary strong{color:var(--accent-hi)}
`;
document.head.appendChild(qualityStrategyStyle);

setTimeout(injectQualityStrategyControls, 0);
