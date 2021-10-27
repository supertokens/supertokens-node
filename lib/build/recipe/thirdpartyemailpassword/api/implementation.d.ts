// @ts-nocheck
import { APIInterface, TypeProvider } from "../";
import EmailPasswordImplemenation from "../../emailpassword/api/implementation";
import ThirdPartyImplemenation from "../../thirdparty/api/implementation";
export default class APIImplementation implements APIInterface {
    emailPasswordImplementation: EmailPasswordImplemenation;
    thirdPartyImplementation: ThirdPartyImplemenation;
    constructor();
    emailExistsGET: (input: {
        email: string;
        options: import("../../emailpassword").APIOptions;
    }) => Promise<{
        status: "OK";
        exists: boolean;
    }>;
    generatePasswordResetTokenPOST: (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: import("../../emailpassword").APIOptions;
    }) => Promise<{
        status: "OK";
    }>;
    passwordResetPOST: (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        token: string;
        options: import("../../emailpassword").APIOptions;
    }) => Promise<{
        status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    }>;
    authorisationUrlGET: (input: {
        provider: TypeProvider;
        options: import("../../thirdparty").APIOptions;
    }) => Promise<{
        status: "OK";
        url: string;
    }>;
    emailPasswordSignInPOST: (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: import("../../emailpassword").APIOptions;
    }) => Promise<
        | {
              status: "OK";
              user: import("../../emailpassword").User;
          }
        | {
              status: "WRONG_CREDENTIALS_ERROR";
          }
    >;
    emailPasswordSignUpPOST: (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: import("../../emailpassword").APIOptions;
    }) => Promise<
        | {
              status: "OK";
              user: import("../../emailpassword").User;
          }
        | {
              status: "EMAIL_ALREADY_EXISTS_ERROR";
          }
    >;
    thirdPartySignInUpPOST: (input: {
        provider: TypeProvider;
        code: string;
        redirectURI: string;
        options: import("../../thirdparty").APIOptions;
    }) => Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: import("../../thirdparty").User;
              authCodeResponse: any;
          }
        | {
              status: "NO_EMAIL_GIVEN_BY_PROVIDER";
          }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    >;
}
