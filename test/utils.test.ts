import assert from 'assert'
import { getFromObjectCaseInsensitive } from 'supertokens-node/utils'
import { describe, it } from 'vitest'

describe('SuperTokens utils test', () => {
  it('Test getFromObjectCaseInsensitive', () => {
    const testObj = {
      AuthOriZation: 'test',
    }

    assert.equal(getFromObjectCaseInsensitive('test', testObj), undefined)
    // Exact
    assert.equal(getFromObjectCaseInsensitive('AuthOriZation', testObj), 'test')
    // All lower case
    assert.equal(getFromObjectCaseInsensitive('authorization', testObj), 'test')
    // Traditional case
    assert.equal(getFromObjectCaseInsensitive('Authorization', testObj), 'test')
    // Weird casing
    assert.equal(getFromObjectCaseInsensitive('authoriZation', testObj), 'test')
  })
})
