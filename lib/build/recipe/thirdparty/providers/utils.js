"use strict";
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
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const qs = require("querystring");
const axios_1 = require("axios");
const normalisedURLDomain_1 = require("../../../normalisedURLDomain");
const normalisedURLPath_1 = require("../../../normalisedURLPath");
const logger_1 = require("../../../logger");
function doGetRequest(url, queryParams, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.logDebugMessage(
            `GET request to ${url}, with query params ${JSON.stringify(queryParams)} and headers ${JSON.stringify(
                headers
            )}`
        );
        try {
            let response = yield axios_1.default.get(url, {
                params: queryParams,
                headers: headers,
            });
            logger_1.logDebugMessage(
                `Received response with status ${response.status} and body ${JSON.stringify(response.data)}`
            );
            return response.data;
        } catch (err) {
            if (axios_1.default.isAxiosError(err)) {
                const response = err.response;
                logger_1.logDebugMessage(
                    `Received response with status ${response.status} and body ${JSON.stringify(response.data)}`
                );
            }
            throw err;
        }
    });
}
exports.doGetRequest = doGetRequest;
function doPostRequest(url, params, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        if (headers === undefined) {
            headers = {};
        }
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        headers["Accept"] = "application/json"; // few providers like github don't send back json response by default
        logger_1.logDebugMessage(
            `POST request to ${url}, with params ${JSON.stringify(params)} and headers ${JSON.stringify(headers)}`
        );
        try {
            const body = qs.stringify(params);
            let response = yield axios_1.default.post(url, body, {
                headers: headers,
            });
            logger_1.logDebugMessage(
                `Received response with status ${response.status} and body ${JSON.stringify(response.data)}`
            );
            return response.data;
        } catch (err) {
            if (axios_1.default.isAxiosError(err)) {
                const response = err.response;
                logger_1.logDebugMessage(
                    `Received response with status ${response.status} and body ${JSON.stringify(response.data)}`
                );
            }
            throw err;
        }
    });
}
exports.doPostRequest = doPostRequest;
function verifyIdTokenFromJWKSEndpointAndGetPayload(idToken, jwksUri, otherOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = jwksClient({
            jwksUri,
        });
        function getKey(header, callback) {
            client.getSigningKey(header.kid, function (_, key) {
                var signingKey = key.publicKey || key.rsaPublicKey;
                callback(null, signingKey);
            });
        }
        let payload = yield new Promise((resolve, reject) => {
            jwt.verify(idToken, getKey, otherOptions, function (err, decoded) {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });
        return payload;
    });
}
exports.verifyIdTokenFromJWKSEndpointAndGetPayload = verifyIdTokenFromJWKSEndpointAndGetPayload;
// OIDC utils
var oidcInfoMap = {};
function getOIDCDiscoveryInfo(issuer) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedDomain = new normalisedURLDomain_1.default(issuer);
        let normalizedPath = new normalisedURLPath_1.default(issuer);
        const openIdConfigPath = new normalisedURLPath_1.default("/.well-known/openid-configuration");
        normalizedPath = normalizedPath.appendPath(openIdConfigPath);
        if (oidcInfoMap[issuer] !== undefined) {
            return oidcInfoMap[issuer];
        }
        const oidcInfo = yield doGetRequest(
            normalizedDomain.getAsStringDangerous() + normalizedPath.getAsStringDangerous()
        );
        oidcInfoMap[issuer] = oidcInfo;
        return oidcInfo;
    });
}
function discoverOIDCEndpoints(config) {
    return __awaiter(this, void 0, void 0, function* () {
        if (config.oidcDiscoveryEndpoint !== undefined) {
            const oidcInfo = yield getOIDCDiscoveryInfo(config.oidcDiscoveryEndpoint);
            if (oidcInfo.authorisation_endpoint !== undefined && config.authorizationEndpoint === undefined) {
                config.authorizationEndpoint = oidcInfo.authorisation_endpoint;
            }
            if (oidcInfo.token_endpoint !== undefined && config.tokenEndpoint === undefined) {
                config.tokenEndpoint = oidcInfo.token_endpoint;
            }
            if (oidcInfo.userinfo_endpoint !== undefined && config.userInfoEndpoint === undefined) {
                config.userInfoEndpoint = oidcInfo.userinfo_endpoint;
            }
            if (oidcInfo.jwks_uri !== undefined && config.jwksURI === undefined) {
                config.jwksURI = oidcInfo.jwks_uri;
            }
        }
        return config;
    });
}
exports.discoverOIDCEndpoints = discoverOIDCEndpoints;
