import { APIInterface, APIOptions, VerifySessionOptions } from "../";
export default class APIImplementation implements APIInterface {
    refreshPOST: ({ options }: { options: APIOptions }) => Promise<void>;
    verifySession: ({
        verifySessionOptions,
        options,
    }: {
        verifySessionOptions: VerifySessionOptions | undefined;
        options: APIOptions;
    }) => Promise<void>;
    signOutPOST: ({
        options,
    }: {
        options: APIOptions;
    }) => Promise<{
        status: "OK";
    }>;
}
