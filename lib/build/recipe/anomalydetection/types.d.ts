// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
export declare type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder?: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder?: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export declare type APIInterface = {};
export declare type RecipeInterface = {
    checkForAnomaly: (input: {
        request: any;
        userId: string;
        userContext: any;
    }) => Promise<{
        status: "ANOMALY_DETECTED" | "NO_ANOMALY_DETECTED" | "ANOMALY_SERVICE_ERROR";
        anomalyDetected: boolean;
        message: string;
    }>;
};
