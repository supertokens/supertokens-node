import { APIInterface, APIOptions } from "../";
export default class APIImplementation implements APIInterface {
    healthCheckGET = async ({
        options,
    }: {
        options: APIOptions;
        apiImplementation: APIInterface;
    }): Promise<{ status: "OK" | "NOT_OK"; message?: string }> => {
        let response = await options.recipeImplementation.checkConnectionToCore(
            options.config.apiKey,
            options.config.connectionURL
        );
        return response;
    };
}
