// Rough artifact pricing extension.
// Recreates the general $ / $$ / $$$ / $$$$ budget idea from the public Calzone
// reference without copying its optimizer code. These are static rough estimates,
// not live market prices, and exact Potential (+0 through +15) is intentionally not
// priced separately yet.

const ROUGH_ARTIFACT_PRICES = {
  "Acid Crystal": {100:10000,115:15000,130:20000,145:30000,160:30000,175:30000},
  "Amberite": {100:45000,115:90000,130:300000,145:1000000,160:1000000,175:1000000},
  "Atom": {100:200000,115:700000,130:3000000,145:12000000,160:12000000,175:12000000},
  "Battery": {100:10000,115:15000,130:30000,145:100000,160:100000,175:100000},
  "Berry": {100:10000,115:15000,130:20000,145:30000,160:30000,175:30000},
  "Bismuth": {100:50000,115:85000,130:250000,145:700000,160:700000,175:700000},
  "Black Hole": {100:130000,115:500000,130:2000000,145:12000000,160:12000000,175:12000000},
  "Bracelet": {100:100000,115:450000,130:3000000,145:10000000,160:10000000,175:10000000},
  "Bubblegum": {100:350000,115:1500000,130:22000000,145:70000000,160:70000000,175:70000000},
  "Burr": {100:10000,115:15000,130:20000,145:30000,160:30000,175:30000},
  "Candlelight": {100:10000,115:15000,130:20000,145:35000,160:35000,175:35000},
  "Chicken God": {100:30000,115:50000,130:200000,145:700000,160:700000,175:700000},
  "Chilly": {100:200000,115:1000000,130:6000000,145:30000000,160:30000000,175:30000000},
  "Coil": {100:150000,115:500000,130:5000000,145:15000000,160:15000000,175:15000000},
  "Colophony": {100:50000,115:150000,130:200000,145:1500000,160:1500000,175:1500000},
  "Comet": {100:10000,115:15000,130:35000,145:80000,160:80000,175:80000},
  "Cone": {100:100000,115:200000,130:500000,145:1000000,160:1000000,175:1000000},
  "Crust": {100:10000,115:15000,130:20000,145:30000,160:30000,175:30000},
  "Cryogen": {100:10000,115:15000,130:40000,145:120000,160:120000,175:120000},
  "Crystal of Inside Out": {100:35000,115:80000,130:200000,145:650000,160:650000,175:650000},
  "Cursed Rose": {100:10000,115:20000,130:120000,145:1000000,160:1000000,175:1000000},
  "Cycle": {100:150000,115:250000,130:2000000,145:8000000,160:8000000,175:8000000},
  "Dark Crystal": {100:10000,115:15000,130:30000,145:300000,160:300000,175:300000},
  "Dark Viburnum": {100:170000,115:1200000,130:8000000,145:30000000,160:30000000,175:30000000},
  "Disintegrator": {100:10000,115:15000,130:50000,145:100000,160:100000,175:100000},
  "Dumbbell": {100:40000,115:60000,130:200000,145:3000000,160:3000000,175:3000000},
  "Egg": {100:150000,115:300000,130:800000,145:3000000,160:3000000,175:3000000},
  "Embryo": {100:10000,115:15000,130:20000,145:30000,160:30000,175:30000},
  "Eye of the Storm": {100:150000,115:300000,130:500000,145:1500000,160:1500000,175:1500000},
  "Fahrenheit": {100:25000,115:45000,130:200000,145:1500000,160:1500000,175:1500000},
  "Firebird": {100:10000,115:15000,130:30000,145:250000,160:250000,175:250000},
  "Flicker": {100:50000,115:75000,130:300000,145:3000000,160:3000000,175:3000000},
  "Fossil": {100:150000,115:500000,130:3000000,145:13000000,160:13000000,175:13000000},
  "Frame": {100:60000,115:90000,130:600000,145:1500000,160:1500000,175:1500000},
  "Frost": {100:15000,115:25000,130:35000,145:50000,160:50000,175:50000},
  "Gills": {100:50000,115:100000,130:500000,145:2000000,160:2000000,175:2000000},
  "Golden Prima": {100:15000,115:70000,130:200000,145:850000,160:850000,175:850000},
  "Gum": {100:50000,115:100000,130:200000,145:800000,160:800000,175:800000},
  "Heart": {100:10000,115:15000,130:20000,145:30000,160:30000,175:30000},
  "Hedgehog": {100:20000,115:40000,130:100000,145:300000,160:300000,175:300000},
  "Heel": {100:60000,115:100000,130:800000,145:3000000,160:3000000,175:3000000},
  "Helium": {100:50000,115:250000,130:1300000,145:5000000,160:5000000,175:5000000},
  "Hoop": {100:75000,115:250000,130:1200000,145:4000000,160:4000000,175:4000000},
  "Ice Hedgehog": {100:10000,115:40000,130:200000,145:850000,160:850000,175:850000},
  "Ilyich Lamp": {100:20000,115:50000,130:150000,145:500000,160:500000,175:500000},
  "Inkwell": {100:10000,115:20000,130:35000,145:60000,160:60000,175:60000},
  "Inside Out Rose": {100:40000,115:60000,130:500000,145:5000000,160:5000000,175:5000000},
  "Jelly": {100:40000,115:150000,130:500000,145:1800000,160:1800000,175:1800000},
  "Kettlebell": {100:10000,115:20000,130:35000,145:100000,160:100000,175:100000},
  "Lard": {100:10000,115:12000,130:15000,145:35000,160:35000,175:35000},
  "Larva": {100:60000,115:80000,130:130000,145:600000,160:600000,175:600000},
  "Leaded Glass": {100:15000,115:30000,130:50000,145:100000,160:100000,175:100000},
  "Leech": {100:10000,115:12000,130:15000,145:20000,160:20000,175:20000},
  "Lemna": {100:10000,115:30000,130:60000,145:120000,160:120000,175:120000},
  "Link": {100:150000,115:600000,130:4000000,145:17000000,160:17000000,175:17000000},
  "Lollipop": {100:10000,115:12000,130:20000,145:40000,160:40000,175:40000},
  "Loop": {100:150000,115:500000,130:1500000,145:8000000,160:8000000,175:8000000},
  "Magma": {100:160000,115:800000,130:8000000,145:28000000,160:28000000,175:28000000},
  "Mirror": {100:35000,115:55000,130:150000,145:500000,160:500000,175:500000},
  "Mug": {100:60000,115:80000,130:200000,145:1500000,160:1500000,175:1500000},
  "Onion": {100:10000,115:12000,130:15000,145:20000,160:20000,175:20000},
  "Opal": {100:400000,115:2500000,130:18000000,145:70000000,160:70000000,175:70000000},
  "Peg-Top": {100:90000,115:150000,130:1200000,145:4500000,160:4500000,175:4500000},
  "Phlegm": {100:10000,115:12000,130:15000,145:20000,160:20000,175:20000},
  "Polyhedron": {100:50000,115:120000,130:400000,145:2000000,160:2000000,175:2000000},
  "Prima": {100:10000,115:12000,130:15000,145:35000,160:35000,175:35000},
  "Prism": {100:250000,115:850000,130:3500000,145:14000000,160:14000000,175:14000000},
  "Proto-Onion": {100:15000,115:30000,130:75000,145:300000,160:300000,175:300000},
  "Pumpkin": {100:180000,115:350000,130:3000000,145:8000000,160:8000000,175:8000000},
  "Radiator": {100:50000,115:85000,130:150000,145:750000,160:750000,175:750000},
  "Raisin": {100:500000,115:2500000,130:18000000,145:45000000,160:45000000,175:45000000},
  "Rattle": {100:10000,115:12000,130:15000,145:35000,160:35000,175:35000},
  "Red Crystal": {100:10000,115:12000,130:15000,145:20000,160:20000,175:20000},
  "Retina": {100:50000,115:150000,130:850000,145:5000000,160:5000000,175:5000000},
  "Rime": {100:20000,115:50000,130:120000,145:500000,160:500000,175:500000},
  "Rose": {100:10000,115:12000,130:20000,145:50000,160:50000,175:50000},
  "Scallop": {100:10000,115:15000,130:25000,145:100000,160:100000,175:100000},
  "Scrubber": {100:60000,115:100000,130:500000,145:2500000,160:2500000,175:2500000},
  "Shard": {100:40000,115:200000,130:500000,145:3000000,160:3000000,175:3000000},
  "Shrimp": {100:10000,115:15000,130:100000,145:200000,160:200000,175:200000},
  "Snail": {100:12000,115:20000,130:35000,145:80000,160:80000,175:80000},
  "Snake Eye": {100:40000,115:180000,130:800000,145:4500000,160:4500000,175:4500000},
  "Snares": {100:10000,115:12000,130:15000,145:35000,160:35000,175:35000},
  "Spectral Crystal": {100:10000,115:12000,130:15000,145:35000,160:35000,175:35000},
  "Spiral": {100:35000,115:180000,130:700000,145:2000000,160:2000000,175:2000000},
  "Sponge": {100:10000,115:12000,130:15000,145:35000,160:35000,175:35000},
  "Static": {100:80000,115:300000,130:800000,145:5000000,160:5000000,175:5000000},
  "Steel Hedgehog": {100:50000,115:200000,130:1500000,145:8500000,160:8500000,175:8500000},
  "Sticky Burr": {100:10000,115:15000,130:40000,145:75000,160:75000,175:75000},
  "Stress Fest": {100:100000,115:300000,130:1000000,145:2500000,160:2500000,175:2500000},
  "Sun": {100:50000,115:85000,130:500000,145:2500000,160:2500000,175:2500000},
  "Swamp Rot": {100:10000,115:12000,130:25000,145:35000,160:35000,175:35000},
  "Tallow": {100:25000,115:50000,130:80000,145:300000,160:300000,175:300000},
  "Timber": {100:80000,115:120000,130:1000000,145:5000000,160:5000000,175:5000000},
  "Tiny Key": {100:40000,115:70000,130:500000,145:3000000,160:3000000,175:3000000},
  "Transformer": {100:50000,115:85000,130:300000,145:1000000,160:1000000,175:1000000},
  "Veiner": {100:10000,115:15000,130:65000,145:600000,160:600000,175:600000},
  "Viburnum Branch": {100:95000,115:400000,130:1000000,145:7500000,160:7500000,175:7500000},
  "Whirlwind": {100:100000,115:450000,130:1500000,145:6000000,160:6000000,175:6000000},
  "White Rose": {100:10000,115:12000,130:45000,145:100000,160:100000,175:100000},
  "Wicked Hedgehog": {100:70000,115:140000,130:1200000,145:8000000,160:8000000,175:8000000},
  "Wolf Tears": {100:10000,115:12000,130:15000,145:25000,160:25000,175:25000}
};

const ROUGH_PRICE_EDGES = {
  100:[35000,90000,130000],
  115:[60000,200000,600000],
  130:[200000,1000000,4000000],
  145:[550000,3000000,18000000],
  160:[550000,3000000,18000000],
  175:[550000,3000000,18000000]
};
const ROUGH_PRICE_LABELS = ['Cheap','Average','Expensive','No Limit'];
let roughPriceLimit = 4;

function roughNameKey(value='') {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g,'');
}

const ROUGH_PRICE_BY_KEY = new Map(Object.entries(ROUGH_ARTIFACT_PRICES).map(([name,row]) => [roughNameKey(name), row]));

function roughPriceQualityBucket(quality) {
  const q = Number(quality) || 100;
  if (q <= 100) return 100;
  if (q <= 115) return 115;
  if (q <= 130) return 130;
  if (q <= 145) return 145;
  if (q <= 160) return 160;
  return 175; // Legendary estimates are also used as a rough fallback for Unique 175–190.
}

function roughArtifactPrice(name, quality) {
  const row = ROUGH_PRICE_BY_KEY.get(roughNameKey(name));
  if (!row) return null;
  return row[roughPriceQualityBucket(quality)] ?? null;
}

function roughArtifactPriceTier(name, quality) {
  const bucket = roughPriceQualityBucket(quality);
  const cost = roughArtifactPrice(name, quality);
  const edges = ROUGH_PRICE_EDGES[bucket];
  if (cost == null || !edges) return null;
  if (cost <= edges[0]) return 1;
  if (cost <= edges[1]) return 2;
  if (cost <= edges[2]) return 3;
  return 4;
}

function roughBuildPrice(picks=[]) {
  if (!picks.length) return { tier:null, total:0, known:0, unknown:0 };
  let total = 0;
  const edgeTotals = [0,0,0];
  let known = 0;
  let unknown = 0;
  for (const pick of picks) {
    const bucket = roughPriceQualityBucket(pick.quality);
    const cost = roughArtifactPrice(pick.artifactName || pick.name, pick.quality);
    const edges = ROUGH_PRICE_EDGES[bucket];
    if (cost == null || !edges) {
      unknown += 1;
      continue;
    }
    known += 1;
    total += cost;
    for (let i=0;i<3;i++) edgeTotals[i] += edges[i];
  }
  if (!known) return { tier:null, total:0, known:0, unknown };
  let tier = 4;
  for (let i=0;i<3;i++) {
    if (total <= edgeTotals[i]) { tier = i + 1; break; }
  }
  return { tier, total, known, unknown };
}

function roughManualPicks() {
  return loadout
    .map(slot => {
      const artifact = artifacts.find(item => item.id === slot.artifactId);
      return artifact ? { artifactName:artifact.name, quality:Number(slot.quality) || 100 } : null;
    })
    .filter(Boolean);
}

function formatRoughRoubles(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000_000) return `~${(n/1_000_000_000).toFixed(n >= 10_000_000_000 ? 0 : 1)}b`;
  if (n >= 1_000_000) return `~${(n/1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}m`;
  if (n >= 1_000) return `~${(n/1_000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return `~${Math.round(n)}`;
}

function roughPriceBadge(info, compact=false) {
  if (!info?.tier) return '<span class="rough-price-badge unknown" title="No rough price estimate for one or more artifacts">Price ?</span>';
  const signs = '$'.repeat(info.tier);
  const label = ROUGH_PRICE_LABELS[info.tier-1];
  const total = info.known ? ` · ${formatRoughRoubles(info.total)}` : '';
  const unknown = info.unknown ? ` · ${info.unknown} unpriced` : '';
  return `<span class="rough-price-badge tier-${info.tier}" title="Rough market estimate only; Potential level is not included">${compact ? signs : `${signs} ${label}${total}${unknown}`}</span>`;
}

function injectRoughPriceControls() {
  const finder = document.getElementById('finderControls');
  if (!finder || document.getElementById('roughPricePanel')) return;
  const artifactRange = finder.querySelector('.panel');
  const panel = document.createElement('section');
  panel.id = 'roughPricePanel';
  panel.className = 'panel';
  panel.innerHTML = `
    <h2>Price range</h2>
    <p class="panel-hint">General market estimate only. Exact Potential +0–+15 is not priced separately yet.</p>
    <div class="rough-price-control" role="group" aria-label="Maximum rough price tier">
      ${ROUGH_PRICE_LABELS.map((label,index) => `<button type="button" class="rough-price-button${index===3?' active':''}" data-price-limit="${index+1}"><span>${'$'.repeat(index+1)}</span><small>${label}</small></button>`).join('')}
    </div>
    <p class="rough-price-note">Uses broad artifact/quality estimates so the finder can avoid obviously expensive builds; it is not a live auction-house quote.</p>
  `;
  artifactRange?.insertAdjacentElement('afterend', panel);
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-price-limit]');
    if (!button) return;
    roughPriceLimit = Number(button.dataset.priceLimit) || 4;
    panel.querySelectorAll('.rough-price-button').forEach(item => item.classList.toggle('active', item === button));
    if (typeof clearStaleFinderResults === 'function') clearStaleFinderResults('Price range changed. Run the finder again.');
  });
}

const roughPricingStyle = document.createElement('style');
roughPricingStyle.textContent = `
  .rough-price-control{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
  .rough-price-button{min-width:0;border:1px solid var(--border);border-radius:7px;background:var(--panel-2);color:var(--muted);padding:8px 4px;display:grid;gap:2px;place-items:center;cursor:pointer}
  .rough-price-button span{font:700 12px var(--mono);letter-spacing:.04em}.rough-price-button small{font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
  .rough-price-button:hover{border-color:rgba(233,167,60,.45);color:var(--text-dim)}
  .rough-price-button.active{background:var(--warn-bg);border-color:var(--warn);color:var(--warn)}
  .rough-price-note{margin:9px 0 0;color:var(--muted);font-size:10px;line-height:1.4}
  .rough-price-badge{display:inline-flex;align-items:center;justify-content:center;min-height:22px;padding:3px 7px;border:1px solid rgba(233,167,60,.28);border-radius:6px;background:rgba(233,167,60,.08);color:var(--warn);font:700 9.5px var(--mono);white-space:nowrap}
  .rough-price-badge.unknown{color:var(--muted);border-color:var(--border);background:var(--panel-2)}
  .result-card-head .rough-price-badge{margin-left:auto}.result-card-head .match-badge+.rough-price-badge{margin-left:0}
  .slot-price-badge{margin-left:auto;margin-right:5px}
  .rough-price-summary{margin:0 0 10px;padding:7px 9px;border-radius:6px;background:var(--panel-2);border:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:10px;color:var(--muted)}
  @media(max-width:700px){.rough-price-control{grid-template-columns:repeat(2,1fr)}}
`;
document.head.appendChild(roughPricingStyle);

// Bias the beam toward builds inside the selected rough budget.
if (typeof stateRank === 'function') {
  const coreStateRankForPrice = stateRank;
  stateRank = function stateRankWithRoughPrice(state, requirements) {
    let score = coreStateRankForPrice(state, requirements);
    if (roughPriceLimit >= 4 || !state?.picks?.length) return score;
    const info = roughBuildPrice(state.picks);
    if (info.tier && info.tier > roughPriceLimit) score += (info.tier - roughPriceLimit) * 100000000;
    return score;
  };
}

// Filter final results to the requested budget when possible. If no priced result fits,
// keep the closest results rather than returning a blank screen.
if (typeof runBeamSearch === 'function') {
  const coreRunBeamSearchForPrice = runBeamSearch;
  runBeamSearch = function runBeamSearchWithRoughPrice(...args) {
    const results = coreRunBeamSearchForPrice(...args);
    if (roughPriceLimit >= 4) return results;
    const within = results.filter(result => {
      const info = roughBuildPrice(result.picks || []);
      return !info.tier || info.tier <= roughPriceLimit;
    });
    return within.length ? within : results;
  };
}

if (typeof renderFinderResults === 'function') {
  const coreRenderFinderForPrice = renderFinderResults;
  renderFinderResults = function renderFinderResultsWithPrice(results) {
    coreRenderFinderForPrice(results);
    [...ui.optimizerResults.querySelectorAll('.result-card')].forEach((card,index) => {
      const head = card.querySelector('.result-card-head');
      if (!head || head.querySelector('.rough-price-badge')) return;
      head.insertAdjacentHTML('beforeend', roughPriceBadge(roughBuildPrice(results[index]?.picks || []), false));
    });
  };
}

if (typeof renderLoadoutSlots === 'function') {
  const coreRenderSlotsForPrice = renderLoadoutSlots;
  renderLoadoutSlots = function renderLoadoutSlotsWithPrice() {
    coreRenderSlotsForPrice();
    [...ui.loadoutSlots.querySelectorAll('.artifact-slot')].forEach((card,index) => {
      const slot = loadout[index];
      const artifact = artifacts.find(item => item.id === slot?.artifactId);
      const top = card.querySelector('.slot-topline');
      if (!artifact || !top || top.querySelector('.slot-price-badge')) return;
      const info = { tier:roughArtifactPriceTier(artifact.name, slot.quality), total:roughArtifactPrice(artifact.name, slot.quality) || 0, known:roughArtifactPrice(artifact.name, slot.quality)==null?0:1, unknown:roughArtifactPrice(artifact.name, slot.quality)==null?1:0 };
      top.insertAdjacentHTML('beforeend', `<span class="slot-price-badge">${roughPriceBadge(info,true)}</span>`);
    });
  };
}

if (typeof renderTotalStatsSheet === 'function') {
  const coreRenderTotalsForPrice = renderTotalStatsSheet;
  renderTotalStatsSheet = function renderTotalStatsWithPrice() {
    coreRenderTotalsForPrice();
    const body = ui.totalStatsBody;
    if (!body) return;
    const existing = document.getElementById('roughPriceSummary');
    if (existing) existing.remove();
    const finderMode = !ui.finderResults.hidden;
    const result = finderMode ? lastFinderResults[selectedFinderResultIndex] : null;
    const picks = result?.picks || roughManualPicks();
    if (!picks.length) return;
    const info = roughBuildPrice(picks);
    const row = document.createElement('div');
    row.id = 'roughPriceSummary';
    row.className = 'rough-price-summary';
    row.innerHTML = `<span>Rough artifact price</span>${roughPriceBadge(info,false)}`;
    body.parentNode.insertBefore(row, body);
  };
}

injectRoughPriceControls();
