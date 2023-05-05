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
import express from 'express'
import request from 'supertest'
import { PROCESS_STATE, ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { verifySession } from 'supertokens-node/recipe/session/framework/express'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeEach, describe, it } from 'vitest'
import {
  cleanST,
  extractInfoFromResponse,
  killAllST,
  printPath,
  setupST,
  startST,
} from '../../utils'
/**
 * Test that overriding the session recipe functions and apis still work when the JWT feature is enabled
 */
describe(`session: ${printPath('[test/session/with-jwt/session.override.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('test overriding of sessions functions', async () => {
    await startST()

    let createNewSessionCalled = false
    let getSessionCalled = false
    let refreshSessionCalled = false
    let session
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
        apiBasePath: '/',
      },
      recipeList: [
        Session.init({
          getTokenTransferMethod: () => 'cookie',
          antiCsrf: 'VIA_TOKEN',
          jwt: { enable: true },
          override: {
            functions(oI) {
              return {
                ...oI,
                async createNewSession(input) {
                  const response = await oI.createNewSession(input)
                  createNewSessionCalled = true
                  session = response
                  return response
                },
                async getSession(input) {
                  const response = await oI.getSession(input)
                  getSessionCalled = true
                  session = response
                  return response
                },
                async refreshSession(input) {
                  const response = await oI.refreshSession(input)
                  refreshSessionCalled = true
                  session = response
                  return response
                },
              }
            },
          },
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const app = express()

    app.use(middleware())

    app.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      res.status(200).send('')
    })

    app.post('/session/verify', verifySession(), async (req, res) => {
      res.status(200).send('')
    })

    app.post('/session/revoke', verifySession(), async (req, res) => {
      const session = req.session
      await session.revokeSession()
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

    assert.strictEqual(createNewSessionCalled, true)
    assert.notStrictEqual(session, undefined)
    assert(res.accessToken !== undefined)
    assert.strictEqual(session.getAccessToken(), decodeURIComponent(res.accessToken))
    assert(res.antiCsrf !== undefined)
    assert(res.refreshToken !== undefined)
    session = undefined

    await new Promise(resolve =>
      request(app)
        .post('/session/verify')
        .set('Cookie', [`sAccessToken=${res.accessToken}`])
        .set('anti-csrf', res.antiCsrf)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500)
    assert(verifyState3 === undefined)

    const res2 = extractInfoFromResponse(
      await new Promise(resolve =>
        request(app)
          .post('/session/refresh')
          .set('Cookie', [`sRefreshToken=${res.refreshToken}`])
          .set('anti-csrf', res.antiCsrf)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      ),
    )

    assert.strictEqual(refreshSessionCalled, true)
    assert.notStrictEqual(session, undefined)
    assert(res2.accessToken !== undefined)
    assert.strictEqual(session.getAccessToken(), decodeURIComponent(res2.accessToken))
    assert(res2.antiCsrf !== undefined)
    assert(res2.refreshToken !== undefined)
    session = undefined

    const res3 = extractInfoFromResponse(
      await new Promise(resolve =>
        request(app)
          .post('/session/verify')
          .set('Cookie', [`sAccessToken=${res2.accessToken}`])
          .set('anti-csrf', res2.antiCsrf)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      ),
    )
    const verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY)
    assert.strictEqual(getSessionCalled, true)
    assert.notStrictEqual(session, undefined)
    assert(verifyState !== undefined)
    assert(res3.accessToken !== undefined)
    assert.strictEqual(session.getAccessToken(), decodeURIComponent(res3.accessToken))

    ProcessState.getInstance().reset()

    await new Promise(resolve =>
      request(app)
        .post('/session/verify')
        .set('Cookie', [`sAccessToken=${res3.accessToken}`])
        .set('anti-csrf', res2.antiCsrf)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    const verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000)
    assert(verifyState2 === undefined)

    const sessionRevokedResponse = await new Promise(resolve =>
      request(app)
        .post('/session/revoke')
        .set('Cookie', [`sAccessToken=${res3.accessToken}`])
        .set('anti-csrf', res2.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    const sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse)
    assert(sessionRevokedResponseExtracted.accessTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.refreshTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.accessToken === '')
    assert(sessionRevokedResponseExtracted.refreshToken === '')
  })

  it('test overriding of sessions functions, error thrown', async () => {
    await startST()

    let createNewSessionCalled = false
    let session
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
        apiBasePath: '/',
      },
      recipeList: [
        Session.init({
          getTokenTransferMethod: () => 'cookie',
          antiCsrf: 'VIA_TOKEN',
          jwt: { enable: true },
          override: {
            functions(oI) {
              return {
                ...oI,
                async createNewSession(input) {
                  const response = await oI.createNewSession(input)
                  createNewSessionCalled = true
                  session = response
                  throw {
                    error: 'create new session error',
                  }
                },
              }
            },
          },
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const app = express()

    app.use(middleware())

    app.post('/create', async (req, res, next) => {
      try {
        await Session.createNewSession(req, res, '', {}, {})
        res.status(200).send('')
      }
      catch (err) {
        next(err)
      }
    })

    app.use(errorHandler())

    app.use((err, req, res, next) => {
      res.json({
        customError: true,
        ...err,
      })
    })

    const res = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        }),
    )

    assert.strictEqual(createNewSessionCalled, true)
    assert.notStrictEqual(session, undefined)
    assert.deepStrictEqual(res, { customError: true, error: 'create new session error' })
  })

  it('test overriding of sessions apis', async () => {
    await startST()

    let signoutCalled = false
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
        apiBasePath: '/',
      },
      recipeList: [
        Session.init({
          getTokenTransferMethod: () => 'cookie',
          antiCsrf: 'VIA_TOKEN',
          jwt: { enable: true },
          override: {
            apis(oI) {
              return {
                ...oI,
                async signOutPOST(input) {
                  const response = await oI.signOutPOST(input)
                  signoutCalled = true
                  return response
                },
              }
            },
          },
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const app = express()

    app.use(middleware())

    app.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      res.status(200).send('')
    })

    app.post('/session/verify', verifySession(), async (req, res) => {
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

    assert(res.accessToken !== undefined)
    assert(res.antiCsrf !== undefined)
    assert(res.refreshToken !== undefined)

    const sessionRevokedResponse = await new Promise(resolve =>
      request(app)
        .post('/signout')
        .set('Cookie', [`sAccessToken=${res.accessToken}`])
        .set('anti-csrf', res.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    const sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse)
    assert.strictEqual(signoutCalled, true)
    assert(sessionRevokedResponseExtracted.accessTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.refreshTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.accessToken === '')
    assert(sessionRevokedResponseExtracted.refreshToken === '')
  })

  it('test overriding of sessions apis, error thrown', async () => {
    await startST()

    let signoutCalled = false
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
        apiBasePath: '/',
      },
      recipeList: [
        Session.init({
          getTokenTransferMethod: () => 'cookie',
          antiCsrf: 'VIA_TOKEN',
          jwt: { enable: true },
          override: {
            apis(oI) {
              return {
                ...oI,
                async signOutPOST(input) {
                  const response = await oI.signOutPOST(input)
                  signoutCalled = true
                  throw {
                    error: 'signout error',
                  }
                },
              }
            },
          },
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const app = express()

    app.use(middleware())

    app.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      res.status(200).send('')
    })

    app.post('/session/verify', verifySession(), async (req, res) => {
      res.status(200).send('')
    })

    app.use(errorHandler())

    app.use((err, req, res, next) => {
      res.json({
        customError: true,
        ...err,
      })
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

    assert(res.accessToken !== undefined)
    assert(res.antiCsrf !== undefined)
    assert(res.refreshToken !== undefined)

    const sessionRevokedResponse = await new Promise(resolve =>
      request(app)
        .post('/signout')
        .set('Cookie', [`sAccessToken=${res.accessToken}`])
        .set('anti-csrf', res.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        }),
    )
    assert.strictEqual(signoutCalled, true)
    assert.deepStrictEqual(sessionRevokedResponse, { customError: true, error: 'signout error' })
  })

  it('test that if disabling api, the default refresh API does not work', async () => {
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
          jwt: { enable: true },
          override: {
            apis(oI) {
              return {
                ...oI,
                refreshPOST: undefined,
              }
            },
          },
          antiCsrf: 'VIA_TOKEN',
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

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

    assert(res2.status === 404)
  })

  it('test that if disabling api, the default sign out API does not work', async () => {
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
          jwt: { enable: true },
          override: {
            apis(oI) {
              return {
                ...oI,
                signOutPOST: undefined,
              }
            },
          },
          antiCsrf: 'VIA_TOKEN',
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

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
        .post('/auth/signout')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    assert(res2.status === 404)
  })
})
