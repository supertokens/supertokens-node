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
import request from 'supertest'
import express from 'express'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, isCDIVersionCompatible, killAllST, printPath, setKeyValueInConfig, setupST, startST } from '../utils'

describe(`apisFunctions: ${printPath('[test/thirdpartypasswordless/apis.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - finish full sign up / in flow with email (create code -> consume code)
     */

  it('test for thirdPartyPasswordless, the sign up /in flow with email using the EMAIL_OR_PHONE contactMethod', async () => {
    await startST()

    let userInputCode
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
          contactMethod: 'EMAIL_OR_PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {

          },
          createAndSendCustomEmail: (input) => {
            userInputCode = input.userInputCode
          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    // createCodeAPI with email
    const validCreateCodeResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code')
        .send({
          email: 'test@example.com',
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )
    assert(validCreateCodeResponse.status === 'OK')
    assert(typeof validCreateCodeResponse.deviceId === 'string')
    assert(typeof validCreateCodeResponse.preAuthSessionId === 'string')
    assert(validCreateCodeResponse.flowType === 'USER_INPUT_CODE_AND_MAGIC_LINK')
    assert(Object.keys(validCreateCodeResponse).length === 4)

    // consumeCode API
    const validUserInputCodeResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code/consume')
        .send({
          preAuthSessionId: validCreateCodeResponse.preAuthSessionId,
          userInputCode,
          deviceId: validCreateCodeResponse.deviceId,
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )

    assert(validUserInputCodeResponse.status === 'OK')
    assert(validUserInputCodeResponse.createdNewUser === true)
    assert(typeof validUserInputCodeResponse.user.id === 'string')
    assert(typeof validUserInputCodeResponse.user.email === 'string')
    assert(typeof validUserInputCodeResponse.user.timeJoined === 'number')
    assert(Object.keys(validUserInputCodeResponse.user).length === 3)
    assert(Object.keys(validUserInputCodeResponse).length === 3)
  })

  /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - finish full sign up / in flow with phoneNumber (create code -> consume code)
     */

  it('test for thirdPartyPasswordless, the sign up /in flow with phoneNumber using the EMAIL_OR_PHONE contactMethod', async () => {
    await startST()

    let userInputCode
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
          contactMethod: 'EMAIL_OR_PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {
            userInputCode = input.userInputCode
          },
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    // createCodeAPI with phoneNumber
    const validCreateCodeResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code')
        .send({
          phoneNumber: '+12345678901',
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )
    assert(validCreateCodeResponse.status === 'OK')
    assert(typeof validCreateCodeResponse.deviceId === 'string')
    assert(typeof validCreateCodeResponse.preAuthSessionId === 'string')
    assert(validCreateCodeResponse.flowType === 'USER_INPUT_CODE_AND_MAGIC_LINK')
    assert(Object.keys(validCreateCodeResponse).length === 4)

    // consumeCode API
    const validUserInputCodeResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code/consume')
        .send({
          preAuthSessionId: validCreateCodeResponse.preAuthSessionId,
          userInputCode,
          deviceId: validCreateCodeResponse.deviceId,
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )

    assert(validUserInputCodeResponse.status === 'OK')
    assert(validUserInputCodeResponse.createdNewUser === true)
    assert(typeof validUserInputCodeResponse.user.id === 'string')
    assert(typeof validUserInputCodeResponse.user.phoneNumber === 'string')
    assert(typeof validUserInputCodeResponse.user.timeJoined === 'number')
    assert(Object.keys(validUserInputCodeResponse.user).length === 3)
    assert(Object.keys(validUserInputCodeResponse).length === 3)
  })

  /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - create code with email and then resend code and make sure that sending email function is called  while resending code
     */
  it('test for thirdPartyPasswordless creating a code with email and then resending the code and check that the sending custom email function is called while using the EMAIL_OR_PHONE contactMethod', async () => {
    await startST()

    let isCreateAndSendCustomEmailCalled = false

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
          contactMethod: 'EMAIL_OR_PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {

          },
          createAndSendCustomEmail: (input) => {
            isCreateAndSendCustomEmailCalled = true
          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    // createCodeAPI with email
    const validCreateCodeResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code')
        .send({
          email: 'test@example.com',
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )
    assert(validCreateCodeResponse.status === 'OK')
    assert(isCreateAndSendCustomEmailCalled)

    isCreateAndSendCustomEmailCalled = false

    // resendCode API
    const response = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code/resend')
        .send({
          deviceId: validCreateCodeResponse.deviceId,
          preAuthSessionId: validCreateCodeResponse.preAuthSessionId,
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )
    assert(response.status === 'OK')
    assert(isCreateAndSendCustomEmailCalled)
  })

  /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - create code with phone and then resend code and make sure that sending SMS function is called  while resending code
     */
  it('test with thirdPartyPasswordless, creating a code with phone and then resending the code and check that the sending custom SMS function is called while using the EMAIL_OR_PHONE contactMethod', async () => {
    await startST()

    let isCreateAndSendCustomTextMessageCalled = false

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
          contactMethod: 'EMAIL_OR_PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {
            isCreateAndSendCustomTextMessageCalled = true
          },
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    // createCodeAPI with email
    const validCreateCodeResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code')
        .send({
          phoneNumber: '+12345678901',
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )
    assert(validCreateCodeResponse.status === 'OK')
    assert(isCreateAndSendCustomTextMessageCalled)

    isCreateAndSendCustomTextMessageCalled = false

    // resendCode API
    const response = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code/resend')
        .send({
          deviceId: validCreateCodeResponse.deviceId,
          preAuthSessionId: validCreateCodeResponse.preAuthSessionId,
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )
    assert(response.status === 'OK')
    assert(isCreateAndSendCustomTextMessageCalled)
  })

  /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - sending both email and phone in createCode API throws bad request
     *   - sending neither email and phone in createCode API throws bad request
     */
  it('test with thirdPartyPasswordless, invalid input to createCodeAPI while using the EMAIL_OR_PHONE contactMethod', async () => {
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
          contactMethod: 'EMAIL_OR_PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {

          },
          createAndSendCustomEmail: (input) => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    {
      // sending both email and phone in createCode API throws bad request
      const response = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code')
          .send({
            phoneNumber: '+12345678901',
            email: 'test@example.com',
          })
          .expect(400)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(response.message === 'Please provide exactly one of email or phoneNumber')
    }

    {
      // sending neither email and phone in createCode API throws bad request
      const response = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code')
          .expect(400)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(response.message === 'Please provide exactly one of email or phoneNumber')
    }
  })

  /**
     * - With contactMethod = EMAIL_OR_PHONE:
     *   - do full sign in with email, then manually add a user's phone to their user Info, then so sign in with that phone number and make sure that the same userId signs in.

    */

  it('test with thirdPartyPasswordless, adding phoneNumber to a users info and signing in will sign in the same user, using the EMAIL_OR_PHONE contactMethod', async () => {
    await startST()

    let userInputCode

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
          contactMethod: 'EMAIL_OR_PHONE',
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          createAndSendCustomTextMessage: (input) => {
            userInputCode = input.userInputCode
          },
          createAndSendCustomEmail: (input) => {
            userInputCode = input.userInputCode
          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    // create a passwordless user with email
    const emailCreateCodeResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code')
        .send({
          email: 'test@example.com',
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )
    assert(emailCreateCodeResponse.status === 'OK')

    // consumeCode API
    const emailUserInputCodeResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code/consume')
        .send({
          preAuthSessionId: emailCreateCodeResponse.preAuthSessionId,
          userInputCode,
          deviceId: emailCreateCodeResponse.deviceId,
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )

    assert(emailUserInputCodeResponse.status === 'OK')

    // add users phoneNumber to userInfo
    await ThirdPartyPasswordless.updatePasswordlessUser({
      userId: emailUserInputCodeResponse.user.id,
      phoneNumber: '+12345678901',
    })

    // sign in user with phone numbers
    const phoneCreateCodeResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code')
        .send({
          phoneNumber: '+12345678901',
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )

    assert(phoneCreateCodeResponse.status === 'OK')

    const phoneUserInputCodeResponse = await new Promise(resolve =>
      request(app)
        .post('/auth/signinup/code/consume')
        .send({
          preAuthSessionId: phoneCreateCodeResponse.preAuthSessionId,
          userInputCode,
          deviceId: phoneCreateCodeResponse.deviceId,
        })
        .expect(200)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(JSON.parse(res.text))
        }),
    )

    assert(phoneUserInputCodeResponse.status === 'OK')

    // check that the same user has signed in
    assert(phoneUserInputCodeResponse.user.id === emailUserInputCodeResponse.user.id)
  })

  // check that if user has not given linkCode nor (deviceId+userInputCode), it throws a bad request error.
  it('test for thirdPartyPasswordless, not passing any fields to consumeCodeAPI', async () => {
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

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    {
      // dont send linkCode or (deviceId+userInputCode)
      const badResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code/consume')
          .send({
            preAuthSessionId: 'sessionId',
          })
          .expect(400)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(res)
          }),
      )
      assert(badResponse.res.statusMessage === 'Bad Request')
      assert(
        JSON.parse(badResponse.text).message
                    === 'Please provide one of (linkCode) or (deviceId+userInputCode) and not both',
      )
    }
  })

  it('test with thirdPartyPasswordless consumeCodeAPI with magic link', async () => {
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

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    const codeInfo = await ThirdPartyPasswordless.createCode({
      email: 'test@example.com',
    })

    {
      // send an invalid linkCode
      const letInvalidLinkCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code/consume')
          .send({
            preAuthSessionId: codeInfo.preAuthSessionId,
            linkCode: 'invalidLinkCode',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )

      assert(letInvalidLinkCodeResponse.status === 'RESTART_FLOW_ERROR')
    }

    {
      // send a valid linkCode
      const validLinkCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code/consume')
          .send({
            preAuthSessionId: codeInfo.preAuthSessionId,
            linkCode: codeInfo.linkCode,
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )

      assert(validLinkCodeResponse.status === 'OK')
      assert(validLinkCodeResponse.createdNewUser === true)
      assert(typeof validLinkCodeResponse.user.id === 'string')
      assert(typeof validLinkCodeResponse.user.email === 'string')
      assert(typeof validLinkCodeResponse.user.timeJoined === 'number')
      assert(Object.keys(validLinkCodeResponse.user).length === 3)
      assert(Object.keys(validLinkCodeResponse).length === 3)
    }
  })

  it('test with thirdPartyPasswordless, consumeCodeAPI with code', async () => {
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
          createAndSendCustomEmail: () => {

          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    const codeInfo = await ThirdPartyPasswordless.createCode({
      email: 'test@example.com',
    })

    {
      // send an incorrect userInputCode
      const incorrectUserInputCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code/consume')
          .send({
            preAuthSessionId: codeInfo.preAuthSessionId,
            userInputCode: 'invalidLinkCode',
            deviceId: codeInfo.deviceId,
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )

      assert(incorrectUserInputCodeResponse.status === 'INCORRECT_USER_INPUT_CODE_ERROR')
      assert(incorrectUserInputCodeResponse.failedCodeInputAttemptCount === 1)
      // checking default value for maximumCodeInputAttempts is 5
      assert(incorrectUserInputCodeResponse.maximumCodeInputAttempts === 5)
      assert(Object.keys(incorrectUserInputCodeResponse).length === 3)
    }

    {
      // send a valid userInputCode
      const validUserInputCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code/consume')
          .send({
            preAuthSessionId: codeInfo.preAuthSessionId,
            userInputCode: codeInfo.userInputCode,
            deviceId: codeInfo.deviceId,
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )

      assert(validUserInputCodeResponse.status === 'OK')
      assert(validUserInputCodeResponse.createdNewUser === true)
      assert(typeof validUserInputCodeResponse.user.id === 'string')
      assert(typeof validUserInputCodeResponse.user.email === 'string')
      assert(typeof validUserInputCodeResponse.user.timeJoined === 'number')
      assert(Object.keys(validUserInputCodeResponse.user).length === 3)
      assert(Object.keys(validUserInputCodeResponse).length === 3)
    }

    {
      // send a used userInputCode
      const usedUserInputCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code/consume')
          .send({
            preAuthSessionId: codeInfo.preAuthSessionId,
            userInputCode: codeInfo.userInputCode,
            deviceId: codeInfo.deviceId,
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(usedUserInputCodeResponse.status === 'RESTART_FLOW_ERROR')
    }
  })

  it('test with thirdPartyPasswordless, consumeCodeAPI with expired code', async () => {
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

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    {
      const codeInfo = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
      })

      await new Promise(r => setTimeout(r, 2000)) // wait for code to expire
      const expiredUserInputCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code/consume')
          .send({
            preAuthSessionId: codeInfo.preAuthSessionId,
            userInputCode: codeInfo.userInputCode,
            deviceId: codeInfo.deviceId,
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(JSON.parse(res.text))
          }),
      )

      assert(expiredUserInputCodeResponse.status === 'EXPIRED_USER_INPUT_CODE_ERROR')
      assert(expiredUserInputCodeResponse.failedCodeInputAttemptCount === 1)
      // checking default value for maximumCodeInputAttempts is 5
      assert(expiredUserInputCodeResponse.maximumCodeInputAttempts === 5)
      assert(Object.keys(expiredUserInputCodeResponse).length === 3)
    }
  })

  it('test with thirdPartyPasswordless, createCodeAPI with email', async () => {
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

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    {
      // passing valid field
      const validCreateCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code')
          .send({
            email: 'test@example.com',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(validCreateCodeResponse.status === 'OK')
      assert(typeof validCreateCodeResponse.deviceId === 'string')
      assert(typeof validCreateCodeResponse.preAuthSessionId === 'string')
      assert(validCreateCodeResponse.flowType === 'USER_INPUT_CODE_AND_MAGIC_LINK')
      assert(Object.keys(validCreateCodeResponse).length === 4)
    }

    {
      // passing invalid email
      const invalidEmailCreateCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code')
          .send({
            email: 'invalidEmail',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(invalidEmailCreateCodeResponse.status === 'GENERAL_ERROR')
      assert(invalidEmailCreateCodeResponse.message === 'Email is invalid')
    }
  })

  it('test with thirdPartyPasswordless, createCodeAPI with phoneNumber', async () => {
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

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    {
      // passing valid field
      const validCreateCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code')
          .send({
            phoneNumber: '+12345678901',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(validCreateCodeResponse.status === 'OK')
      assert(typeof validCreateCodeResponse.deviceId === 'string')
      assert(typeof validCreateCodeResponse.preAuthSessionId === 'string')
      assert(validCreateCodeResponse.flowType === 'USER_INPUT_CODE_AND_MAGIC_LINK')
      assert(Object.keys(validCreateCodeResponse).length === 4)
    }

    {
      // passing invalid phoneNumber
      const invalidPhoneNumberCreateCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code')
          .send({
            phoneNumber: '123',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(invalidPhoneNumberCreateCodeResponse.status === 'GENERAL_ERROR')
      assert(invalidPhoneNumberCreateCodeResponse.message === 'Phone number is invalid')
    }
  })

  it('test with thirdPartyPasswordless, magicLink format in createCodeAPI', async () => {
    await startST()

    let magicLinkURL
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
            magicLinkURL = new URL(input.urlWithLinkCode)
          },
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    {
      // passing valid field
      const validCreateCodeResponse = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code')
          .send({
            email: 'test@example.com',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )

      assert(validCreateCodeResponse.status === 'OK')

      // check that the magicLink format is {websiteDomain}{websiteBasePath}/verify?rid=passwordless&preAuthSessionId=<some string>#linkCode
      assert(magicLinkURL.hostname === 'supertokens.io')
      assert(magicLinkURL.pathname === '/auth/verify')
      assert(magicLinkURL.searchParams.get('rid') === 'thirdpartypasswordless')
      assert(magicLinkURL.searchParams.get('preAuthSessionId') === validCreateCodeResponse.preAuthSessionId)
      assert(magicLinkURL.hash.length > 1)
    }
  })

  it('test with ThirdPartyPasswordless, emailExistsAPI', async () => {
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

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    {
      // email does not exist
      const emailDoesNotExistResponse = await new Promise(resolve =>
        request(app)
          .get('/auth/signup/email/exists')
          .query({
            email: 'test@example.com',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(emailDoesNotExistResponse.status === 'OK')
      assert(emailDoesNotExistResponse.exists === false)
    }

    {
      // email exists

      // create a passwordless user through email
      const codeInfo = await ThirdPartyPasswordless.createCode({
        email: 'test@example.com',
      })

      await ThirdPartyPasswordless.consumeCode({
        preAuthSessionId: codeInfo.preAuthSessionId,
        linkCode: codeInfo.linkCode,
      })

      const emailExistsResponse = await new Promise(resolve =>
        request(app)
          .get('/auth/signup/email/exists')
          .query({
            email: 'test@example.com',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(emailExistsResponse.status === 'OK')
      assert(emailExistsResponse.exists === true)
    }
  })

  it('test with thirdPartyPasswordless, phoneNumberExistsAPI', async () => {
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

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    {
      // phoneNumber does not exist
      const phoneNumberDoesNotExistResponse = await new Promise(resolve =>
        request(app)
          .get('/auth/signup/phonenumber/exists')
          .query({
            phoneNumber: '+1234567890',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(phoneNumberDoesNotExistResponse.status === 'OK')
      assert(phoneNumberDoesNotExistResponse.exists === false)
    }

    {
      // phoneNumber exists

      // create a passwordless user through phone
      const codeInfo = await ThirdPartyPasswordless.createCode({
        phoneNumber: '+1234567890',
      })

      await ThirdPartyPasswordless.consumeCode({
        preAuthSessionId: codeInfo.preAuthSessionId,
        linkCode: codeInfo.linkCode,
      })

      const phoneNumberExistsResponse = await new Promise(resolve =>
        request(app)
          .get('/auth/signup/phonenumber/exists')
          .query({
            phoneNumber: '+1234567890',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(phoneNumberExistsResponse.status === 'OK')
      assert(phoneNumberExistsResponse.exists === true)
    }
  })

  // resendCode API

  it('test with thirdPartyPasswordless, resendCodeAPI', async () => {
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

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    {
      const codeInfo = await ThirdPartyPasswordless.createCode({
        phoneNumber: '+1234567890',
      })

      // valid response
      const response = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code/resend')
          .send({
            deviceId: codeInfo.deviceId,
            preAuthSessionId: codeInfo.preAuthSessionId,
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )
      assert(response.status === 'OK')
    }

    {
      // invalid preAuthSessionId and deviceId
      const response = await new Promise(resolve =>
        request(app)
          .post('/auth/signinup/code/resend')
          .send({
            deviceId: 'TU/52WOcktSv99zqaAZuWJG9BSoS0aRLfCbep8rFEwk=',
            preAuthSessionId: 'kFmkPQEAJtACiT2w/K8fndEuNm+XozJXSZSlWEr+iGs=',
          })
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)
            else
              resolve(JSON.parse(res.text))
          }),
      )

      assert(response.status === 'RESTART_FLOW_ERROR')
    }
  })

  // test that you create a code with PHONE in config, you then change the config to use EMAIL, you call resendCode API, it should return RESTART_FLOW_ERROR
  it('test with thirdPartyPasswordless, resendCodeAPI when changing contact method', async () => {
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

    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    {
      const codeInfo = await ThirdPartyPasswordless.createCode({
        phoneNumber: '+1234567890',
      })

      await killAllST()
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

      {
        // invalid preAuthSessionId and deviceId
        const response = await new Promise(resolve =>
          request(app)
            .post('/auth/signinup/code/resend')
            .send({
              deviceId: codeInfo.deviceId,
              preAuthSessionId: codeInfo.preAuthSessionId,
            })
            .expect(200)
            .end((err, res) => {
              if (err)
                resolve(undefined)
              else
                resolve(JSON.parse(res.text))
            }),
        )

        assert(response.status === 'RESTART_FLOW_ERROR')
      }
    }
  })
})
