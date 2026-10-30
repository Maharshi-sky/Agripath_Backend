// controllers/gtm/bioGtmController.js
import { queryAI } from '../../utils/aiService.js';

export const handleBioGtm = async ({ country, technology, crop, yieldImpact, benefits, applicationMethod }) => {
  const systemInstruction = `You are a Commercial Lead for Agricultural Biologicals, Bio-stimulants, and Microbial Inoculants.
Generate a high-velocity 90-day commercial market entry strategy. Output STRICT VALID JSON ONLY.`;

  const prompt = `Formulate a country-specific 90-day Go-To-Market (GTM) commercialization plan for introducing a biological agricultural input in "${country}".

[BIOLOGICAL PRODUCT PROFILE]
- Formulation / Technology: "${technology}"
- Target Farming Operation: "${crop || 'Soil Health and Biological Nutrition'}"
- Efficacy Benchmark: "${yieldImpact || 'Enhanced nutrient uptake & root biomass'}"
- Key Value Proposition: "${benefits || 'Live microbial CFU viability, soil organic carbon enhancement'}"
- Application Mode: "${applicationMethod || 'Seed coating, drenching, or in-furrow biological delivery'}"

[MANDATORY BIO-INPUT SECTOR PRIORITIES]
1. Cold-chain storage logistics (15–25°C / 2–8°C) and viable shelf-life integrity during distribution across ${country}.
2. Demonstration plots with progressive commercial plantations, horticulture hubs, and regenerative agriculture programs in ${country}.
3. Technical agronomic training for agro-dealer sales staff on handling live biological inoculants.
4. Value-proposition alignment with carbon credit, organic export, or sustainable agriculture initiatives.

Return STRICT JSON only matching this exact schema:
{
  "executive_brief": "4-5 concise strategic sentences synthesizing market penetration for ${technology} in ${country}.",
  "production_hubs": "Key commercial horticulture, tea/coffee plantations, or irrigated grain hubs in ${country}.",
  "planting_window": "Optimal seasonal application windows for biological inoculants in ${country}.",
  "milestones": [
    { "timing": "Day 1–15", "title": "Cold-chain warehousing & initial batch testing", "desc": "Execution steps" },
    { "timing": "Day 16–30", "title": "Commercial estate & grower trial partnerships", "desc": "Execution steps" },
    { "timing": "Day 31–45", "title": "Agro-dealer technical certification workshops", "desc": "Execution steps" },
    { "timing": "Day 46–60", "title": "Mid-season root colonization & bio-efficacy field tours", "desc": "Execution steps" },
    { "timing": "Day 61–75", "title": "Specialty input retail chain onboarding", "desc": "Execution steps" },
    { "timing": "Day 76–90", "title": "Commercial replenishment and farmer re-order cycle", "desc": "Execution steps" }
  ],
  "first_contacts": [
    { "name": "Real Organic / Biological Agriculture Network in ${country}", "desc": "Regenerative farmer aggregation" },
    { "name": "Real Commercial Horticulture / Cash Crop Exporters Association in ${country}", "desc": "Commercial estate scale adoption" },
    { "name": "Real Agricultural Input Distributors Association in ${country}", "desc": "Specialized cold-chain distribution" }
  ],
  "funding_windows": [
    { "name": "Climate-Smart / Regenerative Agriculture Grant", "url": "https://...", "display_url": "...", "description": "Soil health transition fund" },
    { "name": "Green Agri-Enterprise Financing Facility", "url": "https://...", "display_url": "...", "description": "Bio-input commercialization facility" }
  ],
  "success_metrics": [
    { "horizon": "30 Days", "target": "Cold-chain hub validated and primary estate trials seeded" },
    { "horizon": "60 Days", "target": "Agronomists certified and initial commercial volume booked" },
    { "horizon": "90 Days", "target": "Treated acreage and verified farmer adoption rate" }
  ]
}`;

  return await queryAI(prompt, systemInstruction);
};