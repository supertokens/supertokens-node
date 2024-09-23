import SuperTokens from "../../../supertokens";
import { UserContext } from "../../../types";
import { DEFAULT_TENANT_ID } from "../../multitenancy/constants";
import { getSessionInformation } from "../../session";
import { SessionContainerInterface } from "../../session/types";
import { AUTH_PATH, LOGIN_PATH, END_SESSION_PATH } from "../constants";
import { ErrorOAuth2, RecipeInterface } from "../types";
import setCookieParser from "set-cookie-parser";

// API implementation for the loginGET function.
// Extracted for use in both apiImplementation and handleInternalRedirects.
export async function loginGET({
    recipeImplementation,
    loginChallenge,
    shouldTryRefresh,
    session,
    setCookie,
    isDirectCall,
    userContext,
}: {
    recipeImplementation: RecipeInterface;
    loginChallenge: string;
    session?: SessionContainerInterface;
    shouldTryRefresh: boolean;
    setCookie?: string;
    userContext: UserContext;
    isDirectCall: boolean;
}) {
    const loginRequest = await recipeImplementation.getLoginRequest({
        challenge: loginChallenge,
        userContext,
    });

    const sessionInfo = session !== undefined ? await getSessionInformation(session?.getHandle()) : undefined;
    if (!sessionInfo) {
        session = undefined;
    }

    const incomingAuthUrlQueryParams = new URLSearchParams(loginRequest.requestUrl.split("?")[1]);
    const promptParam = incomingAuthUrlQueryParams.get("prompt") ?? incomingAuthUrlQueryParams.get("st_prompt");
    const maxAgeParam = incomingAuthUrlQueryParams.get("max_age");

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
        } catch {
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
            Number.parseInt(maxAgeParam) * 1000 > Date.now() - sessionInfo!.timeCreated)
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
    const appInfo = SuperTokens.getInstanceOrThrowError().appInfo;
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

    if (loginRequest.oidcContext?.login_hint) {
        queryParamsForAuthPage.set("hint", loginRequest.oidcContext.login_hint);
    }

    if (session !== undefined || promptParam === "login") {
        queryParamsForAuthPage.set("forceFreshAuth", "true");
    }

    if (tenantIdParam !== null && tenantIdParam !== DEFAULT_TENANT_ID) {
        queryParamsForAuthPage.set("tenantId", tenantIdParam);
    }

    return {
        redirectTo: websiteDomain + websiteBasePath + `?${queryParamsForAuthPage.toString()}`,
        setCookie,
    };
}

function getMergedCookies({ cookie = "", setCookie }: { cookie?: string; setCookie?: string }): string {
    if (!setCookie) {
        return cookie;
    }

    const cookieMap = cookie.split(";").reduce((acc, curr) => {
        const [name, value] = curr.split("=");
        return { ...acc, [name.trim()]: value };
    }, {} as Record<string, string>);

    const setCookies = setCookieParser.parse(setCookieParser.splitCookiesString(setCookie));

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

function mergeSetCookieHeaders(setCookie1?: string, setCookie2?: string): string {
    if (!setCookie1) {
        return setCookie2 || "";
    }
    if (!setCookie2 || setCookie1 === setCookie2) {
        return setCookie1;
    }
    return `${setCookie1}, ${setCookie2}`;
}

function isLoginInternalRedirect(redirectTo: string): boolean {
    const { apiDomain, apiBasePath } = SuperTokens.getInstanceOrThrowError().appInfo;
    const basePath = `${apiDomain.getAsStringDangerous()}${apiBasePath.getAsStringDangerous()}`;
    return [
        LOGIN_PATH,
        AUTH_PATH,
        LOGIN_PATH.replace("oauth", "oauth2"),
        AUTH_PATH.replace("oauth", "oauth2"),
    ].some((path) => redirectTo.startsWith(`${basePath}${path}`));
}

function isLogoutInternalRedirect(redirectTo: string): boolean {
    const { apiDomain, apiBasePath } = SuperTokens.getInstanceOrThrowError().appInfo;
    const basePath = `${apiDomain.getAsStringDangerous()}${apiBasePath.getAsStringDangerous()}`;
    return [END_SESSION_PATH, END_SESSION_PATH.replace("oauth", "oauth2")].some((path) =>
        redirectTo.startsWith(`${basePath}${path}`)
    );
}

// In the OAuth2 flow, we do several internal redirects. These redirects don't require a frontend-to-api-server round trip.
// If an internal redirect is identified, it's handled directly by this function.
// Currently, we only need to handle redirects to /oauth/login and /oauth/auth endpoints in the login flow.
export async function handleLoginInternalRedirects({
    response,
    recipeImplementation,
    session,
    shouldTryRefresh,
    cookie = "",
    userContext,
}: {
    response: { redirectTo: string; setCookie?: string };
    recipeImplementation: RecipeInterface;
    session?: SessionContainerInterface;
    shouldTryRefresh: boolean;
    cookie?: string;
    userContext: UserContext;
}): Promise<{ redirectTo: string; setCookie?: string } | ErrorOAuth2> {
    if (!isLoginInternalRedirect(response.redirectTo)) {
        return response;
    }

    // Typically, there are no more than 2 internal redirects per API call but we are allowing upto 10.
    // This safety net prevents infinite redirect loops in case there are more redirects than expected.
    const maxRedirects = 10;
    let redirectCount = 0;

    while (redirectCount < maxRedirects && isLoginInternalRedirect(response.redirectTo)) {
        cookie = getMergedCookies({ cookie, setCookie: response.setCookie });

        const queryString = response.redirectTo.split("?")[1];
        const params = new URLSearchParams(queryString);

        if (response.redirectTo.includes(LOGIN_PATH)) {
            const loginChallenge = params.get("login_challenge") ?? params.get("loginChallenge");
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
        } else if (response.redirectTo.includes(AUTH_PATH)) {
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
    return response;
}

// In the OAuth2 flow, we do several internal redirects. These redirects don't require a frontend-to-api-server round trip.
// If an internal redirect is identified, it's handled directly by this function.
// Currently, we only need to handle redirects to /oauth/end_session endpoint in the logout flow.
export async function handleLogoutInternalRedirects({
    response,
    recipeImplementation,
    session,
    userContext,
}: {
    response: { redirectTo: string };
    recipeImplementation: RecipeInterface;
    session?: SessionContainerInterface;
    userContext: UserContext;
}): Promise<{ redirectTo: string } | ErrorOAuth2> {
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

        if (response.redirectTo.includes(END_SESSION_PATH)) {
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
