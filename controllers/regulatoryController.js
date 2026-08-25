// agripath-backend/controllers/regulatoryController.js
import { supabase } from '../config/db.js';

// Helper 1: Strict Seed Category Checker (Only seeds/varieties)
const isSeedCategory = (cat = '', tech = '') => {
  const c = (cat || '').toLowerCase();
  const t = (tech || '').toLowerCase();
  
  if (c.includes('bio') || c.includes('fertilizer') || c.includes('protection') || c.includes('machin')) {
    return false;
  }
  return c.includes('seed') || c.includes('variet') || t.includes('seed') || t.includes('hybrid') || c === '';
};

// Helper 2: Strict Biological Input Checker
const isBioCategory = (cat = '', tech = '') => {
  const c = (cat || '').toLowerCase();
  const t = (tech || '').toLowerCase();
  return c.includes('bio') || c.includes('biological') || t.includes('biofertilizer') || t.includes('biostimulant') || t.includes('inoculant');
};

// 1. Main Regulatory Pathway Endpoint
export const getRegulatoryPathway = async (req, res) => {
  const startTime = performance.now();
  
  const { category, technology, techType, country } = req.body || {};
  const activeCategory = (category || "Seeds & Varieties").trim();
  const activeTech = (technology || techType || "Certified Agricultural Input").trim();
  const normalizedCountry = (country || "").trim();

  console.log('\n' + '='.repeat(70));
  console.log(`🚀 [REGULATORY WORKFLOW] Starting Statutory Compliance Evaluation`);
  console.log('='.repeat(70));
  console.log(`🌍 Target Market: "${normalizedCountry || 'NOT PROVIDED'}"`);
  console.log(`🏷️  Technology Category: ${activeCategory} (${activeTech})`);
  console.log('-'.repeat(70));

  if (!normalizedCountry) {
    console.error('❌ [VALIDATION ERROR] "country" parameter is missing in request body!');
    return res.status(400).json({ 
      success: false, 
      error: "Missing required parameter: 'country' is required." 
    });
  }

  try {
    // =========================================================================
    // 1. BIOLOGICAL INPUTS REGULATORY WORKFLOW (from public.reg_biological_inputs)
    // =========================================================================
    if (isBioCategory(activeCategory, activeTech)) {
      console.log(`⏳ [BIO REG] Querying 'reg_biological_inputs' for "${normalizedCountry}"...`);

      let bioRegData = null;

      // Attempt 1: Standard snake_case column 'country'
      const { data: d1, error: e1 } = await supabase
        .from('reg_biological_inputs')
        .select('*')
        .ilike('country', normalizedCountry)
        .limit(1);

      if (!e1 && d1 && d1.length > 0) {
        bioRegData = d1[0];
      } else {
        // Attempt 2: Case-sensitive '"Country"' fallback
        const { data: d2, error: e2 } = await supabase
          .from('reg_biological_inputs')
          .select('*')
          .ilike('"Country"', normalizedCountry)
          .limit(1);

        if (!e2 && d2 && d2.length > 0) {
          bioRegData = d2[0];
        }
      }

      if (bioRegData) {
        const countryName = bioRegData.country || bioRegData.Country || normalizedCountry;
        const regAuth = bioRegData.regulatory_authority || bioRegData['Regulatory Authority'] || `${countryName} National Bio-Inputs & Fertilizer Authority`;
        const laws = bioRegData.governing_laws_framework || bioRegData['Governing Laws Framework'] || 'National Biological Inoculants, Fertilizer & Plant Protection Act';
        const standards = bioRegData.international_standard_reference || bioRegData['International Standard Reference'] || 'FAO Microbial Inoculant Standards & Rotterdam PIC Guidelines';
        const regionalBloc = bioRegData.regional_bloc || bioRegData['Regional Bloc'] || 'Regional Harmonization Framework';
        const labeling = bioRegData.labeling_marking_requirements || bioRegData['Labeling Marking Requirements'] || 'Bilingual labeling, CFU viability count, Batch No., Expiry Date, Storage Temp (15-25°C) & GHS safety pictograms.';
        const ports = bioRegData.designated_ports_points_of_entry || bioRegData['Designated Ports Points of Entry'] || 'Designated International Air/Sea Cargo Terminals with temperature-controlled storage.';
        const riskMitigation = bioRegData.top_rejection_risks_and_mitigation || bioRegData['Top Rejection Risks and Mitigation'] || 'Submitting unregistered biological strain or insufficient live viable spore counts (CFU/g) at destination inspection. Ensure pre-shipment laboratory batch assay and verified import clearance.';
        const preApproval = bioRegData.registration_pre_approval_requirement || bioRegData['Registration Pre Approval Requirement'] || 'Mandatory Bio-Input Product Registration & Import Permit';
        const customsNotes = bioRegData.logistics_customs_notes || bioRegData['Logistics Customs Notes'] || 'Temperature-controlled cargo handling (2-8°C / 15-25°C); Non-hazardous microbial classification.';

        const rawDocs = bioRegData.mandatory_certificates_documents || bioRegData['Mandatory Certificates Documents'] || '';
        const exportDocs = rawDocs
          ? rawDocs.split(/[,;\n]+/).map(d => d.trim()).filter(Boolean)
          : [];

        const docList = exportDocs.length > 0 ? exportDocs : [
          'Biofertilizer / Biostimulant Statutory Registration Certificate',
          'Certified Certificate of Analysis (Active CFU/ml & Moisture Assay)',
          'Material Safety Data Sheet (16-Section GHS-Compliant SDS)',
          'Multi-Location Field Bio-Efficacy Trial Report',
          'Certified Non-Pathogenicity & Biosafety Risk Assessment Dossier',
          'Official Phytosanitary Export Clearance & Certificate of Origin'
        ];

        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✨ [BIO REG SUCCESS] Loaded from 'reg_biological_inputs' for "${countryName}" | Took: ⏱️ ${duration}s\n`);

        return res.json({
          success: true,
          category: 'Biological Inputs',
          header_title: `Biological Inputs & Inoculant Registration Pathway — ${countryName}`,
          meta: {
            source: 'reg_biological_inputs_master',
            confidence_score: '98%',
            country: countryName,
            region_bloc: regionalBloc,
            last_verified: '2026-Q1'
          },
          authorities: {
            quarantine_authority: regAuth,
            certification_body: `${countryName} Directorate of Agrochemicals & Microbial Input Standards`,
            governing_laws: laws
          },
          summary: {
            target_country: countryName,
            category: 'Biological Inputs',
            technology_type: activeTech.toUpperCase(),
            regulatory_authority: regAuth,
            estimated_timeline: '60 – 120 Days (Fast-Track Microbial Pathway)',
            estimated_cost: '$1,500 – $3,200 USD'
          },
          compliance_requirements: {
            import_permit: preApproval,
            required_documents: docList,
            phytosanitary_ad: 'Mandatory Declaration: Consignment free from mammalian toxic metabolites, soil pathogens, and non-target contaminants.',
            fumigation_treatment: 'Strictly No Chemical Fumigation (Temperature-Controlled Live Biological Inoculant Protocol).',
            ista_standards: `Microbial Standards: ${standards} (Live CFU Viability >= 1x10^8 CFU/g or ml with zero pathogenic coliforms).`,
            gmo_policy: 'Non-Genetically Modified Organism (Non-GMO) Microbial Authentication Certificate Mandatory',
            hs_customs_codes: ['3808.99', '3101.00', '3105.90']
          },
          trials_and_reciprocity: {
            trial_rules: preApproval,
            reciprocity: 'Regional trade bloc data reciprocity recognized with verified Certificate of Analysis.'
          },
          logistics_and_customs: {
            labeling_rules: labeling,
            port_inspection: `${ports} · Notes: ${customsNotes}`
          },
          risk_mitigation: riskMitigation
        });
      } else {
        console.warn(`⚠️ [BIO REG NOT FOUND] No direct record found for "${normalizedCountry}" in 'reg_biological_inputs'. Falling back to AI...`);
      }
    }

    // =========================================================================
    // 2. SEEDS MASTER DATABASE QUERY (79 Countries Verified Framework - UNCHANGED)
    // =========================================================================
    if (isSeedCategory(activeCategory, activeTech)) {
      console.log(`⏳ [STEP 1/4] Querying Master Seed Regulations Database for "${normalizedCountry}"...`);

      const { data: seedData, error: seedErr } = await supabase
        .from('master_seed_regulations')
        .select('*')
        .ilike('Country Name', normalizedCountry)
        .maybeSingle();

      if (seedErr) {
        console.error(`⚠️ [SUPABASE ERROR] Error querying 'master_seed_regulations':`, seedErr.message);
      } else if (seedData) {
        console.log(`✅ [STEP 1/4] Verified Statutory Record Found for "${seedData['Country Name']}"!`);
        
        const quarantineAuth = seedData['National Plant Quarantine Authority'] || 'NPPO / Plant Health Directorate';
        const certBody = seedData['National Seed Certification Body'] || 'National Seed Authority / Ministry of Agriculture';
        const governingLaws = seedData['Governing Laws & Legislation'] || 'National Plant Quarantine & Seed Act';

        const rawChecklist = seedData['Indian Export Document Checklist (DPPQS/ISTA)'] || '';
        const exportDocs = rawChecklist
          .split(/[,;\n]+/)
          .map(d => d.trim())
          .filter(Boolean);
        const finalDocs = exportDocs.length > 0 ? exportDocs : ['Phytosanitary Certificate (DPPQS India)', 'ISTA Orange Certificate', 'Certificate of Origin'];

        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✨ [REGULATORY SUCCESS] Framework Loaded | Took: ⏱️ ${duration}s\n`);

        return res.json({
          success: true,
          category: 'Seeds & Varieties',
          header_title: `Seed Import & Quarantine Pathway — ${seedData['Country Name']}`,
          meta: {
            source: 'master_database',
            confidence_score: '98%',
            country: seedData['Country Name'],
            region_bloc: seedData['Region / Trade Bloc Framework'] || 'N/A',
            last_verified: '2026-Q1'
          },
          authorities: {
            quarantine_authority: quarantineAuth,
            certification_body: certBody,
            governing_laws: governingLaws
          },
          summary: {
            target_country: seedData['Country Name'],
            category: activeCategory,
            technology_type: activeTech.toUpperCase(),
            regulatory_authority: quarantineAuth,
            estimated_timeline: seedData['Estimated Timeline'] || '45 - 90 Days',
            estimated_cost: '$1,200 - $3,500 USD'
          },
          compliance_requirements: {
            import_permit: seedData['Import Permit Name & Form'] || 'Plant Import Permit (PIP)',
            required_documents: finalDocs,
            phytosanitary_ad: seedData['Mandatory Phytosanitary Declarations (AD)'] || 'Standard pest freedom declaration required.',
            fumigation_treatment: seedData['Pre-Shipment Fumigation & Treatment Standards'] || 'Methyl Bromide / Seed Dressing as per NPPO specs.',
            ista_standards: seedData['ISTA & Seed Quality Testing Standards'] || 'ISTA Orange Certificate (Germination >= 85%, Purity >= 98%)',
            gmo_policy: seedData['GMO & Biosafety Regulation Stance'] || 'Non-GMO Certification Mandatory',
            hs_customs_codes: ['1209.91', '1209.99']
          },
          trials_and_reciprocity: {
            trial_rules: seedData['Variety Registration & Trial Rules (DUS/VCU)'] || 'National catalogue registration required.',
            reciprocity: seedData['Regional Harmonization / Catalogue Reciprocity'] || 'Bilateral verification required.'
          },
          logistics_and_customs: {
            labeling_rules: seedData['Packaging, Tagging & Labeling Rules'] || 'Bilingual labeling & lot details mandatory.',
            port_inspection: seedData['Port of Entry Inspection & PEQ Protocols'] || 'Port inspection & quarantine sampling.'
          },
          risk_mitigation: seedData['Key Exporter Risk Mitigation Strategy'] || 'Verify import permit validity and quarantine clauses prior to dispatch.'
        });
      }
    }

    // =========================================================================
    // 3. GENERIC FALLBACK (regulatory_pathways table)
    // =========================================================================
    const normalizedTechType = activeTech.toLowerCase();
    const { data: dbData } = await supabase
      .from('regulatory_pathways')
      .select('*')
      .ilike('country', normalizedCountry)
      .ilike('tech_type', normalizedTechType)
      .maybeSingle();

    if (dbData && dbData.confidence_score >= 60) {
      return res.json({
        success: true,
        meta: {
          source: 'database',
          confidence_score: `${dbData.confidence_score}%`,
          last_verified: dbData.last_verified
        },
        summary: {
          target_country: dbData.country,
          category: activeCategory,
          technology_type: dbData.tech_type.toUpperCase(),
          regulatory_authority: dbData.agency,
          estimated_timeline: dbData.timeline,
          estimated_cost: `$${dbData.fees_usd} USD`
        },
        compliance_requirements: {
          required_documents: dbData.docs_required || [],
          hs_customs_codes: dbData.hs_codes || ['3808.99']
        }
      });
    }

    // =========================================================================
    // 4. OLLAMA AI FALLBACK
    // =========================================================================
    console.log(`⏳ [AI FALLBACK] Running Ollama inference for "${normalizedCountry}"...`);
    const modelName = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
    const prompt = `You are a global regulatory compliance expert in agriculture.
Generate regulatory pathway for category "${activeCategory}" and technology "${activeTech}" in "${normalizedCountry}".
JSON format only:
{
  "agency": "Official regulatory body name",
  "timeline": "60-120 Days",
  "fees_usd": 2800,
  "compliance_docs": ["Product Safety Data Sheet", "CFU Count Certificate", "Import Permit", "Certificate of Origin"],
  "hs_codes": ["3808.99"]
}`;

    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        format: 'json',
        stream: false,
        options: { num_predict: 1200, temperature: 0.1 }
      })
    });

    const rawData = await response.json();
    const aiParsed = JSON.parse(rawData.response);

    return res.json({
      success: true,
      category: activeCategory,
      meta: { source: 'ollama_ai', confidence_score: '85%', country: normalizedCountry },
      authorities: {
        quarantine_authority: aiParsed.agency || `${normalizedCountry} Agricultural Authority`,
        certification_body: 'National Inspection Body',
        governing_laws: 'National Plant Protection & Input Standards'
      },
      summary: {
        target_country: normalizedCountry,
        category: activeCategory,
        technology_type: activeTech.toUpperCase(),
        regulatory_authority: aiParsed.agency,
        estimated_timeline: aiParsed.timeline || '60-120 Days',
        estimated_cost: `$${aiParsed.fees_usd || 2500} USD`
      },
      compliance_requirements: {
        import_permit: 'Biological Input Import Permit (BIP)',
        required_documents: aiParsed.compliance_docs || ['MSDS', 'CFU Certificate', 'Import Permit'],
        phytosanitary_ad: 'Pest and Contaminant Freedom Certificate.',
        fumigation_treatment: 'Strictly No Fumigation (Live Inoculant Protocol).',
        ista_standards: 'Live Viability Standard >= 1x10^8 CFU/g',
        gmo_policy: 'Non-GMO Mandatory',
        hs_customs_codes: aiParsed.hs_codes || ['3808.99']
      },
      trials_and_reciprocity: {
        trial_rules: '1-Season Efficacy Bio-Validation',
        reciprocity: 'Regional trade bloc acceptance'
      },
      logistics_and_customs: {
      labeling_rules: labeling,
      designated_ports: ports,
      customs_notes: bioRegData.logistics_customs_notes || bioRegData['Logistics Customs Notes'] || ''
      },
      risk_mitigation: 'Verify import clearance and live bacterial storage specs before shipment.'
    });

  } catch (err) {
    console.error(`💥 [REGULATORY ERROR]:`, err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch regulatory pathway', details: err.message });
  }
};

// 2. Sources (Unchanged)
export const getRegulatorySources = async (req, res) => {
  try {
    const { priority, country } = req.query;
    let query = supabase.from('regulatory_sources').select('*');
    if (priority) query = query.eq('priority', priority);
    if (country) query = query.ilike('country', `%${country}%`);
    const { data, error } = await query.order('id', { ascending: true });
    if (error) throw error;
    return res.json({ success: true, total_sources: data.length, sources: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Updates (Unchanged)
export const getRegulatoryUpdates = async (req, res) => {
  try {
    const { review_needed } = req.query;
    let query = supabase.from('regulatory_records').select('*, regulatory_sources(name, country, priority)');
    if (review_needed === 'true') query = query.eq('requires_human_review', true);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return res.json({ success: true, total_records: data.length, records: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};