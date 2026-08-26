// Extra Zone-PDA atmosphere: cracked glass, worn screen reflections, and richer
// field-device telemetry. Presentation only; calculator/search/math are untouched.

(function addZonePdaWeathering() {
  const wrap = document.querySelector('.wrap');
  const header = document.querySelector('header');
  if (!wrap || !header) return;

  if (!wrap.querySelector('.pda-glass-layer')) {
    const glass = document.createElement('div');
    glass.className = 'pda-glass-layer';
    glass.setAttribute('aria-hidden', 'true');
    glass.innerHTML = `
      <span class="glass-crack crack-a"></span>
      <span class="glass-crack crack-b"></span>
      <span class="glass-scuff scuff-a"></span>
      <span class="glass-scuff scuff-b"></span>`;
    wrap.appendChild(glass);
  }

  let status = header.querySelector('.pda-statusbar');
  if (status) {
    status.classList.add('pda-statusbar-expanded');
    status.innerHTML = `
      <div class="pda-status-left">
        <span class="pda-live-dot" aria-hidden="true"></span>
        <span class="pda-device-name">FIELD PDA // ARTIFACT ANALYSIS</span>
        <span class="pda-tag">ZONE NET</span>
      </div>
      <div class="pda-status-right">
        <span class="pda-telemetry" title="Decorative device status"><b>SECTOR</b><i>03</i></span>
        <span class="pda-telemetry pda-dosimeter" title="Decorative PDA dosimeter readout"><b>DOSIMETER</b><i>0.42 µSv/h</i></span>
        <span class="pda-signal-wrap"><b>SIGNAL</b><span class="pda-signal-bars" aria-label="Signal 3 of 5"><i></i><i></i><i></i><i></i><i></i></span></span>
        <span class="pda-telemetry"><b>LOCAL</b><i id="pdaClock">--:--</i></span>
        <span class="pda-telemetry pda-date"><b>DATE</b><i id="pdaDate">--.--.--</i></span>
        <span class="pda-battery-wrap"><b>CELL</b><span class="pda-battery" aria-label="PDA battery"><i></i></span><em id="pdaBatteryText">74%</em></span>
      </div>`;
  }

  if (!header.querySelector('.pda-field-strip')) {
    const strip = document.createElement('div');
    strip.className = 'pda-field-strip';
    strip.innerHTML = `
      <span><b>DEVICE</b> PDA-7A-119</span>
      <span><b>CHANNEL</b> 12.4 / ENC</span>
      <span><b>MAP CACHE</b> OFFLINE</span>
      <span><b>ANOMALY INDEX</b> <i class="pda-warning-text">ELEVATED</i></span>
      <span><b>LAST SYNC</b> LOCAL CACHE</span>`;
    status?.insertAdjacentElement('afterend', strip);
  }

  function updateClockAndDate() {
    const now = new Date();
    const clock = document.getElementById('pdaClock');
    const date = document.getElementById('pdaDate');
    if (clock) {
      clock.textContent = new Intl.DateTimeFormat([], {
        hour: '2-digit', minute: '2-digit', hour12: false
      }).format(now);
    }
    if (date) {
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      date.textContent = `${dd}.${mm}.${yy}`;
    }
  }
  updateClockAndDate();
  window.setInterval(updateClockAndDate, 30000);

  const batteryFill = () => document.querySelector('.pda-battery > i');
  const batteryText = () => document.getElementById('pdaBatteryText');
  function paintBattery(level, charging = false) {
    const pct = Math.max(4, Math.min(100, Math.round(Number(level) * 100)));
    const fill = batteryFill();
    const text = batteryText();
    if (fill) fill.style.width = `${pct}%`;
    if (text) text.textContent = `${pct}%${charging ? ' ⚡' : ''}`;
  }
  paintBattery(.74, false);

  if (typeof navigator.getBattery === 'function') {
    navigator.getBattery().then(battery => {
      const refresh = () => paintBattery(battery.level, battery.charging);
      refresh();
      battery.addEventListener('levelchange', refresh);
      battery.addEventListener('chargingchange', refresh);
    }).catch(() => {});
  }

  const style = document.createElement('style');
  style.id = 'zonePdaWeatheringStyles';
  style.textContent = `
    .wrap{isolation:isolate!important}

    .pda-glass-layer{
      position:absolute;inset:7px;z-index:90;pointer-events:none;overflow:hidden;border-radius:7px;
      box-shadow:
        inset 0 0 0 1px rgba(214,227,190,.045),
        inset 18px 0 45px rgba(220,230,198,.018),
        inset -28px -12px 70px rgba(0,0,0,.14);
      background:
        linear-gradient(112deg,transparent 0 10%,rgba(235,245,222,.022) 19%,transparent 33%),
        linear-gradient(78deg,transparent 54%,rgba(224,236,207,.018) 61%,transparent 69%),
        radial-gradient(ellipse at 50% 0%,rgba(220,236,199,.025),transparent 53%);
      mix-blend-mode:screen;
    }
    .pda-glass-layer::before{
      content:"";position:absolute;inset:0;opacity:.17;
      background:
        repeating-linear-gradient(0deg,rgba(225,239,207,.018) 0 1px,transparent 1px 3px),
        radial-gradient(circle at 14% 27%,rgba(255,255,255,.09) 0 1px,transparent 1.5px),
        radial-gradient(circle at 74% 66%,rgba(255,255,255,.075) 0 1px,transparent 1.5px),
        radial-gradient(circle at 39% 84%,rgba(255,255,255,.055) 0 1px,transparent 1.4px);
      background-size:auto,73px 91px,103px 77px,81px 109px;
    }
    .pda-glass-layer::after{
      content:"";position:absolute;inset:0;
      background:radial-gradient(ellipse at center,transparent 62%,rgba(0,0,0,.31) 100%);
      mix-blend-mode:multiply;
    }

    .glass-crack{position:absolute;display:block;width:210px;height:210px;opacity:.34;filter:drop-shadow(0 0 1px rgba(216,229,198,.24))}
    .glass-crack::before,.glass-crack::after{content:"";position:absolute;inset:0;background-repeat:no-repeat;background-size:contain}
    .glass-crack::before{
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cg fill='none' stroke='%23d8e2c7' stroke-width='.72' stroke-linecap='round' opacity='.72'%3E%3Cpath d='M18 18l46 43 17 38 40 18 19 41 54 25'/%3E%3Cpath d='M63 61l18-33m0 70l-31 24m70-5l29-27m-9 68l-28 35m27-36l41-2'/%3E%3Cpath d='M18 18l23 76 36 35-7 58m-29-93l-28 36m64-1l35-8m0 72l34 12'/%3E%3C/g%3E%3Ccircle cx='18' cy='18' r='5' fill='none' stroke='%23d8e2c7' stroke-width='.7' opacity='.55'/%3E%3C/svg%3E");
    }
    .glass-crack::after{background:radial-gradient(circle at 9% 9%,rgba(255,255,255,.05),transparent 17%)}
    .crack-a{right:-26px;top:58px;transform:rotate(8deg) scale(.94)}
    .crack-b{left:2%;bottom:3%;transform:rotate(194deg) scale(.62);opacity:.21}

    .glass-scuff{position:absolute;height:1px;background:linear-gradient(90deg,transparent,rgba(223,234,205,.15),transparent);opacity:.24}
    .scuff-a{width:170px;left:27%;top:14%;transform:rotate(-8deg)}
    .scuff-b{width:120px;right:19%;bottom:12%;transform:rotate(4deg);opacity:.17}

    .pda-statusbar-expanded{padding:7px 9px!important;gap:12px!important;background:linear-gradient(180deg,#10160d,#0a1008)!important;box-shadow:inset 0 1px 0 rgba(193,208,145,.035)!important}
    .pda-statusbar-expanded .pda-status-left{min-width:250px!important;gap:8px!important;flex-wrap:wrap}
    .pda-device-name{color:#aebd79}
    .pda-tag{padding:2px 5px;border:1px solid #485237;color:#d29c39;background:#17180d;font-size:8px;letter-spacing:.13em}
    .pda-statusbar-expanded .pda-status-right{gap:6px!important;flex-wrap:wrap;justify-content:flex-end}
    .pda-telemetry,.pda-signal-wrap,.pda-battery-wrap{
      display:inline-flex;align-items:center;gap:5px;min-height:25px;padding:3px 6px;
      border:1px solid #303a29;background:#0a1008;color:#879573;
      font:700 8px var(--mono);letter-spacing:.07em;text-transform:uppercase;
    }
    .pda-telemetry b,.pda-signal-wrap>b,.pda-battery-wrap>b{color:#5f6b55;font-size:7px;letter-spacing:.12em}
    .pda-telemetry i{font-style:normal;color:#aebb83;font-size:9px}
    .pda-dosimeter i{color:#d7a03b}
    .pda-signal-bars{display:inline-flex;align-items:flex-end;gap:2px;height:11px}
    .pda-signal-bars i{display:block;width:3px;background:#8fa862;border:1px solid rgba(181,199,127,.18)}
    .pda-signal-bars i:nth-child(1){height:3px}.pda-signal-bars i:nth-child(2){height:5px}.pda-signal-bars i:nth-child(3){height:7px}.pda-signal-bars i:nth-child(4){height:9px;background:#283126}.pda-signal-bars i:nth-child(5){height:11px;background:#283126}
    .pda-battery-wrap{gap:5px}.pda-battery-wrap em{font-style:normal;color:#aebb83;font-size:8px;min-width:25px}
    .pda-battery{width:25px!important;height:10px!important;background:#080c07!important}.pda-battery i{width:74%;transition:width .3s ease}

    .pda-field-strip{
      display:flex;flex-wrap:wrap;gap:0;margin-top:5px;border:1px solid #252e21;border-top:0;
      background:rgba(8,13,7,.75);color:#69745f;font:700 7.5px var(--mono);letter-spacing:.08em;text-transform:uppercase;
    }
    .pda-field-strip>span{padding:4px 8px;border-right:1px solid #252e21}
    .pda-field-strip b{color:#4f5b49;margin-right:4px}
    .pda-warning-text{font-style:normal;color:#cf9432}

    .panel,.console,.total-stats-sheet,.result-card{position:relative}
    .panel::after,.console::after,.total-stats-sheet::after,.result-card::after{
      pointer-events:none!important;
    }

    @media(max-width:980px){
      .pda-statusbar-expanded{align-items:flex-start!important;flex-direction:column!important}
      .pda-statusbar-expanded .pda-status-right{justify-content:flex-start!important}
      .glass-crack{opacity:.20}.crack-a{right:-80px}.crack-b{display:none}
    }
    @media(max-width:640px){
      .pda-date,.pda-dosimeter{display:none!important}
      .pda-field-strip>span:nth-child(n+4){display:none}
      .pda-statusbar-expanded .pda-status-left{min-width:0!important}
    }
    @media(prefers-reduced-motion:reduce){.pda-battery i{transition:none}}
  `;
  document.head.appendChild(style);
})();
