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
import Recipe from "./recipe";
import STError from "./error";
import { TypeInput as TypeNormalisedInputEmailVerification } from "../emailverification/types";
import { RecipeInterface, APIInterface } from "./types";
import {
    TypeInput,
    InputSchema,
    TypeNormalisedInput,
    TypeInputSignInAndUp,
    TypeNormalisedInputSignInAndUp,
} from "./types";

export function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput {
    validateTheStructureOfUserInput(config, InputSchema, "thirdparty recipe");

    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);

    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(appInfo, config.signInAndUpFeature);

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config.override,
    };

    return {
        emailVerificationFeature,
        signInAndUpFeature,
        override,
    };
}

function validateAndNormaliseSignInAndUpConfig(
    _: NormalisedAppinfo,
    config: TypeInputSignInAndUp
): TypeNormalisedInputSignInAndUp {
    let providers = config.providers;

    if (providers === undefined || providers.length === 0) {
        throw new STError({
            type: "BAD_INPUT_ERROR",
            message:
                "thirdparty recipe requires atleast 1 provider to be passed in signInAndUpFeature.providers config",
        });
    }
    return {
        providers,
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
