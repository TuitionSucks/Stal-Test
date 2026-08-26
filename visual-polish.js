// Visual polish layer for the calculator. This intentionally changes presentation only.
// It is loaded last so the existing calculator logic and controls stay untouched.

const visualPolishStyle = document.createElement('style');
visualPolishStyle.textContent = `
  :root{
    --polish-line:color-mix(in srgb,var(--accent) 24%,var(--border));
    --polish-card:rgba(16,23,34,.90);
    --polish-card-strong:rgba(11,17,24,.96);
    --polish-shadow:0 18px 46px rgba(0,0,0,.28);
  }

  html{scrollbar-color:var(--border) var(--bg)}
  body{
    background:
      radial-gradient(950px 520px at 15% -10%,color-mix(in srgb,var(--accent) 10%,transparent),transparent 66%),
      radial-gradient(760px 520px at 100% 12%,rgba(255,255,255,.025),transparent 66%),
      linear-gradient(180deg,#0a0e14 0%,#080c11 46%,#070a0e 100%)!important;
  }
  body::before{
    height:520px!important;
    opacity:.72;
    background:
      linear-gradient(90deg,transparent 0 49.85%,rgba(255,255,255,.018) 49.85% 50.15%,transparent 50.15%),
      radial-gradient(820px 310px at 20% 0%,color-mix(in srgb,var(--accent) 13%,transparent),transparent 72%)!important;
  }

  .wrap{max-width:1540px!important;padding-top:32px!important}
  header{
    position:relative;
    padding:0 2px 20px;
    margin-bottom:20px!important;
  }
  header::after{
    content:"";
    position:absolute;
    left:0;right:0;bottom:0;height:1px;
    background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 22%,transparent) 26%,var(--border-soft) 58%,transparent);
    opacity:.78;
  }
  .masthead{gap:16px!important}
  .mast-mark{
    width:48px!important;height:48px!important;border-radius:13px!important;
    background:
      linear-gradient(145deg,color-mix(in srgb,var(--accent) 19%,var(--panel-3)),var(--panel))!important;
    border-color:color-mix(in srgb,var(--accent) 34%,var(--border))!important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 28px rgba(0,0,0,.30),0 0 22px -10px var(--accent-glow)!important;
    font-size:19px!important;
  }
  header h1{font-size:20px!important;letter-spacing:.095em!important}
  header p{font-size:13px!important}
  .mast-notes{
    margin-top:15px!important;padding-top:0!important;border-top:0!important;
    flex-direction:row!important;gap:8px 16px!important;flex-wrap:wrap;
  }
  .mast-notes p{
    padding:5px 9px;border:1px solid var(--border-soft);border-radius:999px;
    background:rgba(255,255,255,.018);font-size:11px!important;
  }

  .theme-btns{
    padding:5px!important;border-radius:999px!important;
    background:rgba(11,17,24,.82)!important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
  }
  .theme-btn{width:30px!important;height:30px!important;transition:transform .15s ease,box-shadow .15s ease}
  .theme-btn:hover{transform:translateY(-1px)}

  .grid{gap:22px!important;grid-template-columns:410px minmax(0,1fr)!important}
  .console{
    border-color:color-mix(in srgb,var(--accent) 18%,var(--border))!important;
    background:rgba(13,19,28,.92)!important;
    box-shadow:0 16px 42px rgba(0,0,0,.31),inset 0 1px 0 rgba(255,255,255,.035)!important;
  }
  .mode-toggle{background:#0b1118!important;padding:4px!important;border-radius:8px!important}
  .mode-toggle-btn{height:34px!important;border-radius:6px!important;transition:background .15s ease,color .15s ease,transform .15s ease}
  .mode-toggle-btn.active{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 62%,transparent),0 0 18px -11px var(--accent)!important}

  .panel{
    position:relative;
    overflow:visible;
    background:linear-gradient(180deg,rgba(18,25,36,.96),rgba(13,19,28,.96))!important;
    border-color:var(--border)!important;
    border-radius:14px!important;
    box-shadow:var(--polish-shadow),inset 0 1px 0 rgba(255,255,255,.025)!important;
  }
  .panel::before{
    content:"";
    position:absolute;left:0;top:12px;bottom:12px;width:2px;border-radius:2px;
    background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 60%,transparent),transparent 70%);
    opacity:.55;pointer-events:none;
  }
  .panel h2{font-size:11px!important;letter-spacing:.18em!important}
  .panel h2::before{height:15px!important;box-shadow:0 0 13px -3px var(--accent)!important}
  .panel-hint{font-size:12px!important;color:color-mix(in srgb,var(--muted) 88%,white)!important}

  input[type="number"],input[type="search"],select,.item-combo-input{
    background:linear-gradient(180deg,#0e151e,#0b1118)!important;
    border-color:#313c49!important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.02)!important;
    transition:border-color .15s ease,box-shadow .15s ease,background .15s ease;
  }
  input[type="number"]:hover,input[type="search"]:hover,select:hover,.item-combo-input:hover{border-color:#405063!important}
  input:focus,select:focus,.item-combo-input:focus{
    border-color:color-mix(in srgb,var(--accent) 68%,#405063)!important;
    box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 12%,transparent),inset 0 1px 0 rgba(255,255,255,.025)!important;
  }
  .item-combo-toggle{
    background:linear-gradient(180deg,#151e29,#101720)!important;
    border-color:#313c49!important;
  }
  .item-combo-menu{
    border-color:color-mix(in srgb,var(--accent) 18%,var(--border))!important;
    background:rgba(8,13,19,.98)!important;
    box-shadow:0 22px 50px rgba(0,0,0,.5)!important;
  }
  .item-combo-option{transition:background .12s ease,transform .12s ease}
  .item-combo-option:hover,.item-combo-option.active{background:rgba(255,255,255,.055)!important;padding-left:12px}

  .primary-button{
    background:linear-gradient(180deg,var(--accent-hi),var(--accent))!important;
    box-shadow:0 9px 22px -13px var(--accent),inset 0 1px 0 rgba(255,255,255,.28)!important;
    transition:transform .14s ease,filter .14s ease,box-shadow .14s ease;
  }
  .primary-button:hover{transform:translateY(-1px);filter:brightness(1.04);box-shadow:0 12px 28px -13px var(--accent)!important}
  .primary-button:active{transform:translateY(0)}
  .secondary-button,.mini-button,.use-build{
    background:linear-gradient(180deg,#192330,#141c27)!important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
    transition:border-color .14s ease,transform .14s ease,background .14s ease;
  }
  .secondary-button:hover,.mini-button:hover,.use-build:hover{transform:translateY(-1px)}

  .switch-row{
    background:linear-gradient(180deg,rgba(29,40,54,.72),rgba(21,30,41,.72))!important;
    transition:border-color .14s ease,background .14s ease;
  }
  .switch-row:hover{border-color:color-mix(in srgb,var(--accent) 25%,var(--border))!important;background:rgba(31,42,57,.8)!important}

  .container-meta span,.armor-meta span{
    background:linear-gradient(180deg,rgba(29,40,54,.76),rgba(22,30,41,.76))!important;
    border-color:rgba(255,255,255,.055)!important;
  }
  .container-meta strong,.armor-meta strong{color:#e1e7ee!important}

  .result-card{
    position:relative;
    overflow:hidden;
    padding:15px!important;
    border-radius:12px!important;
    background:linear-gradient(145deg,#101821,#0c1219)!important;
    border-color:#293545!important;
    box-shadow:0 12px 30px rgba(0,0,0,.19),inset 0 1px 0 rgba(255,255,255,.025)!important;
    transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;
  }
  .result-card::before{
    content:"";position:absolute;left:0;top:0;bottom:0;width:3px;
    background:linear-gradient(180deg,var(--accent),transparent 78%);opacity:.48;
  }
  .result-card:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--accent) 24%,#293545)!important;box-shadow:0 18px 38px rgba(0,0,0,.27)!important}
  .result-card.match{border-color:rgba(70,201,125,.42)!important}
  .result-card.match::before{background:linear-gradient(180deg,var(--good),transparent 78%);opacity:.8}
  .result-card.closest::before{background:linear-gradient(180deg,var(--warn),transparent 78%);opacity:.72}
  .result-card.selected-result{box-shadow:0 18px 42px rgba(0,0,0,.28),inset 0 0 0 1px var(--accent)!important}

  .result-artifacts{gap:8px!important}
  .result-artifact{
    padding:10px 11px!important;border-radius:9px!important;
    background:linear-gradient(180deg,rgba(28,38,51,.9),rgba(21,29,39,.9))!important;
    border-color:rgba(255,255,255,.055)!important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.02);
  }
  .result-artifact strong{font-size:13px!important}
  .result-artifact span{font-size:10.5px!important}
  .artifact-outcome-stats{margin-top:5px!important}

  .match-badge,.result-count,.exact-pill,.requirement-pill,.price-badge,.exposure-chip{
    box-shadow:inset 0 1px 0 rgba(255,255,255,.025);
  }
  .match-badge{padding:5px 8px!important;border:1px solid rgba(70,201,125,.24)}
  .requirement-pill{padding:5px 8px!important}

  .total-stats-sheet{
    border-color:#282f39!important;
    background:linear-gradient(180deg,#0b1016,#080c11)!important;
    box-shadow:0 18px 46px rgba(0,0,0,.28)!important;
  }
  .final-group-heading{border-bottom:1px solid rgba(255,255,255,.035)!important;margin-bottom:2px!important}
  .final-stat-row{padding:4px 2px!important;border-bottom:1px solid rgba(255,255,255,.025)!important}
  .final-stat-row:last-child{border-bottom:0!important}
  .stat-delta{border:1px solid rgba(255,255,255,.04)}

  .exposure-safety-note{
    background:linear-gradient(180deg,rgba(70,201,125,.075),rgba(70,201,125,.035))!important;
    border-color:rgba(70,201,125,.18)!important;
  }
  .build-exposure-flaw,.no-safe-build-warning{
    background:linear-gradient(180deg,rgba(239,85,93,.15),rgba(239,85,93,.08))!important;
  }

  .empty-state{
    border-color:#2c3846!important;
    background:linear-gradient(180deg,#0d141c,#0a1016)!important;
  }
  .search-progress{height:4px!important;background:#0b1118!important}
  .search-progress::after{box-shadow:0 0 14px var(--accent-glow)}

  ::-webkit-scrollbar{width:10px;height:10px}
  ::-webkit-scrollbar-track{background:#080c11}
  ::-webkit-scrollbar-thumb{background:#2a3542;border:2px solid #080c11;border-radius:999px}
  ::-webkit-scrollbar-thumb:hover{background:#384757}

  @media (max-width:1260px){.grid{grid-template-columns:390px minmax(0,1fr)!important}}
  @media (max-width:980px){.grid{grid-template-columns:1fr!important}.console{position:static!important}.wrap{padding-left:16px!important;padding-right:16px!important}}
  @media (max-width:700px){
    .wrap{padding-top:20px!important}.mast-row{align-items:flex-start!important}.mast-mark{width:42px!important;height:42px!important}
    header h1{font-size:17px!important}.mast-notes{gap:6px!important}.mast-notes p{width:100%;border-radius:8px}
    .panel{border-radius:11px!important}.result-card:hover{transform:none}.grid{gap:14px!important}
  }
  @media (prefers-reduced-motion:reduce){*{transition:none!important;animation-duration:.001ms!important;animation-iteration-count:1!important}}
`;
document.head.appendChild(visualPolishStyle);
