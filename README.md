# drum-machine-javascript

A simple drum-machine written in javascript

It uses these great drum-samples: 

https://github.com/oramics/sampled/

You can try it out here: https://diversen.github.io/drum-machine-javascript/

## Install

    git clone https://github.com/diversen/drum-machine-javascript

Just clone this repo, and start a server inside it - og place it on a server.  

## Dev install

Install deps: 

    npm install

Build: 
    
    watchify src/main.js -o bundle.js --debug -t [ babelify --presets [ es2015 ] ]

## Licence

MIT © [Dennis Iversen](https://github.com/diversen)

