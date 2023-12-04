import Session from "supertokens-node/recipe/session";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import Dashboard from "supertokens-node/recipe/dashboard";

export const getBackendConfig = () => {
    return {
        framework: "awsLambda",
        supertokens: {
            connectionURI: "https://try.supertokens.com",
        },
        appInfo: {
            appName: "SuperTokens Demo",
            apiDomain: "https://0ez3j5libc.execute-api.ap-south-1.amazonaws.com",
            websiteDomain: "http://localhost:3000",
            apiBasePath: "/auth",
            apiGatewayPath: "/prod",
        },
        recipeList: [
            EmailPassword.init(),
            Dashboard.init(),
            Session.init({
                exposeAccessTokenToFrontendInCookieBasedAuth: true,
                override: {
                    functions: function (originalImplementation) {
                        return {
                            ...originalImplementation,
                            createNewSession: async function (input) {
                                input.accessTokenPayload = {
                                    ...input.accessTokenPayload,
                                    /*
                                     * AWS requires JWTs to contain an audience (aud) claim
                                     * The value for this claim should be the same
                                     * as the value you set when creating the
                                     * authorizer
                                     */
                                    aud: "jwtAuthorizers",
                                };

                                return originalImplementation.createNewSession(input);
                            },
                        };
                    },
                },
            }),
        ],
        isInServerlessEnv: true,
    };
};
