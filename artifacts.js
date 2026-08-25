const ARTIFACT_DATA_URL = "https://raw.githubusercontent.com/will-bot2026/stalcraft_v1/main/data/normalized/artifacts.json";

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

async function loadArtifactDatabase() {
  try {
    const response = await fetch(ARTIFACT_DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Artifact data request failed (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Artifact data was empty");
    return { artifacts: data, source: "live" };
  } catch (error) {
    console.warn("Could not load the full artifact database; using Chilly fallback.", error);
    return { artifacts: FALLBACK_ARTIFACTS, source: "fallback", error };
  }
}
