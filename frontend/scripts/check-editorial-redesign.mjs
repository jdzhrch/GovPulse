import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = resolve(scriptDir, '..')

const read = (relativePath) => readFileSync(resolve(frontendDir, relativePath), 'utf8')

const indexHtml = read('index.html')
assert.match(indexHtml, /Newsreader/)
assert.match(indexHtml, /IBM(?:\+| )Plex(?:\+| )Sans/)

const indexCss = read('src/index.css')
assert.match(indexCss, /\.app-shell/)
assert.match(indexCss, /\.masthead-shell/)
assert.match(indexCss, /\.briefing-title/)
assert.match(indexCss, /\.section-kicker/)
assert.match(indexCss, /\.editorial-panel/)

const layout = read('src/components/Layout.tsx')
assert.match(layout, /masthead-shell/)

const dashboard = read('src/pages/Dashboard.tsx')
assert.match(dashboard, /hero-summary-grid/)

const missionLauncher = read('src/pages/MissionLauncher.tsx')
assert.match(missionLauncher, /scan-workbench/)

const gapAnalysis = read('src/pages/GapAnalysis.tsx')
assert.match(gapAnalysis, /report-hero/)

const shareCard = read('src/components/ShareCard.tsx')
assert.match(shareCard, /Newsreader/)
assert.match(shareCard, /#f4efe6/)

console.log('Editorial redesign markers are present.')
