"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../../../../passwordless/smsdelivery/services/twilio/index"));
class TwilioService {
    constructor(config) {
        this.sendSms = async (input) => {
            await this.passwordlessTwilioService.sendSms(input);
        };
        this.passwordlessTwilioService = new index_1.default(config);
    }
}
exports.default = TwilioService;
