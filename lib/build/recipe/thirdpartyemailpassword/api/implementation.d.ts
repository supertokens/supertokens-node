import { APIInterface, TypeProvider, SignInUpAPIInput, SignInUpAPIOutput } from "../";
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
    signInUpPOST: (input: SignInUpAPIInput) => Promise<SignInUpAPIOutput>;
    authorisationUrlGET: (input: {
        provider: TypeProvider;
        options: import("../../thirdparty").APIOptions;
    }) => Promise<{
        status: "OK";
        url: string;
    }>;
}
