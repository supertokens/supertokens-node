// @ts-nocheck
import {
    TypeInput,
    TypeNormalisedInput,
    ClaimValidationError,
    SessionClaimValidator,
    SessionContainerInterface,
    VerifySessionOptions,
    TokenTransferMethod,
} from "./types";
import SessionRecipe from "./recipe";
import { NormalisedAppinfo } from "../../types";
import type { BaseRequest, BaseResponse } from "../../framework";
import RecipeUserId from "../../recipeUserId";
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
export declare function sendInvalidClaimResponse(
    recipeInstance: SessionRecipe,
    claimValidationErrors: ClaimValidationError[],
    __: BaseRequest,
    response: BaseResponse
): Promise<void>;
export declare function sendTokenTheftDetectedResponse(
    recipeInstance: SessionRecipe,
    sessionHandle: string,
    _: string,
    __: RecipeUserId,
    ___: BaseRequest,
    response: BaseResponse
): Promise<void>;
export declare function normaliseSessionScopeOrThrowError(sessionScope: string): string;
export declare function getURLProtocol(url: string): string;
export declare function validateAndNormaliseUserInput(
    recipeInstance: SessionRecipe,
    appInfo: NormalisedAppinfo,
    config?: TypeInput
): TypeNormalisedInput;
export declare function normaliseSameSiteOrThrowError(sameSite: string): "strict" | "lax" | "none";
export declare function setAccessTokenInResponse(
    res: BaseResponse,
    accessToken: string,
    frontToken: string,
    config: TypeNormalisedInput,
    transferMethod: TokenTransferMethod,
    req: BaseRequest | undefined,
    userContext: any
): void;
export declare function getRequiredClaimValidators(
    session: SessionContainerInterface,
    overrideGlobalClaimValidators: VerifySessionOptions["overrideGlobalClaimValidators"],
    userContext: any
): Promise<SessionClaimValidator[]>;
export declare function validateClaimsInPayload(
    claimValidators: SessionClaimValidator[],
    newAccessTokenPayload: any,
    userContext: any
): Promise<
    {
        id: string;
        reason: import("../../types").JSONValue;
    }[]
>;
