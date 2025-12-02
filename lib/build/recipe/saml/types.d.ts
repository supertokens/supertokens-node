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
export type SAMLClient = {
    clientId: string;
    redirectURIs: string[];
    defaultRedirectURI: string;
    idpEntityId: string;
    idpSigningCertificate?: string;
    allowIDPInitiatedLogin: boolean;
    enableRequestSigning: boolean;
};
export type RecipeInterface = {
    createOrUpdateClient: (input: {
        tenantId: string;
        clientId?: string;
        clientSecret?: string;
        redirectURIs: string[];
        defaultRedirectURI: string;
        metadataXML: string;
        allowIDPInitiatedLogin?: boolean;
        enableRequestSigning?: boolean;
        userContext: UserContext;
    }) => Promise<
        | ({
              status: "OK";
          } & SAMLClient)
        | {
              status: "INVALID_METADATA_XML_ERROR" | "DUPLICATE_IDP_ENTITY_ERROR";
          }
    >;
    listClients: (input: { tenantId: string; userContext: UserContext }) => Promise<{
        status: "OK";
        clients: SAMLClient[];
    }>;
    removeClient: (input: { tenantId: string; clientId: string; userContext: UserContext }) => Promise<{
        status: "OK";
        didExist: boolean;
    }>;
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
        samlResponse: string;
        relayState: string | undefined;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              redirectURI: string;
          }
        | {
              status:
                  | "SAML_RESPONSE_VERIFICATION_FAILED_ERROR"
                  | "INVALID_RELAY_STATE_ERROR"
                  | "INVALID_CLIENT_ERROR"
                  | "IDP_LOGIN_DISALLOWED_ERROR";
          }
    >;
    getUserInfo: (input: {
        tenantId: string;
        accessToken: string;
        clientId: string;
        userContext: UserContext;
    }) => Promise<
        | {
              status: "OK";
              sub: string;
              email: string;
              claims: Record<string, any>;
          }
        | {
              status: "INVALID_TOKEN_ERROR";
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
              tenantId: string;
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
              tenantId: string;
              options: APIOptions;
              userContext: UserContext;
              samlResponse: string;
              relayState: string | undefined;
          }) => Promise<
              | {
                    status: "OK";
                    redirectURI: string;
                }
              | {
                    status:
                        | "SAML_RESPONSE_VERIFICATION_FAILED_ERROR"
                        | "INVALID_RELAY_STATE_ERROR"
                        | "INVALID_CLIENT_ERROR"
                        | "IDP_LOGIN_DISALLOWED_ERROR";
                }
              | GeneralErrorResponse
          >);
};
