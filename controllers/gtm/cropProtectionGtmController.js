// controllers/gtm/cropProtectionGtmController.js
import { queryAI } from '../../utils/aiService.js';

export const handleCropProtectionGtm = async ({ country, technology, crop, yieldImpact, benefits, applicationMethod }) => {
  const systemInstruction = `You are an Agrochemical Commercialization and Crop Protection Marketing Director.
Generate a structured 90-day Go-To-Market distribution plan for agrochemical formulations. Output STRICT VALID JSON ONLY.`;

  const prompt = `Formulate a country-specific 90-day commercial market entry strategy for launching a crop protection product in "${country}".

[AGROCHEMICAL PROFILE]
- Formulation / Technology: "${technology}"
- Target Pest / Crop Context: "${crop || 'Integrated Pest & Disease Management'}"
- Efficacy Benchmark: "${yieldImpact || 'Knockdown efficacy and residual control'}"
- Core Value Proposition: "${benefits || 'Fast action, anti-resistance formulation, broad-spectrum control'}"
- Application Mode: "${applicationMethod || 'Foliar knapsack, boom spray, or aerial drone application'}"

[MANDATORY CROP PROTECTION PRIORITIES]
1. Dangerous goods (IMDG) port clearance, compliant spill-containment bonded warehousing in ${country}.
2. Spray service provider (SSP) and youth applicator safety certification bootcamps.
3. Master distributor agreements with tier-1 agrochemical wholesalers across major pest-pressure zones in ${country}.
4. Pre-infestation stocking campaigns aligned with seasonal pest outbreaks.

Return STRICT JSON only matching this exact schema:
{
  "executive_brief": "4-5 concise strategic sentences outlining commercial distribution for ${technology} in ${country}.",
  "production_hubs": "Primary agrochemical consumption belts and high-pest-pressure farming regions in ${country}.",
  "planting_window": "Critical crop protection spray calendar and peak pest infestation windows in ${country}.",
  "milestones": [
    { "timing": "Day 1–15", "title": "Bonded DG warehousing & customs release", "desc": "Execution steps" },
    { "timing": "Day 16–30", "title": "Tier-1 agrochemical wholesale distribution agreements", "desc": "Execution steps" },
    { "timing": "Day 31–45", "title": "Certified spray service provider (SSP) safety training", "desc": "Execution steps" },
    { "timing": "Day 46–60", "title": "High-pressure demo plots and roadside banner blitz", "desc": "Execution steps" },
    { "timing": "Day 61–75", "title": "Retail shelf placement across rural agro-dealers", "desc": "Execution steps" },
    { "timing": "Day 76–90", "title": "In-season pest attack rapid response and stock replenishment", "desc": "Execution steps" }
  ],
  "first_contacts": [
    { "name": "Real Agrochemical Association / CropLife Chapter in ${country}", "desc": "Stewardship and safe use network" },
    { "name": "Real Master Agrochemical Wholesaler / Distributor in ${country}", "desc": "National retail distribution network" },
    { "name": "Real Plant Protection & Extension Directorate in ${country}", "desc": "Pest surveillance and advisory alignment" }
  ],
  "funding_windows": [
    { "name": "Agricultural Trade & Input Credit Facility", "url": "https://...", "display_url": "...", "description": "Trade credit program for agro-dealers" },
    { "name": "Regional Crop Security Facility", "url": "https://...", "display_url": "...", "description": "Pest outbreak resilience grant" }
  ],
  "success_metrics": [
    { "horizon": "30 Days", "target": "Master distributors contracted and warehouse stocks cleared" },
    { "horizon": "60 Days", "target": "Applicators trained and retail stockists placed in target zone" },
    { "horizon": "90 Days", "target": "Liters/kg sold and target hectare protection coverage" }
  ]
}`;

  return await queryAI(prompt, systemInstruction);
};