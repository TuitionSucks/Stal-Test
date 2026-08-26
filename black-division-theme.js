// Tactical visual theme inspired by extraction-shooter field equipment UIs.
// Presentation only: calculator/search/math behavior is unchanged.

const tacticalThemeStyle = document.createElement('style');
tacticalThemeStyle.textContent = `
  :root{
    --bg:#090a08!important;
    --bg-glow:#17190f!important;
    --panel:#11130f!important;
    --panel-2:#171a14!important;
    --panel-3:#20231b!important;
    --border:#34372d!important;
    --border-soft:#25281f!important;
    --text:#d8d5c9!important;
    --text-dim:#b5b1a5!important;
    --muted:#77786d!important;
    --accent:#b59b64!important;
    --accent-hi:#d2bd86!important;
    --accent-dim:#665a37!important;
    --accent-soft:rgba(181,155,100,.13)!important;
    --accent-glow:rgba(181,155,100,.24)!important;
    --good:#7fa36a!important;
    --good-bg:rgba(127,163,106,.13)!important;
    --bad:#c65c50!important;
    --bad-bg:rgba(198,92,80,.13)!important;
    --warn:#c6a15b!important;
    --warn-bg:rgba(198,161,91,.13)!important;
  }

  :root[data-theme="violet"]{
    --accent:#9d8178!important;--accent-hi:#bea098!important;--accent-dim:#58433e!important;
    --accent-soft:rgba(157,129,120,.13)!important;--accent-glow:rgba(157,129,120,.23)!important;
  }
  :root[data-theme="ice"]{
    --accent:#7e9692!important;--accent-hi:#a8b9b5!important;--accent-dim:#415853!important;
    --accent-soft:rgba(126,150,146,.13)!important;--accent-glow:rgba(126,150,146,.23)!important;
  }
  :root[data-theme="lume"]{
    --accent:#b59b64!important;--accent-hi:#d2bd86!important;--accent-dim:#665a37!important;
    --accent-soft:rgba(181,155,100,.13)!important;--accent-glow:rgba(181,155,100,.24)!important;
  }
  :root[data-theme="sage"]{
    --accent:#84906c!important;--accent-hi:#a8b18e!important;--accent-dim:#46503b!important;
    --accent-soft:rgba(132,144,108,.13)!important;--accent-glow:rgba(132,144,108,.22)!important;
  }

  html{background:#080906!important}
  body{
    background:
      radial-gradient(900px 420px at 14% -8%,rgba(130,133,83,.09),transparent 68%),
      radial-gradient(700px 420px at 100% 10%,rgba(181,155,100,.045),transparent 70%),
      linear-gradient(180deg,#0b0c09 0%,#090a08 46%,#070805 100%)!important;
    color:#d8d5c9!important;
  }
  body::before{
    height:560px!important;
    opacity:.8!important;
    background:
      linear-gradient(90deg,transparent 0 49.92%,rgba(196,191,165,.018) 49.92% 50.08%,transparent 50.08%),
      linear-gradient(180deg,rgba(255,255,255,.015),transparent 44%),
      radial-gradient(800px 300px at 18% 0%,rgba(139,143,91,.10),transparent 72%)!important;
  }
  body::after{
    content:"";
    position:fixed;
    inset:0;
    z-index:0;
    pointer-events:none;
    opacity:.12;
    background:
      repeating-linear-gradient(0deg,rgba(255,255,255,.022) 0 1px,transparent 1px 4px),
      repeating-linear-gradient(90deg,rgba(255,255,255,.009) 0 1px,transparent 1px 64px);
    mix-blend-mode:screen;
  }

  #tests{display:none!important}
  .mast-notes{align-items:center!important}
  .mast-notes p{border-radius:2px!important;background:#11130f!important;border-color:#303328!important}
  #databaseStatus{color:#9ea786!important}
  #artifactCount{color:var(--accent-hi)!important}

  .wrap{max-width:1580px!important}
  header{
    padding:4px 0 18px!important;
    border-bottom:1px solid #2f3228!important;
  }
  header::after{
    height:2px!important;
    width:190px!important;
    right:auto!important;
    background:linear-gradient(90deg,var(--accent),rgba(181,155,100,.18),transparent)!important;
  }
  .masthead{align-items:center!important}
  .mast-mark{
    width:50px!important;height:50px!important;border-radius:2px!important;
    background:
      linear-gradient(135deg,transparent 0 9px,#1c1f17 9px 100%)!important;
    border:1px solid #484b3b!important;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.02),6px 6px 0 rgba(0,0,0,.22)!important;
    color:var(--accent-hi)!important;
    font-family:var(--mono)!important;
    text-shadow:0 0 12px rgba(181,155,100,.18);
  }
  header h1{
    font-size:21px!important;
    letter-spacing:.12em!important;
    font-weight:750!important;
    color:#e4e0d2!important;
    text-shadow:0 1px 0 #000;
  }
  header h1 span{color:var(--accent-hi)!important}
  header p{color:#85877c!important}

  .theme-label{color:#72756a!important}
  .theme-btns{
    border-radius:2px!important;
    background:#10120e!important;
    border:1px solid #303328!important;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.012)!important;
  }
  .theme-btn,.theme-btn .theme-swatch{border-radius:2px!important}
  .theme-btn[aria-pressed="true"]{box-shadow:inset 0 0 0 1px var(--accent),0 0 0 1px #090a08!important}

  .grid{gap:18px!important;grid-template-columns:420px minmax(0,1fr)!important}
  .console{
    border-radius:3px!important;
    background:rgba(16,18,14,.96)!important;
    border:1px solid #3a3d31!important;
    box-shadow:8px 10px 0 rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.018)!important;
    backdrop-filter:blur(9px)!important;
  }
  .mode-toggle{border-radius:2px!important;background:#0b0c09!important;border-color:#2e3027!important}
  .mode-toggle-btn{border-radius:1px!important;color:#74766d!important}
  .mode-toggle-btn.active{
    background:linear-gradient(180deg,rgba(181,155,100,.18),rgba(181,155,100,.09))!important;
    color:#d8c48f!important;
    box-shadow:inset 0 0 0 1px #665a37!important;
  }

  .panel{
    border-radius:3px!important;
    background:
      linear-gradient(135deg,rgba(255,255,255,.014) 0 16px,transparent 16px),
      linear-gradient(180deg,#13150f,#0f110d)!important;
    border:1px solid #35382d!important;
    box-shadow:7px 9px 0 rgba(0,0,0,.15),inset 0 1px 0 rgba(255,255,255,.016)!important;
  }
  .panel::before{
    top:0!important;bottom:auto!important;left:0!important;width:74px!important;height:2px!important;border-radius:0!important;
    background:linear-gradient(90deg,var(--accent),transparent)!important;
    opacity:.72!important;
  }
  .panel h2{
    font-size:11px!important;
    letter-spacing:.17em!important;
    color:#cfccbf!important;
    font-weight:800!important;
  }
  .panel h2::before{
    width:8px!important;height:8px!important;border-radius:0!important;
    background:transparent!important;
    border-left:2px solid var(--accent)!important;
    border-bottom:2px solid var(--accent)!important;
    box-shadow:none!important;
    transform:rotate(-45deg);
  }
  .panel-hint{color:#77796f!important}
  .section-row,.results-heading{border-bottom-color:#292c23!important}

  .field>span,.theme-label,.slot-label,.total-stat-group-title,.item-combo-group,.result-card-head strong{
    color:#77796e!important;
    letter-spacing:.11em!important;
  }

  input[type="number"],input[type="search"],select,.item-combo-input{
    border-radius:2px!important;
    background:#0a0c08!important;
    border:1px solid #3b3e31!important;
    color:#d5d2c5!important;
    box-shadow:inset 2px 2px 0 rgba(0,0,0,.22)!important;
  }
  input[type="number"]:hover,input[type="search"]:hover,select:hover,.item-combo-input:hover{border-color:#575a46!important}
  input:focus,select:focus,.item-combo-input:focus{
    border-color:#817044!important;
    box-shadow:0 0 0 1px rgba(181,155,100,.18),inset 2px 2px 0 rgba(0,0,0,.22)!important;
  }
  .item-combo-input-row{grid-template-columns:minmax(0,1fr) 40px!important}
  .item-combo-input{border-radius:2px 0 0 2px!important}
  .item-combo-toggle{
    border-radius:0 2px 2px 0!important;
    background:#171a13!important;
    border-color:#3b3e31!important;
    color:#a9a58f!important;
  }
  .item-combo-menu{
    border-radius:2px!important;
    border-color:#45483a!important;
    background:#0b0d09!important;
    box-shadow:10px 14px 0 rgba(0,0,0,.28)!important;
  }
  .item-combo-option{border-radius:1px!important}
  .item-combo-option:hover,.item-combo-option.active{background:#1b1e17!important}
  .item-combo-option.selected{background:rgba(181,155,100,.12)!important;box-shadow:inset 3px 0 0 var(--accent)!important}

  .primary-button,.secondary-button,.mini-button,.use-build{
    border-radius:2px!important;
    text-transform:uppercase;
    letter-spacing:.08em;
    font-family:var(--mono)!important;
  }
  .primary-button{
    background:linear-gradient(180deg,#b69b62,#947c4c)!important;
    border-color:#c0a66e!important;
    color:#11120e!important;
    box-shadow:4px 5px 0 rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.18)!important;
  }
  .primary-button:hover{background:linear-gradient(180deg,#c4aa70,#a28752)!important;filter:none!important}
  .secondary-button,.mini-button,.use-build{
    background:linear-gradient(180deg,#20231b,#171a14)!important;
    border-color:#45483a!important;
    color:#b9b5a8!important;
    box-shadow:3px 4px 0 rgba(0,0,0,.16)!important;
  }
  .secondary-button:hover,.mini-button:hover,.use-build:hover{border-color:#716442!important;color:#ddd6bd!important}

  .switch-row{
    border-radius:2px!important;
    background:#171a13!important;
    border-color:#34372c!important;
  }
  .switch-row:hover{background:#1b1e17!important;border-color:#57513b!important}

  .container-meta span,.armor-meta span{
    border-radius:2px!important;
    background:#171a14!important;
    border-color:#2d3026!important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.012)!important;
  }
  .container-meta small,.armor-meta small{color:#686a60!important}
  .container-meta strong,.armor-meta strong{color:#c7c4b8!important}

  .result-card{
    border-radius:2px!important;
    background:
      linear-gradient(135deg,rgba(181,155,100,.025) 0 20px,transparent 20px),
      linear-gradient(180deg,#12140f,#0d0f0b)!important;
    border:1px solid #373a2f!important;
    box-shadow:6px 8px 0 rgba(0,0,0,.17)!important;
    transform:none!important;
  }
  .result-card::before{width:2px!important;background:linear-gradient(180deg,var(--accent),transparent 72%)!important}
  .result-card:hover{transform:translateY(-1px)!important;border-color:#625a40!important;box-shadow:7px 10px 0 rgba(0,0,0,.2)!important}
  .result-card.match{border-color:#596a4c!important}
  .result-card.match::before{background:linear-gradient(180deg,#799563,transparent 78%)!important}
  .result-card.closest{border-color:#665b40!important}

  .result-artifact{
    border-radius:2px!important;
    background:#171a14!important;
    border-color:#2e3127!important;
  }
  .result-artifact strong{color:#dad6c8!important}
  .result-artifact span{color:#7d7e73!important}
  .result-artifact small{color:#b6a677!important}

  .match-badge,.result-count,.exact-pill,.requirement-pill,.price-badge,.exposure-chip,.rarity-pill,.stat-delta{
    border-radius:2px!important;
  }
  .match-badge{background:#172019!important;border-color:#465a3d!important;color:#88aa72!important}
  .closest .match-badge{background:#211d12!important;border-color:#5e5030!important;color:#c7a965!important}
  .requirement-pill{background:#151711!important;border-color:#2e3127!important}
  .requirement-pill.pass{color:#84a76f!important;border-color:#43583a!important}
  .requirement-pill.fail{color:#c5a15d!important;border-color:#5c4e31!important}

  .total-stats-sheet{
    border-radius:3px!important;
    background:linear-gradient(180deg,#0d0f0b,#090a07)!important;
    border-color:#34372d!important;
    box-shadow:7px 9px 0 rgba(0,0,0,.16)!important;
  }
  .total-sheet-head h2{color:#ddd9cc!important;font-weight:700!important;letter-spacing:.02em!important}
  #totalStatsContext{color:#727469!important}
  .final-group-heading{color:#74766c!important;border-bottom:1px solid #22251d!important}
  .final-stat-row{border-bottom:1px solid #1c1f18!important}
  .final-stat-name{color:#c7c4b8!important}
  .final-stat-values>b.good{color:#7fa36a!important}
  .final-stat-values>b.bad{color:#c65c50!important}
  .stat-delta.good{background:#132013!important;color:#86aa70!important;border-color:#2f4930!important}
  .stat-delta.bad{background:#251211!important;color:#cf6559!important;border-color:#55302c!important}

  .exposure-safety-note,.build-exposure-safe{
    border-radius:2px!important;
    background:#131a12!important;
    border-color:#394b34!important;
  }
  .build-exposure-flaw,.no-safe-build-warning{
    border-radius:2px!important;
    background:#231211!important;
    border-color:#744139!important;
    box-shadow:5px 6px 0 rgba(0,0,0,.2)!important;
  }
  .build-flaw-title{color:#d76d60!important}

  .empty-state{
    border-radius:2px!important;
    border:1px dashed #3a3d31!important;
    background:#0c0e0a!important;
  }
  .search-progress{border-radius:0!important;background:#0a0b08!important}
  .search-progress::after{background:linear-gradient(90deg,#766338,#b49a62,#766338)!important;box-shadow:none!important}

  .artifact-slot{
    border-radius:2px!important;
    background:#0d0f0b!important;
    border-color:#303329!important;
  }
  .artifact-slot.filled{border-color:#514a37!important}

  ::selection{background:#665a37!important;color:#f3ebd2!important}
  ::-webkit-scrollbar-track{background:#080906!important}
  ::-webkit-scrollbar-thumb{background:#34372d!important;border-color:#080906!important;border-radius:1px!important}
  ::-webkit-scrollbar-thumb:hover{background:#4a4d3e!important}

  @media (max-width:1260px){.grid{grid-template-columns:400px minmax(0,1fr)!important}}
  @media (max-width:980px){.grid{grid-template-columns:1fr!important}}
  @media (max-width:700px){
    .panel,.console,.result-card,.total-stats-sheet{box-shadow:3px 4px 0 rgba(0,0,0,.15)!important}
    header h1{letter-spacing:.08em!important}
    .result-card:hover{transform:none!important}
  }
`;
document.head.appendChild(tacticalThemeStyle);

// Keep the Chilly regression test alive, but remove it from the player-facing UI.
if (ui?.tests) {
  ui.tests.hidden = true;
  ui.tests.setAttribute('aria-hidden', 'true');
}
