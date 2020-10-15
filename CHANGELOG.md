# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2020-09-19
### Added
- FaunaDB integration

## [2.4.1] - 2020-10-15
### Fixed
- Issue #17 - Do not clear cookies if they do not exist in the first place

## [2.4.0] - 2020-09-10
### Added
- Support for CDI 2.3 and FDI 1.2
- Fixes issue #7
- Remove compatibility with CDI 1.0

## [2.3.0] - 2020-08-05
### Added
- auth0Handler function
- `getCORSAllowedHeaders` function to be used by `cors` middleware
- Automatically adds a refresh API if the user calls the `init` function inside `app.use()`
- Support for CDI 2.2

## [2.2.2] - 2020-07-30
### Fixed
- Fixes #2 - Prevents duplicate `Access-Control-Allow-Credentials` header value

## [2.2.1] - 2020-07-14
### Fixed
- Fixed typo in exported typescript type

## [2.2.0] - 2020-06-29
### Addition
- Support for API key
- Compatibility with CDI 2.1

## [2.1.0] - 2020-06-18
### Changes
- config changes and code refactor

## [2.0.0] - 2020-05-04
### Added
- Middleware for verification, refreshing and error handling
- `revokeMultipleSessions` function
- `updateJWTPayload` function
### Changes
- Code refactor
### Breaking changes
- Changed `revokeSessionUsingSessionHandle` => `revokeSession`

## [1.1.0] - 2020-04-19
### Added
- Support for [CDI version 2.0](https://github.com/supertokens/core-driver-interface/blob/master/v2.0.0.txt)