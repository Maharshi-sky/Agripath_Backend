// controllers/match/cropProtectionMatchEngine.js
import { supabase } from '../../config/db.js';
import { queryAI } from '../../utils/aiService.js';

const formatDuration = (ms) => `${(ms / 1000).toFixed(2)}s (${ms}ms)`;

// 1. Fetch Distinct Chemical Types (Fixes Step 1 Dropdown)
export const getCropProtectionChemicalTypes = async (req, res) => {
  try {
    const { data, error } = await supabase.from('crop_protection').select('*');
    if (error) throw error;
    const types = (data || []).map((r) => r['Chemical Type'] || r['chemical_type']);
    const uniqueTypes = [...new Set(types.filter(Boolean))].sort();
    return res.status(200).json({ success: true, data: uniqueTypes });
  } catch (err) {
    console.error('❌ Error in getCropProtectionChemicalTypes:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Fetch Raw Products by Chemical Type
export const getCropProtectionProducts = async (req, res) => {
  try {
    const { chemicalType } = req.query;
    const { data, error } = await supabase.from('crop_protection').select('*');
    if (error) throw error;
    let filtered = data || [];
    if (chemicalType) {
      filtered = filtered.filter((r) => {
        const val = r['Chemical Type'] || r['chemical_type'] || '';
        return val.toLowerCase().trim() === chemicalType.toLowerCase().trim();
      });
    }
    return res.status(200).json({ success: true, data: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Fast Core Match Engine (Instant Load for All Zones)
export const calculateCropProtectionMatch = async (req, res) => {
  const globalStartTime = Date.now();
  try {
    const { country, chemicalType } = req.body;
    const targetCountry = country || 'Kenya';
    const targetChemType = chemicalType || 'Fungicides';

    const [zoneDisRes, soilRes, climateRes, prodRes] = await Promise.all([
      supabase.from('all_zones_diseases').select('*').ilike('Country', targetCountry),
      supabase.from('zone_soil_analytics').select('*').ilike('Country', targetCountry),
      supabase.from('zone_climate_analytics').select('*').ilike('Country', targetCountry),
      supabase.from('crop_protection').select('*')
    ]);

    const rawDiseaseZones = zoneDisRes.data || [];
    const allProducts = prodRes.data || [];

    const matchingProducts = allProducts.filter((p) => {
      const pType = String(p['Chemical Type'] || p['chemical_type'] || '').toLowerCase().trim();
      const selected = targetChemType.toLowerCase().trim();
      return pType === selected || pType.includes(selected) || selected.includes(pType);
    });

    const candidateProducts = matchingProducts.length > 0 ? matchingProducts : allProducts.slice(0, 10);

    const zonesData = rawDiseaseZones.map((z, idx) => {
      const zName = z['Zone Name'] || `Zone ${idx + 1}`;
      const cRow = (climateRes.data || []).find((c) => c['Zone Name'] === zName || c.zone_name === zName) || climateRes.data?.[idx] || {};
      const sRow = (soilRes.data || []).find((s) => s['Zone Name'] === zName || s.zone_name === zName) || soilRes.data?.[idx] || {};
      const rainfall = parseFloat(cRow['Baseline Rainfall'] || 1200);

      const zoneCrops = String(z['Key Crops Cultivated in Zone'] || '').toLowerCase();
      const fungalPathogens = String(z['Primary Fungal Pathogens'] || '').toLowerCase();
      const fungalDiseases = String(z['Diseases Cured by Fungicides'] || '').toLowerCase();
      const fungalAIs = String(z['Fungicide Active Ingredients'] || '').toLowerCase();
      const weedPressures = String(z['Weed Pressures Controlled by Herbicides'] || '').toLowerCase();
      const herbicideAIs = String(z['Herbicide Active Ingredients'] || '').toLowerCase();
      const insectPressures = String(z['Pest Pressures Controlled by Insecticides'] || '').toLowerCase();
      const insectVectors = String(z['Key Insect Vectors'] || '').toLowerCase();
      const insecticideAIs = String(z['Insecticide Active Ingredients'] || '').toLowerCase();

      const rankedProducts = candidateProducts.map((prod, pIdx) => {
        const prodCrop = String(prod['Target Crop'] || prod['Target Crops'] || '').toLowerCase();
        const prodPest = String(prod['Target Pest'] || '').toLowerCase();
        const prodFormula = String(prod['Chemical Composition'] || '').toLowerCase();
        const prodType = String(prod['Chemical Type'] || targetChemType).toLowerCase();

        let infectionPressure = 18;
        let pathogenAssessment = 'Moderate regional infection pressure';
        const pestTokens = prodPest.split(/[,/;()]+/).map((t) => t.trim()).filter(Boolean);

        if (prodType.includes('fungic')) {
          const matched = pestTokens.some((p) => fungalPathogens.includes(p) || fungalDiseases.includes(p));
          if (matched) {
            infectionPressure = 25;
            pathogenAssessment = 'Direct target pathogen present in zone disease vector';
          } else if (rainfall > 1100) {
            infectionPressure = 22;
            pathogenAssessment = 'High humidity vector elevates foliar fungal susceptibility';
          } else {
            infectionPressure = 19;
            pathogenAssessment = 'Secondary fungal pressure under local moisture';
          }
        } else if (prodType.includes('insectic')) {
          const matched = pestTokens.some((p) => insectPressures.includes(p) || insectVectors.includes(p));
          infectionPressure = matched ? 25 : 21;
          pathogenAssessment = matched ? 'Direct insect vector match in zone infestation history' : 'Secondary foliar/stem pest pressure';
        } else if (prodType.includes('herbic')) {
          const matched = pestTokens.some((p) => weedPressures.includes(p));
          infectionPressure = matched ? 25 : 20;
          pathogenAssessment = matched ? 'Direct weed spectrum overlap in regional canopy' : 'Broadleaf / grass maintenance weed pressure';
        }

        const cropTokens = prodCrop.split(/[,/;()]+/).map((c) => c.trim()).filter(Boolean);
        const hostMatched = cropTokens.some((c) => zoneCrops.includes(c));
        const hostAlignment = hostMatched ? 25 : 18;
        const hostAssessment = hostMatched ? 'Direct primary crop cultivated at scale in zone' : 'Secondary or diversified regional host crop';

        let chemicalFit = 20;
        let aiAssessment = 'General protective chemical spectrum';
        const formulaTokens = prodFormula.split(/[,/+;()0-9%]+/).map((f) => f.trim()).filter((f) => f.length > 3);

        if (prodType.includes('fungic')) {
          const aiMatched = formulaTokens.some((ai) => fungalAIs.includes(ai));
          chemicalFit = aiMatched ? 25 : 22;
          aiAssessment = aiMatched ? 'Zone-recommended fungicide active ingredient' : 'Alternative chemical MoA providing disease control';
        } else if (prodType.includes('insectic')) {
          const aiMatched = formulaTokens.some((ai) => insecticideAIs.includes(ai));
          chemicalFit = aiMatched ? 25 : 22;
          aiAssessment = aiMatched ? 'Zone-recommended insecticide active chemistry' : 'Rotational insecticide active ingredient';
        } else if (prodType.includes('herbic')) {
          const aiMatched = formulaTokens.some((ai) => herbicideAIs.includes(ai));
          chemicalFit = aiMatched ? 25 : 22;
          aiAssessment = aiMatched ? 'Standard selective weed control chemical fit' : 'General knockdown herbicide active ingredient';
        }

        const isDualAi = prodFormula.includes('+') || formulaTokens.length > 1;
        const resistanceBarrier = isDualAi ? 24 : 22;
        const totalScore = infectionPressure + hostAlignment + chemicalFit + resistanceBarrier;

        const defaultVerdict = totalScore >= 85
          ? `${prod['Product Name']} provides aggressive curative and protective control against prevailing disease vectors in ${zName}. Formulated with ${prod['Chemical Composition']}, it delivers strong foliar rainfastness and systemic persistence suited for ${prod['Target Crop'] || 'target crops'}, checking pathogen escalation before epidemic thresholds.`
          : totalScore >= 70
          ? `Offers reliable prophylactic protection to suppress early pathogen inoculum in ${zName}. Recommended as a preventative spray program for ${prod['Target Crop'] || 'local crops'} at disease onset, maintaining field defense under ambient moisture conditions.`
          : `Provides secondary or general maintenance protection. Best deployed in tank mixtures or rotation programs to manage resistance barriers against localized pathogen pressures.`;

        const pathogen_gaps = [
          {
            vector: 'Target Pathogen / Vector',
            productTarget: prod['Target Pest'] || 'Broad Spectrum',
            assessment: pathogenAssessment,
            weight: `+${infectionPressure} pts`
          },
          {
            vector: 'Host Crop Alignment',
            productTarget: prod['Target Crop'] || 'General Crops',
            assessment: hostAssessment,
            weight: `+${hostAlignment} pts`
          },
          {
            vector: 'Active Ingredient Fit',
            productTarget: prod['Chemical Composition'] || 'Active Tech',
            assessment: aiAssessment,
            weight: `+${chemicalFit} pts`
          }
        ];

        const ledger = [
          {
            parameter: 'Rainfall / Wash-off Risk',
            zone_val: `${rainfall} mm`,
            effect: rainfall > 1100 ? 'High wash-off risk; systemic retention critical' : 'Moderate rainfall; standard foliar adherence',
            mul: rainfall > 1100 ? 'x1.00' : 'x0.95'
          },
          {
            parameter: 'Resistance Barrier (FRAC/IRAC)',
            zone_val: isDualAi ? 'Multi-Site / Dual MoA' : 'Single Site MoA',
            effect: isDualAi ? 'Dual A.I. synergy deters resistance mutation' : 'Single site formulation; rotational program recommended',
            mul: isDualAi ? 'x1.00' : 'x0.90'
          },
          {
            parameter: 'Soil / Foliar Half-Life',
            zone_val: `pH ${sRow['pH Level (0-30cm)'] || '6.2'}`,
            effect: 'Stable chemical half-life with minimal hydrolysis risk',
            mul: 'x1.00'
          }
        ];

        return {
          id: pIdx + 1,
          srNo: prod['Sr. No.'] || prod['sr_no'] || pIdx + 1,
          name: prod['Product Name'] || prod['product_name'] || 'Formulation',
          chemicalType: prod['Chemical Type'] || targetChemType,
          company: prod['Manufacturer'] || prod['Manufracturer Name'] || 'Agro Chem',
          formula: prod['Chemical Composition'] || '',
          description: prod['Description'] || '',
          packaging: prod['Available Packaging'] || 'Standard Pack',
          featuresBenefits: prod['Features & Benefits'] || '',
          modeOfAction: prod['Mode of Action'] || '',
          targetCrops: prod['Target Crop'] || 'General Crops',
          targetPest: prod['Target Pest'] || 'Broad Spectrum',
          dosage: prod['Dosage/acre'] || 'Standard Dosage',
          application: prod['Application'] || 'Foliar spray at threshold.',
          score: totalScore,
          verdict: defaultVerdict,
          pathogen_gaps,
          ledger,
          pillars: {
            diseasePressure: infectionPressure,
            hostAlignment,
            chemicalFit,
            resistanceBarrier
          }
        };
      }).sort((a, b) => b.score - a.score);

      return {
        k: String(z.id || `zone_${idx + 1}`),
        c: z.Country || targetCountry,
        z: zName,
        crop: z['Key Crops Cultivated in Zone'] || 'General crops',
        ph: sRow['pH Level (0-30cm)'] || '6.2',
        cec: sRow['Cation Exchange Capacity (CEC)'] || '18.5',
        rain: `${rainfall} mm`,
        temp: cRow['Baseline Temperature'] || '22°C - 28°C',
        products: rankedProducts,
        threats: z['Primary Fungal Pathogens'] || z['Pest Pressures Controlled by Insecticides'] || z['Weed Pressures Controlled by Herbicides'] || 'Endemic vectors'
      };
    });

    console.log(`⚡ [MATCH ENGINE] Evaluated ${zonesData.length} zones in ${formatDuration(Date.now() - globalStartTime)}`);
    return res.status(200).json({
      success: true,
      country: targetCountry,
      chemicalType: targetChemType,
      zones: zonesData
    });
  } catch (err) {
    console.error('❌ Error in calculateCropProtectionMatch:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Ultra-Fast Groq LPU Synthesis for Active Selected Zone (Replaces local Ollama)
export const synthesizeCropProtectionZone = async (req, res) => {
  const startTime = Date.now();
  try {
    const { country, zoneName, rainfall, threats, topProducts } = req.body;
    if (!topProducts || topProducts.length === 0) {
      return res.status(400).json({ success: false, error: 'Products required' });
    }

    console.log('\n----------------------------------------------------------------------');
    console.log(`🤖 [GROQ LPU SYNTHESIS] Zone: "${zoneName}" (${country})`);
    console.log(`🌦️  Conditions: ${rainfall} | Threats: ${threats}`);
    console.log(`📦 Candidates: ${topProducts.length} formulations queued`);

    const systemInstruction = `You are a Senior Plant Pathologist and Agronomist in ${country}. Output STRICT JSON ONLY. Return an array of objects matching schema: [{"id": 1, "verdict": "Two natural consulting sentences."}].`;

    const prompt = `Write a 2-sentence agronomic advisory for each product in "${zoneName}" under ${rainfall} rainfall and endemic threats "${threats}":
${JSON.stringify(topProducts.map((p) => ({ id: p.id, name: p.name, actives: p.ai })))}

Sentence 1: Curative/protective action against regional vectors.
Sentence 2: Practical timing under local moisture and temperature.`;

    let list = [];
    try {
      const parsed = await queryAI(prompt, systemInstruction);
      list = Array.isArray(parsed) ? parsed : parsed.verdicts || parsed.evaluations || [];
    } catch (groqErr) {
      console.warn(`⚠️ [GROQ AI WARNING]: ${groqErr.message}. Keeping default verdicts.`);
    }

    console.log(`✅ [GROQ SYNTHESIS COMPLETE] Finished for "${zoneName}" in ${formatDuration(Date.now() - startTime)}`);
    console.log('----------------------------------------------------------------------\n');

    return res.status(200).json({ success: true, verdicts: list });
  } catch (err) {
    console.warn(`⚠️ [SYNTHESIS ERROR] for "${req.body?.zoneName}": ${err.message}`);
    return res.status(200).json({ success: false, error: err.message, verdicts: [] });
  }
};

// 5. Unified Dispatcher Interface (For master controller compatibility)
export const evaluateCropProtectionMatch = async ({ technology, country, techRequirements, zonesList }) => {
  return {
    overall_country_compatibility: 82,
    zones: zonesList.map((z, i) => ({
      zone_index: i + 1,
      zone_name: z.name,
      score: 80,
      summary: `Pathogen pressure evaluation for ${z.name}.`,
      rain_compatibility: 'Optimal',
      ph_compatibility: 'Optimal',
      temp_compatibility: 'Optimal',
      soil_compatibility: 'Optimal',
      particle_compatibility: 'Optimal',
      mitigations: ['Mix with non-ionic surfactant / sticker to resist rainfall washout.']
    }))
  };
};