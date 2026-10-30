// controllers/recommendationController.js
import { supabase } from '../config/db.js';
import { extractNumericRange } from '../utils/helpers.js';

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

// 1. Exact DB Aggregator for Technology Requirements
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

  const { data: statesData, error } = await supabase
    .from('india_states_climate_soil')
    .select('*')
    .in('"State Name"', states);

  if (error || !statesData || statesData.length === 0) return null;

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

  return {
    rainfallStr: minRain !== null && maxRain !== null ? `${minRain}–${maxRain} mm` : 'NA',
    phStr: phLower !== null && phUpper !== null ? `${phLower}–${phUpper}` : 'NA',
    temperatureStr: minTemp !== null && maxTemp !== null ? `${minTemp}°C – ${maxTemp}°C` : '18°C – 35°C',
    soilRequirement: textureWithWrb,
    particleValues: reqSand !== null ? { sand: reqSand, silt: reqSilt, clay: reqClay } : { sand: 35, silt: 35, clay: 30 },
  };
};

// 2. Strict Numerical Evaluator
function evaluateStrictAgronomics(zVal, rVal, type, extraContext = {}) {
  if (!zVal || zVal === 'NA' || zVal === 'N/A' || !rVal || rVal === 'NA' || rVal === 'N/A') {
    return { status: 'NA', score: 0 };
  }

  // 1. Annual Rainfall (Max 25 pts)
  if (type === 'rain') {
    const z = extractNumericRange(zVal);
    const r = extractNumericRange(rVal);
    if (!z || !r) return { status: 'NA', score: 0 };

    const zMin = z[0];
    const zMax = z.length > 1 ? z[1] : z[0];
    const rMin = r[0];
    const rMax = r.length > 1 ? r[1] : r[0];

    if (zMax < rMin - 250) return { status: 'Very Low', score: 5 };
    if (zMax < rMin) return { status: 'Low', score: 12 };
    if (zMin > rMax + 250) return { status: 'Very High', score: 5 };
    if (zMin > rMax) return { status: 'High', score: 12 };
    return { status: 'Optimal', score: 25 };
  }

  // 2. Soil pH Range (Max 25 pts)
  if (type === 'ph') {
    const z = extractNumericRange(zVal);
    if (!z) return { status: 'NA', score: 0 };
    const ph = z[0];

    if (ph < 5.0) return { status: 'Extreme Acidic', score: 4 };
    if (ph >= 5.0 && ph < 6.8) return { status: 'Acidic Stress', score: 12 };
    if (ph >= 6.8 && ph <= 7.3) return { status: 'Optimal', score: 25 };
    if (ph > 7.3 && ph <= 9.0) return { status: 'Alkaline Stress', score: 12 };
    return { status: 'Extreme Alkaline', score: 4 };
  }

  // 3. Temperature Profile (Max 20 pts)
  if (type === 'temp') {
    const z = extractNumericRange(zVal);
    const r = extractNumericRange(rVal);
    if (!z || !r) return { status: 'NA', score: 0 };

    const zMin = z[0];
    const zMax = z.length > 1 ? z[1] : z[0];
    const rMin = r[0];
    const rMax = r.length > 1 ? r[1] : r[0];

    if (zMax > rMax) return { status: 'Heat Stress', score: 8 };
    if (zMin < rMin) return { status: 'Cold Stress', score: 8 };
    return { status: 'Optimal', score: 20 };
  }

  // 4. Soil Type (Max 15 pts)
  if (type === 'soil') {
    const zLow = zVal.toLowerCase();
    const rLow = rVal.toLowerCase();

    if (
      (zLow.includes('clay') && (rLow.includes('sand') || rLow.includes('sandy loam'))) ||
      (zLow.includes('sand') && (rLow.includes('clay') || rLow.includes('clay loam')))
    ) {
      return { status: 'Sub Optimal', score: 6 };
    }
    return { status: 'Optimal', score: 15 };
  }

  // 5. Soil Particle Ratio (Max 15 pts)
  if (type === 'particles') {
    const zObj = extraContext.zoneParticles;
    const rObj = extraContext.reqParticles;
    if (!zObj || !rObj || zObj.sand === null || rObj.sand === null) {
      return { status: 'Optimal', score: 15 };
    }

    const diffSand = zObj.sand - rObj.sand;
    const diffSilt = zObj.silt - rObj.silt;
    const diffClay = zObj.clay - rObj.clay;
    const TOLERANCE = 8.0;

    if (Math.abs(diffSand) <= TOLERANCE && Math.abs(diffClay) <= TOLERANCE && Math.abs(diffSilt) <= TOLERANCE) {
      return { status: 'Optimal', score: 15 };
    }

    if (diffClay > TOLERANCE || diffClay < -TOLERANCE || diffSand > TOLERANCE || diffSand < -TOLERANCE) {
      return { status: 'Sub Optimal', score: 8 };
    }

    return { status: 'Optimal', score: 12 };
  }

  return { status: 'NA', score: 0 };
}

// In-memory cache for all global zones from Supabase
let globalZonesCache = null;
let lastCacheTime = 0;

async function getGlobalZones() {
  const now = Date.now();
  if (globalZonesCache && (now - lastCacheTime < 300000)) {
    return globalZonesCache;
  }

  const [zoneRes, soilDbRes, climateDbRes] = await Promise.all([
    supabase.from('agroclimatic_zones').select('*'),
    supabase.from('zone_soil_analytics').select('*'),
    supabase.from('zone_climate_analytics').select('*'),
  ]);

  if (zoneRes.error) throw new Error(zoneRes.error.message);

  const soilMap = new Map((soilDbRes.data || []).map((s) => [
    `${(s.Country || '').toLowerCase().trim()}__${(s['Agroclimatic Zone'] || s.zone_name || '').toLowerCase().trim()}`,
    s
  ]));

  const climateMap = new Map((climateDbRes.data || []).map((c) => [
    `${(c.Country || '').toLowerCase().trim()}__${(c['Zone Name'] || c.zone_name || '').toLowerCase().trim()}`,
    c
  ]));

  globalZonesCache = (zoneRes.data || []).map((z, i) => {
    const cName = (z.country || '').trim();
    const zName = z.zone_name || z.Zone_Name || `Zone ${i + 1}`;
    const lookupKey = `${cName.toLowerCase()}__${zName.toLowerCase()}`;

    const sRow = soilMap.get(lookupKey);
    const cRow = climateMap.get(lookupKey);

    const textureName = sRow?.['Texture Class (USDA)'] || z.soil_type || 'Clay Loam';
    const wrbTaxonomy = sRow?.['WRB Soil Taxonomy'] || sRow?.wrb_soil_taxonomy || '';
    const zSand = parseFloat(sRow?.['Sand Ratio (%)'] ?? 35);
    const zSilt = parseFloat(sRow?.['Silt Ratio (%)'] ?? 35);
    const zClay = parseFloat(sRow?.['Clay Ratio (%)'] ?? 30);

    return {
      country: cName,
      name: zName,
      rainfall: cRow?.['Baseline Rainfall'] || cRow?.baseline_rainfall || z.baseline_rainfall || '850-1100 mm',
      soil_ph: sRow?.['pH Level (0-30cm)'] != null ? `${sRow['pH Level (0-30cm)']}` : sRow?.ph_level != null ? `${sRow.ph_level}` : z.soil_ph || '6.5',
      soil_type: wrbTaxonomy ? `${textureName} (${wrbTaxonomy})` : textureName,
      temperature: cRow?.['Baseline Temperature'] || cRow?.baseline_temperature || z.baseline_temperature || '20°C – 32°C',
      particle_values: { sand: Math.round(zSand), silt: Math.round(zSilt), clay: Math.round(zClay) },
    };
  });

  lastCacheTime = now;
  return globalZonesCache;
}

// 3. Alternative Seed Market Recommendation Engine
export const getSeedRecommendations = async (req, res) => {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('🌾 [SEED RECOMMENDATION ENGINE] Running analysis for alternative markets...');
  
  try {
    const { tech, currentCountry } = req.body;
    const targetCountry = String(currentCountry || '').trim();
    const targetTech = tech?.varietyName || tech?.name || 'Commercial Seed';
    const targetCrop = tech?.crop || tech?.cropName || targetTech;
    const passedStates = tech?.originRegion || tech?.recommendedStates || null;

    console.log(`🎯 Tech: "${targetTech}" | Crop: "${targetCrop}" | Current Country: "${targetCountry}"`);

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
      techRequirements = {
        rainfallStr: '700–1200 mm',
        phStr: '6.0–7.5',
        temperatureStr: '18°C – 34°C',
        soilRequirement: 'Clay Loam (Cambisols)',
        particleValues: { sand: 35, silt: 35, clay: 30 },
      };
    }

    const allGlobalZones = await getGlobalZones();
    console.log(`📦 [DB READY] Evaluating ${allGlobalZones.length} total zones across Supabase.`);

    const countryMatches = {};
    let totalChecked = 0;
    let totalEligible = 0;

    allGlobalZones.forEach((z) => {
      if (!z.country || (targetCountry && z.country.toLowerCase() === targetCountry.toLowerCase())) {
        return;
      }

      totalChecked++;

      const rainEval = evaluateStrictAgronomics(z.rainfall, techRequirements.rainfallStr, 'rain');
      const phEval = evaluateStrictAgronomics(z.soil_ph, techRequirements.phStr, 'ph');
      const tempEval = evaluateStrictAgronomics(z.temperature, techRequirements.temperatureStr, 'temp');
      const soilEval = evaluateStrictAgronomics(z.soil_type, techRequirements.soilRequirement, 'soil');
      const particleEval = evaluateStrictAgronomics('', '', 'particles', {
        zoneParticles: z.particle_values,
        reqParticles: techRequirements.particleValues
      });

      const score = Math.min(
        100,
        Math.max(15, rainEval.score + phEval.score + tempEval.score + soilEval.score + particleEval.score)
      );

      if (score >= 80) {
        totalEligible++;
        const cKey = z.country;
        if (!countryMatches[cKey]) {
          countryMatches[cKey] = {
            country: cKey,
            maxScore: 0,
            zones: []
          };
        }

        countryMatches[cKey].zones.push({
          zoneName: z.name,
          rainfall: z.rainfall,
          soilPh: z.soil_ph,
          soilTexture: z.soil_type,
          score
        });

        if (score > countryMatches[cKey].maxScore) {
          countryMatches[cKey].maxScore = score;
        }
      }
    });

    const top3Countries = Object.values(countryMatches)
      .sort((a, b) => b.maxScore - a.maxScore)
      .slice(0, 3)
      .map((item) => ({
        country: item.country,
        zones: item.zones.sort((z1, z2) => z2.score - z1.score)
      }));

    const duration = Date.now() - startTime;
    console.log(`✅ [RECOMMENDATION COMPLETED] Evaluated: ${totalChecked} zones | Found >=80%: ${totalEligible} zones across ${Object.keys(countryMatches).length} countries.`);
    console.log(`🏆 Selected Top 3:`, top3Countries.map((c) => `${c.country} (${c.zones.length} zones, top: ${c.zones[0]?.score}%)`));
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log('='.repeat(60) + '\n');

    return res.json({
      success: true,
      executionTimeMs: duration,
      recommendations: top3Countries
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`❌ [RECOMMENDATION FAILED] in ${duration}ms:`, err);
    return res.status(500).json({ success: false, error: err.message, executionTimeMs: duration });
  }
};

// 4. Legacy Vendor Recommendation
const calculateSuitabilityScore = (product, zoneData, targetCrop) => {
  let score = 50;
  const cropLower = (targetCrop || '').toLowerCase();

  const isTargetCropInZone = zoneData?.main_crops?.some(c => 
    c.toLowerCase().includes(cropLower)
  );

  const isProductForCrop = product?.target_crops?.some(c => 
    c.toLowerCase().includes(cropLower) || c.toLowerCase().includes('all crops')
  );

  if (isTargetCropInZone && isProductForCrop) {
    score += 30;
  } else if (isProductForCrop) {
    score += 15;
  }

  if (zoneData?.soil_ph && zoneData.soil_ph >= 6.0 && zoneData.soil_ph <= 8.0) {
    score += 10;
  }

  if (product?.technology_type) {
    score += 10;
  }

  return Math.min(score, 100);
};

export const getVendorRecommendations = async (req, res) => {
  try {
    const { latitude, longitude, crop } = req.body;

    if (!latitude || !longitude || !crop) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: latitude, longitude, and crop are required.' 
      });
    }

    const { data: zoneData, error: zoneError } = await supabase
      .rpc('get_agroclimatic_zone', { lat: parseFloat(latitude), lng: parseFloat(longitude) });

    if (zoneError || !zoneData || zoneData.length === 0) {
      return res.status(404).json({ success: false, error: 'No agroclimatic zone found for the given coordinates.' });
    }

    const currentZone = zoneData[0];

    const { data: products, error: productError } = await supabase
      .from('vendor_products')
      .select('*');

    if (productError) {
      return res.status(500).json({ success: false, error: productError.message });
    }

    const scoredProducts = (products || [])
      .map(product => {
        const matchScore = calculateSuitabilityScore(product, currentZone, crop);
        return {
          ...product,
          suitability_score: `${matchScore}%`,
          score_numeric: matchScore
        };
      })
      .sort((a, b) => b.score_numeric - a.score_numeric)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      agroclimatic_profile: currentZone,
      recommended_products: scoredProducts
    });

  } catch (err) {
    console.error('❌ Error in recommendation engine:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getRecommendations = getVendorRecommendations;