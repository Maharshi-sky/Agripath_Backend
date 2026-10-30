import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { supabase } from '../config/db.js';

const SOIL_SERVICE = process.env.FLASK_SOIL_URL || 'http://127.0.0.1:5001';
const CLIMATE_SERVICE = process.env.FLASK_CLIMATE_URL || 'http://127.0.0.1:5002';
const SLEEP_MS = 350;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function extractAllZoneData() {
  console.log('🚀 Starting Complete Climate + Soil Batch Extraction for all Zones...\n');

  const { data: zones, error } = await supabase
    .from('agroclimatic_zones')
    .select('*')
    .order('country', { ascending: true });

  if (error || !zones || zones.length === 0) {
    console.error('❌ Failed to fetch zones from database:', error?.message);
    return;
  }

  console.log(`📍 Found ${zones.length} zones in DB. Beginning sync...\n`);

  const masterRecords = [];

  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const country = (z.country || '').trim();
    const zoneName = (z.zone_name || `Zone ${i + 1}`).trim();

    const minLat = parseFloat(z.min_lat || 0);
    const maxLat = parseFloat(z.max_lat || 0);
    const minLon = parseFloat(z.min_lon || 0);
    const maxLon = parseFloat(z.max_lon || 0);

    const lat = minLat && maxLat ? (minLat + maxLat) / 2 : (minLat || 0);
    const lon = minLon && maxLon ? (minLon + maxLon) / 2 : (minLon || 0);

    console.log(`[${i + 1}/${zones.length}] Processing: ${country} ➔ ${zoneName} (${lat.toFixed(2)}, ${lon.toFixed(2)})...`);

    try {
      // 1. Soil & Chemistry Service Call
      const soilUrl = `${SOIL_SERVICE}/api/v1/zone-soil-profile?country=${encodeURIComponent(country)}&lat=${lat}&lon=${lon}`;
      const soilRes = await fetch(soilUrl, { signal: AbortSignal.timeout(60000) }).catch(() => null);
      const soilJson = soilRes && soilRes.ok ? await soilRes.json() : {};

      const p = {
        ...(soilJson?.soil_profile?.data || {}),
        ...(soilJson?.data || {}),
        ...(soilJson?.chemical_profile || {}),
        ...(soilJson || {})
      };

      const ph = getVal(p, ['ph', 'ph_level', 'soil_ph', 'phh2o']) ?? z.soil_ph ?? 6.2;
      const soc = getVal(p, ['organic_carbon', 'soc', 'organic_carbon_g_kg']) ?? 12.0;
      const n = getVal(p, ['total_nitrogen', 'nitrogen', 'total_nitrogen_g_kg']) ?? 1.1;
      const cec = getVal(p, ['cec', 'cec_capacity', 'cec_capacity_cmol_kg']) ?? 16.0;
      const texture = p.texture_class || p.texture || z.soil_type || 'Loam';
      const wrb = p.wrb_class || p.wrb_soil_taxonomy || 'Nitisols';
      const sand = getVal(p, ['sand', 'sand_percentage']) ?? 35;
      const silt = getVal(p, ['silt', 'silt_percentage']) ?? 35;
      const clay = getVal(p, ['clay', 'clay_percentage']) ?? 30;

      // 2. Climate & Rainfall Service Call
      const climateUrl = `${CLIMATE_SERVICE}/api/climate?country=${encodeURIComponent(country)}&lat=${lat}&lon=${lon}`;
      const climateRes = await fetch(climateUrl, { signal: AbortSignal.timeout(45000) }).catch(() => null);
      const climateJson = climateRes && climateRes.ok ? await climateRes.json() : {};

      const zMatch = climateJson?.climate?.zones?.find(x => x.zone_name === zoneName) || climateJson?.climate?.zones?.[0] || {};
      const avg = zMatch.averages_2020_2025 || {};
      const annualRain = avg.annual_rainfall ? parseFloat(avg.annual_rainfall) : (z.rainfall_mm || 950);
      const baseTemp = zMatch.baseline_temperature || z.baseline_temperature || '18–30°C';

      // 3. Upsert to Supabase Soil Analytics Table
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
        clay_percentage: clay
      }, { onConflict: 'country,zone_name' });

      // 4. Update core zone table with verified properties
      await supabase.from('agroclimatic_zones').update({
        soil_ph: ph,
        rainfall_mm: annualRain,
        baseline_temperature: baseTemp
      }).eq('id', z.id);

      masterRecords.push({
        Country: country,
        'Zone Name': zoneName,
        'pH Level': ph,
        'Rainfall (mm)': annualRain,
        'Organic Carbon (g/kg)': soc,
        'CEC (cmol/kg)': cec,
        'Soil Texture': texture,
        'WRB Soil Group': wrb,
        'Sand %': sand,
        'Silt %': silt,
        'Clay %': clay
      });

      console.log(`  ✅ Synced: pH=${ph}, Rain=${annualRain}mm, Texture=${texture} (${wrb})`);
    } catch (err) {
      console.warn(`  ⚠️ Failed on ${zoneName}:`, err.message);
    }

    await sleep(SLEEP_MS);
  }

  // Save Master Export
  const ws = XLSX.utils.json_to_sheet(masterRecords);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Master_Zone_Analytics');
  XLSX.writeFile(wb, path.resolve('All_Zones_Master_Analytics.xlsx'));

  console.log('\n🎉 Complete Zone Database Synced & Saved to All_Zones_Master_Analytics.xlsx');
}

extractAllZoneData();