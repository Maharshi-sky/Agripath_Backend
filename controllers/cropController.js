import { supabase } from '../config/db.js';

// 1. Get Unique Crop Groups (e.g. OILSEEDS, PULSES, MILLETS)
export const getCropGroups = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('govt_crop_data')
      .select('"Crop Group"')
      .not('"Crop Group"', 'is', null);

    if (error) throw error;

    const uniqueGroups = [...new Set(data.map((item) => item['Crop Group']))]
      .filter((g) => g && g !== '-' && g.trim() !== '')
      .sort();

    return res.status(200).json(uniqueGroups);
  } catch (err) {
    console.error('❌ Error fetching crop groups:', err.message);
    if (next) return next(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Get Crop Names by Group (e.g. GREEN GRAM, SESAME)
export const getCropsByGroup = async (req, res, next) => {
  try {
    const { group } = req.query;
    if (!group) {
      return res.status(400).json({ success: false, message: 'Query param "group" is required' });
    }

    const { data, error } = await supabase
      .from('govt_crop_data')
      .select('"Crop Name (English)"')
      .eq('"Crop Group"', group.trim());

    if (error) throw error;

    const uniqueCrops = [...new Set(data.map((item) => item['Crop Name (English)']))]
      .filter((c) => c && c !== '-' && c.trim() !== '')
      .sort();

    return res.status(200).json(uniqueCrops);
  } catch (err) {
    console.error('❌ Error fetching crops by group:', err.message);
    if (next) return next(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 3. Get Varieties by Crop Name
export const getVarietiesByCrop = async (req, res, next) => {
  try {
    const { crop } = req.query;
    if (!crop) {
      return res.status(400).json({ success: false, message: 'Query param "crop" is required' });
    }

    const { data, error } = await supabase
      .from('govt_crop_data')
      .select('"Variety Name"')
      .eq('"Crop Name (English)"', crop.trim());

    if (error) throw error;

    const uniqueVarieties = [...new Set(data.map((item) => item['Variety Name']))]
      .filter((v) => v && v !== '-' && v.trim() !== '')
      .sort();

    return res.status(200).json(uniqueVarieties);
  } catch (err) {
    console.error('❌ Error fetching varieties by crop:', err.message);
    if (next) return next(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Get Full Variety Record for Auto-Populate
export const getVarietyDetails = async (req, res, next) => {
  try {
    const { variety, crop } = req.query;
    if (!variety) {
      return res.status(400).json({ success: false, message: 'Query param "variety" is required' });
    }

    let query = supabase
      .from('govt_crop_data')
      .select('*')
      .eq('"Variety Name"', variety.trim());

    if (crop) {
      query = query.eq('"Crop Name (English)"', crop.trim());
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, message: 'Variety not found' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('❌ Error fetching variety details:', err.message);
    if (next) return next(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 5. Get Seeds (Compatibility export)
export const getSeeds = async (req, res, next) => {
  try {
    const { crop, state, variety } = req.query;
    let query = supabase.from('govt_crop_data').select('*');

    if (crop) query = query.ilike('"Crop Name (English)"', `%${crop}%`);
    if (state) query = query.ilike('"Recommended States"', `%${state}%`);
    if (variety) query = query.ilike('"Variety Name"', `%${variety}%`);

    const { data, error } = await query.limit(50);
    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    console.error('❌ Error in getSeeds:', err.message);
    if (next) return next(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};