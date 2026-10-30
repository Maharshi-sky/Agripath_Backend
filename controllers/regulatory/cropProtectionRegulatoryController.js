// controllers/regulatory/cropProtectionRegulatoryController.js
import { queryAI } from '../../utils/aiService.js';

export const handleCropProtectionRegulatory = async ({ country, technology, category, origin = 'India' }) => {
  const systemInstruction = `You are an International Pesticide Registration and Codex MRL Specialist.
Generate statutory agrochemical compliance data. Output STRICT VALID JSON only.`;

  const prompt = `Evaluate statutory pesticide registration and import framework for:
- Country: "${country}"
- Active Ingredient / Formulation: "${technology}"
- Category: "${category || 'Crop Protection & Agrochem'}"
- Origin: "${origin}"

Return STRICT JSON only matching this schema:
{
  "header_title": "Pesticide & Crop Protection Statutory Pathway — ${country}",
  "meta": {
    "source": "Groq LPU Agrochem Regulatory Intelligence",
    "confidence_score": "98%",
    "country": "${country}",
    "regional_bloc": "Regional Harmonization Framework",
    "item_sub_category": "Formulated Agrochemical",
    "last_verified": "2026-Q1"
  },
  "authorities": {
    "quarantine_authority": "Pesticides Control Board / Agrochemical Registrar",
    "certification_body": "Customs Hazardous Goods & Phytosanitary Inspectorate",
    "governing_laws": "National Pesticide Control Act & MRL Setting Regulations"
  },
  "summary": {
    "target_country": "${country}",
    "category": "Crop Protection & Agrochem",
    "technology_type": "${technology.toUpperCase()}",
    "regulatory_authority": "National Pesticides Control Board",
    "estimated_timeline": "120 – 180 Days (2 Cropping Seasons)",
    "estimated_cost": "$2,500 – $5,000 USD"
  },
  "compliance_requirements": {
    "import_permit": "Mandatory product-by-product registration prior to commercial dispatch",
    "required_documents": [
      "Product Registration Certificate",
      "Certificate of Analysis (% Active Ingredient Assay)",
      "16-Section GHS Safety Data Sheet (SDS)",
      "FAO Specifications Compliance Certificate",
      "Certificate of Origin"
    ],
    "phytosanitary_ad": "Codex Alimentarius & National Maximum Residue Limit (MRL) Compliance",
    "fumigation_treatment": "Dangerous Goods (DG) Packaging Protocol (IMDG / IATA specifications)",
    "ista_standards": "FAO/WHO Pesticide Specifications for Plant Protection Products",
    "gmo_policy": "N/A",
    "hs_customs_codes": ["3808.91", "3808.92", "3808.93"]
  },
  "trials_and_reciprocity": {
    "trial_rules": "Two-season localized bio-efficacy and residue breakdown field trials mandatory.",
    "reciprocity": "Regional harmonization recognition if registered in 2+ member states."
  },
  "logistics_and_customs": {
    "labeling_rules": "Active ingredient %, GHS toxicity pictograms (Class I-IV), antidote instructions, color-band warnings.",
    "port_inspection": "Designated hazardous container cargo terminals with chemical assay sampling."
  },
  "risk_mitigation": "Exporting formulation with active ingredient concentration variance > 2% or shipping without commercial registration."
}`;

  return await queryAI(prompt, systemInstruction);
};