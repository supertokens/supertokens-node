let Session = require("supertokens-node/recipe/session");
let EmailPassword = require("supertokens-node/recipe/emailpassword");
let Dashboard = require("supertokens-node/recipe/dashboard");

module.exports.getBackendConfig = () => {
    return {
        framework: "awsLambda",
        supertokens: {
            connectionURI: "https://try.supertokens.com",
        },
        appInfo: {
            appName: "SuperTokens Demo",
            apiDomain: "https://fjo5oq54c9.execute-api.ap-south-1.amazonaws.com",
            websiteDomain: "http://localhost:3000",
            apiBasePath: "/auth",
            apiGatewayPath: "/dev",
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
