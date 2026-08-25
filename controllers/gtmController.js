// agripath-backend/controllers/gtmController.js

// 1. In-Memory Cache & Active Request Registry
const gtmCache = new Map();
const activeGtmRequests = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour memory cache

// Helper to strictly detect if selected technology is a Biological Input
const isBioInput = (cat = '', tech = '', crop = '') => {
  const c = (cat || '').toLowerCase();
  const t = (tech || '').toLowerCase();
  const cr = (crop || '').toLowerCase();
  return (
    c.includes('bio') ||
    c.includes('fertilizer') ||
    c.includes('stimulant') ||
    c.includes('inoculant') ||
    c.includes('pesticide') ||
    t.includes('bio') ||
    t.includes('fertilizer') ||
    t.includes('extract') ||
    cr.includes('bio')
  );
};

// Deterministic Offline Fallback Generator (If Ollama server is offline)
const getStaticFallbackPlan = (isBio, country, crop, tech) => {
  if (isBio) {
    return {
      executive_brief: `Strategic market introduction of ${tech} targeting key ${crop} production belts in ${country}, focusing on soil health restoration and reduction of synthetic chemical inputs.`,
      production_hubs: `High-intensity ${crop} cultivation corridors and irrigated commercial farming zones across ${country}.`,
      planting_window: `Primary soil preparation and basal application windows aligned with the main rainy/sowing seasons in ${country}.`,
      milestones: [
        {
          timing: "Day 1",
          title: "Appoint In-Country Bio-Regulatory Consultant",
          desc: `Submit biological registration dossier and microbial strain authentication to ${country}'s agricultural input regulatory authority.`
        },
        {
          timing: "Week 1",
          title: "Formalize National Bio-Efficacy Trial Partner",
          desc: `Contract national agricultural research institute in ${country} to conduct 1-season microbial crop tolerance and field validation trials.`
        },
        {
          timing: "Week 2–3",
          title: "Establish Cold-Chain & Temperature-Controlled Warehousing",
          desc: `Audit regional storage facilities (15–25°C / 2–8°C) to maintain live CFU viability throughout storage and transportation.`
        },
        {
          timing: "Week 4–6",
          title: "Execute Commercial Agro-Dealer & Cooperative Agreements",
          desc: `Establish distribution agreements with leading agricultural cooperative unions and agrochemical input retail chains in ${country}.`
        },
        {
          timing: "Week 7–9",
          title: "Deploy Multi-Location Side-by-Side Farmer Demo Plots",
          desc: `Demonstrate root development, crop vigor, and 25–30% synthetic fertilizer cost reduction on farmer field school plots.`
        },
        {
          timing: "Week 10–12",
          title: "Commercial Launch & Soil Health Program Integration",
          desc: `Initiate commercial sales campaign and register the product with national regenerative agriculture and soil subsidy schemes.`
        }
      ],
      grants: [
        {
          name: "AGRA Regenerative Agriculture & Soil Health Facility",
          focus: "Promoting biological soil inputs, microbial inoculants, and sustainable smallholder access.",
          link: "https://agra.org"
        },
        {
          name: "AfDB Agriculture Fast Track Fund",
          focus: "Project preparation grants for sustainable agricultural inputs commercialization.",
          link: "https://afdb.org"
        },
        {
          name: "USAID Feed the Future Innovation Fund",
          focus: "Climate-smart agricultural input scaling and distribution across emerging markets.",
          link: "https://feedthefuture.gov"
        }
      ]
    };
  }

  return {
    executive_brief: `Commercial deployment strategy for certified high-yielding ${tech} (${crop}) optimized for agro-ecological resilience in ${country}.`,
    production_hubs: `Major cereal and cash-crop production regions across ${country}.`,
    planting_window: `Primary seasonal planting windows aligned with ${country}'s rainfall calendar.`,
    milestones: [
      {
        timing: "Day 1",
        title: "Appoint In-Country Seed Regulatory Consultant",
        desc: `Initiate variety listing and import clearance with ${country}'s National Seed Authority.`
      },
      {
        timing: "Week 1",
        title: "Formalize Variety Adaptation & DUS Trial Partner",
        desc: `Partner with ${country} agricultural research centers for mandatory multi-location field performance validation.`
      },
      {
        timing: "Week 2–3",
        title: "File Import Clearances & Technical Registration",
        desc: "Submit DPPQS phytosanitary declarations, ISTA Orange Lot certificates, and localized packaging compliance."
      },
      {
        timing: "Week 4–6",
        title: "Execute Commercial Agro-Dealer Distribution Agreements",
        desc: `Sign distribution contracts with certified seed distributors and agricultural cooperatives across ${country}.`
      },
      {
        timing: "Week 7–9",
        title: "Deploy Multi-Zone Farmer Demonstration Pilots",
        desc: "Set up high-visibility demo plots in primary farming districts to showcase superior yield and drought tolerance."
      },
      {
        timing: "Week 10–12",
        title: "Commercial Seed Release & First Sales Campaign",
        desc: "Launch targeted marketing campaign and commence dispatch to agro-dealers ahead of the sowing season."
      }
    ],
    grants: [
      {
        name: "AGRA Seed Systems Development Grant",
        focus: "Strengthening commercial certified seed distribution and farmer adoption.",
        link: "https://agra.org"
      },
      {
        name: "USAID Feed the Future Agricultural Development",
        focus: "Scaling climate-resilient and high-yielding seed varieties.",
        link: "https://feedthefuture.gov"
      }
    ]
  };
};

export const generateDynamicGtmPlan = async (req, res) => {
  const startTime = performance.now();
  const { country, crop, variety, category, yieldImpact, benefits, applicationMethod } = req.body || {};
  const modelName = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

  const targetCountry = (country || 'Target Market').trim();
  const targetCategory = (category || 'Seeds & Varieties').trim();
  const targetCrop = (crop || 'Target Crop').trim();
  const targetTech = (variety || 'Commercial Agricultural Product').trim();
  const targetYield = (yieldImpact || 'Commercial Standard Yield').trim();

  const isBio = isBioInput(targetCategory, targetTech, targetCrop);
  const cacheKey = `${targetCountry.toLowerCase()}_${isBio ? 'bio' : 'seed'}_${targetCrop.toLowerCase()}_${targetTech.toLowerCase()}`;

  // 1. Cache Check
  if (gtmCache.has(cacheKey)) {
    const cachedEntry = gtmCache.get(cacheKey);
    if (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log(`⚡ [GTM CACHE HIT] Serving cached plan for ${targetCountry} -> [${isBio ? 'BIO' : 'SEED'}] ${targetTech}`);
      return res.json({ success: true, data: cachedEntry.data, cached: true });
    }
    gtmCache.delete(cacheKey);
  }

  // 2. In-flight Deduplication
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
    console.log(`🚀 [GTM ENGINE] Generating Plan for ${isBio ? '🌿 BIOLOGICAL INPUT' : '🌾 SEEDS & VARIETIES'}`);
    console.log('='.repeat(70));
    console.log(`🌍 Country: "${targetCountry}" | 🌾 Crop/Target: "${targetCrop}"`);
    console.log(`🏷️  Product: "${targetTech}" | 📂 Category: "${targetCategory}"`);
    console.log('-'.repeat(70));

    let prompt = '';

    if (isBio) {
      // 🌿 BIOLOGICAL INPUTS DEDICATED PROMPT
      prompt = `You are a senior global agricultural commercialization lead specializing in biological inputs, bio-fertilizers, and bio-stimulants.
Generate a granular, country-specific 90-day Go-To-Market (GTM) execution plan for:
- Product Category: "${targetCategory}"
- Bio-Formulation / Product: "${targetTech}"
- Target Crops: "${targetCrop}"
- Destination Country: "${targetCountry}"
- Agronomic Benefits: "${benefits || 'Enhances root biology, soil nutrient solubilization, and cuts synthetic chemical dependency'}"
- Application Protocol: "${applicationMethod || 'Foliar spray / Seed treatment / Soil drenching'}"

Focus strictly on:
1. Cold-chain storage (15–25°C / 2–8°C) to safeguard live microbial CFU count and shelf-life.
2. In-country bio-efficacy validation trials with national agricultural research centers.
3. Commercial onboarding with agro-dealers, farmer cooperatives, and soil health programs.
4. Official national authorities and verified international grant windows (e.g., AGRA, AfDB, USAID).

STRICT JSON ONLY matching this structure:
{
  "executive_brief": "2-sentence strategic launch summary explaining soil biology impact and commercial entry angle in ${targetCountry}.",
  "production_hubs": "Key target crop belts and high-potential agricultural production zones in ${targetCountry}",
  "planting_window": "Optimal bio-input application windows aligned with seasonal sowing and rainfall in ${targetCountry}",
  "milestones": [
    { "timing": "Day 1", "title": "Appoint In-Country Bio-Regulatory Consultant", "desc": "Initiate biological product dossier registration with ${targetCountry} regulatory body." },
    { "timing": "Week 1", "title": "Contract National Bio-Efficacy Trial Partner", "desc": "Engage national agricultural research institute for microbial crop tolerance and field trials." },
    { "timing": "Week 2–3", "title": "Establish Cold-Chain & Warehousing Protocol", "desc": "Audit temperature-controlled warehousing to safeguard live CFU count during transit." },
    { "timing": "Week 4–6", "title": "Execute Bio-Input Agro-Dealer & Cooperative Agreements", "desc": "Partner with established regional distributors and farmer cooperatives in ${targetCountry}." },
    { "timing": "Week 7–9", "title": "Deploy Multi-Zone Comparative Demonstration Plots", "desc": "Set up side-by-side demo plots showcasing root vigor and synthetic fertilizer cost reduction." },
    { "timing": "Week 10–12", "title": "Commercial Product Launch & Soil Scheme Onboarding", "desc": "Roll out dealer training workshops and register with national sustainable agriculture schemes." }
  ],
  "grants": [
    { "name": "AGRA Regenerative Agriculture & Soil Health Fund", "focus": "Biological soil health & sustainable input adoption", "link": "https://agra.org" },
    { "name": "AfDB Agriculture Fast Track Facility", "focus": "Commercialization of sustainable agricultural inputs", "link": "https://afdb.org" }
  ]
}`;
    } else {
      // 🌾 SEEDS & VARIETIES PROMPT (UNCHANGED)
      prompt = `You are a global agricultural commercialization lead and seed system export expert.
Generate a granular, country-specific 90-day Go-To-Market (GTM) execution plan for:
- Product Category: "Seeds & Varieties"
- Crop: "${targetCrop}" (Variety: "${targetTech}")
- Target Country: "${targetCountry}"
- Yield Impact: "${targetYield}"

Provide real official statutory authorities, verifiable seed grant windows, primary production belts, sowing windows, and realistic milestone actions for ${targetCountry}.

STRICT JSON ONLY matching this structure:
{
  "executive_brief": "2-sentence strategic launch summary explaining agronomic suitability and seed commercialization in ${targetCountry}.",
  "production_hubs": "Key regional agricultural belts and seed production zones in ${targetCountry}",
  "planting_window": "Primary sowing and rainfall seasonal windows in ${targetCountry}",
  "milestones": [
    { "timing": "Day 1", "title": "Appoint In-Country Statutory Regulatory Consultant", "desc": "Specific actions targeting seed regulatory bodies in ${targetCountry}." },
    { "timing": "Week 1", "title": "Formalize Field-Validation & Trial Partner", "desc": "Engage national agricultural research institutes in ${targetCountry}." },
    { "timing": "Week 2–3", "title": "File Import Clearances & Technical Registration", "desc": "Submit phytosanitary declarations, ISTA certificates, and local language labeling." },
    { "timing": "Week 4–6", "title": "Execute Commercial Agro-Dealer Distribution Agreements", "desc": "Partner with established regional distributors and farmer cooperatives in ${targetCountry}." },
    { "timing": "Week 7–9", "title": "Deploy Multi-Zone Farmer Demonstration Pilots", "desc": "Run on-farm demo plots across key agricultural zones to establish verified local yield data." },
    { "timing": "Week 10–12", "title": "Commercial Seed Release & First Sales Campaign", "desc": "Initiate pre-season sales drive through certified agro-dealer networks." }
  ],
  "grants": [
    { "name": "AGRA Seed Systems Development Grant", "focus": "Seed commercialization & farmer adoption", "link": "https://agra.org" },
    { "name": "USAID Feed the Future Agricultural Development", "focus": "High-yield climate-smart variety deployment", "link": "https://feedthefuture.gov" }
  ]
}`;
    }

    // agripath-backend/controllers/gtmController.js ke andar:

    try {
      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          format: 'json',
          stream: false,
          options: { num_predict: 1800, temperature: 0.1 }
        })
      });

      if (!response.ok) throw new Error(`Ollama Error HTTP ${response.status}`);
      const rawData = await response.json();
      const parsedData = JSON.parse(rawData.response);

      gtmCache.set(cacheKey, { data: parsedData, timestamp: Date.now() });
      return parsedData;
    } catch (ollamaErr) {
      // 👉 YAHAN PAR HAI YEH CODE:
      console.warn(`⚠️ [OLLAMA OFFLINE / TIMEOUT] Using static fallback GTM template:`, ollamaErr.message);
      const fallbackPlan = getStaticFallbackPlan(isBio, targetCountry, targetCrop, targetTech);
      gtmCache.set(cacheKey, { data: fallbackPlan, timestamp: Date.now() });
      return fallbackPlan;
    }
  })();

  activeGtmRequests.set(cacheKey, executeGtmGeneration);

  try {
    const resultData = await executeGtmGeneration;
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`✨ [GTM SUCCESS] Plan Generated for ${targetCountry} | Took: ⏱️ ${duration}s\n`);
    return res.json({ success: true, data: resultData });
  } catch (err) {
    console.error('💥 [GTM CRASH]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    activeGtmRequests.delete(cacheKey);
  }
};