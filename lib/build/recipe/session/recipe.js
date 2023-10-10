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
const refresh_1 = __importDefault(require("./api/refresh"));
const signout_1 = __importDefault(require("./api/signout"));
const constants_1 = require("./constants");
const normalisedURLPath_1 = __importDefault(require("../../normalisedURLPath"));
const cookieAndHeaders_1 = require("./cookieAndHeaders");
const recipeImplementation_1 = __importDefault(require("./recipeImplementation"));
const querier_1 = require("../../querier");
const implementation_1 = __importDefault(require("./api/implementation"));
const supertokens_js_override_1 = __importDefault(require("supertokens-js-override"));
const recipe_1 = __importDefault(require("../openid/recipe"));
const logger_1 = require("../../logger");
// For Express
class SessionRecipe extends recipeModule_1.default {
    constructor(recipeId, appInfo, isInServerlessEnv, config) {
        super(recipeId, appInfo);
        this.claimsAddedByOtherRecipes = [];
        this.claimValidatorsAddedByOtherRecipes = [];
        this.addClaimFromOtherRecipe = (claim) => {
            // We are throwing here (and not in addClaimValidatorFromOtherRecipe) because if multiple
            // claims are added with the same key they will overwrite each other. Validators will all run
            // and work as expected even if they are added multiple times.
            if (this.claimsAddedByOtherRecipes.some((c) => c.key === claim.key)) {
                throw new Error("Claim added by multiple recipes");
            }
            this.claimsAddedByOtherRecipes.push(claim);
        };
        this.getClaimsAddedByOtherRecipes = () => {
            return this.claimsAddedByOtherRecipes;
        };
        this.addClaimValidatorFromOtherRecipe = (builder) => {
            this.claimValidatorsAddedByOtherRecipes.push(builder);
        };
        this.getClaimValidatorsAddedByOtherRecipes = () => {
            return this.claimValidatorsAddedByOtherRecipes;
        };
        // abstract instance functions below...............
        this.getAPIsHandled = () => {
            let apisHandled = [
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.REFRESH_API_PATH),
                    id: constants_1.REFRESH_API_PATH,
                    disabled: this.apiImpl.refreshPOST === undefined,
                },
                {
                    method: "post",
                    pathWithoutApiBasePath: new normalisedURLPath_1.default(constants_1.SIGNOUT_API_PATH),
                    id: constants_1.SIGNOUT_API_PATH,
                    disabled: this.apiImpl.signOutPOST === undefined,
                },
            ];
            apisHandled.push(...this.openIdRecipe.getAPIsHandled());
            return apisHandled;
        };
        this.handleAPIRequest = async (id, tenantId, req, res, path, method, userContext) => {
            let options = {
                config: this.config,
                recipeId: this.getRecipeId(),
                isInServerlessEnv: this.isInServerlessEnv,
                recipeImplementation: this.recipeInterfaceImpl,
                req,
                res,
            };
            if (id === constants_1.REFRESH_API_PATH) {
                return await refresh_1.default(this.apiImpl, options, userContext);
            } else if (id === constants_1.SIGNOUT_API_PATH) {
                return await signout_1.default(this.apiImpl, options, userContext);
            } else {
                return await this.openIdRecipe.handleAPIRequest(id, tenantId, req, res, path, method, userContext);
            }
        };
        this.handleError = async (err, request, response, userContext) => {
            if (err.fromRecipe === SessionRecipe.RECIPE_ID) {
                if (err.type === error_1.default.UNAUTHORISED) {
                    logger_1.logDebugMessage("errorHandler: returning UNAUTHORISED");
                    if (
                        err.payload === undefined ||
                        err.payload.clearTokens === undefined ||
                        err.payload.clearTokens === true
                    ) {
                        logger_1.logDebugMessage("errorHandler: Clearing tokens because of UNAUTHORISED response");
                        cookieAndHeaders_1.clearSessionFromAllTokenTransferMethods(
                            this.config,
                            response,
                            request,
                            userContext
                        );
                    }
                    return await this.config.errorHandlers.onUnauthorised(err.message, request, response);
                } else if (err.type === error_1.default.TRY_REFRESH_TOKEN) {
                    logger_1.logDebugMessage("errorHandler: returning TRY_REFRESH_TOKEN");
                    return await this.config.errorHandlers.onTryRefreshToken(err.message, request, response);
                } else if (err.type === error_1.default.TOKEN_THEFT_DETECTED) {
                    logger_1.logDebugMessage("errorHandler: returning TOKEN_THEFT_DETECTED");
                    logger_1.logDebugMessage("errorHandler: Clearing tokens because of TOKEN_THEFT_DETECTED response");
                    cookieAndHeaders_1.clearSessionFromAllTokenTransferMethods(
                        this.config,
                        response,
                        request,
                        userContext
                    );
                    return await this.config.errorHandlers.onTokenTheftDetected(
                        err.payload.sessionHandle,
                        err.payload.userId,
                        err.payload.recipeUserId,
                        request,
                        response
                    );
                } else if (err.type === error_1.default.INVALID_CLAIMS) {
                    return await this.config.errorHandlers.onInvalidClaim(err.payload, request, response);
                } else {
                    throw err;
                }
            } else {
                return await this.openIdRecipe.handleError(err, request, response);
            }
        };
        this.getAllCORSHeaders = () => {
            let corsHeaders = [...cookieAndHeaders_1.getCORSAllowedHeaders()];
            corsHeaders.push(...this.openIdRecipe.getAllCORSHeaders());
            return corsHeaders;
        };
        this.isErrorFromThisRecipe = (err) => {
            return (
                error_1.default.isErrorFromSuperTokens(err) &&
                (err.fromRecipe === SessionRecipe.RECIPE_ID || this.openIdRecipe.isErrorFromThisRecipe(err))
            );
        };
        this.verifySession = async (options, request, response, userContext) => {
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
        this.config = utils_1.validateAndNormaliseUserInput(this, appInfo, config);
        const antiCsrfToLog =
            typeof this.config.antiCsrfFunctionOrString === "string"
                ? this.config.antiCsrfFunctionOrString
                : "function";
        logger_1.logDebugMessage("session init: antiCsrf: " + antiCsrfToLog);
        logger_1.logDebugMessage("session init: cookieDomain: " + this.config.cookieDomain);
        const sameSiteToPrint =
            config !== undefined && config.cookieSameSite !== undefined ? config.cookieSameSite : "default function";
        logger_1.logDebugMessage("session init: cookieSameSite: " + sameSiteToPrint);
        logger_1.logDebugMessage("session init: cookieSecure: " + this.config.cookieSecure);
        logger_1.logDebugMessage(
            "session init: refreshTokenPath: " + this.config.refreshTokenPath.getAsStringDangerous()
        );
        logger_1.logDebugMessage("session init: sessionExpiredStatusCode: " + this.config.sessionExpiredStatusCode);
        this.isInServerlessEnv = isInServerlessEnv;
        this.openIdRecipe = new recipe_1.default(recipeId, appInfo, isInServerlessEnv, {
            override: this.config.override.openIdFeature,
        });
        let builder = new supertokens_js_override_1.default(
            recipeImplementation_1.default(
                querier_1.Querier.getNewInstanceOrThrowError(recipeId),
                this.config,
                this.getAppInfo(),
                () => this.recipeInterfaceImpl
            )
        );
        this.recipeInterfaceImpl = builder.override(this.config.override.functions).build();
        {
            let builder = new supertokens_js_override_1.default(implementation_1.default());
            this.apiImpl = builder.override(this.config.override.apis).build();
        }
    }
    static getInstanceOrThrowError() {
        if (SessionRecipe.instance !== undefined) {
            return SessionRecipe.instance;
        }
        throw new Error(
            "Initialisation not done. Did you forget to call the SuperTokens.init or Session.init function?"
        );
    }
    static init(config) {
        return (appInfo, isInServerlessEnv) => {
            if (SessionRecipe.instance === undefined) {
                SessionRecipe.instance = new SessionRecipe(SessionRecipe.RECIPE_ID, appInfo, isInServerlessEnv, config);
                return SessionRecipe.instance;
            } else {
                throw new Error("Session recipe has already been initialised. Please check your code for bugs.");
            }
        };
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
        SessionRecipe.instance = undefined;
    }
}
exports.default = SessionRecipe;
SessionRecipe.instance = undefined;
SessionRecipe.RECIPE_ID = "session";
