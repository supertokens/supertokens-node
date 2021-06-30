import { APIInterface, APIOptions, VerifySessionOptions } from "../";
import { SessionContainerInterface } from "../types";
export default class APIImplementation implements APIInterface {
    refreshPOST: ({ options }: { options: APIOptions }) => Promise<void>;
    verifySession: ({
        verifySessionOptions,
        options,
    }: {
        verifySessionOptions: VerifySessionOptions | undefined;
        options: APIOptions;
    }) => Promise<SessionContainerInterface | undefined>;
    signOutPOST: ({
        options,
    }: {
        options: APIOptions;
    }) => Promise<{
        status: "OK";
    }>;
}
