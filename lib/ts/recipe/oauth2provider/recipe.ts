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

import SuperTokensError from "../../error";
import error from "../../error";
import type { BaseRequest, BaseResponse } from "../../framework";
import NormalisedURLPath from "../../normalisedURLPath";
import { Querier } from "../../querier";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, JSONObject, NormalisedAppinfo, RecipeListFunction, UserContext } from "../../types";
import authGET from "./api/auth";
import APIImplementation from "./api/implementation";
import loginAPI from "./api/login";
import tokenPOST from "./api/token";
import loginInfoGET from "./api/loginInfo";
import {
    AUTH_PATH,
    INTROSPECT_TOKEN_PATH,
    LOGIN_INFO_PATH,
    LOGIN_PATH,
    LOGOUT_PATH,
    END_SESSION_PATH,
    REVOKE_TOKEN_PATH,
    TOKEN_PATH,
    USER_INFO_PATH,
} from "./constants";
import RecipeImplementation from "./recipeImplementation";
import {
    APIInterface,
    PayloadBuilderFunction,
    RecipeInterface,
    TypeInput,
    TypeNormalisedInput,
    UserInfo,
    UserInfoBuilderFunction,
} from "./types";
import { validateAndNormaliseUserInput } from "./utils";
import OverrideableBuilder from "supertokens-js-override";
import { User } from "../../user";
import userInfoGET from "./api/userInfo";
import { resetCombinedJWKS } from "../../combinedRemoteJWKSet";
import revokeTokenPOST from "./api/revokeToken";
import introspectTokenPOST from "./api/introspectToken";
import { endSessionGET, endSessionPOST } from "./api/endSession";
import { logoutPOST } from "./api/logout";
import { getSessionInformation } from "../session";
import { send200Response } from "../../utils";

const tokenHookMap = new Map<string, { idToken: JSONObject; accessToken: JSONObject }>();

export default class Recipe extends RecipeModule {
    static RECIPE_ID = "oauth2provider";
    private static instance: Recipe | undefined = undefined;
    private accessTokenBuilders: PayloadBuilderFunction[] = [];
    private idTokenBuilders: PayloadBuilderFunction[] = [];
    private userInfoBuilders: UserInfoBuilderFunction[] = [];

    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;

    constructor(recipeId: string, appInfo: NormalisedAppinfo, isInServerlessEnv: boolean, config?: TypeInput) {
        super(recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);
        this.isInServerlessEnv = isInServerlessEnv;

        {
            let builder = new OverrideableBuilder(
                RecipeImplementation(
                    Querier.getNewInstanceOrThrowError(recipeId),
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
            let builder = new OverrideableBuilder(APIImplementation());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }

    /* Init functions */

    static getInstance(): Recipe | undefined {
        return Recipe.instance;
    }
    static getInstanceOrThrowError(): Recipe {
        if (Recipe.instance !== undefined) {
            return Recipe.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the Jwt.init function?");
    }

    static init(config?: TypeInput): RecipeListFunction {
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
        resetCombinedJWKS();
        Recipe.instance = undefined;
    }

    addUserInfoBuilderFromOtherRecipe = (userInfoBuilderFn: UserInfoBuilderFunction) => {
        this.userInfoBuilders.push(userInfoBuilderFn);
    };
    addAccessTokenBuilderFromOtherRecipe = (accessTokenBuilders: PayloadBuilderFunction) => {
        this.accessTokenBuilders.push(accessTokenBuilders);
    };
    addIdTokenBuilderFromOtherRecipe = (idTokenBuilder: PayloadBuilderFunction) => {
        this.idTokenBuilders.push(idTokenBuilder);
    };
    saveTokensForHook = (sessionHandle: string, idToken: JSONObject, accessToken: JSONObject) => {
        tokenHookMap.set(sessionHandle, { idToken, accessToken });
    };

    /* RecipeModule functions */

    getAPIsHandled(): APIHandled[] {
        return [
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(LOGIN_PATH),
                id: LOGIN_PATH,
                disabled: this.apiImpl.loginGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(TOKEN_PATH),
                id: TOKEN_PATH,
                disabled: this.apiImpl.tokenPOST === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(AUTH_PATH),
                id: AUTH_PATH,
                disabled: this.apiImpl.authGET === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(LOGIN_INFO_PATH),
                id: LOGIN_INFO_PATH,
                disabled: this.apiImpl.loginInfoGET === undefined,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(USER_INFO_PATH),
                id: USER_INFO_PATH,
                disabled: this.apiImpl.userInfoGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(REVOKE_TOKEN_PATH),
                id: REVOKE_TOKEN_PATH,
                disabled: this.apiImpl.revokeTokenPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(INTROSPECT_TOKEN_PATH),
                id: INTROSPECT_TOKEN_PATH,
                disabled: this.apiImpl.introspectTokenPOST === undefined,
            },
            {
                // TODO: remove this once we get core support
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath("/oauth/token-hook"),
                id: "token-hook",
                disabled: false,
            },
            {
                method: "get",
                pathWithoutApiBasePath: new NormalisedURLPath(END_SESSION_PATH),
                id: END_SESSION_PATH,
                disabled: this.apiImpl.endSessionGET === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(END_SESSION_PATH),
                id: END_SESSION_PATH,
                disabled: this.apiImpl.endSessionPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(LOGOUT_PATH),
                id: LOGOUT_PATH,
                disabled: this.apiImpl.logoutPOST === undefined,
            },
        ];
    }

    handleAPIRequest = async (
        id: string,
        tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        method: HTTPMethod,
        userContext: UserContext
    ): Promise<boolean> => {
        let options = {
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
        };

        if (id === LOGIN_PATH) {
            return loginAPI(this.apiImpl, options, userContext);
        }
        if (id === TOKEN_PATH) {
            return tokenPOST(this.apiImpl, options, userContext);
        }
        if (id === AUTH_PATH) {
            return authGET(this.apiImpl, options, userContext);
        }
        if (id === LOGIN_INFO_PATH) {
            return loginInfoGET(this.apiImpl, options, userContext);
        }
        if (id === USER_INFO_PATH) {
            return userInfoGET(this.apiImpl, tenantId, options, userContext);
        }
        if (id === REVOKE_TOKEN_PATH) {
            return revokeTokenPOST(this.apiImpl, options, userContext);
        }
        if (id === INTROSPECT_TOKEN_PATH) {
            return introspectTokenPOST(this.apiImpl, options, userContext);
        }
        if (id === END_SESSION_PATH && method === "get") {
            return endSessionGET(this.apiImpl, options, userContext);
        }
        if (id === END_SESSION_PATH && method === "post") {
            return endSessionPOST(this.apiImpl, options, userContext);
        }
        if (id === LOGOUT_PATH && method === "post") {
            return logoutPOST(this.apiImpl, options, userContext);
        }
        if (id === "token-hook") {
            const body = await options.req.getBodyAsJSONOrFormData();
            const sessionHandle = body.session.extra.sessionHandle;
            const tokens = tokenHookMap.get(sessionHandle);

            if (tokens !== undefined) {
                const { idToken, accessToken } = tokens;
                send200Response(options.res, {
                    session: {
                        access_token: accessToken,
                        id_token: idToken,
                    },
                });
            } else {
                send200Response(options.res, {});
            }
            return true;
        }
        throw new Error("Should never come here: handleAPIRequest called with unknown id");
    };

    handleError(error: error, _: BaseRequest, __: BaseResponse, _userContext: UserContext): Promise<void> {
        throw error;
    }

    getAllCORSHeaders(): string[] {
        return [];
    }

    isErrorFromThisRecipe(err: any): err is error {
        return SuperTokensError.isErrorFromSuperTokens(err) && err.fromRecipe === Recipe.RECIPE_ID;
    }

    async getDefaultAccessTokenPayload(user: User, scopes: string[], sessionHandle: string, userContext: UserContext) {
        const sessionInfo = await getSessionInformation(sessionHandle);
        if (sessionInfo === undefined) {
            throw new Error("Session not found");
        }
        let payload: JSONObject = {
            iss: this.appInfo.apiDomain.getAsStringDangerous() + this.appInfo.apiBasePath.getAsStringDangerous(),
            tId: sessionInfo.tenantId,
            rsub: sessionInfo.recipeUserId.getAsString(),
            sessionHandle: sessionHandle,
        };

        for (const fn of this.accessTokenBuilders) {
            payload = {
                ...payload,
                ...(await fn(user, scopes, sessionHandle, userContext)),
            };
        }

        return payload;
    }
    async getDefaultIdTokenPayload(user: User, scopes: string[], sessionHandle: string, userContext: UserContext) {
        let payload: JSONObject = {
            iss: this.appInfo.apiDomain.getAsStringDangerous() + this.appInfo.apiBasePath.getAsStringDangerous(),
        };
        if (scopes.includes("email")) {
            payload.email = user?.emails[0];
            payload.email_verified = user.loginMethods.some((lm) => lm.hasSameEmailAs(user?.emails[0]) && lm.verified);
        }
        if (scopes.includes("phoneNumber")) {
            payload.phoneNumber = user?.phoneNumbers[0];
            payload.phoneNumber_verified = user.loginMethods.some(
                (lm) => lm.hasSamePhoneNumberAs(user?.phoneNumbers[0]) && lm.verified
            );
        }

        for (const fn of this.idTokenBuilders) {
            payload = {
                ...payload,
                ...(await fn(user, scopes, sessionHandle, userContext)),
            };
        }

        return payload;
    }

    async getDefaultUserInfoPayload(
        user: User,
        accessTokenPayload: JSONObject,
        scopes: string[],
        tenantId: string,
        userContext: UserContext
    ) {
        let payload: JSONObject = {
            sub: accessTokenPayload.sub,
        };
        if (scopes.includes("email")) {
            payload.email = user?.emails[0];
            payload.email_verified = user.loginMethods.some((lm) => lm.hasSameEmailAs(user?.emails[0]) && lm.verified);
        }
        if (scopes.includes("phoneNumber")) {
            payload.phoneNumber = user?.phoneNumbers[0];
            payload.phoneNumber_verified = user.loginMethods.some(
                (lm) => lm.hasSamePhoneNumberAs(user?.phoneNumbers[0]) && lm.verified
            );
        }

        for (const fn of this.userInfoBuilders) {
            payload = {
                ...payload,
                ...(await fn(user, accessTokenPayload, scopes, tenantId, userContext)),
            };
        }

        return payload as UserInfo;
    }
}
