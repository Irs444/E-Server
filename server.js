require("dotenv").config();
var express = require("express");
var app = express();
var mongoose = require("mongoose");
var config = require("./config/config");
var fs = require("fs");
var port = process.env.PORT || 8090; // set our port

const aesWrapper = require("./app/libs/aes-wrapper");
const rsaWrapper = require("./app/libs/rsa-wrapper");
rsaWrapper.initLoadServerKeys(__dirname);
rsaWrapper.serverExampleEncrypt();

global.mediaProfilePath = __dirname + "/media/profileImages";
global.mediaPath = __dirname + "/media";
global.uploadPath = __dirname + "/uploads";

global.AESKey = aesWrapper.generateKey();

// Connect to mongodb
var connect = function() {
  var options = {
    keepAlive: 1,
    useMongoClient: true,
  };

  mongoose.connect(config.db, options);
};
console.log({ connect }, "-----connect--------");
connect();
mongoose.connection.on("error", console.log);
mongoose.connection.on("disconnected", connect);

// Bootstrap models
fs.readdirSync(__dirname + "/app/models").forEach(function(file) {
  console.log({ file });
  if (~file.indexOf(".js")) require(__dirname + "/app/models/" + file);
});

// Bootstrap application settings
require("./config/express")(app);

// Bootstrap routes
var router = express.Router();
require("./config/routes")(router);

app.use("/api", router);
app.use("/media", express.static("media"));

var server = app.listen(port);

console.log("API started, Assigned port : " + port);

//Bootstrap sockets
const io = require("socket.io")(server);
require("./config/socket")(io, aesWrapper, rsaWrapper);

module.exports = app;
