// agripath-backend/controllers/matchController.js
import { supabase } from '../config/db.js';
import { extractNumericRange } from '../utils/helpers.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

const activeMatchRequests = new Map();

const TEXTURE_DEFAULT_RATIOS = {
  'clay': { sand: 20, silt: 20, clay: 60 },
  'clay loam': { sand: 32, silt: 34, clay: 34 },
  'silty clay': { sand: 10, silt: 45, clay: 45 },
  'silty clay loam': { sand: 10, silt: 55, clay: 35 },
  'sandy clay': { sand: 50, silt: 10, clay: 40 },
  'sandy clay loam': { sand: 55, silt: 15, clay: 30 },
  'loam': { sand: 40, silt: 40, clay: 20 },
  'silt loam': { sand: 20, silt: 65, clay: 15 },
  'silt': { sand: 8, silt: 85, clay: 7 },
  'sandy loam': { sand: 65, silt: 25, clay: 10 },
  'loamy sand': { sand: 80, silt: 12, clay: 8 },
  'sand': { sand: 90, silt: 5, clay: 5 }
};

// 1. Pure DB Aggregator for Technology Requirements (from public.india_states_climate_soil)
const getAggregatedStatesProfile = async (recommendedStatesStr) => {
  if (!recommendedStatesStr || recommendedStatesStr === '-' || !recommendedStatesStr.trim()) {
    return null;
  }

  const states = recommendedStatesStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (states.length === 0) return null;

  console.log(`   🔎 [DB LOOKUP] Fetching state baselines for: [${states.join(', ')}]...`);

  const { data: statesData, error } = await supabase
    .from('india_states_climate_soil')
    .select('*')
    .in('"State Name"', states);

  if (error || !statesData || statesData.length === 0) {
    console.log('   ⚠️ [DB LOOKUP] No state baseline records found in table.');
    return null;
  }

  let totalPh = 0, phCount = 0;
  const minRainAccum = [], maxRainAccum = [];
  const minTempAccum = [], maxTempAccum = [];
  const soilTextures = [], wrbTaxonomies = [];
  const sandAccum = [], siltAccum = [], clayAccum = [];

  statesData.forEach((row) => {
    // 6. Soil pH Level
    const rawPh = row['6. Soil pH Level'];
    if (rawPh) {
      const ph = parseFloat(rawPh);
      if (!isNaN(ph)) {
        totalPh += ph;
        phCount++;
      }
    }

    // 4. Baseline Rainfall
    const baselineRain = row['4. Baseline Rainfall'];
    if (baselineRain) {
      const parsedRain = extractNumericRange(baselineRain);
      if (parsedRain && parsedRain.length >= 2) {
        minRainAccum.push(parsedRain[0]);
        maxRainAccum.push(parsedRain[1]);
      }
    }

    // 5. Baseline Temperature (Dynamic)
    const baselineTemp = row['5. Baseline Temperature'];
    if (baselineTemp) {
      const parsedTemp = extractNumericRange(baselineTemp);
      if (parsedTemp && parsedTemp.length >= 2) {
        minTempAccum.push(parsedTemp[0]);
        maxTempAccum.push(parsedTemp[1]);
      }
    }

    // 10. Texture Class & 11. WRB Soil Taxonomy
    const texture = row['10. Texture Class'];
    if (texture && typeof texture === 'string' && texture.trim() !== '') {
      soilTextures.push(texture.trim());
    }

    const wrb = row['11. WRB Soil Taxonomy'] || row['11. WRB Reference Soil Group'];
    if (wrb && typeof wrb === 'string' && wrb.trim() !== '') {
      wrbTaxonomies.push(wrb.trim());
    }

    // 12. Sand / Silt / Clay Ratio
    const ratioRaw = row['12. Sand / Silt / Clay Ratio'];
    if (ratioRaw && typeof ratioRaw === 'string') {
      const parts = ratioRaw.split('/').map((p) => parseFloat(p.replace('%', '').trim()));
      if (parts.length === 3 && !parts.some(isNaN)) {
        sandAccum.push(parts[0]);
        siltAccum.push(parts[1]);
        clayAccum.push(parts[2]);
      }
    }
  });

  const avgPh = phCount > 0 ? parseFloat((totalPh / phCount).toFixed(1)) : null;
  const dominantTexture = soilTextures.length > 0 ? soilTextures[0] : null;
  const dominantWrb = wrbTaxonomies.length > 0 ? wrbTaxonomies[0] : null;

  const minRain = minRainAccum.length > 0 ? Math.min(...minRainAccum) : null;
  const maxRain = maxRainAccum.length > 0 ? Math.max(...maxRainAccum) : null;

  const minTemp = minTempAccum.length > 0 ? Math.min(...minTempAccum) : null;
  const maxTemp = maxTempAccum.length > 0 ? Math.max(...maxTempAccum) : null;

  if (minRain === null && avgPh === null && !dominantTexture && minTemp === null) return null;

  const phLower = avgPh !== null ? parseFloat((avgPh - 0.5).toFixed(1)) : null;
  const phUpper = avgPh !== null ? parseFloat((avgPh + 0.5).toFixed(1)) : null;

  let reqSand = sandAccum.length > 0 ? Math.round(sandAccum.reduce((a, b) => a + b, 0) / sandAccum.length) : null;
  let reqSilt = siltAccum.length > 0 ? Math.round(siltAccum.reduce((a, b) => a + b, 0) / siltAccum.length) : null;
  let reqClay = clayAccum.length > 0 ? Math.round(clayAccum.reduce((a, b) => a + b, 0) / clayAccum.length) : null;

  if ((reqSand === null || reqSilt === null || reqClay === null) && dominantTexture) {
    const key = dominantTexture.toLowerCase().trim();
    const defaults = TEXTURE_DEFAULT_RATIOS[key] || TEXTURE_DEFAULT_RATIOS['loam'];
    reqSand = defaults.sand;
    reqSilt = defaults.silt;
    reqClay = defaults.clay;
  }

  const textureWithWrb = dominantTexture
    ? `${dominantTexture}${dominantWrb ? ` (${dominantWrb})` : ''}`
    : 'NA';

  const particleRatioStr = reqSand !== null && reqSilt !== null && reqClay !== null
    ? `Sand: ${reqSand}% | Silt: ${reqSilt}% | Clay: ${reqClay}%`
    : 'NA';

  const temperatureStr = minTemp !== null && maxTemp !== null
    ? `${minTemp}°C – ${maxTemp}°C`
    : '15°C – 35°C';

  console.log(`   ✅ [DB BASELINE RESOLVED] Temp: ${temperatureStr} | Rain: ${minRain ?? 'NA'}–${maxRain ?? 'NA'} mm | pH: ${phLower ?? 'NA'}–${phUpper ?? 'NA'} | Soil: ${textureWithWrb}`);

  return {
    source: `Recommended States DB [${states.join(', ')}]`,
    rainfallStr: minRain !== null && maxRain !== null ? `${minRain}–${maxRain} mm` : 'NA',
    phStr: phLower !== null && phUpper !== null ? `${phLower}–${phUpper}` : 'NA',
    temperatureStr,
    soilRequirement: textureWithWrb,
    soilTextureOnly: dominantTexture || 'NA',
    soilWrbOnly: dominantWrb || 'NA',
    particleRatioStr,
    particleValues: reqSand !== null ? { sand: reqSand, silt: reqSilt, clay: reqClay } : null,
    rainfallRange: minRain !== null && maxRain !== null ? [minRain, maxRain] : null,
    phRange: phLower !== null && phUpper !== null ? [phLower, phUpper] : null,
    temperatureRange: minTemp !== null && maxTemp !== null ? [minTemp, maxTemp] : null,
  };
};

// 2. High-Precision Ollama Match Engine
const evaluateAllZonesWithOllama = async (targetTech, targetCountry, techRequirements, zonesList) => {
  if (!techRequirements || (techRequirements.rainfallStr === 'NA' && techRequirements.phStr === 'NA')) {
    return null;
  }

  console.log(`\n   🤖 [OLLAMA AI] Model: ${OLLAMA_MODEL} | Evaluating ${zonesList.length} zones...`);
  console.log(`   ⏳ [STOPWATCH] Unlimited Timeout Enabled. Awaiting model inference...`);

  const prompt = `You are a Senior Agronomist. Evaluate the match for "${targetTech}" across all zones in "${targetCountry}".

[REQUIREMENTS]
- Crop: ${targetTech}
- Required Baseline Temperature: ${techRequirements.temperatureStr}
- Required Rain: ${techRequirements.rainfallStr}
- Required Soil pH: ${techRequirements.phStr}
- Required Soil Type (WRB): ${techRequirements.soilRequirement}
- Required Soil Distribution (Sand|Silt|Clay): ${techRequirements.particleRatioStr}

[ZONES MEASURED DATA]
${zonesList
  .map(
    (z, i) => `Zone ${i + 1} (${z.name}):
- Baseline Temperature: ${z.temperature}
- Annual Rainfall: ${z.rainfall}
- Soil pH: ${z.soil_ph}
- Soil Type (WRB): ${z.soil_type}
- Soil Particle Ratio: ${z.particle_str}`
  )
  .join('\n\n')}

EVALUATION RULES:
1. Temperature: Check if zone temperature range is within required temperature range (${techRequirements.temperatureStr}). If inside, strictly "OPTIMAL" with temp_caution: false.
2. Rainfall: Compare rainfall with ${techRequirements.rainfallStr}.
3. Soil pH: Compare pH with ${techRequirements.phStr}.
4. Soil Type: Compare Texture and WRB taxonomy.
5. Soil Particle Ratio: Compare Sand, Silt, Clay percentages. If deviation across all three is within ±5%, particle_compatibility: "OPTIMAL (WITHIN ±5% TOLERANCE)", particle_caution: false.
6. Provide specific mitigation array if parameters are non-optimal.
7. Return realistic composite score (0-100).

RETURN STRICT JSON ONLY MATCHING THIS SCHEMA:
{
  "zones": [
    {
      "zone_index": 1,
      "score": 35,
      "summary": "1-2 sentence agronomic explanation.",
      "rain_compatibility": "HIGH MOISTURE RISK (EXCESS)",
      "rain_caution": true,
      "ph_compatibility": "ACIDIC STRESS",
      "ph_caution": true,
      "temp_compatibility": "OPTIMAL",
      "temp_caution": false,
      "soil_compatibility": "DRAINAGE CAUTION (CLAY/VERTISOL)",
      "soil_caution": true,
      "particle_compatibility": "VARIATION > 5% (SILT DEFICIT -7%)",
      "particle_caution": true,
      "mitigations": [
        "Construct raised planting beds with lateral drainage furrows to evacuate excess rain.",
        "Apply agricultural lime (1.5-2.0 t/ha) to neutralize subsoil acidity.",
        "Incorporate organic matter to improve soil aeration in silt-deficient profile."
      ]
    }
  ]
}`;

  const timerStart = Date.now();
  const timerInterval = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - timerStart) / 1000);
    process.stdout.write(`\r   ⏳ [OLLAMA GENERATING] Live Inference Time: ${elapsedSeconds}s...`);
  }, 1000);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        format: 'json',
        stream: false,
        options: { temperature: 0.0, num_predict: 2048 },
      }),
    });

    clearInterval(timerInterval);
    process.stdout.write('\r' + ' '.repeat(80) + '\r');

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const raw = await response.json();
    const duration = ((Date.now() - timerStart) / 1000).toFixed(2);
    console.log(`   ✨ [OLLAMA INFERENCE FINISHED] Completed in ⏱️ ${duration}s!`);

    let cleanedText = (raw.response || '').trim();
    if (cleanedText.startsWith('```json')) cleanedText = cleanedText.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (cleanedText.startsWith('```')) cleanedText = cleanedText.replace(/^```/, '').replace(/```$/, '').trim();

    return JSON.parse(cleanedText);
  } catch (err) {
    clearInterval(timerInterval);
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    console.warn(`   ⚠️ [OLLAMA FAILED] ${err.message}. Using direct DB mathematical verification.`);
    return null;
  }
};

// 3. Strict Numerical Evaluator
function evaluateStrictAgronomics(zVal, rVal, type, extraContext = {}) {
  if (!zVal || zVal === 'NA' || zVal === 'N/A' || !rVal || rVal === 'NA' || rVal === 'N/A') {
    return { status: 'NA', caution: true, score: 0 };
  }

  if (type === 'rain') {
    const z = extractNumericRange(zVal);
    const r = extractNumericRange(rVal);
    if (!z || !r) return { status: 'NA', caution: true, score: 0 };

    if (z[0] > r[1] + 50) return { status: 'HIGH MOISTURE RISK (EXCESS)', caution: true, score: 8 };
    if (z[1] < r[0] - 50) return { status: 'SUB-OPTIMAL (LOW RAINFALL)', caution: true, score: 10 };
    return { status: 'OPTIMAL', caution: false, score: 25 };
  }

  if (type === 'ph') {
    const z = extractNumericRange(zVal);
    const r = extractNumericRange(rVal);
    if (!z || !r) return { status: 'NA', caution: true, score: 0 };

    const zPh = z[0];
    if (zPh < r[0]) return { status: `ACIDIC STRESS (pH ${zPh} < ${r[0]})`, caution: true, score: 8 };
    if (zPh > r[1]) return { status: `ALKALINE CAUTION (pH ${zPh} > ${r[1]})`, caution: true, score: 10 };
    return { status: 'OPTIMAL', caution: false, score: 25 };
  }

  if (type === 'temp') {
    const z = extractNumericRange(zVal);
    const r = extractNumericRange(rVal);
    if (!z || !r) return { status: 'NA', caution: true, score: 0 };

    const zMin = z[0];
    const zMax = z.length > 1 ? z[1] : z[0];
    const rMin = r[0];
    const rMax = r.length > 1 ? r[1] : r[0];

    if (zMin < rMin) return { status: `COLD STRESS (Min ${zMin}°C < ${rMin}°C)`, caution: true, score: 5 };
    if (zMax > rMax) return { status: `HEAT STRESS (Max ${zMax}°C > ${rMax}°C)`, caution: true, score: 5 };
    return { status: 'OPTIMAL', caution: false, score: 20 };
  }

  if (type === 'soil') {
    const zLow = zVal.toLowerCase();
    const rLow = rVal.toLowerCase();

    if (zLow.includes('clay') && (rLow.includes('sand') || rLow.includes('sandy loam'))) {
      return { status: 'DRAINAGE CAUTION (HEAVY CLAY)', caution: true, score: 4 };
    }
    if (zLow.includes('sand') && (rLow.includes('clay') || rLow.includes('clay loam'))) {
      return { status: 'PERCOLATION RISK (SANDY)', caution: true, score: 4 };
    }
    return { status: 'OPTIMAL', caution: false, score: 15 };
  }

  if (type === 'particles') {
    const zObj = extraContext.zoneParticles;
    const rObj = extraContext.reqParticles;

    if (!zObj || !rObj || zObj.sand === null || rObj.sand === null) {
      return { status: 'OPTIMAL', caution: false, score: 15 };
    }

    const diffSand = zObj.sand - rObj.sand;
    const diffSilt = zObj.silt - rObj.silt;
    const diffClay = zObj.clay - rObj.clay;
    const TOLERANCE = 5.0;

    const sandDev = Math.abs(diffSand) > TOLERANCE;
    const siltDev = Math.abs(diffSilt) > TOLERANCE;
    const clayDev = Math.abs(diffClay) > TOLERANCE;

    if (!sandDev && !siltDev && !clayDev) {
      return { status: 'OPTIMAL (WITHIN ±5% TOLERANCE)', caution: false, score: 15 };
    }

    const issues = [];
    if (diffClay > TOLERANCE) issues.push(`CLAY EXCESS (+${diffClay}%)`);
    else if (diffClay < -TOLERANCE) issues.push(`CLAY DEFICIT (${diffClay}%)`);

    if (diffSand > TOLERANCE) issues.push(`HIGH SAND (+${diffSand}%)`);
    else if (diffSand < -TOLERANCE) issues.push(`LOW SAND (${diffSand}%)`);

    if (issues.length === 0 && siltDev) {
      issues.push(`SILT VARIATION (${diffSilt > 0 ? '+' : ''}${diffSilt}%)`);
    }

    return {
      status: `VARIATION > 5% (${issues.join(', ')})`,
      caution: true,
      score: Math.max(15 - Math.round((Math.abs(diffSand) + Math.abs(diffClay)) / 4), 3),
    };
  }

  return { status: 'NA', caution: true, score: 0 };
}

// 4. Main Controller Endpoint
export const getMatchScore = async (req, res) => {
  const reqStart = performance.now();
  const { category, technology, country, recommendedStates, originRegion } = req.body;

  if (!country || !country.trim()) return res.status(400).json({ success: false, error: "'country' is required." });
  if (!technology || !technology.trim()) return res.status(400).json({ success: false, error: "'technology' is required." });

  const targetCountry = country.trim();
  const targetTech = technology.trim();
  const targetCategory = (category || '').trim();
  const passedStates = recommendedStates || originRegion || null;

  const dedupKey = `${targetCountry.toLowerCase()}_${targetTech.toLowerCase()}_${targetCategory.toLowerCase()}`;

  if (activeMatchRequests.has(dedupKey)) {
    try {
      const activePromiseResult = await activeMatchRequests.get(dedupKey);
      return res.json(activePromiseResult);
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  const executionPromise = (async () => {
    console.log('\n' + '='.repeat(70));
    console.log(`🌾 [MATCH ENGINE] Target: "${targetTech}" (${targetCategory || 'Seeds'}) -> 🌍 "${targetCountry}"`);
    console.log('='.repeat(70));

    const [zoneRes, soilDbRes, climateDbRes] = await Promise.all([
      supabase.from('agroclimatic_zones').select('*').eq('country', targetCountry),
      supabase.from('zone_soil_analytics').select('*').eq('Country', targetCountry),
      supabase.from('zone_climate_analytics').select('*').eq('Country', targetCountry),
    ]);

    const dbZones = zoneRes.data;
    if (zoneRes.error) throw new Error(`Database Error: ${zoneRes.error.message}`);
    if (!dbZones || dbZones.length === 0) throw new Error(`No zones found for "${targetCountry}".`);

    console.log(`📦 [DB READY] Found ${dbZones.length} Exact Zones for "${targetCountry}"`);

    const soilMap = new Map(
      (soilDbRes.data || []).map((s) => [
        (s['Agroclimatic Zone'] || s.zone_name || '').toLowerCase().trim(),
        s,
      ])
    );
    const climateMap = new Map(
      (climateDbRes.data || []).map((c) => [
        (c['Zone Name'] || c.zone_name || '').toLowerCase().trim(),
        c,
      ])
    );

    let techRequirements = null;

    if (passedStates && passedStates !== '-' && passedStates.trim() !== '') {
      techRequirements = await getAggregatedStatesProfile(passedStates);
    }

    if (!techRequirements) {
      const { data: seedData } = await supabase
        .from('govt_crop_data')
        .select('*')
        .eq('"Variety Name"', targetTech)
        .limit(1);
      if (seedData && seedData.length > 0 && seedData[0]['Recommended States']) {
        techRequirements = await getAggregatedStatesProfile(seedData[0]['Recommended States']);
      }
    }

    if (!techRequirements) {
      techRequirements = {
        source: 'NA',
        rainfallStr: 'NA',
        phStr: 'NA',
        temperatureStr: '15°C – 35°C',
        soilRequirement: 'NA',
        particleRatioStr: 'NA',
        particleValues: null,
        rainfallRange: null,
        phRange: null,
        temperatureRange: null,
      };
    }

    const rawZonesPayload = dbZones.map((z, i) => {
      const zName = z.zone_name || z.Zone_Name || `Zone ${i + 1}`;
      const zKey = zName.toLowerCase().trim();
      const sRow = soilMap.get(zKey);
      const cRow = climateMap.get(zKey);

      const textureName = sRow?.['Texture Class (USDA)'] || z.soil_type || 'Loamy Soil';
      const wrbTaxonomy = sRow?.['WRB Soil Taxonomy'] || sRow?.wrb_soil_taxonomy || '';

      const zSand = parseFloat(sRow?.['Sand Ratio (%)'] ?? 40);
      const zSilt = parseFloat(sRow?.['Silt Ratio (%)'] ?? 35);
      const zClay = parseFloat(sRow?.['Clay Ratio (%)'] ?? 25);

      const particleStr = `Sand: ${Math.round(zSand)}% | Silt: ${Math.round(zSilt)}% | Clay: ${Math.round(zClay)}%`;
      const soilTypeFull = wrbTaxonomy ? `${textureName} (${wrbTaxonomy})` : textureName;

      return {
        code: `ZONE-${i + 1}`,
        name: zName,
        rainfall: cRow?.['Baseline Rainfall'] || cRow?.baseline_rainfall || z.baseline_rainfall || 'NA',
        soil_ph: sRow?.['pH Level (0-30cm)'] != null
          ? `${sRow['pH Level (0-30cm)']}`
          : sRow?.ph_level != null
          ? `${sRow.ph_level}`
          : z.soil_ph || 'NA',
        soil_type: soilTypeFull,
        temperature: cRow?.['Baseline Temperature'] || cRow?.baseline_temperature || z.baseline_temperature || '20°C – 30°C',
        crops: z.suitable_crops || 'NA',
        particle_str: particleStr,
        particle_values: { sand: Math.round(zSand), silt: Math.round(zSilt), clay: Math.round(zClay) },
      };
    });

    const aiResult = await evaluateAllZonesWithOllama(targetTech, targetCountry, techRequirements, rawZonesPayload);

    const zonesData = rawZonesPayload.map((z, idx) => {
      const aiZ = aiResult?.zones?.find((x) => x.zone_index === idx + 1) || aiResult?.zones?.[idx];

      const rainEval = evaluateStrictAgronomics(z.rainfall, techRequirements.rainfallStr, 'rain');
      const phEval = evaluateStrictAgronomics(z.soil_ph, techRequirements.phStr, 'ph');
      const tempEval = evaluateStrictAgronomics(z.temperature, techRequirements.temperatureStr, 'temp');
      const soilEval = evaluateStrictAgronomics(z.soil_type, techRequirements.soilRequirement, 'soil');
      const particleEval = evaluateStrictAgronomics(
        z.particle_str,
        techRequirements.particleRatioStr,
        'particles',
        {
          zoneParticles: z.particle_values,
          reqParticles: techRequirements.particleValues,
        }
      );

      const isDataMissing = z.rainfall === 'NA' || techRequirements.rainfallStr === 'NA';

      const rainCompat = aiZ?.rain_compatibility || rainEval.status;
      const phCompat = aiZ?.ph_compatibility || phEval.status;
      const tempCompat = aiZ?.temp_compatibility || tempEval.status;
      const soilCompat = aiZ?.soil_compatibility || soilEval.status;
      const particleCompat = aiZ?.particle_compatibility || particleEval.status;

      const rainCaution = !rainCompat.toUpperCase().includes('OPTIMAL');
      const phCaution = !phCompat.toUpperCase().includes('OPTIMAL');
      const tempCaution = !tempCompat.toUpperCase().includes('OPTIMAL');
      const soilCaution = !soilCompat.toUpperCase().includes('OPTIMAL');
      const particleCaution = !particleCompat.toUpperCase().includes('OPTIMAL');

      // Detect All Non-Optimal Parameters
      const nonOptimalIssues = [];

      if (rainCaution) {
        if (rainCompat.toUpperCase().includes('EXCESS')) {
          nonOptimalIssues.push({
            parameter: 'Rainfall',
            mitigation: 'Construct raised planting beds and install secondary perimeter drainage furrows to prevent excess waterlogging.'
          });
        } else {
          nonOptimalIssues.push({
            parameter: 'Rainfall',
            mitigation: 'Deploy drip/supplementary irrigation channels and apply straw mulching to conserve root-zone moisture.'
          });
        }
      }

      if (phCaution) {
        if (phCompat.toUpperCase().includes('ACIDIC')) {
          nonOptimalIssues.push({
            parameter: 'Soil pH',
            mitigation: 'Apply agricultural lime (calcium carbonate) or dolomite at 1.5–2.0 t/ha prior to sowing to neutralize subsoil acidity.'
          });
        } else {
          nonOptimalIssues.push({
            parameter: 'Soil pH',
            mitigation: 'Apply agricultural gypsum or elemental sulfur amendments along with organic compost to lower alkaline pH stress.'
          });
        }
      }

      if (tempCaution) {
        if (tempCompat.toUpperCase().includes('COLD')) {
          nonOptimalIssues.push({
            parameter: 'Temperature',
            mitigation: 'Adjust planting window to warmer weeks or deploy low-tunnel plastic covers during early germination.'
          });
        } else {
          nonOptimalIssues.push({
            parameter: 'Temperature',
            mitigation: 'Implement light overhead misting/sprinklers and maintain shade barriers during peak heat hours.'
          });
        }
      }

      if (soilCaution) {
        nonOptimalIssues.push({
          parameter: 'Soil Type (WRB)',
          mitigation: 'Incorporate decomposed organic manure and biochar to improve soil aeration and internal structure.'
        });
      }

      if (particleCaution) {
        nonOptimalIssues.push({
          parameter: 'Soil Particle Ratio',
          mitigation: 'Apply targeted sand/silt/organic matter blending and practice minimum-tillage to stabilize soil texture balance.'
        });
      }

      const calculatedScore = isDataMissing
        ? 0
        : aiZ?.score !== undefined
        ? Number(aiZ.score)
        : Math.min(
            Math.max(
              rainEval.score + phEval.score + tempEval.score + soilEval.score + particleEval.score,
              0
            ),
            100
          );

      const statusLabel =
        isDataMissing || calculatedScore === 0
          ? 'NA'
          : calculatedScore >= 80
          ? 'Excellent'
          : calculatedScore >= 60
          ? 'Good / Moderate'
          : 'Caution Required';

      const fallbackSummary = calculatedScore >= 80
        ? `Optimal agro-climatic alignment in ${z.name} supports successful commercial deployment of ${targetTech}.`
        : `Identified environmental stress in ${z.name} (${[rainCompat, phCompat, soilCompat, particleCompat].filter((c) => !c.toUpperCase().includes('OPTIMAL') && c !== 'NA').join(', ')}) requires agronomic adaptation.`;

      const summary = isDataMissing ? 'NA' : aiZ?.summary && aiZ.summary !== 'NA' ? aiZ.summary : fallbackSummary;

      // Dynamic Mitigation Formatting (Bullet points up to 3 max or Severe Alert if >3)
      let calloutLabel = 'Optimal Agro-Ecological Fit';
      let calloutTone = 'opportunity';
      let mitigationList = [];

      if (nonOptimalIssues.length === 0) {
        calloutLabel = 'Optimal Agro-Ecological Fit';
        calloutTone = 'opportunity';
        mitigationList = ['Proceed with standard commercial sowing schedules and balanced fertilizer regimen.'];
      } else if (nonOptimalIssues.length <= 3) {
        calloutLabel = `Agronomic Mitigation Protocols (${nonOptimalIssues.length} Factor${nonOptimalIssues.length > 1 ? 's' : ''} Addressed)`;
        calloutTone = 'caution';
        
        // Use AI generated mitigations if array provided; otherwise use dynamic fallback list
        if (Array.isArray(aiZ?.mitigations) && aiZ.mitigations.length > 0) {
          mitigationList = aiZ.mitigations.slice(0, 3);
        } else {
          mitigationList = nonOptimalIssues.slice(0, 3).map(item => `[${item.parameter}] ${item.mitigation}`);
        }
      } else {
        // More than 3 non-optimal parameters (>3 Stress Factors)
        calloutLabel = `High Ecological Barrier (${nonOptimalIssues.length} Non-Optimal Parameters Detected)`;
        calloutTone = 'caution';
        mitigationList = [
          'Site Feasibility Warning: Multiple severe environmental divergences detected simultaneously (Rainfall, Soil Chemistry, Texture & Temperature).',
          ...nonOptimalIssues.slice(0, 3).map(item => `[${item.parameter}] ${item.mitigation}`),
          'Conduct comprehensive field pilot trials and high-cost infrastructure adaptation before commercial scale rollout.'
        ];
      }

      return {
        code: z.code,
        name: z.name,
        rainfall: z.rainfall,
        soil_ph: z.soil_ph,
        soil_type: z.soil_type,
        districts: z.crops,
        score: calculatedScore,
        status_label: statusLabel,
        summary,
        table: [
          { parameter: 'Annual Rainfall', zoneValue: z.rainfall, requirement: techRequirements.rainfallStr, compatibility: rainCompat, caution: rainCaution },
          { parameter: 'Soil pH Range', zoneValue: z.soil_ph, requirement: techRequirements.phStr, compatibility: phCompat, caution: phCaution },
          { parameter: 'Temperature Profile', zoneValue: z.temperature, requirement: techRequirements.temperatureStr, compatibility: tempCompat, caution: tempCaution },
          { parameter: 'Soil Type (WRB)', zoneValue: z.soil_type, requirement: techRequirements.soilRequirement, compatibility: soilCompat, caution: soilCaution },
          { parameter: 'Soil Particle Ratio (Sand|Silt|Clay)', zoneValue: z.particle_str, requirement: techRequirements.particleRatioStr, compatibility: particleCompat, caution: particleCaution },
        ],
        callouts: [
          {
            tone: calloutTone,
            label: calloutLabel,
            text: mitigationList.length === 1 ? mitigationList[0] : mitigationList,
            items: mitigationList, // Structured array for clean frontend bullet rendering
          },
        ],
        notes: [
          `Evaluation Engine: ${aiResult ? 'Ollama Agronomic Intelligence' : 'Direct Database Verification'}.`,
          `Requirement Baseline: ${techRequirements.source}.`,
        ],
      };
    });

    const validZones = zonesData.filter((z) => z.score > 0);
    const avgScore = validZones.length > 0 ? Math.round(validZones.reduce((acc, z) => acc + z.score, 0) / validZones.length) : 0;
    const bestZone = validZones.length > 0 ? validZones.reduce((prev, curr) => (prev.score > curr.score ? prev : curr), validZones[0]) : null;

    const totalDuration = ((performance.now() - reqStart) / 1000).toFixed(2);
    console.log(`\n🏁 [MATCH COMPLETED] Avg Score: ${avgScore}% | Best Zone: "${bestZone?.name || 'NA'}" | Total Time: ⏱️ ${totalDuration}s`);
    console.log('='.repeat(70) + '\n');

    return {
      success: true,
      country: targetCountry,
      category: targetCategory,
      technology: targetTech,
      executive_overview: {
        total_zones_analysed: zonesData.length,
        average_score: avgScore > 0 ? `${avgScore}% avg` : 'NA',
        best_zone: bestZone ? bestZone.name : 'NA',
      },
      db_meta: { total_zones: zonesData.length, matching_source: techRequirements.source },
      intro: `Agroclimatic Match Report for ${targetTech} in ${targetCountry}.`,
      zones: zonesData,
      summary: zonesData.map((z) => ({
        code: z.code,
        zone: z.name,
        score: z.score,
        rainfall: z.rainfall,
        soil_ph: z.soil_ph,
        crops: z.districts,
        priority: z.score >= 80 ? 'Priority 1 (Target Launch)' : z.score > 0 ? 'Priority 2 (Expansion)' : 'NA',
      })),
    };
  })();

  activeMatchRequests.set(dedupKey, executionPromise);

  try {
    const finalData = await executionPromise;
    return res.json(finalData);
  } catch (err) {
    console.error('❌ Match Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    activeMatchRequests.delete(dedupKey);
  }
};