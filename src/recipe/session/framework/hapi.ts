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
import { ResponseToolkit } from '@hapi/hapi'
import Session from '../recipe'
import { VerifySessionOptions } from '..'
import { ExtendedResponseToolkit, HapiRequest, HapiResponse, SessionRequest } from '../../../framework/hapi/framework'

export function verifySession(options?: VerifySessionOptions) {
  return async (req: SessionRequest, h: ResponseToolkit) => {
    const sessionRecipe = Session.getInstanceOrThrowError()
    const request = new HapiRequest(req)
    const response = new HapiResponse(h as ExtendedResponseToolkit)
    req.session = await sessionRecipe.verifySession(options, request, response)
    return h.continue
  }
}
