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

import { ThirdPartyRecipeModule, TypeInput } from "./types";
import Recipe from "./recipe";
import { TypeNormalisedInput } from "./types";
import { DEV_KEY_IDENTIFIER } from "../thirdparty/api/implementation";

export function validateAndNormaliseUserInput(_: Recipe, config: TypeInput): TypeNormalisedInput {
    return {
        apiKey: config.apiKey,
        hosts: config.hosts,
        recipeModules: config.recipeModules,
    };
}

export async function isUsingDevelopmentClientId(recipeModules: ThirdPartyRecipeModule[]): Promise<boolean> {
    let isUsingDevelopmentClientId = false;

    for await (const recipeModule of recipeModules) {
        if (recipeModule.getRecipeId() === "thirdparty" || recipeModule.getRecipeId() === "thirdpartyemailpassword") {
            if (recipeModule.getClientIds) {
                let clientIds = await recipeModule.getClientIds();
                clientIds.forEach((clientId) => {
                    if (clientId.startsWith(DEV_KEY_IDENTIFIER)) {
                        isUsingDevelopmentClientId = true;
                    }
                });
            }
        }
    }
    return isUsingDevelopmentClientId;
}
