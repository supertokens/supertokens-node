#!/bin/bash

wget https://download.java.net/java/GA/jdk15.0.1/51f4f36ad4ef43e39d0dfdbaf6549e32/9/GPL/openjdk-15.0.1_linux-x64_bin.tar.gz
mkdir /usr/java
mv openjdk-15.0.1_linux-x64_bin.tar.gz /usr/java  
cd /usr/java
tar -xzvf openjdk-15.0.1_linux-x64_bin.tar.gz
rm openjdk-15.0.1_linux-x64_bin.tar.gz
ln -s /usr/java/jdk-15.0.1/bin/java /usr/bin/java
ln -s /usr/java/jdk-15.0.1/bin/javac /usr/bin/javac