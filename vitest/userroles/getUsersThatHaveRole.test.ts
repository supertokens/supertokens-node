import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import UserRolesRecipe from 'supertokens-node/recipe/userroles'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { areArraysEqual, cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`getUsersThatHaveRole: ${printPath('[test/userroles/getUsersThatHaveRole.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('getUsersThatHaveRole', () => {
    it('get users for a role', async function () {
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
        recipeList: [SessionRecipe.init(), UserRolesRecipe.init()],
      })

      // Only run for version >= 2.14
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.13') === '2.13')
        return this.skip()

      const users = ['user1', 'user2', 'user3']
      const role = 'role'

      // create role
      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, [])
        assert.strictEqual(result.status, 'OK')
        assert(result.createdNewRole)
      }

      // add them to a user
      for (const user in users) {
        const response = await UserRolesRecipe.addRoleToUser(users[user], role)
        assert.strictEqual(response.status, 'OK')
        assert(!response.didUserAlreadyHaveRole)
      }

      // retrieve the users for role
      const result = await UserRolesRecipe.getUsersThatHaveRole(role)
      assert.strictEqual(result.status, 'OK')
      assert(areArraysEqual(users, result.users))
    })

    it('get users for an unknown role', async function () {
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
        recipeList: [SessionRecipe.init(), UserRolesRecipe.init()],
      })

      // Only run for version >= 2.14
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.13') === '2.13')
        return this.skip()

      // retrieve the users for role which that not exist
      const result = await UserRolesRecipe.getUsersThatHaveRole('unknownRole')
      assert.strictEqual(result.status, 'UNKNOWN_ROLE_ERROR')
    })
  })
})
