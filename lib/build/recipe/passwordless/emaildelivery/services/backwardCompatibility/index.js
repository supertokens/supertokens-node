"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../../../utils");
async function createAndSendEmailUsingSupertokensService(input) {
    if ((0, utils_1.isTestEnv)()) {
        return;
    }
    const result = await (0, utils_1.postWithFetch)(
        "https://api.supertokens.io/0/st/auth/passwordless/login",
        {
            "api-version": "0",
            "content-type": "application/json; charset=utf-8",
        },
        {
            email: input.email,
            appName: input.appInfo.appName,
            codeLifetime: input.codeLifetime,
            urlWithLinkCode: input.urlWithLinkCode,
            userInputCode: input.userInputCode,
            // isFirstFactor: input.isFirstFactor,
        },
        {
            successLog: `Email sent to ${input.email}`,
            errorLogHeader: "Error sending passwordless login email",
        }
    );
    if ("error" in result) {
        throw result.error;
    }
    if (result.resp && result.resp.status >= 400) {
        if (result.resp.body.err) {
            /**
             * if the error is thrown from API, the response object
             * will be of type `{err: string}`
             */
            throw new Error(result.resp.body.err);
        } else {
            throw new Error(`Request failed with status code ${result.resp.status}`);
        }
    }
}
class BackwardCompatibilityService {
    constructor(appInfo) {
        this.sendEmail = async (input) => {
            await createAndSendEmailUsingSupertokensService({
                appInfo: this.appInfo,
                email: input.email,
                userInputCode: input.userInputCode,
                urlWithLinkCode: input.urlWithLinkCode,
                codeLifetime: input.codeLifetime,
                isFirstFactor: input.isFirstFactor,
            });
        };
        this.appInfo = appInfo;
    }
}
exports.default = BackwardCompatibilityService;
