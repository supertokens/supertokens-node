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

import { Transporter } from 'nodemailer'
import { TypeEmailVerificationEmailDeliveryInput } from '../../../types'
import {
  GetContentResult,
  ServiceInterface,
  TypeInputSendRawEmail,
} from '../../../../../ingredients/emaildelivery/services/smtp'
import getEmailVerifyEmailContent from './emailVerify'

export function getServiceImplementation(
  transporter: Transporter,
  from: {
    name: string
    email: string
  },
): ServiceInterface<TypeEmailVerificationEmailDeliveryInput> {
  return {
    async sendRawEmail(input: TypeInputSendRawEmail) {
      if (input.isHtml) {
        await transporter.sendMail({
          from: `${from.name} <${from.email}>`,
          to: input.toEmail,
          subject: input.subject,
          html: input.body,
        })
      }
      else {
        await transporter.sendMail({
          from: `${from.name} <${from.email}>`,
          to: input.toEmail,
          subject: input.subject,
          text: input.body,
        })
      }
    },
    async getContent(
      input: TypeEmailVerificationEmailDeliveryInput & { userContext: any },
    ): Promise<GetContentResult> {
      return getEmailVerifyEmailContent(input)
    },
  }
}
