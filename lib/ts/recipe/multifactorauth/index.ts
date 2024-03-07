/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
import { getUser } from "../..";
import { getUserContext } from "../../utils";
import { updateAndGetMFARelatedInfoInSession } from "./utils";
import { FactorIds } from "./types";

export default class Wrapper {
    static init = Recipe.init;

    static MultiFactorAuthClaim = MultiFactorAuthClaim;
    static FactorIds = FactorIds;

    static async assertAllowedToSetupFactorElseThrowInvalidClaimError(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: Record<string, any>
    ) {
        let ctx = getUserContext(userContext);

        const mfaInfo = await updateAndGetMFARelatedInfoInSession({
            session,
            userContext: ctx,
        });
        const factorsSetUpForUser = await Wrapper.getFactorsSetupForUser(session.getUserId(), ctx);
        await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.assertAllowedToSetupFactorElseThrowInvalidClaimError(
            {
                session,
                factorId,
                get factorsSetUpForUser() {
                    return Promise.resolve(factorsSetUpForUser);
                },
                get mfaRequirementsForAuth() {
                    return Promise.resolve(mfaInfo.mfaRequirementsForAuth);
                },
                userContext: ctx,
            }
        );
    }

    static async getMFARequirementsForAuth(session: SessionContainerInterface, userContext?: Record<string, any>) {
        let ctx = getUserContext(userContext);

        const mfaInfo = await updateAndGetMFARelatedInfoInSession({
            session,
            userContext: ctx,
        });

        return mfaInfo.mfaRequirementsForAuth;
    }

    static async markFactorAsCompleteInSession(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: Record<string, any>
    ) {
        await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.markFactorAsCompleteInSession({
            session,
            factorId,
            userContext: getUserContext(userContext),
        });
    }

    static async getFactorsSetupForUser(userId: string, userContext?: Record<string, any>) {
        const ctx = getUserContext(userContext);
        const user = await getUser(userId, ctx);
        if (!user) {
            throw new Error("Unknown user id");
        }

        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
            user,
            userContext: ctx,
        });
    }

    static async getRequiredSecondaryFactorsForUser(userId: string, userContext?: Record<string, any>) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
            userId,
            userContext: getUserContext(userContext),
        });
    }

    static async addToRequiredSecondaryFactorsForUser(
        userId: string,
        factorId: string,
        userContext?: Record<string, any>
    ) {
        await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.addToRequiredSecondaryFactorsForUser({
            userId,
            factorId,
            userContext: getUserContext(userContext),
        });
    }

    static async removeFromRequiredSecondaryFactorsForUser(
        userId: string,
        factorId: string,
        userContext?: Record<string, any>
    ) {
        await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.removeFromRequiredSecondaryFactorsForUser({
            userId,
            factorId,
            userContext: getUserContext(userContext),
        });
    }
}

export let init = Wrapper.init;

export let assertAllowedToSetupFactorElseThrowInvalidClaimError =
    Wrapper.assertAllowedToSetupFactorElseThrowInvalidClaimError;
export let markFactorAsCompleteInSession = Wrapper.markFactorAsCompleteInSession;
export let getFactorsSetupForUser = Wrapper.getFactorsSetupForUser;
export let getRequiredSecondaryFactorsForUser = Wrapper.getRequiredSecondaryFactorsForUser;
export const addToRequiredSecondaryFactorsForUser = Wrapper.addToRequiredSecondaryFactorsForUser;
export const removeFromRequiredSecondaryFactorsForUser = Wrapper.removeFromRequiredSecondaryFactorsForUser;

export { MultiFactorAuthClaim };
export { FactorIds };
export type { RecipeInterface, APIOptions, APIInterface };
