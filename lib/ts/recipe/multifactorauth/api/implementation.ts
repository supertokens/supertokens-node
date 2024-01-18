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

import { APIInterface } from "../";
import { MultiFactorAuthClaim } from "../multiFactorAuthClaim";
import SessionError from "../../session/error";
import { getMFARelatedInfoFromSession } from "../utils";

export default function getAPIInterface(): APIInterface {
    return {
        resyncSessionAndFetchMFAInfoPUT: async ({ options, session, userContext }) => {
            await session.fetchAndSetClaim(MultiFactorAuthClaim, userContext); // ensure claim value is present

            const mfaInfo = await getMFARelatedInfoFromSession({
                session,
                assumeEmptyCompletedIfNotFound: false,
                userContext,
            });

            if (mfaInfo.status === "OK") {
                const factorsAlreadySetup = await options.recipeImplementation.getFactorsSetupForUser({
                    user: mfaInfo.sessionUser,
                    userContext,
                });
                const allAvailableSecondaryFactors = await options.recipeInstance.getAllAvailableSecondaryFactorIds(
                    mfaInfo.tenantConfig
                );

                const factorsAllowedToSetup: string[] = [];
                for (const id of allAvailableSecondaryFactors) {
                    try {
                        await options.recipeImplementation.assertAllowedToSetupFactorElseThrowInvalidClaimError({
                            session,
                            factorId: id,
                            factorsSetUpForUser: factorsAlreadySetup,
                            mfaRequirementsForAuth: mfaInfo.mfaRequirementsForAuth,
                            userContext,
                        });
                        factorsAllowedToSetup.push(id);
                    } catch (err) {
                        // ignore
                    }
                }

                const nextSetOfUnsatisfiedFactors = MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
                    mfaInfo.completedFactors,
                    mfaInfo.mfaRequirementsForAuth
                );

                let getEmailsForFactorsResult = options.recipeInstance.getEmailsForFactors(
                    mfaInfo.sessionUser,
                    session.getRecipeUserId()
                );
                let getPhoneNumbersForFactorsResult = options.recipeInstance.getPhoneNumbersForFactors(
                    mfaInfo.sessionUser,
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
                            (factorId) =>
                                factorsAllowedToSetup.includes(factorId) || factorsAlreadySetup.includes(factorId)
                        ),
                        alreadySetup: factorsAlreadySetup,
                        allowedToSetup: factorsAllowedToSetup,
                    },
                    emails: getEmailsForFactorsResult.factorIdToEmailsMap,
                    phoneNumbers: getPhoneNumbersForFactorsResult.factorIdToPhoneNumberMap,
                };
            } else if (mfaInfo.status === "SESSION_USER_NOT_FOUND_ERROR") {
                throw new SessionError({
                    type: SessionError.UNAUTHORISED,
                    message: "Session user not found",
                });
            } else if (mfaInfo.status === "TENANT_NOT_FOUND_ERROR") {
                throw new Error("Tenant not found");
            } else if (mfaInfo.status === "MFA_CLAIM_VALUE_NOT_FOUND_ERROR") {
                throw new Error("should never come here");
            } else {
                throw new Error("should never come here");
            }
        },
    };
}
