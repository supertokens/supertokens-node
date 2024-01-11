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
import { getUser } from "../..";
import { logDebugMessage } from "../../logger";
import { SessionClaimValidator } from "../session";

export default function getRecipeInterface(recipeInstance: MultiFactorAuthRecipe): RecipeInterface {
    return {
        getFactorsSetupForUser: async function ({ user, userContext }) {
            // factors setup for user are provided by each of the initialized recipes
            // each of the recipe checks if there is a matching recipe in the login
            // methods of the user specified and based on that returns the factor ids
            // in case of passwordless, the factor ids are based on the contact method
            // and flow configs and the relavant factor ids are returned
            // https://github.com/supertokens/supertokens-core/issues/554#issuecomment-1752852720

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
            // default requirements for Auth is the union of required factors for user and tenant
            // https://github.com/supertokens/supertokens-core/issues/554#issuecomment-1752852720
            const allFactors: Set<string> = new Set();
            for (const factor of requiredSecondaryFactorsForUser) {
                allFactors.add(factor);
            }
            for (const factor of requiredSecondaryFactorsForTenant) {
                allFactors.add(factor);
            }

            return [{ oneOf: [...allFactors] }];
        },

        assertAllowedToSetupFactorElseThrowInvalidClaimError: async function (
            this: RecipeInterface,
            { factorId, session, factorsSetUpForUser, mfaRequirementsForAuth, userContext }
        ) {
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

            const validator: SessionClaimValidator = {
                id: MultiFactorAuthClaim.key,
                claim: MultiFactorAuthClaim,
                shouldRefetch: () => false,
                validate: async (payload) => {
                    const claimVal = MultiFactorAuthClaim.getValueFromPayload(payload);
                    if (!claimVal) {
                        throw new Error("should never happen");
                    }

                    const setOfUnsatisfiedFactors = MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
                        claimVal.c,
                        mfaRequirementsForAuth
                    );

                    if (setOfUnsatisfiedFactors.factorIds.some((id) => factorsSetUpForUser.includes(id))) {
                        logDebugMessage(
                            `isAllowedToSetupFactor ${factorId}: false because there are items already set up in the next set of unsatisfied factors: ${setOfUnsatisfiedFactors.factorIds.join(
                                ", "
                            )}`
                        );
                        return {
                            isValid: false,
                            reason: "Does not satisfy MFA requirements",
                        };
                    }

                    logDebugMessage(
                        `isAllowedToSetupFactor ${factorId}: true because the next set of unsatisfied factors is ${
                            setOfUnsatisfiedFactors.factorIds.length === 0 ? "empty" : "cannot be completed otherwise"
                        }`
                    );
                    return { isValid: true };
                },
            };

            await session.assertClaims([validator], userContext);
        },

        markFactorAsCompleteInSession: async function (this: RecipeInterface, { session, factorId, userContext }) {
            const currentValue = await session.getClaimValue(MultiFactorAuthClaim);
            const completed = {
                ...currentValue?.c,
                [factorId]: Math.floor(Date.now() / 1000),
            };

            const user = await getUser(session.getUserId(), userContext);
            if (user === undefined) {
                throw new Error("User not found!");
            }

            await session.setClaimValue(MultiFactorAuthClaim, {
                c: completed,
                v: currentValue?.v == undefined ? false : currentValue.v,
            });
            session.fetchAndSetClaim(MultiFactorAuthClaim, userContext); // updates value for `v`
        },

        getRequiredSecondaryFactorsForUser: async function ({ userId, userContext }) {
            const userMetadataInstance = UserMetadataRecipe.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadataInternal({
                userId,
                userContext,
            });

            return metadata.metadata._supertokens?.requiredSecondaryFactors ?? [];
        },

        addToRequiredSecondaryFactorsForUser: async function ({ userId, factorId, userContext }) {
            const userMetadataInstance = UserMetadataRecipe.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadataInternal({
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
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadataInternal({
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
