// @ts-nocheck
import { JWTVerifyGetKey } from "jose";
export declare const JWKS_CACHE_MAX_AGE_MS: number;
export declare const JWKS_COOLDOWN_MS: number;
export declare const JWKS_FETCH_TIMEOUT_MS: number;
export declare const MAX_JWKS_REGISTRY_ENTRIES = 100;
export type JWKSResolverFactory = (url: URL) => JWTVerifyGetKey;
/**
 * A bounded, SDK-instance-owned registry of remote JWKS resolvers for third-party providers.
 *
 * Providers are constructed per request, so a resolver scoped to a single provider instance
 * (as it previously was) can never reuse keys across sign-in requests. Owning the resolvers here,
 * on the SuperTokens instance, lets independent requests for the same endpoint share fresh keys
 * and in-flight refreshes, while different endpoints stay isolated. The registry is dropped when
 * the SuperTokens instance is reset/torn down, so there is no process-global state and no timer.
 */
export default class ThirdPartyJWKSResolvers {
    private readonly resolvers;
    private readonly resolverFactory;
    constructor(resolverFactory?: JWKSResolverFactory);
    getResolver(jwksURI: string): JWTVerifyGetKey;
    get size(): number;
}
