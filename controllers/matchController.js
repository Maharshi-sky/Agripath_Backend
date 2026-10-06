// controllers/matchController.js
import { supabase } from '../config/db.js';
import { extractNumericRange } from '../utils/helpers.js';
import { queryAI } from '../utils/aiService.js';

import { evaluateSeedMatch } from './match/seedMatchEngine.js';
import { evaluateBioMatch } from './match/bioMatchEngine.js';
import { evaluateCropProtectionMatch } from './match/cropProtectionMatchEngine.js';
import { evaluateFertilizerMatch } from './match/fertilizerMatchEngine.js';
import { evaluateMachineryMatch } from './match/machineryMatchEngine.js';

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

const resolveMatchHandler = (category = '', tech = '') => {
  const c = String(category || '').toLowerCase().trim();
  const t = String(tech || '').toLowerCase().trim();

  if (c.includes('bio') || c.includes('inoculant') || c.includes('stimulant')) {
    return { key: 'bio', handler: evaluateBioMatch, label: 'Biological Inputs' };
  }
  if (c.includes('protect') || c.includes('pest') || c.includes('fungic') || c.includes('insectic') || c.includes('herbic')) {
    return { key: 'crop_protection', handler: evaluateCropProtectionMatch, label: 'Crop Protection & Agrochem' };
  }
  if (c.includes('fert') || c.includes('nutrient') || c.includes('npk')) {
    return { key: 'fertilizers', handler: evaluateFertilizerMatch, label: 'Fertilizers & Plant Nutrients' };
  }
  if (c.includes('machin') || c.includes('equipment') || c.includes('tractor') || t.includes('planter') || t.includes('deere')) {
    return { key: 'machinery', handler: evaluateMachineryMatch, label: 'Farm Machinery & Equipment' };
  }
  return { key: 'seeds', handler: evaluateSeedMatch, label: 'Seeds & Varieties' };
};

// 1. DB Aggregator for Technology Requirements
const getAggregatedStatesProfile = async (recommendedStatesStr) => {
  if (
    !recommendedStatesStr ||
    recommendedStatesStr === '-' ||
    recommendedStatesStr.trim() === '' ||
    recommendedStatesStr.trim().toUpperCase() === 'NA' ||
    recommendedStatesStr.trim().toUpperCase() === 'N/A' ||
    recommendedStatesStr.trim().toUpperCase() === 'NULL'
  ) {
    return null;
  }

  const states = recommendedStatesStr.split(',').map((s) => s.trim()).filter(Boolean);
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
    const rawPh = row['6. Soil pH Level'];
    if (rawPh) {
      const ph = parseFloat(rawPh);
      if (!isNaN(ph)) { totalPh += ph; phCount++; }
    }

    const baselineRain = row['4. Baseline Rainfall'];
    if (baselineRain) {
      const parsedRain = extractNumericRange(baselineRain);
      if (parsedRain && parsedRain.length >= 2) {
        minRainAccum.push(parsedRain[0]);
        maxRainAccum.push(parsedRain[1]);
      }
    }

    const baselineTemp = row['5. Baseline Temperature'];
    if (baselineTemp) {
      const parsedTemp = extractNumericRange(baselineTemp);
      if (parsedTemp && parsedTemp.length >= 2) {
        minTempAccum.push(parsedTemp[0]);
        maxTempAccum.push(parsedTemp[1]);
      }
    }

    const texture = row['10. Texture Class'];
    if (texture && typeof texture === 'string' && texture.trim() !== '') {
      soilTextures.push(texture.trim());
    }

    const wrb = row['11. WRB Soil Taxonomy'] || row['11. WRB Reference Soil Group'];
    if (wrb && typeof wrb === 'string' && wrb.trim() !== '') {
      wrbTaxonomies.push(wrb.trim());
    }

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
    : 'Loam / Clay Loam';

  const particleRatioStr = reqSand !== null && reqSilt !== null && reqClay !== null
    ? `Sand: ${reqSand}% | Silt: ${reqSilt}% | Clay: ${reqClay}%`
    : 'Sand: 35% | Silt: 35% | Clay: 30%';

  const temperatureStr = minTemp !== null && maxTemp !== null
    ? `${minTemp}°C – ${maxTemp}°C`
    : '18°C – 35°C';

  console.log(`   ✅ [DB BASELINE RESOLVED] Temp: ${temperatureStr} | Rain: ${minRain ?? 'NA'}–${maxRain ?? 'NA'} mm | pH: ${phLower ?? 'NA'}–${phUpper ?? 'NA'} | Soil: ${textureWithWrb}`);

  return {
    source: `Recommended States DB [${states.join(', ')}]`,
    isAiInferred: false,
    noticeTag: null,
    rainfallStr: minRain !== null && maxRain !== null ? `${minRain}–${maxRain} mm` : 'NA',
    phStr: phLower !== null && phUpper !== null ? `${phLower}–${phUpper}` : 'NA',
    temperatureStr,
    soilRequirement: textureWithWrb,
    soilTextureOnly: dominantTexture || 'Loam',
    soilWrbOnly: dominantWrb || 'Cambisols',
    particleRatioStr,
    particleValues: reqSand !== null ? { sand: reqSand, silt: reqSilt, clay: reqClay } : { sand: 35, silt: 35, clay: 30 },
    rainfallRange: minRain !== null && maxRain !== null ? [minRain, maxRain] : null,
    phRange: phLower !== null && phUpper !== null ? [phLower, phUpper] : null,
    temperatureRange: minTemp !== null && maxTemp !== null ? [minTemp, maxTemp] : null,
  };
};

// 1B. Dynamic Groq Inferrer for Missing States
const inferAgronomicProfileWithGroq = async (cropName, varietyName) => {
  console.log(`\n   ⚡ [AI BASELINE INFER] Recommended States missing/NA for "${varietyName || cropName}". Generating profile with Groq...`);

  const systemInstruction = `You are a Senior Plant Physiologist and Agronomist.
Synthesize standard agronomic baseline requirements for optimal commercial cultivation. Output STRICT VALID JSON ONLY.`;

  const prompt = `Synthesize agronomic baseline requirements for:
- Crop: "${cropName || 'Commercial Crop'}"
- Variety / Technology: "${varietyName || 'Standard Variety'}"

Return STRICT JSON only matching this schema:
{
  "min_rainfall_mm": 600,
  "max_rainfall_mm": 1000,
  "min_temp_c": 18,
  "max_temp_c": 32,
  "ph_lower": 6.0,
  "ph_upper": 7.5,
  "dominant_texture": "Clay Loam",
  "wrb_taxonomy": "Luvisols",
  "sand_ratio": 35,
  "silt_ratio": 35,
  "clay_ratio": 30
}`;

  try {
    const aiData = await queryAI(prompt, systemInstruction);

    const minRain = Number(aiData?.min_rainfall_mm) || 600;
    const maxRain = Number(aiData?.max_rainfall_mm) || 1000;
    const minTemp = Number(aiData?.min_temp_c) || 18;
    const maxTemp = Number(aiData?.max_temp_c) || 32;
    const phLower = Number(aiData?.ph_lower) || 6.0;
    const phUpper = Number(aiData?.ph_upper) || 7.5;
    const dominantTexture = aiData?.dominant_texture || 'Loam / Clay Loam';
    const dominantWrb = aiData?.wrb_taxonomy || 'Luvisols';
    const sand = Number(aiData?.sand_ratio) || 35;
    const silt = Number(aiData?.silt_ratio) || 35;
    const clay = Number(aiData?.clay_ratio) || 30;

    return {
      source: 'AI Agronomic Inferrer (Groq)',
      isAiInferred: true,
      noticeTag: 'Unable to find recommended states, comparison made on AI generated parameters',
      rainfallStr: `${minRain}–${maxRain} mm`,
      phStr: `${phLower}–${phUpper}`,
      temperatureStr: `${minTemp}°C – ${maxTemp}°C`,
      soilRequirement: `${dominantTexture} (${dominantWrb})`,
      soilTextureOnly: dominantTexture,
      soilWrbOnly: dominantWrb,
      particleRatioStr: `Sand: ${sand}% | Silt: ${silt}% | Clay: ${clay}%`,
      particleValues: { sand, silt, clay },
      rainfallRange: [minRain, maxRain],
      phRange: [phLower, phUpper],
      temperatureRange: [minTemp, maxTemp]
    };
  } catch (err) {
    return {
      source: 'Default Agronomic Profile',
      isAiInferred: true,
      noticeTag: 'Unable to find recommended states, comparison made on AI generated parameters',
      rainfallStr: '600–1000 mm',
      phStr: '6.0–7.5',
      temperatureStr: '18°C – 32°C',
      soilRequirement: 'Loam / Clay Loam (Luvisols)',
      soilTextureOnly: 'Clay Loam',
      soilWrbOnly: 'Luvisols',
      particleRatioStr: 'Sand: 35% | Silt: 35% | Clay: 30%',
      particleValues: { sand: 35, silt: 35, clay: 30 },
      rainfallRange: [600, 1000],
      phRange: [6.0, 7.5],
      temperatureRange: [18, 32]
    };
  }
};

// 2. Strict Numerical Evaluator (Mapped exactly to Standard Agronomic Dictionary)
function evaluateStrictAgronomics(zVal, rVal, type, extraContext = {}) {
  if (!zVal || zVal === 'NA' || zVal === 'N/A' || !rVal || rVal === 'NA' || rVal === 'N/A') {
    return { status: 'NA', caution: true, score: 0 };
  }

  // 1. Annual Rainfall
  if (type === 'rain') {
    const z = extractNumericRange(zVal);
    const r = extractNumericRange(rVal);
    if (!z || !r) return { status: 'NA', caution: true, score: 0 };

    const zMin = z[0];
    const zMax = z.length > 1 ? z[1] : z[0];
    const rMin = r[0];
    const rMax = r.length > 1 ? r[1] : r[0];

    // Very Low: Extremely below requirement (> 250mm deficit)
    if (zMax < rMin - 250) return { status: 'Very Low', caution: true, score: 5 };
    // Low: Lower than requirement
    if (zMax < rMin) return { status: 'Low', caution: true, score: 12 };
    // Very High: Extremely above requirement (> 250mm excess)
    if (zMin > rMax + 250) return { status: 'Very High', caution: true, score: 5 };
    // High: Higher than requirement
    if (zMin > rMax) return { status: 'High', caution: true, score: 12 };
    // Optimal: Fits requirement range
    return { status: 'Optimal', caution: false, score: 25 };
  }

  // 2. Soil pH Range
  if (type === 'ph') {
    const z = extractNumericRange(zVal);
    if (!z) return { status: 'NA', caution: true, score: 0 };
    const ph = z[0];

    if (ph < 5.0) return { status: 'Extreme Acidic', caution: true, score: 4 };
    if (ph >= 5.0 && ph < 6.8) return { status: 'Acidic Stress', caution: true, score: 12 };
    if (ph >= 6.8 && ph <= 7.3) return { status: 'Optimal', caution: false, score: 25 };
    if (ph > 7.3 && ph <= 9.0) return { status: 'Alkaline Stress', caution: true, score: 12 };
    return { status: 'Extreme Alkaline', caution: true, score: 4 };
  }

  // 3. Temperature Profile
  if (type === 'temp') {
    const z = extractNumericRange(zVal);
    const r = extractNumericRange(rVal);
    if (!z || !r) return { status: 'NA', caution: true, score: 0 };

    const zMin = z[0];
    const zMax = z.length > 1 ? z[1] : z[0];
    const rMin = r[0];
    const rMax = r.length > 1 ? r[1] : r[0];

    if (zMax > rMax) return { status: 'Heat Stress', caution: true, score: 8 };
    if (zMin < rMin) return { status: 'Cold Stress', caution: true, score: 8 };
    return { status: 'Optimal', caution: false, score: 20 };
  }

  // 4. Soil Type
  if (type === 'soil') {
    const zLow = zVal.toLowerCase();
    const rLow = rVal.toLowerCase();

    // Sub Optimal if clay or sand mismatch
    if (
      (zLow.includes('clay') && (rLow.includes('sand') || rLow.includes('sandy loam'))) ||
      (zLow.includes('sand') && (rLow.includes('clay') || rLow.includes('clay loam')))
    ) {
      return { status: 'Sub Optimal', caution: true, score: 6 };
    }
    return { status: 'Optimal', caution: false, score: 15 };
  }

  // 5. Soil Particle Ratio
  if (type === 'particles') {
    const zObj = extraContext.zoneParticles;
    const rObj = extraContext.reqParticles;
    if (!zObj || !rObj || zObj.sand === null || rObj.sand === null) {
      return { status: 'Optimal', caution: false, score: 15 };
    }

    const diffSand = zObj.sand - rObj.sand;
    const diffSilt = zObj.silt - rObj.silt;
    const diffClay = zObj.clay - rObj.clay;
    const TOLERANCE = 5.0;

    // Fits perfect within 5% variation
    if (Math.abs(diffSand) <= TOLERANCE && Math.abs(diffClay) <= TOLERANCE && Math.abs(diffSilt) <= TOLERANCE) {
      return { status: 'Optimal', caution: false, score: 15 };
    }

    if (diffClay > TOLERANCE) return { status: 'Clay Excess', caution: true, score: 6 };
    if (diffClay < -TOLERANCE) return { status: 'Clay Deficit', caution: true, score: 6 };
    if (diffSand > TOLERANCE) return { status: 'High Sand', caution: true, score: 6 };
    if (diffSand < -TOLERANCE) return { status: 'Low Sand', caution: true, score: 6 };
    if (diffSilt > TOLERANCE) return { status: 'Silt Excess', caution: true, score: 8 };
    if (diffSilt < -TOLERANCE) return { status: 'Silt Deficit', caution: true, score: 8 };

    return { status: 'Sub Optimal', caution: true, score: 8 };
  }

  return { status: 'NA', caution: true, score: 0 };
}

// 3. Main Controller Endpoint
export const getMatchScore = async (req, res) => {
  const reqStart = performance.now();
  const { category, technology, techType, variety, crop, cropType, country, recommendedStates, originRegion } = req.body;

  if (!country || !country.trim()) return res.status(400).json({ success: false, error: "'country' is required." });

  const targetCountry = country.trim();
  const targetTech = (technology || variety || techType || 'Commercial Agricultural Product').trim();
  const targetCrop = (crop || cropType || targetTech).trim();
  const targetCategory = (category || 'Seeds & Varieties').trim();
  const passedStates = recommendedStates || originRegion || null;

  // Resolve Category Sub-Engine
  const { key, handler, label } = resolveMatchHandler(targetCategory, targetTech);

  const dedupKey = `${targetCountry.toLowerCase()}_${targetTech.toLowerCase()}_${key}`;

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
    console.log(`🌾 [MATCH ENGINE] Target: "${targetTech}" (${label} via ${key}MatchEngine) -> 🌍 "${targetCountry}"`);
    console.log(`🌱 Crop Context: "${targetCrop}"`);
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

    const soilMap = new Map((soilDbRes.data || []).map((s) => [(s['Agroclimatic Zone'] || s.zone_name || '').toLowerCase().trim(), s]));
    const climateMap = new Map((climateDbRes.data || []).map((c) => [(c['Zone Name'] || c.zone_name || '').toLowerCase().trim(), c]));

    let techRequirements = null;

    if (passedStates && passedStates !== '-' && passedStates.trim() !== '') {
      techRequirements = await getAggregatedStatesProfile(passedStates);
    }

    if (!techRequirements) {
      const { data: seedData } = await supabase
        .from('govt_crop_data')
        .select('*')
        .or(`"Variety Name".ilike.%${targetTech}%,"Crop".ilike.%${targetCrop}%`)
        .limit(1);

      if (seedData && seedData.length > 0) {
        const rawStates = seedData[0]['Recommended States'] || seedData[0]['recommended_states'];
        techRequirements = await getAggregatedStatesProfile(rawStates);
      }
    }

    if (!techRequirements) {
      techRequirements = await inferAgronomicProfileWithGroq(targetCrop, targetTech);
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

      return {
        code: `ZONE-${i + 1}`,
        name: zName,
        rainfall: cRow?.['Baseline Rainfall'] || cRow?.baseline_rainfall || z.baseline_rainfall || 'NA',
        soil_ph: sRow?.['pH Level (0-30cm)'] != null ? `${sRow['pH Level (0-30cm)']}` : sRow?.ph_level != null ? `${sRow.ph_level}` : z.soil_ph || 'NA',
        soil_type: wrbTaxonomy ? `${textureName} (${wrbTaxonomy})` : textureName,
        temperature: cRow?.['Baseline Temperature'] || cRow?.baseline_temperature || z.baseline_temperature || '20°C – 30°C',
        crops: z.suitable_crops || 'NA',
        particle_str: `Sand: ${Math.round(zSand)}% | Silt: ${Math.round(zSilt)}% | Clay: ${Math.round(zClay)}%`,
        particle_values: { sand: Math.round(zSand), silt: Math.round(zSilt), clay: Math.round(zClay) },
      };
    });

    console.log(`\n   🤖 [GROQ AI ENGINE] Dispatched to: controllers/match/${key}MatchEngine.js`);
    const timerStart = Date.now();

    const rawAiResult = await handler({
      technology: targetTech,
      country: targetCountry,
      techRequirements,
      zonesList: rawZonesPayload
    });

    const duration = ((Date.now() - timerStart) / 1000).toFixed(2);
    console.log(`   ✨ [GROQ INFERENCE FINISHED] Completed in ⏱️ ${duration}s!`);

    const aiZonesList = Array.isArray(rawAiResult)
      ? rawAiResult
      : Array.isArray(rawAiResult?.zones)
      ? rawAiResult.zones
      : [];

    // Map all zones: Index + Name Matching (eliminates AI: NA)
    const zonesData = rawZonesPayload.map((z, idx) => {
      const currentIdx = idx + 1;
      const cleanTargetName = z.name.toLowerCase().replace(/zone/g, '').trim();

      const aiZ =
        aiZonesList.find((x) => Number(x?.zone_index) === currentIdx) ||
        aiZonesList.find((x) => {
          const aiName = String(x?.zone_name || '').toLowerCase();
          return aiName && (aiName.includes(cleanTargetName) || cleanTargetName.includes(aiName));
        }) ||
        aiZonesList[idx] ||
        null;

      const rainEval = evaluateStrictAgronomics(z.rainfall, techRequirements.rainfallStr, 'rain');
      const phEval = evaluateStrictAgronomics(z.soil_ph, techRequirements.phStr, 'ph');
      const tempEval = evaluateStrictAgronomics(z.temperature, techRequirements.temperatureStr, 'temp');
      const soilEval = evaluateStrictAgronomics(z.soil_type, techRequirements.soilRequirement, 'soil');
      const particleEval = evaluateStrictAgronomics(
        z.particle_str,
        techRequirements.particleRatioStr,
        'particles',
        { zoneParticles: z.particle_values, reqParticles: techRequirements.particleValues }
      );

      const isDataMissing = z.rainfall === 'NA' || techRequirements.rainfallStr === 'NA';

      const rainCompat = aiZ?.rain_compatibility || rainEval.status;
      const phCompat = aiZ?.ph_compatibility || phEval.status;
      const tempCompat = aiZ?.temp_compatibility || tempEval.status;
      const soilCompat = aiZ?.soil_compatibility || soilEval.status;
      const particleCompat = aiZ?.particle_compatibility || particleEval.status;

      const mathScore = Math.min(
        Math.max(rainEval.score + phEval.score + tempEval.score + soilEval.score + particleEval.score, 0),
        100
      );

      const aiScoreRaw = aiZ?.score !== undefined ? Number(aiZ.score) : NaN;
      const calculatedScore = isDataMissing
        ? 0
        : !isNaN(aiScoreRaw) && aiScoreRaw > 0
        ? aiScoreRaw
        : mathScore > 0
        ? mathScore
        : 15;

      console.log(`   [ZONE SCORE DEBUG] ${z.name} -> AI: ${aiZ?.score ?? 'NA'} | Math: ${mathScore}% | Final Applied: ${calculatedScore}%`);

      // Overall Status per dictionary:
      // > 85% -> Excellent (Emerald)
      // 60-85% -> Moderate (Amber)
      // < 60% -> Poor (Ruby)
      const statusLabel = isDataMissing || calculatedScore === 0
        ? 'NA'
        : calculatedScore > 85
        ? 'Excellent'
        : calculatedScore >= 60
        ? 'Moderate'
        : 'Poor';

      const summary = isDataMissing
        ? 'NA'
        : aiZ?.summary && typeof aiZ.summary === 'string' && aiZ.summary.trim().length > 15
        ? aiZ.summary.trim()
        : `Agro-climatic suitability analysis completed for ${z.name}.`;

      const mitigations = Array.isArray(aiZ?.mitigations) && aiZ.mitigations.length > 0
        ? aiZ.mitigations
        : ['Proceed with standard agronomic field protocols.'];

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
          { parameter: 'Annual Rainfall', zoneValue: z.rainfall, requirement: techRequirements.rainfallStr, compatibility: rainCompat, caution: !String(rainCompat).toUpperCase().includes('OPTIMAL') },
          { parameter: 'Soil pH Range', zoneValue: z.soil_ph, requirement: techRequirements.phStr, compatibility: phCompat, caution: !String(phCompat).toUpperCase().includes('OPTIMAL') },
          { parameter: 'Temperature Profile', zoneValue: z.temperature, requirement: techRequirements.temperatureStr, compatibility: tempCompat, caution: !String(tempCompat).toUpperCase().includes('OPTIMAL') },
          { parameter: 'Soil Type (WRB)', zoneValue: z.soil_type, requirement: techRequirements.soilRequirement, compatibility: soilCompat, caution: !String(soilCompat).toUpperCase().includes('OPTIMAL') },
          { parameter: 'Soil Particle Ratio (Sand|Silt|Clay)', zoneValue: z.particle_str, requirement: techRequirements.particleRatioStr, compatibility: particleCompat, caution: !String(particleCompat).toUpperCase().includes('OPTIMAL') },
        ],
        callouts: [
          {
            tone: calculatedScore > 85 ? 'opportunity' : 'caution',
            label: calculatedScore > 85 ? 'Optimal Agro-Ecological Fit' : `Agronomic Mitigation Protocols (${mitigations.length} Factors Addressed)`,
            text: mitigations.length === 1 ? mitigations[0] : mitigations,
            items: mitigations,
          },
        ],
        notes: [
          `Evaluation Engine: Groq LPU (${key}MatchEngine).`,
          `Requirement Baseline: ${techRequirements.source}.`,
          ...(techRequirements.noticeTag ? [techRequirements.noticeTag] : []),
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
      category: label,
      technology: targetTech,
      baseline_source: techRequirements.source,
      is_ai_inferred: Boolean(techRequirements.isAiInferred),
      notice_tag: techRequirements.noticeTag || null,
      requirements_used: {
        rainfall: techRequirements.rainfallStr,
        temperature: techRequirements.temperatureStr,
        soil_ph: techRequirements.phStr,
        soil_type: techRequirements.soilRequirement,
        particle_ratio: techRequirements.particleRatioStr
      },
      executive_overview: {
        total_zones_analysed: zonesData.length,
        average_score: avgScore > 0 ? `${avgScore}% avg` : 'NA',
        best_zone: bestZone ? bestZone.name : 'NA',
        notice_tag: techRequirements.noticeTag || null,
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
        priority: z.score > 85 ? 'Priority 1 (Target Launch)' : z.score >= 60 ? 'Priority 2 (Expansion)' : 'Priority 3 (Caution)',
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

export const calculateMatchScore = getMatchScore;