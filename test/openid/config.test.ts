import assert from 'assert'

import { afterAll, beforeEach, describe, it } from 'vitest'
import { ProcessState } from 'supertokens-node/processState'
import STExpress from 'supertokens-node'
import OpenIdRecipe from 'supertokens-node/recipe/openid/recipe'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`configTest: ${printPath('[test/openid/config.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test that the default config sets values correctly for OpenID recipe', async () => {
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

    const openIdRecipe = await OpenIdRecipe.getInstanceOrThrowError()

    assert(openIdRecipe.config.issuerDomain.getAsStringDangerous() === 'https://api.supertokens.io')
    assert(openIdRecipe.config.issuerPath.getAsStringDangerous() === '/auth')
  })

  it('Test that the default config sets values correctly for OpenID recipe with apiBasePath', async () => {
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

    const openIdRecipe = await OpenIdRecipe.getInstanceOrThrowError()

    assert(openIdRecipe.config.issuerDomain.getAsStringDangerous() === 'https://api.supertokens.io')
    assert(openIdRecipe.config.issuerPath.getAsStringDangerous() === '')
  })

  it('Test that the config sets values correctly for OpenID recipe with issuer', async () => {
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
          issuer: 'https://customissuer.com',
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const openIdRecipe = await OpenIdRecipe.getInstanceOrThrowError()

    assert(openIdRecipe.config.issuerDomain.getAsStringDangerous() === 'https://customissuer.com')
    assert(openIdRecipe.config.issuerPath.getAsStringDangerous() === '')
  })

  it('Test that issuer without apiBasePath throws error', async () => {
    await startST()

    try {
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
            issuer: 'https://customissuer.com',
          }),
        ],
      })
    }
    catch (e) {
      if (
        e.message !== 'The path of the issuer URL must be equal to the apiBasePath. The default value is /auth'
      )
        throw e
    }
  })

  it('Test that issuer with gateway path works fine', async () => {
    await startST()
    STExpress.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        apiGatewayPath: '/gateway',
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

    const openIdRecipe = await OpenIdRecipe.getInstanceOrThrowError()

    assert.equal(openIdRecipe.config.issuerDomain.getAsStringDangerous(), 'https://api.supertokens.io')
    assert.equal(openIdRecipe.config.issuerPath.getAsStringDangerous(), '/gateway/auth')
  })
})
