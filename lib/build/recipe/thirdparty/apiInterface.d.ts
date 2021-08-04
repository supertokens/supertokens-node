import { APIOptions, TypeProvider, User } from "./types";
declare namespace SignInUp {
    type Input = {
        provider: TypeProvider;
        code: string;
        redirectURI: string;
        options: APIOptions;
    };
    type Response =
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
declare namespace AuthorisationUrl {
    type Input = {
        provider: TypeProvider;
        options: APIOptions;
    };
    type Response = {
        status: "OK";
        url: string;
    };
}
declare namespace UsersByEmail {
    type Input = {
        email: string;
        options: APIOptions;
    };
    type Response = {
        status: "OK";
        users: User[];
    };
}
export interface APIInterface {
    authorisationUrlGET?: (input: AuthorisationUrl.Input) => Promise<AuthorisationUrl.Response>;
    signInUpPOST?: (input: SignInUp.Input) => Promise<SignInUp.Response>;
    usersByEmailGET?: (input: UsersByEmail.Input) => Promise<UsersByEmail.Response>;
}
export {};
