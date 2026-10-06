// controllers/match/seedMatchEngine.js
import { queryAI } from '../../utils/aiService.js';

export const evaluateSeedMatch = async ({ technology, country, techRequirements, zonesList }) => {
  const totalZones = zonesList.length;

  const systemInstruction = `You are an expert Agronomist and Soil Scientist specializing in seed crop adaptation.
CRITICAL MANDATE:
- Target country "${country}" has EXACTLY ${totalZones} agro-climatic zones.
- You MUST evaluate EVERY SINGLE ZONE from zone_index: 1 to zone_index: ${totalZones}.
- NEVER stop or truncate after Zone 1. Return all ${totalZones} items in the "zones" array.
- You MUST use ONLY the exact compatibility status labels defined in the dictionary below. Do not invent custom labels.
- Return STRICT VALID JSON ONLY.

[STRICT COMPATIBILITY DICTIONARY]
1. Annual Rainfall ("rain_compatibility"):
   - "Very Low" (Very low compared to requirement range)
   - "Low" (Lower than requirement range)
   - "Optimal" (Fits in requirement range)
   - "High" (Higher than requirement range)
   - "Very High" (Very high compared to requirement range)

2. Soil pH Range ("ph_compatibility"):
   - "Extreme Acidic" (pH < 5.0)
   - "Acidic Stress" (pH 5.0 - 6.8)
   - "Optimal" (pH 6.8 - 7.3)
   - "Alkaline Stress" (pH 7.3 - 9.0)
   - "Extreme Alkaline" (pH > 9.0)

3. Temperature Profile ("temp_compatibility"):
   - "Heat Stress" (Higher than requirement range)
   - "Optimal" (Fits in requirement range)
   - "Cold Stress" (Lower than requirement range)

4. Soil Type ("soil_compatibility"):
   - "Sub Optimal" (High clay content or high sand content mismatch)
   - "Optimal" (Matches zone WRB requirement or within 5% variation)

5. Soil Particle Ratio ("particle_compatibility"):
   - "Optimal" (Fits target WRB requirement / within ±5% tolerance)
   - "Clay Excess" (High clay percentage)
   - "Clay Deficit" (Low clay percentage)
   - "High Sand" (High sand percentage)
   - "Low Sand" (Low sand percentage)
   - "Silt Excess" (High silt percentage)
   - "Silt Deficit" (Low silt percentage)`;

  const prompt = `Evaluate seed variety "${technology}" across ALL ${totalZones} zones of "${country}".

[VARIETY OPTIMAL BASELINE REQUIREMENTS]
- Crop/Variety: "${technology}"
- Temperature Profile: ${techRequirements.temperatureStr || '18°C – 35°C'}
- Annual Rainfall: ${techRequirements.rainfallStr || '800–1200 mm'}
- Soil pH Range: ${techRequirements.phStr || '6.0–7.5'}
- Soil Type (WRB): ${techRequirements.soilRequirement || 'Loam / Clay Loam'}
- Soil Particle Ratio: ${techRequirements.particleRatioStr || 'Sand: 35% | Silt: 35% | Clay: 30%'}

[TARGET ZONES TO EVALUATE (${totalZones} TOTAL)]
${zonesList
  .map(
    (z, i) => `Zone ${i + 1} (${z.name}):
- Baseline Temperature: ${z.temperature}
- Annual Rainfall: ${z.rainfall}
- Soil pH: ${z.soil_ph}
- Soil Type: ${z.soil_type}
- Particle Ratio: ${z.particle_str}`
  )
  .join('\n\n')}

MANDATORY RULES:
1. "zones" array MUST contain EXACTLY ${totalZones} objects (indices 1 through ${totalZones}).
2. Use ONLY the exact strings specified in the dictionary ("Very Low", "Low", "Optimal", "High", "Very High", "Extreme Acidic", "Acidic Stress", "Alkaline Stress", "Extreme Alkaline", "Heat Stress", "Cold Stress", "Sub Optimal", "Clay Excess", "Clay Deficit", "High Sand", "Low Sand", "Silt Excess", "Silt Deficit").
3. Include realistic score (15 to 100), concise scientific summary, and 2-3 specific mitigations per zone.

Return STRICT JSON matching this schema:
{
  "overall_country_compatibility": 72,
  "zones": [
    ${zonesList
      .map(
        (z, i) => `{
      "zone_index": ${i + 1},
      "zone_name": "${z.name}",
      "score": 75,
      "summary": "1-2 sentence agronomic explanation for ${z.name}.",
      "rain_compatibility": "Optimal",
      "ph_compatibility": "Optimal",
      "temp_compatibility": "Optimal",
      "soil_compatibility": "Optimal",
      "particle_compatibility": "Optimal",
      "mitigations": [
        "Primary agronomic mitigation for ${z.name}",
        "Secondary field protocol"
      ]
    }`
      )
      .join(',\n    ')}
  ]
}`;

  return await queryAI(prompt, systemInstruction);
};