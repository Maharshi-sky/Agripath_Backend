import { supabase } from '../config/db.js';

const expandedAgroclimaticData = [
  // Kenya
  {
    country: "Kenya",
    zone_id: "KEN-1",
    zone_name: "Central Highlands & Rift Valley",
    fao_class: "High-potential humid highland AEZ-2",
    rainfall_mm: 1400,
    soil_ph: 5.8,
    temp_range: "10-26°C",
    main_crops: ["Tea", "Coffee", "Maize", "Irish Potato"],
    tech_scores: { bio: 95, seeds: 92, chemical: 88, irrigation: 75 }
  },
  // India
  {
    country: "India",
    zone_id: "IND-1",
    zone_name: "Indo-Gangetic Plain",
    fao_class: "Sub-tropical alluvial plain",
    rainfall_mm: 1000,
    soil_ph: 7.2,
    temp_range: "8-40°C",
    main_crops: ["Wheat", "Rice", "Sugarcane", "Mustard"],
    tech_scores: { bio: 90, seeds: 95, chemical: 92, irrigation: 90 }
  },
  // Vietnam
  {
    country: "Vietnam",
    zone_id: "VNM-1",
    zone_name: "Mekong River Delta",
    fao_class: "Tropical wet alluvial floodplain",
    rainfall_mm: 1800,
    soil_ph: 5.2,
    temp_range: "25-35°C",
    main_crops: ["Rice", "Aquaculture", "Fruit Trees"],
    tech_scores: { bio: 92, seeds: 90, chemical: 80, irrigation: 98 }
  },
  // Brazil
  {
    country: "Brazil",
    zone_id: "BRA-1",
    zone_name: "Cerrado Tropical Savanna",
    fao_class: "Tropical acid-soil savanna",
    rainfall_mm: 1500,
    soil_ph: 5.0,
    temp_range: "20-32°C",
    main_crops: ["Soybean", "Corn", "Cotton"],
    tech_scores: { bio: 96, seeds: 98, chemical: 94, irrigation: 85 }
  }
];

const expandedRegulatoryData = [
  {
    country: "Kenya",
    tech_type: "bio",
    agency: "Pest Control Products Board (PCPB)",
    steps: [
      "Submit efficacy trial data from KALRO",
      "Ecotoxicity testing and laboratory bio-analysis",
      "PCPB Board evaluation and commercial registration"
    ],
    timeline: "12-18 Months",
    fees_usd: 3500,
    docs_required: ["Dossier", "Efficacy Report", "Free Sale Certificate"],
    hs_codes: ["3808.99"],
    confidence_score: 90
  },
  {
    country: "India",
    tech_type: "bio",
    agency: "Central Insecticides Board & Registration Committee (CIBRC)",
    steps: [
      "Form I application submission",
      "Toxicity and residue trial verification",
      "CIBRC Committee review and registration certificate issuance"
    ],
    timeline: "18-24 Months",
    fees_usd: 5000,
    docs_required: ["Form I", "Manufacturing License", "Bio-Efficacy Data"],
    hs_codes: ["3808.91"],
    confidence_score: 85
  },
  {
    country: "Vietnam",
    tech_type: "bio",
    agency: "Plant Protection Department (PPD) - MARD",
    steps: [
      "Submit field testing application to PPD",
      "Conduct two-season bio-efficacy trials in Vietnam",
      "PPD Technical Advisory Council final approval"
    ],
    timeline: "14-20 Months",
    fees_usd: 4200,
    docs_required: ["GMP Certificate", "Technical Dossier", "Trial Data"],
    hs_codes: ["3808.99"],
    confidence_score: 88
  },
  {
    country: "Brazil",
    tech_type: "bio",
    agency: "MAPA / ANVISA / IBAMA Joint Regulatory Framework",
    steps: [
      "Submit joint dossier via MAPA Portal",
      "ANVISA toxicology evaluation & IBAMA environmental risk assessment",
      "MAPA final commercial registration issuance"
    ],
    timeline: "10-14 Months",
    fees_usd: 6000,
    docs_required: ["Safety Data Sheet (SDS)", "Formulation Composition", "Efficacy Dossier"],
    hs_codes: ["3808.99"],
    confidence_score: 92
  }
];

async function runBulkSeeding() {
  console.log("🌱 Starting Global Expansion Bulk Seeding into Supabase...");

  // 1. Bulk Upsert Agroclimatic Zones
  const { error: zonesErr } = await supabase
    .from('agroclimatic_zones')
    .upsert(expandedAgroclimaticData, { onConflict: 'country,zone_id' });

  if (zonesErr) {
    console.error("❌ Agroclimatic Zones Error:", zonesErr.message);
  } else {
    console.log("✅ Agroclimatic Zones Expanded (Kenya, India, Vietnam, Brazil)!");
  }

  // 2. Bulk Upsert Regulatory Pathways
  const { error: regErr } = await supabase
    .from('regulatory_pathways')
    .upsert(expandedRegulatoryData, { onConflict: 'country,tech_type' });

  if (regErr) {
    console.error("❌ Regulatory Pathways Error:", regErr.message);
  } else {
    console.log("✅ Regulatory Pathways Expanded (Kenya, India, Vietnam, Brazil)!");
  }

  process.exit();
}

runBulkSeeding();