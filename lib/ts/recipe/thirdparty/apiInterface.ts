import { APIOptions, TypeProvider, User } from "./types";

namespace SignInUp {
    export type Input = {
        provider: TypeProvider;
        code: string;
        redirectURI: string;
        options: APIOptions;
    };

    export type Response =
        | {
              status: "OK";
              createdNewUser: boolean;
              user: User;
              authCodeResponse: any;
          }
        | {
              status: "NO_EMAIL_GIVEN_BY_PROVIDER";
          }
        | {
              status: "FIELD_ERROR";
              error: string;
          };
}

namespace AuthorisationUrl {
    export type Input = {
        provider: TypeProvider;
        options: APIOptions;
    };

    export type Response = {
        status: "OK";
        url: string;
    };
}

export interface APIInterface {
    authorisationUrlGET?: (input: AuthorisationUrl.Input) => Promise<AuthorisationUrl.Response>;
    signInUpPOST?: (input: SignInUp.Input) => Promise<SignInUp.Response>;
}
