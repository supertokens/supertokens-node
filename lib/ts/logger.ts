import debug from "debug";
import { version } from "./version";

/*
 The debug logger and info logger defined below use the debug lib to log debug and info messages when the DEBUG env is set with the com.supertokens namespace.
For example:
    Adding a info log to the emailpassword signin api
    Adding a debug log to the SignIn API which will print the status when a non OK response is returned
Flow: 
    SignIn with with valid credentials;
    SignIn with invalid credentials
Output: (with DEBUG=com.supertokens:*)
  com.supertokens:info {t: "1647340361090", msg: "SignInAPI is called", code: 2, file: "/home/supertokens-node/lib/build/recipe/emailpassword/api/signin.js:54:69", sdkVer: "9.1.0"} +0ms
  com.supertokens:debug {t: "1647340361295", msg: "SignInAPI replied with status: OK", code: 1, file: "/home/supertokens-node/lib/build/recipe/emailpassword/api/signin.js:65:76", sdkVer: "9.1.0"} +0ms
  com.supertokens:info {t: "1647340563421", msg: "SignInAPI is called", code: 2, file: "/home/supertokens-node/lib/build/recipe/emailpassword/api/signin.js:54:69", sdkVer: "9.1.0"} +0ms
  com.supertokens:debug {t: "1647340563565", msg: "SignInAPI replied with status: WRONG_CREDENTIALS_ERROR", code: 1, file: "/home/supertokens-node/lib/build/recipe/emailpassword/api/signin.js:71:76", sdkVer: "9.1.0"} +0ms
*/

export let loggerCodes = {
    API_RESPONSE: 1,
    API_CALLED: 2,
};

let logMessage = (namespaceId: string, message: string, code: number | undefined) => {
    let fileNameAndLineNumber = getFileLocation();
    if (code == undefined) {
        debug(`com.supertokens:${namespaceId}`)(
            `{t: "${Date.now()}", msg: \"${message}\", file: \"${fileNameAndLineNumber}}\" sdkVer: "${version}"}`
        );
    } else {
        debug(`com.supertokens:${namespaceId}`)(
            `{t: "${Date.now()}", msg: \"${message}\", code: ${code}, file: \"${fileNameAndLineNumber}"\, sdkVer: "${version}"}`
        );
    }
};

export let infoLoggerWithCode = {
    [loggerCodes.API_CALLED]: (apiName: string) => {
        logMessage("info", `${apiName} is called`, loggerCodes.API_CALLED);
    },
};

export let debugLoggerWithCode = {
    [loggerCodes.API_RESPONSE]: (apiName: string, status: string) => {
        logMessage("debug", `${apiName} replied with status: ${status}`, loggerCodes.API_RESPONSE);
    },
};

let getFileLocation = () => {
    let errorObject = new Error();
    if (errorObject.stack === undefined) {
        // should not come here
        return "N/A";
    }
    // split the error stack into an array with new line as the separator
    let errorStack = errorObject.stack.split("\n");

    // find return the first trace which doesnt have the logger.js file
    for (let i = 1; i < errorStack.length; i++) {
        if (!errorStack[i].includes("logger.js")) {
            // retrieve the string between the parenthesis
            return errorStack[i].match(/(?<=\().+?(?=\))/g);
        }
    }
    return "N/A";
};
