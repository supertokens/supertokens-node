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
exports.default = SAML;
const custom_1 = __importDefault(require("./custom"));
const supertokens_1 = __importDefault(require("../../../supertokens"));
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const recipe_1 = __importDefault(require("../../saml/recipe"));
function SAML(input) {
    var _a;
    if (input.config.name === undefined) {
        input.config.name = "SAML";
    }
    input.config.userInfoMap = Object.assign(Object.assign({}, input.config.userInfoMap), {
        fromUserInfoAPI: Object.assign(
            { userId: "id", email: "email" },
            (_a = input.config.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromUserInfoAPI
        ),
    });
    const supertokens = supertokens_1.default.getInstanceOrThrowError();
    const appinfo = supertokens.appInfo;
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function ({ clientType, userContext }) {
            const config = await oGetConfig({ clientType, userContext });
            config.jwksURI =
                appinfo.apiDomain.getAsStringDangerous() +
                appinfo.apiBasePath
                    .appendPath(new normalisedURLPath_1.default("/jwt/jwks.json"))
                    .getAsStringDangerous();
            return config;
        };
        originalImplementation.getAuthorisationRedirectURL = async function (input) {
            const queryParams = {
                client_id: originalImplementation.config.clientId,
                redirect_uri: input.redirectURIOnProviderDashboard,
            };
            // TODO: check clientId and redirect uri
            return {
                urlWithQueryParams:
                    appinfo.apiDomain.getAsStringDangerous() +
                    appinfo.apiBasePath
                        .appendPath(new normalisedURLPath_1.default("/saml/login"))
                        .getAsStringDangerous() +
                    "?" +
                    new URLSearchParams(queryParams).toString(),
            };
        };
        originalImplementation.exchangeAuthCodeForOAuthTokens = async function (input) {
            const samlRecipe = recipe_1.default.getInstanceOrThrowError();
            const res = await samlRecipe.recipeInterfaceImpl.exchangeCodeForToken({
                tenantId: "public",
                code: input.redirectURIInfo.redirectURIQueryParams.code,
                userContext: input.userContext,
            }); // TODO fix tenantId
            return res;
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return (0, custom_1.default)(input);
}
