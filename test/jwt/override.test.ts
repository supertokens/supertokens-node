import assert from 'assert'
import express from 'express'
import request from 'supertest'

import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import JWTRecipe from 'supertokens-node/recipe/jwt'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`overrideTest: ${printPath('[test/jwt/override.test.ts]')}`, () => {
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
        JWTRecipe.init({
          override: {
            functions: (originalImplementation) => {
              return {
                ...originalImplementation,
                createJWT: async (input) => {
                  const createJWTResponse = await originalImplementation.createJWT(input)

                  if (createJWTResponse.status === 'OK')
                    jwtCreated = createJWTResponse.jwt

                  return createJWTResponse
                },
                getJWKS: async () => {
                  const getJWKSResponse = await originalImplementation.getJWKS()

                  if (getJWKSResponse.status === 'OK')
                    jwksKeys = getJWKSResponse.keys

                  return getJWKSResponse
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

    app.use(errorHandler())
    app.use(express.json())

    app.post('/jwtcreate', async (req, res) => {
      const payload = req.body.payload
      res.json(await JWTRecipe.createJWT(payload, 1000))
    })

    const createJWTResponse = await new Promise((resolve) => {
      request(app)
        .post('/jwtcreate')
        .send({
          payload: { someKey: 'someValue' },
        })
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        })
    })

    assert.notStrictEqual(jwtCreated, undefined)
    assert.deepStrictEqual(jwtCreated, createJWTResponse.jwt)

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
        JWTRecipe.init({
          override: {
            apis: (originalImplementation) => {
              return {
                ...originalImplementation,
                getJWKSGET: async (input) => {
                  const response = await originalImplementation.getJWKSGET(input)
                  jwksKeys = response.keys
                  return response
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

    app.use(errorHandler())

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
})
