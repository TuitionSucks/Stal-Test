const ARTIFACT_DATA_URL = "https://raw.githubusercontent.com/will-bot2026/stalcraft_v1/main/data/normalized/artifacts.json";
const CONTAINER_DATA_URL = "containers.json";

const FALLBACK_ARTIFACTS = [
  {
    id: "ljn2",
    name: "Chilly",
    category: "artefact/thermal",
    rarity: "rarity.ordinary",
    level: 0,
    quality: 100,
    stats: [
      { key: "stalker.artefact_properties.factor.health_bonus", name: "Vitality", min: 2.295, max: 2.7, isPositive: true, isPercentage: true, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.thermal_accumulation", name: "Temperature", min: -0.384, max: -0.3264, isPositive: true, isPercentage: false, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.frost_accumulation", name: "Frost", min: 0.85, max: 1, isPositive: false, isPercentage: false, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.combustion_accumulation", name: "Burning", min: -0.4, max: -0.34, isPositive: true, isPercentage: false, origin: "artefact" }
    ],
    additionalStats: [
      { key: "stalker.artefact_properties.factor.health_bonus", name: "Vitality", min: 0.765, max: 0.9, isPositive: true, isPercentage: true, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.combustion_accumulation", name: "Burning", min: -0.2, max: -0.17, isPositive: true, isPercentage: false, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.explosion_dmg_factor", name: "Explosion protection", min: 12.665, max: 14.9, isPositive: true, isPercentage: false, origin: "artefact" }
    ]
  }
];

const FALLBACK_CONTAINERS = [
  { id: "p92d", name: "Hive Container", category: "containers", rank: "master", capacity: 5, protection: 89.5, effectiveness: 105, stats: [] }
];

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Data request failed (${response.status})`);
  return response.json();
}

async function loadGameDatabase() {
  const result = {
    artifacts: FALLBACK_ARTIFACTS,
    containers: FALLBACK_CONTAINERS,
    source: "fallback",
    errors: []
  };

  const [artifactResult, containerResult] = await Promise.allSettled([
    loadJson(ARTIFACT_DATA_URL),
    loadJson(CONTAINER_DATA_URL)
  ]);

  if (artifactResult.status === "fulfilled" && Array.isArray(artifactResult.value) && artifactResult.value.length) {
    result.artifacts = artifactResult.value;
  } else {
    result.errors.push(artifactResult.reason || new Error("Artifact data was empty"));
  }

  if (containerResult.status === "fulfilled" && Array.isArray(containerResult.value) && containerResult.value.length) {
    result.containers = containerResult.value;
  } else {
    result.errors.push(containerResult.reason || new Error("Container data was empty"));
  }

  if (result.artifacts !== FALLBACK_ARTIFACTS && result.containers !== FALLBACK_CONTAINERS) {
    result.source = "live";
  } else if (result.artifacts !== FALLBACK_ARTIFACTS || result.containers !== FALLBACK_CONTAINERS) {
    result.source = "partial";
  }

  if (result.errors.length) console.warn("One or more game-data feeds failed; fallbacks are active.", result.errors);
  return result;
}
