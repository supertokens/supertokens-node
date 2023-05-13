const SuperTokens = require("../../");
const { ProcessState } = require("../../dist/processState");
const { setupST, startST, killAllST, cleanST } = require("../utils");

const express = require("express");
const request = require("supertest");
const { verifySession: expressVerifySession } = require("../../dist/recipe/session/framework/express");
const ExpressFramework = require("../../dist/framework/express");

const Fastify = require("fastify");
const FastifyFramework = require("../../dist/framework/fastify");
const { verifySession: fastifyVerifySession } = require("../../dist/recipe/session/framework/fastify");

const HapiFramework = require("../../dist/framework/hapi");
const Hapi = require("@hapi/hapi");
const { verifySession: hapiVerifySession } = require("../../dist/recipe/session/framework/hapi");

const Koa = require("koa");
const KoaFramework = require("../../dist/framework/koa");
const Router = require("@koa/router");
const { verifySession: koaVerifySession } = require("../../dist/recipe/session/framework/koa");

const loopbackRoutes = [
    {
        path: "/create",
        method: "post",
        verifySession: false,
    },
    {
        path: "/create-throw",
        method: "post",
        verifySession: false,
    },
    {
        path: "/session/verify",
        method: "post",
        verifySession: true,
    },
    {
        path: "/session/verify/optionalCSRF",
        method: "post",
        verifySession: true,
        verifySessionOpts: { antiCsrfCheck: false },
    },
    {
        path: "/session/revoke",
        method: "post",
        verifySession: true,
    },
];

module.exports.addCrossFrameworkTests = (getTestCases, { allTokenTransferMethods } = {}) => {
    if (allTokenTransferMethods) {
        addTestCases("header");
        addTestCases("cookie");
    } else {
        addTestCases("cookie");
    }

    function addTestCases(tokenTransferMethod) {
        describe(`express w/ auth-mode=${tokenTransferMethod}`, () => {
            let app;
            beforeEach(async () => {
                await killAllST();
                await setupST();
                ProcessState.getInstance().reset();
                app = undefined;
            });

            after(async function () {
                await killAllST();
                await cleanST();
            });

            getTestCases(
                async ({ stConfig, routes }) => {
                    await startST();

                    SuperTokens.init(stConfig);

                    app = express();

                    app.use(ExpressFramework.middleware());

                    for (const route of routes) {
                        const handlers = [
                            (req, res, next) =>
                                route.handler(
                                    ExpressFramework.wrapRequest(req),
                                    ExpressFramework.wrapResponse(res),
                                    next
                                ),
                        ];
                        if (route.verifySession) {
                            handlers.unshift(expressVerifySession(route.verifySessionOpts));
                        }
                        if (route.method === "get") {
                            app.get(route.path, ...handlers);
                        } else if (route.method === "post") {
                            app.post(route.path, ...handlers);
                        } else {
                            throw new Error("UNKNOWN METHOD");
                        }
                    }

                    app.use(ExpressFramework.errorHandler());
                },
                ({ method, path, headers }) => {
                    const req = method === "post" ? request(app).post(path) : request(app).get(path);
                    for (const key of Object.keys(headers)) {
                        req.set(key, headers[key]);
                    }
                    return new Promise((resolve) =>
                        req.end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                    );
                },
                tokenTransferMethod
            );
        });

        describe(`fastify w/ auth-mode=${tokenTransferMethod}`, () => {
            let server;
            beforeEach(async () => {
                await killAllST();
                await setupST();
                ProcessState.getInstance().reset();
                server = undefined;
            });

            afterEach(async function () {
                try {
                    await server.close();
                } catch (err) {}
            });

            after(async function () {
                await killAllST();
                await cleanST();
            });

            getTestCases(
                async ({ stConfig, routes }) => {
                    await startST();

                    SuperTokens.init({
                        framework: "fastify",
                        ...stConfig,
                    });

                    server = Fastify();

                    await server.register(FastifyFramework.plugin);
                    server.setErrorHandler(FastifyFramework.errorHandler());
                    for (const route of routes) {
                        const handlers = [
                            (req, res) =>
                                route.handler(
                                    FastifyFramework.wrapRequest(req),
                                    FastifyFramework.wrapResponse(res),
                                    (err) => {
                                        throw err;
                                    }
                                ),
                        ];
                        if (route.verifySession) {
                            handlers.unshift(fastifyVerifySession(route.verifySessionOpts));
                        }
                        if (route.method === "get") {
                            server.get(route.path, ...handlers);
                        } else if (route.method === "post") {
                            server.post(route.path, ...handlers);
                        } else {
                            throw new Error("UNKNOWN METHOD");
                        }
                    }
                },
                ({ method, path, headers }) => {
                    return server.inject({
                        method,
                        url: path,
                        headers,
                    });
                },
                tokenTransferMethod
            );
        });

        describe(`hapi w/ auth-mode=${tokenTransferMethod}`, () => {
            let server;
            beforeEach(async () => {
                await killAllST();
                await setupST();
                ProcessState.getInstance().reset();
                server = undefined;
            });

            afterEach(async function () {
                try {
                    await server.close();
                } catch (err) {}
            });

            after(async function () {
                await killAllST();
                await cleanST();
            });

            getTestCases(
                async ({ stConfig, routes }) => {
                    await startST();

                    SuperTokens.init({
                        framework: "hapi",
                        ...stConfig,
                    });

                    server = Hapi.server({
                        port: 3000,
                        host: "localhost",
                    });

                    for (const route of routes) {
                        server.route({
                            method: route.method,
                            path: route.path,
                            handler: async (req, res) => {
                                await route.handler(
                                    HapiFramework.wrapRequest(req),
                                    HapiFramework.wrapResponse(res),
                                    (err) => {
                                        throw err;
                                    }
                                );
                                return "";
                            },

                            options: {
                                pre: route.verifySession ? [{ method: hapiVerifySession() }] : [],
                            },
                        });
                    }
                    await server.register(HapiFramework.plugin);

                    await server.initialize();
                },
                ({ method, path, headers }) => {
                    return server.inject({
                        method,
                        url: path,
                        headers,
                    });
                },
                tokenTransferMethod
            );
        });

        describe(`koa w/ auth-mode=${tokenTransferMethod}`, () => {
            let app, server;
            beforeEach(async () => {
                await killAllST();
                await setupST();
                ProcessState.getInstance().reset();
                app = undefined;
                server = undefined;
            });

            afterEach(async function () {
                try {
                    await server.close();
                } catch (err) {}
            });

            after(async function () {
                await killAllST();
                await cleanST();
            });

            getTestCases(
                async ({ stConfig, routes }) => {
                    await startST();

                    SuperTokens.init({
                        framework: "koa",
                        ...stConfig,
                    });

                    app = new Koa();
                    const router = new Router();
                    app.use(KoaFramework.middleware());

                    for (const route of routes) {
                        const handlers = [
                            (ctx) =>
                                route.handler(KoaFramework.wrapRequest(ctx), KoaFramework.wrapResponse(ctx), (err) => {
                                    throw err;
                                }),
                        ];
                        if (route.verifySession) {
                            handlers.unshift(koaVerifySession(route.verifySessionOpts));
                        }
                        if (route.method === "get") {
                            router.get(route.path, ...handlers);
                        } else if (route.method === "post") {
                            router.post(route.path, ...handlers);
                        } else {
                            throw new Error("UNKNOWN METHOD");
                        }
                    }

                    app.use(router.routes());
                    server = app.listen(9999);
                },
                ({ method, path, headers }) => {
                    const req = method === "post" ? request(server).post(path) : request(server).get(path);
                    for (const key of Object.keys(headers)) {
                        req.set(key, headers[key]);
                    }
                    return new Promise((resolve) =>
                        req.end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                    );
                },
                tokenTransferMethod
            );
        });

        describe(`loopback w/ auth-mode=${tokenTransferMethod}`, () => {
            let app;
            beforeEach(async () => {
                await killAllST();
                await setupST();
                ProcessState.getInstance().reset();
                app = require("./loopback-server/index.js");
            });

            afterEach(async function () {
                try {
                    await app.stop();
                } catch (err) {}
            });

            after(async function () {
                await killAllST();
                await cleanST();
            });

            getTestCases(
                async ({ stConfig, routes }) => {
                    await startST();

                    SuperTokens.init({
                        framework: "loopback",
                        ...stConfig,
                    });

                    for (const route of routes) {
                        const matchingRoute = loopbackRoutes.find((r) => r.path === route.path);
                        if (
                            matchingRoute === undefined ||
                            matchingRoute.method !== route.method ||
                            !!matchingRoute.verifySession !== !!route.verifySession ||
                            JSON.stringify(matchingRoute.verifySessionOpts) !==
                                JSON.stringify(matchingRoute.verifySessionOpts)
                        ) {
                            throw new Error(
                                "No matching route in loopback-server. Please implement it or skip this test"
                            );
                        }
                    }

                    await app.start();
                },
                ({ method, path, headers }) => {
                    const req =
                        method === "post"
                            ? request("http://localhost:9876").post(path)
                            : request("http://localhost:9876").get(path);
                    for (const key of Object.keys(headers)) {
                        req.set(key, headers[key]);
                    }
                    return new Promise((resolve) =>
                        req.end((err, res) => {
                            if (err) {
                                resolve(undefined);
                            } else {
                                resolve(res);
                            }
                        })
                    );
                },
                tokenTransferMethod
            );
        });
    }
};
