import { APIInterface, APIOptions, User, TypeProvider } from "../../thirdparty";
import { APIInterface as ThirdPartyEmailPasswordAPIInterface } from "../";
import STError from "../error";

export default class APIImplementation implements APIInterface {
    apiImplmentation: ThirdPartyEmailPasswordAPIInterface;

    constructor(apiImplmentation: ThirdPartyEmailPasswordAPIInterface) {
        this.apiImplmentation = apiImplmentation;
    }

    authorisationUrlGET = async (
        provider: TypeProvider,
        options: APIOptions
    ): Promise<{
        status: "OK";
        url: string;
    }> => {
        return this.apiImplmentation.authorisationUrlGET(provider, options);
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
        let result = await this.apiImplmentation.signInUpPOST(provider, code, redirectURI, options);
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
