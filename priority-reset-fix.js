// Ensure the Reset button always uses the latest priority-aware reset handler.
(function installPriorityAwareResetButton(){
  const oldButton = ui.resetFinder;
  if (!oldButton) return;
  const freshButton = oldButton.cloneNode(true);
  oldButton.replaceWith(freshButton);
  ui.resetFinder = freshButton;
  freshButton.addEventListener('click', () => resetFinder());
})();
