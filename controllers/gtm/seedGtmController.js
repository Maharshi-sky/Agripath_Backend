// controllers/gtm/seedGtmController.js
import { queryAI } from '../../utils/aiService.js';

export const handleSeedGtm = async ({ country, technology, crop, yieldImpact, benefits, applicationMethod }) => {
  const systemInstruction = `You are a Commercial Director for Global Seed Enterprises and Variety Commercialization.
Generate an actionable, non-generic 90-day market entry plan for commercial seed distribution. Output STRICT VALID JSON ONLY.`;

  const prompt = `Formulate a country-specific 90-day Go-To-Market (GTM) rollout plan for launching a seed variety in "${country}".

[COMMERCIAL SEED PROFILE]
- Variety / Technology: "${technology}"
- Primary Target Crop: "${crop || 'Certified Seed Production'}"
- Yield Benchmark: "${yieldImpact || 'High-yielding commercial standard'}"
- Value Proposition: "${benefits || 'Drought tolerance, disease resistance, and high germination'}"
- Sowing / Seeding Mode: "${applicationMethod || 'Direct drilling or transplanting'}"

[MANDATORY SEED SECTOR PRIORITIES]
1. Multi-location on-farm trial strip plots & farmer field days prior to onset of major rains in ${country}.
2. Commercial partnerships with agro-input dealer associations (e.g., UNADA in Uganda, GAIDA in Ghana).
3. Pre-season wholesale stocking and distributor advance booking.
4. Foundation seed multiplication agreements and certified packaging distribution.

Return STRICT JSON only matching this exact schema:
{
  "executive_brief": "4-5 concise strategic sentences outlining commercial market entry for ${technology} in ${country}.",
  "production_hubs": "Real high-yield agricultural belts and seed consumption corridors in ${country}.",
  "planting_window": "Exact sowing calendar (Season A / Season B or main monsoon/rainy cycles) in ${country}.",
  "milestones": [
    { "timing": "Day 1–15", "title": "Agro-dealer wholesale network mapping", "desc": "Execution steps" },
    { "timing": "Day 16–30", "title": "Field demonstration strip plot layout", "desc": "Execution steps" },
    { "timing": "Day 31–45", "title": "National seed certification batch tagging", "desc": "Execution steps" },
    { "timing": "Day 46–60", "title": "Farmer field days & cooperative aggregation", "desc": "Execution steps" },
    { "timing": "Day 61–75", "title": "Pre-season retail distribution rollout", "desc": "Execution steps" },
    { "timing": "Day 76–90", "title": "Full retail availability & planting kickoff", "desc": "Execution steps" }
  ],
  "first_contacts": [
    { "name": "Real National Seed Trade Association in ${country}", "desc": "Wholesale distributor aggregation" },
    { "name": "Real Apex Farmer Federation / Cooperative in ${country}", "desc": "Farmer outreach & demo plot hosting" },
    { "name": "Real Agricultural Research / Extension Agency in ${country}", "desc": "Agronomic validation & field days" }
  ],
  "funding_windows": [
    { "name": "Real Seed Sector / Agri Development Fund", "url": "https://...", "display_url": "...", "description": "Seed financing facility" },
    { "name": "Regional Agricultural Trade Grant", "url": "https://...", "display_url": "...", "description": "Input trade credit facility" }
  ],
  "success_metrics": [
    { "horizon": "30 Days", "target": "Specific agro-dealer partnerships signed and demo plots confirmed" },
    { "horizon": "60 Days", "target": "Seed tonnage distributed to regional wholesale stockists" },
    { "horizon": "90 Days", "target": "Hectares planted and retail sell-through percentage" }
  ]
}`;

  return await queryAI(prompt, systemInstruction);
};