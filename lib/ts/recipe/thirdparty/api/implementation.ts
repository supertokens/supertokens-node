import { APIInterface, APIOptions, User, TypeProvider } from "../";
import Session from "../../session";
import { URLSearchParams } from "url";
import * as axios from "axios";
import * as qs from "querystring";

export default class APIImplementation implements APIInterface {
    authorisationUrlGET = async (
        provider: TypeProvider,
        options: APIOptions
    ): Promise<{
        status: "OK";
        url: string;
    }> => {
        let providerInfo = await provider.get(undefined, undefined);

        const params = Object.entries(providerInfo.authorisationRedirect.params).reduce(
            (acc, [key, value]) => ({
                ...acc,
                [key]: typeof value === "function" ? value(options.req) : value,
            }),
            {}
        );

        let paramsString = new URLSearchParams(params).toString();

        let url = `${providerInfo.authorisationRedirect.url}?${paramsString}`;

        return {
            status: "OK",
            url,
        };
    };

    signInUpPOST = async (
        provider: TypeProvider,
        code: string,
        redirectURI: string,
        options: APIOptions
    ): Promise<
        | {
              status: "OK";
              createdNewUser: boolean;
              user: User;
              authCodeResponse: any;
          }
        | { status: "NO_EMAIL_GIVEN_BY_PROVIDER" }
        | {
              status: "FIELD_ERROR";
              error: string;
          }
    > => {
        let userInfo;
        let accessTokenAPIResponse: any;
        let providerInfo = await provider.get(redirectURI, code);
        accessTokenAPIResponse = await axios.default({
            method: "post",
            url: providerInfo.accessTokenAPI.url,
            data: qs.stringify(providerInfo.accessTokenAPI.params),
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                accept: "application/json", // few providers like github don't send back json response by default
            },
        });
        userInfo = await providerInfo.getProfileInfo(accessTokenAPIResponse.data);

        let emailInfo = userInfo.email;
        if (emailInfo === undefined) {
            return {
                status: "NO_EMAIL_GIVEN_BY_PROVIDER",
            };
        }
        let user = await options.recipeImplementation.signInUp(provider.id, userInfo.id, emailInfo);

        let action: "signup" | "signin" = user.createdNewUser ? "signup" : "signin";
        let jwtPayloadPromise = options.config.sessionFeature.setJwtPayload(
            user.user,
            accessTokenAPIResponse.data,
            action
        );
        let sessionDataPromise = options.config.sessionFeature.setSessionData(
            user.user,
            accessTokenAPIResponse.data,
            action
        );

        let jwtPayload: { [key: string]: any } | undefined = await jwtPayloadPromise;
        let sessionData: { [key: string]: any } | undefined = await sessionDataPromise;

        await Session.createNewSession(options.res, user.user.id, jwtPayload, sessionData);
        return {
            status: "OK",
            ...user,
            authCodeResponse: accessTokenAPIResponse,
        };
    };
}
