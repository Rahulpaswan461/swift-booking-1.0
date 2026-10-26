export const CLINIC_LOOKUP_TIMEOUT_MS = 20_000

// A platform visitor does not need clinic data to read the marketing site.
// Keep this decision ahead of any network work, including a sleeping API.
export async function loadClinicInfo({ platformHost, get, signal }) {
  if (platformHost) return { clinic: null, error: null }

  try {
    const response = await get('/clinic/info', {
      signal,
      timeout: CLINIC_LOOKUP_TIMEOUT_MS,
    })
    const clinic = response.data?.data
    if (!clinic?.id) return { clinic: null, error: 'unavailable' }
    return { clinic, error: null }
  } catch (error) {
    if (signal?.aborted || error.code === 'ERR_CANCELED') throw error
    return {
      clinic: null,
      error: error.response?.status === 404 ? 'not_found' : 'unavailable',
    }
  }
}

export function readCachedClinic(storage, platformHost) {
  if (platformHost) return null
  try {
    const clinic = JSON.parse(storage.getItem('clinic_info') || 'null')
    return clinic?.id ? clinic : null
  } catch {
    return null
  }
}
