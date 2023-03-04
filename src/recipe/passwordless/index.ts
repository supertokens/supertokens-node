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

import Recipe from './recipe'
import SuperTokensError from './error'
import {
  APIInterface,
  APIOptions,
  RecipeInterface,
  TypePasswordlessEmailDeliveryInput,
  TypePasswordlessSmsDeliveryInput,
  User,
} from './types'

export default class Wrapper {
  static init = Recipe.init

  static Error = SuperTokensError

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

  static getUserById(input: { userId: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userContext: {}, ...input })
  }

  static getUserByEmail(input: { email: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByEmail({ userContext: {}, ...input })
  }

  static getUserByPhoneNumber(input: { phoneNumber: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByPhoneNumber({ userContext: {}, ...input })
  }

  static updateUser(input: {
    userId: string
    email?: string | null
    phoneNumber?: string | null
    userContext?: any
  }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateUser({ userContext: {}, ...input })
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
    return Recipe.getInstanceOrThrowError().createMagicLink({ userContext: {}, ...input })
  }

  static signInUp(
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
    return Recipe.getInstanceOrThrowError().signInUp({ userContext: {}, ...input })
  }

  static async sendEmail(input: TypePasswordlessEmailDeliveryInput & { userContext?: any }) {
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

export const createCode = Wrapper.createCode

export const consumeCode = Wrapper.consumeCode

export const getUserByEmail = Wrapper.getUserByEmail

export const getUserById = Wrapper.getUserById

export const getUserByPhoneNumber = Wrapper.getUserByPhoneNumber

export const listCodesByDeviceId = Wrapper.listCodesByDeviceId

export const listCodesByEmail = Wrapper.listCodesByEmail

export const listCodesByPhoneNumber = Wrapper.listCodesByPhoneNumber

export const listCodesByPreAuthSessionId = Wrapper.listCodesByPreAuthSessionId

export const createNewCodeForDevice = Wrapper.createNewCodeForDevice

export const updateUser = Wrapper.updateUser

export const revokeAllCodes = Wrapper.revokeAllCodes

export const revokeCode = Wrapper.revokeCode

export const createMagicLink = Wrapper.createMagicLink

export const signInUp = Wrapper.signInUp

export type { RecipeInterface, User, APIOptions, APIInterface }

export const sendEmail = Wrapper.sendEmail

export const sendSms = Wrapper.sendSms
