// @ts-nocheck
import STError from "../../error";
import { BaseRequest, BaseResponse } from "../../framework";
import normalisedURLPath from "../../normalisedURLPath";
import RecipeModule from "../../recipeModule";
import { APIHandled, HTTPMethod, NormalisedAppinfo } from "../../types";
import { ConfigInput, SmsService, RecipeInterface } from "./types";
export default class Recipe<TypeInput> extends RecipeModule {
    static RECIPE_ID: string;
    service: SmsService<TypeInput> | undefined;
    recipeInterfaceImpl: RecipeInterface<TypeInput>;
    constructor(recipeId: string, appInfo: NormalisedAppinfo, config: ConfigInput<TypeInput>);
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        _: string,
        __: BaseRequest,
        ___: BaseResponse,
        ____: normalisedURLPath,
        _____: HTTPMethod
    ) => Promise<boolean>;
    handleError: (err: STError, _: BaseRequest, __: BaseResponse) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
}
