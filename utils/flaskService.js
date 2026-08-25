import { getCache, setCache } from '../config/cache.js';

const CLIMATE_SERVICE_URL = process.env.FLASK_CLIMATE_URL || 'http://127.0.0.1:5002';
const SOIL_SERVICE_URL = process.env.FLASK_SOIL_URL || 'http://127.0.0.1:5001';

// Global Map to track active in-flight requests
const inFlightRequests = new Map();

export async function fetchFlaskZoneProfile(country, lat, lon) {
  const cacheKey = `merged_${country}_${lat.toFixed(2)}_${lon.toFixed(2)}`;

  // 1️⃣ Check Memory Cache
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // 2️⃣ In-Flight Deduplication
  if (inFlightRequests.has(cacheKey)) {
    console.log(`⚡ [IN-FLIGHT DEDUP] Request already active for ${country} (${lat.toFixed(2)}, ${lon.toFixed(2)}). Reusing connection...`);
    return await inFlightRequests.get(cacheKey);
  }

  // 3️⃣ Promise execution with 120 Seconds timeout
  const requestPromise = (async () => {
    try {
      const [climateRes, soilRes] = await Promise.all([
        fetch(`${CLIMATE_SERVICE_URL}/api/climate?country=${encodeURIComponent(country)}&lat=${lat}&lon=${lon}`, {
          signal: AbortSignal.timeout(120000)
        }).catch(err => {
          console.warn(`⚠️ Climate Service (5002) timeout/error:`, err.message);
          return null;
        }),
        fetch(`${SOIL_SERVICE_URL}/api/v1/zone-soil-profile?country=${encodeURIComponent(country)}&lat=${lat}&lon=${lon}`, {
          signal: AbortSignal.timeout(120000)
        }).catch(err => {
          console.warn(`⚠️ Soil Service (5001) timeout/error:`, err.message);
          return null;
        })
      ]);

      const climateData = climateRes && climateRes.ok ? await climateRes.json() : null;
      const soilData = soilRes && soilRes.ok ? await soilRes.json() : null;

      let liveSoilPh = null;
      let liveSoilType = null;

      if (soilData) {
        const pData = soilData.soil_profile?.data || soilData.data;

        if (pData) {
          if (pData.ph) {
            const phVal = pData.ph;
            const minPh = (parseFloat(phVal) - 0.3).toFixed(1);
            const maxPh = (parseFloat(phVal) + 0.3).toFixed(1);
            liveSoilPh = `${minPh}–${maxPh}`;
          } else if (soilData.agroclimatic_zone?.soil_ph) {
            liveSoilPh = soilData.agroclimatic_zone.soil_ph;
          }

          const texture = pData.texture_class && pData.texture_class !== "N/A" && pData.texture_class !== "NA" ? pData.texture_class : null;
          const wrb = pData.wrb_class && pData.wrb_class !== "N/A" && pData.wrb_class !== "NA" ? pData.wrb_class : null;

          if (texture && wrb) {
            liveSoilType = `${texture} (${wrb})`;
          } else if (texture) {
            liveSoilType = texture;
          } else if (wrb) {
            liveSoilType = wrb;
          }
        }
      }

      const mergedPayload = {
        climate: climateData,
        soil: soilData,
        liveSoilPh: liveSoilPh,
        liveSoilType: liveSoilType
      };

      setCache(cacheKey, mergedPayload);
      return mergedPayload;

    } catch (err) {
      console.warn(`⚠️ Error in Microservices Fetch for ${country} (${lat}, ${lon}):`, err.message);
      return null;
    }
  })();

  inFlightRequests.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}