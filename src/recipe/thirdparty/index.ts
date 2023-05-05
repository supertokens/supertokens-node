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
import * as thirdPartyProviders from './providers'
import { APIInterface, APIOptions, RecipeInterface, TypeProvider, User } from './types'

export default class Wrapper {
  static init = Recipe.init

  static Error = SuperTokensError

  static async signInUp(thirdPartyId: string, thirdPartyUserId: string, email: string, userContext: any = {}) {
    return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.signInUp({
      thirdPartyId,
      thirdPartyUserId,
      email,
      userContext,
    })
  }

  static getUserById(userId: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserById({ userId, userContext })
  }

  static getUsersByEmail(email: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUsersByEmail({ email, userContext })
  }

  static getUserByThirdPartyInfo(thirdPartyId: string, thirdPartyUserId: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserByThirdPartyInfo({
      thirdPartyId,
      thirdPartyUserId,
      userContext,
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
}

export const init = Wrapper.init

export const Error = Wrapper.Error

export const signInUp = Wrapper.signInUp

export const getUserById = Wrapper.getUserById

export const getUsersByEmail = Wrapper.getUsersByEmail

export const getUserByThirdPartyInfo = Wrapper.getUserByThirdPartyInfo

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

export type { RecipeInterface, User, APIInterface, APIOptions, TypeProvider }
