"use strict";
/* Copyright (c) 2024, VRAI Labs and/or its affiliates. All rights reserved.
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
exports.default = getAPIInterface;
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
function getAPIInterface() {
    return {
        loginGET: async function ({ tenantId, clientId, redirectURI, state, options, userContext }) {
            const acsURL =
                options.appInfo.apiDomain.getAsStringDangerous() +
                options.appInfo.apiBasePath
                    .appendPath(new normalisedURLPath_1.default(`/${tenantId}`))
                    .appendPath(new normalisedURLPath_1.default("/saml/callback"))
                    .getAsStringDangerous();
            const result = await options.recipeImplementation.createLoginRequest({
                tenantId,
                clientId,
                acsURL,
                redirectURI,
                state,
                userContext,
            });
            return result;
        },
        callbackPOST: async function ({ tenantId, samlResponse, relayState, options, userContext }) {
            const result = await options.recipeImplementation.verifySAMLResponse({
                tenantId,
                samlResponse,
                relayState,
                userContext,
            });
            return result;
        },
    };
}
