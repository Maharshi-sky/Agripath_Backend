// controllers/regulatory/seedRegulatoryController.js
import { queryAI } from '../../utils/aiService.js';

export const handleSeedRegulatory = async ({ country, technology, category, origin = 'India' }) => {
  const systemInstruction = `You are a Senior Plant Quarantine and Seed Certification Specialist in Global Agriculture.
Generate statutory compliance data for seed imports. Output STRICT VALID JSON matching the schema exactly. No commentary.`;

  const prompt = `Evaluate statutory seed import regulations for:
- Country: "${country}"
- Technology/Variety: "${technology}"
- Category: "${category || 'Seeds & Varieties'}"
- Origin: "${origin}"

Return STRICT JSON only matching this schema:
{
  "header_title": "Seed Import & Quarantine Statutory Pathway — ${country}",
  "meta": {
    "source": "Groq LPU Statutory Intelligence",
    "confidence_score": "98%",
    "country": "${country}",
    "regional_bloc": "Regional trade bloc name (e.g., EAC, COMESA, ECOWAS)",
    "last_verified": "2026-Q1"
  },
  "authorities": {
    "quarantine_authority": "Exact National Plant Quarantine / NPPO agency",
    "certification_body": "Exact National Seed Certification Directorate",
    "governing_laws": "Exact Seed Acts, Decrees, or Plant Quarantine Legislation"
  },
  "summary": {
    "target_country": "${country}",
    "category": "Seeds & Varieties",
    "technology_type": "${technology.toUpperCase()}",
    "regulatory_authority": "Primary seed statutory authority",
    "estimated_timeline": "e.g., 45 – 90 Days (Port) / 12-18 Months (Release)",
    "estimated_cost": "$1,500 – $3,500 USD"
  },
  "compliance_requirements": {
    "import_permit": "Exact import permit name and application mandate",
    "required_documents": [
      "Phytosanitary Certificate from Origin",
      "ISTA Orange Lot Certificate",
      "Non-GMO Certification",
      "Certificate of Origin"
    ],
    "phytosanitary_ad": "Mandatory pest-free declarations (name 2-3 specific quarantine pests)",
    "fumigation_treatment": "Exact chemical/physical pre-shipment treatment dosage",
    "ista_standards": "ISTA Orange Lot Cert (Germination >= 85%, Purity >= 98%)",
    "gmo_policy": "Strict Non-GMO / Biosafety clearance requirement",
    "hs_customs_codes": ["1209.91", "1209.99"]
  },
  "trials_and_reciprocity": {
    "trial_rules": "Mandatory DUS and multi-location VCU performance trials duration",
    "reciprocity": "Regional catalog listing fast-track status"
  },
  "logistics_and_customs": {
    "labeling_rules": "Mandatory languages, lot details, treatment warnings, and seed tags",
    "port_inspection": "Designated port points of entry and post-entry quarantine holds"
  },
  "risk_mitigation": "Top statutory rejection pitfall and how exporter avoids rejection"
}`;

  return await queryAI(prompt, systemInstruction);
};