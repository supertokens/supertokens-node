"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
const backwardCompatibility_1 = __importDefault(
    require("../../../../emailpassword/emaildelivery/services/backwardCompatibility")
);
class BackwardCompatibilityService {
    constructor(appInfo, isInServerlessEnv) {
        this.sendEmail = async (input) => {
            await this.emailPasswordBackwardCompatibilityService.sendEmail(input);
        };
        {
            this.emailPasswordBackwardCompatibilityService = new backwardCompatibility_1.default(
                appInfo,
                isInServerlessEnv
            );
        }
    }
}
exports.default = BackwardCompatibilityService;
