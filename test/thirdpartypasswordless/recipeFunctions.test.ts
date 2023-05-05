/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import assert from 'assert'
import STExpress from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import ThirdPartyPasswordless from 'supertokens-node/recipe/thirdpartypasswordless'
import { ProcessState } from 'supertokens-node/processState'
import EmailVerification from 'supertokens-node/recipe/emailverification'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, isCDIVersionCompatible, killAllST, printPath, setKeyValueInConfig, setupST, startST } from '../utils'

describe(`recipeFunctions: ${printPath('[test/thirdpartypasswordless/recipeFunctions.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  // test that creating a user with ThirdParty, and they have a verified email that, isEmailVerified returns true and the opposite case
  it('test with thirdPartyPasswordless, for ThirdParty user that isEmailVerified returns the correct email verification status', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        EmailVerification.init({ mode: 'OPTIONAL' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL_OR_PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [{}],
          createAndSendCustomEmail: (input) => {

          },
          createAndSendCustomTextMessage: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    // create a ThirdParty user with a verified email
    const response = await ThirdPartyPasswordless.thirdPartySignInUp(
      'customProvider',
      'verifiedUser',
      'test@example.com',
    )

    // verify the user's email
    const emailVerificationToken = await EmailVerification.createEmailVerificationToken(response.user.id)
    await EmailVerification.verifyEmailUsingToken(emailVerificationToken.token)

    // check that the ThirdParty user's email is verified
    assert(await EmailVerification.isEmailVerified(response.user.id))

    // create a ThirdParty user with an unverfied email and check that it is not verified
    const response2 = await ThirdPartyPasswordless.thirdPartySignInUp(
      'customProvider2',
      'NotVerifiedUser',
      'test@example.com',
    )

    assert(!(await EmailVerification.isEmailVerified(response2.user.id)))
  })

  it('test with thirdPartyPasswordless, for Passwordless user that isEmailVerified returns true for both email and phone', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        EmailVerification.init({ mode: 'OPTIONAL' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL_OR_PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomEmail: (input) => {

          },
          createAndSendCustomTextMessage: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    // create a Passwordless user with email
    const response = await ThirdPartyPasswordless.passwordlessSignInUp({
      email: 'test@example.com',
    })

    // verify the user's email
    const emailVerificationToken = await EmailVerification.createEmailVerificationToken(response.user.id)
    await EmailVerification.verifyEmailUsingToken(emailVerificationToken.token)

    // check that the Passwordless user's email is verified
    assert(await EmailVerification.isEmailVerified(response.user.id))

    // check that creating an email verification with a verified passwordless user should return EMAIL_ALREADY_VERIFIED_ERROR
    assert(
      (await EmailVerification.createEmailVerificationToken(response.user.id)).status
                === 'EMAIL_ALREADY_VERIFIED_ERROR',
    )

    // create a Passwordless user with phone and check that it is verified
    const response2 = await ThirdPartyPasswordless.passwordlessSignInUp({
      phoneNumber: '+123456789012',
    })

    // check that the Passwordless phone number user's is automatically verified
    assert(await EmailVerification.isEmailVerified(response2.user.id))

    // check that creating an email verification with a phone-based passwordless user should return EMAIL_ALREADY_VERIFIED_ERROR
    assert.equal(
      (await EmailVerification.createEmailVerificationToken(response2.user.id)).status,
      'EMAIL_ALREADY_VERIFIED_ERROR',
    )
  })

  it('test with thirdPartyPasswordless, getUser functionality', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    {
      const user = (
        await ThirdPartyPasswordless.passwordlessSignInUp({
          email: 'test@example.com',
        })
      ).user

      const userId = user.id
      const result = await ThirdPartyPasswordless.getUserById(userId)

      assert(result.id === user.id)
      assert(result.email !== undefined && user.email === result.email)
      assert(result.phoneNumber === undefined)
      assert(typeof result.timeJoined === 'number')
      assert(Object.keys(result).length === 3)
    }

    {
      const users = await ThirdPartyPasswordless.getUsersByEmail({
        email: 'random',
      })

      assert(users.length === 0)

      const user = (
        await ThirdPartyPasswordless.passwordlessSignInUp({
          email: 'test@example.com',
        })
      ).user

      const result = await ThirdPartyPasswordless.getUsersByEmail(user.email)

      assert(result.length === 1)

      const userInfo = result[0]

      assert(userInfo.id === user.id)
      assert(userInfo.email === user.email)
      assert(userInfo.phoneNumber === undefined)
      assert(typeof userInfo.timeJoined === 'number')
      assert(Object.keys(userInfo).length === 3)
    }

    {
      let user = await ThirdPartyPasswordless.getUserByPhoneNumber({
        phoneNumber: 'random',
      })

      assert(user === undefined)

      user = (
        await ThirdPartyPasswordless.passwordlessSignInUp({
          phoneNumber: '+1234567890',
        })
      ).user

      const result = await ThirdPartyPasswordless.getUserByPhoneNumber({
        phoneNumber: user.phoneNumber,
      })
      assert(result.id === user.id)
      assert(result.phoneNumber !== undefined && user.phoneNumber === result.phoneNumber)
      assert(result.email === undefined)
      assert(typeof result.timeJoined === 'number')
      assert(Object.keys(result).length === 3)
    }
  })

  it('test with thirdPartyPasswordless, createCode test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    {
      const resp = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
      })

      assert(resp.status === 'OK')
      assert(typeof resp.preAuthSessionId === 'string')
      assert(typeof resp.codeId === 'string')
      assert(typeof resp.deviceId === 'string')
      assert(typeof resp.userInputCode === 'string')
      assert(typeof resp.linkCode === 'string')
      assert(typeof resp.codeLifetime === 'number')
      assert(typeof resp.timeCreated === 'number')
      assert(Object.keys(resp).length === 8)
    }

    {
      const resp = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
        userInputCode: '123',
      })

      assert(resp.status === 'OK')
      assert(typeof resp.preAuthSessionId === 'string')
      assert(typeof resp.codeId === 'string')
      assert(typeof resp.deviceId === 'string')
      assert(typeof resp.userInputCode === 'string')
      assert(typeof resp.linkCode === 'string')
      assert(typeof resp.codeLifetime === 'number')
      assert(typeof resp.timeCreated === 'number')
      assert(Object.keys(resp).length === 8)
    }
  })

  it('thirdPartyPasswordless createNewCodeForDevice test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    {
      let resp = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
      })

      resp = await ThirdPartyPasswordless.createNewCodeForDevice({
        deviceId: resp.deviceId,
      })

      assert(resp.status === 'OK')
      assert(typeof resp.preAuthSessionId === 'string')
      assert(typeof resp.codeId === 'string')
      assert(typeof resp.deviceId === 'string')
      assert(typeof resp.userInputCode === 'string')
      assert(typeof resp.linkCode === 'string')
      assert(typeof resp.codeLifetime === 'number')
      assert(typeof resp.timeCreated === 'number')
      assert(Object.keys(resp).length === 8)
    }

    {
      let resp = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
      })

      resp = await ThirdPartyPasswordless.createNewCodeForDevice({
        deviceId: resp.deviceId,
        userInputCode: '1234',
      })

      assert(resp.status === 'OK')
      assert(typeof resp.preAuthSessionId === 'string')
      assert(typeof resp.codeId === 'string')
      assert(typeof resp.deviceId === 'string')
      assert(typeof resp.userInputCode === 'string')
      assert(typeof resp.linkCode === 'string')
      assert(typeof resp.codeLifetime === 'number')
      assert(typeof resp.timeCreated === 'number')
      assert(Object.keys(resp).length === 8)
    }

    {
      let resp = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
      })

      resp = await ThirdPartyPasswordless.createNewCodeForDevice({
        deviceId: 'random',
      })

      assert(resp.status === 'RESTART_FLOW_ERROR')
      assert(Object.keys(resp).length === 1)
    }

    {
      let resp = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
        userInputCode: '1234',
      })

      resp = await ThirdPartyPasswordless.createNewCodeForDevice({
        deviceId: resp.deviceId,
        userInputCode: '1234',
      })

      assert(resp.status === 'USER_INPUT_CODE_ALREADY_USED_ERROR')
      assert(Object.keys(resp).length === 1)
    }
  })

  it('thirdPartyPasswordless consumeCode test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    {
      const codeInfo = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
      })

      const resp = await ThirdPartyPasswordless.consumeCode({
        preAuthSessionId: codeInfo.preAuthSessionId,
        userInputCode: codeInfo.userInputCode,
        deviceId: codeInfo.deviceId,
      })

      assert(resp.status === 'OK')
      assert(resp.createdNewUser)
      assert(typeof resp.user.id === 'string')
      assert(resp.user.email === 'test@example.com')
      assert(resp.user.phoneNumber === undefined)
      assert(typeof resp.user.timeJoined === 'number')
      assert(Object.keys(resp).length === 3)
      assert(Object.keys(resp.user).length === 3)
    }

    {
      const codeInfo = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
      })

      const resp = await ThirdPartyPasswordless.consumeCode({
        preAuthSessionId: codeInfo.preAuthSessionId,
        userInputCode: 'random',
        deviceId: codeInfo.deviceId,
      })

      assert(resp.status === 'INCORRECT_USER_INPUT_CODE_ERROR')
      assert(resp.failedCodeInputAttemptCount === 1)
      assert(resp.maximumCodeInputAttempts === 5)
      assert(Object.keys(resp).length === 3)
    }

    {
      const codeInfo = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
      })

      try {
        await ThirdPartyPasswordless.consumeCode({
          preAuthSessionId: 'random',
          userInputCode: codeInfo.userInputCode,
          deviceId: codeInfo.deviceId,
        })
        assert(false)
      }
      catch (err) {
        assert(err.message.includes('preAuthSessionId and deviceId doesn\'t match'))
      }
    }
  })

  it('thirdPartyPasswordless, consumeCode test with EXPIRED_USER_INPUT_CODE_ERROR', async () => {
    await setKeyValueInConfig('passwordless_code_lifetime', 1000) // one second lifetime
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    {
      const codeInfo = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
      })

      await new Promise(r => setTimeout(r, 2000)) // wait for code to expire

      const resp = await ThirdPartyPasswordless.consumeCode({
        preAuthSessionId: codeInfo.preAuthSessionId,
        userInputCode: codeInfo.userInputCode,
        deviceId: codeInfo.deviceId,
      })

      assert(resp.status === 'EXPIRED_USER_INPUT_CODE_ERROR')
      assert(resp.failedCodeInputAttemptCount === 1)
      assert(resp.maximumCodeInputAttempts === 5)
      assert(Object.keys(resp).length === 3)
    }
  })

  // updateUser
  it('thirdPartyPasswordless, updateUser contactMethod email test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const userInfo = await ThirdPartyPasswordless.passwordlessSignInUp({
      email: 'test@example.com',
    })
    {
      // update users email
      const response = await ThirdPartyPasswordless.updatePasswordlessUser({
        userId: userInfo.user.id,
        email: 'test2@example.com',
      })
      assert(response.status === 'OK')

      const result = await ThirdPartyPasswordless.getUserById(userInfo.user.id)

      assert(result.email === 'test2@example.com')
    }
    {
      // update user with invalid userId
      const response = await ThirdPartyPasswordless.updatePasswordlessUser({
        userId: 'invalidUserId',
        email: 'test2@example.com',
      })

      assert(response.status === 'UNKNOWN_USER_ID_ERROR')
    }
    {
      // update user with an email that already exists
      const userInfo2 = await ThirdPartyPasswordless.passwordlessSignInUp({
        email: 'test3@example.com',
      })

      const result = await ThirdPartyPasswordless.updatePasswordlessUser({
        userId: userInfo2.user.id,
        email: 'test2@example.com',
      })

      assert(result.status === 'EMAIL_ALREADY_EXISTS_ERROR')
    }
  })

  it('thirdPartyPasswordless, updateUser contactMethod phone test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const phoneNumber_1 = '+1234567891'
    const phoneNumber_2 = '+1234567892'
    const phoneNumber_3 = '+1234567893'

    const userInfo = await ThirdPartyPasswordless.passwordlessSignInUp({
      phoneNumber: phoneNumber_1,
    })

    {
      // update users email
      const response = await ThirdPartyPasswordless.updatePasswordlessUser({
        userId: userInfo.user.id,
        phoneNumber: phoneNumber_2,
      })
      assert(response.status === 'OK')

      const result = await ThirdPartyPasswordless.getUserById(userInfo.user.id)

      assert(result.phoneNumber === phoneNumber_2)
    }
    {
      // update user with a phoneNumber that already exists
      const userInfo2 = await ThirdPartyPasswordless.passwordlessSignInUp({
        phoneNumber: phoneNumber_3,
      })

      const result = await ThirdPartyPasswordless.updatePasswordlessUser({
        userId: userInfo2.user.id,
        phoneNumber: phoneNumber_2,
      })

      assert(result.status === 'PHONE_NUMBER_ALREADY_EXISTS_ERROR')
    }
  })

  // revokeAllCodes
  it('thirdPartyPasswordless, revokeAllCodes test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const codeInfo_1 = await ThirdPartyPasswordless.createCode({
      email: 'test@example.com',
    })

    const codeInfo_2 = await ThirdPartyPasswordless.createCode({
      email: 'test@example.com',
    })

    {
      const result = await ThirdPartyPasswordless.revokeAllCodes({
        email: 'test@example.com',
      })

      assert(result.status === 'OK')
    }

    {
      const result_1 = await ThirdPartyPasswordless.consumeCode({
        preAuthSessionId: codeInfo_1.preAuthSessionId,
        deviceId: codeInfo_1.deviceId,
        userInputCode: codeInfo_1.userInputCode,
      })

      assert(result_1.status === 'RESTART_FLOW_ERROR')

      const result_2 = await ThirdPartyPasswordless.consumeCode({
        preAuthSessionId: codeInfo_2.preAuthSessionId,
        deviceId: codeInfo_2.deviceId,
        userInputCode: codeInfo_2.userInputCode,
      })

      assert(result_2.status === 'RESTART_FLOW_ERROR')
    }
  })

  it('thirdPartyPasswordless, revokeCode test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const codeInfo_1 = await ThirdPartyPasswordless.createCode({
      email: 'test@example.com',
    })

    const codeInfo_2 = await ThirdPartyPasswordless.createCode({
      email: 'test@example.com',
    })

    {
      const result = await ThirdPartyPasswordless.revokeCode({
        codeId: codeInfo_1.codeId,
      })

      assert(result.status === 'OK')
    }

    {
      const result_1 = await ThirdPartyPasswordless.consumeCode({
        preAuthSessionId: codeInfo_1.preAuthSessionId,
        deviceId: codeInfo_1.deviceId,
        userInputCode: codeInfo_1.userInputCode,
      })

      assert(result_1.status === 'RESTART_FLOW_ERROR')

      const result_2 = await ThirdPartyPasswordless.consumeCode({
        preAuthSessionId: codeInfo_2.preAuthSessionId,
        deviceId: codeInfo_2.deviceId,
        userInputCode: codeInfo_2.userInputCode,
      })

      assert(result_2.status === 'OK')
    }
  })

  // listCodesByEmail
  it('thirdPartyPasswordless, listCodesByEmail test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const codeInfo_1 = await ThirdPartyPasswordless.createCode({
      email: 'test@example.com',
    })

    const codeInfo_2 = await ThirdPartyPasswordless.createCode({
      email: 'test@example.com',
    })

    const result = await ThirdPartyPasswordless.listCodesByEmail({
      email: 'test@example.com',
    })
    assert(result.length === 2)
    result.forEach((element) => {
      element.codes.forEach((code) => {
        if (!(code.codeId === codeInfo_1.codeId || code.codeId === codeInfo_2.codeId))
          assert(false)
      })
    })
  })

  // listCodesByPhoneNumber
  it('thirdPartyPasswordless, listCodesByPhoneNumber test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const codeInfo_1 = await ThirdPartyPasswordless.createCode({
      phoneNumber: '+1234567890',
    })

    const codeInfo_2 = await ThirdPartyPasswordless.createCode({
      phoneNumber: '+1234567890',
    })

    const result = await ThirdPartyPasswordless.listCodesByPhoneNumber({
      phoneNumber: '+1234567890',
    })
    assert(result.length === 2)
    result.forEach((element) => {
      element.codes.forEach((code) => {
        if (!(code.codeId === codeInfo_1.codeId || code.codeId === codeInfo_2.codeId))
          assert(false)
      })
    })
  })

  // listCodesByDeviceId and listCodesByPreAuthSessionId
  it('thirdPartyPasswordless, listCodesByDeviceId and listCodesByPreAuthSessionId test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const codeInfo_1 = await ThirdPartyPasswordless.createCode({
      phoneNumber: '+1234567890',
    })

    {
      const result = await ThirdPartyPasswordless.listCodesByDeviceId({
        deviceId: codeInfo_1.deviceId,
      })
      assert(result.codes[0].codeId === codeInfo_1.codeId)
    }

    {
      const result = await ThirdPartyPasswordless.listCodesByPreAuthSessionId({
        preAuthSessionId: codeInfo_1.preAuthSessionId,
      })
      assert(result.codes[0].codeId === codeInfo_1.codeId)
    }
  })

  /*
    - createMagicLink
    - check that the magicLink format is {websiteDomain}{websiteBasePath}/verify?rid=passwordless&preAuthSessionId=<some string>#linkCode
    */

  it('thirdPartyPasswordless, createMagicLink test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const result = await ThirdPartyPasswordless.createMagicLink({
      phoneNumber: '+1234567890',
    })

    const magicLinkURL = new URL(result)

    assert(magicLinkURL.hostname === 'supertokens.io')
    assert(magicLinkURL.pathname === '/auth/verify')
    assert(magicLinkURL.searchParams.get('rid') === 'thirdpartypasswordless')
    assert(typeof magicLinkURL.searchParams.get('preAuthSessionId') === 'string')
    assert(magicLinkURL.hash.length > 1)
  })

  // signInUp test
  it('thirdPartyPasswordless, signInUp test', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        ThirdPartyPasswordless.init({
          contactMethod: 'PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const result = await ThirdPartyPasswordless.passwordlessSignInUp({
      phoneNumber: '+12345678901',
    })

    assert(result.status === 'OK')
    assert(result.createdNewUser === true)
    assert(Object.keys(result).length === 3)

    assert(result.user.phoneNumber === '+12345678901')
    assert(typeof result.user.id === 'string')
    assert(typeof result.user.timeJoined === 'number')
    assert(Object.keys(result.user).length === 3)
  })
})
