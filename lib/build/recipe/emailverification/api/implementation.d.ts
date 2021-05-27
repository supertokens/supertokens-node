import { APIInterface, APIOptions, User } from "../";
export default class APIImplementation implements APIInterface {
    verifyEmailPOST: (
        token: string,
        options: APIOptions
    ) => Promise<
        | {
              status: "OK";
              user: User;
          }
        | {
              status: "EMAIL_VERIFICATION_INVALID_TOKEN_ERROR";
          }
    >;
    isEmailVerifiedGET: (
        options: APIOptions
    ) => Promise<{
        status: "OK";
        isVerified: boolean;
    }>;
    generateEmailVerifyTokenPOST: (
        options: APIOptions
    ) => Promise<{
        status: "OK" | "EMAIL_ALREADY_VERIFIED_ERROR";
    }>;
}
