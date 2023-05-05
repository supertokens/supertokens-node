import assert from 'assert'
import { ProcessState } from 'supertokens-node/processState'
import STExpress from 'supertokens-node'
import EmailPasswordRecipe from 'supertokens-node/recipe/emailpassword'
import UserMetadataRecipe from 'supertokens-node/recipe/usermetadata'
import SessionRecipe from 'supertokens-node/recipe/session'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../../utils'

describe(`userIdMapping with supertokens recipe: ${printPath(
    '[test/useridmapping/recipeTests/supertokens.test.ts]',
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

  describe('deleteUser', () => {
    it('create an emailPassword user and map their userId, then delete user with the externalId', async function () {
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

      // create a new EmailPassword User
      const email = 'test@example.com'
      const password = 'testPass123'

      const signUpResponse = await EmailPasswordRecipe.signUp(email, password)
      assert.strictEqual(signUpResponse.status, 'OK')
      const user = signUpResponse.user
      const superTokensUserId = user.id

      // retrieve the users info, the id should be the superTokens userId
      {
        const response = await EmailPasswordRecipe.getUserById(superTokensUserId)
        assert.strictEqual(response.id, superTokensUserId)
      }

      const externalId = 'externalId'

      // map the users id
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })

      // retrieve the users info using the superTokensUserId, the id in the response should be the externalId
      {
        const response = await EmailPasswordRecipe.getUserById(superTokensUserId)
        assert.ok(response !== undefined)
        assert.strictEqual(response.id, externalId)
        assert.strictEqual(response.email, email)
      }

      // add userMetadata to the user mapped with the externalId
      {
        const testMetadata = {
          role: 'admin',
        }
        await UserMetadataRecipe.updateUserMetadata(externalId, testMetadata)

        // retrieve UserMetadata and check that it exists
        const response = await UserMetadataRecipe.getUserMetadata(externalId)
        assert.strictEqual(response.status, 'OK')
        assert.deepStrictEqual(response.metadata, testMetadata)
      }

      {
        const response = await STExpress.deleteUser(externalId)
        assert.strictEqual(response.status, 'OK')
      }

      // check that user does not exist
      {
        const response = await EmailPasswordRecipe.getUserById(superTokensUserId)
        assert.ok(response === undefined)
      }
      // check that no metadata exists for the id
      {
        const response = await UserMetadataRecipe.getUserMetadata(externalId)
        assert.strictEqual(Object.keys(response.metadata).length, 0)
      }
    })
  })

  describe('getUsers', () => {
    it('create multiple users and map one of the users userId, retrieve all users and check that response will contain the externalId for the mapped user', async function () {
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

      // create multiple users
      const email = ['test@example.com', 'test1@example.com', 'test2@example.com', 'test3@example.com']
      const password = 'testPass123'
      const users = []

      for (let i = 0; i < email.length; i++) {
        const signUpResponse = await EmailPasswordRecipe.signUp(email[i], password)
        assert.strictEqual(signUpResponse.status, 'OK')
        users.push(signUpResponse.user)
      }

      // the first users userId
      const superTokensUserId = users[0].id

      const externalId = 'externalId'

      // map the users id
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })

      // retrieve all the users using getUsersNewestFirst
      {
        const response = await STExpress.getUsersNewestFirst()
        assert.strictEqual(response.users.length, 4)
        // since the first user we created has their userId mapped we access the last element from the users array in the response
        const oldestUsersId = response.users[response.users.length - 1].user.id
        assert.strictEqual(oldestUsersId, externalId)
      }

      // retrieve all the users using getUsersOldestFirst
      {
        const response = await STExpress.getUsersOldestFirst()
        assert.strictEqual(response.users.length, 4)

        const oldestUsersId = response.users[0].user.id
        assert.strictEqual(oldestUsersId, externalId)
      }
    })
  })
})
