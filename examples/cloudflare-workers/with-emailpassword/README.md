![SuperTokens banner](https://raw.githubusercontent.com/supertokens/supertokens-logo/master/images/Artboard%20%E2%80%93%2027%402x.png)

# SuperTokens EmailPassword with Cloudflare Workers (HonoJS) and Create React App

This demo app uses HonoJS with Cloudflare Workers for the backend server. We use [Wrangler](https://developers.cloudflare.com/workers/wrangler/) in the backend server to simulate the Cloudflare Worker runtime. For the frontend, we use Create React App.

## Project setup

Clone the repo, enter the directory, and use `npm` to install the project dependencies:

```bash
git clone https://github.com/supertokens/supertokens-node
cd supertokens-node/examples/cloudflare-workers/with-emailpassword
npm install
```

## Run the demo app

This compiles and serves the React app and starts the backend API server on port 3001.

```bash
npm run start
```

The app will start on `http://localhost:3000`
