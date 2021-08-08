import { APIInterface, APIOptions, User, TypeProvider } from "../";
import Session from "../../session";
import { URLSearchParams } from "url";
import * as axios from "axios";
import * as qs from "querystring";

export default class APIImplementation implements APIInterface {
    authorisationUrlGET = async ({
        provider,
        options,
    }: {
        provider: TypeProvider;
        options: APIOptions;
    }): Promise<{
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

    signInUpPOST = async ({
        provider,
        code,
        redirectURI,
        options,
    }: {
        provider: TypeProvider;
        code: string;
        redirectURI: string;
        options: APIOptions;
    }): Promise<
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
        let response = await options.recipeImplementation.signInUp({
            thirdPartyId: provider.id,
            thirdPartyUserId: userInfo.id,
            email: emailInfo,
        });

        if (response.status === "FIELD_ERROR") {
            return response;
        }

        // we set the email as verified if already verified by the OAuth provider.
        // This block was added because of https://github.com/supertokens/supertokens-core/issues/295
        if (emailInfo.isVerified) {
            const tokenResponse = await options.emailVerificationRecipeImplementation.createEmailVerificationToken({
                userId: response.user.id,
                email: response.user.email,
            });

            if (tokenResponse.status === "OK") {
                await options.emailVerificationRecipeImplementation.verifyEmailUsingToken({
                    token: tokenResponse.token,
                });
            }
        }

        let action: "signup" | "signin" = response.createdNewUser ? "signup" : "signin";
        let jwtPayloadPromise = options.config.sessionFeature.setJwtPayload(
            response.user,
            accessTokenAPIResponse.data,
            action
        );
        let sessionDataPromise = options.config.sessionFeature.setSessionData(
            response.user,
            accessTokenAPIResponse.data,
            action
        );

        let jwtPayload: { [key: string]: any } | undefined = await jwtPayloadPromise;
        let sessionData: { [key: string]: any } | undefined = await sessionDataPromise;

        await Session.createNewSession(options.res, response.user.id, jwtPayload, sessionData);
        return {
            status: "OK",
            createdNewUser: response.createdNewUser,
            user: response.user,
            authCodeResponse: accessTokenAPIResponse.data,
        };
    };
}
