import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import EmailPasswordRecipe from 'supertokens-node/recipe/emailpassword'
import SessionRecipe from 'supertokens-node/recipe/session'
import UserMetadataRecipe from 'supertokens-node/recipe/usermetadata'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`deleteUserIdMappingTest: ${printPath('[test/useridmapping/deleteUserIdMapping.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('deleteUserIdMapping:', () => {
    it('delete an unknown userId mapping', async function () {
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
        recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      {
        const response = await STExpress.deleteUserIdMapping({ userId: 'unknown', userIdType: 'SUPERTOKENS' })
        assert.strictEqual(Object.keys(response).length, 2)
        assert.strictEqual(response.status, 'OK')
        assert.strictEqual(response.didMappingExist, false)
      }

      {
        const response = await STExpress.deleteUserIdMapping({ userId: 'unknown', userIdType: 'EXTERNAL' })
        assert.strictEqual(Object.keys(response).length, 2)
        assert.strictEqual(response.status, 'OK')
        assert.strictEqual(response.didMappingExist, false)
      }

      {
        const response = await STExpress.deleteUserIdMapping({ userId: 'unknown', userIdType: 'ANY' })
        assert.strictEqual(Object.keys(response).length, 2)
        assert.strictEqual(response.status, 'OK')
        assert.strictEqual(response.didMappingExist, false)
      }
    })

    it('delete a userId mapping with userIdType as SUPERTOKENS', async function () {
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
        recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a user
      const signUpResponse = await EmailPasswordRecipe.signUp('test@example.com', 'testPass123')
      assert.strictEqual(signUpResponse.status, 'OK')

      const superTokensUserId = signUpResponse.user.id
      const externalId = 'externalId'
      const externalIdInfo = 'externalIdInfo'

      // create the userId mapping
      await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo)

      // delete the mapping
      const deleteUserIdMappingResponse = await STExpress.deleteUserIdMapping({
        userId: superTokensUserId,
        userIdType: 'SUPERTOKENS',
      })

      assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2)
      assert.strictEqual(deleteUserIdMappingResponse.status, 'OK')
      assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true)

      // check that the mapping is deleted
      {
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: superTokensUserId,
          userIdType: 'SUPERTOKENS',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1)
        assert.strictEqual(getUserIdMappingResponse.status, 'UNKNOWN_MAPPING_ERROR')
      }
    })

    it('delete a userId mapping with userIdType as EXTERNAL', async function () {
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
        recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a user
      const signUpResponse = await EmailPasswordRecipe.signUp('test@example.com', 'testPass123')
      assert.strictEqual(signUpResponse.status, 'OK')

      const superTokensUserId = signUpResponse.user.id
      const externalId = 'externalId'
      const externalUserIdInfo = 'externalIdInfo'

      // create the userId mapping
      await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalUserIdInfo)

      // delete the mapping
      const deleteUserIdMappingResponse = await STExpress.deleteUserIdMapping({
        userId: externalId,
        userIdType: 'EXTERNAL',
      })

      assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2)
      assert.strictEqual(deleteUserIdMappingResponse.status, 'OK')
      assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true)

      // check that the mapping is deleted
      {
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: externalId,
          userIdType: 'EXTERNAL',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1)
        assert.strictEqual(getUserIdMappingResponse.status, 'UNKNOWN_MAPPING_ERROR')
      }
    })

    it('delete a userId mapping with userIdType as ANY', async function () {
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
        recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a user
      const signUpResponse = await EmailPasswordRecipe.signUp('test@example.com', 'testPass123')
      assert.strictEqual(signUpResponse.status, 'OK')

      const superTokensUserId = signUpResponse.user.id
      const externalId = 'externalId'
      const externalIdInfo = 'externalIdInfo'

      // create the userId mapping
      {
        await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo)

        // delete the mapping with the supertokensUserId and ANY
        const deleteUserIdMappingResponse = await STExpress.deleteUserIdMapping({
          userId: superTokensUserId,
          userIdType: 'ANY',
        })

        assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2)
        assert.strictEqual(deleteUserIdMappingResponse.status, 'OK')
        assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true)
      }

      // check that the mapping is deleted
      {
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: superTokensUserId,
          userIdType: 'ANY',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1)
        assert.strictEqual(getUserIdMappingResponse.status, 'UNKNOWN_MAPPING_ERROR')
      }

      // create the mapping
      await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo)

      // delete the mapping with externalId and ANY
      {
        const deleteUserIdMappingResponse = await STExpress.deleteUserIdMapping({
          userId: externalId,
          userIdType: 'ANY',
        })

        assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2)
        assert.strictEqual(deleteUserIdMappingResponse.status, 'OK')
        assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true)
      }

      // check that the mapping is deleted
      {
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: externalId,
          userIdType: 'ANY',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1)
        assert.strictEqual(getUserIdMappingResponse.status, 'UNKNOWN_MAPPING_ERROR')
      }
    })

    it('delete a userId mapping when userMetadata exists with externalId with and without force', async function () {
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
        recipeList: [EmailPasswordRecipe.init(), UserMetadataRecipe.init(), SessionRecipe.init()],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a user and map their userId
      const signUpResponse = await EmailPasswordRecipe.signUp('test@example.com', 'testPass123')
      assert.strictEqual(signUpResponse.status, 'OK')

      const superTokensUserId = signUpResponse.user.id
      const externalId = 'externalId'
      const externalIdInfo = 'test'

      await createUserIdMappingAndCheckThatItExists(superTokensUserId, externalId, externalIdInfo)

      // add metadata to the user
      const testMetadata = {
        role: 'admin',
      }
      await UserMetadataRecipe.updateUserMetadata(externalId, testMetadata)

      // delete UserIdMapping without passing force
      {
        try {
          await STExpress.deleteUserIdMapping({
            userId: externalId,
            userIdType: 'EXTERNAL',
          })
          throw new Error('Should not come here')
        }
        catch (error) {
          assert(error.message.includes('UserId is already in use in UserMetadata recipe'))
        }
      }

      // try deleting mapping with force set to false
      {
        try {
          await STExpress.deleteUserIdMapping({
            userId: externalId,
            userIdType: 'EXTERNAL',
            force: false,
          })
          throw new Error('Should not come here')
        }
        catch (error) {
          assert(error.message.includes('UserId is already in use in UserMetadata recipe'))
        }
      }

      // delete mapping with force set to true
      {
        const deleteUserIdMappingResponse = await STExpress.deleteUserIdMapping({
          userId: externalId,
          userIdType: 'EXTERNAL',
          force: true,
        })
        assert.strictEqual(Object.keys(deleteUserIdMappingResponse).length, 2)
        assert.strictEqual(deleteUserIdMappingResponse.status, 'OK')
        assert.strictEqual(deleteUserIdMappingResponse.didMappingExist, true)
      }
    })
  })

  async function createUserIdMappingAndCheckThatItExists(superTokensUserId, externalUserId, externalUserIdInfo) {
    {
      const response = await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId,
        externalUserIdInfo,
      })
      assert.strictEqual(response.status, 'OK')
    }

    {
      const response = await STExpress.getUserIdMapping({ userId: superTokensUserId, userIdType: 'SUPERTOKENS' })
      assert.strictEqual(response.status, 'OK')
      assert.strictEqual(response.superTokensUserId, superTokensUserId)
      assert.strictEqual(response.externalUserId, externalUserId)
      assert.strictEqual(response.externalUserIdInfo, externalUserIdInfo)
    }
  }
})
