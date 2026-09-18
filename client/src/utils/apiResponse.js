/**
 * Normalizes a list-endpoint response into a plain array, whether the
 * API responded with a bare array, `{ data: [...] }`, or
 * `{ result: [...] }`. Every lookup hook in this app had its own copy of
 * this same check — centralized so there's one place to update if a new
 * response shape ever shows up.
 */
export const unwrapList = (res) => {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res?.result)) return res.result
  return []
}

/** Same as unwrapList, but for one entry of a Promise.allSettled() batch
 * — a rejected promise resolves to [] instead of throwing, so one failed
 * lookup call never blocks the rest of the batch from being read. */
export const unwrapSettled = (settledResult) =>
  settledResult.status === 'fulfilled' ? unwrapList(settledResult.value) : []
