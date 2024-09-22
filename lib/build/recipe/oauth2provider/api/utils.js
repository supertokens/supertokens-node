"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLogoutInternalRedirects = exports.handleLoginInternalRedirects = exports.loginGET = void 0;
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
    setCookie,
    isDirectCall,
    userContext,
}) {
    var _a, _b;
    const loginRequest = await recipeImplementation.getLoginRequest({
        challenge: loginChallenge,
        userContext,
    });
    const sessionInfo =
        session !== undefined
            ? await session_1.getSessionInformation(
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
    console.log({ n: "loginGET", shouldTryRefresh, loginRequest, sessionInfo });
    if (maxAgeParam !== null) {
        try {
            const maxAgeParsed = Number.parseInt(maxAgeParam);
            if (maxAgeParsed < 0) {
                const reject = await recipeImplementation.rejectLoginRequest({
                    challenge: loginChallenge,
                    error: {
                        error: "invalid_request",
                        errorDescription: "max_age cannot be negative",
                    },
                    userContext,
                });
                return { redirectTo: reject.redirectTo, setCookie };
            }
        } catch (_c) {
            const reject = await recipeImplementation.rejectLoginRequest({
                challenge: loginChallenge,
                error: {
                    error: "invalid_request",
                    errorDescription: "max_age must be an integer",
                },
                userContext,
            });
            return { redirectTo: reject.redirectTo, setCookie };
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
            remember: true,
            rememberFor: 3600,
            userContext,
        });
        return { redirectTo: accept.redirectTo, setCookie };
    }
    const appInfo = supertokens_1.default.getInstanceOrThrowError().appInfo;
    const websiteDomain = appInfo
        .getOrigin({
            request: undefined,
            userContext: userContext,
        })
        .getAsStringDangerous();
    const websiteBasePath = appInfo.websiteBasePath.getAsStringDangerous();
    if (shouldTryRefresh && promptParam !== "login") {
        const websiteDomain = appInfo
            .getOrigin({
                request: undefined,
                userContext: userContext,
            })
            .getAsStringDangerous();
        const websiteBasePath = appInfo.websiteBasePath.getAsStringDangerous();
        const queryParamsForTryRefreshPage = new URLSearchParams({
            loginChallenge,
        });
        return {
            redirectTo: websiteDomain + websiteBasePath + `/try-refresh?${queryParamsForTryRefreshPage.toString()}`,
            setCookie,
        };
    }
    if (promptParam === "none") {
        const reject = await recipeImplementation.rejectLoginRequest({
            challenge: loginChallenge,
            error: {
                error: "login_required",
                errorDescription:
                    "The Authorization Server requires End-User authentication. Prompt 'none' was requested, but no existing or expired login session was found.",
            },
            userContext,
        });
        return { redirectTo: reject.redirectTo, setCookie };
    }
    const queryParamsForAuthPage = new URLSearchParams({
        loginChallenge,
    });
    if ((_b = loginRequest.oidcContext) === null || _b === void 0 ? void 0 : _b.login_hint) {
        queryParamsForAuthPage.set("hint", loginRequest.oidcContext.login_hint);
    }
    if (session !== undefined || promptParam === "login") {
        queryParamsForAuthPage.set("forceFreshAuth", "true");
    }
    if (tenantIdParam !== null && tenantIdParam !== constants_1.DEFAULT_TENANT_ID) {
        queryParamsForAuthPage.set("tenantId", tenantIdParam);
    }
    return {
        redirectTo: websiteDomain + websiteBasePath + `?${queryParamsForAuthPage.toString()}`,
        setCookie,
    };
}
exports.loginGET = loginGET;
function getMergedCookies({ cookie = "", setCookie }) {
    if (!setCookie) {
        return cookie;
    }
    const cookieMap = cookie.split(";").reduce((acc, curr) => {
        const [name, value] = curr.split("=");
        return Object.assign(Object.assign({}, acc), { [name.trim()]: value });
    }, {});
    const setCookies = set_cookie_parser_1.default.parse(set_cookie_parser_1.default.splitCookiesString(setCookie));
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
    if (!setCookie1) {
        return setCookie2 || "";
    }
    if (!setCookie2 || setCookie1 === setCookie2) {
        return setCookie1;
    }
    return `${setCookie1}, ${setCookie2}`;
}
function isLoginInternalRedirect(redirectTo) {
    const { apiDomain, apiBasePath } = supertokens_1.default.getInstanceOrThrowError().appInfo;
    const basePath = `${apiDomain.getAsStringDangerous()}${apiBasePath.getAsStringDangerous()}`;
    return [
        constants_2.LOGIN_PATH,
        constants_2.AUTH_PATH,
        constants_2.LOGIN_PATH.replace("oauth", "oauth2"),
        constants_2.AUTH_PATH.replace("oauth", "oauth2"),
    ].some((path) => redirectTo.startsWith(`${basePath}${path}`));
}
function isLogoutInternalRedirect(redirectTo) {
    const { apiDomain, apiBasePath } = supertokens_1.default.getInstanceOrThrowError().appInfo;
    const basePath = `${apiDomain.getAsStringDangerous()}${apiBasePath.getAsStringDangerous()}`;
    return [constants_2.END_SESSION_PATH, constants_2.END_SESSION_PATH.replace("oauth", "oauth2")].some((path) =>
        redirectTo.startsWith(`${basePath}${path}`)
    );
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
    console.log({
        n: "handleLoginInternalRedirects",
        response,
        isLoginInternalRedirect: isLoginInternalRedirect(response.redirectTo),
        shouldTryRefresh,
    });
    if (!isLoginInternalRedirect(response.redirectTo)) {
        return response;
    }
    // Typically, there are no more than 2 internal redirects per API call but we are allowing upto 10.
    // This safety net prevents infinite redirect loops in case there are more redirects than expected.
    const maxRedirects = 10;
    let redirectCount = 0;
    while (redirectCount < maxRedirects && isLoginInternalRedirect(response.redirectTo)) {
        console.log({ n: "handleLoginInternalRedirects2", response, shouldTryRefresh });
        cookie = getMergedCookies({ cookie, setCookie: response.setCookie });
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
                setCookie: response.setCookie,
                isDirectCall: false,
                userContext,
            });
            response = {
                redirectTo: loginRes.redirectTo,
                setCookie: mergeSetCookieHeaders(loginRes.setCookie, response.setCookie),
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
                setCookie: mergeSetCookieHeaders(authRes.setCookie, response.setCookie),
            };
        } else {
            throw new Error(`Unexpected internal redirect ${response.redirectTo}`);
        }
        redirectCount++;
    }
    console.log("handleLoginInternalRedirects3", response);
    return response;
}
exports.handleLoginInternalRedirects = handleLoginInternalRedirects;
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
            response = await recipeImplementation.endSession({
                params: Object.fromEntries(params.entries()),
                session,
                // We internally redirect to the `end_session_endpoint` at the end of the logout flow.
                // This involves calling Hydra with the `logout_verifier`, after which Hydra redirects to the `post_logout_redirect_uri`.
                // We set `shouldTryRefresh` to `false` since the SuperTokens session isn't needed to handle this request.
                shouldTryRefresh: false,
                userContext,
            });
        } else {
            throw new Error(`Unexpected internal redirect ${response.redirectTo}`);
        }
        redirectCount++;
    }
    return response;
}
exports.handleLogoutInternalRedirects = handleLogoutInternalRedirects;
