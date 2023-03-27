import assert from 'assert'

import { afterAll, beforeEach, describe, it } from 'vitest'
import { ProcessState } from 'supertokens-node/processState'
import STExpress from 'supertokens-node'
import OpenIdRecipe from 'supertokens-node/recipe/openid/recipe'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import OpenId from 'supertokens-node/recipe/openid'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`openIdTest: ${printPath('[test/openid/openid.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test that with default config discovery configuration is as expected', async () => {
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

    const discoveryConfig = await OpenId.getOpenIdDiscoveryConfiguration()

    assert.equal(discoveryConfig.issuer, 'https://api.supertokens.io/auth')
    assert.equal(discoveryConfig.jwks_uri, 'https://api.supertokens.io/auth/jwt/jwks.json')
  })

  it('Test that with default config discovery configuration is as expected with api base path', async () => {
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

    const discoveryConfig = await OpenId.getOpenIdDiscoveryConfiguration()

    assert.equal(discoveryConfig.issuer, 'https://api.supertokens.io')
    assert.equal(discoveryConfig.jwks_uri, 'https://api.supertokens.io/jwt/jwks.json')
  })

  it('Test that with default config discovery configuration is as expected with custom issuer', async () => {
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
          issuer: 'https://cusomissuer/auth',
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const discoveryConfig = await OpenId.getOpenIdDiscoveryConfiguration()

    assert.equal(discoveryConfig.issuer, 'https://cusomissuer/auth')
    assert.equal(discoveryConfig.jwks_uri, 'https://cusomissuer/auth/jwt/jwks.json')
  })
})
