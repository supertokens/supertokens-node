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
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const axios_1 = require("axios");
const utils_1 = require("./utils");
const querier_1 = require("./querier");
const constants_1 = require("./constants");
const normalisedURLDomain_1 = require("./normalisedURLDomain");
const normalisedURLPath_1 = require("./normalisedURLPath");
const error_1 = require("./error");
class SuperTokens {
    constructor(config) {
        var _a, _b;
        this.sendTelemetry = () =>
            __awaiter(this, void 0, void 0, function* () {
                try {
                    let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
                    let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/telemetry"), {});
                    let telemetryId;
                    if (response.exists) {
                        telemetryId = response.telemetryId;
                    }
                    yield axios_1.default({
                        method: "POST",
                        url: "https://api.supertokens.io/0/st/telemetry",
                        data: {
                            appName: this.appInfo.appName,
                            websiteDomain: this.appInfo.websiteDomain.getAsStringDangerous(),
                            telemetryId,
                        },
                        headers: {
                            "api-version": 2,
                        },
                    });
                } catch (ignored) {}
            });
        this.handleAPI = (matchedRecipe, id, request, response, path, method) =>
            __awaiter(this, void 0, void 0, function* () {
                return yield matchedRecipe.handleAPIRequest(id, request, response, path, method);
            });
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
        this.getUserCount = (includeRecipeIds) =>
            __awaiter(this, void 0, void 0, function* () {
                let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
                let apiVersion = yield querier.getAPIVersion();
                if (utils_1.maxVersion(apiVersion, "2.7") === "2.7") {
                    throw new Error(
                        "Please use core version >= 3.5 to call this function. Otherwise, you can call <YourRecipe>.getUserCount() instead (for example, EmailPassword.getUserCount())"
                    );
                }
                let includeRecipeIdsStr = undefined;
                if (includeRecipeIds !== undefined) {
                    includeRecipeIdsStr = includeRecipeIds.join(",");
                }
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/users/count"), {
                    includeRecipeIds: includeRecipeIdsStr,
                });
                return Number(response.count);
            });
        this.getUsers = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
                let apiVersion = yield querier.getAPIVersion();
                if (utils_1.maxVersion(apiVersion, "2.7") === "2.7") {
                    throw new Error(
                        "Please use core version >= 3.5 to call this function. Otherwise, you can call <YourRecipe>.getUsersOldestFirst() or <YourRecipe>.getUsersNewestFirst() instead (for example, EmailPassword.getUsersOldestFirst())"
                    );
                }
                let includeRecipeIdsStr = undefined;
                if (input.includeRecipeIds !== undefined) {
                    includeRecipeIdsStr = input.includeRecipeIds.join(",");
                }
                let response = yield querier.sendGetRequest(new normalisedURLPath_1.default("/users"), {
                    includeRecipeIds: includeRecipeIdsStr,
                    timeJoinedOrder: input.timeJoinedOrder,
                    limit: input.limit,
                    paginationToken: input.paginationToken,
                });
                return {
                    users: response.users,
                    nextPaginationToken: response.nextPaginationToken,
                };
            });
        this.deleteUser = (input) =>
            __awaiter(this, void 0, void 0, function* () {
                let querier = querier_1.Querier.getNewInstanceOrThrowError(undefined);
                let cdiVersion = yield querier.getAPIVersion();
                if (utils_1.maxVersion("2.10", cdiVersion) === cdiVersion) {
                    // delete user is only available >= CDI 2.10
                    yield querier.sendPostRequest(new normalisedURLPath_1.default("/user/remove"), {
                        userId: input.userId,
                    });
                    return {
                        status: "OK",
                    };
                } else {
                    throw new global.Error("Please upgrade the SuperTokens core to >= 3.7.0");
                }
            });
        this.middleware = (request, response) =>
            __awaiter(this, void 0, void 0, function* () {
                let path = this.appInfo.apiGatewayPath.appendPath(
                    new normalisedURLPath_1.default(request.getOriginalURL())
                );
                let method = utils_1.normaliseHttpMethod(request.getMethod());
                // if the prefix of the URL doesn't match the base path, we skip
                if (!path.startsWith(this.appInfo.apiBasePath)) {
                    return false;
                }
                let requestRID = request.getHeaderValue(constants_1.HEADER_RID);
                if (requestRID === "anti-csrf") {
                    // see https://github.com/supertokens/supertokens-node/issues/202
                    requestRID = undefined;
                }
                if (requestRID !== undefined) {
                    let matchedRecipe = undefined;
                    // we loop through all recipe modules to find the one with the matching rId
                    for (let i = 0; i < this.recipeModules.length; i++) {
                        if (this.recipeModules[i].getRecipeId() === requestRID) {
                            matchedRecipe = this.recipeModules[i];
                            break;
                        }
                    }
                    if (matchedRecipe === undefined) {
                        // we could not find one, so we skip
                        return false;
                    }
                    let id = matchedRecipe.returnAPIIdIfCanHandleRequest(path, method);
                    if (id === undefined) {
                        // the matched recipe doesn't handle this path and http method
                        return false;
                    }
                    // give task to the matched recipe
                    let requestHandled = yield matchedRecipe.handleAPIRequest(id, request, response, path, method);
                    if (!requestHandled) {
                        return false;
                    }
                    return true;
                } else {
                    // we loop through all recipe modules to find the one with the matching path and method
                    for (let i = 0; i < this.recipeModules.length; i++) {
                        let id = this.recipeModules[i].returnAPIIdIfCanHandleRequest(path, method);
                        if (id !== undefined) {
                            let requestHandled = yield this.recipeModules[i].handleAPIRequest(
                                id,
                                request,
                                response,
                                path,
                                method
                            );
                            if (!requestHandled) {
                                return false;
                            }
                            return true;
                        }
                    }
                    return false;
                }
            });
        this.errorHandler = (err, request, response) =>
            __awaiter(this, void 0, void 0, function* () {
                if (error_1.default.isErrorFromSuperTokens(err)) {
                    if (err.type === error_1.default.BAD_INPUT_ERROR) {
                        return utils_1.sendNon200Response(response, err.message, 400);
                    }
                    for (let i = 0; i < this.recipeModules.length; i++) {
                        if (this.recipeModules[i].isErrorFromThisRecipe(err)) {
                            return yield this.recipeModules[i].handleError(err, request, response);
                        }
                    }
                }
                throw err;
            });
        utils_1.validateTheStructureOfUserInput(config, types_1.InputSchema, "init function");
        this.framework = config.framework !== undefined ? config.framework : "express";
        this.appInfo = utils_1.normaliseInputAppInfoOrThrowError(config.appInfo);
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
            (_b = config.supertokens) === null || _b === void 0 ? void 0 : _b.apiKey
        );
        if (config.recipeList === undefined || config.recipeList.length === 0) {
            throw new Error("Please provide at least one recipe to the supertokens.init function call");
        }
        this.isInServerlessEnv = config.isInServerlessEnv === undefined ? false : config.isInServerlessEnv;
        this.recipeModules = config.recipeList.map((func) => {
            return func(this.appInfo, this.isInServerlessEnv);
        });
        let telemetry = config.telemetry === undefined ? process.env.TEST_MODE !== "testing" : config.telemetry;
        if (telemetry) {
            if (this.isInServerlessEnv) {
                // see https://github.com/supertokens/supertokens-node/issues/127
                let randomNum = Math.random() * 10;
                if (randomNum > 7) {
                    this.sendTelemetry();
                }
            } else {
                this.sendTelemetry();
            }
        }
    }
    static init(config) {
        if (SuperTokens.instance === undefined) {
            SuperTokens.instance = new SuperTokens(config);
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
