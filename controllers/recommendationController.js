import { supabase } from '../config/db.js';

const calculateSuitabilityScore = (product, zoneData, targetCrop) => {
  let score = 50;

  const cropLower = (targetCrop || '').toLowerCase();

  const isTargetCropInZone = zoneData?.main_crops?.some(c => 
    c.toLowerCase().includes(cropLower)
  );

  const isProductForCrop = product?.target_crops?.some(c => 
    c.toLowerCase().includes(cropLower) || c.toLowerCase().includes('all crops')
  );

  if (isTargetCropInZone && isProductForCrop) {
    score += 30;
  } else if (isProductForCrop) {
    score += 15;
  }

  if (zoneData?.soil_ph && zoneData.soil_ph >= 6.0 && zoneData.soil_ph <= 8.0) {
    score += 10;
  }

  if (product?.technology_type) {
    score += 10;
  }

  return Math.min(score, 100);
};

export const getRecommendations = async (req, res) => {
  try {
    const { latitude, longitude, crop } = req.body;

    if (!latitude || !longitude || !crop) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required parameters: latitude, longitude, and crop are required.' 
      });
    }

    const { data: zoneData, error: zoneError } = await supabase
      .rpc('get_agroclimatic_zone', { lat: parseFloat(latitude), lng: parseFloat(longitude) });

    if (zoneError || !zoneData || zoneData.length === 0) {
      return res.status(404).json({ success: false, error: 'No agroclimatic zone found for the given coordinates.' });
    }

    const currentZone = zoneData[0];

    const { data: products, error: productError } = await supabase
      .from('vendor_products')
      .select('*');

    if (productError) {
      return res.status(500).json({ success: false, error: productError.message });
    }

    const scoredProducts = (products || [])
      .map(product => {
        const matchScore = calculateSuitabilityScore(product, currentZone, crop);
        return {
          ...product,
          suitability_score: `${matchScore}%`,
          score_numeric: matchScore
        };
      })
      .sort((a, b) => b.score_numeric - a.score_numeric)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      agroclimatic_profile: currentZone,
      recommended_products: scoredProducts
    });

  } catch (err) {
    console.error('❌ Error in recommendation engine:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getVendorRecommendations = getRecommendations;