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
                userContext,
            });

            const factorsAlreadySetup = mfaInfo.factorsSetUpForUser;
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
                    if (!(err instanceof SessionError && err.type === SessionError.INVALID_CLAIMS)) {
                        throw err;
                    }

                    // ignore claims error and not add to the list of factors allowed to be set up
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
                    // next array is filtered to only include factors that are allowed to be setup or are already setup
                    // we do this because the factor chooser in the frontend will be based on the next array only
                    // we do not simply filter out the factors that are not allowed to be setup because in the case
                    // where user has already setup a factor and not completed it, none of the factors will be allowed to
                    // be setup, and that that will result in an empty next array. However, we want to show the factor
                    // that the user has already setup in that case.
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
