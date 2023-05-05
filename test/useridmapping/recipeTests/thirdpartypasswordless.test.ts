import assert from 'assert'
import { ProcessState } from 'supertokens-node/processState'
import STExpress from 'supertokens-node'
import ThirdPartyPasswordlessRecipe from 'supertokens-node/recipe/thirdpartypasswordless'
import SessionRecipe from 'supertokens-node/recipe/session'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../../utils'

describe(`userIdMapping with thirdPartyPasswordless: ${printPath(
    '[test/useridmapping/recipeTests/thirdpartypasswordless.test.ts]',
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

  describe('getUserById', () => {
    it('create a thirdParty and passwordless user and map their userIds, retrieve the user info using getUserById and check that the externalId is returned', async function () {
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
        recipeList: [
          ThirdPartyPasswordlessRecipe.init({
            contactMethod: 'EMAIL_OR_PHONE',
            flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
            createAndSendCustomEmail: (input) => {

            },
            createAndSendCustomTextMessage: (input) => {

            },
            providers: [
              ThirdPartyPasswordlessRecipe.Google({
                clientId: 'google',
                clientSecret: 'test',
              }),
            ],
          }),
          SessionRecipe.init(),
        ],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      {
        const email = 'test2@example.com'
        // create a new ThirdParty user
        const signUpResponse = await ThirdPartyPasswordlessRecipe.thirdPartySignInUp('google', 'tpId', email)

        // map the users id
        const user = signUpResponse.user
        const superTokensUserId = user.id
        const externalId = 'tpExternalId'
        await STExpress.createUserIdMapping({
          superTokensUserId,
          externalUserId: externalId,
        })

        // retrieve the user info using the externalId, the id in the response should be the externalId
        {
          const response = await ThirdPartyPasswordlessRecipe.getUserById(superTokensUserId)
          assert.ok(response !== undefined)
          assert.strictEqual(response.id, externalId)
          assert.strictEqual(response.email, email)
        }
      }

      {
        // create a Passwordless user
        const phoneNumber = '+911234566789'
        const codeInfo = await ThirdPartyPasswordlessRecipe.createCode({
          phoneNumber,
        })

        assert.strictEqual(codeInfo.status, 'OK')

        const consumeCodeResponse = await ThirdPartyPasswordlessRecipe.consumeCode({
          preAuthSessionId: codeInfo.preAuthSessionId,
          userInputCode: codeInfo.userInputCode,
          deviceId: codeInfo.deviceId,
        })

        assert.strictEqual(consumeCodeResponse.status, 'OK')

        const superTokensUserId = consumeCodeResponse.user.id
        const externalId = 'psExternalId'

        // create the userIdMapping
        await STExpress.createUserIdMapping({
          superTokensUserId,
          externalUserId: externalId,
        })

        // retrieve the user info using the externalId, the id in the response should be the externalId
        const response = await ThirdPartyPasswordlessRecipe.getUserById(externalId)
        assert.ok(response !== undefined)
        assert.strictEqual(response.id, externalId)
      }
    })
  })
})
