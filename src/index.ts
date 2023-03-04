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

import SuperTokens from './supertokens'
import SuperTokensError from './error'

// For Express
export default class SuperTokensWrapper {
  static init = SuperTokens.init

  static Error = SuperTokensError

  static getAllCORSHeaders() {
    return SuperTokens.getInstanceOrThrowError().getAllCORSHeaders()
  }

  static getUserCount(includeRecipeIds?: string[]) {
    return SuperTokens.getInstanceOrThrowError().getUserCount(includeRecipeIds)
  }

  static getUsersOldestFirst(input?: {
    limit?: number
    paginationToken?: string
    includeRecipeIds?: string[]
  }): Promise<{
    users: { recipeId: string; user: any }[]
    nextPaginationToken?: string
  }> {
    return SuperTokens.getInstanceOrThrowError().getUsers({
      timeJoinedOrder: 'ASC',
      ...input,
    })
  }

  static getUsersNewestFirst(input?: {
    limit?: number
    paginationToken?: string
    includeRecipeIds?: string[]
  }): Promise<{
    users: { recipeId: string; user: any }[]
    nextPaginationToken?: string
  }> {
    return SuperTokens.getInstanceOrThrowError().getUsers({
      timeJoinedOrder: 'DESC',
      ...input,
    })
  }

  static deleteUser(userId: string) {
    return SuperTokens.getInstanceOrThrowError().deleteUser({
      userId,
    })
  }

  static createUserIdMapping(input: {
    superTokensUserId: string
    externalUserId: string
    externalUserIdInfo?: string
    force?: boolean
  }) {
    return SuperTokens.getInstanceOrThrowError().createUserIdMapping(input)
  }

  static getUserIdMapping(input: { userId: string; userIdType?: 'SUPERTOKENS' | 'EXTERNAL' | 'ANY' }) {
    return SuperTokens.getInstanceOrThrowError().getUserIdMapping(input)
  }

  static deleteUserIdMapping(input: {
    userId: string
    userIdType?: 'SUPERTOKENS' | 'EXTERNAL' | 'ANY'
    force?: boolean
  }) {
    return SuperTokens.getInstanceOrThrowError().deleteUserIdMapping(input)
  }

  static updateOrDeleteUserIdMappingInfo(input: {
    userId: string
    userIdType?: 'SUPERTOKENS' | 'EXTERNAL' | 'ANY'
    externalUserIdInfo?: string
  }) {
    return SuperTokens.getInstanceOrThrowError().updateOrDeleteUserIdMappingInfo(input)
  }
}

export const init = SuperTokensWrapper.init

export const getAllCORSHeaders = SuperTokensWrapper.getAllCORSHeaders

export const getUserCount = SuperTokensWrapper.getUserCount

export const getUsersOldestFirst = SuperTokensWrapper.getUsersOldestFirst

export const getUsersNewestFirst = SuperTokensWrapper.getUsersNewestFirst

export const deleteUser = SuperTokensWrapper.deleteUser

export const createUserIdMapping = SuperTokensWrapper.createUserIdMapping

export const getUserIdMapping = SuperTokensWrapper.getUserIdMapping

export const deleteUserIdMapping = SuperTokensWrapper.deleteUserIdMapping

export const updateOrDeleteUserIdMappingInfo = SuperTokensWrapper.updateOrDeleteUserIdMappingInfo

export const Error = SuperTokensWrapper.Error
