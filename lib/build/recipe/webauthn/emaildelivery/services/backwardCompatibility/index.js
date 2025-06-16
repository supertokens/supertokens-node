"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../../../utils");
async function createAndSendEmailUsingSupertokensService(input) {
    if ((0, utils_1.isTestEnv)()) {
        return;
    }
    const result = await (0, utils_1.postWithFetch)(
        "https://api.supertokens.com/0/st/auth/webauthn/recover",
        {
            "api-version": "0",
            "content-type": "application/json; charset=utf-8",
        },
        {
            email: input.user.email,
            appName: input.appInfo.appName,
            recoverAccountURL: input.recoverAccountLink,
        },
        {
            successLog: `Email sent to ${input.user.email}`,
            errorLogHeader: "Error sending webauthn recover account email",
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
    constructor(appInfo, isInServerlessEnv) {
        this.sendEmail = async (input) => {
            // we add this here cause the user may have overridden the sendEmail function
            // to change the input email and if we don't do this, the input email
            // will get reset by the getUserById call above.
            try {
                if (!this.isInServerlessEnv) {
                    createAndSendEmailUsingSupertokensService({
                        appInfo: this.appInfo,
                        user: input.user,
                        recoverAccountLink: input.recoverAccountLink,
                    }).catch((_) => {});
                } else {
                    // see https://github.com/supertokens/supertokens-node/pull/135
                    await createAndSendEmailUsingSupertokensService({
                        appInfo: this.appInfo,
                        user: input.user,
                        recoverAccountLink: input.recoverAccountLink,
                    });
                }
            } catch (_) {}
        };
        this.isInServerlessEnv = isInServerlessEnv;
        this.appInfo = appInfo;
    }
}
exports.default = BackwardCompatibilityService;
