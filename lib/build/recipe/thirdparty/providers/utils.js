"use strict";
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  },
              });
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
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverOIDCEndpoints = exports.verifyIdTokenFromJWKSEndpointAndGetPayload = exports.doPostRequest = exports.doGetRequest = void 0;
const jose = __importStar(require("jose"));
const normalisedURLDomain_1 = __importDefault(require("../../../normalisedURLDomain"));
const normalisedURLPath_1 = __importDefault(require("../../../normalisedURLPath"));
const logger_1 = require("../../../logger");
const utils_1 = require("../../../utils");
async function doGetRequest(url, queryParams, headers) {
    logger_1.logDebugMessage(
        `GET request to ${url}, with query params ${JSON.stringify(queryParams)} and headers ${JSON.stringify(headers)}`
    );
    if ((headers === null || headers === void 0 ? void 0 : headers["Accept"]) === undefined) {
        headers = Object.assign(Object.assign({}, headers), { Accept: "application/json" });
    }
    const finalURL = new URL(url);
    finalURL.search = new URLSearchParams(queryParams).toString();
    let response = await utils_1.doFetch(finalURL.toString(), {
        headers: headers,
    });
    const stringResponse = await response.text();
    let jsonResponse = undefined;
    if (response.status < 400) {
        jsonResponse = JSON.parse(stringResponse);
    }
    logger_1.logDebugMessage(`Received response with status ${response.status} and body ${stringResponse}`);
    return {
        stringResponse,
        status: response.status,
        jsonResponse,
    };
}
exports.doGetRequest = doGetRequest;
async function doPostRequest(url, params, headers) {
    if (headers === undefined) {
        headers = {};
    }
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["Accept"] = "application/json"; // few providers like github don't send back json response by default
    logger_1.logDebugMessage(
        `POST request to ${url}, with params ${JSON.stringify(params)} and headers ${JSON.stringify(headers)}`
    );
    const body = new URLSearchParams(params).toString();
    let response = await utils_1.doFetch(url, {
        method: "POST",
        body,
        headers,
    });
    const stringResponse = await response.text();
    let jsonResponse = undefined;
    if (response.status < 400) {
        jsonResponse = JSON.parse(stringResponse);
    }
    logger_1.logDebugMessage(`Received response with status ${response.status} and body ${stringResponse}`);
    return {
        stringResponse,
        status: response.status,
        jsonResponse,
    };
}
exports.doPostRequest = doPostRequest;
async function verifyIdTokenFromJWKSEndpointAndGetPayload(idToken, jwks, otherOptions) {
    const { payload } = await jose.jwtVerify(idToken, jwks, otherOptions);
    return payload;
}
exports.verifyIdTokenFromJWKSEndpointAndGetPayload = verifyIdTokenFromJWKSEndpointAndGetPayload;
// OIDC utils
var oidcInfoMap = {};
async function getOIDCDiscoveryInfo(issuer) {
    const normalizedDomain = new normalisedURLDomain_1.default(issuer);
    let normalizedPath = new normalisedURLPath_1.default(issuer);
    const openIdConfigPath = new normalisedURLPath_1.default("/.well-known/openid-configuration");
    normalizedPath = normalizedPath.appendPath(openIdConfigPath);
    if (oidcInfoMap[issuer] !== undefined) {
        return oidcInfoMap[issuer];
    }
    const oidcInfo = await doGetRequest(
        normalizedDomain.getAsStringDangerous() + normalizedPath.getAsStringDangerous()
    );
    if (oidcInfo.status >= 400) {
        logger_1.logDebugMessage(
            `Received response with status ${oidcInfo.status} and body ${oidcInfo.stringResponse}`
        );
        throw new Error(`Received response with status ${oidcInfo.status} and body ${oidcInfo.stringResponse}`);
    }
    oidcInfoMap[issuer] = oidcInfo.jsonResponse;
    return oidcInfo.jsonResponse;
}
async function discoverOIDCEndpoints(config) {
    if (config.oidcDiscoveryEndpoint !== undefined) {
        const oidcInfo = await getOIDCDiscoveryInfo(config.oidcDiscoveryEndpoint);
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
    }
    return config;
}
exports.discoverOIDCEndpoints = discoverOIDCEndpoints;
