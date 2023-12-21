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
import Multitenancy from "../multitenancy";
import { getUser } from "../..";
import UserMetadataRecipe from "../usermetadata/recipe";
import { getUserContext } from "../../utils";

export default class Wrapper {
    static init = Recipe.init;

    static MultiFactorAuthClaim = MultiFactorAuthClaim;

    static async isAllowedToSetupFactor(
        session: SessionContainerInterface,
        factorId: string,
        userContext?: Record<string, any>
    ) {
        let ctx = getUserContext(userContext);
        const user = await getUser(session.getUserId(), ctx);
        if (!user) {
            throw new Error("UKNKNOWN_USER_ID");
        }
        const factorsSetup = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
            user,
            tenantId: session.getTenantId(),
            userContext: ctx,
        });
        const mfaClaimValue = await session.getClaimValue(MultiFactorAuthClaim, ctx);
        const completedFactors = mfaClaimValue?.c ?? {};
        const defaultMFARequirementsForUser = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getRequiredSecondaryFactorsForUser(
            {
                user,
                userContext: ctx,
            }
        );

        const tenantInfo = await Multitenancy.getTenant(session.getTenantId(), userContext);
        const defaultMFARequirementsForTenant: string[] = tenantInfo?.requiredSecondaryFactors ?? [];
        const requirements = await Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getMFARequirementsForAuth({
            user,
            accessTokenPayload: session.getAccessTokenPayload(),
            tenantId: session.getTenantId(),
            factorsSetUpForUser: factorsSetup,
            requiredSecondaryFactorsForUser: defaultMFARequirementsForUser,
            requiredSecondaryFactorsForTenant: defaultMFARequirementsForTenant,
            completedFactors,
            userContext: ctx,
        });
        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.isAllowedToSetupFactor({
            session,
            factorId,
            completedFactors,
            mfaRequirementsForAuth: requirements,
            factorsSetUpForUser: factorsSetup,
            requiredSecondaryFactorsForUser: defaultMFARequirementsForUser,
            requiredSecondaryFactorsForTenant: defaultMFARequirementsForTenant,
            userContext: ctx,
        });
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

    static async getFactorsSetupForUser(tenantId: string, userId: string, userContext?: Record<string, any>) {
        const ctx = getUserContext(userContext);
        const user = await getUser(userId, ctx);
        if (!user) {
            throw new Error("UKNKNOWN_USER_ID");
        }

        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
            tenantId,
            user,
            userContext: ctx,
        });
    }

    static async getRequiredSecondaryFactorsForUser(userId: string, userContext?: Record<string, any>) {
        const ctx = getUserContext(userContext);
        const user = await getUser(userId, ctx);
        if (!user) {
            throw new Error("UKNKNOWN_USER_ID");
        }

        return Recipe.getInstanceOrThrowError().recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
            user,
            userContext: ctx,
        });
    }

    static async addToRequiredSecondaryFactorsForUser(
        userId: string,
        factorId: string,
        userContext?: Record<string, any>
    ) {
        const ctx = getUserContext(userContext);
        const userMetadataInstance = UserMetadataRecipe.getInstanceOrThrowError();
        const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
            userId,
            userContext: ctx,
        });

        const factorIds = metadata.metadata._supertokens?.requiredSecondaryFactors ?? [];
        if (factorIds.includes(factorId)) {
            return;
        }

        factorIds.push(factorId);

        const metadataUpdate = {
            ...metadata.metadata,
            _supertokens: {
                ...metadata.metadata._supertokens,
                requiredSecondaryFactors: factorIds,
            },
        };

        await userMetadataInstance.recipeInterfaceImpl.updateUserMetadataInternal({
            userId: userId,
            metadataUpdate,
            userContext: ctx,
        });
    }

    static async removeFromRequiredSecondaryFactorsForUser(
        userId: string,
        factorId: string,
        userContext?: Record<string, any>
    ) {
        const ctx = getUserContext(userContext);
        const userMetadataInstance = UserMetadataRecipe.getInstanceOrThrowError();
        const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
            userId,
            userContext: ctx,
        });

        if (metadata.metadata._supertokens?.requiredSecondaryFactors === undefined) {
            return;
        }

        const factorIds = metadata.metadata._supertokens.requiredSecondaryFactors ?? [];
        if (!factorIds.includes(factorId)) {
            return;
        }

        const index = factorIds.indexOf(factorId);
        factorIds.splice(index, 1);

        const metadataUpdate = {
            ...metadata.metadata,
            _supertokens: {
                ...metadata.metadata._supertokens,
                requiredSecondaryFactorsForUser: factorIds,
            },
        };

        await userMetadataInstance.recipeInterfaceImpl.updateUserMetadataInternal({
            userId: userId,
            metadataUpdate,
            userContext: ctx,
        });
    }
}

export let init = Wrapper.init;

export let isAllowedToSetupFactor = Wrapper.isAllowedToSetupFactor;
export let markFactorAsCompleteInSession = Wrapper.markFactorAsCompleteInSession;
export let getFactorsSetupForUser = Wrapper.getFactorsSetupForUser;
export let getRequiredSecondaryFactorsForUser = Wrapper.getRequiredSecondaryFactorsForUser;
export const addToRequiredSecondaryFactorsForUser = Wrapper.addToRequiredSecondaryFactorsForUser;
export const removeFromRequiredSecondaryFactorsForUser = Wrapper.removeFromRequiredSecondaryFactorsForUser;

export const FACTORS = {
    EMAILPASSWORD: "emailpassword",
    OTP_EMAIL: "otp-email",
    OTP_PHONE: "otp-phone",
    LINK_EMAIL: "link-email",
    LINK_PHONE: "link-phone",
    THIRDPARTY: "thirdparty",
    TOTP: "totp",
};

export { MultiFactorAuthClaim };
export type { RecipeInterface, APIOptions, APIInterface };
