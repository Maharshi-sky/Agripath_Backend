// controllers/regulatory/bioRegulatoryController.js
import { queryAI } from '../../utils/aiService.js';

export const handleBioRegulatory = async ({ country, technology, category, origin = 'India' }) => {
  const systemInstruction = `You are a Biosafety and Microbial Inoculant Regulatory Director.
Generate statutory compliance data for biological inputs and biofertilizers. Output STRICT VALID JSON only.`;

  const prompt = `Evaluate statutory microbial and biological input import regulations for:
- Country: "${country}"
- Formulation/Strain: "${technology}"
- Category: "${category || 'Biological Inputs'}"
- Origin: "${origin}"

Return STRICT JSON only matching this schema:
{
  "header_title": "Biological Inputs & Microbial Inoculant Regulatory Pathway — ${country}",
  "meta": {
    "source": "Groq LPU Microbial Statutory Intelligence",
    "confidence_score": "98%",
    "country": "${country}",
    "region_bloc": "Applicable Regional Trade Bloc",
    "last_verified": "2026-Q1"
  },
  "authorities": {
    "quarantine_authority": "National Biosafety or Bio-Inputs Directorate",
    "certification_body": "Directorate of Microbial Standards & Quality Control",
    "governing_laws": "National Biosafety Act and Biological Inoculant Regulations"
  },
  "summary": {
    "target_country": "${country}",
    "category": "Biological Inputs",
    "technology_type": "${technology.toUpperCase()}",
    "regulatory_authority": "National Bio-Inputs Authority",
    "estimated_timeline": "60 – 120 Days (Fast-Track Microbial Pathway)",
    "estimated_cost": "$1,500 – $3,200 USD"
  },
  "compliance_requirements": {
    "import_permit": "Pre-approval registration requirement for live microbial strains",
    "required_documents": [
      "Bio-Input Product Registration Dossier",
      "Certificate of Analysis (CFU/g Viability Assay)",
      "Non-Pathogenicity & Toxicology Report",
      "GHS SDS & Certificate of Origin"
    ],
    "phytosanitary_ad": "Mandatory Declaration: Free from mammalian toxic metabolites, Salmonella, and foreign contaminants.",
    "fumigation_treatment": "Strictly No Chemical Fumigation (Live Biological Inoculant Protocol; temperature-controlled logistics).",
    "ista_standards": "FAO Microbial Inoculant Standards (Viable CFU >= 1x10^8 per g/ml)",
    "gmo_policy": "Non-GMO Microbial Strain Authentication Certificate Mandatory",
    "hs_customs_codes": ["3808.99", "3101.00"]
  },
  "trials_and_reciprocity": {
    "trial_rules": "Single-season field verification for strain viability and colonization efficacy.",
    "reciprocity": "Regional trade bloc recognized with verified Certificate of Analysis."
  },
  "logistics_and_customs": {
    "labeling_rules": "Strain identifier, CFU count at manufacture and expiry, storage temperature (4°C-25°C), non-hazardous markings.",
    "port_inspection": "Designated air/sea cargo terminals with cold-chain customs inspection."
  },
  "risk_mitigation": "Submitting unauthenticated strain deposit, expired viability CFU counts, or heat degradation during sea transit."
}`;

  return await queryAI(prompt, systemInstruction);
};