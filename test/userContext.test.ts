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
import express from 'express'
import request from 'supertest'
import { ProcessState } from 'supertokens-node/processState'
import Session from 'supertokens-node/recipe/session'
import EmailPassword from 'supertokens-node/recipe/emailpassword'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import STExpress from 'supertokens-node'
import {
  cleanST,
  killAllST,
  printPath,
  setupST,
  startST,
} from './utils'

describe(`userContext: ${printPath('[test/userContext.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('testing context across interface and recipe function', async () => {
    await startST()
    let works = false
    let signUpContextWorks = false
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
                async signUp(input) {
                  if (input.userContext.manualCall)
                    signUpContextWorks = true

                  return oI.signUp(input)
                },
                async signIn(input) {
                  if (input.userContext.preSignInPOST)
                    input.userContext.preSignIn = true

                  const resp = await oI.signIn(input)

                  if (input.userContext.preSignInPOST && input.userContext.preSignIn)
                    input.userContext.postSignIn = true

                  return resp
                },
              }
            },
            apis: (oI) => {
              return {
                ...oI,
                async signInPOST(input) {
                  input.userContext = {
                    preSignInPOST: true,
                  }

                  const resp = await oI.signInPOST(input)

                  if (
                    input.userContext.preSignInPOST
                                        && input.userContext.preSignIn
                                        && input.userContext.preCreateNewSession
                                        && input.userContext.postCreateNewSession
                                        && input.userContext.postSignIn
                  )
                    works = true

                  return resp
                },
              }
            },
          },
        }),
        Session.init({
          getTokenTransferMethod: () => 'cookie',
          override: {
            functions: (oI) => {
              return {
                ...oI,
                async createNewSession(input) {
                  if (
                    input.userContext.preSignInPOST
                                        && input.userContext.preSignIn
                                        && input.userContext.postSignIn
                  )
                    input.userContext.preCreateNewSession = true

                  const resp = oI.createNewSession(input)

                  if (
                    input.userContext.preSignInPOST
                                        && input.userContext.preSignIn
                                        && input.userContext.preCreateNewSession
                                        && input.userContext.postSignIn
                  )
                    input.userContext.postCreateNewSession = true

                  return resp
                },
              }
            },
          },
        }),
      ],
    })

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    await EmailPassword.signUp('random@gmail.com', 'validpass123', {
      manualCall: true,
    })

    const response = await new Promise(resolve =>
      request(app)
        .post('/auth/signin')
        .send({
          formFields: [
            {
              id: 'password',
              value: 'validpass123',
            },
            {
              id: 'email',
              value: 'random@gmail.com',
            },
          ],
        })
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert(response.status === 200)
    assert(works && signUpContextWorks)
  })

  it('testing default context across interface and recipe function', async () => {
    await startST()
    let signInContextWorks = false
    let signInAPIContextWorks = false
    let createNewSessionContextWorks = false

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
                async signIn(input) {
                  if (input.userContext._default && input.userContext._default.request)
                    signInContextWorks = true

                  return await oI.signIn(input)
                },
              }
            },
            apis: (oI) => {
              return {
                ...oI,
                async signInPOST(input) {
                  if (input.userContext._default && input.userContext._default.request)
                    signInAPIContextWorks = true

                  return await oI.signInPOST(input)
                },
              }
            },
          },
        }),
        Session.init({
          getTokenTransferMethod: () => 'cookie',
          override: {
            functions: (oI) => {
              return {
                ...oI,
                async createNewSession(input) {
                  if (input.userContext._default && input.userContext._default.request)
                    createNewSessionContextWorks = true

                  return await oI.createNewSession(input)
                },
              }
            },
          },
        }),
      ],
    })

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    await EmailPassword.signUp('random@gmail.com', 'validpass123', {
      manualCall: true,
    })

    const response = await new Promise(resolve =>
      request(app)
        .post('/auth/signin')
        .send({
          formFields: [
            {
              id: 'password',
              value: 'validpass123',
            },
            {
              id: 'email',
              value: 'random@gmail.com',
            },
          ],
        })
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert(response.status === 200)
    assert(signInContextWorks && signInAPIContextWorks && createNewSessionContextWorks)
  })
})
