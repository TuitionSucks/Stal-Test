// Apply rank/quality colors anywhere an item name is displayed, not only inside selects.

const previousRenderLoadoutForColors = renderLoadoutSlots;
renderLoadoutSlots = function renderLoadoutSlotsWithItemColors() {
  previousRenderLoadoutForColors();
  [...ui.loadoutSlots.querySelectorAll('.artifact-slot')].forEach((card, index) => {
    const slot = loadout[index];
    const title = card.querySelector('.slot-topline h3');
    if (title && slot?.artifactId) title.style.color = qualityColor(slot.quality);
  });
};

const previousRenderFinderForColors = renderFinderResults;
renderFinderResults = function renderFinderResultsWithItemColors(results) {
  previousRenderFinderForColors(results);
  [...ui.optimizerResults.querySelectorAll('.result-card')].forEach((card, resultIndex) => {
    const result = results[resultIndex];
    [...card.querySelectorAll('.result-artifact strong')].forEach((name, pickIndex) => {
      const pick = result?.picks?.[pickIndex];
      if (pick) name.style.color = qualityColor(pick.quality);
    });
  });
};

const previousRenderArmorMetaForColors = renderArmorMeta;
renderArmorMeta = function renderArmorMetaWithRankColor() {
  previousRenderArmorMetaForColors();
  if (ui.armorRank) ui.armorRank.style.color = itemColor(currentArmor?.rank);
  if (ui.armorSelect) ui.armorSelect.style.color = itemColor(currentArmor?.rank);
};
