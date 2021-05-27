import {
    APIInterface,
    EmailPasswordAPIOptions,
    ThirdPartyAPIOptions,
    TypeProvider,
    SignInUpAPIInput,
    SignInUpAPIOutput,
} from "../";
import EmailPasswordImplemenation from "../../emailpassword/api/implementation";
import ThirdPartyImplemenation from "../../thirdparty/api/implementation";

export default class APIImplementation implements APIInterface {
    emailPasswordImplementation: EmailPasswordImplemenation;
    thirdPartyImplementation: ThirdPartyImplemenation;

    constructor() {
        this.emailPasswordImplementation = new EmailPasswordImplemenation();
        this.thirdPartyImplementation = new ThirdPartyImplemenation();
    }

    emailExistsGET = async (
        email: string,
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
        exists: boolean;
    }> => {
        return this.emailPasswordImplementation.emailExistsGET(email, options);
    };

    generatePasswordResetTokenPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
    }> => {
        return this.emailPasswordImplementation.generatePasswordResetTokenPOST(formFields, options);
    };

    passwordResetPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        token: string,
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK" | "RESET_PASSWORD_INVALID_TOKEN_ERROR";
    }> => {
        return this.emailPasswordImplementation.passwordResetPOST(formFields, token, options);
    };

    signInUpPOST = async (input: SignInUpAPIInput): Promise<SignInUpAPIOutput> => {
        if (input.type === "emailpassword") {
            if (input.isSignIn) {
                let response = await this.emailPasswordImplementation.signInPOST(input.formFields, input.options);
                if (response.status === "OK") {
                    return {
                        ...response,
                        createdNewUser: false,
                        type: "emailpassword",
                    };
                } else {
                    return {
                        ...response,
                        type: "emailpassword",
                    };
                }
            } else {
                let response = await this.emailPasswordImplementation.signUpPOST(input.formFields, input.options);
                if (response.status === "OK") {
                    return {
                        ...response,
                        createdNewUser: true,
                        type: "emailpassword",
                    };
                } else {
                    return {
                        ...response,
                        type: "emailpassword",
                    };
                }
            }
        } else {
            let response = await this.thirdPartyImplementation.signInUpPOST(
                input.provider,
                input.code,
                input.redirectURI,
                input.options
            );
            return {
                ...response,
                type: "thirdparty",
            };
        }
    };

    authorisationUrlGET = async (
        provider: TypeProvider,
        options: ThirdPartyAPIOptions
    ): Promise<{
        status: "OK";
        url: string;
    }> => {
        return this.thirdPartyImplementation.authorisationUrlGET(provider, options);
    };

    signOutPOST = async (
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
    }> => {
        return this.emailPasswordImplementation.signOutPOST(options);
    };
}
