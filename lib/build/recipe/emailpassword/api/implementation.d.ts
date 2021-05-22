import { APIInterface, APIOptions, User } from "../";
export default class APIImplementation implements APIInterface {
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
