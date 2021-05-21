import { APIInterface, APIOptions, User } from "../../emailpassword";
import Recipe from "../recipe";

export default class APIImplementation implements APIInterface {
    recipeInstance: Recipe;

    constructor(recipeInstance: Recipe) {
        this.recipeInstance = recipeInstance;
    }

    emailExistsGET = async (
        email: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
        exists: boolean;
    }> => {
        return this.recipeInstance.apiImpl.emailExistsGET(email, {
            ...options,
            recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
        });
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
        return this.recipeInstance.apiImpl.generatePasswordResetTokenPOST(formFields, {
            ...options,
            recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
        });
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
        return this.recipeInstance.apiImpl.passwordResetPOST(formFields, token, {
            ...options,
            recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
        });
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
        return this.recipeInstance.apiImpl.signInPOST(formFields, {
            ...options,
            recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
        });
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
        return this.recipeInstance.apiImpl.signUpPOST(formFields, {
            ...options,
            recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
        });
    };

    signOutPOST = async (
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        return this.recipeInstance.apiImpl.signOutPOST({
            ...options,
            recipeImplementation: this.recipeInstance.recipeInterfaceImpl,
        });
    };
}
