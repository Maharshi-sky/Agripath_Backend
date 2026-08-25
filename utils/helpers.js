// Extract numerical ranges [min, max] from text
export function extractNumericRange(text) {
  if (!text || text === "NA") return null;
  const nums = text.toString().match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return null;
  if (nums.length === 1) return [parseFloat(nums[0]), parseFloat(nums[0])];
  return [parseFloat(nums[0]), parseFloat(nums[1])];
}

// Batching Helper with slight delay to avoid rate limiting
export async function mapInBatches(array, batchSize, iteratorFn) {
  const results = [];
  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((item, index) => iteratorFn(item, i + index)));
    results.push(...batchResults);
    
    // 300ms pause between batches to respect external API rate limits
    if (i + batchSize < array.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  return results;
}