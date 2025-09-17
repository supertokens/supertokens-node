// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, NormalisedAppinfo, UserContext } from "../../types";
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
export type RecipeInterface = {
    verifyClientRedirectURI: (input: { clientId: string; redirectURI: string; userContext: UserContext }) => Promise<
        | {
              status: "OK";
              info: string;
          }
        | {
              status: "UNKNOWN_CLIENT" | "INVALID_REDIRECT_URI";
          }
    >;
    createLoginRequest: (input: {
        tenantId: string;
        clientId: string;
        redirectURI: string;
        state?: string;
        acsURL: string;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              redirectURI: string;
          }
        | {
              status: "INVALID_CLIENT_ERROR";
          }
    >;
    verifySAMLResponse: (input: {
        tenantId: string;
        clientId?: string;
        samlResponse: string;
        relayState: string | undefined;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              redirectURI: string;
          }
        | {
              status: "INVALID_RESPONSE_ERROR" | "INVALID_CLIENT_ERROR";
          }
    >;
};
export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    appInfo: NormalisedAppinfo;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export type APIInterface = {
    loginGET:
        | undefined
        | ((input: {
              clientId: string;
              redirectURI: string;
              state?: string;
              options: APIOptions;
              userContext: UserContext;
          }) => Promise<
              | {
                    status: "OK";
                    redirectURI: string;
                    state?: string;
                }
              | {
                    status: "INVALID_CLIENT_ERROR";
                }
              | GeneralErrorResponse
          >);
    callbackPOST:
        | undefined
        | ((input: {
              options: APIOptions;
              userContext: UserContext;
              clientId?: string;
              samlResponse: string;
              relayState: string | undefined;
          }) => Promise<
              | {
                    status: "OK";
                    redirectURI: string;
                }
              | {
                    status: "INVALID_RESPONSE_ERROR" | "INVALID_CLIENT_ERROR";
                }
              | GeneralErrorResponse
          >);
};
