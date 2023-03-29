import { TypeProvider, TypeProviderGetResponse } from "../types";
import axios from "axios";

type TypeThirdPartyProviderGitLabConfig = {
    clientId: string;
    clientSecret: string;
    scope?: string[];
    authorisationRedirect?: {
        params?: { [key: string]: string | ((request: any) => string) };
    };
    isDefault?: boolean;
};

export default function GitLab(config: TypeThirdPartyProviderGitLabConfig): TypeProvider {
    const id = "gitlab";

    function get(redirectURI: string | undefined, authCodeFromRequest: string | undefined): TypeProviderGetResponse {
        let accessTokenAPIURL = "https://gitlab.com/oauth/token";
        let accessTokenAPIParams: { [key: string]: string } = {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: "authorization_code",
        };
        if (authCodeFromRequest !== undefined) {
            accessTokenAPIParams.code = authCodeFromRequest;
        }
        if (redirectURI !== undefined) {
            accessTokenAPIParams.redirect_uri = redirectURI;
        }
        let authorisationRedirectURL = "https://gitlab.com/oauth/authorize";
        let scopes = ["read_user"];
        if (config.scope !== undefined) {
            scopes = config.scope;
            scopes = Array.from(new Set(scopes));
        }
        let additionalParams =
            config.authorisationRedirect === undefined || config.authorisationRedirect.params === undefined
                ? {}
                : config.authorisationRedirect.params;
        let authorizationRedirectParams: { [key: string]: string } = {
            scope: scopes.join(" "),
            response_type: "code",
            client_id: config.clientId,
            ...additionalParams,
        };

        async function getProfileInfo(accessTokenAPIResponse: {
            access_token: string;
            expires_in: number;
            token_type: string;
            refresh_token?: string;
        }) {
            let accessToken = accessTokenAPIResponse.access_token;
            let authHeader = `Bearer ${accessToken}`;
            let response = await axios({
                method: "get",
                url: "https://gitlab.com/api/v4/user",
                headers: {
                    Authorization: authHeader,
                },
            });
            let userInfo = response.data;
            let id = userInfo.id + "";
            let email = userInfo.email;
            if (email === undefined || email === null) {
                return {
                    id,
                };
            }
            let isVerified = userInfo.confirmed_at !== null && userInfo.confirmed_at !== undefined;
            return {
                id,
                email: {
                    id: email,
                    isVerified,
                },
            };
        }

        return {
            accessTokenAPI: {
                url: accessTokenAPIURL,
                params: accessTokenAPIParams,
            },
            authorisationRedirect: {
                url: authorisationRedirectURL,
                params: authorizationRedirectParams,
            },
            getProfileInfo,
            getClientId: () => {
                return config.clientId;
            },
        };
    }

    return {
        id,
        get,
        isDefault: config.isDefault,
    };
}
