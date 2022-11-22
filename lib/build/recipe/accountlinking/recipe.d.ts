// @ts-nocheck
import error from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { AccountInfoWithRecipeId, APIHandled, HTTPMethod } from "../../types";
import { SessionContainer } from "../session";
import { AccountInfoAndEmailWithRecipeId } from "./types";
export default class AccountLinkingRecipe extends RecipeModule {
    getAPIsHandled(): APIHandled[];
    handleAPIRequest(
        _id: string,
        _req: BaseRequest,
        _response: BaseResponse,
        _path: normalisedURLPath,
        _method: HTTPMethod
    ): Promise<boolean>;
    handleError(_error: error, _request: BaseRequest, _response: BaseResponse): Promise<void>;
    getAllCORSHeaders(): string[];
    isErrorFromThisRecipe(_err: any): _err is error;
    isSignUpAllowed: (input: { info: AccountInfoWithRecipeId }) => Promise<boolean>;
    createPrimaryUserIdOrLinkAccountPostSignUp: (_input: {
        identifyinInfo: AccountInfoAndEmailWithRecipeId;
        shouldRequireVerification: boolean;
    }) => Promise<void>;
    accountLinkPostSignInViaSession: (_input: {
        session: SessionContainer;
        identifyinInfo: AccountInfoAndEmailWithRecipeId;
    }) => Promise<
        | {
              createRecipeUser: true;
          }
        | ({
              createRecipeUser: false;
          } & {
              accountsLinked: true;
          })
        | ({
              createRecipeUser: false;
          } & {
              accountsLinked: false;
              reason: string;
          })
    >;
}
