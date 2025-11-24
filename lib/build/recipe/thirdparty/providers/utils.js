"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              var desc = Object.getOwnPropertyDescriptor(m, k);
              if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
                  desc = {
                      enumerable: true,
                      get: function () {
                          return m[k];
                      },
                  };
              }
              Object.defineProperty(o, k2, desc);
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, "default", { enumerable: true, value: v });
          }
        : function (o, v) {
              o["default"] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    (function () {
        var ownKeys = function (o) {
            ownKeys =
                Object.getOwnPropertyNames ||
                function (o) {
                    var ar = [];
                    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
                    return ar;
                };
            return ownKeys(o);
        };
        return function (mod) {
            if (mod && mod.__esModule) return mod;
            var result = {};
            if (mod != null)
                for (var k = ownKeys(mod), i = 0; i < k.length; i++)
                    if (k[i] !== "default") __createBinding(result, mod, k[i]);
            __setModuleDefault(result, mod);
            return result;
        };
    })();
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.doGetRequest = doGetRequest;
exports.doPostRequest = doPostRequest;
exports.verifyIdTokenFromJWKSEndpointAndGetPayload = verifyIdTokenFromJWKSEndpointAndGetPayload;
exports.discoverOIDCEndpoints = discoverOIDCEndpoints;
exports.normaliseOIDCEndpointToIncludeWellKnown = normaliseOIDCEndpointToIncludeWellKnown;
const jose = __importStar(require("jose"));
const thirdpartyUtils_1 = require("../../../thirdpartyUtils");
const normalisedURLDomain_1 = __importDefault(require("../../../normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const logger_1 = require("../../../logger");
const utils_1 = require("../../../utils");
async function doGetRequest(url, queryParams, headers) {
    (0, logger_1.logDebugMessage)(
        `GET request to ${url}, with query params ${JSON.stringify(queryParams)} and headers ${JSON.stringify(headers)}`
    );
    if ((headers === null || headers === void 0 ? void 0 : headers["Accept"]) === undefined) {
        headers = Object.assign(Object.assign({}, headers), { Accept: "application/json" });
    }
    const finalURL = new URL(url);
    finalURL.search = new URLSearchParams(queryParams).toString();
    let response = await (0, utils_1.doFetch)(finalURL.toString(), {
        headers: headers,
    });
    const stringResponse = await response.text();
    let jsonResponse = undefined;
    (0, logger_1.logDebugMessage)(`Received response with status ${response.status} and body ${stringResponse}`);
    if (response.status < 400) {
        jsonResponse = JSON.parse(stringResponse);
    }
    return {
        stringResponse,
        status: response.status,
        jsonResponse,
    };
}
async function doPostRequest(url, params, headers) {
    if (headers === undefined) {
        headers = {};
    }
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["Accept"] = "application/json"; // few providers like github don't send back json response by default
    (0, logger_1.logDebugMessage)(
        `POST request to ${url}, with params ${JSON.stringify(params)} and headers ${JSON.stringify(headers)}`
    );
    const body = new URLSearchParams(params).toString();
    let response = await (0, utils_1.doFetch)(url, {
        method: "POST",
        body,
        headers,
    });
    const stringResponse = await response.text();
    let jsonResponse = undefined;
    (0, logger_1.logDebugMessage)(`Received response with status ${response.status} and body ${stringResponse}`);
    if (response.status < 400) {
        jsonResponse = JSON.parse(stringResponse);
    }
    return {
        stringResponse,
        status: response.status,
        jsonResponse,
    };
}
async function verifyIdTokenFromJWKSEndpointAndGetPayload(idToken, jwks, otherOptions) {
    const { payload } = await jose.jwtVerify(idToken, jwks, otherOptions);
    return payload;
}
async function discoverOIDCEndpoints(config) {
    if (config.oidcDiscoveryEndpoint !== undefined) {
        const oidcInfo = await (0, thirdpartyUtils_1.getOIDCDiscoveryInfo)(config.oidcDiscoveryEndpoint);
        if (oidcInfo.authorization_endpoint !== undefined && config.authorizationEndpoint === undefined) {
            config.authorizationEndpoint = oidcInfo.authorization_endpoint;
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
        if (
            oidcInfo.code_challenge_methods_supported !== undefined &&
            config.codeChallengeMethodsSupported === undefined
        ) {
            config.codeChallengeMethodsSupported = oidcInfo.code_challenge_methods_supported;
        }
    }
}
function normaliseOIDCEndpointToIncludeWellKnown(url) {
    // we call this only for built-in providers that use OIDC. We no longer generically add well-known in the custom provider
    if (url.endsWith("/.well-known/openid-configuration") === true) {
        return url;
    }
    const normalisedDomain = new normalisedURLDomain_1.default(url);
    const normalisedPath = new normalisedURLPath_1.default(url);
    const normalisedWellKnownPath = new normalisedURLPath_1.default("/.well-known/openid-configuration");
    return (
        normalisedDomain.getAsStringDangerous() +
        normalisedPath.getAsStringDangerous() +
        normalisedWellKnownPath.getAsStringDangerous()
    );
}
