matrixEntries=""
delim=""
while IFS=  read -r -d $'\0'; do
    matrixEntries+=$delim"{\"testPath\": \""$(echo "$REPLY" )\""}";       # or however you want to process each file
    delim=", "
done < <(find ./test -name *.test.js -print0)

matrixEntries="[$matrixEntries]"
echo $matrixEntries
