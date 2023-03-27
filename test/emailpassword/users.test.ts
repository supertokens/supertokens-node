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
import STExpress, { getUserCount, getUsersNewestFirst, getUsersOldestFirst } from 'supertokens-node'
import { ProcessState } from 'supertokens-node/processState'
import Session from 'supertokens-node/recipe/session'
import EmailPassword from 'supertokens-node/recipe/emailpassword'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import { afterAll, beforeEach, describe, it } from 'vitest'
import { cleanST, killAllST, printPath, setupST, signUPRequest, startST } from '../utils'

describe(`usersTest: ${printPath('[test/emailpassword/users.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('test getUsersOldestFirst', async () => {
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

    const express = require('express')
    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    await signUPRequest(app, 'test@gmail.com', 'testPass123')
    await signUPRequest(app, 'test1@gmail.com', 'testPass123')
    await signUPRequest(app, 'test2@gmail.com', 'testPass123')
    await signUPRequest(app, 'test3@gmail.com', 'testPass123')
    await signUPRequest(app, 'test4@gmail.com', 'testPass123')

    let users = await getUsersOldestFirst()
    assert.strictEqual(users.users.length, 5)
    assert.strictEqual(users.nextPaginationToken, undefined)

    users = await getUsersOldestFirst({ limit: 1 })
    assert.strictEqual(users.users.length, 1)
    assert.strictEqual(users.users[0].user.email, 'test@gmail.com')
    assert.strictEqual(typeof users.nextPaginationToken, 'string')

    users = await getUsersOldestFirst({ limit: 1, paginationToken: users.nextPaginationToken })
    assert.strictEqual(users.users.length, 1)
    assert.strictEqual(users.users[0].user.email, 'test1@gmail.com')
    assert.strictEqual(typeof users.nextPaginationToken, 'string')

    users = await getUsersOldestFirst({ limit: 5, paginationToken: users.nextPaginationToken })
    assert.strictEqual(users.users.length, 3)
    assert.strictEqual(users.nextPaginationToken, undefined)

    try {
      await getUsersOldestFirst({ limit: 10, paginationToken: 'invalid-pagination-token' })
      assert(false)
    }
    catch (err) {
      if (!err.message.includes('invalid pagination token'))
        throw err
    }

    try {
      await getUsersOldestFirst({ limit: -1 })
      assert(false)
    }
    catch (err) {
      if (!err.message.includes('limit must a positive integer with min value 1'))
        throw err
    }
  })

  it('test getUsersNewestFirst', async () => {
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

    const express = require('express')
    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    await signUPRequest(app, 'test@gmail.com', 'testPass123')
    await signUPRequest(app, 'test1@gmail.com', 'testPass123')
    await signUPRequest(app, 'test2@gmail.com', 'testPass123')
    await signUPRequest(app, 'test3@gmail.com', 'testPass123')
    await signUPRequest(app, 'test4@gmail.com', 'testPass123')

    let users = await getUsersNewestFirst()
    assert.strictEqual(users.users.length, 5)
    assert.strictEqual(users.nextPaginationToken, undefined)

    users = await getUsersNewestFirst({ limit: 1 })
    assert.strictEqual(users.users.length, 1)
    assert.strictEqual(users.users[0].user.email, 'test4@gmail.com')
    assert.strictEqual(typeof users.nextPaginationToken, 'string')

    users = await getUsersNewestFirst({ limit: 1, paginationToken: users.nextPaginationToken })
    assert.strictEqual(users.users.length, 1)
    assert.strictEqual(users.users[0].user.email, 'test3@gmail.com')
    assert.strictEqual(typeof users.nextPaginationToken, 'string')

    users = await getUsersNewestFirst({ limit: 5, paginationToken: users.nextPaginationToken })
    assert.strictEqual(users.users.length, 3)
    assert.strictEqual(users.nextPaginationToken, undefined)

    try {
      await getUsersOldestFirst({ limit: 10, paginationToken: 'invalid-pagination-token' })
      assert(false)
    }
    catch (err) {
      if (!err.message.includes('invalid pagination token'))
        throw err
    }

    try {
      await getUsersOldestFirst({ limit: -1 })
      assert(false)
    }
    catch (err) {
      if (!err.message.includes('limit must a positive integer with min value 1'))
        throw err
    }
  })

  it('test getUserCount', async () => {
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

    let userCount = await getUserCount()
    assert.strictEqual(userCount, 0)

    const express = require('express')
    const app = express()

    app.use(middleware())

    app.use(errorHandler())

    await signUPRequest(app, 'test@gmail.com', 'testPass123')
    userCount = await getUserCount()
    assert.strictEqual(userCount, 1)

    await signUPRequest(app, 'test1@gmail.com', 'testPass123')
    await signUPRequest(app, 'test2@gmail.com', 'testPass123')
    await signUPRequest(app, 'test3@gmail.com', 'testPass123')
    await signUPRequest(app, 'test4@gmail.com', 'testPass123')

    userCount = await getUserCount()
    assert.strictEqual(userCount, 5)
  })
})
