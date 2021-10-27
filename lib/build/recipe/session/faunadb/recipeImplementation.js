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
        this.getFDAT = (userId) =>
            __awaiter(this, void 0, void 0, function* () {
                function getFaunadbTokenTimeLag() {
                    if (process.env.INSTALL_PATH !== undefined) {
                        // if in testing...
                        return 2 * 1000;
                    }
                    return constants_1.FAUNADB_TOKEN_TIME_LAG_MILLI;
                }
                let accessTokenLifetime = yield this.originalImplementation.getAccessTokenLifeTimeMS.bind(this)();
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
        this.createNewSession = function ({ res, userId, accessTokenPayload = {}, sessionData = {} }) {
            return __awaiter(this, void 0, void 0, function* () {
                let fdat = yield this.getFDAT(userId);
                if (this.config.accessFaunadbTokenFromFrontend) {
                    accessTokenPayload = Object.assign({}, accessTokenPayload);
                    accessTokenPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                } else {
                    sessionData = Object.assign({}, sessionData);
                    sessionData[constants_1.FAUNADB_SESSION_KEY] = fdat;
                }
                return getModifiedSession(
                    yield this.originalImplementation.createNewSession.bind(this)({
                        res,
                        userId,
                        accessTokenPayload,
                        sessionData,
                    })
                );
            });
        };
        this.getSession = function ({ req, res, options }) {
            return __awaiter(this, void 0, void 0, function* () {
                let originalSession = yield this.originalImplementation.getSession.bind(this)({ req, res, options });
                if (originalSession === undefined) {
                    return undefined;
                }
                return getModifiedSession(originalSession);
            });
        };
        this.getSessionInformation = function ({ sessionHandle }) {
            return this.originalImplementation.getSessionInformation.bind(this)({ sessionHandle });
        };
        this.refreshSession = function ({ req, res }) {
            return __awaiter(this, void 0, void 0, function* () {
                let originalSession = yield this.originalImplementation.refreshSession.bind(this)({ req, res });
                let session = getModifiedSession(originalSession);
                let fdat = yield this.getFDAT(session.getUserId());
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
        this.revokeAllSessionsForUser = function ({ userId }) {
            return this.originalImplementation.revokeAllSessionsForUser.bind(this)({ userId });
        };
        this.getAllSessionHandlesForUser = function ({ userId }) {
            return this.originalImplementation.getAllSessionHandlesForUser.bind(this)({ userId });
        };
        this.revokeSession = function ({ sessionHandle }) {
            return this.originalImplementation.revokeSession.bind(this)({ sessionHandle });
        };
        this.revokeMultipleSessions = function ({ sessionHandles }) {
            return this.originalImplementation.revokeMultipleSessions.bind(this)({ sessionHandles });
        };
        this.updateSessionData = function ({ sessionHandle, newSessionData }) {
            return this.originalImplementation.updateSessionData.bind(this)({ sessionHandle, newSessionData });
        };
        this.updateAccessTokenPayload = function (input) {
            return this.originalImplementation.updateAccessTokenPayload.bind(this)(input);
        };
        this.getAccessTokenLifeTimeMS = function () {
            return __awaiter(this, void 0, void 0, function* () {
                return this.originalImplementation.getAccessTokenLifeTimeMS.bind(this)();
            });
        };
        this.getRefreshTokenLifeTimeMS = function () {
            return __awaiter(this, void 0, void 0, function* () {
                return this.originalImplementation.getRefreshTokenLifeTimeMS.bind(this)();
            });
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
        getFaunadbToken: () =>
            __awaiter(this, void 0, void 0, function* () {
                let accessTokenPayload = session.getAccessTokenPayload();
                if (accessTokenPayload[constants_1.FAUNADB_SESSION_KEY] !== undefined) {
                    // this operation costs nothing. So we can check
                    return accessTokenPayload[constants_1.FAUNADB_SESSION_KEY];
                } else {
                    let sessionData = yield session.getSessionData();
                    return sessionData[constants_1.FAUNADB_SESSION_KEY];
                }
            }),
    });
}
