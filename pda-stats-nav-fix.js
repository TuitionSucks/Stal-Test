// Navigation fix for the PDA STATS focus view.
// Keeps the SEARCH / LOADOUT / STATS tab strip visible and adds an explicit
// return control so the focused stats sheet can never trap the user.
(function fixPdaStatsNavigation() {
  const finderMode = document.getElementById('finderModeBtn');
  const loadoutMode = document.getElementById('loadoutModeBtn');
  const statsMode = document.getElementById('pdaStatsModeBtn');
  const loadoutResults = document.getElementById('loadoutResults');
  if (!finderMode || !loadoutMode || !statsMode || !loadoutResults) return;

  function ensureReturnButton() {
    const heading = loadoutResults.querySelector('.results-heading');
    if (!heading) return null;
    let button = heading.querySelector('.pda-stats-return');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'pda-stats-return';
      button.innerHTML = '<span aria-hidden="true">←</span> RETURN TO LOADOUT';
      button.addEventListener('click', () => loadoutMode.click());
      heading.appendChild(button);
    }
    return button;
  }

  const returnButton = ensureReturnButton();

  function syncStatsNavigation() {
    const inStats = document.body.classList.contains('pda-stats-focus');
    if (returnButton) returnButton.hidden = !inStats;
  }

  finderMode.addEventListener('click', syncStatsNavigation);
  loadoutMode.addEventListener('click', syncStatsNavigation);
  statsMode.addEventListener('click', () => window.setTimeout(syncStatsNavigation, 0));

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !document.body.classList.contains('pda-stats-focus')) return;
    const target = event.target;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    loadoutMode.click();
  });

  const observer = new MutationObserver(syncStatsNavigation);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  syncStatsNavigation();

  const style = document.createElement('style');
  style.id = 'pdaStatsNavFixStyles';
  style.textContent = `
    /* STATS used to hide the entire left column, including the only way out.
       Keep the PDA console/tab strip visible while hiding the editing panels. */
    .pda-stats-focus .controls-column{display:block!important;width:100%!important;max-width:none!important}
    .pda-stats-focus .controls-column>:not(.console){display:none!important}
    .pda-stats-focus .console{
      position:sticky!important;top:10px!important;z-index:45!important;
      width:100%!important;margin:0 0 12px!important;
    }
    .pda-stats-focus .console-actions{display:none!important}
    .pda-stats-focus .grid{grid-template-columns:minmax(0,1fr)!important}

    .pda-stats-return{
      display:inline-flex;align-items:center;justify-content:center;gap:7px;
      min-height:30px;padding:0 10px;margin-left:auto;
      border:1px solid #586445;border-radius:1px;
      background:linear-gradient(180deg,#192016,#0f150d);
      color:#b6c47d;font:800 8.5px var(--mono);letter-spacing:.08em;text-transform:uppercase;
      box-shadow:2px 3px 0 rgba(0,0,0,.22);
      cursor:pointer;
    }
    .pda-stats-return:hover{border-color:#87975d;color:#d1dc94;background:#1c2518}
    .pda-stats-return:focus-visible{outline:1px solid var(--accent);outline-offset:2px}
    .pda-stats-return[hidden]{display:none!important}

    @media(max-width:980px){
      .pda-stats-focus .controls-column{display:block!important}
      .pda-stats-focus .console{position:static!important}
    }
    @media(max-width:640px){
      .pda-stats-return{width:100%;margin:8px 0 0}
      .pda-stats-focus .results-heading{flex-wrap:wrap}
    }
  `;
  document.head.appendChild(style);
})();
