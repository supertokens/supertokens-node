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
exports.updateAndGetMFARelatedInfoInSession = void 0;
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
const multitenancy_1 = __importDefault(require("../multitenancy"));
const __1 = require("../..");
const recipe_1 = __importDefault(require("./recipe"));
const multiFactorAuthClaim_1 = require("./multiFactorAuthClaim");
const session_1 = __importDefault(require("../session"));
const error_1 = __importDefault(require("../session/error"));
const types_1 = require("./types");
const utils_1 = require("../multitenancy/utils");
function validateAndNormaliseUserInput(config) {
    if (
        (config === null || config === void 0 ? void 0 : config.firstFactors) !== undefined &&
        (config === null || config === void 0 ? void 0 : config.firstFactors.length) === 0
    ) {
        throw new Error("'firstFactors' can be either undefined or a non-empty array");
    }
    let override = Object.assign(
        {
            functions: (originalImplementation) => originalImplementation,
            apis: (originalImplementation) => originalImplementation,
        },
        config === null || config === void 0 ? void 0 : config.override
    );
    return {
        firstFactors: config === null || config === void 0 ? void 0 : config.firstFactors,
        override,
    };
}
// This function is to reuse a piece of code that is needed in multiple places
const updateAndGetMFARelatedInfoInSession = async function (input) {
    let sessionRecipeUserId;
    let tenantId;
    let accessTokenPayload;
    let sessionHandle;
    if ("session" in input) {
        sessionRecipeUserId = input.session.getRecipeUserId(input.userContext);
        tenantId = input.session.getTenantId(input.userContext);
        accessTokenPayload = input.session.getAccessTokenPayload(input.userContext);
        sessionHandle = input.session.getHandle(input.userContext);
    } else {
        sessionRecipeUserId = input.sessionRecipeUserId;
        tenantId = input.tenantId;
        accessTokenPayload = input.accessTokenPayload;
        sessionHandle = accessTokenPayload.sessionHandle;
    }
    let updatedClaimVal = false;
    let mfaClaimValue = multiFactorAuthClaim_1.MultiFactorAuthClaim.getValueFromPayload(accessTokenPayload);
    if (input.updatedFactorId) {
        if (mfaClaimValue === undefined) {
            updatedClaimVal = true;
            mfaClaimValue = {
                c: {
                    [input.updatedFactorId]: Math.floor(Date.now() / 1000),
                },
                v: true, // updated later in the function
            };
        } else {
            updatedClaimVal = true;
            mfaClaimValue.c[input.updatedFactorId] = Math.floor(Date.now() / 1000);
        }
    }
    if (mfaClaimValue === undefined) {
        // it should be fine to get the user multiple times since the caching will de-duplicate these requests
        const sessionUser = await (0, __1.getUser)(sessionRecipeUserId.getAsString(), input.userContext);
        if (sessionUser === undefined) {
            throw new error_1.default({
                type: error_1.default.UNAUTHORISED,
                message: "Session user not found",
            });
        }
        // This can happen with older session, because we did not add MFA claims previously.
        // We try to determine best possible factorId based on the session's recipe user id.
        const sessionInfo = await session_1.default.getSessionInformation(sessionHandle, input.userContext);
        if (sessionInfo === undefined) {
            throw new error_1.default({
                type: error_1.default.UNAUTHORISED,
                message: "Session not found",
            });
        }
        const firstFactorTime = sessionInfo.timeCreated;
        let computedFirstFactorIdForSession = undefined;
        for (const lM of sessionUser.loginMethods) {
            if (lM.recipeUserId.getAsString() === sessionRecipeUserId.getAsString()) {
                if (lM.recipeId === "emailpassword") {
                    let validRes = await (0, utils_1.isValidFirstFactor)(
                        tenantId,
                        types_1.FactorIds.EMAILPASSWORD,
                        input.userContext
                    );
                    if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                        throw new error_1.default({
                            type: error_1.default.UNAUTHORISED,
                            message: "Tenant not found",
                        });
                    } else if (validRes.status === "OK") {
                        computedFirstFactorIdForSession = types_1.FactorIds.EMAILPASSWORD;
                        break;
                    }
                } else if (lM.recipeId === "thirdparty") {
                    let validRes = await (0, utils_1.isValidFirstFactor)(
                        tenantId,
                        types_1.FactorIds.THIRDPARTY,
                        input.userContext
                    );
                    if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                        throw new error_1.default({
                            type: error_1.default.UNAUTHORISED,
                            message: "Tenant not found",
                        });
                    } else if (validRes.status === "OK") {
                        computedFirstFactorIdForSession = types_1.FactorIds.THIRDPARTY;
                        break;
                    }
                } else {
                    let factorsToCheck = [];
                    if (lM.email !== undefined) {
                        factorsToCheck.push(types_1.FactorIds.LINK_EMAIL);
                        factorsToCheck.push(types_1.FactorIds.OTP_EMAIL);
                    }
                    if (lM.phoneNumber !== undefined) {
                        factorsToCheck.push(types_1.FactorIds.LINK_PHONE);
                        factorsToCheck.push(types_1.FactorIds.OTP_PHONE);
                    }
                    for (const factorId of factorsToCheck) {
                        let validRes = await (0, utils_1.isValidFirstFactor)(tenantId, factorId, input.userContext);
                        if (validRes.status === "TENANT_NOT_FOUND_ERROR") {
                            throw new error_1.default({
                                type: error_1.default.UNAUTHORISED,
                                message: "Tenant not found",
                            });
                        } else if (validRes.status === "OK") {
                            computedFirstFactorIdForSession = factorId;
                            break;
                        }
                    }
                    if (computedFirstFactorIdForSession !== undefined) {
                        break;
                    }
                }
            }
        }
        if (computedFirstFactorIdForSession === undefined) {
            throw new error_1.default({
                type: error_1.default.UNAUTHORISED,
                message: "Incorrect login method used",
            });
        }
        updatedClaimVal = true;
        mfaClaimValue = {
            c: {
                [computedFirstFactorIdForSession]: firstFactorTime,
            },
            v: true, // updated later in this function
        };
    }
    const completedFactors = mfaClaimValue.c;
    let userProm;
    function userGetter() {
        if (userProm) {
            return userProm;
        }
        userProm = (0, __1.getUser)(sessionRecipeUserId.getAsString(), input.userContext).then((sessionUser) => {
            if (sessionUser === undefined) {
                throw new error_1.default({
                    type: error_1.default.UNAUTHORISED,
                    message: "Session user not found",
                });
            }
            return sessionUser;
        });
        return userProm;
    }
    const mfaRequirementsForAuth = await recipe_1.default
        .getInstanceOrThrowError()
        .recipeInterfaceImpl.getMFARequirementsForAuth({
            accessTokenPayload,
            tenantId,
            get user() {
                return userGetter();
            },
            get factorsSetUpForUser() {
                return userGetter().then((user) =>
                    recipe_1.default.getInstanceOrThrowError().recipeInterfaceImpl.getFactorsSetupForUser({
                        user,
                        userContext: input.userContext,
                    })
                );
            },
            get requiredSecondaryFactorsForUser() {
                return userGetter().then((sessionUser) => {
                    if (sessionUser === undefined) {
                        throw new error_1.default({
                            type: error_1.default.UNAUTHORISED,
                            message: "Session user not found",
                        });
                    }
                    return recipe_1.default
                        .getInstanceOrThrowError()
                        .recipeInterfaceImpl.getRequiredSecondaryFactorsForUser({
                            userId: sessionUser.id,
                            userContext: input.userContext,
                        });
                });
            },
            get requiredSecondaryFactorsForTenant() {
                return multitenancy_1.default.getTenant(tenantId, input.userContext).then((tenantInfo) => {
                    var _a;
                    if (tenantInfo === undefined) {
                        throw new error_1.default({
                            type: error_1.default.UNAUTHORISED,
                            message: "Tenant not found",
                        });
                    }
                    return (_a = tenantInfo.requiredSecondaryFactors) !== null && _a !== void 0 ? _a : [];
                });
            },
            completedFactors,
            userContext: input.userContext,
        });
    const areAuthReqsComplete =
        multiFactorAuthClaim_1.MultiFactorAuthClaim.getNextSetOfUnsatisfiedFactors(
            completedFactors,
            mfaRequirementsForAuth
        ).factorIds.length === 0;
    if (mfaClaimValue.v !== areAuthReqsComplete) {
        updatedClaimVal = true;
        mfaClaimValue.v = areAuthReqsComplete;
    }
    if ("session" in input && updatedClaimVal) {
        await input.session.setClaimValue(
            multiFactorAuthClaim_1.MultiFactorAuthClaim,
            mfaClaimValue,
            input.userContext
        );
    }
    return {
        completedFactors,
        mfaRequirementsForAuth,
        isMFARequirementsForAuthSatisfied: mfaClaimValue.v,
    };
};
exports.updateAndGetMFARelatedInfoInSession = updateAndGetMFARelatedInfoInSession;
