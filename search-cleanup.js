// Remove the legacy standalone search inputs after the integrated combobox is active.
// ui-enhancements.js can recreate those inputs when dynamic selectors are rerendered,
// so this cleanup also watches for later inserts and removes them immediately.

function removeRedundantItemSearches() {
  document.querySelectorAll('select.combo-native-select').forEach(select => {
    const parent = select.parentElement;
    if (!parent) return;

    parent.querySelectorAll(':scope > .item-search').forEach(input => input.remove());
  });

  document.querySelectorAll('.item-combobox').forEach(combo => {
    const parent = combo.parentElement;
    if (!parent) return;

    parent.querySelectorAll(':scope > .item-search').forEach(input => input.remove());
  });
}

removeRedundantItemSearches();

const redundantSearchObserver = new MutationObserver(() => removeRedundantItemSearches());
redundantSearchObserver.observe(document.body, { childList: true, subtree: true });
