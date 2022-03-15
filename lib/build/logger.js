"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = require("debug");
const version_1 = require("./version");
/*
 The debug logger and info logger defined below use the debug lib to log debug and info messages when the DEBUG env is set with the com.supertokens namespace.
For example:
    Adding a info log to the emailpassword signin api
    We are adding a debug log to the SignIn API which will print the status when a non OK response is returned
Flow:
    SignIn with with valid credentials;
    SignIn with invalid credentials
Output: (with DEBUG=com.supertokens:*)
  com.supertokens:info {t: "1647263677740", msg: "Calling SignInAPI", sdkVer: "9.1.0"} +0ms
  com.supertokens:debug {t: "1647263677952", msg: "API replied with status: OK", debugCode: 1, sdkVer: "9.1.0"} +0ms
  com.supertokens:info {t: "1647263690053", msg: "Calling SignInAPI", sdkVer: "9.1.0"} +0ms
  com.supertokens:debug {t: "1647263690199", msg: "API replied with status: WRONG_CREDENTIALS_ERROR", debugCode: 1, sdkVer: "9.1.0"} +0ms

*/
let logMessage = (namespaceId, message) => {
    debug_1.default(`com.supertokens:${namespaceId}`)(
        `{t: "${Date.now()}", msg: ${message}, sdkVer: "${version_1.version}"}`
    );
};
let debugLoggerHelper = (debugCode, message) => {
    logMessage("debug", `"${message}", debugCode: ${debugCode}`);
};
function infoLogger(message) {
    logMessage("info", `"${message}"`);
}
exports.infoLogger = infoLogger;
exports.debugLoggerWithCode = {
    1: (item) => {
        debugLoggerHelper(1, `API replied with status: ${item}`);
    },
};
