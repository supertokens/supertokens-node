import { APIInterface, APIOptions, User, TypeProvider } from "../../thirdparty";
import Recipe from "../recipe";
export default class APIImplementation implements APIInterface {
    recipeInstance: Recipe;
    constructor(recipeInstance: Recipe);
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
    }>;
    signOutPOST: (
        _: APIOptions
    ) => Promise<{
        status: "OK";
    }>;
}
