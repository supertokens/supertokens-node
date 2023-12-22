import Session from "supertokens-node/recipe/session";
import EmailPassword from "supertokens-node/recipe/emailpassword";

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
        recipeList: [EmailPassword.init(), Session.init()],
        isInServerlessEnv: true,
    };
};
