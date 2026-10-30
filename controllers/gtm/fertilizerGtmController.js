// controllers/gtm/fertilizerGtmController.js
import { queryAI } from '../../utils/aiService.js';

export const handleFertilizerGtm = async ({ country, technology, crop, yieldImpact, benefits, applicationMethod }) => {
  const systemInstruction = `You are a Global Fertilizer Commercial Strategy Director.
Generate a structured 90-day market execution plan for commercial fertilizer distribution. Output STRICT VALID JSON ONLY.`;

  const prompt = `Formulate a country-specific 90-day Go-To-Market (GTM) rollout plan for commercial fertilizer in "${country}".

[FERTILIZER PROFILE]
- Nutrient Grade / Formulation: "${technology}"
- Crop / Agronomic Context: "${crop || 'Balanced Soil Nutrition & Basal Operations'}"
- Yield Target: "${yieldImpact || 'Optimal nutrient recovery and yield increase'}"
- Core Value Proposition: "${benefits || 'High solubility, controlled release, balanced NPK + micronutrients'}"
- Application Mode: "${applicationMethod || 'Basal broadcasting, fertigation, or top-dressing'}"

[MANDATORY FERTILIZER SECTOR PRIORITIES]
1. Port bulk bagging or container discharge logistics with anti-caking, moisture-proof storage near entry ports of ${country}.
2. Distribution through apex agricultural cooperative unions and regional fertilizer blending plants in ${country}.
3. Soil-testing campaigns and agronomic calibration trials with commercial outgrowers.
4. Alignment with national fertilizer subsidy programs, input credit schemes, or blenders.

Return STRICT JSON only matching this exact schema:
{
  "executive_brief": "4-5 concise strategic sentences outlining commercial fertilizer market penetration for ${technology} in ${country}.",
  "production_hubs": "Major commercial agricultural basins and intensive fertilizer consumption corridors in ${country}.",
  "planting_window": "Basal fertilizer pre-plant stocking and in-season top-dressing schedules in ${country}.",
  "milestones": [
    { "timing": "Day 1–15", "title": "Port clearance, bagging verification & bagging dispatch", "desc": "Execution steps" },
    { "timing": "Day 16–30", "title": "Apex cooperative supply agreements & blenders engagement", "desc": "Execution steps" },
    { "timing": "Day 31–45", "title": "Soil-specific demonstration strip trials launch", "desc": "Execution steps" },
    { "timing": "Day 46–60", "title": "Regional warehouse bulk positioning ahead of rains", "desc": "Execution steps" },
    { "timing": "Day 61–75", "title": "Rural agro-dealer retail stocking & credit allocation", "desc": "Execution steps" },
    { "timing": "Day 76–90", "title": "Basal application delivery & top-dressing order scheduling", "desc": "Execution steps" }
  ],
  "first_contacts": [
    { "name": "Real Fertilizer Association / Blenders Union in ${country}", "desc": "Local blending & bulk distribution" },
    { "name": "Real National Apex Farmers Federation in ${country}", "desc": "Cooperative bulk purchasing" },
    { "name": "Real Ministry of Agriculture Fertilizer Unit in ${country}", "desc": "Subsidy program & standards coordination" }
  ],
  "funding_windows": [
    { "name": "Smallholder Fertilizer Financing Facility", "url": "https://...", "display_url": "...", "description": "Agricultural input voucher guarantee" },
    { "name": "Regional Agribusiness Trade Credit Program", "url": "https://...", "display_url": "...", "description": "Wholesale distributor inventory financing" }
  ],
  "success_metrics": [
    { "horizon": "30 Days", "target": "Tonnage allocated and primary cooperative contracts executed" },
    { "horizon": "60 Days", "target": "Bulk tons positioned at regional aggregation hubs" },
    { "horizon": "90 Days", "target": "Full stock liquidation and farmer applied acreage" }
  ]
}`;

  return await queryAI(prompt, systemInstruction);
};