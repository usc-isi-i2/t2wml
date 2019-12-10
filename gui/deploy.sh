#!/bin/sh

# paths of frontend @react
BUILD_FOLDER="./build"

# paths of backend @flask
STATIC_FOLDER="../t2wml-gui"
TEMPLATE_FOLDER="../templates"

# remove previous files
rm -rf $STATIC_FOLDER/*

# copy and paste new gui files
cp -r $BUILD_FOLDER/* $STATIC_FOLDER

# move template files into corresponding folder
# mv $STATIC_FOLDER/*.html $TEMPLATE_FOLDER
find $STATIC_FOLDER -iname "*.html" -type f -print -exec mv {} $TEMPLATE_FOLDER \;
