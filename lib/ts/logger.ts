import debug from "debug";
import { version } from "./version";

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

let logMessage = (namespaceId: string, message: string) => {
    debug(`com.supertokens:${namespaceId}`)(`{t: "${Date.now()}", msg: ${message}, sdkVer: "${version}"}`);
};

let debugLoggerHelper = (debugCode: number, message: string) => {
    logMessage("debug", `"${message}", debugCode: ${debugCode}`);
};

export function infoLogger(message: string) {
    logMessage("info", `"${message}"`);
}

export let debugLoggerWithCode = {
    1: (item: string) => {
        debugLoggerHelper(1, `API replied with status: ${item}`);
    },
};
