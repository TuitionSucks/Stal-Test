// Finder diversity correction.
// The original beam search could converge too early on a small handful of strong
// artifacts. Keep the best states, but reserve part of every beam for genuinely
// different artifact compositions so useful alternatives survive long enough to
// reach the final result curation pass.
(function rebalanceFinderDiversity() {
  if (
    typeof buildArtifactVariants !== 'function' ||
    typeof addAutomaticExposureRequirements !== 'function' ||
    typeof stateRank !== 'function' ||
    typeof strictExposurePenalty !== 'function' ||
    typeof bestExposureReducers !== 'function' ||
    typeof strictExposureSafe !== 'function'
  ) return;

  const DIVERSE_BEAM_WIDTH = 360;
  const FINAL_RESERVOIR_LIMIT = 96;

  function diversityStateSignature(state) {
    if (typeof stateSignature === 'function') return stateSignature(state);
    return (state?.picks || []).map(pick => [
      pick.artifactId || pick.artifactName || '',
      Number(pick.quality || 0),
      Number(pick.potential || 0),
      [...(pick.additionalIds || [])].map(String).sort().join(',')
    ].join(':')).join(';');
  }

  function compositionSignatureFromPicks(picks = []) {
    return picks
      .map(pick => String(pick.artifactId || pick.artifactName || ''))
      .sort()
      .join('|');
  }

  function artifactSetFromState(state) {
    return new Set((state?.picks || []).map(pick => String(pick.artifactId || pick.artifactName || '')));
  }

  function jaccardNovelty(a, b) {
    const aSet = artifactSetFromState(a);
    const bSet = artifactSetFromState(b);
    if (!aSet.size && !bSet.size) return 0;
    let overlap = 0;
    aSet.forEach(id => { if (bSet.has(id)) overlap += 1; });
    const union = new Set([...aSet, ...bSet]).size || 1;
    return 1 - (overlap / union);
  }

  function selectDiverseBeam(sortedStates, limit) {
    const chosen = [];
    const chosenSignatures = new Set();
    const compositionCounts = new Map();
    const bestQuota = Math.max(1, Math.round(limit * 0.55));
    const compositionCap = (typeof finderSearchStyle !== 'undefined' && finderSearchStyle === 'exact') ? 5 : 3;

    const add = state => {
      const signature = diversityStateSignature(state);
      if (!signature || chosenSignatures.has(signature)) return false;
      chosenSignatures.add(signature);
      chosen.push(state);
      const composition = compositionSignatureFromPicks(state.picks);
      compositionCounts.set(composition, Number(compositionCounts.get(composition) || 0) + 1);
      return true;
    };

    // First preserve the absolute best portion of the beam with no diversity tax.
    for (const state of sortedStates) {
      add(state);
      if (chosen.length >= bestQuota) break;
    }

    // Then deliberately keep alternate artifact compositions alive.
    for (const state of sortedStates) {
      if (chosen.length >= limit) break;
      const composition = compositionSignatureFromPicks(state.picks);
      if (Number(compositionCounts.get(composition) || 0) >= compositionCap) continue;
      add(state);
    }

    // If the search space is small, fill remaining room with the next best states.
    if (chosen.length < limit) {
      for (const state of sortedStates) {
        if (chosen.length >= limit) break;
        add(state);
      }
    }

    return chosen;
  }

  function makeFinalReservoir(sortedSafeStates) {
    const reservoir = [];
    const signatures = new Set();
    const compositionCounts = new Map();
    const protectedBest = Math.min(18, sortedSafeStates.length);

    const add = state => {
      const signature = diversityStateSignature(state);
      if (!signature || signatures.has(signature)) return false;
      signatures.add(signature);
      reservoir.push(state);
      const composition = compositionSignatureFromPicks(state.picks);
      compositionCounts.set(composition, Number(compositionCounts.get(composition) || 0) + 1);
      return true;
    };

    // Never sacrifice the actual top-ranked answers.
    for (let i = 0; i < protectedBest; i++) add(sortedSafeStates[i]);

    // Add one or two representatives of many other compositions instead of
    // returning 20 tiny roll variations of the same few artifacts.
    for (const state of sortedSafeStates) {
      if (reservoir.length >= FINAL_RESERVOIR_LIMIT) break;
      const composition = compositionSignatureFromPicks(state.picks);
      if (Number(compositionCounts.get(composition) || 0) >= 2) continue;
      add(state);
    }

    // Favor states that introduce artifact IDs not already overrepresented.
    if (reservoir.length < FINAL_RESERVOIR_LIMIT) {
      const anchors = reservoir.slice(0, Math.min(12, reservoir.length));
      const remaining = sortedSafeStates.filter(state => !signatures.has(diversityStateSignature(state)));
      remaining.sort((a, b) => {
        const aNovelty = anchors.length ? Math.min(...anchors.map(anchor => jaccardNovelty(a, anchor))) : 1;
        const bNovelty = anchors.length ? Math.min(...anchors.map(anchor => jaccardNovelty(b, anchor))) : 1;
        if (Math.abs(aNovelty - bNovelty) > 1e-9) return bNovelty - aNovelty;
        return 0;
      });
      for (const state of remaining) {
        if (reservoir.length >= FINAL_RESERVOIR_LIMIT) break;
        add(state);
      }
    }

    return reservoir;
  }

  // This replaces the already safety-aware search, preserving the same safety
  // rules and scoring while changing only how aggressively the beam collapses.
  runBeamSearch = function runDiversityAwareSafeBeamSearch(
    requirements,
    pool,
    qualityMin,
    qualityMax,
    potentialMin,
    potentialMax,
    includeAdditionals
  ) {
    if (typeof finderSafetyRejectedAll !== 'undefined') finderSafetyRejectedAll = false;
    const safeRequirements = addAutomaticExposureRequirements(requirements || []);

    const relevantPool = (pool || []).filter(artifact => {
      const keys = new Set([...(artifact.stats || []), ...(artifact.additionalStats || [])].map(stat => stat.key));
      return safeRequirements.some(req => keys.has(req.key));
    });
    const searchPool = relevantPool.length ? relevantPool : (pool || []);

    const variantsByArtifact = searchPool.map(artifact => buildArtifactVariants(
      artifact,
      safeRequirements,
      qualityMin,
      qualityMax,
      potentialMin,
      potentialMax,
      includeAdditionals
    ));

    const exposureAdjusters = bestExposureReducers(variantsByArtifact);
    const baseTotals = statsArrayToMap(calculateContainerStats(currentContainer));
    const capacity = Number(currentContainer?.capacity || 0);
    let beam = [{ picks: [], totals: baseTotals, cost: 0, minArtifactIndex: 0 }];

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
            candidate.__diversityRank = stateRank(candidate, safeRequirements)
              + strictExposurePenalty(candidate.totals, remainingSlots, exposureAdjusters);
            next.push(candidate);
          }
        }
      }

      next.sort((a, b) => a.__diversityRank - b.__diversityRank);
      beam = selectDiverseBeam(next, DIVERSE_BEAM_WIDTH);
      if (!beam.length) break;
    }

    const finished = beam.map(state => ({
      ...state,
      evaluation: evaluateRequirements(state.totals, safeRequirements)
    }));
    const safe = finished.filter(state => strictExposureSafe(state.totals));
    if (typeof finderSafetyRejectedAll !== 'undefined') {
      finderSafetyRejectedAll = finished.length > 0 && safe.length === 0;
    }

    const sortedSafe = safe.sort((a, b) => {
      if (a.evaluation.matched !== b.evaluation.matched) return a.evaluation.matched ? -1 : 1;
      if (
        typeof finderSearchStyle !== 'undefined' &&
        finderSearchStyle === 'exact' &&
        typeof mixedExactClosenessFromTotals === 'function'
      ) {
        const close = mixedExactClosenessFromTotals(a.totals, safeRequirements)
          - mixedExactClosenessFromTotals(b.totals, safeRequirements);
        if (Math.abs(close) > 1e-9) return close;
      }
      if (a.evaluation.deficit !== b.evaluation.deficit) return a.evaluation.deficit - b.evaluation.deficit;
      return Number(a.cost || 0) - Number(b.cost || 0);
    });

    const reservoir = makeFinalReservoir(sortedSafe);
    return typeof curateFinderResults === 'function'
      ? curateFinderResults(reservoir)
      : reservoir.slice(0, 5);
  };

  // Make the final five cards lean harder toward genuinely different artifact
  // sets when similarly useful options are available.
  if (typeof selectVariedAlternatives === 'function' && typeof alternativeUsefulnessScore === 'function') {
    selectVariedAlternatives = function selectMoreVariedAlternatives(candidates, primary, slots) {
      const remaining = [...(candidates || [])];
      const chosen = [];

      while (remaining.length && chosen.length < slots) {
        remaining.sort((a, b) => {
          const aNovelty = minimumNovelty(a, [primary, ...chosen]);
          const bNovelty = minimumNovelty(b, [primary, ...chosen]);
          const aScore = alternativeUsefulnessScore(a, primary, chosen) + (aNovelty * 1.8);
          const bScore = alternativeUsefulnessScore(b, primary, chosen) + (bNovelty * 1.8);
          return bScore - aScore
            || Number(a?.evaluation?.deficit || 0) - Number(b?.evaluation?.deficit || 0)
            || Number(a?.cost || 0) - Number(b?.cost || 0);
        });

        // Prefer an option that changes at least roughly a quarter of the unique
        // artifact set, but only when such an alternative survived the optimizer.
        const novelIndex = remaining.findIndex(candidate =>
          minimumNovelty(candidate, [primary, ...chosen]) >= 0.24
        );
        chosen.push(remaining.splice(novelIndex >= 0 ? novelIndex : 0, 1)[0]);
      }

      return chosen;
    };
  }
})();
