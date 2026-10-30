// controllers/gtm/machineryGtmController.js
import { queryAI } from '../../utils/aiService.js';

export const handleMachineryGtm = async ({ country, technology, crop, yieldImpact, benefits, applicationMethod }) => {
  const systemInstruction = `You are an International Agricultural Mechanization Commercial Director.
Generate a structured 90-day Go-To-Market execution plan for farm machinery, implements, and tractors. Output STRICT VALID JSON ONLY.`;

  const prompt = `Formulate a country-specific 90-day commercial market entry strategy for agricultural equipment in "${country}".

[EQUIPMENT PROFILE]
- Machinery / Implement Model: "${technology}"
- Farming Operation: "${crop || 'Mechanized Field Preparation & Sowing'}"
- Field Capacity Benchmark: "${yieldImpact || 'Hectares per day operational capacity'}"
- Core Value Proposition: "${benefits || 'Fuel efficiency, precision depth control, rugged durability'}"
- Operational Mode: "${applicationMethod || 'Tractor-drawn implement or motorized equipment'}"

[MANDATORY MACHINERY SECTOR PRIORITIES]
1. Authorized dealership agreements, Pre-Delivery Inspection (PDI) uncrating hub, and spare parts depot in ${country}.
2. Asset-finance, hire-purchase, and equipment leasing partnerships with local agricultural development banks in ${country}.
3. Operator and local mechanic service training bootcamps.
4. Live field demonstration days with large commercial estates and mechanization service providers (tractor hiring hubs).

Return STRICT JSON only matching this exact schema:
{
  "executive_brief": "4-5 concise strategic sentences synthesizing commercial dealership deployment for ${technology} in ${country}.",
  "production_hubs": "Primary mechanized commercial farming belts and irrigation scheme corridors in ${country}.",
  "planting_window": "Critical pre-season land preparation and field operation windows in ${country}.",
  "milestones": [
    { "timing": "Day 1–15", "title": "PDI uncrating hub launch & spare parts stocking", "desc": "Execution steps" },
    { "timing": "Day 16–30", "title": "Dealer network contracts & commercial bank lease MOU", "desc": "Execution steps" },
    { "timing": "Day 31–45", "title": "Technician service certification & parts catalog release", "desc": "Execution steps" },
    { "timing": "Day 46–60", "title": "Live field demonstration tours for outgrower estates", "desc": "Execution steps" },
    { "timing": "Day 61–75", "title": "Financed unit deliveries to early-adopter farmers", "desc": "Execution steps" },
    { "timing": "Day 76–90", "title": "First scheduled maintenance audits & fleet performance review", "desc": "Execution steps" }
  ],
  "first_contacts": [
    { "name": "Real Agricultural Mechanization Directorate in ${country}", "desc": "Government mechanization hub alignment" },
    { "name": "Real Commercial Agricultural Bank / Lease Provider in ${country}", "desc": "Hire-purchase & asset finance schemes" },
    { "name": "Real Commercial Farmers Association / Tractor Owners Association in ${country}", "desc": "Fleet sales & custom hiring centers" }
  ],
  "funding_windows": [
    { "name": "Agricultural Mechanization Facility", "url": "https://...", "display_url": "...", "description": "Tractor & implement leasing facility" },
    { "name": "Agribusiness Modernization Loan Guarantee", "url": "https://...", "display_url": "...", "description": "Low-interest equipment loan guarantee" }
  ],
  "success_metrics": [
    { "horizon": "30 Days", "target": "Central spare parts hub ready and master dealership agreement signed" },
    { "horizon": "60 Days", "target": "Trained certified technicians and financing pipeline approved" },
    { "horizon": "90 Days", "target": "Units delivered, operational in field with active service coverage" }
  ]
}`;

  return await queryAI(prompt, systemInstruction);
};