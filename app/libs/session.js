var mongoose = require("mongoose");
var Member = mongoose.model("member");
var Session = mongoose.model("session");

var jwt = require("jsonwebtoken");
var config = require("../../config/config");
var session = {};

var response = {
  error: false,
  status: "",
  data: null,
  memberMessage: ""
};

var NullResponseValue = function() {
  response = {
    error: false,
    status: "",
    data: null,
    memberMessage: "",
    errors: null
  };
  return true;
};
var SendResponse = function(res, status) {
  response.status = status || 200;
  res.status(status || 200).send(response);
  NullResponseValue();
  return;
};

/*********************
	Checking for token of admin member
*********************/

session.checkToken = function(req, res, next) {
  var bearerToken;
  var bearerHeader =
    req.headers["authorization"] || req.headers["Authorization"];
  if (typeof bearerHeader !== "undefined") {
    var bearer = bearerHeader.split(" ");
    bearerToken = bearer[1];
    req.token = bearerToken;
  }
  console.log("bearerToken", { bearerToken }, req.headers["authorization"]);
  var token = bearerToken || req.body.token || req.query.token;
  console.log("token", { token });
  jwt.verify(token, config.sessionSecret, function(err, decoded) {
    console.log("22222", { err });
    if (err) {
      response.memberMessage =
        "Your session has been expired. Please re-login..";
      return SendResponse(res, 401);
    } else {
      Session.findOne({
        authToken: token
      })
        .lean()
        .exec(function(err, session) {
          if (err || !session) {
            response.memberMessage =
              "Your session has been expired. Please re-login.";
            return SendResponse(res, 401);
          } else {
            Member.findOne({
              _id: session.memberId
            })
              .populate("dealerId")
              .exec(function(err, member) {
                if (err || !member) {
                  response.memberMessage =
                    "Your session has been expired. Please re-login";
                  return SendResponse(res, 401);
                } else {
                  req.member = member;
                  next();
                }
              });
          }
        });
    }
  });
};

/*********************
	checkToken Ends
*********************/

/****************************************
	Checking for token of admin member
*****************************************/

session.checkOrganizerToken = function(req, res, next) {
  if (req.member && req.member.memberType == 2) {
    next();
  } else {
    response.memberMessage = "You are not authorized.";
    return SendResponse(res, 401);
  }
};

/*********************
	checkToken Ends
*********************/

/*****************************************
	Checking for token of super admin member
******************************************/
session.checkSuperAdmin = function(req, res, next) {
  if (req.member && req.member.memberType == 1) {
    next();
  } else {
    response.memberMessage = "You are not authorized.";
    return SendResponse(res, 401);
  }
};

/*********************
	checkToken Ends
*********************/

module.exports = session;
