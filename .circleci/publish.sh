version=$(cat ../package.json | jq .version | tr -d '"')
isLatest=`curl -s -X GET \
"https://api.supertokens.io/0/driver/latest/check?password=$SUPERTOKENS_API_KEY&version=$version&name=node" \
-H 'api-version: 0'`
if [[ `echo $isLatest | jq .isLatest` == "true" ]]
then
    cd ..
    npm publish --tag latest
else
    cd ..
    npm publish --tag version-$version
fi