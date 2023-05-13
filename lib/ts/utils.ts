import * as psl from "psl";

import type { AppInfo, NormalisedAppinfo, HTTPMethod, JSONObject } from "./types";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import type { BaseRequest, BaseResponse } from "./framework";
import { logDebugMessage } from "./logger";
import { HEADER_RID } from "./constants";

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

export async function normaliseInputAppInfoOrThrowError(appInfo: AppInfo): Promise<NormalisedAppinfo> {
    if (appInfo === undefined) {
        throw new Error("Please provide the appInfo object when calling supertokens.init");
    }
    if (appInfo.apiDomain === undefined) {
        throw new Error("Please provide your apiDomain inside the appInfo object when calling supertokens.init");
    }
    if (appInfo.appName === undefined) {
        throw new Error("Please provide your appName inside the appInfo object when calling supertokens.init");
    }
    if (appInfo.origin === undefined) {
        throw new Error("Please provide your websiteDomain inside the appInfo object when calling supertokens.init");
    }
    let apiGatewayPath =
        appInfo.apiGatewayPath !== undefined
            ? new NormalisedURLPath(appInfo.apiGatewayPath)
            : new NormalisedURLPath("");
    const origin = async (userContext: any) => {
        let url;
        if (typeof appInfo.origin === "string") {
            return new NormalisedURLDomain(appInfo.origin);
        }
        if (typeof appInfo.origin === "function") {
            url = await appInfo.origin(userContext);
        }
        if (url === undefined) {
            throw new Error(
                "Please provide your websiteDomain inside the appInfo object when calling supertokens.init"
            );
        }
        return new NormalisedURLDomain(url);
    };
    const apiDomain = new NormalisedURLDomain(appInfo.apiDomain);
    const topLevelAPIDomain = getTopLevelDomainForSameSiteResolution(apiDomain.getAsStringDangerous());
    const originString = await origin({});
    const topLevelWebsiteDomain = getTopLevelDomainForSameSiteResolution(originString.getAsStringDangerous());
    return {
        appName: appInfo.appName,
        origin,
        apiDomain,
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
        topLevelAPIDomain,
        topLevelWebsiteDomain,
    };
}

export function normaliseHttpMethod(method: string): HTTPMethod {
    return method.toLowerCase() as HTTPMethod;
}

export function sendNon200ResponseWithMessage(res: BaseResponse, message: string, statusCode: number) {
    sendNon200Response(res, statusCode, { message });
}

export function sendNon200Response(res: BaseResponse, statusCode: number, body: JSONObject) {
    if (statusCode < 300) {
        throw new Error("Calling sendNon200Response with status code < 300");
    }
    logDebugMessage("Sending response to client with status code: " + statusCode);
    res.setStatusCode(statusCode);
    res.sendJSONResponse(body);
}

export function send200Response(res: BaseResponse, responseJson: any) {
    logDebugMessage("Sending response to client with status code: 200");
    res.setStatusCode(200);
    res.sendJSONResponse(responseJson);
}

export function isAnIpAddress(ipaddress: string) {
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        ipaddress
    );
}

export function getRidFromHeader(req: BaseRequest): string | undefined {
    return req.getHeaderValue(HEADER_RID);
}

export function frontendHasInterceptor(req: BaseRequest): boolean {
    return getRidFromHeader(req) !== undefined;
}

export function humaniseMilliseconds(ms: number): string {
    let t = Math.floor(ms / 1000);
    let suffix = "";

    if (t < 60) {
        if (t > 1) suffix = "s";
        return `${t} second${suffix}`;
    } else if (t < 3600) {
        const m = Math.floor(t / 60);
        if (m > 1) suffix = "s";
        return `${m} minute${suffix}`;
    } else {
        const h = Math.floor(t / 360) / 10;
        if (h > 1) suffix = "s";
        return `${h} hour${suffix}`;
    }
}

export function makeDefaultUserContextFromAPI(request: BaseRequest): any {
    return setRequestInUserContextIfNotDefined({}, request);
}

export function setRequestInUserContextIfNotDefined(userContext: any | undefined, request: BaseRequest) {
    if (userContext === undefined) {
        userContext = {};
    }

    if (userContext._default === undefined) {
        userContext._default = {};
    }

    if (typeof userContext._default === "object") {
        userContext._default.request = request;
    }

    return userContext;
}

export function getTopLevelDomainForSameSiteResolution(url: string): string {
    let urlObj = new URL(url);
    let hostname = urlObj.hostname;
    if (hostname.startsWith("localhost") || hostname.startsWith("localhost.org") || isAnIpAddress(hostname)) {
        // we treat these as the same TLDs since we can use sameSite lax for all of them.
        return "localhost";
    }
    let parsedURL = psl.parse(hostname) as psl.ParsedDomain;
    if (parsedURL.domain === null) {
        throw new Error("Please make sure that the apiDomain and websiteDomain have correct values");
    }
    return parsedURL.domain;
}

export function getFromObjectCaseInsensitive<T>(key: string, object: Record<string, T>): T | undefined {
    const matchedKeys = Object.keys(object).filter((i) => i.toLocaleLowerCase() === key.toLocaleLowerCase());

    if (matchedKeys.length === 0) {
        return undefined;
    }

    return object[matchedKeys[0]];
}
