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
import { IncomingMessage, Server, ServerResponse } from 'http'
import { PROCESS_STATE, ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import * as KoaFramework from 'supertokens-node/framework/koa'
import Session from 'supertokens-node/recipe/session'
import EmailPassword from 'supertokens-node/recipe/emailpassword'
import Koa from 'koa'
import Router from '@koa/router'
import { verifySession } from 'supertokens-node/recipe/session/framework/koa'
import request from 'supertest'
import Dashboard from 'supertokens-node/recipe/dashboard'
import { afterAll, afterEach, beforeEach, describe, it } from 'vitest'
import { cleanST, extractInfoFromResponse, killAllST, printPath, setupST, startST } from '../utils'


import { Apple, Github, Google } from 'supertokens-node/recipe/thirdparty'
import { createUsers } from '../utils'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'

import ThirdParty from 'supertokens-node/recipe/thirdparty'
import Passwordless from 'supertokens-node/recipe/passwordless'

describe(`Koa: ${printPath('[test/framework/koa.test.js]')}`, () => {
  let server: Server<typeof IncomingMessage, typeof ServerResponse>
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
    server = undefined as any
  })

  afterEach(() => {
    if (server !== undefined)
      server.close()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  // check if disabling api, the default refresh API does not work - you get a 404
  it('test that if disabling api, the default refresh API does not work', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
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

    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())

    router.post('/create', async (ctx, next) => {
      await Session.createNewSession(ctx, ctx, '', {}, {})
      ctx.body = ''
    })

    app.use(router.routes())
    server = app.listen(9999)

    const res = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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
      request(server)
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

    assert(res2.statusCode === 404)
  })

  it('test that if disabling api, the default sign out API does not work', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
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

    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())

    router.post('/create', async (ctx, next) => {
      await Session.createNewSession(ctx, ctx, '', {}, {})
      ctx.body = ''
    })

    app.use(router.routes())
    server = app.listen(9999)

    await new Promise(resolve =>
      request(server)
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
      request(server)
        .post('/auth/signout')
        .end((err, res) => {
          if (err)
            resolve(undefined)
          else
            resolve(res)
        }),
    )

    assert(res2.statusCode === 404)
  })

  // - check for token theft detection
  it('koa token theft detection', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
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

    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())
    router.post('/create', async (ctx, next) => {
      await Session.createNewSession(ctx, ctx, '', {}, {})
      ctx.body = ''
    })

    router.post('/session/verify', async (ctx, next) => {
      await Session.getSession(ctx, ctx, true)
      ctx.body = ''
    })

    router.post('/auth/session/refresh', async (ctx, next) => {
      await Session.refreshSession(ctx, ctx)
      ctx.body = { success: false }
    })

    app.use(router.routes())
    server = app.listen(9999)

    const res = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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

    const res2 = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
          .post('/auth/session/refresh')
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

    await new Promise(resolve =>
      request(server)
        .post('/session/verify')
        .set('Cookie', [`sAccessToken=${res2.accessToken}`])
        .set('anti-csrf', res2.antiCsrf)
        .end((err, res) => {
          resolve()
        }),
    )

    const res3 = await new Promise(resolve =>
      request(server)
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
    assert.strictEqual(res3.body.success, true)

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
  it('koa token theft detection with auto refresh middleware', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())

    router.post('/create', async (ctx, _) => {
      await Session.createNewSession(ctx, ctx, '', {}, {})
      ctx.body = ''
    })

    router.post('/session/verify', verifySession(), async (ctx, _) => {
      ctx.body = ''
    })

    app.use(router.routes())
    server = app.listen(9999)

    const res = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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

    const res2 = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
          .post('/auth/session/refresh')
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

    await new Promise(resolve =>
      request(server)
        .post('/session/verify')
        .set('Cookie', [`sAccessToken=${res2.accessToken}`])
        .set('anti-csrf', res2.antiCsrf)
        .end((err, res) => {
          resolve()
        }),
    )

    const res3 = await new Promise(resolve =>
      request(server)
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
    assert(res3.status === 401)
    assert.strictEqual(res3.text, '{"message":"token theft detected"}')

    const cookies = extractInfoFromResponse(res3)
    assert.strictEqual(cookies.antiCsrf, undefined)
    assert.strictEqual(cookies.accessToken, '')
    assert.strictEqual(cookies.refreshToken, '')
    assert.strictEqual(cookies.accessTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert.strictEqual(cookies.refreshTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
  })

  // check basic usage of session
  it('test basic usage of express sessions', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())

    router.post('/create', async (ctx, next) => {
      await Session.createNewSession(ctx, ctx, '', {}, {})
      ctx.body = ''
    })

    router.post('/session/verify', async (ctx, next) => {
      await Session.getSession(ctx, ctx, true)
      ctx.body = ''
    })
    router.post('/auth/session/refresh', async (ctx, next) => {
      await Session.refreshSession(ctx, ctx)
      ctx.body = ''
    })
    router.post('/session/revoke', async (ctx, next) => {
      const session = await Session.getSession(ctx, ctx, true)
      await session.revokeSession()
      ctx.body = ''
    })

    app.use(router.routes())
    server = app.listen(9999)

    const res = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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

    await new Promise(resolve =>
      request(server)
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
        request(server)
          .post('/auth/session/refresh')
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

    assert(res2.accessToken !== undefined)
    assert(res2.antiCsrf !== undefined)
    assert(res2.refreshToken !== undefined)

    const res3 = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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
    assert(verifyState !== undefined)
    assert(res3.accessToken !== undefined)

    ProcessState.getInstance().reset()

    await new Promise(resolve =>
      request(server)
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
      request(server)
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

  it('test signout API works', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })
    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())

    router.post('/create', async (ctx, next) => {
      await Session.createNewSession(ctx, ctx, '', {}, {})
      ctx.body = ''
    })

    app.use(router.routes())
    server = app.listen(9999)

    const res = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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

    const sessionRevokedResponse = await new Promise(resolve =>
      request(server)
        .post('/auth/signout')
        .set('Cookie', [`sAccessToken=${res.accessToken}`])
        .set('anti-csrf', res.antiCsrf)
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

  // check basic usage of session
  it('test basic usage of express sessions with auto refresh', async () => {
    await startST()

    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
        apiBasePath: '/',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())

    router.post('/create', async (ctx, next) => {
      await Session.createNewSession(ctx, ctx, '', {}, {})
      ctx.body = ''
    })

    router.post('/session/verify', verifySession(), async (ctx, next) => {
      ctx.body = ''
    })

    router.post('/session/revoke', verifySession(), async (ctx, next) => {
      const session = ctx.session
      await session.revokeSession()
      ctx.body = ''
    })

    app.use(router.routes())
    server = app.listen(9999)

    const res = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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

    await new Promise(resolve =>
      request(server)
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
        request(server)
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

    assert(res2.accessToken !== undefined)
    assert(res2.antiCsrf !== undefined)
    assert(res2.refreshToken !== undefined)

    const res3 = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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
    assert(verifyState !== undefined)
    assert(res3.accessToken !== undefined)

    ProcessState.getInstance().reset()

    await new Promise(resolve =>
      request(server)
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
      request(server)
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

  // check session verify for with / without anti-csrf present
  it('test express session verify with anti-csrf present', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())
    router.post('/create', async (ctx, next) => {
      await Session.createNewSession(ctx, ctx, 'id1', {}, {})
      ctx.body = ''
    })

    router.post('/session/verify', async (ctx, next) => {
      const sessionResponse = await Session.getSession(ctx, ctx, { antiCsrfCheck: true })
      ctx.body = { userId: sessionResponse.userId }
    })

    router.post('/session/verifyAntiCsrfFalse', async (ctx, next) => {
      const sessionResponse = await Session.getSession(ctx, ctx, { antiCsrfCheck: false })
      ctx.body = { userId: sessionResponse.userId }
    })

    app.use(router.routes())
    server = app.listen(9999)

    const res = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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
      request(server)
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
    assert.strictEqual(res2.body.userId, 'id1')

    const res3 = await new Promise(resolve =>
      request(server)
        .post('/session/verifyAntiCsrfFalse')
        .set('Cookie', [`sAccessToken=${res.accessToken}`])
        .set('anti-csrf', res.antiCsrf)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(res3.body.userId, 'id1')
  })

  // check session verify for with / without anti-csrf present
  it('test session verify without anti-csrf present express', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())

    router.post('/create', async (ctx, next) => {
      await Session.createNewSession(ctx, ctx, 'id1', {}, {})
      ctx.body = ''
    })

    router.post('/session/verify', async (ctx, next) => {
      try {
        await Session.getSession(ctx, ctx, { antiCsrfCheck: true })
        ctx.body = { success: false }
      }
      catch (err) {
        ctx.body = {
          success: err.type === Session.Error.TRY_REFRESH_TOKEN,
        }
      }
    })

    router.post('/session/verifyAntiCsrfFalse', async (ctx, next) => {
      const sessionResponse = await Session.getSession(ctx, ctx, { antiCsrfCheck: false })
      ctx.body = { userId: sessionResponse.userId }
    })
    app.use(router.routes())
    server = app.listen(9999)

    const res = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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

    const response2 = await new Promise(resolve =>
      request(server)
        .post('/session/verifyAntiCsrfFalse')
        .set('Cookie', [`sAccessToken=${res.accessToken}`])
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(response2.body.userId, 'id1')

    const response = await new Promise(resolve =>
      request(server)
        .post('/session/verify')
        .set('Cookie', [`sAccessToken=${res.accessToken}`])
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(response.body.success, true)
  })

  // check revoking session(s)**
  it('test revoking express sessions', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })
    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())
    router.post('/create', async (ctx, _) => {
      await Session.createNewSession(ctx, ctx, '', {}, {})
      ctx.body = ''
    })
    router.post('/usercreate', async (ctx, _) => {
      await Session.createNewSession(ctx, ctx, 'someUniqueUserId', {}, {})
      ctx.body = ''
    })
    router.post('/session/revoke', async (ctx, _) => {
      const session = await Session.getSession(ctx, ctx, true)
      await session.revokeSession()
      ctx.body = ''
    })

    router.post('/session/revokeUserid', async (ctx, _) => {
      const session = await Session.getSession(ctx, ctx, true)
      await Session.revokeAllSessionsForUser(session.getUserId())
      ctx.body = ''
    })

    // create an api call get sesssions from a userid "id1" that returns all the sessions for that userid
    router.post('/session/getSessionsWithUserId1', async (ctx, _) => {
      const sessionHandles = await Session.getAllSessionHandlesForUser('someUniqueUserId')
      ctx.body = sessionHandles
    })
    app.use(router.routes())
    server = app.listen(9999)

    const response = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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
    const sessionRevokedResponse = await new Promise(resolve =>
      request(server)
        .post('/session/revoke')
        .set('Cookie', [`sAccessToken=${response.accessToken}`])
        .set('anti-csrf', response.antiCsrf)
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

    await new Promise(resolve =>
      request(server)
        .post('/usercreate')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    const userCreateResponse = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
          .post('/usercreate')
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(res)
          }),
      ),
    )

    await new Promise(resolve =>
      request(server)
        .post('/session/revokeUserid')
        .set('Cookie', [`sAccessToken=${userCreateResponse.accessToken}`])
        .set('anti-csrf', userCreateResponse.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    const sessionHandleResponse = await new Promise(resolve =>
      request(server)
        .post('/session/getSessionsWithUserId1')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)
          else
            resolve(res)
        }),
    )
    assert(sessionHandleResponse.body.length === 0)
  })

  // check manipulating session data
  it('test manipulating session data with express', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())
    router.post('/create', async (ctx, _) => {
      await Session.createNewSession(ctx, ctx, '', {}, {})
      ctx.body = ''
    })
    router.post('/updateSessionData', async (ctx, _) => {
      const session = await Session.getSession(ctx, ctx, true)
      await session.updateSessionData({ key: 'value' })
      ctx.body = ''
    })
    router.post('/getSessionData', async (ctx, _) => {
      const session = await Session.getSession(ctx, ctx, true)
      const sessionData = await session.getSessionData()
      ctx.body = sessionData
    })

    router.post('/updateSessionData2', async (ctx, _) => {
      const session = await Session.getSession(ctx, ctx, true)
      await session.updateSessionData(null)
      ctx.body = ''
    })

    router.post('/updateSessionDataInvalidSessionHandle', async (ctx, _) => {
      ctx.body = { success: !(await Session.updateSessionData('InvalidHandle', { key: 'value3' })) }
    })

    app.use(router.routes())
    server = app.listen(9999)

    // create a new session
    const response = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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

    // call the updateSessionData api to add session data
    await new Promise(resolve =>
      request(server)
        .post('/updateSessionData')
        .set('Cookie', [`sAccessToken=${response.accessToken}`])
        .set('anti-csrf', response.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    // call the getSessionData api to get session data
    let response2 = await new Promise(resolve =>
      request(server)
        .post('/getSessionData')
        .set('Cookie', [`sAccessToken=${response.accessToken}`])
        .set('anti-csrf', response.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    // check that the session data returned is valid
    assert.strictEqual(response2.body.key, 'value')

    // change the value of the inserted session data
    await new Promise(resolve =>
      request(server)
        .post('/updateSessionData2')
        .set('Cookie', [`sAccessToken=${response.accessToken}`])
        .set('anti-csrf', response.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    // retrieve the changed session data
    response2 = await new Promise(resolve =>
      request(server)
        .post('/getSessionData')
        .set('Cookie', [`sAccessToken=${response.accessToken}`])
        .set('anti-csrf', response.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    // check the value of the retrieved
    assert.deepStrictEqual(response2.body, {})

    // invalid session handle when updating the session data
    const invalidSessionResponse = await new Promise(resolve =>
      request(server)
        .post('/updateSessionDataInvalidSessionHandle')
        .set('Cookie', [`sAccessToken=${response.accessToken}`])
        .set('anti-csrf', response.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(invalidSessionResponse.body.success, true)
  })

  // check manipulating jwt payload
  it('test manipulating jwt payload with express', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })
    const app = new Koa()
    const router = new Router()
    app.use(KoaFramework.middleware())
    router.post('/create', async (ctx, _) => {
      await Session.createNewSession(ctx, ctx, 'user1', {}, {})
      ctx.body = ''
    })
    router.post('/updateAccessTokenPayload', async (ctx, _) => {
      const session = await Session.getSession(ctx, ctx, true)
      const accessTokenBefore = session.accessToken
      await session.updateAccessTokenPayload({ key: 'value' })
      const accessTokenAfter = session.accessToken
      const statusCode = accessTokenBefore !== accessTokenAfter && typeof accessTokenAfter === 'string' ? 200 : 500
      ctx.status = statusCode
      ctx.body = ''
    })
    router.post('/getAccessTokenPayload', async (ctx, _) => {
      const session = await Session.getSession(ctx, ctx, true)
      const jwtPayload = session.getAccessTokenPayload()
      ctx.body = jwtPayload
    })

    router.post('/updateAccessTokenPayload2', async (ctx, _) => {
      const session = await Session.getSession(ctx, ctx, true)
      await session.updateAccessTokenPayload(null)
      ctx.body = ''
    })

    router.post('/updateAccessTokenPayloadInvalidSessionHandle', async (ctx, _) => {
      ctx.body = {
        success: !(await Session.updateAccessTokenPayload('InvalidHandle', { key: 'value3' })),
      }
    })

    app.use(router.routes())
    server = app.listen(9999)

    // create a new session
    const response = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
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

    let frontendInfo = JSON.parse(new Buffer.from(response.frontToken, 'base64').toString())
    assert(frontendInfo.uid === 'user1')
    assert.deepStrictEqual(frontendInfo.up, {})

    // call the updateAccessTokenPayload api to add jwt payload
    const updatedResponse = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
          .post('/updateAccessTokenPayload')
          .set('Cookie', [`sAccessToken=${response.accessToken}`])
          .set('anti-csrf', response.antiCsrf)
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      ),
    )

    frontendInfo = JSON.parse(new Buffer.from(updatedResponse.frontToken, 'base64').toString())
    assert(frontendInfo.uid === 'user1')
    assert.deepStrictEqual(frontendInfo.up, { key: 'value' })

    // call the getAccessTokenPayload api to get jwt payload
    let response2 = await new Promise(resolve =>
      request(server)
        .post('/getAccessTokenPayload')
        .set('Cookie', [`sAccessToken=${updatedResponse.accessToken}`])
        .set('anti-csrf', response.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    // check that the jwt payload returned is valid
    assert.strictEqual(response2.body.key, 'value')

    // refresh session
    response2 = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
          .post('/auth/session/refresh')
          .set('Cookie', [`sRefreshToken=${response.refreshToken}`])
          .set('anti-csrf', response.antiCsrf)
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      ),
    )

    frontendInfo = JSON.parse(new Buffer.from(response2.frontToken, 'base64').toString())
    assert(frontendInfo.uid === 'user1')
    assert.deepStrictEqual(frontendInfo.up, { key: 'value' })

    // change the value of the inserted jwt payload
    const updatedResponse2 = extractInfoFromResponse(
      await new Promise(resolve =>
        request(server)
          .post('/updateAccessTokenPayload2')
          .set('Cookie', [`sAccessToken=${response2.accessToken}`])
          .set('anti-csrf', response2.antiCsrf)
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      ),
    )

    frontendInfo = JSON.parse(new Buffer.from(updatedResponse2.frontToken, 'base64').toString())
    assert(frontendInfo.uid === 'user1')
    assert.deepStrictEqual(frontendInfo.up, {})

    // retrieve the changed jwt payload
    response2 = await new Promise(resolve =>
      request(server)
        .post('/getAccessTokenPayload')
        .set('Cookie', [`sAccessToken=${updatedResponse2.accessToken}`])
        .set('anti-csrf', response2.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    // check the value of the retrieved
    assert.deepStrictEqual(response2.body, {})
    // invalid session handle when updating the jwt payload
    const invalidSessionResponse = await new Promise(resolve =>
      request(server)
        .post('/updateAccessTokenPayloadInvalidSessionHandle')
        .set('Cookie', [`sAccessToken=${updatedResponse2.accessToken}`])
        .set('anti-csrf', response.antiCsrf)
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(invalidSessionResponse.body.success, true)
  })

  it('sending custom response koa', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
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

    const app = new Koa()
    app.use(KoaFramework.middleware())
    server = app.listen(9999)

    const response = await new Promise(resolve =>
      request(server)
        .get('/auth/signup/email/exists?email=test@example.com')
        .expect(203)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert(response.body.custom)
  })

  it('test that authorization header is read correctly in dashboard recipe', async () => {
    await startST()
    SuperTokens.init({
      framework: 'koa',
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

    const app = new Koa()
    app.use(KoaFramework.middleware())
    server = app.listen(9999)

    const res = await new Promise(resolve =>
      request(server)
        .get('/auth/dashboard/api/users/count')
        .set('Content-Type', 'application/json')
        .set('Authorization', 'Bearer testapikey')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    assert(res.statusCode === 200)
  })

  it("test that tags request respond with correct tags", async function () {
    await startST();
    SuperTokens.init({
      framework: "koa",
      supertokens: {
        connectionURI: "http://localhost:8080",
      },
      appInfo: {
        apiDomain: "api.supertokens.io",
        appName: "SuperTokens",
        websiteDomain: "supertokens.io",
      },
      recipeList: [
        Dashboard.init({
          apiKey: "testapikey",
          override: {
            functions: (original) => {
              return {
                ...original,
                shouldAllowAccess: async function (input) {
                  let authHeader = input.req.getHeaderValue("authorization");
                  return authHeader === "Bearer testapikey";
                },
              };
            },
          },
        }),
      ],
    });

    let querier = Querier.getNewInstanceOrThrowError(undefined);
    let apiVersion = await querier.getAPIVersion();
    if (maxVersion(apiVersion, "2.19") === "2.19") {
      return this.skip();
    }

    const app = new Koa();
    app.use(KoaFramework.middleware());
    this.server = app.listen(9999);

    let res = await new Promise((resolve) =>
      request(this.server)
        .get("/auth/dashboard/api/search/tags")
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer testapikey")
        .end((err, res) => {
          if (err) {
            resolve(undefined);
          } else {
            resolve(res);
          }
        })
    );
    assert(res.statusCode === 200);
    const tags = res.body.tags;
    assert(tags.length !== 0);
  });

  it("test that search results correct output for 'email: t'", async function () {
    await startST();
    SuperTokens.init({
      framework: "koa",
      supertokens: {
        connectionURI: "http://localhost:8080",
      },
      appInfo: {
        apiDomain: "api.supertokens.io",
        appName: "SuperTokens",
        websiteDomain: "supertokens.io",
      },
      recipeList: [
        Dashboard.init({
          apiKey: "testapikey",
          override: {
            functions: (original) => {
              return {
                ...original,
                shouldAllowAccess: async function (input) {
                  let authHeader = input.req.getHeaderValue("authorization");
                  return authHeader === "Bearer testapikey";
                },
              };
            },
          },
        }),
        EmailPassword.init(),
      ],
    });

    let querier = Querier.getNewInstanceOrThrowError(undefined);
    let apiVersion = await querier.getAPIVersion();
    if (maxVersion(apiVersion, "2.19") === "2.19") {
      return this.skip();
    }

    const app = new Koa();
    app.use(KoaFramework.middleware());
    this.server = app.listen(9999);

    await createUsers(EmailPassword);

    let res = await new Promise((resolve) =>
      request(this.server)
        .get("/auth/dashboard/api/users")
        .query({
          email: "t",
          limit: 10,
        })
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer testapikey")
        .end((err, res) => {
          if (err) {
            resolve(undefined);
          } else {
            resolve(res);
          }
        })
    );
    assert(res.statusCode === 200);
    assert(res.body.users.length === 5);
  });

  it("test that search results correct output for multiple search items", async function () {
    await startST();
    SuperTokens.init({
      framework: "koa",
      supertokens: {
        connectionURI: "http://localhost:8080",
      },
      appInfo: {
        apiDomain: "api.supertokens.io",
        appName: "SuperTokens",
        websiteDomain: "supertokens.io",
      },
      recipeList: [
        Dashboard.init({
          apiKey: "testapikey",
          override: {
            functions: (original) => {
              return {
                ...original,
                shouldAllowAccess: async function (input) {
                  let authHeader = input.req.getHeaderValue("authorization");
                  return authHeader === "Bearer testapikey";
                },
              };
            },
          },
        }),
        EmailPassword.init(),
      ],
    });

    let querier = Querier.getNewInstanceOrThrowError(undefined);
    let apiVersion = await querier.getAPIVersion();
    if (maxVersion(apiVersion, "2.19") === "2.19") {
      return this.skip();
    }

    const app = new Koa();
    app.use(KoaFramework.middleware());
    this.server = app.listen(9999);

    await createUsers(EmailPassword);

    let res = await new Promise((resolve) =>
      request(this.server)
        .get("/auth/dashboard/api/users")
        .query({
          email: "iresh;john",
          limit: 10,
        })
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer testapikey")
        .end((err, res) => {
          if (err) {
            resolve(undefined);
          } else {
            resolve(res);
          }
        })
    );
    assert(res.statusCode === 200);
    assert(res.body.users.length === 1);
  });

  it("test that search results correct output for 'email: iresh'", async function () {
    await startST();
    SuperTokens.init({
      framework: "koa",
      supertokens: {
        connectionURI: "http://localhost:8080",
      },
      appInfo: {
        apiDomain: "api.supertokens.io",
        appName: "SuperTokens",
        websiteDomain: "supertokens.io",
      },
      recipeList: [
        Dashboard.init({
          apiKey: "testapikey",
          override: {
            functions: (original) => {
              return {
                ...original,
                shouldAllowAccess: async function (input) {
                  let authHeader = input.req.getHeaderValue("authorization");
                  return authHeader === "Bearer testapikey";
                },
              };
            },
          },
        }),
        EmailPassword.init(),
      ],
    });

    let querier = Querier.getNewInstanceOrThrowError(undefined);
    let apiVersion = await querier.getAPIVersion();
    if (maxVersion(apiVersion, "2.19") === "2.19") {
      return this.skip();
    }

    const app = new Koa();
    app.use(KoaFramework.middleware());
    this.server = app.listen(9999);

    await createUsers(EmailPassword);

    let res = await new Promise((resolve) =>
      request(this.server)
        .get("/auth/dashboard/api/users")
        .query({
          email: "iresh",
          limit: 10,
        })
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer testapikey")
        .end((err, res) => {
          if (err) {
            resolve(undefined);
          } else {
            resolve(res);
          }
        })
    );
    assert(res.statusCode === 200);
    assert(res.body.users.length === 0);
  });

  it("test that search results correct output for 'phone: +1'", async function () {
    await startST();
    SuperTokens.init({
      framework: "koa",
      supertokens: {
        connectionURI: "http://localhost:8080",
      },
      appInfo: {
        apiDomain: "api.supertokens.io",
        appName: "SuperTokens",
        websiteDomain: "supertokens.io",
      },
      recipeList: [
        Dashboard.init({
          apiKey: "testapikey",
          override: {
            functions: (original) => {
              return {
                ...original,
                shouldAllowAccess: async function (input) {
                  let authHeader = input.req.getHeaderValue("authorization");
                  return authHeader === "Bearer testapikey";
                },
              };
            },
          },
        }),
        Passwordless.init({
          contactMethod: "EMAIL",
          flowType: "USER_INPUT_CODE",
        }),
      ],
    });

    let querier = Querier.getNewInstanceOrThrowError(undefined);
    let apiVersion = await querier.getAPIVersion();
    if (maxVersion(apiVersion, "2.19") === "2.19") {
      return this.skip();
    }

    const app = new Koa();
    app.use(KoaFramework.middleware());
    this.server = app.listen(9999);

    await createUsers(null, Passwordless);

    let res = await new Promise((resolve) =>
      request(this.server)
        .get("/auth/dashboard/api/users")
        .query({
          phone: "+1",
          limit: 10,
        })
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer testapikey")
        .end((err, res) => {
          if (err) {
            resolve(undefined);
          } else {
            resolve(res);
          }
        })
    );
    assert(res.statusCode === 200);
    assert(res.body.users.length === 3);
  });

  it("test that search results correct output for 'phone: 1('", async function () {
    await startST();
    SuperTokens.init({
      framework: "koa",
      supertokens: {
        connectionURI: "http://localhost:8080",
      },
      appInfo: {
        apiDomain: "api.supertokens.io",
        appName: "SuperTokens",
        websiteDomain: "supertokens.io",
      },
      recipeList: [
        Dashboard.init({
          apiKey: "testapikey",
          override: {
            functions: (original) => {
              return {
                ...original,
                shouldAllowAccess: async function (input) {
                  let authHeader = input.req.getHeaderValue("authorization");
                  return authHeader === "Bearer testapikey";
                },
              };
            },
          },
        }),
        Passwordless.init({
          contactMethod: "EMAIL",
          flowType: "USER_INPUT_CODE",
        }),
      ],
    });

    let querier = Querier.getNewInstanceOrThrowError(undefined);
    let apiVersion = await querier.getAPIVersion();
    if (maxVersion(apiVersion, "2.19") === "2.19") {
      return this.skip();
    }

    const app = new Koa();
    app.use(KoaFramework.middleware());
    this.server = app.listen(9999);

    await createUsers(null, Passwordless);

    let res = await new Promise((resolve) =>
      request(this.server)
        .get("/auth/dashboard/api/users")
        .query({
          phone: "1(",
          limit: 10,
        })
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer testapikey")
        .end((err, res) => {
          if (err) {
            resolve(undefined);
          } else {
            resolve(res);
          }
        })
    );
    assert(res.statusCode === 200);
    assert(res.body.users.length === 0);
  });

  it("test that search results correct output for 'provider: google'", async function () {
    await startST();
    SuperTokens.init({
      framework: "koa",
      supertokens: {
        connectionURI: "http://localhost:8080",
      },
      appInfo: {
        apiDomain: "api.supertokens.io",
        appName: "SuperTokens",
        websiteDomain: "supertokens.io",
      },
      recipeList: [
        Dashboard.init({
          apiKey: "testapikey",
          override: {
            functions: (original) => {
              return {
                ...original,
                shouldAllowAccess: async function (input) {
                  let authHeader = input.req.getHeaderValue("authorization");
                  return authHeader === "Bearer testapikey";
                },
              };
            },
          },
        }),
        ThirdParty.init({
          signInAndUpFeature: {
            providers: [
              Google({
                clientId: "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com",
                clientSecret: "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",
              }),
              Github({
                clientId: "467101b197249757c71f",
                clientSecret: "e97051221f4b6426e8fe8d51486396703012f5bd",
              }),
              Apple({
                clientId: "4398792-io.supertokens.example.service",
                clientSecret: {
                  keyId: "7M48Y4RYDL",
                  privateKey:
                    "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                  teamId: "YWQCXGJRJL",
                },
              }),
            ],
          },
        }),
      ],
    });

    let querier = Querier.getNewInstanceOrThrowError(undefined);
    let apiVersion = await querier.getAPIVersion();
    if (maxVersion(apiVersion, "2.19") === "2.19") {
      return this.skip();
    }

    const app = new Koa();
    app.use(KoaFramework.middleware());
    this.server = app.listen(9999);

    await createUsers(null, null, ThirdParty);

    let res = await new Promise((resolve) =>
      request(this.server)
        .get("/auth/dashboard/api/users")
        .query({
          provider: "google",
          limit: 10,
        })
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer testapikey")
        .end((err, res) => {
          if (err) {
            resolve(undefined);
          } else {
            resolve(res);
          }
        })
    );
    assert(res.statusCode === 200);
    assert(res.body.users.length === 3);
  });

  it("test that search results correct output for 'provider: google, phone: 1'", async function () {
    await startST();
    SuperTokens.init({
      framework: "koa",
      supertokens: {
        connectionURI: "http://localhost:8080",
      },
      appInfo: {
        apiDomain: "api.supertokens.io",
        appName: "SuperTokens",
        websiteDomain: "supertokens.io",
      },
      recipeList: [
        Dashboard.init({
          apiKey: "testapikey",
          override: {
            functions: (original) => {
              return {
                ...original,
                shouldAllowAccess: async function (input) {
                  let authHeader = input.req.getHeaderValue("authorization");
                  return authHeader === "Bearer testapikey";
                },
              };
            },
          },
        }),
        ThirdParty.init({
          signInAndUpFeature: {
            providers: [
              Google({
                clientId: "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com",
                clientSecret: "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",
              }),
              Github({
                clientId: "467101b197249757c71f",
                clientSecret: "e97051221f4b6426e8fe8d51486396703012f5bd",
              }),
              Apple({
                clientId: "4398792-io.supertokens.example.service",
                clientSecret: {
                  keyId: "7M48Y4RYDL",
                  privateKey:
                    "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                  teamId: "YWQCXGJRJL",
                },
              }),
            ],
          },
        }),
        Passwordless.init({
          contactMethod: "EMAIL",
          flowType: "USER_INPUT_CODE",
        }),
      ],
    });

    let querier = Querier.getNewInstanceOrThrowError(undefined);
    let apiVersion = await querier.getAPIVersion();
    if (maxVersion(apiVersion, "2.19") === "2.19") {
      return this.skip();
    }

    const app = new Koa();
    app.use(KoaFramework.middleware());
    this.server = app.listen(9999);

    await createUsers(null, Passwordless, ThirdParty);

    let res = await new Promise((resolve) =>
      request(this.server)
        .get("/auth/dashboard/api/users")
        .query({
          provider: "google",
          phone: "1",
          limit: 10,
        })
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer testapikey")
        .end((err, res) => {
          if (err) {
            resolve(undefined);
          } else {
            resolve(res);
          }
        })
    );
    assert(res.statusCode === 200);
    assert(res.body.users.length === 0);
  });
  
})
