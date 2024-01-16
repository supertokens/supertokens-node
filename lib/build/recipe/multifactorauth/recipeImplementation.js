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
const recipe_1 = __importDefault(require("../usermetadata/recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
const __1 = require("../..");
const logger_1 = require("../../logger");
function getRecipeInterface(recipeInstance) {
    return {
        getFactorsSetupForUser: async function ({ tenantId, user, userContext }) {
            // factors setup for user are provided by each of the initialized recipes
            // each of the recipe checks if there is a matching recipe in the login
            // methods of the user specified and based on that returns the factor ids
            // in case of passwordless, the factor ids are based on the contact method
            // and flow configs and the relavant factor ids are returned
            // https://github.com/supertokens/supertokens-core/issues/554#issuecomment-1752852720
            let factorIds = [];
            for (const func of recipeInstance.getFactorsSetupForUserFromOtherRecipesFuncs) {
                let result = await func(tenantId, user, userContext);
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
            for (const factor of requiredSecondaryFactorsForUser) {
                allFactors.add(factor);
            }
            for (const factor of requiredSecondaryFactorsForTenant) {
                allFactors.add(factor);
            }
            return [{ oneOf: [...allFactors] }];
        },
        assertAllowedToSetupFactorElseThrowInvalidClaimError: async function ({
            factorId,
            session,
            factorsSetUpForUser,
            mfaRequirementsForAuth,
            userContext,
        }) {
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
            const validator = {
                id: multiFactorAuthClaim_1.MultiFactorAuthClaim.key,
                claim: multiFactorAuthClaim_1.MultiFactorAuthClaim,
                shouldRefetch: () => false,
                validate: async (payload) => {
                    const claimVal = multiFactorAuthClaim_1.MultiFactorAuthClaim.getValueFromPayload(payload);
                    if (!claimVal) {
                        throw new Error("should never happen");
                    }
                    const setOfUnsatisfiedFactors = multiFactorAuthClaim_1.MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
                        claimVal.c,
                        mfaRequirementsForAuth
                    );
                    if (setOfUnsatisfiedFactors.factorIds.some((id) => factorsSetUpForUser.includes(id))) {
                        logger_1.logDebugMessage(
                            `isAllowedToSetupFactor ${factorId}: false because there are items already set up in the next set of unsatisfied factors: ${setOfUnsatisfiedFactors.factorIds.join(
                                ", "
                            )}`
                        );
                        return {
                            isValid: false,
                            reason: "Does not satisfy MFA requirements",
                        };
                    }
                    logger_1.logDebugMessage(
                        `isAllowedToSetupFactor ${factorId}: true because the next set of unsatisfied factors is ${
                            setOfUnsatisfiedFactors.factorIds.length === 0 ? "empty" : "cannot be completed otherwise"
                        }`
                    );
                    return { isValid: true };
                },
            };
            await session.assertClaims([validator], userContext);
        },
        markFactorAsCompleteInSession: async function ({ session, factorId, userContext }) {
            const currentValue = await session.getClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim);
            const completed = Object.assign(
                Object.assign({}, currentValue === null || currentValue === void 0 ? void 0 : currentValue.c),
                { [factorId]: Math.floor(Date.now() / 1000) }
            );
            const user = await __1.getUser(session.getUserId(), userContext);
            if (user === undefined) {
                throw new Error("User not found!");
            }
            await session.setClaimValue(multiFactorAuthClaim_1.MultiFactorAuthClaim, {
                c: completed,
                v:
                    (currentValue === null || currentValue === void 0 ? void 0 : currentValue.v) == undefined
                        ? false
                        : currentValue.v,
            });
            session.fetchAndSetClaim(multiFactorAuthClaim_1.MultiFactorAuthClaim, userContext); // updates value for `v`
        },
        getRequiredSecondaryFactorsForUser: async function ({ userId, userContext }) {
            var _a, _b;
            const userMetadataInstance = recipe_1.default.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId,
                userContext,
            });
            return (_b =
                (_a = metadata.metadata._supertokens) === null || _a === void 0
                    ? void 0
                    : _a.requiredSecondaryFactors) !== null && _b !== void 0
                ? _b
                : [];
        },
        addToRequiredSecondaryFactorsForUser: async function ({ userId, factorId, userContext }) {
            var _a, _b;
            const userMetadataInstance = recipe_1.default.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId,
                userContext,
            });
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
            await userMetadataInstance.recipeInterfaceImpl.updateUserMetadata({
                userId: userId,
                metadataUpdate,
                userContext,
            });
        },
        removeFromRequiredSecondaryFactorsForUser: async function ({ userId, factorId, userContext }) {
            var _a, _b;
            const userMetadataInstance = recipe_1.default.getInstanceOrThrowError();
            const metadata = await userMetadataInstance.recipeInterfaceImpl.getUserMetadata({
                userId,
                userContext,
            });
            if (
                ((_a = metadata.metadata._supertokens) === null || _a === void 0
                    ? void 0
                    : _a.requiredSecondaryFactors) === undefined
            ) {
                return;
            }
            const factorIds =
                (_b = metadata.metadata._supertokens.requiredSecondaryFactors) !== null && _b !== void 0 ? _b : [];
            if (!factorIds.includes(factorId)) {
                return;
            }
            const index = factorIds.indexOf(factorId);
            factorIds.splice(index, 1);
            const metadataUpdate = Object.assign(Object.assign({}, metadata.metadata), {
                _supertokens: Object.assign(Object.assign({}, metadata.metadata._supertokens), {
                    requiredSecondaryFactorsForUser: factorIds,
                }),
            });
            await userMetadataInstance.recipeInterfaceImpl.updateUserMetadata({
                userId: userId,
                metadataUpdate,
                userContext,
            });
        },
    };
}
exports.default = getRecipeInterface;
