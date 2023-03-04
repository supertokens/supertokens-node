/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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

import { APIInterface, APIOptions } from '../types'
import { send200Response } from '../../../utils'
import STError from '../../../error'
import { Querier } from '../../../querier'
import NormalisedURLPath from '../../../normalisedURLPath'

type SignInResponse =
    | { status: 'OK'; sessionId: string }
    | { status: 'INVALID_CREDENTIALS_ERROR' }
    | { status: 'USER_SUSPENDED_ERROR' }

export default async function signIn(_: APIInterface, options: APIOptions): Promise<boolean> {
  const { email, password } = await options.req.getJSONBody()

  if (email === undefined) {
    throw new STError({
      message: 'Missing required parameter \'email\'',
      type: STError.BAD_INPUT_ERROR,
    })
  }

  if (password === undefined) {
    throw new STError({
      message: 'Missing required parameter \'password\'',
      type: STError.BAD_INPUT_ERROR,
    })
  }

  const querier = Querier.getNewInstanceOrThrowError(undefined)
  const signInResponse = await querier.sendPostRequest<SignInResponse>(
    new NormalisedURLPath('/recipe/dashboard/signin'),
    {
      email,
      password,
    },
  )

  send200Response(options.res, signInResponse)

  return true
}
