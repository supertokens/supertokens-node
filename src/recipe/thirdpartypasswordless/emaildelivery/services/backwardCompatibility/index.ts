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
import { TypeThirdPartyPasswordlessEmailDeliveryInput } from '../../../types'
import { NormalisedAppinfo } from '../../../../../types'
import PasswordlessBackwardCompatibilityService from '../../../../passwordless/emaildelivery/services/backwardCompatibility'
import { EmailDeliveryInterface } from '../../../../../ingredients/emaildelivery/types'

export default class BackwardCompatibilityService
implements EmailDeliveryInterface<TypeThirdPartyPasswordlessEmailDeliveryInput> {
  private passwordlessBackwardCompatibilityService: PasswordlessBackwardCompatibilityService

  constructor(
    appInfo: NormalisedAppinfo,
    passwordlessFeature?: {
      createAndSendCustomEmail?: (
        input: {
          // Where the message should be delivered.
          email: string
          // This has to be entered on the starting device  to finish sign in/up
          userInputCode?: string
          // Full url that the end-user can click to finish sign in/up
          urlWithLinkCode?: string
          codeLifetime: number
          // Unlikely, but someone could display this (or a derived thing) to identify the device
          preAuthSessionId: string
        },
        userContext: any
      ) => Promise<void>
    },
  ) {
    this.passwordlessBackwardCompatibilityService = new PasswordlessBackwardCompatibilityService(
      appInfo,
      passwordlessFeature?.createAndSendCustomEmail,
    )
  }

  sendEmail = async (input: TypeThirdPartyPasswordlessEmailDeliveryInput & { userContext: any }) => {
    await this.passwordlessBackwardCompatibilityService.sendEmail(input)
  }
}
