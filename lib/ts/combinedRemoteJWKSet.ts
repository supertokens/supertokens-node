import { createRemoteJWKSet } from "jose";
import { JWKCacheCooldownInMs, JWKCacheMaxAgeInMs } from "./recipe/session/constants";
import { Querier } from "./querier";

let combinedJWKS: ReturnType<typeof createRemoteJWKSet> | undefined;

/**
 * We need this to reset the combinedJWKS in tests because we need to create a new instance of the combinedJWKS
 * for each test to avoid caching issues.
 * This is called when the session recipe is reset and when the oauth2provider recipe is reset.
 * Calling this multiple times doesn't cause an issue.
 */
export function resetCombinedJWKS() {
    combinedJWKS = undefined;
}

// TODO: remove this after proper core support
const hydraJWKS = createRemoteJWKSet(new URL("http://localhost:4444/.well-known/jwks.json"), {
    cooldownDuration: JWKCacheCooldownInMs,
    cacheMaxAge: JWKCacheMaxAgeInMs,
});
/**
    The function returned by this getter fetches all JWKs from the first available core instance. 
    This combines the other JWKS functions to become error resistant.

    Every core instance a backend is connected to is expected to connect to the same database and use the same key set for
    token verification. Otherwise, the result of session verification would depend on which core is currently available.
*/
export function getCombinedJWKS() {
    if (combinedJWKS === undefined) {
        const JWKS: ReturnType<typeof createRemoteJWKSet>[] = Querier.getNewInstanceOrThrowError(undefined)
            .getAllCoreUrlsForPath("/.well-known/jwks.json")
            .map((url) =>
                createRemoteJWKSet(new URL(url), {
                    cooldownDuration: JWKCacheCooldownInMs,
                    cacheMaxAge: JWKCacheMaxAgeInMs,
                })
            );

        combinedJWKS = async (...args) => {
            let lastError = undefined;

            if (!args[0]?.kid?.startsWith("s-") && !args[0]?.kid?.startsWith("d-")) {
                return hydraJWKS(...args);
            }

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
