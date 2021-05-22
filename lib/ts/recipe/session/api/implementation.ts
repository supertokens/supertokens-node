import { APIInterface, APIOptions, VerifySessionOptions, SessionRequest } from "../";
import STError from "../error";
import { normaliseHttpMethod } from "../../../utils";
import NormalisedURLPath from "../../../normalisedURLPath";

export default class APIImplementation implements APIInterface {
    refreshPOST = async (options: APIOptions): Promise<void> => {
        await options.recipeImplementation.refreshSession(options.req, options.res);
    };

    verifySession = async (
        verifySessionOptions: VerifySessionOptions | undefined,
        options: APIOptions
    ): Promise<void> => {
        try {
            let method = normaliseHttpMethod(options.req.method);
            if (method === "options" || method === "trace") {
                return options.next();
            }

            let incomingPath = new NormalisedURLPath(
                options.req.originalUrl === undefined ? options.req.url : options.req.originalUrl
            );

            let refreshTokenPath = options.config.refreshTokenPath;

            if (incomingPath.equals(refreshTokenPath) && method === "post") {
                (options.req as SessionRequest).session = await options.recipeImplementation.refreshSession(
                    options.req,
                    options.res
                );
            } else {
                (options.req as SessionRequest).session = await options.recipeImplementation.getSession(
                    options.req,
                    options.res,
                    verifySessionOptions
                );
            }
            return options.next();
        } catch (err) {
            options.next(err);
        }
    };

    signOutPOST = async (
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        let session;
        try {
            session = await options.recipeImplementation.getSession(options.req, options.res);
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
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("Session is undefined. Should not come here."),
            });
        }

        await session.revokeSession();

        return {
            status: "OK",
        };
    };
}
