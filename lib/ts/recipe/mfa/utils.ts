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

import { NormalisedAppinfo } from "../../types";
import MfaRecipe from "./recipe";
import STError from "./error";
import { APIInterface, RecipeInterface, TypeInput, TypeNormalisedInput } from "./types";

export function validateAndNormaliseUserInput(
    _: MfaRecipe,
    _appInfo: NormalisedAppinfo,
    config: TypeInput
): TypeNormalisedInput {
    let override = {
        functions: (originalImplementation: RecipeInterface) => originalImplementation,
        apis: (originalImplementation: APIInterface) => originalImplementation,
        ...config.override,
    };

    return {
        ...config,
        override,
    };
}

export async function checkAllowedAsFirstFactor(tenantId: string, factorId: string, userContext?: any) {
    const allowedFirstFactors = await MfaRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getFirstFactors({
        tenantId,
        userContext: userContext ?? {},
    });

    const isAllowed = allowedFirstFactors.indexOf(factorId) !== -1;

    if (!isAllowed) {
        throw new STError({
            type: STError.BAD_INPUT_ERROR,
            message: "The provided factor is not allowed as a first factor. Please check your recipe configuration.",
        });
    }
}
