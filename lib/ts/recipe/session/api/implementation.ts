import { APIInterface, APIOptions, VerifySessionOptions } from "../";
import STError from "../error";
import { normaliseHttpMethod } from "../../../utils";
import NormalisedURLPath from "../../../normalisedURLPath";
import { SessionContainerInterface } from "../types";

export default class APIImplementation implements APIInterface {
    refreshPOST = async ({ options }: { options: APIOptions }): Promise<void> => {
        await options.recipeImplementation.refreshSession({ req: options.req, res: options.res });
    };

    verifySession = async ({
        verifySessionOptions,
        options,
    }: {
        verifySessionOptions: VerifySessionOptions | undefined;
        options: APIOptions;
    }): Promise<SessionContainerInterface | undefined> => {
        let method = normaliseHttpMethod(options.req.getMethod());
        if (method === "options" || method === "trace") {
            return undefined;
        }

        let incomingPath = new NormalisedURLPath(options.req.getOriginalURL());

        let refreshTokenPath = options.config.refreshTokenPath;

        if (incomingPath.equals(refreshTokenPath) && method === "post") {
            return await options.recipeImplementation.refreshSession({
                req: options.req,
                res: options.res,
            });
        } else {
            return await options.recipeImplementation.getSession({
                req: options.req,
                res: options.res,
                options: verifySessionOptions,
            });
        }
    };

    signOutPOST = async ({
        options,
    }: {
        options: APIOptions;
    }): Promise<{
        status: "OK";
    }> => {
        let session;
        try {
            session = await options.recipeImplementation.getSession({ req: options.req, res: options.res });
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

        await session.revokeSession();

        return {
            status: "OK",
        };
    };
}
