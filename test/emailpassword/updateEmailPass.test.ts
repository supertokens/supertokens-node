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
import EmailPassword, { signIn, updateEmailOrPassword } from 'supertokens-node/recipe/emailpassword'
import { ProcessState } from 'supertokens-node/processState'
import STExpress from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import { maxVersion } from 'supertokens-node/utils'
import { Querier } from 'supertokens-node/querier'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, signUPRequest, startST } from '../utils'

describe(`updateEmailPassTest: ${printPath('[test/emailpassword/updateEmailPass.test.ts]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('test updateEmailPass', async () => {
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

    const apiVersion = await Querier.getNewInstanceOrThrowError(undefined).getAPIVersion()
    if (maxVersion(apiVersion, '2.7') === '2.7')
      return

    const express = require('express')
    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    await signUPRequest(app, 'test@gmail.com', 'testPass123')

    const res = await signIn('test@gmail.com', 'testPass123')

    await updateEmailOrPassword({
      userId: res.user.id,
      email: 'test2@gmail.com',
      password: 'testPass',
    })

    const res2 = await signIn('test2@gmail.com', 'testPass')

    assert(res2.user.id === res2.user.id)
  })
})
