"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cookieAndHeaders_1 = require("./cookieAndHeaders");
function attachCreateOrRefreshSessionResponseToExpressRes(res, response) {
    let accessToken = response.accessToken;
    let refreshToken = response.refreshToken;
    let idRefreshToken = response.idRefreshToken;
    cookieAndHeaders_1.setFrontTokenInHeaders(
        res,
        response.session.userId,
        response.accessToken.expiry,
        response.session.userDataInJWT
    );
    cookieAndHeaders_1.attachAccessTokenToCookie(
        res,
        accessToken.token,
        accessToken.expiry,
        accessToken.domain,
        accessToken.cookiePath,
        accessToken.cookieSecure,
        accessToken.sameSite
    );
    cookieAndHeaders_1.attachRefreshTokenToCookie(
        res,
        refreshToken.token,
        refreshToken.expiry,
        refreshToken.domain,
        refreshToken.cookiePath,
        refreshToken.cookieSecure,
        refreshToken.sameSite
    );
    cookieAndHeaders_1.setIdRefreshTokenInHeaderAndCookie(
        res,
        idRefreshToken.token,
        idRefreshToken.expiry,
        idRefreshToken.domain,
        idRefreshToken.cookieSecure,
        idRefreshToken.cookiePath,
        idRefreshToken.sameSite
    );
    if (response.antiCsrfToken !== undefined) {
        cookieAndHeaders_1.setAntiCsrfTokenInHeaders(res, response.antiCsrfToken);
    }
}
exports.attachCreateOrRefreshSessionResponseToExpressRes = attachCreateOrRefreshSessionResponseToExpressRes;
function getLargestVersionFromIntersection(v1, v2) {
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
exports.getLargestVersionFromIntersection = getLargestVersionFromIntersection;
function maxVersion(version1, version2) {
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
exports.maxVersion = maxVersion;
//# sourceMappingURL=utils.js.map
