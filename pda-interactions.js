// Functional Zone-PDA flavor: reactive exposure telemetry, PDA mode tabs,
// scanned artifact records, active-loadout treatment, and a Finder scan sequence.
// Calculator math/search rules are not changed here.
(function addPdaInteractions() {
  const finderButton = ui?.findBuilds;
  const finderMode = ui?.finderModeBtn;
  const loadoutMode = ui?.loadoutModeBtn;
  const modeToggle = finderMode?.closest('.mode-toggle');
  const resultsRoot = ui?.optimizerResults;
  if (!finderButton || !finderMode || !loadoutMode || !modeToggle || !resultsRoot) return;

  let pdaScanBusy = false;
  let scanTimer = null;
  let activeBuildSignature = '';
  let latestTelemetryTotals = null;

  const exposureNames = new Map([
    [typeof RADIATION !== 'undefined' ? RADIATION : 'radiation', 'RAD'],
    [typeof BIOLOGICAL !== 'undefined' ? BIOLOGICAL : 'biological', 'BIO'],
    [typeof PSYCHO !== 'undefined' ? PSYCHO : 'psycho', 'PSY'],
    [typeof THERMAL !== 'undefined' ? THERMAL : 'thermal', 'TEMP'],
    [typeof FROST !== 'undefined' ? FROST : 'frost', 'FROST'],
    [typeof BLEEDING !== 'undefined' ? BLEEDING : 'bleeding', 'BLEED'],
    [typeof BURNING !== 'undefined' ? BURNING : 'burning', 'BURN']
  ]);

  function exposureKeys() {
    if (typeof AUTO_EXPOSURE_KEYS !== 'undefined' && Array.isArray(AUTO_EXPOSURE_KEYS)) return AUTO_EXPOSURE_KEYS;
    return [...exposureNames.keys()];
  }

  function totalsMap(value) {
    if (value instanceof Map) return value;
    if (Array.isArray(value) && typeof statsArrayToMap === 'function') return statsArrayToMap(value);
    return new Map();
  }

  function exposureState(totalsLike) {
    const totals = totalsMap(totalsLike);
    const values = exposureKeys().map(key => ({
      key,
      label: exposureNames.get(key) || (typeof AUTO_EXPOSURE_FALLBACK_NAMES !== 'undefined' ? AUTO_EXPOSURE_FALLBACK_NAMES.get(key) : '') || 'ENV',
      value: Number(totals.get(key)?.value || 0)
    }));
    const worst = values.reduce((best, item) => Math.abs(item.value) > Math.abs(best.value) ? item : best, { label: 'ENV', value: 0 });
    const unsafe = values.filter(item => Math.abs(item.value) > 0.49 + 1e-9);
    const elevated = !unsafe.length && Math.abs(worst.value) >= 0.35;
    return { values, worst, unsafe, elevated };
  }

  function ensureEnvironmentReadout() {
    const right = document.querySelector('.pda-statusbar .pda-status-right');
    if (!right) return null;
    let block = right.querySelector('.pda-env-readout');
    if (!block) {
      block = document.createElement('span');
      block.className = 'pda-env-readout pda-telemetry';
      block.innerHTML = '<b>ENV LOAD</b><i id="pdaEnvState">STANDBY</i><em id="pdaEnvDetail">NO BUILD</em>';
      right.prepend(block);
    }
    return block;
  }

  function updateFieldDosimeter(state) {
    const fieldStrip = document.querySelector('.pda-field-strip');
    if (!fieldStrip) return;
    const dosimeter = [...fieldStrip.children].find(node => node.textContent?.toUpperCase().includes('DOSIMETER'));
    if (!dosimeter) return;
    if (state.unsafe.length) {
      dosimeter.innerHTML = `<b>DOSIMETER</b> <i class="pda-danger-text">ALERT ${escapeHtml(state.unsafe.map(item => item.label).join('/'))}</i>`;
    } else if (state.elevated) {
      dosimeter.innerHTML = `<b>DOSIMETER</b> <i class="pda-warning-text">ELEVATED ${escapeHtml(state.worst.label)} ${Math.abs(state.worst.value).toFixed(2)}</i>`;
    } else {
      dosimeter.innerHTML = '<b>DOSIMETER</b> <i class="pda-stable-text">STABLE</i>';
    }
  }

  function updateExposureTelemetry(totalsLike) {
    latestTelemetryTotals = totalsLike || latestTelemetryTotals;
    const block = ensureEnvironmentReadout();
    if (!block || !latestTelemetryTotals) return;
    const state = exposureState(latestTelemetryTotals);
    const label = block.querySelector('#pdaEnvState');
    const detail = block.querySelector('#pdaEnvDetail');
    block.classList.remove('env-stable', 'env-elevated', 'env-danger');

    if (state.unsafe.length) {
      block.classList.add('env-danger');
      if (label) label.textContent = 'EXPOSURE ALERT';
      if (detail) detail.textContent = state.unsafe.map(item => `${item.label} ${item.value >= 0 ? '+' : ''}${item.value.toFixed(2)}`).join(' // ');
    } else if (state.elevated) {
      block.classList.add('env-elevated');
      if (label) label.textContent = 'ELEVATED';
      if (detail) detail.textContent = `${state.worst.label} ${state.worst.value >= 0 ? '+' : ''}${state.worst.value.toFixed(2)} // LIMIT ±0.49`;
    } else {
      block.classList.add('env-stable');
      if (label) label.textContent = 'STABLE';
      if (detail) detail.textContent = `MAX ${state.worst.label} ${state.worst.value >= 0 ? '+' : ''}${state.worst.value.toFixed(2)} // LIMIT ±0.49`;
    }
    updateFieldDosimeter(state);
  }

  // Turn the existing mode switch into functional PDA tabs. STATS is a focused
  // readout view of the manual loadout totals rather than a dead decorative tab.
  finderMode.textContent = 'SEARCH';
  loadoutMode.textContent = 'LOADOUT';
  finderButton.textContent = 'SCAN ARTIFACTS';

  let statsMode = document.getElementById('pdaStatsModeBtn');
  if (!statsMode) {
    statsMode = document.createElement('button');
    statsMode.id = 'pdaStatsModeBtn';
    statsMode.className = 'mode-toggle-btn pda-stats-tab';
    statsMode.type = 'button';
    statsMode.setAttribute('role', 'tab');
    statsMode.setAttribute('aria-selected', 'false');
    statsMode.textContent = 'STATS';
    modeToggle.appendChild(statsMode);
  }

  function leaveStatsFocus() {
    document.body.classList.remove('pda-stats-focus');
    statsMode.classList.remove('active');
    statsMode.setAttribute('aria-selected', 'false');
  }

  finderMode.addEventListener('click', leaveStatsFocus);
  loadoutMode.addEventListener('click', leaveStatsFocus);
  statsMode.addEventListener('click', () => {
    loadoutMode.click();
    document.body.classList.add('pda-stats-focus');
    finderMode.classList.remove('active');
    loadoutMode.classList.remove('active');
    finderMode.setAttribute('aria-selected', 'false');
    loadoutMode.setAttribute('aria-selected', 'false');
    statsMode.classList.add('active');
    statsMode.setAttribute('aria-selected', 'true');
    if (ui.loadoutControls) ui.loadoutControls.hidden = true;
    try {
      updateExposureTelemetry(statsArrayToMap(sumManualBuildStats()));
    } catch {}
    window.setTimeout(() => ui.loadoutResults?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  });

  function localBuildSignature(result) {
    if (typeof exactBuildSignature === 'function') {
      try { return exactBuildSignature(result); } catch {}
    }
    return (result?.picks || []).map(pick => [
      pick.artifactId || pick.artifactName || '',
      Number(pick.quality || 0),
      Number(pick.potential || 0),
      [...(pick.additionalIds || [])].map(String).sort().join(',')
    ].join(':')).sort().join('|');
  }

  function decorateScannedArtifact(artifactCard, pick, slotIndex) {
    if (!artifactCard || !pick) return;
    artifactCard.classList.add('pda-scanned-record');
    artifactCard.querySelector('.pda-scan-meta')?.remove();
    const rarity = typeof qualityBand === 'function' ? qualityBand(Number(pick.quality || 0))?.name : '';
    const unlocked = typeof unlockedSlots === 'function' ? unlockedSlots(Number(pick.potential || 0)) : 0;
    const selected = Array.isArray(pick.additionalIds) ? pick.additionalIds.length : (pick.additionalIds?.size || 0);
    const meta = document.createElement('div');
    meta.className = 'pda-scan-meta';
    meta.innerHTML = `
      <span>REC ${String(slotIndex + 1).padStart(2, '0')}</span>
      <span>Q ${Math.round(Number(pick.quality || 0))}%</span>
      <span>POT +${Number(pick.potential || 0)}</span>
      ${rarity ? `<span>${escapeHtml(String(rarity).toUpperCase())}</span>` : ''}
      <span>AUX ${selected}/${unlocked}</span>`;
    const outcome = artifactCard.querySelector('.artifact-outcome-stats');
    if (outcome) outcome.insertAdjacentElement('beforebegin', meta);
    else artifactCard.appendChild(meta);
  }

  function clearActiveCardStamps() {
    [...resultsRoot.querySelectorAll('.result-card')].forEach(card => {
      card.classList.remove('pda-active-loadout');
      card.querySelector('.pda-active-stamp')?.remove();
    });
  }

  function markActiveCard(card) {
    if (!card) return;
    clearActiveCardStamps();
    card.classList.add('pda-active-loadout');
    const head = card.querySelector('.result-card-head');
    if (head && !head.querySelector('.pda-active-stamp')) {
      const stamp = document.createElement('span');
      stamp.className = 'pda-active-stamp';
      stamp.textContent = 'ACTIVE LOADOUT';
      head.appendChild(stamp);
    }
  }

  function decorateResultCards(results = []) {
    const cards = [...resultsRoot.querySelectorAll('.result-card')];
    cards.forEach((card, index) => {
      const result = results[index];
      if (!result) return;
      card.dataset.pdaResultIndex = String(index);
      card.querySelectorAll('.result-artifact').forEach((artifactCard, pickIndex) => {
        decorateScannedArtifact(artifactCard, result.picks?.[pickIndex], pickIndex);
      });
      if (activeBuildSignature && localBuildSignature(result) === activeBuildSignature) markActiveCard(card);
    });
  }

  // Wrap the final renderer after all prior calculator extensions are loaded.
  if (typeof renderFinderResults === 'function') {
    const corePdaRenderFinderResults = renderFinderResults;
    renderFinderResults = function renderFinderResultsWithPdaReadouts(results = []) {
      const rendered = corePdaRenderFinderResults(results);
      decorateResultCards(results);
      if (results[0]?.totals) updateExposureTelemetry(results[0].totals);
      return rendered;
    };
  }

  // Selecting a Finder recommendation records it as the active PDA dossier.
  resultsRoot.addEventListener('click', event => {
    const button = event.target.closest('[data-use-build]');
    if (!button) return;
    const index = Number(button.dataset.useBuild);
    const result = (typeof lastFinderResults !== 'undefined' ? lastFinderResults?.[index] : null);
    if (result) {
      activeBuildSignature = localBuildSignature(result);
      updateExposureTelemetry(result.totals);
    }
    markActiveCard(button.closest('.result-card'));
  }, true);

  // Keep manual Loadout/Stats telemetry tied to the actual current build.
  function refreshManualTelemetrySoon() {
    window.setTimeout(() => {
      try {
        if (!ui.loadoutResults?.hidden || document.body.classList.contains('pda-stats-focus')) {
          updateExposureTelemetry(statsArrayToMap(sumManualBuildStats()));
        }
      } catch {}
    }, 0);
  }
  document.addEventListener('change', refreshManualTelemetrySoon, true);
  document.addEventListener('input', event => {
    if (event.target.closest('#loadoutControls')) refreshManualTelemetrySoon();
  }, true);

  // PDA scan sequence. The capture listener suppresses the old direct click handler,
  // paints the scan UI first, then invokes the exact same Finder function.
  const corePdaFindBuilds = typeof findBuilds === 'function' ? findBuilds : null;
  const scanMessages = [
    ['WAKE', 'Opening local artifact archive…'],
    ['INDEX', 'Indexing eligible artifacts and exact rolls…'],
    ['GEAR', 'Reading armor and container telemetry…'],
    ['BALANCE', 'Balancing exposure inside ±0.49…'],
    ['SOLVE', 'Evaluating target fit and alternate side stats…']
  ];

  function scanPanel() {
    const panel = ui.finderResults?.querySelector('.results-panel');
    if (!panel) return null;
    let log = panel.querySelector('.pda-scan-console');
    if (!log) {
      log = document.createElement('div');
      log.className = 'pda-scan-console';
      log.hidden = true;
      log.innerHTML = '<div class="pda-scan-head"><span>ARTIFACT SCAN</span><b>PROCESSING</b></div><div class="pda-scan-lines"></div>';
      ui.searchProgress?.insertAdjacentElement('afterend', log);
    }
    return log;
  }

  function setScanStep(step) {
    const log = scanPanel();
    if (!log) return;
    const lines = log.querySelector('.pda-scan-lines');
    const visible = scanMessages.slice(0, step + 1);
    lines.innerHTML = visible.map((entry, index) => `<div class="${index === step ? 'current' : 'done'}"><b>${escapeHtml(entry[0])}</b><span>${escapeHtml(entry[1])}</span><i>${index === step ? '...' : 'OK'}</i></div>`).join('');
    const current = visible[visible.length - 1];
    if (ui.searchSummary && current) ui.searchSummary.textContent = `[${current[0]}] ${current[1]}`;
  }

  function stopScanUi() {
    if (scanTimer) window.clearInterval(scanTimer);
    scanTimer = null;
    pdaScanBusy = false;
    document.body.classList.remove('pda-searching');
    const log = scanPanel();
    if (log) log.hidden = true;
    finderButton.disabled = false;
  }

  async function executePdaScan() {
    if (!corePdaFindBuilds) return;
    const log = scanPanel();
    if (log) log.hidden = false;
    document.body.classList.add('pda-searching');
    finderButton.disabled = true;
    let step = 0;
    setScanStep(step);

    // Give the PDA a brief visible pre-scan so the interface feels like a device,
    // then let the existing search engine do its normal work.
    await new Promise(resolve => window.setTimeout(resolve, 110));
    step = 1; setScanStep(step);
    await new Promise(resolve => window.setTimeout(resolve, 90));
    step = 2; setScanStep(step);
    await new Promise(resolve => window.setTimeout(resolve, 80));

    scanTimer = window.setInterval(() => {
      step = Math.min(scanMessages.length - 1, step + 1);
      setScanStep(step);
    }, 420);

    try {
      await corePdaFindBuilds();
    } finally {
      stopScanUi();
    }
  }

  finderButton.addEventListener('click', event => {
    if (pdaScanBusy) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    pdaScanBusy = true;
    event.preventDefault();
    event.stopImmediatePropagation();
    executePdaScan().catch(error => {
      console.error(error);
      stopScanUi();
    });
  }, true);

  ensureEnvironmentReadout();
  refreshManualTelemetrySoon();

  const style = document.createElement('style');
  style.id = 'pdaInteractionStyles';
  style.textContent = `
    .mode-toggle{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:2px!important}
    .mode-toggle-btn{position:relative!important;min-width:0!important}
    .mode-toggle-btn::before{content:"";position:absolute;left:7px;right:7px;bottom:3px;height:1px;background:transparent}
    .mode-toggle-btn.active::before{background:var(--accent);box-shadow:0 0 7px rgba(168,185,107,.26)}
    .pda-stats-focus .grid{grid-template-columns:1fr!important}
    .pda-stats-focus .controls-column{display:none!important}
    .pda-stats-focus .results-column{max-width:none!important}

    .pda-env-readout{display:grid!important;grid-template-columns:auto auto!important;grid-template-areas:"key state" "detail detail"!important;column-gap:5px!important;row-gap:1px!important;min-width:168px!important}
    .pda-env-readout>b{grid-area:key}.pda-env-readout>i{grid-area:state;font-style:normal;font-size:9px!important}.pda-env-readout>em{grid-area:detail;font:700 6.5px var(--mono);font-style:normal;letter-spacing:.04em;color:#69745f;white-space:nowrap}
    .pda-env-readout.env-stable>i{color:#9bbb72!important}.pda-env-readout.env-elevated{border-left-color:#775d2d!important}.pda-env-readout.env-elevated>i,.pda-env-readout.env-elevated>em{color:#d39b36!important}
    .pda-env-readout.env-danger{border-left-color:#7f352d!important;background:rgba(125,40,31,.10)!important;animation:pda-danger-pulse 1.15s steps(2,end) infinite}
    .pda-env-readout.env-danger>i,.pda-env-readout.env-danger>em{color:#e16d58!important}
    .pda-danger-text{font-style:normal;color:#df6654!important}.pda-stable-text{font-style:normal;color:#91b66d!important}
    @keyframes pda-danger-pulse{50%{box-shadow:inset 0 0 0 1px rgba(210,82,65,.35),0 0 12px rgba(142,43,32,.12)}}

    .pda-scanned-record{position:relative!important;padding-top:11px!important;overflow:hidden!important}
    .pda-scanned-record::before{content:"SCAN";position:absolute;right:5px;top:3px;color:#4f5b48;font:800 6px var(--mono);letter-spacing:.16em}
    .pda-scanned-record::after{content:"";position:absolute;left:0;top:0;width:18px;height:18px;border-left:1px solid #56633f;border-top:1px solid #56633f;opacity:.55;pointer-events:none}
    .pda-scan-meta{display:flex;flex-wrap:wrap;gap:3px;margin:7px 0 2px;padding-top:5px;border-top:1px dashed #303a29}
    .pda-scan-meta>span{padding:2px 4px;border:1px solid #293224;background:#0a0f08;color:#708063;font:700 6.8px var(--mono);letter-spacing:.05em;white-space:nowrap}

    .result-card-head{position:relative!important;flex-wrap:wrap!important}
    .pda-active-loadout{border-color:#82995b!important;box-shadow:inset 0 0 0 1px rgba(151,181,101,.18),0 0 18px rgba(103,130,67,.08)!important}
    .pda-active-loadout::before{opacity:1!important;background:linear-gradient(180deg,#a8c477,transparent 80%)!important}
    .pda-active-stamp{margin-left:auto;padding:3px 6px;border:1px solid #75884f;background:rgba(123,151,79,.10);color:#accb79;font:800 7px var(--mono);letter-spacing:.11em;transform:rotate(-1deg)}

    .pda-scan-console{margin:7px 0 12px;border:1px solid #465139;background:#080d07;box-shadow:inset 0 0 22px rgba(83,104,59,.05)}
    .pda-scan-console[hidden]{display:none!important}
    .pda-scan-head{display:flex;justify-content:space-between;gap:10px;padding:5px 7px;border-bottom:1px solid #2d3727;color:#93a76c;font:800 7.5px var(--mono);letter-spacing:.13em}
    .pda-scan-head>b{color:#d29a38;animation:pda-scan-blink .8s steps(2,end) infinite}
    .pda-scan-lines{display:grid;padding:5px 7px}
    .pda-scan-lines>div{display:grid;grid-template-columns:54px minmax(0,1fr) 24px;gap:7px;align-items:center;min-height:19px;border-bottom:1px solid rgba(74,86,61,.16);font:700 7.5px var(--mono)}
    .pda-scan-lines>div:last-child{border-bottom:0}.pda-scan-lines b{color:#607055}.pda-scan-lines span{color:#7d8b6d}.pda-scan-lines i{text-align:right;font-style:normal;color:#87a367}.pda-scan-lines .current span,.pda-scan-lines .current b{color:#bdc987}.pda-scan-lines .current i{color:#d59b39}
    .pda-searching .search-progress{display:block!important}.pda-searching .primary-button{filter:saturate(.78)!important}
    @keyframes pda-scan-blink{50%{opacity:.42}}

    @media(max-width:980px){.pda-env-readout{min-width:145px!important}.pda-stats-focus .controls-column{display:none!important}}
    @media(max-width:640px){.pda-env-readout{width:100%!important;min-width:0!important}.pda-scan-lines>div{grid-template-columns:44px minmax(0,1fr) 22px}.pda-scan-meta>span{font-size:6.5px}}
    @media(prefers-reduced-motion:reduce){.pda-env-readout.env-danger,.pda-scan-head>b{animation:none!important}.pda-active-loadout{box-shadow:inset 0 0 0 1px rgba(151,181,101,.18)!important}}
  `;
  document.head.appendChild(style);
})();
