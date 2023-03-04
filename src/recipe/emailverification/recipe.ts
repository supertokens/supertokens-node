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
import RecipeModule from '../../recipeModule'
import { APIHandled, HTTPMethod, NormalisedAppinfo, RecipeListFunction } from '../../types'
import NormalisedURLPath from '../../normalisedURLPath'
import { Querier } from '../../querier'
import { BaseRequest } from '../../framework/request'
import { BaseResponse } from '../../framework/response'
import EmailDeliveryIngredient from '../../ingredients/emaildelivery'
import { PostSuperTokensInitCallbacks } from '../../postSuperTokensInitCallbacks'
import SessionRecipe from '../session/recipe'
import { APIInterface, GetEmailForUserIdFunc, RecipeInterface, TypeEmailVerificationEmailDeliveryInput, TypeInput, TypeNormalisedInput } from './types'
import STError from './error'
import { validateAndNormaliseUserInput } from './utils'
import { EMAIL_VERIFY_API, GENERATE_EMAIL_VERIFY_TOKEN_API } from './constants'
import generateEmailVerifyTokenAPI from './api/generateEmailVerifyToken'
import emailVerifyAPI from './api/emailVerify'
import RecipeImplementation from './recipeImplementation'
import APIImplementation from './api/implementation'
import { EmailVerificationClaim } from './emailVerificationClaim'

export default class Recipe extends RecipeModule {
  private static instance: Recipe | undefined = undefined
  static RECIPE_ID = 'emailverification'

  config: TypeNormalisedInput

  recipeInterfaceImpl: RecipeInterface

  apiImpl: APIInterface

  isInServerlessEnv: boolean

  emailDelivery: EmailDeliveryIngredient<TypeEmailVerificationEmailDeliveryInput>

  getEmailForUserIdFuncsFromOtherRecipes: GetEmailForUserIdFunc[] = []

  constructor(
    recipeId: string,
    appInfo: NormalisedAppinfo,
    isInServerlessEnv: boolean,
    config: TypeInput,
    ingredients: {
      emailDelivery: EmailDeliveryIngredient<TypeEmailVerificationEmailDeliveryInput> | undefined
    },
  ) {
    super(recipeId, appInfo)
    this.config = validateAndNormaliseUserInput(this, appInfo, config)
    this.isInServerlessEnv = isInServerlessEnv

    {
      const builder = new OverrideableBuilder(RecipeImplementation(Querier.getNewInstanceOrThrowError(recipeId)))
      this.recipeInterfaceImpl = builder.override(this.config.override.functions).build()
    }
    {
      const builder = new OverrideableBuilder(APIImplementation())
      this.apiImpl = builder.override(this.config.override.apis).build()
    }

    /**
         * emailDelivery will always needs to be declared after isInServerlessEnv
         * and recipeInterfaceImpl values are set
         */
    this.emailDelivery
            = ingredients.emailDelivery === undefined
        ? new EmailDeliveryIngredient(this.config.getEmailDeliveryConfig(this.isInServerlessEnv))
        : ingredients.emailDelivery
  }

  static getInstanceOrThrowError(): Recipe {
    if (Recipe.instance !== undefined)
      return Recipe.instance

    throw new Error('Initialisation not done. Did you forget to call the SuperTokens.init function?')
  }

  static getInstance(): Recipe | undefined {
    return Recipe.instance
  }

  static init(config: TypeInput): RecipeListFunction {
    return (appInfo, isInServerlessEnv) => {
      if (Recipe.instance === undefined) {
        Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
          emailDelivery: undefined,
        })

        PostSuperTokensInitCallbacks.addPostInitCallback(() => {
          SessionRecipe.getInstanceOrThrowError().addClaimFromOtherRecipe(EmailVerificationClaim)

          if (config.mode === 'REQUIRED') {
            SessionRecipe.getInstanceOrThrowError().addClaimValidatorFromOtherRecipe(
              EmailVerificationClaim.validators.isVerified(),
            )
          }
        })

        return Recipe.instance
      }
      else {
        throw new Error(
          'Emailverification recipe has already been initialised. Please check your code for bugs.',
        )
      }
    }
  }

  static reset() {
    if (process.env.TEST_MODE !== 'testing')
      throw new Error('calling testing function in non testing env')

    Recipe.instance = undefined
  }

  // abstract instance functions below...............

  getAPIsHandled = (): APIHandled[] => {
    return [
      {
        method: 'post',
        pathWithoutApiBasePath: new NormalisedURLPath(GENERATE_EMAIL_VERIFY_TOKEN_API),
        id: GENERATE_EMAIL_VERIFY_TOKEN_API,
        disabled: this.apiImpl.generateEmailVerifyTokenPOST === undefined,
      },
      {
        method: 'post',
        pathWithoutApiBasePath: new NormalisedURLPath(EMAIL_VERIFY_API),
        id: EMAIL_VERIFY_API,
        disabled: this.apiImpl.verifyEmailPOST === undefined,
      },
      {
        method: 'get',
        pathWithoutApiBasePath: new NormalisedURLPath(EMAIL_VERIFY_API),
        id: EMAIL_VERIFY_API,
        disabled: this.apiImpl.isEmailVerifiedGET === undefined,
      },
    ]
  }

  handleAPIRequest = async (
    id: string,
    req: BaseRequest,
    res: BaseResponse,
    _: NormalisedURLPath,
    __: HTTPMethod,
  ): Promise<boolean> => {
    const options = {
      config: this.config,
      recipeId: this.getRecipeId(),
      isInServerlessEnv: this.isInServerlessEnv,
      recipeImplementation: this.recipeInterfaceImpl,
      req,
      res,
      emailDelivery: this.emailDelivery,
      appInfo: this.getAppInfo(),
    }
    if (id === GENERATE_EMAIL_VERIFY_TOKEN_API)
      return await generateEmailVerifyTokenAPI(this.apiImpl, options)
    else
      return await emailVerifyAPI(this.apiImpl, options)
  }

  handleError = async (err: STError, _: BaseRequest, __: BaseResponse): Promise<void> => {
    throw err
  }

  getAllCORSHeaders = (): string[] => {
    return []
  }

  isErrorFromThisRecipe = (err: any): err is STError => {
    return STError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID
  }

  getEmailForUserId: GetEmailForUserIdFunc = async (userId, userContext) => {
    if (this.config.getEmailForUserId !== undefined) {
      const userRes = await this.config.getEmailForUserId(userId, userContext)
      if (userRes.status !== 'UNKNOWN_USER_ID_ERROR')
        return userRes
    }

    for (const getEmailForUserId of this.getEmailForUserIdFuncsFromOtherRecipes) {
      const res = await getEmailForUserId(userId, userContext)
      if (res.status !== 'UNKNOWN_USER_ID_ERROR')
        return res
    }

    return {
      status: 'UNKNOWN_USER_ID_ERROR',
    }
  }

  addGetEmailForUserIdFunc = (func: GetEmailForUserIdFunc): void => {
    this.getEmailForUserIdFuncsFromOtherRecipes.push(func)
  }
}
