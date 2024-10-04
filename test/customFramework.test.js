let assert = require("assert");
const {
    createPreParsedRequest,
    handleAuthAPIRequest,
    withSession,
    getSessionForSSR,
} = require("../lib/build/customFramework");
let { ProcessState } = require("../lib/build/processState");
let SuperTokens = require("../lib/build/").default;
const Session = require("../lib/build/recipe/session");
const EmailPassword = require("../lib/build/recipe/emailpassword");
const { PreParsedRequest } = require("../lib/build/framework/custom");
const { printPath, setupST, startST, killAllST, cleanST } = require("./utils");
const { generateKeyPair, SignJWT, exportJWK, importJWK, decodeJwt } = require("jose");

// Helper function to create a JWKS
async function createJWKS() {
    // Generate an RSA key pair
    const { privateKey, publicKey } = await generateKeyPair("RS256");

    // Export the public key to JWK format
    const jwk = await exportJWK(publicKey);

    // Construct the JWKS
    const jwks = {
        keys: [
            {
                ...jwk,
                alg: "RS256",
                use: "sig",
                kid: "test-key-id",
            },
        ],
    };

    return { privateKey, jwks };
}

async function createJWTVerifyGetKey(jwks) {
    // Find the JWK in the set based on `kid`
    const jwk = jwks.keys.find((k) => k.kid === "test-key-id");

    if (!jwk) {
        throw new Error("Key with the specified kid not found in JWKS");
    }

    // Import the JWK as a CryptoKey suitable for RS256 verification
    return await importJWK(jwk, "RS256");
}

// Function to sign a JWT
async function signJWT(privateKey, jwks, payload, expiresIn = "2h") {
    // Find the corresponding public key in the JWKS to get the `kid` and `alg`
    const publicJWK = jwks.keys.find((k) => k.kid === "test-key-id");

    if (!publicJWK) {
        throw new Error("Key with the specified kid not found in JWKS");
    }

    // Sign the JWT using the private key
    return new SignJWT(payload)
        .setProtectedHeader({ alg: publicJWK.alg, kid: publicJWK.kid, version: "5", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(privateKey);
}

describe(`createPreParsedRequest ${printPath("[test/customFramework.test.js]")}`, () => {
    it("should create a PreParsedRequest with correct properties from the Request object", async () => {
        // Mock a Request object
        const mockRequest = {
            url: "https://example.com/path?name=test",
            method: "POST",
            headers: new Headers({
                "Content-Type": "application/json",
                Authorization: "Bearer token",
                Cookie: "session=abcd1234; theme=dark",
            }),
            formData: async () => new FormData(),
            json: async () => ({ key: "value" }),
        };

        // Assume getCookieFromRequest and getQueryFromRequest return specific mock data
        const mockCookies = { session: "abcd1234", theme: "dark" };
        const mockQuery = { name: "test" };

        // Create the PreParsedRequest
        const preParsedReq = createPreParsedRequest(mockRequest);

        // Assertions
        assert(preParsedReq instanceof PreParsedRequest, "Should return an instance of PreParsedRequest");
        assert.deepStrictEqual(
            preParsedReq.getCookieValue("session"),
            mockCookies.session,
            "Should parse `session` value from cookie correctly"
        );
        assert.deepStrictEqual(
            preParsedReq.getCookieValue("theme"),
            mockCookies.theme,
            "Should parse `session` value from cookie correctly"
        );
        assert.strictEqual(preParsedReq.getOriginalURL(), mockRequest.url, "Should set the correct URL");
        assert.strictEqual(preParsedReq.getMethod(), mockRequest.method.toLowerCase(), "Should set the correct method");
        assert.deepStrictEqual(
            preParsedReq.getKeyValueFromQuery("name"),
            mockQuery.name,
            "Should parse query parameters correctly"
        );
        assert.strictEqual(
            preParsedReq.getHeaderValue("Authorization"),
            mockRequest.headers.get("Authorization"),
            "Should set the correct headers"
        );

        // Test getJSONBody methods
        const jsonBody = await preParsedReq.getJSONBody();

        assert.deepStrictEqual(jsonBody, { key: "value" }, "getJSONBody should return parsed JSON body");
    });
});

describe(`handleAuthAPIRequest ${printPath("[test/customFramework.test.js]")}`, () => {
    let connectionURI;
    let accessToken, accessTokenPayload;
    let privateKey, jwks;

    before(async function () {
        process.env.user = undefined;
        await killAllST();
        await setupST();
        connectionURI = await startST();
        ProcessState.getInstance().reset();
        SuperTokens.init({
            supertokens: {
                connectionURI,
            },
            appInfo: {
                apiDomain: "api.supertokens.io",
                appName: "SuperTokens",
                apiBasePath: "/api/auth",
                websiteDomain: "supertokens.io",
            },
            recipeList: [
                EmailPassword.init(),
                Session.init({
                    override: {
                        functions: (oI) => {
                            return {
                                ...oI,
                                createNewSession: async (input) => {
                                    let session = await oI.createNewSession(input);
                                    process.env.user = session.getUserId();
                                    return session;
                                },
                            };
                        },
                    },
                }),
            ],
        });

        const { privateKey: privateKeyGenerated, jwks: jwksGenerated } = await createJWKS();
        privateKey = privateKeyGenerated;
        jwks = jwksGenerated;
    });

    after(async function () {
        await killAllST();
        await cleanST();
    });

    const CustomResponse = class extends Response {};

    it("should sign-up successfully", async () => {
        const handleCall = handleAuthAPIRequest(CustomResponse);

        const mockRequest = new Request(`${connectionURI}/api/auth/signup/`, {
            method: "POST",
            headers: {
                rid: "emailpassword",
            },
            body: JSON.stringify({
                formFields: [
                    {
                        id: "email",
                        value: "john.doe@supertokens.io",
                    },
                    {
                        id: "password",
                        value: "P@sSW0rd",
                    },
                ],
            }),
        });

        // Call handleCall
        const response = await handleCall(mockRequest);

        // Assertions for response
        assert.strictEqual(response.status, 200, "Should return status 200");
        const responseBody = await response.json();
        assert.strictEqual(responseBody.status, "OK", "Response status should be OK");
        assert.ok(response.headers.get("st-access-token"), "st-access-token header should be set");
        assert.ok(response.headers.get("st-refresh-token"), "st-refresh-token header should be set");
        assert.ok(response.headers.get("front-token"), "front-token header should be set");
    });

    it("should sign-in successfully", async () => {
        const handleCall = handleAuthAPIRequest(CustomResponse);

        const mockRequest = new Request(`${connectionURI}/api/auth/signin/`, {
            method: "POST",
            headers: {
                rid: "emailpassword",
            },
            body: JSON.stringify({
                formFields: [
                    {
                        id: "email",
                        value: "john.doe@supertokens.io",
                    },
                    {
                        id: "password",
                        value: "P@sSW0rd",
                    },
                ],
            }),
        });

        // Call handleCall
        const response = await handleCall(mockRequest);

        // Assertions for response
        assert.strictEqual(response.status, 200, "Should return status 200");
        const responseBody = await response.json();
        assert.strictEqual(responseBody.status, "OK", "Response status should be OK");
        assert.deepStrictEqual(
            responseBody.user.emails[0],
            "john.doe@supertokens.io",
            "User email should be returned correctly"
        );

        accessToken = response.headers.get("st-access-token");
        accessTokenPayload = decodeJwt(accessToken);

        assert.ok(accessToken, "st-access-token header should be set");
        assert.ok(response.headers.get("st-refresh-token"), "st-refresh-token header should be set");
        assert.ok(response.headers.get("front-token"), "front-token header should be set");
    });

    // Case 1: Successful => add session to request object.
    it("withSession should create a session properly", async () => {
        const mockSessionRequest = new Request(`${connectionURI}/api/user/`, {
            method: "POST",
            headers: {
                rid: "emailpassword",
            },
            headers: {
                authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                formFields: [
                    {
                        id: "email",
                        value: "john.doe@supertokens.io",
                    },
                    {
                        id: "password",
                        value: "P@sSW0rd",
                    },
                ],
            }),
        });

        const sessionResponse = await withSession(mockSessionRequest, async (err, session) => {
            assert.strictEqual(err, undefined, "Error should be undefined");
            assert.ok(session, "Session should be present");
            assert.strictEqual(session.getUserId(), process.env.user, "Session user ID should match");

            // Return success response
            return new Response(
                JSON.stringify({
                    status: "session created",
                    userId: session.getUserId(),
                }),
                { status: 200 }
            );
        });

        // Assertions for the response
        assert.strictEqual(sessionResponse.status, 200, "Should return status 200");
        const sessionResponseBody = await sessionResponse.json();
        assert.strictEqual(
            sessionResponseBody.status,
            "session created",
            "Response status should be 'session created'"
        );
        assert.strictEqual(
            sessionResponseBody.userId,
            process.env.user,
            "Response user ID should match session user ID"
        );
    });

    // Case 2: Error => throws error when no access token is passed.
    it("withSession should pass error when session fails", async () => {
        const mockSessionRequest = new Request(`${connectionURI}/api/user/`, {
            method: "POST",
            headers: {
                rid: "emailpassword",
            },
            headers: {},
            body: JSON.stringify({
                formFields: [
                    {
                        id: "email",
                        value: "john.doe@supertokens.io",
                    },
                    {
                        id: "password",
                        value: "P@sSW0rd",
                    },
                ],
            }),
        });

        const sessionResponse = await withSession(mockSessionRequest, async (err, session) => {
            // No action required since the function will throw an error due to unauthorized
        });

        // Assertions for the response
        assert.strictEqual(sessionResponse.status, 401, "Should return status 401");
    });

    it("should return 404 for unhandled routes", async () => {
        const handleCall = handleAuthAPIRequest(CustomResponse);

        const mockRequest = new Request(`${connectionURI}/api/auth/test/`, {
            method: "GET",
            headers: {
                rid: "emailpassword",
            },
        });

        // Call handleCall
        const response = await handleCall(mockRequest);

        assert.strictEqual(response.status, 404, "Should return status 404");
        assert.strictEqual(await response.text(), "Not found", "Should return Not found");
    });

    // NOTE: For all the JWT related testing, we are using a different key because
    // the default way of getting the key is by hitting the `/jwt/jwks` endpoint
    // but that endpoint doesn't return anything for testing and thus we are testing
    // with a custom key.

    it("getSessionForSSR should return session for valid token", async () => {
        // Sign the JWT
        const validToken = await signJWT(privateKey, jwks, accessTokenPayload);

        // Create a mock request containing the valid token as a cookie
        const mockRequest = new Request("https://example.com", {
            headers: { Cookie: `sAccessToken=${validToken}` },
        });

        // Call the getSessionForSSR function
        const result = await getSessionForSSR(mockRequest, await createJWTVerifyGetKey(jwks));

        // Assertions
        assert.strictEqual(result.hasToken, true, "hasToken should be true for a valid token");
        assert.ok(result.accessTokenPayload, "accessTokenPayload should be present for a valid token");
        assert.strictEqual(result.error, undefined, "error should be undefined for a valid token");
        assert.strictEqual(result.accessTokenPayload.sub, accessTokenPayload.sub, "User ID in payload should match");
    });

    it("should return undefined accessTokenPayload and hasToken as false when no token is present", async () => {
        // Create a request without an access token
        const mockRequest = new Request("https://example.com");

        // Call the getSessionForSSR function
        const result = await getSessionForSSR(mockRequest, privateKey);

        // Assertions
        assert.strictEqual(result.hasToken, false, "hasToken should be false when no token is present");
        assert.strictEqual(
            result.accessTokenPayload,
            undefined,
            "accessTokenPayload should be undefined when no token is present"
        );
        assert.strictEqual(result.error, undefined, "error should be undefined when no token is present");
    });

    it("should handle an expired token gracefully", async () => {
        // Sign the JWT with an expiration time in the past (e.g., 1 second ago)
        const expiredToken = await signJWT(privateKey, jwks, accessTokenPayload, Math.floor(Date.now() / 1000) - 1);

        // Create a mock request containing the expired token as a cookie
        const mockRequest = new Request("https://example.com", {
            headers: { Cookie: `sAccessToken=${expiredToken}` },
        });

        // Call the getSessionForSSR function
        const result = await getSessionForSSR(mockRequest, privateKey);

        // Assertions
        assert.strictEqual(result.hasToken, true, "hasToken should be true for an expired token");
        assert.strictEqual(
            result.accessTokenPayload,
            undefined,
            "accessTokenPayload should be undefined for an expired token"
        );
        assert.strictEqual(
            result.error.type,
            "TRY_REFRESH_TOKEN",
            "error should be TRY_REFRESH_TOKEN for an expired token"
        );
    });

    it("should return an error for an invalid token", async () => {
        // Assume you have an invalid token that does not match the JWKS
        const invalidToken = "your-invalid-jwt-token";

        // Create a mock request containing the invalid token as a cookie
        const mockRequest = new Request("https://example.com", {
            headers: { Cookie: `sAccessToken=${invalidToken}` },
        });

        // Call the getSessionForSSR function
        const result = await getSessionForSSR(mockRequest, privateKey);

        // Assertions
        assert.strictEqual(result.hasToken, true, "hasToken should be true for an invalid token");
        assert.strictEqual(
            result.accessTokenPayload,
            undefined,
            "accessTokenPayload should be undefined for an invalid token"
        );
        assert.ok(result.error instanceof Error, "error should be an instance of Error for an invalid token");
    });
});
