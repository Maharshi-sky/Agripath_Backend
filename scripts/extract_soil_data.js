// agripath-backend/scripts/extract_soil_data.js
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { supabase } from '../config/db.js';

const SOIL_SERVICE = process.env.FLASK_SOIL_URL || 'http://127.0.0.1:5001';
const SLEEP_MS = 400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Smart Multi-Key Getter
function getVal(obj, keys, defaultVal = null) {
  if (!obj || typeof obj !== 'object') return defaultVal;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '' && obj[k] !== 'N/A') {
      const parsed = parseFloat(obj[k]);
      return isNaN(parsed) ? obj[k] : parsed;
    }
  }
  return defaultVal;
}

async function fetchSoilWithRetry(url, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (response.ok) return await response.json();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await sleep(1500);
    }
  }
  return null;
}

async function runSoilExtractor() {
  console.log('🌱 Starting Robust ISRIC SoilGrids v2.0 Data Extraction...');

  const { data: zones, error } = await supabase
    .from('agroclimatic_zones')
    .select('*')
    .order('country', { ascending: true });

  if (error || !zones || zones.length === 0) {
    console.error('❌ Failed to fetch zones from database:', error?.message);
    return;
  }

  console.log(`📍 Processing ${zones.length} zones with smart multi-attribute mapping...\n`);

  const soilRecords = [];

  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const country = (z.country || z.Country || '').trim();
    const zoneName = (z.zone_name || z.Zone_Name || `Zone ${i + 1}`).trim();

    const minLat = parseFloat(z.min_lat || 0);
    const maxLat = parseFloat(z.max_lat || 0);
    const minLon = parseFloat(z.min_lon || 0);
    const maxLon = parseFloat(z.max_lon || 0);

    const lat = minLat && maxLat ? (minLat + maxLat) / 2 : (minLat || 0);
    const lon = minLon && maxLon ? (minLon + maxLon) / 2 : (minLon || 0);

    console.log(`[${i + 1}/${zones.length}] Extracting: ${country} -> ${zoneName} (${lat.toFixed(4)}, ${lon.toFixed(4)})...`);

    try {
      const url = `${SOIL_SERVICE}/api/v1/zone-soil-profile?country=${encodeURIComponent(country)}&lat=${lat}&lon=${lon}`;
      const json = await fetchSoilWithRetry(url);
      
      // Flatten all possible nested response structures
      const p = {
        ...(json?.soil_profile?.data || {}),
        ...(json?.data || {}),
        ...(json?.chemical_profile || {}),
        ...(json?.physical_profile || {}),
        ...(json?.carbon_profile || {}),
        ...(json || {})
      };

      // Extract all metrics safely
      const ph = getVal(p, ['ph', 'ph_level', 'soil_ph', 'phh2o']);
      const soc = getVal(p, ['organic_carbon', 'soc', 'organic_carbon_g_kg', 'soc_0_30']);
      const n = getVal(p, ['total_nitrogen', 'nitrogen', 'total_nitrogen_g_kg', 'nit']);
      const cec = getVal(p, ['cec', 'cec_capacity', 'cec_capacity_cmol_kg', 'cec_0_30']);
      
      const texture = p.texture_class || p.texture || p.texture_class_usda || 'Loamy Soil';
      const wrb = p.wrb_class || p.wrb_soil_taxonomy || p.wrb || 'Cambisols';

      const sand = getVal(p, ['sand', 'sand_percentage', 'sand_ratio', 'sand_pct']);
      const silt = getVal(p, ['silt', 'silt_percentage', 'silt_ratio', 'silt_pct']);
      const clay = getVal(p, ['clay', 'clay_percentage', 'clay_ratio', 'clay_pct']);
      
      const bulkDensity = getVal(p, ['bulk_density', 'bdod', 'bulk_density_g_cm3']);
      const coarseFrag = getVal(p, ['coarse_fragments', 'cfvo', 'coarse_fragments_pct']);
      const ocd = getVal(p, ['carbon_density', 'ocd', 'carbon_density_ocd_kg_m3']);
      const ocs = getVal(p, ['carbon_stocks', 'ocs', 'carbon_stocks_ocs_t_ha']);

      const row = {
        'Country': country,
        'Agroclimatic Zone': zoneName,
        'Latitude': lat,
        'Longitude': lon,
        'pH Level (0-30cm)': ph !== null ? ph : 'N/A',
        'Organic Carbon (g/kg)': soc !== null ? soc : 'N/A',
        'Total Nitrogen (g/kg)': n !== null ? n : 'N/A',
        'CEC Capacity (cmol/kg)': cec !== null ? cec : 'N/A',
        'Texture Class (USDA)': texture,
        'WRB Soil Taxonomy': wrb,
        'Sand Ratio (%)': sand !== null ? sand : 'N/A',
        'Silt Ratio (%)': silt !== null ? silt : 'N/A',
        'Clay Ratio (%)': clay !== null ? clay : 'N/A',
        'Bulk Density (g/cm³)': bulkDensity !== null ? bulkDensity : 'N/A',
        'Coarse Fragments (%)': coarseFrag !== null ? coarseFrag : 'N/A',
        'Carbon Density (kg/m³)': ocd !== null ? ocd : 'N/A',
        'Carbon Stocks (t/ha)': ocs !== null ? ocs : 'N/A',
        'Data Source': 'ISRIC SoilGrids v2.0'
      };

      soilRecords.push(row);

      // Write directly to Supabase Table
      await supabase.from('zone_soil_analytics').upsert({
        country,
        zone_name: zoneName,
        latitude: lat,
        longitude: lon,
        ph_level: ph,
        organic_carbon_g_kg: soc,
        total_nitrogen_g_kg: n,
        cec_capacity_cmol_kg: cec,
        texture_class_usda: texture,
        wrb_soil_taxonomy: wrb,
        sand_percentage: sand,
        silt_percentage: silt,
        clay_percentage: clay,
        bulk_density_g_cm3: bulkDensity,
        coarse_fragments_pct: coarseFrag,
        carbon_density_ocd_kg_m3: ocd,
        carbon_stocks_ocs_t_ha: ocs
      }, { onConflict: 'country,zone_name' });

      // Live append to Master CSV
      const csvLine = `"${country}","${zoneName}",${lat},${lon},${ph || ''},${soc || ''},${n || ''},${cec || ''},"${texture}","${wrb}",${sand || ''},${silt || ''},${clay || ''},${bulkDensity || ''},${coarseFrag || ''},${ocd || ''},${ocs || ''}\n`;
      if (!fs.existsSync('Soil_Grids_Analytics_Master.csv')) {
        fs.writeFileSync('Soil_Grids_Analytics_Master.csv', Object.keys(row).map(k => `"${k}"`).join(',') + '\n');
      }
      fs.appendFileSync('Soil_Grids_Analytics_Master.csv', csvLine);

      console.log(`  ✅ Successfully saved (pH: ${ph}, SOC: ${soc} g/kg, N: ${n} g/kg)`);
    } catch (err) {
      console.error(`  ❌ Error processing ${zoneName}:`, err.message);
    }

    await sleep(SLEEP_MS);
  }

  // Generate Complete Master Excel
  const worksheet = XLSX.utils.json_to_sheet(soilRecords);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ISRIC_Soil_Profiles');
  XLSX.writeFile(workbook, path.resolve('Soil_Grids_Analytics_Master.xlsx'));

  console.log('\n🎉 Complete Soil Analytics Data Extracted & Persisted!');
}

runSoilExtractor();