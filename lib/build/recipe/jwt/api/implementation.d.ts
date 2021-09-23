// @ts-nocheck
import { APIInterface, APIOptions, JsonWebKey } from "../types";
export default class APIImplementation implements APIInterface {
    getJWKSGET: ({
        options,
    }: {
        options: APIOptions;
    }) => Promise<{
        status: "OK";
        keys: JsonWebKey[];
    }>;
}
