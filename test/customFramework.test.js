let assert = require("assert");
const { createPreParsedRequest, handleAuthAPIRequest, withSession } = require("../lib/build/customFramework");
let { ProcessState } = require("../lib/build/processState");
let SuperTokens = require("../lib/build/").default;
const Session = require("../lib/build/recipe/session");
const EmailPassword = require("../lib/build/recipe/emailpassword");
const { PreParsedRequest } = require("../lib/build/framework/custom");
const { printPath, setupST, startST, killAllST, cleanST, delay } = require("./utils");

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
    let accessToken;

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
});
