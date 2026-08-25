const artifact = ARTIFACTS.chilly;

const qualityInput = document.getElementById("quality");
const potentialSelect = document.getElementById("potential");
const slotCountEl = document.getElementById("slotCount");
const warningEl = document.getElementById("warning");
const artifactTitle = document.getElementById("artifactTitle");
const vitalityEl = document.getElementById("vitality");
const temperatureEl = document.getElementById("temperature");
const frostEl = document.getElementById("frost");
const burningEl = document.getElementById("burning");
const explosionEl = document.getElementById("explosion");
const explosionRow = document.getElementById("explosionRow");
const testsEl = document.getElementById("tests");
const checkboxes = [...document.querySelectorAll('.checks input[type="checkbox"]')];

for (let level = 0; level <= 15; level++) {
  const option = document.createElement("option");
  option.value = level;
  option.textContent = `+${level}`;
  if (level === 6) option.selected = true;
  potentialSelect.appendChild(option);
}

function potentialMultiplier(level) {
  return 1 + (0.02 * level);
}

function unlockedSlots(level) {
  if (level >= 15) return 3;
  if (level >= 10) return 2;
  if (level >= 5) return 1;
  return 0;
}

function frostAtQuality(quality) {
  const { qualityMin, qualityMax, valueAtMin, valueAtMax } = artifact.frost;
  const progress = (quality - qualityMin) / (qualityMax - qualityMin);
  return valueAtMin + progress * (valueAtMax - valueAtMin);
}

function scaled(base, quality, potential) {
  return base * (quality / 100) * potentialMultiplier(potential);
}

function formatSigned(value, suffix = "") {
  const rounded = value.toFixed(2);
  const sign = value >= 0 ? "+" : "";
  return `${sign}${rounded}${suffix}`;
}

function getSelectedAdditionals() {
  return checkboxes.filter(cb => cb.checked).map(cb => cb.value);
}

function enforceSlots(changedCheckbox = null) {
  const level = Number(potentialSelect.value);
  const maxSlots = unlockedSlots(level);
  let selected = getSelectedAdditionals();

  if (selected.length > maxSlots && changedCheckbox?.checked) {
    changedCheckbox.checked = false;
    selected = getSelectedAdditionals();
    warningEl.textContent = `Only ${maxSlots} additional propert${maxSlots === 1 ? "y is" : "ies are"} unlocked at +${level}.`;
  } else {
    warningEl.textContent = "";
  }

  slotCountEl.textContent = maxSlots;

  checkboxes.forEach(cb => {
    cb.disabled = !cb.checked && selected.length >= maxSlots;
  });
}

function calculate(quality, potential, selected = []) {
  const mainVitality = scaled(artifact.main.vitality, quality, potential);
  const mainTemperature = scaled(artifact.main.temperature, quality, potential);
  const mainBurning = scaled(artifact.main.burning, quality, potential);
  const frost = frostAtQuality(quality);

  const additionalVitality = selected.includes("vitality")
    ? scaled(artifact.additional.vitality, quality, potential)
    : 0;
  const additionalBurning = selected.includes("burning")
    ? scaled(artifact.additional.burning, quality, potential)
    : 0;
  const explosionProtection = selected.includes("explosionProtection")
    ? scaled(artifact.additional.explosionProtection, quality, potential)
    : 0;

  return {
    vitality: mainVitality + additionalVitality,
    temperature: mainTemperature,
    frost,
    burning: mainBurning + additionalBurning,
    explosionProtection
  };
}

function render() {
  let quality = Number(qualityInput.value);
  const min = artifact.verifiedQualityBand.min;
  const max = artifact.verifiedQualityBand.max;

  if (!Number.isFinite(quality)) quality = min;
  quality = Math.min(max, Math.max(min, quality));
  qualityInput.value = quality;

  const potential = Number(potentialSelect.value);
  enforceSlots();
  const selected = getSelectedAdditionals();
  const result = calculate(quality, potential, selected);

  artifactTitle.textContent = `${artifact.name} — ${quality}% +${potential}`;
  vitalityEl.textContent = formatSigned(result.vitality, "%");
  temperatureEl.textContent = formatSigned(result.temperature);
  frostEl.textContent = formatSigned(result.frost);
  burningEl.textContent = formatSigned(result.burning);

  const hasExplosion = selected.includes("explosionProtection");
  explosionRow.classList.toggle("hidden", !hasExplosion);
  explosionEl.textContent = formatSigned(result.explosionProtection);
}

function runKnownTests() {
  const cases = [
    {
      name: "143% +8",
      quality: 143,
      potential: 8,
      expected: { vitality: 4.48, temperature: -0.64, frost: 0.98, burning: -0.66 }
    },
    {
      name: "135% +6",
      quality: 135,
      potential: 6,
      expected: { vitality: 4.08, temperature: -0.58, frost: 0.90, burning: -0.60 }
    }
  ];

  const passed = cases.every(test => {
    const actual = calculate(test.quality, test.potential, []);
    return Object.entries(test.expected).every(([key, expected]) =>
      Number(actual[key].toFixed(2)) === expected
    );
  });

  testsEl.textContent = passed
    ? "✓ Formula checks passed for 143% +8 and 135% +6."
    : "⚠ One or more formula checks failed.";
  testsEl.className = passed ? "pass" : "fail";
}

qualityInput.addEventListener("input", render);
potentialSelect.addEventListener("change", () => {
  const maxSlots = unlockedSlots(Number(potentialSelect.value));
  const selected = checkboxes.filter(cb => cb.checked);
  selected.slice(maxSlots).forEach(cb => { cb.checked = false; });
  render();
});

checkboxes.forEach(cb => {
  cb.addEventListener("change", () => {
    enforceSlots(cb);
    render();
  });
});

runKnownTests();
render();
