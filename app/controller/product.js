var cryptography = require("../libs/cryptography");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var session = require("../libs/session");
var StaffMember = mongoose.model("staff-member");
var Brand = mongoose.model("brand");
var Category = mongoose.model("category");
var Product = mongoose.model("product");
var config = require("../../config/config");
var randomstring = require("randomstring");
const aesWrapper = require("../libs/aes-wrapper");
const async = require("async");
const moment = require("moment");

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
  router
    .route("/products")
    .get(session.checkToken, methods.getProducts)
    .post(session.checkToken, methods.createProduct)
    .put(session.checkToken, methods.updateProduct)
    .delete(session.checkToken, methods.deactivateProductId);
  router.route("/public/products").get(methods.getProductUsers);
  router.route("/public/search").get(methods.getSearchUsers);
  ///product/list
  router
    .route("/product/list")
    .get(session.checkToken, methods.getProductsList);
  router
    .route("/product/:productId/public")
    .put(session.checkToken, methods.updateProductStatus);
};

/*===================================
***   create new product  ***
=====================================*/

methods.createProduct = (req, res) => {
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("model", "model cannot be empty.").notEmpty();
  // req.checkBody("quality", "quality cannot be empty.").notEmpty();
  req
    .checkBody("shortDescription", "shortDescription cannot be empty.")
    .notEmpty();
  req.checkBody("sKeyword", "keyword cannot be empty.").notEmpty();
  req.checkBody("sTitle", "title cannot be empty.").notEmpty();
  req.checkBody("sUrl", "sUrl cannot be empty.").notEmpty();
  req.checkBody("fullUrl", "fullUrl cannot be empty.").notEmpty();
  // req.checkBody("pictursList", "pictursList cannot be empty.").notEmpty();

  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    Product.find({
      fullUrl: req.body.fullUrl,
      active: true,
    }).exec((err, product) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (product && product.length > 0) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Product fullUrl is already exist.";
        return SendResponse(res);
      } else {
        var product = new Product({
          ...req.body,
          createrId: req.staffMember._id,
        });
        product.save((err) => {
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
            response.data = product;
            response.memberMessage = "product has created successfully.";
            return SendResponse(res);
          }
        });
      }
    });
  }
};

/*-----  End of createdealer  ------*/

/*=====================================
***   get list of products info  ***
=======================================*/

methods.getProductsList = (req, res) => {
  var query = { active: true, public: true };

  Product.find(query, "name")
    .sort({
      name: 1,
    })
    .lean()
    .exec((err, products) => {
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
        response.productList = products;
        // response.memberMessage = "List of products fetched successfully.";
        return SendResponse(res);
      }
    });
};

/*-----  End of getProductsList  ------*/

/*=====================================
***   get list of products  ***
=======================================*/

methods.getSearchUsers = async (req, res) => {
  var query = {
    active: true,
  };
  query["$and"] = [
    {
      "categoryId.active": true,
    },
    {
      "categoryId.public": true,
    },
    {
      "brandId.active": true,
    },
    {
      "brandId.public": true,
    },
  ];

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
          "brandId.name": {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i",
          },
        },
        {
          "categoryId.name": {
            $regex: ".*" + req.query.searchText + ".*",
            $options: "i",
          },
        },
      ],
    });
  }
  if (query["$and"] && query["$and"].length == 0) {
    delete query["$and"];
  }
  console.log({ query }, query["$and"]);
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;

  async.parallel(
    {
      products: function(callback) {
        console.log(
          {
            $limit: limit,
          },
          {
            $skip: page * limit,
          }
        );
        Product.aggregate([
          {
            $match: { active: true, public: true },
          },
          {
            $lookup: {
              from: "brands",
              localField: "brandId",
              foreignField: "_id",
              as: "brandId",
            },
          },
          { $unwind: "$brandId" },
          {
            $lookup: {
              from: "categories",
              localField: "categoryId",
              foreignField: "_id",
              as: "categoryId",
            },
          },
          { $unwind: "$categoryId" },
          {
            $match: query,
          },
          {
            $skip: page * limit,
          },
          {
            $limit: limit,
          },
        ]).exec(callback);
      },
      totalRecords: function(callback) {
        if (req.query.productId) {
          return callback(null);
        }
        Product.aggregate([
          {
            $match: { active: true, public: true },
          },
          {
            $lookup: {
              from: "brands",
              localField: "brandId",
              foreignField: "_id",
              as: "brandId",
            },
          },
          { $unwind: "$brandId" },
          {
            $lookup: {
              from: "categories",
              localField: "categoryId",
              foreignField: "_id",
              as: "categoryId",
            },
          },
          { $unwind: "$categoryId" },
          {
            $match: query,
          },
          { $group: { _id: null, myCount: { $sum: 1 } } },
          { $project: { _id: 0 } },
        ]).exec((err, result) => {
          if (err) {
            callback(null, 0);
          } else {
            var count = result.length > 0 ? result[0]["myCount"] : 0;
            callback(null, count);
          }
        });
      },
    },
    function(err, results) {
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
        response.data = results.products;
        response.totalRecords = results.totalRecords;
        response.memberMessage = "List of products fetched successfully.";
        return SendResponse(res);
      }
    }
  );
};
methods.getProductUsers = async (req, res) => {
  var query = {
    active: true,
    public: true,
  };
  if (req.query.categoryUrl) {
    query.categoryUrl = req.query.categoryUrl;
  }
  if (req.query.brandUrl) {
    query.brandUrl = req.query.brandUrl;
  }
  if (req.query.filterBrandList) {
    query.brandUrl = { $in: req.query.filterBrandList };
  }
  if (req.query.filterCategoryList) {
    query.categoryUrl = { $in: req.query.filterCategoryList };
  }
  console.log(
    "req.query.filterSubCategoryList",
    req.query.filterSubCategoryList
  );
  if (req.query.productStatus && req.query.productStatus != "all") {
    query.public = req.query.productStatus === "deactivated" ? false : true;
  }
  query["$and"] = [];

  if (req.query.filterSubCategoryList) {
    query["$and"].push({
      "subCategory.label": { $in: req.query.filterSubCategoryList },
    });
    // query.subCategory.label = { $in: req.query.filterSubCategoryList };
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
  if (query["$and"] && query["$and"].length == 0) {
    delete query["$and"];
  }
  console.log({ query }, query["$and"]);
  var limit = req.query.limit ? parseInt(req.query.limit) : 10;
  var page = req.query.page ? parseInt(req.query.page) : 0;

  async.parallel(
    {
      brandInfo: function(callback) {
        if (!req.query.brandUrl) {
          return callback(null);
        }
        Brand.findOne({
          $or: [{ _id: req.query.brandId }, { sUrl: req.query.brandUrl }],
        })
          .lean()
          .exec(callback);
      },
      categoryInfo: function(callback) {
        if (!req.query.categoryUrl) {
          return callback(null);
        }
        console.log("sUrl", req.query.categoryUrl);
        Category.findOne({
          $or: [{ _id: req.query.categoryId }, { sUrl: req.query.categoryUrl }],
        })
          .lean()
          .exec(callback);
      },
      products: function(callback) {
        if (req.query.productId || req.query.sUrl) {
          Product.findOne({
            $or: [{ _id: req.query.productId }, { sUrl: req.query.sUrl }],
          })
            .populate("approvedBy", "name profileUrl")
            .populate("brandId")
            .populate("categoryId")
            .lean()
            .exec(callback);
        } else {
          Product.find(query)
            .populate("approvedBy", "name profileUrl")
            .populate("createrId", "name profileUrl ")
            .populate("brandId")
            .populate("categoryId")
            .sort({
              createdAt: -1,
            })
            .limit(limit)
            .skip(page * limit)
            .lean()
            .exec(callback);
        }
      },
      totalRecords: function(callback) {
        if (req.query.productId) {
          return callback(null);
        }
        Product.count(query).exec(callback);
      },
    },
    function(err, results) {
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
        response.brandInfo = results.brandInfo;
        response.categoryInfo = results.categoryInfo;
        response.data = results.products;
        response.totalRecords = results.totalRecords;
        response.memberMessage = "List of products fetched successfully.";
        return SendResponse(res);
      }
    }
  );
};
methods.getProducts = async (req, res) => {
  var query = {
    active: true,
  };
  if (req.query.productStatus && req.query.productStatus != "all") {
    query.public = req.query.productStatus === "deactivated" ? false : true;
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

  async.parallel(
    {
      products: function(callback) {
        if (req.query.productId || req.query.sUrl) {
          Product.findOne({
            $or: [{ _id: req.query.productId }, { sUrl: req.query.sUrl }],
          })
            .populate("approvedBy", "name profileUrl")
            .populate("createrId", "name profileUrl")
            .populate("brandId")
            .populate("categoryId")
            .lean()
            .exec(callback);
        } else {
          Product.find(query)
            .populate("approvedBy", "name profileUrl")
            .populate("createrId", "name profileUrl ")
            .populate("brandId")
            .populate("categoryId")
            .sort({
              createdAt: -1,
            })
            .limit(limit)
            .skip(page * limit)
            .lean()
            .exec(callback);
        }
      },
      totalRecords: function(callback) {
        if (req.query.productId) {
          return callback(null);
        }
        Product.count(query).exec(callback);
      },
    },
    function(err, results) {
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
        response.data = results.products;
        response.totalRecords = results.totalRecords;
        response.memberMessage = "List of products fetched successfully.";
        return SendResponse(res);
      }
    }
  );

  // Product.find(query)
  //   .populate("approvedBy", "name profileUrl")
  //   .populate("createrId", "name profileUrl")
  //   .populate("brandId")
  //   .sort({
  //     createdAt: -1,
  //   })
  //   .limit(limit)
  //   .skip(page * limit)
  //   .lean()
  //   .exec((err, products) => {
  //     if (err) {
  //       //send response to user
  //       response.error = true;
  //       response.status = 500;
  //       response.errors = err;
  //       response.data = null;
  //       response.memberMessage = "Some server error has occurred.";
  //       return SendResponse(res);
  //     } else {
  //       Product.count(query, async function(err, totalRecords) {
  //         if (err) {
  //           //send response to user
  //           response.error = true;
  //           response.status = 500;
  //           response.errors = err;
  //           response.memberMessage = "Some server error has occurred.";
  //           response.data = null;
  //           return SendResponse(res);
  //         } else {
  //           //send response to user
  //           response.error = false;
  //           response.status = 200;
  //           response.errors = null;
  //           response.data = products;
  //           response.totalRecords = totalRecords;
  //           response.memberMessage = "List of products fetched successfully.";
  //           return SendResponse(res);
  //         }
  //       });
  //     }
  //   });
};

/*-----  End of getdealers  ------*/

/*========================================
***   update existnig product  ***
==========================================*/

methods.updateProduct = (req, res) => {
  req.checkBody("productId", "productId cannot be empty.").notEmpty();
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("model", "model cannot be empty.").notEmpty();
  // req.checkBody("quality", "quality cannot be empty.").notEmpty();
  req
    .checkBody("shortDescription", "shortDescription cannot be empty.")
    .notEmpty();
  req.checkBody("sKeyword", "keyword cannot be empty.").notEmpty();
  req.checkBody("sTitle", "title cannot be empty.").notEmpty();
  req.checkBody("sUrl", "sUrl cannot be empty.").notEmpty();
  req.checkBody("fullUrl", "fullUrl cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    Product.find({
      _id: { $ne: req.body.productId },
      fullUrl: req.body.fullUrl,
      active: true,
    }).exec((err, product) => {
      console.log({ err }, "---1s");
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (product && product.length > 0) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Product fullUrl is already exist.";
        return SendResponse(res);
      } else {
        Product.findOneAndUpdate(
          {
            _id: req.body.productId,
          },
          { ...req.body }
        ).exec((err, product) => {
          if (err) {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else if (!product) {
            //send response to user
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.data = null;
            response.memberMessage = "product not found.";
            return SendResponse(res);
          } else {
            //send response to user
            response.error = false;
            response.status = 200;
            response.errors = null;
            response.data = product;
            response.memberMessage = "product has updated successfully.";
            return SendResponse(res);
          }
        });
      }
    });
  }
};

/*-----  End of updateproduct  ------*/
/*====================================
 ***   deactivate existnig Product   ***
 ======================================*/
methods.deactivateProductId = function(req, res) {
  //Check for POST request errors.
  req.checkBody("productId", "productId cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    Product.findOneAndUpdate(
      { _id: req.body.productId },
      { active: 0 },
      function(err) {
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
      }
    );
  }
};
/*-----  End of deactivateProductId  ------*/

/*========================================
***   update existnig product  ***
==========================================*/

methods.updateProductStatus = (req, res) => {
  req.checkBody("public", "public cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    Product.findOneAndUpdate(
      {
        _id: req.params.productId,
      },
      {
        public: req.body.public,
        approvedBy: req.staffMember._id,
        approvedAt: new Date(),
      }
    ).exec((err, product) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (!product) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "product not found.";
        return SendResponse(res);
      } else {
        //send response to user
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = product;
        response.memberMessage = "product has updated successfully.";
        return SendResponse(res);
      }
    });
  }
};

/*-----  End of updateproduct  ------*/
