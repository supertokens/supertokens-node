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
const utils_1 = require("./utils");
const plugins_1 = require("./plugins");
const querier_1 = require("./querier");
const constants_1 = require("./constants");
const normalisedURLDomain_1 = __importDefault(require("./normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("./normalisedURLPath"));
const error_1 = __importDefault(require("./error"));
const logger_1 = require("./logger");
const postSuperTokensInitCallbacks_1 = require("./postSuperTokensInitCallbacks");
const constants_2 = require("./recipe/multitenancy/constants");
const recipe_1 = __importDefault(require("./recipe/session/recipe"));
class SuperTokens {
    constructor(config) {
        var _a, _b, _c, _d, _e, _f;
        this.handleAPI = async (matchedRecipe, id, tenantId, request, response, path, method, userContext) => {
            return await matchedRecipe.handleAPIRequest(id, tenantId, request, response, path, method, userContext);
        };
        this.getAllCORSHeaders = () => {
            let headerSet = new Set();
            headerSet.add(constants_1.HEADER_RID);
            headerSet.add(constants_1.HEADER_FDI);
            this.recipeModules.forEach((recipe) => {
                let headers = recipe.getAllCORSHeaders();
                headers.forEach((h) => {
                    headerSet.add(h);
                });
            });
            return Array.from(headerSet);
        };
        this.getUserCount = async (includeRecipeIds, tenantId, userContext) => {
            let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
            let apiVersion = await querier.getAPIVersion(userContext);
            if ((0, utils_1.maxVersion)(apiVersion, "2.7") === "2.7") {
                throw new Error(
                    "Please use core version >= 3.5 to call this function. Otherwise, you can call <YourRecipe>.getUserCount() instead (for example, EmailPassword.getUserCount())"
                );
            }
            let includeRecipeIdsStr = undefined;
            if (includeRecipeIds !== undefined) {
                includeRecipeIdsStr = includeRecipeIds.join(",");
            }
            let response = await querier.sendGetRequest(
                {
                    path: "/<tenantId>/users/count",
                    params: {
                        tenantId: tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId,
                    },
                },
                {
                    includeRecipeIds: includeRecipeIdsStr,
                    includeAllTenants: tenantId === undefined,
                },
                userContext
            );
            return Number(response.count);
        };
        this.createUserIdMapping = async function (input) {
            let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
            let cdiVersion = await querier.getAPIVersion(input.userContext);
            if ((0, utils_1.maxVersion)("2.15", cdiVersion) === cdiVersion) {
                // create userId mapping is only available >= CDI 2.15
                return await querier.sendPostRequest(
                    "/recipe/userid/map",
                    {
                        superTokensUserId: input.superTokensUserId,
                        externalUserId: input.externalUserId,
                        externalUserIdInfo: input.externalUserIdInfo,
                        force: input.force,
                    },
                    input.userContext
                );
            } else {
                throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
            }
        };
        this.getUserIdMapping = async function (input) {
            let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
            let cdiVersion = await querier.getAPIVersion(input.userContext);
            if ((0, utils_1.maxVersion)("2.15", cdiVersion) === cdiVersion) {
                // create userId mapping is only available >= CDI 2.15
                let response = await querier.sendGetRequest(
                    "/recipe/userid/map",
                    {
                        userId: input.userId,
                        userIdType: input.userIdType,
                    },
                    input.userContext
                );
                return response;
            } else {
                throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
            }
        };
        this.deleteUserIdMapping = async function (input) {
            let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
            let cdiVersion = await querier.getAPIVersion(input.userContext);
            if ((0, utils_1.maxVersion)("2.15", cdiVersion) === cdiVersion) {
                return await querier.sendPostRequest(
                    "/recipe/userid/map/remove",
                    {
                        userId: input.userId,
                        userIdType: input.userIdType,
                        force: input.force,
                    },
                    input.userContext
                );
            } else {
                throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
            }
        };
        this.updateOrDeleteUserIdMappingInfo = async function (input) {
            let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
            let cdiVersion = await querier.getAPIVersion(input.userContext);
            if ((0, utils_1.maxVersion)("2.15", cdiVersion) === cdiVersion) {
                return await querier.sendPutRequest(
                    "/recipe/userid/external-user-id-info",
                    {
                        userId: input.userId,
                        userIdType: input.userIdType,
                        externalUserIdInfo: input.externalUserIdInfo || null,
                    },
                    {},
                    input.userContext
                );
            } else {
                throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
            }
        };
        this.middleware = async (request, response, userContext) => {
            (0, logger_1.logDebugMessage)("middleware: Started");
            let path = this.appInfo.apiGatewayPath.appendPath(
                new normalisedURLPath_1.default(request.getOriginalURL())
            );
            let method = (0, utils_1.normaliseHttpMethod)(request.getMethod());
            const handlerFromApis = this.pluginRouteHandlers.find(
                (handler) => handler.path === path.getAsStringDangerous() && handler.method === method
            );
            if (handlerFromApis) {
                let session = undefined;
                if (handlerFromApis.verifySessionOptions !== undefined) {
                    session = await recipe_1.default
                        .getInstanceOrThrowError()
                        .verifySession(handlerFromApis.verifySessionOptions, request, response, userContext);
                }
                handlerFromApis.handler(request, response, session, userContext);
                return true;
            }
            // if the prefix of the URL doesn't match the base path, we skip
            if (!path.startsWith(this.appInfo.apiBasePath)) {
                (0, logger_1.logDebugMessage)(
                    "middleware: Not handling because request path did not start with config path. Request path: " +
                        path.getAsStringDangerous()
                );
                return false;
            }
            let requestRID = (0, utils_1.getRidFromHeader)(request);
            (0, logger_1.logDebugMessage)("middleware: requestRID is: " + requestRID);
            if (requestRID === "anti-csrf") {
                // see https://github.com/supertokens/supertokens-node/issues/202
                requestRID = undefined;
            }
            async function handleWithoutRid(recipeModules) {
                let bestMatch = undefined;
                for (let i = 0; i < recipeModules.length; i++) {
                    (0, logger_1.logDebugMessage)(
                        "middleware: Checking recipe ID for match: " +
                            recipeModules[i].getRecipeId() +
                            " with path: " +
                            path.getAsStringDangerous() +
                            " and method: " +
                            method
                    );
                    let idResult = await recipeModules[i].returnAPIIdIfCanHandleRequest(path, method, userContext);
                    if (idResult !== undefined) {
                        // The request path may or may not include the tenantId. `returnAPIIdIfCanHandleRequest` handles both cases.
                        // If one recipe matches with tenantId and another matches exactly, we prefer the exact match.
                        if (bestMatch === undefined || idResult.exactMatch) {
                            bestMatch = {
                                recipeModule: recipeModules[i],
                                idResult: idResult,
                            };
                        }
                        if (idResult.exactMatch) {
                            break;
                        }
                    }
                }
                if (bestMatch !== undefined) {
                    const { idResult, recipeModule } = bestMatch;
                    (0, logger_1.logDebugMessage)("middleware: Request being handled by recipe. ID is: " + idResult.id);
                    let requestHandled = await recipeModule.handleAPIRequest(
                        idResult.id,
                        idResult.tenantId,
                        request,
                        response,
                        path,
                        method,
                        userContext
                    );
                    if (!requestHandled) {
                        (0, logger_1.logDebugMessage)(
                            "middleware: Not handled because API returned requestHandled as false"
                        );
                        return false;
                    }
                    (0, logger_1.logDebugMessage)("middleware: Ended");
                    return true;
                }
                (0, logger_1.logDebugMessage)("middleware: Not handling because no recipe matched");
                return false;
            }
            if (requestRID !== undefined) {
                // We have the below matching based on RID header cause
                // we still support older FDIs (< 1.20). In the newer FDIs,
                // the API paths across all recipes are unique.
                let matchedRecipe = [];
                // we loop through all recipe modules to find the one with the matching rId
                for (let i = 0; i < this.recipeModules.length; i++) {
                    (0, logger_1.logDebugMessage)(
                        "middleware: Checking recipe ID for match: " + this.recipeModules[i].getRecipeId()
                    );
                    if (this.recipeModules[i].getRecipeId() === requestRID) {
                        matchedRecipe.push(this.recipeModules[i]);
                    } else if (requestRID === "thirdpartyemailpassword") {
                        if (
                            this.recipeModules[i].getRecipeId() === "thirdparty" ||
                            this.recipeModules[i].getRecipeId() === "emailpassword"
                        ) {
                            matchedRecipe.push(this.recipeModules[i]);
                        }
                    } else if (requestRID === "thirdpartypasswordless") {
                        if (
                            this.recipeModules[i].getRecipeId() === "thirdparty" ||
                            this.recipeModules[i].getRecipeId() === "passwordless"
                        ) {
                            matchedRecipe.push(this.recipeModules[i]);
                        }
                    }
                }
                if (matchedRecipe.length === 0) {
                    (0, logger_1.logDebugMessage)("middleware: Not handling based on rid match. Trying without rid.");
                    return handleWithoutRid(this.recipeModules);
                }
                for (let i = 0; i < matchedRecipe.length; i++) {
                    (0, logger_1.logDebugMessage)(
                        "middleware: Matched with recipe IDs: " + matchedRecipe[i].getRecipeId()
                    );
                }
                let idResult = undefined;
                let finalMatchedRecipe = undefined;
                for (let i = 0; i < matchedRecipe.length; i++) {
                    // Here we assume that if there are multiple recipes that have matched, then
                    // the path and methods of the APIs exposed via those recipes is unique.
                    let currIdResult = await matchedRecipe[i].returnAPIIdIfCanHandleRequest(path, method, userContext);
                    if (currIdResult !== undefined) {
                        if (
                            idResult === undefined ||
                            // The request path may or may not include the tenantId. `returnAPIIdIfCanHandleRequest` handles both cases.
                            // If one recipe matches with tenantId and another matches exactly, we prefer the exact match.
                            (currIdResult.exactMatch === true && idResult.exactMatch === false)
                        ) {
                            finalMatchedRecipe = matchedRecipe[i];
                            idResult = currIdResult;
                        } else {
                            throw new Error(
                                "Two recipes have matched the same API path and method! This is a bug in the SDK. Please contact support."
                            );
                        }
                    }
                }
                if (idResult === undefined || finalMatchedRecipe === undefined) {
                    return handleWithoutRid(this.recipeModules);
                }
                (0, logger_1.logDebugMessage)("middleware: Request being handled by recipe. ID is: " + idResult.id);
                // give task to the matched recipe
                let requestHandled = await finalMatchedRecipe.handleAPIRequest(
                    idResult.id,
                    idResult.tenantId,
                    request,
                    response,
                    path,
                    method,
                    userContext
                );
                if (!requestHandled) {
                    (0, logger_1.logDebugMessage)(
                        "middleware: Not handled because API returned requestHandled as false"
                    );
                    return false;
                }
                (0, logger_1.logDebugMessage)("middleware: Ended");
                return true;
            } else {
                return handleWithoutRid(this.recipeModules);
            }
        };
        this.errorHandler = async (err, request, response, userContext) => {
            (0, logger_1.logDebugMessage)("errorHandler: Started");
            if (error_1.default.isErrorFromSuperTokens(err)) {
                (0, logger_1.logDebugMessage)(
                    "errorHandler: Error is from SuperTokens recipe. Message: " + err.message
                );
                if (err.type === error_1.default.BAD_INPUT_ERROR) {
                    (0, logger_1.logDebugMessage)("errorHandler: Sending 400 status code response");
                    return (0, utils_1.sendNon200ResponseWithMessage)(response, err.message, 400);
                }
                for (let i = 0; i < this.recipeModules.length; i++) {
                    (0, logger_1.logDebugMessage)(
                        "errorHandler: Checking recipe for match: " + this.recipeModules[i].getRecipeId()
                    );
                    if (this.recipeModules[i].isErrorFromThisRecipe(err)) {
                        (0, logger_1.logDebugMessage)(
                            "errorHandler: Matched with recipeID: " + this.recipeModules[i].getRecipeId()
                        );
                        return await this.recipeModules[i].handleError(err, request, response, userContext);
                    }
                }
            }
            throw err;
        };
        this.getRequestFromUserContext = (userContext) => {
            if (userContext === undefined) {
                return undefined;
            }
            if (typeof userContext !== "object") {
                return undefined;
            }
            if (userContext._default === undefined) {
                return undefined;
            }
            if (userContext._default.request === undefined) {
                return undefined;
            }
            return userContext._default.request;
        };
        this.appInfo = (0, utils_1.normaliseInputAppInfoOrThrowError)(config.appInfo);
        const {
            config: _config,
            pluginRouteHandlers,
            overrideMaps,
        } = (0, plugins_1.loadPlugins)({
            config,
            plugins:
                (_b = (_a = config.experimental) === null || _a === void 0 ? void 0 : _a.plugins) !== null &&
                _b !== void 0
                    ? _b
                    : [],
            normalisedAppInfo: this.appInfo,
        });
        config = Object.assign({}, _config);
        this.pluginRouteHandlers = pluginRouteHandlers;
        this.pluginOverrideMaps = overrideMaps;
        if (config.debug === true) {
            (0, logger_1.enableDebugLogs)();
        }
        (0, logger_1.logDebugMessage)("Started SuperTokens with debug logging (supertokens.init called)");
        const originToPrint =
            config.appInfo.origin === undefined
                ? undefined
                : typeof config.appInfo.origin === "string"
                ? config.appInfo.origin
                : "function";
        (0, logger_1.logDebugMessage)(
            "appInfo: " + JSON.stringify(Object.assign(Object.assign({}, config.appInfo), { origin: originToPrint }))
        );
        this.framework = config.framework !== undefined ? config.framework : "express";
        (0, logger_1.logDebugMessage)("framework: " + this.framework);
        this.supertokens = config.supertokens;
        querier_1.Querier.init(
            (_c = config.supertokens) === null || _c === void 0
                ? void 0
                : _c.connectionURI
                      .split(";")
                      .filter((h) => h !== "")
                      .map((h) => {
                          return {
                              domain: new normalisedURLDomain_1.default(h.trim()),
                              basePath: new normalisedURLPath_1.default(h.trim()),
                          };
                      }),
            (_d = config.supertokens) === null || _d === void 0 ? void 0 : _d.apiKey,
            (_e = config.supertokens) === null || _e === void 0 ? void 0 : _e.networkInterceptor,
            (_f = config.supertokens) === null || _f === void 0 ? void 0 : _f.disableCoreCallCache
        );
        if (config.recipeList === undefined || config.recipeList.length === 0) {
            throw new Error("Please provide at least one recipe to the supertokens.init function call");
        }
        // @ts-ignore
        if (config.recipeList.includes(undefined)) {
            // related to issue #270. If user makes mistake by adding empty items in the recipeList, this will catch the mistake and throw relevant error
            throw new Error("Please remove empty items from recipeList");
        }
        this.isInServerlessEnv = config.isInServerlessEnv === undefined ? false : config.isInServerlessEnv;
        let multitenancyFound = false;
        let totpFound = false;
        let userMetadataFound = false;
        let multiFactorAuthFound = false;
        let oauth2Found = false;
        let openIdFound = false;
        let jwtFound = false;
        let accountLinkingFound = false;
        // Multitenancy recipe is an always initialized recipe and needs to be imported this way
        // so that there is no circular dependency. Otherwise there would be cyclic dependency
        // between `supertokens.ts` -> `recipeModule.ts` -> `multitenancy/recipe.ts`
        let MultitenancyRecipe = require("./recipe/multitenancy/recipe").default;
        let UserMetadataRecipe = require("./recipe/usermetadata/recipe").default;
        let MultiFactorAuthRecipe = require("./recipe/multifactorauth/recipe").default;
        let TotpRecipe = require("./recipe/totp/recipe").default;
        let OAuth2ProviderRecipe = require("./recipe/oauth2provider/recipe").default;
        let OpenIdRecipe = require("./recipe/openid/recipe").default;
        let jwtRecipe = require("./recipe/jwt/recipe").default;
        let AccountLinkingRecipe = require("./recipe/accountlinking/recipe").default;
        this.recipeModules = config.recipeList.map((func) => {
            const recipeModule = func(this.appInfo, this.isInServerlessEnv, this.pluginOverrideMaps);
            if (recipeModule.getRecipeId() === MultitenancyRecipe.RECIPE_ID) {
                multitenancyFound = true;
            } else if (recipeModule.getRecipeId() === UserMetadataRecipe.RECIPE_ID) {
                userMetadataFound = true;
            } else if (recipeModule.getRecipeId() === MultiFactorAuthRecipe.RECIPE_ID) {
                multiFactorAuthFound = true;
            } else if (recipeModule.getRecipeId() === TotpRecipe.RECIPE_ID) {
                totpFound = true;
            } else if (recipeModule.getRecipeId() === OAuth2ProviderRecipe.RECIPE_ID) {
                oauth2Found = true;
            } else if (recipeModule.getRecipeId() === OpenIdRecipe.RECIPE_ID) {
                openIdFound = true;
            } else if (recipeModule.getRecipeId() === jwtRecipe.RECIPE_ID) {
                jwtFound = true;
            } else if (recipeModule.getRecipeId() === AccountLinkingRecipe.RECIPE_ID) {
                accountLinkingFound = true;
            }
            return recipeModule;
        });
        if (!accountLinkingFound) {
            this.recipeModules.push(
                AccountLinkingRecipe.init()(this.appInfo, this.isInServerlessEnv, this.pluginOverrideMaps)
            );
        }
        if (!jwtFound) {
            this.recipeModules.push(jwtRecipe.init()(this.appInfo, this.isInServerlessEnv, this.pluginOverrideMaps));
        }
        if (!openIdFound) {
            this.recipeModules.push(OpenIdRecipe.init()(this.appInfo, this.isInServerlessEnv, this.pluginOverrideMaps));
        }
        if (!multitenancyFound) {
            this.recipeModules.push(
                MultitenancyRecipe.init()(this.appInfo, this.isInServerlessEnv, this.pluginOverrideMaps)
            );
        }
        if (totpFound && !multiFactorAuthFound) {
            throw new Error("Please initialize the MultiFactorAuth recipe to use TOTP.");
        }
        if (!userMetadataFound) {
            // Initializing the user metadata recipe shouldn't cause any issues/side effects and it doesn't expose any APIs,
            // so we can just always initialize it
            this.recipeModules.push(
                UserMetadataRecipe.init()(this.appInfo, this.isInServerlessEnv, this.pluginOverrideMaps)
            );
        }
        // While for many usecases account linking recipe also has to be initialized for MFA to function well,
        // the app doesn't have to do that if they only use TOTP (which shouldn't be that uncommon)
        // To let those cases function without initializing account linking we do not check it here, but when
        // the authentication endpoints are called.
        // We've decided to always initialize the OAuth2Provider recipe
        if (!oauth2Found) {
            this.recipeModules.push(
                OAuth2ProviderRecipe.init()(this.appInfo, this.isInServerlessEnv, this.pluginOverrideMaps)
            );
        }
        this.telemetryEnabled = config.telemetry === undefined ? !(0, utils_1.isTestEnv)() : config.telemetry;
    }
    static init(config) {
        if (SuperTokens.instance === undefined) {
            SuperTokens.instance = new SuperTokens(config);
            postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.runPostInitCallbacks();
        }
    }
    static reset() {
        if (!(0, utils_1.isTestEnv)()) {
            throw new Error("calling testing function in non testing env");
        }
        // We call reset the following recipes because they are auto-initialized
        // and there is no case where we want to reset the SuperTokens instance but not
        // the recipes.
        let OAuth2ProviderRecipe = require("./recipe/oauth2provider/recipe").default;
        OAuth2ProviderRecipe.reset();
        let OpenIdRecipe = require("./recipe/openid/recipe").default;
        OpenIdRecipe.reset();
        let JWTRecipe = require("./recipe/jwt/recipe").default;
        JWTRecipe.reset();
        querier_1.Querier.reset();
        SuperTokens.instance = undefined;
    }
    static getInstanceOrThrowError() {
        if (SuperTokens.instance !== undefined) {
            return SuperTokens.instance;
        }
        throw new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?");
    }
}
exports.default = SuperTokens;
