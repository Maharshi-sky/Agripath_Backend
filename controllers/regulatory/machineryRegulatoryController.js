// controllers/regulatory/machineryRegulatoryController.js
import { queryAI } from '../../utils/aiService.js';

export const handleMachineryRegulatory = async ({ country, technology, category, origin = 'India' }) => {
  const systemInstruction = `You are a Senior Agricultural Mechanization Homologation and International Trade Compliance Director.
You specialize in statutory import clearance, vehicle type-approvals, PVoC standards, and customs tariffs across Africa, South Asia, and developing agricultural markets.
CRITICAL MANDATE:
- Do NOT output generic placeholder text or template samples.
- Identify the REAL national statutory bodies, ministries, conformity assessment agencies, and port facilities of "${country}".
- Select the exact Harmonized System (HS) code corresponding to "${technology}".
- Return STRICT VALID JSON ONLY matching the requested schema without any markdown formatting or commentary.`;

  const prompt = `Evaluate the exact statutory regulatory and customs homologation framework for importing agricultural machinery:
- Target Market: "${country}"
- Machinery / Technology: "${technology}"
- Category: "${category || 'Farm Machinery & Equipment'}"
- Country of Origin: "${origin}"

MANDATORY INSTRUCTIONS FOR EVALUATION:
1. Identify the real statutory standards authority (e.g., Ghana Standards Authority for Ghana, UNBS for Uganda, TBS for Tanzania) and mechanization ministry/directorate in "${country}".
2. Cite the exact National Standards Act and road safety / agricultural machinery regulations applicable in "${country}".
3. Provide the exact HS Customs Code for "${technology}" (e.g., 8432.31/8432.39 for Seeders/Planters, 8701.91-8701.95 for Tractors, 8433.51 for Combine Harvesters).
4. Identify designated maritime/dry cargo entry ports in "${country}" (e.g., Port of Tema / Takoradi for Ghana; Mombasa/Malaba for Uganda).
5. Specify actual Pre-Export Verification of Conformity (PVoC / CoC) requirements and international testing benchmarks (OECD, ISO 4254).

Return STRICT JSON only matching this exact schema:
{
  "header_title": "Agricultural Machinery Statutory Homologation & Clearance Pathway — ${country}",
  "meta": {
    "source": "Groq LPU Machinery Homologation Engine",
    "confidence_score": "98%",
    "country": "${country}",
    "regional_bloc": "<Exact regional economic/trade bloc for ${country}, e.g., ECOWAS, EAC, SADC>",
    "item_sub_category": "<Specific sub-category based on ${technology}, e.g., Sowing & Planting Machinery, Tractors, Harvesters>",
    "last_verified": "2026-Q1"
  },
  "authorities": {
    "quarantine_authority": "<Real national standards authority and mechanization directorate in ${country}>",
    "certification_body": "<Real national conformity / PVoC inspection body handling pre-shipment inspection in ${country}>",
    "governing_laws": "<Exact statutory Acts, road safety decrees, and mechanization standards in ${country}>"
  },
  "summary": {
    "target_country": "${country}",
    "category": "Farm Machinery & Equipment",
    "technology_type": "${technology.toUpperCase()}",
    "regulatory_authority": "<Primary governing homologation agency in ${country}>",
    "estimated_timeline": "<Realistic timeline in days for type-approval and PVoC clearance in ${country}>",
    "estimated_cost": "<Realistic official statutory filing and inspection fee range in USD>"
  },
  "compliance_requirements": {
    "import_permit": "<Exact road-worthiness, type-approval, or machinery import permit required in ${country}>",
    "required_documents": [
      "<Real document 1, e.g., Certificate of Conformity (CoC / PVoC) from authorized inspection partner>",
      "<Real document 2, e.g., Drawbar/PTO Test Report or ISO 4254 safety certificate>",
      "<Real document 3, e.g., Commercial Invoice & Packing List>",
      "<Real document 4, e.g., Certificate of Origin>",
      "<Real document 5, e.g., Local spare parts and after-sales service commitment>"
    ],
    "phytosanitary_ad": "<Specific bio-security washdown protocol to ensure zero alien weed seeds and soil residues>",
    "fumigation_treatment": "<Logistics shipping protocol, e.g., RO-RO / Containerized sea freight to designated ports>",
    "ista_standards": "<Relevant international engineering benchmarks, e.g., OECD Tractor Codes, ISO 4254, or regional standard>",
    "pvoc_requirement": "<Pre-Export Verification of Conformity mandate details for ${country}>",
    "gmo_policy": "N/A (Agricultural Machinery)",
    "hs_customs_codes": [
      "<Exact primary 6-digit HS code for ${technology}>"
    ]
  },
  "trials_and_reciprocity": {
    "trial_rules": "<Exact physical safety, PTO, or field demonstration audit required before commercial type-approval>",
    "reciprocity": "<Homologation reciprocity, e.g., recognition of OECD, ISO, or CE/CFMTTI test certificates>"
  },
  "logistics_and_customs": {
    "labeling_rules": "<Exact chassis/VIN plate, engine number engraving, PTO warning labels, and required language>",
    "port_inspection": "<Real designated commercial/industrial cargo ports in ${country} and on-dock customs verification>"
  },
  "risk_mitigation": "<Most critical pitfall that will lead to customs rejection, heavy penalties, or impoundment at ${country} ports>"
}`;

  return await queryAI(prompt, systemInstruction);
};