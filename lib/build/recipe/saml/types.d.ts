// @ts-nocheck
import { BaseRequest, BaseResponse } from "../../framework";
import OverrideableBuilder from "supertokens-js-override";
import { GeneralErrorResponse, UserContext } from "../../types";
import { SessionContainerInterface } from "../session/types";
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
    createLoginRequest: (input: { clientId: string; redirectURI: string; userContext: UserContext }) => Promise<{
        status: "OK";
        redirectURL: string;
    }>;
    verifySAMLResponse: (input: { samlResponse: string; userContext: UserContext }) => Promise<
        | {
              status: "OK";
          }
        | {
              status: "INVALID_RESPONSE";
          }
    >;
};
export type APIOptions = {
    recipeImplementation: RecipeInterface;
    config: TypeNormalisedInput;
    recipeId: string;
    isInServerlessEnv: boolean;
    req: BaseRequest;
    res: BaseResponse;
};
export type APIInterface = {
    loginGET:
        | undefined
        | ((input: { clientId: string; redirectURI: string; options: APIOptions; userContext: UserContext }) => Promise<
              | {
                    status: "OK";
                    redirectURL: string;
                }
              | GeneralErrorResponse
          >);
    callbackPOST:
        | undefined
        | ((input: { options: APIOptions; session: SessionContainerInterface; userContext: UserContext }) => Promise<
              | {
                    status: "OK";
                }
              | GeneralErrorResponse
          >);
};
