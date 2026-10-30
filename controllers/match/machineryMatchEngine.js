// controllers/match/machineryMatchEngine.js
import { queryAI } from '../../utils/aiService.js';

export const evaluateMachineryMatch = async ({ technology, country, techRequirements, zonesList }) => {
  const totalZones = zonesList.length;

  const systemInstruction = `You are an Agricultural Mechanization Engineer and Field Feasibility Specialist.
Evaluate tractor drawbar draft resistance, soil texture compaction, terrain slope, and field capacity.
CRITICAL: You MUST evaluate EVERY SINGLE ZONE from index 1 to ${totalZones}. Output STRICT VALID JSON ONLY.`;

  const prompt = `Evaluate machinery/implement "${technology}" across ALL ${totalZones} zones of "${country}".

[EQUIPMENT CONTEXT]
- Model / Technology: "${technology}"
- Preferred Soil Texture: ${techRequirements.soilRequirement || 'Medium Loam'}

[ZONES (${totalZones} TOTAL)]
${zonesList.map((z, i) => `Zone ${i + 1} (${z.name}): Soil: ${z.soil_type} | Rain: ${z.rainfall} | Particle: ${z.particle_str}`).join('\n')}

Return STRICT JSON only with EXACTLY ${totalZones} items in "zones" array:
{
  "overall_country_compatibility": 75,
  "zones": [
    ${zonesList.map((z, i) => `{
      "zone_index": ${i + 1},
      "zone_name": "${z.name}",
      "score": 72,
      "summary": "Traction efficiency and soil shear resistance in ${z.name}.",
      "rain_compatibility": "OPTIMAL",
      "ph_compatibility": "OPTIMAL",
      "temp_compatibility": "OPTIMAL",
      "soil_compatibility": "OPTIMAL",
      "particle_compatibility": "OPTIMAL",
      "mitigations": [
        "Adjust tire inflation pressure / equip radial tires to prevent heavy compaction",
        "Operate during friable soil moisture window to prevent wheel slippage"
      ]
    }`).join(',\n    ')}
  ]
}`;

  return await queryAI(prompt, systemInstruction);
};