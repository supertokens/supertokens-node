import { ProcessState } from 'supertokens-node/processState'
import STExpress from 'supertokens-node'
import UserMetadataRecipe from 'supertokens-node/recipe/usermetadata/recipe'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`configTest: ${printPath('[test/usermetadata/config.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('recipe init', () => {
    it('should work fine without config', async function () {
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
        recipeList: [UserMetadataRecipe.init()],
      })

      // Only run for version >= 2.13
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.12') === '2.12')
        return this.skip()

      await UserMetadataRecipe.getInstanceOrThrowError()
    })
  })
})
