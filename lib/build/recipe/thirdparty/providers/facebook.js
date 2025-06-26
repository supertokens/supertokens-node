"use strict";
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Facebook;
const custom_1 = __importDefault(require("./custom"));
function Facebook(input) {
    var _a;
    if (input.config.name === undefined) {
        input.config.name = "Facebook";
    }
    if (input.config.authorizationEndpoint === undefined) {
        input.config.authorizationEndpoint = "https://www.facebook.com/v12.0/dialog/oauth";
    }
    if (input.config.tokenEndpoint === undefined) {
        input.config.tokenEndpoint = "https://graph.facebook.com/v12.0/oauth/access_token";
    }
    if (input.config.userInfoEndpoint === undefined) {
        input.config.userInfoEndpoint = "https://graph.facebook.com/me";
    }
    input.config.userInfoMap = Object.assign(Object.assign({}, input.config.userInfoMap), {
        fromUserInfoAPI: Object.assign(
            { userId: "id" },
            (_a = input.config.userInfoMap) === null || _a === void 0 ? void 0 : _a.fromUserInfoAPI
        ),
    });
    const oOverride = input.override;
    input.override = function (originalImplementation) {
        const oGetConfig = originalImplementation.getConfigForClientType;
        originalImplementation.getConfigForClientType = async function (input) {
            const config = await oGetConfig(input);
            if (config.scope === undefined) {
                config.scope = ["email"];
            }
            return config;
        };
        const oGetUserInfo = originalImplementation.getUserInfo;
        originalImplementation.getUserInfo = async function (input) {
            var _a;
            const fieldsPermissionMap = {
                public_profile: [
                    "first_name",
                    "last_name",
                    "middle_name",
                    "name",
                    "name_format",
                    "picture",
                    "short_name",
                ],
                email: ["id", "email"],
                user_birthday: ["birthday"],
                user_videos: ["videos"],
                user_posts: ["posts"],
                user_photos: ["photos"],
                user_location: ["location"],
                user_link: ["link"],
                user_likes: ["likes"],
                user_hometown: ["hometown"],
                user_gender: ["gender"],
                user_friends: ["friends"],
                user_age_range: ["age_range"],
            };
            const scopeValues = originalImplementation.config.scope;
            const fields =
                (_a =
                    scopeValues === null || scopeValues === void 0
                        ? void 0
                        : scopeValues
                              .map((scopeValue) => {
                                  var _a;
                                  return (_a = fieldsPermissionMap[scopeValue]) !== null && _a !== void 0 ? _a : [];
                              })
                              .flat()
                              .join(",")) !== null && _a !== void 0
                    ? _a
                    : "id,email";
            originalImplementation.config.userInfoEndpointQueryParams = Object.assign(
                { access_token: input.oAuthTokens.access_token, fields, format: "json" },
                originalImplementation.config.userInfoEndpointQueryParams
            );
            originalImplementation.config.userInfoEndpointHeaders = Object.assign(
                Object.assign({}, originalImplementation.config.userInfoEndpointHeaders),
                { Authorization: null }
            );
            return await oGetUserInfo(input);
        };
        if (oOverride !== undefined) {
            originalImplementation = oOverride(originalImplementation);
        }
        return originalImplementation;
    };
    return (0, custom_1.default)(input);
}
