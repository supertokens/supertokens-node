"use strict";
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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const multiFactorAuthClaim_1 = require("../multiFactorAuthClaim");
const error_1 = __importDefault(require("../../session/error"));
const utils_1 = require("../utils");
function getAPIInterface() {
    return {
        resyncSessionAndFetchMFAInfoPUT: async ({ options, session, userContext }) => {
            await session.fetchAndSetClaim(multiFactorAuthClaim_1.MultiFactorAuthClaim, userContext); // ensure claim value is present
            const mfaInfo = await utils_1.getMFARelatedInfoFromSession({
                session,
                userContext,
            });
            if (mfaInfo.status === "TENANT_NOT_FOUND_ERROR") {
                throw new Error("Tenant not found");
            }
            const factorsAlreadySetup = mfaInfo.factorsSetUpForUser;
            const allAvailableSecondaryFactors = await options.recipeInstance.getAllAvailableSecondaryFactorIds(
                mfaInfo.tenantConfig
            );
            const factorsAllowedToSetup = [];
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
            const nextSetOfUnsatisfiedFactors = multiFactorAuthClaim_1.MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
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
                throw new error_1.default({
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
exports.default = getAPIInterface;
