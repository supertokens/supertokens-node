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
import { getMFARelatedInfoFromSession } from "./utils";

export default class Wrapper {
    static init = Recipe.init;

    static MultiFactorAuthClaim = MultiFactorAuthClaim;

    static async assertAllowedToSetupFactorElseThrowInvalidClaimError(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: Record<string, any>
    ) {
        let ctx = getUserContext(userContext);
        const sessionUser = await getUser(session.getUserId(), ctx);
        if (!sessionUser) {
            throw new Error("Session user not found");
        }
        const factorsSetup = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
            user: sessionUser,
            userContext: ctx,
        });

        await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.assertAllowedToSetupFactorElseThrowInvalidClaimError(
            {
                session,
                factorId,
                mfaRequirementsForAuth: await this.getMFARequirementsForAuth(session, ctx),
                factorsSetUpForUser: factorsSetup,
                userContext: ctx,
            }
        );
    }

    static async getMFARequirementsForAuth(session: SessionContainerInterface, userContext?: Record<string, any>) {
        let ctx = getUserContext(userContext);

        const mfaInfo = await getMFARelatedInfoFromSession({
            session,
            assumeEmptyCompletedIfNotFound: false,
            userContext: ctx,
        });

        if (mfaInfo.status === "SESSION_USER_NOT_FOUND_ERROR") {
            throw new Error("Session user not found");
        } else if (mfaInfo.status === "MFA_CLAIM_VALUE_NOT_FOUND_ERROR") {
            throw new Error("MFA claim value not found");
        } else if (mfaInfo.status === "TENANT_NOT_FOUND_ERROR") {
            throw new Error("Tenant not found");
        }

        if (mfaInfo.status !== "OK") {
            throw new Error("should never come here");
        }

        return mfaInfo.mfaRequirementsForAuth;
    }

    static async markFactorAsCompleteInSession(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: Record<string, any>
    ) {
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.markFactorAsCompleteInSession({
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

export const FactorIds = {
    EMAILPASSWORD: "emailpassword",
    OTP_EMAIL: "otp-email",
    OTP_PHONE: "otp-phone",
    LINK_EMAIL: "link-email",
    LINK_PHONE: "link-phone",
    TOTP: "totp",
};

export { MultiFactorAuthClaim };
export type { RecipeInterface, APIOptions, APIInterface };
