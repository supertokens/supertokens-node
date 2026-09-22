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
import { JWTVerifyGetKey } from "jose";
import { logDebugMessage } from "../../logger";
import { createRetryingRemoteJWKSet } from "./jwksFetch";

// The freshness policy (cache age, cooldown, fetch/refresh budget) now lives in `jwksFetch`,
// which owns the transport. Re-exported here so the registry's freshness contract stays
// discoverable from a single module.
export { JWKS_CACHE_MAX_AGE_MS, JWKS_COOLDOWN_MS, JWKS_REFRESH_DEADLINE_MS } from "./jwksFetch";

// The registry keeps at most this many resolvers alive. Each entry is a small closure over
// a cached key set, so this is a bound on how many distinct JWKS endpoints we hold state for.
// When the bound is exceeded the least-recently-used entry is evicted; a later acquisition for
// that endpoint simply creates a fresh resolver.
export const MAX_JWKS_REGISTRY_ENTRIES = 100;

export type JWKSResolverFactory = (url: URL) => JWTVerifyGetKey;

// Unit 2 replaces JOSE's `createRemoteJWKSet` with an SDK-owned resolver that adds bounded,
// status-aware retries around the JWKS HTTP GET while preserving JOSE's key caching, refresh
// coalescing and cooldown/cache-age policy. Keeping this as an injectable factory (separate
// from ownership/eviction) means the registry and its callers are unaffected by the swap.
const defaultResolverFactory: JWKSResolverFactory = (url: URL) => createRetryingRemoteJWKSet(url);

// The identity of a JWKS endpoint is its full canonical URL, query parameters included, with the
// fragment removed (fragments are never sent over HTTP). We deliberately do not key by provider
// id, tenant or origin: two providers pointing at the same URL should share keys, and one
// provider whose `jwksURI` changes should select a different entry.
function canonicaliseJWKSURI(jwksURI: string): { key: string; url: URL } {
    const url = new URL(jwksURI);
    url.hash = "";
    return { key: url.toString(), url };
}

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
    // A Map iterates in insertion order, which we use to implement LRU: the first key is the
    // least-recently-used entry and the most-recently-used entry is always re-inserted last.
    private readonly resolvers: Map<string, JWTVerifyGetKey> = new Map();
    private readonly resolverFactory: JWKSResolverFactory;

    constructor(resolverFactory: JWKSResolverFactory = defaultResolverFactory) {
        this.resolverFactory = resolverFactory;
    }

    getResolver(jwksURI: string): JWTVerifyGetKey {
        const { key, url } = canonicaliseJWKSURI(jwksURI);

        const existing = this.resolvers.get(key);
        if (existing !== undefined) {
            // Mark as most-recently-used by re-inserting at the end.
            this.resolvers.delete(key);
            this.resolvers.set(key, existing);
            return existing;
        }

        // Evict least-recently-used entries until we are within the bound. Evicting only drops the
        // registry's reference; a resolver already handed to an in-flight verification keeps working.
        while (this.resolvers.size >= MAX_JWKS_REGISTRY_ENTRIES) {
            const oldest = this.resolvers.keys().next().value;
            if (oldest === undefined) {
                break;
            }
            this.resolvers.delete(oldest);
            logDebugMessage(`ThirdPartyJWKSResolvers: evicted resolver for ${oldest} (registry bound reached)`);
        }

        const resolver = this.resolverFactory(url);
        this.resolvers.set(key, resolver);
        return resolver;
    }

    // Exposed for tests/introspection only.
    get size(): number {
        return this.resolvers.size;
    }
}
