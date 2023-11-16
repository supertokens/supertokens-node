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
const querier_1 = require("./querier");
const constants_1 = require("./constants");
const normalisedURLDomain_1 = __importDefault(require("./normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("./normalisedURLPath"));
const error_1 = __importDefault(require("./error"));
const logger_1 = require("./logger");
const postSuperTokensInitCallbacks_1 = require("./postSuperTokensInitCallbacks");
const constants_2 = require("./recipe/multitenancy/constants");
class SuperTokens {
    constructor(config) {
        var _a, _b, _c;
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
            let apiVersion = await querier.getAPIVersion();
            if (utils_1.maxVersion(apiVersion, "2.7") === "2.7") {
                throw new Error(
                    "Please use core version >= 3.5 to call this function. Otherwise, you can call <YourRecipe>.getUserCount() instead (for example, EmailPassword.getUserCount())"
                );
            }
            let includeRecipeIdsStr = undefined;
            if (includeRecipeIds !== undefined) {
                includeRecipeIdsStr = includeRecipeIds.join(",");
            }
            let response = await querier.sendGetRequest(
                new normalisedURLPath_1.default(
                    `/${tenantId === undefined ? constants_2.DEFAULT_TENANT_ID : tenantId}/users/count`
                ),
                {
                    includeRecipeIds: includeRecipeIdsStr,
                    includeAllTenants: tenantId === undefined,
                },
                userContext === undefined ? {} : userContext
            );
            return Number(response.count);
        };
        this.createUserIdMapping = async function (input) {
            let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
            let cdiVersion = await querier.getAPIVersion();
            if (utils_1.maxVersion("2.15", cdiVersion) === cdiVersion) {
                // create userId mapping is only available >= CDI 2.15
                return await querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/userid/map"),
                    {
                        superTokensUserId: input.superTokensUserId,
                        externalUserId: input.externalUserId,
                        externalUserIdInfo: input.externalUserIdInfo,
                        force: input.force,
                    },
                    input.userContext === undefined ? {} : input.userContext
                );
            } else {
                throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
            }
        };
        this.getUserIdMapping = async function (input) {
            let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
            let cdiVersion = await querier.getAPIVersion();
            if (utils_1.maxVersion("2.15", cdiVersion) === cdiVersion) {
                // create userId mapping is only available >= CDI 2.15
                let response = await querier.sendGetRequest(
                    new normalisedURLPath_1.default("/recipe/userid/map"),
                    {
                        userId: input.userId,
                        userIdType: input.userIdType,
                    },
                    input.userContext === undefined ? {} : input.userContext
                );
                return response;
            } else {
                throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
            }
        };
        this.deleteUserIdMapping = async function (input) {
            let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
            let cdiVersion = await querier.getAPIVersion();
            if (utils_1.maxVersion("2.15", cdiVersion) === cdiVersion) {
                return await querier.sendPostRequest(
                    new normalisedURLPath_1.default("/recipe/userid/map/remove"),
                    {
                        userId: input.userId,
                        userIdType: input.userIdType,
                        force: input.force,
                    },
                    input.userContext === undefined ? {} : input.userContext
                );
            } else {
                throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
            }
        };
        this.updateOrDeleteUserIdMappingInfo = async function (input) {
            let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
            let cdiVersion = await querier.getAPIVersion();
            if (utils_1.maxVersion("2.15", cdiVersion) === cdiVersion) {
                return await querier.sendPutRequest(
                    new normalisedURLPath_1.default("/recipe/userid/external-user-id-info"),
                    {
                        userId: input.userId,
                        userIdType: input.userIdType,
                        externalUserIdInfo: input.externalUserIdInfo,
                    },
                    input.userContext === undefined ? {} : input.userContext
                );
            } else {
                throw new global.Error("Please upgrade the SuperTokens core to >= 3.15.0");
            }
        };
        this.middleware = async (request, response, userContext) => {
            logger_1.logDebugMessage("middleware: Started");
            let path = this.appInfo.apiGatewayPath.appendPath(
                new normalisedURLPath_1.default(request.getOriginalURL())
            );
            let method = utils_1.normaliseHttpMethod(request.getMethod());
            // if the prefix of the URL doesn't match the base path, we skip
            if (!path.startsWith(this.appInfo.apiBasePath)) {
                logger_1.logDebugMessage(
                    "middleware: Not handling because request path did not start with config path. Request path: " +
                        path.getAsStringDangerous()
                );
                return false;
            }
            let requestRID = utils_1.getRidFromHeader(request);
            logger_1.logDebugMessage("middleware: requestRID is: " + requestRID);
            if (requestRID === "anti-csrf") {
                // see https://github.com/supertokens/supertokens-node/issues/202
                requestRID = undefined;
            }
            if (requestRID !== undefined) {
                let matchedRecipe = undefined;
                // we loop through all recipe modules to find the one with the matching rId
                for (let i = 0; i < this.recipeModules.length; i++) {
                    logger_1.logDebugMessage(
                        "middleware: Checking recipe ID for match: " + this.recipeModules[i].getRecipeId()
                    );
                    if (this.recipeModules[i].getRecipeId() === requestRID) {
                        matchedRecipe = this.recipeModules[i];
                        break;
                    }
                }
                if (matchedRecipe === undefined) {
                    logger_1.logDebugMessage("middleware: Not handling because no recipe matched");
                    // we could not find one, so we skip
                    return false;
                }
                logger_1.logDebugMessage("middleware: Matched with recipe ID: " + matchedRecipe.getRecipeId());
                let idResult = await matchedRecipe.returnAPIIdIfCanHandleRequest(path, method, userContext);
                if (idResult === undefined) {
                    logger_1.logDebugMessage(
                        "middleware: Not handling because recipe doesn't handle request path or method. Request path: " +
                            path.getAsStringDangerous() +
                            ", request method: " +
                            method
                    );
                    // the matched recipe doesn't handle this path and http method
                    return false;
                }
                logger_1.logDebugMessage("middleware: Request being handled by recipe. ID is: " + idResult.id);
                // give task to the matched recipe
                let requestHandled = await matchedRecipe.handleAPIRequest(
                    idResult.id,
                    idResult.tenantId,
                    request,
                    response,
                    path,
                    method,
                    userContext
                );
                if (!requestHandled) {
                    logger_1.logDebugMessage("middleware: Not handled because API returned requestHandled as false");
                    return false;
                }
                logger_1.logDebugMessage("middleware: Ended");
                return true;
            } else {
                // we loop through all recipe modules to find the one with the matching path and method
                for (let i = 0; i < this.recipeModules.length; i++) {
                    logger_1.logDebugMessage(
                        "middleware: Checking recipe ID for match: " + this.recipeModules[i].getRecipeId()
                    );
                    let idResult = await this.recipeModules[i].returnAPIIdIfCanHandleRequest(path, method, userContext);
                    if (idResult !== undefined) {
                        logger_1.logDebugMessage("middleware: Request being handled by recipe. ID is: " + idResult.id);
                        let requestHandled = await this.recipeModules[i].handleAPIRequest(
                            idResult.id,
                            idResult.tenantId,
                            request,
                            response,
                            path,
                            method,
                            userContext
                        );
                        if (!requestHandled) {
                            logger_1.logDebugMessage(
                                "middleware: Not handled because API returned requestHandled as false"
                            );
                            return false;
                        }
                        logger_1.logDebugMessage("middleware: Ended");
                        return true;
                    }
                }
                logger_1.logDebugMessage("middleware: Not handling because no recipe matched");
                return false;
            }
        };
        this.errorHandler = async (err, request, response, userContext) => {
            logger_1.logDebugMessage("errorHandler: Started");
            if (error_1.default.isErrorFromSuperTokens(err)) {
                logger_1.logDebugMessage("errorHandler: Error is from SuperTokens recipe. Message: " + err.message);
                if (err.type === error_1.default.BAD_INPUT_ERROR) {
                    logger_1.logDebugMessage("errorHandler: Sending 400 status code response");
                    return utils_1.sendNon200ResponseWithMessage(response, err.message, 400);
                }
                for (let i = 0; i < this.recipeModules.length; i++) {
                    logger_1.logDebugMessage(
                        "errorHandler: Checking recipe for match: " + this.recipeModules[i].getRecipeId()
                    );
                    if (this.recipeModules[i].isErrorFromThisRecipe(err)) {
                        logger_1.logDebugMessage(
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
        if (config.debug === true) {
            logger_1.enableDebugLogs();
        }
        logger_1.logDebugMessage("Started SuperTokens with debug logging (supertokens.init called)");
        const originToPrint =
            config.appInfo.origin === undefined
                ? undefined
                : typeof config.appInfo.origin === "string"
                ? config.appInfo.origin
                : "function";
        logger_1.logDebugMessage(
            "appInfo: " + JSON.stringify(Object.assign(Object.assign({}, config.appInfo), { origin: originToPrint }))
        );
        this.framework = config.framework !== undefined ? config.framework : "express";
        logger_1.logDebugMessage("framework: " + this.framework);
        this.appInfo = utils_1.normaliseInputAppInfoOrThrowError(config.appInfo);
        this.supertokens = config.supertokens;
        querier_1.Querier.init(
            (_a = config.supertokens) === null || _a === void 0
                ? void 0
                : _a.connectionURI
                      .split(";")
                      .filter((h) => h !== "")
                      .map((h) => {
                          return {
                              domain: new normalisedURLDomain_1.default(h.trim()),
                              basePath: new normalisedURLPath_1.default(h.trim()),
                          };
                      }),
            (_b = config.supertokens) === null || _b === void 0 ? void 0 : _b.apiKey,
            (_c = config.supertokens) === null || _c === void 0 ? void 0 : _c.networkInterceptor
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
        // Multitenancy recipe is an always initialized recipe and needs to be imported this way
        // so that there is no circular dependency. Otherwise there would be cyclic dependency
        // between `supertokens.ts` -> `recipeModule.ts` -> `multitenancy/recipe.ts`
        let MultitenancyRecipe = require("./recipe/multitenancy/recipe").default;
        this.recipeModules = config.recipeList.map((func) => {
            const recipeModule = func(this.appInfo, this.isInServerlessEnv);
            if (recipeModule.getRecipeId() === MultitenancyRecipe.RECIPE_ID) {
                multitenancyFound = true;
            }
            return recipeModule;
        });
        if (!multitenancyFound) {
            this.recipeModules.push(MultitenancyRecipe.init()(this.appInfo, this.isInServerlessEnv));
        }
        this.telemetryEnabled = config.telemetry === undefined ? process.env.TEST_MODE !== "testing" : config.telemetry;
    }
    static init(config) {
        if (SuperTokens.instance === undefined) {
            SuperTokens.instance = new SuperTokens(config);
            postSuperTokensInitCallbacks_1.PostSuperTokensInitCallbacks.runPostInitCallbacks();
        }
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new Error("calling testing function in non testing env");
        }
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
