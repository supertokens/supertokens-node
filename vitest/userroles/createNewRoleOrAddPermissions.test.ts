import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import UserRolesRecipe from 'supertokens-node/recipe/userroles'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { areArraysEqual, cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`createNewRoleOrAddPermissionsTest: ${printPath(
    '[test/userroles/createNewRoleOrAddPermissions.test.js]',
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

  describe('createNewRoleOrAddPermissions', () => {
    it('create a new role', async function () {
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

      const result = await UserRolesRecipe.createNewRoleOrAddPermissions('newRole', [])
      assert.strictEqual(result.status, 'OK')
      assert(result.createdNewRole)
    })

    it('create the same role twice', async function () {
      await startST()

      const role = 'role'

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

      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, [])
        assert.strictEqual(result.status, 'OK')
        assert(result.createdNewRole)
      }

      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, [])
        assert.strictEqual(result.status, 'OK')
        assert(!result.createdNewRole)
      }
    })

    it('create a role with permissions', async function () {
      await startST()

      const role = 'role'
      const permissions = ['permission1']

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

      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions)
        assert.strictEqual(result.status, 'OK')
        assert(result.createdNewRole)
      }

      {
        // get permissions for roles
        const result = await UserRolesRecipe.getPermissionsForRole(role)
        assert.strictEqual(result.status, 'OK')
        assert(areArraysEqual(result.permissions, permissions))
      }
    })

    it('add new permissions to a role', async function () {
      await startST()

      const role = 'role'
      const permissions = ['permission1']

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

      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions)
        assert.strictEqual(result.status, 'OK')
        assert(result.createdNewRole)
      }

      // add additional permissions to the role

      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, [
          'permission2',
          'permission3',
        ])
        assert.strictEqual(result.status, 'OK')
        assert(!result.createdNewRole)
      }

      // check that the permissions have been added

      {
        const finalPermissions = ['permission1', 'permission2', 'permission3']
        const result = await UserRolesRecipe.getPermissionsForRole(role)
        assert.strictEqual(result.status, 'OK')
        assert(areArraysEqual(finalPermissions, result.permissions))
      }
    })

    it('add duplicate permission', async function () {
      await startST()

      const role = 'role'
      const permissions = ['permission1']

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

      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions)
        assert.strictEqual(result.status, 'OK')
        assert(result.createdNewRole)
      }

      // add duplicate permissions to the role

      {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(role, permissions)
        assert.strictEqual(result.status, 'OK')
        assert(!result.createdNewRole)
      }

      // check that no additional permission has been added

      {
        const result = await UserRolesRecipe.getPermissionsForRole(role)
        assert.strictEqual(result.status, 'OK')
        assert(areArraysEqual(result.permissions, permissions))
      }
    })
  })
})
