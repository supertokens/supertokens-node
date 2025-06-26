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
exports.default = getRecipeInterface;
const usermetadata_1 = __importDefault(require("../usermetadata"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
const logger_1 = require("../../logger");
const utils_1 = require("./utils");
function getRecipeInterface(recipeInstance) {
    return {
        getFactorsSetupForUser: async function ({ user, userContext }) {
            // factors setup for user are provided by each of the initialized recipes
            // each of the recipe checks if there is a matching recipe in the login
            // methods of the user specified and based on that returns the factor ids
            // in case of passwordless, the factor ids are based on the contact method
            // and flow configs and the relavant factor ids are returned
            // https://github.com/supertokens/supertokens-core/issues/554#issuecomment-1752852720
            let factorIds = [];
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
            const allFactors = new Set();
            for (const factor of await requiredSecondaryFactorsForUser) {
                allFactors.add(factor);
            }
            for (const factor of await requiredSecondaryFactorsForTenant) {
                allFactors.add(factor);
            }
            return [{ oneOf: [...allFactors] }];
        },
        assertAllowedToSetupFactorElseThrowInvalidClaimError: async function (input) {
            // We allow the user to set up a factor when:
            // 1. MFA requirements is completed by the user (when there are no unsatisfied factors)
            // 2. The factor is unsatisfied and the user has not set up any factors in the set of unsatisfied factors
            // If the user has a factor in the set of unsatisfied factors, that is already setup for the user, we would
            // disallow any new factor setup until the user has completed it.
            // So the next set of unsatisfied factors must be either empty or should only contain factors that are not
            // setup for the user.
            // We allow when the next set of unsatisfied factors only contains factors that are not setup for the user
            // because the user will not be able to complete the MFA requirements for auth otherwise.
            const validator = {
                id: multiFactorAuthClaim_1.MultiFactorAuthClaim.key,
                claim: multiFactorAuthClaim_1.MultiFactorAuthClaim,
                shouldRefetch: (payload) => {
                    const value = multiFactorAuthClaim_1.MultiFactorAuthClaim.getValueFromPayload(payload);
                    return value === undefined;
                },
                validate: async (payload) => {
                    const claimVal = multiFactorAuthClaim_1.MultiFactorAuthClaim.getValueFromPayload(payload);
                    if (!claimVal) {
                        throw new Error("should never happen");
                    }
                    if (claimVal.v) {
                        (0, logger_1.logDebugMessage)(
                            `assertAllowedToSetupFactorElseThrowInvalidClaimError ${input.factorId}: true because the session already satisfied auth reqs`
                        );
                        return { isValid: true };
                    }
                    const setOfUnsatisfiedFactors =
                        multiFactorAuthClaim_1.MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
                            claimVal.c,
                            await input.mfaRequirementsForAuth
                        );
                    const factorsSetUpForUserRes = await input.factorsSetUpForUser;
                    if (setOfUnsatisfiedFactors.factorIds.some((id) => factorsSetUpForUserRes.includes(id))) {
                        (0, logger_1.logDebugMessage)(
                            `assertAllowedToSetupFactorElseThrowInvalidClaimError ${
                                input.factorId
                            }: false because there are items already set up in the next set of unsatisfied factors: ${setOfUnsatisfiedFactors.factorIds.join(
                                ", "
                            )}`
                        );
                        return {
                            isValid: false,
                            reason: "Completed factors in the session does not satisfy the MFA requirements for auth",
                        };
                    }
                    if (
                        setOfUnsatisfiedFactors.factorIds.length > 0 &&
                        !setOfUnsatisfiedFactors.factorIds.includes(input.factorId)
                    ) {
                        // It can be a security issue if we don't do this check
                        // Consider this case:
                        //   Requirements: [{oneOf: ["totp", "otp-email"]}, "otp-phone"] (this is what I call the lower sms costs case)
                        //   The user has setup otp-phone previously, but no totp or email
                        //   During sign-in, they'd be allowed to add a new phone number, then set up TOTP and complete sign-in, completely bypassing the old phone number.
                        (0, logger_1.logDebugMessage)(
                            `assertAllowedToSetupFactorElseThrowInvalidClaimError ${
                                input.factorId
                            }: false because user is trying to set up factor that is not in the next set of unsatisfied factors: ${setOfUnsatisfiedFactors.factorIds.join(
                                ", "
                            )}`
                        );
                        return {
                            isValid: false,
                            reason: "Not allowed to setup factor that is not in the next set of unsatisfied factors",
                        };
                    }
                    (0, logger_1.logDebugMessage)(
                        `assertAllowedToSetupFactorElseThrowInvalidClaimError ${
                            input.factorId
                        }: true because the next set of unsatisfied factors is ${
                            setOfUnsatisfiedFactors.factorIds.length === 0 ? "empty" : "cannot be completed otherwise"
                        }`
                    );
                    return { isValid: true };
                },
            };
            await input.session.assertClaims([validator], input.userContext);
        },
        markFactorAsCompleteInSession: async function ({ session, factorId, userContext }) {
            await (0, utils_1.updateAndGetMFARelatedInfoInSession)({
                session,
                updatedFactorId: factorId,
                userContext,
            });
        },
        getRequiredSecondaryFactorsForUser: async function ({ userId, userContext }) {
            var _a, _b;
            const metadata = await usermetadata_1.default.getUserMetadata(userId, userContext);
            return (_b =
                (_a = metadata.metadata._supertokens) === null || _a === void 0
                    ? void 0
                    : _a.requiredSecondaryFactors) !== null && _b !== void 0
                ? _b
                : [];
        },
        addToRequiredSecondaryFactorsForUser: async function ({ userId, factorId, userContext }) {
            var _a, _b;
            const metadata = await usermetadata_1.default.getUserMetadata(userId, userContext);
            const factorIds =
                (_b =
                    (_a = metadata.metadata._supertokens) === null || _a === void 0
                        ? void 0
                        : _a.requiredSecondaryFactors) !== null && _b !== void 0
                    ? _b
                    : [];
            if (factorIds.includes(factorId)) {
                return;
            }
            factorIds.push(factorId);
            const metadataUpdate = Object.assign(Object.assign({}, metadata.metadata), {
                _supertokens: Object.assign(Object.assign({}, metadata.metadata._supertokens), {
                    requiredSecondaryFactors: factorIds,
                }),
            });
            await usermetadata_1.default.updateUserMetadata(userId, metadataUpdate, userContext);
        },
        removeFromRequiredSecondaryFactorsForUser: async function ({ userId, factorId, userContext }) {
            var _a, _b;
            const metadata = await usermetadata_1.default.getUserMetadata(userId, userContext);
            if (
                ((_a = metadata.metadata._supertokens) === null || _a === void 0
                    ? void 0
                    : _a.requiredSecondaryFactors) === undefined
            ) {
                return;
            }
            let factorIds =
                (_b = metadata.metadata._supertokens.requiredSecondaryFactors) !== null && _b !== void 0 ? _b : [];
            if (!factorIds.includes(factorId)) {
                return;
            }
            factorIds = factorIds.filter((id) => id !== factorId);
            const metadataUpdate = Object.assign(Object.assign({}, metadata.metadata), {
                _supertokens: Object.assign(Object.assign({}, metadata.metadata._supertokens), {
                    requiredSecondaryFactors: factorIds,
                }),
            });
            await usermetadata_1.default.updateUserMetadata(userId, metadataUpdate, userContext);
        },
    };
}
