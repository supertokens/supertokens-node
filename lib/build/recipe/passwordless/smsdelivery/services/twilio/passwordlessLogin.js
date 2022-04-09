"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    message += ` It will expire in ${codeLifetime} seconds.`;
    return message;
}
