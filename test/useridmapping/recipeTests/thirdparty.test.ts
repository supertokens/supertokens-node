import assert from 'assert'
import { ProcessState } from 'supertokens-node/processState'
import STExpress from 'supertokens-node'
import ThirdPartyRecipe from 'supertokens-node/recipe/thirdparty'
import SessionRecipe from 'supertokens-node/recipe/session'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../../utils'

describe(`userIdMapping with thirdparty: ${printPath(
    '[test/useridmapping/recipeTests/thirdparty.test.js]',
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

  describe('signInUp', () => {
    it('create a thirdParty user and map their userId, signIn and check that the externalId is returned', async function () {
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
          ThirdPartyRecipe.init({
            signInAndUpFeature: {
              providers: [
                ThirdPartyRecipe.Google({
                  clientId: 'test',
                  clientSecret: 'test',
                }),
              ],
            },
          }),
          SessionRecipe.init(),
        ],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a thirdParty user
      const signInUpResponse = await ThirdPartyRecipe.signInUp('google', 'tpId', 'test@example.com')

      assert.strictEqual(signInUpResponse.status, 'OK')
      const superTokensUserId = signInUpResponse.user.id
      const externalId = 'externalId'
      // create the userIdMapping
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })

      // sign in and check that the userId in the response is the externalId
      const response = await ThirdPartyRecipe.signInUp('google', 'tpId', 'test@example.com')

      assert.strictEqual(response.status, 'OK')
      assert.strictEqual(response.createdNewUser, false)
      assert.strictEqual(response.user.id, externalId)
    })
  })

  describe('getUserById', () => {
    it('create a thirdParty user and map their userId, retrieve the user info using getUserById and check that the externalId is returned', async function () {
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
          ThirdPartyRecipe.init({
            signInAndUpFeature: {
              providers: [
                ThirdPartyRecipe.Google({
                  clientId: 'test',
                  clientSecret: 'test',
                }),
              ],
            },
          }),
          SessionRecipe.init(),
        ],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a thirdParty user
      const signInUpResponse = await ThirdPartyRecipe.signInUp('google', 'tpId', 'test@example.com')

      assert.strictEqual(signInUpResponse.status, 'OK')
      const superTokensUserId = signInUpResponse.user.id
      const externalId = 'externalId'

      // create the userIdMapping
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })

      // retrieve the user
      const response = await ThirdPartyRecipe.getUserById(externalId)
      assert.ok(response != undefined)
      assert.strictEqual(response.id, externalId)
    })
  })

  describe('getUsersByEmail', () => {
    it('create a thirdParty user and map their userId, retrieve the user info using getUsersByEmail and check that the externalId is returned', async function () {
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
          ThirdPartyRecipe.init({
            signInAndUpFeature: {
              providers: [
                ThirdPartyRecipe.Google({
                  clientId: 'test',
                  clientSecret: 'test',
                }),
              ],
            },
          }),
          SessionRecipe.init(),
        ],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a thirdParty user
      const signInUpResponse = await ThirdPartyRecipe.signInUp('google', 'tpId', 'test@example.com')

      assert.strictEqual(signInUpResponse.status, 'OK')
      const superTokensUserId = signInUpResponse.user.id
      const externalId = 'externalId'

      // create the userIdMapping
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })

      // retrieve the user
      const response = await ThirdPartyRecipe.getUsersByEmail('test@example.com')
      assert.strictEqual(response.length, 1)
      assert.strictEqual(response[0].id, externalId)
    })
  })

  describe('getUserByThirdPartyInfo', () => {
    it('create a thirdParty user and map their userId, retrieve the user info using getUserByThirdPartyInfo and check that the externalId is returned', async function () {
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
          ThirdPartyRecipe.init({
            signInAndUpFeature: {
              providers: [
                ThirdPartyRecipe.Google({
                  clientId: 'test',
                  clientSecret: 'test',
                }),
              ],
            },
          }),
          SessionRecipe.init(),
        ],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a thirdParty user
      const thirdPartyId = 'google'
      const thirdPartyUserId = 'tpId'
      const signInUpResponse = await ThirdPartyRecipe.signInUp(thirdPartyId, thirdPartyUserId, 'test@example.com')

      assert.strictEqual(signInUpResponse.status, 'OK')
      const superTokensUserId = signInUpResponse.user.id
      const externalId = 'externalId'

      // create the userIdMapping
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })

      // retrieve the user
      const response = await ThirdPartyRecipe.getUserByThirdPartyInfo(thirdPartyId, thirdPartyUserId)
      assert.ok(response != undefined)
      assert.strictEqual(response.id, externalId)
    })
  })
})
