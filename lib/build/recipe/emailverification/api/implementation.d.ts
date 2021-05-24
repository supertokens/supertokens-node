import { APIInterface, APIOptions, User } from "../";
export default class APIImplementation implements APIInterface {
    verifyEmailPOST: (
        token: string,
        options: APIOptions
    ) => Promise<{
        status: "OK";
        user: User;
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
