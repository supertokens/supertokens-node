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
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import ThirPartyRecipe from 'supertokens-node/recipe/thirdparty/recipe'
import nock from 'nock'
import express from 'express'
import request from 'supertest'
import Session from 'supertokens-node/recipe/session'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { TypeProvider } from 'supertokens-node/recipe/thirdparty'
import {
  cleanST,
  extractInfoFromResponse,
  killAllST,
  printPath,
  setKeyValueInConfig,
  setupST,
  startST,
} from '../utils'

describe(`signoutTest: ${printPath('[test/thirdparty/signoutFeature.test.ts]')}`, () => {
  let customProvider1: TypeProvider
  beforeAll(() => {
    customProvider1 = {
      id: 'custom',
      get: (recipe, authCode) => {
        return {
          accessTokenAPI: {
            url: 'https://test.com/oauth/token',
          },
          authorisationRedirect: {
            url: 'https://test.com/oauth/auth',
          },
          getProfileInfo: async (authCodeResponse) => {
            return {
              id: 'user',
              email: {
                id: 'email@test.com',
                isVerified: true,
              },
            }
          },
          getClientId: () => {
            return 'supertokens'
          },
        }
      },
    }
  })
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('test the default route and it should revoke the session', async () => {
    await startST()

    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        ThirPartyRecipe.init({
          signInAndUpFeature: {
            providers: [customProvider1],
          },
        }),
        Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' }),
      ],
    })

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    nock('https://test.com').post('/oauth/token').reply(200, {})

    const response1 = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup')
        .send({
          thirdPartyId: 'custom',
          code: 'abcdefghj',
          redirectURI: 'http://127.0.0.1/callback',
        })
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(response1.body.status, 'OK')
    assert.strictEqual(response1.statusCode, 200)

    const res = extractInfoFromResponse(response1)

    const response2 = extractInfoFromResponse(
      await new Promise(resolve =>
        request(app)
          .post('/auth/signout')
          .set('Cookie', [`sAccessToken=${res.accessToken}`])
          .set('anti-csrf', res.antiCsrf)
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      ),
    )
    assert.strictEqual(response2.antiCsrf, undefined)
    assert.strictEqual(response2.accessToken, '')
    assert.strictEqual(response2.refreshToken, '')
    assert.strictEqual(response2.accessTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert.strictEqual(response2.refreshTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert.strictEqual(response2.accessTokenDomain, undefined)
    assert.strictEqual(response2.refreshTokenDomain, undefined)
    assert.strictEqual(response2.frontToken, 'remove')
  })

  it('test that disabling default route and calling the API returns 404', async () => {
    await startST()

    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        ThirPartyRecipe.init({
          signInAndUpFeature: {
            providers: [customProvider1],
          },
          override: {
            apis: (oI) => {
              return {
                ...oI,
                signOutPOST: undefined,
              }
            },
          },
        }),
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
      ],
    })

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    const response = await new Promise(resolve =>
      request(app)
        .post('/auth/signout')
        .set('rid', 'thirdparty')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(response.statusCode, 404)
  })

  it('test that calling the API without a session should return OK', async () => {
    await startST()

    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        ThirPartyRecipe.init({
          signInAndUpFeature: {
            providers: [customProvider1],
          },
        }),
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
      ],
    })

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    const response = await new Promise(resolve =>
      request(app)
        .post('/auth/signout')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(response.body.status, 'OK')
    assert.strictEqual(response.status, 200)
    assert.strictEqual(response.header['set-cookie'], undefined)
  })

  it('test that signout API reutrns try refresh token, refresh session and signout should return OK', async () => {
    await setKeyValueInConfig('access_token_validity', 2)

    await startST()

    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        ThirPartyRecipe.init({
          signInAndUpFeature: {
            providers: [customProvider1],
          },
        }),
        Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' }),
      ],
    })

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    nock('https://test.com').post('/oauth/token').reply(200, {})

    const response1 = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup')
        .send({
          thirdPartyId: 'custom',
          code: 'abcdefghj',
          redirectURI: 'http://127.0.0.1/callback',
        })
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(response1.body.status, 'OK')
    assert.strictEqual(response1.statusCode, 200)

    const res = extractInfoFromResponse(response1)

    await new Promise(r => setTimeout(r, 5000))

    let signOutResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signout')
        .set('rid', 'session')
        .set('Cookie', [`sAccessToken=${res.accessToken}`])
        .set('anti-csrf', res.antiCsrf)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(signOutResponse.status, 401)
    assert.strictEqual(signOutResponse.body.message, 'try refresh token')

    const refreshedResponse = extractInfoFromResponse(
      await new Promise(resolve =>
        request(app)
          .post('/auth/session/refresh')
          .expect(200)
          .set('rid', 'session')
          .set('Cookie', [`sRefreshToken=${res.refreshToken}`])
          .set('anti-csrf', res.antiCsrf)
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      ),
    )

    signOutResponse = extractInfoFromResponse(
      await new Promise(resolve =>
        request(app)
          .post('/auth/signout')
          .set('rid', 'session')
          .set('Cookie', [`sAccessToken=${refreshedResponse.accessToken}`])
          .set('anti-csrf', refreshedResponse.antiCsrf)
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      ),
    )

    assert.strictEqual(signOutResponse.antiCsrf, undefined)
    assert.strictEqual(signOutResponse.accessToken, '')
    assert.strictEqual(signOutResponse.refreshToken, '')
    assert.strictEqual(signOutResponse.accessTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert.strictEqual(signOutResponse.refreshTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert.strictEqual(signOutResponse.accessTokenDomain, undefined)
    assert.strictEqual(signOutResponse.refreshTokenDomain, undefined)
  })
})
