"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_JWKS_REGISTRY_ENTRIES =
    exports.JWKS_FETCH_TIMEOUT_MS =
    exports.JWKS_COOLDOWN_MS =
    exports.JWKS_CACHE_MAX_AGE_MS =
        void 0;
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
const jose_1 = require("jose");
const logger_1 = require("../../logger");
// These values were previously left implicit by relying on JOSE's defaults for
// `createRemoteJWKSet`. They are the freshness policy for third-party remote JWKS
// verification: fresh keys are shared across requests for up to `JWKS_CACHE_MAX_AGE_MS`,
// a failed key lookup will not trigger another fetch for `JWKS_COOLDOWN_MS`, and any single
// fetch is aborted after `JWKS_FETCH_TIMEOUT_MS`. We now set them explicitly so this policy
// is owned by the SDK and does not silently change if JOSE's defaults change (and so unit 2
// can build a status-aware refresh on the same numbers).
exports.JWKS_CACHE_MAX_AGE_MS = 60 * 10 * 1000; // 10 minutes (JOSE default)
exports.JWKS_COOLDOWN_MS = 30 * 1000; // 30 seconds (JOSE default)
exports.JWKS_FETCH_TIMEOUT_MS = 5 * 1000; // 5 seconds (JOSE default)
// The registry keeps at most this many resolvers alive. Each entry is a small closure over
// a cached key set, so this is a bound on how many distinct JWKS endpoints we hold state for.
// When the bound is exceeded the least-recently-used entry is evicted; a later acquisition for
// that endpoint simply creates a fresh resolver.
exports.MAX_JWKS_REGISTRY_ENTRIES = 100;
// Unit 1 uses JOSE's public `createRemoteJWKSet`, which itself caches keys, coalesces
// concurrent refreshes and applies the timeout/cooldown/cache-age policy above. Keeping this
// as an injectable factory (separate from ownership/eviction) lets unit 2 swap in a
// status-aware transport without touching the registry or its callers.
const defaultResolverFactory = (url) =>
    (0, jose_1.createRemoteJWKSet)(url, {
        cacheMaxAge: exports.JWKS_CACHE_MAX_AGE_MS,
        cooldownDuration: exports.JWKS_COOLDOWN_MS,
        timeoutDuration: exports.JWKS_FETCH_TIMEOUT_MS,
    });
// The identity of a JWKS endpoint is its full canonical URL, query parameters included, with the
// fragment removed (fragments are never sent over HTTP). We deliberately do not key by provider
// id, tenant or origin: two providers pointing at the same URL should share keys, and one
// provider whose `jwksURI` changes should select a different entry.
function canonicaliseJWKSURI(jwksURI) {
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
class ThirdPartyJWKSResolvers {
    constructor(resolverFactory = defaultResolverFactory) {
        // A Map iterates in insertion order, which we use to implement LRU: the first key is the
        // least-recently-used entry and the most-recently-used entry is always re-inserted last.
        this.resolvers = new Map();
        this.resolverFactory = resolverFactory;
    }
    getResolver(jwksURI) {
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
        while (this.resolvers.size >= exports.MAX_JWKS_REGISTRY_ENTRIES) {
            const oldest = this.resolvers.keys().next().value;
            if (oldest === undefined) {
                break;
            }
            this.resolvers.delete(oldest);
            (0, logger_1.logDebugMessage)(
                `ThirdPartyJWKSResolvers: evicted resolver for ${oldest} (registry bound reached)`
            );
        }
        const resolver = this.resolverFactory(url);
        this.resolvers.set(key, resolver);
        return resolver;
    }
    // Exposed for tests/introspection only.
    get size() {
        return this.resolvers.size;
    }
}
exports.default = ThirdPartyJWKSResolvers;
