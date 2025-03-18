import OAuth2Provider from "supertokens-node/recipe/oauth2provider";
import Session from "supertokens-node/recipe/session";
import { TypeInput } from "supertokens-node/types";

export const websitePort = process.env.REACT_APP_WEBSITE_PORT || 3000;
export const apiPort = process.env.REACT_APP_API_PORT || 3001;

export function getApiDomain() {
    const apiUrl = process.env.REACT_APP_API_URL || `http://localhost:${apiPort}`;
    return apiUrl;
}

export function getWebsiteDomain() {
    const websiteUrl = process.env.REACT_APP_WEBSITE_URL || `http://localhost:${websitePort}`;
    return websiteUrl;
}

export const SuperTokensConfig: TypeInput = {
    supertokens: {
        // this is the location of the SuperTokens core.
        connectionURI: "https://try.supertokens.com",
    },
    appInfo: {
        appName: "Supertokens M2M Demo App - Auth Provider Service",
        apiDomain: getApiDomain(),
        websiteDomain: getWebsiteDomain(),
    },
    // recipeList contains all the modules that you want to
    // use from SuperTokens. See the full list here: https://supertokens.com/docs/guides
    recipeList: [OAuth2Provider.init(), Session.init()],
};
