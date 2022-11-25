"use strict";
(self["webpackChunkwith_angular_thirdpartyemailpassword"] =
    self["webpackChunkwith_angular_thirdpartyemailpassword"] || []).push([
    ["main"],
    {
        /***/ 5041:
            /*!**********************************!*\
  !*** ./src/app/app.component.ts ***!
  \**********************************/
            /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
                __webpack_require__.r(__webpack_exports__);
                /* harmony export */ __webpack_require__.d(__webpack_exports__, {
                    /* harmony export */ AppComponent: () => /* binding */ AppComponent,
                    /* harmony export */
                });
                /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
                    /*! @angular/core */ 3184
                );
                /* harmony import */ var _http_service__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
                    /*! ./http.service */ 5876
                );

                class AppComponent {
                    constructor(httpService) {
                        this.httpService = httpService;
                        this.title = "with-angular-thirdpartyemailpassword";
                        window.angularHttpService = httpService;
                    }
                }
                AppComponent.ɵfac = function AppComponent_Factory(t) {
                    return new (t || AppComponent)(
                        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdirectiveInject"](
                            _http_service__WEBPACK_IMPORTED_MODULE_0__.HttpService
                        )
                    );
                };
                AppComponent.ɵcmp = /*@__PURE__*/ _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineComponent"]({
                    type: AppComponent,
                    selectors: [["app-root"]],
                    decls: 2,
                    vars: 0,
                    template: function AppComponent_Template(rf, ctx) {
                        if (rf & 1) {
                            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](0, "div");
                            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](1, "!!!");
                            _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();
                        }
                    },
                    encapsulation: 2,
                });

                /***/
            },

        /***/ 6747:
            /*!*******************************!*\
  !*** ./src/app/app.module.ts ***!
  \*******************************/
            /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
                __webpack_require__.r(__webpack_exports__);
                /* harmony export */ __webpack_require__.d(__webpack_exports__, {
                    /* harmony export */ AppModule: () => /* binding */ AppModule,
                    /* harmony export */
                });
                /* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
                    /*! @angular/platform-browser */ 318
                );
                /* harmony import */ var _app_component__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
                    /*! ./app.component */ 5041
                );
                /* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
                    /*! @angular/common/http */ 8784
                );
                /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
                    /*! @angular/core */ 3184
                );

                class AppModule {}
                AppModule.ɵfac = function AppModule_Factory(t) {
                    return new (t || AppModule)();
                };
                AppModule.ɵmod = /*@__PURE__*/ _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineNgModule"]({
                    type: AppModule,
                    bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_0__.AppComponent],
                });
                AppModule.ɵinj = /*@__PURE__*/ _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjector"]({
                    providers: [],
                    imports: [
                        [
                            _angular_platform_browser__WEBPACK_IMPORTED_MODULE_2__.BrowserModule,
                            _angular_common_http__WEBPACK_IMPORTED_MODULE_3__.HttpClientModule,
                        ],
                    ],
                });
                (function () {
                    (typeof ngJitMode === "undefined" || ngJitMode) &&
                        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵsetNgModuleScope"](AppModule, {
                            declarations: [_app_component__WEBPACK_IMPORTED_MODULE_0__.AppComponent],
                            imports: [
                                _angular_platform_browser__WEBPACK_IMPORTED_MODULE_2__.BrowserModule,
                                _angular_common_http__WEBPACK_IMPORTED_MODULE_3__.HttpClientModule,
                            ],
                        });
                })();

                /***/
            },

        /***/ 5876:
            /*!*********************************!*\
  !*** ./src/app/http.service.ts ***!
  \*********************************/
            /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
                __webpack_require__.r(__webpack_exports__);
                /* harmony export */ __webpack_require__.d(__webpack_exports__, {
                    /* harmony export */ HttpService: () => /* binding */ HttpService,
                    /* harmony export */
                });
                /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
                    /*! @angular/core */ 3184
                );
                /* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
                    /*! @angular/common/http */ 8784
                );

                class HttpService {
                    constructor(http) {
                        this.http = http;
                        window.angularHttpClient = http;
                    }
                }
                HttpService.ɵfac = function HttpService_Factory(t) {
                    return new (t || HttpService)(
                        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵinject"](
                            _angular_common_http__WEBPACK_IMPORTED_MODULE_1__.HttpClient
                        )
                    );
                };
                HttpService.ɵprov = /*@__PURE__*/ _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineInjectable"]({
                    token: HttpService,
                    factory: HttpService.ɵfac,
                    providedIn: "root",
                });

                /***/
            },

        /***/ 2340:
            /*!*****************************************!*\
  !*** ./src/environments/environment.ts ***!
  \*****************************************/
            /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
                __webpack_require__.r(__webpack_exports__);
                /* harmony export */ __webpack_require__.d(__webpack_exports__, {
                    /* harmony export */ environment: () => /* binding */ environment,
                    /* harmony export */
                });
                // This file can be replaced during build by using the `fileReplacements` array.
                // `ng build` replaces `environment.ts` with `environment.prod.ts`.
                // The list of file replacements can be found in `angular.json`.
                const environment = {
                    production: false,
                };
                /*
                 * For easier debugging in development mode, you can import the following file
                 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
                 *
                 * This import should be commented out in production mode because it will have a negative impact
                 * on performance if an error is thrown.
                 */
                // import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

                /***/
            },

        /***/ 4431:
            /*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
            /***/ (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
                __webpack_require__.r(__webpack_exports__);
                /* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
                    /*! @angular/platform-browser */ 318
                );
                /* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
                    /*! @angular/core */ 3184
                );
                /* harmony import */ var _app_app_module__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
                    /*! ./app/app.module */ 6747
                );
                /* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
                    /*! ./environments/environment */ 2340
                );

                if (_environments_environment__WEBPACK_IMPORTED_MODULE_1__.environment.production) {
                    (0, _angular_core__WEBPACK_IMPORTED_MODULE_2__.enableProdMode)();
                }
                _angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__
                    .platformBrowser()
                    .bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_0__.AppModule)
                    .catch((err) => console.error(err));

                /***/
            },
    },
    /******/ (__webpack_require__) => {
        // webpackRuntimeModules
        /******/ var __webpack_exec__ = (moduleId) => __webpack_require__((__webpack_require__.s = moduleId));
        /******/ __webpack_require__.O(0, ["vendor"], () => __webpack_exec__(4431));
        /******/ var __webpack_exports__ = __webpack_require__.O();
        /******/
    },
]);
//# sourceMappingURL=main.js.map
