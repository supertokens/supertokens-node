// @ts-nocheck
import SuperTokensError from "../../error";
import Recipe from "./recipe";
import { RecipeInterface, APIOptions, APIInterface } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static Error: typeof SuperTokensError;
    static createOrUpdateClient(input: {
        tenantId: string;
        clientId?: string;
        clientSecret?: string;
        redirectURIs: string[];
        defaultRedirectURI: string;
        metadataXML: string;
        allowIDPInitiatedLogin?: boolean;
        enableRequestSigning?: boolean;
        userContext?: Record<string, any>;
    }): Promise<({
        status: "OK";
    } & import("./types").SAMLClient) | {
        status: "INVALID_METADATA_XML_ERROR" | "DUPLICATE_IDP_ENTITY_ERROR";
    }>;
    static listClients(input: {
        tenantId: string;
        userContext?: Record<string, any>;
    }): Promise<{
        status: "OK";
        clients: import("./types").SAMLClient[];
    }>;
    static removeClient(input: {
        tenantId: string;
        clientId: string;
        userContext?: Record<string, any>;
    }): Promise<{
        status: "OK";
        didExist: boolean;
    }>;
    static createLoginRequest(input: {
        tenantId: string;
        clientId: string;
        redirectURI: string;
        state?: string;
        acsURL: string;
        userContext?: Record<string, any>;
    }): Promise<{
        status: "OK";
        redirectURI: string;
    } | {
        status: "INVALID_CLIENT_ERROR";
    }>;
    static verifySAMLResponse(input: {
        tenantId: string;
        samlResponse: string;
        relayState: string | undefined;
        userContext?: Record<string, any>;
    }): Promise<{
        status: "OK";
        redirectURI: string;
    } | {
        status: "SAML_RESPONSE_VERIFICATION_FAILED_ERROR" | "INVALID_RELAY_STATE_ERROR" | "INVALID_CLIENT_ERROR" | "IDP_LOGIN_DISALLOWED_ERROR";
    }>;
    static getUserInfo(input: {
        tenantId: string;
        accessToken: string;
        clientId: string;
        userContext?: Record<string, any>;
    }): Promise<{
        status: "OK";
        sub: string;
        email: string;
        claims: Record<string, any>;
    } | {
        status: "INVALID_TOKEN_ERROR";
    }>;
}
export declare let init: typeof Recipe.init;
export declare let Error: typeof SuperTokensError;
export declare let createOrUpdateClient: typeof Wrapper.createOrUpdateClient;
export declare let listClients: typeof Wrapper.listClients;
export declare let removeClient: typeof Wrapper.removeClient;
export declare let createLoginRequest: typeof Wrapper.createLoginRequest;
export declare let verifySAMLResponse: typeof Wrapper.verifySAMLResponse;
export declare let getUserInfo: typeof Wrapper.getUserInfo;
export type { RecipeInterface, APIOptions, APIInterface };
