import { getRecommendations } from '../controllers/recommendationController.js';

// Mock Express Request & Response for direct testing
const req = {
  body: {
    latitude: 23.0225,  // Ahmedabad / IND-WEST coordinates
    longitude: 72.5714,
    crop: 'Cotton'
  }
};

const res = {
  status: (code) => ({
    json: (data) => {
      console.log(`\n==========================================`);
      console.log(`✅ Recommendation API Response (Status: ${code})`);
      console.log(`==========================================\n`);
      
      if (data.error) {
        console.error('❌ Error:', data.error);
        return;
      }

      console.log('📍 Agroclimatic Zone Matched:');
      console.log(`   • Zone: ${data.agroclimatic_profile?.zone_name} (${data.agroclimatic_profile?.zone_id})`);
      console.log(`   • Country: ${data.agroclimatic_profile?.country}`);
      console.log(`   • Soil pH: ${data.agroclimatic_profile?.soil_ph}`);
      console.log(`   • Main Crops: ${data.agroclimatic_profile?.main_crops?.join(', ')}`);

      console.log(`\n🌾 Top Recommended Products (Total: ${data.recommended_products?.length}):`);
      console.log('--------------------------------------------------');
      
      data.recommended_products?.slice(0, 5).forEach((prod, index) => {
        console.log(`${index + 1}. [${prod.suitability_score}] ${prod.product_name} (${prod.company_name})`);
        console.log(`   • Category: ${prod.category} | Tech: ${prod.technology_type}`);
        console.log(`   • Target Crops: ${prod.target_crops?.join(', ')}`);
        console.log(`   • Active Ingredients: ${prod.active_ingredients?.join(', ')}`);
        console.log('--------------------------------------------------');
      });
    }
  })
};

// Run the engine directly
getRecommendations(req, res);