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

import { ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../../utils'

describe(`session-jwt-functions: ${printPath('[test/session/with-jwt/jwtFunctions.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('Test that JWT functions fail if the jwt feature is not enabled', async () => {
    await startST()
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        Session.init({
          getTokenTransferMethod: () => 'cookie',
          override: {
            functions(oi) {
              return {
                ...oi,
                async createNewSession({ req, res, userId, accessTokenPayload, sessionData }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({ req, res, userId, accessTokenPayload, sessionData })
                },
              }
            },
          },
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    try {
      await Session.createJWT({})
      throw new Error('createJWT succeeded when it should have failed')
    }
    catch (e: any) {
      if (
        e.message
                !== 'createJWT cannot be used without enabling the JWT feature. Please set \'enableJWT: true\' when initialising the Session recipe'
      )
        throw e
    }

    try {
      await Session.getJWKS()
      throw new Error('getJWKS succeeded when it should have failed')
    }
    catch (e: any) {
      if (
        e.message
                !== 'getJWKS cannot be used without enabling the JWT feature. Please set \'enableJWT: true\' when initialising the Session recipe'
      )
        throw e
    }
  })

  it('Test that JWT functions work if the jwt feature is enabled', async () => {
    await startST()
    SuperTokens.init({
      supertokens: {
        connectionURI: 'http://localhost:8080',
      },
      appInfo: {
        apiDomain: 'api.supertokens.io',
        appName: 'SuperTokens',
        websiteDomain: 'supertokens.io',
      },
      recipeList: [
        Session.init({
          getTokenTransferMethod: () => 'cookie',
          jwt: { enable: true },
          override: {
            functions(oi) {
              return {
                ...oi,
                async createNewSession({
                  req,
                                    res,
                                    userId,
                                    accessTokenPayload,
                                    sessionData,
                }) {
                  accessTokenPayload = {
                    ...accessTokenPayload,
                    customKey: 'customValue',
                    customKey2: 'customValue2',
                  }

                  return await oi.createNewSession({
                    req,
                    res,
                    userId,
                    accessTokenPayload,
                    sessionData,
                  })
                },
              }
            },
          },
        }),
      ],
    })

    // Only run for version >= 2.9
    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const apiVersion = await querier.getAPIVersion()
    if (maxVersion(apiVersion, '2.8') === '2.8')
      return

    await Session.createJWT({})
    await Session.getJWKS()
  })
})
