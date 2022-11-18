import error from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { AccountInfoWithRecipeId, APIHandled, HTTPMethod } from "../../types";
import { SessionContainer } from "../session";
import { AccountInfoAndEmailWithRecipeId } from "./types";
export default class AccountLinkingRecipe extends RecipeModule {
    getAPIsHandled(): APIHandled[];
    handleAPIRequest(id: string, req: BaseRequest, response: BaseResponse, path: normalisedURLPath, method: HTTPMethod): Promise<boolean>;
    handleError(error: error, request: BaseRequest, response: BaseResponse): Promise<void>;
    getAllCORSHeaders(): string[];
    isErrorFromThisRecipe(err: any): err is error;
    isSignUpAllowed: (input: {
        info: AccountInfoWithRecipeId;
    }) => Promise<boolean>;
    createPrimaryUserIdOrLinkAccountPostSignUp: (input: {
        identifyinInfo: AccountInfoAndEmailWithRecipeId;
        shouldRequireVerification: boolean;
    }) => Promise<void>;
    accountLinkPostSignInViaSession: (input: {
        session: SessionContainer;
        identifyinInfo: AccountInfoAndEmailWithRecipeId;
    }) => Promise<{
        createRecipeUser: true;
    } | ({
        createRecipeUser: false;
    } & {
        accountsLinked: true;
    }) | ({
        createRecipeUser: false;
    } & {
        accountsLinked: false;
        reason: string;
    })>;
}
