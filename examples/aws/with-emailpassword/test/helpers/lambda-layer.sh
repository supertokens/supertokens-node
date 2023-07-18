mkdir lambda && cd lambda
npm init -y
npm i -s @middy/core @middy/http-cors
npm i --save 'git+ssh://git@github.com:supertokens/supertokens-node.git#'$CURR_BRANCH
mkdir nodejs
cp -r node_modules nodejs
cp package.json nodejs
cp package-lock.json nodejs
zip -r supertokens-node.zip nodejs/
