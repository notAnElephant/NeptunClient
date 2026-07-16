import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

export function parseVersion(value) {
  const match = VERSION_PATTERN.exec(value)
  if (!match) {
    throw new Error(`Invalid version "${value}". Use X.Y.Z, for example 1.4.2.`)
  }

  return match.slice(1).map(Number)
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

export function resolveDeployVersion({ requestedVersion, taggedVersions, fallbackVersion }) {
  const candidates = [fallbackVersion, ...taggedVersions].map((version) => ({
    value: version,
    parts: parseVersion(version),
  }))
  const latest = candidates.reduce((highest, candidate) =>
    compareVersions(candidate.parts, highest.parts) > 0 ? candidate : highest,
  )

  if (requestedVersion) {
    const requested = parseVersion(requestedVersion)
    if (compareVersions(requested, latest.parts) <= 0) {
      throw new Error(`Version ${requestedVersion} must be newer than ${latest.value}.`)
    }
    return requestedVersion
  }

  const [major, minor, patch] = latest.parts
  return `${major}.${minor}.${patch + 1}`
}

function resolveFromRepository(requestedVersion = '', writeVersion = false) {
  const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
  const appConfigUrl = new URL('../app.json', import.meta.url)
  const appConfig = JSON.parse(readFileSync(appConfigUrl, 'utf8'))
  const tags = execFileSync('git', ['tag', '--list', 'v*'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((tag) => tag.slice(1))
    .filter((version) => VERSION_PATTERN.test(version))

  const version = resolveDeployVersion({
    requestedVersion,
    taggedVersions: tags,
    fallbackVersion: appConfig.expo.version,
  })

  if (writeVersion) {
    appConfig.expo.version = version
    writeFileSync(appConfigUrl, `${JSON.stringify(appConfig, null, 2)}\n`)
  }

  return version
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.stdout.write(`${resolveFromRepository(process.argv[2], process.argv.includes('--write'))}\n`)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}
