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
import {
    User,
    TypeInput,
    InputSchema,
    TypeNormalisedInput,
    TypeInputSignInAndUp,
    TypeInputSignOutFeature,
    TypeInputEmailVerificationFeature,
    TypeNormalisedInputSignOutFeature,
    TypeNormalisedInputSignInAndUp,
} from "./types";

async function defaultHandlePostSignUpIn(user: User, thirdPartyAuthCodeResponse: any) {}

export function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput {
    validateTheStructureOfUserInput(config, InputSchema, "thirdparty recipe", recipeInstance.getRecipeId());
    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(
        recipeInstance,
        appInfo,
        config.emailVerificationFeature
    );

    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(recipeInstance, appInfo, config.signInAndUpFeature);

    let signOutFeature = validateAndNormaliseSignOutConfig(recipeInstance, appInfo, config.signOutFeature);

    return {
        emailVerificationFeature,
        signOutFeature,
        signInAndUpFeature,
    };
}

function validateAndNormaliseSignInAndUpConfig(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInputSignInAndUp
): TypeNormalisedInputSignInAndUp {
    let disableDefaultImplementation =
        config.disableDefaultImplementation === undefined ? false : config.disableDefaultImplementation;

    let handlePostSignUpIn =
        config.handlePostSignUpIn === undefined ? defaultHandlePostSignUpIn : config.handlePostSignUpIn;

    let providers = config.providers;

    if (providers === undefined || providers.length === 0) {
        throw new STError(
            {
                type: "BAD_INPUT_ERROR",
                message:
                    "thirdparty recipe requires atleast 1 provider to be passed in signInAndUpFeature.providers config",
            },
            recipeInstance.getRecipeId()
        );
    }
    return {
        disableDefaultImplementation,
        handlePostSignUpIn,
        providers,
    };
}

function validateAndNormaliseSignOutConfig(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInputSignOutFeature
): TypeNormalisedInputSignOutFeature {
    let disableDefaultImplementation =
        config === undefined || config.disableDefaultImplementation === undefined
            ? false
            : config.disableDefaultImplementation;

    return {
        disableDefaultImplementation,
    };
}

function validateAndNormaliseEmailVerificationConfig(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInputEmailVerificationFeature
): TypeNormalisedInputEmailVerification {
    return config === undefined
        ? {
              getEmailForUserId: recipeInstance.getEmailForUserId,
          }
        : {
              disableDefaultImplementation: config.disableDefaultImplementation,
              getEmailForUserId: recipeInstance.getEmailForUserId,
              createAndSendCustomEmail:
                  config.createAndSendCustomEmail === undefined
                      ? undefined
                      : async (user, link) => {
                            let userInfo = await recipeInstance.getUserById(user.id);
                            if (userInfo === undefined || config.createAndSendCustomEmail === undefined) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance.getRecipeId()
                                );
                            }
                            return await config.createAndSendCustomEmail(userInfo, link);
                        },
              getEmailVerificationURL:
                  config.getEmailVerificationURL === undefined
                      ? undefined
                      : async (user) => {
                            let userInfo = await recipeInstance.getUserById(user.id);
                            if (userInfo === undefined || config.getEmailVerificationURL === undefined) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance.getRecipeId()
                                );
                            }
                            return await config.getEmailVerificationURL(userInfo);
                        },
              handlePostEmailVerification:
                  config.handlePostEmailVerification === undefined
                      ? undefined
                      : async (user) => {
                            let userInfo = await recipeInstance.getUserById(user.id);
                            if (userInfo === undefined || config.handlePostEmailVerification === undefined) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance.getRecipeId()
                                );
                            }
                            return await config.handlePostEmailVerification(userInfo);
                        },
          };
}

export function getRedirectionURI(recipeInstance: Recipe, providerId: string) {
    // TODO: might change when we support multi-tenancy
    let websiteDomain = recipeInstance.getAppInfo().websiteDomain.getAsStringDangerous();
    let websiteBasePath = recipeInstance.getAppInfo().websiteBasePath.getAsStringDangerous();
    // adding trailing backslash to counter issue with facebook redirect_uri as suggested in stackoverflow post:
    // https://stackoverflow.com/questions/4386691/facebook-error-error-validating-verification-code
    return `${websiteDomain}${websiteBasePath}/callback/${providerId}/`;
}
