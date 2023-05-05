import assert from 'assert'
import STExpress from 'supertokens-node'
import UserRolesRecipe from 'supertokens-node/recipe/userroles'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import SessionRecipe from 'supertokens-node/recipe/session/recipe'
import { ProcessState } from 'supertokens-node/processState'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { areArraysEqual, cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`getRolesForUser: ${printPath('[test/userroles/getRolesForUser.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('getRolesForUser', () => {
    it('create roles, add them to a user check that the user has the roles', async function () {
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
      const roles = ['role1', 'role2', 'role3']

      // create roles and add them to a user

      for (const role in roles) {
        const result = await UserRolesRecipe.createNewRoleOrAddPermissions(roles[role], [])
        assert.strictEqual(result.status, 'OK')
        assert(result.createdNewRole)

        const response = await UserRolesRecipe.addRoleToUser(userId, roles[role])
        assert.strictEqual(response.status, 'OK')
        assert(!response.didUserAlreadyHaveRole)
      }

      // check that user has the roles
      const result = await UserRolesRecipe.getRolesForUser(userId)
      assert.strictEqual(result.status, 'OK')
      assert(areArraysEqual(roles, result.roles))
    })
  })
})
