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

import OpenIdRecipe from '../openid/recipe'
import { JSONObject } from '../../types'
import frameworks from '../../framework'
import SuperTokens from '../../supertokens'
import Recipe from './recipe'
import {
  APIInterface,
  APIOptions,
  ClaimValidationError,
  RecipeInterface,
  SessionClaim,
  SessionClaimValidator,
  SessionContainerInterface as SessionContainer,
  SessionInformation,
  VerifySessionOptions,
} from './types'
import SuperTokensError from './error'
import { getRequiredClaimValidators } from './utils'

// For Express
export default class SessionWrapper {
  static init = Recipe.init

  static Error = SuperTokensError

  static async createNewSession(
    req: any,
    res: any,
    userId: string,
        accessTokenPayload: any = {},
        sessionData: any = {},
        userContext: any = {},
  ) {
    const claimsAddedByOtherRecipes = Recipe.getInstanceOrThrowError().getClaimsAddedByOtherRecipes()

    let finalAccessTokenPayload = accessTokenPayload

    for (const claim of claimsAddedByOtherRecipes) {
      const update = await claim.build(userId, userContext)
      finalAccessTokenPayload = {
        ...finalAccessTokenPayload,
        ...update,
      }
    }

    if (!req.wrapperUsed)
      req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req)

    if (!res.wrapperUsed)
      res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res)

    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.createNewSession({
      req,
      res,
      userId,
      accessTokenPayload: finalAccessTokenPayload,
      sessionData,
      userContext,
    })
  }

  static async validateClaimsForSessionHandle(
    sessionHandle: string,
    overrideGlobalClaimValidators?: (
      globalClaimValidators: SessionClaimValidator[],
      sessionInfo: SessionInformation,
      userContext: any
    ) => Promise<SessionClaimValidator[]> | SessionClaimValidator[],
        userContext: any = {},
  ): Promise<
        | {
          status: 'SESSION_DOES_NOT_EXIST_ERROR'
        }
        | {
          status: 'OK'
          invalidClaims: ClaimValidationError[]
        }
    > {
    const recipeImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl

    const sessionInfo = await recipeImpl.getSessionInformation({
      sessionHandle,
      userContext,
    })
    if (sessionInfo === undefined) {
      return {
        status: 'SESSION_DOES_NOT_EXIST_ERROR',
      }
    }

    const claimValidatorsAddedByOtherRecipes = Recipe.getInstanceOrThrowError().getClaimValidatorsAddedByOtherRecipes()
    const globalClaimValidators: SessionClaimValidator[] = await recipeImpl.getGlobalClaimValidators({
      userId: sessionInfo?.userId,
      claimValidatorsAddedByOtherRecipes,
      userContext,
    })

    const claimValidators
            = overrideGlobalClaimValidators !== undefined
              ? await overrideGlobalClaimValidators(globalClaimValidators, sessionInfo, userContext)
              : globalClaimValidators

    const claimValidationResponse = await recipeImpl.validateClaims({
      userId: sessionInfo.userId,
      accessTokenPayload: sessionInfo.accessTokenPayload,
      claimValidators,
      userContext,
    })

    if (claimValidationResponse.accessTokenPayloadUpdate !== undefined) {
      if (
        !(await recipeImpl.mergeIntoAccessTokenPayload({
          sessionHandle,
          accessTokenPayloadUpdate: claimValidationResponse.accessTokenPayloadUpdate,
          userContext,
        }))
      ) {
        return {
          status: 'SESSION_DOES_NOT_EXIST_ERROR',
        }
      }
    }
    return {
      status: 'OK',
      invalidClaims: claimValidationResponse.invalidClaims,
    }
  }

  static async validateClaimsInJWTPayload(
    userId: string,
    jwtPayload: JSONObject,
    overrideGlobalClaimValidators?: (
      globalClaimValidators: SessionClaimValidator[],
      userId: string,
      userContext: any
    ) => Promise<SessionClaimValidator[]> | SessionClaimValidator[],
        userContext: any = {},
  ): Promise<{
    status: 'OK'
    invalidClaims: ClaimValidationError[]
  }> {
    const recipeImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl

    const claimValidatorsAddedByOtherRecipes = Recipe.getInstanceOrThrowError().getClaimValidatorsAddedByOtherRecipes()
    const globalClaimValidators: SessionClaimValidator[] = await recipeImpl.getGlobalClaimValidators({
      userId,
      claimValidatorsAddedByOtherRecipes,
      userContext,
    })

    const claimValidators
            = overrideGlobalClaimValidators !== undefined
              ? await overrideGlobalClaimValidators(globalClaimValidators, userId, userContext)
              : globalClaimValidators
    return recipeImpl.validateClaimsInJWTPayload({
      userId,
      jwtPayload,
      claimValidators,
      userContext,
    })
  }

  static getSession(req: any, res: any): Promise<SessionContainer>
  static getSession(
    req: any,
    res: any,
    options?: VerifySessionOptions & { sessionRequired?: true },
    userContext?: any
  ): Promise<SessionContainer>
  static getSession(
    req: any,
    res: any,
    options?: VerifySessionOptions & { sessionRequired: false },
    userContext?: any
  ): Promise<SessionContainer | undefined>
  static async getSession(req: any, res: any, options?: VerifySessionOptions, userContext: any = {}) {
    if (!res.wrapperUsed)
      res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res)

    if (!req.wrapperUsed)
      req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req)

    const recipeInterfaceImpl = Recipe.getInstanceOrThrowError().recipeInterfaceImpl
    const session = await recipeInterfaceImpl.getSession({ req, res, options, userContext })

    if (session !== undefined) {
      const claimValidators = await getRequiredClaimValidators(
        session,
        options?.overrideGlobalClaimValidators,
        userContext,
      )
      await session.assertClaims(claimValidators, userContext)
    }
    return session
  }

  static getSessionInformation(sessionHandle: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getSessionInformation({
      sessionHandle,
      userContext,
    })
  }

  static refreshSession(req: any, res: any, userContext: any = {}) {
    if (!res.wrapperUsed)
      res = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapResponse(res)

    if (!req.wrapperUsed)
      req = frameworks[SuperTokens.getInstanceOrThrowError().framework].wrapRequest(req)

    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.refreshSession({ req, res, userContext })
  }

  static revokeAllSessionsForUser(userId: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeAllSessionsForUser({ userId, userContext })
  }

  static getAllSessionHandlesForUser(userId: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getAllSessionHandlesForUser({
      userId,
      userContext,
    })
  }

  static revokeSession(sessionHandle: string, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeSession({ sessionHandle, userContext })
  }

  static revokeMultipleSessions(sessionHandles: string[], userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.revokeMultipleSessions({
      sessionHandles,
      userContext,
    })
  }

  static updateSessionData(sessionHandle: string, newSessionData: any, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateSessionData({
      sessionHandle,
      newSessionData,
      userContext,
    })
  }

  static regenerateAccessToken(accessToken: string, newAccessTokenPayload?: any, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.regenerateAccessToken({
      accessToken,
      newAccessTokenPayload,
      userContext,
    })
  }

  static updateAccessTokenPayload(sessionHandle: string, newAccessTokenPayload: any, userContext: any = {}) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.updateAccessTokenPayload({
      sessionHandle,
      newAccessTokenPayload,
      userContext,
    })
  }

  static mergeIntoAccessTokenPayload(
    sessionHandle: string,
    accessTokenPayloadUpdate: JSONObject,
    userContext: any = {},
  ) {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.mergeIntoAccessTokenPayload({
      sessionHandle,
      accessTokenPayloadUpdate,
      userContext,
    })
  }

  static createJWT(payload?: any, validitySeconds?: number, userContext: any = {}) {
    const openIdRecipe: OpenIdRecipe | undefined = Recipe.getInstanceOrThrowError().openIdRecipe

    if (openIdRecipe !== undefined)
      return openIdRecipe.recipeImplementation.createJWT({ payload, validitySeconds, userContext })

    throw new global.Error(
      'createJWT cannot be used without enabling the JWT feature. Please set \'enableJWT: true\' when initialising the Session recipe',
    )
  }

  static getJWKS(userContext: any = {}) {
    const openIdRecipe: OpenIdRecipe | undefined = Recipe.getInstanceOrThrowError().openIdRecipe

    if (openIdRecipe !== undefined)
      return openIdRecipe.recipeImplementation.getJWKS({ userContext })

    throw new global.Error(
      'getJWKS cannot be used without enabling the JWT feature. Please set \'enableJWT: true\' when initialising the Session recipe',
    )
  }

  static getOpenIdDiscoveryConfiguration(userContext: any = {}) {
    const openIdRecipe: OpenIdRecipe | undefined = Recipe.getInstanceOrThrowError().openIdRecipe

    if (openIdRecipe !== undefined)
      return openIdRecipe.recipeImplementation.getOpenIdDiscoveryConfiguration({ userContext })

    throw new global.Error(
      'getOpenIdDiscoveryConfiguration cannot be used without enabling the JWT feature. Please set \'enableJWT: true\' when initialising the Session recipe',
    )
  }

  static fetchAndSetClaim(sessionHandle: string, claim: SessionClaim<any>, userContext: any = {}): Promise<boolean> {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.fetchAndSetClaim({
      sessionHandle,
      claim,
      userContext,
    })
  }

  static setClaimValue<T>(
    sessionHandle: string,
    claim: SessionClaim<T>,
    value: T,
        userContext: any = {},
  ): Promise<boolean> {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.setClaimValue({
      sessionHandle,
      claim,
      value,
      userContext,
    })
  }

  static getClaimValue<T>(
    sessionHandle: string,
    claim: SessionClaim<T>,
        userContext: any = {},
  ): Promise<
        | {
          status: 'SESSION_DOES_NOT_EXIST_ERROR'
        }
        | {
          status: 'OK'
          value: T | undefined
        }
    > {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getClaimValue({
      sessionHandle,
      claim,
      userContext,
    })
  }

  static removeClaim(sessionHandle: string, claim: SessionClaim<any>, userContext: any = {}): Promise<boolean> {
    return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeClaim({
      sessionHandle,
      claim,
      userContext,
    })
  }
}

export const init = SessionWrapper.init

export const createNewSession = SessionWrapper.createNewSession

export const getSession = SessionWrapper.getSession

export const getSessionInformation = SessionWrapper.getSessionInformation

export const refreshSession = SessionWrapper.refreshSession

export const revokeAllSessionsForUser = SessionWrapper.revokeAllSessionsForUser

export const getAllSessionHandlesForUser = SessionWrapper.getAllSessionHandlesForUser

export const revokeSession = SessionWrapper.revokeSession

export const revokeMultipleSessions = SessionWrapper.revokeMultipleSessions

export const updateSessionData = SessionWrapper.updateSessionData

export const updateAccessTokenPayload = SessionWrapper.updateAccessTokenPayload
export const mergeIntoAccessTokenPayload = SessionWrapper.mergeIntoAccessTokenPayload

export const fetchAndSetClaim = SessionWrapper.fetchAndSetClaim
export const setClaimValue = SessionWrapper.setClaimValue
export const getClaimValue = SessionWrapper.getClaimValue
export const removeClaim = SessionWrapper.removeClaim
export const validateClaimsInJWTPayload = SessionWrapper.validateClaimsInJWTPayload
export const validateClaimsForSessionHandle = SessionWrapper.validateClaimsForSessionHandle

export const Error = SessionWrapper.Error

// JWT Functions
export const createJWT = SessionWrapper.createJWT

export const getJWKS = SessionWrapper.getJWKS

// Open id functions

export const getOpenIdDiscoveryConfiguration = SessionWrapper.getOpenIdDiscoveryConfiguration

export type {
  VerifySessionOptions,
  RecipeInterface,
  SessionContainer,
  APIInterface,
  APIOptions,
  SessionInformation,
  SessionClaimValidator,
}
