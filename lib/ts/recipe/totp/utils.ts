/* Copyright (c) 2023, VRAI Labs and/or its affiliates. All rights reserved.
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
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";

export function validateAndNormaliseUserInput(_: Recipe, config: TypeInput): TypeNormalisedInput {
    if (config.issuer === undefined) {
        throw new Error("Please pass ther issuer name (app name to show in the authenticator app)");
    }

    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config.override,
    };

    return {
        issuer: config.issuer,
        defaultPeriod: config.defaultPeriod ?? 30,
        defaultSkew: config.defaultSkew ?? 1,
        allowUnverifiedDevices: config.allowUnverifiedDevice ?? false,
        override,
    };
}
