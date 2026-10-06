// controllers/gtmController.js
import { handleSeedGtm } from './gtm/seedGtmController.js';
import { handleBioGtm } from './gtm/bioGtmController.js';
import { handleCropProtectionGtm } from './gtm/cropProtectionGtmController.js';
import { handleFertilizerGtm } from './gtm/fertilizerGtmController.js';
import { handleMachineryGtm } from './gtm/machineryGtmController.js';

const gtmCache = new Map();
const activeGtmRequests = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour memory cache

const resolveGtmCategory = (category = '', tech = '', crop = '') => {
  const c = String(category || '').toLowerCase().trim();
  const t = String(tech || '').toLowerCase().trim();
  const cr = String(crop || '').toLowerCase().trim();

  // 1. Farm Machinery & Equipment
  if (
    c.includes('machin') || c.includes('equipment') || c.includes('tractor') ||
    c === 'farm-machinery' || t.includes('tractor') || t.includes('deere') ||
    t.includes('harvester') || t.includes('plough') || t.includes('planter') ||
    cr.includes('mechaniz')
  ) {
    return { key: 'machinery', handler: handleMachineryGtm, label: 'Farm Machinery & Equipment' };
  }

  // 2. Biological Inputs
  if (
    c.includes('bio') || c.includes('inoculant') || c.includes('stimulant') ||
    t.includes('bio-') || t.includes('rhizobium') || t.includes('mycorrhiza') || t.includes('microb')
  ) {
    return { key: 'bio', handler: handleBioGtm, label: 'Biological Inputs' };
  }

  // 3. Crop Protection & Agrochem
  if (
    c.includes('protect') || c.includes('pest') || c.includes('fungic') ||
    c.includes('insectic') || c.includes('herbic') || c.includes('agrochem') ||
    t.includes('herbicide') || t.includes('fungicide') || t.includes('insecticide')
  ) {
    return { key: 'crop_protection', handler: handleCropProtectionGtm, label: 'Crop Protection & Agrochem' };
  }

  // 4. Fertilizers & Plant Nutrients
  if (
    c.includes('fert') || c.includes('nutrient') || c.includes('npk') ||
    t.includes('urea') || t.includes('dap') || t.includes('potash')
  ) {
    return { key: 'fertilizers', handler: handleFertilizerGtm, label: 'Fertilizers & Plant Nutrients' };
  }

  // 5. Default Seeds & Varieties
  return { key: 'seeds', handler: handleSeedGtm, label: 'Seeds & Varieties' };
};

export const generateDynamicGtmPlan = async (req, res) => {
  const { country, crop, variety, category, yieldImpact, benefits, applicationMethod } = req.body || {};

  const targetCountry = (country || 'Target Market').trim();
  const targetCategory = (category || 'Agricultural Input').trim();
  const targetTech = (variety || 'Commercial Agricultural Product').trim();

  // 1. Resolve Exact Domain Handler
  const { key: catKey, handler, label: resolvedCategory } = resolveGtmCategory(targetCategory, targetTech, crop);

  // 2. Sanitize Target Context
  let targetCrop = (crop || '').trim();
  if (!targetCrop || targetCrop.toLowerCase().includes('target crop')) {
    if (catKey === 'machinery') targetCrop = 'Agricultural Mechanization & Multi-Crop Operations';
    else if (catKey === 'fertilizers') targetCrop = 'Balanced Soil Nutrition & Basal Operations';
    else if (catKey === 'crop_protection') targetCrop = 'Integrated Pest & Disease Management';
    else if (catKey === 'bio') targetCrop = 'Soil Health & Biological Regeneration';
    else targetCrop = 'Certified High-Yield Production';
  }

  const targetYield = (yieldImpact || 'Commercial Standard Benchmarks').trim();
  const cacheKey = `${targetCountry.toLowerCase()}_${catKey}_${targetCrop.toLowerCase()}_${targetTech.toLowerCase()}`;

  // Check In-Memory Cache
  if (gtmCache.has(cacheKey)) {
    const cachedEntry = gtmCache.get(cacheKey);
    if (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log(`⚡ [GROQ GTM CACHE HIT] Serving cached AI plan for ${targetCountry} -> [${catKey.toUpperCase()}] ${targetTech}`);
      return res.json({ success: true, data: cachedEntry.data, cached: true });
    }
    gtmCache.delete(cacheKey);
  }

  // Deduplicate in-flight requests
  if (activeGtmRequests.has(cacheKey)) {
    try {
      const ongoingData = await activeGtmRequests.get(cacheKey);
      return res.json({ success: true, data: ongoingData });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  const executeGtmGeneration = (async () => {
    console.log('\n' + '='.repeat(70));
    console.log(`⚡ [GROQ LPU GTM] Generating Plan for [${resolvedCategory.toUpperCase()}]`);
    console.log('='.repeat(70));
    console.log(`🌍 Destination Country : "${targetCountry}"`);
    console.log(`🌾 Target Context      : "${targetCrop}"`);
    console.log(`🏷️  Product / Technology: "${targetTech}"`);
    console.log(`⚙️  Dispatched Handler  : controllers/gtm/${catKey}GtmController.js`);
    console.log('-'.repeat(70));

    const timerStart = Date.now();

    try {
      const parsed = await handler({
        country: targetCountry,
        technology: targetTech,
        category: resolvedCategory,
        crop: targetCrop,
        yieldImpact: targetYield,
        benefits,
        applicationMethod,
      });

      const duration = ((Date.now() - timerStart) / 1000).toFixed(2);
      console.log(`   ✨ [GROQ GTM COMPLETED] Successfully generated plan in ⏱️ ${duration}s!`);

      if (!parsed.milestones || parsed.milestones.length === 0) {
        throw new Error('Groq returned incomplete JSON schema.');
      }

      gtmCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
      return parsed;
    } catch (err) {
      console.error(`   ❌ [GROQ GTM FAILED]:`, err.message);
      throw err;
    }
  })();

  activeGtmRequests.set(cacheKey, executeGtmGeneration);

  try {
    const result = await executeGtmGeneration;
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Groq Generation Error: ${error.message}`,
    });
  } finally {
    activeGtmRequests.delete(cacheKey);
  }
};