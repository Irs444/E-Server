var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var session = require("../libs/session");
var Member = mongoose.model("member");
var Dealer = mongoose.model("dealer");
var Session = mongoose.model("session");
var config = require("../../config/config");
var demoMember = require("../data/demoMembers");
var cryptography = require("../libs/cryptography.js");
const aesWrapper = require("../libs/aes-wrapper");
const moment = require("moment");

demoMember.map(data => {
  Member.findOne({
    contactNumber: data.contactNumber
  }).exec((err, member) => {
    if (!err && !member) {
      console.log("User", data);
      new Member({
        name: data.name,
        contactNumber: data.contactNumber,
        imeiNumber: data.imeiNumber,
        memberType: data.memberType,
        deviceId: data.deviceId,
        password: cryptography.encrypt(data.contactNumber)
      }).save(err => console.log("error while creating default user ", err));
    }
  });
});
var response = {
  error: false,
  status: 200,
  data: null,
  memberMessage: "",
  errors: null
};

var NullResponseValue = function() {
  response = {
    error: false,
    status: 200,
    data: null,
    memberMessage: "",
    errors: null
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
  router.route("/login").post(methods.memberLogin);

  router.route("/signup").post(methods.memberSignup);

  router.route("/ping").get(session.checkToken, function(req, res) {
    //send response to client
    response.error = false;
    response.status = 200;
    response.errors = null;
    response.memberMessage = "success";
    response.data = { member: req.member };
    return SendResponse(res);
  });
  router
    .route("/members")
    .get(session.checkToken, methods.getMembers)
    .delete(session.checkToken, methods.deactivateMemberId)
    .put(session.checkToken, methods.updateMember);
};
/*===============================
 ***   new member signup api  ***
 =================================*/

methods.memberSignup = function(req, res) {
  //Check for POST request errors.
  // req.checkBody("memberType", "memberType code is required.").notEmpty();
  req.checkBody("name", "fullName code is required.").notEmpty();
  req.checkBody("contactNumber", "contactNumber code is required.").notEmpty();
  req.checkBody("imeiNumber", "imeiNumber code is required.").notEmpty();
  // req.checkBody("dealerCode", "dealerCode code is required.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.status = 400;
    response.errors = errors;
    response.memberMessage = "Validation errors";
    return SendResponse(res);
  } else {
    //Database functions here
    req.body.memberType = 3;
    Member.findOne(
      {
        memberType: { $in: [req.body.memberType] },
        contactNumber: req.body.contactNumber
      },
      (err, member) => {
        if (err) {
          //send response to client
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.memberMessage = "Some server error has occurred.";
          response.data = null;
          return SendResponse(res);
        } else if (member) {
          //send response to client
          response.error = true;
          response.status = 400;
          response.errors = null;
          response.memberMessage = "Contact number already exists.";
          response.data = null;
          return SendResponse(res);
        } else {
          var dealerCode = req.body.dealerCode
            ? req.body.dealerCode
            : process.env.DEFAULT_DEALER_CODE;

          Dealer.findOne(
            {
              dealerCode: dealerCode
            },
            (err, dealer) => {
              if (err) {
                //send response to client
                response.error = true;
                response.status = 500;
                response.errors = err;
                response.memberMessage = "Some server error has occurred.";
                response.data = null;
                return SendResponse(res);
              } else if (!dealer) {
                //send response to client
                response.error = true;
                response.status = 400;
                response.errors = null;
                response.memberMessage = "Contact number already exists.";
                response.data = null;
                return SendResponse(res);
              } else {
                let member = new Member({
                  contactNumber: req.body.contactNumber,
                  imeiNumber: req.body.imeiNumber,
                  dealerId: dealer._id,
                  password: cryptography.encrypt(req.body.contactNumber),
                  name: req.body.name,
                  memberType: req.body.memberType
                });
                member.save(err => {
                  if (err) {
                    //send response to client
                    response.error = true;
                    response.status = 500;
                    response.errors = err;
                    response.memberMessage = "Some server error has occurred.";
                    response.data = null;
                    return SendResponse(res);
                  } else {
                    var token = jwt.sign(
                      {
                        contactNumber: req.body.contactNumber
                      },
                      config.sessionSecret,
                      {
                        expiresIn: 60 * 120
                      }
                    );

                    Session.findOneAndUpdate(
                      {
                        memberId: member._id
                      },
                      {
                        authToken: token,
                        createdAt: new Date()
                      },
                      {
                        upsert: true
                      },
                      err => {
                        if (err) {
                          //send response to client
                          response.error = true;
                          response.status = 500;
                          response.errors = err;
                          response.memberMessage =
                            "Some server error has occurred.";
                          response.data = null;
                          return SendResponse(res);
                        } else {
                          //send response to client
                          response.error = false;
                          response.status = 200;
                          response.errors = null;
                          response.memberMessage =
                            "You are sign in successfully.";
                          response.data = {
                            member: member,
                            authToken: token
                          };
                          return SendResponse(res);
                        }
                      }
                    );
                  }
                });
              }
            }
          );
        }
      }
    );
  }
};

/*-----  End of memberSignup  ------*/

/*===========================
 ***   member login api  ***
 =============================*/

methods.memberLogin = (req, res) => {
  console.log("------", req.body);
  req.checkBody("imeiNumber", "email cannot be empty.").notEmpty();
  req.checkBody("contactNumber", "contactNumber cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    Member.findOne({
      imeiNumber: req.body.imeiNumber // imeiNumber
    }).exec((err, member) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (!member) {
        //send response to client
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "member imei doesn't exists.";
        return SendResponse(res);
      } else {
        console.log(cryptography.decrypt(member.contactNumber));
        if (member.password !== cryptography.encrypt(req.body.contactNumber)) {
          //send response to client
          response.error = true;
          response.status = 400;
          response.errors = null;
          response.data = null;
          response.memberMessage = "member contact number is incorrect.";
          return SendResponse(res);
        } else {
          var token = jwt.sign(
            {
              contactNumber: req.body.contactNumber
            },
            config.sessionSecret,
            {
              expiresIn: 60 * 120
            }
          );

          Session.findOneAndUpdate(
            {
              memberId: member._id
            },
            {
              authToken: token,
              createdAt: new Date()
            },
            {
              upsert: true
            }
          ).exec(err => {
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
                member: member,
                authToken: token
              };
              return SendResponse(res);
            }
          });
        }
      }
    });
  }
};

/*-----  End of memberLogin  ------*/

/*=====================================
***   get list of members  ***
=======================================*/

methods.getMembers = (req, res) => {
  // Member.find({ memberType: 3 }, { _id: 1, name: 1, contactNumber: 1, imeiNumber: 1, createdAt: 1, isSubscribe: 1, memberType: 1, dealerId: 1, avatar: 1 })
  var query = {
    memberType: 3,
    active: req.query.memberType == "deactivated" ? 0 : 1
  };
  query["$and"] = [];
  console.log(req.member);
  if (req.member && req.member.memberType == 2) {
    query["$and"].push({
      dealerId: {
        $eq: req.member.dealerId
      }
    });
  }
  if (req.query.searchText && req.query.searchText !== "") {
    query["$and"].push({
      $or: [
        {
          name: {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i"
          }
        },
        {
          contactNumber: {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i"
          }
        }
      ]
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
        $lte: createdAtLTE
      }
    });
  }
  //deactivated
  if (
    req.query.memberType &&
    (req.query.memberType != "all" ||
      req.query.memberType == "subscribed" ||
      req.query.memberType == "unsubscribed")
  ) {
    query["$and"].push({
      isSubscribe: {
        $eq: req.query.memberType == "subscribed" ? 1 : 0
      }
    });
  }
  if (req.query.memberType == "renewal") {
    let expiredAtGTE = new Date(
      moment()
        .utc("0530")
        .format()
    );
    query["$and"].push({
      expiredAt: {
        $gte: expiredAtGTE
      }
    });
  }
  if (query["$and"] && query["$and"].length == 0) {
    delete query["$and"];
  }
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;
  Member.find(query, { password: 0, __v: 0 })
    .populate("dealerId")
    .sort({
      createdAt: -1
    })
    .limit(limit)
    .skip(page * limit)
    .lean()
    .exec((err, members) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else {
        Member.count(query, async function(err, totalRecords) {
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
            response.data = members;
            response.totalRecords = totalRecords;
            response.memberMessage = "List of members fetched successfully.";
            return SendResponse(res);
          }
        });
      }
    });
};

/*-----  End of getMembers  ------*/

/*========================================
***   update existnig member  ***
==========================================*/

methods.updateMember = (req, res) => {
  req.checkBody("memberId", "memberId cannot be empty.").notEmpty();
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("contactNumber", "contactNumber cannot be empty.").notEmpty();
  // req.checkBody("email", "email cannot be empty.").notEmpty();
  req.checkBody("dealerId", "dealerId cannot be empty.").notEmpty();
  req.checkBody("active", "active cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    Member.findOne({
      _id: req.body.memberId
    }).exec((err, member) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (!member) {
        //send response to client
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "member not found.";
        return SendResponse(res);
      } else {
        Member.findOne({
          _id: {
            $ne: member._id
          },
          contactNumber: req.body.contactNumber
        }).exec((err, existingMember) => {
          if (err) {
            //send response to client
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else if (existingMember) {
            //send response to client
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.data = null;
            response.memberMessage =
              "Member with same contact number already exists.";
            return SendResponse(res);
          } else {
            member.name = req.body.name;
            member.active = req.body.active;
            member.dealerId = req.body.dealerId;
            member.contactNumber = req.body.contactNumber;
            member.save(err => {
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
                response.data = member;
                response.memberMessage = "member has updated successfully.";
                return SendResponse(res);
              }
            });
          }
        });
      }
    });
  }
};

/*-----  End of updateMember  ------*/

/*====================================
 ***   deactivate MemberId  ***
 ======================================*/
methods.deactivateMemberId = function(req, res) {
  //Check for POST request errors.
  req.checkBody("memberId", "memberId cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    Member.findOneAndUpdate({ _id: req.body.memberId }, { active: 0 }, function(
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
/*-----  End of deactivateMemberId  ------*/
/*====================================
 ***   get list of scaned email  ***
 ======================================*/

methods.getScanedEmail = function(req, res) {
  var query = {};
  query["$and"] = [];
  if (req.query.searchText && req.query.searchText !== "") {
    query["$and"].push({
      $or: [
        {
          from_address: {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i"
          }
        },
        {
          subject: {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i"
          }
        }
      ]
    });
  }
  if (req.query.startDate && req.query.endDate) {
    let createdAtGTE = new Date(moment(req.query.startDate)).utc("0530");
    let createdAtLTE = new Date(moment(req.query.endDate)).utc("0530");
    query["$and"].push({
      createdAt: {
        $gte: createdAtGTE,
        $lte: createdAtLTE
      }
    });
  }
  if (query["$and"] && query["$and"].length == 0) {
    delete query["$and"];
  }

  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;
  Emails.find(query)
    // .sort({
    //   createdAt: -1
    // })
    .limit(limit)
    .skip(page * limit)
    .lean()
    .exec((err, emails) => {
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

        Emails.count(query, async function(err, totalRecords) {
          if (err) {
            //send response to client
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.memberMessage = "Some server error has occurred.";
            response.data = null;
            return SendResponse(res);
          } else {
            response.error = false;
            response.status = 200;
            response.errors = null;
            response.memberMessage = "Email list fetched successfully.";
            response.data = emails;
            response.totalRecords = totalRecords;
            return SendResponse(res);
          }
        });
      }
    });
};

/*-----  End of getScanedEmail  ------*/
