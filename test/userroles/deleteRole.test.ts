import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import UserRolesRecipe from 'supertokens-node/recipe/userroles'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`getPermissionsForRole: ${printPath('[test/userroles/getPermissionsForRole.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('deleteRole', () => {
    it('create roles, add them to a user and delete one of the roles', async function () {
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

      const roles = ['role1', 'role2', 'role3']
      const userId = 'user'

      // create role and it to user
      {
        for (const role in roles) {
          const result = await UserRolesRecipe.createNewRoleOrAddPermissions(roles[role], [])
          assert.strictEqual(result.status, 'OK')
          assert(result.createdNewRole)

          const response = await UserRolesRecipe.addRoleToUser(userId, roles[role])
          assert.strictEqual(response.status, 'OK')
          assert(!response.didUserAlreadyHaveRole)
        }
      }

      // delete role, check that role does not exist, check that user does not have role
      {
        const result = await UserRolesRecipe.deleteRole('role3')
        assert.strictEqual(result.status, 'OK')
        assert(result.didRoleExist)

        const allRolesResponse = await UserRolesRecipe.getAllRoles()
        assert.strictEqual(allRolesResponse.status, 'OK')
        assert.strictEqual(allRolesResponse.roles.length, 2)
        assert(!allRolesResponse.roles.includes('role3'))

        const allUserRoles = await UserRolesRecipe.getRolesForUser(userId)
        assert.strictEqual(allUserRoles.status, 'OK')
        assert.strictEqual(allUserRoles.roles.length, 2)
        assert(!allUserRoles.roles.includes('role3'))
      }
    })

    it('delete a role that does not exist', async function () {
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

      const result = await UserRolesRecipe.deleteRole('unknownRole')
      assert.strictEqual(result.status, 'OK')
      assert(!result.didRoleExist)
    })
  })
})
