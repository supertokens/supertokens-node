"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const backwardCompatibility_1 = __importDefault(
    require("../../../../passwordless/emaildelivery/services/backwardCompatibility")
);
class BackwardCompatibilityService {
    constructor(appInfo) {
        this.sendEmail = async (input) => {
            await this.passwordlessBackwardCompatibilityService.sendEmail(input);
        };
        {
            this.passwordlessBackwardCompatibilityService = new backwardCompatibility_1.default(appInfo);
        }
    }
}
exports.default = BackwardCompatibilityService;
