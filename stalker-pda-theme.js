// Zone PDA visual theme — presentation only.
// Keeps all calculator/search/math behavior intact while giving the interface a
// rugged field-terminal look with an original topo-map background treatment.

(function applyZonePdaTheme() {
  document.documentElement.classList.add('zone-pda-theme');

  const header = document.querySelector('header');
  if (header && !header.querySelector('.pda-statusbar')) {
    const status = document.createElement('div');
    status.className = 'pda-statusbar';
    status.innerHTML = `
      <div class="pda-status-left">
        <span class="pda-live-dot" aria-hidden="true"></span>
        <span>FIELD PDA // ARTIFACT ANALYSIS MODULE</span>
      </div>
      <div class="pda-status-right">
        <span id="pdaSignal">SIGNAL 3/5</span>
        <span id="pdaClock">--:--</span>
        <span class="pda-battery" aria-label="PDA battery"><i></i></span>
      </div>`;
    const mast = header.querySelector('.mast-row');
    mast?.insertAdjacentElement('afterend', status);
  }

  function updatePdaClock() {
    const clock = document.getElementById('pdaClock');
    if (!clock) return;
    clock.textContent = new Intl.DateTimeFormat([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
  }
  updatePdaClock();
  setInterval(updatePdaClock, 30000);

  const style = document.createElement('style');
  style.id = 'zonePdaThemeStyles';
  style.textContent = `
    :root,
    :root[data-theme]{
      --bg:#090c07!important;
      --bg-glow:#182016!important;
      --panel:#11170e!important;
      --panel-2:#182017!important;
      --panel-3:#222c20!important;
      --border:#46503a!important;
      --border-soft:#2b3326!important;
      --text:#d5ddc2!important;
      --text-dim:#aeb99c!important;
      --muted:#79846d!important;
      --accent:#a8b96b!important;
      --accent-hi:#d0d98c!important;
      --accent-dim:#5e6a38!important;
      --accent-soft:rgba(168,185,107,.13)!important;
      --accent-glow:rgba(168,185,107,.28)!important;
      --good:#94bd6c!important;
      --good-bg:rgba(148,189,108,.12)!important;
      --bad:#d2634f!important;
      --bad-bg:rgba(210,99,79,.14)!important;
      --warn:#d69a33!important;
      --warn-bg:rgba(214,154,51,.15)!important;
      --pda-amber:#d79a2d;
      --pda-amber-hi:#f0b341;
      --pda-shell:#2b2a1f;
      --pda-shell-hi:#55513d;
      --pda-screen:#0a0f08;
    }

    html{background:#050704!important;scrollbar-color:#4a533e #080b07!important}
    body{
      min-height:100vh;
      background:
        radial-gradient(1200px 680px at 50% -10%,rgba(104,123,70,.12),transparent 62%),
        radial-gradient(900px 520px at 100% 35%,rgba(104,76,35,.08),transparent 70%),
        linear-gradient(180deg,#090c07 0%,#060805 100%)!important;
      color:var(--text)!important;
    }

    body::before{
      content:""!important;
      position:fixed!important;
      inset:0!important;
      height:auto!important;
      pointer-events:none!important;
      z-index:0!important;
      opacity:.18!important;
      background-image:
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='720' height='520' viewBox='0 0 720 520'%3E%3Cg fill='none' stroke='%2397a36b' stroke-width='1' opacity='.38'%3E%3Cpath d='M-40 82C70 12 155 116 268 61s194-9 287 22 125-26 214-10'/%3E%3Cpath d='M-20 118C102 44 164 144 286 93s213-4 292 27 101-20 167-7'/%3E%3Cpath d='M-52 205C46 143 121 228 218 190s153-18 244 9 171-32 286 18'/%3E%3Cpath d='M-15 247C82 181 156 266 254 226s161-15 251 15 154-27 247 19'/%3E%3Cpath d='M-35 352C74 287 143 383 257 337s183-9 277 29 135-17 224 12'/%3E%3Cpath d='M-10 397C96 337 166 421 273 382s177-13 264 20 125-11 205 18'/%3E%3Cpath d='M113-30c18 79 2 128-31 181s-9 121 39 167 27 113-18 190'/%3E%3Cpath d='M420-30c-22 80-7 134 31 186s15 119-30 165-31 109 7 190'/%3E%3C/g%3E%3Cg fill='none' stroke='%2366754c' stroke-width='.7' opacity='.28'%3E%3Ccircle cx='190' cy='165' r='36'/%3E%3Ccircle cx='190' cy='165' r='58'/%3E%3Ccircle cx='530' cy='325' r='44'/%3E%3Ccircle cx='530' cy='325' r='68'/%3E%3C/g%3E%3C/svg%3E"),
        repeating-linear-gradient(90deg,rgba(150,166,110,.08) 0 1px,transparent 1px 64px),
        repeating-linear-gradient(0deg,rgba(150,166,110,.06) 0 1px,transparent 1px 64px)!important;
      background-size:720px 520px,64px 64px,64px 64px!important;
      mix-blend-mode:screen!important;
    }

    body::after{
      content:""!important;
      position:fixed!important;
      inset:0!important;
      pointer-events:none!important;
      z-index:5!important;
      opacity:.16!important;
      background:
        radial-gradient(ellipse at center,transparent 58%,rgba(0,0,0,.68) 100%),
        repeating-linear-gradient(0deg,rgba(214,226,184,.025) 0 1px,transparent 1px 3px)!important;
      mix-blend-mode:normal!important;
    }

    .wrap{
      position:relative!important;
      z-index:1!important;
      max-width:1600px!important;
      margin:28px auto 64px!important;
      padding:28px 30px 42px!important;
      background:
        linear-gradient(180deg,rgba(8,12,7,.965),rgba(7,10,6,.975)) padding-box,
        linear-gradient(145deg,#625e46,#2b2a20 20%,#15160f 68%,#4b4936) border-box!important;
      border:9px solid transparent!important;
      border-radius:15px!important;
      box-shadow:
        0 0 0 2px #11130e,
        0 0 0 4px #57523d,
        0 28px 72px rgba(0,0,0,.66),
        inset 0 0 70px rgba(0,0,0,.30)!important;
      overflow:visible;
    }

    .wrap::before{
      content:"";
      position:absolute;
      inset:-7px;
      pointer-events:none;
      border-radius:11px;
      opacity:.5;
      background:
        radial-gradient(circle at 17px 17px,#0d0e09 0 3px,#6b654b 4px 5px,transparent 6px),
        radial-gradient(circle at calc(100% - 17px) 17px,#0d0e09 0 3px,#6b654b 4px 5px,transparent 6px),
        radial-gradient(circle at 17px calc(100% - 17px),#0d0e09 0 3px,#6b654b 4px 5px,transparent 6px),
        radial-gradient(circle at calc(100% - 17px) calc(100% - 17px),#0d0e09 0 3px,#6b654b 4px 5px,transparent 6px),
        linear-gradient(100deg,transparent 0 8%,rgba(255,255,255,.035) 8.1% 8.4%,transparent 8.5% 74%,rgba(0,0,0,.25) 74.3% 74.8%,transparent 75%);
      box-shadow:inset 0 0 0 1px rgba(205,196,151,.12);
    }

    .wrap::after{
      content:"PDA // ZONE FIELD SYSTEM";
      position:absolute;
      right:25px;
      bottom:10px;
      color:#5f674c;
      font:700 8px var(--mono);
      letter-spacing:.14em;
      pointer-events:none;
    }

    #tests{display:none!important}
    .theme-switch{display:none!important}

    header{
      position:relative!important;
      padding:2px 4px 16px!important;
      margin-bottom:18px!important;
      border-bottom:1px solid #48513a!important;
      background:
        linear-gradient(90deg,rgba(168,185,107,.045),transparent 35%),
        repeating-linear-gradient(90deg,transparent 0 79px,rgba(150,166,110,.03) 80px)!important;
    }
    header::after{
      content:""!important;
      position:absolute!important;
      left:0!important;right:0!important;bottom:-1px!important;
      width:auto!important;height:1px!important;
      background:linear-gradient(90deg,var(--accent),rgba(168,185,107,.18) 28%,transparent 72%)!important;
      opacity:.9!important;
    }
    .mast-row{align-items:flex-start!important}
    .masthead{gap:14px!important;align-items:center!important}
    .mast-mark{
      width:48px!important;height:48px!important;
      border-radius:2px!important;
      border:1px solid #69764c!important;
      background:
        linear-gradient(135deg,transparent 0 8px,#161d12 8px 100%)!important;
      color:#d0db8b!important;
      box-shadow:inset 0 0 0 1px rgba(0,0,0,.6),0 0 18px rgba(168,185,107,.10)!important;
      text-shadow:0 0 10px rgba(190,208,123,.30);
    }
    header h1{
      color:#d9dfc9!important;
      font:800 20px/1.1 var(--mono)!important;
      letter-spacing:.075em!important;
      text-transform:uppercase!important;
      text-shadow:0 0 8px rgba(168,185,107,.08)!important;
    }
    header h1 span{color:#b8c773!important}
    header p{margin-top:5px!important;color:#79846d!important;font:10.5px var(--mono)!important;letter-spacing:.04em!important}
    .mast-notes{margin-top:8px!important;padding:0!important;border:0!important;display:flex!important;flex-direction:row!important;gap:7px!important}
    .mast-notes p{
      width:auto!important;margin:0!important;padding:4px 7px!important;
      border:1px solid #303a29!important;border-radius:1px!important;
      background:#0e140c!important;color:#75806a!important;
      font:9px var(--mono)!important;
    }
    #databaseStatus{color:#a7b67b!important}
    #artifactCount{color:#d5a13c!important}

    .pda-statusbar{
      display:flex;align-items:center;justify-content:space-between;gap:16px;
      margin-top:12px;padding:6px 8px;
      border:1px solid #303a29;border-left:3px solid #8fa05c;
      background:linear-gradient(90deg,#0f150d,rgba(15,21,13,.50));
      color:#7e8a6d;font:800 9px var(--mono);letter-spacing:.10em;text-transform:uppercase;
    }
    .pda-status-left,.pda-status-right{display:flex;align-items:center;gap:10px}
    .pda-live-dot{width:6px;height:6px;border-radius:50%;background:#99c970;box-shadow:0 0 8px rgba(153,201,112,.55)}
    .pda-status-right{color:#9da87c}
    .pda-battery{position:relative;width:20px;height:9px;border:1px solid #69764c;padding:1px}
    .pda-battery::after{content:"";position:absolute;right:-3px;top:2px;width:2px;height:3px;background:#69764c}
    .pda-battery i{display:block;width:75%;height:100%;background:#9db66a;box-shadow:0 0 5px rgba(157,182,106,.22)}

    .grid{grid-template-columns:420px minmax(0,1fr)!important;gap:18px!important;align-items:start!important}
    .controls-column,.results-column{min-width:0}

    .console{
      position:sticky!important;top:10px!important;z-index:22!important;
      margin-bottom:12px!important;padding:10px!important;
      border:1px solid #4a523d!important;border-radius:2px!important;
      background:rgba(13,18,11,.94)!important;
      box-shadow:4px 5px 0 rgba(0,0,0,.28),inset 0 0 0 1px rgba(165,181,108,.025)!important;
      backdrop-filter:blur(8px)!important;
    }
    .mode-toggle{padding:3px!important;border-radius:1px!important;background:#080b07!important;border-color:#30382a!important}
    .mode-toggle-btn{
      border-radius:1px!important;color:#6f7a63!important;
      font:800 10px var(--mono)!important;letter-spacing:.14em!important;text-transform:uppercase!important;
    }
    .mode-toggle-btn.active{
      background:linear-gradient(180deg,rgba(168,185,107,.16),rgba(168,185,107,.08))!important;
      color:#c8d487!important;box-shadow:inset 0 -2px 0 #91a35c!important;
    }

    .panel{
      position:relative!important;
      overflow:visible!important;
      padding:15px 15px 16px!important;
      border:1px solid #414a37!important;border-radius:2px!important;
      background:
        linear-gradient(180deg,rgba(19,27,16,.965),rgba(12,18,10,.975)),
        repeating-linear-gradient(90deg,transparent 0 63px,rgba(166,183,112,.018) 64px)!important;
      box-shadow:4px 5px 0 rgba(0,0,0,.20),inset 0 1px 0 rgba(190,204,146,.025)!important;
    }
    .panel::before{
      content:""!important;position:absolute!important;left:-1px!important;top:-1px!important;
      width:72px!important;height:2px!important;border-radius:0!important;
      background:linear-gradient(90deg,#a8b96b,transparent)!important;opacity:.82!important;
    }
    .panel::after{
      content:"";position:absolute;right:7px;top:7px;width:18px;height:6px;pointer-events:none;opacity:.28;
      background:repeating-linear-gradient(90deg,#81905d 0 2px,transparent 2px 4px);
    }
    .panel+.panel{margin-top:12px!important}
    .panel h2{
      margin-bottom:12px!important;color:#bdc98c!important;
      font:850 10.5px var(--mono)!important;letter-spacing:.13em!important;text-transform:uppercase!important;
    }
    .panel h2::before{
      width:11px!important;height:11px!important;border:1px solid #7e8e52!important;border-radius:1px!important;
      background:rgba(168,185,107,.06)!important;box-shadow:inset 0 0 0 2px #11170e!important;transform:none!important;
    }
    .panel-hint{color:#6f7964!important;font-size:11px!important}
    .section-row,.results-heading{border-bottom-color:#283022!important}

    .field>span,.theme-label,.slot-label,.total-stat-group-title,.item-combo-group,.result-card-head strong{
      color:#727e64!important;font-family:var(--mono)!important;letter-spacing:.09em!important;text-transform:uppercase!important;
    }

    input[type="number"],input[type="search"],select,.item-combo-input{
      height:40px!important;
      border:1px solid #46503b!important;border-radius:1px!important;
      background:#090d08!important;color:#d0d8be!important;
      box-shadow:inset 2px 2px 0 rgba(0,0,0,.33)!important;
      caret-color:#d8a13b!important;
    }
    input[type="number"]:hover,input[type="search"]:hover,select:hover,.item-combo-input:hover{border-color:#657150!important}
    input:focus,select:focus,.item-combo-input:focus{
      border-color:#9dad62!important;
      box-shadow:0 0 0 1px rgba(168,185,107,.18),inset 2px 2px 0 rgba(0,0,0,.35)!important;
    }
    .item-combo-input-row{grid-template-columns:minmax(0,1fr) 40px!important}
    .item-combo-input{border-radius:1px 0 0 1px!important}
    .item-combo-toggle{
      border-radius:0 1px 1px 0!important;border-color:#46503b!important;
      background:#151d12!important;color:#b0bd7c!important;
    }
    .item-combo-menu{
      border:1px solid #586448!important;border-radius:1px!important;
      background:#080c07!important;
      box-shadow:8px 10px 0 rgba(0,0,0,.38),0 0 30px rgba(0,0,0,.35)!important;
    }
    .item-combo-option{border-radius:1px!important}
    .item-combo-option:hover,.item-combo-option.active{background:#182116!important}
    .item-combo-option.selected{background:rgba(168,185,107,.11)!important;box-shadow:inset 3px 0 0 #a8b96b!important}

    .primary-button,.secondary-button,.mini-button,.use-build{
      border-radius:1px!important;text-transform:uppercase!important;
      letter-spacing:.075em!important;font-family:var(--mono)!important;
      box-shadow:3px 4px 0 rgba(0,0,0,.23)!important;
    }
    .primary-button{
      background:linear-gradient(180deg,#e0a43a,#b87818)!important;
      border-color:#e2aa44!important;color:#171006!important;
      text-shadow:0 1px rgba(255,255,255,.15)!important;
    }
    .primary-button:hover{background:linear-gradient(180deg,#efb54a,#c98920)!important;filter:none!important;transform:translateY(-1px)!important}
    .secondary-button,.mini-button,.use-build{
      background:linear-gradient(180deg,#1c2519,#131a11)!important;
      border-color:#4d5840!important;color:#aeb99c!important;
    }
    .secondary-button:hover,.mini-button:hover,.use-build:hover{border-color:#829057!important;color:#d7dfc2!important}

    .switch-row{
      border-radius:1px!important;background:#151d12!important;border-color:#36402f!important;
      box-shadow:inset 0 0 0 1px rgba(167,184,106,.015)!important;
    }
    .switch-row:hover{background:#192316!important;border-color:#536044!important}
    .switch-row input{accent-color:#a8b96b!important}

    .container-meta span,.armor-meta span{
      border-radius:1px!important;background:#141b12!important;border-color:#313a2c!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.012)!important;
    }
    .container-meta small,.armor-meta small{color:#67715d!important}
    .container-meta strong,.armor-meta strong{color:#c4ccb4!important}

    .result-card{
      position:relative!important;overflow:hidden!important;
      border:1px solid #3c4634!important;border-radius:1px!important;
      background:
        linear-gradient(180deg,rgba(18,26,15,.98),rgba(10,15,9,.99)),
        repeating-linear-gradient(90deg,transparent 0 47px,rgba(165,183,111,.018) 48px)!important;
      box-shadow:4px 5px 0 rgba(0,0,0,.22)!important;
      transform:none!important;
    }
    .result-card::before{
      width:2px!important;background:linear-gradient(180deg,#97aa60,transparent 80%)!important;opacity:.65!important;
    }
    .result-card:hover{transform:translateY(-1px)!important;border-color:#66744d!important;box-shadow:5px 7px 0 rgba(0,0,0,.27)!important}
    .result-card.match{border-color:#687b4c!important;box-shadow:0 0 0 1px rgba(148,189,108,.13),4px 5px 0 rgba(0,0,0,.22)!important}
    .result-card.match::before{background:linear-gradient(180deg,#a3cb70,transparent 80%)!important;opacity:.95!important}
    .result-card.closest{border-color:#66563a!important}
    .result-card.selected-result{border-color:#9aab63!important;box-shadow:0 0 0 1px #627146,0 0 22px rgba(147,171,93,.12),4px 5px 0 rgba(0,0,0,.25)!important}

    .result-card-head{border-bottom:1px solid #293124!important;padding-bottom:7px!important}
    .result-card-head>strong{color:#aebc7f!important}
    .result-artifacts{gap:7px!important}
    .result-artifact{
      border-radius:1px!important;background:#151d12!important;border:1px solid #303a2b!important;
      box-shadow:inset 0 0 0 1px rgba(181,195,133,.012)!important;
    }
    .result-artifact strong{color:#d4dcc3!important}
    .result-artifact span{color:#7a866c!important}
    .result-artifact small{color:#b9c587!important}

    .match-badge,.result-count,.exact-pill,.requirement-pill,.price-badge,.exposure-chip,.rarity-pill,.stat-delta{
      border-radius:1px!important;font-family:var(--mono)!important;
    }
    .match-badge{background:#172116!important;border:1px solid #4c623d!important;color:#a2c478!important}
    .closest .match-badge{background:#261b0c!important;border-color:#775426!important;color:#dc9e38!important}
    .result-count,.exact-pill{background:#11180f!important;border-color:#3d4935!important;color:#8f9c77!important}
    .requirement-pill{background:#121911!important;border-color:#313a2b!important}
    .requirement-pill.pass{color:#9ec174!important;border-color:#4a603c!important}
    .requirement-pill.fail{color:#d6a044!important;border-color:#705127!important}

    .total-stats-sheet{
      border-radius:2px!important;
      background:
        linear-gradient(180deg,#0d130b,#080c07),
        repeating-linear-gradient(90deg,transparent 0 47px,rgba(165,183,111,.015) 48px)!important;
      border:1px solid #3c4634!important;
      box-shadow:4px 5px 0 rgba(0,0,0,.22)!important;
    }
    .total-sheet-head{padding-bottom:8px!important;border-bottom:1px solid #273022!important}
    .total-sheet-head h2{color:#bdc88f!important;font-family:var(--mono)!important;text-transform:uppercase!important;letter-spacing:.07em!important}
    #totalStatsContext{color:#6f7964!important;font-family:var(--mono)!important}
    .final-group-heading{color:#7f8b6d!important;border-bottom:1px solid #252d21!important;font-family:var(--mono)!important;letter-spacing:.10em!important}
    .final-stat-row{border-bottom:1px solid #1d251b!important}
    .final-stat-name{color:#bdc7ae!important}
    .final-stat-values>b.good{color:#9abe71!important;text-shadow:0 0 6px rgba(148,189,108,.08)!important}
    .final-stat-values>b.bad{color:#d76852!important}
    .stat-delta.good{background:#142013!important;color:#96bd70!important;border-color:#3c5633!important}
    .stat-delta.bad{background:#291310!important;color:#df7058!important;border-color:#663328!important}

    .build-exposure-safe,.exposure-safety-note{
      border-radius:1px!important;
      background:linear-gradient(90deg,rgba(70,91,45,.18),rgba(70,91,45,.07))!important;
      border-color:#405235!important;
    }
    .build-exposure-safe>strong{color:#9fbe78!important}
    .positive-exposure{color:#d6a044!important}
    .negative-exposure{color:#98bb72!important}
    .build-exposure-flaw,.no-safe-build-warning{
      position:relative!important;border-radius:1px!important;
      background:repeating-linear-gradient(135deg,rgba(100,43,28,.22) 0 8px,rgba(78,29,21,.13) 8px 16px)!important;
      border-color:#874632!important;color:#ef9a74!important;
      box-shadow:inset 4px 0 0 #c65d43!important;
    }
    .build-exposure-flaw::before,.no-safe-build-warning::before{
      content:"HAZARD";display:block;margin-bottom:5px;color:#e0a13a;font:900 8px var(--mono);letter-spacing:.16em;
    }

    .empty-state{
      border-radius:1px!important;border:1px dashed #46503b!important;
      background:#0c120a!important;color:#77836a!important;
    }
    .empty-state strong{color:#b9c49f!important}
    .search-progress{height:3px!important;border-radius:0!important;background:#090d08!important;border:1px solid #2a3225!important}
    .search-progress::after{background:#d39a35!important;box-shadow:0 0 8px rgba(211,154,53,.28)!important}

    .artifact-slot{
      border-radius:1px!important;background:#0f160d!important;border-color:#313a2b!important;
    }
    .artifact-slot.filled{border-color:#59674a!important}
    .additional-option{border-radius:1px!important;background:#151d12!important;border-color:#303a2b!important}
    .additional-option.selected{background:rgba(168,185,107,.10)!important;border-color:#65754a!important}

    .armor-upgrade-note{color:#707b65!important;font-family:var(--mono)!important}
    .equipment-target-controls,.quality-strategy-control,.finder-tier-control,.priority-mode-control{
      border-radius:1px!important;border-color:#343e2e!important;background:#121a10!important;
    }

    ::-webkit-scrollbar{width:9px;height:9px}
    ::-webkit-scrollbar-track{background:#080b07!important}
    ::-webkit-scrollbar-thumb{background:#424c38!important;border:2px solid #080b07!important;border-radius:0!important}
    ::-webkit-scrollbar-thumb:hover{background:#5a6747!important}

    @media(max-width:1260px){
      .grid{grid-template-columns:390px minmax(0,1fr)!important}
      .wrap{margin-left:16px!important;margin-right:16px!important}
    }
    @media(max-width:980px){
      .wrap{
        margin:0!important;padding:18px 15px 40px!important;border-width:0!important;border-radius:0!important;
        box-shadow:none!important;background:rgba(7,10,6,.97)!important;
      }
      .wrap::before,.wrap::after{display:none!important}
      .grid{grid-template-columns:1fr!important}
      .console{position:static!important}
      .pda-statusbar{flex-wrap:wrap!important;gap:6px!important}
    }
    @media(max-width:700px){
      header h1{font-size:16px!important}
      .mast-mark{width:42px!important;height:42px!important}
      .pda-statusbar{font-size:8px!important}.pda-status-right{margin-left:auto!important}
      .panel{padding:13px!important}
      .result-card:hover{transform:none!important}
    }
    @media(prefers-reduced-motion:reduce){*{transition:none!important;animation-duration:.001ms!important;animation-iteration-count:1!important}}
  `;
  document.head.appendChild(style);
})();
