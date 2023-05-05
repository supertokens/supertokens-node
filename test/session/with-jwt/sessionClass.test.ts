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
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../../utils'
import { TrueClaim } from '../claims/testClaims'

describe(`session-jwt-functions: ${printPath('[test/session/with-jwt/sessionClass.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test that updating access token payload works', async () => {
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

      await session.updateAccessTokenPayload({ newKey: 'newValue' })

      res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() })
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

    const accessTokenPayload = createJWTResponse.body.accessTokenPayload
    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload.newKey, 'newValue')
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)
    assert.strictEqual(decodedJWT.newKey, 'newValue')
  })

  it('Test that updating access token payload by mergeIntoAccessTokenPayload works', async () => {
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

      await session.mergeIntoAccessTokenPayload({ newKey: 'newValue' })

      res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() })
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

    const accessTokenPayload = createJWTResponse.body.accessTokenPayload
    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)
    assert.strictEqual(accessTokenPayload.newKey, 'newValue')
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)
    assert.strictEqual(decodedJWT.newKey, 'newValue')
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
                async createNewSession(input) {
                  const accessTokenPayload = {
                    ...input.accessTokenPayload,
                    customClaim: 'customValue',
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

      await session.updateAccessTokenPayload(undefined)

      res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() })
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

    const accessTokenPayload = createJWTResponse.body.accessTokenPayload
    assert.equal(accessTokenPayload.sub, undefined)
    assert.equal(accessTokenPayload.iss, undefined)
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')
    assert.strictEqual(accessTokenPayload.customClaim, undefined)

    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)
    assert.strictEqual(decodedJWT.customClaim, undefined)
  })

  it('should update JWT when setting claim value by fetchAndSetClaim', async () => {
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

      await session.fetchAndSetClaim(TrueClaim)

      res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() })
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

    const accessTokenPayload = createJWTResponse.body.accessTokenPayload
    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)
    assert.strictEqual(TrueClaim.getValueFromPayload(accessTokenPayload), true)
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)
    assert.strictEqual(TrueClaim.getValueFromPayload(decodedJWT), true)
  })

  it('should update JWT when setting claim value by setClaimValue', async () => {
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

      await session.setClaimValue(TrueClaim, false)

      res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() })
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

    const accessTokenPayload = createJWTResponse.body.accessTokenPayload
    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)
    assert.strictEqual(TrueClaim.getValueFromPayload(accessTokenPayload), false)
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)
    assert.strictEqual(TrueClaim.getValueFromPayload(decodedJWT), false)
  })

  it('should update JWT when removing claim', async () => {
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

      await session.setClaimValue(TrueClaim, true)
      await session.removeClaim(TrueClaim)

      res.status(200).json({ accessTokenPayload: session.getAccessTokenPayload() })
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

    const accessTokenPayload = createJWTResponse.body.accessTokenPayload
    assert.strictEqual(accessTokenPayload.sub, undefined)
    assert.strictEqual(accessTokenPayload.iss, undefined)
    assert.strictEqual(TrueClaim.getValueFromPayload(accessTokenPayload), undefined)
    assert.notStrictEqual(accessTokenPayload.jwt, undefined)
    assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

    const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
    assert.notStrictEqual(decodedJWT, null)
    assert.strictEqual(decodedJWT.sub, 'userId')
    assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
    assert.strictEqual(decodedJWT._jwtPName, undefined)
    assert.strictEqual(TrueClaim.getValueFromPayload(decodedJWT), undefined)
  })
})
