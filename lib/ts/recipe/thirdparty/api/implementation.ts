import { APIInterface, APIOptions, User, TypeProvider } from "../";
import Session, { SessionContainer } from "../../session";
import STError from "../error";
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
        let providerInfo;
        try {
            providerInfo = await provider.get(undefined, undefined);
        } catch (err) {
            throw new STError({
                type: "GENERAL_ERROR",
                payload: err,
            });
        }

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
        try {
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
        } catch (err) {
            throw new STError({
                type: "GENERAL_ERROR",
                payload: err,
            });
        }

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

        let jwtPayload: { [key: string]: any } | undefined = undefined;
        let sessionData: { [key: string]: any } | undefined = undefined;
        try {
            jwtPayload = await jwtPayloadPromise;
            sessionData = await sessionDataPromise;
        } catch (err) {
            throw new STError({
                type: STError.GENERAL_ERROR,
                payload: err,
            });
        }

        await Session.createNewSession(options.req, options.res, user.user.id, jwtPayload, sessionData);
        return {
            status: "OK",
            ...user,
            authCodeResponse: accessTokenAPIResponse,
        };
    };

    signOutPOST = async (
        options: APIOptions
    ): Promise<{
        status: "OK";
    }> => {
        let session: SessionContainer | undefined;
        try {
            session = await Session.getSession(options.req, options.res);
        } catch (err) {
            if (Session.Error.isErrorFromSuperTokens(err) && err.type === Session.Error.UNAUTHORISED) {
                // The session is expired / does not exist anyway. So we return OK
                return {
                    status: "OK",
                };
            }
            throw err;
        }

        if (session === undefined) {
            throw new Session.Error({
                type: Session.Error.GENERAL_ERROR,
                payload: new Error("Session is undefined. Should not come here."),
            });
        }

        await session.revokeSession();

        return {
            status: "OK",
        };
    };
}
