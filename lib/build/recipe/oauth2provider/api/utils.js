"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInternalRedirects = exports.loginGET = void 0;
const supertokens_1 = __importDefault(require("../../../supertokens"));
const session_1 = require("../../session");
const constants_1 = require("../constants");
const set_cookie_parser_1 = __importDefault(require("set-cookie-parser"));
// API implementation for the loginGET function.
// Extracted for use in both apiImplementation and handleInternalRedirects.
async function loginGET({ recipeImplementation, loginChallenge, session, setCookie, isDirectCall, userContext }) {
    var _a;
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
    const promptParam = incomingAuthUrlQueryParams.get("prompt");
    const maxAgeParam = incomingAuthUrlQueryParams.get("max_age");
    if (loginRequest.skip) {
        const accept = await recipeImplementation.acceptLoginRequest({
            challenge: loginChallenge,
            identityProviderSessionId: session === null || session === void 0 ? void 0 : session.getHandle(),
            subject: loginRequest.subject,
            userContext,
        });
        return { redirectTo: accept.redirectTo, setCookie };
    } else if (
        session &&
        (["", undefined].includes(loginRequest.subject) || session.getUserId() === loginRequest.subject) &&
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
    const queryParamsForAuthPage = new URLSearchParams({
        loginChallenge,
    });
    if ((_a = loginRequest.oidcContext) === null || _a === void 0 ? void 0 : _a.login_hint) {
        queryParamsForAuthPage.set("hint", loginRequest.oidcContext.login_hint);
    }
    if (session !== undefined) {
        queryParamsForAuthPage.set("forceFreshAuth", "true");
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
function isInternalRedirect(redirectTo) {
    const { apiDomain, apiBasePath } = supertokens_1.default.getInstanceOrThrowError().appInfo;
    const basePath = `${apiDomain.getAsStringDangerous()}${apiBasePath.getAsStringDangerous()}`;
    return [
        constants_1.LOGIN_PATH,
        constants_1.AUTH_PATH,
        constants_1.LOGIN_PATH.replace("oauth", "oauth2"),
        constants_1.AUTH_PATH.replace("oauth", "oauth2"),
    ].some((path) => redirectTo.startsWith(`${basePath}${path}`));
}
// In the OAuth2 flow, we do several internal redirects. These redirects don't require a frontend-to-api-server round trip.
// If an internal redirect is identified, it's handled directly by this function.
// Currently, we only need to handle redirects to /oauth/login and /oauth/auth endpoints.
async function handleInternalRedirects({ response, recipeImplementation, session, cookie = "", userContext }) {
    var _a;
    if (!isInternalRedirect(response.redirectTo)) {
        return response;
    }
    // Typically, there are no more than 2 internal redirects per API call but we are allowing upto 10.
    // This safety net prevents infinite redirect loops in case there are more redirects than expected.
    const maxRedirects = 10;
    let redirectCount = 0;
    while (redirectCount < maxRedirects && isInternalRedirect(response.redirectTo)) {
        cookie = getMergedCookies({ cookie, setCookie: response.setCookie });
        const queryString = response.redirectTo.split("?")[1];
        const params = new URLSearchParams(queryString);
        if (response.redirectTo.includes(constants_1.LOGIN_PATH)) {
            const loginChallenge =
                (_a = params.get("login_challenge")) !== null && _a !== void 0 ? _a : params.get("loginChallenge");
            if (!loginChallenge) {
                throw new Error(`Expected loginChallenge in ${response.redirectTo}`);
            }
            const loginRes = await loginGET({
                recipeImplementation,
                loginChallenge,
                session,
                setCookie: response.setCookie,
                isDirectCall: false,
                userContext,
            });
            response = {
                redirectTo: loginRes.redirectTo,
                setCookie: mergeSetCookieHeaders(loginRes.setCookie, response.setCookie),
            };
        } else if (response.redirectTo.includes(constants_1.AUTH_PATH)) {
            const authRes = await recipeImplementation.authorization({
                params: Object.fromEntries(params.entries()),
                cookies: cookie,
                session,
                userContext,
            });
            response = {
                redirectTo: authRes.redirectTo,
                setCookie: mergeSetCookieHeaders(authRes.setCookie, response.setCookie),
            };
        } else {
            throw new Error(`Unexpected internal redirect ${response.redirectTo}`);
        }
        redirectCount++;
    }
    return response;
}
exports.handleInternalRedirects = handleInternalRedirects;
