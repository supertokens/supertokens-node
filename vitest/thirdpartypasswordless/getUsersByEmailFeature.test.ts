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
import ThirdPartyPasswordless, { TypeProvider, getUsersByEmail, thirdPartySignInUp } from 'supertokens-node/recipe/thirdpartypasswordless'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, isCDIVersionCompatible, killAllST, printPath, setupST, startST } from '../utils'

describe(`getUsersByEmail: ${printPath('[test/thirdpartypasswordless/getUsersByEmailFeature.test.js]')}`, () => {
  const MockThirdPartyProvider: TypeProvider = {
    id: 'mock',
  }

  const MockThirdPartyProvider2: TypeProvider = {
    id: 'mock2',
  }

  const testSTConfig = {
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
        providers: [MockThirdPartyProvider],
      }),
    ],
  }

  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('invalid email yields empty users array', async () => {
    await startST()
    STExpress.init(testSTConfig)

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    // given there are no users

    // when
    const thirdPartyUsers = await getUsersByEmail('john.doe@example.com')

    // then
    assert.strictEqual(thirdPartyUsers.length, 0)
  })

  it('valid email yields third party users', async () => {
    await startST()
    STExpress.init({
      ...testSTConfig,
      recipeList: [
        ThirdPartyPasswordless.init({
          contactMethod: 'EMAIL',
          createAndSendCustomEmail: (input) => {

          },
          flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
          providers: [MockThirdPartyProvider, MockThirdPartyProvider2],
        }),
      ],
    })

    // run test if current CDI version >= 2.11
    if (!(await isCDIVersionCompatible('2.11')))
      return

    await thirdPartySignInUp('mock', 'thirdPartyJohnDoe', 'john.doe@example.com')
    await thirdPartySignInUp('mock2', 'thirdPartyDaveDoe', 'john.doe@example.com')

    const thirdPartyUsers = await getUsersByEmail('john.doe@example.com')

    assert.strictEqual(thirdPartyUsers.length, 2)

    thirdPartyUsers.forEach((user) => {
      assert.notStrictEqual(user.thirdParty.id, undefined)
      assert.notStrictEqual(user.id, undefined)
      assert.notStrictEqual(user.timeJoined, undefined)
      assert.strictEqual(user.email, 'john.doe@example.com')
    })
  })
})
