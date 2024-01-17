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
const emailExists_1 = __importDefault(require("./api/emailExists"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const querier_1 = require("../../querier");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const emaildelivery_1 = __importDefault(require("../../ingredients/emaildelivery"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
const recipe_1 = __importDefault(require("../multifactorauth/recipe"));
const utils_3 = require("../thirdparty/utils");
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
                return await signup_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.SIGN_IN_API) {
                return await signin_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.GENERATE_PASSWORD_RESET_TOKEN_API) {
                return await generatePasswordResetToken_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.PASSWORD_RESET_API) {
                return await passwordReset_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.SIGNUP_EMAIL_EXISTS_API) {
                return await emailExists_1.default(this.apiImpl, tenantId, options, userContext);
            }
            return false;
        };
        this.handleError = async (err, _request, response) => {
            if (err.fromRecipe === Recipe.RECIPE_ID) {
                if (err.type === error_1.default.FIELD_ERROR) {
                    return utils_2.send200Response(response, {
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
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        {
            const getEmailPasswordConfig = () => this.config;
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(
                    querier_1.Querier.getNewInstanceOrThrowError(recipeId),
                    getEmailPasswordConfig
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
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
                mfaInstance.addGetAllFactorsFromOtherRecipesFunc((tenantConfig) => {
                    if (tenantConfig.emailPassword.enabled === false) {
                        return [];
                    }
                    return ["emailpassword"];
                });
                mfaInstance.addGetFactorsSetupForUserFromOtherRecipes(async (user) => {
                    for (const loginMethod of user.loginMethods) {
                        // Here we check for matching tenantId because if we don't then
                        // things can go wrong in the following scenario:
                        // - tenant1 -> emailpassword with email e1
                        // - tenant2 -> thirdparty with email e2 (e2 can be equal to e1, doesn't matter)
                        // now if the user has logged into tenant2, and is adding
                        // a password to that, we do return ["emailpassword"]
                        // cause it's there in tenant1 (i.e. we do not check
                        // for tenant below), then the frontend will end up
                        // calling the signIn API instead of signUp, and since
                        // these APIs are tenant specific, then it will return
                        // wrong credentials error even if the password is correct.
                        // Notice that we also check for if the email is fake or not,
                        // cause if it is fake, then we should not consider it as setup
                        // so that the frontend asks the user to enter an email,
                        // or uses the email of another login method.
                        if (loginMethod.recipeId === Recipe.RECIPE_ID && !utils_3.isFakeEmail(loginMethod.email)) {
                            return ["emailpassword"];
                        }
                    }
                    return [];
                });
                mfaInstance.addGetEmailsForFactorFromOtherRecipes((user, sessionRecipeUserId) => {
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
                    const orderedLoginMethodsByTimeJoinedOldestFirst = user.loginMethods.sort((a, b) => {
                        return a.timeJoined - b.timeJoined;
                    });
                    // MAIN LOGIC FOR THE FUNCTION STARTS HERE
                    let nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined = [];
                    for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                        // in the if statement below, we also check for if the email
                        // is fake or not cause if it is fake, then we consider that
                        // that login method is not setup for emailpassword, and instead
                        // we want to ask the user to enter their email, or to use
                        // another login method that has no fake email.
                        if (
                            orderedLoginMethodsByTimeJoinedOldestFirst[i].recipeId === Recipe.RECIPE_ID &&
                            !utils_3.isFakeEmail(orderedLoginMethodsByTimeJoinedOldestFirst[i].email)
                        ) {
                            // each emailpassword loginMethod for a user
                            // is guaranteed to have an email field and
                            // that is unique across other emailpassword loginMethods
                            // for this user.
                            nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined.push(
                                orderedLoginMethodsByTimeJoinedOldestFirst[i].email
                            );
                        }
                    }
                    if (nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined.length === 0) {
                        // this means that this factor is not setup.
                        // However, we still check if there is an email for this user
                        // from other loginMethods, and return those. The frontend
                        // will then call the signUp API eventually.
                        // first we check if the session loginMethod has an email
                        // and return that. Cause if it does, then the UX will be good
                        // in that the user will set a password for the the email
                        // they used to login into the current session.
                        // when constructing the emails array, we prioritize
                        // the session user's email cause it's a better UX
                        // for setting or asking for the password for the same email
                        // that the user used to login.
                        let emailsResult = [];
                        if (sessionLoginMethod.email !== undefined && !utils_3.isFakeEmail(sessionLoginMethod.email)) {
                            emailsResult = [sessionLoginMethod.email];
                        }
                        for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                            if (
                                orderedLoginMethodsByTimeJoinedOldestFirst[i].email !== undefined &&
                                !utils_3.isFakeEmail(orderedLoginMethodsByTimeJoinedOldestFirst[i].email)
                            ) {
                                // we have the if check below cause different loginMethods
                                // across different recipes can have the same email.
                                if (!emailsResult.includes(orderedLoginMethodsByTimeJoinedOldestFirst[i].email)) {
                                    emailsResult.push(orderedLoginMethodsByTimeJoinedOldestFirst[i].email);
                                }
                            }
                        }
                        return {
                            status: "OK",
                            factorIdToEmailsMap: {
                                emailpassword: emailsResult,
                            },
                        };
                    } else if (nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined.length === 1) {
                        // we return just this email cause if this emailpassword
                        // user is from the same tenant that the user is logging into,
                        // then they have to use this since new factor setup won't
                        // be allowed. Even if this emailpassword user is not from
                        // the same tenant as the user's session, we still return just
                        // this cause that way we still just have one emailpassword
                        // loginMethod for this user, just across different tenants.
                        return {
                            status: "OK",
                            factorIdToEmailsMap: {
                                emailpassword: nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined,
                            },
                        };
                    }
                    // Finally, we return all emails that have emailpassword login
                    // method for this user, but keep the session's email first
                    // if the session's email is in the list of
                    // nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined (for better UX)
                    let emailsResult = [];
                    if (
                        sessionLoginMethod.email !== undefined &&
                        nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined.includes(
                            sessionLoginMethod.email
                        )
                    ) {
                        emailsResult = [sessionLoginMethod.email];
                    }
                    for (let i = 0; i < nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined.length; i++) {
                        if (
                            !emailsResult.includes(nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined[i])
                        ) {
                            emailsResult.push(nonFakeEmailsThatHaveEmailPasswordLoginMethodOrderedByTimeJoined[i]);
                        }
                    }
                    return {
                        status: "OK",
                        factorIdToEmailsMap: {
                            emailpassword: emailsResult,
                        },
                    };
                });
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
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config, {
                    emailDelivery: undefined,
                });
                return Recipe.instance;
            } else {
                throw new Error("Emailpassword recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
}
exports.default = Recipe;
Recipe.instance = undefined;
Recipe.RECIPE_ID = "emailpassword";
