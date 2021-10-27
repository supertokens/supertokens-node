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

import { NormalisedAppinfo } from "../../types";
import { validateTheStructureOfUserInput } from "../../utils";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import { TypeInput, InputSchema, TypeNormalisedInput, TypeInputSignUp, TypeNormalisedInputSignUp } from "./types";
import { NormalisedFormField } from "../emailpassword/types";
import Recipe from "./recipe";
import { normaliseSignUpFormFields } from "../emailpassword/utils";
import { RecipeInterface, APIInterface } from "./types";

export function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput {
    validateTheStructureOfUserInput(config, InputSchema, "thirdpartyemailpassword recipe");

    let signUpFeature = validateAndNormaliseSignUpConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.signUpFeature
    );

    let resetPasswordUsingTokenFeature = config === undefined ? undefined : config.resetPasswordUsingTokenFeature;

    let providers = config === undefined || config.providers === undefined ? [] : config.providers;

    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        override,
        signUpFeature,
        providers,
        resetPasswordUsingTokenFeature,
        emailVerificationFeature,
    };
}

function validateAndNormaliseSignUpConfig(
    _: Recipe,
    __: NormalisedAppinfo,
    config?: TypeInputSignUp
): TypeNormalisedInputSignUp {
    let formFields: NormalisedFormField[] = normaliseSignUpFormFields(
        config === undefined ? undefined : config.formFields
    );

    return {
        formFields,
    };
}

function validateAndNormaliseEmailVerificationConfig(
    recipeInstance: Recipe,
    _: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInputEmailVerification {
    return {
        getEmailForUserId: recipeInstance.getEmailForUserId,
        override: config?.override?.emailVerificationFeature,
        createAndSendCustomEmail:
            config?.emailVerificationFeature?.createAndSendCustomEmail === undefined
                ? undefined
                : async (user, link) => {
                      let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById({ userId: user.id });
                      if (
                          userInfo === undefined ||
                          config?.emailVerificationFeature?.createAndSendCustomEmail === undefined
                      ) {
                          throw new Error("Unknown User ID provided");
                      }
                      return await config.emailVerificationFeature.createAndSendCustomEmail(userInfo, link);
                  },
        getEmailVerificationURL:
            config?.emailVerificationFeature?.getEmailVerificationURL === undefined
                ? undefined
                : async (user) => {
                      let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById({ userId: user.id });
                      if (
                          userInfo === undefined ||
                          config?.emailVerificationFeature?.getEmailVerificationURL === undefined
                      ) {
                          throw new Error("Unknown User ID provided");
                      }
                      return await config.emailVerificationFeature.getEmailVerificationURL(userInfo);
                  },
    };
}
