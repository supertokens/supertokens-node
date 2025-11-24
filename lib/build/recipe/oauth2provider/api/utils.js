"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginGET = loginGET;
exports.handleLoginInternalRedirects = handleLoginInternalRedirects;
exports.handleLogoutInternalRedirects = handleLogoutInternalRedirects;
const supertokens_1 = __importDefault(require("../../../supertokens"));
const constants_1 = require("../../multitenancy/constants");
const session_1 = require("../../session");
const constants_2 = require("../constants");
const set_cookie_parser_1 = __importDefault(require("set-cookie-parser"));
// API implementation for the loginGET function.
// Extracted for use in both apiImplementation and handleInternalRedirects.
async function loginGET({
    recipeImplementation,
    loginChallenge,
    shouldTryRefresh,
    session,
    cookies,
    isDirectCall,
    userContext,
}) {
    var _a, _b;
    const loginRequest = await recipeImplementation.getLoginRequest({
        challenge: loginChallenge,
        userContext,
    });
    if (loginRequest.status === "ERROR") {
        return loginRequest;
    }
    const sessionInfo =
        session !== undefined
            ? await (0, session_1.getSessionInformation)(
                  session === null || session === void 0 ? void 0 : session.getHandle()
              )
            : undefined;
    if (!sessionInfo) {
        session = undefined;
    }
    const incomingAuthUrlQueryParams = new URLSearchParams(loginRequest.requestUrl.split("?")[1]);
    const promptParam =
        (_a = incomingAuthUrlQueryParams.get("prompt")) !== null && _a !== void 0
            ? _a
            : incomingAuthUrlQueryParams.get("st_prompt");
    const maxAgeParam = incomingAuthUrlQueryParams.get("max_age");
    if (maxAgeParam !== null) {
        try {
            const maxAgeParsed = Number.parseInt(maxAgeParam);
            if (Number.isNaN(maxAgeParsed)) {
                const reject = await recipeImplementation.rejectLoginRequest({
                    challenge: loginChallenge,
                    error: {
                        status: "ERROR",
                        error: "invalid_request",
                        errorDescription: "max_age must be an integer",
                    },
                    userContext,
                });
                if ("error" in reject) {
                    return reject;
                }
                return { status: "REDIRECT", redirectTo: reject.redirectTo, cookies };
            }
            if (maxAgeParsed < 0) {
                const reject = await recipeImplementation.rejectLoginRequest({
                    challenge: loginChallenge,
                    error: {
                        status: "ERROR",
                        error: "invalid_request",
                        errorDescription: "max_age cannot be negative",
                    },
                    userContext,
                });
                if ("error" in reject) {
                    return reject;
                }
                return { status: "REDIRECT", redirectTo: reject.redirectTo, cookies };
            }
        } catch (_c) {
            const reject = await recipeImplementation.rejectLoginRequest({
                challenge: loginChallenge,
                error: {
                    status: "ERROR",
                    error: "invalid_request",
                    errorDescription: "max_age must be an integer",
                },
                userContext,
            });
            if (reject.status === "ERROR") {
                return reject;
            }
            return { status: "REDIRECT", redirectTo: reject.redirectTo, cookies };
        }
    }
    const tenantIdParam = incomingAuthUrlQueryParams.get("tenant_id");
    if (
        session &&
        (["", undefined].includes(loginRequest.subject) || session.getUserId() === loginRequest.subject) &&
        (["", null].includes(tenantIdParam) || session.getTenantId() === tenantIdParam) &&
        (promptParam !== "login" || isDirectCall) &&
        (maxAgeParam === null ||
            (maxAgeParam === "0" && isDirectCall) ||
            Number.parseInt(maxAgeParam) * 1000 > Date.now() - sessionInfo.timeCreated)
    ) {
        const accept = await recipeImplementation.acceptLoginRequest({
            challenge: loginChallenge,
            subject: session.getUserId(),
            identityProviderSessionId: session.getHandle(),
            userContext,
        });
        if (accept.status === "ERROR") {
            return accept;
        }
        return { status: "REDIRECT", redirectTo: accept.redirectTo, cookies: cookies };
    }
    if (shouldTryRefresh && promptParam !== "login") {
        return {
            redirectTo: await recipeImplementation.getFrontendRedirectionURL({
                type: "try-refresh",
                loginChallenge,
                userContext,
            }),
            cookies: cookies,
        };
    }
    if (promptParam === "none") {
        const reject = await recipeImplementation.rejectLoginRequest({
            challenge: loginChallenge,
            error: {
                status: "ERROR",
                error: "login_required",
                errorDescription:
                    "The Authorization Server requires End-User authentication. Prompt 'none' was requested, but no existing or expired login session was found.",
            },
            userContext,
        });
        if (reject.status === "ERROR") {
            return reject;
        }
        return { status: "REDIRECT", redirectTo: reject.redirectTo, cookies };
    }
    return {
        status: "REDIRECT",
        redirectTo: await recipeImplementation.getFrontendRedirectionURL({
            type: "login",
            loginChallenge,
            forceFreshAuth: session !== undefined || promptParam === "login",
            tenantId:
                tenantIdParam !== null && tenantIdParam !== void 0 ? tenantIdParam : constants_1.DEFAULT_TENANT_ID,
            hint: (_b = loginRequest.oidcContext) === null || _b === void 0 ? void 0 : _b.login_hint,
            userContext,
        }),
        cookies,
    };
}
function getMergedCookies({ origCookies = "", newCookies }) {
    if (!newCookies) {
        return origCookies;
    }
    const cookieMap = origCookies.split(";").reduce((acc, curr) => {
        const [name, value] = curr.split("=");
        return Object.assign(Object.assign({}, acc), { [name.trim()]: value });
    }, {});
    const setCookies = set_cookie_parser_1.default.parse(set_cookie_parser_1.default.splitCookiesString(newCookies));
    for (const { name, value, expires } of setCookies) {
        if (expires && new Date(expires) < new Date()) {
            delete cookieMap[name];
        } else {
            cookieMap[name] = value;
        }
    }
    return Object.entries(cookieMap)
        .map(([key, value]) => `${key}=${value}`)
        .join(";");
}
function mergeSetCookieHeaders(setCookie1, setCookie2) {
    if (setCookie1 == undefined || setCookie1.length === 0) {
        return setCookie2 === undefined ? [] : setCookie2;
    }
    if (
        !setCookie2 ||
        (new Set(setCookie1).size === new Set(setCookie2).size &&
            new Set(setCookie1).size === new Set([...setCookie1, ...setCookie2]).size)
    ) {
        return setCookie1;
    }
    return [...setCookie1, ...setCookie2];
}
function isLoginInternalRedirect(redirectTo) {
    const { apiDomain, apiBasePath } = supertokens_1.default.getInstanceOrThrowError().appInfo;
    const basePath = `${apiDomain.getAsStringDangerous()}${apiBasePath.getAsStringDangerous()}`;
    return [constants_2.LOGIN_PATH, constants_2.AUTH_PATH].some((path) => redirectTo.startsWith(`${basePath}${path}`));
}
function isLogoutInternalRedirect(redirectTo) {
    const { apiDomain, apiBasePath } = supertokens_1.default.getInstanceOrThrowError().appInfo;
    const basePath = `${apiDomain.getAsStringDangerous()}${apiBasePath.getAsStringDangerous()}`;
    return redirectTo.startsWith(`${basePath}${constants_2.END_SESSION_PATH}`);
}
// In the OAuth2 flow, we do several internal redirects. These redirects don't require a frontend-to-api-server round trip.
// If an internal redirect is identified, it's handled directly by this function.
// Currently, we only need to handle redirects to /oauth/login and /oauth/auth endpoints in the login flow.
async function handleLoginInternalRedirects({
    response,
    recipeImplementation,
    session,
    shouldTryRefresh,
    cookie = "",
    userContext,
}) {
    var _a;
    if (!isLoginInternalRedirect(response.redirectTo)) {
        return response;
    }
    // Typically, there are no more than 2 internal redirects per API call but we are allowing upto 10.
    // This safety net prevents infinite redirect loops in case there are more redirects than expected.
    const maxRedirects = 10;
    let redirectCount = 0;
    while (redirectCount < maxRedirects && isLoginInternalRedirect(response.redirectTo)) {
        cookie = getMergedCookies({ origCookies: cookie, newCookies: response.cookies });
        const queryString = response.redirectTo.split("?")[1];
        const params = new URLSearchParams(queryString);
        if (response.redirectTo.includes(constants_2.LOGIN_PATH)) {
            const loginChallenge =
                (_a = params.get("login_challenge")) !== null && _a !== void 0 ? _a : params.get("loginChallenge");
            if (!loginChallenge) {
                throw new Error(`Expected loginChallenge in ${response.redirectTo}`);
            }
            const loginRes = await loginGET({
                recipeImplementation,
                loginChallenge,
                session,
                shouldTryRefresh,
                cookies: response.cookies,
                isDirectCall: false,
                userContext,
            });
            if ("error" in loginRes) {
                return loginRes;
            }
            response = {
                redirectTo: loginRes.redirectTo,
                cookies: mergeSetCookieHeaders(loginRes.cookies, response.cookies),
            };
        } else if (response.redirectTo.includes(constants_2.AUTH_PATH)) {
            const authRes = await recipeImplementation.authorization({
                params: Object.fromEntries(params.entries()),
                cookies: cookie,
                session,
                userContext,
            });
            if ("error" in authRes) {
                return authRes;
            }
            response = {
                redirectTo: authRes.redirectTo,
                cookies: mergeSetCookieHeaders(authRes.cookies, response.cookies),
            };
        } else {
            throw new Error(`Unexpected internal redirect ${response.redirectTo}`);
        }
        redirectCount++;
    }
    return response;
}
// In the OAuth2 flow, we do several internal redirects. These redirects don't require a frontend-to-api-server round trip.
// If an internal redirect is identified, it's handled directly by this function.
// Currently, we only need to handle redirects to /oauth/end_session endpoint in the logout flow.
async function handleLogoutInternalRedirects({ response, recipeImplementation, session, userContext }) {
    if (!isLogoutInternalRedirect(response.redirectTo)) {
        return response;
    }
    // Typically, there are no more than 2 internal redirects per API call but we are allowing upto 10.
    // This safety net prevents infinite redirect loops in case there are more redirects than expected.
    const maxRedirects = 10;
    let redirectCount = 0;
    while (redirectCount < maxRedirects && isLogoutInternalRedirect(response.redirectTo)) {
        const queryString = response.redirectTo.split("?")[1];
        const params = new URLSearchParams(queryString);
        if (response.redirectTo.includes(constants_2.END_SESSION_PATH)) {
            const endSessionRes = await recipeImplementation.endSession({
                params: Object.fromEntries(params.entries()),
                session,
                // We internally redirect to the `end_session_endpoint` at the end of the logout flow.
                // This involves calling Hydra with the `logout_verifier`, after which Hydra redirects to the `post_logout_redirect_uri`.
                // We set `shouldTryRefresh` to `false` since the SuperTokens session isn't needed to handle this request.
                shouldTryRefresh: false,
                userContext,
            });
            if ("error" in endSessionRes) {
                return endSessionRes;
            }
            response = endSessionRes;
        } else {
            throw new Error(`Unexpected internal redirect ${response.redirectTo}`);
        }
        redirectCount++;
    }
    return response;
}
