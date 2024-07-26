import SuperTokens from "../../../supertokens";
import { UserContext } from "../../../types";
import { SessionContainerInterface } from "../../session/types";
import { AUTH_PATH, LOGIN_PATH } from "../constants";
import { RecipeInterface } from "../types";
import setCookieParser from "set-cookie-parser";

// API implementation for the loginGET function.
// Extracted for use in both apiImplementation and handleInternalRedirects.
export async function loginGET({
    recipeImplementation,
    loginChallenge,
    session,
    setCookie,
    userContext,
}: {
    recipeImplementation: RecipeInterface;
    loginChallenge: string;
    session?: SessionContainerInterface;
    setCookie?: string;
    userContext: UserContext;
}) {
    const request = await recipeImplementation.getLoginRequest({
        challenge: loginChallenge,
        userContext,
    });

    if (request.skip) {
        const accept = await recipeImplementation.acceptLoginRequest({
            challenge: loginChallenge,
            subject: request.subject,
            userContext,
        });

        return { redirectTo: accept.redirectTo, setCookie };
    } else if (session) {
        if (session.getUserId() !== request.subject) {
            // TODO?
        }
        const accept = await recipeImplementation.acceptLoginRequest({
            challenge: loginChallenge,
            subject: session.getUserId(),
            identityProviderSessionId: session.getHandle(),
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

    return {
        redirectTo:
            websiteDomain +
            websiteBasePath +
            `?hint=${request.oidcContext?.login_hint ?? ""}&loginChallenge=${loginChallenge}`,
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
    return `${setCookie1};${setCookie2}`;
}

function isInternalRedirect(redirectTo: string): boolean {
    const { apiDomain, apiBasePath } = SuperTokens.getInstanceOrThrowError().appInfo;
    const basePath = `${apiDomain.getAsStringDangerous()}${apiBasePath.getAsStringDangerous()}`;

    return [LOGIN_PATH, AUTH_PATH].some((path) => redirectTo.startsWith(`${basePath}${path}`));
}

// In the OAuth2 flow, we do several internal redirects. These redirects don't require a frontend-to-api-server round trip.
// If an internal redirect is identified, it's handled directly by this function.
// Currently, we only need to handle redirects to /oauth2/login and /oauth2/auth endpoints.
export async function handleInternalRedirects({
    response,
    recipeImplementation,
    session,
    cookie = "",
    userContext,
}: {
    response: { redirectTo: string; setCookie: string | undefined };
    recipeImplementation: RecipeInterface;
    session?: SessionContainerInterface;
    cookie?: string;
    userContext: UserContext;
}): Promise<{ redirectTo: string; setCookie: string | undefined }> {
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

        if (response.redirectTo.includes(LOGIN_PATH)) {
            const loginChallenge = params.get("login_challenge") ?? params.get("loginChallenge");
            if (!loginChallenge) {
                throw new Error(`Expected loginChallenge in ${response.redirectTo}`);
            }

            const loginRes = await loginGET({
                recipeImplementation,
                loginChallenge,
                session,
                setCookie: response.setCookie,
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
