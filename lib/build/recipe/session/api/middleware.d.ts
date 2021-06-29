import SessionRecipe from "../recipe";
import { BaseRequest, BaseResponse } from "../../../wrappers";
export declare function sendTryRefreshTokenResponse(
    recipeInstance: SessionRecipe,
    _: string,
    __: BaseRequest,
    response: BaseResponse
): Promise<void>;
export declare function sendUnauthorisedResponse(
    recipeInstance: SessionRecipe,
    _: string,
    __: BaseRequest,
    response: BaseResponse
): Promise<void>;
export declare function sendTokenTheftDetectedResponse(
    recipeInstance: SessionRecipe,
    sessionHandle: string,
    _: string,
    __: BaseRequest,
    response: BaseResponse
): Promise<void>;
