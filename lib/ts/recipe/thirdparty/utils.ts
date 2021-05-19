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
    TypeInputSessionFeature,
    TypeNormalisedInputSessionFeature,
    RecipeInterface,
} from "./types";

async function defaultHandlePostSignUpIn(_: User, __: any, ___: boolean) {}

export function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput {
    validateTheStructureOfUserInput(config, InputSchema, "thirdparty recipe", recipeInstance);

    let sessionFeature = validateAndNormaliseSessionFeatureConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.sessionFeature
    );

    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(
        recipeInstance,
        appInfo,
        config.emailVerificationFeature
    );

    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(recipeInstance, appInfo, config.signInAndUpFeature);

    let signOutFeature = validateAndNormaliseSignOutConfig(recipeInstance, appInfo, config.signOutFeature);

    let override: {
        functions: (originalImplementation: RecipeInterface) => RecipeInterface;
    };

    if (config !== undefined && config.override !== undefined && config.override.functions !== undefined) {
        override = {
            functions: config.override.functions,
        };
    } else {
        override = {
            functions: (originalImplementation: RecipeInterface) => originalImplementation,
        };
    }

    return {
        sessionFeature,
        emailVerificationFeature,
        signOutFeature,
        signInAndUpFeature,
        override,
    };
}

async function defaultSetSessionDataForSession(_: User, __: any, ___: "signin" | "signup") {
    return {};
}

async function defaultSetJwtPayloadForSession(_: User, __: any, ___: "signin" | "signup") {
    return {};
}

function validateAndNormaliseSessionFeatureConfig(
    _: Recipe,
    __: NormalisedAppinfo,
    config?: TypeInputSessionFeature
): TypeNormalisedInputSessionFeature {
    let setJwtPayload =
        config === undefined || config.setJwtPayload === undefined
            ? defaultSetJwtPayloadForSession
            : config.setJwtPayload;

    let setSessionData =
        config === undefined || config.setSessionData === undefined
            ? defaultSetSessionDataForSession
            : config.setSessionData;

    return {
        setJwtPayload,
        setSessionData,
    };
}

function validateAndNormaliseSignInAndUpConfig(
    recipeInstance: Recipe,
    _: NormalisedAppinfo,
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
            recipeInstance
        );
    }
    return {
        disableDefaultImplementation,
        handlePostSignUpIn,
        providers,
    };
}

function validateAndNormaliseSignOutConfig(
    _: Recipe,
    __: NormalisedAppinfo,
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
    _: NormalisedAppinfo,
    config?: TypeInputEmailVerificationFeature
): TypeNormalisedInputEmailVerification {
    return config === undefined
        ? {
              getEmailForUserId: recipeInstance.getEmailForUserId,
          }
        : {
              disableDefaultImplementation: config.disableDefaultImplementation,
              override: config.override,
              getEmailForUserId: recipeInstance.getEmailForUserId,
              createAndSendCustomEmail:
                  config.createAndSendCustomEmail === undefined
                      ? undefined
                      : async (user, link) => {
                            let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                            if (userInfo === undefined || config.createAndSendCustomEmail === undefined) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance
                                );
                            }
                            return await config.createAndSendCustomEmail(userInfo, link);
                        },
              getEmailVerificationURL:
                  config.getEmailVerificationURL === undefined
                      ? undefined
                      : async (user) => {
                            let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                            if (userInfo === undefined || config.getEmailVerificationURL === undefined) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance
                                );
                            }
                            return await config.getEmailVerificationURL(userInfo);
                        },
              handlePostEmailVerification:
                  config.handlePostEmailVerification === undefined
                      ? undefined
                      : async (user) => {
                            let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                            if (userInfo === undefined || config.handlePostEmailVerification === undefined) {
                                throw new STError(
                                    {
                                        type: STError.UNKNOWN_USER_ID_ERROR,
                                        message: "User ID unknown",
                                    },
                                    recipeInstance
                                );
                            }
                            return await config.handlePostEmailVerification(userInfo);
                        },
          };
}
