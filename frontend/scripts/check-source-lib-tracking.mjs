import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const libDir = path.join(repoRoot, 'frontend', 'src', 'lib')

const trackedSourceFiles = fs.readdirSync(libDir)
  .filter((fileName) => fileName.endsWith('.ts') || fileName.endsWith('.tsx'))
  .map((fileName) => path.join('frontend', 'src', 'lib', fileName))

if (trackedSourceFiles.length === 0) {
  throw new Error('Expected frontend/src/lib to contain source files')
}

const ignoredFiles = trackedSourceFiles.filter((filePath) => {
  try {
    execFileSync('git', ['check-ignore', filePath], {
      cwd: repoRoot,
      stdio: 'ignore',
    })
    return true
  } catch (error) {
    return false
  }
})

if (ignoredFiles.length > 0) {
  throw new Error(`frontend source helpers are ignored by git: ${ignoredFiles.join(', ')}`)
}

console.log(`frontend/src/lib source files are tracked by git: ${trackedSourceFiles.join(', ')}`)
