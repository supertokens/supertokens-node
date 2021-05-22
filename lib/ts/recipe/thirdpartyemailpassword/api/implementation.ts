import { APIInterface, EmailPasswordAPIOptions, ThirdPartyAPIOptions, User, TypeProvider } from "../";
import ThirdPartyRecipe from "../../thirdparty/recipe";
import EmailPasswordImplemenation from "../../emailpassword/api/implementation";
import ThirdPartyImplemenation from "../../thirdparty/api/implementation";

export default class APIImplementation implements APIInterface {
    emailPasswordImplementation: EmailPasswordImplemenation;
    thirdPartyImplementation: ThirdPartyImplemenation;
    thirdPartyRecipeInstance?: ThirdPartyRecipe;

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
        status: "OK";
    }> => {
        return this.emailPasswordImplementation.passwordResetPOST(formFields, token, options);
    };

    signInPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
        user: User;
    }> => {
        return this.emailPasswordImplementation.signInPOST(formFields, options);
    };

    signUpPOST = async (
        formFields: {
            id: string;
            value: string;
        }[],
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
        user: User;
    }> => {
        return this.emailPasswordImplementation.signUpPOST(formFields, options);
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

    signInUpPOST = async (
        provider: TypeProvider,
        code: string,
        redirectURI: string,
        options: ThirdPartyAPIOptions
    ): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }> => {
        return this.thirdPartyImplementation.signInUpPOST(provider, code, redirectURI, options);
    };

    signOutPOST = async (
        options: EmailPasswordAPIOptions
    ): Promise<{
        status: "OK";
    }> => {
        return this.emailPasswordImplementation.signOutPOST(options);
    };
}
