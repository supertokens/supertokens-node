"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const supertokens_1 = __importDefault(require("../../../../passwordless/smsdelivery/services/supertokens"));
class SupertokensService {
    constructor(apiKey) {
        this.sendSms = async (input) => {
            await this.passwordlessSupertokensService.sendSms(input);
        };
        this.passwordlessSupertokensService = new supertokens_1.default(apiKey);
    }
}
exports.default = SupertokensService;
