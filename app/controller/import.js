var cryptography = require("../libs/cryptography");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var session = require("../libs/session");
var StaffMember = mongoose.model("staff-member");
var validation = require("../libs/validation");

/*------- create default super admin  --------*/
// StaffMember.findOne({
//   email: process.env.DEFAULT_MEMBER
// }).exec((err, staffMember) => {
//   console.log({ staffMember })
//   if (!err && !staffMember) {
//     new StaffMember({
//       fullName: "Super Admin",
//       email: process.env.DEFAULT_MEMBER,
//       password: cryptography.encrypt(process.env.DEFAULT_PASSWORD)
//     }).save(err => console.log("error while creating default staffMember ", err));
//   }
// })
/* the response object for API
   error : true / false 
   code : contains any error code
   data : the object or array for data
   memberMessage : the message for staffMember, if any.
 */

var response = {
  error: false,
  status: 200,
  data: null,
  memberMessage: "",
  errors: null,
};

var NullResponseValue = function() {
  response = {
    error: false,
    status: 200,
    data: null,
    memberMessage: "",
    errors: null,
  };
  return true;
};

var SendResponse = function(res, status) {
  res.status(status || 200).send(response);
  NullResponseValue();
  return;
};

var methods = {};

/*
 Routings/controller goes here
 */
module.exports.controller = function(router) {
  // router.route("/import").post(session.checkToken, validation.checkValidMembers, methods.importMembers);
  router
    .route("/policy/plan/import")
    .post(
      session.checkToken,
      validation.checkValidPolicyPlan,
      methods.importPolicyPlansList
    );
};

/*=================================
***   import list of members   ***
===================================*/

methods.importPolicyPlansList = (req, res) => {
  req.checkBody("policyPlanInfo", "policyPlanInfo cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    //send response to user
    var policy = {
      policyPlan: req.body.policyPlan,
      policyPlanInfo: req.body.policyPlanInfo,
    };
    response.error = false;
    response.status = 200;
    response.errors = null;
    response.data = policy;
    response.memberMessage = "List of policy plan info fetched successfully.";
    return SendResponse(res);
  }
};

/*-----  End of importmembers  ------*/
/*=================================
***   import list of members   ***
===================================*/

methods.importMembers = (req, res) => {
  req.checkBody("members", "staffMember cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    //send response to user
    response.error = false;
    response.status = 200;
    response.errors = null;
    response.data = req.body.members;
    response.memberMessage = "List of members fetched successfully.";
    return SendResponse(res);
  }
};

/*-----  End of importmembers  ------*/
