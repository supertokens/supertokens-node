# Contributing

We're so excited you're interested in helping with SuperTokens! We are happy to help you get started, even if you don't have any previous open-source experience :blush:

## New to Open Source?

1. Take a look at [How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)
2. Go thorugh the [SuperTokens Code of Conduct](https://github.com/supertokens/supertokens-node/blob/master/CODE_OF_CONDUCT.md)

## Where to ask Questions?

1. Check our [Github Issues](https://github.com/supertokens/supertokens-node/issues) to see if someone has already answered your question.
2. Join our community on [Discord](https://supertokens.com/discord) and feel free to ask us your questions

## Development Setup

You will need to setup the `supertokens-core` in order to to run the `supertokens-node` tests, you can setup `supertokens-core` by following this [guide](https://github.com/supertokens/supertokens-core/blob/master/CONTRIBUTING.md#development-setup)  
**Note: If you are not contributing to the `supertokens-core` you can skip steps 1 & 4 under Project Setup of the `supertokens-core` contributing guide.**

### Prerequisites

-   OS: Linux or macOS
-   Nodejs & npm
-   IDE: [VSCode](https://code.visualstudio.com/download)(recommended) or equivalent IDE

### Project Setup

1. Fork the [supertokens-node](https://github.com/supertokens/supertokens-node) repository
2. Clone the forked repository in the parent directory of the previously setup `supertokens-root`.  
   `supertokens-node` and `supertokens-root` should exist side by side within the same parent directory
3. `cd supertokens-node`
4. Install the project dependencies  
   `npm i -d`
5. Install the dependencies inside `test/with-typescript`  
   `cd test/with-typescript && npm i && cd ../..`
6. Add git pre-commit hooks  
   `npm run set-up-hooks`

## Modifying Code

1. Open the `supertokens-node` project in your IDE and you can start modifying the code
2. After modifying the code, build your project to implement your changes  
   `npm run build-pretty`

## Testing

1. Navigate to the `supertokens-root` repository
2. Start the testing environment  
   `./startTestingEnv --wait`
3. Navigate to the `supertokens-node` repository  
   `cd ../supertokens-node/`
4. Run all tests (make sure to have node version >= 16.20.0 and < 17.0.0)
   `INSTALL_PATH=../supertokens-root npm test`
5. If all tests pass the output should be:  
   ![node tests passing](https://github.com/supertokens/supertokens-logo/blob/master/images/supertokens-node-tests-passing.png)
6. Navigate to the `test-server` folder within the `supertokens-node` project:
   `cd ./test/test-server/`
7. Install the project dependencies:  
   `npm install`
8. Start the server:
   `npm run start`
9. In the `supertokens-node` root folder, open the `frontendDriverInterfaceSupported.json` file and note the latest version supported. This version will be used to check out the correct version of the `backend-sdk-testing` project.
10. Fork the [backend-sdk-testing](https://github.com/supertokens/backend-sdk-testing) repository.
11. Clone your forked repository into the parent directory of the `supertokens-root` project. Both `supertokens-root` and `backend-sdk-testing` should exist side by side within the same parent directory.
12. Change to the `backend-sdk-testing` directory:
    `cd backend-sdk-testing`
13. Check out the supported FDI version to be tested (as specified in `frontendDriverInterfaceSupported.json`):
    `git checkout <FDI-version>`
14. Install dependencies and build the project:
    `npm install && npm run build-pretty`
15. Run all tests (make sure to have node version >= 16.20.0 and < 17.0.0):
    `INSTALL_PATH=../supertokens-root npm test`

### To be able to run and debug tests from vscode

1. Install the extension - https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter
2. Add the following to your vscode settings:
    ```json
    {
        // ...,
        "mochaExplorer.env": {
            "TEST_MODE": "testing",
            "INSTALL_PATH": "../supertokens-root"
        }
    }
    ```
3. In `lib/tsconfig.json`, change `"sourceMap"` to `true`
4. Run `npm run build`

You should now be able to see tests on the VSCode's testing panel and run/debug from there.

## Pull Request

1. Before submitting a pull request make sure all tests have passed
2. Reference the relevant issue or pull request and give a clear description of changes/features added when submitting a pull request
3. Make sure the PR title follows [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) specification

## SuperTokens Community

SuperTokens is made possible by a passionate team and a strong community of developers. If you have any questions or would like to get more involved in the SuperTokens community you can check out:

-   [Github Issues](https://github.com/supertokens/supertokens-node/issues)
-   [Discord](https://supertokens.com/discord)
-   [Twitter](https://twitter.com/supertokensio)
-   or [email us](mailto:team@supertokens.com)

Additional resources you might find useful:

-   [SuperTokens Docs](https://supertokens.com/docs/community/getting-started/installation)
-   [Blog Posts](https://supertokens.com/blog/)

## Implementing RecipeInterfaces

-   Make sure all CRUD operations are available on the objects of that recipe
-   Make sure the implementation of that interface takes types imports from the `index.ts` file of that recipe. This is so that if a user wants to copy / paste that code into their project, they can do so via the normal import statement.

## Implementing APIInterfaces

-   Make sure the implementation of that interface takes types imports from the `index.ts` file of that recipe. This is so that if a user wants to copy / paste that code into their project, they can do so via the normal import statement.

## Generating docs

This will generate the API docs in a folder called `docs`

```
npm run build-docs
```
