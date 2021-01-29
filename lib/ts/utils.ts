import STError from "./error";
import { AppInfo, NormalisedAppinfo, HTTPMethod } from "./types";
import * as express from "express";
import { HEADER_RID } from "./constants";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import * as bodyParser from "body-parser";

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
            payload: new Error("Please provide your appName inside the appInfo object when calling supertokens.init"),
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
        websiteDomain: new NormalisedURLDomain(rId, appInfo.websiteDomain),
        apiDomain: new NormalisedURLDomain(rId, appInfo.apiDomain),
        apiBasePath:
            appInfo.apiBasePath === undefined
                ? new NormalisedURLPath(rId, "/auth")
                : new NormalisedURLPath(rId, appInfo.apiBasePath),
        websiteBasePath:
            appInfo.websiteBasePath === undefined
                ? new NormalisedURLPath(rId, "/auth")
                : new NormalisedURLPath(rId, appInfo.websiteBasePath),
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

export function sendNon200Response(rId: string, res: express.Response, message: string, statusCode: number) {
    if (statusCode < 300) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            rId,
            payload: new Error("Calling sendNon200Response with status code < 300"),
        });
    }
    if (!res.writableEnded) {
        res.statusCode = statusCode;
        res.json({
            message,
        });
    }
}

export function send200Response(res: express.Response, responseJson: any) {
    if (!res.writableEnded) {
        res.status(200).json(responseJson);
    }
}

export async function assertThatBodyParserHasBeenUsed(rId: string, req: express.Request, res: express.Response) {
    // according to https://github.com/supertokens/supertokens-node/issues/33
    let method = normaliseHttpMethod(req.method);
    if (method === "post" || method === "put") {
        if (req.body === undefined) {
            let jsonParser = bodyParser.json();
            let err = await new Promise((resolve) => jsonParser(req, res, resolve));
            if (err !== undefined) {
                throw new STError({
                    type: STError.BAD_INPUT_ERROR,
                    message: "API input error: Please make sure to pass a valid JSON input in thr request body",
                    rId,
                });
            }
        }
    } else if (method === "delete" || method === "get") {
        if (req.query === undefined) {
            let parser = bodyParser.urlencoded({ extended: true });
            let err = await new Promise((resolve) => parser(req, res, resolve));
            if (err !== undefined) {
                throw new STError({
                    type: STError.BAD_INPUT_ERROR,
                    message: "API input error: Please make sure to pass valid URL query params",
                    rId,
                });
            }
        }
    }
}

export function isAnIpAddress(ipaddress: string) {
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        ipaddress
    );
}
