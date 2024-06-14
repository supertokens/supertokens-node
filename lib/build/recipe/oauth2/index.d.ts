// @ts-nocheck
import { UserContext } from "../../types";
import Recipe from "./recipe";
import { APIInterface, RecipeInterface, APIOptions, OAuth2ClientOptions } from "./types";
export default class Wrapper {
    static init: typeof Recipe.init;
    static createOAuth2Client(
        input: OAuth2ClientOptions,
        userContext: UserContext
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
}
export declare let init: typeof Recipe.init;
export declare let createOAuth2Client: typeof Wrapper.createOAuth2Client;
export type { APIInterface, APIOptions, RecipeInterface };
