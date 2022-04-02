import { APIInterface, APIOptions, VerifySessionOptions } from "../";
import STError from "../error";
import { normaliseHttpMethod } from "../../../utils";
import NormalisedURLPath from "../../../normalisedURLPath";
import { SessionContainerInterface } from "../types";

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

            const res =
                incomingPath.equals(refreshTokenPath) && method === "post"
                    ? await options.recipeImplementation.refreshSession({
                          req: options.req,
                          res: options.res,
                          userContext,
                      })
                    : await options.recipeImplementation.getSession({
                          req: options.req,
                          res: options.res,
                          options: verifySessionOptions,
                          userContext,
                      });
            if (res === undefined) {
                return undefined;
            }

            const reqClaims = verifySessionOptions?.requiredClaims ?? options.config.defaultRequiredClaimChecks;
            const missingClaim = await res.checkClaims(reqClaims, userContext);

            if (missingClaim !== undefined) {
                throw new STError({
                    type: "MISSING_CLAIM",
                    message: "MISSING_CLAIM",
                    payload: { claimId: missingClaim },
                });
            }
            return res;
        },

        signOutPOST: async function ({
            options,
            userContext,
        }: {
            options: APIOptions;
            userContext: any;
        }): Promise<{
            status: "OK";
        }> {
            let session;
            try {
                session = await options.recipeImplementation.getSession({
                    req: options.req,
                    res: options.res,
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
