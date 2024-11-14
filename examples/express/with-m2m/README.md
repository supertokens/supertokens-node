![SuperTokens banner](https://raw.githubusercontent.com/supertokens/supertokens-logo/master/images/Artboard%20%E2%80%93%2027%402x.png)

# SuperTokens M2M Demo app

In this example we showcase M2M (Machine to Machine) communication between an assistant (cli) and two services (calendar-service and note-service), both the cli and the services rely on a single auth-provider service to obtain/validate tokens. We showcase:

-   How to set up an OAuth2Provider using SuperTokens
-   How to obtain a token using the client-credentials flow
-   How to validate M2M tokens using a generic JWT library

## Project setup

You can run set up the example by running the following command:

```bash
git clone https://github.com/supertokens/supertokens-node
cd supertokens-node/examples/express/with-m2m
npm install
```

## Run the demo app

```bash
npm start
```

and then in a new terminal run:

```bash
# Please note that when running through npm, you need to add `--` before the argument list passed to the assistant cli
npm run assistant -- --help
```

OR

```bash
./assistant --help
```

## Project structure

### Allowed call flows

```
                               ┌──────────────────────┐
                               │                      │
    ┌──────────────────────────►   Calendar Service   │
    │                          │                      │
    │                          └──────────┬───────────┘
┌───┴─────┐                               │
│         │                               │
│ CLI     │                               │
│         │                             xxxxx
└───┬─────┘                               │
    │                                     │
    │                                     │
    │                          ┌──────────▼───────────┐
    │                          │                      │
    └──────────────────────────►     Note Service     │
                               │                      │
                               └──────────────────────┘
```

### Notable files

```
├── assistant-cli
    ├── src/eventFunctions.ts The functions to interact with the calendar-service
    ├── src/noteFunctions.ts The functions to interact with the note-service
    ├── src/getAccessToken.ts The function to get the access token from the auth-service
    ├── src/cli.tsx The main function to run the assistant
    ├── src/ui/* The UI components for the assistant-cli


├── auth-provider-service
    ├── config.ts The configuration for SuperTokens
    ├── setupClient.ts The function to set up the OAuth2 client used by the assistant-client
    ├── index.ts The main function to run the auth-provider-service

├── calendar-service
    ├── index.ts Sets up the APIs for calendar-service (w/ token validation and a simple in-memory DB)

├── note-service
    ├── index.ts Sets up the APIs for note-service (w/ token validation and a simple in-memory DB)
```

## How it works

In the example, we use the client credentials flow to obtain a token from the auth-provider-service and use it to call the APIs exposed by the calendar-service and note-service.

It's important to note that we have to use the right audience for the API we are trying to call. In this example, the calendar-service is expecting the audience to be `calendar-service` and the note-service is expecting the audience to be `note-service`. If we didn't validate the audience and one of the services was compromised, a malicious actor could use the tokens the compromised service receives to call the APIs exposed by the other services and impersonate the assistant-cli.

Setting minimal scopes and scope validation is similarly important, for example as a way to limit what a leaked/stolen token can be used for.

## Author

Created with :heart: by the folks at supertokens.com.

## License

This project is licensed under the Apache 2.0 license.
