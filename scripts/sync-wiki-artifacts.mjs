import { writeFile } from 'node:fs/promises';

const ENDPOINTS = [
  'https://stalzone.wiki/api/builds-calculator/items/?lang=en&category=artefact',
  'https://stalcraft.wiki/api/builds-calculator/items/?lang=en&category=artefact'
];

function artifactItems(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['results', 'items', 'data']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function englishText(value, fallback = '') {
  if (typeof value === 'string') return value;
  return value?.lines?.en ?? value?.en ?? fallback;
}

function normalizeStat(stat, defaultOrigin = 'artefact') {
  const key = stat?.name?.key ?? stat?.key;
  if (!key) return null;
  const calculated = Number(stat?.value?.calculated ?? stat?.calculated ?? 0);
  const min = Number(stat?.value?.min ?? stat?.min ?? calculated);
  const max = Number(stat?.value?.max ?? stat?.max ?? calculated);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return {
    key,
    name: englishText(stat?.name, stat?.name?.lines?.en ?? key),
    min,
    max,
    isPositive: Boolean(stat?.is_positive ?? stat?.isPositive ?? true),
    isPercentage: Boolean(stat?.is_percentage ?? stat?.isPercentage ?? false),
    origin: stat?.origin ?? defaultOrigin
  };
}

function normalizeArtifact(item) {
  const id = item?.exbo_id ?? item?.id;
  if (!id) return null;
  const stats = (item?.stats ?? [])
    .map(stat => normalizeStat(stat))
    .filter(Boolean);
  const additionalSource = item?.additionalStats ?? item?.additional_stats ?? [];
  const additionalStats = additionalSource
    .map(stat => normalizeStat(stat))
    .filter(Boolean);
  return {
    id,
    name: englishText(item?.name, item?.lines?.en ?? id),
    category: item?.category ?? 'artefact',
    rarity: item?.rarity,
    level: Number.isFinite(Number(item?.level)) ? Number(item.level) : 0,
    quality: Number.isFinite(Number(item?.quality)) ? Number(item.quality) : 100,
    stats,
    additionalStats
  };
}

async function fetchPayload(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'accept': 'application/json,text/plain,*/*',
      'user-agent': 'Stalzone-Artifact-Calculator/1.0 (+https://github.com/TuitionSucks/Stal-Test)'
    }
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('json')) {
    const text = await response.text();
    throw new Error(`${url} did not return JSON (${contentType || 'unknown'}): ${text.slice(0, 120)}`);
  }
  return response.json();
}

let source = '';
let items = [];
const failures = [];
for (const endpoint of ENDPOINTS) {
  try {
    const payload = await fetchPayload(endpoint);
    const candidate = artifactItems(payload);
    if (candidate.length < 90) throw new Error(`only ${candidate.length} artifact rows returned`);
    source = endpoint;
    items = candidate;
    break;
  } catch (error) {
    failures.push(String(error?.message || error));
  }
}

if (!items.length) {
  console.warn('Live STALZONE artifact sync skipped. The deployed calculator will use its fallback source.');
  failures.forEach(message => console.warn(` - ${message}`));
  process.exit(0);
}

const artifacts = items
  .map(normalizeArtifact)
  .filter(Boolean)
  .sort((a, b) => a.id.localeCompare(b.id));

const uniqueIds = new Set(artifacts.map(item => item.id));
if (uniqueIds.size < 90) throw new Error(`Only ${uniqueIds.size} unique artifact IDs were normalized`);

const dumbbell = artifacts.find(item => item.id === 'y5yw');
if (dumbbell) {
  const extraNames = dumbbell.additionalStats.map(stat => stat.name).join(', ');
  console.log(`Dumbbell additional stats from live source: ${extraNames || '(none)'}`);
}

await writeFile('artifacts-live.json', `${JSON.stringify(artifacts, null, 2)}\n`, 'utf8');
console.log(`Synced ${artifacts.length} current artifacts from ${source}`);
console.log(`Artifacts with additional-stat pools: ${artifacts.filter(item => item.additionalStats.length).length}`);
