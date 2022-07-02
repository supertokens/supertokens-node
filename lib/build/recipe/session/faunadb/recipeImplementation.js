"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const faunadb = require("faunadb");
const constants_1 = require("./constants");
class RecipeImplementation {
    constructor(originalImplementation, config) {
        this.q = faunadb.query;
        this.getFDAT = (userId, userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                function getFaunadbTokenTimeLag() {
                    if (process.env.INSTALL_PATH !== undefined) {
                        // if in testing...
                        return 2 * 1000;
                    }
                    return constants_1.FAUNADB_TOKEN_TIME_LAG_MILLI;
                }
                let accessTokenLifetime = yield this.originalImplementation.getAccessTokenLifeTimeMS({ userContext });
                let faunaResponse = yield this.config.faunaDBClient.query(
                    this.q.Create(this.q.Tokens(), {
                        instance: this.q.Ref(this.q.Collection(this.config.userCollectionName), userId),
                        ttl: this.q.TimeAdd(
                            this.q.Now(),
                            accessTokenLifetime + getFaunadbTokenTimeLag(),
                            "millisecond"
                        ),
                    })
                );
                return faunaResponse.secret;
            });
        this.getGlobalClaimValidators = function (input) {
            return this.originalImplementation.getGlobalClaimValidators(input);
        };
        this.createNewSession = function ({ res, userId, accessTokenPayload = {}, sessionData = {}, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let fdat = yield this.getFDAT(userId, userContext);
                if (this.config.accessFaunadbTokenFromFrontend) {
                    accessTokenPayload = Object.assign({}, accessTokenPayload);
                    accessTokenPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                } else {
                    sessionData = Object.assign({}, sessionData);
                    sessionData[constants_1.FAUNADB_SESSION_KEY] = fdat;
                }
                return getModifiedSession(
                    yield this.originalImplementation.createNewSession({
                        res,
                        userId,
                        accessTokenPayload,
                        sessionData,
                        userContext,
                    })
                );
            });
        };
        this.getSession = function ({ req, res, options, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let originalSession = yield this.originalImplementation.getSession({ req, res, options, userContext });
                if (originalSession === undefined) {
                    return undefined;
                }
                return getModifiedSession(originalSession);
            });
        };
        this.getSessionInformation = function ({ sessionHandle, userContext }) {
            return this.originalImplementation.getSessionInformation({ sessionHandle, userContext });
        };
        this.refreshSession = function ({ req, res, userContext }) {
            return __awaiter(this, void 0, void 0, function* () {
                let originalSession = yield this.originalImplementation.refreshSession({ req, res, userContext });
                let session = getModifiedSession(originalSession);
                let fdat = yield this.getFDAT(session.getUserId(), userContext);
                // we do not use the accessFaunaDBTokenFromFrontend boolean here so that
                // it can be changed without affecting existing sessions.
                if (session.getAccessTokenPayload()[constants_1.FAUNADB_SESSION_KEY] !== undefined) {
                    let newPayload = Object.assign({}, session.getAccessTokenPayload());
                    newPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                    yield session.updateAccessTokenPayload(newPayload);
                } else {
                    let newPayload = Object.assign({}, yield session.getSessionData());
                    newPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                    yield session.updateSessionData(newPayload);
                }
                return session;
            });
        };
        this.revokeAllSessionsForUser = function ({ userId, userContext }) {
            return this.originalImplementation.revokeAllSessionsForUser({ userId, userContext });
        };
        this.getAllSessionHandlesForUser = function ({ userId, userContext }) {
            return this.originalImplementation.getAllSessionHandlesForUser({ userId, userContext });
        };
        this.revokeSession = function ({ sessionHandle, userContext }) {
            return this.originalImplementation.revokeSession({ sessionHandle, userContext });
        };
        this.revokeMultipleSessions = function ({ sessionHandles, userContext }) {
            return this.originalImplementation.revokeMultipleSessions({ sessionHandles, userContext });
        };
        this.updateSessionData = function ({ sessionHandle, newSessionData, userContext }) {
            return this.originalImplementation.updateSessionData({ sessionHandle, newSessionData, userContext });
        };
        this.updateAccessTokenPayload = function (input) {
            return this.originalImplementation.updateAccessTokenPayload(input);
        };
        this.mergeIntoAccessTokenPayload = function (input) {
            return this.originalImplementation.mergeIntoAccessTokenPayload(input);
        };
        this.regenerateAccessToken = function (input) {
            return this.originalImplementation.regenerateAccessToken(input);
        };
        this.getAccessTokenLifeTimeMS = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.originalImplementation.getAccessTokenLifeTimeMS(input);
            });
        };
        this.getRefreshTokenLifeTimeMS = function (input) {
            return __awaiter(this, void 0, void 0, function* () {
                return this.originalImplementation.getRefreshTokenLifeTimeMS(input);
            });
        };
        this.fetchAndSetClaim = function (input) {
            return this.originalImplementation.fetchAndSetValue(input);
        };
        this.setClaimValue = function (input) {
            return this.originalImplementation.setClaimValue(input);
        };
        this.getClaimValue = function (input) {
            return this.originalImplementation.getClaimValue(input);
        };
        this.removeClaim = function (input) {
            return this.originalImplementation.removeClaim(input);
        };
        this.originalImplementation = originalImplementation;
        this.config = {
            accessFaunadbTokenFromFrontend:
                config.accessFaunadbTokenFromFrontend === undefined ? false : config.accessFaunadbTokenFromFrontend,
            userCollectionName: config.userCollectionName,
            faunaDBClient: config.faunaDBClient,
        };
    }
}
exports.default = RecipeImplementation;
function getModifiedSession(session) {
    return Object.assign(Object.assign({}, session), {
        getFaunadbToken: (userContext) =>
            __awaiter(this, void 0, void 0, function* () {
                let accessTokenPayload = session.getAccessTokenPayload(userContext);
                if (accessTokenPayload[constants_1.FAUNADB_SESSION_KEY] !== undefined) {
                    // this operation costs nothing. So we can check
                    return accessTokenPayload[constants_1.FAUNADB_SESSION_KEY];
                } else {
                    let sessionData = yield session.getSessionData(userContext);
                    return sessionData[constants_1.FAUNADB_SESSION_KEY];
                }
            }),
    });
}
