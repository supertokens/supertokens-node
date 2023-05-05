import assert from 'assert'
import express from 'express'
import request from 'supertest'

import { afterAll, beforeEach, describe, it } from 'vitest'
import { ProcessState } from 'supertokens-node/processState'
import STExpress from 'supertokens-node'
import OpenIdRecipe from 'supertokens-node/recipe/openid'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`apiTest: ${printPath('[test/openid/api.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test that with default config calling discovery configuration endpoint works as expected', async () => {
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
      recipeList: [OpenIdRecipe.init()],
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
    assert.equal(response.body.issuer, 'https://api.supertokens.io/auth')
    assert.equal(response.body.jwks_uri, 'https://api.supertokens.io/auth/jwt/jwks.json')
  })

  it('Test that with apiBasePath calling discovery configuration endpoint works as expected', async () => {
    await startST()
    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        apiBasePath: '/',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [OpenIdRecipe.init()],
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
        .get('/.well-known/openid-configuration')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        })
    })

    assert(response.body !== undefined)
    assert.equal(response.body.issuer, 'https://api.supertokens.io')
    assert.equal(response.body.jwks_uri, 'https://api.supertokens.io/jwt/jwks.json')
  })

  it('Test that discovery endpoint does not work when disabled', async () => {
    await startST()
    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        apiBasePath: '/',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        OpenIdRecipe.init({
          issuer: 'http://api.supertokens.io',
          override: {
            apis(oi) {
              return {
                ...oi,
                getOpenIdDiscoveryConfigurationGET: undefined,
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
        .get('/.well-known/openid-configuration')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        })
    })

    assert(response.status === 404)
  })
})
