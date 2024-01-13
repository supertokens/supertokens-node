"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const backwardCompatibility_1 = __importDefault(
    require("../../../../passwordless/smsdelivery/services/backwardCompatibility")
);
class BackwardCompatibilityService {
    constructor() {
        this.sendSms = async (input) => {
            await this.passwordlessBackwardCompatibilityService.sendSms(input);
        };
        this.passwordlessBackwardCompatibilityService = new backwardCompatibility_1.default();
    }
}
exports.default = BackwardCompatibilityService;
