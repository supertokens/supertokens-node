import { URL } from "url";
import STError from "./error";
import { AppInfo, NormalisedAppinfo, HTTPMethod } from "./types";
import * as express from "express";
import { HEADER_RID } from "./constants";

export function normaliseURLPathOrThrowError(rId: string, input: string): string {
    input = input.trim().toLowerCase();

    try {
        if (!input.startsWith("http://") && !input.startsWith("https://")) {
            throw new Error("converting to proper URL");
        }
        let urlObj = new URL(input);
        input = urlObj.pathname;

        if (input.charAt(input.length - 1) === "/") {
            return input.substr(0, input.length - 1);
        }

        return input;
    } catch (err) {}
    // not a valid URL

    // If the input contains a . it means they have given a domain name.
    // So we try assuming that they have given a domain name + path
    if (
        (input.indexOf(".") !== -1 || input.startsWith("localhost")) &&
        !input.startsWith("http://") &&
        !input.startsWith("https://")
    ) {
        input = "http://" + input;
        return normaliseURLPathOrThrowError(rId, input);
    }

    if (input.charAt(0) !== "/") {
        input = "/" + input;
    }

    // at this point, we should be able to convert it into a fake URL and recursively call this function.
    try {
        // test that we can convert this to prevent an infinite loop
        new URL("http://example.com" + input);

        return normaliseURLPathOrThrowError(rId, "http://example.com" + input);
    } catch (err) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            rId,
            payload: new Error("Please provide a valid URL path"),
        });
    }
}

export function normaliseURLDomainOrThrowError(rId: string, input: string): string {
    function isAnIpAddress(ipaddress: string) {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
            ipaddress
        );
    }

    input = input.trim().toLowerCase();

    try {
        if (!input.startsWith("http://") && !input.startsWith("https://") && !input.startsWith("supertokens://")) {
            throw new Error("converting to proper URL");
        }
        let urlObj = new URL(input);
        if (urlObj.protocol === "supertokens:") {
            if (urlObj.hostname.startsWith("localhost") || isAnIpAddress(urlObj.hostname)) {
                input = "http://" + urlObj.host;
            } else {
                input = "https://" + urlObj.host;
            }
        } else {
            input = urlObj.protocol + "//" + urlObj.host;
        }

        return input;
    } catch (err) {}
    // not a valid URL

    if (input.indexOf(".") === 0) {
        input = input.substr(1);
    }

    // If the input contains a . it means they have given a domain name.
    // So we try assuming that they have given a domain name
    if (
        (input.indexOf(".") !== -1 || input.startsWith("localhost")) &&
        !input.startsWith("http://") &&
        !input.startsWith("https://")
    ) {
        // The supertokens:// signifies to the recursive call that the call was made by us.
        input = "supertokens://" + input;

        // at this point, it should be a valid URL. So we test that before doing a recursive call
        try {
            new URL(input);
            return normaliseURLDomainOrThrowError(rId, input);
        } catch (err) {}
    }

    throw new STError({
        type: STError.GENERAL_ERROR,
        rId,
        payload: new Error("Please provide a valid domain name"),
    });
}

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

export function normaliseInputAppInfoOrThrowError(rId: string, appInfo: AppInfo): NormalisedAppinfo {
    if (appInfo === undefined) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error("Please provide the appInfo object when calling supertokens.init"),
            rId: "",
        });
    }
    if (appInfo.apiDomain === undefined) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error("Please provide your apiDomain inside the appInfo object when calling supertokens.init"),
            rId: "",
        });
    }
    if (appInfo.appName === undefined) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error("Please provide your appNmae inside the appInfo object when calling supertokens.init"),
            rId: "",
        });
    }
    if (appInfo.websiteDomain === undefined) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            payload: new Error(
                "Please provide your websiteDomain inside the appInfo object when calling supertokens.init"
            ),
            rId: "",
        });
    }
    return {
        appName: appInfo.appName,
        websiteDomain: normaliseURLDomainOrThrowError(rId, appInfo.websiteDomain),
        apiDomain: normaliseURLDomainOrThrowError(rId, appInfo.apiDomain),
        apiBasePath:
            appInfo.apiBasePath === undefined
                ? normaliseURLPathOrThrowError(rId, "/auth")
                : normaliseURLPathOrThrowError(rId, appInfo.apiBasePath),
        websiteBasePath:
            appInfo.websiteBasePath === undefined
                ? normaliseURLPathOrThrowError(rId, "/auth")
                : normaliseURLPathOrThrowError(rId, appInfo.websiteBasePath),
    };
}

export function getRIDFromRequest(req: express.Request): string | undefined {
    return getHeader(req, HEADER_RID);
}

export function normaliseHttpMethod(method: string): HTTPMethod {
    return method.toLowerCase() as HTTPMethod;
}

export function getHeader(req: express.Request, key: string): string | undefined {
    let value = req.headers[key];
    if (value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}
