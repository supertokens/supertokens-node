"use strict";
/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
const error_1 = require("./error");
const utils_1 = require("./utils");
const querier_1 = require("./querier");
const constants_1 = require("./constants");
const normalisedURLDomain_1 = require("./normalisedURLDomain");
const normalisedURLPath_1 = require("./normalisedURLPath");
class SuperTokens {
    constructor(config) {
        // instance functions below......
        this.middleware = () => {
            return (request, response, next) =>
                __awaiter(this, void 0, void 0, function* () {
                    let path = new normalisedURLPath_1.default("", request.originalUrl);
                    let method = utils_1.normaliseHttpMethod(request.method);
                    // if the prefix of the URL doesn't match the base path, we skip
                    if (!path.startsWith(this.appInfo.apiBasePath)) {
                        return next();
                    }
                    let requestRID = utils_1.getRIDFromRequest(request);
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
                            return next();
                        }
                        let id = matchedRecipe.returnAPIIdIfCanHandleRequest(path, method);
                        if (id === undefined) {
                            // the matched recipe doesn't handle this path and http method
                            return next();
                        }
                        // give task to the matched recipe
                        try {
                            yield utils_1.assertThatBodyParserHasBeenUsed(
                                matchedRecipe.getRecipeId(),
                                request,
                                response
                            );
                            return yield matchedRecipe.handleAPIRequest(id, request, response, next);
                        } catch (err) {
                            return next(err);
                        }
                    } else {
                        // we loop through all recipe modules to find the one with the matching path and method
                        for (let i = 0; i < this.recipeModules.length; i++) {
                            let id = this.recipeModules[i].returnAPIIdIfCanHandleRequest(path, method);
                            if (id !== undefined) {
                                try {
                                    yield utils_1.assertThatBodyParserHasBeenUsed(
                                        this.recipeModules[i].getRecipeId(),
                                        request,
                                        response
                                    );
                                    return yield this.recipeModules[i].handleAPIRequest(id, request, response, next);
                                } catch (err) {
                                    return next(err);
                                }
                            }
                        }
                        return next();
                    }
                });
        };
        this.errorHandler = () => {
            return (err, request, response, next) =>
                __awaiter(this, void 0, void 0, function* () {
                    if (error_1.default.isErrorFromSuperTokens(err)) {
                        // if it's a general error, we extract the actual error and call the user's error handler
                        if (err.type === error_1.default.GENERAL_ERROR) {
                            return next(err.payload);
                        }
                        if (err.type === error_1.default.BAD_INPUT_ERROR) {
                            return utils_1.sendNon200Response(err.rId, response, err.message, 400);
                        }
                        // we loop through all the recipes and pass the error to the one that matches the rId
                        for (let i = 0; i < this.recipeModules.length; i++) {
                            let rId = this.recipeModules[i].getRecipeId();
                            if (rId === err.rId) {
                                try {
                                    return this.recipeModules[i].handleError(err, request, response, next);
                                } catch (error) {
                                    return next(error);
                                }
                            }
                        }
                    }
                    return next(err);
                });
        };
        this.getAllCORSHeaders = () => {
            let headerSet = new Set();
            headerSet.add(constants_1.HEADER_RID);
            this.recipeModules.forEach((recipe) => {
                let headers = recipe.getAllCORSHeaders();
                headers.forEach((h) => {
                    headerSet.add(h);
                });
            });
            return Array.from(headerSet);
        };
        this.appInfo = utils_1.normaliseInputAppInfoOrThrowError("", config.appInfo);
        querier_1.Querier.init(
            config.supertokens.connectionURI.split(";").map((h) => new normalisedURLDomain_1.default("", h)),
            config.supertokens.apiKey
        );
        if (config.recipeList === undefined || config.recipeList.length === 0) {
            throw new Error("Please provide at least one recipe to the supertokens.init function call");
        }
        this.recipeModules = config.recipeList.map((func) => {
            return func(this.appInfo);
        });
    }
    static init(config) {
        if (SuperTokens.instance === undefined) {
            SuperTokens.instance = new SuperTokens(config);
        } else {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                rId: "",
                payload: new Error("SuperTokens has already been initialised. Please check your code for bugs."),
            });
        }
    }
    static reset() {
        if (process.env.TEST_MODE !== "testing") {
            throw new error_1.default({
                type: error_1.default.GENERAL_ERROR,
                rId: "",
                payload: new Error("calling testing function in non testing env"),
            });
        }
        querier_1.Querier.reset();
        SuperTokens.instance = undefined;
    }
    static getInstanceOrThrowError() {
        if (SuperTokens.instance !== undefined) {
            return SuperTokens.instance;
        }
        throw new error_1.default({
            type: error_1.default.GENERAL_ERROR,
            rId: "",
            payload: new Error("Initialisation not done. Did you forget to call the SuperTokens.init function?"),
        });
    }
}
exports.default = SuperTokens;
//# sourceMappingURL=supertokens.js.map
