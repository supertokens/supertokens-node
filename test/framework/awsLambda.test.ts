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
import { ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import { middleware } from 'supertokens-node/framework/awsLambda'
import Session from 'supertokens-node/recipe/session'
import EmailPassword from 'supertokens-node/recipe/emailpassword'
import { verifySession } from 'supertokens-node/recipe/session/framework/awsLambda'
import Dashboard from 'supertokens-node/recipe/dashboard'
import { afterAll, beforeEach, describe, it } from 'vitest'
import {
  cleanST,
  extractInfoFromResponse,
  killAllST,
  mockLambdaProxyEvent,
  mockLambdaProxyEventV2,
  printPath,
  setupST,
  startST,
} from '../utils'

describe(`AWS Lambda: ${printPath('[test/framework/awsLambda.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  // check basic usage of session
  it('test basic usage of sessions for lambda proxy event v1', async () => {
    await startST()
    SuperTokens.init({
      framework: 'awsLambda',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
        apiGatewayPath: '/dev',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const createSession = async (awsEvent, _) => {
      await Session.createNewSession(awsEvent, awsEvent, 'userId', {}, {})
      return {
        body: JSON.stringify(''),
        statusCode: 200,
      }
    }

    const verifyLambdaSession = async (awsEvent, _) => {
      return {
        body: JSON.stringify({
          user: awsEvent.session.getUserId(),
        }),
        statusCode: 200,
      }
    }

    const revokeSession = async (awsEvent, _) => {
      await awsEvent.session.revokeSession()
      return {
        body: JSON.stringify(''),
        statusCode: 200,
      }
    }

    const proxy = '/dev'
    const createAccountEvent = mockLambdaProxyEvent('/create', 'POST', null, null, proxy)
    let result = await middleware(createSession)(createAccountEvent, undefined)

    result.headers = {
      ...result.headers,
      ...result.multiValueHeaders,
    }

    const res = extractInfoFromResponse(result)

    assert(res.accessToken !== undefined)
    assert(res.antiCsrf !== undefined)
    assert(res.refreshToken !== undefined)

    let verifySessionEvent = mockLambdaProxyEvent('/session/verify', 'POST', null, null, proxy)
    result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { message: 'unauthorised' })

    verifySessionEvent = mockLambdaProxyEvent(
      '/session/verify',
      'POST',
      {
        Cookie: `sAccessToken=${res.accessToken}`,
      },
      null,
      proxy,
    )
    result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { message: 'try refresh token' })

    verifySessionEvent = mockLambdaProxyEvent(
      '/session/verify',
      'POST',
      {
        'Cookie': `sAccessToken=${res.accessToken}`,
        'anti-csrf': res.antiCsrf,
      },
      null,
      proxy,
    )
    result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { user: 'userId' })

    verifySessionEvent = mockLambdaProxyEvent(
      '/session/verify',
      'POST',
      {
        Cookie: `sAccessToken=${res.accessToken}`,
      },
      null,
      proxy,
    )
    result = await verifySession(verifyLambdaSession, {
      antiCsrfCheck: false,
    })(verifySessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { user: 'userId' })

    let refreshSessionEvent = mockLambdaProxyEvent('/auth/session/refresh', 'POST', null, null, proxy)
    result = await middleware()(refreshSessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { message: 'unauthorised' })

    refreshSessionEvent = mockLambdaProxyEvent(
      '/auth/session/refresh',
      'POST',
      {
        'Cookie': `sRefreshToken=${res.refreshToken}`,
        'anti-csrf': res.antiCsrf,
      },
      null,
      proxy,
    )
    result = await middleware()(refreshSessionEvent, undefined)
    result.headers = {
      ...result.headers,
      ...result.multiValueHeaders,
    }

    const res2 = extractInfoFromResponse(result)

    assert(res2.accessToken !== undefined)
    assert(res2.antiCsrf !== undefined)
    assert(res2.refreshToken !== undefined)

    verifySessionEvent = mockLambdaProxyEvent(
      '/session/verify',
      'POST',
      {
        'Cookie': `sAccessToken=${res2.accessToken}`,
        'anti-csrf': res2.antiCsrf,
      },
      null,
      proxy,
    )
    result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { user: 'userId' })
    result.headers = {
      ...result.headers,
      ...result.multiValueHeaders,
    }
    const res3 = extractInfoFromResponse(result)
    assert(res3.accessToken !== undefined)

    const revokeSessionEvent = mockLambdaProxyEvent(
      '/session/revoke',
      'POST',
      {
        'Cookie': `sAccessToken=${res3.accessToken}`,
        'anti-csrf': res2.antiCsrf,
      },
      null,
      proxy,
    )
    result = await verifySession(revokeSession)(revokeSessionEvent, undefined)
    result.headers = {
      ...result.headers,
      ...result.multiValueHeaders,
    }

    const sessionRevokedResponseExtracted = extractInfoFromResponse(result)
    assert(sessionRevokedResponseExtracted.accessTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.refreshTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.accessToken === '')
    assert(sessionRevokedResponseExtracted.refreshToken === '')
  })

  // check basic usage of session
  it('test basic usage of sessions for lambda proxy event v2', async () => {
    await startST()
    SuperTokens.init({
      framework: 'awsLambda',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
        apiGatewayPath: '/dev',
      },
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', antiCsrf: 'VIA_TOKEN' })],
    })

    const createSession = async (awsEvent, _) => {
      await Session.createNewSession(awsEvent, awsEvent, 'userId', {}, {})
      return {
        body: JSON.stringify(''),
        statusCode: 200,
      }
    }

    const verifyLambdaSession = async (awsEvent, _) => {
      return {
        body: JSON.stringify({
          user: awsEvent.session.getUserId(),
        }),
        statusCode: 200,
      }
    }

    const revokeSession = async (awsEvent, _) => {
      await awsEvent.session.revokeSession()
      return {
        body: JSON.stringify(''),
        statusCode: 200,
      }
    }

    const proxy = '/dev'
    const createAccountEvent = mockLambdaProxyEventV2('/create', 'POST', null, null, proxy, null)
    let result = await middleware(createSession)(createAccountEvent, undefined)

    result.headers = {
      ...result.headers,
      'set-cookie': result.cookies,
    }

    const res = extractInfoFromResponse(result)

    assert(res.accessToken !== undefined)
    assert(res.antiCsrf !== undefined)
    assert(res.refreshToken !== undefined)

    let verifySessionEvent = mockLambdaProxyEventV2('/session/verify', 'POST', null, null, proxy)
    result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { message: 'unauthorised' })

    verifySessionEvent = mockLambdaProxyEventV2('/session/verify', 'POST', null, null, proxy, [
            `sAccessToken=${res.accessToken}`,
    ])
    result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { message: 'try refresh token' })

    verifySessionEvent = mockLambdaProxyEventV2(
      '/session/verify',
      'POST',
      {
        'anti-csrf': res.antiCsrf,
      },
      null,
      proxy,
      [`sAccessToken=${res.accessToken}`],
    )
    result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { user: 'userId' })

    verifySessionEvent = mockLambdaProxyEventV2('/session/verify', 'POST', null, null, proxy, [
            `sAccessToken=${res.accessToken}`,
    ])
    result = await verifySession(verifyLambdaSession, {
      antiCsrfCheck: false,
    })(verifySessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { user: 'userId' })

    let refreshSessionEvent = mockLambdaProxyEventV2('/auth/session/refresh', 'POST', null, null, proxy, null)
    result = await middleware()(refreshSessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { message: 'unauthorised' })

    refreshSessionEvent = mockLambdaProxyEventV2(
      '/auth/session/refresh',
      'POST',
      {
        'anti-csrf': res.antiCsrf,
      },
      null,
      proxy,
      [`sRefreshToken=${res.refreshToken}`],
    )
    result = await middleware()(refreshSessionEvent, undefined)
    result.headers = {
      ...result.headers,
      'set-cookie': result.cookies,
    }

    const res2 = extractInfoFromResponse(result)

    assert(res2.accessToken !== undefined)
    assert(res2.antiCsrf !== undefined)
    assert(res2.refreshToken !== undefined)

    verifySessionEvent = mockLambdaProxyEventV2(
      '/session/verify',
      'POST',
      {
        'anti-csrf': res2.antiCsrf,
      },
      null,
      proxy,
      [`sAccessToken=${res2.accessToken}`],
    )
    result = await verifySession(verifyLambdaSession)(verifySessionEvent, undefined)
    assert.deepStrictEqual(JSON.parse(result.body), { user: 'userId' })
    result.headers = {
      ...result.headers,
      'set-cookie': result.cookies,
    }
    const res3 = extractInfoFromResponse(result)
    assert(res3.accessToken !== undefined)

    const revokeSessionEvent = mockLambdaProxyEventV2(
      '/session/revoke',
      'POST',
      {
        'anti-csrf': res2.antiCsrf,
      },
      null,
      proxy,
      [`sAccessToken=${res3.accessToken}`],
    )
    result = await verifySession(revokeSession)(revokeSessionEvent, undefined)
    result.headers = {
      ...result.headers,
      'set-cookie': result.cookies,
    }

    const sessionRevokedResponseExtracted = extractInfoFromResponse(result)
    assert(sessionRevokedResponseExtracted.accessTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.refreshTokenExpiry === 'Thu, 01 Jan 1970 00:00:00 GMT')
    assert(sessionRevokedResponseExtracted.accessToken === '')
    assert(sessionRevokedResponseExtracted.refreshToken === '')
  })

  it('sending custom response awslambda', async () => {
    await startST()
    SuperTokens.init({
      framework: 'awsLambda',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
        apiGatewayPath: '/dev',
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

    const proxy = '/dev'
    const event = mockLambdaProxyEventV2('/auth/signup/email/exists', 'GET', null, null, proxy, null, {
      email: 'test@example.com',
    })
    const result = await middleware()(event, undefined)
    assert(result.statusCode === 203)
    assert(JSON.parse(result.body).custom)
  })

  for (const tokenTransferMethod of ['header', 'cookie']) {
    describe(`Throwing UNATHORISED w/ auth-mode=${tokenTransferMethod}`, () => {
      it('should clear all response cookies during refresh', async () => {
        await startST()
        SuperTokens.init({
          framework: 'awsLambda',
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
              antiCsrf: 'VIA_TOKEN',
              override: {
                apis: (oI) => {
                  return {
                    ...oI,
                    async refreshPOST(input) {
                      await oI.refreshPOST(input)
                      throw new Session.Error({
                        message: 'unauthorised',
                        type: Session.Error.UNAUTHORISED,
                        clearTokens: true,
                      })
                    },
                  }
                },
              },
            }),
          ],
        })

        const createSession = async (awsEvent, _) => {
          await Session.createNewSession(awsEvent, awsEvent, 'userId', {}, {})
          return {
            body: JSON.stringify(''),
            statusCode: 200,
          }
        }

        const proxy = '/dev'
        const createAccountEvent = mockLambdaProxyEventV2(
          '/create',
          'POST',
          { 'st-auth-mode': tokenTransferMethod },
          null,
          proxy,
        )
        let result = await middleware(createSession)(createAccountEvent, undefined)
        result.headers = {
          ...result.headers,
          'set-cookie': result.cookies,
        }

        const res = extractInfoFromResponse(result)

        assert.notStrictEqual(res.accessTokenFromAny, undefined)
        assert.notStrictEqual(res.refreshTokenFromAny, undefined)

        const refreshHeaders
                    = tokenTransferMethod === 'header'
                      ? { authorization: `Bearer ${res.refreshTokenFromAny}` }
                      : {
                          cookie: `sRefreshToken=${encodeURIComponent(
                                  res.refreshTokenFromAny,
                              )}; sIdRefreshToken=asdf`,
                        }
        if (res.antiCsrf)
          refreshHeaders.antiCsrf = res.antiCsrf

        const refreshSessionEvent = mockLambdaProxyEventV2(
          '/auth/session/refresh',
          'POST',
          refreshHeaders,
          null,
          proxy,
          null,
        )
        result = await middleware()(refreshSessionEvent, undefined)
        result.headers = {
          ...result.headers,
          'set-cookie': result.cookies,
        }

        const res2 = extractInfoFromResponse(result)

        assert.strictEqual(res2.status, 401)
        if (tokenTransferMethod === 'cookie') {
          assert.strictEqual(res2.accessToken, '')
          assert.strictEqual(res2.refreshToken, '')
          assert.strictEqual(res2.accessTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
          assert.strictEqual(res2.refreshTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
          assert.strictEqual(res2.accessTokenDomain, undefined)
          assert.strictEqual(res2.refreshTokenDomain, undefined)
        }
        else {
          assert.strictEqual(res2.accessTokenFromHeader, '')
          assert.strictEqual(res2.refreshTokenFromHeader, '')
        }
        assert.strictEqual(res2.frontToken, 'remove')
        assert.strictEqual(res2.antiCsrf, undefined)
      })

      it('test revoking a session after createNewSession with throwing unauthorised error', async () => {
        await startST()
        SuperTokens.init({
          framework: 'awsLambda',
          supertokens: {
            connectionURI: 'http://localhost:8080',
          },
          appInfo: {
            apiDomain: 'http://api.supertokens.io',
            appName: 'SuperTokens',
            websiteDomain: 'http://supertokens.io',
            apiBasePath: '/',
          },
          recipeList: [
            Session.init({
              antiCsrf: 'VIA_TOKEN',
            }),
          ],
        })

        const createSession = async (awsEvent, _) => {
          await Session.createNewSession(awsEvent, awsEvent, 'userId', {}, {})
          throw new Session.Error({
            message: 'unauthorised',
            type: Session.Error.UNAUTHORISED,
            clearTokens: true,
          })
        }

        const proxy = '/dev'
        const createAccountEvent = mockLambdaProxyEventV2(
          '/create',
          'POST',
          { 'st-auth-mode': tokenTransferMethod },
          null,
          proxy,
        )
        const result = await middleware(createSession)(createAccountEvent, undefined)
        result.headers = {
          ...result.headers,
          'set-cookie': result.cookies,
        }

        const res = extractInfoFromResponse(result)

        assert.strictEqual(res.status, 401)
        if (tokenTransferMethod === 'cookie') {
          assert.strictEqual(res.accessToken, '')
          assert.strictEqual(res.refreshToken, '')
          assert.strictEqual(res.accessTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
          assert.strictEqual(res.refreshTokenExpiry, 'Thu, 01 Jan 1970 00:00:00 GMT')
          assert.strictEqual(res.accessTokenDomain, undefined)
          assert.strictEqual(res.refreshTokenDomain, undefined)
        }
        else {
          assert.strictEqual(res.accessTokenFromHeader, '')
          assert.strictEqual(res.refreshTokenFromHeader, '')
        }
        assert.strictEqual(res.frontToken, 'remove')
        assert.strictEqual(res.antiCsrf, undefined)
      })
    })
  }

  it('test that authorization header is read correctly in dashboard recipe', async () => {
    await startST()
    SuperTokens.init({
      framework: 'awsLambda',
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'http://api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'http://supertokens.io',
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

    const proxy = '/dev'

    const event = mockLambdaProxyEventV2(
      '/auth/dashboard/api/users/count',
      'GET',
      {
        'Authorization': 'Bearer testapikey',
        'Content-Type': 'application/json',
      },
      null,
      proxy,
      null,
      null,
    )

    const result = await middleware()(event, undefined)
    assert(result.statusCode === 200)
  })
})
