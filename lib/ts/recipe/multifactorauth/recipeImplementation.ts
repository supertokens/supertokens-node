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

import { RecipeInterface } from "./";
import UserMetadataRecipe from "../usermetadata/recipe";
import { MultiFactorAuthClaim } from "./multiFactorAuthClaim";
import type MultiFactorAuthRecipe from "./recipe";
import Multitenancy from "../multitenancy";
import { getUser } from "../..";
import { logDebugMessage } from "../../logger";

export default function getRecipeInterface(recipeInstance: MultiFactorAuthRecipe): RecipeInterface {
    return {
        getFactorsSetupForUser: async function ({ user, userContext }) {
            let factorIds: string[] = [];

            for (const func of recipeInstance.getFactorsSetupForUserFromOtherRecipesFuncs) {
                let result = await func(user, userContext);
                if (result !== undefined) {
                    for (const factorId of result) {
                        if (!factorIds.includes(factorId)) {
                            factorIds.push(factorId);
                        }
                    }
                }
            }
            return factorIds;
        },

        getMFARequirementsForAuth: async function ({
            requiredSecondaryFactorsForUser,
            requiredSecondaryFactorsForTenant,
        }) {
            const allFactors: Set<string> = new Set();
            for (const factor of requiredSecondaryFactorsForUser) {
                allFactors.add(factor);
            }
            for (const factor of requiredSecondaryFactorsForTenant) {
                allFactors.add(factor);
            }

            return [{ oneOf: [...allFactors] }];
        },

        isAllowedToSetupFactor: async function (
            this: RecipeInterface,
            { factorId, session, factorsSetUpForUser, userContext }
        ) {
            const claimVal = await session.getClaimValue(MultiFactorAuthClaim, userContext);
            if (!claimVal) {
                throw new Error("should never happen");
            }

            // // This solution: checks for 2FA (we'd allow factor setup if the user has set up only 1 factor group or completed at least 2)
            // const factorGroups = [
            //     ["otp-phone", "link-phone"],
            //     ["otp-email", "link-email"],
            //     ["emailpassword"],
            //     ["thirdparty"],
            // ];
            // const setUpGroups = Array.from(
            //     new Set(factorsSetUpForUser.map((id) => factorGroups.find((f) => f.includes(id)) || [id]))
            // );

            // const completedGroups = setUpGroups.filter((group) => group.some((id) => claimVal.c[id] !== undefined));

            // // If the user completed every factor they could
            // if (setUpGroups.length === completedGroups.length) {
            //     logDebugMessage(
            //         `isAllowedToSetupFactor ${factorId}: true because the user completed all factors they have set up and this is required`
            //     );
            //     return true;
            // }

            // return completedGroups.length >= 2;

            if (claimVal.n.some((id) => factorsSetUpForUser.includes(id))) {
                logDebugMessage(
                    `isAllowedToSetupFactor ${factorId}: false because there are items already set up in the next array: ${claimVal.n.join(
                        ", "
                    )}`
                );
                return {
                    isAllowed: false,
                    reason:
                        "Factor setup was disallowed due to security reasons. Please contact support. (ERR_CODE_013)",
                };
            }
            logDebugMessage(
                `isAllowedToSetupFactor ${factorId}: true because the next array is ${
                    claimVal.n.length === 0 ? "empty" : "cannot be completed otherwise"
                }`
            );
            return { isAllowed: true };
        },

        markFactorAsCompleteInSession: async function (this: RecipeInterface, { session, factorId, userContext }) {
            const currentValue = await session.getClaimValue(MultiFactorAuthClaim);
            const completed = {
                ...currentValue?.c,
                [factorId]: Math.floor(Date.now() / 1000),
            };
            const tenantId = session.getTenantId();
            const user = await getUser(session.getUserId(), userContext);
            if (user === undefined) {
                throw new Error("User not found!");
            }

            const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);

            const requiredSecondaryFactorsForUser = await this.getRequiredSecondaryFactorsForUser({
                userId: user.id,
                userContext,
            });
            const factorsSetUpForUser = await this.getFactorsSetupForUser({
                user: user,
                userContext,
            });
            const mfaRequirementsForAuth = await this.getMFARequirementsForAuth({
                user,
                accessTokenPayload: session.getAccessTokenPayload(),
                tenantId,
                factorsSetUpForUser,
                requiredSecondaryFactorsForTenant: tenantInfo?.requiredSecondaryFactors ?? [],
                requiredSecondaryFactorsForUser,
                completedFactors: completed,
                userContext,
            });
            const next = MultiFactorAuthClaim.buildNextArray(completed, mfaRequirementsForAuth);
            await session.setClaimValue(MultiFactorAuthClaim, {
                c: completed,
                n: next,
            });
        },

        getRequiredSecondaryFactorsForUser: async function ({ userId, userContext }) {
            const userMetadataInstance = UserMetadataRecipe.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId,
                userContext,
            });

            return metadata.metadata._supertokens?.requiredSecondaryFactors ?? [];
        },

        addToRequiredSecondaryFactorsForUser: async function ({ userId, factorId, userContext }) {
            const userMetadataInstance = UserMetadataRecipe.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId,
                userContext,
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
                userContext,
            });
        },

        removeFromRequiredSecondaryFactorsForUser: async function ({ userId, factorId, userContext }) {
            const userMetadataInstance = UserMetadataRecipe.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId,
                userContext,
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
                userContext,
            });
        },
    };
}
