// Extra Zone-PDA atmosphere: cracked glass, worn screen reflections, and richer
// recovered-field-device telemetry. Presentation only; calculator/search/math are untouched.
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
      <span class="glass-scuff scuff-b"></span>
      <span class="glass-chip chip-a"></span>
      <span class="glass-chip chip-b"></span>`;
    wrap.appendChild(glass);
  }

  const status = header.querySelector('.pda-statusbar');
  if (status) {
    status.classList.add('pda-statusbar-expanded');
    status.innerHTML = `
      <div class="pda-status-left">
        <span class="pda-live-dot" aria-hidden="true"></span>
        <span class="pda-device-name">RECOVERED FIELD PDA</span>
        <span class="pda-device-id">UNIT PDA-7A-119</span>
        <span class="pda-tag">ZONE NET</span>
      </div>
      <div class="pda-status-right">
        <span class="pda-telemetry"><b>LINK</b><i id="pdaLinkState">ONLINE</i></span>
        <span class="pda-signal-wrap"><b>SIGNAL</b><span id="pdaSignalText" class="pda-signal-text">▮▮▮▯▯</span></span>
        <span class="pda-telemetry"><b>LOCAL</b><i id="pdaClock">--:--</i></span>
        <span class="pda-telemetry pda-date"><b>DATE</b><i id="pdaDate">--.--.--</i></span>
        <span class="pda-telemetry"><b>SESSION</b><i id="pdaSession">00:00</i></span>
        <span class="pda-battery-wrap"><b>CELL</b><span class="pda-battery" aria-label="PDA battery"><i id="pdaBatteryFill"></i></span><em id="pdaBatteryText">N/A</em></span>
      </div>`;
  }

  if (!header.querySelector('.pda-field-strip')) {
    const strip = document.createElement('div');
    strip.className = 'pda-field-strip';
    strip.innerHTML = `
      <span><b>DEVICE</b> PDA-7A-119</span>
      <span><b>SECTOR</b> UNKNOWN</span>
      <span><b>ARCHIVE</b> LOCAL CACHE</span>
      <span><b>DOSIMETER</b> STANDBY</span>
      <span><b>MODULE</b> ARTIFACT ANALYSIS</span>
      <span class="pda-recovery-warning">SEAL BROKEN // RECOVERY LOG 03</span>`;
    status?.insertAdjacentElement('afterend', strip);
  }

  const startedAt = Date.now();

  function updateClockAndDate() {
    const now = new Date();
    const clock = document.getElementById('pdaClock');
    const date = document.getElementById('pdaDate');
    const session = document.getElementById('pdaSession');

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
    if (session) {
      const total = Math.floor((Date.now() - startedAt) / 1000);
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      session.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }

  function updateLinkState() {
    const link = document.getElementById('pdaLinkState');
    const signal = document.getElementById('pdaSignalText');
    const online = navigator.onLine;
    if (link) {
      link.textContent = online ? 'ONLINE' : 'OFFLINE';
      link.classList.toggle('is-offline', !online);
    }
    if (!signal) return;
    if (!online) {
      signal.textContent = '▯▯▯▯▯';
      signal.classList.add('is-offline');
      return;
    }
    signal.classList.remove('is-offline');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    let level = 3;
    if (connection) {
      const effective = String(connection.effectiveType || '').toLowerCase();
      if (effective.includes('slow-2g')) level = 1;
      else if (effective.includes('2g')) level = 2;
      else if (effective.includes('3g')) level = 3;
      else if (effective.includes('4g')) level = 5;
      else if (Number(connection.downlink) >= 5) level = 5;
      else if (Number(connection.downlink) >= 1.5) level = 4;
    }
    signal.textContent = '▮'.repeat(level) + '▯'.repeat(5 - level);
  }

  async function initBattery() {
    const fill = document.getElementById('pdaBatteryFill');
    const text = document.getElementById('pdaBatteryText');
    if (!fill || !text) return;

    if (typeof navigator.getBattery !== 'function') {
      text.textContent = 'N/A';
      fill.style.width = '58%';
      fill.classList.add('battery-unknown');
      return;
    }

    try {
      const battery = await navigator.getBattery();
      const refresh = () => {
        const pct = Math.round(Number(battery.level || 0) * 100);
        fill.style.width = `${Math.max(4, pct)}%`;
        fill.classList.toggle('battery-low', pct <= 20 && !battery.charging);
        text.textContent = `${pct}%${battery.charging ? ' CHG' : ''}`;
      };
      refresh();
      battery.addEventListener('levelchange', refresh);
      battery.addEventListener('chargingchange', refresh);
    } catch (_) {
      text.textContent = 'N/A';
      fill.style.width = '58%';
      fill.classList.add('battery-unknown');
    }
  }

  updateClockAndDate();
  updateLinkState();
  initBattery();
  window.setInterval(updateClockAndDate, 1000);
  window.addEventListener('online', updateLinkState);
  window.addEventListener('offline', updateLinkState);
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  connection?.addEventListener?.('change', updateLinkState);

  const style = document.createElement('style');
  style.id = 'zonePdaWeatheringStyles';
  style.textContent = `
    .wrap{isolation:isolate!important}

    .pda-glass-layer{
      position:absolute;inset:7px;z-index:90;pointer-events:none;overflow:hidden;border-radius:7px;
      box-shadow:
        inset 0 0 0 1px rgba(214,227,190,.05),
        inset 18px 0 45px rgba(220,230,198,.02),
        inset -28px -12px 70px rgba(0,0,0,.18),
        inset 0 -2px 0 rgba(255,255,255,.02);
      background:
        linear-gradient(112deg,transparent 0 9%,rgba(235,245,222,.028) 18%,transparent 34%),
        linear-gradient(78deg,transparent 54%,rgba(224,236,207,.022) 61%,transparent 69%),
        radial-gradient(ellipse at 50% 0%,rgba(220,236,199,.035),transparent 53%),
        radial-gradient(ellipse at 78% 72%,rgba(255,255,255,.018),transparent 18%);
      mix-blend-mode:screen;
    }
    .pda-glass-layer::before{
      content:"";position:absolute;inset:0;opacity:.22;
      background:
        repeating-linear-gradient(0deg,rgba(225,239,207,.018) 0 1px,transparent 1px 3px),
        radial-gradient(circle at 14% 27%,rgba(255,255,255,.10) 0 1px,transparent 1.5px),
        radial-gradient(circle at 74% 66%,rgba(255,255,255,.08) 0 1px,transparent 1.5px),
        radial-gradient(circle at 39% 84%,rgba(255,255,255,.06) 0 1px,transparent 1.4px);
      background-size:auto,73px 91px,103px 77px,81px 109px;
    }
    .pda-glass-layer::after{
      content:"";position:absolute;inset:0;
      background:radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,.38) 100%);
      mix-blend-mode:multiply;
    }

    .glass-crack{position:absolute;display:block;width:260px;height:260px;opacity:.42;filter:drop-shadow(0 0 1px rgba(216,229,198,.28))}
    .glass-crack::before,.glass-crack::after{content:"";position:absolute;inset:0;background-repeat:no-repeat;background-size:contain}
    .glass-crack::before{
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280' viewBox='0 0 280 280'%3E%3Cg fill='none' stroke='%23d8e2c7' stroke-width='.72' stroke-linecap='round' opacity='.76'%3E%3Cpath d='M32 28l54 50 19 45 48 20 23 48 62 31'/%3E%3Cpath d='M86 78l20-39m-1 84l-36 29m84-9l35-32m-12 80l-31 42m30-43l49-3'/%3E%3Cpath d='M32 28l28 88 42 41-8 70m-34-111l-33 43m75-2l41-10m2 86l40 15'/%3E%3Cpath d='M153 143l32 9 17 33 42 16m-139-78l-19 37-35 18'/%3E%3C/g%3E%3Ccircle cx='32' cy='28' r='6' fill='none' stroke='%23d8e2c7' stroke-width='.7' opacity='.62'/%3E%3Ccircle cx='32' cy='28' r='12' fill='none' stroke='%23d8e2c7' stroke-width='.5' opacity='.28'/%3E%3C/svg%3E");
    }
    .glass-crack::after{background:radial-gradient(circle at 12% 10%,rgba(255,255,255,.07),transparent 18%)}
    .crack-a{right:-34px;top:42px;transform:rotate(10deg) scale(.98)}
    .crack-b{left:1%;bottom:1%;transform:rotate(196deg) scale(.68);opacity:.25}

    .glass-scuff{position:absolute;height:1px;background:linear-gradient(90deg,transparent,rgba(223,234,205,.17),transparent);opacity:.27}
    .scuff-a{width:180px;left:27%;top:14%;transform:rotate(-8deg)}
    .scuff-b{width:135px;right:19%;bottom:12%;transform:rotate(4deg);opacity:.20}
    .glass-chip{position:absolute;width:18px;height:6px;border-top:1px solid rgba(225,234,209,.20);opacity:.30}
    .chip-a{left:16%;top:2px;transform:rotate(7deg)}
    .chip-b{right:12%;bottom:3px;transform:rotate(-5deg)}

    .pda-statusbar-expanded{
      position:relative!important;
      padding:7px 9px!important;gap:12px!important;
      display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;
      background:
        linear-gradient(90deg,rgba(117,135,76,.08),transparent 42%),
        repeating-linear-gradient(90deg,rgba(255,255,255,.014) 0 1px,transparent 1px 44px),
        #0a1008!important;
      border-top:1px solid #46513a!important;border-bottom:1px solid #26301f!important;
      box-shadow:inset 0 1px 0 rgba(193,208,145,.035)!important;
    }
    .pda-statusbar-expanded::after{
      content:"GLASS SEAL COMPROMISED";position:absolute;right:7px;bottom:-16px;
      color:#685a31;font:700 6.5px var(--mono);letter-spacing:.10em;
    }
    .pda-statusbar-expanded .pda-status-left{min-width:250px!important;gap:7px!important;flex-wrap:wrap}
    .pda-device-name{color:#aebd79}.pda-device-id{color:#66705b;padding-left:7px;border-left:1px solid #303a29}
    .pda-tag{padding:2px 5px;border:1px solid #485237;color:#d29c39;background:#17180d;font-size:8px;letter-spacing:.13em}
    .pda-statusbar-expanded .pda-status-right{gap:5px!important;flex-wrap:wrap;justify-content:flex-end!important}
    .pda-telemetry,.pda-signal-wrap,.pda-battery-wrap{
      display:inline-flex;align-items:center;gap:5px;min-height:25px;padding:3px 6px;
      border-left:1px solid #303a29;color:#879573;font:700 8px var(--mono);letter-spacing:.07em;text-transform:uppercase;
    }
    .pda-telemetry b,.pda-signal-wrap>b,.pda-battery-wrap>b{color:#5f6b55;font-size:7px;letter-spacing:.12em}
    .pda-telemetry i{font-style:normal;color:#aebb83;font-size:9px}
    .pda-telemetry i.is-offline,.pda-signal-text.is-offline{color:#cf654f!important}
    .pda-signal-text{color:#96aa68;font:800 9px var(--mono);letter-spacing:-.02em}
    .pda-battery-wrap em{font-style:normal;color:#aebb83;font-size:8px;min-width:30px}
    .pda-battery{width:27px!important;height:10px!important;background:#080c07!important;border-color:#5a6648!important}
    .pda-battery i{width:58%;transition:width .3s ease}.pda-battery i.battery-low{background:#c75d4d!important}.pda-battery i.battery-unknown{background:repeating-linear-gradient(90deg,#75815a 0 3px,#3d4634 3px 5px)!important}

    .pda-field-strip{
      display:flex;flex-wrap:wrap;gap:0;margin-top:17px;border:1px solid #252e21;border-top:0;
      background:rgba(8,13,7,.78);color:#69745f;font:700 7.5px var(--mono);letter-spacing:.08em;text-transform:uppercase;
    }
    .pda-field-strip>span{padding:4px 8px;border-right:1px solid #252e21}.pda-field-strip b{color:#4f5b49;margin-right:4px}
    .pda-recovery-warning{margin-left:auto;color:#9a7131!important;border-right:0!important}

    .panel,.console,.total-stats-sheet,.result-card{position:relative}
    .panel,.console,.total-stats-sheet{
      background-image:
        linear-gradient(180deg,rgba(18,27,15,.965),rgba(10,15,8,.98)),
        repeating-linear-gradient(96deg,transparent 0 93px,rgba(210,220,180,.012) 94px,transparent 95px 137px)!important;
    }
    .panel::after,.console::after,.total-stats-sheet::after,.result-card::after{pointer-events:none!important}

    @media(max-width:980px){
      .pda-statusbar-expanded{grid-template-columns:1fr!important;align-items:flex-start!important}
      .pda-statusbar-expanded .pda-status-right{justify-content:flex-start!important}
      .glass-crack{opacity:.22}.crack-a{right:-85px}.crack-b{display:none}
      .pda-recovery-warning{margin-left:0}
    }
    @media(max-width:640px){
      .pda-date{display:none!important}.pda-field-strip>span:nth-child(n+4){display:none}
      .pda-statusbar-expanded .pda-status-left{min-width:0!important}.pda-device-id{display:none}
      .pda-glass-layer{opacity:.55}
    }
    @media(prefers-reduced-motion:reduce){.pda-battery i{transition:none}}
  `;
  document.head.appendChild(style);
})();
