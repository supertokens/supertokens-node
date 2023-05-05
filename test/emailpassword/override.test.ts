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
import EmailPassword from 'supertokens-node/recipe/emailpassword'
import express from 'express'
import request from 'supertest'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, signUPRequest, startST } from '../utils'

describe(`overrideTest: ${printPath('[test/emailpassword/override.test.ts]')}`, () => {
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
        EmailPassword.init({
          override: {
            functions: (oI) => {
              return {
                ...oI,
                signUp: async (input) => {
                  const response = await oI.signUp(input)
                  if (response.status === 'OK')
                    user = response.user

                  return response
                },
                signIn: async (input) => {
                  const response = await oI.signIn(input)
                  if (response.status === 'OK')
                    user = response.user

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

    app.get('/user', async (req, res) => {
      const userId = req.query.userId
      res.json(await EmailPassword.getUserById(userId))
    })

    const signUpResponse = await signUPRequest(app, 'user@test.com', 'test123!')

    assert.notStrictEqual(user, undefined)
    assert.deepStrictEqual(signUpResponse.body.user, user)

    user = undefined
    assert.strictEqual(user, undefined)

    const signInResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signin')
        .send({
          formFields: [
            {
              id: 'password',
              value: 'test123!',
            },
            {
              id: 'email',
              value: 'user@test.com',
            },
          ],
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
    let emailExists
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
        EmailPassword.init({
          override: {
            apis: (oI) => {
              return {
                ...oI,
                signUpPOST: async (input) => {
                  const response = await oI.signUpPOST(input)
                  if (response.status === 'OK')
                    user = response.user

                  return response
                },
                signInPOST: async (input) => {
                  const response = await oI.signInPOST(input)
                  if (response.status === 'OK')
                    user = response.user

                  return response
                },
                emailExistsGET: async (input) => {
                  const response = await oI.emailExistsGET(input)
                  emailExists = response.exists
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
      res.json(await EmailPassword.getUserById(userId))
    })

    let emailExistsResponse = await new Promise(resolve =>
      request(app)
        .get('/auth/signup/email/exists')
        .query({
          email: 'user@test.com',
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        }),
    )
    assert.strictEqual(emailExistsResponse.exists, false)
    assert.strictEqual(emailExists, false)
    const signUpResponse = await signUPRequest(app, 'user@test.com', 'test123!')

    assert.notStrictEqual(user, undefined)
    assert.deepStrictEqual(signUpResponse.body.user, user)

    emailExistsResponse = await new Promise(resolve =>
      request(app)
        .get('/auth/signup/email/exists')
        .query({
          email: 'user@test.com',
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        }),
    )
    assert.strictEqual(emailExistsResponse.exists, true)
    assert.strictEqual(emailExists, true)

    user = undefined
    assert.strictEqual(user, undefined)

    const signInResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signin')
        .send({
          formFields: [
            {
              id: 'password',
              value: 'test123!',
            },
            {
              id: 'email',
              value: 'user@test.com',
            },
          ],
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
        EmailPassword.init({
          override: {
            functions: (oI) => {
              return {
                ...oI,
                signUp: async (input) => {
                  const response = await oI.signUp(input)
                  user = response.user
                  throw {
                    error: 'signup error',
                  }
                },
                signIn: async (input) => {
                  await oI.signIn(input)
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
        res.json(await EmailPassword.getUserById(userId))
      }
      catch (err) {
        next(err)
      }
    })

    app.use((err, req, res, next) => {
      res.json({
        ...err,
        customError: true,
      })
    })

    const signUpResponse = await signUPRequest(app, 'user@test.com', 'test123!')

    assert.notStrictEqual(user, undefined)
    assert.deepStrictEqual(signUpResponse.body, { error: 'signup error', customError: true })

    const signInResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signin')
        .send({
          formFields: [
            {
              id: 'password',
              value: 'test123!',
            },
            {
              id: 'email',
              value: 'user@test.com',
            },
          ],
        })
        .expect(200)
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
    let emailExists
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
        EmailPassword.init({
          override: {
            apis: (oI) => {
              return {
                ...oI,
                signUpPOST: async (input) => {
                  const response = await oI.signUpPOST(input)
                  user = response.user
                  throw {
                    error: 'signup error',
                  }
                },
                signInPOST: async (input) => {
                  await oI.signInPOST(input)
                  throw {
                    error: 'signin error',
                  }
                },
                emailExistsGET: async (input) => {
                  const response = await oI.emailExistsGET(input)
                  emailExists = response.exists
                  throw {
                    error: 'email exists error',
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

    app.get('/user', async (req, res) => {
      const userId = req.query.userId
      res.json(await EmailPassword.getUserById(userId))
    })

    app.use((err, req, res, next) => {
      res.json({
        ...err,
        customError: true,
      })
    })

    let emailExistsResponse = await new Promise(resolve =>
      request(app)
        .get('/auth/signup/email/exists')
        .query({
          email: 'user@test.com',
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(err.response.body)

          else
            resolve(res.body)
        }),
    )
    assert.deepStrictEqual(emailExistsResponse, { error: 'email exists error', customError: true })
    assert.strictEqual(emailExists, false)
    const signUpResponse = await signUPRequest(app, 'user@test.com', 'test123!')

    assert.notStrictEqual(user, undefined)
    assert.deepStrictEqual(signUpResponse.body, { error: 'signup error', customError: true })

    emailExistsResponse = await new Promise(resolve =>
      request(app)
        .get('/auth/signup/email/exists')
        .query({
          email: 'user@test.com',
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        }),
    )
    assert.deepStrictEqual(emailExistsResponse, { error: 'email exists error', customError: true })
    assert.strictEqual(emailExists, true)

    const signInResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signin')
        .send({
          formFields: [
            {
              id: 'password',
              value: 'test123!',
            },
            {
              id: 'email',
              value: 'user@test.com',
            },
          ],
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        }),
    )

    assert.deepStrictEqual(signInResponse, { error: 'signin error', customError: true })
  })
})
