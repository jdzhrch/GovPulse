import assert from 'node:assert/strict'

const origin = process.env.DEV_SERVER_ORIGIN || 'http://localhost:3000'
const baseUrl = `${origin}/GovPulse/data/history`

const fetchJson = async (path) => {
  const response = await fetch(`${baseUrl}/${path}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  const text = await response.text()
  assert.equal(response.status, 200, `Expected 200 for ${path}, got ${response.status}`)
  assert.match(
    response.headers.get('content-type') || '',
    /application\/json/,
    `Expected JSON content-type for ${path}, got ${response.headers.get('content-type')}`
  )

  return JSON.parse(text)
}

const manifest = await fetchJson('manifest.json?t=dev-check')
assert.ok(Array.isArray(manifest.files), 'manifest.files should be an array')
assert.ok(manifest.files.length > 0, 'manifest should list history files')

const firstHistoryFile = manifest.files[0]
const historyFile = await fetchJson(`${firstHistoryFile}?t=dev-check`)
assert.ok(historyFile, `Expected JSON payload for ${firstHistoryFile}`)

console.log('Dev history endpoint serves JSON correctly with query params.')
