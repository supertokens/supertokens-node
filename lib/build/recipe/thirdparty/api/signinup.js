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
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = __importDefault(require("../error"));
const utils_1 = require("../../../utils");
const utils_2 = require("../../../utils");
const recipe_1 = __importDefault(require("../../multitenancy/recipe"));
const multitenancy_1 = require("../../multitenancy");
const constants_1 = require("../../multitenancy/constants");
function signInUpAPI(apiImplementation, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (apiImplementation.signInUpPOST === undefined) {
            return false;
        }
        const bodyParams = yield options.req.getJSONBody();
        const thirdPartyId = bodyParams.thirdPartyId;
        const clientType = bodyParams.clientType;
        let tenantId = bodyParams.tenantId;
        if (thirdPartyId === undefined || typeof thirdPartyId !== "string") {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide the thirdPartyId in request body",
            });
        }
        let redirectURIInfo;
        let oAuthTokens;
        if (bodyParams.redirectURIInfo !== undefined) {
            if (bodyParams.redirectURIInfo.redirectURIOnProviderDashboard === undefined) {
                throw new error_1.default({
                    type: error_1.default.BAD_INPUT_ERROR,
                    message: "Please provide the redirectURIOnProviderDashboard in request body",
                });
            }
            redirectURIInfo = bodyParams.redirectURIInfo;
        } else if (bodyParams.oAuthTokens !== undefined) {
            oAuthTokens = bodyParams.oAuthTokens;
        } else {
            throw new error_1.default({
                type: error_1.default.BAD_INPUT_ERROR,
                message: "Please provide one of redirectURIInfo or oAuthTokens in the request body",
            });
        }
        const userContext = utils_2.makeDefaultUserContextFromAPI(options.req);
        const mtRecipe = recipe_1.default.getInstanceOrThrowError();
        tenantId = yield mtRecipe.recipeInterfaceImpl.getTenantId({ tenantIdFromFrontend: tenantId, userContext });
        const providerResponse = yield options.recipeImplementation.getProvider({
            thirdPartyId,
            tenantId,
            clientType,
            userContext,
        });
        if (!providerResponse.thirdPartyEnabled) {
            throw new multitenancy_1.RecipeDisabledForTenantError({
                type: "RECIPE_DISABLED_FOR_TENANT_ERROR",
                message: `The third party recipe is disabled for ${
                    tenantId === undefined || tenantId === constants_1.DEFAULT_TENANT_ID ? "default tenant" : tenantId
                }`,
            });
        }
        const provider = providerResponse.provider;
        let result = yield apiImplementation.signInUpPOST({
            provider,
            redirectURIInfo,
            oAuthTokens,
            options,
            userContext,
        });
        if (result.status === "OK") {
            utils_1.send200Response(options.res, {
                status: result.status,
                user: result.user,
                createdNewUser: result.createdNewUser,
            });
        } else if (result.status === "NO_EMAIL_GIVEN_BY_PROVIDER") {
            utils_1.send200Response(options.res, {
                status: "NO_EMAIL_GIVEN_BY_PROVIDER",
            });
        } else {
            utils_1.send200Response(options.res, result);
        }
        return true;
    });
}
exports.default = signInUpAPI;
