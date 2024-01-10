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
var __rest =
    (this && this.__rest) ||
    function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
            }
        return t;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidFirstFactor = exports.getFactorFlowControlFlags = exports.checkFactorRequirement = exports.validateAndNormaliseUserInput = void 0;
const recipe_1 = __importDefault(require("./recipe"));
const session_1 = __importDefault(require("../session"));
const recipe_2 = __importDefault(require("../session/recipe"));
const multitenancy_1 = __importDefault(require("../multitenancy"));
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
exports.validateAndNormaliseUserInput = validateAndNormaliseUserInput;
function checkFactorRequirement(req, completedFactors) {
    return {
        id: req,
        isValid: completedFactors[req] !== undefined,
        message: "Not completed",
    };
}
exports.checkFactorRequirement = checkFactorRequirement;
async function getFactorFlowControlFlags(req, res, userContext) {
    // Factor Login flow is described here -> https://github.com/supertokens/supertokens-core/issues/554#issuecomment-1857915021
    // - no session -> normal operation
    // - with session:
    //   - mfa disabled ->
    //     - if session overwrite is not allowed -> we don’t do auto account linking and no manual account linking (even if user has switched on automatic account linking)
    //       - the 2nd account already exists -> no op (do not change the db)
    //       - the 2nd account does not exist -> isSignUpAllowed -> create a recipe user
    //     - if session overwrite is allowed -> we ignore the input session and just do normal operation as if there was no input session.
    //   - mfa enabled -> we don’t do auto account linking (even if user has switched on automatic account linking)
    //     - the 2nd account already exists:
    //       - if user is already linked to first account -> modify session’s completed and next array
    //       - if user is not already linked to first account -> Contact support case (cause we can’t do account linking here cause the other account may have some info already in it, and we do not call shouldDoAutomaticAccountLinking function)
    //     - the 2nd account does not exist -> creating and linking (if linking is allowed, if not, we aren’t creating either + isAllowedToSetupFactor + (2nd factor is verification || login method with same email and its verified))
    //       - If linking is not allowed, we return a support status code
    //       - The code path should never use the session overwrite boolean in this case!
    // This function returns flags based on all the above flows and in each of the sign in/up API
    // implementation, we perform the actions based on these flags.
    let session = await session_1.default.getSession(
        req,
        res,
        {
            sessionRequired: false,
            overrideGlobalClaimValidators: () => [],
        },
        userContext
    );
    const mfaInstance = recipe_1.default.getInstance();
    let overwriteSessionDuringSignIn = recipe_2.default.getInstanceOrThrowError().config.overwriteSessionDuringSignIn;
    let shouldCheckIfSignInIsAllowed;
    let shouldCheckIfSignUpIsAllowed;
    let shouldAttemptAccountLinking;
    let shouldCreateSession;
    if (session === undefined) {
        shouldCheckIfSignInIsAllowed = true;
        shouldCheckIfSignUpIsAllowed = true;
        shouldAttemptAccountLinking = true;
        shouldCreateSession = true;
    } else {
        if (mfaInstance === undefined) {
            shouldCheckIfSignUpIsAllowed = true;
            if (overwriteSessionDuringSignIn === false) {
                shouldCheckIfSignInIsAllowed = false;
                shouldAttemptAccountLinking = false;
                shouldCreateSession = false;
            } else {
                shouldCheckIfSignInIsAllowed = true;
                shouldAttemptAccountLinking = true;
                shouldCreateSession = true;
            }
        } else {
            shouldCheckIfSignInIsAllowed = false;
            shouldCheckIfSignUpIsAllowed = false;
            shouldAttemptAccountLinking = false;
            shouldCreateSession = false;
        }
    }
    return {
        shouldCheckIfSignInIsAllowed,
        shouldCheckIfSignUpIsAllowed,
        shouldAttemptAccountLinking,
        shouldCreateSession,
        session,
        mfaInstance,
    };
}
exports.getFactorFlowControlFlags = getFactorFlowControlFlags;
const isValidFirstFactor = async function (tenantId, factorId, userContext) {
    const tenantInfo = await multitenancy_1.default.getTenant(tenantId, userContext);
    if (tenantInfo === undefined) {
        throw new Error("tenant not found");
    }
    const { status: _ } = tenantInfo,
        tenantConfig = __rest(tenantInfo, ["status"]);
    // we prioritise the firstFactors configured in tenant. If not present, we fallback to the recipe config
    // if validFirstFactors is undefined, we assume it's valid. We assume it's valid because we will still get errors
    // if the loginMethod is disabled in core, or not initialised in the recipeList
    // Core already validates that the firstFactors are valid as per the logn methods enabled for that tenant,
    // so we don't need to do additional checks here
    let validFirstFactors =
        tenantConfig.firstFactors !== undefined
            ? tenantConfig.firstFactors
            : recipe_1.default.getInstanceOrThrowError().config.firstFactors;
    if (validFirstFactors !== undefined && !validFirstFactors.includes(factorId)) {
        return false;
    }
    return true;
};
exports.isValidFirstFactor = isValidFirstFactor;
