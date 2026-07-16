import { describe, expect, it } from 'vitest'
import { parseVersion, resolveDeployVersion } from './resolve-deploy-version.mjs'

describe('deployment version resolution', () => {
  it('bumps the patch of the latest released version', () => {
    expect(resolveDeployVersion({
      requestedVersion: '',
      taggedVersions: ['0.1.1', '0.2.3', '0.2.2'],
      fallbackVersion: '0.1.0',
    })).toBe('0.2.4')
  })

  it('uses the checked-in version when it is newer than every tag', () => {
    expect(resolveDeployVersion({
      requestedVersion: '',
      taggedVersions: ['0.9.8'],
      fallbackVersion: '1.0.0',
    })).toBe('1.0.1')
  })

  it('accepts a newer manually requested version', () => {
    expect(resolveDeployVersion({
      requestedVersion: '2.0.0',
      taggedVersions: ['1.4.9'],
      fallbackVersion: '0.1.0',
    })).toBe('2.0.0')
  })

  it('rejects malformed and non-increasing manual versions', () => {
    expect(() => parseVersion('v1.2.3')).toThrow('Use X.Y.Z')
    expect(() => resolveDeployVersion({
      requestedVersion: '1.4.9',
      taggedVersions: ['1.4.9'],
      fallbackVersion: '0.1.0',
    })).toThrow('must be newer')
  })
})
