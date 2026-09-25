import { describe, it, expect } from 'vitest'
import { isValidCssVariableValue } from '../embedThemeParser'

// Hostile-input regression coverage for the CSS-variable safety helper.
// The parser-level helpers already reject obvious injection shapes;
// these tests pin down the additional cases that would otherwise slip through.

describe('isValidCssVariableValue — hostile input regression', () => {
  it('rejects CSS octal and hex escape sequences', () => {
    expect(isValidCssVariableValue('\\000061lert(1)')).toBe(false)
    expect(isValidCssVariableValue('\\75 rl(evil)')).toBe(false)
    expect(isValidCssVariableValue('\\72 ed;background:url(//evil)')).toBe(false)
  })

  it('rejects HTML tag injection, not just script and style', () => {
    expect(isValidCssVariableValue("'><img src=x onerror=alert(1)>")).toBe(false)
    expect(isValidCssVariableValue('<iframe src=//evil>')).toBe(false)
    expect(isValidCssVariableValue('<svg onload=alert(1)>')).toBe(false)
    expect(isValidCssVariableValue('<a href=x>click</a>')).toBe(false)
  })
})
