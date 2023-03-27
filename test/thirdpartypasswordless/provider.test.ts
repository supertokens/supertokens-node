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
import { ProcessState } from 'supertokens-node/processState'
import ThirdPartyPasswordlessRecipe from 'supertokens-node/recipe/thirdpartypasswordless/recipe'
import ThirdPartyPasswordless from 'supertokens-node/recipe/thirdpartypasswordless'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, isCDIVersionCompatible, killAllST, printPath, setupST, startST } from '../utils'

const privateKey = '-----BEGIN EC PRIVATE KEY-----\nMHQCAQEEIP92u8DjfW31UDDudzWtcsiH/gJ5RpdgL6EV4FTuADZWoAcGBSuBBAAK\noUQDQgAEBorYK2YgYN1BDxVNtBgq8ZdoIR5m02kfJKFI/Vq1+uagvjjZVLpeUEgQ\n79ENddF5P8V8gRri+XzD2zNYpYXGNQ==\n-----END EC PRIVATE KEY-----'

/**
 * TODO
 * - Google
 *   - pass additional params, check they are present in authorisation url
 *   - pass additional/wrong config and check that error gets thrown
 *   - test passing scopes in config
 * - Facebook
 *   - test minimum config
 *   - pass additional/wrong config and check that error gets thrown
 *   - test passing scopes in config
 * - Github
 *   - test minimum config
 *   - pass additional params, check they are present in authorisation url
 *   - pass additional/wrong config and check that error gets thrown
 *   - test passing scopes in config
 * - Apple
 *   - test minimum config
 *   - pass additional params, check they are present in authorisation url
 *   - pass additional/wrong config and check that error gets thrown
 *   - test passing scopes in config
 */
describe(`providerTest: ${printPath('[test/thirdpartypasswordless/provider.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('test with thirdpartypasswordless, the minimum config for third party provider google', async () => {
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
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Google({
              clientId: 'test',
              clientSecret: 'test-secret',
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'google')
    const providerInfoGetResult = await providerInfo.get()
    assert.strictEqual(providerInfoGetResult.accessTokenAPI.url, 'https://oauth2.googleapis.com/token')
    assert.strictEqual(
      providerInfoGetResult.authorisationRedirect.url,
      'https://accounts.google.com/o/oauth2/v2/auth',
    )
    assert.deepStrictEqual(providerInfoGetResult.accessTokenAPI.params, {
      client_id: 'test',
      client_secret: 'test-secret',
      grant_type: 'authorization_code',
    })
    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      access_type: 'offline',
      include_granted_scopes: 'true',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/userinfo.email',
    })
  })

  it('test with thirdPartyPasswordless, passing additional params, check they are present in authorisation url for thirdparty provider google', async () => {
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
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Google({
              clientId: 'test',
              clientSecret: 'test-secret',
              authorisationRedirect: {
                params: {
                  key1: 'value1',
                  key2: 'value2',
                },
              },
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'google')
    const providerInfoGetResult = await providerInfo.get()

    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      access_type: 'offline',
      include_granted_scopes: 'true',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/userinfo.email',
      key1: 'value1',
      key2: 'value2',
    })
  })

  it('test for thirdPartyPasswordless, passing scopes in config for thirdparty provider google', async () => {
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
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Google({
              clientId: 'test',
              clientSecret: 'test-secret',
              scope: ['test-scope-1', 'test-scope-2'],
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'google')
    const providerInfoGetResult = await providerInfo.get()

    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      access_type: 'offline',
      include_granted_scopes: 'true',
      response_type: 'code',
      scope: 'test-scope-1 test-scope-2',
    })
  })

  it('test for thirdPartyPasswordless, minimum config for third party provider facebook', async () => {
    await startST()

    const clientId = 'test'
    const clientSecret = 'test-secret'

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
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Facebook({
              clientId,
              clientSecret,
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'facebook')
    const providerInfoGetResult = await providerInfo.get()
    assert.strictEqual(
      providerInfoGetResult.accessTokenAPI.url,
      'https://graph.facebook.com/v9.0/oauth/access_token',
    )
    assert.strictEqual(
      providerInfoGetResult.authorisationRedirect.url,
      'https://www.facebook.com/v9.0/dialog/oauth',
    )
    assert.deepStrictEqual(providerInfoGetResult.accessTokenAPI.params, {
      client_id: clientId,
      client_secret: clientSecret,
    })
    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      response_type: 'code',
      scope: 'email',
    })
  })

  it('test with thirdPartyPasswordless, passing scopes in config for third party provider facebook', async () => {
    await startST()

    const clientId = 'test'
    const clientSecret = 'test-secret'

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
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Facebook({
              clientId,
              clientSecret,
              scope: ['test-scope-1', 'test-scope-2'],
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'facebook')
    const providerInfoGetResult = await providerInfo.get()
    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      response_type: 'code',
      scope: 'test-scope-1 test-scope-2',
    })
  })

  it('test with thirdPartyPasswordless, minimum config for third party provider github', async () => {
    await startST()

    const clientId = 'test'
    const clientSecret = 'test-secret'

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
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Github({
              clientId,
              clientSecret,
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'github')
    const providerInfoGetResult = await providerInfo.get()
    assert.strictEqual(providerInfoGetResult.accessTokenAPI.url, 'https://github.com/login/oauth/access_token')
    assert.strictEqual(providerInfoGetResult.authorisationRedirect.url, 'https://github.com/login/oauth/authorize')
    assert.deepStrictEqual(providerInfoGetResult.accessTokenAPI.params, {
      client_id: clientId,
      client_secret: clientSecret,
    })
    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      scope: 'read:user user:email',
    })
  })

  it('test with thirdPartyPasswordless, additional params, check they are present in authorisation url for third party provider github', async () => {
    await startST()

    const clientId = 'test'
    const clientSecret = 'test-secret'

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
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Github({
              clientId,
              clientSecret,
              authorisationRedirect: {
                params: {
                  key1: 'value1',
                  key2: 'value2',
                },
              },
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'github')
    const providerInfoGetResult = await providerInfo.get()
    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      scope: 'read:user user:email',
      key1: 'value1',
      key2: 'value2',
    })
  })

  it('test with thirdPartyPasswordless, passing scopes in config for third party provider github', async () => {
    await startST()

    const clientId = 'test'
    const clientSecret = 'test-secret'

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
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Github({
              clientId,
              clientSecret,
              scope: ['test-scope-1', 'test-scope-2'],
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'github')
    const providerInfoGetResult = await providerInfo.get()
    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      scope: 'test-scope-1 test-scope-2',
    })
  })

  it('test with thirdPartyPasswordless, minimum config for third party provider apple', async () => {
    await startST()

    const clientId = 'test'
    const clientSecret = {
      keyId: 'test-key',
      privateKey,
      teamId: 'test-team-id',
    }

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
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Apple({
              clientId,
              clientSecret,
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'apple')
    const providerInfoGetResult = await providerInfo.get()
    assert.strictEqual(providerInfoGetResult.accessTokenAPI.url, 'https://appleid.apple.com/auth/token')
    assert.strictEqual(providerInfoGetResult.authorisationRedirect.url, 'https://appleid.apple.com/auth/authorize')

    const accessTokenAPIParams = providerInfoGetResult.accessTokenAPI.params

    assert(accessTokenAPIParams.client_id === clientId)
    assert(accessTokenAPIParams.client_secret !== undefined)
    assert(accessTokenAPIParams.grant_type === 'authorization_code')

    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      scope: 'email',
      response_mode: 'form_post',
      response_type: 'code',
    })
  })

  it('test with thirdPartyPasswordless, passing additional params, check they are present in authorisation url for third party provider apple', async () => {
    await startST()

    const clientId = 'test'
    const clientSecret = {
      keyId: 'test-key',
      privateKey,
      teamId: 'test-team-id',
    }

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
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Apple({
              clientId,
              clientSecret,
              authorisationRedirect: {
                params: {
                  key1: 'value1',
                  key2: 'value2',
                },
              },
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'apple')
    const providerInfoGetResult = await providerInfo.get()
    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      scope: 'email',
      response_mode: 'form_post',
      response_type: 'code',
      key1: 'value1',
      key2: 'value2',
    })
  })

  it('test with thirdPartyPasswordless, passing scopes in config for third party provider apple', async () => {
    await startST()

    const clientId = 'test'
    const clientSecret = {
      keyId: 'test-key',
      privateKey,
      teamId: 'test-team-id',
    }

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
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Apple({
              clientId,
              clientSecret,
              scope: ['test-scope-1', 'test-scope-2'],
            }),
          ],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    const providerInfo = ThirdPartyPasswordlessRecipe.getInstanceOrThrowError().config.providers[0]
    assert.strictEqual(providerInfo.id, 'apple')
    const providerInfoGetResult = await providerInfo.get()
    assert.deepStrictEqual(providerInfoGetResult.authorisationRedirect.params, {
      client_id: 'test',
      scope: 'test-scope-1 test-scope-2',
      response_mode: 'form_post',
      response_type: 'code',
    })
  })

  it('test with thirdPartyPasswordless, passing invalid privateKey in config for third party provider apple', async () => {
    await startST()

    const clientId = 'test'
    const clientSecret = {
      keyId: 'test-key',
      privateKey: 'invalidKey',
      teamId: 'test-team-id',
    }
    try {
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
          ThirdPartyPasswordless.init({
            contactMethod: 'EMAIL',
            createAndSendCustomEmail: (input) => {

            },
            flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
            providers: [
              ThirdPartyPasswordless.Apple({
                clientId,
                clientSecret,
              }),
            ],
          }),
        ],
      })

      assert(false)
    }
    catch (error) {
      if (error.type !== ThirdPartyPasswordless.Error.BAD_INPUT_ERROR)
        throw error
    }
  })

  it('test with thirdPartyPasswordless duplicate provider without any default', async () => {
    await startST()
    try {
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
          ThirdPartyPasswordless.init({
            contactMethod: 'EMAIL',
            createAndSendCustomEmail: (input) => {

            },
            flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
            providers: [
              ThirdPartyPasswordless.Google({
                clientId: 'test',
                clientSecret: 'test-secret',
                scope: ['test-scope-1', 'test-scope-2'],
              }),
              ThirdPartyPasswordless.Google({
                clientId: 'test',
                clientSecret: 'test-secret',
                scope: ['test-scope-1', 'test-scope-2'],
              }),
            ],
          }),
        ],
      })
      throw new Error('should fail')
    }
    catch (err) {
      assert(
        err.message
                    === 'The providers array has multiple entries for the same third party provider. Please mark one of them as the default one by using "isDefault: true".',
      )
    }
  })

  it('test with thirdPartyPasswordless, duplicate provider with both default', async () => {
    await startST()
    try {
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
          ThirdPartyPasswordless.init({
            contactMethod: 'EMAIL',
            createAndSendCustomEmail: (input) => {

            },
            flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
            providers: [
              ThirdPartyPasswordless.Google({
                isDefault: true,
                clientId: 'test',
                clientSecret: 'test-secret',
                scope: ['test-scope-1', 'test-scope-2'],
              }),
              ThirdPartyPasswordless.Google({
                isDefault: true,
                clientId: 'test',
                clientSecret: 'test-secret',
                scope: ['test-scope-1', 'test-scope-2'],
              }),
            ],
          }),
        ],
      })
      throw new Error('should fail')
    }
    catch (err) {
      assert(
        err.message
                    === 'You have provided multiple third party providers that have the id: "google" and are marked as "isDefault: true". Please only mark one of them as isDefault.',
      )
    }
  })
  it('test with thirdPartyPasswordless, duplicate provider with one default', async () => {
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
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [
            ThirdPartyPasswordless.Google({
              clientId: 'test',
              clientSecret: 'test-secret',
              scope: ['test-scope-1', 'test-scope-2'],
            }),
            ThirdPartyPasswordless.Google({
              isDefault: true,
              clientId: 'test',
              clientSecret: 'test-secret',
              scope: ['test-scope-1', 'test-scope-2'],
            }),
          ],
        }),
      ],
    })
  })
})
