import { APIInterface, APIOptions, User } from "../../emailpassword";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";

export default class APIImplementation implements APIInterface {
    apiImplmentation: ThirdPartyEmailPasswordAPIInterface;

    constructor(apiImplmentation: ThirdPartyEmailPasswordAPIInterface) {
        this.apiImplmentation = apiImplmentation;
    }

    emailExistsGET = async (
        email: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
        exists: boolean;
    }> => {
        return this.apiImplmentation.emailExistsGET(email, options);
    };

    generatePasswordResetTokenPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        return this.apiImplmentation.generatePasswordResetTokenPOST(formFields, options);
    };

    passwordResetPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        token: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        return this.apiImplmentation.passwordResetPOST(formFields, token, options);
    };

    signInPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ): Promise<{
        status: "OK";
        user: User;
    }> => {
        return this.apiImplmentation.signInPOST(formFields, options);
    };

    signUpPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ): Promise<{
        status: "OK";
        user: User;
    }> => {
        return this.apiImplmentation.signUpPOST(formFields, options);
    };

    signOutPOST = async (
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        return this.apiImplmentation.signOutPOST(options);
    };
}
