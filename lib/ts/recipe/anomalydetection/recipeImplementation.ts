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
                request.getHeaderValue("x-forwarded-for") || request.original.socket.remoteAddress || "";

            console.log("BEFORE: ", newIpAddress, userId, userContext);
            const post_data = {
                userId: userId,
                newIpAddress: newIpAddress,
            };
            return new Promise(async (resolve) => {
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
                    .then((data: any) => {
                        resolve({
                            status: data.status === "ANOMALY_DETECTED" ? "ANOMALY_DETECTED" : "NO_ANOMALY_DETECTED",
                            anomalyDetected: data.status === "ANOMALY_DETECTED" ? true : false,
                            message: data.message,
                        });
                    })
                    .catch((err) => {
                        resolve({
                            status: "ANOMALY_SERVICE_ERROR",
                            anomalyDetected: false,
                            message: err.message,
                        });
                    });
            });
        },
    };
}
