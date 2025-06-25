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
exports.default = getAPIInterface;
const multiFactorAuthClaim_1 = require("../multiFactorAuthClaim");
const error_1 = __importDefault(require("../../session/error"));
const utils_1 = require("../utils");
const multitenancy_1 = __importDefault(require("../../multitenancy"));
const __1 = require("../../..");
function getAPIInterface() {
    return {
        resyncSessionAndFetchMFAInfoPUT: async ({ options, session, userContext }) => {
            const sessionUser = await (0, __1.getUser)(session.getUserId(), userContext);
            if (sessionUser === undefined) {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            const mfaInfo = await (0, utils_1.updateAndGetMFARelatedInfoInSession)({
                session,
                userContext,
            });
            const factorsSetUpForUser = await options.recipeImplementation.getFactorsSetupForUser({
                user: sessionUser,
                userContext,
            });
            const tenantInfo = await multitenancy_1.default.getTenant(session.getTenantId(userContext), userContext);
            if (tenantInfo === undefined) {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
                    message: "Tenant not found",
                });
            }
            const allAvailableSecondaryFactors = options.recipeInstance.getAllAvailableSecondaryFactorIds(tenantInfo);
            const factorsAllowedToSetup = [];
            for (const id of allAvailableSecondaryFactors) {
                try {
                    await options.recipeImplementation.assertAllowedToSetupFactorElseThrowInvalidClaimError({
                        session,
                        factorId: id,
                        get factorsSetUpForUser() {
                            return Promise.resolve(factorsSetUpForUser);
                        },
                        get mfaRequirementsForAuth() {
                            return Promise.resolve(mfaInfo.mfaRequirementsForAuth);
                        },
                        userContext,
                    });
                    factorsAllowedToSetup.push(id);
                } catch (err) {
                    if (!(error_1.default.isErrorFromSuperTokens(err) && err.type === error_1.default.INVALID_CLAIMS)) {
                        throw err;
                    }
                    // ignore claims error and not add to the list of factors allowed to be set up
                }
            }
            const nextSetOfUnsatisfiedFactors =
                multiFactorAuthClaim_1.MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
                    mfaInfo.completedFactors,
                    mfaInfo.mfaRequirementsForAuth
                );
            let getEmailsForFactorsResult = options.recipeInstance.getEmailsForFactors(
                sessionUser,
                session.getRecipeUserId(userContext)
            );
            let getPhoneNumbersForFactorsResult = options.recipeInstance.getPhoneNumbersForFactors(
                sessionUser,
                session.getRecipeUserId(userContext)
            );
            if (
                getEmailsForFactorsResult.status === "UNKNOWN_SESSION_RECIPE_USER_ID" ||
                getPhoneNumbersForFactorsResult.status === "UNKNOWN_SESSION_RECIPE_USER_ID"
            ) {
                throw new error_1.default({
                    type: "UNAUTHORISED",
                    message: "User no longer associated with the session",
                });
            }
            // next array is filtered to only include factors that are allowed to be setup or are already setup
            // we do this because the factor chooser in the frontend will be based on the next array only
            // we do not simply filter out the factors that are not allowed to be setup because in the case
            // where user has already setup a factor and not completed it, none of the factors will be allowed to
            // be setup, and that that will result in an empty next array. However, we want to show the factor
            // that the user has already setup in that case.
            const next = nextSetOfUnsatisfiedFactors.factorIds.filter(
                (factorId) => factorsAllowedToSetup.includes(factorId) || factorsSetUpForUser.includes(factorId)
            );
            if (next.length === 0 && nextSetOfUnsatisfiedFactors.factorIds.length !== 0) {
                throw new Error(
                    `The user is required to complete secondary factors they are not allowed to (${nextSetOfUnsatisfiedFactors.factorIds.join(
                        ", "
                    )}), likely because of configuration issues.`
                );
            }
            return {
                status: "OK",
                factors: {
                    next,
                    alreadySetup: factorsSetUpForUser,
                    allowedToSetup: factorsAllowedToSetup,
                },
                emails: getEmailsForFactorsResult.factorIdToEmailsMap,
                phoneNumbers: getPhoneNumbersForFactorsResult.factorIdToPhoneNumberMap,
            };
        },
    };
}
