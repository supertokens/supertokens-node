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
import { afterAll, beforeEach, describe, it } from 'vitest'
import STExpress from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import { ProcessState } from 'supertokens-node/processState'
import { Querier } from 'supertokens-node/querier'
import EmailPassword from 'supertokens-node/recipe/emailpassword'
import { maxVersion } from 'supertokens-node/utils'
import {
  cleanST,
  killAllST,
  printPath,
  setupST,
  startST,
} from '../utils'

describe(`deleteUser: ${printPath('[test/emailpassword/deleteUser.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('test deleteUser', async () => {
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
      recipeList: [EmailPassword.init(), Session.init({ getTokenTransferMethod: () => 'cookie' })],
    })

    const querier = Querier.getNewInstanceOrThrowError(undefined)
    const cdiVersion = await querier.getAPIVersion()
    if (maxVersion('2.10', cdiVersion) === cdiVersion) {
      const user = await EmailPassword.signUp('test@example.com', '1234abcd')

      {
        const response = await STExpress.getUsersOldestFirst()
        assert(response.users.length === 1)
      }

      await STExpress.deleteUser(user.user.id)

      {
        const response = await STExpress.getUsersOldestFirst()
        assert(response.users.length === 0)
      }
    }
  })
})
