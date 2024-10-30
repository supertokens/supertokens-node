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

## Project structure (notable files/folders)

```
├── assistant-client
    ├── eventFunctions.mjs The functions to interact with the calendar-service
    ├── noteFunctions.mjs The functions to interact with the note-service
    ├── getAccessToken.mjs The function to get the access token from the auth-service
    ├── index.mjs The main function to run the assistant

├── auth-provider-service
    ├── config.ts The configuration for SuperTokens
    ├── setupClient.ts The function to set up the OAuth2 client used by the assistant-client
    ├── index.ts The main function to run the auth-provider-service

├── calendar-service
    ├── index.ts Sets up the APIs for calendar-service (w/ token validation and a simple in-memory DB)

├── note-service
    ├── index.ts Sets up the APIs for note-service (w/ token validation and a simple in-memory DB)
```

## Author

Created with :heart: by the folks at supertokens.com.

## License

This project is licensed under the Apache 2.0 license.
