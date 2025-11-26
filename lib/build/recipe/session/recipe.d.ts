// @ts-nocheck
import RecipeModule from "../../recipeModule";
import {
    TypeInput,
    TypeNormalisedInput,
    RecipeInterface,
    APIInterface,
    VerifySessionOptions,
    SessionClaimValidator,
    SessionClaim,
    SessionContainerInterface,
} from "./types";
import STError from "./error";
import { NormalisedAppinfo, RecipeListFunction, APIHandled, HTTPMethod, UserContext } from "../../types";
import NormalisedURLPath from "../../normalisedURLPath";
import type { BaseRequest, BaseResponse } from "../../framework";
import type SuperTokens from "../../supertokens";
import { RecipeUserId } from "../..";
export default class SessionRecipe extends RecipeModule {
    private static instance;
    static RECIPE_ID: "session";
    private claimsAddedByOtherRecipes;
    private claimValidatorsAddedByOtherRecipes;
    config: TypeNormalisedInput;
    recipeInterfaceImpl: RecipeInterface;
    apiImpl: APIInterface;
    isInServerlessEnv: boolean;
    constructor(
        stInstance: SuperTokens,
        recipeId: string,
        appInfo: NormalisedAppinfo,
        isInServerlessEnv: boolean,
        config?: TypeInput
    );
    static getInstanceOrThrowError(): SessionRecipe;
    static init(config?: TypeInput): RecipeListFunction;
    static reset(): void;
    addClaimFromOtherRecipe: (claim: SessionClaim<any>) => void;
    getClaimsAddedByOtherRecipes: () => SessionClaim<any>[];
    addClaimValidatorFromOtherRecipe: (builder: SessionClaimValidator) => void;
    getClaimValidatorsAddedByOtherRecipes: () => SessionClaimValidator[];
    getAPIsHandled: () => APIHandled[];
    handleAPIRequest: (
        id: string,
        _tenantId: string,
        req: BaseRequest,
        res: BaseResponse,
        _path: NormalisedURLPath,
        _method: HTTPMethod,
        userContext: UserContext
    ) => Promise<boolean>;
    handleError: (
        err: STError,
        request: BaseRequest,
        response: BaseResponse,
        userContext: UserContext
    ) => Promise<void>;
    getAllCORSHeaders: () => string[];
    isErrorFromThisRecipe: (err: any) => err is STError;
    verifySession: (
        options: VerifySessionOptions | undefined,
        request: BaseRequest,
        response: BaseResponse,
        userContext: UserContext
    ) => Promise<SessionContainerInterface | undefined>;
    getRequiredClaimValidators: (
        session: SessionContainerInterface,
        overrideGlobalClaimValidators: VerifySessionOptions["overrideGlobalClaimValidators"],
        userContext: UserContext
    ) => Promise<SessionClaimValidator[]>;
    createNewSession: (input: {
        req: any;
        res: any;
        tenantId: string;
        recipeUserId: RecipeUserId;
        accessTokenPayload: any;
        sessionDataInDatabase: any;
        userContext: UserContext;
    }) => Promise<SessionContainerInterface>;
    getSession: (input: {
        req: any;
        res: any;
        options?: VerifySessionOptions;
        userContext: UserContext;
    }) => Promise<SessionContainerInterface | undefined>;
}
