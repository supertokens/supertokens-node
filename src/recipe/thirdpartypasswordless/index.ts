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

import * as thirdPartyProviders from '../thirdparty/providers'
import { TypeProvider } from '../thirdparty/types'
import { TypePasswordlessSmsDeliveryInput } from '../passwordless/types'
import Recipe from './recipe'
import SuperTokensError from './error'
import {
  APIInterface,
  PasswordlessAPIOptions,
  RecipeInterface,
  ThirdPartyAPIOptions,
  TypeThirdPartyPasswordlessEmailDeliveryInput,
  User,
} from './types'

export default class Wrapper {
  static init = Recipe.init

  static Error = SuperTokensError

  static thirdPartySignInUp(thirdPartyId: string, thirdPartyUserId: string, email: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.thirdPartySignInUp({
      thirdPartyId,
      thirdPartyUserId,
      email,
      userContext,
    })
  }

  static getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByThirdPartyInfo({
      thirdPartyId,
      thirdPartyUserId,
      userContext,
    })
  }

  static getUserById(userId: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId, userContext })
  }

  static getUsersByEmail(email: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersByEmail({ email, userContext })
  }

  static createCode(
    input: (
      | {
        email: string
      }
      | {
        phoneNumber: string
      }
    ) & { userInputCode?: string; userContext?: any },
  ) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createCode({
      userContext: {},
      ...input,
    })
  }

  static createNewCodeForDevice(input: { deviceId: string; userInputCode?: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewCodeForDevice({
      userContext: {},
      ...input,
    })
  }

  static consumeCode(
    input:
      | {
        preAuthSessionId: string
        userInputCode: string
        deviceId: string
        userContext?: any
      }
      | {
        preAuthSessionId: string
        linkCode: string
        userContext?: any
      },
  ) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.consumeCode({ userContext: {}, ...input })
  }

  static getUserByPhoneNumber(input: { phoneNumber: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByPhoneNumber({ userContext: {}, ...input })
  }

  static updatePasswordlessUser(input: {
    userId: string
    email?: string | null
    phoneNumber?: string | null
    userContext?: any
  }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updatePasswordlessUser({
      userContext: {},
      ...input,
    })
  }

  static revokeAllCodes(
    input:
      | {
        email: string
        userContext?: any
      }
      | {
        phoneNumber: string
        userContext?: any
      },
  ) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllCodes({ userContext: {}, ...input })
  }

  static revokeCode(input: { codeId: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeCode({ userContext: {}, ...input })
  }

  static listCodesByEmail(input: { email: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByEmail({ userContext: {}, ...input })
  }

  static listCodesByPhoneNumber(input: { phoneNumber: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPhoneNumber({
      userContext: {},
      ...input,
    })
  }

  static listCodesByDeviceId(input: { deviceId: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByDeviceId({ userContext: {}, ...input })
  }

  static listCodesByPreAuthSessionId(input: { preAuthSessionId: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.listCodesByPreAuthSessionId({
      userContext: {},
      ...input,
    })
  }

  static createMagicLink(
    input:
      | {
        email: string
        userContext?: any
      }
      | {
        phoneNumber: string
        userContext?: any
      },
  ) {
    return Recipe.getInstanceOrThrowError().passwordlessRecipe.createMagicLink({ userContext: {}, ...input })
  }

  static passwordlessSignInUp(
    input:
      | {
        email: string
        userContext?: any
      }
      | {
        phoneNumber: string
        userContext?: any
      },
  ) {
    return Recipe.getInstanceOrThrowError().passwordlessRecipe.signInUp({ userContext: {}, ...input })
  }

  static Google = thirdPartyProviders.Google

  static Github = thirdPartyProviders.Github

  static Facebook = thirdPartyProviders.Facebook

  static Apple = thirdPartyProviders.Apple

  static Discord = thirdPartyProviders.Discord

  static GoogleWorkspaces = thirdPartyProviders.GoogleWorkspaces

  static Bitbucket = thirdPartyProviders.Bitbucket

  static GitLab = thirdPartyProviders.GitLab

  // static Okta = thirdPartyProviders.Okta;

  // static ActiveDirectory = thirdPartyProviders.ActiveDirectory;

  static async sendEmail(input: TypeThirdPartyPasswordlessEmailDeliveryInput & { userContext?: any }) {
    return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail({
      userContext: {},
      ...input,
    })
  }

  static async sendSms(input: TypePasswordlessSmsDeliveryInput & { userContext?: any }) {
    return await Recipe.getInstanceOrThrowError().smsDelivery.ingredientInterfaceImpl.sendSms({
      userContext: {},
      ...input,
    })
  }
}

export const init = Wrapper.init

export const Error = Wrapper.Error

export const thirdPartySignInUp = Wrapper.thirdPartySignInUp

export const passwordlessSignInUp = Wrapper.passwordlessSignInUp

export const getUserById = Wrapper.getUserById

export const getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo

export const getUsersByEmail = Wrapper.getUsersByEmail

export const createCode = Wrapper.createCode

export const consumeCode = Wrapper.consumeCode

export const getUserByPhoneNumber = Wrapper.getUserByPhoneNumber

export const listCodesByDeviceId = Wrapper.listCodesByDeviceId

export const listCodesByEmail = Wrapper.listCodesByEmail

export const listCodesByPhoneNumber = Wrapper.listCodesByPhoneNumber

export const listCodesByPreAuthSessionId = Wrapper.listCodesByPreAuthSessionId

export const createNewCodeForDevice = Wrapper.createNewCodeForDevice

export const updatePasswordlessUser = Wrapper.updatePasswordlessUser

export const revokeAllCodes = Wrapper.revokeAllCodes

export const revokeCode = Wrapper.revokeCode

export const createMagicLink = Wrapper.createMagicLink

export const Google = Wrapper.Google

export const Github = Wrapper.Github

export const Facebook = Wrapper.Facebook

export const Apple = Wrapper.Apple

export const Discord = Wrapper.Discord

export const GoogleWorkspaces = Wrapper.GoogleWorkspaces

export const Bitbucket = Wrapper.Bitbucket

export const GitLab = Wrapper.GitLab

// export let Okta = Wrapper.Okta;

// export let ActiveDirectory = Wrapper.ActiveDirectory;

export type { RecipeInterface, TypeProvider, User, APIInterface, PasswordlessAPIOptions, ThirdPartyAPIOptions }

export const sendEmail = Wrapper.sendEmail

export const sendSms = Wrapper.sendSms
