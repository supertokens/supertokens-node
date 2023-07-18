mkdir lambda && cd lambda
npm init -y
npm i -s supertokens-node @middy/core @middy/http-cors
mkdir nodejs
cp -r node_modules nodejs
cp package.json nodejs
cp package-lock.json nodejs
zip -r supertokens-node.zip nodejs/
