import { APIInterface, APIOptions, VerifySessionOptions } from "../";
import { normaliseHttpMethod } from "../../../utils";
import NormalisedURLPath from "../../../normalisedURLPath";
import { SessionContainerInterface } from "../types";
import { GeneralErrorResponse } from "../../../types";
import { getRequiredClaimValidators } from "../utils";

export default function getAPIInterface(): APIInterface {
    return {
        refreshPOST: async function ({
            options,
            userContext,
        }: {
            options: APIOptions;
            userContext: any;
        }): Promise<SessionContainerInterface> {
            return await options.recipeImplementation.refreshSession({
                req: options.req,
                res: options.res,
                userContext,
            });
        },

        verifySession: async function ({
            verifySessionOptions,
            options,
            userContext,
        }: {
            verifySessionOptions: VerifySessionOptions | undefined;
            options: APIOptions;
            userContext: any;
        }): Promise<SessionContainerInterface | undefined> {
            let method = normaliseHttpMethod(options.req.getMethod());
            if (method === "options" || method === "trace") {
                return undefined;
            }

            let incomingPath = new NormalisedURLPath(options.req.getOriginalURL());

            let refreshTokenPath = options.config.refreshTokenPath;

            if (incomingPath.equals(refreshTokenPath) && method === "post") {
                return options.recipeImplementation.refreshSession({
                    req: options.req,
                    res: options.res,
                    userContext,
                });
            } else {
                const session = await options.recipeImplementation.getSession({
                    req: options.req,
                    res: options.res,
                    options: verifySessionOptions,
                    userContext,
                });
                if (session !== undefined) {
                    const claimValidators = await getRequiredClaimValidators(
                        session,
                        verifySessionOptions?.overrideGlobalClaimValidators,
                        userContext
                    );

                    await session.assertClaims(claimValidators, userContext);
                }

                return session;
            }
        },

        signOutPOST: async function ({
            session,
            userContext,
        }: {
            options: APIOptions;
            session: SessionContainerInterface | undefined;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
              }
            | GeneralErrorResponse
        > {
            if (session !== undefined) {
                await session.revokeSession(userContext);
            }

            return {
                status: "OK",
            };
        },
    };
}
