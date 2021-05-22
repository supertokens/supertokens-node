import { APIInterface, APIOptions, VerifySessionOptions } from "../";
export default class APIImplementation implements APIInterface {
    refreshPOST: (options: APIOptions) => Promise<void>;
    verifySession: (verifySessionOptions: VerifySessionOptions | undefined, options: APIOptions) => Promise<void>;
    signOutPOST: (
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
}
