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

import RecipeModule from "../../recipeModule";
import {
    TypeInput,
    TypeNormalisedInput,
    RecipeInterface,
    APIInterface,
    VerifySessionOptions,
    SessionClaimValidator,
    SessionClaim,
    SessionContainerInterface,
} from "./types";
import STError from "./error";
import { validateAndNormaliseUserInput } from "./utils";
import { NormalisedAppinfo, RecipeListFunction, APIHandled, HTTPMethod, UserContext } from "../../types";
import handleRefreshAPI from "./api/refresh";
import signOutAPI from "./api/signout";
import { REFRESH_API_PATH, SIGNOUT_API_PATH } from "./constants";
import NormalisedURLPath from "../../normalisedURLPath";
import {
    clearSessionFromAllTokenTransferMethods,
    getCORSAllowedHeaders as getCORSAllowedHeadersFromCookiesAndHeaders,
} from "./cookieAndHeaders";
import RecipeImplementation from "./recipeImplementation";
import APIImplementation from "./api/implementation";
import type { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { APIOptions } from ".";
import { logDebugMessage } from "../../logger";
import { resetCombinedJWKS } from "../../combinedRemoteJWKSet";
import { isTestEnv } from "../../utils";
import { applyPlugins } from "../../plugins";
import type SuperTokens from "../../supertokens";
import { RecipeUserId } from "../..";
import { createNewSessionInRequest, getSessionFromRequest } from "./sessionRequestFunctions";

// For Express
export default class SessionRecipe extends RecipeModule {
    private static instance: SessionRecipe | undefined = undefined;
    static RECIPE_ID = "session" as const;

    private claimsAddedByOtherRecipes: SessionClaim<any>[] = [];
    private claimValidatorsAddedByOtherRecipes: SessionClaimValidator[] = [];

    config: TypeNormalisedInput;

    recipeInterfaceImpl: RecipeInterface;

    apiImpl: APIInterface;

    isInServerlessEnv: boolean;

    constructor(
        stInstance: SuperTokens,
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config?: TypeInput
    ) {
        super(stInstance, recipeId, appInfo);
        this.config = validateAndNormaliseUserInput(this, appInfo, config);

        const antiCsrfToLog: string =
            typeof this.config.antiCsrfFunctionOrString === "string"
                ? this.config.antiCsrfFunctionOrString
                : "function";

        logDebugMessage("session init: antiCsrf: " + antiCsrfToLog);
        logDebugMessage("session init: cookieDomain: " + this.config.cookieDomain);
        const sameSiteToPrint =
            config !== undefined && config.cookieSameSite !== undefined ? config.cookieSameSite : "default function";
        logDebugMessage("session init: cookieSameSite: " + sameSiteToPrint);
        logDebugMessage("session init: cookieSecure: " + this.config.cookieSecure);
        logDebugMessage("session init: refreshTokenPath: " + this.config.refreshTokenPath.getAsStringDangerous());
        logDebugMessage("session init: sessionExpiredStatusCode: " + this.config.sessionExpiredStatusCode);

        this.isInServerlessEnv = isInServerlessEnv;

        let builder = new OverrideableBuilder(
            RecipeImplementation(this.querier, this.config, this.getAppInfo(), () => this.recipeInterfaceImpl)
        );
        this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();

        {
            let builder = new OverrideableBuilder(APIImplementation(this.stInstance, this));
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }

    static getInstanceOrThrowError(): SessionRecipe {
        if (SessionRecipe.instance !== undefined) {
            return SessionRecipe.instance;
        }
        throw new Error(
            "Initialisation not done. Did you forget to call the SuperTokens.init or Session.init function?"
        );
    }

    static init(config?: TypeInput): RecipeListFunction {
        return (stInstance, appInfo, isInServerlessEnv, plugins) => {
            if (SessionRecipe.instance === undefined) {
                SessionRecipe.instance = new SessionRecipe(
                    stInstance,
                    SessionRecipe.RECIPE_ID,
                    appInfo,
                    isInServerlessEnv,
                    applyPlugins(SessionRecipe.RECIPE_ID, config, plugins ?? [])
                );
                return SessionRecipe.instance;
            } else {
                throw new Error("Session recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }

    static reset() {
        if (!isTestEnv()) {
            throw new Error("calling testing function in non testing env");
        }
        SessionRecipe.instance = undefined;
        resetCombinedJWKS();
    }

    addClaimFromOtherRecipe = (claim: SessionClaim<any>) => {
        // We are throwing here (and not in addClaimValidatorFromOtherRecipe) because if multiple
        // claims are added with the same key they will overwrite each other. Validators will all run
        // and work as expected even if they are added multiple times.
        if (this.claimsAddedByOtherRecipes.some((c) => c.key === claim.key)) {
            throw new Error("Claim added by multiple recipes");
        }
        this.claimsAddedByOtherRecipes.push(claim);
    };

    getClaimsAddedByOtherRecipes = (): SessionClaim<any>[] => {
        return this.claimsAddedByOtherRecipes;
    };

    addClaimValidatorFromOtherRecipe = (builder: SessionClaimValidator) => {
        this.claimValidatorsAddedByOtherRecipes.push(builder);
    };

    getClaimValidatorsAddedByOtherRecipes = (): SessionClaimValidator[] => {
        return this.claimValidatorsAddedByOtherRecipes;
    };

    // abstract instance functions below...............

    getAPIsHandled = (): APIHandled[] => {
        let apisHandled: APIHandled[] = [
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(REFRESH_API_PATH),
                id: REFRESH_API_PATH,
                disabled: this.apiImpl.refreshPOST === undefined,
            },
            {
                method: "post",
                pathWithoutApiBasePath: new NormalisedURLPath(SIGNOUT_API_PATH),
                id: SIGNOUT_API_PATH,
                disabled: this.apiImpl.signOutPOST === undefined,
            },
        ];

        return apisHandled;
    };

    handleAPIRequest = async (
        id: string,
        _tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        _method: HTTPMethod,
        userContext: UserContext
    ): Promise<boolean> => {
        let options: APIOptions = {
            config: this.config,
            recipeId: this.getRecipeId(),
            isInServerlessEnv: this.isInServerlessEnv,
            recipeImplementation: this.recipeInterfaceImpl,
            req,
            res,
        };
        if (id === REFRESH_API_PATH) {
            return await handleRefreshAPI(this.apiImpl, options, userContext);
        } else if (id === SIGNOUT_API_PATH) {
            return await signOutAPI(this.stInstance, this.apiImpl, options, userContext);
        } else {
            return false;
        }
    };

    handleError = async (err: STError, request: BaseRequest, response: BaseResponse, userContext: UserContext) => {
        if (err.fromRecipe === SessionRecipe.RECIPE_ID) {
            if (err.type === STError.UNAUTHORISED) {
                logDebugMessage("errorHandler: returning UNAUTHORISED");
                if (
                    err.payload === undefined ||
                    err.payload.clearTokens === undefined ||
                    err.payload.clearTokens === true
                ) {
                    logDebugMessage("errorHandler: Clearing tokens because of UNAUTHORISED response");
                    clearSessionFromAllTokenTransferMethods(this.config, response, request, userContext);
                }
                return await this.config.errorHandlers.onUnauthorised(err.message, request, response, userContext);
            } else if (err.type === STError.TRY_REFRESH_TOKEN) {
                logDebugMessage("errorHandler: returning TRY_REFRESH_TOKEN");
                return await this.config.errorHandlers.onTryRefreshToken(err.message, request, response, userContext);
            } else if (err.type === STError.TOKEN_THEFT_DETECTED) {
                logDebugMessage("errorHandler: returning TOKEN_THEFT_DETECTED");
                logDebugMessage("errorHandler: Clearing tokens because of TOKEN_THEFT_DETECTED response");
                clearSessionFromAllTokenTransferMethods(this.config, response, request, userContext);
                return await this.config.errorHandlers.onTokenTheftDetected(
                    err.payload.sessionHandle,
                    err.payload.userId,
                    err.payload.recipeUserId,
                    request,
                    response,
                    userContext
                );
            } else if (err.type === STError.INVALID_CLAIMS) {
                return await this.config.errorHandlers.onInvalidClaim(err.payload, request, response, userContext);
            } else if (err.type === STError.CLEAR_DUPLICATE_SESSION_COOKIES) {
                logDebugMessage("errorHandler: returning CLEAR_DUPLICATE_SESSION_COOKIES");
                // This error occurs in the `refreshPOST` API when multiple session
                // cookies are found in the request and the user has set `olderCookieDomain`.
                // We remove session cookies from the olderCookieDomain. The response must return `200 OK`
                // to avoid logging out the user, allowing the session to continue with the valid cookie.
                return await this.config.errorHandlers.onClearDuplicateSessionCookies(
                    err.message,
                    request,
                    response,
                    userContext
                );
            } else {
                throw err;
            }
        } else {
            throw err;
        }
    };

    getAllCORSHeaders = (): string[] => {
        let corsHeaders: string[] = [...getCORSAllowedHeadersFromCookiesAndHeaders()];

        return corsHeaders;
    };

    isErrorFromThisRecipe = (err: any): err is STError => {
        return STError.isErrorFromSuperTokens(err) && err.fromRecipe === SessionRecipe.RECIPE_ID;
    };

    verifySession = async (
        options: VerifySessionOptions | undefined,
        request: BaseRequest,
        response: BaseResponse,
        userContext: UserContext
    ) => {
        return await this.apiImpl.verifySession({
            verifySessionOptions: options,
            options: {
                config: this.config,
                req: request,
                res: response,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                recipeImplementation: this.recipeInterfaceImpl,
            },
            userContext,
        });
    };
    getRequiredClaimValidators = async (
        session: SessionContainerInterface,
        overrideGlobalClaimValidators: VerifySessionOptions["overrideGlobalClaimValidators"],
        userContext: UserContext
    ) => {
        const claimValidatorsAddedByOtherRecipes = this.getClaimValidatorsAddedByOtherRecipes();
        const globalClaimValidators: SessionClaimValidator[] = await this.recipeInterfaceImpl.getGlobalClaimValidators({
            userId: session.getUserId(userContext),
            recipeUserId: session.getRecipeUserId(userContext),
            tenantId: session.getTenantId(userContext),
            claimValidatorsAddedByOtherRecipes,
            userContext,
        });

        return overrideGlobalClaimValidators !== undefined
            ? await overrideGlobalClaimValidators(globalClaimValidators, session, userContext)
            : globalClaimValidators;
    };

    createNewSession = async (input: {
        req: any;
        res: any;
        tenantId: string;
        recipeUserId: RecipeUserId;
        accessTokenPayload: any;
        sessionDataInDatabase: any;
        userContext: UserContext;
    }) => {
        let user = await this.stInstance
            .getRecipeInstanceOrThrow("accountlinking")
            .recipeInterfaceImpl.getUser({ userId: input.recipeUserId.getAsString(), userContext: input.userContext });
        let userId = input.recipeUserId.getAsString();
        if (user !== undefined) {
            userId = user.id;
        }
        return await createNewSessionInRequest({
            req: input.req,
            res: input.res,
            userContext: input.userContext,
            recipeInstance: this,
            stInstance: this.stInstance,
            accessTokenPayload: input.accessTokenPayload,
            userId,
            recipeUserId: input.recipeUserId,
            config: this.config,
            appInfo: this.stInstance.appInfo,
            sessionDataInDatabase: input.sessionDataInDatabase,
            tenantId: input.tenantId,
        });
    };

    getSession = async (input: { req: any; res: any; options?: VerifySessionOptions; userContext: UserContext }) => {
        return getSessionFromRequest({
            req: input.req,
            res: input.res,
            recipeInterfaceImpl: this.recipeInterfaceImpl,
            recipeInstance: this,
            stInstance: this.stInstance,
            config: this.config,
            options: input.options,
            userContext: input.userContext, // userContext is normalized inside the function
        });
    };
}
