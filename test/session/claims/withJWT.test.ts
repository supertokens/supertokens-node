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
import { Querier } from 'supertokens-node/querier'
import { maxVersion } from 'supertokens-node/utils'
import JsonWebToken from 'jsonwebtoken'
import express from 'express'
import request from 'supertest'
import { ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, startST } from '../../utils'
import { TrueClaim, UndefinedClaim } from './testClaims'

describe(`sessionClaims/withJWT: ${printPath('[test/session/claims/withJWT.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  describe('JWT + claims interaction', () => {
    it('should create the right access token payload with claims and JWT enabled', async () => {
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
            jwt: { enable: true },
          }),
        ],
      })

      // Only run for version >= 2.9
      const querier = Querier.getNewInstanceOrThrowError(undefined)
      const apiVersion = await querier.getAPIVersion()
      if (maxVersion(apiVersion, '2.8') === '2.8')
        return

      const app = express()

      app.use(middleware())
      app.use(express.json())

      app.post('/create', async (req, res) => {
        const session = await Session.createNewSession(req, res, 'userId', undefined, {})
        res.status(200).json({ sessionHandle: session.getHandle() })
      })

      app.use(errorHandler())

      const createJWTResponse = await new Promise(resolve =>
        request(app)
          .post('/create')
          .expect(200)
          .end((err, res) => {
            if (err)
              resolve(undefined)

            else
              resolve(res)
          }),
      )

      const sessionHandle = createJWTResponse.body.sessionHandle

      const sessionInfo = await Session.getSessionInformation(sessionHandle)
      const accessTokenPayload = sessionInfo.accessTokenPayload
      assert.equal(accessTokenPayload.sub, undefined)
      assert.equal(accessTokenPayload.iss, undefined)
      assert.notStrictEqual(accessTokenPayload.jwt, undefined)
      assert.strictEqual(accessTokenPayload._jwtPName, 'jwt')

      const decodedJWT = JsonWebToken.decode(accessTokenPayload.jwt)
      assert.notStrictEqual(decodedJWT, null)
      assert.strictEqual(decodedJWT.sub, 'userId')
      assert.strictEqual(decodedJWT.iss, 'https://api.supertokens.io/auth')
      assert.strictEqual(decodedJWT._jwtPName, undefined)

      assert.strictEqual(TrueClaim.getValueFromPayload(accessTokenPayload), true)
      assert.strictEqual(TrueClaim.getValueFromPayload(decodedJWT), true)

      const failingValidator = UndefinedClaim.validators.hasValue(true)
      assert.deepStrictEqual(
        await Session.validateClaimsInJWTPayload(sessionInfo.userId, decodedJWT, () => [
          TrueClaim.validators.hasValue(true, 2),
          failingValidator,
        ]),
        {
          status: 'OK',
          invalidClaims: [
            {
              id: failingValidator.id,
              reason: {
                actualValue: undefined,
                expectedValue: true,
                message: 'value does not exist',
              },
            },
          ],
        },
      )
    })
  })
})
