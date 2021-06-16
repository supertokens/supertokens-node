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

    signInUpPOST = async (input: SignInUpAPIInput): Promise<SignInUpAPIOutput> => {
        if (input.type === "emailpassword") {
            if (input.isSignIn) {
                let response = await this.emailPasswordImplementation.signInPOST(input);
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
                let response = await this.emailPasswordImplementation.signUpPOST(input);
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
            let response = await this.thirdPartyImplementation.signInUpPOST(input);
            return {
                ...response,
                type: "thirdparty",
            };
        }
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
}
