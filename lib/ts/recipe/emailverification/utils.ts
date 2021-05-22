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

import Recipe from "./recipe";
import { TypeInput, TypeNormalisedInput, User, RecipeInterface, APIInterface } from "./types";
import { NormalisedAppinfo } from "../../types";
import {
    getEmailVerificationURL as defaultGetEmailVerificationURL,
    createAndSendCustomEmail as defaultCreateAndSendCustomVerificationEmail,
} from "./emailVerificationFunctions";
import { RecipeImplementation, APIImplementation } from "./";

export function validateAndNormaliseUserInput(
    _: Recipe,
    appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput {
    let disableDefaultImplementation =
        config.disableDefaultImplementation === undefined ? false : config.disableDefaultImplementation;

    let getEmailVerificationURL =
        config.getEmailVerificationURL === undefined
            ? defaultGetEmailVerificationURL(appInfo)
            : config.getEmailVerificationURL;

    let createAndSendCustomEmail =
        config.createAndSendCustomEmail === undefined
            ? defaultCreateAndSendCustomVerificationEmail(appInfo)
            : config.createAndSendCustomEmail;

    let handlePostEmailVerification =
        config.handlePostEmailVerification === undefined ? async (_: User) => {} : config.handlePostEmailVerification;

    let getEmailForUserId = config.getEmailForUserId;

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
        getEmailForUserId,
        disableDefaultImplementation,
        getEmailVerificationURL,
        createAndSendCustomEmail,
        handlePostEmailVerification,
        override,
    };
}
