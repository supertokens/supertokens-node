// const assert = require("assert");

import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import EmailPasswordRecipe from 'supertokens-node/recipe/emailpassword'
import SessionRecipe from 'supertokens-node/recipe/session'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`getUserIdMappingTest: ${printPath('[test/useridmapping/getUserIdMapping.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('getUserIdMappingTest', () => {
    it('get userId mapping', async function () {
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

      // check that the userId mapping exists with userIdType as SUPERTOKENS
      {
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: superTokensUserId,
          userIdType: 'SUPERTOKENS',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 4)
        assert.strictEqual(getUserIdMappingResponse.status, 'OK')
        assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId)
        assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId)
        assert.strictEqual(getUserIdMappingResponse.externalUserIdInfo, externalIdInfo)
      }

      // check that userId mapping exists with userIdType as EXTERNAL
      {
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: externalId,
          userIdType: 'ANY',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 4)
        assert.strictEqual(getUserIdMappingResponse.status, 'OK')
        assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId)
        assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId)
        assert.strictEqual(getUserIdMappingResponse.externalUserIdInfo, externalIdInfo)
      }

      // check that userId mapping exists without passing userIdType
      {
        // while using the superTokensUserId
        {
          const getUserIdMappingResponse = await STExpress.getUserIdMapping({
            userId: superTokensUserId,
          })
          assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 4)
          assert.strictEqual(getUserIdMappingResponse.status, 'OK')
          assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId)
          assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId)
          assert.strictEqual(getUserIdMappingResponse.externalUserIdInfo, externalIdInfo)
        }

        // while using the externalUserId
        {
          const getUserIdMappingResponse = await STExpress.getUserIdMapping({
            userId: externalId,
          })
          assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 4)
          assert.strictEqual(getUserIdMappingResponse.status, 'OK')
          assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId)
          assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId)
          assert.strictEqual(getUserIdMappingResponse.externalUserIdInfo, externalIdInfo)
        }
      }
    })

    it('get userId mapping when mapping does not exist', async function () {
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
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: 'unknownId',
          userIdType: 'SUPERTOKENS',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1)
        assert.strictEqual(getUserIdMappingResponse.status, 'UNKNOWN_MAPPING_ERROR')
      }

      {
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: 'unknownId',
          userIdType: 'EXTERNAL',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1)
        assert.strictEqual(getUserIdMappingResponse.status, 'UNKNOWN_MAPPING_ERROR')
      }

      {
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: 'unknownId',
          userIdType: 'ANY',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 1)
        assert.strictEqual(getUserIdMappingResponse.status, 'UNKNOWN_MAPPING_ERROR')
      }
    })

    it('get userId mapping when externalUserIdInfo does not exist', async function () {
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

      // create the userId mapping
      const createUserIdMappingResponse = await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })
      assert.strictEqual(Object.keys(createUserIdMappingResponse).length, 1)
      assert.strictEqual(createUserIdMappingResponse.status, 'OK')

      // with userIdType as SUPERTOKENS
      {
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: superTokensUserId,
          userIdType: 'SUPERTOKENS',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 3)
        assert.strictEqual(getUserIdMappingResponse.status, 'OK')
        assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId)
        assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId)
      }

      // with userIdType as EXTERNAL
      {
        const getUserIdMappingResponse = await STExpress.getUserIdMapping({
          userId: externalId,
          userIdType: 'EXTERNAL',
        })
        assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 3)
        assert.strictEqual(getUserIdMappingResponse.status, 'OK')
        assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId)
        assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId)
      }

      // without userIdType
      {
        // with supertokensUserId
        {
          const getUserIdMappingResponse = await STExpress.getUserIdMapping({
            userId: superTokensUserId,
          })
          assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 3)
          assert.strictEqual(getUserIdMappingResponse.status, 'OK')
          assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId)
          assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId)
        }

        // with externalUserId
        {
          const getUserIdMappingResponse = await STExpress.getUserIdMapping({
            userId: externalId,
          })
          assert.strictEqual(Object.keys(getUserIdMappingResponse).length, 3)
          assert.strictEqual(getUserIdMappingResponse.status, 'OK')
          assert.strictEqual(getUserIdMappingResponse.superTokensUserId, superTokensUserId)
          assert.strictEqual(getUserIdMappingResponse.externalUserId, externalId)
        }
      }
    })
  })
})
