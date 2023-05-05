import assert from 'assert'
import STExpress from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import ThirdPartyEmailPassword, { emailPasswordSignUp, getUsersByEmail, thirdPartySignInUp } from 'supertokens-node/recipe/thirdpartyemailpassword'
import { maxVersion } from 'supertokens-node/utils'
import { Querier } from 'supertokens-node/querier'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`getUsersByEmail: ${printPath('[test/thirdpartyemailpassword/getUsersByEmailFeature.test.ts]')}`, () => {
  const MockThirdPartyProvider = {
    id: 'mock',
  }

  const MockThirdPartyProvider2 = {
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
      ThirdPartyEmailPassword.init({
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
        ThirdPartyEmailPassword.init({
          signInAndUpFeature: {
            providers: [MockThirdPartyProvider, MockThirdPartyProvider2],
          },
        }),
      ],
    })

    const apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion()
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    await emailPasswordSignUp('john.doe@example.com', 'somePass')
    await thirdPartySignInUp('mock', 'thirdPartyJohnDoe', 'john.doe@example.com')
    await thirdPartySignInUp('mock2', 'thirdPartyDaveDoe', 'john.doe@example.com')

    const thirdPartyUsers = await getUsersByEmail('john.doe@example.com')

    assert.strictEqual(thirdPartyUsers.length, 3)

    thirdPartyUsers.forEach((user) => {
      assert.strictEqual(user.email, 'john.doe@example.com')
    })
  })
})
