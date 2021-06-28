var cryptography = require("../libs/cryptography");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var session = require("../libs/session");
var StaffMember = mongoose.model("staff-member");
var Dealer = mongoose.model("dealer");
var Session = mongoose.model("session");
var Product = mongoose.model("product");
var Brand = mongoose.model("brand");
var BannerImage = mongoose.model("banners_image");
var Category = mongoose.model("category");
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
var chunkArray = function(inputArray) {
  var perChunk = 2; // items per chunk

  // var inputArray = ["a", "b", "c", "d", "e"];
  var result = [];
  if (inputArray.length > 9) {
    perChunk = inputArray.length / 2;
    result = inputArray.reduce((resultArray, item, index) => {
      const chunkIndex = Math.floor(index / perChunk);

      if (!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = []; // start a new chunk
      }

      resultArray[chunkIndex].push(item);

      return resultArray;
    }, []);
  } else {
    result.push(inputArray);
  }
  console.log(result); // result: [['a','b'], ['c','d'], ['e']]
  return result;
};

var methods = {};

/*
 Routings/controller goes here
 */
module.exports.controller = function(router) {
  router.route("/home/header").get(methods.getHeaderInfo);
  router.route("/home").get(methods.getHomeInfo);
  router.route("/common").get(methods.getCommenHeaderInfo);
};

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
        if (req.query.productId) {
          Product.findOne({ _id: req.query.productId })
            .populate("approvedBy", "name profileUrl")
            .populate("createrId", "name profileUrl")
            .populate("brandId")
            .populate("categoryId")
            .lean()
            .exec(callback);
        } else {
          Product.find(query)
            .populate("approvedBy", "name profileUrl")
            .populate("createrId", "name profileUrl")
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
  //       //send response to client
  //       response.error = true;
  //       response.status = 500;
  //       response.errors = err;
  //       response.data = null;
  //       response.memberMessage = "Some server error has occurred.";
  //       return SendResponse(res);
  //     } else {
  //       Product.count(query, async function(err, totalRecords) {
  //         if (err) {
  //           //send response to client
  //           response.error = true;
  //           response.status = 500;
  //           response.errors = err;
  //           response.memberMessage = "Some server error has occurred.";
  //           response.data = null;
  //           return SendResponse(res);
  //         } else {
  //           //send response to client
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

/*-----  End of getProducts  ------*/

/*=====================================
***   get list of Header info  ***
=======================================*/

methods.getHeaderInfo = (req, res) => {
  var query = { active: true, public: true };
  async.parallel(
    {
      categoryList: function(callback) {
        Category.find(query)
          .sort({
            name: 1,
          })
          .lean()
          .exec(callback);
      },
      brandList: function(callback) {
        Brand.find(query)
          .sort({
            name: 1,
          })
          .lean()
          .exec(callback);
      },
      bannerList: function(callback) {
        BannerImage.find(query)
          .populate("productId")
          .sort({
            title: 1,
          })
          .lean()
          .exec(callback);
      },
      productList: function(callback) {
        Product.find(query)
          .populate("brandId")
          .populate("categoryId")
          .sort({
            createdAt: -1,
          })
          .limit(10)
          .lean()
          .exec(callback);
      },
    },
    function(err, results) {
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
        response.brandList = results.brandList;
        response.categoryList = results.categoryList;
        response.bannerList = results.bannerList;
        response.productList = results.productList;
        return SendResponse(res);
      }
    }
  );
  // Brand.find({ query })
  //   .sort({
  //     _id: 1,
  //   })
  //   .lean()
  //   .exec((err, brands) => {
  //     if (err) {
  //       //send response to client
  //       response.error = true;
  //       response.status = 500;
  //       response.errors = err;
  //       response.data = null;
  //       response.memberMessage = "Some server error has occurred.";
  //       return SendResponse(res);
  //     } else {
  //       //send response to client
  //       response.error = false;
  //       response.status = 200;
  //       response.errors = null;
  //       response.data = brands;
  //       // response.memberMessage = "List of brands fetched successfully.";
  //       return SendResponse(res);
  //     }
  //   });
};

/*-----  End of getHeaderInfo  ------*/

/*=====================================
***   get list of Header info  ***
=======================================*/

methods.getHomeInfo = (req, res) => {
  var query = { active: true, public: true };
  async.parallel(
    {
      categoryList: function(callback) {
        Category.find(
          query,
          "imageUrl name public sKeyword  sTitle sUrl shortDescription"
        )
          .sort({
            name: 1,
          })
          .lean()
          .exec(callback);
      },
      brandList: function(callback) {
        Brand.find(
          query,
          "imageUrl name public sKeyword  sTitle sUrl shortDescription"
        )
          .sort({
            name: 1,
          })
          .lean()
          .exec(callback);
      },
      bannerList: function(callback) {
        BannerImage.find(
          query,
          "imageUrl name public sKeyword  sTitle sUrl shortDescription"
        )
          .populate(
            "productId",
            "imageUrl name public sKeyword  sTitle sUrl shortDescription"
          )
          .sort({
            title: 1,
          })
          .lean()
          .exec(callback);
      },
      productList: function(callback) {
        Product.find(query)
          .populate(
            "brandId",
            "imageUrl name public sKeyword  sTitle sUrl shortDescription"
          )
          .populate(
            "categoryId",
            "imageUrl name public sKeyword  sTitle sUrl shortDescription"
          )
          .sort({
            createdAt: -1,
          })
          .limit(10)
          .lean()
          .exec(callback);
      },
    },
    function(err, results) {
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
        response.brandList = results.brandList;
        response.categoryList = results.categoryList;
        response.bannerList = results.bannerList;
        response.productList = results.productList;
        return SendResponse(res);
      }
    }
  );
};

/*-----  End of getHeaderInfo  ------*/
/*=====================================
***   get list of Header info  ***
=======================================*/

methods.getCommenHeaderInfo = (req, res) => {
  var query = { active: true, public: true };
  async.parallel(
    {
      categoryList: function(callback) {
        Category.find(
          query,
          "imageUrl name public sKeyword  sTitle sUrl shortDescription"
        )
          .sort({
            name: 1,
          })
          .lean()
          .exec(callback);
      },
      brandList: function(callback) {
        Brand.find(
          query,
          "imageUrl name public sKeyword  sTitle sUrl shortDescription"
        )
          .sort({
            name: 1,
          })
          .lean()
          .exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.memberMessage = "Some server error has occurred.";
        response.data = null;
        return SendResponse(res);
      } else {
        var data = {
          brands: chunkArray(results.brandList),
          products: chunkArray(results.categoryList),
        };
        //send response to client
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = data;
        return SendResponse(res);
      }
    }
  );
  // Brand.find({ query })
  //   .sort({
  //     _id: 1,
  //   })
  //   .lean()
  //   .exec((err, brands) => {
  //     if (err) {
  //       //send response to client
  //       response.error = true;
  //       response.status = 500;
  //       response.errors = err;
  //       response.data = null;
  //       response.memberMessage = "Some server error has occurred.";
  //       return SendResponse(res);
  //     } else {
  //       //send response to client
  //       response.error = false;
  //       response.status = 200;
  //       response.errors = null;
  //       response.data = brands;
  //       // response.memberMessage = "List of brands fetched successfully.";
  //       return SendResponse(res);
  //     }
  //   });
};

/*-----  End of getHeaderInfo  ------*/
