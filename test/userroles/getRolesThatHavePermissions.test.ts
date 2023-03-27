import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import UserRolesRecipe from 'supertokens-node/recipe/userroles'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { areArraysEqual, cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`getRolesThatHavePermissions: ${printPath(
    '[test/userroles/getRolesThatHavePermissions.test.js]',
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

  describe('getRolesThatHavePermissions', () => {
    it('get roles that have permissions', async function () {
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
      const permission = 'permission'

      // create roles with permission
      {
        for (const role in roles) {
          const result = await UserRolesRecipe.createNewRoleOrAddPermissions(roles[role], [permission])
          assert.strictEqual(result.status, 'OK')
          assert(result.createdNewRole)
        }
      }

      // retrieve roles with permission
      {
        const result = await UserRolesRecipe.getRolesThatHavePermission(permission)
        assert.strictEqual(result.status, 'OK')
        assert(areArraysEqual(roles, result.roles))
      }
    })

    it('get roles for unknown permission', async function () {
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

      // retrieve roles for unknown permission
      const result = await UserRolesRecipe.getRolesThatHavePermission('unknownPermission')
      assert.strictEqual(result.status, 'OK')
      assert.strictEqual(result.roles.length, 0)
    })
  })
})
