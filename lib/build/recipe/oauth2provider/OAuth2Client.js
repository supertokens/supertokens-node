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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuth2Client = void 0;
const utils_1 = require("../../utils");
class OAuth2Client {
    constructor({
        clientId,
        clientSecret,
        clientName,
        scope,
        redirectUris = null,
        postLogoutRedirectUris,
        authorizationCodeGrantAccessTokenLifespan = null,
        authorizationCodeGrantIdTokenLifespan = null,
        authorizationCodeGrantRefreshTokenLifespan = null,
        clientCredentialsGrantAccessTokenLifespan = null,
        implicitGrantAccessTokenLifespan = null,
        implicitGrantIdTokenLifespan = null,
        refreshTokenGrantAccessTokenLifespan = null,
        refreshTokenGrantIdTokenLifespan = null,
        refreshTokenGrantRefreshTokenLifespan = null,
        tokenEndpointAuthMethod,
        clientUri = "",
        audience = [],
        grantTypes = null,
        responseTypes = null,
        logoUri = "",
        policyUri = "",
        tosUri = "",
        createdAt,
        updatedAt,
        metadata = {},
        enableRefreshTokenRotation = false,
    }) {
        /**
         * Metadata - JSON object
         */
        this.metadata = {};
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.clientName = clientName;
        this.scope = scope;
        this.redirectUris = redirectUris;
        this.postLogoutRedirectUris = postLogoutRedirectUris;
        this.authorizationCodeGrantAccessTokenLifespan = authorizationCodeGrantAccessTokenLifespan;
        this.authorizationCodeGrantIdTokenLifespan = authorizationCodeGrantIdTokenLifespan;
        this.authorizationCodeGrantRefreshTokenLifespan = authorizationCodeGrantRefreshTokenLifespan;
        this.clientCredentialsGrantAccessTokenLifespan = clientCredentialsGrantAccessTokenLifespan;
        this.implicitGrantAccessTokenLifespan = implicitGrantAccessTokenLifespan;
        this.implicitGrantIdTokenLifespan = implicitGrantIdTokenLifespan;
        this.refreshTokenGrantAccessTokenLifespan = refreshTokenGrantAccessTokenLifespan;
        this.refreshTokenGrantIdTokenLifespan = refreshTokenGrantIdTokenLifespan;
        this.refreshTokenGrantRefreshTokenLifespan = refreshTokenGrantRefreshTokenLifespan;
        this.tokenEndpointAuthMethod = tokenEndpointAuthMethod;
        this.clientUri = clientUri;
        this.audience = audience;
        this.grantTypes = grantTypes;
        this.responseTypes = responseTypes;
        this.logoUri = logoUri;
        this.policyUri = policyUri;
        this.tosUri = tosUri;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.metadata = metadata;
        this.enableRefreshTokenRotation = enableRefreshTokenRotation;
    }
    static fromAPIResponse(response) {
        return new OAuth2Client((0, utils_1.transformObjectKeys)(response, "camelCase"));
    }
}
exports.OAuth2Client = OAuth2Client;
