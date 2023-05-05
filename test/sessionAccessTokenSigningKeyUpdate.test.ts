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

import assert, { fail } from 'assert'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { Querier } from 'supertokens-node/querier'
import { PROCESS_STATE, ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import * as SessionFunctions from 'supertokens-node/recipe/session/sessionFunctions'
import { parseJWTWithoutSignatureVerification } from 'supertokens-node/recipe/session/jwt'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import { maxVersion } from 'supertokens-node/utils'
import {
  cleanST,
  killAllST,
  killAllSTCoresOnly,
  printPath,
  setKeyValueInConfig,
  setupST,
  startST,
} from './utils'

/* TODO:
- the opposite of the above (check that if signing key changes, things are still fine) condition
- calling createNewSession twice, should overwrite the first call (in terms of cookies)
- calling createNewSession in the case of unauthorised error, should create a proper session
- revoking old session after create new session, should not remove new session's cookies.
- check that Access-Control-Expose-Headers header is being set properly during create, use and destroy session**** only for express
*/

describe(`sessionAccessTokenSigningKeyUpdate: ${printPath(
    '[test/sessionAccessTokenSigningKeyUpdate.test.ts]',
)}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('check that if signing key changes, things are still fine', async () => {
    await setKeyValueInConfig('access_token_signing_key_update_interval', '0.001') // 5 seconds is the update interval
    await startST()
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const currCDIVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion()
    const coreSupportsMultipleSignigKeys = maxVersion(currCDIVersion, '2.8') !== '2.8'

    const response = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    {
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(response.accessToken.token),
        response.antiCsrfToken,
        true,
        true,
      )

      const verifyState = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState === undefined)
    }

    await new Promise(r => setTimeout(r, 6000))

    try {
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(response.accessToken.token),
        response.antiCsrfToken,
        true,
        true,
      )
      // Old core versions should throw here because the signing key was updated
      if (!coreSupportsMultipleSignigKeys)
        fail()
    }
    catch (err) {
      if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
        throw err
      }
      else if (coreSupportsMultipleSignigKeys) {
        // Cores supporting multiple signig shouldn't throw since the signing key is still valid
        fail()
      }
    }

    const verifyState = await ProcessState.getInstance().waitForEvent(
      PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
      1500,
    )
    assert(verifyState === undefined)

    ProcessState.getInstance().reset()

    const response2 = await SessionFunctions.refreshSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      response.refreshToken.token,
      response.antiCsrfToken,
      true,
      'cookie',
      'cookie',
    )

    await SessionFunctions.getSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      parseJWTWithoutSignatureVerification(response2.accessToken.token),
      response2.antiCsrfToken,
      true,
      true,
    )

    // We call verify, since refresh does not refresh the signing key info
    const verifyState2 = await ProcessState.getInstance().waitForEvent(
      PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
      1500,
    )
    assert(verifyState2 !== undefined)
  })

  it('check that if signing key changes, after new key is fetched - via token query, old tokens don\'t query the core', async () => {
    await setKeyValueInConfig('access_token_signing_key_update_interval', '0.001') // 5 seconds is the update interval
    await startST()
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const currCDIVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion()
    const coreSupportsMultipleSignigKeys = maxVersion(currCDIVersion, '2.8') !== '2.8'

    const oldSession = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    await new Promise(r => setTimeout(r, 6000))
    const originalHandShakeInfo = (
      await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo()
    ).clone()

    const newSession = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.setHandshakeInfo(originalHandShakeInfo)

    {
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(newSession.accessToken.token),
        newSession.antiCsrfToken,
        true,
        true,
      )

      const verifyState = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )

      if (!coreSupportsMultipleSignigKeys) {
        assert(verifyState === undefined)
      }
      else {
        // We call verify here, since this is a new session we can't verify locally
        assert(verifyState !== undefined)
      }
    }

    await ProcessState.getInstance().reset()

    {
      try {
        await SessionFunctions.getSession(
          SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
          parseJWTWithoutSignatureVerification(oldSession.accessToken.token),
          oldSession.antiCsrfToken,
          true,
          true,
        )
        // Old core versions should throw here because the signing key was updated
        if (!coreSupportsMultipleSignigKeys)
          fail()
      }
      catch (err) {
        if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
          throw err
        }
        else if (coreSupportsMultipleSignigKeys) {
          // Cores supporting multiple signig shouldn't throw since the signing key is still valid
          fail()
        }
      }

      const verifyState = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState === undefined)
    }
  })

  it('check that if signing key changes, after new key is fetched - via creation of new token, old tokens don\'t query the core', async () => {
    await setKeyValueInConfig('access_token_signing_key_update_interval', '0.001') // 5 seconds is the update interval
    await startST()
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const currCDIVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion()
    const coreSupportsMultipleSignigKeys = maxVersion(currCDIVersion, '2.8') !== '2.8'

    const response2 = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    await new Promise(r => setTimeout(r, 6000))

    const response = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    {
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(response.accessToken.token),
        response.antiCsrfToken,
        true,
        true,
      )

      const verifyState = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState === undefined)
    }

    await ProcessState.getInstance().reset()

    {
      try {
        await SessionFunctions.getSession(
          SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
          parseJWTWithoutSignatureVerification(response2.accessToken.token),
          response2.antiCsrfToken,
          true,
          true,
        )
        // Old core versions should throw here because the signing key was updated
        if (!coreSupportsMultipleSignigKeys)
          fail()
      }
      catch (err) {
        if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
          throw err
        }
        else if (coreSupportsMultipleSignigKeys) {
          // Cores supporting multiple signig shouldn't throw since the signing key is still valid
          fail()
        }
      }

      const verifyState = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState === undefined)
    }
  })

  it('check that if signing key changes, after new key is fetched - via verification of old token, old tokens don\'t query the core', async () => {
    await setKeyValueInConfig('access_token_signing_key_update_interval', '0.001') // 5 seconds is the update interval
    await startST()
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const currCDIVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion()
    const coreSupportsMultipleSignigKeys = maxVersion(currCDIVersion, '2.8') !== '2.8'

    const response2 = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    await new Promise(r => setTimeout(r, 6000))

    const originalHandShakeInfo = (
      await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo()
    ).clone()

    const response = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    // we reset the handshake info to before the session creation so it's
    // like the above session was created from another server.
    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.setHandshakeInfo(originalHandShakeInfo)

    {
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(response.accessToken.token),
        response.antiCsrfToken,
        true,
        true,
      )

      const verifyState = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      if (!coreSupportsMultipleSignigKeys)
        assert(verifyState === undefined)

      else
        assert(verifyState !== undefined)
    }

    await ProcessState.getInstance().reset()

    {
      try {
        await SessionFunctions.getSession(
          SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
          parseJWTWithoutSignatureVerification(response2.accessToken.token),
          response2.antiCsrfToken,
          true,
          true,
        )

        // Old core versions should throw here because the signing key was updated
        if (!coreSupportsMultipleSignigKeys)
          fail()
      }
      catch (err) {
        if (err.type !== Session.Error.TRY_REFRESH_TOKEN) {
          throw err
        }
        else if (coreSupportsMultipleSignigKeys) {
          // Cores supporting multiple signig shouldn't throw since the signing key is still valid
          fail()
        }
      }

      const verifyState = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState === undefined)
    }
  })

  it('test reducing access token signing key update interval time', async () => {
    await setKeyValueInConfig('access_token_signing_key_update_interval', '0.0041') // 10 seconds
    await startST()
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const session = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    {
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(session.accessToken.token),
        session.antiCsrfToken,
        true,
        true,
      )

      const verifyState3 = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState3 === undefined)
    }

    // we kill the core
    await killAllSTCoresOnly()
    await setupST()

    // start server again
    await startST()

    {
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(session.accessToken.token),
        session.antiCsrfToken,
        true,
        true,
      )

      const verifyState3 = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState3 === undefined)
    }

    // now we create a new session that will use a new key and we will
    // do it in a way that the jwtSigningKey info is not updated (as if another server has created this new session)
    const originalHandShakeInfo = (
      await SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getHandshakeInfo()
    ).clone()

    const session2 = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    // we reset the handshake info to before the session creation so it's
    // like the above session was created from another server.
    SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.setHandshakeInfo(originalHandShakeInfo)

    // now we will call getSession on session2 and see that the core is called
    {
      // jwt signing key has not expired, according to the SDK, so it should succeed
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(session2.accessToken.token),
        session2.antiCsrfToken,
        true,
        true,
      )

      const verifyState3 = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState3 !== undefined)
    }

    ProcessState.getInstance().reset()

    // we will do the same thing, but this time core should not be called
    {
      // jwt signing key has not expired, according to the SDK, so it should succeed
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(session2.accessToken.token),
        session2.antiCsrfToken,
        true,
        true,
      )

      const verifyState3 = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState3 === undefined)
    }

    {
      // now we will use the original session again and see that core is not called
      try {
        await SessionFunctions.getSession(
          SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
          parseJWTWithoutSignatureVerification(session.accessToken.token),
          session.antiCsrfToken,
          true,
          true,
        )
        fail()
      }
      catch (err) {
        if (err.type !== Session.Error.TRY_REFRESH_TOKEN)
          throw err
      }

      const verifyState3 = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState3 === undefined)
    }
  })

  it('no access token signing key update', async () => {
    await setKeyValueInConfig('access_token_signing_key_update_interval', '0.0011') // 4 seconds
    await setKeyValueInConfig('access_token_signing_key_dynamic', 'false')
    await startST()
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const q = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await q.getAPIVersion()

    // Only run test for >= 2.8 since the fix for this test is in core with CDI >= 2.8
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    const session = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    {
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(session.accessToken.token),
        session.antiCsrfToken,
        true,
        true,
      )

      const verifyState3 = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState3 === undefined)
    }

    await new Promise(r => setTimeout(r, 5000)) // wait for 5 seconds

    // it should not query the core anymore even if the jwtSigningKetUpdate interval has passed

    {
      await SessionFunctions.getSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(session.accessToken.token),
        session.antiCsrfToken,
        true,
        true,
      )

      const verifyState3 = await ProcessState.getInstance().waitForEvent(
        PROCESS_STATE.CALLING_SERVICE_IN_VERIFY,
        1500,
      )
      assert(verifyState3 === undefined)
    }
  })
})
