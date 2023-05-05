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
import { TypeEmailPasswordEmailDeliveryInput } from '../emailpassword/types'
import Recipe from './recipe'
import SuperTokensError from './error'
import { APIInterface, EmailPasswordAPIOptions, RecipeInterface, ThirdPartyAPIOptions, User } from './types'

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

  static emailPasswordSignUp(email: string, password: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.emailPasswordSignUp({
      email,
      password,
      userContext,
    })
  }

  static emailPasswordSignIn(email: string, password: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.emailPasswordSignIn({
      email,
      password,
      userContext,
    })
  }

  static getUserById(userId: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId, userContext })
  }

  static getUsersByEmail(email: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersByEmail({ email, userContext })
  }

  static createResetPasswordToken(userId: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createResetPasswordToken({ userId, userContext })
  }

  static resetPasswordUsingToken(token: string, newPassword: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.resetPasswordUsingToken({
      token,
      newPassword,
      userContext,
    })
  }

  static updateEmailOrPassword(input: { userId: string; email?: string; password?: string; userContext?: any }) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateEmailOrPassword({
      userContext: {},
      ...input,
    })
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

  static async sendEmail(input: TypeEmailPasswordEmailDeliveryInput & { userContext?: any }) {
    return await Recipe.getInstanceOrThrowError().emailDelivery.ingredientInterfaceImpl.sendEmail({
      userContext: {},
      ...input,
    })
  }
}

export const init = Wrapper.init

export const Error = Wrapper.Error

export const emailPasswordSignUp = Wrapper.emailPasswordSignUp

export const emailPasswordSignIn = Wrapper.emailPasswordSignIn

export const thirdPartySignInUp = Wrapper.thirdPartySignInUp

export const getUserById = Wrapper.getUserById

export const getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo

export const getUsersByEmail = Wrapper.getUsersByEmail

export const createResetPasswordToken = Wrapper.createResetPasswordToken

export const resetPasswordUsingToken = Wrapper.resetPasswordUsingToken

export const updateEmailOrPassword = Wrapper.updateEmailOrPassword

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

export type { RecipeInterface, TypeProvider, User, APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions }

export const sendEmail = Wrapper.sendEmail
