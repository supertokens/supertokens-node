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

import STError from '../error'
import { makeDefaultUserContextFromAPI, send200Response } from '../../../utils'
import { APIInterface, APIOptions } from '../'
import { findRightProvider } from '../utils'

export default async function signInUpAPI(apiImplementation: APIInterface, options: APIOptions): Promise<boolean> {
  if (apiImplementation.signInUpPOST === undefined)
    return false

  const bodyParams = await options.req.getJSONBody()
  const thirdPartyId = bodyParams.thirdPartyId
  const code = bodyParams.code === undefined ? '' : bodyParams.code
  const redirectURI = bodyParams.redirectURI
  const authCodeResponse = bodyParams.authCodeResponse
  const clientId = bodyParams.clientId

  if (thirdPartyId === undefined || typeof thirdPartyId !== 'string') {
    throw new STError({
      type: STError.BAD_INPUT_ERROR,
      message: 'Please provide the thirdPartyId in request body',
    })
  }

  if (typeof code !== 'string') {
    throw new STError({
      type: STError.BAD_INPUT_ERROR,
      message: 'Please make sure that the code in the request body is a string',
    })
  }

  if (code === '' && authCodeResponse === undefined) {
    throw new STError({
      type: STError.BAD_INPUT_ERROR,
      message: 'Please provide one of code or authCodeResponse in the request body',
    })
  }

  if (authCodeResponse !== undefined && authCodeResponse.access_token === undefined) {
    throw new STError({
      type: STError.BAD_INPUT_ERROR,
      message: 'Please provide the access_token inside the authCodeResponse request param',
    })
  }

  if (redirectURI === undefined || typeof redirectURI !== 'string') {
    throw new STError({
      type: STError.BAD_INPUT_ERROR,
      message: 'Please provide the redirectURI in request body',
    })
  }

  const provider = findRightProvider(options.providers, thirdPartyId, clientId)
  if (provider === undefined) {
    if (clientId === undefined) {
      throw new STError({
        type: STError.BAD_INPUT_ERROR,
        message: `The third party provider ${thirdPartyId} seems to be missing from the backend configs.`,
      })
    }
    else {
      throw new STError({
        type: STError.BAD_INPUT_ERROR,
        message:
                    `The third party provider ${
                    thirdPartyId
                     } seems to be missing from the backend configs. If it is configured, then please make sure that you are passing the correct clientId from the frontend.`,
      })
    }
  }

  const result = await apiImplementation.signInUpPOST({
    provider,
    code,
    clientId,
    redirectURI,
    options,
    authCodeResponse,
    userContext: makeDefaultUserContextFromAPI(options.req),
  })

  if (result.status === 'OK') {
    send200Response(options.res, {
      status: result.status,
      user: result.user,
      createdNewUser: result.createdNewUser,
    })
  }
  else if (result.status === 'NO_EMAIL_GIVEN_BY_PROVIDER') {
    send200Response(options.res, {
      status: 'NO_EMAIL_GIVEN_BY_PROVIDER',
    })
  }
  else {
    send200Response(options.res, result)
  }
  return true
}
