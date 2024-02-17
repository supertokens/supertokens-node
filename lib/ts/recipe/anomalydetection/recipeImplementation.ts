/* Copyright (c) 2022, VRAI Labs and/or its affiliates. All rights reserved.
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

import { RecipeInterface } from ".";
import http = require("http");

function httpsPost({ body, options }: any) {
    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                method: "POST",
                ...options,
            },
            (res) => {
                const chunks: any[] = [];
                res.on("data", (data) => chunks.push(data));
                res.on("end", () => {
                    let resBody = Buffer.concat(chunks);
                    switch (res.headers["content-type"]) {
                        case "application/json":
                            resBody = JSON.parse(resBody.toString());
                            break;
                    }
                    resolve(resBody);
                });
            }
        );
        req.on("error", reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

export default function getRecipeInterface(): RecipeInterface {
    return {
        checkForAnomaly: async function ({ request, userId, userContext }) {
            const newIpAddress =
                request.getHeaderValue("x-forwarded-for") ||
                request.getHeaderValue("x-real-ip") ||
                request.original.socket.remoteAddress ||
                "";

            console.log("BEFORE: ", newIpAddress, userId, userContext);
            const post_data = {
                userId: userId,
                newIpAddress: newIpAddress,
            };
            await httpsPost({
                body: post_data,
                options: {
                    host: "localhost",
                    port: 3000,
                    path: "/check-for-anomaly",
                    headers: {
                        "Content-Type": "application/json",
                        // 'Content-Length': Buffer.byteLength(JSON.stringify(post_data))
                    },
                },
            })
                .then((data) => {
                    console.log(data);
                })
                .catch((err) => {
                    console.log("Error: ", err);
                });
            // http.get('http://localhost:3000', (resp) => {
            //     let data = '';

            //     // A chunk of data has been received.
            //     resp.on('data', (chunk) => {
            //         data += chunk;
            //     });

            //     // The whole response has been received. Print out the result.
            //     resp.on('end', () => {
            //         console.log(JSON.parse(data).explanation);
            //     });

            // }).on("error", (err) => {
            //     console.log("Error: " + err.message);
            // });

            const lastIpAddress = "";
            console.log("After ", lastIpAddress);

            return new Promise((resolve) => {
                if (lastIpAddress === "") {
                    resolve({
                        status: "OK",
                        anomalyDetected: false,
                        message: "No anomaly detected",
                    });
                } else {
                    resolve({
                        status: "ANOMALY_DETECTED_ERROR",
                        anomalyDetected: true,
                        message: "Anomaly detected",
                    });
                }
            });

            // let response = await options.recipeImplementation.signIn({ email, password, tenantId, userContext });
            // if (response.status === "WRONG_CREDENTIALS_ERROR") {
            //     return response;
            // }

            debugger;
            return new Promise((resolve) => {
                resolve({
                    status: "OK",
                    anomalyDetected: false,
                    message: "No anomaly detected",
                });
            });
        },
    };
}
