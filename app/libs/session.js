var mongoose = require("mongoose");
var StaffMember = mongoose.model("staff-member");
var User = mongoose.model("User");
var Session = mongoose.model("session");
var UserSession = mongoose.model("UserSession");

var jwt = require("jsonwebtoken");
var config = require("../../config/config");
var session = {};

var response = {
  error: false,
  status: "",
  data: null,
  memberMessage: "",
};

var NullResponseValue = function() {
  response = {
    error: false,
    status: "",
    data: null,
    memberMessage: "",
    errors: null,
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
	Checking for token of admin staffMember
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
  // jwt.verify(token, config.sessionSecret, function(err, decoded) {
  //   console.log("22222", { err });
  //   if (err) {
  //     response.memberMessage =
  //       "Your session has been expired. Please re-login..";
  //     return SendResponse(res, 401);
  //   } else {
  Session.findOne({
    authToken: token,
  })
    .lean()
    .exec(function(err, session) {
      if (err || !session) {
        response.memberMessage =
          "Your session has been expired. Please re-login.";
        return SendResponse(res, 401);
      } else {
        StaffMember.findOne({
          _id: session.staffMemberId,
        })
          .populate("dealerId")
          .exec(function(err, staffMember) {
            if (err || !staffMember) {
              response.memberMessage =
                "Your session has been expired. Please re-login";
              return SendResponse(res, 401);
            } else {
              req.staffMember = staffMember;
              next();
            }
          });
      }
    });
  //   }
  // });
};

/*********************
	checkToken Ends
*********************/
/*********************
	Checking for token of admin staffMember
*********************/

session.checkUserToken = function(req, res, next) {
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
  UserSession.findOne({
    authToken: token,
  })
    .lean()
    .exec(function(err, session) {
      if (err || !session) {
        response.memberMessage =
          "Your session has been expired. Please re-login.";
        return SendResponse(res, 401);
      } else {
        User.findOne({
          _id: session.userId,
        })
          .populate("dealerId")
          .exec(function(err, user) {
            if (err || !user) {
              response.memberMessage =
                "Your session has been expired. Please re-login";
              return SendResponse(res, 401);
            } else {
              req.user = user;
              next();
            }
          });
      }
    });
};

/*********************
	checkUserToken Ends
*********************/

/****************************************
	Checking for token of admin staffMember
*****************************************/

session.checkOrganizerToken = function(req, res, next) {
  if (req.staffMember && req.staffMember.accessLevel == 2) {
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
	Checking for token of super admin staffMember
******************************************/
session.checkSuperAdmin = function(req, res, next) {
  if (req.staffMember && req.staffMember.accessLevel == 1) {
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
