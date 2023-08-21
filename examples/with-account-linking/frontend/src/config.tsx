import ThirdPartyEmailPassword, { Google, Github, Apple } from "supertokens-auth-react/recipe/thirdpartyemailpassword";
import EmailVerification from "supertokens-auth-react/recipe/emailverification";
import { ThirdPartyEmailPasswordPreBuiltUI } from "supertokens-auth-react/recipe/thirdpartyemailpassword/prebuiltui";
import { EmailVerificationPreBuiltUI } from "supertokens-auth-react/recipe/emailverification/prebuiltui";
import Session from "supertokens-auth-react/recipe/session";

export function getApiDomain() {
    const apiPort = process.env.REACT_APP_API_PORT || 3001;
    const apiUrl = process.env.REACT_APP_API_URL || `http://localhost:${apiPort}`;
    return apiUrl;
}

export function getWebsiteDomain() {
    const websitePort = process.env.REACT_APP_WEBSITE_PORT || 3000;
    const websiteUrl = process.env.REACT_APP_WEBSITE_URL || `http://localhost:${websitePort}`;
    return websiteUrl;
}

export const SuperTokensConfig = {
    appInfo: {
        appName: "SuperTokens Demo App",
        apiDomain: getApiDomain(),
        websiteDomain: getWebsiteDomain(),
    },
    // recipeList contains all the modules that you want to
    // use from SuperTokens. See the full list here: https://supertokens.com/docs/guides
    recipeList: [
        EmailVerification.init({
            mode: "REQUIRED",
        }),
        ThirdPartyEmailPassword.init({
            signInAndUpFeature: {
                providers: [
                    Github.init({
                        getRedirectURL: (id) => {
                            if (window.location.pathname.startsWith("/link")) {
                                return `${getWebsiteDomain()}/link/tpcallback/${id}`;
                            }
                            return `${getWebsiteDomain()}/auth/callback/${id}`;
                        },
                    }),
                    Google.init({
                        getRedirectURL: (id) => {
                            if (window.location.pathname.startsWith("/link")) {
                                return `${getWebsiteDomain()}/link/tpcallback/${id}`;
                            }
                            return `${getWebsiteDomain()}/auth/callback/${id}`;
                        },
                    }),
                    Apple.init(),
                ],
            },
            preAPIHook: async (context) => {
                if (context.action === "THIRD_PARTY_SIGN_IN_UP" || context.action === "EMAIL_PASSWORD_SIGN_UP") {
                    const url = new URL(context.url);
                    url.searchParams.append("pathName", window.location.pathname);
                    context.url = url.toString();
                }

                if (
                    window.location.pathname.startsWith("/link/tpcallback") &&
                    context.action === "THIRD_PARTY_SIGN_IN_UP"
                ) {
                    const url = new URL(context.url);
                    url.pathname = "/addThirdPartyUser";
                    context.url = url.toString();
                }

                if (window.location.pathname.startsWith("/link") && context.action === "EMAIL_PASSWORD_SIGN_UP") {
                    const url = new URL(context.url);
                    url.pathname = "/addPassword";
                    context.url = url.toString();
                }

                return context;
            },
        }),
        Session.init(),
    ],
};

export const recipeDetails = {
    docsLink: "https://supertokens.com/docs/thirdpartyemailpassword/introduction",
};

export const PreBuiltUIList = [ThirdPartyEmailPasswordPreBuiltUI, EmailVerificationPreBuiltUI];
