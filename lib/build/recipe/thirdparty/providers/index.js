"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleWorkspaces = exports.Discord = exports.Apple = exports.Github = exports.Facebook = exports.Google = void 0;
const google_1 = __importDefault(require("./google"));
const facebook_1 = __importDefault(require("./facebook"));
const github_1 = __importDefault(require("./github"));
const apple_1 = __importDefault(require("./apple"));
const discord_1 = __importDefault(require("./discord"));
// import ProviderOkta from "./okta";
const googleWorkspaces_1 = __importDefault(require("./googleWorkspaces"));
// import ProviderAD from "./activeDirectory";
exports.Google = google_1.default;
exports.Facebook = facebook_1.default;
exports.Github = github_1.default;
exports.Apple = apple_1.default;
exports.Discord = discord_1.default;
exports.GoogleWorkspaces = googleWorkspaces_1.default;
// export let Okta = ProviderOkta;
// export let ActiveDirectory = ProviderAD;
