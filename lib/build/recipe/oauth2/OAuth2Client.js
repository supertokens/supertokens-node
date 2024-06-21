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
        authorizationCodeGrantAccessTokenLifespan = null,
        authorizationCodeGrantIdTokenLifespan = null,
        authorizationCodeGrantRefreshTokenLifespan = null,
        clientCredentialsGrantAccessTokenLifespan = null,
        implicitGrantAccessTokenLifespan = null,
        implicitGrantIdTokenLifespan = null,
        jwtBearerGrantAccessTokenLifespan = null,
        refreshTokenGrantAccessTokenLifespan = null,
        refreshTokenGrantIdTokenLifespan = null,
        refreshTokenGrantRefreshTokenLifespan = null,
        tokenEndpointAuthMethod,
        tokenEndpointAuthSigningAlg,
        accessTokenStrategy,
        backchannelLogoutSessionRequired = false,
        backchannelLogoutUri,
        frontchannelLogoutSessionRequired = false,
        frontchannelLogoutUri,
        requestObjectSigningAlg,
        sectorIdentifierUri,
        userinfoSignedResponseAlg,
        jwks = {},
        jwksUri,
        owner = "",
        clientUri = "",
        allowedCorsOrigins = [],
        audience = [],
        grantTypes = null,
        postLogoutRedirectUris,
        requestUris,
        responseTypes = null,
        contacts = null,
        logoUri = "",
        policyUri = "",
        tosUri = "",
        skipConsent = false,
        skipLogoutConsent = null,
        subjectType,
        createdAt,
        updatedAt,
        registrationAccessToken,
        registrationClientUri,
        metadata = {},
    }) {
        /**
         * Metadata - JSON object
         * JSONRawMessage represents a json.RawMessage that works well with JSON, SQL, and Swagger.
         */
        this.metadata = {};
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.clientName = clientName;
        this.scope = scope;
        this.redirectUris = redirectUris;
        this.authorizationCodeGrantAccessTokenLifespan = authorizationCodeGrantAccessTokenLifespan;
        this.authorizationCodeGrantIdTokenLifespan = authorizationCodeGrantIdTokenLifespan;
        this.authorizationCodeGrantRefreshTokenLifespan = authorizationCodeGrantRefreshTokenLifespan;
        this.clientCredentialsGrantAccessTokenLifespan = clientCredentialsGrantAccessTokenLifespan;
        this.implicitGrantAccessTokenLifespan = implicitGrantAccessTokenLifespan;
        this.implicitGrantIdTokenLifespan = implicitGrantIdTokenLifespan;
        this.jwtBearerGrantAccessTokenLifespan = jwtBearerGrantAccessTokenLifespan;
        this.refreshTokenGrantAccessTokenLifespan = refreshTokenGrantAccessTokenLifespan;
        this.refreshTokenGrantIdTokenLifespan = refreshTokenGrantIdTokenLifespan;
        this.refreshTokenGrantRefreshTokenLifespan = refreshTokenGrantRefreshTokenLifespan;
        this.tokenEndpointAuthMethod = tokenEndpointAuthMethod;
        this.tokenEndpointAuthSigningAlg = tokenEndpointAuthSigningAlg;
        this.accessTokenStrategy = accessTokenStrategy;
        this.backchannelLogoutSessionRequired = backchannelLogoutSessionRequired;
        this.backchannelLogoutUri = backchannelLogoutUri;
        this.frontchannelLogoutSessionRequired = frontchannelLogoutSessionRequired;
        this.frontchannelLogoutUri = frontchannelLogoutUri;
        this.requestObjectSigningAlg = requestObjectSigningAlg;
        this.sectorIdentifierUri = sectorIdentifierUri;
        this.userinfoSignedResponseAlg = userinfoSignedResponseAlg;
        this.jwks = jwks;
        this.jwksUri = jwksUri;
        this.owner = owner;
        this.clientUri = clientUri;
        this.allowedCorsOrigins = allowedCorsOrigins;
        this.audience = audience;
        this.grantTypes = grantTypes;
        this.postLogoutRedirectUris = postLogoutRedirectUris;
        this.requestUris = requestUris;
        this.responseTypes = responseTypes;
        this.contacts = contacts;
        this.logoUri = logoUri;
        this.policyUri = policyUri;
        this.tosUri = tosUri;
        this.skipConsent = skipConsent;
        this.skipLogoutConsent = skipLogoutConsent;
        this.subjectType = subjectType;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.registrationAccessToken = registrationAccessToken;
        this.registrationClientUri = registrationClientUri;
        this.metadata = metadata;
    }
    static fromAPIResponse(response) {
        return new OAuth2Client(utils_1.transformObjectKeys(response, "camelCase"));
    }
}
exports.OAuth2Client = OAuth2Client;
