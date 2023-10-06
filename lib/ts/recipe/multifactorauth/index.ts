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
import { RecipeInterface, APIOptions, APIInterface } from "./types";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import { SessionContainerInterface } from "../session/types";

export default class Wrapper {
    static init = Recipe.init;

    static MultiFactorAuthClaim = MultiFactorAuthClaim;

    static async getFactorsSetUpByUser(tenantId: string, userId: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
            userId,
            tenantId,
            userContext,
        });
    }

    static async isAllowedToSetupFactor(session: SessionContainerInterface, factorId: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.isAllowedToSetupFactor({
            factorId,
            session,
            userContext,
        });
    }

    static async completeFactorInSession(session: SessionContainerInterface, factor: string, userContext?: any) {
        return Recipe.getInstanceOrThrowError().completeFactorInSession({
            session,
            factor,
            userContext: userContext ?? {},
        });
    }
}

export let init = Wrapper.init;

export let completeFactorInSession = Wrapper.completeFactorInSession;

export { MultiFactorAuthClaim };
export type { RecipeInterface, APIOptions, APIInterface };
