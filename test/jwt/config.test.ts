import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import { Querier } from 'supertokens-node/querier'
import JWTRecipe from 'supertokens-node/recipe/jwt/recipe'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`configTest: ${printPath('[test/jwt/config.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test that the default config sets values correctly for JWT recipe', async () => {
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
      recipeList: [JWTRecipe.init()],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const jwtRecipe = await JWTRecipe.getInstanceOrThrowError()
    assert(jwtRecipe.config.jwtValiditySeconds === 3153600000)
  })

  it('Test that the config sets values correctly for JWT recipe when jwt validity is set', async () => {
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
          jwtValiditySeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    const jwtRecipe = await JWTRecipe.getInstanceOrThrowError()
    assert(jwtRecipe.config.jwtValiditySeconds === 24 * 60 * 60)
  })
})
