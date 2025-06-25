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
const signup_1 = __importDefault(require("./api/signup"));
const signin_1 = __importDefault(require("./api/signin"));
const generatePasswordResetToken_1 = __importDefault(require("./api/generatePasswordResetToken"));
const passwordReset_1 = __importDefault(require("./api/passwordReset"));
const utils_2 = require("../../utils");
const plugins_1 = require("../../plugins");
const emailExists_1 = __importDefault(require("./api/emailExists"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const querier_1 = require("../../querier");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const emaildelivery_1 = __importDefault(require("../../ingredients/emaildelivery"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
const recipe_1 = __importDefault(require("../multifactorauth/recipe"));
const recipe_2 = __importDefault(require("../multitenancy/recipe"));
const utils_3 = require("../thirdparty/utils");
const multifactorauth_1 = require("../multifactorauth");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config, ingredients) {
        super(recipeId, appInfo);
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            return [
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGN_UP_API),
                    id: constants_1.SIGN_UP_API,
                    disabled: this.apiImpl.signUpPOST === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGN_IN_API),
                    id: constants_1.SIGN_IN_API,
                    disabled: this.apiImpl.signInPOST === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(
                        constants_1.GENERATE_PASSWORD_RESET_TOKEN_API
                    ),
                    id: constants_1.GENERATE_PASSWORD_RESET_TOKEN_API,
                    disabled: this.apiImpl.generatePasswordResetTokenPOST === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.PASSWORD_RESET_API),
                    id: constants_1.PASSWORD_RESET_API,
                    disabled: this.apiImpl.passwordResetPOST === undefined,
                },
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGNUP_EMAIL_EXISTS_API),
                    id: constants_1.SIGNUP_EMAIL_EXISTS_API,
                    disabled: this.apiImpl.emailExistsGET === undefined,
                },
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGNUP_EMAIL_EXISTS_API_OLD),
                    id: constants_1.SIGNUP_EMAIL_EXISTS_API_OLD,
                    disabled: this.apiImpl.emailExistsGET === undefined,
                },
            ];
        };
        this.handleAPIRequest = async (id, tenantId, req, res, _path, _method, userContext) => {
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
            if (id === constants_1.SIGN_UP_API) {
                return await (0, signup_1.default)(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.SIGN_IN_API) {
                return await (0, signin_1.default)(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.GENERATE_PASSWORD_RESET_TOKEN_API) {
                return await (0, generatePasswordResetToken_1.default)(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.PASSWORD_RESET_API) {
                return await (0, passwordReset_1.default)(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.SIGNUP_EMAIL_EXISTS_API || id === constants_1.SIGNUP_EMAIL_EXISTS_API_OLD) {
                return await (0, emailExists_1.default)(this.apiImpl, tenantId, options, userContext);
            }
            return false;
        };
        this.handleError = async (err, _request, response) => {
            if (err.fromRecipe === Recipe.RECIPE_ID) {
                if (err.type === error_1.default.FIELD_ERROR) {
                    return (0, utils_2.send200Response)(response, {
                        status: "FIELD_ERROR",
                        formFields: err.payload,
                    });
                } else {
                    throw err;
                }
            } else {
                throw err;
            }
        };
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
        };
        this.isInServerlessEnv = isInServerlessEnv;
        this.config = (0, utils_1.validateAndNormaliseUserInput)(this, appInfo, config);
        {
            const getEmailPasswordConfig = () => this.config;
            let builder = new supertokens_js_override_1.default(
                (0, recipeImplementation_1.default)(
                    querier_1.Querier.getNewInstanceOrThrowError(recipeId),
                    getEmailPasswordConfig
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
        postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            const mfaInstance = recipe_1.default.getInstance();
            if (mfaInstance !== undefined) {
                mfaInstance.addFuncToGetAllAvailableSecondaryFactorIdsFromOtherRecipes(() => {
                    return ["emailpassword"];
                });
                mfaInstance.addFuncToGetFactorsSetupForUserFromOtherRecipes(async (user) => {
                    for (const loginMethod of user.loginMethods) {
                        // We don't check for tenantId here because if we find the user
                        // with emailpassword loginMethod from different tenant, then
                        // we assume the factor is setup for this user. And as part of factor
                        // completion, we associate that loginMethod with the session's tenantId
                        if (loginMethod.recipeId === Recipe.RECIPE_ID) {
                            return ["emailpassword"];
                        }
                    }
                    return [];
                });
                mfaInstance.addFuncToGetEmailsForFactorFromOtherRecipes((user, sessionRecipeUserId) => {
                    // This function is called in the MFA info endpoint API.
                    // Based on https://github.com/supertokens/supertokens-node/pull/741#discussion_r1432749346
                    // preparing some reusable variables for the logic below...
                    let sessionLoginMethod = user.loginMethods.find((lM) => {
                        return lM.recipeUserId.getAsString() === sessionRecipeUserId.getAsString();
                    });
                    if (sessionLoginMethod === undefined) {
                        // this can happen maybe cause this login method
                        // was unlinked from the user or deleted entirely...
                        return {
                            status: "UNKNOWN_SESSION_RECIPE_USER_ID",
                        };
                    }
                    // We order the login methods based on timeJoined (oldest first)
                    const orderedLoginMethodsByTimeJoinedOldestFirst = user.loginMethods.sort((a, b) => {
                        return a.timeJoined - b.timeJoined;
                    });
                    // Then we take the ones that belong to this recipe
                    const recipeLoginMethodsOrderedByTimeJoinedOldestFirst =
                        orderedLoginMethodsByTimeJoinedOldestFirst.filter((lm) => lm.recipeId === Recipe.RECIPE_ID);
                    let result;
                    if (recipeLoginMethodsOrderedByTimeJoinedOldestFirst.length !== 0) {
                        // If there are login methods belonging to this recipe, the factor is set up
                        // In this case we only list email addresses that have a password associated with them
                        result = [
                            // First we take the verified real emails associated with emailpassword login methods ordered by timeJoined (oldest first)
                            ...recipeLoginMethodsOrderedByTimeJoinedOldestFirst
                                .filter((lm) => !(0, utils_3.isFakeEmail)(lm.email) && lm.verified === true)
                                .map((lm) => lm.email),
                            // Then we take the non-verified real emails associated with emailpassword login methods ordered by timeJoined (oldest first)
                            ...recipeLoginMethodsOrderedByTimeJoinedOldestFirst
                                .filter((lm) => !(0, utils_3.isFakeEmail)(lm.email) && lm.verified === false)
                                .map((lm) => lm.email),
                            // Lastly, fake emails associated with emailpassword login methods ordered by timeJoined (oldest first)
                            // We also add these into the list because they already have a password added to them so they can be a valid choice when signing in
                            // We do not want to remove the previously added "MFA password", because a new email password user was linked
                            // E.g.:
                            // 1. A discord user adds a password for MFA (which will use the fake email associated with the discord user)
                            // 2. Later they also sign up and (manually) link a full emailpassword user that they intend to use as a first factor
                            // 3. The next time they sign in using Discord, they could be asked for a secondary password.
                            // In this case, they'd be checked against the first user that they originally created for MFA, not the one later linked to the account
                            ...recipeLoginMethodsOrderedByTimeJoinedOldestFirst
                                .filter((lm) => (0, utils_3.isFakeEmail)(lm.email))
                                .map((lm) => lm.email),
                        ];
                        // We handle moving the session email to the top of the list later
                    } else {
                        // This factor hasn't been set up, we list all emails belonging to the user
                        if (
                            orderedLoginMethodsByTimeJoinedOldestFirst.some(
                                (lm) => lm.email !== undefined && !(0, utils_3.isFakeEmail)(lm.email)
                            )
                        ) {
                            // If there is at least one real email address linked to the user, we only suggest real addresses
                            result = orderedLoginMethodsByTimeJoinedOldestFirst
                                .filter((lm) => lm.email !== undefined && !(0, utils_3.isFakeEmail)(lm.email))
                                .map((lm) => lm.email);
                        } else {
                            // Else we use the fake ones
                            result = orderedLoginMethodsByTimeJoinedOldestFirst
                                .filter((lm) => lm.email !== undefined && (0, utils_3.isFakeEmail)(lm.email))
                                .map((lm) => lm.email);
                        }
                        // We handle moving the session email to the top of the list later
                        // Since in this case emails are not guaranteed to be unique, we de-duplicate the results, keeping the oldest one in the list.
                        // The Set constructor keeps the original insertion order (OrderedByTimeJoinedOldestFirst), but de-duplicates the items,
                        // keeping the first one added (so keeping the older one if there are two entries with the same email)
                        // e.g.: [4,2,3,2,1] -> [4,2,3,1]
                        result = Array.from(new Set(result));
                    }
                    // If the loginmethod associated with the session has an email address, we move it to the top of the list (if it's already in the list)
                    if (sessionLoginMethod.email !== undefined && result.includes(sessionLoginMethod.email)) {
                        result = [
                            sessionLoginMethod.email,
                            ...result.filter((email) => email !== sessionLoginMethod.email),
                        ];
                    }
                    // If the list is empty we generate an email address to make the flow where the user is never asked for
                    // an email address easier to implement. In many cases when the user adds an email-password factor, they
                    // actually only want to add a password and do not care about the associated email address.
                    // Custom implementations can choose to ignore this, and ask the user for the email anyway.
                    if (result.length === 0) {
                        result.push(`${sessionRecipeUserId.getAsString()}@stfakeemail.supertokens.com`);
                    }
                    return {
                        status: "OK",
                        factorIdToEmailsMap: {
                            emailpassword: result,
                        },
                    };
                });
            }
            const mtRecipe = recipe_2.default.getInstance();
            if (mtRecipe !== undefined) {
                mtRecipe.allAvailableFirstFactors.push(multifactorauth_1.FactorIds.EMAILPASSWORD);
            }
        });
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Emailpassword.init function?");
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
                return Recipe.instance;
            } else {
                throw new Error("Emailpassword recipe has already been initialised. Please check your code for bugs.");
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
Recipe.RECIPE_ID = "emailpassword";
exports.default = Recipe;
