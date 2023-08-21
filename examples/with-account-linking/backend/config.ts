import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";
import Session from "supertokens-node/recipe/session";
import AccountLinking from "supertokens-node/recipe/accountlinking";
import EmailVerification from "supertokens-node/recipe/emailverification";
import { TypeInput } from "supertokens-node/types";
import UserMetadata from "supertokens-node/recipe/usermetadata";
import Dashboard from "supertokens-node/recipe/dashboard";
import { getUser } from "supertokens-node";

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

export const SuperTokensConfig: TypeInput = {
    supertokens: {
        // this is the location of the SuperTokens core.
        connectionURI: "http://localhost:3567",
    },
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
        UserMetadata.init(),
        AccountLinking.init({
            shouldDoAutomaticAccountLinking: async (_newInfo, _user, context) => {
                if (context.doNotLink === true) {
                    return {
                        shouldAutomaticallyLink: false,
                    };
                }
                return {
                    shouldAutomaticallyLink: true,
                    shouldRequireVerification: true,
                };
            },
        }),
        ThirdPartyEmailPassword.init({
            providers: [
                // We have provided you with development keys which you can use for testing.
                // IMPORTANT: Please replace them with your own OAuth keys for production use.
                {
                    config: {
                        thirdPartyId: "google",
                        clients: [
                            {
                                clientId: "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com",
                                clientSecret: "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",
                            },
                        ],
                    },
                },
                {
                    config: {
                        thirdPartyId: "github",
                        clients: [
                            {
                                clientId: "467101b197249757c71f",
                                clientSecret: "e97051221f4b6426e8fe8d51486396703012f5bd",
                            },
                        ],
                    },
                },
                {
                    config: {
                        thirdPartyId: "apple",
                        clients: [
                            {
                                clientId: "4398792-io.supertokens.example.service",
                                additionalConfig: {
                                    keyId: "7M48Y4RYDL",
                                    privateKey:
                                        "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                                    teamId: "YWQCXGJRJL",
                                },
                            },
                        ],
                    },
                },
            ],
            override: {
                apis: (oI) => ({
                    ...oI,
                }),
            },
        }),
        Session.init(),
        Dashboard.init(),
    ],
};
