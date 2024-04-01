#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm use 14

echo "Starting tests for CDI $1";

if [ -z "$SUPERTOKENS_API_KEY" ]; then
    echo "SUPERTOKENS_API_KEY not set"
    exit 1
fi

coreDriverVersion=$1
coreDriverVersion=`echo $coreDriverVersion | tr -d '"'`

coreFree=`curl -s -X GET \
"https://api.supertokens.io/0/core-driver-interface/dependency/core/latest?password=$SUPERTOKENS_API_KEY&planType=FREE&mode=DEV&version=$coreDriverVersion" \
-H 'api-version: 0'`
if [[ `echo $coreFree | jq .core` == "null" ]]
then
    echo "fetching latest X.Y version for core given core-driver-interface X.Y version: $coreDriverVersion, planType: FREE gave response: $coreFree. Please make sure all relevant cores have been pushed."
    exit 1
fi
coreFree=$(echo $coreFree | jq .core | tr -d '"')

./setupAndTestWithFreeCore.sh $coreFree $coreDriverVersion
if [[ $? -ne 0 ]]
then
    echo "test failed... exiting!"
    exit 1
fi
rm -rf ../../supertokens-root