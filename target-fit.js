// Exact-target fit indicator for Finder results.
// Adds a star badge when a recommendation lands on, or very near, the user's requested values.

function userExactRequirementsForFit() {
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

function targetFitTolerance(req) {
  // Keep small-value accumulation / percentage targets reasonably tight while
  // allowing a little room for discrete artifact quality/Potential steps.
  const absolute = Math.abs(Number(req.target) || 0);
  return Math.max(req.stat?.isPercentage ? 0.10 : 0.05, absolute * 0.05);
}

function assessTargetFit(result) {
  const requirements = userExactRequirementsForFit();
  if (!requirements.length || !(result?.totals instanceof Map)) {
    return { kind: null, requirements: 0, exact: 0, near: 0 };
  }

  let exact = 0;
  let near = 0;
  for (const req of requirements) {
    const actual = Number(result.totals.get(req.key)?.value || 0);
    const target = Number(req.target);
    const pass = req.op === '>=' ? actual >= target : actual <= target;
    if (pass) {
      exact += 1;
      near += 1;
      continue;
    }
    const miss = req.op === '>=' ? target - actual : actual - target;
    if (miss <= targetFitTolerance(req)) near += 1;
  }

  if (exact === requirements.length) return { kind: 'hit', requirements: requirements.length, exact, near };
  if (near === requirements.length) return { kind: 'near', requirements: requirements.length, exact, near };
  return { kind: null, requirements: requirements.length, exact, near };
}

function targetFitBadge(info) {
  if (info.kind === 'hit') {
    return '<span class="target-fit-badge hit" title="This build meets every exact target you selected"><span class="target-star">★</span> Target hit</span>';
  }
  if (info.kind === 'near') {
    return '<span class="target-fit-badge near" title="This build is within a small tolerance of every exact target you selected"><span class="target-star">☆</span> Near target</span>';
  }
  return '';
}

const coreRenderFinderResultsForTargetFit = renderFinderResults;
renderFinderResults = function renderFinderResultsWithTargetFit(results) {
  const rendered = coreRenderFinderResultsForTargetFit(results);
  if (typeof finderSearchStyle !== 'undefined' && finderSearchStyle !== 'exact') return rendered;

  [...ui.optimizerResults.querySelectorAll('.result-card')].forEach((card, index) => {
    const info = assessTargetFit(results?.[index]);
    if (!info.kind) return;
    const head = card.querySelector('.result-card-head');
    if (!head || head.querySelector('.target-fit-badge')) return;
    head.insertAdjacentHTML('beforeend', targetFitBadge(info));
  });
  return rendered;
};

const targetFitStyle = document.createElement('style');
targetFitStyle.textContent = `
  .target-fit-badge{display:inline-flex;align-items:center;gap:4px;min-height:22px;padding:3px 7px;border-radius:6px;font:700 9px var(--mono);white-space:nowrap}
  .target-fit-badge.hit{border:1px solid rgba(241,196,90,.48);background:rgba(241,196,90,.10);color:#f1c45a}
  .target-fit-badge.near{border:1px solid rgba(135,170,255,.38);background:rgba(135,170,255,.08);color:#8fb2ff}
  .target-star{font-size:11px;line-height:1}
`;
document.head.appendChild(targetFitStyle);
