#!/bin/sh
browserify src/main.js -t --debug -o 'bundle.js'
./node_modules/babel-cli/bin/babel.js bundle.js -o bundle.es2015.js 
