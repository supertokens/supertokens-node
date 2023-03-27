import assert from 'assert'
import express from 'express'
import request from 'supertest'

import { afterAll, beforeEach, describe, it } from 'vitest'
import { ProcessState } from 'supertokens-node/processState'
import STExpress from 'supertokens-node'
import OpenIdRecipe from 'supertokens-node/recipe/openid/recipe'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`overrideTest: ${printPath('[test/openid/override.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test overriding open id functions', async () => {
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
        OpenIdRecipe.init({
          issuer: 'https://api.supertokens.io/auth',
          override: {
            functions(oi) {
              return {
                ...oi,
                getOpenIdDiscoveryConfiguration() {
                  return {
                    issuer: 'https://customissuer',
                    jwks_uri: 'https://customissuer/jwks',
                  }
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

    const response = await new Promise((resolve) => {
      request(app)
        .get('/auth/.well-known/openid-configuration')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        })
    })

    assert(response.body !== undefined)
    assert.equal(response.body.issuer, 'https://customissuer')
    assert.equal(response.body.jwks_uri, 'https://customissuer/jwks')
  })

  it('Test overriding open id apis', async () => {
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
        OpenIdRecipe.init({
          issuer: 'https://api.supertokens.io/auth',
          override: {
            apis(oi) {
              return {
                ...oi,
                getOpenIdDiscoveryConfigurationGET({ options }) {
                  return {
                    status: 'OK',
                    issuer: 'https://customissuer',
                    jwks_uri: 'https://customissuer/jwks',
                  }
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

    const response = await new Promise((resolve) => {
      request(app)
        .get('/auth/.well-known/openid-configuration')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        })
    })

    assert(response.body !== undefined)
    assert.equal(response.body.issuer, 'https://customissuer')
    assert.equal(response.body.jwks_uri, 'https://customissuer/jwks')
  })
})
