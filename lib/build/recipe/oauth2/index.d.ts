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
}
export declare let init: typeof Recipe.init;
export declare let getOAuth2Clients: typeof Wrapper.getOAuth2Clients;
export declare let createOAuth2Client: typeof Wrapper.createOAuth2Client;
export declare let updateOAuth2Client: typeof Wrapper.updateOAuth2Client;
export declare let deleteOAuth2Client: typeof Wrapper.deleteOAuth2Client;
export type { APIInterface, APIOptions, RecipeInterface };
