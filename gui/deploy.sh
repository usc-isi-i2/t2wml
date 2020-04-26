#!/bin/sh

# paths of frontend @react
BUILD_FOLDER="./build"

# paths of backend @flask
STATIC_FOLDER="../t2wml-gui"
TEMPLATE_FOLDER="../templates"

echo "Removing static folder"
# remove previous files
rm -rf $STATIC_FOLDER/*

echo "Copying from build folder"
# copy and paste new gui files
cp -r $BUILD_FOLDER/* $STATIC_FOLDER

echo "Copying all templates to template folder as well"
# move template files into corresponding folder
# mv $STATIC_FOLDER/*.html $TEMPLATE_FOLDER
# find $STATIC_FOLDER -iname "*.html" -type f -print -exec mv {} $TEMPLATE_FOLDER \;
# On Windows, sometime find is the right sh find, sometimes it's the Windows find. Just use mv instead,
# as we're going to get read of this deployment script soon anyway
mv $STATIC_FOLDER/*.html $TEMPLATE_FOLDER