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
import express from 'express'
import request from 'supertest'
import { ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../../utils'

/**
 * Test that overriding the jwt recipe functions and apis still work when the JWT feature is enabled
 */
describe(`session-with-jwt: ${printPath('[test/session/with-jwt/jwt.override.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test overriding functions', async () => {
    await startST()

    let jwtCreated
    let jwksKeys

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
            openIdFeature: {
              jwtFeature: {
                functions(originalImplementation) {
                  return {
                    ...originalImplementation,
                    async createJWT(input) {
                      const createJWTResponse = await originalImplementation.createJWT(input)

                      if (createJWTResponse.status === 'OK')
                        jwtCreated = createJWTResponse.jwt

                      return createJWTResponse
                    },
                    async getJWKS() {
                      const getJWKSResponse = await originalImplementation.getJWKS()

                      if (getJWKSResponse.status === 'OK')
                        jwksKeys = getJWKSResponse.keys

                      return getJWKSResponse
                    },
                  }
                },
              },
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
            resolve(res.body)
        }),
    )

    const sessionHandle = createJWTResponse.sessionHandle
    assert.notStrictEqual(jwtCreated, undefined)

    const sessionInformation = await Session.getSessionInformation(sessionHandle)
    assert.deepStrictEqual(jwtCreated, sessionInformation.accessTokenPayload.jwt)

    const getJWKSResponse = await new Promise((resolve) => {
      request(app)
        .get('/auth/jwt/jwks.json')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        })
    })

    assert.notStrictEqual(jwksKeys, undefined)
    assert.deepStrictEqual(jwksKeys, getJWKSResponse.keys)
  })

  it('Test overriding APIs', async () => {
    await startST()

    let jwksKeys

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
            openIdFeature: {
              jwtFeature: {
                apis(originalImplementation) {
                  return {
                    ...originalImplementation,
                    async getJWKSGET(input) {
                      const response = await originalImplementation.getJWKSGET(input)
                      jwksKeys = response.keys
                      return response
                    },
                  }
                },
              },
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

    const getJWKSResponse = await new Promise((resolve) => {
      request(app)
        .get('/auth/jwt/jwks.json')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        })
    })

    app.use(errorHandler())

    assert.notStrictEqual(jwksKeys, undefined)
    assert.deepStrictEqual(jwksKeys, getJWKSResponse.keys)
  })
})
