/* Copyright (c) 2020, VRAI Labs and/or its affiliates. All rights reserved.
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
let SuperTokens = require("../../");
let Session = require("../../recipe/session");
let SuperTokensRaw = require("../../lib/build/supertokens").default;
let SessionRecipeRaw = require("../../lib/build/recipe/session/recipe").default;
let express = require("express");
let cookieParser = require("cookie-parser");
let bodyParser = require("body-parser");
let cors = require("cors");
let noOfTimesRefreshCalledDuringTest = 0;
let noOfTimesGetSessionCalledDuringTest = 0;
let noOfTimesRefreshAttemptedDuringTest = 0;

let urlencodedParser = bodyParser.urlencoded({ limit: "20mb", extended: true, parameterLimit: 20000 });
let jsonParser = bodyParser.json({ limit: "20mb" });

let app = express();
app.use(urlencodedParser);
app.use(jsonParser);
app.use(cookieParser());

function getConfig(enableAntiCsrf) {
    return {
        appInfo: {
            appName: "SuperTokens",
            apiDomain: "0.0.0.0:" + (process.env.NODE_PORT === undefined ? 8080 : process.env.NODE_PORT),
            websiteDomain: "http://localhost.org:8080",
        },
        supertokens: {
            connectionURI: "http://localhost:9000",
        },
        recipeList: [
            Session.init({
                errorHandlers: {
                    onUnauthorised: (err, req, res) => {
                        res.status(401).send();
                    },
                },
                antiCsrf: enableAntiCsrf ? "VIA_TOKEN" : "NONE",
                override: {
                    apis: (oI) => {
                        return {
                            ...oI,
                            refreshPOST: undefined,
                        };
                    },
                },
            }),
        ],
    };
}

SuperTokens.init(getConfig(true));

app.use(
    cors({
        origin: "http://localhost.org:8080",
        allowedHeaders: ["content-type", ...SuperTokens.getAllCORSHeaders()],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);
app.use(urlencodedParser);
app.use(jsonParser);
app.use(cookieParser());

app.use(SuperTokens.middleware());

app.post("/setAntiCsrf", async (req, res) => {
    let enableAntiCsrf = req.body.enableAntiCsrf === undefined ? true : req.body.enableAntiCsrf;
    if (enableAntiCsrf !== undefined) {
        SuperTokensRaw.reset();
        SessionRecipeRaw.reset();
        SuperTokens.init(getConfig(enableAntiCsrf));
    }
    res.send("success");
});

app.post("/login", async (req, res) => {
    let userId = req.body.userId;
    let session = await Session.createNewSession(res, userId);
    res.send(session.userId);
});

app.post("/beforeeach", async (req, res) => {
    noOfTimesRefreshCalledDuringTest = 0;
    noOfTimesGetSessionCalledDuringTest = 0;
    noOfTimesRefreshAttemptedDuringTest = 0;
    res.send();
});

app.post("/testUserConfig", async (req, res) => {
    res.status(200).send();
});

app.post("/multipleInterceptors", async (req, res) => {
    res.status(200).send(
        req.headers.interceptorheader2 !== undefined && req.headers.interceptorheader1 !== undefined
            ? "success"
            : "failure"
    );
});

app.get(
    "/",
    (req, res, next) => Session.verifySession()(req, res, next),
    async (req, res) => {
        noOfTimesGetSessionCalledDuringTest += 1;
        res.send(req.session.getUserId());
    }
);

app.get(
    "/check-rid",
    (req, res, next) => Session.verifySession()(req, res, next),
    async (req, res) => {
        let response = req.headers["rid"];
        res.send(response === undefined ? "fail" : "success");
    }
);

app.get(
    "/update-jwt",
    (req, res, next) => Session.verifySession()(req, res, next),
    async (req, res) => {
        res.json(req.session.getJWTPayload());
    }
);

app.post(
    "/update-jwt",
    (req, res, next) => Session.verifySession()(req, res, next),
    async (req, res) => {
        await req.session.updateJWTPayload(req.body);
        res.json(req.session.getJWTPayload());
    }
);

app.use("/testing", async (req, res) => {
    let tH = req.headers["testing"];
    if (tH !== undefined) {
        res.header("testing", tH);
    }
    res.send("success");
});

app.post(
    "/logout",
    (req, res, next) => Session.verifySession()(req, res, next),
    async (req, res) => {
        await req.session.revokeSession();
        res.send("success");
    }
);

app.post(
    "/revokeAll",
    (req, res, next) => Session.verifySession()(req, res, next),
    async (req, res) => {
        let userId = req.session.getUserId();
        await SuperTokens.revokeAllSessionsForUser(userId);
        res.send("success");
    }
);

app.post("/auth/session/refresh", async (req, res, next) => {
    noOfTimesRefreshAttemptedDuringTest += 1;
    Session.verifySession()(req, res, (err) => {
        if (err) {
            next(err);
        } else {
            if (req.headers["rid"] === undefined) {
                res.send("refresh failed");
            } else {
                refreshCalled = true;
                noOfTimesRefreshCalledDuringTest += 1;
                res.send("refresh success");
            }
        }
    });
});

app.get("/refreshCalledTime", async (req, res) => {
    res.status(200).send("" + noOfTimesRefreshCalledDuringTest);
});

app.get("/refreshAttemptedTime", async (req, res) => {
    res.status(200).send("" + noOfTimesRefreshAttemptedDuringTest);
});

app.get("/getSessionCalledTime", async (req, res) => {
    res.status(200).send("" + noOfTimesGetSessionCalledDuringTest);
});

app.get("/ping", async (req, res) => {
    res.send("success");
});

app.get("/testHeader", async (req, res) => {
    let testHeader = req.headers["st-custom-header"];
    let success = true;
    if (testHeader === undefined) {
        success = false;
    }
    let data = {
        success,
    };
    res.send(JSON.stringify(data));
});

app.post("/checkAllowCredentials", (req, res) => {
    res.send(req.headers["allow-credentials"] !== undefined ? true : false);
});

app.get("/index.html", (req, res) => {
    res.sendFile("index.html", { root: __dirname });
});
app.get("/testError", (req, res) => {
    res.status(500).send("test error message");
});

app.use("*", async (req, res, next) => {
    res.status(404).send();
});

app.use(SuperTokens.errorHandler());

app.use(async (err, req, res, next) => {
    res.send(500).send(err);
});

app.listen(process.env.NODE_PORT === undefined ? 8080 : process.env.NODE_PORT, "0.0.0.0", () => {
    console.log("app started");
});
