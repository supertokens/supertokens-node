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
const error_1 = require("../error");
const sessionClass_1 = require("./sessionClass");
const faunadb = require("faunadb");
const constants_1 = require("./constants");
class RecipeImplementation {
    constructor(originalImplementation, config) {
        this.q = faunadb.query;
        this.getFDAT = (session) =>
            __awaiter(this, void 0, void 0, function* () {
                function getFaunadbTokenTimeLag() {
                    if (process.env.INSTALL_PATH !== undefined) {
                        // if in testing...
                        return 2 * 1000;
                    }
                    return constants_1.FAUNADB_TOKEN_TIME_LAG_MILLI;
                }
                let accessTokenLifetime = (yield this.originalImplementation.getHandshakeInfo()).accessTokenValidity;
                let faunaResponse = yield this.config.faunaDBClient.query(
                    this.q.Create(this.q.Tokens(), {
                        instance: this.q.Ref(this.q.Collection(this.config.userCollectionName), session.getUserId()),
                        ttl: this.q.TimeAdd(
                            this.q.Now(),
                            accessTokenLifetime + getFaunadbTokenTimeLag(),
                            "millisecond"
                        ),
                    })
                );
                return faunaResponse.secret;
            });
        this.createNewSession = (req, res, userId, jwtPayload = {}, sessionData = {}) =>
            __awaiter(this, void 0, void 0, function* () {
                // TODO: HandshakeInfo should give the access token lifetime so that we do not have to do a double query
                let originalSession = yield this.originalImplementation.createNewSession(
                    req,
                    res,
                    userId,
                    jwtPayload,
                    sessionData
                );
                let session = new sessionClass_1.default(
                    this.originalImplementation,
                    originalSession.getAccessToken(),
                    originalSession.getHandle(),
                    originalSession.getUserId(),
                    originalSession.getJWTPayload(),
                    res,
                    req
                );
                try {
                    let fdat = yield this.getFDAT(session);
                    if (this.config.accessFaunadbTokenFromFrontend) {
                        let newPayload = Object.assign({}, jwtPayload);
                        newPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateJWTPayload(newPayload);
                    } else {
                        let newPayload = Object.assign({}, sessionData);
                        newPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateSessionData(newPayload);
                    }
                    return session;
                } catch (err) {
                    throw new error_1.default({
                        type: error_1.default.GENERAL_ERROR,
                        payload: err,
                    });
                }
            });
        this.getSession = (req, res, options) =>
            __awaiter(this, void 0, void 0, function* () {
                let originalSession = yield this.originalImplementation.getSession(req, res, options);
                if (originalSession === undefined) {
                    return undefined;
                }
                return new sessionClass_1.default(
                    this.originalImplementation,
                    originalSession.getAccessToken(),
                    originalSession.getHandle(),
                    originalSession.getUserId(),
                    originalSession.getJWTPayload(),
                    res,
                    req
                );
            });
        this.refreshSession = (req, res) =>
            __awaiter(this, void 0, void 0, function* () {
                let originalSession = yield this.originalImplementation.refreshSession(req, res);
                let session = new sessionClass_1.default(
                    this.originalImplementation,
                    originalSession.getAccessToken(),
                    originalSession.getHandle(),
                    originalSession.getUserId(),
                    originalSession.getJWTPayload(),
                    res,
                    req
                );
                try {
                    let fdat = yield this.getFDAT(session);
                    // we do not use the accessFaunaDBTokenFromFrontend boolean here so that
                    // it can be changed without affecting existing sessions.
                    if (session.getJWTPayload()[constants_1.FAUNADB_SESSION_KEY] !== undefined) {
                        let newPayload = Object.assign({}, session.getJWTPayload());
                        newPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateJWTPayload(newPayload);
                    } else {
                        let newPayload = Object.assign({}, yield session.getSessionData());
                        newPayload[constants_1.FAUNADB_SESSION_KEY] = fdat;
                        yield session.updateSessionData(newPayload);
                    }
                    return session;
                } catch (err) {
                    throw new error_1.default({
                        type: error_1.default.GENERAL_ERROR,
                        payload: err,
                    });
                }
            });
        this.revokeAllSessionsForUser = (userId) => {
            return this.originalImplementation.revokeAllSessionsForUser(userId);
        };
        this.getAllSessionHandlesForUser = (userId) => {
            return this.originalImplementation.getAllSessionHandlesForUser(userId);
        };
        this.revokeSession = (sessionHandle) => {
            return this.originalImplementation.revokeSession(sessionHandle);
        };
        this.revokeMultipleSessions = (sessionHandles) => {
            return this.originalImplementation.revokeMultipleSessions(sessionHandles);
        };
        this.getSessionData = (sessionHandle) => {
            return this.originalImplementation.getSessionData(sessionHandle);
        };
        this.updateSessionData = (sessionHandle, newSessionData) => {
            return this.originalImplementation.updateSessionData(sessionHandle, newSessionData);
        };
        this.getJWTPayload = (sessionHandle) => {
            return this.originalImplementation.getJWTPayload(sessionHandle);
        };
        this.updateJWTPayload = (sessionHandle, newJWTPayload) => {
            return this.originalImplementation.updateJWTPayload(sessionHandle, newJWTPayload);
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
//# sourceMappingURL=recipeImplementation.js.map
