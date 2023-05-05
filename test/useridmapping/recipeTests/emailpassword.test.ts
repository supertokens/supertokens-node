import assert from 'assert'
import { afterAll, beforeEach, describe, it } from 'vitest'
import STExpress from 'supertokens-node'
import EmailPasswordRecipe from 'supertokens-node/recipe/emailpassword'
import SessionRecipe from 'supertokens-node/recipe/session'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { ProcessState } from 'supertokens-node/processState'
import { cleanST, killAllST, printPath, setupST, startST } from '../../utils'

describe(`userIdMapping with emailpassword: ${printPath(
    '[test/useridmapping/recipeTests/emailpassword.test.ts]',
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
    it('create an emailPassword user and map their userId, retrieve the user info using getUserById and check that the externalId is returned', async function () {
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
        recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a new EmailPassword User
      const email = 'test@example.com'
      const password = 'testPass123'

      const signUpResponse = await EmailPasswordRecipe.signUp(email, password)
      assert.strictEqual(signUpResponse.status, 'OK')
      const user = signUpResponse.user
      const superTokensUserId = user.id

      // retrieve the users info, the id should be the superTokens userId
      {
        const response = await EmailPasswordRecipe.getUserById(superTokensUserId)
        assert.strictEqual(response.id, superTokensUserId)
      }

      const externalId = 'externalId'

      // map the users id
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })

      // retrieve the users info using the superTokensUserId, the id in the response should be the externalId
      {
        const response = await EmailPasswordRecipe.getUserById(superTokensUserId)
        assert.ok(response !== undefined)
        assert.strictEqual(response.id, externalId)
        assert.strictEqual(response.email, email)
      }

      // retrieve the users info using the externalId, the id in the response should be the externalId
      {
        const response = await EmailPasswordRecipe.getUserById(externalId)
        assert.ok(response !== undefined)
        assert.strictEqual(response.id, externalId)
        assert.strictEqual(response.email, email)
      }
    })
  })

  describe('getUserByEmail', () => {
    it('create an emailPassword user and map their userId, retrieve the user info using getUserByEmail and check that the externalId is returned', async function () {
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
        recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a new EmailPassword User
      const email = 'test@example.com'
      const password = 'testPass123'

      const signUpResponse = await EmailPasswordRecipe.signUp(email, password)
      assert.strictEqual(signUpResponse.status, 'OK')
      const user = signUpResponse.user
      const superTokensUserId = user.id

      // retrieve the users info, the id should be the superTokens userId
      {
        const response = await EmailPasswordRecipe.getUserByEmail(email)
        assert.strictEqual(response.id, superTokensUserId)
      }

      const externalId = 'externalId'

      // map the users id
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })

      // retrieve the users info using email, the id in the response should be the externalId
      {
        const response = await EmailPasswordRecipe.getUserByEmail(email)
        assert.ok(response !== undefined)
        assert.strictEqual(response.id, externalId)
        assert.strictEqual(response.email, email)
      }
    })
  })

  describe('signIn', () => {
    it('create an emailPassword user and map their userId, signIn, check that the userRetrieved has the mapped userId', async function () {
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
        recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a new EmailPassword User
      const email = 'test@example.com'
      const password = 'testPass123'

      const signUpResponse = await EmailPasswordRecipe.signUp(email, password)
      assert.strictEqual(signUpResponse.status, 'OK')
      const user = signUpResponse.user
      const superTokensUserId = user.id

      // retrieve the users info, the id should be the superTokens userId
      {
        const response = await EmailPasswordRecipe.getUserByEmail(email)
        assert.strictEqual(response.id, superTokensUserId)
      }

      const externalId = 'externalId'

      // map the users id
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })

      // sign in, check that the userId retrieved is the external userId
      const signInResponse = await EmailPasswordRecipe.signIn(email, password)
      assert.strictEqual(signInResponse.status, 'OK')
      assert.strictEqual(signInResponse.user.id, externalId)
    })
  })

  describe('password reset', () => {
    it('create an emailPassword user and map their userId, and do a password reset using the external id, check that it gets reset', async function () {
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
        recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a new EmailPassword User
      const email = 'test@example.com'
      const password = 'testPass123'

      const signUpResponse = await EmailPasswordRecipe.signUp(email, password)
      assert.strictEqual(signUpResponse.status, 'OK')
      const user = signUpResponse.user
      const superTokensUserId = user.id

      // retrieve the users info, the id should be the superTokens userId
      {
        const response = await EmailPasswordRecipe.getUserByEmail(email)
        assert.strictEqual(response.id, superTokensUserId)
      }

      // map the userId
      const externalId = 'externalId'
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })
      // create the password resestToken
      const createResetPasswordTokenResponse = await EmailPasswordRecipe.createResetPasswordToken(externalId)
      assert.strictEqual(createResetPasswordTokenResponse.status, 'OK')

      // reset the password
      const newPassword = 'newTestPass123'
      const resetPasswordUsingTokenResponse = await EmailPasswordRecipe.resetPasswordUsingToken(
        createResetPasswordTokenResponse.token,
        newPassword,
      )
      assert.strictEqual(resetPasswordUsingTokenResponse.status, 'OK')
      assert.strictEqual(resetPasswordUsingTokenResponse.userId, externalId)

      // check that the password is reset by signing in
      const response = await EmailPasswordRecipe.signIn(email, newPassword)
      assert.strictEqual(response.status, 'OK')
      assert.strictEqual(response.user.id, externalId)
    })
  })

  describe('update email and password', () => {
    it('create an emailPassword user and map their userId, update their email and password using the externalId', async function () {
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
        recipeList: [EmailPasswordRecipe.init(), SessionRecipe.init()],
      })

      // Only run for version >= 2.15
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.14') === '2.14')
        return this.skip()

      // create a new EmailPassword User
      const email = 'test@example.com'
      const password = 'testPass123'

      const signUpResponse = await EmailPasswordRecipe.signUp(email, password)
      assert.strictEqual(signUpResponse.status, 'OK')
      const user = signUpResponse.user
      const superTokensUserId = user.id

      // retrieve the users info, the id should be the superTokens userId
      {
        const response = await EmailPasswordRecipe.getUserByEmail(email)
        assert.strictEqual(response.id, superTokensUserId)
      }

      // map the userId
      const externalId = 'externalId'
      await STExpress.createUserIdMapping({
        superTokensUserId,
        externalUserId: externalId,
      })

      // update the email using the externalId
      const updatedEmail = 'test123@example.com'
      {
        {
          const response = await EmailPasswordRecipe.updateEmailOrPassword({
            userId: externalId,
            email: updatedEmail,
          })
          assert.strictEqual(response.status, 'OK')
        }

        // sign in with the new email
        {
          const response = await EmailPasswordRecipe.signIn(updatedEmail, password)
          assert.strictEqual(response.status, 'OK')
          assert.strictEqual(response.user.id, externalId)
        }
      }

      // update the password using the externalId
      const updatedPassword = 'newTestPass123'
      {
        {
          const response = await EmailPasswordRecipe.updateEmailOrPassword({
            userId: externalId,
            password: updatedPassword,
          })
          assert.strictEqual(response.status, 'OK')
        }

        // sign in with new password
        {
          const response = await EmailPasswordRecipe.signIn(updatedEmail, updatedPassword)
          assert.strictEqual(response.status, 'OK')
          assert.strictEqual(response.user.id, externalId)
        }
      }
    })
  })
})
