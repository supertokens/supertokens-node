# Contributing

We’re glad that you are interested in contributing to SuperTokens 🎉
We welcome contributions of all kinds (discussions, bug fixes, features, design changes, videos, articles) and from anyone 👩‍💻🤚🏿🤚🏽🤚🏻🤚🏼🤚🏾👨‍💻.

## Folder structure

1. You will most likely want edit only the `./v2` folder, as it contains all the latest docs. The other folders are for backwards compatibility with older SDKs and docs.

2. Inside `./v2`, is a standard [Docusaurus](https://docusaurus.io/docs) project. We have set it up to be a [multi instance project](https://docusaurus.io/docs/docs-multi-instance).

## Modifying and seeing your changes

1. Go into the `v2` folder
2. Run `npm i -d`
3. Run `npm run set-up-hooks` to setup the pre-commit hooks
4. Run `npm run start`. This should open `http://localhost:3000` on your browser.
5. Makes changes to the `.md` or `.mdx` files, and see the changes on your browser instantly.
6. Issue a PR to our repo.
7. **NOTE**: If you are working on a docs that has versioning, you will need to suffix the docs name in url with `/next/` to see your changes. For example, if you are working on `community` docs and made changes to the `introduction` page, then you will need to visit: `http://localhost:3000/docs/community/next/introduction` instead of `http://localhost:3000/docs/community/introduction` to see your changes.

## Changing SEO meta tags
1. This is normally done via google sheets.
2. But for docusaurus v2, you need to go to v2 > src > themes > Layout > index.js and add the custom meta tags there.

## Writing guide
### Code snippets
- Always use ` ```tsx ` or ` ```jsx` instead of ` ```ts ` or ` ```js` so that HTML is rendered nicely as well.
- All code should be copy pasted from a working "playground" for that SDK. For example, in `supertokens-node`, we have `/test/with-typescript/index.ts` file which can be used to write any code using the SDK and whenever writing code in docs for nodeJS, you should first write it in the playground, make sure it's correct, and the copy / paste that in the docs.

### Code tabs
- Depending on the options you want to show in the tabs / sub tab, please use the correct `groupId` so that tab selections are synced. Some `groupIds`:
   - For backend language: `backendsdk`
   - For nodeJS framework: `nodejs-framework`
   - For frontend languages: `frontendsdk`
   - For `.ts` vs `.js`, use `ts-or-js`
- If there are custom wrapper components made for a type of code tab, please use that. You can find them in v2 > src > components > tabs folder:
   - For backend: `import BackendSDKTabs from "/src/components/tabs/BackendSDKTabs"`
   - For nodejs framework: `import NodeJSFrameworkSubTabs from "/src/components/tabs/NodeJSFrameworkSubTabs"`
   - For frontend: `import FrontendSDKTabs from "/src/components/tabs/FrontendSDKTabs"`
- In recipe docs, we must always use code tabs that display all options. In case there is a missing child, we will show a not supported message under that.
- Sometimes the context of the code being displayed is specific for a framework. For example, in the auth-react SDK, we will only want to show ReactJS code. In this case, you do not want to use code tabs, and instead, want to use code title.

### Heading guide
- The main title of the page (if present) should be the only element in H1.
- The other parts of the page should be divided such that users can see their sections in the correct heirarchy to the right of the page.
- In some pages (in the sdk level docs), the page starts with a code snippet (for function signature). Those should start with H2

### Showing an important / caution / danger / note message:
- Docusaurus has several admonitions that can help with this. You can find this list in v2 > change_me > introduction.mdx

### Building custom react components:
- These should go in v2 > src > components > <some-folder>

### Linking to other parts of supertokens.com site:
- For non docs links, you need to use `https://supertokens.com/*`. Otherwise the build process will fail (cause of broken link). This also adds a limitation that those links can be seen / tested only in production.

### Creating a new docs:
- Please see v2 > HOW_TO_NEW_DOCS.md

### Using Copy docs plugin
- This is a custom plugin in which one `.mdx` file's content can be copied into another by providing the location of one in another.
- A file that uses `<!-- COPY DOCS -->` is utilising this plugin.
- This should be used across recipe docs, when the content of the page is exactly the same across docs.
- An example of this can be found `v2 > community > database-setup > mysql.mdx`.
- A file can also contain a `<!-- COPY SECTION -->` comment like this:
```
<!-- COPY SECTION -->
<!-- ./emailpassword/introduction.mdx -->
<!-- 1 -->

.....

<!-- END COPY SECTION -->
```
And the contents of `./emailpassword/introduction.mdx` with the ID `1` will get copied over into that section.

### Using Copy tabs
- If your tabs have the same content as another tab you can use the copy tabs feature to copy the contents of one tab to another.
- Add `~COPY-TAB=TAB_ID` to your snippet. This will copy the contents of the tab with id `TAB_ID` to your tab.
- You can add multiple `,` seperated `TAB_ID` like `~COPY-TAB=TAB_ID_1,TAB_ID_2,TAB_ID_3` so that if the first tab id does not exist it will move on to the next one until it finds a match.

### Swizzling components:
- Docusaurus allows "swizzling" of their components so that they can be modified as per our needs. Once a component is swizzled, it's placed in the v2 > src > theme folder, and can be edited freely.
- To swizzle a component:
   - Open `docusaurus.config.js` and comment out all the custom plugins like: `"./src/plugins/reactBundle"` and `"./src/plugins/copyDocs"`.
   - Run the swizzle command: `npx docusaurus swizzle --danger "@docusaurus/theme-classic" "TODO: COMPONENT_NAME"`
   - Uncomment the two plugins that have been commented.
- To know a list of components that can be swizzled, run `npx docusaurus swizzle --danger "@docusaurus/theme-classic" "App"`

### Using variables in markdown files
There may be cases where you want to use variables in markdown files, for example:
- Multiple files have the same content except for things like import statements, class names etc
- Repetitive elements that would normally require changing multiple lines in the same file

In such cases being able to configure and use variables can save a lot of time. In order to use variables you need to:

- Declare the variables in the `v2/src/plugins/markdownVariables.json` files. To declare a variable you need to use the following structure 

```json
{
   "recipeName": {
      "variableName": "variable value"
   }
}
```

For example in order to make changes to `v2/thirdpartyemailpassword/common-customizations/sign-out.mdx` the structure would look like

```json
{
   "thirdpartyemailpassword": {
      ...
   }
}
```

- Use variables in the markdown file using the `^{variableName}` syntax. For example to use a variable in an import statement you could use

```javascript
import { signOut } from "supertokens-auth-react/recipe/^{recipeImportName}";
```

When the documentation pages are built, the variable will be replaced with the value in the JSON value. You can also use this in combination with plugins like the Copy Docs plugin explained above.

NOTE: The variable values are only used in the final HTML output, the markdown files themselves are not modified.

### Using question components
You can ask users questions and show markdown based on what they select as answers. This can be achieved by using:
```jsx
import {Question, Answer}from "/src/components/question"

<Question question="question...">
<Answer title="ans1">
...
</Answer>
<Answer title="ans2">
...
</Answer>
</Question>
```

- Use this component instead of tabs when you think that the tabs title are not obvious enough for the user to choose the right tab.
- It can also be used to guide for showing optional content. For example, some part of docs is only relevant if the user is using axios on their frontend. So we ask them if they are using axios, and if they say yes, only then we render the content, else we render something else.
- Note that using this too much might affect SEO since the useful content is hidden behind a user interaction.

### Using custom UI / pre built UI switcher
There may be pages where you want to switch between explaining how it works for pre built vs custom UI. In that case, you can display a switcher which allows the user to choose between these options. To display the switcher, update the front matter section of the mdx file to have:
```
---
show_ui_switcher: true
---
```

You can then continue to use `PreBuiltOrCustomUISwitcher` component:
```
import {PreBuiltOrCustomUISwitcher, PreBuiltUIContent, CustomUIContent} from "/src/components/preBuiltOrCustomUISwitcher"

<PreBuiltOrCustomUISwitcher>

<PreBuiltUIContent>

Content for Pre built UI

</PreBuiltUIContent>
      
Some content shown in both UIs

<CustomUIContent>

Content for Custom UI

</CustomUIContent>

</PreBuiltOrCustomUISwitcher>
```

## Building for deployment
- This only works if have access to the `supertokens-backend-website` and `main-website` repo.
- Make sure that the `main-website` repo contains the `docs` repo and the `supertokens-backend-website` repo.
- To build all docs, run the `./buildAllDocs` command.
- To only build `v2` docs, go into `v2` and run `npm run build`. If this throws an error and you still want to finish building it, then run `npm run build-ignore-errors`.
- To build non `v2` docs, run `./buildDocs <folder name>` command.

### Fixing broken links
While building, we may get broken links errors. There are different types:
- External links: Make sure to give the full path to these links
- Links to `supertokens.com`, but non docs pages: These links should be `https://supertokens.com/...`
- Internal docs links: These need to be fixed since it's most likely due to a writing error.
- `COPY DOCS` related links: Sometimes the source doc's structure may not match the destination doc. For example, the core docs in v2 > community folder are being shown in the recipes, but not in the community docs, and the pages it links to exist in the recipe docs, but not in the community docs. To fix this, we create dummy pages in the community docs like found here: `v2 > community > common-customizations > core > api-keys.mdx`

### Using code type checker
This feature allows you to type check code snippets in the docs. To use this during docs writing, you want to run:
```
CODE_TYPE_CHECK=lang1,lang2 npm run start
```
Where `lang1`, `lang2`, `langN` are the languages for which you want to check the snippets for. For example, if you want to check for `typescript`, you should run `CODE_TYPE_CHECK=typescript npm run start`, or if you want to check for Golang and TS, then you should run `CODE_TYPE_CHECK=typescript,go npm run start`. Instructions on how to setup each language will be printed out in case there is an error while typechecking.

You can even check for all languages by running
```
CODE_TYPE_CHECK=all npm run start
```

#### Adding lines for type checking only

You may need to add something to the code that is necessary for type checking but shouldn't appear in the output documentation. You can do this by adding a comment to the end of the line stating: `typecheck-only, removed from output`. Lines ending with this comment will be removed from the output but kept for type checking.

#### Tips JS / TS
- If you need to purposely tell TS to ignore errors in the next line, you can add a `// @ts-ignore` comment in your code snippets. This will make the TS checker pass. The type checking engine will also remove these from the final code output so that users don't see this unnecessarily.
- If you are working with snippets that use an older version of supertokens-node you can use a custom import for that version. For example some snippets use `supertokens-node7` as the import to fix typing. The type checking engine replaces this with `supertokens-node`. NOTE: If you need to add another node version as a custom import, please modify the type checking script to replace the import statement to use `supertokens-node`
- When working with snippets that rely on supertokens-web-js being imported as an HTML script tag, import `supertokens-web-js-script` to fix typing. The type checking engine will remove this line from the final output

#### Loading different versions of SDK to check
If you are writing docs for a new version of the SDK, you want to load that version and then run the `CODE_TYPE_CHECK=lang1,lang2 npm run start` command. In order to change the SDK version, you want to navigate to `v2/src/plugins/codeTypeChecking/<lang>Env` and the modify that env's dependency file, and install the new dependencies.

For example, if you want to test a new version of supertokens-node SDK, you should go to `v2/src/plugins/codeTypeChecking/jsEnv`, and modify `package.json` to use the new version. Then you want to run `npm i` in that dir.

#### Skipping copies

We have many documentation files that are recipe specific copies of an original. In many (but not all) cases, this can result in a single error being reported for each recipe. To avoid this, you can set the `SKIP_COPIES` environment variable to `true`. Doing this will only type-check the original versions of documents. This is off by default, because it could cause you to miss a recipe specific error. To check only on the "originals" you can:
```bash
SKIP_COPIES=true CODE_TYPE_CHECK=all npm run start
```
