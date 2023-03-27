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
import request from 'supertest'
import express from 'express'
import { ProcessState } from 'supertokens-node/processState'
import SuperTokens from 'supertokens-node'
import Session from 'supertokens-node/recipe/session'
import EmailPassword from 'supertokens-node/recipe/emailpassword'
import { errorHandler, middleware } from 'supertokens-node/framework/express'
import {
  cleanST,
  killAllST,
  printPath,
  setupST,
  startST,
} from './utils'

describe(`middleware2: ${printPath('[test/middleware2.test.js]')}`, () => {
  beforeEach(async () => {
    await killAllST()
    await setupST()
    ProcessState.getInstance().reset()
  })

  afterAll(async () => {
    await killAllST()
    await cleanST()
  })

  it('test rid with session and non existant API in session recipe gives 404', async () => {
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
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie' }), EmailPassword.init()],
    })

    const app = express()

    app.use(middleware())
    app.use(errorHandler())

    const response = await new Promise(resolve =>
      request(app)
        .post('/auth/signin')
        .set('rid', 'session')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert(response.status === 404)
  })

  it('test no rid with existent API does not give 404', async () => {
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
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie' }), EmailPassword.init()],
    })

    const app = express()

    app.use(middleware())
    app.use(errorHandler())

    const response = await new Promise(resolve =>
      request(app)
        .post('/auth/signin')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert(response.status === 400)
  })

  it('test rid as anti-csrf with existent API does not give 404', async () => {
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
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie' }), EmailPassword.init()],
    })

    const app = express()

    app.use(middleware())
    app.use(errorHandler())

    const response = await new Promise(resolve =>
      request(app)
        .post('/auth/signin')
        .set('rid', 'anti-csrf')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert(response.status === 400)
  })

  it('test random rid with existent API gives 404', async () => {
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
      recipeList: [Session.init({ getTokenTransferMethod: () => 'cookie' }), EmailPassword.init()],
    })

    const app = express()

    app.use(middleware())
    app.use(errorHandler())

    const response = await new Promise(resolve =>
      request(app)
        .post('/auth/signin')
        .set('rid', 'random')
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )
    assert(response.status === 404)
  })

  it('custom response express', async () => {
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
        Session.init({ getTokenTransferMethod: () => 'cookie' }),
        EmailPassword.init({
          override: {
            apis: (oI) => {
              return {
                ...oI,
                async emailExistsGET(input) {
                  input.options.res.setStatusCode(201)
                  input.options.res.sendJSONResponse({
                    custom: true,
                  })
                  return oI.emailExistsGET(input)
                },
              }
            },
          },
        }),
      ],
    })

    const app = express()

    app.use(middleware())
    app.use(errorHandler())

    const response = await new Promise(resolve =>
      request(app)
        .get('/auth/signup/email/exists?email=test@example.com')
        .expect(201)
        .end((err, res) => {
          if (err)
            resolve(undefined)

          else
            resolve(res)
        }),
    )

    assert(response.body.custom)
  })
})
