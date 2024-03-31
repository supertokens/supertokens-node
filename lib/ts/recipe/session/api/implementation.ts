import { APIInterface, APIOptions, VerifySessionOptions } from "../";
import { normaliseHttpMethod } from "../../../utils";
import NormalisedURLPath from "../../../normalisedURLPath";
import { SessionContainerInterface, TokenType, TypeNormalisedInput } from "../types";
import { GeneralErrorResponse, UserContext } from "../../../types";
import { getSessionFromRequest, refreshSessionInRequest } from "../sessionRequestFunctions";
import { logDebugMessage } from "../../../logger";
import { getCookieNameFromTokenType, setToken } from "../cookieAndHeaders";
import { BaseRequest, BaseResponse } from "../../../framework";

export default function getAPIInterface(): APIInterface {
    return {
        refreshPOST: async function ({
            options,
            userContext,
        }: {
            options: APIOptions;
            userContext: UserContext;
        }): Promise<SessionContainerInterface | undefined> {
            let didClearCookies = clearSessionCookiesFromOlderCookieDomain({
                req: options.req,
                res: options.res,
                config: options.config,
                userContext,
            });

            // Return early if we cleared cookies from older cookie domain
            // to avoid setting multiple cookies with the same name
            if (didClearCookies) {
                return undefined;
            }

            return refreshSessionInRequest({
                req: options.req,
                res: options.res,
                userContext,
                config: options.config,
                recipeInterfaceImpl: options.recipeImplementation,
            });
        },

        verifySession: async function ({
            verifySessionOptions,
            options,
            userContext,
        }: {
            verifySessionOptions: VerifySessionOptions | undefined;
            options: APIOptions;
            userContext: UserContext;
        }): Promise<SessionContainerInterface | undefined> {
            let method = normaliseHttpMethod(options.req.getMethod());
            if (method === "options" || method === "trace") {
                return undefined;
            }

            let incomingPath = new NormalisedURLPath(options.req.getOriginalURL());

            let refreshTokenPath = options.config.refreshTokenPath;

            if (incomingPath.equals(refreshTokenPath) && method === "post") {
                return refreshSessionInRequest({
                    req: options.req,
                    res: options.res,
                    userContext,
                    config: options.config,
                    recipeInterfaceImpl: options.recipeImplementation,
                });
            } else {
                return getSessionFromRequest({
                    req: options.req,
                    res: options.res,
                    options: verifySessionOptions,
                    config: options.config,
                    recipeInterfaceImpl: options.recipeImplementation,
                    userContext,
                });
            }
        },

        signOutPOST: async function ({
            session,
            userContext,
        }: {
            options: APIOptions;
            session: SessionContainerInterface;
            userContext: UserContext;
        }): Promise<
            | {
                  status: "OK";
              }
            | GeneralErrorResponse
        > {
            await session.revokeSession(userContext);

            return {
                status: "OK",
            };
        },
    };
}

/**
 *  This function addresses an edge case where changing the cookieDomain config on the server can
 *  lead to session integrity issues. For instance, if the API server URL is 'api.example.com'
 *  with a cookie domain of '.example.com', and the server updates the cookie domain to 'api.example.com',
 *  the client may retain cookies with both '.example.com' and 'api.example.com' domains.
 *
 *  Consequently, if the server chooses the older cookie, session invalidation occurs, potentially
 *  resulting in an infinite refresh loop. To fix this, users are asked to specify "olderCookieDomain" in
 *  the config.
 *
 * This function checks for multiple cookies with the same name and clears the cookies for the older domain
 */
function clearSessionCookiesFromOlderCookieDomain({
    req,
    res,
    config,
    userContext,
}: {
    req: BaseRequest;
    res: BaseResponse;
    config: TypeNormalisedInput;
    userContext: UserContext;
}): boolean {
    let didClearCookies = false;
    const cookieString = req.getHeaderValue("cookie");

    if (cookieString === undefined || config.olderCookieDomain === undefined) {
        return didClearCookies;
    }

    const cookies = parseCookieStringFromRequestHeader(cookieString);

    const tokenTypes: TokenType[] = ["access", "refresh"];
    for (const token of tokenTypes) {
        const cookieName = getCookieNameFromTokenType(token);

        if (cookies[cookieName] && cookies[cookieName].length > 1) {
            logDebugMessage(
                `clearDuplicateSessionCookies: Clearing duplicate ${cookieName} cookie with domain ${config.olderCookieDomain}`
            );
            setToken(
                { ...config, cookieDomain: config.olderCookieDomain },
                res,
                token,
                "",
                0,
                "cookie",
                req,
                userContext
            );
            didClearCookies = true;
        }
    }

    return didClearCookies;
}

// This function is required because cookies library (and most of the popular libraries in npm)
// does not support parsing multiple cookies with the same name.
function parseCookieStringFromRequestHeader(cookieString: string): Record<string, string[]> {
    const cookies: Record<string, string[]> = {};

    const cookiePairs = cookieString.split(";");

    for (const cookiePair of cookiePairs) {
        const [name, value] = cookiePair
            .trim()
            .split("=")
            .map((part) => decodeURIComponent(part));

        if (cookies.hasOwnProperty(name)) {
            cookies[name].push(value);
        } else {
            cookies[name] = [value];
        }
    }

    return cookies;
}
