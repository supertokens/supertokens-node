"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../../../utils");
const supertokens_1 = __importDefault(require("../../../../../supertokens"));
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
    let message = "";
    if (urlWithLinkCode !== undefined && userInputCode !== undefined) {
        message += `OTP to login is ${userInputCode} for ${appName}\n\nOR click ${urlWithLinkCode} to login.\n\n`;
    } else if (urlWithLinkCode !== undefined) {
        message += `Click ${urlWithLinkCode} to login to ${appName}\n\n`;
    } else {
        message += `OTP to login is ${userInputCode} for ${appName}\n\n`;
    }
    const humanisedCodeLifetime = utils_1.humaniseMilliseconds(codeLifetime);
    message += `This is valid for ${humanisedCodeLifetime}.`;
    return message;
}
