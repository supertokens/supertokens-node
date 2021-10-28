// @ts-nocheck
import { APIInterface, APIOptions } from "../";
export default class APIImplementation implements APIInterface {
    healthCheckGET: ({
        options,
    }: {
        options: APIOptions;
        apiImplementation: APIInterface;
    }) => Promise<{
        status: "OK" | "NOT_OK";
        message?: string | undefined;
    }>;
}
