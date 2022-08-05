import { APIInterface, APIOptions, VerifySessionOptions } from "../";
import STError from "../error";
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
        }): Promise<void> {
            await options.recipeImplementation.refreshSession({ req: options.req, res: options.res, userContext });
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
            options,
            userContext,
        }: {
            options: APIOptions;
            userContext: any;
        }): Promise<
            | {
                  status: "OK";
              }
            | GeneralErrorResponse
        > {
            let session;
            try {
                session = await options.recipeImplementation.getSession({
                    req: options.req,
                    res: options.res,
                    options: {
                        overrideGlobalClaimValidators: () => [],
                    },
                    userContext,
                });
            } catch (err) {
                if (STError.isErrorFromSuperTokens(err) && err.type === STError.UNAUTHORISED) {
                    // The session is expired / does not exist anyway. So we return OK
                    return {
                        status: "OK",
                    };
                }
                throw err;
            }

            if (session === undefined) {
                throw new Error("Session is undefined. Should not come here.");
            }

            await session.revokeSession(userContext);

            return {
                status: "OK",
            };
        },
    };
}
