import { APIInterface, APIOptions } from "../";
export default class APIImplementation implements APIInterface {
    verifyEmailPOST: (
        token: string,
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
    isEmailVerifiedGET: (
        options: APIOptions
    ) => Promise<{
        status: "OK";
        isVerified: boolean;
    }>;
    generateEmailVerifyTokenPOST: (
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
}
