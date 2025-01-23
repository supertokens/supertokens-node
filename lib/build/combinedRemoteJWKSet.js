"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCombinedJWKS = resetCombinedJWKS;
exports.getCombinedJWKS = getCombinedJWKS;
const jose_1 = require("jose");
const constants_1 = require("./recipe/session/constants");
const querier_1 = require("./querier");
let combinedJWKS;
/**
 * We need this to reset the combinedJWKS in tests because we need to create a new instance of the combinedJWKS
 * for each test to avoid caching issues.
 * This is called when the session recipe is reset and when the oauth2provider recipe is reset.
 * Calling this multiple times doesn't cause an issue.
 */
function resetCombinedJWKS() {
    combinedJWKS = undefined;
}
/**
    The function returned by this getter fetches all JWKs from the first available core instance.
    This combines the other JWKS functions to become error resistant.

    Every core instance a backend is connected to is expected to connect to the same database and use the same key set for
    token verification. Otherwise, the result of session verification would depend on which core is currently available.
*/
function getCombinedJWKS(config) {
    if (combinedJWKS === undefined) {
        const JWKS = querier_1.Querier.getNewInstanceOrThrowError(undefined)
            .getAllCoreUrlsForPath("/.well-known/jwks.json")
            .map((url) =>
                (0, jose_1.createRemoteJWKSet)(new URL(url), {
                    cacheMaxAge: config.jwksRefreshIntervalSec * 1000,
                    cooldownDuration: constants_1.JWKCacheCooldownInMs,
                })
            );
        combinedJWKS = async (...args) => {
            let lastError = undefined;
            if (JWKS.length === 0) {
                throw Error(
                    "No SuperTokens core available to query. Please pass supertokens > connectionURI to the init function, or override all the functions of the recipe you are using."
                );
            }
            for (const jwks of JWKS) {
                try {
                    // We await before returning to make sure we catch the error
                    return await jwks(...args);
                } catch (ex) {
                    lastError = ex;
                }
            }
            throw lastError;
        };
    }
    return combinedJWKS;
}
