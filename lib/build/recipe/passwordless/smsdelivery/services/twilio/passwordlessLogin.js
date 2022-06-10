"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../../../utils");
const supertokens_1 = require("../../../../../supertokens");
function getPasswordlessLoginSmsContent(input) {
    let supertokens = supertokens_1.default.getInstanceOrThrowError();
    let appName = supertokens.appInfo.appName;
    let body = getPasswordlessLoginSmsBody(appName, input.codeLifetime, input.urlWithLinkCode, input.userInputCode);
    return {
        body,
        toPhoneNumber: input.phoneNumber,
    };
}
exports.default = getPasswordlessLoginSmsContent;
function getPasswordlessLoginSmsBody(appName, codeLifetime, urlWithLinkCode, userInputCode) {
    let message = `${appName} - Login to your account\n\n`;
    if (urlWithLinkCode !== undefined && userInputCode !== undefined) {
        message += `Your OTP to login: ${userInputCode}\n\nOR\n\nClick on this link: ${urlWithLinkCode}\n\n`;
    } else if (urlWithLinkCode !== undefined) {
        message += `Click on this link: ${urlWithLinkCode}\n\n`;
    } else {
        message += `Your OTP to login: ${userInputCode}\n\n`;
    }
    const humanisedCodeLifetime = utils_1.humaniseMilliseconds(codeLifetime);
    message += `This is valid for ${humanisedCodeLifetime}.`;
    return message;
}
