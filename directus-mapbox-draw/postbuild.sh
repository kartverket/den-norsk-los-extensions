#!/bin/bash

# The purpose of this script is to do things with files generated by
# 'create-react-app' after 'build' is run.
# 1. Move files to a new directory called 'user'
#    The resulting structure is 'build/user/static/<etc>'
# 2. Update reference on generated files from
#    static/<etc>
#     to
#    user/static/<etc>
#
# More details on: https://github.com/facebook/create-react-app/issues/3824

# Browse into './build/' directory
cd dist
# Create './user/' directory
#echo '1/4 Create "user" directory'
#mkdir testing
# Find all files, excluding (through 'grep'):
# - '.',
# - the newly created directory './user/'
# - all content for the directory'./static/'
# Move all matches to the directory './user/'
echo '2/4 Move relevant files'
find . | grep -Ev '^.$|^.\/testing$|^.\/\/.+' | xargs -I{} mv -v {} /c/wamp64/www/directus/public/extensions/custom/interfaces/mapbox-gl-draw
# Browse into './user/' directory
cd /c/wamp64/www/directus/public/extensions/custom/interfaces/mapbox-gl-draw
# Find all files within the folder (not subfolders)
# Replace string 'static/' with 'user/static/' on all files that match the 'find'
# ('sed' requires one to create backup files on OSX, so we do that)
#echo '3/4 Replace file references'
#find . -type f -maxdepth 1 | LC_ALL=C xargs -I{} sed -i.backup -e 's,static/,user/static/,g' {}
# Delete '*.backup' files created in the last process
echo '4/4 Clean up'
find . -name '*.backup' -type f -delete
# Done
