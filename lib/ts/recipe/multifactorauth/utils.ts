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

import { TypeInput, TypeNormalisedInput, RecipeInterface, APIInterface } from "./types";

export function validateAndNormaliseUserInput(config?: TypeInput): TypeNormalisedInput {
    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config?.override,
    };

    return {
        firstFactors: config?.firstFactors,
        getMFARequirementsForFactorSetup:
            config?.getMFARequirementsForFactorSetup ??
            (() => {
                // TODO: the default should be 2FA if any secondary factors are set up, otherwise we only require the first factor to be completed
                return [];
            }),
        getGlobalMFARequirements:
            config?.getGlobalMFARequirements ??
            (() => {
                // TODO: the default should be 2FA (so any 2 factors)
                return [];
            }),
        override,
    };
}
