const ARTIFACT_DATA_URLS = [
  "artifacts-live.json",
  "https://raw.githubusercontent.com/will-bot2026/stalcraft_v1/main/data/normalized/artifacts.json"
];
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

// Keep a small verified override for Dumbbell so the known stale public fallback
// can never re-introduce Carry weight as an additional property. The normal Pages
// deployment now generates artifacts-live.json from the current STALZONE Wiki API
// and therefore refreshes the entire artifact/additional-stat catalog at deploy time.
const VERIFIED_ARTIFACT_OVERRIDES = new Map([
  ["y5yw", {
    stats: [
      { key: "stalker.artefact_properties.factor.health_bonus", name: "Vitality", min: 0.51000005, max: 0.6, isPositive: true, isPercentage: true, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.sprint_speed_modifier", name: "Running speed", min: 0.63750005, max: 0.75, isPositive: true, isPercentage: true, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.max_weight_bonus", name: "Carry weight", min: 8.33, max: 9.8, isPositive: true, isPercentage: false, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.heal_efficiency", name: "Healing effectiveness", min: 8.33, max: 9.8, isPositive: true, isPercentage: true, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.tear_dmg_factor", name: "Laceration protection", min: 11.645, max: 13.7, isPositive: true, isPercentage: false, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.radiation_accumulation", name: "Radiation", min: 2.125, max: 2.5, isPositive: false, isPercentage: false, origin: "artefact" }
    ],
    additionalStats: [
      { key: "stalker.artefact_properties.factor.heal_efficiency", name: "Healing effectiveness", min: 2.805, max: 3.3, isPositive: true, isPercentage: true, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.tear_dmg_factor", name: "Laceration protection", min: 3.79, max: 4.6, isPositive: true, isPercentage: false, origin: "artefact" },
      { key: "stalker.artefact_properties.factor.speed_modifier", name: "Movement speed", min: 0.62, max: 0.75, isPositive: true, isPercentage: true, origin: "artefact" }
    ]
  }]
]);

function applyVerifiedArtifactOverrides(list) {
  return (list || []).map(artifact => {
    const override = VERIFIED_ARTIFACT_OVERRIDES.get(artifact.id);
    return override ? { ...artifact, ...override } : artifact;
  });
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Data request failed (${response.status})`);
  return response.json();
}

async function loadFirstJson(urls) {
  const errors = [];
  for (const url of urls) {
    try {
      const data = await loadJson(url);
      if (!Array.isArray(data) || !data.length) throw new Error("Artifact data was empty");
      return { data, url, errors };
    } catch (error) {
      errors.push(error);
    }
  }
  throw Object.assign(new Error("All artifact data sources failed"), { causes: errors });
}

async function loadGameDatabase() {
  const result = {
    artifacts: FALLBACK_ARTIFACTS,
    containers: FALLBACK_CONTAINERS,
    source: "fallback",
    artifactSource: "fallback",
    errors: []
  };

  const [artifactResult, containerResult] = await Promise.allSettled([
    loadFirstJson(ARTIFACT_DATA_URLS),
    loadJson(CONTAINER_DATA_URL)
  ]);

  if (artifactResult.status === "fulfilled") {
    result.artifacts = applyVerifiedArtifactOverrides(artifactResult.value.data);
    result.artifactSource = artifactResult.value.url === "artifacts-live.json" ? "current-wiki" : "fallback-public";
    result.errors.push(...artifactResult.value.errors);
  } else {
    result.errors.push(artifactResult.reason || new Error("Artifact data was empty"));
    result.artifacts = applyVerifiedArtifactOverrides(result.artifacts);
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

  if (result.errors.length) console.warn("One or more game-data feeds failed or were bypassed; fallbacks may be active.", result.errors);
  return result;
}
