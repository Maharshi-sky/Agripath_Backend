import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function testZoneLookup() {
  // Test point coordinates (Lat, Lng)
  const latitude = 9.145;
  const longitude = 40.4896;

  const { data, error } = await supabase.rpc('get_agroclimatic_zone', {
    lat: latitude,
    lng: longitude
  });

  if (error) {
    console.error('❌ RPC Error:', error.message);
  } else {
    console.log('🌍 Agroclimatic Zone Match Result:', data);
  }
}

testZoneLookup();