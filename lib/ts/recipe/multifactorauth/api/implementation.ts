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

import Multitenancy from "../../multitenancy";
import { APIInterface } from "../";
import { MultiFactorAuthClaim } from "../multiFactorAuthClaim";
import { getUser } from "../../..";
import SessionError from "../../session/error";

export default function getAPIInterface(): APIInterface {
    return {
        resyncSessionAndFetchMFAInfoPUT: async ({ options, session, userContext }) => {
            const userId = session.getUserId();
            const tenantId = session.getTenantId();
            const user = await getUser(userId, userContext);

            if (user === undefined) {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            const tenantInfo = await Multitenancy.getTenant(tenantId, userContext);

            if (tenantInfo === undefined) {
                throw new Error("Tenant not found");
            }

            const factorsAlreadySetup = await options.recipeImplementation.getFactorsSetupForUser({
                user,
                userContext,
            });

            const { status: _, ...tenantConfig } = tenantInfo;

            const availableFactors = await options.recipeInstance.getAllAvailableFactorIds(tenantConfig);

            // session is active and a new user is going to be created, so we need to check if the factor setup is allowed
            const requiredSecondaryFactorsForUser = await options.recipeImplementation.getRequiredSecondaryFactorsForUser(
                {
                    userId,
                    userContext,
                }
            );
            const completedFactorsClaimValue = await session.getClaimValue(MultiFactorAuthClaim, userContext);
            const completedFactors = completedFactorsClaimValue?.c ?? {};
            const mfaRequirementsForAuth = await options.recipeImplementation.getMFARequirementsForAuth({
                user: user,
                accessTokenPayload: session.getAccessTokenPayload(),
                tenantId,
                factorsSetUpForUser: factorsAlreadySetup,
                requiredSecondaryFactorsForTenant: tenantInfo?.requiredSecondaryFactors ?? [],
                requiredSecondaryFactorsForUser,
                completedFactors: completedFactors,
                userContext,
            });

            const factorsAllowedToSetup: string[] = [];
            for (const id of availableFactors) {
                try {
                    await options.recipeImplementation.assertAllowedToSetupFactorElseThrowInvalidClaimError({
                        session,
                        factorId: id,
                        completedFactors: completedFactors,
                        requiredSecondaryFactorsForTenant: tenantInfo?.requiredSecondaryFactors ?? [],
                        requiredSecondaryFactorsForUser,
                        factorsSetUpForUser: factorsAlreadySetup,
                        mfaRequirementsForAuth,
                        userContext,
                    });
                    factorsAllowedToSetup.push(id);
                } catch (err) {
                    // ignore
                }
            }

            const nextSetOfUnsatisfiedFactors = MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
                completedFactors,
                mfaRequirementsForAuth
            );

            await session.setClaimValue(
                MultiFactorAuthClaim,
                {
                    c: completedFactors,
                    v: MultiFactorAuthClaim.isRequirementListSatisfied(completedFactors, mfaRequirementsForAuth),
                },
                userContext
            );

            let getEmailsForFactorsResult = options.recipeInstance.getEmailsForFactors(user, session.getRecipeUserId());
            let getPhoneNumbersForFactorsResult = options.recipeInstance.getPhoneNumbersForFactors(
                user,
                session.getRecipeUserId()
            );
            if (
                getEmailsForFactorsResult.status === "UNKNOWN_SESSION_RECIPE_USER_ID" ||
                getPhoneNumbersForFactorsResult.status === "UNKNOWN_SESSION_RECIPE_USER_ID"
            ) {
                throw new SessionError({
                    type: "UNAUTHORISED",
                    message: "User no longer associated with the session",
                    payload: {
                        clearTokens: true,
                    },
                });
            }

            return {
                status: "OK",
                factors: {
                    next: nextSetOfUnsatisfiedFactors.factorIds.filter(
                        (factorId) => factorsAllowedToSetup.includes(factorId) || factorsAlreadySetup.includes(factorId)
                    ),
                    alreadySetup: factorsAlreadySetup,
                    allowedToSetup: factorsAllowedToSetup,
                },
                emails: getEmailsForFactorsResult.factorIdToEmailsMap,
                phoneNumbers: getPhoneNumbersForFactorsResult.factorIdToPhoneNumberMap,
            };
        },
    };
}
