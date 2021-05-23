import { APIInterface, APIOptions, User, TypeProvider } from "../";
export default class APIImplementation implements APIInterface {
    authorisationUrlGET: (
        provider: TypeProvider,
        options: APIOptions
    ) => Promise<{
        status: "OK";
        url: string;
    }>;
    signInUpPOST: (
        provider: TypeProvider,
        code: string,
        redirectURI: string,
        options: APIOptions
    ) => Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
        authCodeResponse: any;
    }>;
    signOutPOST: (
        options: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
}
