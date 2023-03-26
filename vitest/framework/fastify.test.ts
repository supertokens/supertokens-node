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
import { PROCESS_STATE, ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import * as FastifyFramework from 'supertokens-node/framework/fastify'
import Fastify, { FastifyInstance } from 'fastify'
import EmailPassword from 'supertokens-node/recipe/emailpassword'
import EmailVerification from 'supertokens-node/recipe/emailverification'
import Session from 'supertokens-node/recipe/session'
import { verifySession } from 'supertokens-node/recipe/session/framework/fastify'
import Dashboard from 'supertokens-node/recipe/dashboard'
import { afterAll, afterEach, beforeEach, describe, it } from 'vitest'
import {
  cleanST,
  extractCookieCountInfo,
  extractInfoFromResponse,
  killAllST,
  printPath,
  setupST,
  startST,
} from '../utils'

describe(`Fastify: ${printPath('[test/framework/fastify.test.js]')}`, () => {
  let server: FastifyInstance
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
    server = Fastify()
  })

  afterEach(async () => {
    try {
      await server.close()
    }
    catch (err) {}
  })
  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  // check if disabling api, the default refresh API does not work - you get a 404
  it('test that if disabling api, the default refresh API does not work', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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
          override: {
            apis: (oI) => {
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

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      return res.send('').code(200)
    })

    await server.register(FastifyFramework.plugin)

    const res = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    const res2 = await server.inject({
      method: 'post',
      url: '/auth/session/refresh',
      headers: {
        'Cookie': `sRefreshToken=${res.refreshToken}`,
        'anti-csrf': res.antiCsrf,
      },
    })

    assert(res2.statusCode === 404)
  })

  it('test that if disabling api, the default sign out API does not work', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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
          override: {
            apis: (oI) => {
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

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      return res.send('').code(200)
    })

    await server.register(FastifyFramework.plugin)

    await server.inject({
      method: 'post',
      url: '/create',
    })

    const res2 = await server.inject({
      method: 'post',
      url: '/auth/signout',
    })

    assert(res2.statusCode === 404)
  })

  // - check for token theft detection
  it('token theft detection', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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
          errorHandlers: {
            onTokenTheftDetected: async (sessionHandle, userId, request, response) => {
              response.sendJSONResponse({
                success: true,
              })
            },
          },
          getTokenTransferMethod: () => 'cookie',
          antiCsrf: 'VIA_TOKEN',
          override: {
            apis: (oI) => {
              return {
                ...oI,
                refreshPOST: undefined,
              }
            },
          },
        }),
      ],
    })

    server.setErrorHandler(FastifyFramework.errorHandler())

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      return res.send('').code(200)
    })

    server.post('/session/verify', async (req, res) => {
      await Session.getSession(req, res)
      return res.send('').code(200)
    })

    server.post('/auth/session/refresh', async (req, res) => {
      await Session.refreshSession(req, res)
      return res.send({ success: false }).code(200)
    })

    await server.register(FastifyFramework.plugin)

    const res = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    const res2 = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/auth/session/refresh',
        headers: {
          'Cookie': `sRefreshToken=${res.refreshToken}`,
          'anti-csrf': res.antiCsrf,
        },
      }),
    )

    await server.inject({
      method: 'post',
      url: '/session/verify',
      headers: {
        'Cookie': `sAccessToken=${res2.accessToken}`,
        'anti-csrf': res2.antiCsrf,
      },
    })

    const res3 = await server.inject({
      method: 'post',
      url: '/auth/session/refresh',
      headers: {
        'Cookie': `sRefreshToken=${res.refreshToken}`,
        'anti-csrf': res.antiCsrf,
      },
    })
    assert.strictEqual(res3.json().success, true)

    const cookies = extractInfoFromResponse(res3)
    assert.strictEqual(cookies.antiCsrf, undefined)
    assert.strictEqual(cookies.accessToken, '')
    assert.strictEqual(cookies.refreshToken, '')
    assert.strictEqual(cookies.accessTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert.strictEqual(cookies.refreshTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(cookies.accessTokenDomain === undefined)
    assert(cookies.refreshTokenDomain === undefined)
  })

  // - check for token theft detection
  it('token theft detection with auto refresh middleware', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    server.setErrorHandler(FastifyFramework.errorHandler())

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      return res.send('').code(200)
    })

    server.post('/session/verify', async (req, res) => {
      await Session.getSession(req, res)
      return res.send('').code(200)
    })

    await server.register(FastifyFramework.plugin)

    const res = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    const res2 = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/auth/session/refresh',
        headers: {
          'Cookie': `sRefreshToken=${res.refreshToken}`,
          'anti-csrf': res.antiCsrf,
        },
      }),
    )

    await server.inject({
      method: 'post',
      url: '/session/verify',
      headers: {
        'Cookie': `sAccessToken=${res2.accessToken}`,
        'anti-csrf': res2.antiCsrf,
      },
    })

    const res3 = await server.inject({
      method: 'post',
      url: '/auth/session/refresh',
      headers: {
        'Cookie': `sRefreshToken=${res.refreshToken}`,
        'anti-csrf': res.antiCsrf,
      },
    })
    assert(res3.statusCode === 401)
    assert.deepStrictEqual(res3.json(), { message: 'token theft detected' })

    const cookies = extractInfoFromResponse(res3)
    assert.strictEqual(cookies.antiCsrf, undefined)
    assert.strictEqual(cookies.accessToken, '')
    assert.strictEqual(cookies.refreshToken, '')
    assert.strictEqual(cookies.accessTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert.strictEqual(cookies.refreshTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
  })

  // - check for token theft detection without error handler
  it('token theft detection with auto refresh middleware without error handler', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      return res.send('').code(200)
    })

    server.post('/session/verify', async (req, res) => {
      await Session.getSession(req, res)
      return res.send('').code(200)
    })

    await server.register(FastifyFramework.plugin)

    const res = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    const res2 = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/auth/session/refresh',
        headers: {
          'Cookie': `sRefreshToken=${res.refreshToken}`,
          'anti-csrf': res.antiCsrf,
        },
      }),
    )

    await server.inject({
      method: 'post',
      url: '/session/verify',
      headers: {
        'Cookie': `sAccessToken=${res2.accessToken}`,
        'anti-csrf': res2.antiCsrf,
      },
    })

    const res3 = await server.inject({
      method: 'post',
      url: '/auth/session/refresh',
      headers: {
        'Cookie': `sRefreshToken=${res.refreshToken}`,
        'anti-csrf': res.antiCsrf,
      },
    })
    assert(res3.statusCode === 401)
    assert.deepStrictEqual(res3.json(), { message: 'token theft detected' })

    const cookies = extractInfoFromResponse(res3)
    assert.strictEqual(cookies.antiCsrf, undefined)
    assert.strictEqual(cookies.accessToken, '')
    assert.strictEqual(cookies.refreshToken, '')
    assert.strictEqual(cookies.accessTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert.strictEqual(cookies.refreshTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
  })

  // - check if session verify middleware responds with a nice error even without the global error handler
  it('test session verify middleware without error handler added', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    server.post(
      '/session/verify',
      {
        preHandler: verifySession(),
      },
      async (req, res) => {
        return res.send('').code(200)
      },
    )

    await server.register(FastifyFramework.plugin)

    const res = await server.inject({
      method: 'post',
      url: '/session/verify',
    })

    assert.strictEqual(res.statusCode, 401)
    assert.deepStrictEqual(res.json(), { message: 'unauthorised' })
  })

  // check basic usage of session
  it('test basic usage of sessions', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      return res.send('').code(200)
    })

    server.post('/session/verify', async (req, res) => {
      await Session.getSession(req, res)
      return res.send('').code(200)
    })

    server.post('/session/revoke', async (req, res) => {
      const session = await Session.getSession(req, res)
      await session.revokeSession()
      return res.send('').code(200)
    })

    await server.register(FastifyFramework.plugin)

    const res = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    assert(res.accessToken !== undefined)
    assert(res.antiCsrf !== undefined)
    assert(res.refreshToken !== undefined)

    await server.inject({
      method: 'post',
      url: '/session/verify',
      headers: {
        'Cookie': `sAccessToken=${res.accessToken}`,
        'anti-csrf': res.antiCsrf,
      },
    })

    const verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500)
    assert(verifyState3 === undefined)

    const res2 = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/auth/session/refresh',
        headers: {
          'Cookie': `sRefreshToken=${res.refreshToken}`,
          'anti-csrf': res.antiCsrf,
        },
      }),
    )

    assert(res2.accessToken !== undefined)
    assert(res2.antiCsrf !== undefined)
    assert(res2.refreshToken !== undefined)

    const res3 = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/session/verify',
        headers: {
          'Cookie': `sAccessToken=${res2.accessToken}`,
          'anti-csrf': res2.antiCsrf,
        },
      }),
    )
    const verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY)
    assert(verifyState !== undefined)
    assert(res3.accessToken !== undefined)

    ProcessState.getInstance().reset()

    await server.inject({
      method: 'post',
      url: '/session/verify',
      headers: {
        'Cookie': `sAccessToken=${res3.accessToken}`,
        'anti-csrf': res2.antiCsrf,
      },
    })
    const verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000)
    assert(verifyState2 === undefined)

    const sessionRevokedResponse = await server.inject({
      method: 'post',
      url: '/session/revoke',
      headers: {
        'Cookie': `sAccessToken=${res3.accessToken}`,
        'anti-csrf': res2.antiCsrf,
      },
    })
    const sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse)
    assert(sessionRevokedResponseExtracted.accessTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.refreshTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.accessToken === '')
    assert(sessionRevokedResponseExtracted.refreshToken === '')
  })

  it('test signout API works', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      return res.send('').code(200)
    })

    await server.register(FastifyFramework.plugin)

    const res = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    const sessionRevokedResponse = await server.inject({
      method: 'post',
      url: '/auth/signout',
      headers: {
        'Cookie': `sAccessToken=${res.accessToken}`,
        'anti-csrf': res.antiCsrf,
      },
    })

    const sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse)
    assert(sessionRevokedResponseExtracted.accessTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.refreshTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.accessToken === '')
    assert(sessionRevokedResponseExtracted.refreshToken === '')
  })

  // check basic usage of session
  it('test basic usage of sessions with auto refresh', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
        apiBasePath: '/',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      return res.send('').code(200)
    })

    server.post('/session/verify', async (req, res) => {
      await Session.getSession(req, res)
      return res.send('').code(200)
    })

    server.post('/session/revoke', async (req, res) => {
      const session = await Session.getSession(req, res)
      await session.revokeSession()
      return res.send('').code(200)
    })

    await server.register(FastifyFramework.plugin)

    const res = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    assert(res.accessToken !== undefined)
    assert(res.antiCsrf !== undefined)
    assert(res.refreshToken !== undefined)

    await server.inject({
      method: 'post',
      url: '/session/verify',
      headers: {
        'Cookie': `sAccessToken=${res.accessToken}`,
        'anti-csrf': res.antiCsrf,
      },
    })

    const verifyState3 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1500)
    assert(verifyState3 === undefined)

    const res2 = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/session/refresh',
        headers: {
          'Cookie': `sRefreshToken=${res.refreshToken}`,
          'anti-csrf': res.antiCsrf,
        },
      }),
    )
    assert(res2.accessToken !== undefined)
    assert(res2.antiCsrf !== undefined)
    assert(res2.refreshToken !== undefined)

    const res3 = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/session/verify',
        headers: {
          'Cookie': `sAccessToken=${res2.accessToken}`,
          'anti-csrf': res2.antiCsrf,
        },
      }),
    )
    const verifyState = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY)
    assert(verifyState !== undefined)
    assert(res3.accessToken !== undefined)

    ProcessState.getInstance().reset()

    await server.inject({
      method: 'post',
      url: '/session/verify',
      headers: {
        'Cookie': `sAccessToken=${res3.accessToken}`,
        'anti-csrf': res2.antiCsrf,
      },
    })
    const verifyState2 = await ProcessState.getInstance().waitForEvent(PROCESS_STATE.CALLING_SERVICE_IN_VERIFY, 1000)
    assert(verifyState2 === undefined)

    const sessionRevokedResponse = await server.inject({
      method: 'post',
      url: '/session/revoke',
      headers: {
        'Cookie': `sAccessToken=${res3.accessToken}`,
        'anti-csrf': res2.antiCsrf,
      },
    })
    const sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse)
    assert(sessionRevokedResponseExtracted.accessTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.refreshTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.accessToken === '')
    assert(sessionRevokedResponseExtracted.refreshToken === '')
  })

  // check session verify for with / without anti-csrf present
  it('test session verify with anti-csrf present', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, 'id1', {}, {})
      return res.send('').code(200)
    })

    server.post('/session/verify', async (req, res) => {
      const sessionResponse = await Session.getSession(req, res)
      return res.send({ userId: sessionResponse.userId }).code(200)
    })

    server.post('/session/verifyAntiCsrfFalse', async (req, res) => {
      const sessionResponse = await Session.getSession(req, res, false)
      return res.send({ userId: sessionResponse.userId }).code(200)
    })

    await server.register(FastifyFramework.plugin)

    const res = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    const res2 = await server.inject({
      method: 'post',
      url: '/session/verify',
      headers: {
        'Cookie': `sAccessToken=${res.accessToken}`,
        'anti-csrf': res.antiCsrf,
      },
    })
    assert.strictEqual(res2.json().userId, 'id1')

    const res3 = await server.inject({
      method: 'post',
      url: '/session/verifyAntiCsrfFalse',
      headers: {
        'Cookie': `sAccessToken=${res.accessToken}`,
        'anti-csrf': res.antiCsrf,
      },
    })
    assert.strictEqual(res3.json().userId, 'id1')
  })

  // check session verify for with / without anti-csrf present
  it('test session verify without anti-csrf present', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    await server.register(FastifyFramework.plugin)

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, 'id1', {}, {})
      return res.send('').code(200)
    })

    server.post('/session/verify', async (req, res) => {
      try {
        await Session.getSession(req, res, { antiCsrfCheck: true })
        return res.send({ success: false }).code(200)
      }
      catch (err) {
        return res
          .send({
            success: err.type === Session.Error.TRY_REFRESH_TOKEN,
          })
          .code(200)
      }
    })

    server.post('/session/verifyAntiCsrfFalse', async (req, res) => {
      const sessionResponse = await Session.getSession(req, res, { antiCsrfCheck: false })
      return res.send({ userId: sessionResponse.userId }).code(200)
    })
    const res = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    const response2 = await server.inject({
      method: 'post',
      url: '/session/verifyAntiCsrfFalse',
      headers: {
        Cookie: `sAccessToken=${res.accessToken}`,
      },
    })
    assert.strictEqual(response2.json().userId, 'id1')

    const response = await server.inject({
      method: 'post',
      url: '/session/verify',
      headers: {
        Cookie: `sAccessToken=${res.accessToken}`,
      },
    })
    assert.strictEqual(response.json().success, true)
  })

  // check revoking session(s)**
  it('test revoking sessions', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      return res.send('').code(200)
    })
    server.post('/usercreate', async (req, res) => {
      await Session.createNewSession(req, res, 'someUniqueUserId', {}, {})
      return res.send('').code(200)
    })
    server.post('/session/revoke', async (req, res) => {
      const session = await Session.getSession(req, res)
      await session.revokeSession()
      return res.send('').code(200)
    })

    server.post('/session/revokeUserid', async (req, res) => {
      const session = await Session.getSession(req, res)
      await Session.revokeAllSessionsForUser(session.getUserId())
      return res.send('').code(200)
    })

    server.post('/session/getSessionsWithUserId1', async (req, res) => {
      const sessionHandles = await Session.getAllSessionHandlesForUser('someUniqueUserId')
      return res.send(sessionHandles).code(200)
    })

    await server.register(FastifyFramework.plugin)

    const res = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )
    const sessionRevokedResponse = await server.inject({
      method: 'post',
      url: '/session/revoke',
      headers: {
        'Cookie': `sAccessToken=${res.accessToken}`,
        'anti-csrf': res.antiCsrf,
      },
    })
    const sessionRevokedResponseExtracted = extractInfoFromResponse(sessionRevokedResponse)
    assert(sessionRevokedResponseExtracted.accessTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.refreshTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.accessToken === '')
    assert(sessionRevokedResponseExtracted.refreshToken === '')

    await server.inject({
      method: 'post',
      url: '/usercreate',
    })
    const userCreateResponse = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/usercreate',
      }),
    )

    await server.inject({
      method: 'post',
      url: '/session/revokeUserid',
      headers: {
        'Cookie': `sAccessToken=${userCreateResponse.accessToken}`,
        'anti-csrf': userCreateResponse.antiCsrf,
      },
    })
    const sessionHandleResponse = await server.inject({
      method: 'post',
      url: '/session/getSessionsWithUserId1',
    })
    assert(sessionHandleResponse.json().length === 0)
  })

  // check manipulating session data
  it('test manipulating session data', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, '', {}, {})
      return res.send('').code(200)
    })

    server.post(
      '/updateSessionData',
      {
        preHandler: verifySession(),
      },
      async (req, res) => {
        await req.session.updateSessionData({ key: 'value' })
        return res.send('').code(200)
      },
    )

    server.post(
      '/getSessionData',
      {
        preHandler: verifySession(),
      },
      async (req, res) => {
        const sessionData = await req.session.getSessionData()
        return res.send(sessionData).code(200)
      },
    )

    server.post(
      '/updateSessionData2',
      {
        preHandler: verifySession(),
      },
      async (req, res) => {
        await req.session.updateSessionData(null)
        return res.send('').code(200)
      },
    )

    server.post('/updateSessionDataInvalidSessionHandle', async (req, res) => {
      return res
        .send({ success: !(await Session.updateSessionData('InvalidHandle', { key: 'value3' })) })
        .code(200)
    })

    await server.register(FastifyFramework.plugin)

    // create a new session
    const response = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    await server.inject({
      method: 'post',
      url: '/updateSessionData',
      headers: {
        'Cookie': `sAccessToken=${response.accessToken}`,
        'anti-csrf': response.antiCsrf,
      },
    })

    // call the getSessionData api to get session data
    let response2 = await server.inject({
      method: 'post',
      url: '/getSessionData',
      headers: {
        'Cookie': `sAccessToken=${response.accessToken}`,
        'anti-csrf': response.antiCsrf,
      },
    })

    // check that the session data returned is valid
    assert.strictEqual(response2.json().key, 'value')

    // change the value of the inserted session data
    await server.inject({
      method: 'post',
      url: '/updateSessionData2',
      headers: {
        'Cookie': `sAccessToken=${response.accessToken}`,
        'anti-csrf': response.antiCsrf,
      },
    })

    // retrieve the changed session data
    response2 = await server.inject({
      method: 'post',
      url: '/getSessionData',
      headers: {
        'Cookie': `sAccessToken=${response.accessToken}`,
        'anti-csrf': response.antiCsrf,
      },
    })

    // check the value of the retrieved
    assert.deepStrictEqual(response2.json(), {})

    // invalid session handle when updating the session data
    const invalidSessionResponse = await server.inject({
      method: 'post',
      url: '/updateSessionDataInvalidSessionHandle',
      headers: {
        'Cookie': `sAccessToken=${response.accessToken}`,
        'anti-csrf': response.antiCsrf,
      },
    })
    assert.strictEqual(invalidSessionResponse.json().success, true)
  })

  // check manipulating jwt payload
  it('test manipulating jwt payload', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, 'user1', {}, {})
      return res.send('').code(200)
    })

    server.post(
      '/updateAccessTokenPayload',
      {
        preHandler: verifySession(),
      },
      async (req, res) => {
        const accessTokenBefore = req.session.accessToken
        await req.session.updateAccessTokenPayload({ key: 'value' })
        const accessTokenAfter = req.session.accessToken
        const statusCode
                    = accessTokenBefore !== accessTokenAfter && typeof accessTokenAfter === 'string' ? 200 : 500
        return res.send('').code(statusCode)
      },
    )

    server.post(
      '/getAccessTokenPayload',
      {
        preHandler: verifySession(),
      },
      async (req, res) => {
        const jwtPayload = await req.session.getAccessTokenPayload()
        return res.send(jwtPayload).code(200)
      },
    )

    server.post(
      '/updateAccessTokenPayload2',
      {
        preHandler: verifySession(),
      },
      async (req, res) => {
        await req.session.updateAccessTokenPayload(null)
        return res.send('').code(200)
      },
    )

    server.post('/updateAccessTokenPayloadInvalidSessionHandle', async (req, res) => {
      return res
        .send({ success: !(await Session.updateSessionData('InvalidHandle', { key: 'value3' })) })
        .code(200)
    })

    await server.register(FastifyFramework.plugin)

    // create a new session
    const response = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )

    let frontendInfo = JSON.parse(new Buffer.from(response.frontToken, 'base64').toString())
    assert(frontendInfo.uid === 'user1')
    assert.deepStrictEqual(frontendInfo.up, {})

    // call the updateAccessTokenPayload api to add jwt payload
    const updatedResponse = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/updateAccessTokenPayload',
        headers: {
          'Cookie': `sAccessToken=${response.accessToken}`,
          'anti-csrf': response.antiCsrf,
        },
      }),
    )

    frontendInfo = JSON.parse(new Buffer.from(updatedResponse.frontToken, 'base64').toString())
    assert(frontendInfo.uid === 'user1')
    assert.deepStrictEqual(frontendInfo.up, { key: 'value' })

    // call the getAccessTokenPayload api to get jwt payload
    let response2 = await server.inject({
      method: 'post',
      url: '/getAccessTokenPayload',
      headers: {
        'Cookie': `sAccessToken=${updatedResponse.accessToken}`,
        'anti-csrf': response.antiCsrf,
      },
    })
    // check that the jwt payload returned is valid
    assert.strictEqual(response2.json().key, 'value')

    // refresh session
    response2 = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/auth/session/refresh',
        headers: {
          'Cookie': `sRefreshToken=${response.refreshToken}`,
          'anti-csrf': response.antiCsrf,
        },
      }),
    )

    frontendInfo = JSON.parse(new Buffer.from(response2.frontToken, 'base64').toString())
    assert(frontendInfo.uid === 'user1')
    assert.deepStrictEqual(frontendInfo.up, { key: 'value' })

    // change the value of the inserted jwt payload
    const updatedResponse2 = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/updateAccessTokenPayload2',
        headers: {
          'Cookie': `sAccessToken=${response2.accessToken}`,
          'anti-csrf': response2.antiCsrf,
        },
      }),
    )

    frontendInfo = JSON.parse(new Buffer.from(updatedResponse2.frontToken, 'base64').toString())
    assert(frontendInfo.uid === 'user1')
    assert.deepStrictEqual(frontendInfo.up, {})

    // retrieve the changed jwt payload
    const response3 = await server.inject({
      method: 'post',
      url: '/getAccessTokenPayload',
      headers: {
        'Cookie': `sAccessToken=${updatedResponse2.accessToken}`,
        'anti-csrf': response2.antiCsrf,
      },
    })

    // check the value of the retrieved
    assert.deepStrictEqual(response3.json(), {})
    // invalid session handle when updating the jwt payload
    const invalidSessionResponse = await server.inject({
      method: 'post',
      url: '/updateAccessTokenPayloadInvalidSessionHandle',
      headers: {
        'Cookie': `sAccessToken=${updatedResponse2.accessToken}`,
        'anti-csrf': response2.antiCsrf,
      },
    })
    assert.strictEqual(invalidSessionResponse.json().success, true)
  })

  it('sending custom response fastify', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        EmailPassword.init({
          override: {
            apis: (oI) => {
              return {
                ...oI,
                async emailExistsGET(input) {
                  input.options.res.setStatusCode(203)
                  input.options.res.sendJSONResponse({
                    custom: true,
                  })
                  return oI.emailExistsGET(input)
                },
              }
            },
          },
        }),
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
      ],
    })

    await server.register(FastifyFramework.plugin)

    // create a new session
    const response = await server.inject({
      method: 'get',
      url: '/auth/signup/email/exists?email=test@example.com',
    })

    assert(response.statusCode === 203)

    assert(JSON.parse(response.body).custom)
  })

  it('generating email verification token without payload', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        EmailVerification.init({ mode: 'OPTIONAL' }),
        EmailPassword.init(),
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
      ],
    })

    await server.register(FastifyFramework.plugin)

    // sign up a user first
    const response = extractInfoFromResponse(
      await server.inject({
        method: 'post',
        url: '/auth/signup',
        payload: {
          formFields: [
            {
              id: 'email',
              value: 'johndoe@gmail.com',
            },
            {
              id: 'password',
              value: 'testPass123',
            },
          ],
        },
      }),
    )

    // send generate email verification token request
    const res2 = await server.inject({
      method: 'post',
      url: '/auth/user/email/verify/token',
      payload: {},
      headers: {
        'Cookie': `sAccessToken=${response.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    assert.equal(res2.statusCode, 200)
  })

  it('test same cookie is not getting set multiple times', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
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

    await server.register(FastifyFramework.plugin)

    server.post('/create', async (req, res) => {
      await Session.createNewSession(req, res, 'id1', {}, {})
      return res.send('').code(200)
    })

    const res = extractCookieCountInfo(
      await server.inject({
        method: 'post',
        url: '/create',
      }),
    )
    assert.strictEqual(res.accessToken, 1)
    assert.strictEqual(res.refreshToken, 1)
  })

  it('test that authorization header is read correctly in dashboard recipe', async () => {
    await startST()
    SuperTokens.init({
      framework: 'fastify',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        Dashboard.init({
          apiKey: 'testapikey',
          override: {
            functions: (original) => {
              return {
                ...original,
                async shouldAllowAccess(input) {
                  const authHeader = input.req.getHeaderValue('authorization')
                  if (authHeader === 'Bearer testapikey')
                    return true

                  return false
                },
              }
            },
          },
        }),
      ],
    })
    await server.register(FastifyFramework.plugin)

    const res2 = await server.inject({
      method: 'get',
      url: '/auth/dashboard/api/users/count',
      headers: {
        'Authorization': 'Bearer testapikey',
        'Content-Type': 'application/json',
      },
    })

    assert(res2.statusCode === 200)
  })
})
