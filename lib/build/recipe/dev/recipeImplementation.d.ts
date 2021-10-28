// @ts-nocheck
import { RecipeInterface } from "./types";
import { Querier } from "../../querier";
export default class RecipeImplementation implements RecipeInterface {
    querier: Querier;
    constructor(querier: Querier);
    checkConnectionToCore: (
        apiKey: string | undefined,
        connectionURI: string | undefined
    ) => Promise<{
        status: "OK" | "NOT_OK";
        message?: string | undefined;
    }>;
}
