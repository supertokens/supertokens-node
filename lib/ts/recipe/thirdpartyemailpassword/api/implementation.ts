import { APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions, TypeProvider } from "../";
import EmailPasswordImplemenation from "../../emailpassword/api/implementation";
import ThirdPartyImplemenation from "../../thirdparty/api/implementation";

export default class APIImplementation implements APIInterface {
    emailPasswordImplementation: EmailPasswordImplemenation;
    thirdPartyImplementation: ThirdPartyImplemenation;

    constructor() {
        this.emailPasswordImplementation = new EmailPasswordImplemenation();
        this.thirdPartyImplementation = new ThirdPartyImplemenation();
    }

    emailExistsGET = async (input: {
        email: string;
        options: EmailPasswordAPIOptions;
    }): Promise<{
        status: "OK";
        exists: boolean;
    }> => {
        return this.emailPasswordImplementation.emailExistsGET(input);
    };

    generatePasswordResetTokenPOST = async (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: EmailPasswordAPIOptions;
    }): Promise<{
        status: "OK";
    }> => {
        return this.emailPasswordImplementation.generatePasswordResetTokenPOST(input);
    };

    passwordResetPOST = async (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        token: string;
        options: EmailPasswordAPIOptions;
    }): Promise<{
        status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    }> => {
        return this.emailPasswordImplementation.passwordResetPOST(input);
    };

    authorisationUrlGET = async (input: {
        provider: TypeProvider;
        options: ThirdPartyAPIOptions;
    }): Promise<{
        status: "OK";
        url: string;
    }> => {
        return this.thirdPartyImplementation.authorisationUrlGET(input);
    };

    emailPasswordSignInPOST = async (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: EmailPasswordAPIOptions;
    }) => {
        return this.emailPasswordImplementation.signInPOST(input);
    };

    emailPasswordSignUpPOST = async (input: {
        formFields: {
            id: string;
            value: string;
        }[];
        options: EmailPasswordAPIOptions;
    }) => {
        return this.emailPasswordImplementation.signUpPOST(input);
    };

    thirdPartySignInUpPOST = async (input: {
        provider: TypeProvider;
        code: string;
        redirectURI: string;
        options: ThirdPartyAPIOptions;
    }) => {
        return this.thirdPartyImplementation.signInUpPOST(input);
    };
}
