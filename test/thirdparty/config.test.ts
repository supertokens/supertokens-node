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
import ThirPartyRecipe from 'supertokens-node/recipe/thirdparty/recipe'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../utils'

/**
 * TODO
 * - check with different inputs
 */
describe(`configTest: ${printPath('[test/thirdparty/config.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('test config for thirdparty module, no provider passed', async () => {
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
          ThirPartyRecipe.init({
            signInAndUpFeature: {
              providers: [],
            },
          }),
        ],
      })
      assert(false)
    }
    catch (err) {
      assert.strictEqual(
        err.message,
        'thirdparty recipe requires atleast 1 provider to be passed in signInAndUpFeature.providers config',
      )
    }
  })

  it('test minimum config for thirdparty module, custom provider', async () => {
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
        ThirPartyRecipe.init({
          signInAndUpFeature: {
            providers: [
              {
                id: 'custom',
                get: (recipe, authCode) => {
                  return {
                    accessTokenAPI: {
                      url: 'test.com/oauth/token',
                    },
                    authorisationRedirect: {
                      url: 'test.com/oauth/auth',
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
                  }
                },
              },
            ],
          },
        }),
      ],
    })
  })
})
