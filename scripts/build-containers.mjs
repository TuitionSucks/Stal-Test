import fs from 'node:fs';
import path from 'node:path';

const containerRoot = process.argv[2];
const backpackRoot = process.argv[3];
const outputFile = process.argv[4] || 'containers.json';

for (const root of [containerRoot, backpackRoot]) {
  if (!root || !fs.existsSync(root)) {
    console.error('Usage: node scripts/build-containers.mjs <EXBO containers dir> <EXBO backpacks dir> [output file]');
    process.exit(1);
  }
}

const STAT_PREFIX = 'stalker.artefact_properties.factor.';
const INNER_PROTECTION = 'stalker.tooltip.backpack.stat_name.inner_protection';
const EFFECTIVENESS = 'stalker.tooltip.backpack.stat_name.effectiveness';
const CAPACITY = 'stalker.tooltip.backpack.info.size';
const SKIP_DIRS = new Set(['_variants']);

function english(value, fallback = '') {
  return value?.lines?.en ?? value?.value?.en ?? value?.text ?? fallback;
}

function walkFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...walkFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function collectNumerics(node, found = []) {
  if (!node) return found;
  if (Array.isArray(node)) {
    for (const value of node) collectNumerics(value, found);
    return found;
  }
  if (typeof node !== 'object') return found;

  if (node.type === 'numeric' && typeof node.value === 'number' && typeof node.name?.key === 'string') {
    found.push(node);
  }
  for (const value of Object.values(node)) collectNumerics(value, found);
  return found;
}

function firstNumeric(nodes, key) {
  return nodes.find(node => node.name?.key === key)?.value;
}

function collectFixedStats(nodes) {
  const map = new Map();
  for (const node of nodes) {
    const key = node.name?.key;
    if (!key?.startsWith(STAT_PREFIX) || map.has(key)) continue;
    const formatted = node.formatted?.value?.en ?? '';
    const value = Number(node.value);
    map.set(key, {
      key,
      name: english(node.name, key.slice(STAT_PREFIX.length)),
      min: value,
      max: value,
      isPositive: value >= 0,
      isPercentage: formatted.includes('%'),
      origin: 'containers'
    });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function rankFromColor(color = '') {
  const normalized = String(color).replace(/^RANK_/, '').toLowerCase();
  return normalized && normalized !== 'default' ? normalized : 'common';
}

const items = [];
for (const root of [containerRoot, backpackRoot]) {
  for (const file of walkFiles(root)) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      console.warn(`Skipping unreadable container file: ${file}`, error.message);
      continue;
    }

    const name = english(raw.name);
    if (!raw.id || !name) continue;
    const numerics = collectNumerics(raw.infoBlocks || []);
    const capacity = Number(firstNumeric(numerics, CAPACITY));
    const protection = Number(firstNumeric(numerics, INNER_PROTECTION));
    const effectiveness = Number(firstNumeric(numerics, EFFECTIVENESS));
    if (!Number.isFinite(capacity) || capacity <= 0) continue;

    items.push({
      id: String(raw.id),
      name,
      category: String(raw.category || (root === backpackRoot ? 'backpacks' : 'containers')),
      rank: rankFromColor(raw.color),
      capacity,
      protection: Number.isFinite(protection) ? protection : 0,
      effectiveness: Number.isFinite(effectiveness) ? effectiveness : 100,
      stats: collectFixedStats(numerics)
    });
  }
}

items.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
fs.writeFileSync(outputFile, `${JSON.stringify(items, null, 2)}\n`);
console.log(`Wrote ${items.length} containers/backpacks to ${outputFile}`);
