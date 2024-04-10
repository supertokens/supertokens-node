import { APIInterface, APIOptions, VerifySessionOptions } from "../";
import { normaliseHttpMethod } from "../../../utils";
import NormalisedURLPath from "../../../normalisedURLPath";
import { SessionContainerInterface } from "../types";
import { GeneralErrorResponse, UserContext } from "../../../types";
import { getSessionFromRequest, refreshSessionInRequest } from "../sessionRequestFunctions";
import { clearSessionCookiesFromOlderCookieDomain } from "../cookieAndHeaders";

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
