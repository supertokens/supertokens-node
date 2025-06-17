"use strict";
/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
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
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const error_1 = __importDefault(require("./error"));
const utils_1 = require("./utils");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const constants_1 = require("./constants");
const generateEmailVerifyToken_1 = __importDefault(require("./api/generateEmailVerifyToken"));
const emailVerify_1 = __importDefault(require("./api/emailVerify"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const querier_1 = require("../../querier");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const emaildelivery_1 = __importDefault(require("../../ingredients/emaildelivery"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
const recipe_1 = __importDefault(require("../session/recipe"));
const emailVerificationClaim_1 = require("./emailVerificationClaim");
const error_2 = __importDefault(require("../session/error"));
const session_1 = __importDefault(require("../session"));
const __1 = require("../..");
const logger_1 = require("../../logger");
const utils_2 = require("../../utils");
const plugins_1 = require("../../plugins");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config, ingredients) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        constants_1.GENERATE_EMAIL_VERIFY_TOKEN_API
                    ),
                    id: constants_1.GENERATE_EMAIL_VERIFY_TOKEN_API,
                    disabled: this.apiImpl.generateEmailVerifyTokenPOST === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.EMAIL_VERIFY_API),
                    id: constants_1.EMAIL_VERIFY_API,
                    disabled: this.apiImpl.verifyEmailPOST === undefined,
                },
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.EMAIL_VERIFY_API),
                    id: constants_1.EMAIL_VERIFY_API,
                    disabled: this.apiImpl.isEmailVerifiedGET === undefined,
                },
            ];
        };
        this.handleAPIRequest = async (id, tenantId, req, res, _, __, userContext) => {
            let options = {
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                recipeImplementation: this.recipeInterfaceImpl,
                req,
                res,
                emailDelivery: this.emailDelivery,
                appInfo: this.getAppInfo(),
            };
            if (id === constants_1.GENERATE_EMAIL_VERIFY_TOKEN_API) {
                return await (0, generateEmailVerifyToken_1.default)(this.apiImpl, options, userContext);
            } else {
                return await (0, emailVerify_1.default)(this.apiImpl, tenantId, options, userContext);
            }
        };
        this.handleError = async (err, _, __) => {
            throw err;
        };
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
        };
        this.getEmailForRecipeUserId = async (user, recipeUserId, userContext) => {
            if (this.config.getEmailForRecipeUserId !== undefined) {
                const userRes = await this.config.getEmailForRecipeUserId(recipeUserId, userContext);
                if (userRes.status !== "UNKNOWN_USER_ID_ERROR") {
                    return userRes;
                }
            }
            if (user === undefined) {
                user = await (0, __1.getUser)(recipeUserId.getAsString(), userContext);
                if (user === undefined) {
                    return {
                        status: "UNKNOWN_USER_ID_ERROR",
                    };
                }
            }
            for (let i = 0; i < user.loginMethods.length; i++) {
                let currLM = user.loginMethods[i];
                if (currLM.recipeUserId.getAsString() === recipeUserId.getAsString()) {
                    if (currLM.email !== undefined) {
                        return {
                            email: currLM.email,
                            status: "OK",
                        };
                    } else {
                        return {
                            status: "EMAIL_DOES_NOT_EXIST_ERROR",
                        };
                    }
                }
            }
            return {
                status: "UNKNOWN_USER_ID_ERROR",
            };
        };
        this.getPrimaryUserIdForRecipeUser = async (recipeUserId, userContext) => {
            // We extract this into its own function like this cause we want to make sure that
            // this recipe does not get the email of the user ID from the getUser function.
            // In fact, there is a test "email verification recipe uses getUser function only in getEmailForRecipeUserId"
            // which makes sure that this function is only called in 3 places in this recipe:
            // - this function
            // - getEmailForRecipeUserId function (above)
            // - after verification to get the updated user in verifyEmailUsingToken
            // We want to isolate the result of calling this function as much as possible
            // so that the consumer of the getUser function does not read the email
            // from the primaryUser. Hence, this function only returns the string ID
            // and nothing else from the primaryUser.
            let primaryUser = await (0, __1.getUser)(recipeUserId.getAsString(), userContext);
            if (primaryUser === undefined) {
                // This can come here if the user is using session + email verification
                // recipe with a user ID that is not known to supertokens. In this case,
                // we do not allow linking for such users.
                return recipeUserId.getAsString();
            }
            return primaryUser === null || primaryUser === void 0 ? void 0 : primaryUser.id;
        };
        this.updateSessionIfRequiredPostEmailVerification = async (input) => {
            let primaryUserId = await this.getPrimaryUserIdForRecipeUser(
                input.recipeUserIdWhoseEmailGotVerified,
                input.userContext
            );
            // if a session exists in the API, then we can update the session
            // claim related to email verification
            if (input.session !== undefined) {
                (0, logger_1.logDebugMessage)("updateSessionIfRequiredPostEmailVerification got session");
                // Due to linking, we will have to correct the current
                // session's user ID. There are four cases here:
                // --> (Case 1) User signed up and did email verification and the new account
                // became a primary user (user ID no change)
                // --> (Case 2) User signed up and did email verification and the new account got linked
                // to another primary user (user ID change)
                // --> (Case 3) This is post login account linking, in which the account that got verified
                // got linked to the session's account (user ID of account has changed to the session's user ID)
                // -->  (Case 4) This is post login account linking, in which the account that got verified
                // got linked to ANOTHER primary account (user ID of account has changed to a different user ID != session.getUserId, but
                // we should ignore this since it will result in the user's session changing.)
                if (
                    input.session.getRecipeUserId(input.userContext).getAsString() ===
                    input.recipeUserIdWhoseEmailGotVerified.getAsString()
                ) {
                    (0, logger_1.logDebugMessage)(
                        "updateSessionIfRequiredPostEmailVerification the session belongs to the verified user"
                    );
                    // this means that the session's login method's account is the
                    // one that just got verified and that we are NOT doing post login
                    // account linking. So this is only for (Case 1) and (Case 2)
                    if (input.session.getUserId() === primaryUserId) {
                        (0, logger_1.logDebugMessage)(
                            "updateSessionIfRequiredPostEmailVerification the session userId matches the primary user id, so we are only refreshing the claim"
                        );
                        // if the session's primary user ID is equal to the
                        // primary user ID that the account was linked to, then
                        // this means that the new account became a primary user (Case 1)
                        // We also have the sub cases here that the account that just
                        // got verified was already linked to the session's primary user ID,
                        // but either way, we don't need to change any user ID.
                        // In this case, all we do is to update the emailverification claim
                        try {
                            // EmailVerificationClaim will be based on the recipeUserId
                            // and not the primary user ID.
                            await input.session.fetchAndSetClaim(
                                emailVerificationClaim_1.EmailVerificationClaim,
                                input.userContext
                            );
                        } catch (err) {
                            // This should never happen, since we've just set the status above.
                            if (err.message === "UNKNOWN_USER_ID") {
                                throw new error_2.default({
                                    type: error_2.default.UNAUTHORISED,
                                    message: "Unknown User ID provided",
                                });
                            }
                            throw err;
                        }
                        return;
                    } else {
                        (0, logger_1.logDebugMessage)(
                            "updateSessionIfRequiredPostEmailVerification the session user id doesn't match the primary user id, so we are revoking all sessions and creating a new one"
                        );
                        // if the session's primary user ID is NOT equal to the
                        // primary user ID that the account that it was linked to, then
                        // this means that the new account got linked to another primary user (Case 2)
                        // In this case, we need to update the session's user ID by creating
                        // a new session
                        // Revoke all session belonging to session.getRecipeUserId()
                        // We do not really need to do this, but we do it anyway.. no harm.
                        await session_1.default.revokeAllSessionsForUser(
                            input.recipeUserIdWhoseEmailGotVerified.getAsString(),
                            false,
                            undefined,
                            input.userContext
                        );
                        // create a new session and return that..
                        return await session_1.default.createNewSession(
                            input.req,
                            input.res,
                            input.session.getTenantId(),
                            input.session.getRecipeUserId(input.userContext),
                            {},
                            {},
                            input.userContext
                        );
                    }
                } else {
                    (0, logger_1.logDebugMessage)(
                        "updateSessionIfRequiredPostEmailVerification the verified user doesn't match the session"
                    );
                    // this means that the session's login method's account was NOT the
                    // one that just got verified and that we ARE doing post login
                    // account linking. So this is only for (Case 3) and (Case 4)
                    // In both case 3 and case 4, we do not want to change anything in the
                    // current session in terms of user ID or email verification claim (since
                    // both of these refer to the current logged in user and not the newly
                    // linked user's account).
                    return undefined;
                }
            } else {
                (0, logger_1.logDebugMessage)("updateSessionIfRequiredPostEmailVerification got no session");
                // the session is updated when the is email verification GET API is called
                // so we don't do anything in this API.
                return undefined;
            }
        };
        this.config = (0, utils_1.validateAndNormaliseUserInput)(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new supertokens_js_override_1.default(
                (0, recipeImplementation_1.default)(
                    querier_1.Querier.getNewInstanceOrThrowError(recipeId),
                    this.getEmailForRecipeUserId
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default((0, implementation_1.default)());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
        /**
         * emailDelivery will always needs to be declared after isInServerlessEnv
         * and recipeInterfaceImpl values are set
         */
        this.emailDelivery =
            ingredients.emailDelivery === undefined
                ? new emaildelivery_1.default(this.config.getEmailDeliveryConfig(this.isInServerlessEnv))
                : ingredients.emailDelivery;
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the EmailVerification.init function?");
    }
    static getInstance() {
        return Recipe.instance;
    }
    static init(config) {
        return (appInfo, isInServerlessEnv, plugins) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    (0, plugins_1.applyPlugins)(
                        Recipe.RECIPE_ID,
                        config,
                        plugins !== null && plugins !== void 0 ? plugins : []
                    ),
                    {
                        emailDelivery: undefined,
                    }
                );
                postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
                    recipe_1.default
                        .getInstanceOrThrowError()
                        .addClaimFromOtherRecipe(emailVerificationClaim_1.EmailVerificationClaim);
                    if (config.mode === "REQUIRED") {
                        recipe_1.default
                            .getInstanceOrThrowError()
                            .addClaimValidatorFromOtherRecipe(
                                emailVerificationClaim_1.EmailVerificationClaim.validators.isVerified()
                            );
                    }
                });
                return Recipe.instance;
            } else {
                throw new Error(
                    "Emailverification recipe has already been initialised. Please check your code for bugs."
                );
            }
        };
    }
    static reset() {
        if (!(0, utils_2.isTestEnv)()) {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
}
Recipe.instance = undefined;
Recipe.RECIPE_ID = "emailverification";
exports.default = Recipe;
