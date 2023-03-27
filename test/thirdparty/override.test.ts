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
import Session from 'supertokens-node/recipe/session'
import { ProcessState } from 'supertokens-node/processState'
import ThirdParty, { TypeProvider } from 'supertokens-node/recipe/thirdparty'
import express from 'express'
import request from 'supertest'
import nock from 'nock'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`overrideTest: ${printPath('[test/thirdparty/override.test.js]')}`, () => {
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

  it('overriding functions tests', async () => {
    await startST()
    let user
    let newUser
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
        ThirdParty.init({
          signInAndUpFeature: {
            providers: [customProvider1],
          },
          override: {
            functions: (oI) => {
              return {
                ...oI,
                signInUp: async (input) => {
                  const response = await oI.signInUp(input)
                  user = response.user
                  newUser = response.createdNewUser
                  return response
                },
                getUserById: async (input) => {
                  const response = await oI.getUserById(input)
                  user = response
                  return response
                },
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

    nock('https://test.com').post('/oauth/token').times(2).reply(200, {})

    app.get('/user', async (req, res) => {
      const userId = req.query.userId
      res.json(await ThirdParty.getUserById(userId))
    })

    const signUpResponse = await new Promise(resolve =>
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
            resolve(res.body)
        }),
    )

    assert.notStrictEqual(user, undefined)
    assert.strictEqual(newUser, true)
    assert.deepStrictEqual(signUpResponse.user, user)

    user = undefined
    assert.strictEqual(user, undefined)

    const signInResponse = await new Promise(resolve =>
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
            resolve(res.body)
        }),
    )

    assert.notStrictEqual(user, undefined)
    assert.strictEqual(newUser, false)
    assert.deepStrictEqual(signInResponse.user, user)

    user = undefined
    assert.strictEqual(user, undefined)

    const userByIdResponse = await new Promise(resolve =>
      request(app)
        .get('/user')
        .query({
          userId: signInResponse.user.id,
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        }),
    )

    assert.notStrictEqual(user, undefined)
    assert.deepStrictEqual(userByIdResponse, user)
  })

  it('overriding api tests', async () => {
    await startST()
    let user
    let newUser
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
        ThirdParty.init({
          signInAndUpFeature: {
            providers: [customProvider1],
          },
          override: {
            apis: (oI) => {
              return {
                ...oI,
                signInUpPOST: async (input) => {
                  const response = await oI.signInUpPOST(input)
                  if (response.status === 'OK') {
                    user = response.user
                    newUser = response.createdNewUser
                  }
                  return response
                },
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

    app.get('/user', async (req, res) => {
      const userId = req.query.userId
      res.json(await ThirdParty.getUserById(userId))
    })

    nock('https://test.com').post('/oauth/token').times(2).reply(200, {})

    const signUpResponse = await new Promise(resolve =>
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
            resolve(res.body)
        }),
    )

    assert.notStrictEqual(user, undefined)
    assert.strictEqual(newUser, true)
    assert.deepStrictEqual(signUpResponse.user, user)

    user = undefined
    assert.strictEqual(user, undefined)

    const signInResponse = await new Promise(resolve =>
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
            resolve(res.body)
        }),
    )

    assert.notStrictEqual(user, undefined)
    assert.strictEqual(newUser, false)
    assert.deepStrictEqual(signInResponse.user, user)
  })

  it('overriding functions tests, throws error', async () => {
    await startST()
    let user
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
        ThirdParty.init({
          signInAndUpFeature: {
            providers: [customProvider1],
          },
          override: {
            functions: (oI) => {
              return {
                ...oI,
                signInUp: async (input) => {
                  const response = await oI.signInUp(input)
                  user = response.user
                  const newUser = response.createdNewUser
                  if (newUser) {
                    throw {
                      error: 'signup error',
                    }
                  }
                  throw {
                    error: 'signin error',
                  }
                },
                getUserById: async (input) => {
                  await oI.getUserById(input)
                  throw {
                    error: 'get user error',
                  }
                },
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

    app.get('/user', async (req, res, next) => {
      try {
        const userId = req.query.userId
        res.json(await ThirdParty.getUserById(userId))
      }
      catch (err) {
        next(err)
      }
    })

    nock('https://test.com').post('/oauth/token').times(2).reply(200, {})

    app.use((err, req, res, next) => {
      res.json({
        ...err,
        customError: true,
      })
    })

    const signUpResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup')
        .send({
          thirdPartyId: 'custom',
          code: 'abcdefghj',
          redirectURI: 'http://127.0.0.1/callback',
        })
        .end((err, res) => {
          if (err)
            resolve(err.response.body)

          else
            resolve(res.body)
        }),
    )

    assert.notStrictEqual(user, undefined)
    assert.deepStrictEqual(signUpResponse, { error: 'signup error', customError: true })

    const signInResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup')
        .send({
          thirdPartyId: 'custom',
          code: 'abcdefghj',
          redirectURI: 'http://127.0.0.1/callback',
        })
        .end((err, res) => {
          if (err)
            resolve(err.response.body)

          else
            resolve(res.body)
        }),
    )

    assert.deepStrictEqual(signInResponse, { error: 'signin error', customError: true })

    const userByIdResponse = await new Promise(resolve =>
      request(app)
        .get('/user')
        .query({
          userId: user.id,
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(err.response.body)

          else
            resolve(res.body)
        }),
    )

    assert.deepStrictEqual(userByIdResponse, { error: 'get user error', customError: true })
  })

  it('overriding api tests, throws error', async () => {
    await startST()
    let user
    let newUser
    const emailExists = undefined
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
        ThirdParty.init({
          signInAndUpFeature: {
            providers: [customProvider1],
          },
          override: {
            apis: (oI) => {
              return {
                ...oI,
                signInUpPOST: async (input) => {
                  const response = await oI.signInUpPOST(input)
                  user = response.user
                  const newUser = response.createdNewUser
                  if (newUser) {
                    throw {
                      error: 'signup error',
                    }
                  }
                  throw {
                    error: 'signin error',
                  }
                },
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

    nock('https://test.com').post('/oauth/token').times(2).reply(200, {})

    app.use((err, req, res, next) => {
      res.json({
        ...err,
        customError: true,
      })
    })

    const signUpResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup')
        .send({
          thirdPartyId: 'custom',
          code: 'abcdefghj',
          redirectURI: 'http://127.0.0.1/callback',
        })
        .end((err, res) => {
          if (err)
            resolve(err.response.body)

          else
            resolve(res.body)
        }),
    )

    assert.notStrictEqual(user, undefined)
    assert.strictEqual(newUser, true)
    assert.deepStrictEqual(signUpResponse, { error: 'signup error', customError: true })

    const signInResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup')
        .send({
          thirdPartyId: 'custom',
          code: 'abcdefghj',
          redirectURI: 'http://127.0.0.1/callback',
        })
        .end((err, res) => {
          if (err)
            resolve(err.response.body)

          else
            resolve(res.body)
        }),
    )

    assert.strictEqual(newUser, false)
    assert.deepStrictEqual(signInResponse, { error: 'signin error', customError: true })
  })
})
