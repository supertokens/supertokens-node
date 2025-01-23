"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normaliseUserInputConfig = normaliseUserInputConfig;
function normaliseUserInputConfig(input) {
    let from = "from" in input.twilioSettings ? input.twilioSettings.from : undefined;
    let messagingServiceSid =
        "messagingServiceSid" in input.twilioSettings ? input.twilioSettings.messagingServiceSid : undefined;
    if (
        (from === undefined && messagingServiceSid === undefined) ||
        (from !== undefined && messagingServiceSid !== undefined)
    ) {
        throw Error(`Please pass exactly one of "from" and "messagingServiceSid" config for twilioSettings.`);
    }
    return input;
}
