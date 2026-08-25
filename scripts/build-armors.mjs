import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = process.argv[2];
const outputFile = process.argv[3] || 'armors.json';

if (!sourceRoot || !fs.existsSync(sourceRoot)) {
  console.error('Usage: node scripts/build-armors.mjs <EXBO armor directory> [output file]');
  process.exit(1);
}

const STAT_PREFIX = 'stalker.artefact_properties.factor.';
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

function collectNumericStats(node, found = []) {
  if (!node) return found;
  if (Array.isArray(node)) {
    for (const value of node) collectNumericStats(value, found);
    return found;
  }
  if (typeof node !== 'object') return found;

  if (
    node.type === 'numeric' &&
    typeof node.value === 'number' &&
    typeof node.name?.key === 'string' &&
    node.name.key.startsWith(STAT_PREFIX)
  ) {
    const formatted = node.formatted?.value?.en ?? '';
    found.push({
      key: node.name.key,
      name: english(node.name, node.name.key.slice(STAT_PREFIX.length)),
      value: Number(node.value),
      isPercentage: formatted.includes('%'),
      isPositive: Number(node.value) >= 0,
      origin: 'armor'
    });
  }

  for (const value of Object.values(node)) collectNumericStats(value, found);
  return found;
}

function mergeStats(stats) {
  // EXBO tooltips can repeat the same already-final stat in multiple blocks.
  // Keep the first visible value instead of adding repeated tooltip entries together.
  const map = new Map();
  for (const stat of stats) {
    if (!map.has(stat.key)) map.set(stat.key, { ...stat });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function rankFromColor(color = '') {
  const normalized = String(color).replace(/^RANK_/, '').toLowerCase();
  return normalized && normalized !== 'default' ? normalized : 'common';
}

const armors = [];
for (const file of walkFiles(sourceRoot)) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.warn(`Skipping unreadable armor file: ${file}`, error.message);
    continue;
  }

  const name = english(raw.name);
  if (!raw.id || !name) continue;

  const stats = mergeStats(collectNumericStats(raw.infoBlocks || []));
  armors.push({
    id: String(raw.id),
    name,
    category: String(raw.category || 'armor'),
    rank: rankFromColor(raw.color),
    stats
  });
}

armors.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
fs.writeFileSync(outputFile, `${JSON.stringify(armors, null, 2)}\n`);
console.log(`Wrote ${armors.length} armors to ${outputFile}`);
