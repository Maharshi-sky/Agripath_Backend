import { supabase } from '../config/db.js';

// 1. Get Distinct Crop Types (Dropdown 1)
export const getBioCropTypes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('biological_inputs')
      .select('crop_type')
      .not('crop_type', 'is', null);

    if (error) throw error;
    const cropTypes = [...new Set(data.map((item) => item.crop_type))].filter(Boolean).sort();
    return res.json({ success: true, data: cropTypes });
  } catch (err) {
    console.error('❌ Bio crop types fetch error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Get Categories filtered by Crop Type (Dropdown 2)
export const getBioCategories = async (req, res) => {
  try {
    const { crop_type } = req.query;
    let query = supabase
      .from('biological_inputs')
      .select('category')
      .not('category', 'is', null);

    if (crop_type) {
      query = query.eq('crop_type', crop_type);
    }

    const { data, error } = await query;
    if (error) throw error;

    const categories = [...new Set(data.map((item) => item.category))].filter(Boolean).sort();
    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error('❌ Bio categories fetch error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Get Companies filtered by Crop Type + Category (Dropdown 3)
export const getBioCompanies = async (req, res) => {
  try {
    const { crop_type, category } = req.query;
    let query = supabase
      .from('biological_inputs')
      .select('manufacturing_company')
      .not('manufacturing_company', 'is', null);

    if (crop_type) query = query.eq('crop_type', crop_type);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    const companies = [...new Set(data.map((item) => item.manufacturing_company))].filter(Boolean).sort();
    return res.json({ success: true, data: companies });
  } catch (err) {
    console.error('❌ Bio companies fetch error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Get Products filtered by Crop Type + Category + Company (Dropdown 4)
export const getBioProducts = async (req, res) => {
  try {
    const { crop_type, category, company } = req.query;
    let query = supabase.from('biological_inputs').select('*');

    if (crop_type) query = query.eq('crop_type', crop_type);
    if (category) query = query.eq('category', category);
    if (company) query = query.eq('manufacturing_company', company);

    const { data, error } = await query.order('brand_product_name');
    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('❌ Bio products fetch error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};