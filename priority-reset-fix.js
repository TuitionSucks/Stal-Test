// Ensure the Reset button always uses the latest priority-aware reset handler.
(function installPriorityAwareResetButton(){
  const oldButton = ui.resetFinder;
  if (!oldButton) return;
  const freshButton = oldButton.cloneNode(true);
  oldButton.replaceWith(freshButton);
  ui.resetFinder = freshButton;
  freshButton.addEventListener('click', () => resetFinder());
})();

// Finder extras are loaded here so they can wrap the fully assembled calculator
// after requirements, armor, pricing, exposure safety, priorities, and target-fit.
(function loadFinderTierAndRollExtras(){
  if (document.querySelector('script[data-finder-tier-rolls]')) return;
  const script = document.createElement('script');
  script.src = 'finder-tier-and-rolls.js';
  script.dataset.finderTierRolls = 'true';
  document.body.appendChild(script);
})();
