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
import { afterAll, beforeAll, describe, it } from 'vitest'
import { ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node/index'
import { middleware } from 'supertokens-node/framework/express'
import EmailPassword from 'supertokens-node/recipe/emailpassword'
import { testApiHandler } from 'next-test-api-route-handler'
import { verifySession } from 'supertokens-node/recipe/session/framework/express'
import Session from 'supertokens-node/recipe/session'
import { superTokensNextWrapper } from 'supertokens-node/nextjs'
import ThirdPartyEmailPassword from 'supertokens-node/recipe/thirdpartyemailpassword'
import { cleanST, killAllST, printPath, setupST, startST } from './utils'

let wrapperErr: any

async function nextApiHandlerWithMiddleware(req: any, res: any) {
  try {
    await superTokensNextWrapper(
      async (next) => {
        await middleware()(req, res, next)
      },
      req,
      res,
    )
  }
  catch (err) {
    wrapperErr = err
    throw err
  }
  if (!res.writableEnded)
    res.status(404).send('Not found')
}

async function nextApiHandlerWithVerifySession(req: any, res: any) {
  await superTokensNextWrapper(
    async (next) => {
      await verifySession()(req, res, next)

      if (req.session) {
        res.status(200).send({
          status: 'OK',
          userId: req.session.getUserId(),
        })
      }
    },
    req,
    res,
  )
  if (!res.writableEnded)
    res.status(404).send('Not found')
}

describe(`NextJS Middleware Test: ${printPath('[test/nextjs.test.js]')}`, () => {
  describe('with superTokensNextWrapper', () => {
    beforeAll(async () => {
      process.env.user = undefined
      await killAllST()
      await setupST()
      await startST()

      ProcessState.getInstance().reset()
      SuperTokens.init({
        supertokens: {
          connectionURI: 'http://localhost:8080',
        },
        appInfo: {
          apiDomain: 'api.supertokens.io',
          appName: 'SuperTokens',
          apiBasePath: '/api/auth',
          websiteDomain: 'supertokens.io',
        },
        recipeList: [
          EmailPassword.init(),
          Session.init({
            override: {
              functions: (oI) => {
                return {
                  ...oI,
                  createNewSession: async (input) => {
                    const response = await oI.createNewSession(input)
                    process.env.user = response.getUserId()
                    return response
                  },
                }
              },
            },
          }),
        ],
      })
    })

    afterAll(async () => {
      await killAllST()
      await cleanST()
    })

    it('Sign Up', async () => {
      console.log('Sign Up')
      await testApiHandler({
        handler: nextApiHandlerWithMiddleware,
        url: '/api/auth/signup/',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              rid: 'emailpassword',
            },
            body: JSON.stringify({
              formFields: [
                {
                  id: 'email',
                  value: 'john.doe@supertokens.io',
                },
                {
                  id: 'password',
                  value: 'P@sSW0rd',
                },
              ],
            }),
          })
          const respJson = await res.json()
          assert.deepStrictEqual(respJson.status, 'OK')
          assert.deepStrictEqual(respJson.user.email, 'john.doe@supertokens.io')
          assert.strictEqual(respJson.user.id, process.env.user)
          assert.notStrictEqual(res.headers.get('front-token'), undefined)
          const tokens = getSessionTokensFromResponse(res)
          assert.notEqual(tokens.access, undefined)
          assert.notEqual(tokens.refresh, undefined)
        },
      })
    })
    return
    it('Sign In', async () => {
      let tokens: any
      await testApiHandler({
        handler: nextApiHandlerWithMiddleware,
        url: '/api/auth/signin/',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              rid: 'emailpassword',
            },
            body: JSON.stringify({
              formFields: [
                {
                  id: 'email',
                  value: 'john.doe@supertokens.io',
                },
                {
                  id: 'password',
                  value: 'P@sSW0rd',
                },
              ],
            }),
          })
          const respJson = await res.json()

          assert.deepStrictEqual(respJson.status, 'OK')
          assert.deepStrictEqual(respJson.user.email, 'john.doe@supertokens.io')
          assert(res.headers.get('front-token') !== undefined)
          tokens = getSessionTokensFromResponse(res)
          assert.notEqual(tokens.access, undefined)
          assert.notEqual(tokens.refresh, undefined)
        },
      })
      // Verify if session exists next middleware tests:

      assert.notStrictEqual(tokens, undefined)

      // Case 1: Successful => add session to request object.
      await testApiHandler({
        handler: nextApiHandlerWithVerifySession,
        url: '/api/user/',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              rid: 'emailpassword',
              authorization: `Bearer ${tokens.access}`,

            },
            body: JSON.stringify({
              formFields: [
                {
                  id: 'email',
                  value: 'john.doe@supertokens.io',
                },
                {
                  id: 'password',
                  value: 'P@sSW0rd',
                },
              ],
            }),
          })
          assert.strictEqual(res.status, 200)
          const respJson = await res.json()
          assert.strictEqual(respJson.status, 'OK')
          assert.strictEqual(respJson.userId, process.env.user)
        },
      })

      // Case 2: Unauthenticated => return 401.
      await testApiHandler({
        handler: nextApiHandlerWithVerifySession,
        url: '/api/user/',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              rid: 'emailpassword',
            },
            body: JSON.stringify({
              formFields: [
                {
                  id: 'email',
                  value: 'john.doe@supertokens.io',
                },
                {
                  id: 'password',
                  value: 'P@sSW0rd',
                },
              ],
            }),
          })
          assert.strictEqual(res.status, 401)
          const respJson = await res.json()
          assert.strictEqual(respJson.message, 'unauthorised')
        },
      })
    })

    it('Reset Password - Send Email', async () => {
      await testApiHandler({
        handler: nextApiHandlerWithMiddleware,
        url: '/api/auth/user/password/reset/token',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              rid: 'emailpassword',
            },
            body: JSON.stringify({
              formFields: [
                {
                  id: 'email',
                  value: 'john.doe@supertokens.io',
                },
              ],
            }),
          })
          const respJson = await res.json()

          assert.deepStrictEqual(respJson.status, 'OK')
        },
      })
    })

    it('Reset Password - Create new password', async () => {
      await testApiHandler({
        handler: nextApiHandlerWithMiddleware,
        url: '/api/auth/user/password/reset/',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              rid: 'emailpassword',
            },
            body: JSON.stringify({
              formFields: [
                {
                  id: 'password',
                  value: 'NewP@sSW0rd',
                },
              ],
              token: 'RandomToken',
            }),
          })
          const respJson = await res.json()

          assert.deepStrictEqual(respJson.status, 'RESET_PASSWORD_INVALID_TOKEN_ERROR')
        },
      })
    })

    it('does Email Exist with existing email', async () => {
      await testApiHandler({
        handler: nextApiHandlerWithMiddleware,
        url: '/api/auth/signup/email/exists',
        params: {
          email: 'john.doe@supertokens.io',
        },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            headers: {
              rid: 'emailpassword',
            },
          })
          const respJson = await res.json()

          assert.deepStrictEqual(respJson, { status: 'OK', exists: true })
        },
      })
    })

    it('does Email Exist with unknown email', async () => {
      await testApiHandler({
        handler: nextApiHandlerWithMiddleware,
        url: '/api/auth/signup/email/exists',
        params: {
          email: 'unknown@supertokens.io',
        },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            headers: {
              rid: 'emailpassword',
            },
          })
          const respJson = await res.json()

          assert.deepStrictEqual(respJson, { status: 'OK', exists: false })
        },
      })
    })

    it('Verify session successfully when session is present (check if it continues after)', (done: Function) => {
      testApiHandler({
        handler: async (request: any, response: any) => {
          await superTokensNextWrapper(
            async (next) => {
              await verifySession()(request, response, next)
            },
            request,
            response,
          ).then(() => {
            return done(new Error('not come here'))
          })
        },
        url: '/api/auth/user/info',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
            headers: {
              rid: 'emailpassword',
            },
            query: {
              email: 'john.doe@supertokens.io',
            },
          })
          assert.strictEqual(res.status, 401)
          done()
        },
      })
    })

    it('Create new session', async () => {
      await testApiHandler({
        handler: async (request, response) => {
          const session = await superTokensNextWrapper(
            async () => {
              return await Session.createNewSession(request, response, '1', {}, {})
            },
            request,
            response,
          )
          response.status(200).send({
            status: 'OK',
            userId: session.getUserId(),
          })
        },
        url: '/api/auth/user/info',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET',
          })
          assert.strictEqual(res.status, 200)
          assert.deepStrictEqual(await res.json(), {
            status: 'OK',
            userId: '1',
          })
        },
      })
    })
  })
  return
  describe('with superTokensNextWrapper (__supertokensFromNextJS flag test)', () => {
    beforeAll(async () => {
      process.env.user = undefined
      await killAllST()
      await setupST()
      await startST()
      ProcessState.getInstance().reset()
      SuperTokens.init({
        supertokens: {
          connectionURI: 'http://localhost:8080',
        },
        appInfo: {
          apiDomain: 'api.supertokens.io',
          appName: 'SuperTokens',
          apiBasePath: '/api/auth',
          websiteDomain: 'supertokens.io',
        },
        recipeList: [
          EmailPassword.init({
            override: {
              apis: (oI) => {
                return {
                  ...oI,
                  passwordResetPOST: async (input) => {
                    return {
                      status: 'CUSTOM_RESPONSE',
                      nextJS: input.options.req.original.__supertokensFromNextJS,
                    }
                  },
                }
              },
            },
          }),
          ThirdPartyEmailPassword.init({
            providers: [
              ThirdPartyEmailPassword.Apple({
                isDefault: true,
                clientId: '4398792-io.supertokens.example.service',
                clientSecret: {
                  keyId: '7M48Y4RYDL',
                  privateKey:
                                        '-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----',
                  teamId: 'YWQCXGJRJL',
                },
              }),
            ],
          }),
          Session.init({
            getTokenTransferMethod: () => 'cookie',
          }),
        ],
      })
    })

    afterAll(async () => {
      await killAllST()
      await cleanST()
    })

    it('testing __supertokensFromNextJS flag', async () => {
      await testApiHandler({
        handler: nextApiHandlerWithMiddleware,
        url: '/api/auth/user/password/reset',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              rid: 'emailpassword',
            },
            body: JSON.stringify({
              token: 'hello',
              formFields: [
                {
                  id: 'password',
                  value: 'NewP@sSW0rd',
                },
              ],
            }),
          })
          const resJson = await res.json()

          assert.deepStrictEqual(resJson.status, 'CUSTOM_RESPONSE')
          assert.deepStrictEqual(resJson.nextJS, true)
        },
      })
    })

    it('testing __supertokensFromNextJS flag, apple redirect', async () => {
      await testApiHandler({
        handler: nextApiHandlerWithMiddleware,
        url: '/api/auth/callback/apple',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              'rid': 'thirdpartyemailpassword',
              'content-type': 'application/x-www-form-urlencoded',
            },
            body: 'state=hello&code=testing',
          })
          const expected = '<html><head><script>window.location.replace("https://supertokens.io/auth/callback/apple?state=hello&code=testing");</script></head></html>'
          const respText = await res.text()
          assert.strictEqual(respText, expected)
        },
      })
    })
  })

  describe('with superTokensNextWrapper, overriding throws error', () => {
    beforeAll(async () => {
      process.env.user = undefined
      await killAllST()
      await setupST()
      await startST()
      ProcessState.getInstance().reset()
      SuperTokens.init({
        supertokens: {
          connectionURI: 'http://localhost:8080',
        },
        appInfo: {
          apiDomain: 'api.supertokens.io',
          appName: 'SuperTokens',
          apiBasePath: '/api/auth',
          websiteDomain: 'supertokens.io',
        },
        recipeList: [
          EmailPassword.init(),
          Session.init({
            getTokenTransferMethod: () => 'cookie',
            override: {
              functions: (oI) => {
                return {
                  ...oI,
                  createNewSession: async (input) => {
                    const response = await oI.createNewSession(input)
                    process.env.user = response.getUserId()
                    // TODO: @productdevbook iam change this to throw error is true ?
                    // throw {
                    //   error: 'sign up error',
                    // }
                    throw new Error('sign up error')
                  },
                }
              },
            },
          }),
        ],
      })
    })

    afterAll(async () => {
      await killAllST()
      await cleanST()
    })

    it('Sign Up', async () => {
      await testApiHandler({
        handler: nextApiHandlerWithMiddleware,
        url: '/api/auth/signup/',
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              rid: 'emailpassword',
            },
            body: JSON.stringify({
              formFields: [
                {
                  id: 'email',
                  value: 'john.doe2@supertokens.io',
                },
                {
                  id: 'password',
                  value: 'P@sSW0rd',
                },
              ],
            }),
          })
          const respJson = await res.text()
          assert.strictEqual(res.status, 500)
          assert.strictEqual(respJson, 'Internal Server Error')
        },
      })
      assert.deepStrictEqual(wrapperErr, { error: 'sign up error' })
    })
  })
})

function getSessionTokensFromResponse(response: any) {
  return {
    access: response.headers.get('st-access-token'),
    refresh: response.headers.get('st-refresh-token'),
  }
}
