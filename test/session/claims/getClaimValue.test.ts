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
import SuperTokens from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import sinon from 'sinon'
import { ProcessState } from 'supertokens-node/processState'
import { afterAll, afterEach, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, mockRequest, mockResponse, printPath, setupST, startST } from '../../utils'
import { TrueClaim } from './testClaims'

describe(`sessionClaims/getClaimValue: ${printPath('[test/session/claims/getClaimValue.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('SessionClass.getClaimValue', () => {
    afterEach(() => {
      sinon.restore()
    })

    it('should get the right value', async () => {
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
              functions: oI => ({
                ...oI,
                createNewSession: async (input) => {
                  input.accessTokenPayload = {
                    ...input.accessTokenPayload,
                    ...(await TrueClaim.build(input.userId, input.userContext)),
                  }
                  return oI.createNewSession(input)
                },
              }),
            },
          }),
        ],
      })

      const response = mockResponse()
      const session = await Session.createNewSession(mockRequest(), response, 'someId')

      const res = await session.getClaimValue(TrueClaim)
      assert.equal(res, true)
    })

    it('should get the right value using session handle', async () => {
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
              functions: oI => ({
                ...oI,
                createNewSession: async (input) => {
                  input.accessTokenPayload = {
                    ...input.accessTokenPayload,
                    ...(await TrueClaim.build(input.userId, input.userContext)),
                  }
                  return oI.createNewSession(input)
                },
              }),
            },
          }),
        ],
      })

      const response = mockResponse()
      const session = await Session.createNewSession(mockRequest(), response, 'someId')

      const res = await Session.getClaimValue(session.getHandle(), TrueClaim)
      assert.deepStrictEqual(res, {
        status: 'OK',
        value: true,
      })
    })

    it('should work for not existing handle', async () => {
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
        recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie' })],
      })

      assert.deepStrictEqual(await Session.getClaimValue('asfd', TrueClaim), {
        status: 'SESSION_DOES_NOT_EXIST_ERROR',
      })
    })
  })
})
