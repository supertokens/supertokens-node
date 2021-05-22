import { APIInterface, APIOptions, User, TypeProvider } from "../../thirdparty";
import STError from "../error";
import Recipe from "../recipe";

export default class APIImplementation implements APIInterface {
    recipeInstance: Recipe;

    constructor(recipeInstance: Recipe) {
        this.recipeInstance = recipeInstance;
    }

    authorisationUrlGET = async (
        provider: TypeProvider,
        options: APIOptions
    ): Promise<{
        status: "OK";
        url: string;
    }> => {
        return this.recipeInstance.apiImpl.authorisationUrlGET(provider, options);
    };

    signInUpPOST = async (
        provider: TypeProvider,
        code: string,
        redirectURI: string,
        options: APIOptions
    ): Promise<{
        status: "OK";
        createdNewUser: boolean;
        user: User;
    }> => {
        let result = await this.recipeInstance.apiImpl.signInUpPOST(provider, code, redirectURI, options);
        if (result.user.thirdParty === undefined) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: new Error("Should never come here"),
            });
        }
        return {
            ...result,
            user: {
                ...result.user,
                thirdParty: result.user.thirdParty,
            },
        };
    };

    signOutPOST = async (
        _: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error("Should never come here"),
        });
    };
}
