import { APIInterface, User, TypeProvider } from "../";
import ThirdPartyRecipe from "../../thirdparty/recipe";
import EmailPasswordImplemenation from "../../emailpassword/api/implementation";
import ThirdPartyImplemenation from "../../thirdparty/api/implementation";
export default class APIImplementation implements APIInterface {
    emailPasswordImplementation: EmailPasswordImplemenation;
    thirdPartyImplementation: ThirdPartyImplemenation | undefined;
    thirdPartyRecipeInstance?: ThirdPartyRecipe;
    constructor(hasThirdPartyAPIs: boolean);
    emailExistsGET: (
        email: string,
        options: import("../../emailpassword").APIOptions
    ) => Promise<{
        status: "OK";
        exists: boolean;
    }>;
    generatePasswordResetTokenPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        options: import("../../emailpassword").APIOptions
    ) => Promise<{
        status: "OK";
    }>;
    passwordResetPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        token: string,
        options: import("../../emailpassword").APIOptions
    ) => Promise<{
        status: "OK";
    }>;
    signInPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        options: import("../../emailpassword").APIOptions
    ) => Promise<{
        status: "OK";
        user: User;
    }>;
    signUpPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        options: import("../../emailpassword").APIOptions
    ) => Promise<{
        status: "OK";
        user: User;
    }>;
    authorisationUrlGET: (
        provider: TypeProvider,
        options: import("../../thirdparty").APIOptions
    ) => Promise<{
        status: "OK";
        url: string;
    }>;
    signInUpPOST: (
        provider: TypeProvider,
        code: string,
        redirectURI: string,
        options: import("../../thirdparty").APIOptions
    ) => Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }>;
    signOutPOST: (
        options: import("../../emailpassword").APIOptions
    ) => Promise<{
        status: "OK";
    }>;
}
