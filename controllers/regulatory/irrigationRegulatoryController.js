// controllers/regulatory/irrigationRegulatoryController.js
import { queryAI } from '../../utils/aiService.js';

export const handleIrrigationRegulatory = async ({ country, technology, category, origin = 'India' }) => {
  const systemInstruction = `You are a Senior Agricultural Hydraulic Engineer, Irrigation Standards Auditor, and International Trade Compliance Director.
You specialize in statutory import clearance, water equipment conformity (PVoC), international standards (ISO 9261 for emitters, ISO 7714 for filters, ISO 15874 for piping), and customs tariffs across Africa, South Asia, and emerging agricultural markets.
CRITICAL MANDATE:
- Do NOT output generic placeholder text or template samples.
- Identify the REAL national water resources boards, irrigation development authorities (e.g., NIB Kenya, NIDA Tanzania, WEC Uganda), and national standards bureaus (e.g., KEBS, TBS, UNBS).
- Select exact Harmonized System (HS) codes for agricultural irrigation (e.g., 8424.82 for Agricultural drip/sprinkler systems, 3917.32 for LDPE/HDPE drip laterals, 8481.80 for hydraulic solenoid valves).
- Return STRICT VALID JSON ONLY matching the requested schema without any markdown formatting or commentary.`;

  const prompt = `Evaluate the exact statutory regulatory and customs homologation framework for importing modern agricultural irrigation equipment:
- Target Market: "${country}"
- Irrigation Technology / Equipment: "${technology}"
- Category: "${category || 'Irrigation & Water Regimen'}"
- Country of Origin: "${origin}"

MANDATORY INSTRUCTIONS:
1. Identify the real statutory standards body and National Irrigation Authority in "${country}".
2. Cite the exact National Irrigation Policy / Water Act and Conformity Assessment schemes in "${country}".
3. Provide exact HS Customs Codes (e.g., 8424.82 for Drip/Micro-irrigation, 3917.32 for Drip Line Tubing, 8413.70 for Solar Submersible Pumps).
4. Specify Pre-Export Verification of Conformity (PVoC / CoC) standards (ISO 9261 for emitter flow variation, hydrostatic pressure burst limits).
5. Identify real maritime entry and dry container ports in "${country}".

Return STRICT JSON only matching this schema:
{
  "header_title": "Agricultural Irrigation Equipment Statutory Import & Homologation Pathway — ${country}",
  "meta": {
    "source": "Groq LPU Hydraulic & Irrigation Compliance Engine",
    "confidence_score": "98%",
    "country": "${country}",
    "regional_bloc": "<Exact regional trade bloc for ${country}, e.g., EAC, COMESA, ECOWAS>",
    "item_sub_category": "<Specific sub-category, e.g., Drip Irrigation & Micro-Emitters, Solar Surface Systems, Pivot Sprinklers>",
    "last_verified": "2026-Q1"
  },
  "authorities": {
    "quarantine_authority": "<National Irrigation Authority / Water Resources Authority in ${country}>",
    "certification_body": "<National Standards Bureau & PVoC Conformity Agency in ${country}>",
    "governing_laws": "<Exact National Water Act, Irrigation Act, and Standards Regulations in ${country}>"
  },
  "summary": {
    "target_country": "${country}",
    "category": "Irrigation & Water Regimen",
    "technology_type": "${technology.toUpperCase()}",
    "regulatory_authority": "<Primary governing water & standards agency in ${country}>",
    "estimated_timeline": "<Realistic clearance timeline in days, e.g., 30 - 60 Days>",
    "estimated_cost": "<Realistic statutory inspection and conformity fee in USD, e.g., $1,200 – $2,800 USD>"
  },
  "compliance_requirements": {
    "import_permit": "<Exact Water Equipment Clearance / Pre-Shipment PVoC Permit required in ${country}>",
    "required_documents": [
      "Certificate of Conformity (PVoC / CoC) issued by accredited partner (SGS/Bureau Veritas/Intertek)",
      "Hydraulic Factory Test Report (ISO 9261 for Drip Emitter Discharge & CV coefficient)",
      "Polymer UV Stabilization & Hydrostatic Pressure Burst Certificate (ASTM/ISO 15874)",
      "Commercial Invoice, Packing List & Bill of Lading",
      "Certificate of Origin (CoO) from Origin Authority"
    ],
    "phytosanitary_ad": "Agricultural Infrastructure Equipment (Clean Cargo Declaration — 100% Free of Soil & Organic Contaminants)",
    "fumigation_treatment": "High-cube containerized sea freight with moisture desiccant bags; timber pallets ISPM-15 heat treated",
    "ista_standards": "ISO 9261 (Agricultural Irrigation Equipment — Emitters and Emitting Pipes Specifications & Test Methods)",
    "pvoc_requirement": "Mandatory Pre-Shipment Inspection (PVoC Route A/B) verifying wall thickness, emitter flow rate, and pressure rating",
    "gmo_policy": "N/A (Hydraulic Agricultural Equipment)",
    "hs_customs_codes": [
      "8424.82",
      "3917.32"
    ]
  },
  "trials_and_reciprocity": {
    "trial_rules": "<Local hydraulic benchmark verification or demonstration audit before government tender / subsidy enlistment in ${country}>",
    "reciprocity": "<Recognition of ISO/BIS/CE factory test certificates under EAC/COMESA standards harmonization>"
  },
  "logistics_and_customs": {
    "labeling_rules": "<Drip line embossing with manufacturer name, nominal diameter (mm), wall thickness, emitter spacing (cm), flow rate (LPH), and batch code>",
    "port_inspection": "<Primary sea port & dry port container freight stations in ${country} with physical customs verification>"
  },
  "risk_mitigation": "<Primary exporter risk, e.g., non-compliant emitter CV coefficient, un-stabilized polymer degrading under UV, or missing PVoC before discharge>"
}`;

  return await queryAI(prompt, systemInstruction);
};