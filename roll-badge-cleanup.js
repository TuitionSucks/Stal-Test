// Keep only truly maxed artifact-stat badges in Finder result cards.
// Near-max "HIGH" labels were visual noise and are intentionally omitted.

if (typeof statRollLevel === 'function') {
  statRollLevel = function statRollLevelMaxOnly(stat, comparison) {
    if (!stat || ACCUMULATION_STATS.has(stat.key) && Number(stat.value) > 0) return null;
    if (stat.isPositive === false) return null;

    const best = Number(comparison?.get?.(stat.key)?.value || 0);
    const actual = Number(stat.value || 0);
    if (Math.abs(best) < 1e-9) return null;

    const ratio = best < 0
      ? Math.abs(actual) / Math.abs(best)
      : actual / best;

    if (!Number.isFinite(ratio) || ratio <= 0) return null;
    return ratio >= 0.995 ? 'max' : null;
  };
}

// Clean up any Finder cards that may already have rendered before this layer loaded.
document.querySelectorAll('.stat-roll-high').forEach(node => node.remove());
