echo "Starting tests for CDI $1";

if [ -z "$SUPERTOKENS_API_KEY" ]; then
    echo "SUPERTOKENS_API_KEY not set"
    exit 1
fi

coreDriverVersion=$1
coreDriverVersion=`echo $coreDriverVersion | tr -d '"'`

coreFree="null"
if [ -f cdi-core-map.json ]
then
    cat cdi-core-map.json
    echo "coreDriverVersion: $coreDriverVersion"

    coreBranchName=`cat cdi-core-map.json | jq -r '.["'$coreDriverVersion'"]'`
    if [ "$coreBranchName" != "null" ]
    then
        coreFree=$coreDriverVersion
    fi
fi

if [ "$coreFree" == "null" ]
then
    coreFree=`curl -s -X GET \
    "https://api.supertokens.io/0/core-driver-interface/dependency/core/latest?password=$SUPERTOKENS_API_KEY&planType=FREE&mode=DEV&version=$coreDriverVersion&driverName=node" \
    -H 'api-version: 1'`
    if [[ `echo $coreFree | jq .core` == "null" ]]
    then
        echo "fetching latest X.Y version for core given core-driver-interface X.Y version: $coreDriverVersion, planType: FREE gave response: $coreFree. Please make sure all relevant cores have been pushed."
        exit 1
    fi
    coreFree=$(echo $coreFree | jq .core | tr -d '"')
fi

cd ..
./test/testExports.sh
if [[ $? -ne 0 ]]
then
    echo "export test failed... exiting!"
    exit 1
fi
cd .circleci

./setupAndTestWithFreeCore.sh $coreFree $coreDriverVersion
if [[ $? -ne 0 ]]
then
    echo "test failed... exiting!"
    exit 1
fi
rm -rf ../../supertokens-root