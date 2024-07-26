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
const error_1 = __importDefault(require("../../error"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const querier_1 = require("../../querier");
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const auth_1 = __importDefault(require("./api/auth"));
const consent_1 = __importDefault(require("./api/consent"));
const implementation_1 = __importDefault(require("./api/implementation"));
const login_1 = __importDefault(require("./api/login"));
const logout_1 = __importDefault(require("./api/logout"));
const token_1 = __importDefault(require("./api/token"));
const loginInfo_1 = __importDefault(require("./api/loginInfo"));
const constants_1 = require("./constants");
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const utils_1 = require("./utils");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const userInfo_1 = __importDefault(require("./api/userInfo"));
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        this.idTokenBuilders = [];
        this.userInfoBuilders = [];
        this.addUserInfoBuilderFromOtherRecipe = (userInfoBuilderFn) => {
            this.userInfoBuilders.push(userInfoBuilderFn);
        };
        this.handleAPIRequest = async (id, tenantId, req, res, _path, _method, userContext) => {
            let options = {
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                recipeImplementation: this.recipeInterfaceImpl,
                req,
                res,
            };
            if (id === constants_1.LOGIN_PATH) {
                return login_1.default(this.apiImpl, options, userContext);
            }
            if (id === constants_1.LOGOUT_PATH) {
                return logout_1.default(this.apiImpl, options, userContext);
            }
            if (id === constants_1.CONSENT_PATH) {
                return consent_1.default(this.apiImpl, options, userContext);
            }
            if (id === constants_1.TOKEN_PATH) {
                return token_1.default(this.apiImpl, options, userContext);
            }
            if (id === constants_1.AUTH_PATH) {
                return auth_1.default(this.apiImpl, options, userContext);
            }
            if (id === constants_1.LOGIN_INFO_PATH) {
                return loginInfo_1.default(this.apiImpl, options, userContext);
            }
            if (id === constants_1.USER_INFO_PATH) {
                return userInfo_1.default(this.apiImpl, tenantId, options, userContext);
            }
            throw new Error("Should never come here: handleAPIRequest called with unknown id");
        };
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new supertokens_js_override_1.default(
                recipeImplementation_1.default(
                    querier_1.Querier.getNewInstanceOrThrowError(recipeId),
                    this.config,
                    appInfo,
                    this.getDefaultIdTokenPayload.bind(this),
                    this.getDefaultUserInfoPayload.bind(this)
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }
    /* Init functions */
    static getInstance() {
        return Recipe.instance;
    }
    static getInstanceOrThrowError() {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Jwt.init function?");
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (Recipe.instance === undefined) {
                Recipe.instance = new Recipe(Recipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return Recipe.instance;
            } else {
                throw new Error("OAuth2 recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        Recipe.instance = undefined;
    }
    /* RecipeModule functions */
    getAPIsHandled() {
        return [
            {
                method: "post",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.LOGIN_PATH),
                id: constants_1.LOGIN_PATH,
                disabled: this.apiImpl.loginPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.LOGIN_PATH),
                id: constants_1.LOGIN_PATH,
                disabled: this.apiImpl.loginGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.LOGOUT_PATH),
                id: constants_1.LOGOUT_PATH,
                disabled: this.apiImpl.logoutPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.LOGOUT_PATH),
                id: constants_1.LOGOUT_PATH,
                disabled: this.apiImpl.logoutGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.CONSENT_PATH),
                id: constants_1.CONSENT_PATH,
                disabled: this.apiImpl.consentPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.CONSENT_PATH),
                id: constants_1.CONSENT_PATH,
                disabled: this.apiImpl.consentGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.TOKEN_PATH),
                id: constants_1.TOKEN_PATH,
                disabled: this.apiImpl.tokenPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.AUTH_PATH),
                id: constants_1.AUTH_PATH,
                disabled: this.apiImpl.authGET === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.LOGIN_INFO_PATH),
                id: constants_1.LOGIN_INFO_PATH,
                disabled: this.apiImpl.loginInfoGET === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.USER_INFO_PATH),
                id: constants_1.USER_INFO_PATH,
                disabled: this.apiImpl.userInfoGET === undefined,
            },
        ];
    }
    handleError(error, _, __, _userContext) {
        throw error;
    }
    getAllCORSHeaders() {
        return [];
    }
    isErrorFromThisRecipe(err) {
        return error_1.default.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }
    async getDefaultIdTokenPayload(user, scopes, userContext) {
        let payload = {};
        if (scopes.includes("email")) {
            payload.email = user === null || user === void 0 ? void 0 : user.emails[0];
            payload.email_verified = user.loginMethods.some(
                (lm) => lm.hasSameEmailAs(user === null || user === void 0 ? void 0 : user.emails[0]) && lm.verified
            );
        }
        if (scopes.includes("phoneNumber")) {
            payload.phoneNumber = user === null || user === void 0 ? void 0 : user.phoneNumbers[0];
            payload.phoneNumber_verified = user.loginMethods.some(
                (lm) =>
                    lm.hasSamePhoneNumberAs(user === null || user === void 0 ? void 0 : user.phoneNumbers[0]) &&
                    lm.verified
            );
        }
        for (const fn of this.idTokenBuilders) {
            payload = Object.assign(Object.assign({}, payload), await fn(user, scopes, userContext));
        }
        return payload;
    }
    async getDefaultUserInfoPayload(user, accessTokenPayload, scopes, tenantId, userContext) {
        let payload = {
            sub: accessTokenPayload.sub,
        };
        if (scopes.includes("email")) {
            payload.email = user === null || user === void 0 ? void 0 : user.emails[0];
            payload.email_verified = user.loginMethods.some(
                (lm) => lm.hasSameEmailAs(user === null || user === void 0 ? void 0 : user.emails[0]) && lm.verified
            );
        }
        if (scopes.includes("phoneNumber")) {
            payload.phoneNumber = user === null || user === void 0 ? void 0 : user.phoneNumbers[0];
            payload.phoneNumber_verified = user.loginMethods.some(
                (lm) =>
                    lm.hasSamePhoneNumberAs(user === null || user === void 0 ? void 0 : user.phoneNumbers[0]) &&
                    lm.verified
            );
        }
        for (const fn of this.userInfoBuilders) {
            payload = Object.assign(
                Object.assign({}, payload),
                await fn(user, accessTokenPayload, scopes, tenantId, userContext)
            );
        }
        return payload;
    }
}
exports.default = Recipe;
Recipe.RECIPE_ID = "oauth2";
Recipe.instance = undefined;
