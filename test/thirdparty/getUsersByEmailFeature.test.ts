import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import ThirdPartyRecipe from 'supertokens-node/recipe/thirdparty/recipe'
import { TypeProvider, getUsersByEmail, signInUp } from 'supertokens-node/recipe/thirdparty'
import { maxVersion } from 'supertokens-node/utils'
import { Querier } from 'supertokens-node/querier'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`getUsersByEmail: ${printPath('[test/thirdparty/getUsersByEmailFeature.test.ts]')}`, () => {
  const MockThirdPartyProvider: TypeProvider = {
    id: 'mock',
  }

  const MockThirdPartyProvider2: TypeProvider = {
    id: 'mock2',
  }

  const testSTConfig = {
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
          providers: [MockThirdPartyProvider],
        },
      }),
    ],
  }

  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('invalid email yields empty users array', async () => {
    await startST()
    STExpress.init(testSTConfig)

    const apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion()
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    // given there are no users

    // when
    const thirdPartyUsers = await getUsersByEmail('john.doe@example.com')

    // then
    assert.strictEqual(thirdPartyUsers.length, 0)
  })

  it('valid email yields third party users', async () => {
    await startST()
    STExpress.init({
      ...testSTConfig,
      recipeList: [
        ThirdPartyRecipe.init({
          signInAndUpFeature: {
            providers: [MockThirdPartyProvider, MockThirdPartyProvider2],
          },
        }),
      ],
    })

    const apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion()
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    await signInUp('mock', 'thirdPartyJohnDoe', 'john.doe@example.com')
    await signInUp('mock2', 'thirdPartyDaveDoe', 'john.doe@example.com')

    const thirdPartyUsers = await getUsersByEmail('john.doe@example.com')

    assert.strictEqual(thirdPartyUsers.length, 2)

    thirdPartyUsers.forEach((user) => {
      assert.notStrictEqual(user.thirdParty.id, undefined)
      assert.notStrictEqual(user.id, undefined)
      assert.notStrictEqual(user.timeJoined, undefined)
      assert.strictEqual(user.email, 'john.doe@example.com')
    })
  })
})
