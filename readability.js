// Readability pass: the calculator started intentionally dense, but the Finder now
// displays enough information that the original small text is difficult to scan.
// These overrides make the default desktop UI larger without changing calculations.

const readabilityStyle = document.createElement('style');
readabilityStyle.id = 'readabilityStyle';
readabilityStyle.textContent = `
  body{font-size:15px!important;line-height:1.55!important}
  .wrap{max-width:1600px!important;padding:30px 26px 76px!important}
  header h1{font-size:19px!important}
  header p,.mast-notes p{font-size:13px!important}
  .grid{grid-template-columns:430px minmax(0,1fr)!important;gap:22px!important}
  .panel{padding:18px 18px 19px!important}
  .panel h2{font-size:12px!important;margin-bottom:14px!important}
  .panel-hint{font-size:13px!important;line-height:1.5!important}
  .field{font-size:13px!important;gap:7px!important}
  .field>span{font-size:11.5px!important}
  input[type="number"],input[type="search"],select{height:43px!important;padding:0 11px!important;font-size:13.5px!important}
  .item-search{height:40px!important;font-size:13px!important;margin-bottom:7px!important}
  .mode-toggle-btn{font-size:12px!important;padding:9px 7px!important}
  .primary-button,.secondary-button{height:42px!important;font-size:13px!important}
  .mini-button{height:33px!important;font-size:11.5px!important}
  .container-meta small,.armor-meta small{font-size:10px!important}
  .container-meta strong,.armor-meta strong{font-size:13px!important}
  .switch-row{padding:11px!important;gap:10px!important}
  .switch-row strong{font-size:13px!important}
  .switch-row small{font-size:11.5px!important;line-height:1.45!important}
  .pool-count,.slot-count-line{font-size:12.5px!important}
  .requirement-group-title,.priority-group-title{font-size:10px!important}
  .requirement-toggle,.priority-stat-name{font-size:12.5px!important}
  .requirement-row select,.requirement-row input{height:38px!important;font-size:12.5px!important}
  .requirement-help,.priority-help,.finder-tier-summary,.quality-strategy-summary{font-size:11.5px!important}
  .priority-level-button{height:29px!important;font-size:10px!important}
  .finder-tier-head>span,.search-style-switch>span,.priority-filter>span,.requirement-search>span{font-size:11px!important}
  .finder-tier-mode-btn,.search-style-button{height:34px!important;font-size:11px!important}
  .quality-strategy-head strong{font-size:13px!important}
  .quality-strategy-head span{font-size:11.5px!important}
  .quality-strategy-button{height:37px!important;font-size:12px!important}

  .result-card{padding:15px!important;border-radius:10px!important}
  .result-card-head strong{font-size:11.5px!important}
  .match-badge,.target-fit-badge{font-size:10.5px!important;min-height:25px!important}
  .result-artifacts{grid-template-columns:repeat(auto-fit,minmax(175px,1fr))!important;gap:8px!important}
  .result-artifact{padding:11px 12px!important;gap:3px!important}
  .result-artifact strong{font-size:14.5px!important}
  .result-artifact span{font-size:11.5px!important}
  .result-artifact small{font-size:10.5px!important}
  .artifact-outcome-stats{gap:4px!important;margin-top:10px!important;padding-top:9px!important}
  .artifact-outcome-stat{font-size:11px!important;min-height:23px!important}
  .artifact-outcome-stat>b{font-size:10.5px!important}
  .artifact-outcome-stat em{font-size:9px!important;padding:3px 5px!important}
  .requirement-pill{font-size:11px!important;padding:5px 8px!important}
  .result-cost{font-size:10.5px!important}
  .use-build{height:34px!important;font-size:11px!important}
  .empty-state strong{font-size:14px!important}.empty-state span{font-size:12.5px!important}

  .equipment-target-heading strong{font-size:13px!important}.equipment-target-heading span{font-size:11.5px!important}
  .equipment-preview-row,.equipment-contribution-row{font-size:11.5px!important}
  .equipment-contribution-row>strong{font-size:12px!important}
  .equipment-contribution-values small{font-size:9.5px!important}.equipment-contribution-values b{font-size:10.5px!important}
  .build-exposure-safe>strong,.build-exposure-warning>strong{font-size:10.5px!important}
  .exposure-chip{font-size:9.5px!important;padding:4px 6px!important}

  .results-column{grid-template-columns:minmax(0,1fr) 350px!important}
  .total-stats-sheet{padding:18px 19px 19px!important}
  .total-sheet-head h2{font-size:20px!important}
  #totalStatsContext{font-size:11.5px!important}
  .final-group-heading{height:27px!important;font-size:10.5px!important}
  .final-stat-row{min-height:31px!important;font-size:15px!important;gap:12px!important}
  .final-stat-values>b{min-width:62px!important;font-size:14.5px!important}
  .stat-delta{min-width:82px!important;font-size:11px!important;padding:4px 7px!important}

  .artifact-slot{padding:12px!important}.slot-topline h3{font-size:13.5px!important}.slot-label,.rarity-pill{font-size:10px!important}

  @media(max-width:1260px){
    .grid{grid-template-columns:390px minmax(0,1fr)!important}
    .results-column{grid-template-columns:1fr!important}
  }
  @media(max-width:900px){
    .wrap{padding:20px 14px 60px!important}
    .grid{grid-template-columns:1fr!important}
    .controls-column{width:100%!important}
  }
  @media(max-width:700px){
    body{font-size:14px!important}
    .result-artifacts{grid-template-columns:1fr!important}
    .final-stat-row{font-size:13.5px!important}
    .final-stat-values>b{font-size:13.5px!important}
  }
`;
document.head.appendChild(readabilityStyle);
