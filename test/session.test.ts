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
import { afterAll, beforeEach, describe, it } from 'vitest'
import { Querier } from 'supertokens-node/querier'
import express from 'express'
import request from 'supertest'
import { PROCESS_STATE, ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import * as SessionFunctions from 'supertokens-node/recipe/session/sessionFunctions'
import { parseJWTWithoutSignatureVerification } from 'supertokens-node/recipe/session/jwt'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import { maxVersion } from 'supertokens-node/utils'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import {
  cleanST,
  extractInfoFromResponse,
  killAllST,
  mockRequest,
  mockResponse,
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

describe(`session: ${printPath('[test/session.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  // check if output headers and set cookies for create session is fine
  it('test that output headers and set cookie for create session is fine', async () => {
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

    const app = express()

    app.use(middleware())

    app.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      res.status(200).send('')
    })

    app.use(errorHandler())

    const res = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert(res.header['access-control-expose-headers'] === 'front-token, anti-csrf')

    const cookies = extractInfoFromResponse(res)
    assert(cookies.accessToken !== undefined)
    assert(cookies.refreshToken !== undefined)
    assert(cookies.antiCsrf !== undefined)
    assert(cookies.accessTokenExpiry !== undefined)
    assert(cookies.refreshTokenExpiry !== undefined)
    assert(cookies.refreshToken !== undefined)
    assert(cookies.accessTokenDomain === undefined)
    assert(cookies.refreshTokenDomain === undefined)
    assert(cookies.frontToken !== undefined)
  })

  // check if output headers and set cookies for refresh session is fine
  it('test that output headers and set cookie for refresh session is fine', async () => {
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

    const app = express()
    app.use(middleware())

    app.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      res.status(200).send('')
    })

    app.use(errorHandler())

    const res = extractInfoFromResponse(
      await new Promise(resolve =>
        request(app)
          .post('/create')
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      ),
    )

    const res2 = await new Promise(resolve =>
      request(app)
        .post('/auth/session/refresh')
        .set('Cookie', [`sRefreshToken=${res.refreshToken}`])
        .set('anti-csrf', res.antiCsrf)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert(res2.header['access-control-expose-headers'] === 'front-token, anti-csrf')

    const cookies = extractInfoFromResponse(res2)
    assert(cookies.accessToken !== undefined)
    assert(cookies.refreshToken !== undefined)
    assert(cookies.antiCsrf !== undefined)
    assert(cookies.accessTokenExpiry !== undefined)
    assert(cookies.refreshTokenExpiry !== undefined)
    assert(cookies.refreshToken !== undefined)
    assert(cookies.accessTokenDomain === undefined)
    assert(cookies.refreshTokenDomain === undefined)
    assert(cookies.frontToken !== undefined)
  })

  // check if input cookies are missing, an appropriate error is thrown
  // Failure condition: if valid cookies are set in the refresh call the test will fail
  it('test that if input cookies are missing, an appropriate error is thrown', async () => {
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

    const app = express()
    app.use(middleware())

    app.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      res.status(200).send('')
    })

    app.use(errorHandler())

    await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const res2 = await new Promise(resolve =>
      request(app)
        .post('/auth/session/refresh')
        .end((err, res) => {
          if (err)
            resolve(undefined)
          else
            resolve(res)
        }),
    )
    assert(res2.status === 401)
    assert(JSON.parse(res2.text).message === 'unauthorised')
  })

  // check if input cookies are there, no error is thrown
  // Failure condition: if cookies are no set in the refresh call the test will fail
  it('test that if input cookies are there, no error is thrown', async () => {
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

    const app = express()
    app.use(middleware())

    app.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      res.status(200).send('')
    })

    const res = extractInfoFromResponse(
      await new Promise(resolve =>
        request(app)
          .post('/create')
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      ),
    )

    const res2 = await new Promise(resolve =>
      request(app)
        .post('/auth/session/refresh')
        .set('Cookie', [`sRefreshToken=${res.refreshToken}`])
        .set('anti-csrf', res.antiCsrf)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert(res2.status === 200)
  })

  // - check for token theft detection
  it('token theft detection', async () => {
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

    const response = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

    const response2 = await SessionFunctions.refreshSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      response.refreshToken.token,
      response.antiCsrfToken,
      true,
      'cookie',
    )

    await SessionFunctions.getSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      parseJWTWithoutSignatureVerification(response2.accessToken.token),
      response2.antiCsrfToken,
      true,
    )

    try {
      await SessionFunctions.refreshSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        response.refreshToken.token,
        response.antiCsrfToken,
        true,
        'cookie',
        'cookie',
      )
      throw new Error('should not have come here')
    }
    catch (err) {
      if (err.type !== Session.Error.TOKEN_THEFT_DETECTED)
        throw err
    }
  })

  it('token theft detection with API key', async () => {
    await setKeyValueInConfig('api_keys', 'shfo3h98308hOIHoei309saiho')
    await startST()
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
        apiKey: 'shfo3h98308hOIHoei309saiho',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const response = await SessionFunctions.createNewSession(
      SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
      '',
      false,
      {},
      {},
    )

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
    )

    try {
      await SessionFunctions.refreshSession(
        SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl.helpers,
        response.refreshToken.token,
        response.antiCsrfToken,
        true,
        'cookie',
        'cookie',
      )
      throw new Error('should not have come here')
    }
    catch (err) {
      if (err.type !== Session.Error.TOKEN_THEFT_DETECTED)
        throw err
    }
  })

  it('query without API key', async () => {
    await setKeyValueInConfig('api_keys', 'shfo3h98308hOIHoei309saiho')
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

    try {
      await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion()
      throw new Error('should not have come here')
    }
    catch (err) {
      if (
        err.message
                !== 'SuperTokens core threw an error for a GET request to path: \'/apiversion\' with status code: 401 and message: Invalid API key\n'
      )
        throw err
    }
  })

  // check basic usage of session
  it('test basic usage of sessions', async () => {
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

    const s = SessionRecipe.getInstanceOrThrowError()

    const response = await SessionFunctions.createNewSession(s.recipeInterfaceImpl.helpers, '', false, {}, {})
    assert(response.session !== undefined)
    assert(response.accessToken !== undefined)
    assert(response.refreshToken !== undefined)
    assert(response.antiCsrfToken !== undefined)
    assert(Object.keys(response).length === 5)

    await SessionFunctions.getSession(
      s.recipeInterfaceImpl.helpers,
      parseJWTWithoutSignatureVerification(response.accessToken.token),
      response.antiCsrfToken,
      true,
      true,
    )
    const verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500)
    assert(verifyState3 === undefined)

    const response2 = await SessionFunctions.refreshSession(
      s.recipeInterfaceImpl.helpers,
      response.refreshToken.token,
      response.antiCsrfToken,
      true,
      'cookie',
      'cookie',
    )
    assert(response2.session !== undefined)
    assert(response2.accessToken !== undefined)
    assert(response2.refreshToken !== undefined)
    assert(response2.antiCsrfToken !== undefined)
    assert(Object.keys(response2).length === 5)

    const response3 = await SessionFunctions.getSession(
      s.recipeInterfaceImpl.helpers,
      parseJWTWithoutSignatureVerification(response2.accessToken.token),
      response2.antiCsrfToken,
      true,
      true,
    )
    const verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY)
    assert(verifyState !== undefined)
    assert(response3.session !== undefined)
    assert(response3.accessToken !== undefined)
    assert(Object.keys(response3).length === 2)

    ProcessState.getInstance().reset()

    const response4 = await SessionFunctions.getSession(
      s.recipeInterfaceImpl.helpers,
      parseJWTWithoutSignatureVerification(response3.accessToken.token),
      response2.antiCsrfToken,
      true,
      true,
    )
    const verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000)
    assert(verifyState2 === undefined)
    assert(response4.session !== undefined)
    assert(response4.accessToken === undefined)
    assert(Object.keys(response4).length === 1)

    const response5 = await SessionFunctions.revokeSession(s.recipeInterfaceImpl.helpers, response4.session.handle)
    assert(response5 === true)
  })

  // check session verify for with / without anti-csrf present
  it('test session verify with anti-csrf present', async () => {
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

    const s = SessionRecipe.getInstanceOrThrowError()

    const response = await SessionFunctions.createNewSession(s.recipeInterfaceImpl.helpers, '', false, {}, {})

    const response2 = await SessionFunctions.getSession(
      s.recipeInterfaceImpl.helpers,
      parseJWTWithoutSignatureVerification(response.accessToken.token),
      response.antiCsrfToken,
      true,
      true,
    )
    assert(response2.session != undefined)
    assert(Object.keys(response2.session).length === 3)

    const response3 = await SessionFunctions.getSession(
      s.recipeInterfaceImpl.helpers,
      parseJWTWithoutSignatureVerification(response.accessToken.token),
      response.antiCsrfToken,
      false,
      true,
    )
    assert(response3.session != undefined)
    assert(Object.keys(response3.session).length === 3)
  })

  // check session verify for with / without anti-csrf present**
  it('test session verify without anti-csrf present', async () => {
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

    const s = SessionRecipe.getInstanceOrThrowError()

    const response = await SessionFunctions.createNewSession(s.recipeInterfaceImpl.helpers, '', false, {}, {})

    // passing anti-csrf token as undefined and anti-csrf check as false
    const response2 = await SessionFunctions.getSession(
      s.recipeInterfaceImpl.helpers,
      parseJWTWithoutSignatureVerification(response.accessToken.token),
      undefined,
      false,
      true,
    )
    assert(response2.session != undefined)
    assert(Object.keys(response2.session).length === 3)

    // passing anti-csrf token as undefined and anti-csrf check as true
    try {
      await SessionFunctions.getSession(
        s.recipeInterfaceImpl.helpers,
        parseJWTWithoutSignatureVerification(response.accessToken.token),
        undefined,
        true,
        true,
      )
      throw new Error('should not have come here')
    }
    catch (err) {
      if (err.type !== Session.Error.TRY_REFRESH_TOKEN)
        throw err
    }
  })

  // check revoking session(s)
  it('test revoking of sessions', async () => {
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

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // create a single session and  revoke using the session handle
    const res = await SessionFunctions.createNewSession(s.helpers, 'someUniqueUserId', false, {}, {})
    const res2 = await SessionFunctions.revokeSession(s.helpers, res.session.handle)
    assert(res2 === true)

    const res3 = await SessionFunctions.getAllSessionHandlesForUser(s.helpers, 'someUniqueUserId')
    assert(res3.length === 0)

    // create multiple sessions with the same userID and use revokeAllSessionsForUser to revoke sessions
    await SessionFunctions.createNewSession(s.helpers, 'someUniqueUserId', false, {}, {})
    await SessionFunctions.createNewSession(s.helpers, 'someUniqueUserId', false, {}, {})

    let sessionIdResponse = await SessionFunctions.getAllSessionHandlesForUser(s.helpers, 'someUniqueUserId')
    assert(sessionIdResponse.length === 2)

    const response = await SessionFunctions.revokeAllSessionsForUser(s.helpers, 'someUniqueUserId')
    assert(response.length === 2)

    sessionIdResponse = await SessionFunctions.getAllSessionHandlesForUser(s.helpers, 'someUniqueUserId')
    assert(sessionIdResponse.length === 0)

    // revoke a session with a session handle that does not exist
    const resp = await SessionFunctions.revokeSession(s.helpers, '')
    assert(resp === false)

    // revoke a session with a userId that does not exist
    const resp2 = await SessionFunctions.revokeAllSessionsForUser(s.helpers, 'random')
    assert(resp2.length === 0)
  })

  // check manipulating session data
  it('test manipulating session data', async () => {
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

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding session data
    const res = await SessionFunctions.createNewSession(s.helpers, '', false, {}, {})
    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, { key: 'value' })

    const res2 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).sessionData
    assert.deepStrictEqual(res2, { key: 'value' })

    // changing the value of session data with the same key
    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, { key: 'value 2' })

    const res3 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).sessionData
    assert.deepStrictEqual(res3, { key: 'value 2' })

    // passing invalid session handle when updating session data
    assert(!(await SessionFunctions.updateSessionData(s.helpers, 'random', { key2: 'value2' })))
  })

  it('test manipulating session data with new get session function', async () => {
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

    // Only run test for >= 2.8
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding session data
    const res = await SessionFunctions.createNewSession(s.helpers, '', false, {}, {})
    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, { key: 'value' })

    const res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res2.sessionData, { key: 'value' })

    // changing the value of session data with the same key
    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, { key: 'value 2' })

    const res3 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res3.sessionData, { key: 'value 2' })

    // passing invalid session handle when updating session data
    assert(!(await SessionFunctions.updateSessionData(s.helpers, 'random', { key2: 'value2' })))
  })

  it('test null and undefined values passed for session data', async () => {
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

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding session data
    const res = await SessionFunctions.createNewSession(s.helpers, '', false, {}, null)

    const res2 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).sessionData
    assert.deepStrictEqual(res2, {})

    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, { key: 'value' })

    const res3 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).sessionData
    assert.deepStrictEqual(res3, { key: 'value' })

    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, undefined)

    const res4 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).sessionData
    assert.deepStrictEqual(res4, {})

    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, { key: 'value 2' })

    const res5 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).sessionData
    assert.deepStrictEqual(res5, { key: 'value 2' })

    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, null)

    const res6 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).sessionData
    assert.deepStrictEqual(res6, {})
  })

  it('test null and undefined values passed for session data with new get session method', async () => {
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

    // Only run test for >= 2.8
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding session data
    const res = await SessionFunctions.createNewSession(s.helpers, '', false, {}, null)

    const res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res2.sessionData, {})

    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, { key: 'value' })

    const res3 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res3.sessionData, { key: 'value' })

    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, undefined)

    const res4 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res4.sessionData, {})

    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, { key: 'value 2' })

    const res5 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res5.sessionData, { key: 'value 2' })

    await SessionFunctions.updateSessionData(s.helpers, res.session.handle, null)

    const res6 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res6.sessionData, {})
  })

  // check manipulating jwt payload
  it('test manipulating jwt payload', async () => {
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

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding jwt payload
    const res = await SessionFunctions.createNewSession(s.helpers, '', false, {}, {})

    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: 'value' })

    const res2 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).accessTokenPayload
    assert.deepStrictEqual(res2, { key: 'value' })

    // changing the value of jwt payload with the same key
    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: 'value 2' })

    const res3 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).accessTokenPayload
    assert.deepStrictEqual(res3, { key: 'value 2' })

    // passing invalid session handle when updating jwt payload
    assert(!(await SessionFunctions.updateAccessTokenPayload(s.helpers, 'random', { key2: 'value2' })))
  })

  it('test manipulating jwt payload with new get session method', async () => {
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

    // Only run test for >= 2.8
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding jwt payload
    const res = await SessionFunctions.createNewSession(s.helpers, '', false, {}, {})

    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: 'value' })

    const res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res2.accessTokenPayload, { key: 'value' })

    // changing the value of jwt payload with the same key
    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: 'value 2' })

    const res3 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res3.accessTokenPayload, { key: 'value 2' })

    // passing invalid session handle when updating jwt payload
    assert(!(await SessionFunctions.updateAccessTokenPayload(s.helpers, 'random', { key2: 'value2' })))
  })

  it('test null and undefined values passed for jwt payload', async () => {
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

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding jwt payload
    const res = await SessionFunctions.createNewSession(s.helpers, '', false, null, {})

    const res2 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).accessTokenPayload
    assert.deepStrictEqual(res2, {})

    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: 'value' })

    const res3 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).accessTokenPayload
    assert.deepStrictEqual(res3, { key: 'value' })

    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle)

    const res4 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, undefined))
      .accessTokenPayload
    assert.deepStrictEqual(res4, {})

    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: 'value 2' })

    const res5 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).accessTokenPayload
    assert.deepStrictEqual(res5, { key: 'value 2' })

    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, null)

    const res6 = (await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)).accessTokenPayload
    assert.deepStrictEqual(res6, {})
  })

  it('test null and undefined values passed for jwt payload with new get session method', async () => {
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

    // Only run test for >= 2.8
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding jwt payload
    const res = await SessionFunctions.createNewSession(s.helpers, '', false, null, {})

    const res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res2.accessTokenPayload, {})

    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: 'value' })

    const res3 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res3.accessTokenPayload, { key: 'value' })

    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle)

    const res4 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle, undefined)
    assert.deepStrictEqual(res4.accessTokenPayload, {})

    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, { key: 'value 2' })

    const res5 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res5.accessTokenPayload, { key: 'value 2' })

    await SessionFunctions.updateAccessTokenPayload(s.helpers, res.session.handle, null)

    const res6 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)
    assert.deepStrictEqual(res6.accessTokenPayload, {})
  })

  // if anti-csrf is disabled from ST core, check that not having that in input to verify session is fine**
  it('test that when anti-csrf is disabled from ST core not having that in input to verify session is fine', async () => {
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
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'NONE' })],
    })

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    const response = await SessionFunctions.createNewSession(s.helpers, '', false, {}, {})

    // passing anti-csrf token as undefined and anti-csrf check as false
    const response2 = await SessionFunctions.getSession(
      s,
      parseJWTWithoutSignatureVerification(response.accessToken.token),
      undefined,
      false,
      true,
    )
    assert(response2.session != undefined)
    assert(Object.keys(response2.session).length === 3)

    // passing anti-csrf token as undefined and anti-csrf check as true
    const response3 = await SessionFunctions.getSession(
      s,
      parseJWTWithoutSignatureVerification(response.accessToken.token),
      undefined,
      true,
      true,
    )
    assert(response3.session != undefined)
    assert(Object.keys(response3.session).length === 3)
  })

  it('test that anti-csrf disabled and sameSite none does not throw an error', async () => {
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
      recipeList: [
        Session.init({ getTokenTransferMethod: () => 'cookie', cookieSameSite: 'none', antiCsrf: 'NONE' }),
      ],
    })
  })

  it('test that anti-csrf disabled and sameSite lax does now throw an error', async () => {
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
      recipeList: [
        Session.init({ getTokenTransferMethod: () => 'cookie', cookieSameSite: 'lax', antiCsrf: 'NONE' }),
      ],
    })

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    await SessionFunctions.createNewSession(s.helpers, '', false, {}, {})
  })

  it('test that anti-csrf disabled and sameSite strict does now throw an error', async () => {
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
      recipeList: [
        Session.init({ getTokenTransferMethod: () => 'cookie', cookieSameSite: 'strict', antiCsrf: 'NONE' }),
      ],
    })

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    await SessionFunctions.createNewSession(s.helpers, '', false, {}, {})
  })

  it('test that custom user id is returned correctly', async () => {
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

    // Only run test for >= 2.8
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding session data
    const res = await SessionFunctions.createNewSession(s.helpers, 'customuserid', false, {}, null)

    const res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)

    assert.strictEqual(res2.userId, 'customuserid')
  })

  it('test that get session by session handle payload is correct', async () => {
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

    // Only run test for >= 2.8
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding session data
    const res = await SessionFunctions.createNewSession(s.helpers, '', false, {}, null)
    const res2 = await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)

    assert(typeof res2.status === 'string')
    assert(res2.status === 'OK')
    assert(typeof res2.userId === 'string')
    assert(typeof res2.sessionData === 'object')
    assert(typeof res2.expiry === 'number')
    assert(typeof res2.accessTokenPayload === 'object')
    assert(typeof res2.timeCreated === 'number')
  })

  it('test that revoked session throws error when calling get session by session handle', async () => {
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

    // Only run test for >= 2.8
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    const s = SessionRecipe.getInstanceOrThrowError().recipeInterfaceImpl
    // adding session data
    const res = await SessionFunctions.createNewSession(s.helpers, 'someid', false, {}, null)

    const response = await SessionFunctions.revokeAllSessionsForUser(s.helpers, 'someid')
    assert(response.length === 1)

    assert(!(await SessionFunctions.getSessionInformation(s.helpers, res.session.handle)))
  })

  it('should use override functions in sessioncontainer methods', async () => {
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
      recipeList: [
        Session.init({
          getTokenTransferMethod: () => 'cookie',
          antiCsrf: 'VIA_TOKEN',
          override: {
            functions: oI => ({
              ...oI,
              getSessionInformation: async (input) => {
                const info = await oI.getSessionInformation(input)
                info.sessionData = { test: 1 }
                return info
              },
            }),
          },
        }),
      ],
    })

    const session = await Session.createNewSession(mockRequest(), mockResponse(), 'testId')

    const data = await session.getSessionData()

    assert.equal(data.test, 1)
  })
})
