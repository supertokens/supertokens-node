import { parse } from "tldts";

import type { AppInfo, NormalisedAppinfo, HTTPMethod, JSONObject, UserContext } from "./types";
import NormalisedURLDomain from "./normalisedURLDomain";
import NormalisedURLPath from "./normalisedURLPath";
import type { BaseRequest, BaseResponse } from "./framework";
import { logDebugMessage } from "./logger";
import { HEADER_FDI, HEADER_RID } from "./constants";
import crossFetch from "cross-fetch";
import { LoginMethod, User } from "./user";
import { SessionContainer } from "./recipe/session";
import { ProcessState, PROCESS_STATE } from "./processState";

export const doFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit | undefined) => {
    // frameworks like nextJS cache fetch GET requests (https://nextjs.org/docs/app/building-your-application/caching#data-cache)
    // we don't want that because it may lead to weird behaviour when querying the core.
    if (init === undefined) {
        ProcessState.getInstance().addState(PROCESS_STATE.ADDING_NO_CACHE_HEADER_IN_FETCH);
        init = {
            cache: "no-store",
            redirect: "manual",
        };
    } else {
        if (init.cache === undefined) {
            ProcessState.getInstance().addState(PROCESS_STATE.ADDING_NO_CACHE_HEADER_IN_FETCH);
            init.cache = "no-store";
            init.redirect = "manual";
        }
    }

    // Remove the cache field if the runtime is Cloudflare Workers
    //
    // CF Workers did not support the cache field at all until Nov, 2024
    // when they added support for the `cache` field but it only supports
    // `no-store`.
    //
    // The following check is to ensure that this doesn't error out in
    // Cloudflare Workers where compatibility flag is set to an older version.
    //
    // Since there is no way for us to determine which compatibility flags are
    // enabled, we are disabling the cache functionality for CF Workers altogether.
    // Ref issue: https://github.com/cloudflare/workerd/issues/698
    if (isRunningInCloudflareWorker()) {
        delete init.cache;
    }

    const fetchFunction = typeof fetch !== "undefined" ? fetch : crossFetch;
    try {
        return await fetchFunction(input, init);
    } catch (e) {
        logDebugMessage("Error fetching: " + e);
        throw e;
    }
};

function isRunningInCloudflareWorker() {
    return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
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

    let apiGatewayPath =
        appInfo.apiGatewayPath !== undefined
            ? new NormalisedURLPath(appInfo.apiGatewayPath)
            : new NormalisedURLPath("");

    if (appInfo.origin === undefined && appInfo.websiteDomain === undefined) {
        throw new Error(
            "Please provide either origin or websiteDomain inside the appInfo object when calling supertokens.init"
        );
    }

    let websiteDomainFunction = (input: { request: BaseRequest | undefined; userContext: UserContext }) => {
        let origin = appInfo.origin;

        if (origin === undefined) {
            origin = appInfo.websiteDomain;
        }

        // This should not be possible because we check for either origin or websiteDomain above
        if (origin === undefined) {
            throw new Error("Should never come here");
        }

        if (typeof origin === "function") {
            origin = origin(input);
        }
        return new NormalisedURLDomain(origin);
    };

    const apiDomain = new NormalisedURLDomain(appInfo.apiDomain);
    const topLevelAPIDomain = getTopLevelDomainForSameSiteResolution(apiDomain.getAsStringDangerous());
    const topLevelWebsiteDomain = (input: { request: BaseRequest | undefined; userContext: UserContext }) => {
        return getTopLevelDomainForSameSiteResolution(websiteDomainFunction(input).getAsStringDangerous());
    };

    return {
        appName: appInfo.appName,
        getOrigin: websiteDomainFunction,
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
        getTopLevelWebsiteDomain: topLevelWebsiteDomain,
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
    responseJson = deepTransform(responseJson);
    res.setStatusCode(200);
    res.sendJSONResponse(responseJson);
}

// this function tries to convert the json response based on the toJson function
// defined in the objects in the input. This is primarily used to convert the RecipeUserId
// type to a string type before sending it to the client.
function deepTransform(obj: { [key: string]: any }): { [key: string]: any } {
    let out: { [key: string]: any } = Array.isArray(obj) ? [] : {};

    for (let key in obj) {
        let val = obj[key];
        if (val && typeof val === "object" && val["toJson"] !== undefined && typeof val["toJson"] === "function") {
            out[key] = val.toJson();
        } else if (val && typeof val === "object") {
            out[key] = deepTransform(val);
        } else {
            out[key] = val;
        }
    }

    return out;
}

export function isAnIpAddress(ipaddress: string) {
    return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        ipaddress
    );
}
export function getNormalisedShouldTryLinkingWithSessionUserFlag(req: BaseRequest, body: any) {
    if (hasGreaterThanEqualToFDI(req, "3.1")) {
        return body.shouldTryLinkingWithSessionUser ?? false;
    }
    return undefined;
}

export function getBackwardsCompatibleUserInfo(
    req: BaseRequest,
    result: {
        user: User;
        session: SessionContainer;
        createdNewRecipeUser?: boolean;
    },
    userContext: UserContext
) {
    let resp: JSONObject;
    // (>= 1.18 && < 2.0) || >= 3.0: This is because before 1.18, and between 2 and 3, FDI does not
    // support account linking.
    if (
        (hasGreaterThanEqualToFDI(req, "1.18") && !hasGreaterThanEqualToFDI(req, "2.0")) ||
        hasGreaterThanEqualToFDI(req, "3.0")
    ) {
        resp = {
            user: result.user.toJson(),
        };

        if (result.createdNewRecipeUser !== undefined) {
            resp.createdNewRecipeUser = result.createdNewRecipeUser;
        }
        return resp;
    } else {
        let loginMethod: undefined | LoginMethod = result.user.loginMethods.find(
            (lm) => lm.recipeUserId.getAsString() === result.session.getRecipeUserId(userContext).getAsString()
        );

        if (loginMethod === undefined) {
            // we pick the oldest login method here for the user.
            // this can happen in case the user is implementing something like
            // MFA where the session remains the same during the second factor as well.
            for (let i = 0; i < result.user.loginMethods.length; i++) {
                if (loginMethod === undefined) {
                    loginMethod = result.user.loginMethods[i];
                } else if (loginMethod.timeJoined > result.user.loginMethods[i].timeJoined) {
                    loginMethod = result.user.loginMethods[i];
                }
            }
        }

        if (loginMethod === undefined) {
            throw new Error("This should never happen - user has no login methods");
        }

        const userObj: JSONObject = {
            id: result.user.id, // we purposely use this instead of the loginmethod's recipeUserId because if the oldest login method is deleted, then this userID should remain the same.
            timeJoined: loginMethod.timeJoined,
        };
        if (loginMethod.thirdParty) {
            userObj.thirdParty = loginMethod.thirdParty;
        }
        if (loginMethod.email) {
            userObj.email = loginMethod.email;
        }
        if (loginMethod.phoneNumber) {
            userObj.phoneNumber = loginMethod.phoneNumber;
        }

        resp = {
            user: userObj,
        };

        if (result.createdNewRecipeUser !== undefined) {
            resp.createdNewUser = result.createdNewRecipeUser;
        }
    }
    return resp;
}

export function getLatestFDIVersionFromFDIList(fdiHeaderValue: string): string {
    let versions = fdiHeaderValue.split(",");
    let maxVersionStr = versions[0];
    for (let i = 1; i < versions.length; i++) {
        maxVersionStr = maxVersion(maxVersionStr, versions[i]);
    }
    return maxVersionStr;
}

export function hasGreaterThanEqualToFDI(req: BaseRequest, version: string) {
    let requestFDI = req.getHeaderValue(HEADER_FDI);
    if (requestFDI === undefined) {
        // By default we assume they want to use the latest FDI, this also helps with tests
        return true;
    }
    requestFDI = getLatestFDIVersionFromFDIList(requestFDI);
    if (requestFDI === version || maxVersion(version, requestFDI) !== version) {
        return true;
    }
    return false;
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

export function makeDefaultUserContextFromAPI(request: BaseRequest): UserContext {
    return setRequestInUserContextIfNotDefined({} as UserContext, request);
}

export function getUserContext(inputUserContext?: Record<string, any>): UserContext {
    return (inputUserContext ?? {}) as UserContext;
}

export function setRequestInUserContextIfNotDefined(userContext: UserContext | undefined, request: BaseRequest) {
    if (userContext === undefined) {
        userContext = {} as UserContext;
    }

    if (userContext._default === undefined) {
        userContext._default = {};
    }

    if (typeof userContext._default === "object") {
        userContext._default.request = request;
        userContext._default.keepCacheAlive = true;
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

    // Before `tldts`, `psl` was being used and that library automatically
    // handled parsing private domains. With `tldts`, `allowPrivateDomains` is
    // required to be passed to handle that.
    //
    // This is important for parsing ec2 public URL's that were initially
    // reported to be breaking in the following issue:
    // https://github.com/supertokens/supertokens-python/issues/394
    let parsedURL = parse(hostname, { allowPrivateDomains: true });
    if (!parsedURL.domain) {
        // If the URL is an AWS public URL, return the entire URL since it is
        // considered a suffix entirely (instead of just amazonaws.com). This
        // was initially reported in https://github.com/supertokens/supertokens-python/issues/394
        if (hostname.endsWith(".amazonaws.com") && parsedURL.publicSuffix === hostname) {
            return hostname;
        }
        // support for .local domain
        if (hostname.endsWith(".local") && !parsedURL.publicSuffix) {
            return hostname;
        }
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

export async function postWithFetch(
    url: string,
    headers: Record<string, string>,
    body: any,
    { successLog, errorLogHeader }: { successLog: string; errorLogHeader: string }
): Promise<{ resp: { status: number; body: any } } | { error: any }> {
    let error;
    let resp: { status: number; body: any };
    try {
        const fetchResp = await doFetch(url, {
            method: "POST",
            body: JSON.stringify(body),
            headers,
        });
        const respText = await fetchResp.text();
        resp = {
            status: fetchResp.status,
            body: JSON.parse(respText),
        };
        if (fetchResp.status < 300) {
            logDebugMessage(successLog);
            return { resp };
        }
        logDebugMessage(errorLogHeader);
        logDebugMessage(`Error status: ${fetchResp.status}`);
        logDebugMessage(`Error response: ${respText}`);
    } catch (caught) {
        error = caught;
        logDebugMessage(errorLogHeader);
        if (error instanceof Error) {
            logDebugMessage(`Error: ${error.message}`);
            logDebugMessage(`Stack: ${error.stack}`);
        } else {
            logDebugMessage(`Error: ${JSON.stringify(error)}`);
        }
    }
    logDebugMessage("Logging the input below:");
    logDebugMessage(JSON.stringify(body, null, 2));
    if (error !== undefined) {
        return {
            error,
        };
    }
    return {
        resp: resp!,
    };
}

export function normaliseEmail(email: string): string {
    email = email.trim();
    email = email.toLowerCase();

    return email;
}

export function toCamelCase(str: string): string {
    return str.replace(/([-_][a-z])/gi, (match) => {
        return match.toUpperCase().replace("-", "").replace("_", "");
    });
}

export function toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Transforms the keys of an object from camelCase to snakeCase or vice versa.
export function transformObjectKeys<T>(obj: { [key: string]: any }, caseType: "snake-case" | "camelCase"): T {
    const transformKey = caseType === "camelCase" ? toCamelCase : toSnakeCase;

    return Object.entries(obj).reduce((result, [key, value]) => {
        const transformedKey = transformKey(key);
        result[transformedKey] = value;
        return result;
    }, {} as any) as T;
}

export const getProcess = () => {
    /**
     * Return the process instance if it is available falling back
     * to one that is compatible where process may not be available
     * (like `edge` runtime).
     */
    if (typeof process !== "undefined") return process;
    const ponyFilledProcess = require("process");
    return ponyFilledProcess;
};

export const getBuffer = () => {
    /**
     * Return the Buffer instance if it is available falling back
     * to one that is compatible where it may not be available
     * (like `edge` runtime).
     */
    if (typeof Buffer !== "undefined") return Buffer;
    const ponyFilledBuffer = require("buffer").Buffer;
    return ponyFilledBuffer;
};

export const isTestEnv = (): boolean => {
    /**
     * Check if test mode is enabled by reading the environment variable.
     */
    return getProcess().env.TEST_MODE === "testing";
};

export const encodeBase64 = (value: string): string => {
    /**
     * Encode the passed value to base64 and return the encoded value.
     */
    return getBuffer().from(value).toString("base64");
};

export const decodeBase64 = (value: string): string => {
    /**
     * Decode the passed value with base64 encoded and return the
     * decoded value.
     */
    return getBuffer().from(value, "base64").toString();
};

export const isBuffer = (obj: any): boolean => {
    /**
     * Check if the passed object is a buffer or not.
     */
    return getBuffer().isBuffer(obj);
};
