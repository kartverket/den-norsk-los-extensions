# Den Norske Los extensions
Directus extensions for den norske los

## Setup
These are source files for development.
Finished extensions are compiled VueJS files, building on this: https://github.com/directus/extension-toolkit

They can be developed and tested by building them directly into a local Directus instance.

### Development setup
Create the folders for the plugins in your local directus/public/extensions/custom/interfaces

Copy the compiled code. If you want to continuously test it:

* Do an npm install in the plugin folder, such as directus-ssr-search
* Change the postbuild.sh file to point to your correct plugin directory (in two places)
* Create your own script for development that runs build, then does the extension_move script to move the files. 

### Production setup
* Create the folders for the plugins in directus/public/extensions/custom/interfaces
* Copy the compiled code from the dev/test servers similar directories. 
* Verify the plugins work
