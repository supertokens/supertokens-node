// @ts-nocheck
import { JSONWebKeySet, JWTVerifyGetKey } from "jose";
export declare const JWKS_CACHE_MAX_AGE_MS: number;
export declare const JWKS_COOLDOWN_MS: number;
export declare const JWKS_REFRESH_DEADLINE_MS: number;
export declare const JWKS_MAX_ATTEMPTS = 3;
export declare const JWKS_BACKOFF_MS: number[];
export declare const JWKS_BACKOFF_JITTER = 0.25;
export declare const RETRYABLE_HTTP_STATUSES: Set<number>;
declare function isAppleCanonicalKeysURL(url: URL): boolean;
/**
 * Normalised HTTP response surface the retry engine works against. Keeping this
 * tiny interface (instead of a raw `Response`) lets tests drive the engine with a
 * fake transport and keeps the fetch/runtime specifics in one place.
 */
export interface JWKSTransportResponse {
    status: number;
    getHeader: (name: string) => string | null;
    readBody: () => Promise<string>;
    discardBody: () => Promise<void>;
}
export type JWKSTransport = (
    url: URL,
    opts: {
        timeoutMs: number;
    }
) => Promise<JWKSTransportResponse>;
export interface RetryingJWKSOptions {
    transport: JWKSTransport;
    now: () => number;
    sleep: (ms: number) => Promise<void>;
    cacheMaxAgeMs: number;
    cooldownMs: number;
    deadlineMs: number;
    maxAttempts: number;
    backoffMs: number[];
    jitter: (baseMs: number) => number;
}
declare class JWKSFetchError extends Error {
    retryable: boolean;
    status?: number;
    retryAfterMs?: number;
    constructor(
        message: string,
        opts: {
            retryable: boolean;
            status?: number;
            retryAfterMs?: number;
            cause?: unknown;
        }
    );
}
/**
 * Parses an HTTP `Retry-After` header into a wait in milliseconds.
 * Accepts a non-negative integer number of seconds or an HTTP date. Invalid
 * values yield `undefined` (ignored); past dates yield 0.
 */
export declare function parseRetryAfterMs(headerValue: string | null, nowMs: number): number | undefined;
declare function isTransientTransportError(err: unknown): boolean;
declare function resolveOptions(overrides?: Partial<RetryingJWKSOptions>): RetryingJWKSOptions;
/**
 * Runs the bounded, status-aware retry sequence for one JWKS refresh and returns
 * the parsed key set. One call owns one attempt counter, backoff sequence and
 * deadline; it emits a single sanitised debug line per fetch attempt.
 */
declare function fetchJWKSWithRetries(url: URL, opts: RetryingJWKSOptions): Promise<JSONWebKeySet>;
/**
 * Creates a retrying remote JWKS resolver. Drop-in for JOSE's
 * `createRemoteJWKSet`; the optional overrides exist for tests (transport/clock
 * seams and policy knobs).
 */
export declare function createRetryingRemoteJWKSet(url: URL, overrides?: Partial<RetryingJWKSOptions>): JWTVerifyGetKey;
export declare const __testInternals: {
    fetchJWKSWithRetries: typeof fetchJWKSWithRetries;
    resolveOptions: typeof resolveOptions;
    isAppleCanonicalKeysURL: typeof isAppleCanonicalKeysURL;
    isTransientTransportError: typeof isTransientTransportError;
    JWKSFetchError: typeof JWKSFetchError;
};
export {};
