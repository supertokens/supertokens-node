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
import ThirdPartyEmailPasswordRecipe from 'supertokens-node/recipe/thirdpartyemailpassword/recipe'
import express from 'express'
import request from 'supertest'
import Session from 'supertokens-node/recipe/session'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { TypeProvider } from 'supertokens-node/recipe/thirdpartyemailpassword'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`authorisationTest: ${printPath('[test/thirdpartyemailpassword/authorisationFeature.test.js]')}`, () => {
  let customProvider1: TypeProvider
  let customProvider2: TypeProvider
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
            params: {
              scope: 'test',
              client_id: 'supertokens',
            },
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

    customProvider2 = {
      id: 'custom',
      get: (recipe, authCode) => {
        throw new Error('error from get function')
      },
      getClientId: () => {
        return 'supertokens'
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

  it('test minimum config for thirdparty module', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' }),
        ThirdPartyEmailPasswordRecipe.init({
          providers: [customProvider1],
        }),
      ],
    })

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    const response1 = await new Promise(resolve =>
      request(app)
        .get('/auth/authorisationurl?thirdPartyId=custom')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.notStrictEqual(response1, undefined)
    assert.strictEqual(response1.body.status, 'OK')
    assert.strictEqual(response1.body.url, 'https://test.com/oauth/auth?scope=test&client_id=supertokens')
  })

  // testing 500 error thrown from sub-recipe
  it('test provider get function throws error', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' }),
        ThirdPartyEmailPasswordRecipe.init({
          providers: [customProvider2],
        }),
      ],
    })

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    app.use((err, request, response, next) => {
      response.status(500).send({
        message: err.message,
      })
    })

    const response1 = await new Promise(resolve =>
      request(app)
        .get('/auth/authorisationurl?thirdPartyId=custom')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.notStrictEqual(response1, undefined)
    assert.strictEqual(response1.statusCode, 500)
    assert.deepStrictEqual(response1.body, { message: 'error from get function' })
  })

  // testing 4xx error correctly thrown from sub-recipe
  it('test thirdparty provider doesn\'t exist', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyEmailPasswordRecipe.init({
          providers: [customProvider1],
        }),
      ],
    })

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    const response1 = await new Promise(resolve =>
      request(app)
        .get('/auth/authorisationurl?thirdPartyId=google')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert.strictEqual(response1.statusCode, 400)
    assert.strictEqual(
      response1.body.message,
      'The third party provider google seems to be missing from the backend configs.',
    )
  })
})
