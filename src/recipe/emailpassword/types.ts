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

import OverrideableBuilder from 'overrideableBuilder'
import { BaseRequest } from '../../framework/request'
import { BaseResponse } from '../../framework/response'
import { SessionContainerInterface } from '../session/types'
import {
  TypeInput as EmailDeliveryTypeInput,
  TypeInputWithService as EmailDeliveryTypeInputWithService,
} from '../../ingredients/emaildelivery/types'
import EmailDeliveryIngredient from '../../ingredients/emaildelivery'
import { GeneralErrorResponse, NormalisedAppinfo } from '../../types'

export interface TypeNormalisedInput {
  signUpFeature: TypeNormalisedInputSignUp
  signInFeature: TypeNormalisedInputSignIn
  getEmailDeliveryConfig: (
    recipeImpl: RecipeInterface,
    isInServerlessEnv: boolean
  ) => EmailDeliveryTypeInputWithService<TypeEmailPasswordEmailDeliveryInput>
  resetPasswordUsingTokenFeature: TypeNormalisedInputResetPasswordUsingTokenFeature
  override: {
    functions: (
      originalImplementation: RecipeInterface,
      builder?: OverrideableBuilder<RecipeInterface>
    ) => RecipeInterface
    apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface
  }
}

export interface TypeInputFormField {
  id: string
  validate?: (value: any) => Promise<string | undefined>
  optional?: boolean
}

export interface TypeFormField { id: string; value: any }

export interface TypeInputSignUp {
  formFields?: TypeInputFormField[]
}

export interface NormalisedFormField {
  id: string
  validate: (value: any) => Promise<string | undefined>
  optional: boolean
}

export interface TypeNormalisedInputSignUp {
  formFields: NormalisedFormField[]
}

export interface TypeNormalisedInputSignIn {
  formFields: NormalisedFormField[]
}

export interface TypeInputResetPasswordUsingTokenFeature {
  /**
     * @deprecated Please use emailDelivery config instead
     */
  createAndSendCustomEmail?: (user: User, passwordResetURLWithToken: string, userContext: any) => Promise<void>
}

export interface TypeNormalisedInputResetPasswordUsingTokenFeature {
  formFieldsForGenerateTokenForm: NormalisedFormField[]
  formFieldsForPasswordResetForm: NormalisedFormField[]
}

export interface User {
  id: string
  email: string
  timeJoined: number
}

export interface TypeInput {
  signUpFeature?: TypeInputSignUp
  emailDelivery?: EmailDeliveryTypeInput<TypeEmailPasswordEmailDeliveryInput>
  resetPasswordUsingTokenFeature?: TypeInputResetPasswordUsingTokenFeature
  override?: {
    functions?: (
      originalImplementation: RecipeInterface,
      builder?: OverrideableBuilder<RecipeInterface>
    ) => RecipeInterface
    apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface
  }
}

export interface RecipeInterface {
  signUp(input: {
    email: string
    password: string
    userContext: any
  }): Promise<{ status: 'OK'; user: User } | { status: 'EMAIL_ALREADY_EXISTS_ERROR' }>

  signIn(input: {
    email: string
    password: string
    userContext: any
  }): Promise<{ status: 'OK'; user: User } | { status: 'WRONG_CREDENTIALS_ERROR' }>

  getUserById(input: { userId: string; userContext: any }): Promise<User | undefined>

  getUserByEmail(input: { email: string; userContext: any }): Promise<User | undefined>

  createResetPasswordToken(input: {
    userId: string
    userContext: any
  }): Promise<{ status: 'OK'; token: string } | { status: 'UNKNOWN_USER_ID_ERROR' }>

  resetPasswordUsingToken(input: {
    token: string
    newPassword: string
    userContext: any
  }): Promise<
        | {
          status: 'OK'
          /**
               * The id of the user whose password was reset.
               * Defined for Core versions 3.9 or later
               */
          userId?: string
        }
        | { status: 'RESET_PASSWORD_INVALID_TOKEN_ERROR' }
    >

  updateEmailOrPassword(input: {
    userId: string
    email?: string
    password?: string
    userContext: any
  }): Promise<{ status: 'OK' | 'UNKNOWN_USER_ID_ERROR' | 'EMAIL_ALREADY_EXISTS_ERROR' }>
}

export interface APIOptions {
  recipeImplementation: RecipeInterface
  appInfo: NormalisedAppinfo
  config: TypeNormalisedInput
  recipeId: string
  isInServerlessEnv: boolean
  req: BaseRequest
  res: BaseResponse
  emailDelivery: EmailDeliveryIngredient<TypeEmailPasswordEmailDeliveryInput>
}

export interface APIInterface {
  emailExistsGET:
  | undefined
  | ((input: {
    email: string
    options: APIOptions
    userContext: any
  }) => Promise<
              | {
                status: 'OK'
                exists: boolean
              }
              | GeneralErrorResponse
          >)

  generatePasswordResetTokenPOST:
  | undefined
  | ((input: {
    formFields: {
      id: string
      value: string
    }[]
    options: APIOptions
    userContext: any
  }) => Promise<
              | {
                status: 'OK'
              }
              | GeneralErrorResponse
          >)

  passwordResetPOST:
  | undefined
  | ((input: {
    formFields: {
      id: string
      value: string
    }[]
    token: string
    options: APIOptions
    userContext: any
  }) => Promise<
              | {
                status: 'OK'
                userId?: string
              }
              | {
                status: 'RESET_PASSWORD_INVALID_TOKEN_ERROR'
              }
              | GeneralErrorResponse
          >)

  signInPOST:
  | undefined
  | ((input: {
    formFields: {
      id: string
      value: string
    }[]
    options: APIOptions
    userContext: any
  }) => Promise<
              | {
                status: 'OK'
                user: User
                session: SessionContainerInterface
              }
              | {
                status: 'WRONG_CREDENTIALS_ERROR'
              }
              | GeneralErrorResponse
          >)

  signUpPOST:
  | undefined
  | ((input: {
    formFields: {
      id: string
      value: string
    }[]
    options: APIOptions
    userContext: any
  }) => Promise<
              | {
                status: 'OK'
                user: User
                session: SessionContainerInterface
              }
              | {
                status: 'EMAIL_ALREADY_EXISTS_ERROR'
              }
              | GeneralErrorResponse
          >)
}

export interface TypeEmailPasswordPasswordResetEmailDeliveryInput {
  type: 'PASSWORD_RESET'
  user: {
    id: string
    email: string
  }
  passwordResetLink: string
}

export type TypeEmailPasswordEmailDeliveryInput = TypeEmailPasswordPasswordResetEmailDeliveryInput
