import assert from 'assert'
import express from 'express'
import request from 'supertest'

import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import { Querier } from 'supertokens-node/querier'
import JWTRecipe from 'supertokens-node/recipe/jwt/recipe'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`getJWKS: ${printPath('[test/jwt/getJWKS.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test that default getJWKS api does not work when disabled', async () => {
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
        JWTRecipe.init({
          override: {
            apis: async (originalImplementation) => {
              return {
                ...originalImplementation,
                getJWKSGET: undefined,
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

    const response = await new Promise((resolve) => {
      request(app)
        .get('/auth/jwt/jwks.json')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        })
    })

    assert(response.status === 404)
  })

  it('Test that default getJWKS works fine', async () => {
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
      recipeList: [JWTRecipe.init({})],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    const response = await new Promise((resolve) => {
      request(app)
        .get('/auth/jwt/jwks.json')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res.body)
        })
    })

    assert(response !== undefined)
    assert(response.keys !== undefined)
    assert(response.keys.length > 0)
  })
})
