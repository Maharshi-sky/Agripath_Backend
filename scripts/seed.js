import { supabase } from './db.js';

async function seedDatabase() {
  console.log("🌱 Starting Database Seeding...");

  const sampleZones = [
    {
      country: 'Ethiopia',
      zone_id: 'ETH-1',
      zone_name: 'Oromia & Amhara Highlands',
      fao_class: 'Sub-humid highland AEZ-11',
      rainfall_mm: 1150,
      soil_ph: 6.2,
      temp_range: '12-28°C',
      main_crops: ['Wheat', 'Teff', 'Maize', 'Chickpea'],
      tech_scores: { chemical: 94, seeds: 90, bio: 92, irrigation: 82 }
    },
    {
      country: 'Nigeria',
      zone_id: 'NGA-1',
      zone_name: 'Sudan & Sahel Savannah (Kano, Sokoto)',
      fao_class: 'Semi-arid AEZ-7',
      rainfall_mm: 700,
      soil_ph: 6.8,
      temp_range: '22-44°C',
      main_crops: ['Sorghum', 'Millet', 'Cowpea', 'Groundnut'],
      tech_scores: { solar: 92, seeds: 85, bio: 80, chemical: 80 }
    }
  ];

  const sampleRegs = [
    {
      country: 'Ethiopia',
      tech_type: 'chemical',
      agency: 'EPA Ethiopia & DAIRE',
      steps: [
        { step: 1, action: 'File EPA-CHEM-01 Application' },
        { step: 2, action: 'Technical Review & Efficacy Data Submission' }
      ],
      timeline: '3-5 months',
      fees_usd: 350,
      docs_required: ['Amharic Certified Label', 'ICAR Validation Data', 'GHS-7 SDS'],
      hs_codes: ['3102.10', '3105.00'],
      confidence_score: 90
    }
  ];

  const { error: zErr } = await supabase.from('agroclimatic_zones').upsert(sampleZones, { onConflict: 'country,zone_id' });
  if (zErr) console.error("❌ Zone Seed Error:", zErr.message);
  else console.log("✅ Zones Seeded Successfully!");

  const { error: rErr } = await supabase.from('regulatory_pathways').upsert(sampleRegs, { onConflict: 'country,tech_type' });
  if (rErr) console.error("❌ Reg Seed Error:", rErr.message);
  else console.log("✅ Regulatory Pathways Seeded Successfully!");
}

seedDatabase();