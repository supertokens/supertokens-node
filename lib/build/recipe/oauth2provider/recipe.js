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
const error_1 = __importDefault(require("../../error"));
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const querier_1 = require("../../querier");
const recipeModule_1 = __importDefault(require("../../recipeModule"));
const auth_1 = __importDefault(require("./api/auth"));
const implementation_1 = __importDefault(require("./api/implementation"));
const login_1 = __importDefault(require("./api/login"));
const token_1 = __importDefault(require("./api/token"));
const loginInfo_1 = __importDefault(require("./api/loginInfo"));
const constants_1 = require("./constants");
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const utils_1 = require("./utils");
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const userInfo_1 = __importDefault(require("./api/userInfo"));
const combinedRemoteJWKSet_1 = require("../../combinedRemoteJWKSet");
const revokeToken_1 = __importDefault(require("./api/revokeToken"));
const introspectToken_1 = __importDefault(require("./api/introspectToken"));
const endSession_1 = require("./api/endSession");
const logout_1 = require("./api/logout");
const plugins_1 = require("../../plugins");
class Recipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        this.accessTokenBuilders = [];
        this.idTokenBuilders = [];
        this.userInfoBuilders = [];
        this.addUserInfoBuilderFromOtherRecipe = (userInfoBuilderFn) => {
            this.userInfoBuilders.push(userInfoBuilderFn);
        };
        this.addAccessTokenBuilderFromOtherRecipe = (accessTokenBuilders) => {
            this.accessTokenBuilders.push(accessTokenBuilders);
        };
        this.addIdTokenBuilderFromOtherRecipe = (idTokenBuilder) => {
            this.idTokenBuilders.push(idTokenBuilder);
        };
        this.handleAPIRequest = async (id, tenantId, req, res, _path, method, userContext) => {
            let options = {
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                recipeImplementation: this.recipeInterfaceImpl,
                req,
                res,
            };
            if (id === constants_1.LOGIN_PATH) {
                return (0, login_1.default)(this.apiImpl, options, userContext);
            }
            if (id === constants_1.TOKEN_PATH) {
                return (0, token_1.default)(this.apiImpl, options, userContext);
            }
            if (id === constants_1.AUTH_PATH) {
                return (0, auth_1.default)(this.apiImpl, options, userContext);
            }
            if (id === constants_1.LOGIN_INFO_PATH) {
                return (0, loginInfo_1.default)(this.apiImpl, options, userContext);
            }
            if (id === constants_1.USER_INFO_PATH) {
                return (0, userInfo_1.default)(this.apiImpl, tenantId, options, userContext);
            }
            if (id === constants_1.REVOKE_TOKEN_PATH) {
                return (0, revokeToken_1.default)(this.apiImpl, options, userContext);
            }
            if (id === constants_1.INTROSPECT_TOKEN_PATH) {
                return (0, introspectToken_1.default)(this.apiImpl, options, userContext);
            }
            if (id === constants_1.END_SESSION_PATH && method === "get") {
                return (0, endSession_1.endSessionGET)(this.apiImpl, options, userContext);
            }
            if (id === constants_1.END_SESSION_PATH && method === "post") {
                return (0, endSession_1.endSessionPOST)(this.apiImpl, options, userContext);
            }
            if (id === constants_1.LOGOUT_PATH && method === "post") {
                return (0, logout_1.logoutPOST)(this.apiImpl, options, userContext);
            }
            throw new Error("Should never come here: handleAPIRequest called with unknown id");
        };
        this.config = (0, utils_1.validateAndNormaliseUserInput)(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;
        {
            let builder = new supertokens_js_override_1.default(
                (0, recipeImplementation_1.default)(
                    querier_1.Querier.getNewInstanceOrThrowError(recipeId),
                    this.config,
                    appInfo,
                    this.getDefaultAccessTokenPayload.bind(this),
                    this.getDefaultIdTokenPayload.bind(this),
                    this.getDefaultUserInfoPayload.bind(this)
                )
            );
            this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        }
        {
            let builder = new supertokens_js_override_1.default((0, implementation_1.default)());
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
                    )
                );
                return Recipe.instance;
            } else {
                throw new Error("OAuth2Provider recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        (0, combinedRemoteJWKSet_1.resetCombinedJWKS)();
        Recipe.instance = undefined;
    }
    /* RecipeModule functions */
    getAPIsHandled() {
        return [
            {
                method: "get",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.LOGIN_PATH),
                id: constants_1.LOGIN_PATH,
                disabled: this.apiImpl.loginGET === undefined,
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
            {
                method: "post",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.REVOKE_TOKEN_PATH),
                id: constants_1.REVOKE_TOKEN_PATH,
                disabled: this.apiImpl.revokeTokenPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.INTROSPECT_TOKEN_PATH),
                id: constants_1.INTROSPECT_TOKEN_PATH,
                disabled: this.apiImpl.introspectTokenPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.END_SESSION_PATH),
                id: constants_1.END_SESSION_PATH,
                disabled: this.apiImpl.endSessionGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.END_SESSION_PATH),
                id: constants_1.END_SESSION_PATH,
                disabled: this.apiImpl.endSessionPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.LOGOUT_PATH),
                id: constants_1.LOGOUT_PATH,
                disabled: this.apiImpl.logoutPOST === undefined,
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
    async getDefaultAccessTokenPayload(user, scopes, sessionHandle, userContext) {
        let payload = {};
        if (scopes.includes("email")) {
            payload.email = user === null || user === void 0 ? void 0 : user.emails[0];
            payload.email_verified = user.loginMethods.some(
                (lm) => lm.hasSameEmailAs(user === null || user === void 0 ? void 0 : user.emails[0]) && lm.verified
            );
            payload.emails = user.emails;
        }
        if (scopes.includes("phoneNumber")) {
            payload.phoneNumber = user === null || user === void 0 ? void 0 : user.phoneNumbers[0];
            payload.phoneNumber_verified = user.loginMethods.some(
                (lm) =>
                    lm.hasSamePhoneNumberAs(user === null || user === void 0 ? void 0 : user.phoneNumbers[0]) &&
                    lm.verified
            );
            payload.phoneNumbers = user.phoneNumbers;
        }
        for (const fn of this.accessTokenBuilders) {
            payload = Object.assign(Object.assign({}, payload), await fn(user, scopes, sessionHandle, userContext));
        }
        return payload;
    }
    async getDefaultIdTokenPayload(user, scopes, sessionHandle, userContext) {
        let payload = {};
        if (scopes.includes("email")) {
            payload.email = user === null || user === void 0 ? void 0 : user.emails[0];
            payload.email_verified = user.loginMethods.some(
                (lm) => lm.hasSameEmailAs(user === null || user === void 0 ? void 0 : user.emails[0]) && lm.verified
            );
            payload.emails = user.emails;
        }
        if (scopes.includes("phoneNumber")) {
            payload.phoneNumber = user === null || user === void 0 ? void 0 : user.phoneNumbers[0];
            payload.phoneNumber_verified = user.loginMethods.some(
                (lm) =>
                    lm.hasSamePhoneNumberAs(user === null || user === void 0 ? void 0 : user.phoneNumbers[0]) &&
                    lm.verified
            );
            payload.phoneNumbers = user.phoneNumbers;
        }
        for (const fn of this.idTokenBuilders) {
            payload = Object.assign(Object.assign({}, payload), await fn(user, scopes, sessionHandle, userContext));
        }
        return payload;
    }
    async getDefaultUserInfoPayload(user, accessTokenPayload, scopes, tenantId, userContext) {
        let payload = {
            sub: accessTokenPayload.sub,
        };
        if (scopes.includes("email")) {
            // TODO: try and get the email based on the user id of the entire user object
            payload.email = user === null || user === void 0 ? void 0 : user.emails[0];
            payload.email_verified = user.loginMethods.some(
                (lm) => lm.hasSameEmailAs(user === null || user === void 0 ? void 0 : user.emails[0]) && lm.verified
            );
            payload.emails = user.emails;
        }
        if (scopes.includes("phoneNumber")) {
            payload.phoneNumber = user === null || user === void 0 ? void 0 : user.phoneNumbers[0];
            payload.phoneNumber_verified = user.loginMethods.some(
                (lm) =>
                    lm.hasSamePhoneNumberAs(user === null || user === void 0 ? void 0 : user.phoneNumbers[0]) &&
                    lm.verified
            );
            payload.phoneNumbers = user.phoneNumbers;
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
Recipe.RECIPE_ID = "oauth2provider";
Recipe.instance = undefined;
exports.default = Recipe;
