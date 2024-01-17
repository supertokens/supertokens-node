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
const utils_1 = require("./utils");
const recipe_1 = __importDefault(require("../multitenancy/recipe"));
const error_1 = __importDefault(require("./error"));
const constants_1 = require("./constants");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const signinup_1 = __importDefault(require("./api/signinup"));
const authorisationUrl_1 = __importDefault(require("./api/authorisationUrl"));
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const implementation_1 = __importDefault(require("./api/implementation"));
const querier_1 = require("../../querier");
const appleRedirect_1 = __importDefault(require("./api/appleRedirect"));
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const postSuperTokensInitCallbacks_1 = require("../../postSuperTokensInitCallbacks");
const recipe_2 = __importDefault(require("../multifactorauth/recipe"));
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config, _recipes, _ingredients) {
        super(recipeId, appInfo);
        this.getAPIsHandled = () => {
            return [
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGN_IN_UP_API),
                    id: constants_1.SIGN_IN_UP_API,
                    disabled: this.apiImpl.signInUpPOST === undefined,
                },
                {
                    method: "get",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.AUTHORISATION_API),
                    id: constants_1.AUTHORISATION_API,
                    disabled: this.apiImpl.authorisationUrlGET === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.APPLE_REDIRECT_HANDLER),
                    id: constants_1.APPLE_REDIRECT_HANDLER,
                    disabled: this.apiImpl.appleRedirectHandlerPOST === undefined,
                },
            ];
        };
        this.handleAPIRequest = async (id, tenantId, req, res, _path, _method, userContext) => {
            let options = {
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                recipeImplementation: this.recipeInterfaceImpl,
                providers: this.providers,
                req,
                res,
                appInfo: this.getAppInfo(),
            };
            if (id === constants_1.SIGN_IN_UP_API) {
                return await signinup_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.AUTHORISATION_API) {
                return await authorisationUrl_1.default(this.apiImpl, tenantId, options, userContext);
            } else if (id === constants_1.APPLE_REDIRECT_HANDLER) {
                return await appleRedirect_1.default(this.apiImpl, options, userContext);
            }
            return false;
        };
        this.handleError = async (err, _request, _response) => {
            throw err;
        };
        this.getAllCORSHeaders = () => {
            return [];
        };
        this.isErrorFromThisRecipe = (err) => {
            return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
        };
        this.config = utils_1.validateAndNormaliseUserInput(appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        this.providers = this.config.signInAndUpFeature.providers;
        {
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(querier_1.Querier.getNewInstanceOrThrowError(recipeId), this.providers)
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
        postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.addPostInitCallback(() => {
            const mtRecipe = recipe_1.default.getInstance();
            if (mtRecipe !== undefined) {
                mtRecipe.staticThirdPartyProviders = this.config.signInAndUpFeature.providers;
            }
            const mfaInstance = recipe_2.default.getInstance();
            if (mfaInstance !== undefined) {
                mfaInstance.addGetAllFactorsFromOtherRecipesFunc((tenantConfig) => {
                    if (tenantConfig.thirdParty.enabled === false) {
                        return [];
                    }
                    return ["thirdparty"];
                });
                mfaInstance.addGetFactorsSetupForUserFromOtherRecipes(async (user) => {
                    for (const loginMethod of user.loginMethods) {
                        // We deliberately do not check for matching tenantId because
                        // even if the user is logging into a tenant does not have
                        // thirdparty loginMethod, the frontend will call the
                        // same signinup API as if there was a thirdparty user.
                        // the only diff is that a new recipe user will be created,
                        // which is OK.
                        // Notice that we also check for if the email is fake or not,
                        // cause if it is fake, then we should not consider it as setup
                        // so that the frontend asks the user to enter an email,
                        // or uses the email of another login method.
                        if (loginMethod.recipeId === Recipe.RECIPE_ID && !utils_1.isFakeEmail(loginMethod.email)) {
                            return ["thirdparty"];
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
                    let nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined = [];
                    for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                        // in the if statement below, we also check for if the email
                        // is fake or not cause if it is fake, then we consider that
                        // that login method is not setup for thirdparty, and instead
                        // we want to ask the user to enter their email, or to use
                        // another login method that has no fake email.
                        if (
                            orderedLoginMethodsByTimeJoinedOldestFirst[i].recipeId === Recipe.RECIPE_ID &&
                            !utils_1.isFakeEmail(orderedLoginMethodsByTimeJoinedOldestFirst[i].email)
                        ) {
                            // each thirdparty loginMethod for a user
                            // is guaranteed to have an email field, however, it may not be unique across
                            // all thirdparty login methods.
                            if (
                                !nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined.includes(
                                    orderedLoginMethodsByTimeJoinedOldestFirst[i].email
                                )
                            ) {
                                nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined.push(
                                    orderedLoginMethodsByTimeJoinedOldestFirst[i].email
                                );
                            }
                        }
                    }
                    if (nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined.length === 0) {
                        // this means that this factor is not setup.
                        // However, we still check if there is an email for this user
                        // from other loginMethods, and return those. The frontend
                        // will then call the signUp API eventually.
                        // first we check if the session loginMethod has an email
                        // and return that. Cause if it does, then the UX will be good
                        // in that the user will ????.. this makes no sense TODO:...
                        // when constructing the emails array, we prioritize
                        // the session user's email cause it's a better UX
                        // for setting or asking for the password for the same email
                        // that the user used to login.
                        let emailsResult = [];
                        if (sessionLoginMethod.email !== undefined && !utils_1.isFakeEmail(sessionLoginMethod.email)) {
                            emailsResult = [sessionLoginMethod.email];
                        }
                        for (let i = 0; i < orderedLoginMethodsByTimeJoinedOldestFirst.length; i++) {
                            if (
                                orderedLoginMethodsByTimeJoinedOldestFirst[i].email !== undefined &&
                                !utils_1.isFakeEmail(orderedLoginMethodsByTimeJoinedOldestFirst[i].email)
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
                                thirdparty: emailsResult,
                            },
                        };
                    } else if (nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined.length === 1) {
                        // we return just this email cause if this thirdparty
                        // user is from the same tenant that the user is logging into,
                        // then they have to use this since new factor setup won't
                        // be allowed. Even if this thirdparty user is not from
                        // the same tenant as the user's session, we still return just
                        // this cause that way we still just have one thirdparty
                        // loginMethod for this user, just across different tenants.
                        return {
                            status: "OK",
                            factorIdToEmailsMap: {
                                thirdparty: nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined,
                            },
                        };
                    }
                    // Finally, we return all emails that have thirdparty login
                    // method for this user, but keep the session's email first
                    // if the session's email is in the list of
                    // nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined (for better UX)
                    let emailsResult = [];
                    if (
                        sessionLoginMethod.email !== undefined &&
                        nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined.includes(sessionLoginMethod.email)
                    ) {
                        emailsResult = [sessionLoginMethod.email];
                    }
                    for (let i = 0; i < nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined.length; i++) {
                        if (!emailsResult.includes(nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined[i])) {
                            emailsResult.push(nonFakeEmailsThatHaveThirdPartyLoginMethodOrderedByTimeJoined[i]);
                        }
                    }
                    return {
                        status: "OK",
                        factorIdToEmailsMap: {
                            thirdparty: emailsResult,
                        },
                    };
                });
            }
        });
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(
                    Recipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    config,
                    {},
                    {
                        emailDelivery: undefined,
                    }
                );
                return Recipe.instance;
            } else {
                throw new Error("ThirdParty recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
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
Recipe.RECIPE_ID = "thirdparty";
