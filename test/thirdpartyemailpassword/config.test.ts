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
import ProcessState from 'supertokens-node/processState'
import ThirdPartyEmailPassword, { TypeProvider } from 'supertokens-node/recipe/thirdpartyemailpassword'
import ThirdPartyEmailPasswordRecipe from 'supertokens-node/recipe/thirdpartyemailpassword/recipe'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

describe(`configTest: ${printPath('[test/thirdpartyemailpassword/config.test.js]')}`, () => {
  let customProvider: TypeProvider
  beforeAll(() => {
    customProvider = {
      id: 'custom',
      get: (recipe, authCode) => {
        return {
          accessTokenAPI: {
            url: 'https://test.com/oauth/token',
          },
          authorisationRedirect: {
            url: 'https://test.com/oauth/auth',
          },
          getProfileInfo: async (authCodeResponse) => {
            return {
              id: 'user',
              email: {
                id: 'email@test.com',
                isVerified: true,
              },
            }
          },
          getClientId: () => {
            return 'supertokens'
          },
        }
      },
    }
  })
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('test default config for thirdpartyemailpassword module', async () => {
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
      recipeList: [ThirdPartyEmailPassword.init()],
    })

    const thirdpartyemailpassword = await ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError()

    assert.strictEqual(thirdpartyemailpassword.thirdPartyRecipe, undefined)

    const emailpassword = thirdpartyemailpassword.emailPasswordRecipe

    const signUpFeature = emailpassword.config.signUpFeature
    assert.strictEqual(signUpFeature.formFields.length, 2)
    assert.strictEqual(signUpFeature.formFields.filter(f => f.id === 'email')[0].optional, false)
    assert.strictEqual(signUpFeature.formFields.filter(f => f.id === 'password')[0].optional, false)
    assert.notStrictEqual(signUpFeature.formFields.filter(f => f.id === 'email')[0].validate, undefined)
    assert.notStrictEqual(signUpFeature.formFields.filter(f => f.id === 'password')[0].validate, undefined)

    const signInFeature = emailpassword.config.signInFeature
    assert.strictEqual(signInFeature.formFields.length, 2)
    assert.strictEqual(signInFeature.formFields.filter(f => f.id === 'email')[0].optional, false)
    assert.strictEqual(signInFeature.formFields.filter(f => f.id === 'password')[0].optional, false)
    assert.notStrictEqual(signInFeature.formFields.filter(f => f.id === 'email')[0].validate, undefined)
    assert.notStrictEqual(signInFeature.formFields.filter(f => f.id === 'password')[0].validate, undefined)

    const resetPasswordUsingTokenFeature = emailpassword.config.resetPasswordUsingTokenFeature

    assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm.length, 1)
    assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm[0].id, 'email')
    assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm.length, 1)
    assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm[0].id, 'password')
  })

  it('test config for thirdpartyemailpassword module, with provider', async () => {
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
        ThirdPartyEmailPassword.init({
          providers: [customProvider],
        }),
      ],
    })

    const thirdpartyemailpassword = await ThirdPartyEmailPasswordRecipe.getInstanceOrThrowError()
    const thirdParty = thirdpartyemailpassword.thirdPartyRecipe

    assert.notStrictEqual(thirdParty, undefined)
    const emailVerificationFeatureTP = thirdpartyemailpassword.thirdPartyRecipe.config.emailVerificationFeature

    const emailpassword = thirdpartyemailpassword.emailPasswordRecipe

    const signUpFeature = emailpassword.config.signUpFeature
    assert.strictEqual(signUpFeature.formFields.length, 2)
    assert.strictEqual(signUpFeature.formFields.filter(f => f.id === 'email')[0].optional, false)
    assert.strictEqual(signUpFeature.formFields.filter(f => f.id === 'password')[0].optional, false)
    assert.notStrictEqual(signUpFeature.formFields.filter(f => f.id === 'email')[0].validate, undefined)
    assert.notStrictEqual(signUpFeature.formFields.filter(f => f.id === 'password')[0].validate, undefined)

    const signInFeature = emailpassword.config.signInFeature
    assert.strictEqual(signInFeature.formFields.length, 2)
    assert.strictEqual(signInFeature.formFields.filter(f => f.id === 'email')[0].optional, false)
    assert.strictEqual(signInFeature.formFields.filter(f => f.id === 'password')[0].optional, false)
    assert.notStrictEqual(signInFeature.formFields.filter(f => f.id === 'email')[0].validate, undefined)
    assert.notStrictEqual(signInFeature.formFields.filter(f => f.id === 'password')[0].validate, undefined)

    const resetPasswordUsingTokenFeature = emailpassword.config.resetPasswordUsingTokenFeature

    assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm.length, 1)
    assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForGenerateTokenForm[0].id, 'email')
    assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm.length, 1)
    assert.strictEqual(resetPasswordUsingTokenFeature.formFieldsForPasswordResetForm[0].id, 'password')
  })
})
