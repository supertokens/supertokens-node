import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import UserMetadataRecipe from 'supertokens-node/recipe/usermetadata'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`getUserMetadataTest: ${printPath('[test/usermetadata/getUserMetadata.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('getUserMetadata', () => {
    it('should return an empty object for unknown userIds', async function () {
      await startST()

      const testUserId = 'userId'

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

      const result = await UserMetadataRecipe.getUserMetadata(testUserId)

      assert.strictEqual(result.status, 'OK')
      assert.deepStrictEqual(result.metadata, {})
    })

    it('should return an object if it\'s created.', async function () {
      await startST()

      const testUserId = 'userId'
      const testMetadata = {
        role: 'admin',
      }

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

      await UserMetadataRecipe.updateUserMetadata(testUserId, testMetadata)

      const result = await UserMetadataRecipe.getUserMetadata(testUserId)

      assert.strictEqual(result.status, 'OK')
      assert.deepStrictEqual(result.metadata, testMetadata)
    })
  })
})
