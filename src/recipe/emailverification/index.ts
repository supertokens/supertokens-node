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
import { APIInterface, APIOptions, RecipeInterface, TypeEmailVerificationEmailDeliveryInput, User } from './types'
import { EmailVerificationClaim } from './emailVerificationClaim'

export default class Wrapper {
  static init = Recipe.init

  static Error = SuperTokensError

  static EmailVerificationClaim = EmailVerificationClaim

  static async createEmailVerificationToken(
    userId: string,
    email?: string,
    userContext?: any,
  ): Promise<
        | {
          status: 'OK'
          token: string
        }
        | { status: 'EMAIL_ALREADY_VERIFIED_ERROR' }
    > {
    const recipeInstance = Recipe.getInstanceOrThrowError()

    if (email === undefined) {
      const emailInfo = await recipeInstance.getEmailForUserId(userId, userContext)
      if (emailInfo.status === 'OK') {
        email = emailInfo.email
      }
      else if (emailInfo.status === 'EMAIL_DOES_NOT_EXIST_ERROR') {
        return {
          status: 'EMAIL_ALREADY_VERIFIED_ERROR',
        }
      }
      else {
        throw new global.Error('Unknown User ID provided without email')
      }
    }

    return await recipeInstance.recipeInterfaceImpl.createEmailVerificationToken({
      userId,
      email: email!,
      userContext: userContext === undefined ? {} : userContext,
    })
  }

  static async verifyEmailUsingToken(token: string, userContext?: any) {
    return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.verifyEmailUsingToken({
      token,
      userContext: userContext === undefined ? {} : userContext,
    })
  }

  static async isEmailVerified(userId: string, email?: string, userContext?: any) {
    const recipeInstance = Recipe.getInstanceOrThrowError()
    if (email === undefined) {
      const emailInfo = await recipeInstance.getEmailForUserId(userId, userContext)

      if (emailInfo.status === 'OK')
        email = emailInfo.email
      else if (emailInfo.status === 'EMAIL_DOES_NOT_EXIST_ERROR')
        return true
      else
        throw new global.Error('Unknown User ID provided without email')
    }

    return await recipeInstance.recipeInterfaceImpl.isEmailVerified({
      userId,
      email: email!,
      userContext: userContext === undefined ? {} : userContext,
    })
  }

  static async revokeEmailVerificationTokens(userId: string, email?: string, userContext?: any) {
    const recipeInstance = Recipe.getInstanceOrThrowError()

    // If the dev wants to delete the tokens for an old email address of the user they can pass the address
    // but redeeming those tokens would have no effect on isEmailVerified called without the old address
    // so in general that is not necessary either.
    if (email === undefined) {
      const emailInfo = await recipeInstance.getEmailForUserId(userId, userContext)
      if (emailInfo.status === 'OK') {
        email = emailInfo.email
      }
      else if (emailInfo.status === 'EMAIL_DOES_NOT_EXIST_ERROR') {
        // This only happens for phone based passwordless users (or if the user added a custom getEmailForUserId)
        // We can return OK here, since there is no way to create an email verification token
        // if getEmailForUserId returns EMAIL_DOES_NOT_EXIST_ERROR.
        return {
          status: 'OK',
        }
      }
      else {
        throw new global.Error('Unknown User ID provided without email')
      }
    }

    return await recipeInstance.recipeInterfaceImpl.revokeEmailVerificationTokens({
      userId,
      email: email!,
      userContext: userContext === undefined ? {} : userContext,
    })
  }

  static async unverifyEmail(userId: string, email?: string, userContext?: any) {
    const recipeInstance = Recipe.getInstanceOrThrowError()
    if (email === undefined) {
      const emailInfo = await recipeInstance.getEmailForUserId(userId, userContext)
      if (emailInfo.status === 'OK') {
        email = emailInfo.email
      }
      else if (emailInfo.status === 'EMAIL_DOES_NOT_EXIST_ERROR') {
        // Here we are returning OK since that's how it used to work, but a later call to isVerified will still return true
        return {
          status: 'OK',
        }
      }
      else {
        throw new global.Error('Unknown User ID provided without email')
      }
    }
    return await recipeInstance.recipeInterfaceImpl.unverifyEmail({
      userId,
      email: email!,
      userContext: userContext === undefined ? {} : userContext,
    })
  }

  static async sendEmail(input: TypeEmailVerificationEmailDeliveryInput & { userContext?: any }) {
    const recipeInstance = Recipe.getInstanceOrThrowError()
    return await recipeInstance.emailDelivery.ingredientInterfaceImpl.sendEmail({
      userContext: {},
      ...input,
    })
  }
}

export const init = Wrapper.init

export const Error = Wrapper.Error

export const createEmailVerificationToken = Wrapper.createEmailVerificationToken

export const verifyEmailUsingToken = Wrapper.verifyEmailUsingToken

export const isEmailVerified = Wrapper.isEmailVerified

export const revokeEmailVerificationTokens = Wrapper.revokeEmailVerificationTokens

export const unverifyEmail = Wrapper.unverifyEmail

export type { RecipeInterface, APIOptions, APIInterface, User }

export const sendEmail = Wrapper.sendEmail

export { EmailVerificationClaim } from './emailVerificationClaim'
