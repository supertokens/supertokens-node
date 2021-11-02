import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
import NormalisedURLPath from "../../normalisedURLPath";
import { isUsingDevelopmentClientId } from "./utils";
import { USING_DEV_CORE, USING_DEV_OAUTH_KEY, INVALID_API_KEY, NO_API_KEY } from "./constants";

export default function getRecipeInterface(querier: Querier): RecipeInterface {
    return {
        checkConnectionToCoreAndDevOAuthKeys: async (
            apiKey: string | undefined,
            connectionURI: string | undefined
        ): Promise<{
            status: "OK" | "NOT_OK";
            message: string;
        }> => {
            try {
                let response = await querier.sendGetRequest(new NormalisedURLPath("/hello"), undefined);

                if (String(response).startsWith("Hello")) {
                    if (connectionURI?.includes("https://try.supertokens.io")) {
                        if (await isUsingDevelopmentClientId()) {
                            return {
                                status: "OK",
                                message: "1. " + USING_DEV_CORE + "  2. " + USING_DEV_OAUTH_KEY,
                            };
                        }
                        return {
                            status: "OK",
                            message: USING_DEV_CORE,
                        };
                    }

                    if (await isUsingDevelopmentClientId()) {
                        return {
                            status: "OK",
                            message: USING_DEV_OAUTH_KEY,
                        };
                    } else {
                        return {
                            status: "OK",
                            message: "",
                        };
                    }
                }
            } catch (err) {
                if ((err as Error).message.includes("status code: 401")) {
                    if (apiKey === undefined) {
                        return {
                            status: "NOT_OK",
                            message: NO_API_KEY,
                        };
                    }

                    return {
                        status: "NOT_OK",
                        message: INVALID_API_KEY,
                    };
                }
                return {
                    status: "NOT_OK",
                    message: (err as Error).message,
                };
            }

            return {
                status: "NOT_OK",
                message: "Internal Error",
            };
        },
    };
}
