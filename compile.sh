#!/bin/bash
npm install electron-builder --save-dev
sudo npm install electron-packager -g
electron-packager . OMCRSControl --all
