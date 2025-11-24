"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passwordResetFunctions_1 = require("../../../passwordResetFunctions");
class BackwardCompatibilityService {
    constructor(appInfo, isInServerlessEnv) {
        this.sendEmail = async (input) => {
            // we add this here cause the user may have overridden the sendEmail function
            // to change the input email and if we don't do this, the input email
            // will get reset by the getUserById call above.
            try {
                if (!this.isInServerlessEnv) {
                    (0, passwordResetFunctions_1.createAndSendEmailUsingSupertokensService)(
                        this.appInfo,
                        input.user,
                        input.passwordResetLink
                    ).catch((_) => {});
                } else {
                    // see https://github.com/supertokens/supertokens-node/pull/135
                    await (0, passwordResetFunctions_1.createAndSendEmailUsingSupertokensService)(
                        this.appInfo,
                        input.user,
                        input.passwordResetLink
                    );
                }
            } catch (_) {}
        };
        this.isInServerlessEnv = isInServerlessEnv;
        this.appInfo = appInfo;
    }
}
exports.default = BackwardCompatibilityService;
