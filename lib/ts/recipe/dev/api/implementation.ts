import { APIInterface } from "../";
import { HealthCheckResponse, ThirdPartyRecipeModule, TypeInput } from "../types";
import { Querier } from "../../../querier";
import NormalisedURLPath from "../../../normalisedURLPath";
import { isUsingDevelopmentClientId } from "../utils";

export default class APIImplementation implements APIInterface {
    healthCheckGET = async (input: TypeInput): Promise<HealthCheckResponse> => {
        let querier = await Querier.getNewInstanceOrThrowError("Dev");
        let coreResponse = await checkConnectionToCore(querier, input.hosts, input.apiKey, input.recipeModules);
        return coreResponse;
    };
}

async function checkConnectionToCore(
    querier: Querier,
    connectionURI: string | undefined,
    apiKey: string | undefined,
    recipeModules: ThirdPartyRecipeModule[]
): Promise<{ status: string; message?: any }> {
    try {
        let response = await querier.sendGetRequest(new NormalisedURLPath("/hello"), undefined);

        if (String(response).startsWith("Hello")) {
            let usingDevelopmentKeysMessage = (await isUsingDevelopmentClientId(recipeModules))
                ? "You are currently using development OAuth keys. Please replace them with your own OAuth keys for production use"
                : undefined;

            if (connectionURI?.includes("https://try.supertokens.io")) {
                let usingDevCoreMessage =
                    "You are currently using try.supertokens.io for your core. This is for demo purposes only, so please replace this with the address of your managed core instance (sign up on supertokens.io), or the address of your self host a core instance.";
                let message = usingDevelopmentKeysMessage
                    ? usingDevCoreMessage + "  " + usingDevelopmentKeysMessage
                    : usingDevCoreMessage;
                return {
                    status: "OK",
                    message,
                };
            }
            return {
                status: "OK",
                message: usingDevelopmentKeysMessage,
            };
        }
    } catch (err) {
        let status = "NOT OK";
        if ((err as Error).message.includes("Invalid API key")) {
            if (apiKey === undefined) {
                return {
                    status,
                    message:
                        "The configured SuperTokens core requires an API key. Please make sure that you have set it in your backend init function call. If you are using our managed service, you can find your API key on the dashboard at supertokens.io",
                };
            }

            return {
                status,
                message:
                    "It seems like your API key is incorrect. Please double check that you have provided the right key.",
            };
        }
        return {
            status,
            message: (err as Error).message,
        };
    }

    return { status: "NOT OK" };
}
