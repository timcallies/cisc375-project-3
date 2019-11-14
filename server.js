// Built-in Node.js modules
var fs = require('fs')
var path = require('path')

// NPM modules
var express = require('express')
var sqlite3 = require('sqlite3')

// Initialize the server
var app = express();
var port = 8000;
var server = app.listen(port);
console.log("Server running on port "+port);