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

import MfaRecipe from "./recipe";
import SuperTokensError from "./error";
import { SessionContainer } from "../session";
import STError from "./error";

export default class Wrapper {
    static init = MfaRecipe.init;

    static Error = SuperTokensError;

    static async completeFactorInSession(session: SessionContainer, factorId: string, userContext?: any) {
        return await MfaRecipe.getInstanceOrThrowError().recipeInterfaceImpl.completeFactorInSession({
            session,
            factorId,
            userContext: userContext ?? {},
        });
    }

    static async checkAllowedAsFirstFactor(tenantId: string, factorId: string, userContext?: any) {
        const allowedFirstFactors = await MfaRecipe.getInstanceOrThrowError().recipeInterfaceImpl.getFirstFactors({
            tenantId,
            userContext: userContext ?? {},
        });

        const isAllowed = allowedFirstFactors.indexOf(factorId) !== -1;

        if (!isAllowed) {
            throw new STError({
                type: "BAD_INPUT_ERROR",
                message:
                    "The provided factor is not allowed as a first factor. Please check your recipe configuration.",
            });
        }
    }
}

export let init = Wrapper.init;
export let Error = Wrapper.Error;

export let completeFactorInSession = Wrapper.completeFactorInSession;
export let checkAllowedAsFirstFactor = Wrapper.checkAllowedAsFirstFactor;
