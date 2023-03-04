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

import { JSONObject } from '../../types'
import Recipe from './recipe'
import { RecipeInterface } from './types'

export default class Wrapper {
  static init = Recipe.init

  static async getUserMetadata(userId: string, userContext?: any) {
    return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getUserMetadata({
      userId,
      userContext: userContext === undefined ? {} : userContext,
    })
  }

  static async updateUserMetadata(userId: string, metadataUpdate: JSONObject, userContext?: any) {
    return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateUserMetadata({
      userId,
      metadataUpdate,
      userContext: userContext === undefined ? {} : userContext,
    })
  }

  static async clearUserMetadata(userId: string, userContext?: any) {
    return await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.clearUserMetadata({
      userId,
      userContext: userContext === undefined ? {} : userContext,
    })
  }
}

export const init = Wrapper.init
export const getUserMetadata = Wrapper.getUserMetadata
export const updateUserMetadata = Wrapper.updateUserMetadata
export const clearUserMetadata = Wrapper.clearUserMetadata

export type { RecipeInterface, JSONObject }
