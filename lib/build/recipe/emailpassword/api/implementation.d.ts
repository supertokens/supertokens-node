import { APIInterface, APIOptions, User } from "../";
import Recipe from "../recipe";
export default class APIImplementation implements APIInterface {
    recipeInstance: Recipe;
    constructor(recipeInstance: Recipe);
    emailExistsGET: (
        email: string,
        options: APIOptions
    ) => Promise<{
        status: "OK";
        exists: boolean;
    }>;
    generatePasswordResetTokenPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
    passwordResetPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        token: string,
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
    signInPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ) => Promise<{
        status: "OK";
        user: User;
    }>;
    signOutPOST: (
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
    signUpPOST: (
        formFields: {
            id: string;
            value: string;
        }[],
        options: APIOptions
    ) => Promise<{
        status: "OK";
        user: User;
    }>;
}
