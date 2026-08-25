import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { supabase } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

const fileName = 'all_fertilizer_crop_protection_products1.csv';

// CSV Path Resolution: Targets 'data/' directory first
let CSV_FILE_PATH = path.join(__dirname, '../data', fileName);

if (!fs.existsSync(CSV_FILE_PATH)) {
  const rootPath = path.join(__dirname, '..', fileName);
  if (fs.existsSync(rootPath)) {
    CSV_FILE_PATH = rootPath;
  } else if (fs.existsSync(path.join(__dirname, fileName))) {
    CSV_FILE_PATH = path.join(__dirname, fileName);
  } else {
    console.error(`❌ CSV File "${fileName}" not found in 'data/' or root directory!`);
    process.exit(1);
  }
}

// Clean trademark symbols and spaces
const cleanString = (str) => {
  if (!str) return '';
  return str.replace(/®|™/g, '').trim();
};

// Helper to extract clean sub-category/technology type from category string
const extractTechType = (rawCategory) => {
  if (!rawCategory) return 'General';
  const match = rawCategory.match(/\(([^)]+)\)/); // Extract text inside parentheses, e.g., "Insecticide"
  return match ? match[1].trim() : rawCategory.trim();
};

// Helper to extract Active Ingredients cleanly
const extractActiveIngredients = (contextStr) => {
  if (!contextStr) return [];
  const match = contextStr.match(/Active Ingredient\/Technology:\s*([^|]+)/i);
  if (match && match[1]) {
    return match[1].split(/,|\+|\//).map(s => cleanString(s)).filter(Boolean);
  }
  return [];
};

// Helper to parse arrays
const parseArray = (val) => {
  if (!val || val.toLowerCase().includes('not specified')) return [];
  return val.split(/,|\n|\|/).map(s => cleanString(s)).filter(Boolean);
};

async function ingestCSV() {
  const productsMap = new Map();

  console.log(`🔄 Parsing and Cleaning CSV File from: ${CSV_FILE_PATH}`);

  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on('data', (row) => {
      const rawProductName = row['technology_name'] || row['select_technology'] || row['product_name'];
      const productName = cleanString(rawProductName);
      const companyName = row['company_institution'] || row['Company'] || 'Generic';
      const rawCategory = row['technology_category'] || row['Category'] || 'Crop Protection';

      if (!productName) return;

      const techType = extractTechType(rawCategory);
      const activeIngredients = extractActiveIngredients(row['additional_context']);

      const uniqueKey = `${companyName.toLowerCase().trim()}___${productName.toLowerCase().trim()}`;

      productsMap.set(uniqueKey, {
        company_name: companyName,
        product_name: productName,
        category: rawCategory,
        technology_type: techType, // Clean: e.g. "Insecticide", "Fungicide", "Seedcare"
        active_ingredients: activeIngredients.length > 0 ? activeIngredients : [productName],
        target_crops: parseArray(row['target_crops_or_livestock']),
        target_pests_diseases: parseArray(row['proven_yield_impact_data']),
        application_rate: row['application_method'] || '',
        formulation_type: row['unit_price_approx'] || ''
      });
    })
    .on('end', async () => {
      const uniqueProducts = Array.from(productsMap.values());
      console.log(`📦 Cleaned ${uniqueProducts.length} products. Re-syncing with Supabase...`);

      const { data, error } = await supabase
        .from('vendor_products')
        .upsert(uniqueProducts, { onConflict: 'company_name, product_name' });

      if (error) {
        console.error('❌ Error during ingestion:', error.message);
      } else {
        console.log(`🎉 SUCCESS! Updated ${uniqueProducts.length} clean products into Supabase!`);
      }
    });
}

ingestCSV();