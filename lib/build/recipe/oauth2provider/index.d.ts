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
              errorHint: string;
          }
    >;
    static getOAuth2Clients(
        input: GetOAuth2ClientsInput,
        userContext?: Record<string, any>
    ): Promise<
        | {
              status: "OK";
              clients: import("./OAuth2Client").OAuth2Client[];
              nextPaginationToken?: string | undefined;
          }
        | {
              status: "ERROR";
              error: string;
              errorHint: string;
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
              errorHint: string;
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
              errorHint: string;
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
              errorHint: string;
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
    static validateOAuth2IdToken(
        token: string,
        requirements?: {
            clientId?: string;
            scopes?: string[];
            audience?: string;
        },
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
    static validateOAuth2RefreshToken(
        token: string,
        scopes?: string[],
        userContext?: Record<string, any>
    ): Promise<import("./types").InstrospectTokenResponse>;
}
export declare let init: typeof Recipe.init;
export declare let getOAuth2Clients: typeof Wrapper.getOAuth2Clients;
export declare let createOAuth2Client: typeof Wrapper.createOAuth2Client;
export declare let updateOAuth2Client: typeof Wrapper.updateOAuth2Client;
export declare let deleteOAuth2Client: typeof Wrapper.deleteOAuth2Client;
export declare let validateOAuth2AccessToken: typeof Wrapper.validateOAuth2AccessToken;
export declare let validateOAuth2IdToken: typeof Wrapper.validateOAuth2IdToken;
export declare let createTokenForClientCredentials: typeof Wrapper.createTokenForClientCredentials;
export declare let revokeToken: typeof Wrapper.revokeToken;
export type { APIInterface, APIOptions, RecipeInterface };
