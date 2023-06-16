// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import { BaseRequest, BaseResponse } from "../../framework";
import { NormalisedAppinfo } from "../../types";
import type { SessionContainer } from "../session";
export declare type TypeInput = {
    defaultFirstFactors: string[];
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    defaultFirstFactors: string[];
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type RecipeInterface = {
    getNextFactors: (input: {
        session: SessionContainer;
        completedFactors: string[];
        enabledByUser: string[];
        userContext: any;
    }) => Promise<string[]>;
    getFirstFactors: (input: { tenantId: string; userContext: any }) => Promise<string[]>;
    completeFactorInSession: (input: {
        session: SessionContainer;
        factorId: string;
        userContext: any;
    }) => Promise<void>;
    isFactorAlreadySetup: (input: {
        session: SessionContainer;
        factorId: string;
        userContext: any;
    }) => Promise<boolean>;
    getUserIdForFactor: (input: {
        session: SessionContainer;
        factorId: string;
        email?: string;
        phoneNumber?: string;
    }) => Promise<string | undefined>;
    setUserIdForFactor: (input: { session: SessionContainer; userId: string; factorId: string }) => Promise<void>;
    getPrimaryUserIdForFactor: (input: { userId: string; factorId: string }) => Promise<string | undefined>;
    enableFactorForUser: (input: {
        tenantId: string;
        userId: string;
        factorId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        wasAlreadyEnabled: boolean;
    }>;
    getAllFactorsEnabledForUser: (input: { tenantId: string; userId: string; userContext: any }) => Promise<string[]>;
    disableFactorForUser: (input: {
        tenantId: string;
        userId: string;
        factorId: string;
        userContext: any;
    }) => Promise<{
        status: "OK";
        didFactorExist: boolean;
    }>;
};
export declare type APIOptions = {
    recipeImplementation: RecipeInterface;
    appInfo: NormalisedAppinfo;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export declare type APIInterface = {
    isFactorAlreadySetupForUserGET?: (input: {
        session: SessionContainer;
        factorId: string;
        options: APIOptions;
        userContext: any;
    }) => Promise<{
        status: "OK";
        isSetup: boolean;
    }>;
    listFactorsGET?: (input: {
        session: SessionContainer;
        options: APIOptions;
        userContext: any;
    }) => Promise<{
        status: "OK";
        factors: string[];
    }>;
};
