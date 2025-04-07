let assert = require("assert");
const {
    createPreParsedRequest,
    handleAuthAPIRequest,
    withSession,
    getSessionForSSR,
} = require("../lib/build/customFramework");
let { ProcessState } = require("../lib/build/processState");
let SuperTokens = require("../lib/build/").default;
let SuperTokensWrapper = require("../lib/build/supertokens").default;
const Session = require("../lib/build/recipe/session");
const EmailPassword = require("../lib/build/recipe/emailpassword");
const { PreParsedRequest } = require("../lib/build/framework/custom");
const { printPath, createCoreApplication, getCoreUrlFromConnectionURI } = require("./utils");
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

describe(`handleAuthAPIRequest ${printPath("[test/customFramework.test.js]")}`, () => {
    let privateKey, jwks;

    beforeEach(async function () {
        process.env.user = undefined;

        ProcessState.getInstance().reset();
        const connectionURI = await createCoreApplication();

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

    after(async function () {});

    const CustomResponse = class extends Response {};

    it("should sign-up successfully", async () => {
        const handleCall = handleAuthAPIRequest(CustomResponse);

        const connectionURI = getCoreUrlFromConnectionURI(
            SuperTokensWrapper.getInstanceOrThrowError().supertokens.connectionURI
        );

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

        const connectionURI = getCoreUrlFromConnectionURI(
            SuperTokensWrapper.getInstanceOrThrowError().supertokens.connectionURI
        );

        const mockSignUpRequest = new Request(`${connectionURI}/api/auth/signup/`, {
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
        await handleCall(mockSignUpRequest);

        const mockSignInRequest = new Request(`${connectionURI}/api/auth/signin/`, {
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
        const response = await handleCall(mockSignInRequest);

        // Assertions for response
        assert.strictEqual(response.status, 200, "Should return status 200");
        const responseBody = await response.json();
        assert.strictEqual(responseBody.status, "OK", "Response status should be OK");
        assert.deepStrictEqual(
            responseBody.user.emails[0],
            "john.doe@supertokens.io",
            "User email should be returned correctly"
        );

        const accessToken = response.headers.get("st-access-token");

        assert.ok(accessToken, "st-access-token header should be set");
        assert.ok(response.headers.get("st-refresh-token"), "st-refresh-token header should be set");
        assert.ok(response.headers.get("front-token"), "front-token header should be set");
    });

    // Case 1: Successful => add session to request object.
    it("withSession should create a session properly", async () => {
        const handleCall = handleAuthAPIRequest(CustomResponse);

        const connectionURI = getCoreUrlFromConnectionURI(
            SuperTokensWrapper.getInstanceOrThrowError().supertokens.connectionURI
        );

        const mockSignUpRequest = new Request(`${connectionURI}/api/auth/signup/`, {
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
        await handleCall(mockSignUpRequest);

        const mockSignInRequest = new Request(`${connectionURI}/api/auth/signin/`, {
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
        const signInResponse = await handleCall(mockSignInRequest);

        const accessToken = signInResponse.headers.get("st-access-token");

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
        const handleCall = handleAuthAPIRequest(CustomResponse);

        const connectionURI = getCoreUrlFromConnectionURI(
            SuperTokensWrapper.getInstanceOrThrowError().supertokens.connectionURI
        );

        const mockSignUpRequest = new Request(`${connectionURI}/api/auth/signup/`, {
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
        await handleCall(mockSignUpRequest);

        const mockSignInRequest = new Request(`${connectionURI}/api/auth/signin/`, {
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
        const signInResponse = await handleCall(mockSignInRequest);

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

        const connectionURI = getCoreUrlFromConnectionURI(
            SuperTokensWrapper.getInstanceOrThrowError().supertokens.connectionURI
        );

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

    it("getSessionForSSR should return session for valid token", async () => {
        const handleCall = handleAuthAPIRequest(CustomResponse);

        const connectionURI = getCoreUrlFromConnectionURI(
            SuperTokensWrapper.getInstanceOrThrowError().supertokens.connectionURI
        );

        const mockSignUpRequest = new Request(`${connectionURI}/api/auth/signup/`, {
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
        await handleCall(mockSignUpRequest);

        const mockSignInRequest = new Request(`${connectionURI}/api/auth/signin/`, {
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
        const signInResponse = await handleCall(mockSignInRequest);

        const accessToken = signInResponse.headers.get("st-access-token");
        const accessTokenPayload = decodeJwt(accessToken);

        // Create a mock request containing the valid token as a cookie
        const mockRequest = new Request("https://example.com", {
            headers: { Cookie: `sAccessToken=${accessToken}` },
        });

        // Call the getSessionForSSR function
        const result = await getSessionForSSR(mockRequest);

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
        const result = await getSessionForSSR(mockRequest);

        // Assertions
        assert.strictEqual(result.hasToken, false, "hasToken should be false when no token is present");
        assert.strictEqual(
            result.accessTokenPayload,
            undefined,
            "accessTokenPayload should be undefined when no token is present"
        );
        assert.strictEqual(result.error, undefined, "error should be undefined when no token is present");
    });

    it("should return an error for an invalid token", async () => {
        // Assume you have an invalid token that does not match the JWKS
        const invalidToken = "your-invalid-jwt-token";

        // Create a mock request containing the invalid token as a cookie
        const mockRequest = new Request("https://example.com", {
            headers: { Cookie: `sAccessToken=${invalidToken}` },
        });

        // Call the getSessionForSSR function
        const result = await getSessionForSSR(mockRequest);

        // Assertions
        assert.strictEqual(result.hasToken, true, "hasToken should be true for an invalid token");
        assert.strictEqual(
            result.accessTokenPayload,
            undefined,
            "accessTokenPayload should be undefined for an invalid token"
        );
        assert.strictEqual(result.error, undefined, "error should be undefined for an invalid token");
    });
});
