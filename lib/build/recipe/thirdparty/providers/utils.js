"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverOIDCEndpoints = void 0;
const utils_1 = require("../../utils");
async function discoverOIDCEndpoints(config) {
    if (config.oidcDiscoveryEndpoint !== undefined) {
        const oidcInfo = await utils_1.getOIDCDiscoveryInfo(config.oidcDiscoveryEndpoint);
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
}
exports.discoverOIDCEndpoints = discoverOIDCEndpoints;
