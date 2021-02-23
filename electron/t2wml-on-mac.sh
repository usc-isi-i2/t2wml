#!/usr/bin/env bash
#
# Adapted from Visual Studio Code
#
# This file is used for running t2wml from the Mac terminal. We can't link to the t2wml executable,
# as it needs to be run not through a link but directly. This script is placed in .../t2wml.app/Contents/Resources, and needs to run
# t2wml from .../t2wml.app/Contents/MacOS/t2wml

function realpath() { python -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$0"; }
CONTENTS="$(dirname "$(dirname "$(realpath "$0")")")"
EXECUTABLE="$CONTENTS/MacOS/t2wml"
$EXECUTABLE $@ &

