import { APIInterface, APIOptions } from "../";

export default function getAPIImplementation(): APIInterface {
    return {
        healthCheckGET: async ({
            options,
        }: {
            options: APIOptions;
        }): Promise<{ status: "OK" | "NOT_OK"; message: string }> => {
            let response = await options.recipeImplementation.checkConnectionToCoreAndDevOAuthKeys(
                options.config.apiKey,
                options.config.connectionURI
            );
            return response;
        },
    };
}
