// controllers/regulatoryController.js
import { handleSeedRegulatory } from './regulatory/seedRegulatoryController.js';
import { handleBioRegulatory } from './regulatory/bioRegulatoryController.js';
import { handleCropProtectionRegulatory } from './regulatory/cropProtectionRegulatoryController.js';
import { handleFertilizerRegulatory } from './regulatory/fertilizerRegulatoryController.js';
import { handleMachineryRegulatory } from './regulatory/machineryRegulatoryController.js';
import { getSimilarRegulatoryInfo } from '../data/fairsRegulatoryRegistry.js';

const resolveHandler = (cat = '') => {
  const c = cat.toLowerCase().trim();

  if (c.includes('bio') || c === 'bio-inputs') {
    return { key: 'bio', handler: handleBioRegulatory, defaultCat: 'Biological Inputs' };
  }
  if (c.includes('fert') || c.includes('nutrient') || c === 'fertilizers') {
    return { key: 'fertilizers', handler: handleFertilizerRegulatory, defaultCat: 'Fertilizers & Plant Nutrients' };
  }
  if (
    c.includes('protect') || c.includes('pest') || c.includes('agrochem') ||
    c.includes('fungic') || c.includes('insectic') || c.includes('herbic') ||
    c.includes('chemical') || c === 'crop-protection'
  ) {
    return { key: 'crop_protection', handler: handleCropProtectionRegulatory, defaultCat: 'Crop Protection & Agrochem' };
  }
  if (c.includes('machin') || c.includes('equipment') || c === 'farm-machinery') {
    return { key: 'machinery', handler: handleMachineryRegulatory, defaultCat: 'Farm Machinery & Equipment' };
  }
  // Default to Seeds
  return { key: 'seeds', handler: handleSeedRegulatory, defaultCat: 'Seeds & Varieties' };
};

export const getRegulatoryPathway = async (req, res) => {
  const reqStart = performance.now();
  const { category, technology, techType, country, selectedCategory, originCountry } = req.body || {};

  const activeCategory = (selectedCategory || category || 'seeds').trim();
  const activeTech = (technology || techType || 'Agricultural Innovation').trim();
  const normalizedCountry = (country || 'Uganda').trim();
  const origin = (originCountry || 'India').trim();

  const { key, handler, defaultCat } = resolveHandler(activeCategory);

  console.log('\n' + '='.repeat(70));
  console.log(`⚖️️  [REGULATORY ENGINE] Target: "${activeTech}" -> 🌍 "${normalizedCountry}"`);
  console.log(`🏷️  Category: "${defaultCat}" (Handler: ${key}) | Mode: 100% Groq LPU`);
  console.log('='.repeat(70));

  try {
    const aiData = await handler({
      country: normalizedCountry,
      technology: activeTech,
      category: defaultCat,
      origin
    });

    // Resolve Similar Regulations & FAIRS Documentation for Country
    const similarRegulations = getSimilarRegulatoryInfo(normalizedCountry);

    const totalDuration = ((performance.now() - reqStart) / 1000).toFixed(2);
    console.log(`✨ [REGULATORY READY] Completed in ⏱️ ${totalDuration}s`);
    console.log('='.repeat(70) + '\n');

    // Dual-contract return (works whether frontend unwraps res.data or reads root props)
    return res.json({
      success: true,
      category: defaultCat,
      ...aiData,
      similarRegulations,
      data: {
        category: defaultCat,
        ...aiData,
        similarRegulations
      }
    });
  } catch (err) {
    console.error(`💥 [REGULATORY ERROR in ${key}]:`, err.message);
    return res.status(500).json({
      success: false,
      error: `Failed to evaluate statutory pathway for ${defaultCat}: ${err.message}`
    });
  }
};

export const getSeedRegulatoryDirect = async (req, res) => {
  req.body = { ...req.body, category: 'Seeds & Varieties' };
  return getRegulatoryPathway(req, res);
};

export const getBioRegulatoryDirect = async (req, res) => {
  req.body = { ...req.body, category: 'Biological Inputs' };
  return getRegulatoryPathway(req, res);
};

export const getCropProtectionRegulatoryDirect = async (req, res) => {
  req.body = { ...req.body, category: 'Crop Protection & Agrochem' };
  return getRegulatoryPathway(req, res);
};

export const getFertilizerRegulatoryDirect = async (req, res) => {
  req.body = { ...req.body, category: 'Fertilizers & Plant Nutrients' };
  return getRegulatoryPathway(req, res);
};

export const getMachineryRegulatoryDirect = async (req, res) => {
  req.body = { ...req.body, category: 'Farm Machinery & Equipment' };
  return getRegulatoryPathway(req, res);
};

export const getRegulatorySources = async (req, res) => {
  return res.json({
    success: true,
    total_sources: 5,
    sources: [
      { category: 'Seeds & Varieties', engine: 'Groq LPU (ISTA & NPPO Compliance)' },
      { category: 'Biological Inputs', engine: 'Groq LPU (Biosafety & Inoculant Standards)' },
      { category: 'Crop Protection', engine: 'Groq LPU (FAO/WHO Specifications & Codex MRLs)' },
      { category: 'Fertilizers & Nutrients', engine: 'Groq LPU (AOAC & Heavy Metal Assays)' },
      { category: 'Farm Machinery', engine: 'Groq LPU (OECD Test Codes & ISO 4254 Homologation)' }
    ]
  });
};

export const getRegulatoryUpdates = async (req, res) => {
  return res.json({
    success: true,
    total_records: 1,
    records: [{ version: '2026-Q1', engine: 'Groq LPU Statutory Intelligence', status: 'Active' }]
  });
};