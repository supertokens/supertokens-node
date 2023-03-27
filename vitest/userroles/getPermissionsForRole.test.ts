import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import UserRolesRecipe from 'supertokens-node/recipe/userroles'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { areArraysEqual, cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`getPermissionsForRole: ${printPath('[test/userroles/getPermissionsForRole.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('getPermissionsForRole', () => {
    it('get permissions for a role', async function () {
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

      const role = 'role'
      const permissions = ['permission1', 'permission2', 'permission3']

      // create role
      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions)
        assert.strictEqual(result.status, 'OK')
        assert(result.createdNewRole)
      }

      // retrieve the permissions for the role
      const result = await UserRolesRecipe.getPermissionsForRole(role)

      assert.strictEqual(result.status, 'OK')
      assert(areArraysEqual(permissions, result.permissions))
    })

    it('get permissions for an unknown role', async function () {
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

      // retrieve the users for role that does not exist
      const result = await UserRolesRecipe.getPermissionsForRole('unknownRole')
      assert.strictEqual(result.status, 'UNKNOWN_ROLE_ERROR')
    })
  })
})
