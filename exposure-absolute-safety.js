// Final exposure safety correction.
// Every accumulation must stay inside the safe window, not merely below +0.50.
// A build with Temperature -1.53 is therefore unsafe just like +1.53 would be.

function absoluteExposureSafeValue(value) {
  return Math.abs(Number(value) || 0) <= STRICT_EXPOSURE_LIMIT + 1e-9;
}

strictExposureSafe = function strictExposureSafeAbsolute(totals) {
  return AUTO_EXPOSURE_KEYS.every(key => absoluteExposureSafeValue(strictExposureValue(totals, key)));
};

// Track both directions so the beam can rescue either a positive or negative
// over-cap partial build with later artifacts.
bestExposureReducers = function bestExposureAdjusters(variantsByArtifact) {
  const adjusters = new Map(AUTO_EXPOSURE_KEYS.map(key => [key, { min: 0, max: 0 }]));
  for (const variants of variantsByArtifact || []) {
    for (const variant of variants || []) {
      const map = statsArrayToMap(variant.stats || []);
      for (const key of AUTO_EXPOSURE_KEYS) {
        const value = Number(map.get(key)?.value || 0);
        const current = adjusters.get(key) || { min: 0, max: 0 };
        if (value < current.min) current.min = value;
        if (value > current.max) current.max = value;
        adjusters.set(key, current);
      }
    }
  }
  return adjusters;
};

strictExposurePenalty = function strictExposurePenaltyAbsolute(totals, remainingSlots, adjustersByKey) {
  let penalty = 0;
  for (const key of AUTO_EXPOSURE_KEYS) {
    const actual = strictExposureValue(totals, key);
    const adjuster = adjustersByKey?.get?.(key) || { min: 0, max: 0 };
    const minPerSlot = Number(adjuster.min || 0);
    const maxPerSlot = Number(adjuster.max || 0);
    const reachableMin = actual + (remainingSlots * minPerSlot);
    const reachableMax = actual + (remainingSlots * maxPerSlot);

    // If every reachable finish is still outside the safe window, heavily prune it.
    if (reachableMin > STRICT_EXPOSURE_LIMIT) {
      penalty += 1e9 + ((reachableMin - STRICT_EXPOSURE_LIMIT) * 1e7);
      continue;
    }
    if (reachableMax < -STRICT_EXPOSURE_LIMIT) {
      penalty += 1e9 + ((-STRICT_EXPOSURE_LIMIT - reachableMax) * 1e7);
      continue;
    }

    // Recoverable partial states are allowed, but balanced states are preferred.
    const excess = Math.max(0, Math.abs(actual) - STRICT_EXPOSURE_LIMIT);
    penalty += excess * 500;
  }
  return penalty;
};

function unsafeExposureItems(result) {
  return strictExposureSnapshot(result?.totals)
    .filter(item => !absoluteExposureSafeValue(item.value));
}

buildExposureStatusHtml = function buildExposureStatusHtmlAbsolute(result) {
  const snapshot = strictExposureSnapshot(result?.totals);
  const unsafe = snapshot.filter(item => !absoluteExposureSafeValue(item.value));

  if (unsafe.length) {
    return `<div class="build-exposure-flaw" role="alert">
      <div class="build-flaw-title">⚠ BUILD FLAW — UNSAFE EXPOSURE</div>
      <div class="build-flaw-copy">This build can damage the player. Every exposure must remain between -0.49 and +0.49.</div>
      <div class="build-flaw-values">${unsafe.map(item => `<span>${escapeHtml(item.name)} <b>${formatValue(item.value, false)}</b></span>`).join('')}</div>
    </div>`;
  }

  if (!snapshot.length) {
    return '<div class="build-exposure-safe"><strong>✓ Exposure safe</strong><span>All net exposure values are within ±0.49.</span></div>';
  }

  return `<div class="build-exposure-safe"><strong>✓ Exposure safe</strong><div>${snapshot.map(item =>
    `<span class="exposure-chip ${item.value >= 0 ? 'positive-exposure' : 'negative-exposure'}">${escapeHtml(item.name)} ${formatValue(item.value, false)}</span>`
  ).join('')}</div></div>`;
};

const renderFinderBeforeAbsoluteExposureWarning = renderFinderResults;
renderFinderResults = function renderFinderWithAbsoluteExposureWarning(results) {
  const rendered = renderFinderBeforeAbsoluteExposureWarning(results);
  const cards = [...(ui.optimizerResults?.querySelectorAll('.result-card') || [])];

  cards.forEach((card, index) => {
    const result = results?.[index];
    const unsafe = result ? unsafeExposureItems(result) : [];
    if (!unsafe.length) return;

    card.classList.add('unsafe-result-card');
    const badge = card.querySelector('.match-badge');
    if (badge) {
      badge.textContent = '⚠ Unsafe exposure';
      badge.classList.add('unsafe-match-badge');
    }
    if (!card.querySelector('.build-exposure-flaw')) {
      const artifactsArea = card.querySelector('.result-artifacts');
      artifactsArea?.insertAdjacentHTML('afterend', buildExposureStatusHtml(result));
    }
  });

  if (!results?.length && typeof finderSafetyRejectedAll !== 'undefined' && finderSafetyRejectedAll) {
    if (ui.optimizerResults && !ui.optimizerResults.querySelector('.no-safe-build-warning')) {
      ui.optimizerResults.innerHTML = `<div class="no-safe-build-warning" role="alert">
        <div class="build-flaw-title">⚠ NO SAFE BUILD FOUND</div>
        <div class="build-flaw-copy">Every candidate in this search range exceeded the ±0.49 exposure limit somewhere. Broaden the quality/tier/Potential range or change priorities so the finder can add balancing artifacts.</div>
      </div>`;
    }
    if (ui.finderEmpty) ui.finderEmpty.hidden = true;
  }

  return rendered;
};

function refreshExposureSafetyCopy() {
  const note = document.getElementById('exposureSafetyNote');
  if (note) {
    note.innerHTML = '<strong>Automatic exposure balancing</strong><span>Radiation, bio, psy, temperature, frost, bleeding, and burning must all stay between -0.49 and +0.49 net accumulation.</span>';
  }
  const summary = document.getElementById('searchSummary');
  if (summary && summary.textContent.includes('below +0.50')) {
    summary.textContent = summary.textContent.replaceAll('below +0.50', 'inside ±0.49');
  }
}

const absoluteExposureStyle = document.createElement('style');
absoluteExposureStyle.textContent = `
  .build-exposure-flaw,.no-safe-build-warning{margin:11px 0 4px;padding:12px 13px;border:2px solid #ef555d;border-radius:8px;background:rgba(239,85,93,.12);box-shadow:0 0 0 1px rgba(239,85,93,.12),0 0 20px rgba(239,85,93,.08)}
  .build-flaw-title{font:900 12px var(--mono);letter-spacing:.05em;color:#ff6b72;text-transform:uppercase}
  .build-flaw-copy{margin-top:5px;color:#f1c7c9;font-size:11px;line-height:1.45}
  .build-flaw-values{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.build-flaw-values span{padding:4px 7px;border:1px solid rgba(239,85,93,.34);border-radius:5px;background:rgba(0,0,0,.18);color:#e9b1b4;font:9px var(--mono)}.build-flaw-values b{color:#ff6b72}
  .unsafe-result-card{border-color:#ef555d!important;box-shadow:inset 0 0 0 1px rgba(239,85,93,.18)}
  .unsafe-match-badge{background:rgba(239,85,93,.12)!important;border-color:rgba(239,85,93,.45)!important;color:#ff6b72!important}
  .no-safe-build-warning{margin:10px 0 0;padding:16px}
`;
document.head.appendChild(absoluteExposureStyle);
setTimeout(refreshExposureSafetyCopy, 0);
