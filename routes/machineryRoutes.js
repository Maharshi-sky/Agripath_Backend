// Agripath_Backend-main Groq/routes/machineryRoutes.js
import express from 'express';
import { supabase } from '../config/supabase.js';
import { calculateMatchScore, getMatchScore } from '../controllers/matchController.js';

const router = express.Router();

// Helper to resolve exact table name
const getTableName = (type = '') => {
  return (type || '').toLowerCase().trim() === 'equipment'
    ? 'farm_equipment'
    : 'farm_machinery';
};

// 1. Get Categories based on Type
router.get('/categories', async (req, res) => {
  try {
    const { type } = req.query;
    const targetTable = getTableName(type);

    const { data, error } = await supabase
      .from(targetTable)
      .select('*');

    if (error) throw error;

    const categories = Array.from(
      new Set(
        (data || [])
          .map((row) => row['Category'] || row.category || row['category_name'])
          .filter(Boolean)
          .map((c) => String(c).trim())
      )
    ).sort();

    // Frontend agriApi.ts expects json.data
    return res.json({ success: true, table: targetTable, data: categories });
  } catch (err) {
    console.error('Error fetching machinery categories:', err.message);
    return res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

// 2. Get Companies based on Type & Category
router.get('/companies', async (req, res) => {
  try {
    const { type, category } = req.query;
    const targetTable = getTableName(type);

    const { data, error } = await supabase
      .from(targetTable)
      .select('*');

    if (error) throw error;

    let filteredRows = data || [];

    // Filter by Category if provided
    if (category) {
      const catClean = String(category).toLowerCase().trim();
      filteredRows = filteredRows.filter((row) => {
        const rowCat = String(row['Category'] || row.category || '').toLowerCase().trim();
        return rowCat === catClean || rowCat.includes(catClean);
      });
    }

    // Extract unique Company Names safely
    const companies = Array.from(
      new Set(
        filteredRows
          .map((row) => row['Company Name'] || row.company_name || row['Company'] || row.company)
          .filter(Boolean)
          .map((c) => String(c).trim())
      )
    ).sort();

    return res.json({ success: true, table: targetTable, data: companies });
  } catch (err) {
    console.error('Error fetching machinery companies:', err.message);
    return res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

// 3. Fetch Matching Machinery / Equipment Products
router.get('/products', async (req, res) => {
  try {
    const { type, category, company } = req.query;
    const targetTable = getTableName(type);

    const { data, error } = await supabase
      .from(targetTable)
      .select('*');

    if (error) throw error;

    let rows = data || [];

    // Filter by Category
    if (category) {
      const cLower = String(category).toLowerCase().trim();
      rows = rows.filter((r) => {
        const val = String(r['Category'] || r.category || '').toLowerCase().trim();
        return val === cLower || val.includes(cLower);
      });
    }

    // Filter by Company
    if (company) {
      const compLower = String(company).toLowerCase().trim();
      rows = rows.filter((r) => {
        const val = String(r['Company Name'] || r.company_name || r['Company'] || r.company || '').toLowerCase().trim();
        return val === compLower || val.includes(compLower);
      });
    }

    // Map into normalized structure for frontend cards
    const products = rows.map((r, idx) => ({
      id: r.id || idx + 1,
      name: r['Product Name'] || r.product_name || 'Standard Model',
      category: r['Category'] || r.category || '',
      company: r['Company Name'] || r.company_name || '',
      power: r['Power'] || r.power || null,
      rpm: r['RPM'] || r.rpm || null,
      description: r['Description'] || r.description || '',
      features: r['Features'] || r.features || '',
      product_link: r['Product Link'] || r.product_link || '',
      product_brochure: r['Product Brochure'] || r.product_brochure || '',
      type: (type || '').toLowerCase().trim() === 'equipment' ? 'Equipment' : 'Machinery'
    }));

    return res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    console.error('Error in getMachineryProducts:', err.message);
    return res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

// 4. POST Match Handlers
const handleMachineryMatch = (req, res, next) => {
  req.body = { ...req.body, category: 'Farm Machinery & Equipment' };
  return (calculateMatchScore || getMatchScore)(req, res, next);
};

router.post('/match', handleMachineryMatch);
router.post('/calculate-match', handleMachineryMatch);
router.post('/', handleMachineryMatch);

export default router;