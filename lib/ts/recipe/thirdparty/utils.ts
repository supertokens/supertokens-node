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
    TypeNormalisedInputSignInAndUp,
    TypeInputSessionFeature,
    TypeNormalisedInputSessionFeature,
    RecipeInterface,
    APIInterface,
} from "./types";
import { RecipeImplementation, APIImplementation } from "./";

export function validateAndNormaliseUserInput(
    recipeInstance: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput {
    validateTheStructureOfUserInput(config, InputSchema, "thirdparty recipe");

    let sessionFeature = validateAndNormaliseSessionFeatureConfig(
        recipeInstance,
        appInfo,
        config === undefined ? undefined : config.sessionFeature
    );

    let emailVerificationFeature = validateAndNormaliseEmailVerificationConfig(recipeInstance, appInfo, config);

    let signInAndUpFeature = validateAndNormaliseSignInAndUpConfig(appInfo, config.signInAndUpFeature);

    let override: {
        functions: (originalImplementation: RecipeImplementation) => RecipeInterface;
        apis: (originalImplementation: APIImplementation) => APIInterface;
    } = {
        functions: (originalImplementation: RecipeImplementation) => originalImplementation,
        apis: (originalImplementation: APIImplementation) => originalImplementation,
    };

    if (config !== undefined && config.override !== undefined) {
        if (config.override.functions !== undefined) {
            override = {
                ...override,
                functions: config.override.functions,
            };
        }
        if (config.override.apis !== undefined) {
            override = {
                ...override,
                apis: config.override.apis,
            };
        }
    }

    return {
        sessionFeature,
        emailVerificationFeature,
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
        override: config?.override?.emailVerificationFeature,
        getEmailForUserId: recipeInstance.getEmailForUserId,
        createAndSendCustomEmail:
            config?.emailVerificationFeature?.createAndSendCustomEmail === undefined
                ? undefined
                : async (user, link) => {
                      let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                      if (
                          userInfo === undefined ||
                          config?.emailVerificationFeature?.createAndSendCustomEmail === undefined
                      ) {
                          throw new STError({
                              type: STError.UNKNOWN_USER_ID_ERROR,
                              message: "User ID unknown",
                          });
                      }
                      return await config.emailVerificationFeature.createAndSendCustomEmail(userInfo, link);
                  },
        getEmailVerificationURL:
            config?.emailVerificationFeature?.getEmailVerificationURL === undefined
                ? undefined
                : async (user) => {
                      let userInfo = await recipeInstance.recipeInterfaceImpl.getUserById(user.id);
                      if (
                          userInfo === undefined ||
                          config?.emailVerificationFeature?.getEmailVerificationURL === undefined
                      ) {
                          throw new STError({
                              type: STError.UNKNOWN_USER_ID_ERROR,
                              message: "User ID unknown",
                          });
                      }
                      return await config.emailVerificationFeature.getEmailVerificationURL(userInfo);
                  },
    };
}
