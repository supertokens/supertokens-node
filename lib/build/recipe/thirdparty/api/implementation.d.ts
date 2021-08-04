import { APIInterface, APIOptions, User, TypeProvider } from "../";
export default class APIImplementation implements APIInterface {
    authorisationUrlGET: ({
        provider,
        options,
    }: {
        provider: TypeProvider;
        options: APIOptions;
    }) => Promise<{
        status: "OK";
        url: string;
    }>;
    signInUpPOST: ({
        provider,
        code,
        redirectURI,
        options,
    }: {
        provider: TypeProvider;
        code: string;
        redirectURI: string;
        options: APIOptions;
    }) => Promise<
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
          }
    >;
    usersByEmailGET: ({
        email,
        options,
    }: {
        email: string;
        options: APIOptions;
    }) => Promise<{
        status: "OK";
        users: User[];
    }>;
}
