// Extra Zone PDA weathering + live field-status flavor.
// Presentation only. Search/math behavior is untouched.
(function enhanceRecoveredPda() {
  const root = document.querySelector('.wrap');
  const header = document.querySelector('header');
  if (!root || !header) return;

  // Glass overlay: hairline cracks, scratches, grime and edge reflections.
  if (!root.querySelector('.pda-glass-overlay')) {
    const glass = document.createElement('div');
    glass.className = 'pda-glass-overlay';
    glass.setAttribute('aria-hidden', 'true');
    root.appendChild(glass);
  }

  // Expand the existing status bar into a more convincing recovered field device.
  const status = header.querySelector('.pda-statusbar');
  if (status && !status.querySelector('.pda-field-readouts')) {
    const left = status.querySelector('.pda-status-left');
    const right = status.querySelector('.pda-status-right');

    if (left) {
      left.innerHTML = `
        <span class="pda-live-dot" aria-hidden="true"></span>
        <span class="pda-device-title">RECOVERED FIELD PDA</span>
        <span class="pda-device-id">UNIT PDA-7A-119</span>
      `;
    }

    if (right) {
      right.innerHTML = `
        <span class="pda-readout"><small>LINK</small><b id="pdaLinkState">ONLINE</b></span>
        <span class="pda-readout"><small>SIGNAL</small><b id="pdaSignalBars">▮▮▮▯▯</b></span>
        <span class="pda-readout"><small>LOCAL</small><b id="pdaClock">--:--</b></span>
        <span class="pda-readout"><small>SESSION</small><b id="pdaSession">00:00</b></span>
        <span class="pda-readout pda-battery-readout"><small>BAT</small><b id="pdaBatteryText">N/A</b><span class="pda-battery" aria-label="PDA battery"><i id="pdaBatteryFill"></i></span></span>
      `;
    }

    const secondary = document.createElement('div');
    secondary.className = 'pda-field-readouts';
    secondary.innerHTML = `
      <span><i class="pda-status-icon">☢</i> DOSIMETER <b>STANDBY</b></span>
      <span>SECTOR <b>UNKNOWN</b></span>
      <span>ARCHIVE <b>LOCAL</b></span>
      <span>MODULE <b>ARTIFACT ANALYSIS</b></span>
      <span class="pda-recovered-mark">SEAL BROKEN // FIELD RECOVERY UNIT</span>
    `;
    status.insertAdjacentElement('afterend', secondary);
  }

  const startedAt = Date.now();

  function updateClockAndSession() {
    const clock = document.getElementById('pdaClock');
    if (clock) {
      clock.textContent = new Intl.DateTimeFormat([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date());
    }

    const session = document.getElementById('pdaSession');
    if (session) {
      const total = Math.floor((Date.now() - startedAt) / 1000);
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      session.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }

  function updateLinkState() {
    const link = document.getElementById('pdaLinkState');
    const bars = document.getElementById('pdaSignalBars');
    if (link) {
      link.textContent = navigator.onLine ? 'ONLINE' : 'OFFLINE';
      link.classList.toggle('is-offline', !navigator.onLine);
    }

    if (bars) {
      if (!navigator.onLine) {
        bars.textContent = '▯▯▯▯▯';
        return;
      }
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
      bars.textContent = '▮'.repeat(level) + '▯'.repeat(5 - level);
    }
  }

  async function initBattery() {
    const label = document.getElementById('pdaBatteryText');
    const fill = document.getElementById('pdaBatteryFill');
    if (!label || !fill) return;

    if (!navigator.getBattery) {
      label.textContent = 'N/A';
      fill.style.width = '58%';
      fill.classList.add('battery-unknown');
      return;
    }

    try {
      const battery = await navigator.getBattery();
      const render = () => {
        const pct = Math.round(Number(battery.level || 0) * 100);
        label.textContent = `${pct}%${battery.charging ? ' CHG' : ''}`;
        fill.style.width = `${Math.max(4, pct)}%`;
        fill.classList.toggle('battery-low', pct <= 20 && !battery.charging);
      };
      render();
      battery.addEventListener('levelchange', render);
      battery.addEventListener('chargingchange', render);
    } catch (_) {
      label.textContent = 'N/A';
      fill.style.width = '58%';
      fill.classList.add('battery-unknown');
    }
  }

  updateClockAndSession();
  updateLinkState();
  initBattery();
  setInterval(updateClockAndSession, 1000);
  window.addEventListener('online', updateLinkState);
  window.addEventListener('offline', updateLinkState);
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  connection?.addEventListener?.('change', updateLinkState);

  const style = document.createElement('style');
  style.id = 'pdaWeatheringStyles';
  style.textContent = `
    .zone-pda-theme .wrap{
      isolation:isolate!important;
      box-shadow:
        0 0 0 2px #0e110c,
        0 0 0 4px #57513b,
        0 0 0 7px #23251b,
        0 34px 80px rgba(0,0,0,.74),
        inset 0 0 95px rgba(0,0,0,.34)!important;
    }

    .zone-pda-theme .pda-glass-overlay{
      position:absolute;
      inset:10px;
      z-index:120;
      pointer-events:none;
      border-radius:7px;
      overflow:hidden;
      opacity:.72;
      mix-blend-mode:screen;
      background:
        radial-gradient(ellipse at 26% 18%,rgba(225,235,207,.055),transparent 25%),
        radial-gradient(ellipse at 76% 66%,rgba(225,235,207,.035),transparent 22%),
        linear-gradient(112deg,transparent 0 31%,rgba(255,255,255,.018) 31.2% 31.45%,transparent 31.7% 100%),
        repeating-linear-gradient(104deg,transparent 0 118px,rgba(225,235,207,.018) 119px,transparent 120px 173px);
      box-shadow:
        inset 0 0 0 1px rgba(215,225,194,.07),
        inset 0 0 80px rgba(255,255,255,.015),
        inset 0 -35px 70px rgba(0,0,0,.20);
    }

    .zone-pda-theme .pda-glass-overlay::before,
    .zone-pda-theme .pda-glass-overlay::after{
      content:"";
      position:absolute;
      pointer-events:none;
      opacity:.48;
      filter:drop-shadow(0 0 1px rgba(220,230,205,.20));
      background-repeat:no-repeat;
      background-size:contain;
    }

    /* Upper-right impact with branching hairline cracks. */
    .zone-pda-theme .pda-glass-overlay::before{
      width:360px;height:300px;right:-22px;top:-8px;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 300'%3E%3Cg fill='none' stroke='%23d7e1c7' stroke-width='.8' stroke-linecap='round' opacity='.72'%3E%3Cpath d='M292 48l-43 31-29 51-47 28-31 53-58 34'/%3E%3Cpath d='M290 49l-12 47 18 44-22 42 11 69'/%3E%3Cpath d='M288 51l-54 1-46 26-58-7-49 30'/%3E%3Cpath d='M248 80l-8 37-31 24-14 50-38 34'/%3E%3Cpath d='M219 131l30 18 5 29 37 25'/%3E%3Cpath d='M174 158l-5 32-35 13-8 37'/%3E%3Cpath d='M278 96l-31 13-13 25'/%3E%3Cpath d='M295 141l27 18 9 34'/%3E%3Ccircle cx='290' cy='49' r='7'/%3E%3Ccircle cx='290' cy='49' r='13' opacity='.42'/%3E%3C/g%3E%3C/svg%3E");
    }

    /* Lower-left fracture, lighter so it doesn't cover controls. */
    .zone-pda-theme .pda-glass-overlay::after{
      width:285px;height:250px;left:-18px;bottom:-28px;opacity:.28;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 285 250'%3E%3Cg fill='none' stroke='%23d7e1c7' stroke-width='.75' stroke-linecap='round'%3E%3Cpath d='M38 205l47-35 28-48 51-23 29-50'/%3E%3Cpath d='M82 171l-4-36 26-25-3-42'/%3E%3Cpath d='M115 123l43 8 24-20 43 4'/%3E%3Cpath d='M159 100l14 28-12 31 30 25'/%3E%3Cpath d='M105 109l-35 3-22-27'/%3E%3C/g%3E%3C/svg%3E");
    }

    .zone-pda-theme header{
      z-index:2!important;
    }

    .zone-pda-theme .pda-statusbar{
      position:relative;
      display:grid!important;
      grid-template-columns:minmax(0,1fr) auto!important;
      gap:14px!important;
      padding:7px 9px!important;
      border-top:1px solid #4a543d!important;
      border-bottom:1px solid #273020!important;
      border-right:1px solid #273020!important;
      border-left:3px solid #96a961!important;
      background:
        linear-gradient(90deg,rgba(117,135,76,.08),transparent 42%),
        repeating-linear-gradient(90deg,rgba(255,255,255,.016) 0 1px,transparent 1px 44px),
        #0b1009!important;
      box-shadow:inset 0 1px 0 rgba(209,221,179,.025)!important;
    }

    .zone-pda-theme .pda-statusbar::after{
      content:"RECOVERY LOG 03 // GLASS SEAL COMPROMISED";
      position:absolute;
      right:8px;bottom:-17px;
      color:#685c34;
      font:700 7px var(--mono);
      letter-spacing:.10em;
    }

    .zone-pda-theme .pda-status-left{
      gap:8px!important;min-width:0;flex-wrap:wrap!important;
    }
    .zone-pda-theme .pda-device-title{color:#b9c77e!important}
    .zone-pda-theme .pda-device-id{
      color:#696f59!important;
      padding-left:8px;
      border-left:1px solid #343c2d;
    }

    .zone-pda-theme .pda-status-right{
      display:flex!important;
      align-items:center!important;
      justify-content:flex-end!important;
      gap:6px!important;
      flex-wrap:wrap!important;
    }

    .zone-pda-theme .pda-readout{
      display:grid;
      grid-template-columns:auto;
      gap:1px;
      min-width:62px;
      padding:3px 6px;
      border-left:1px solid #2e3728;
      color:#95a575!important;
      line-height:1.1;
    }
    .zone-pda-theme .pda-readout small{
      color:#59634e;
      font:700 6.5px var(--mono);
      letter-spacing:.12em;
    }
    .zone-pda-theme .pda-readout b{
      color:#aab97a;
      font:800 9px var(--mono);
      letter-spacing:.06em;
      white-space:nowrap;
    }
    .zone-pda-theme .pda-readout b.is-offline{color:#cf654f!important}

    .zone-pda-theme .pda-battery-readout{
      grid-template-columns:auto auto;
      align-items:center;
      column-gap:5px;
    }
    .zone-pda-theme .pda-battery-readout small{grid-column:1/-1}
    .zone-pda-theme .pda-battery{
      width:27px!important;height:10px!important;
      border-color:#5e6b4b!important;
      background:#080b07!important;
    }
    .zone-pda-theme .pda-battery i{
      width:58%;
      transition:width .25s ease;
      background:#9fb86c!important;
    }
    .zone-pda-theme .pda-battery i.battery-low{background:#cb664f!important}
    .zone-pda-theme .pda-battery i.battery-unknown{background:repeating-linear-gradient(90deg,#77825c 0 3px,#3c4434 3px 5px)!important}

    .zone-pda-theme .pda-field-readouts{
      display:flex;
      align-items:center;
      gap:7px;
      flex-wrap:wrap;
      margin:18px 0 2px;
      padding:5px 7px;
      border-top:1px dashed #30382a;
      border-bottom:1px dashed #20271c;
      color:#68725e;
      font:700 7.5px var(--mono);
      letter-spacing:.09em;
      text-transform:uppercase;
    }
    .zone-pda-theme .pda-field-readouts span{
      padding-right:8px;
      border-right:1px solid #293124;
    }
    .zone-pda-theme .pda-field-readouts span:last-child{border-right:0}
    .zone-pda-theme .pda-field-readouts b{color:#899965}
    .zone-pda-theme .pda-status-icon{color:#c79332;font-style:normal;margin-right:3px}
    .zone-pda-theme .pda-recovered-mark{margin-left:auto;color:#8b6b34!important}

    /* Extra chipped/scratched edges and aged screen tone. */
    .zone-pda-theme .panel,
    .zone-pda-theme .console,
    .zone-pda-theme .total-stats-sheet{
      background-image:
        linear-gradient(180deg,rgba(18,27,15,.965),rgba(10,15,8,.98)),
        repeating-linear-gradient(96deg,transparent 0 93px,rgba(210,220,180,.012) 94px,transparent 95px 137px)!important;
    }

    .zone-pda-theme .result-card:nth-child(odd){
      box-shadow:5px 7px 0 rgba(0,0,0,.25),inset 0 0 26px rgba(93,111,62,.018)!important;
    }

    .zone-pda-theme .primary-button{
      text-shadow:0 1px 0 rgba(255,255,255,.12);
      background-image:
        linear-gradient(180deg,#d49a31,#a96f1f),
        repeating-linear-gradient(110deg,transparent 0 12px,rgba(0,0,0,.08) 13px,transparent 14px)!important;
    }

    @media(max-width:980px){
      .zone-pda-theme .pda-statusbar{grid-template-columns:1fr!important}
      .zone-pda-theme .pda-status-right{justify-content:flex-start!important}
      .zone-pda-theme .pda-glass-overlay::before{width:270px;height:225px;opacity:.38}
      .zone-pda-theme .pda-field-readouts{margin-top:19px}
      .zone-pda-theme .pda-recovered-mark{margin-left:0}
    }

    @media(max-width:700px){
      .zone-pda-theme .pda-readout{min-width:54px;padding:3px 4px}
      .zone-pda-theme .pda-device-id{display:none}
      .zone-pda-theme .pda-glass-overlay{opacity:.45}
      .zone-pda-theme .pda-glass-overlay::after{display:none}
    }
  `;
  document.head.appendChild(style);
})();
