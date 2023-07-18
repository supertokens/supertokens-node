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

/*
 * Imports
 */

const {
    LambdaClient,
    GetFunctionCommand,
    UpdateFunctionCodeCommand,
    PublishLayerVersionCommand,
    UpdateFunctionConfigurationCommand,
} = require("@aws-sdk/client-lambda");
const fs = require("fs");
const child_process = require("child_process");
const path = require("path");

const FUNCTION_NAME = "aws-test-function";

const setup_aws = async () => {
    const client = new LambdaClient({ region: "ap-south-1" });
    const getCommand = new GetFunctionCommand({
        FunctionName: process.env.LAMBDA_FUNCTION_NAME || "aws-test-function",
    });
    const getRes = await client.send(getCommand);

    if (getRes["$metadata"].httpStatusCode !== 200) {
        throw new Error("Function not found");
    }

    child_process.execSync(`zip -r backend.zip *`, {
        cwd: path.join(__dirname, "..", "..", "backend"),
    });

    let buffer = fs.readFileSync(path.join(__dirname, "..", "..", "backend", "backend.zip"));

    const updateCommand = new UpdateFunctionCodeCommand({
        FunctionName: FUNCTION_NAME,
        ZipFile: buffer,
    });
    const updateRes = await client.send(updateCommand);

    if (updateRes.$metadata.httpStatusCode !== 200) {
        throw new Error(JSON.stringify(updateRes.$metadata, null, 4));
    }

    child_process.execSync("./lambda-layer.sh", {
        cwd: path.join(__dirname),
    });

    const date = new Date();
    const layerCode = fs.readFileSync(path.join(__dirname, "lambda", "supertokens-node.zip"));

    const createLayerCommand = new PublishLayerVersionCommand({
        LayerName: "st-node" + date.getMilliseconds(),
        Description: "this was created by github action",
        CompatibleRuntimes: [
            // CompatibleRuntimes
            "nodejs16.x",
        ],
        Content: {
            ZipFile: layerCode,
        },
    });

    const createResp = await client.send(createLayerCommand);

    const updateConfig = new UpdateFunctionConfigurationCommand({
        FunctionName: FUNCTION_NAME,
        Layers: [createResp.LayerVersionArn],
        Handler: "index.handler",
        CompatibleArchitectures: [
            // CompatibleArchitectures
            "arm64",
        ],
    });

    const updateConfigResp = await client.send(updateConfig);
};
module.exports = { setup_aws };
