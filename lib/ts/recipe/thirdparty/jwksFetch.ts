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
import { JSONWebKeySet, JWTVerifyGetKey, createLocalJWKSet, errors as joseErrors } from "jose";
import { logDebugMessage } from "../../logger";
import { doFetch } from "../../querier";

// --- Freshness policy -------------------------------------------------------
//
// These are the same numbers unit 1 pinned when it wrapped JOSE's
// `createRemoteJWKSet`. They live here now because this module owns the
// transport: unit 2 replaces the JOSE-managed remote key set (which has no
// public fetch extension point in the supported JOSE 4.x line) with an
// SDK-owned adapter that still delegates key parsing/selection to JOSE's
// `createLocalJWKSet` and signature verification to `jwtVerify`.
//
// - fresh keys are shared across requests for up to JWKS_CACHE_MAX_AGE_MS
// - a failed key lookup will not trigger another fetch for JWKS_COOLDOWN_MS
// - a whole refresh (all attempts and waits) is abandoned after
//   JWKS_REFRESH_DEADLINE_MS, keeping the overall budget comparable to the
//   single 5s fetch timeout JOSE used before.
export const JWKS_CACHE_MAX_AGE_MS = 60 * 10 * 1000; // 10 minutes
export const JWKS_COOLDOWN_MS = 30 * 1000; // 30 seconds
export const JWKS_REFRESH_DEADLINE_MS = 5 * 1000; // 5 seconds

// --- Retry policy (fixed internally for this iteration) ---------------------
//
// At most three attempts, with a short jittered backoff before the second and
// third. All of it has to fit inside JWKS_REFRESH_DEADLINE_MS.
export const JWKS_MAX_ATTEMPTS = 3;
export const JWKS_BACKOFF_MS = [200, 600]; // before attempts 2 and 3
export const JWKS_BACKOFF_JITTER = 0.25; // 0-25% additive jitter

// HTTP statuses we treat as transient and worth retrying. 404 is intentionally
// absent here: it is only retried for Apple's canonical keys URL (see below).
export const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

// The single documented 404 exception. The Apple sign-in incident that motivated
// this work produced intermittent 404s from Apple's keys endpoint, but a 404 is
// otherwise a definitive "no such resource" and must not be retried. We match the
// canonical URL exactly (https, exact host+path, no credentials, no query) so a
// provider-supplied host or a look-alike path can never opt into 404 retries.
function isAppleCanonicalKeysURL(url: URL): boolean {
    return (
        url.protocol === "https:" &&
        url.hostname === "appleid.apple.com" &&
        (url.port === "" || url.port === "443") &&
        url.pathname === "/auth/keys" &&
        url.search === "" &&
        url.username === "" &&
        url.password === ""
    );
}

// Transport-level (pre-HTTP-response) failures we treat as transient. Anything
// not listed here — permanent DNS (ENOTFOUND), certificate validation, unsupported
// protocol, invalid URL, etc. — fails immediately. We deliberately do NOT treat an
// arbitrary TypeError as transient.
const TRANSIENT_TRANSPORT_CODES = new Set([
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "EAI_AGAIN", // temporary DNS failure (contrast with permanent ENOTFOUND)
    "EPIPE",
    "ENETUNREACH",
    "ENETDOWN",
    "EHOSTUNREACH",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
    "UND_ERR_SOCKET",
]);

/**
 * Normalised HTTP response surface the retry engine works against. Keeping this
 * tiny interface (instead of a raw `Response`) lets tests drive the engine with a
 * fake transport and keeps the fetch/runtime specifics in one place.
 */
export interface JWKSTransportResponse {
    status: number;
    getHeader: (name: string) => string | null;
    // Reads the body as text. May throw a transport error (e.g. the connection was
    // aborted mid-body); such throws carry `transient` like connect-time errors.
    readBody: () => Promise<string>;
    // Releases an unused (non-200) body without reading it, freeing the socket.
    discardBody: () => Promise<void>;
}

export type JWKSTransport = (url: URL, opts: { timeoutMs: number }) => Promise<JWKSTransportResponse>;

// A transport error tagged with whether it is worth retrying.
interface TaggedTransportError extends Error {
    transient?: boolean;
}

export interface RetryingJWKSOptions {
    transport: JWKSTransport;
    now: () => number;
    sleep: (ms: number) => Promise<void>;
    cacheMaxAgeMs: number;
    cooldownMs: number;
    deadlineMs: number;
    maxAttempts: number;
    backoffMs: number[];
    // Returns additive jitter (in ms) for a given base backoff. Injectable so tests
    // can make backoff deterministic.
    jitter: (baseMs: number) => number;
}

// A classified failure produced while trying to retrieve the JWKS. `retryable`
// drives whether the engine attempts again; `status`/`retryAfterMs` inform backoff.
class JWKSFetchError extends Error {
    retryable: boolean;
    status?: number;
    retryAfterMs?: number;

    constructor(
        message: string,
        opts: { retryable: boolean; status?: number; retryAfterMs?: number; cause?: unknown }
    ) {
        super(message);
        this.name = "JWKSFetchError";
        this.retryable = opts.retryable;
        this.status = opts.status;
        this.retryAfterMs = opts.retryAfterMs;
        if (opts.cause !== undefined) {
            // Attach the underlying cause for diagnosis without promising a public type.
            (this as any).cause = opts.cause;
        }
    }
}

// Sanitised endpoint label for debug logs: origin + path only, never credentials
// or query parameters (which can carry tenant identifiers or secrets).
function sanitiseEndpoint(url: URL): string {
    return `${url.origin}${url.pathname}`;
}

/**
 * Parses an HTTP `Retry-After` header into a wait in milliseconds.
 * Accepts a non-negative integer number of seconds or an HTTP date. Invalid
 * values yield `undefined` (ignored); past dates yield 0.
 */
export function parseRetryAfterMs(headerValue: string | null, nowMs: number): number | undefined {
    if (headerValue === null) {
        return undefined;
    }
    const trimmed = headerValue.trim();
    if (trimmed === "") {
        return undefined;
    }
    if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10) * 1000;
    }
    const dateMs = Date.parse(trimmed);
    if (!Number.isNaN(dateMs)) {
        return Math.max(0, dateMs - nowMs);
    }
    return undefined;
}

function isValidJWKS(json: unknown): json is JSONWebKeySet {
    return typeof json === "object" && json !== null && Array.isArray((json as { keys?: unknown }).keys);
}

// Decides whether a raw transport throw is worth retrying. A transport may tag its
// error with `transient` (the default transport does this for its own timeouts);
// otherwise we classify by the runtime error code. Anything not recognised as
// transient — permanent DNS (ENOTFOUND), certificate errors, invalid URL, an
// arbitrary TypeError — is treated as permanent and fails immediately.
function isTransientTransportError(err: unknown): boolean {
    if ((err as TaggedTransportError)?.transient === true) {
        return true;
    }
    const anyErr = err as { code?: string; cause?: { code?: string }; name?: string } | undefined;
    const code = anyErr?.code ?? anyErr?.cause?.code;
    return (code !== undefined && TRANSIENT_TRANSPORT_CODES.has(code)) || anyErr?.name === "TimeoutError";
}

// Turns a timed-out (aborted) transport throw into a tagged error so the engine
// classifies it as transient regardless of the underlying abort error shape.
function tagTimeoutError(err: unknown): TaggedTransportError {
    const e: TaggedTransportError = new Error("JWKS fetch timed out");
    e.transient = true;
    (e as any).cause = err;
    return e;
}

// The default transport reuses the SDK's own `doFetch`, so it inherits the SDK's
// runtime handling (native fetch when available, cross-fetch otherwise, and the
// Cloudflare Workers cache/redirect quirks). `doFetch` applies `redirect: "manual"`
// so redirects are never followed (preserving JOSE's no-redirect behavior): a
// redirect surfaces as a non-200 status and fails immediately in the engine.
// Unlike `doGetRequest`, `doFetch` does not log response bodies. We pass a real
// AbortController signal so timed-out requests are genuinely aborted.
const defaultTransport: JWKSTransport = async (url, { timeoutMs }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
        response = await doFetch(url.toString(), {
            method: "GET",
            signal: controller.signal,
            headers: { Accept: "application/json" },
        });
    } catch (err) {
        clearTimeout(timer);
        throw controller.signal.aborted ? tagTimeoutError(err) : err;
    }
    return {
        status: response.status,
        getHeader: (name: string) => response.headers.get(name),
        readBody: async () => {
            try {
                return await response.text();
            } catch (err) {
                throw controller.signal.aborted ? tagTimeoutError(err) : err;
            } finally {
                clearTimeout(timer);
            }
        },
        discardBody: async () => {
            clearTimeout(timer);
            // Release the socket without reading the body. Handle both a WHATWG
            // ReadableStream (native fetch) and a Node Readable (cross-fetch).
            const body = response.body as unknown as
                | { cancel?: () => Promise<void>; destroy?: () => void; resume?: () => void }
                | null
                | undefined;
            try {
                if (typeof body?.cancel === "function") {
                    await body.cancel();
                } else if (typeof body?.destroy === "function") {
                    body.destroy();
                } else if (typeof body?.resume === "function") {
                    body.resume();
                }
            } catch {
                // Best-effort: the body may already be consumed or unsupported.
            }
        },
    };
};

function defaultSleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultJitter(baseMs: number): number {
    return Math.random() * JWKS_BACKOFF_JITTER * baseMs;
}

function resolveOptions(overrides?: Partial<RetryingJWKSOptions>): RetryingJWKSOptions {
    return {
        transport: overrides?.transport ?? defaultTransport,
        now: overrides?.now ?? Date.now,
        sleep: overrides?.sleep ?? defaultSleep,
        cacheMaxAgeMs: overrides?.cacheMaxAgeMs ?? JWKS_CACHE_MAX_AGE_MS,
        cooldownMs: overrides?.cooldownMs ?? JWKS_COOLDOWN_MS,
        deadlineMs: overrides?.deadlineMs ?? JWKS_REFRESH_DEADLINE_MS,
        maxAttempts: overrides?.maxAttempts ?? JWKS_MAX_ATTEMPTS,
        backoffMs: overrides?.backoffMs ?? JWKS_BACKOFF_MS,
        jitter: overrides?.jitter ?? defaultJitter,
    };
}

// A single GET + classification. Returns the parsed JWKS on success or throws a
// JWKSFetchError whose `retryable` flag the engine honors.
async function attemptFetch(url: URL, timeoutMs: number, opts: RetryingJWKSOptions): Promise<JSONWebKeySet> {
    let response: JWKSTransportResponse;
    try {
        response = await opts.transport(url, { timeoutMs });
    } catch (err) {
        const transient = isTransientTransportError(err);
        throw new JWKSFetchError(transient ? "transient transport failure" : "transport failure", {
            retryable: transient,
            cause: err,
        });
    }

    if (response.status !== 200) {
        // Release the connection: we are not going to read this body.
        await response.discardBody();
        const retryableStatus =
            RETRYABLE_HTTP_STATUSES.has(response.status) || (response.status === 404 && isAppleCanonicalKeysURL(url));
        const retryAfterMs = retryableStatus
            ? parseRetryAfterMs(response.getHeader("retry-after"), opts.now())
            : undefined;
        throw new JWKSFetchError(`unexpected JWKS response status ${response.status}`, {
            retryable: retryableStatus,
            status: response.status,
            retryAfterMs,
        });
    }

    let body: string;
    try {
        body = await response.readBody();
    } catch (err) {
        const transient = isTransientTransportError(err);
        throw new JWKSFetchError(transient ? "transient transport failure reading body" : "failed reading body", {
            retryable: transient,
            cause: err,
        });
    }

    let json: unknown;
    try {
        json = JSON.parse(body);
    } catch (err) {
        // A 200 with a malformed body is not a transient network problem.
        throw new JWKSFetchError("malformed JWKS JSON", { retryable: false, cause: err });
    }
    if (!isValidJWKS(json)) {
        throw new JWKSFetchError("malformed JWKS (missing keys array)", { retryable: false });
    }
    return json;
}

/**
 * Runs the bounded, status-aware retry sequence for one JWKS refresh and returns
 * the parsed key set. One call owns one attempt counter, backoff sequence and
 * deadline; it emits a single sanitised debug line per fetch attempt.
 */
async function fetchJWKSWithRetries(url: URL, opts: RetryingJWKSOptions): Promise<JSONWebKeySet> {
    const start = opts.now();
    const deadline = start + opts.deadlineMs;
    const endpoint = sanitiseEndpoint(url);

    let retryAfterMs: number | undefined;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        if (attempt > 1) {
            const base = opts.backoffMs[attempt - 2] ?? 0;
            // Honor both the normal backoff floor and any Retry-After the previous
            // response asked for: wait at least the larger of the two.
            let waitMs = base + opts.jitter(base);
            if (retryAfterMs !== undefined) {
                waitMs = Math.max(waitMs, retryAfterMs);
            }
            retryAfterMs = undefined;
            // If waiting would leave no time to actually make the next request, stop
            // now rather than sleeping past the deadline only to give up.
            if (opts.now() + waitMs >= deadline) {
                break;
            }
            await opts.sleep(waitMs);
        }

        const remaining = deadline - opts.now();
        if (remaining <= 0) {
            break;
        }

        try {
            const json = await attemptFetch(url, remaining, opts);
            logDebugMessage(
                `ThirdPartyJWKS: fetched ${endpoint} on attempt ${attempt}/${opts.maxAttempts} in ${
                    opts.now() - start
                }ms`
            );
            return json;
        } catch (err) {
            const fetchErr = err as JWKSFetchError;
            lastError = fetchErr;
            logDebugMessage(
                `ThirdPartyJWKS: attempt ${attempt}/${opts.maxAttempts} for ${endpoint} failed after ${
                    opts.now() - start
                }ms (${fetchErr.status !== undefined ? `status ${fetchErr.status}` : fetchErr.message}, ${
                    fetchErr.retryable ? "retryable" : "not retryable"
                })`
            );
            if (!fetchErr.retryable) {
                throw fetchErr;
            }
            retryAfterMs = fetchErr.retryAfterMs;
        }
    }

    throw lastError ?? new JWKSFetchError("JWKS retrieval exhausted its retry budget", { retryable: true });
}

/**
 * An SDK-owned drop-in replacement for JOSE's remote JWKS resolver that adds
 * bounded, status-aware retries around the HTTP GET while leaving key parsing,
 * selection and signature verification to JOSE.
 *
 * Freshness/cooldown/coalescing mirror JOSE's `RemoteJWKSet`:
 * - keys are reused while fresh (within cacheMaxAgeMs of the last success);
 * - an unknown key id triggers at most one refresh per cooldown window;
 * - concurrent callers share a single in-flight refresh.
 *
 * The shared refresh owns its own deadline and per-request timeouts; no caller
 * holds an abort handle on it, so one caller abandoning verification can never
 * abort a refresh that other callers still need.
 */
class RetryingRemoteJWKSet {
    private local: JWTVerifyGetKey | undefined;
    private jwksTimestamp: number | undefined;
    private pendingRefresh: Promise<void> | undefined;

    constructor(private readonly url: URL, private readonly opts: RetryingJWKSOptions) {}

    private fresh(): boolean {
        return this.jwksTimestamp !== undefined && this.opts.now() < this.jwksTimestamp + this.opts.cacheMaxAgeMs;
    }

    private coolingDown(): boolean {
        return this.jwksTimestamp !== undefined && this.opts.now() < this.jwksTimestamp + this.opts.cooldownMs;
    }

    private reload(): Promise<void> {
        if (this.pendingRefresh === undefined) {
            this.pendingRefresh = fetchJWKSWithRetries(this.url, this.opts)
                .then((json) => {
                    this.local = createLocalJWKSet(json);
                    this.jwksTimestamp = this.opts.now();
                })
                .finally(() => {
                    this.pendingRefresh = undefined;
                });
        }
        return this.pendingRefresh;
    }

    getKey: JWTVerifyGetKey = async (protectedHeader, token) => {
        if (this.local === undefined || !this.fresh()) {
            await this.reload();
        }
        try {
            return await this.local!(protectedHeader, token);
        } catch (err) {
            // An unknown key id may mean the provider rotated keys. Refresh once per
            // cooldown window and retry the lookup; every other verification failure
            // (bad signature, audience, expiry, ...) propagates untouched.
            if (err instanceof joseErrors.JWKSNoMatchingKey && !this.coolingDown()) {
                await this.reload();
                return this.local!(protectedHeader, token);
            }
            throw err;
        }
    };
}

/**
 * Creates a retrying remote JWKS resolver. Drop-in for JOSE's
 * `createRemoteJWKSet`; the optional overrides exist for tests (transport/clock
 * seams and policy knobs).
 */
export function createRetryingRemoteJWKSet(url: URL, overrides?: Partial<RetryingJWKSOptions>): JWTVerifyGetKey {
    return new RetryingRemoteJWKSet(url, resolveOptions(overrides)).getKey;
}

// Exposed for focused tests of the retry engine without going through the resolver.
export const __testInternals = {
    fetchJWKSWithRetries,
    resolveOptions,
    isAppleCanonicalKeysURL,
    isTransientTransportError,
    JWKSFetchError,
};
