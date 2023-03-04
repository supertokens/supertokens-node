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

import { NormalisedAppinfo } from '../../types'
import { RecipeInterface as EPRecipeInterface, NormalisedFormField } from '../emailpassword/types'
import { normaliseSignUpFormFields } from '../emailpassword/utils'
import { APIInterface, RecipeInterface, TypeInput, TypeInputSignUp, TypeNormalisedInput, TypeNormalisedInputSignUp } from './types'
import Recipe from './recipe'
import BackwardCompatibilityService from './emaildelivery/services/backwardCompatibility'

export function validateAndNormaliseUserInput(
  recipeInstance: Recipe,
  appInfo: NormalisedAppinfo,
  config?: TypeInput,
): TypeNormalisedInput {
  const signUpFeature = validateAndNormaliseSignUpConfig(
    recipeInstance,
    appInfo,
    config === undefined ? undefined : config.signUpFeature,
  )

  const resetPasswordUsingTokenFeature = config === undefined ? undefined : config.resetPasswordUsingTokenFeature

  const providers = ((config === undefined) || (config.providers === undefined)) ? [] : config.providers

  const override = {
    functions: (originalImplementation: RecipeInterface) => originalImplementation,
    apis: (originalImplementation: APIInterface) => originalImplementation,
    ...config?.override,
  }

  function getEmailDeliveryConfig(emailPasswordRecipeImpl: EPRecipeInterface, isInServerlessEnv: boolean) {
    let emailService = config?.emailDelivery?.service
    /**
         * following code is for backward compatibility.
         * if user has not passed emailDelivery config, we
         * use the createAndSendCustomEmail config. If the user
         * has not passed even that config, we use the default
         * createAndSendCustomEmail implementation
         */
    if (emailService === undefined) {
      emailService = new BackwardCompatibilityService(
        emailPasswordRecipeImpl,
        appInfo,
        isInServerlessEnv,
        config?.resetPasswordUsingTokenFeature,
      )
    }
    return {
      ...config?.emailDelivery,
      /**
             * if we do
             * let emailDelivery = {
             *    service: emailService,
             *    ...config.emailDelivery,
             * };
             *
             * and if the user has passed service as undefined,
             * it it again get set to undefined, so we
             * set service at the end
             */
      service: emailService,
    }
  }

  return {
    override,
    getEmailDeliveryConfig,
    signUpFeature,
    providers,
    resetPasswordUsingTokenFeature,
  }
}

function validateAndNormaliseSignUpConfig(
  _: Recipe,
  __: NormalisedAppinfo,
  config?: TypeInputSignUp,
): TypeNormalisedInputSignUp {
  const formFields: NormalisedFormField[] = normaliseSignUpFormFields(
    config === undefined ? undefined : config.formFields,
  )

  return {
    formFields,
  }
}
