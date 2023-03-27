import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import EmailPasswordRecipe from 'supertokens-node/recipe/emailpassword'
import SessionRecipe from 'supertokens-node/recipe/session'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`updateOrDeleteUserIdMappingInfoTest: ${printPath(
    '[test/useridmapping/updateOrDeleteUserIdMappingInfo.test.js]',
)}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('updateOrDeleteUserIdMappingInfoTest', () => {
    it('update externalUserId mapping info with unknown userId', async function () {
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
        const response = await STExpress.updateOrDeleteUserIdMappingInfo({
          userId: 'unknown',
          userIdType: 'SUPERTOKENS',
          externalUserIdInfo: 'someInfo',
        })
        assert.strictEqual(Object.keys(response).length, 1)
        assert.strictEqual(response.status, 'UNKNOWN_MAPPING_ERROR')
      }

      {
        const response = await STExpress.updateOrDeleteUserIdMappingInfo({
          userId: 'unknown',
          userIdType: 'EXTERNAL',
          externalUserIdInfo: 'someInfo',
        })

        assert.strictEqual(Object.keys(response).length, 1)
        assert.strictEqual(response.status, 'UNKNOWN_MAPPING_ERROR')
      }

      {
        const response = await STExpress.updateOrDeleteUserIdMappingInfo({
          userId: 'unknown',
          userIdType: 'ANY',
          externalUserIdInfo: 'someInfo',
        })

        assert.strictEqual(Object.keys(response).length, 1)
        assert.strictEqual(response.status, 'UNKNOWN_MAPPING_ERROR')
      }
    })

    it('update externalUserId mapping info with userIdType as SUPERTOKENS and EXTERNAL', async function () {
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
      const createUserIdMappingResponse = await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
        externalUserIdInfo: externalIdInfo,
      })
      assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 1)
      assert.strictEqual(createUserIdMappingResponse.status, 'OK')

      {
        // check that the userId mapping exists
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: superTokensUserId,
          userIdType: 'SUPERTOKENS',
        })
        isValidUserIdMappingResponse(getUserIdMappingResponse, superTokensUserId, externalId, externalIdInfo)
      }

      // update the mapping with superTokensUserId and type SUPERTOKENS
      {
        const newExternalIdInfo = 'newExternalIdInfo_1'
        const response = await STExpress.updateOrDeleteUserIdMappingInfo({
          userId: superTokensUserId,
          userIdType: 'SUPERTOKENS',
          externalUserIdInfo: newExternalIdInfo,
        })
        assert.strictEqual(Object.keys(response).length, 1)
        assert.strictEqual(response.status, 'OK')

        // retrieve mapping and check that externalUserIdInfo has been updated
        {
          // check that the userId mapping exists
          const getUserIdMappingResponse = await STExpress.getUserIdMapping({
            userId: superTokensUserId,
            userIdType: 'SUPERTOKENS',
          })
          isValidUserIdMappingResponse(
            getUserIdMappingResponse,
            superTokensUserId,
            externalId,
            newExternalIdInfo,
          )
        }
      }

      // update the mapping with externalId and type EXTERNAL
      {
        const newExternalIdInfo = 'newExternalIdInfo_2'
        const response = await STExpress.updateOrDeleteUserIdMappingInfo({
          userId: externalId,
          userIdType: 'EXTERNAL',
          externalUserIdInfo: newExternalIdInfo,
        })
        assert.strictEqual(Object.keys(response).length, 1)
        assert.strictEqual(response.status, 'OK')

        // retrieve mapping and check that externalUserIdInfo has been updated
        {
          // check that the userId mapping exists
          const getUserIdMappingResponse = await STExpress.getUserIdMapping({
            userId: externalId,
            userIdType: 'EXTERNAL',
          })
          isValidUserIdMappingResponse(
            getUserIdMappingResponse,
            superTokensUserId,
            externalId,
            newExternalIdInfo,
          )
        }
      }
    })

    it('update externalUserId mapping info with userIdType as ANY', async function () {
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
      const createUserIdMappingResponse = await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
        externalUserIdInfo: externalIdInfo,
      })
      assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 1)
      assert.strictEqual(createUserIdMappingResponse.status, 'OK')

      {
        // check that the userId mapping exists
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: superTokensUserId,
          userIdType: 'SUPERTOKENS',
        })
        isValidUserIdMappingResponse(getUserIdMappingResponse, superTokensUserId, externalId, externalIdInfo)
      }

      // update the mapping with superTokensUserId and type ANY
      {
        const newExternalIdInfo = 'newExternalIdInfo_1'
        const response = await STExpress.updateOrDeleteUserIdMappingInfo({
          userId: superTokensUserId,
          userIdType: 'SUPERTOKENS',
          externalUserIdInfo: newExternalIdInfo,
        })
        assert.strictEqual(Object.keys(response).length, 1)
        assert.strictEqual(response.status, 'OK')

        // retrieve mapping and check that externalUserIdInfo has been updated
        {
          // check that the userId mapping exists
          const getUserIdMappingResponse = await STExpress.getUserIdMapping({
            userId: superTokensUserId,
            userIdType: 'ANY',
          })
          isValidUserIdMappingResponse(
            getUserIdMappingResponse,
            superTokensUserId,
            externalId,
            newExternalIdInfo,
          )
        }
      }

      // update the mapping with externalId and type ANY
      {
        const newExternalIdInfo = 'newExternalIdInfo_2'
        const response = await STExpress.updateOrDeleteUserIdMappingInfo({
          userId: externalId,
          userIdType: 'ANY',
          externalUserIdInfo: newExternalIdInfo,
        })
        assert.strictEqual(Object.keys(response).length, 1)
        assert.strictEqual(response.status, 'OK')

        // retrieve mapping and check that externalUserIdInfo has been updated
        {
          // check that the userId mapping exists
          const getUserIdMappingResponse = await STExpress.getUserIdMapping({
            userId: externalId,
            userIdType: 'EXTERNAL',
          })
          isValidUserIdMappingResponse(
            getUserIdMappingResponse,
            superTokensUserId,
            externalId,
            newExternalIdInfo,
          )
        }
      }
    })
  })

  function isValidUserIdMappingResponse(userIdMapping, superTokensUserId, externalId, externalIdInfo) {
    assert.strictEqual(Object.keys(userIdMapping).length, 4)
    assert.strictEqual(userIdMapping.status, 'OK')
    assert.strictEqual(userIdMapping.superTokensUserId, superTokensUserId)
    assert.strictEqual(userIdMapping.externalUserId, externalId)
    assert.strictEqual(userIdMapping.externalUserIdInfo, externalIdInfo)
  }
})
