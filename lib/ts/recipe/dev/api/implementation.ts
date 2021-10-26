import { APIInterface } from "../";
import { HealthCheckResponse, TypeNormalisedInput } from "../types";
import { Querier } from "../../../querier";
import NormalisedURLPath from "../../../normalisedURLPath";

export default class APIImplementation implements APIInterface {
    healthCheckGET = async (input: TypeNormalisedInput): Promise<HealthCheckResponse> => {
        let connectionURI = input.hosts;
        let apiKey = input.apiKey;

        let querier = await Querier.getNewInstanceOrThrowError("Dev");
        let coreResponse = await checkConnectionToCore(querier, connectionURI, apiKey);
        return coreResponse;
    };
}

async function checkConnectionToCore(
    querier: Querier,
    connectionURI: string | undefined,
    apiKey: string | undefined
): Promise<{ status: string; message?: any }> {
    try {
        let response = await querier.sendGetRequest(new NormalisedURLPath("/hello"), undefined);

        if (String(response).startsWith("Hello")) {
            if (connectionURI?.includes("try.supertokens.io")) {
                return {
                    status: "OK",
                    message:
                        "You are currently using try.supertokens.io for your core. This is for demo purposes only, so please replace this with the address of your managed core instance (sign up on supertokens.io), or the address of your self host a core instance.",
                };
            }
            return {
                status: "OK",
            };
        }
    } catch (err) {
        if ((err as Error).message.includes("Invalid API key")) {
            if (apiKey === undefined) {
                return {
                    status: "NOT OK",
                    message:
                        "The configured SuperTokens core requires an API key. Please make sure that you have set it in your backend init function call. If using our managed service, you can find your API key on the dashboard at supertokens.io",
                };
            }

            return {
                status: "NOT OK",
                message:
                    "It seems like your API key is incorrect. Please double check that you have provided the right key.",
            };
        }
        return {
            status: "NOT OK",
            message: (err as Error).message,
        };
    }

    return { status: "NOT OK" };
}
