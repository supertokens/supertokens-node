// @ts-nocheck
/**
 * We need this to reset the combinedJWKS in tests because we need to create a new instance of the combinedJWKS
 * for each test to avoid caching issues.
 * This is called when the session recipe is reset and when the oauth2provider recipe is reset.
 * Calling this multiple times doesn't cause an issue.
 */
export declare function resetCombinedJWKS(): void;
/**
    The function returned by this getter fetches all JWKs from the first available core instance.
    This combines the other JWKS functions to become error resistant.

    Every core instance a backend is connected to is expected to connect to the same database and use the same key set for
    token verification. Otherwise, the result of session verification would depend on which core is currently available.
*/
export declare function getCombinedJWKS(config: {
    jwksRefreshIntervalSec: number;
}): (
    protectedHeader?: import("jose").JWSHeaderParameters,
    token?: import("jose").FlattenedJWSInput
) => Promise<import("jose").KeyLike>;
