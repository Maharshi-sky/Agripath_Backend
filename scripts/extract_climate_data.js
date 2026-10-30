// agripath-backend/scripts/extract_climate_data.js
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { supabase } from '../config/db.js';

const CLIMATE_SERVICE = process.env.FLASK_CLIMATE_URL || 'http://127.0.0.1:5002';
const SLEEP_MS = 600;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runClimateExtractor() {
  console.log('🌦️ Starting Continuous NASA POWER Multi-Zone Climate Data Extraction...');

  // 1. Fetch all zones
  const { data: zones, error } = await supabase
    .from('agroclimatic_zones')
    .select('country, zone_name, baseline_rainfall, baseline_temperature, min_lat, max_lat, min_lon, max_lon')
    .order('country', { ascending: true });

  if (error || !zones || zones.length === 0) {
    console.error('❌ Failed to fetch zones from database:', error?.message);
    return;
  }

  console.log(`📍 Found ${zones.length} zones across countries. Extracting climate metrics...\n`);

  const climateRecords = [];

  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const country = z.country?.trim();
    const zoneName = z.zone_name?.trim() || `Zone ${i + 1}`;

    const lat = parseFloat(z.min_lat && z.max_lat ? (z.min_lat + z.max_lat) / 2 : z.min_lat || 0);
    const lon = parseFloat(z.min_lon && z.max_lon ? (z.min_lon + z.max_lon) / 2 : z.min_lon || 0);

    console.log(`[${i + 1}/${zones.length}] Fetching Climate: ${country} -> ${zoneName} (${lat.toFixed(4)}, ${lon.toFixed(4)})...`);

    try {
      const url = `${CLIMATE_SERVICE}/api/climate?country=${encodeURIComponent(country)}&lat=${lat}&lon=${lon}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(45000) });

      let zMatch = {};
      let avg = {};
      if (response.ok) {
        const json = await response.json();
        zMatch = json.climate?.zones?.find(x => x.zone_name === zoneName) || json.climate?.zones?.[0] || {};
        avg = zMatch.averages_2020_2025 || {};
      } else {
        console.warn(`  ⚠️ Climate service returned status ${response.status}`);
      }

      const row = {
        'Country': country,
        'Agroclimatic Zone': zoneName,
        'Latitude': lat,
        'Longitude': lon,
        'Baseline Rainfall': zMatch.baseline_rainfall || z.baseline_rainfall || 'N/A',
        'Baseline Temperature': zMatch.baseline_temperature || z.baseline_temperature || 'N/A',
        '6-Year Avg Annual Rainfall (mm)': avg.annual_rainfall ? parseFloat(avg.annual_rainfall) : 'N/A',
        '6-Year Avg Max Temp (°C)': avg.max_temp ? parseFloat(avg.max_temp) : 'N/A',
        '6-Year Avg Min Temp (°C)': avg.min_temp ? parseFloat(avg.min_temp) : 'N/A',
        'Data Source': 'NASA POWER Agroclimatology (2020–2025)'
      };

      climateRecords.push(row);

      // Upsert to Supabase
      await supabase.from('zone_climate_analytics').upsert({
        country,
        zone_index: i + 1,
        zone_name: zoneName,
        latitude: lat,
        longitude: lon,
        baseline_rainfall: zMatch.baseline_rainfall || z.baseline_rainfall || 'N/A',
        baseline_temperature: zMatch.baseline_temperature || z.baseline_temperature || 'N/A',
        avg_annual_rainfall_mm: avg.annual_rainfall ? parseFloat(avg.annual_rainfall) : null,
        avg_max_temp_c: avg.max_temp ? parseFloat(avg.max_temp) : null,
        avg_min_temp_c: avg.min_temp ? parseFloat(avg.min_temp) : null,
        yearly_breakdown: zMatch.yearly_data || null
      }, { onConflict: 'country,zone_name' });

      console.log(`  ✅ Successfully saved & appended.`);
    } catch (err) {
      console.error(`  ❌ Error processing ${zoneName}:`, err.message);
    }

    await sleep(SLEEP_MS);
  }

  // 2. Export to Excel & CSV
  console.log('\n📊 Generating Climate Excel and CSV files...');
  const worksheet = XLSX.utils.json_to_sheet(climateRecords);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Climate_Profiles');

  const excelPath = path.resolve('Climate_Zone_Analytics_Master.xlsx');
  const csvPath = path.resolve('Climate_Zone_Analytics_Master.csv');

  XLSX.writeFile(workbook, excelPath);

  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  fs.writeFileSync(csvPath, csvContent, 'utf-8');

  console.log(`🎉 Climate Data Export Complete!`);
  console.log(`📁 Excel File: ${excelPath}`);
  console.log(`📁 CSV File:   ${csvPath}`);
}

runClimateExtractor();