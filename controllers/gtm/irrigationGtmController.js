// controllers/gtm/irrigationGtmController.js
import { queryAI } from '../../utils/aiService.js';

export const handleIrrigationGtm = async ({ country, technology, category, crop, yieldImpact, benefits }) => {
  const systemInstruction = `You are an International Agricultural Irrigation Commercial Director and Precision Water GTM Strategist.
Generate a high-impact, non-generic 90-day market entry and commercial deployment plan for precision irrigation systems in developing agrarian markets.
Output STRICT VALID JSON ONLY matching the schema. No markdown formatting.`;

  const prompt = `Formulate an actionable 90-day Go-To-Market (GTM) execution plan for introducing commercial irrigation equipment in "${country}".

[IRRIGATION EQUIPMENT PROFILE]
- System / Technology: "${technology}"
- Core Category: "${category || 'Irrigation & Water Regimen'}"
- Target Crop Application: "${crop || 'Commercial Cash Crops & Horticulture'}"
- Water Efficiency Benchmark: "${yieldImpact || '40% - 55% Water Preserved vs Surface Flood'}"
- Key Value Proposition: "${benefits || 'Precision root-zone moisture control, fertigation compatibility, solar pump integration'}"

MANDATORY 90-DAY MILESTONES:
- Phase 1 (Days 1–30): Pilot demonstration farms, dealer network identification, water authority homologation.
- Phase 2 (Days 31–60): Master distributor agreements, agronomist/technician training workshops, turnkey demo field days.
- Phase 3 (Days 61–90): Commercial inventory stocking at hubs, smallholder outgrower scheme roll-out, seasonal promotional bundles.

Return STRICT JSON only matching this exact schema:
{
  "productSummary": {
    "targetCountry": "${country}",
    "category": "Irrigation & Water Regimen",
    "technology": "${technology}",
    "primaryAudience": "<Target customer profile in ${country}, e.g., Commercial Horticulturalists, Smallholder Farmer Cooperatives, Solar EPC Ag-dealers>",
    "coreProposition": "Save 45-55% water while delivering 20-30% higher crop yields through pressurized root-zone drip delivery."
  },
  "milestones": [
    {
      "phase": "Phase 1: Market Entry & Technical Field Auditing",
      "timeframe": "Days 1–30",
      "objectives": [
        "Partner with leading commercial horticultural estates in ${country} for 2 pilot drip test plots.",
        "Establish pre-shipment PVoC compliance with national standards body and secure customs tariff exemptions under agricultural machinery concessions.",
        "Profile and vet top 5 agricultural equipment dealers and solar pump distributors in major agricultural corridors."
      ]
    },
    {
      "phase": "Phase 2: Distributor Channel Structuring & Certified Installer Training",
      "timeframe": "Days 31–60",
      "objectives": [
        "Sign distribution agreement with premier ag-mechanization / irrigation master distributor.",
        "Conduct a 3-day certified hydraulic installation and pipe-laying workshop for 25 local field technicians.",
        "Launch a demonstration field day showcasing fertigation uniformity and water savings vs flood irrigation."
      ]
    },
    {
      "phase": "Phase 3: Commercial Inventory Roll-Out & Outgrower Financing Bundles",
      "timeframe": "Days 61–90",
      "objectives": [
        "Stock initial 40ft container of drip laterals, screen filters, and venturi injectors at central warehouse hub.",
        "Integrate with microfinance institutions and agricultural development funds for pay-as-you-grow farmer irrigation kits.",
        "Deploy targeted digital and radio campaigns across high-value horticulture clusters before peak planting season."
      ]
    }
  ],
  "channelStrategy": {
    "directSales": "B2B turnkey contracts for large commercial tea, avocado, sugarcane, and flower estates.",
    "dealerDistribution": "Tier-1 agro-equipment dealers, solar water pump retailers, and local hardware stockists across farming hubs.",
    "institutionalTenders": "National Irrigation Authority smallholder rehabilitation tenders and international donor-funded climate resilience programs."
  },
  "pricingStructure": {
    "suggestedRetailPrice": "Customized per hectare (e.g., $1,200 - $1,800 / Ha including lateral lines, filters, and valves)",
    "dealerMargin": "18% - 22% gross margin for stocking distributors, plus 5% installation service fee",
    "farmerPaybackPeriod": "1 to 2 harvest seasons through 40% water pump fuel savings and 25% yield boost"
  },
  "riskMitigation": [
    "High mineral/silt content in boreholes clogging emitters: Mandate 120-mesh dual disc/screen filtration packages.",
    "Farmer resistance to high initial CapEx: Offer modular 0.25-acre gravity drip kit bundles compatible with existing water tanks."
  ]
}`;

  return await queryAI(prompt, systemInstruction);
};