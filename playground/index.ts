// config/backendConfig.ts

import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";
import SessionNode from "supertokens-node/recipe/session";
import { TypeInput, AppInfo } from "supertokens-node/types";
import jwt from "jsonwebtoken";

// take a look at the Creating Supabase Client section to see how to define getSupabase
let getSupabase: any;

let appInfo: AppInfo = {
    appName: "TODO: add your app name",
    apiDomain: "TODO: add your website domain",
    websiteDomain: "TODO: add your website domain"
}

let backendConfig = (): TypeInput => {
    return {
        framework: "express",
        supertokens: {
            connectionURI: "https://try.supertokens.com",
        },
        appInfo,
        recipeList: [
            ThirdPartyEmailPassword.init({
                providers: [/*...*/],
                override: {
                    apis: (originalImplementation) => {
                        return {
                            ...originalImplementation,
                            // the emailPasswordSignUpPOST function handles sign up via Email-Password
                            emailPasswordSignUpPOST: async function (input) {
                                if (originalImplementation.emailPasswordSignUpPOST === undefined) {
                                    throw Error("Should never come here");
                                }

                                let response = await originalImplementation.emailPasswordSignUpPOST(input);

                                if (response.status === "OK") {

                                    // retrieve the accessTokenPayload from the user's session
                                    const accessTokenPayload = response.session.getAccessTokenPayload();

                                    // create a supabase client with the supabase_token from the accessTokenPayload
                                    const supabase = getSupabase(accessTokenPayload.supabase_token);

                                    // store the user's email mapped to their userId in Supabase
                                    const { error } = await supabase
                                        .from("users")
                                        .insert({ email: response.user.email, user_id: response.user.id });

                                    if (error !== null) {

                                        throw error;
                                    }
                                }

                                return response;
                            },
                        };
                    },
                },
            }),
            SessionNode.init({/*...*/ }),
        ],
        isInServerlessEnv: true,
    };
};
