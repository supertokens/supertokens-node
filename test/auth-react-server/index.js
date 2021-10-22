/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */
require("dotenv").config();
let SuperTokens = require("../../");
let Session = require("../../recipe/session");
let EmailPassword = require("../../recipe/emailpassword");
let ThirdParty = require("../../recipe/thirdparty");
let ThirdPartyEmailPassword = require("../../recipe/thirdpartyemailpassword");
let { verifySession } = require("../../recipe/session/framework/express");
let { middleware, errorHandler } = require("../../framework/express");
let express = require("express");
let cookieParser = require("cookie-parser");
let bodyParser = require("body-parser");
let http = require("http");
let cors = require("cors");
let { startST, killAllST, setupST, cleanST } = require("./utils");

let urlencodedParser = bodyParser.urlencoded({ limit: "20mb", extended: true, parameterLimit: 20000 });
let jsonParser = bodyParser.json({ limit: "20mb" });

let app = express();
app.use(urlencodedParser);
app.use(jsonParser);
app.use(cookieParser());

const WEB_PORT = process.env.WEB_PORT || 3031;
const websiteDomain = `http://localhost:${WEB_PORT}`;
let latestURLWithToken = "";

const formFields = (process.env.MIN_FIELDS && []) || [
    {
        id: "name",
    },
    {
        id: "age",
        validate: async (value) => {
            if (parseInt(value) < 18) {
                return "You must be over 18 to register";
            }

            // If no error, return undefined.
            return undefined;
        },
    },
    {
        id: "country",
        optional: true,
    },
];
SuperTokens.init({
    appInfo: {
        appName: "SuperTokens",
        apiDomain: "localhost:" + (process.env.NODE_PORT === undefined ? 8083 : process.env.NODE_PORT),
        websiteDomain,
    },
    supertokens: {
        connectionURI: "http://localhost:9000",
    },
    recipeList: [
        EmailPassword.init({
            signUpFeature: {
                formFields,
            },
            resetPasswordUsingTokenFeature: {
                createAndSendCustomEmail: (_, passwordResetURLWithToken) => {
                    console.log(passwordResetURLWithToken);
                    latestURLWithToken = passwordResetURLWithToken;
                },
            },
            emailVerificationFeature: {
                createAndSendCustomEmail: (_, emailVerificationURLWithToken) => {
                    console.log(emailVerificationURLWithToken);
                    latestURLWithToken = emailVerificationURLWithToken;
                },
            },
        }),
        ThirdParty.init({
            signInAndUpFeature: {
                providers: [
                    ThirdParty.Google({
                        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                        clientId: process.env.GOOGLE_CLIENT_ID,
                    }),
                    ThirdParty.Github({
                        clientSecret: process.env.GITHUB_CLIENT_SECRET,
                        clientId: process.env.GITHUB_CLIENT_ID,
                    }),
                    ThirdParty.Facebook({
                        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                        clientId: process.env.FACEBOOK_CLIENT_ID,
                    }),
                ],
            },
        }),
        ThirdPartyEmailPassword.init({
            signUpFeature: {
                formFields,
            },
            providers: [
                ThirdPartyEmailPassword.Google({
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    clientId: process.env.GOOGLE_CLIENT_ID,
                }),
                ThirdPartyEmailPassword.Github({
                    clientSecret: process.env.GITHUB_CLIENT_SECRET,
                    clientId: process.env.GITHUB_CLIENT_ID,
                }),
                ThirdPartyEmailPassword.Facebook({
                    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
                    clientId: process.env.FACEBOOK_CLIENT_ID,
                }),
            ],
        }),
        Session.init({}),
    ],
});

app.use(
    cors({
        origin: websiteDomain,
        allowedHeaders: ["content-type", ...SuperTokens.getAllCORSHeaders()],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);

app.use(middleware());

app.get("/ping", async (req, res) => {
    res.send("success");
});

app.post("/startst", async (req, res) => {
    let pid = await startST();
    res.send(pid + "");
});

app.post("/beforeeach", async (req, res) => {
    await killAllST();
    await setupST();
    res.send();
});

app.post("/after", async (req, res) => {
    await killAllST();
    await cleanST();
    res.send();
});

app.post("/stopst", async (req, res) => {
    await stopST(req.body.pid);
    res.send("");
});

// custom API that requires session verification
app.get("/sessioninfo", verifySession(), async (req, res) => {
    let session = req.session;
    if (session.getJWTPayload !== undefined) {
        res.send({
            sessionHandle: session.getHandle(),
            userId: session.getUserId(),
            accessTokenPayload: session.getJWTPayload(),
            sessionData: await session.getSessionData(),
        });
    } else {
        res.send({
            sessionHandle: session.getHandle(),
            userId: session.getUserId(),
            accessTokenPayload: session.getAccessTokenPayload(),
            sessionData: await session.getSessionData(),
        });
    }
});

app.get("/token", async (_, res) => {
    res.send({
        latestURLWithToken,
    });
});

app.use(errorHandler());

app.use(async (err, req, res, next) => {
    console.log(err);
    res.send(500).send(err);
});

let server = http.createServer(app);
server.listen(process.env.NODE_PORT === undefined ? 8083 : process.env.NODE_PORT, "0.0.0.0");

/*
 * Setup and start the core when running the test application when running with  the following command:
 * START=true TEST_MODE=testing INSTALL_PATH=../../../supertokens-root NODE_PORT=8082 node .
 * or
 * npm run server
 */
(async function (shouldSpinUp) {
    if (shouldSpinUp) {
        console.log(`Start supertokens for test app`);
        try {
            await killAllST();
            await cleanST();
        } catch (e) {}

        await setupST();
        const pid = await startST();
        console.log(`Application started on http://localhost:${process.env.NODE_PORT | 8083}`);
        console.log(`processId: ${pid}`);
    }
})(process.env.START === "true");
