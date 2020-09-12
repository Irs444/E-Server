var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var session = require("../libs/session");
var StaffMember = mongoose.model("staff-member");
// var Role = mongoose.model("role");
var Session = mongoose.model("session");
var Enquiry = mongoose.model("enquiry");
var config = require("../../config/config");
var demoMember = require("../data/demoMembers");
var cryptography = require("../libs/cryptography.js");
const aesWrapper = require("../libs/aes-wrapper");
const moment = require("moment");
var mail = require("../libs/mail");
var randomstring = require("randomstring");
var Mailgen = require("mailgen");

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
  router.route("/login").post(methods.memberLogin);

  router.route("/signup").post(methods.memberSignup);

  router.route("/ping").get(session.checkToken, function(req, res) {
    //send response to client

    Enquiry.find({ active: true })
      .populate("productId")
      .populate("clientId")
      .populate("staffMemberId", "name profilePicUrl")
      .sort({
        createdAt: -1,
      })
      .limit(3)
      .lean()
      .exec((err, enquiries) => {
        if (err) {
          //send response to client
          response.error = false;
          response.status = 200;
          response.errors = null;
          response.memberMessage = "success";
          response.enquiries = [];
          response.data = { staffMember: req.staffMember };
          return SendResponse(res);
        } else {
          response.error = false;
          response.status = 200;
          response.errors = null;
          response.memberMessage = "success";
          response.enquiries = enquiries;
          response.data = { staffMember: req.staffMember };
          return SendResponse(res);
        }
      });
  });
  router
    .route("/members")
    .get(session.checkToken, methods.getMembers)
    .delete(session.checkToken, methods.deactivateMemberId);
  router
    .route("/password/reset")
    .put(session.checkToken, methods.passwordReset);

  router
    .route("/staffMember")
    .get(session.checkToken, methods.getStaffMembers)
    .put(session.checkToken, methods.updateMember)
    .post(session.checkToken, methods.createMember);

  router
    .route("/staffMember/:staffMemberId/active")
    .put(session.checkToken, methods.updateStaffMemberStatus);
  // router
  //   .route("/roles")
  //   .get(session.checkToken, methods.getRoles)
  //   .put(session.checkToken, methods.updateRole)
  //   .post(session.checkToken, methods.createRole);
};
/*===============================
 ***   new staffMember signup api  ***
 =================================*/

methods.memberSignup = function(req, res) {
  //Check for POST request errors.
  // req.checkBody("accessLevel", "accessLevel code is required.").notEmpty();
  req.checkBody("name", "fullName code is required.").notEmpty();
  req.checkBody("contactNumber", "contactNumber code is required.").notEmpty();
  req.checkBody("imeiNumber", "imeiNumber code is required.").notEmpty();
  // req.checkBody("organizationCode", "organizationCode code is required.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.status = 400;
    response.errors = errors;
    response.memberMessage = "Validation errors";
    return SendResponse(res);
  } else {
    //Database functions here
    req.body.accessLevel = 3;
    StaffMember.findOne(
      {
        accessLevel: { $in: [req.body.accessLevel] },
        contactNumber: req.body.contactNumber,
      },
      (err, staffMember) => {
        if (err) {
          //send response to client
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.memberMessage = "Some server error has occurred.";
          response.data = null;
          return SendResponse(res);
        } else if (staffMember) {
          //send response to client
          response.error = true;
          response.status = 400;
          response.errors = null;
          response.memberMessage = "Contact number already exists.";
          response.data = null;
          return SendResponse(res);
        } else {
          let staffMember = new StaffMember({
            contactNumber: req.body.contactNumber,
            imeiNumber: req.body.imeiNumber,
            // organizationId: organization._id,
            password: cryptography.encrypt(req.body.contactNumber),
            name: req.body.name,
            accessLevel: req.body.accessLevel,
          });
          staffMember.save((err) => {
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
                  contactNumber: req.body.contactNumber,
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
                },
                (err) => {
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
                    response.memberMessage = "You are sign in successfully.";
                    response.data = {
                      staffMember: staffMember,
                      authToken: token,
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
};

/*-----  End of memberSignup  ------*/

/*===========================
 ***   staffMember login api  ***
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
    StaffMember.findOne({
      imeiNumber: req.body.imeiNumber, // imeiNumber
    }).exec((err, staffMember) => {
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
        response.memberMessage = "staffMember imei doesn't exists.";
        return SendResponse(res);
      } else {
        console.log(cryptography.decrypt(staffMember.contactNumber));
        if (
          staffMember.password !== cryptography.encrypt(req.body.contactNumber)
        ) {
          //send response to client
          response.error = true;
          response.status = 400;
          response.errors = null;
          response.data = null;
          response.memberMessage = "staffMember contact number is incorrect.";
          return SendResponse(res);
        } else {
          var token = jwt.sign(
            {
              contactNumber: req.body.contactNumber,
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

/*-----  End of memberLogin  ------*/
methods.passwordReset = (req, res) => {
  req.checkBody("password", "Password cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    req.body.password = cryptography.encrypt(req.body.password);
    //Database functions here
    StaffMember.findOneAndUpdate(
      {
        _id: req.staffMember._id,
      },
      { ...req.body },
      { new: true }
    ).exec((err, member) => {
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
        response.memberMessage = "Staff member not found.";
        return SendResponse(res);
      } else {
        //send response to client
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = member;
        response.memberMessage = "Password updated successfully.";
        return SendResponse(res);
      }
    });
  }
};
/*=====================================
***   get list of members  ***
=======================================*/

methods.getMembers = (req, res) => {
  // StaffMember.find({ accessLevel: 3 }, { _id: 1, name: 1, contactNumber: 1, imeiNumber: 1, createdAt: 1, isSubscribe: 1, accessLevel: 1, organizationId: 1, avatar: 1 })
  var query = {
    accessLevel: 3,
    active: req.query.accessLevel == "deactivated" ? 0 : 1,
  };
  query["$and"] = [];
  console.log(req.staffMember);
  if (req.staffMember && req.staffMember.accessLevel == 2) {
    query["$and"].push({
      organizationId: {
        $eq: req.staffMember.organizationId,
      },
    });
  }
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
  //deactivated
  if (
    req.query.accessLevel &&
    (req.query.accessLevel != "all" ||
      req.query.accessLevel == "subscribed" ||
      req.query.accessLevel == "unsubscribed")
  ) {
    query["$and"].push({
      isSubscribe: {
        $eq: req.query.accessLevel == "subscribed" ? 1 : 0,
      },
    });
  }
  if (req.query.accessLevel == "renewal") {
    let expiredAtGTE = new Date(
      moment()
        .utc("0530")
        .format()
    );
    query["$and"].push({
      expiredAt: {
        $gte: expiredAtGTE,
      },
    });
  }
  if (query["$and"] && query["$and"].length == 0) {
    delete query["$and"];
  }
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;
  StaffMember.find(query, { password: 0, __v: 0 })
    .populate("organizationId")
    .sort({
      createdAt: -1,
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
        StaffMember.count(query, async function(err, totalRecords) {
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
methods.getStaffMembers = (req, res) => {
  // StaffMember.find({ accessLevel: 3 }, { _id: 1, name: 1, contactNumber: 1, imeiNumber: 1, createdAt: 1, isSubscribe: 1, accessLevel: 1, organizationId: 1, avatar: 1 })
  var query = {
    _id: { $ne: req.staffMember._id },
    // active: req.query.staffMemberStatus == "deactivated" ? false : true,
  };

  if (req.query.staffMemberStatus && req.query.staffMemberStatus != "all") {
    query.active = req.query.staffMemberStatus === "activated" ? true : false;
  }
  query["$and"] = [];
  console.log(req.staffMember);
  if (req.staffMember && req.staffMember.accessLevel == 2) {
    query["$and"].push({
      organizationId: {
        $eq: req.staffMember.organizationId,
      },
    });
  }
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
  //deactivated
  if (
    req.query.accessLevel &&
    (req.query.accessLevel != "all" ||
      req.query.accessLevel == "subscribed" ||
      req.query.accessLevel == "unsubscribed")
  ) {
    query["$and"].push({
      isSubscribe: {
        $eq: req.query.accessLevel == "subscribed" ? 1 : 0,
      },
    });
  }
  if (req.query.accessLevel == "renewal") {
    let expiredAtGTE = new Date(
      moment()
        .utc("0530")
        .format()
    );
    query["$and"].push({
      expiredAt: {
        $gte: expiredAtGTE,
      },
    });
  }
  if (query["$and"] && query["$and"].length == 0) {
    delete query["$and"];
  }
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;
  StaffMember.find(query, { password: 0, __v: 0 })
    .populate("organizationId")
    .sort({
      createdAt: -1,
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
        StaffMember.count(query, async function(err, totalRecords) {
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
***   update existnig StaffMemberStatus  ***
==========================================*/

methods.updateStaffMemberStatus = (req, res) => {
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
    StaffMember.findOneAndUpdate(
      {
        _id: req.params.staffMemberId,
      },
      {
        active: req.body.active,
        // approvedBy: req.staffMember._id,
        // approvedAt: new Date(),
      },
      { new: true }
    ).exec((err, member) => {
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
        response.memberMessage = "Staff member not found.";
        return SendResponse(res);
      } else {
        //send response to client
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = member;
        response.memberMessage = "Staff member has updated successfully.";
        return SendResponse(res);
      }
    });
  }
};

/*-----  End of updateStaffMemberStatus  ------*/
/*========================================
***   update existnig staffMember  ***
==========================================*/

methods.createMember = (req, res) => {
  // req.checkBody("staffMemberId", "staffMemberId cannot be empty.").notEmpty();
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("email", "email cannot be empty.").notEmpty();
  req.checkBody("accessLevel", "accessLevel cannot be empty.").notEmpty();
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
    StaffMember.findOne({
      email: req.body.email.toLowerCase(),
    }).exec((err, member) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.member = "Some server error has occurred.";
        return SendResponse(res);
      } else if (member) {
        //send response to client
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage =
          "Member with same email address already exists.";
        return SendResponse(res);
      } else {
        var oneTimePassword = randomstring.generate({
          length: 4,
          charset: "0123456789",
        });
        // dealerId;
        req.body.password = cryptography.encrypt(oneTimePassword);
        member = new StaffMember({
          ...req.body,
          createrId: req.staffMember._id,
          dealerId: req.staffMember.dealerId._id,
        });
        member.save((err) => {
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
            var mailGenerator = new Mailgen({
              theme: "salted",
              product: {
                // Appears in header & footer of e-mails
                name: "Arab Tech Store",
                link: process.env.HOME_SITE_DOMAIN,
                logo: `${process.env.SITE_DOMAIN}/image/text_logo.png`,
              },
            });

            var email = {
              body: {
                name: req.body.name,
                link: ` `,
                intro:
                  "Welcome to Arab Tech Store! We're very excited to have you on member.",
                action: {
                  instructions: `To get started with Arab Tech Store use this email ${req.body.email} and password ${oneTimePassword}, please click here:`,
                  button: {
                    color: "#22BC66", // Optional action button color
                    text: "Go to Dasboard",
                    link: `http://admin.arabtechstore.com`,
                  },
                },
                outro:
                  "Need help, or have questions? Just mail us to support@arabtechstore.com, we'd be happy to help.",
              },
            };
            // Generate an HTML email with the provided contents
            var emailBody = mailGenerator.generate(email);
            mail.sendMail(
              req.body.email,
              "Welcome to Arab Tech Store",
              emailBody
            );

            response.error = false;
            response.status = 200;
            response.errors = null;
            response.data = member;
            response.memberMessage = "Member has created successfully.";
            return SendResponse(res);
          }
        });
      }
    });
  }
};

/*-----  End of updateMember  ------*/

/*========================================
***   update existnig staffMember  ***
==========================================*/

methods.updateMember = (req, res) => {
  // req.checkBody("staffMemberId", "staffMemberId cannot be empty.").notEmpty();
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("contactNumber", "contactNumber cannot be empty.").notEmpty();
  // req.checkBody("email", "email cannot be empty.").notEmpty();
  // req.checkBody("organizationId", "organizationId cannot be empty.").notEmpty();
  // req.checkBody("active", "active cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    StaffMember.findOne({
      _id: {
        $ne: req.staffMember._id,
      },
      contactNumber: req.body.contactNumber,
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
          "StaffMember with same contact number already exists.";
        return SendResponse(res);
      } else {
        StaffMember.findOneAndUpdate(
          {
            _id: req.staffMember._id,
          },
          {
            ...req.body,
            staffMemberId: req.staffMember._id,
          },
          { new: true }
        ).exec((err, staffMember) => {
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
            response.memberMessage = "staffMember not found.";
            return SendResponse(res);
          } else {
            //send response to client
            response.error = false;
            response.status = 200;
            response.errors = null;
            response.data = staffMember;
            response.memberMessage = "Profile has updated successfully.";
            return SendResponse(res);
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
  req.checkBody("staffMemberId", "staffMemberId cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    StaffMember.findOneAndUpdate(
      { _id: req.body.staffMemberId },
      { active: 0 },
      function(err) {
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
      }
    );
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
            $options: "i",
          },
        },
        {
          subject: {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i",
          },
        },
      ],
    });
  }
  if (req.query.startDate && req.query.endDate) {
    let createdAtGTE = new Date(moment(req.query.startDate)).utc("0530");
    let createdAtLTE = new Date(moment(req.query.endDate)).utc("0530");
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
