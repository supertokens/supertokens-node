import type { AppInfo, NormalisedAppinfo, HTTPMethod } from "./types";
import { HEADER_RID, ERROR_ID, INFO_ID, SUPERTOKENS_NAMESPACE } from "./constants";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import { validate } from "jsonschema";
import type { BaseRequest, BaseResponse } from "./framework";
import debug from "debug";
import { version } from "./version";

export function getLargestVersionFromIntersection(v1: string[], v2: string[]): string | undefined {
    let intersection = v1.filter((value) => v2.indexOf(value) !== -1);
    if (intersection.length === 0) {
        return undefined;
    }
    let maxVersionSoFar = intersection[0];
    for (let i = 1; i < intersection.length; i++) {
        maxVersionSoFar = maxVersion(intersection[i], maxVersionSoFar);
    }
    return maxVersionSoFar;
}

export function maxVersion(version1: string, version2: string): string {
    let splittedv1 = version1.split(".");
    let splittedv2 = version2.split(".");
    let minLength = Math.min(splittedv1.length, splittedv2.length);
    for (let i = 0; i < minLength; i++) {
        let v1 = Number(splittedv1[i]);
        let v2 = Number(splittedv2[i]);
        if (v1 > v2) {
            return version1;
        } else if (v2 > v1) {
            return version2;
        }
    }
    if (splittedv1.length >= splittedv2.length) {
        return version1;
    }
    return version2;
}

export function normaliseInputAppInfoOrThrowError(appInfo: AppInfo): NormalisedAppinfo {
    if (appInfo === undefined) {
        throw new Error("Please provide the appInfo object when calling supertokens.init");
    }
    if (appInfo.apiDomain === undefined) {
        throw new Error("Please provide your apiDomain inside the appInfo object when calling supertokens.init");
    }
    if (appInfo.appName === undefined) {
        throw new Error("Please provide your appName inside the appInfo object when calling supertokens.init");
    }
    if (appInfo.websiteDomain === undefined) {
        throw new Error("Please provide your websiteDomain inside the appInfo object when calling supertokens.init");
    }
    let apiGatewayPath =
        appInfo.apiGatewayPath !== undefined
            ? new NormalisedURLPath(appInfo.apiGatewayPath)
            : new NormalisedURLPath("");
    return {
        appName: appInfo.appName,
        websiteDomain: new NormalisedURLDomain(appInfo.websiteDomain),
        apiDomain: new NormalisedURLDomain(appInfo.apiDomain),
        apiBasePath: apiGatewayPath.appendPath(
            appInfo.apiBasePath === undefined
                ? new NormalisedURLPath("/auth")
                : new NormalisedURLPath(appInfo.apiBasePath)
        ),
        websiteBasePath:
            appInfo.websiteBasePath === undefined
                ? new NormalisedURLPath("/auth")
                : new NormalisedURLPath(appInfo.websiteBasePath),
        apiGatewayPath,
    };
}

export function getRIDFromRequest(req: BaseRequest): string | undefined {
    return req.getHeaderValue(HEADER_RID);
}

export function normaliseHttpMethod(method: string): HTTPMethod {
    return method.toLowerCase() as HTTPMethod;
}

export function sendNon200Response(res: BaseResponse, message: string, statusCode: number) {
    if (statusCode < 300) {
        throw new Error("Calling sendNon200Response with status code < 300");
    }
    res.setStatusCode(statusCode);
    res.sendJSONResponse({ message });
}

export function send200Response(res: BaseResponse, responseJson: any) {
    res.setStatusCode(200);
    res.sendJSONResponse(responseJson);
}

export function isAnIpAddress(ipaddress: string) {
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        ipaddress
    );
}

export function validateTheStructureOfUserInput(config: any, inputSchema: any, configRoot: string) {
    // the validation package will not throw if the given schema is undefined
    // as it is requires to validate a json object
    config = config === undefined || config === null ? {} : config;
    let inputValidation = validate(config, inputSchema);
    if (inputValidation.errors.length > 0) {
        let path = inputValidation.errors[0].path.join(".");
        if (path !== "") {
            path += " ";
        }
        let errorMessage = `${path}${inputValidation.errors[0].message}`;
        if (errorMessage.startsWith("requires") || errorMessage.startsWith("is not allowed")) {
            errorMessage = `input config ${errorMessage}`;
        }
        if (errorMessage.includes("is not allowed to have the additional property")) {
            errorMessage = `${errorMessage}. Did you mean to set this on the frontend side?`;
        }
        errorMessage = `Config schema error in ${configRoot}: ${errorMessage}`;
        throw new Error(errorMessage);
    }
}

export function frontendHasInterceptor(req: BaseRequest): boolean {
    return getRIDFromRequest(req) !== undefined;
}

/*
 The error logger and info logger defined below use the debug lib to log error and info messages when the DEBUG env is set with the com.supertokens namespace.
For example:
    errLoggerWithCode[1]("Test")
    infoLogger("some info")

Output: (with DEBUG=com.supertokens:*)
  com.supertokens:error {t: "2022-03-09T10:47:57.379Z", errCode: 1, msg: "Example error with param Test", sdkVer: "9.0.0"} +0ms
  com.supertokens:info {t: "2022-03-09T10:47:57.380Z", msg: "Some info", sdkVer: "9.0.0"} +0ms

*/

// ERROR_CODE values should be the same as the key in the errorLoggerWithCode function
const ERROR_CODE_1 = 1;

let errLoggerHelper = (errorCode: number, message: string) => {
    debug(`${SUPERTOKENS_NAMESPACE}${ERROR_ID}`)(
        `{t: "${new Date().toISOString()}", errCode: ${errorCode}, msg: "${message}", sdkVer: "${version}"}`
    );
};

export function infoLogger(message: string) {
    debug(`${SUPERTOKENS_NAMESPACE}${INFO_ID}`)(`{t: "${new Date().toISOString()}", msg: "${message}"}`);
}

export let errorLoggerWithCode = {
    1: (item: string) => {
        errLoggerHelper(ERROR_CODE_1, "Example error with param: " + item);
    },
};

export { ERROR_CODE_1 };
