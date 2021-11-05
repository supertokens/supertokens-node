const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();
let supertokens = require("supertokens-node");
let Session = require("supertokens-node/recipe/session");
let { verifySession } = require("supertokens-node/recipe/session/framework/express");
let { middleware, errorHandler } = require("supertokens-node/framework/express");
let ThirdPartyEmailPassword = require("supertokens-node/recipe/thirdpartyemailpassword");

// Change these values if you want to run the server on another adress
const apiPort = process.env.REACT_APP_API_PORT || 3001;
const apiDomain = process.env.REACT_APP_API_URL || `http://localhost:${apiPort}`;
const websitePort = process.env.REACT_APP_WEBSITE_PORT || 3000;
const websiteDomain = process.env.REACT_APP_WEBSITE_URL || `http://localhost:${websitePort}`;

supertokens.init({
    framework: "express",
    supertokens: {
        // TODO: This is a core hosted for demo purposes. You can use this, but make sure to change it to your core instance URI eventually.
        connectionURI: "https://try.supertokens.io",
        apiKey: "<REQUIRED FOR MANAGED SERVICE, ELSE YOU CAN REMOVE THIS FIELD>",
    },
    appInfo: {
        appName: "SuperTokens Demo App", // TODO: Your app name
        apiDomain, // TODO: Change to your app's API domain
        websiteDomain, // TODO: Change to your app's website domain
    },
    recipeList: [
        ThirdPartyEmailPassword.init({
            /*
                We use different credentials for different platforms when required. For example the redirect URI for Github
                is different for Web and mobile. In such a case we can provide multiple providers with different client Ids.
                
                When the frontend makes a request and wants to use a specific clientId, it needs to send the clientId to use in the 
                request. In the absence of a clientId in the request the SDK uses the default provider, indicated by `isDefault: true`.

                When adding multiple providers for the same type (Google, Github etc), make sure to set `isDefault: true`.
            */
            providers: [
                // We have provided you with development keys which you can use for testing or when running our demo apps.
                // IMPORTANT: Please replace them with your own OAuth keys for production use.
                ThirdPartyEmailPassword.Google({
                    isDefault: true,
                    clientId: "1060725074195-kmeum4crr01uirfl2op9kd5acmi9jutn.apps.googleusercontent.com",
                    clientSecret: "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",
                }),
                ThirdPartyEmailPassword.Google({
                    clientId: "1060725074195-c7mgk8p0h27c4428prfuo3lg7ould5o7.apps.googleusercontent.com",
                    clientSecret: "",
                }),
                ThirdPartyEmailPassword.Github({
                    isDefault: true,
                    clientSecret: "e97051221f4b6426e8fe8d51486396703012f5bd",
                    clientId: "467101b197249757c71f",
                }),
                ThirdPartyEmailPassword.Github({
                    clientSecret: "00e841f10f288363cd3786b1b1f538f05cfdbda2",
                    clientId: "8a9152860ce869b64c44",
                }),
                /*
                    For Apple signin, iOS apps always use the bundle identifier as the client ID when communicating with Apple. Android, Web and other platforms
                    need to configure a Service ID on the Apple developer dashboard and use that as client ID.

                    In the example below 4398792-io.supertokens.example.service is the client ID for Web. Android etc and thus we mark it as default. For iOS
                    the frontend for the demo app sends the clientId in the request which is then used by the SDK.
                */
                ThirdPartyEmailPassword.Apple({
                    isDefault: true,
                    clientId: "4398792-io.supertokens.example.service",
                    clientSecret: {
                        keyId: "7M48Y4RYDL",
                        privateKey:
                            "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                        teamId: "YWQCXGJRJL",
                    },
                }),
                ThirdPartyEmailPassword.Apple({
                    clientId: "4398792-io.supertokens.example",
                    clientSecret: {
                        keyId: "7M48Y4RYDL",
                        privateKey:
                            "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgu8gXs+XYkqXD6Ala9Sf/iJXzhbwcoG5dMh1OonpdJUmgCgYIKoZIzj0DAQehRANCAASfrvlFbFCYqn3I2zeknYXLwtH30JuOKestDbSfZYxZNMqhF/OzdZFTV0zc5u5s3eN+oCWbnvl0hM+9IW0UlkdA\n-----END PRIVATE KEY-----",
                        teamId: "YWQCXGJRJL",
                    },
                }),

                // we have commented the below because our app domain (ThirdPartyEmailPassword.demo.supertokens.io) is not approved by Facebook since it's only a demo app.
                // ThirdPartyEmailPassword.Facebook({
                //     clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                //     clientId: process.env.FACEBOOK_CLIENT_ID
                // })
            ],
        }),
        Session.init(),
    ],
});

const app = express();

app.use(
    cors({
        origin: websiteDomain, // TODO: Change to your app's website domain
        allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);

app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);
app.use(middleware());

// custom API that requires session verification
app.get("/sessioninfo", verifySession(), async (req, res) => {
    let session = req.session;
    res.send({
        sessionHandle: session.getHandle(),
        userId: session.getUserId(),
        accessTokenPayload: session.getAccessTokenPayload(),
    });
});

app.use(errorHandler());

app.use((err, req, res, next) => {
    res.status(500).send("Internal error: " + err.message);
});

app.listen(apiPort, () => console.log(`API Server listening on port ${apiPort}`));
