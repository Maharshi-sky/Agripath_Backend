// controllers/regulatory/fertilizerRegulatoryController.js
import { queryAI } from '../../utils/aiService.js';

export const handleFertilizerRegulatory = async ({ country, technology, category, origin = 'India' }) => {
  const systemInstruction = `You are a Global Fertilizer Quality and Heavy Metal Regulatory Auditor.
Generate statutory compliance data for chemical and organic fertilizers. Output STRICT VALID JSON only.`;

  const prompt = `Evaluate statutory fertilizer import and registration laws for:
- Country: "${country}"
- Nutrient Grade / Product: "${technology}"
- Category: "${category || 'Fertilizers & Plant Nutrients'}"
- Origin: "${origin}"

Return STRICT JSON only matching this schema:
{
  "header_title": "Fertilizer Statutory Import & Registration Pathway — ${country}",
  "meta": {
    "source": "Groq LPU Fertilizer Regulatory Intelligence",
    "confidence_score": "98%",
    "country": "${country}",
    "region_bloc": "Regional Trade Bloc",
    "item_sub_category": "Commercial Fertilizer Grade",
    "last_verified": "2026-Q1"
  },
  "authorities": {
    "quarantine_authority": "National Fertilizer Regulatory Directorate",
    "certification_body": "National Bureau of Standards / PVoC Agency",
    "governing_laws": "National Fertilizer Control & Commercial Standards Act"
  },
  "summary": {
    "target_country": "${country}",
    "category": "Fertilizers & Plant Nutrients",
    "technology_type": "${technology.toUpperCase()}",
    "regulatory_authority": "National Fertilizer Board",
    "estimated_timeline": "45 – 90 Days",
    "estimated_cost": "$1,200 – $2,800 USD"
  },
  "compliance_requirements": {
    "import_permit": "Mandatory Commercial Fertilizer Import Registration Certificate",
    "required_documents": [
      "Certificate of Conformity (CoC / PVoC)",
      "Certificate of Analysis (NPK w/w % Assay)",
      "Heavy Metal Assay Report (As, Cd, Pb, Hg below thresholds)",
      "16-Section GHS SDS",
      "Certificate of Origin"
    ],
    "phytosanitary_ad": "Mandatory Declaration: Free from unlisted heavy metal adulterants and radioactive contaminants.",
    "fumigation_treatment": "Not Applicable (Dry Bulk / Container Cargo Protocol with moisture barrier packaging).",
    "ista_standards": "AOAC / ISO Harmonized Chemical Fertilizer Standards",
    "gmo_policy": "Chemical Formulation (N/A)",
    "hs_customs_codes": ["3102.10", "3104.20", "3105.20"]
  },
  "trials_and_reciprocity": {
    "trial_rules": "Laboratory confirmatory assay required; field agronomic response trials required for novel specialty blends.",
    "reciprocity": "Regional trade bloc recognized testing laboratories eligible."
  },
  "logistics_and_customs": {
    "labeling_rules": "Guaranteed elemental nutrient analysis (NPK %), moisture content, net bag weight, manufacturer lot numbers.",
    "port_inspection": "Designated commercial dry cargo container terminals with customs draw sampling."
  },
  "risk_mitigation": "Cadmium or lead exceeding destination maximum threshold limits (ppm) or missing pre-export verification of conformity (PVoC)."
}`;

  return await queryAI(prompt, systemInstruction);
};