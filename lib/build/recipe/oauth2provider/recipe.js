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
const session_1 = require("../session");
const utils_2 = require("../../utils");
const tokenHookMap = new Map();
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
        this.saveTokensForHook = (sessionHandle, idToken, accessToken) => {
            tokenHookMap.set(sessionHandle, { idToken, accessToken });
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
            if (id === constants_1.REVOKE_TOKEN_PATH) {
                return revokeToken_1.default(this.apiImpl, options, userContext);
            }
            if (id === constants_1.INTROSPECT_TOKEN_PATH) {
                return introspectToken_1.default(this.apiImpl, options, userContext);
            }
            if (id === "token-hook") {
                const body = await options.req.getBodyAsJSONOrFormData();
                const sessionHandle = body.session.extra.sessionHandle;
                const tokens = tokenHookMap.get(sessionHandle);
                if (tokens !== undefined) {
                    const { idToken, accessToken } = tokens;
                    utils_2.send200Response(options.res, {
                        session: {
                            access_token: accessToken,
                            id_token: idToken,
                        },
                    });
                } else {
                    utils_2.send200Response(options.res, {});
                }
                return true;
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
                    this.getDefaultAccessTokenPayload.bind(this),
                    this.getDefaultIdTokenPayload.bind(this),
                    this.getDefaultUserInfoPayload.bind(this),
                    this.saveTokensForHook.bind(this)
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
                throw new Error("OAuth2Provider recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        combinedRemoteJWKSet_1.resetCombinedJWKS();
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
                // TODO: remove this once we get core support
                method: "post",
                pathWithoutApiBasePath: new normalisedURLPath_1.default("/oauth/token-hook"),
                id: "token-hook",
                disabled: false,
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
        const sessionInfo = await session_1.getSessionInformation(sessionHandle);
        if (sessionInfo === undefined) {
            throw new Error("Session not found");
        }
        let payload = {
            tId: sessionInfo.tenantId,
            rsub: sessionInfo.recipeUserId.getAsString(),
            sessionHandle: sessionHandle,
        };
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
            payload = Object.assign(Object.assign({}, payload), await fn(user, scopes, sessionHandle, userContext));
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
Recipe.RECIPE_ID = "oauth2provider";
Recipe.instance = undefined;
