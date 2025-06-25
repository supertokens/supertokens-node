// @ts-nocheck
import Recipe from "./recipe";
import {
    APIInterface,
    RecipeInterface,
    APIOptions,
    CreateOAuth2ClientInput,
    UpdateOAuth2ClientInput,
    DeleteOAuth2ClientInput,
    GetOAuth2ClientsInput,
} from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static getOAuth2Client(
        clientId: string,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              client: import("./OAuth2Client").OAuth2Client;
          }
        | {
              status: "ERROR";
              error: string;
              errorDescription: string;
          }
    >;
    static getOAuth2Clients(
        input: GetOAuth2ClientsInput,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              clients: Array<import("./OAuth2Client").OAuth2Client>;
              nextPaginationToken?: string;
          }
        | {
              status: "ERROR";
              error: string;
              errorDescription: string;
          }
    >;
    static createOAuth2Client(
        input: CreateOAuth2ClientInput,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              client: import("./OAuth2Client").OAuth2Client;
          }
        | {
              status: "ERROR";
              error: string;
              errorDescription: string;
          }
    >;
    static updateOAuth2Client(
        input: UpdateOAuth2ClientInput,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              client: import("./OAuth2Client").OAuth2Client;
          }
        | {
              status: "ERROR";
              error: string;
              errorDescription: string;
          }
    >;
    static deleteOAuth2Client(
        input: DeleteOAuth2ClientInput,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
          }
        | {
              status: "ERROR";
              error: string;
              errorDescription: string;
          }
    >;
    static validateOAuth2AccessToken(
        token: string,
        requirements?: {
            clientId?: string;
            scopes?: string[];
            audience?: string;
        },
        checkDatabase?: boolean,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
        payload: import("../usermetadata").JSONObject;
    }>;
    static createTokenForClientCredentials(
        clientId: string,
        clientSecret: string,
        scope?: string[],
        audience?: string,
        userContext?: Record<string, any>
    ): Promise<import("./types").ErrorOAuth2 | import("./types").TokenInfo>;
    static revokeToken(
        token: string,
        clientId: string,
        clientSecret?: string,
        userContext?: Record<string, any>
    ): Promise<
        | import("./types").ErrorOAuth2
        | {
              status: "OK";
          }
    >;
    static revokeTokensByClientId(
        clientId: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
    }>;
    static revokeTokensBySessionHandle(
        sessionHandle: string,
        userContext?: Record<string, any>
    ): Promise<{
        status: "OK";
    }>;
    static validateOAuth2RefreshToken(
        token: string,
        scopes?: string[],
        userContext?: Record<string, any>
    ): Promise<
        | import("./types").ErrorOAuth2
        | (import("./types").InstrospectTokenResponse & {
              status: "OK";
          })
    >;
}
export declare let init: typeof Recipe.init;
export declare let getOAuth2Client: typeof Wrapper.getOAuth2Client;
export declare let getOAuth2Clients: typeof Wrapper.getOAuth2Clients;
export declare let createOAuth2Client: typeof Wrapper.createOAuth2Client;
export declare let updateOAuth2Client: typeof Wrapper.updateOAuth2Client;
export declare let deleteOAuth2Client: typeof Wrapper.deleteOAuth2Client;
export declare let validateOAuth2AccessToken: typeof Wrapper.validateOAuth2AccessToken;
export declare let validateOAuth2RefreshToken: typeof Wrapper.validateOAuth2RefreshToken;
export declare let createTokenForClientCredentials: typeof Wrapper.createTokenForClientCredentials;
export declare let revokeToken: typeof Wrapper.revokeToken;
export declare let revokeTokensByClientId: typeof Wrapper.revokeTokensByClientId;
export declare let revokeTokensBySessionHandle: typeof Wrapper.revokeTokensBySessionHandle;
export type { APIInterface, APIOptions, RecipeInterface };
