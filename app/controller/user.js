var cryptography = require("../libs/cryptography");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var session = require("../libs/session");
var User = mongoose.model("user");
var Enquiry = mongoose.model("enquiry");
var Session = mongoose.model("session");
var config = require("../../config/config");
var randomstring = require("randomstring");
const aesWrapper = require("../libs/aes-wrapper");
const async = require("async");
const moment = require("moment");

var mail = require("../libs/mail");
var Mailgen = require("mailgen");
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
  router.route("/contact").post(methods.userContactUs);
  router
    .route("/user")
    .get(session.checkToken, methods.getUsers)
    .post(methods.createUser)
    .put(session.checkToken, methods.updateUsers)
    .delete(session.checkToken, methods.deactivateUserId);
  router
    .route("/user/enquiries")
    .get(session.checkToken, methods.getUserEnquiries)
    // .post(methods.createUser)
    .put(session.checkToken, methods.updateUserEnquiries);
  // .delete(session.checkToken, methods.deactivateUserId);
  router.route("/test").get(function(req, res) {
    //send response to user
    var mailGenerator = new Mailgen({
      theme: "salted",
      product: {
        // Appears in header & footer of e-mails
        name: "Arab Tech Store",
        link: "http://arabtechstore.com",
        logo: `http://arabtechstore.com/images/icon/ATS_Logo.png`,
      },
    });

    var email = {
      body: {
        name: "Amit Chauhan",
        link: ` `,
        intro:
          "We have received your enquiry. We will contact you within next 24 hours.",
        action: {
          instructions: "", // `To get started with Arab Tech Store use this email ${req.body.email} and password ${oneTimePassword}, please click here:`,
          button: {
            color: "#002b7a", // Optional action button color
            text: "Go to Website",
            link: `http://arabtechstore.com`,
          },
        },
        outro:
          "Need help, or have questions? Just mail us to salescoordinator@arabtechstore.com, we'd be happy to help.",
      },
    };
    // Generate an HTML email with the provided contents
    var emailBody = mailGenerator.generate(email);
    mail.sendMail(
      "amitchauhan6dec@gmail.com",
      "Welcome to Arab Tech Store",
      emailBody
    );
    response.error = false;
    response.status = 200;
    response.errors = null;
    response.data = null;
    response.memberMessage = "Request send successfully.";
    return SendResponse(res);
  });
};

/*===================================
***   create new user  ***
=====================================*/

methods.userContactUs = (req, res) => {
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("email", "email cannot be empty.").notEmpty();
  req.checkBody("message", "message cannot be empty.").notEmpty();
  req.checkBody("subject", "subject cannot be empty.").notEmpty();

  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    User.findOne({
      email: req.body.email,
    }).exec((err, user) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (user) {
        //send response to user
        user.name = req.body.name;
        user.email = req.body.email;
        // user.contactNumber = req.body.contactNumber;
        // user.country = req.body.country;
        user.save((err) => {
          if (err) {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else {
            var enquiry = new Enquiry({
              userId: user._id,
              contactUs: true,
              subject: req.body.subject,
              message: req.body.message,
            });
            enquiry.save((err) => {
              if (err) {
                //send response to user
                response.error = true;
                response.status = 500;
                response.errors = err;
                response.data = null;
                response.memberMessage = "Some server error has occurred.";
                return SendResponse(res);
              } else {
                //send response to user
                //send response to user
                var mailGenerator = new Mailgen({
                  theme: "salted",
                  product: {
                    // Appears in header & footer of e-mails
                    name: "Arab Tech Store",
                    link: "http://arabtechstore.com",
                    logo: `http://arabtechstore.com/images/icon/ATS_Logo.png`,
                  },
                });

                var email = {
                  body: {
                    name: req.body.name,
                    link: ` `,
                    intro:
                      "We have received your enquiry. We will contact you within next 24 hours.",
                    action: {
                      instructions: "", // `To get started with Arab Tech Store use this email ${req.body.email} and password ${oneTimePassword}, please click here:`,
                      button: {
                        color: "#002b7a", // Optional action button color
                        text: "Go to Website",
                        link: `http://arabtechstore.com`,
                      },
                    },
                    outro:
                      "Need help, or have questions? Just mail us to salescoordinator@arabtechstore.com, we'd be happy to help.",
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
                response.data = null;
                response.memberMessage = "Request send successfully.";
                return SendResponse(res);
              }
            });
          }
        });
      } else {
        var user = new User({
          ...req.body,
        });
        user.save((err) => {
          if (err) {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else {
            var enquiry = new Enquiry({
              userId: user._id,
              contactUs: true,
              subject: req.body.subject,
              message: req.body.message,
            });
            enquiry.save((err) => {
              if (err) {
                //send response to user
                response.error = true;
                response.status = 500;
                response.errors = err;
                response.data = null;
                response.memberMessage = "Some server error has occurred.";
                return SendResponse(res);
              } else {
                //send response to user
                var mailGenerator = new Mailgen({
                  theme: "salted",
                  product: {
                    // Appears in header & footer of e-mails
                    name: "Arab Tech Store",
                    link: "http://arabtechstore.com",
                    logo: `http://arabtechstore.com/images/icon/ATS_Logo.png`,
                  },
                });

                var email = {
                  body: {
                    name: req.body.name,
                    link: ` `,
                    intro:
                      "We have received your enquiry. We will contact you within next 24 hours.",
                    action: {
                      instructions: "", // `To get started with Arab Tech Store use this email ${req.body.email} and password ${oneTimePassword}, please click here:`,
                      button: {
                        color: "#002b7a", // Optional action button color
                        text: "Go to Website",
                        link: `http://arabtechstore.com`,
                      },
                    },
                    outro:
                      "Need help, or have questions? Just mail us to salescoordinator@arabtechstore.com, we'd be happy to help.",
                  },
                };
                // Generate an HTML email with the provided contents
                var emailBody = mailGenerator.generate(email);
                mail.sendMail(
                  req.body.email,
                  "Welcome to Arab Tech Store",
                  emailBody
                );
                //send response to user
                response.error = false;
                response.status = 200;
                response.errors = null;
                response.data = null;
                response.memberMessage = "Request send successfully.";
                return SendResponse(res);
              }
            });
          }
        });
      }
    });
  }
};

/*-----  End of createuser  ------*/
/*===================================
***   create new user  ***
=====================================*/

methods.createUser = (req, res) => {
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("email", "email cannot be empty.").notEmpty();
  req.checkBody("contactNumber", "contactNumber cannot be empty.").notEmpty();
  req.checkBody("quantity", "quantity cannot be empty.").notEmpty();
  req.checkBody("country", "country cannot be empty.").notEmpty();
  req.checkBody("productId", "productId cannot be empty.").notEmpty();

  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    /**
     * Hello Name_of_Customer

We have received your enquiry. We will contact you within next 24 hours.

Thanking your,
Arab Tech Store*
     */
    User.findOne({
      email: req.body.email,
    }).exec((err, user) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (user) {
        if (!user.isApproved) {
          response.error = false;
          response.status = 200;
          response.errors = null;
          response.data = null;
          response.memberMessage = "Request send successfully.";
          return SendResponse(res);
        } else {
          //send response to user
          user.name = req.body.name;
          user.email = req.body.email;
          user.contactNumber = req.body.contactNumber || user.contactNumber;
          // user.quantity = req.body.quantity;
          user.country = req.body.country || user.country;
          // user.productId = req.body.productId;
          user.save((err) => {
            if (err) {
              //send response to user
              response.error = true;
              response.status = 500;
              response.errors = err;
              response.data = null;
              response.memberMessage = "Some server error has occurred.";
              return SendResponse(res);
            } else {
              var enquiry = new Enquiry({
                userId: user._id,
                quantity: req.body.quantity,
                productId: req.body.productId,
                message: req.body.message,
              });
              enquiry.save((err) => {
                if (err) {
                  //send response to user
                  response.error = true;
                  response.status = 500;
                  response.errors = err;
                  response.data = null;
                  response.memberMessage = "Some server error has occurred.";
                  return SendResponse(res);
                } else {
                  //send response to user
                  var mailGenerator = new Mailgen({
                    theme: "salted",
                    product: {
                      // Appears in header & footer of e-mails
                      name: "Arab Tech Store",
                      link: "http://arabtechstore.com",
                      logo: `http://arabtechstore.com/images/icon/ATS_Logo.png`,
                    },
                  });

                  var email = {
                    body: {
                      name: req.body.name,
                      link: ` `,
                      intro:
                        "We have received your enquiry. We will contact you within next 24 hours.",
                      action: {
                        instructions: "", // `To get started with Arab Tech Store use this email ${req.body.email} and password ${oneTimePassword}, please click here:`,
                        button: {
                          color: "#002b7a", // Optional action button color
                          text: "Go to Website",
                          link: `http://arabtechstore.com`,
                        },
                      },
                      outro:
                        "Need help, or have questions? Just mail us to salescoordinator@arabtechstore.com, we'd be happy to help.",
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
                  response.data = null;
                  response.memberMessage = "Request send successfully.";
                  return SendResponse(res);
                }
              });
            }
          });
        }
      } else {
        var user = new User({
          ...req.body,
        });
        user.save((err) => {
          if (err) {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else {
            var enquiry = new Enquiry({
              userId: user._id,
              quantity: req.body.quantity,
              productId: req.body.productId,
              message: req.body.message,
            });
            enquiry.save((err) => {
              if (err) {
                //send response to user
                response.error = true;
                response.status = 500;
                response.errors = err;
                response.data = null;
                response.memberMessage = "Some server error has occurred.";
                return SendResponse(res);
              } else {
                //send response to user
                var mailGenerator = new Mailgen({
                  theme: "salted",
                  product: {
                    // Appears in header & footer of e-mails
                    name: "Arab Tech Store",
                    link: "http://arabtechstore.com",
                    logo: `http://arabtechstore.com/images/icon/ATS_Logo.png`,
                  },
                });

                var email = {
                  body: {
                    name: req.body.name,
                    link: ` `,
                    intro:
                      "We have received your enquiry. We will contact you within next 24 hours.",
                    action: {
                      instructions: "", // `To get started with Arab Tech Store use this email ${req.body.email} and password ${oneTimePassword}, please click here:`,
                      button: {
                        color: "#002b7a", // Optional action button color
                        text: "Go to Website",
                        link: `http://arabtechstore.com`,
                      },
                    },
                    outro:
                      "Need help, or have questions? Just mail us to salescoordinator@arabtechstore.com, we'd be happy to help.",
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
                response.data = null;
                response.memberMessage = "Request send successfully.";
                return SendResponse(res);
              }
            });
          }
        });
      }
    });
  }
};

/*-----  End of createuser  ------*/

/*=====================================
***   get list of users  ***
=======================================*/

methods.getUsers = async (req, res) => {
  if (req.query.userId) {
    User.findOne({ _id: req.query.userId })
      .populate("productId")
      .populate("adminId", "name profilePicUrl")
      .lean()
      .exec((err, users) => {
        if (err) {
          //send response to user
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.data = null;
          response.memberMessage = "Some server error has occurred.";
          return SendResponse(res);
        } else {
          //send response to user
          response.error = false;
          response.status = 200;
          response.errors = null;
          response.data = users;
          response.memberMessage = "User info fetched successfully.";
          return SendResponse(res);
        }
      });
  } else {
    var query = {
      active: true,
    };
    if (req.query.userStatus && req.query.userStatus != "all") {
      query.isApproved = req.query.userStatus === "approved" ? true : false;
    }
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
    console.log({ query }, query["$and"], "--------");
    var limit = req.query.limit ? parseInt(req.query.limit) : 10;
    var page = req.query.page ? parseInt(req.query.page) : 0;
    User.find(query)
      .populate("createrId", "name profilePicUrl")
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .skip(page * limit)
      .lean()
      .exec((err, users) => {
        if (err) {
          //send response to user
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.data = null;
          response.memberMessage = "Some server error has occurred.";
          return SendResponse(res);
        } else {
          User.count(query, async function(err, totalRecords) {
            if (err) {
              //send response to user
              response.error = true;
              response.status = 500;
              response.errors = err;
              response.memberMessage = "Some server error has occurred.";
              response.data = null;
              return SendResponse(res);
            } else {
              //send response to user
              response.error = false;
              response.status = 200;
              response.errors = null;
              response.data = users;
              response.totalRecords = totalRecords;
              response.memberMessage = "List of users fetched successfully.";
              return SendResponse(res);
            }
          });
        }
      });
  }
};

/*=====================================
***   get list of user enquiries ***
=======================================*/
methods.getUserEnquiries = async (req, res) => {
  if (req.query.enquiryId) {
    Enquiry.findOne({ _id: req.query.enquiryId })
      .populate("productId")
      .populate("userId")
      .populate("staffMemberId", "name profilePicUrl")
      .lean()
      .exec((err, enquiry) => {
        if (err) {
          //send response to user
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.data = null;
          response.memberMessage = "Some server error has occurred.";
          return SendResponse(res);
        } else {
          //send response to user
          response.error = false;
          response.status = 200;
          response.errors = null;
          response.data = enquiry;
          response.memberMessage = "Enquiry info fetched successfully.";
          return SendResponse(res);
        }
      });
  } else {
    var query = {
      active: true,
      contactUs: { $eq: req.query.contactUs ? req.query.contactUs : false },
    };
    if (req.query.userId) {
      query.userId = req.query.userId;
    }
    if (req.query.enquiryStatus && req.query.enquiryStatus != "all") {
      query.isApproved = req.query.enquiryStatus === "approved" ? true : false;
    }
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
    Enquiry.find(query)
      .populate("productId")
      .populate("userId")
      .populate("staffMemberId", "name profilePicUrl")
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .skip(page * limit)
      .lean()
      .exec((err, enquiries) => {
        if (err) {
          //send response to user
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.data = null;
          response.memberMessage = "Some server error has occurred.";
          return SendResponse(res);
        } else {
          Enquiry.count(query, async function(err, totalRecords) {
            if (err) {
              //send response to user
              response.error = true;
              response.status = 500;
              response.errors = err;
              response.memberMessage = "Some server error has occurred.";
              response.data = null;
              return SendResponse(res);
            } else {
              //send response to user
              response.error = false;
              response.status = 200;
              response.errors = null;
              response.data = enquiries;
              response.totalRecords = totalRecords;
              response.memberMessage = "List of enquiry fetched successfully.";
              return SendResponse(res);
            }
          });
        }
      });
  }
};
/*-----  End of getUserEnquiries  ------*/

/*========================================
***   update existnig user enquiries  ***
==========================================*/

methods.updateUserEnquiries = (req, res) => {
  req.checkBody("enquiryId", "enquiryId cannot be empty.").notEmpty();
  req.checkBody("isApproved", "isApproved cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    Enquiry.findOneAndUpdate(
      {
        _id: req.body.enquiryId,
      },
      {
        ...req.body,
        staffMemberId: req.staffMember._id,
      },
      { new: true }
    ).exec((err, enquiry) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (!enquiry) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "enquiry not found.";
        return SendResponse(res);
      } else {
        //send response to user
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = enquiry;
        response.memberMessage = "enquiry has updated successfully.";
        return SendResponse(res);
      }
    });
  }
};

/*-----  End of updateUserEnquiries  ------*/
/*========================================
***   update existnig user  ***
==========================================*/

methods.updateUsers = (req, res) => {
  req.checkBody("userId", "userId cannot be empty.").notEmpty();
  // req.checkBody("name", "name cannot be empty.").notEmpty();
  // req.checkBody("contactNumber", "contactNumber cannot be empty.").notEmpty();
  // // req.checkBody("address", "address cannot be empty.").notEmpty();
  // req.checkBody("email", "email cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here

    User.findOneAndUpdate(
      {
        _id: req.body.userId,
      },
      {
        ...req.body,
        staffMemberId: req.staffMember._id,
      },
      { new: true }
    ).exec((err, user) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (!user) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "user not found.";
        return SendResponse(res);
      } else {
        //send response to user
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = user;
        response.memberMessage = "user has updated successfully.";
        return SendResponse(res);
      }
    });
  }
};

/*-----  End of updateuser  ------*/
/*====================================
 ***   deactivate existnig User   ***
 ======================================*/
methods.deactivateUserId = function(req, res) {
  //Check for POST request errors.
  req.checkBody("userId", "userId cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    User.findOneAndUpdate({ _id: req.body.userId }, { active: 0 }, function(
      err
    ) {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.memberMessage = "server errors.";
        response.data = null;
        return SendResponse(res);
      } else {
        //send response to user
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
/*-----  End of deactivateUserId  ------*/
