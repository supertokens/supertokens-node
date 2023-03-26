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
import SessionClass from 'supertokens-node/recipe/session/sessionClass'
import sinon from 'sinon'
import SuperTokens from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import { ProcessState } from 'supertokens-node/processState'
import { afterAll, afterEach, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, mockRequest, mockResponse, printPath, setupST, startST } from '../../utils'
import { TrueClaim, UndefinedClaim } from './testClaims'

describe(`sessionClaims/fetchAndSetClaim: ${printPath('[test/session/claims/fetchAndSetClaim.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('SessionClass.fetchAndSetClaim', () => {
    afterEach(() => {
      sinon.restore()
    })

    it('should not change if claim fetchValue returns undefined', async () => {
      const session = new SessionClass({}, 'testToken', 'testHandle', 'testUserId', {}, {})

      const mock = sinon.mock(session).expects('mergeIntoAccessTokenPayload').once().withArgs({})
      await session.fetchAndSetClaim(UndefinedClaim)
      mock.verify()
    })

    it('should update if claim fetchValue returns value', async () => {
      const session = new SessionClass({}, 'testToken', 'testHandle', 'testUserId', {}, {})
      sinon.useFakeTimers()
      const mock = sinon
        .mock(session)
        .expects('mergeIntoAccessTokenPayload')
        .once()
        .withArgs({
          'st-true': {
            t: 0,
            v: true,
          },
        })
      await session.fetchAndSetClaim(TrueClaim)
      mock.verify()
    })

    it('should update using a handle if claim fetchValue returns a value', async () => {
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

      const response = mockResponse()
      const res = await Session.createNewSession(mockRequest(), response, 'someId')

      await Session.fetchAndSetClaim(res.getHandle(), TrueClaim)

      const payload = (await Session.getSessionInformation(res.getHandle())).accessTokenPayload
      assert.equal(Object.keys(payload).length, 1)
      assert.ok(payload['st-true'])
      assert.equal(payload['st-true'].v, true)
      assert(payload['st-true'].t > Date.now() - 1000)
    })
  })
})
