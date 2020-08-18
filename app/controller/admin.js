var cryptography = require("../libs/cryptography");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var session = require("../libs/session");
var StaffMember = mongoose.model("staff-member");
var Dealer = mongoose.model("dealer");
var Session = mongoose.model("session");
var config = require("../../config/config");
var randomstring = require("randomstring");
const aesWrapper = require("../libs/aes-wrapper");
const async = require("async");
const moment = require("moment");
console.log(
  "process.env.DEFAULT_MEMBER_CONTACT",
  process.env.DEFAULT_MEMBER_CONTACT
);

Dealer.findOne({
  contactNumber: process.env.DEFAULT_MEMBER_CONTACT,
}).exec((err, dealer) => {
  if (!err && !dealer) {
    var newDealer = new Dealer({
      name: "Super Admin",
      contactNumber: process.env.DEFAULT_MEMBER_CONTACT,
      // dealerCode: process.env.DEFAULT_DEALER_CODE.toString(),
      email: process.env.DEFAULT_MEMBER,
    }).save(function(err, result) {
      console.log(
        "process.env.DEFAULT_MEMBER_CONTACT",
        process.env.DEFAULT_MEMBER_CONTACT
      );

      if (err) {
        console.log("error while creating default staffMember ", err);
      } else {
        console.log("-----------newDealer---", { newDealer });
        console.log("-----------admin---", { result });
        StaffMember.findOne({
          email: process.env.DEFAULT_MEMBER,
        }).exec((err, staffMember) => {
          console.log("-----------admin---", { staffMember });
          if (!err && !staffMember) {
            new StaffMember({
              name: "Super Admin",
              email: process.env.DEFAULT_MEMBER,
              accessLevel: 1,
              dealerId: result._id,
              password: cryptography.encrypt(process.env.DEFAULT_PASSWORD),
            }).save((err) =>
              console.log("error while creating default staffMember ", err)
            );
          }
        });
      }
    });
  }
}); /*------- create default super admin  --------*/

console.log(cryptography.decrypt("28bef68237637b77"));

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
  router.route("/admin/login").post(methods.adminLogin);
  router.route("/dealers/list").get(session.checkToken, methods.getDealersList);
  router
    .route("/dealers")
    .get(session.checkToken, session.checkSuperAdmin, methods.getDealers)
    .post(session.checkToken, session.checkSuperAdmin, methods.createDealer)
    .put(session.checkToken, session.checkSuperAdmin, methods.updateDealer)
    .delete(session.checkToken, methods.deactivateDealerId);
};

/*======================================
***   admin login api for admins  ***
========================================*/

methods.adminLogin = function(req, res) {
  //Check for POST request errors.
  req.checkBody("email", "email code is required.").notEmpty();
  req.checkBody("password", "password code is required.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.status = 400;
    response.errors = errors;
    response.memberMessage = "Validation errors";
    return SendResponse(res);
  } else {
    //Database functions here
    console.log("body", req.body);
    console.log("AESKey", AESKey);
    // req.body.password = aesWrapper.decrypt(AESKey, req.body.password);
    console.log("body", req.body);
    StaffMember.findOne({
      $or: [{ email: req.body.email }, { contactNumber: req.body.email }],
    })
      .populate("dealerId")
      .exec(function(err, staffMember) {
        if (err) {
          //send response to client
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.data = null;
          response.memberMessage = "Some server error has occurred.";
          return SendResponse(res);
        } else if (!staffMember) {
          //send response to client
          response.error = true;
          response.status = 400;
          response.errors = null;
          response.data = null;
          response.memberMessage = "Member doesn't exists.";
          return SendResponse(res);
        } else {
          console.log(cryptography.decrypt(staffMember.password));
          if (
            staffMember.password !== cryptography.encrypt(req.body.password)
          ) {
            //send response to client
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.data = null;
            response.memberMessage = "staffMember password is incorrect.";
            return SendResponse(res);
          } else {
            var token = jwt.sign(
              {
                email: req.body.email,
              },
              config.sessionSecret,
              {
                expiresIn: 60 * 120,
              }
            );

            Session.findOneAndUpdate(
              {
                staffMemberId: staffMember._id,
              },
              {
                authToken: token,
                createdAt: new Date(),
              },
              {
                upsert: true,
              }
            ).exec((err) => {
              if (err) {
                //send response to client
                response.error = true;
                response.status = 500;
                response.errors = err;
                response.memberMessage = "Some server error has occurred.";
                response.data = null;
                return SendResponse(res);
              } else {
                //send response to client
                response.error = false;
                response.status = 200;
                response.errors = null;
                response.memberMessage = "You are logged in successfully.";
                response.data = {
                  staffMember: staffMember,
                  authToken: token,
                };
                return SendResponse(res);
              }
            });
          }
        }
      });
  }
};

/*-----  End of adminLogin  ------*/

/*===================================
***   create new dealer  ***
=====================================*/

methods.createDealer = (req, res) => {
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("email", "email cannot be empty.").notEmpty();
  req.checkBody("contactNumber", "contactNumber cannot be empty.").notEmpty();
  // req.checkBody("address", "address cannot be empty.").notEmpty();

  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    req.body.dealerCode = randomstring.generate({
      length: 4,
      charset: "0123456789",
    });
    Dealer.findOne({
      contactNumber: req.body.contactNumber,
    }).exec((err, dealer) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (dealer) {
        //send response to client
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage =
          "Dealer with same contact number already exists.";
        return SendResponse(res);
      } else {
        StaffMember.findOne({
          contactNumber: req.body.contactNumber,
        }).exec((err, staffMember) => {
          if (err) {
            //send response to client
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else if (staffMember) {
            //send response to client
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.data = null;
            response.memberMessage = "Same contact number already exists.";
            return SendResponse(res);
          } else {
            var dealer = new Dealer({
              ...req.body,
            });
            dealer.save((err) => {
              if (err) {
                //send response to client
                response.error = true;
                response.status = 500;
                response.errors = err;
                response.data = null;
                response.memberMessage = "Some server error has occurred.";
                return SendResponse(res);
              } else {
                staffMember = new StaffMember({
                  name: req.body.name,
                  email: req.body.email.toLowerCase(),
                  contactNumber: req.body.contactNumber,
                  password: cryptography.encrypt(req.body.dealerCode),
                  dealerId: dealer._id,
                  accessLevel: 2,
                });

                staffMember.save((err) => {
                  if (err) {
                    //send response to client
                    response.error = true;
                    response.status = 500;
                    response.errors = err;
                    response.data = null;
                    response.memberMessage = "Some server error has occurred.";
                    return SendResponse(res);
                  } else {
                    //send response to client
                    response.error = false;
                    response.status = 200;
                    response.errors = null;
                    response.data = null;
                    response.memberMessage = "dealer has created successfully.";
                    return SendResponse(res);
                  }
                });
              }
            });
          }
        });
      }
    });
  }
};

/*-----  End of createdealer  ------*/

/*=====================================
***   get list of dealers info  ***
=======================================*/

methods.getDealersList = (req, res) => {
  var query = { active: 1 };

  Dealer.find({}, { dealerCode: 1, _id: 1, name: 1 })
    .sort({
      _id: 1,
    })
    .lean()
    .exec((err, dealers) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else {
        //send response to client
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = dealers;
        // response.memberMessage = "List of dealers fetched successfully.";
        return SendResponse(res);
      }
    });
};

/*-----  End of getDealersList  ------*/

/*=====================================
***   get list of dealers  ***
=======================================*/

methods.getDealers = async (req, res) => {
  var query = { active: req.query.dealerType === "deactivated" ? 0 : 1 };
  query["$and"] = [];
  if (req.query.searchText && req.query.searchText !== "") {
    query["$and"].push({
      $or: [
        {
          name: {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i",
          },
        },
        {
          contactNumber: {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i",
          },
        },
      ],
    });
  }
  if (req.query.startDate && req.query.endDate) {
    let createdAtGTE = new Date(
      moment(req.query.startDate)
        .utc("0530")
        .format()
    );
    let createdAtLTE = new Date(
      moment(req.query.endDate)
        .utc("0530")
        .format()
    );
    query["$and"].push({
      createdAt: {
        $gte: createdAtGTE,
        $lte: createdAtLTE,
      },
    });
  }
  if (query["$and"] && query["$and"].length == 0) {
    delete query["$and"];
  }
  console.log({ query }, query["$and"]);
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;
  Dealer.find(query)
    .populate("staffMemberId")
    .sort({
      createdAt: -1,
    })
    .limit(limit)
    .skip(page * limit)
    .lean()
    .exec((err, dealers) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else {
        Dealer.count(query, async function(err, totalRecords) {
          if (err) {
            //send response to client
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.memberMessage = "Some server error has occurred.";
            response.data = null;
            return SendResponse(res);
          } else {
            //send response to client
            async.mapSeries(
              dealers,
              async function(dealer, next) {
                const dealerId = dealer._id;
                console.log({ dealer });
                console.log({ dealerId });
                const totalMember = await StaffMember.find({
                  dealerId: dealerId,
                  accessLevel: 3,
                });
                console.log({ totalMember });
                dealer["totalMember"] = totalMember;
                return dealer;
              },
              function(err, result) {
                if (err) {
                  response.error = true;
                  response.status = 500;
                  response.errors = err;
                  response.memberMessage = "Some server error has occurred..";
                  response.data = null;
                  return SendResponse(res);
                } else {
                  response.error = false;
                  response.status = 200;
                  response.errors = null;
                  response.data = result;
                  response.totalRecords = totalRecords;
                  response.memberMessage =
                    "List of dealers fetched successfully.";
                  return SendResponse(res);
                }
              }
            );
          }
        });
      }
    });
};

/*-----  End of getdealers  ------*/

/*========================================
***   update existnig dealer  ***
==========================================*/

methods.updateDealer = (req, res) => {
  req.checkBody("dealerId", "dealerId cannot be empty.").notEmpty();
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("contactNumber", "contactNumber cannot be empty.").notEmpty();
  // req.checkBody("address", "address cannot be empty.").notEmpty();
  req.checkBody("email", "email cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    Dealer.findOne({
      _id: req.body.dealerId,
    }).exec((err, dealer) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (!dealer) {
        //send response to client
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "dealer not found.";
        return SendResponse(res);
      } else {
        Dealer.findOne({
          _id: {
            $ne: dealer._id,
          },
          contactNumber: req.body.contactNumber,
        }).exec((err, existingOrg) => {
          if (err) {
            //send response to client
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else if (existingOrg) {
            //send response to client
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.data = null;
            response.memberMessage =
              "dealer with same contact number already exists.";
            return SendResponse(res);
          } else {
            dealer.name = req.body.name;
            dealer.active = req.body.active;
            dealer.address = req.body.address;
            dealer.email = req.body.email;
            dealer.contactNumber = req.body.contactNumber;
            dealer.save((err) => {
              if (err) {
                //send response to client
                response.error = true;
                response.status = 500;
                response.errors = err;
                response.data = null;
                response.memberMessage = "Some server error has occurred.";
                return SendResponse(res);
              } else {
                //send response to client
                response.error = false;
                response.status = 200;
                response.errors = null;
                response.data = dealer;
                response.memberMessage = "dealer has updated successfully.";
                return SendResponse(res);
              }
            });
          }
        });
      }
    });
  }
};

/*-----  End of updatedealer  ------*/
/*====================================
 ***   deactivate existnig Dealer   ***
 ======================================*/
methods.deactivateDealerId = function(req, res) {
  //Check for POST request errors.
  req.checkBody("dealerId", "dealerId cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    Dealer.findOneAndUpdate({ _id: req.body.dealerId }, { active: 0 }, function(
      err
    ) {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.memberMessage = "server errors.";
        response.data = null;
        return SendResponse(res);
      } else {
        //send response to client
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.memberMessage = "Deactivate success";
        response.data = null;
        return SendResponse(res);
      }
    });
  }
};
/*-----  End of deactivateDealerId  ------*/
