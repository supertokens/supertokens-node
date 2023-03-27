import assert from 'assert'
import { describe, it } from 'vitest'
import { SuperTokensError } from 'supertokens-node'

describe('SuperTokensError', () => {
  it('should serialize with the proper message', () => {
    const err = new SuperTokensError({ type: SuperTokensError.BAD_INPUT_ERROR, message: 'test message' })

    assert.strictEqual(err.toString(), 'Error: test message')
  })
})
