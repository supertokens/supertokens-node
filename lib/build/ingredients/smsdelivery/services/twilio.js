"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function normaliseUserInputConfig(input) {
    let from = input.twilioSettings.from;
    let messagingServiceSid = input.twilioSettings.messagingServiceSid;
    if (from === undefined && messagingServiceSid === undefined) {
        throw Error(`Please pass either "from" or "messagingServiceSid" config for twilioSettings.`);
    }
    if (from !== undefined && messagingServiceSid === undefined) {
        return Object.assign(Object.assign({}, input), {
            twilioSettings: Object.assign(Object.assign({}, input.twilioSettings), { messagingServiceSid, from }),
        });
    } else if (from === undefined && messagingServiceSid !== undefined) {
        return Object.assign(Object.assign({}, input), {
            twilioSettings: Object.assign(Object.assign({}, input.twilioSettings), { messagingServiceSid, from }),
        });
    }
    /**
     * at this point both from and messagingServiceSid are not undefined,
     * i.e. user has passed both the config parameters
     */
    throw Error(
        `Please pass only one of "from" and "messagingServiceSid" config for twilioSettings. Both config parameters can be passed together.`
    );
}
exports.normaliseUserInputConfig = normaliseUserInputConfig;
