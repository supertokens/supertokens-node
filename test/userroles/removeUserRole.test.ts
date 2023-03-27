import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import UserRolesRecipe from 'supertokens-node/recipe/userroles'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`removeUserRoleTest: ${printPath('[test/userroles/removeUserRole.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('removeUserRole', () => {
    it('remove role from user', async function () {
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

      const userId = 'userId'
      const role = 'role'

      // create a new role
      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, [])
        assert.strictEqual(result.status, 'OK')
        assert(result.createdNewRole)
      }

      // add the role to a user
      {
        const result = await UserRolesRecipe.addRoleToUser(userId, role)
        assert.strictEqual(result.status, 'OK')
        assert(!result.didUserAlreadyHaveRole)
      }

      // check that user has role
      {
        const result = await UserRolesRecipe.getRolesForUser(userId)
        assert.strictEqual(result.status, 'OK')
        assert.strictEqual(result.roles.length, 1)
        assert.strictEqual(result.roles[0], role)
      }

      // remove role from user
      {
        const result = await UserRolesRecipe.removeUserRole(userId, role)
        assert.strictEqual(result.status, 'OK')
        assert(result.didUserHaveRole)
      }

      // check that the user does not have the role
      {
        const result = await UserRolesRecipe.getRolesForUser(userId)
        assert.strictEqual(result.status, 'OK')
        assert.strictEqual(result.roles.length, 0)
      }
    })

    it('remove a role the user does not have', async function () {
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

      const userId = 'userId'
      const role = 'role'

      // create a new role
      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, [])
        assert.strictEqual(result.status, 'OK')
        assert(result.createdNewRole)
      }

      // remove role from user
      {
        const result = await UserRolesRecipe.removeUserRole(userId, role)
        assert.strictEqual(result.status, 'OK')
        assert(!result.didUserHaveRole)
      }
    })

    it('remove an unknown role from the user', async function () {
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

      const userId = 'userId'
      const role = 'unknownRole'

      // remove an unknown role from user
      const result = await UserRolesRecipe.removeUserRole(userId, role)
      assert.strictEqual(result.status, 'UNKNOWN_ROLE_ERROR')
    })
  })
})
