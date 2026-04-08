import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..', '..')

const REQUIRED_VARS = [
  'VITE_GITHUB_TOKEN',
  'VITE_GITHUB_REPO_OWNER',
  'VITE_GITHUB_REPO_NAME',
]

function getStepBlock(filePath, stepName) {
  const source = fs.readFileSync(filePath, 'utf8')
  const escapedStepName = stepName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matcher = new RegExp(
    `^\\s*- name: ${escapedStepName}\\n([\\s\\S]*?)(?=^\\s*- name: |^\\w[\\w-]*:|\\Z)`,
    'm'
  )
  const match = source.match(matcher)

  if (!match) {
    throw new Error(`Step "${stepName}" not found in ${path.relative(repoRoot, filePath)}`)
  }

  return match[0]
}

function assertBuildEnv(filePath, stepName) {
  const stepBlock = getStepBlock(filePath, stepName)
  const missingVars = REQUIRED_VARS.filter(
    (name) => !stepBlock.includes(`${name}: \${{ secrets.${name} }}`)
  )

  if (!stepBlock.includes('\n        env:\n')) {
    throw new Error(`${path.relative(repoRoot, filePath)} is missing an env block on "${stepName}"`)
  }

  if (missingVars.length > 0) {
    throw new Error(
      `${path.relative(repoRoot, filePath)} is missing ${missingVars.join(', ')} on "${stepName}"`
    )
  }
}

assertBuildEnv(path.join(repoRoot, '.github/workflows/deploy.yml'), 'Build')
assertBuildEnv(path.join(repoRoot, '.github/workflows/scout_worker.yml'), 'Build frontend')

console.log('GitHub frontend build workflows include the required VITE_GITHUB_* env vars.')
