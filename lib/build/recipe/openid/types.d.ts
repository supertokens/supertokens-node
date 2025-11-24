// @ts-nocheck
import OverrideableBuilder from "supertokens-js-override";
import type { BaseRequest, BaseResponse } from "../../framework";
import { GeneralErrorResponse, UserContext } from "../../types";
export type TypeInput = {
    override?: {
        functions?: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis?: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type TypeNormalisedInput = {
    override: {
        functions: (
            originalImplementation: RecipeInterface,
            builder: OverrideableBuilder<RecipeInterface>
        ) => RecipeInterface;
        apis: (originalImplementation: APIInterface, builder: OverrideableBuilder<APIInterface>) => APIInterface;
    };
};
export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    req: BaseRequest;
    res: BaseResponse;
};
export type APIInterface = {
    getOpenIdDiscoveryConfigurationGET:
        | undefined
        | ((input: { options: APIOptions; userContext: UserContext }) => Promise<
              | {
                    status: "OK";
                    issuer: string;
                    jwks_uri: string;
                    authorization_endpoint: string;
                    token_endpoint: string;
                    userinfo_endpoint: string;
                    revocation_endpoint: string;
                    token_introspection_endpoint: string;
                    end_session_endpoint: string;
                    subject_types_supported: string[];
                    id_token_signing_alg_values_supported: string[];
                    response_types_supported: string[];
                }
              | GeneralErrorResponse
          >);
};
export type RecipeInterface = {
    getOpenIdDiscoveryConfiguration(input: { userContext: UserContext }): Promise<{
        status: "OK";
        issuer: string;
        jwks_uri: string;
        authorization_endpoint: string;
        token_endpoint: string;
        userinfo_endpoint: string;
        revocation_endpoint: string;
        token_introspection_endpoint: string;
        end_session_endpoint: string;
        subject_types_supported: string[];
        id_token_signing_alg_values_supported: string[];
        response_types_supported: string[];
    }>;
    createJWT(input: {
        payload?: any;
        validitySeconds?: number;
        useStaticSigningKey?: boolean;
        userContext: UserContext;
    }): Promise<
        | {
              status: "OK";
              jwt: string;
          }
        | {
              status: "UNSUPPORTED_ALGORITHM_ERROR";
          }
    >;
};
