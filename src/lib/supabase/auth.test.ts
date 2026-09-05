import { describe, expect, it } from 'vitest'
import { describeAuthError, isCompleteCode, looksLikeEmail, normaliseCode } from './auth'

describe('describeAuthError', () => {
  it('tells someone waiting on a code what to do next', () => {
    expect(describeAuthError({ message: 'Token has expired or is invalid' })).toBe(
      'That code is wrong or has expired. Ask for a new one.',
    )
  })

  it('names the wait when the server is rate limiting', () => {
    expect(describeAuthError({ message: 'Email rate limit exceeded' })).toMatch(/wait a minute/i)
    expect(describeAuthError({ message: 'something else', status: 429 })).toMatch(/wait a minute/i)
  })

  it('says a provider is off rather than blaming the person', () => {
    expect(describeAuthError({ message: 'Unsupported provider: provider is not enabled' })).toMatch(
      /not switched on/i,
    )
  })

  it('reassures about local data when the network is down', () => {
    expect(describeAuthError({ message: 'Failed to fetch' })).toMatch(/safe on this device/i)
  })

  it('never leaks raw API text for an unrecognised error', () => {
    const message = describeAuthError({ message: 'PGRST301: JWSError JWSInvalidSignature' })
    expect(message).toBe('That did not work. Try again in a moment.')
    expect(message).not.toMatch(/PGRST|JWS/)
  })
})

describe('looksLikeEmail', () => {
  it('accepts ordinary addresses, including tags and subdomains', () => {
    for (const value of ['a@b.co', 'anna.roth+trip@mail.example.com', ' padded@example.org ']) {
      expect(looksLikeEmail(value)).toBe(true)
    }
  })

  it('rejects what cannot be an address at all', () => {
    for (const value of ['', 'anna', 'anna@', '@example.com', 'anna@example', 'a b@example.com']) {
      expect(looksLikeEmail(value)).toBe(false)
    }
  })
})

describe('normaliseCode', () => {
  it('forgives the spacing mail apps add', () => {
    expect(normaliseCode('123 456')).toBe('123456')
    expect(normaliseCode('123-456')).toBe('123456')
  })

  it('stops at six digits so a stray paste cannot overrun the field', () => {
    expect(normaliseCode('12345678')).toBe('123456')
  })
})

describe('isCompleteCode', () => {
  it('is true only for six digits', () => {
    expect(isCompleteCode('123 456')).toBe(true)
    expect(isCompleteCode('12345')).toBe(false)
    expect(isCompleteCode('12345a')).toBe(false)
    expect(isCompleteCode('')).toBe(false)
  })
})
