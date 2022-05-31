"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../../../utils");
function getPasswordlessLoginSmsContent(input) {
    let body = getPasswordlessLoginSmsBody(input.codeLifetime, input.urlWithLinkCode, input.userInputCode);
    return {
        body,
        toPhoneNumber: input.phoneNumber,
    };
}
exports.default = getPasswordlessLoginSmsContent;
function getPasswordlessLoginSmsBody(codeLifetime, urlWithLinkCode, userInputCode) {
    let message = "";
    if (urlWithLinkCode !== undefined && userInputCode !== undefined) {
        message = `Enter OTP: ${userInputCode} OR click this link: ${urlWithLinkCode} to login.`;
    } else if (urlWithLinkCode !== undefined) {
        message = `Click this link: ${urlWithLinkCode} to login.`;
    } else {
        message = `Enter OTP: ${userInputCode} to login.`;
    }
    const humanisedCodeLifetime = utils_1.humaniseMilliseconds(codeLifetime);
    message += ` It will expire in ${humanisedCodeLifetime}.`;
    return message;
}
