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
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import JsonWebToken from 'jsonwebtoken'
import express from 'express'
import request from 'supertest'
import { ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { setJWTExpiryOffsetSecondsForTesting } from 'supertokens-node/recipe/session/with-jwt/recipeImplementation'
import { afterAll, beforeEach, describe, it } from 'vitest'
import {
  cleanST,
  delay,
  extractInfoFromResponse,
  killAllST,
  printPath,
  resetAll,
  setKeyValueInConfig,
  setupST,
  startST,
} from '../../utils'

describe(`session-with-jwt: ${printPath('[test/session/with-jwt/withjwt.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test that when creating a session with a custom access token payload, the payload has a jwt in it and the jwt has the user defined payload keys', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
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

    const sessionHandle = createJWTResponse.sessionHandle
    const accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    const accessTokenPayloadJWT = accessTokenPayload.jwt

    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert.notStrictEqual(accessTokenPayloadJWT, undefined)

    const decodedJWTPayload = JsonWebToken.decode(accessTokenPayloadJWT)

    assert(decodedJWTPayload.customKey === 'customValue')
    assert(decodedJWTPayload.customKey2 === 'customValue2')
  })

  it('Test that when creating a session the JWT expiry is 30 seconds more than the access token expiry', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, '', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const responseInfo = extractInfoFromResponse(createJWTResponse)

    const accessTokenExpiryInSeconds
            = JSON.parse(
              Buffer.from(decodeURIComponent(responseInfo.accessToken).split('.')[1], 'base64').toString('utf-8'),
            ).expiryTime / 1000
    const sessionHandle = createJWTResponse.body.sessionHandle
    const sessionInformation = await Session.getSessionInformation(sessionHandle)

    const jwtPayload = sessionInformation.accessTokenPayload.jwt.split('.')[1]
    const jwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, 'base64').toString('utf-8')).exp
    const expiryDiff = jwtExpiryInSeconds - accessTokenExpiryInSeconds

    // We check that JWT expiry is 30 seconds more than access token expiry. Accounting for a 5s skew
    assert(expiryDiff >= 27)
    assert(expiryDiff <= 32)
  })

  it('Test that when a session is refreshed, the JWT expiry is updated correctly', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.get('/getSession', async (req, res) => {
      const session = await Session.getSession(req, res)
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    let responseInfo = extractInfoFromResponse(createJWTResponse)
    const sessionHandle = createJWTResponse.body.sessionHandle
    let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    let jwtPayload = accessTokenPayload.jwt.split('.')[1]
    const jwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, 'base64').toString('utf-8')).exp

    const delay = 5
    await new Promise((res) => {
      setTimeout(() => {
        res()
      }, delay * 1000)
    })

    const refreshResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/session/refresh')
        .set('Cookie', [`sRefreshToken=${responseInfo.refreshToken}`])
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    responseInfo = extractInfoFromResponse(refreshResponse)
    const accessTokenExpiryInSeconds = new Date(responseInfo.accessTokenExpiry).getTime() / 1000
    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    jwtPayload = accessTokenPayload.jwt.split('.')[1]
    const newJWTExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, 'base64').toString('utf-8')).exp

    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    // Make sure that the new expiry is greater than the old one by the amount of delay before refresh, accounting for a second skew
    assert(
      newJWTExpiryInSeconds - jwtExpiryInSeconds === delay
                || newJWTExpiryInSeconds - jwtExpiryInSeconds === delay + 1,
    )
  })

  it('Test that mergeIntoAccessTokenPayload updates JWT', async () => {
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
          jwt: { enable: true },
          override: {
            functions(oi) {
              return {
                ...oi,
                async createNewSession(input) {
                  const accessTokenPayload = {
                    ...input.accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({ ...input, accessTokenPayload })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    let jwtPayload = accessTokenPayload.jwt.split('.')[1]
    jwtPayload = accessTokenPayload.jwt.split('.')[1]
    let parsedJWTPayload = JSON.parse(Buffer.from(jwtPayload, 'base64').toString('utf-8'))
    assert.strictEqual(parsedJWTPayload.newKey, undefined)
    const jwtExpiryInSeconds = parsedJWTPayload.exp

    await Session.mergeIntoAccessTokenPayload(sessionHandle, { newKey: 'newValue' })

    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    jwtPayload = accessTokenPayload.jwt.split('.')[1]
    parsedJWTPayload = JSON.parse(Buffer.from(jwtPayload, 'base64').toString('utf-8'))
    assert.strictEqual(parsedJWTPayload.newKey, 'newValue')

    const newJwtExpiryInSeconds = parsedJWTPayload.exp
    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert(jwtExpiryInSeconds + 100 >= newJwtExpiryInSeconds && jwtExpiryInSeconds - 100 <= newJwtExpiryInSeconds)
  })

  it('Test that when updating access token payload, jwt expiry does not change', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.get('/getSession', async (req, res) => {
      const session = await Session.getSession(req, res)
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    let jwtPayload = accessTokenPayload.jwt.split('.')[1]
    const jwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, 'base64').toString('utf-8')).exp

    await Session.updateAccessTokenPayload(sessionHandle, { newKey: 'newValue' })

    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    jwtPayload = accessTokenPayload.jwt.split('.')[1]
    const newJwtExpiryInSeconds = JSON.parse(Buffer.from(jwtPayload, 'base64').toString('utf-8')).exp

    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert(jwtExpiryInSeconds + 100 >= newJwtExpiryInSeconds && jwtExpiryInSeconds - 100 <= newJwtExpiryInSeconds)
  })

  it('Test that for sessions created without jwt enabled, calling updateAccessTokenPayload after enabling jwt does not create a jwt', async () => {
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
          override: {
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, '', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.get('/getSession', async (req, res) => {
      const session = await Session.getSession(req, res)
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.strictEqual(accessTokenPayload.jwt, undefined)

    resetAll()

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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
                },
              }
            },
          },
        }),
      ],
    })

    await Session.updateAccessTokenPayload(sessionHandle, { someKey: 'someValue' })
    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, undefined)
    assert.strictEqual(accessTokenPayload.jwt, undefined)
    assert.equal(accessTokenPayload.someKey, 'someValue')
  })

  it('Test that for sessions created without jwt enabled, refreshing session after enabling jwt adds a JWT to the access token payload', async () => {
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
          override: {
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.get('/getSession', async (req, res) => {
      const session = await Session.getSession(req, res)
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const responseInfo = extractInfoFromResponse(createJWTResponse)
    let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.strictEqual(accessTokenPayload.jwt, undefined)

    resetAll()

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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
                },
              }
            },
          },
        }),
      ],
    })

    await new Promise(resolve =>
      request(app)
        .post('/auth/session/refresh')
        .set('Cookie', [`sRefreshToken=${responseInfo.refreshToken}`])
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
  })

  it('Test that when creating a session with jwt enabled, the sub claim gets added', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)

    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
  })

  it('Test that when creating a session with jwt enabled and using a custom sub claim, the custom claim value gets used', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    sub: 'customsub',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)

    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'customsub')
    assert.strictEqual(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
  })

  it('Test that when creating a session with jwt enabled, the iss claim gets added', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)

    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
  })

  it('Test that when creating a session with jwt enabled and using a custom iss claim, the custom claim value gets used', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    iss: 'customIss',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)

    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.iss, 'customIss')
  })

  it('Test that sub and iss claims are still present after calling updateAccessTokenPayload', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)

    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.customClaim, 'customValue')
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)

    await Session.updateAccessTokenPayload(sessionHandle, { newCustomClaim: 'newValue' })
    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)

    decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)

    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.newCustomClaim, 'newValue')
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)
  })

  it('Test that sub and iss claims are still present after refreshing the session', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const responseInfo = extractInfoFromResponse(createJWTResponse)
    let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)

    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.customClaim, 'customValue')
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)

    await new Promise(resolve =>
      request(app)
        .post('/auth/session/refresh')
        .set('Cookie', [`sRefreshToken=${responseInfo.refreshToken}`])
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)

    decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)

    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
  })

  it('Test that enabling JWT with a custom property name works as expected', async () => {
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
          jwt: { enable: true, propertyNameInAccessTokenPayload: 'customPropertyName' },
          override: {
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'customPropertyName')
    assert.strictEqual(accessTokenPayload.jwt, undefined)
    assert.notStrictEqual(accessTokenPayload.customPropertyName, undefined)
  })

  it('Test that the JWT payload is maintained after updating the access token payload and refreshing the session', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.post('/refreshsession', async (req, res) => {
      const newSession = await Session.refreshSession(req, res)
      res.status(200).json({ accessTokenPayload: newSession.getAccessTokenPayload() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const responseInfo = extractInfoFromResponse(createJWTResponse)
    await Session.updateAccessTokenPayload(sessionHandle, { newClaim: 'newValue' })

    const refreshResponse = await new Promise(resolve =>
      request(app)
        .post('/refreshsession')
        .set('Cookie', [`sRefreshToken=${responseInfo.refreshToken}`])
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    assert.equal(refreshResponse.body.accessTokenPayload.sub, undefined)
    assert.equal(refreshResponse.body.accessTokenPayload.iss, undefined)
    assert.strictEqual(refreshResponse.body.accessTokenPayload._jwtPName, 'jwt')
    assert.notStrictEqual(refreshResponse.body.accessTokenPayload, undefined)
    assert.strictEqual(refreshResponse.body.accessTokenPayload.newClaim, 'newValue')
  })

  it('Test that access token payload has valid properties when creating, updating and refreshing', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const responseInfo = extractInfoFromResponse(createJWTResponse)
    let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.strictEqual(accessTokenPayload.customClaim, 'customValue')
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)

    await Session.updateAccessTokenPayload(sessionHandle, { newKey: 'newValue' })
    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.strictEqual(accessTokenPayload.customClaim, undefined)
    assert.strictEqual(accessTokenPayload.newKey, 'newValue')
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)

    await new Promise(resolve =>
      request(app)
        .post('/auth/session/refresh')
        .set('Cookie', [`sRefreshToken=${responseInfo.refreshToken}`])
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    assert.strictEqual(accessTokenPayload.newKey, 'newValue')
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)
  })

  it('Test that after changing the jwt property name, updating access token payload does not change the _jwtPName', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle

    resetAll()

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
          jwt: { enable: true, propertyNameInAccessTokenPayload: 'jwtProperty' },
          override: {
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
                },
              }
            },
          },
        }),
      ],
    })

    await Session.updateAccessTokenPayload(sessionHandle, { newKey: 'newValue' })
    const accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload.newKey, 'newValue')
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload.jwtProperty, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
  })

  it('Test that after changing the jwt property name, refreshing the session changes the _jwtPName', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const responseInfo = extractInfoFromResponse(createJWTResponse)

    resetAll()

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
          jwt: { enable: true, propertyNameInAccessTokenPayload: 'jwtProperty' },
          override: {
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
                },
              }
            },
          },
        }),
      ],
    })

    await new Promise(resolve =>
      request(app)
        .post('/auth/session/refresh')
        .set('Cookie', [`sRefreshToken=${responseInfo.refreshToken}`])
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload

    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload.customClaim, 'customValue')
    assert.strictEqual(accessTokenPayload.jwt, undefined)
    assert.notStrictEqual(accessTokenPayload.jwtProperty, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwtProperty')
  })

  it('Test that after access token expiry and JWT expiry and refreshing the session, the access token payload and JWT are valid', async () => {
    await setKeyValueInConfig('access_token_validity', 2)
    await startST()
    setJWTExpiryOffsetSecondsForTesting(2)
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle
    const responseInfo = extractInfoFromResponse(createJWTResponse)

    await delay(5)

    let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)

    let currentTimeInSeconds = Math.ceil(Date.now() / 1000)
    // Make sure that the JWT has expired
    assert(decodedJWT.exp < currentTimeInSeconds)
    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload.customClaim, 'customValue')
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

    await new Promise(resolve =>
      request(app)
        .post('/auth/session/refresh')
        .set('Cookie', [`sRefreshToken=${responseInfo.refreshToken}`])
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload.customClaim, 'customValue')
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

    // Make sure the JWT is not expired after refreshing
    decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
    currentTimeInSeconds = Math.ceil(Date.now() / 1000)
    assert(decodedJWT.exp > currentTimeInSeconds)
  })

  it('Test that both access token payload and JWT have valid claims when calling update with a undefined payload', async () => {
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
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customClaim: 'customValue',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
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
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', {}, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle

    let accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload.customClaim, 'customValue')
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

    let decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)

    await Session.updateAccessTokenPayload(sessionHandle, undefined)

    accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload.customClaim, undefined)
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

    decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)
  })

  it('Test that both access token payload and JWT have valid claims when creating a session with an undefined payload', async () => {
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
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie', jwt: { enable: true } })],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const app = express()

    app.use(middleware())
    app.use(express.json())

    app.post('/create', async (req, res) => {
      const session = await Session.createNewSession(req, res, 'userId', undefined, {})
      res.status(200).json({ sessionHandle: session.getHandle() })
    })

    app.use(errorHandler())

    const createJWTResponse = await new Promise(resolve =>
      request(app)
        .post('/create')
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    const sessionHandle = createJWTResponse.body.sessionHandle

    const accessTokenPayload = (await Session.getSessionInformation(sessionHandle)).accessTokenPayload
    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)
  })
})
