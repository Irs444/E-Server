var cryptography = require("../libs/cryptography");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var session = require("../libs/session");
var validation = require("../libs/validation");
var Member = mongoose.model("member");
var Dealer = mongoose.model("dealer");
// var Session = mongoose.model("session");
var PolicyPlanInfo = mongoose.model("policyPlanInfo");
var PolicyPlan = mongoose.model("policyPlan");
var config = require("../../config/config");
var randomstring = require("randomstring");
const aesWrapper = require("../libs/aes-wrapper");
const async = require("async");
const moment = require("moment");
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
  router
    .route("/policy/plan/list")
    .get(session.checkToken, methods.getPolicyPlansList);
  router
    .route("/policy/plan")
    .get(session.checkToken, methods.getPolicyPlans)
    .post(session.checkToken, methods.createPolicyPlans)
    .put(session.checkToken, methods.updatePolicyPlans);
  router
    .route("/policy/plan/info")
    .get(
      session.checkToken,
      // session.checkSuperAdmin,
      methods.getPolicyPlansInfo
    )
    .post(
      session.checkToken,
      // session.checkSuperAdmin,
      methods.createPolicyPlansInfo
    )
    .put(
      session.checkToken,
      // session.checkSuperAdmin,
      methods.updatePolicyPlansInfo
    );
  // .delete(session.checkToken, methods.deactivatePolicyPlansInfo);
};

/*=====================================
***   get list of Policy Plans  ***
=======================================*/

methods.getPolicyPlansList = (req, res) => {
  var query = { active: 1 };

  PolicyPlan.find({})
    .sort({
      _id: 1
    })
    .lean()
    .exec((err, policyPlan) => {
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
        response.data = policyPlan;
        // response.memberMessage = "List of policy plan fetched successfully.";
        return SendResponse(res);
      }
    });
};
methods.getPolicyPlans = (req, res) => {
  console.log("--------getPolicyPlans------------");
  // var query = { active: 1 };
  var query = {};
  //  var query = { active: req.query.dealerType === "deactivated" ? 0 : 1 };
  query["$and"] = [];
  if (req.query.searchText && req.query.searchText !== "") {
    query["$and"].push({
      $or: [
        {
          policyPlanName: {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i"
          }
        },
        {
          policyPlanNumber: {
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
  if (query["$and"] && query["$and"].length == 0) {
    delete query["$and"];
  }
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;

  PolicyPlan.find(query)
    .sort({
      _id: -1
    })
    .limit(limit)
    .skip(page * limit)
    .lean()
    .exec((err, policyPlan) => {
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
        response.data = policyPlan;
        response.memberMessage = "Policy plan fetched successfully.";
        return SendResponse(res);
      }
    });
};

/*-----  End of getPolicyPlans  ------*/
/*===================================
***   create new policy plan  ***
=====================================*/

methods.createPolicyPlans = (req, res) => {
  req
    .checkBody("policyPlanNumber", "policyPlanNumber cannot be empty.")
    .notEmpty();
  req.checkBody("policyPlanName", "policyPlanName cannot be empty.").notEmpty();
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

    PolicyPlan.findOne({
      $and: [
        {
          policyPlanNumber: req.body.policyPlanNumber
        },
        { policyPlanName: req.body.policyPlanName }
      ]
    }).exec((err, policyPlan) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (policyPlan) {
        //send response to client
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Policy plan already exists.";
        return SendResponse(res);
      } else {
        var policyPlan = new PolicyPlan({
          ...req.body
        });
        policyPlan.save(err => {
          // console.log({ result });
          console.log({ err });
          console.log({ policyPlan });
          if (err) {
            //send response to client
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else {
            response.error = false;
            response.status = 200;
            response.errors = null;
            response.data = policyPlan;
            response.memberMessage = "Policy plan has created successfully.";
            return SendResponse(res);
          }
        });
      }
    });
  }
};

/*-----  End of create policy plan  ------*/

/*========================================
***   update existnig policy plan  ***
==========================================*/

methods.updatePolicyPlans = (req, res) => {
  req.checkBody("policyPlanId", "policyPlanId cannot be empty.").notEmpty();
  req
    .checkBody("policyPlanNumber", "policyPlanNumber cannot be empty.")
    .notEmpty();
  req.checkBody("policyPlanName", "policyPlanName cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    PolicyPlan.findOne({
      $and: [
        { _id: { $ne: req.body.policyPlanId } },
        // {
        //   $or: [
        {
          policyPlanNumber: req.body.policyPlanNumber
        },
        { policyPlanName: req.body.policyPlanName }
      ]
      //   }
      // ]
    }).exec((err, policyPlan) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (policyPlan) {
        //send response to client
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Policy plan already exists.";
        return SendResponse(res);
      } else {
        PolicyPlan.findOne({
          _id: req.body.policyPlanId
        }).exec((err, policyPlan) => {
          if (err) {
            //send response to client
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else if (!policyPlan) {
            //send response to client
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.data = null;
            response.memberMessage = "Policy plan not found.";
            return SendResponse(res);
          } else {
            policyPlan.policyPlanNumber = req.body.policyPlanNumber;
            policyPlan.policyPlanName = req.body.policyPlanName;
            policyPlan.save(err => {
              if (err) {
                //send response to client
                response.error = true;
                response.status = 500;
                response.errors = err;
                response.data = null;
                response.memberMessage = "Some server error has occurred.";
                return SendResponse(res);
              } else {
                response.error = false;
                response.status = 200;
                response.errors = null;
                response.data = PolicyPlan;
                response.memberMessage =
                  "Policy plan has updated successfully.";
                return SendResponse(res);
              }
            });
          }
        });
      }
    });
  }
};

/*-----  End of updatePolicyPlanList  ------*/

/*=====================================
***   get list of dealers info  ***
=======================================*/
methods.getPolicyPlansInfo = (req, res) => {
  console.log("--------getPolicyPlansInfo------------");
  // var query = { active: 1 };
  var query = {};
  //  var query = { active: req.query.dealerType === "deactivated" ? 0 : 1 };
  query["$and"] = [];
  if (req.query.searchText && req.query.searchText !== "") {
    query["$and"].push({
      $or: [
        {
          policyPlanName: {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i"
          }
        },
        {
          policyPlanNumber: {
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
  if (query["$and"] && query["$and"].length == 0) {
    delete query["$and"];
  }
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;

  PolicyPlan.aggregate([
    { $match: query },
    {
      // $lookup: {
      //   from: "policyPlanInfo",
      //   localField: "_id",
      //   foreignField: "policyPlanId",
      //   as: "policys"
      // },
      $lookup: {
        from: "policyplaninfos",
        localField: "_id",
        foreignField: "policyPlanId",
        as: "policys"
      }
    },
    // { $unwind: "$policys" },
    { $sort: { _id: -1 } },
    { $limit: limit },
    { $skip: page * limit }
  ])
    // .sort({
    //   _id: -1
    // })
    // .limit(limit)
    // .skip(page * limit)
    // .lean()
    .exec((err, policyPlan) => {
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
        response.data = policyPlan;
        response.memberMessage = "Policy plan fetched successfully.";
        return SendResponse(res);
      }
    });
};
methods.getPolicyPlansInfo2 = (req, res) => {
  var query = { active: 1 };

  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;

  PolicyPlanInfo.find({})
    .populate("policyPlanId")
    .sort({
      _id: -1
    })
    .limit(limit)
    .skip(page * limit)
    .lean()
    .exec((err, policyPlanInfo) => {
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
        response.data = policyPlanInfo;
        response.memberMessage = "List of policy plan fetched successfully.";
        return SendResponse(res);
      }
    });
};

/*-----  End of getPolicyPlans  ------*/
/*===================================
***   create new policy plan  ***
=====================================*/

methods.createPolicyPlansInfo = (req, res) => {
  req.checkBody("policyPlanId", "policyPlanId cannot be empty.").notEmpty();
  req
    .checkBody("policyPlanInfoData", "policyPlanInfoData cannot be empty.")
    .notEmpty();
  // req.checkBody("yearOfReturn", "yearOfReturn cannot be empty.").notEmpty();
  // req.checkBody("planInfo", "planInfo cannot be empty.").notEmpty();

  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here

    async.mapSeries(
      req.body.policyPlanInfoData,
      async function(policyPlan, next) {
        policyPlan.policyPlanId = req.body.policyPlanId;
        PolicyPlanInfo.findOne({
          policyPlanId: policyPlan.policyPlanId,
          yearOfReturn: policyPlan.yearOfReturn
        }).exec((err, policyPlanInfo) => {
          if (err) {
            return;
          } else if (policyPlanInfo) {
            return;
          } else {
            var policyPlanInfo = new PolicyPlanInfo({
              ...policyPlan
            });
            policyPlanInfo.save(err => {
              if (err) {
                //send response to client
                return;
              } else {
                return;
              }
            });
          }
        });
        // return dealer;
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
          response.data = null;
          response.memberMessage = "List of policy plan add successfully.";
          return SendResponse(res);
        }
      }
    );
  }
};

/*-----  End of create policy plan  ------*/

/*========================================
***   update existnig policy plan  ***
==========================================*/

methods.updatePolicyPlansInfo = (req, res) => {
  req.checkBody("planInfoId", "planInfoId cannot be empty.").notEmpty();
  req.checkBody("policyPlanId", "policyPlanId cannot be empty.").notEmpty();
  req.checkBody("yearOfReturn", "yearOfReturn cannot be empty.").notEmpty();
  req.checkBody("planInfo", "planInfo cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    PolicyPlanInfo.findOne({
      _id: req.body.planInfoId
    }).exec((err, policyPlanInfo) => {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (!policyPlanInfo) {
        //send response to client
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Plan info not found.";
        return SendResponse(res);
      } else {
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = policyPlanInfo;
        response.memberMessage = "Plan info has updated successfully.";
        return SendResponse(res);
      }
    });
  }
};

/*-----  End of updatePolicyPlanList  ------*/

/*=====================================
***   get list of dealers  ***
=======================================*/

methods.getPolicyPlans2 = async (req, res) => {
  var query = {};
  var query = { active: req.query.dealerType === "deactivated" ? 0 : 1 };
  query["$and"] = [];
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
  if (query["$and"] && query["$and"].length == 0) {
    delete query["$and"];
  }
  // console.log({ query }, query['$and'])
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;
  Dealer.find(query)
    .populate("memberId")
    .sort({
      createdAt: -1
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
                const totalMember = await Member.find({
                  dealerId: dealerId,
                  memberType: 3
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

/*-----  End of getPolicyPlans  ------*/

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
      _id: req.body.dealerId
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
            $ne: dealer._id
          },
          contactNumber: req.body.contactNumber
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
            dealer.save(err => {
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
