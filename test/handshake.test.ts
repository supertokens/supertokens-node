/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
import assert from 'assert'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import { afterAll, beforeEach, describe, it } from 'vitest'
import Session from 'supertokens-node/recipe/session'
import { PROCESS_STATE, ProcessState } from 'supertokens-node/processState'
import ST from 'supertokens-node'
import { cleanST, killAllST, printPath, setupST, startST } from './utils'

describe(`Handshake: ${printPath('[test/handshake.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  // test that once the info is loaded, it doesn't query again
  it('test that once the info is loaded, it doesn\'t querry again', async () => {
    await startST()
    ST.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie' })],
    })

    const sessionRecipeInstance = SessionRecipe.getInstanceOrThrowError()
    await sessionRecipeInstance.recipeInterfaceImpl.getHandshakeInfo()
    let verifyState = await ProcessState.getInstance().waitForEvent(
      PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO,
      2000,
    )
    assert(verifyState !== undefined)

    ProcessState.getInstance().reset()

    await sessionRecipeInstance.recipeInterfaceImpl.getHandshakeInfo()
    verifyState = await ProcessState.getInstance().waitForEvent(
      PROCESS_STATE.CALLING_SERVICE_IN_GET_HANDSHAKE_INFO,
      2000,
    )
    assert(verifyState === undefined)
  })

  it('core not available', async () => {
    ST.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie' })],
    })
    try {
      await Session.revokeSession('')
      throw new Error('should not have come here')
    }
    catch (err) {
      if (err.message !== 'No SuperTokens core available to query')
        throw err
    }
  })

  it('successful handshake and update JWT without keyList', async () => {
    await startST()
    ST.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie' })],
    })
    const info = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo()
    assert(Array.isArray(info.getJwtSigningPublicKeyList()))
    assert.equal(info.getJwtSigningPublicKeyList().length, 1)
    assert.strictEqual(info.antiCsrf, 'NONE')
    assert.equal(info.accessTokenBlacklistingEnabled, false)
    assert.equal(info.accessTokenValidity, 3600 * 1000)
    assert.equal(info.refreshTokenValidity, 144000 * 60 * 1000)
    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.updateJwtSigningPublicKeyInfo(
      undefined,
      'hello',
      Date.now() + 1000,
    )
    const info2 = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo()
    assert.equal(info2.getJwtSigningPublicKeyList().length, 1)
    assert.equal(info2.getJwtSigningPublicKeyList()[0].publicKey, 'hello')
    assert(info2.getJwtSigningPublicKeyList()[0].expiryTime <= Date.now() + 1000)
    assert(info2.getJwtSigningPublicKeyList()[0].createdAt >= Date.now() - 1000)
  })

  it('successful handshake and update JWT with keyList', async () => {
    await startST()
    ST.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie' })],
    })
    const info = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo()
    assert(Array.isArray(info.getJwtSigningPublicKeyList()))
    assert.equal(info.getJwtSigningPublicKeyList().length, 1)
    assert.strictEqual(info.antiCsrf, 'NONE')
    assert.equal(info.accessTokenBlacklistingEnabled, false)
    assert.equal(info.accessTokenValidity, 3600 * 1000)
    assert.equal(info.refreshTokenValidity, 144000 * 60 * 1000)
    const expiryTime = Date.now() + 1000
    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.updateJwtSigningPublicKeyInfo(
      [{ publicKey: 'hello2', expiryTime }],
      'hello2',
      expiryTime,
    )
    const info2 = await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo()
    assert.deepStrictEqual(info2.getJwtSigningPublicKeyList(), [{ publicKey: 'hello2', expiryTime }])
  })
})
