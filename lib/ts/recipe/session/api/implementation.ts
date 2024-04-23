import { APIInterface, APIOptions, VerifySessionOptions } from "../";
import { normaliseHttpMethod } from "../../../utils";
import NormalisedURLPath from "../../../normalisedURLPath";
import { SessionContainerInterface } from "../types";
import { GeneralErrorResponse, UserContext } from "../../../types";
import { getSessionFromRequest, refreshSessionInRequest } from "../sessionRequestFunctions";
import { clearSessionCookiesFromOlderCookieDomain, hasMultipleCookiesForTokenType } from "../cookieAndHeaders";

export default function getAPIInterface(): APIInterface {
    return {
        refreshPOST: async function ({
            options,
            userContext,
        }: {
            options: APIOptions;
            userContext: UserContext;
        }): Promise<SessionContainerInterface> {
            // If a request has multiple session cookies and 'olderCookieDomain' is
            // unset, we can't identify the correct cookie for refreshing the session.
            // Using the wrong cookie can cause an infinite refresh loop. To avoid this,
            // we throw a 500 error asking the user to set 'olderCookieDomain'.
            if (
                (hasMultipleCookiesForTokenType(options.req, "access") ||
                    hasMultipleCookiesForTokenType(options.req, "refresh")) &&
                options.config.olderCookieDomain === undefined
            ) {
                throw new Error(
                    `The request contains multiple session cookies. This may happen if you've changed the 'cookieDomain' setting in your configuration. To clear tokens from the previous domain, set 'olderCookieDomain' in your config.`
                );
            }

            clearSessionCookiesFromOlderCookieDomain({
                req: options.req,
                res: options.res,
                config: options.config,
                userContext,
            });

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
