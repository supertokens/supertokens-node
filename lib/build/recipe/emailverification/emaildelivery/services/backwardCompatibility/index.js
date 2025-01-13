"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emailVerificationFunctions_1 = require("../../../emailVerificationFunctions");
class BackwardCompatibilityService {
    constructor(appInfo, isInServerlessEnv) {
        this.sendEmail = async (input) => {
            try {
                if (!this.isInServerlessEnv) {
                    (0, emailVerificationFunctions_1.createAndSendEmailUsingSupertokensService)(
                        this.appInfo,
                        input.user,
                        input.emailVerifyLink
                    ).catch((_) => {});
                } else {
                    // see https://github.com/supertokens/supertokens-node/pull/135
                    await (0, emailVerificationFunctions_1.createAndSendEmailUsingSupertokensService)(
                        this.appInfo,
                        input.user,
                        input.emailVerifyLink
                    );
                }
            } catch (_) {}
        };
        this.appInfo = appInfo;
        this.isInServerlessEnv = isInServerlessEnv;
    }
}
exports.default = BackwardCompatibilityService;
