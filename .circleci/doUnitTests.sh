coreDriverJson=`cat ../coreDriverInterfaceSupported.json`
coreDriverLength=`echo $coreDriverJson | jq ".versions | length"`
coreDriverArray=`echo $coreDriverJson | jq ".versions"`
echo "got core driver relations"

frontendDriverJson=`cat ../frontendDriverInterfaceSupported.json`
frontendDriverLength=`echo $frontendDriverJson | jq ".versions | length"`
frontendDriverArray=`echo $frontendDriverJson | jq ".versions"`
echo "got frontend driver relations"

# get driver version
version=`cat ../package.json | grep -e '"version":'`
while IFS='"' read -ra ADDR; do
    counter=0
    for i in "${ADDR[@]}"; do
        if [ $counter == 3 ]
        then
            version=$i
        fi
        counter=$(($counter+1))
    done
done <<< "$version"

someTestsRan=false
i=0
while [ $i -lt $coreDriverLength ]; do 
    coreDriverVersion=`echo $coreDriverArray | jq ".[$i]"`
    coreDriverVersion=`echo $coreDriverVersion | tr -d '"'`
    i=$((i+1))

    coreFree=`curl -s -X GET \
    "https://api.supertokens.io/0/core-driver-interface/dependency/core/latest?password=$SUPERTOKENS_API_KEY&planType=FREE&mode=DEV&version=$coreDriverVersion" \
    -H 'api-version: 0'`
    if [[ `echo $coreFree | jq .core` == "null" ]]
    then
        echo "fetching latest X.Y version for core given core-driver-interface X.Y version: $coreDriverVersion, planType: FREE gave response: $coreFree. Please make sure all relevant cores have been pushed."
        exit 1
    fi
    coreFree=$(echo $coreFree | jq .core | tr -d '"')

    someTestsRan=true
    ./setupAndTestWithFreeCore.sh $coreFree $coreDriverVersion
    if [[ $? -ne 0 ]]
    then
        echo "test failed... exiting!"
        exit 1
    fi
    rm -rf ../../supertokens-root
done

if [[ $someTestsRan = "false" ]]
then
    echo "no tests ran... failing!"
    exit 1
fi