var cryptography = require("../libs/cryptography");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var session = require("../libs/session");
var StaffMember = mongoose.model("staff-member");
var Dealer = mongoose.model("dealer");
var Session = mongoose.model("session");
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

var methods = {};

/*
 Routings/controller goes here
 */
module.exports.controller = function(router) {
  router.route("/lists").get(session.checkToken, methods.getBrandCategoryList);
  router
    .route("/brands")
    .get(session.checkToken, methods.getBrands)
    .post(session.checkToken, methods.createBrand)
    .put(session.checkToken, methods.updateBrand)
    .delete(session.checkToken, methods.deactivateBrandId);
  router
    .route("/brand/:brandId/public")
    .put(session.checkToken, methods.updateBrandStatus);
  router
    .route("/categories")
    .get(session.checkToken, methods.getCategories)
    .post(session.checkToken, methods.createCategory)
    .put(session.checkToken, methods.updateCategory)
    .delete(session.checkToken, methods.deactivateCategoryId);
  router
    .route("/category/:categoryId/public")
    .put(session.checkToken, methods.updateCategoryStatus);
  router
    .route("/banner/image")
    .get(session.checkToken, methods.getBannerImages)
    .post(session.checkToken, methods.createBannerImage)
    .put(session.checkToken, methods.updateBannerImage)
    .delete(session.checkToken, methods.deactivateBannerImageId);
  router
    .route("/banner/image/:bannerImageId/public")
    .put(session.checkToken, methods.updateBannerImageStatus);
};

/*=====================================
***   get list of BrandCategory info  ***
=======================================*/

methods.getBrandCategoryList = (req, res) => {
  var query = { active: true };
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
          .sort({
            title: 1,
          })
          .lean()
          .exec(callback);
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
        response.brandList = results.brandList;
        response.categoryList = results.categoryList;
        response.bannerList = results.bannerList;
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
  //       //send response to user
  //       response.error = true;
  //       response.status = 500;
  //       response.errors = err;
  //       response.data = null;
  //       response.memberMessage = "Some server error has occurred.";
  //       return SendResponse(res);
  //     } else {
  //       //send response to user
  //       response.error = false;
  //       response.status = 200;
  //       response.errors = null;
  //       response.data = brands;
  //       // response.memberMessage = "List of brands fetched successfully.";
  //       return SendResponse(res);
  //     }
  //   });
};

/*-----  End of getBrandCategoryList  ------*/
/*===================================
***   create new brand  ***
=====================================*/

methods.createBrand = (req, res) => {
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("imageUrl", "imageUrl cannot be empty.").notEmpty();
  req
    .checkBody("shortDescription", "shortDescription cannot be empty.")
    .notEmpty();
  req.checkBody("sKeyword", "keyword cannot be empty.").notEmpty();
  req.checkBody("sTitle", "title cannot be empty.").notEmpty();

  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    Brand.find({
      sUrl: req.body.sUrl,
      active: true,
    }).exec((err, brands) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (brands && brands.length > 0) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Brand url is already exist.";
        return SendResponse(res);
      } else {
        var brand = new Brand({
          ...req.body,
          createrId: req.staffMember._id,
        });
        brand.save((err) => {
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
            response.data = brand;
            response.memberMessage = "brand has created successfully.";
            return SendResponse(res);
          }
        });
      }
    });
  }

  // })
};

/*-----  End of createBrand  ------*/

/*=====================================
***   get list of brands  ***
=======================================*/

methods.getBrands = async (req, res) => {
  if (req.query.brandId) {
    Brand.findOne({ _id: req.query.brandId })
      .populate("createrId", "name profilePicUrl")
      .lean()
      .exec((err, brands) => {
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
          response.data = brands;
          response.memberMessage = "Brand info fetched successfully.";
          return SendResponse(res);
        }
      });
  } else {
    var query = {
      active: true,
    };
    if (req.query.brandStatus && req.query.brandStatus != "all") {
      query.public = req.query.brandStatus === "deactivated" ? false : true;
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
    Brand.find(query)
      .populate("createrId", "name profilePicUrl")
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .skip(page * limit)
      .lean()
      .exec((err, brands) => {
        if (err) {
          //send response to user
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.data = null;
          response.memberMessage = "Some server error has occurred.";
          return SendResponse(res);
        } else {
          Brand.count(query, async function(err, totalRecords) {
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
              response.data = brands;
              response.totalRecords = totalRecords;
              response.memberMessage = "List of brands fetched successfully.";
              return SendResponse(res);
            }
          });
        }
      });
  }
};

/*-----  End of getdealers  ------*/

/*========================================
***   update existnig brand  ***
==========================================*/

methods.updateBrand = (req, res) => {
  req.checkBody("brandId", "brandId cannot be empty.").notEmpty();
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("imageUrl", "imageUrl cannot be empty.").notEmpty();
  req
    .checkBody("shortDescription", "shortDescription cannot be empty.")
    .notEmpty();
  req.checkBody("sKeyword", "keyword cannot be empty.").notEmpty();
  req.checkBody("sTitle", "title cannot be empty.").notEmpty();
  req.checkBody("sUrl", "Url cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    var brandId = req.body.brandId;
    req.body.brandId = undefined;
    Brand.find({
      _id: { $ne: brandId },
      sUrl: req.body.sUrl,
      active: true,
    }).exec((err, brands) => {
      console.log({ brands });
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (brands && brands.length > 0) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Brand url is already exist.";
        return SendResponse(res);
      } else {
        Brand.findOneAndUpdate(
          {
            _id: brandId,
          },
          {
            ...req.body,
            createrId: req.staffMember._id,
          }
        ).exec((err, brand) => {
          if (err) {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else if (!brand) {
            //send response to user
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.data = null;
            response.memberMessage = "brand not found.";
            return SendResponse(res);
          } else {
            //send response to user
            response.error = false;
            response.status = 200;
            response.errors = null;
            response.data = brand;
            response.memberMessage = "brand has updated successfully.";
            return SendResponse(res);
          }
        });
      }
    });
  }
};

/*-----  End of updatebrand  ------*/
/*====================================
 ***   deactivate existnig Brand   ***
 ======================================*/
methods.deactivateBrandId = function(req, res) {
  //Check for POST request errors.
  req.checkBody("brandId", "brandId cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    Brand.findOneAndUpdate(
      { _id: req.body.brandId },
      { active: false },
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
/*-----  End of deactivateBrandId  ------*/

/*========================================
***   update existnig BrandStatus  ***
==========================================*/

methods.updateBrandStatus = (req, res) => {
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
    Brand.findOneAndUpdate(
      {
        _id: req.params.brandId,
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
        response.memberMessage = "Brand not found.";
        return SendResponse(res);
      } else {
        //send response to user
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = product;
        response.memberMessage = "Brand has updated successfully.";
        return SendResponse(res);
      }
    });
  }
};

/*-----  End of updateBrandStatus  ------*/

/*===================================
***   create new category  ***
=====================================*/

methods.createCategory = (req, res) => {
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("imageUrl", "imageUrl cannot be empty.").notEmpty();
  req
    .checkBody("shortDescription", "shortDescription cannot be empty.")
    .notEmpty();
  req.checkBody("sKeyword", "keyword cannot be empty.").notEmpty();
  req.checkBody("sTitle", "title cannot be empty.").notEmpty();

  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    Category.find({
      sUrl: req.body.sUrl,
      active: true,
    }).exec((err, categories) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (categories && categories.length > 0) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Categories url is already exist.";
        return SendResponse(res);
      } else {
        var category = new Category({
          ...req.body,
          createrId: req.staffMember._id,
        });
        category.save((err) => {
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
            response.data = category;
            response.memberMessage = "Category has created successfully.";
            return SendResponse(res);
          }
        });
      }
    });
  }
};

/*-----  End of createCategory  ------*/

/*=====================================
***   get list of categories  ***
=======================================*/

methods.getCategories = async (req, res) => {
  if (req.query.categoryId) {
    Category.findOne({ _id: req.query.categoryId })
      .populate("createrId", "name profilePicUrl")
      .lean()
      .exec((err, categories) => {
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
          response.data = categories;
          response.memberMessage = "Category info fetched successfully.";
          return SendResponse(res);
        }
      });
  } else {
    var query = {
      active: true,
    };
    if (req.query.categoryStatus && req.query.categoryStatus != "all") {
      query.public = req.query.categoryStatus === "deactivated" ? false : true;
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
    Category.find(query)
      .populate("createrId", "name profilePicUrl")
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .skip(page * limit)
      .lean()
      .exec((err, categories) => {
        if (err) {
          //send response to user
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.data = null;
          response.memberMessage = "Some server error has occurred.";
          return SendResponse(res);
        } else {
          Category.count(query, async function(err, totalRecords) {
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
              response.data = categories;
              response.totalRecords = totalRecords;
              response.memberMessage =
                "List of categories fetched successfully.";
              return SendResponse(res);
            }
          });
        }
      });
  }
};

/*-----  End of getdealers  ------*/

/*========================================
***   update existnig category  ***
==========================================*/

methods.updateCategory = (req, res) => {
  req.checkBody("categoryId", "categoryId cannot be empty.").notEmpty();
  req.checkBody("name", "name cannot be empty.").notEmpty();
  req.checkBody("imageUrl", "imageUrl cannot be empty.").notEmpty();
  req
    .checkBody("shortDescription", "shortDescription cannot be empty.")
    .notEmpty();
  req.checkBody("sKeyword", "keyword cannot be empty.").notEmpty();
  req.checkBody("sTitle", "title cannot be empty.").notEmpty();
  // req.checkBody("sUrl", "url cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    var categoryId = req.body.categoryId;
    req.body.categoryId = undefined;
    Category.find({
      _id: { $ne: categoryId },
      sUrl: req.body.sUrl,
      active: true,
    }).exec((err, categories) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (categories && categories.length > 0) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Categories url is already exist.";
        return SendResponse(res);
      } else {
        Category.findOneAndUpdate(
          {
            _id: categoryId,
          },
          {
            ...req.body,
            createrId: req.staffMember._id,
          }
        ).exec((err, category) => {
          if (err) {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage = "Some server error has occurred.";
            return SendResponse(res);
          } else if (!category) {
            //send response to user
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.data = null;
            response.memberMessage = "category not found.";
            return SendResponse(res);
          } else {
            //send response to user
            response.error = false;
            response.status = 200;
            response.errors = null;
            response.data = category;
            response.memberMessage = "category has updated successfully.";
            return SendResponse(res);
          }
        });
      }
    });
  }
};

/*-----  End of updatecategory  ------*/
/*====================================
 ***   deactivate existnig Category   ***
 ======================================*/
methods.deactivateCategoryId = function(req, res) {
  //Check for POST request errors.
  req.checkBody("categoryId", "categoryId cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    Category.findOneAndUpdate(
      { _id: req.body.categoryId },
      { active: false },
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
/*-----  End of deactivateCategoryId  ------*/

/*========================================
***   update existnig CategoryStatus  ***
==========================================*/

methods.updateCategoryStatus = (req, res) => {
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
    Category.findOneAndUpdate(
      {
        _id: req.params.categoryId,
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
        response.memberMessage = "Category not found.";
        return SendResponse(res);
      } else {
        //send response to user
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = product;
        response.memberMessage = "Category has updated successfully.";
        return SendResponse(res);
      }
    });
  }
};

/*-----  End of updateCategoryStatus  ------*/

/*===================================
***   create new bannerImage  ***
=====================================*/

methods.createBannerImage = (req, res) => {
  req.checkBody("productId", "productId cannot be empty.").notEmpty();
  // req.checkBody("title", "title cannot be empty.").notEmpty();
  req.checkBody("imageUrl", "imageUrl cannot be empty.").notEmpty();
  // req.checkBody("subTitle", "subTitle cannot be empty.").notEmpty();

  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here

    var bannerImage = new BannerImage({
      ...req.body,
      createrId: req.staffMember._id,
    });
    bannerImage.save((err) => {
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
        response.data = bannerImage;
        response.memberMessage = "bannerImage has created successfully.";
        return SendResponse(res);
      }
    });
  }
};

/*-----  End of createBannerImage  ------*/

/*=====================================
***   get list of bannerImages  ***
=======================================*/

methods.getBannerImages = async (req, res) => {
  var query = {
    active: true,
  };
  if (req.query.bannerImageId) {
    BannerImage.findOne({ _id: req.query.bannerImageId })
      .populate("productId", "name sUrl")
      .populate("createrId", "name profilePicUrl")
      .lean()
      .exec((err, bannerImages) => {
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
          response.data = bannerImages;
          response.memberMessage = "Banner image info fetched successfully.";
          return SendResponse(res);
        }
      });
  } else {
    if (req.query.bannerImageStatus && req.query.bannerImageStatus != "all") {
      query.public =
        req.query.bannerImageStatus === "deactivated" ? false : true;
    }
    query["$and"] = [];
    if (req.query.searchText && req.query.searchText !== "") {
      query["$and"].push({
        $or: [
          {
            title: {
              $regex: ".*" + req.query.searchText + ".*",
              $options: "i",
            },
          },
          {
            subTitle: {
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
    console.log({ query }, "---", query["$and"]);
    var limit = req.query.limit ? parseInt(req.query.limit) : 10;
    var page = req.query.page ? parseInt(req.query.page) : 0;
    BannerImage.find(query)
      .populate("productId", "name sUrl")
      .populate("createrId", "name profilePicUrl")
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .skip(page * limit)
      .lean()
      .exec((err, bannerImages) => {
        if (err) {
          //send response to user
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.data = null;
          response.memberMessage = "Some server error has occurred.";
          return SendResponse(res);
        } else {
          BannerImage.count(query, async function(err, totalRecords) {
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
              response.data = bannerImages;
              response.totalRecords = totalRecords;
              response.memberMessage =
                "List of banner images fetched successfully.";
              return SendResponse(res);
            }
          });
        }
      });
  }
};

/*-----  End of getdealers  ------*/

/*========================================
***   update existnig bannerImage  ***
==========================================*/

methods.updateBannerImage = (req, res) => {
  req.checkBody("bannerImageId", "bannerImageId cannot be empty.").notEmpty();
  req.checkBody("productId", "productId cannot be empty.").notEmpty();
  // req.checkBody("title", "title cannot be empty.").notEmpty();
  req.checkBody("imageUrl", "imageUrl cannot be empty.").notEmpty();
  // req.checkBody("subTitle", "subTitle cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    //Database functions here
    var bannerImageId = req.body.bannerImageId;
    req.body.bannerImageId = undefined;
    BannerImage.findOneAndUpdate(
      {
        _id: bannerImageId,
      },
      {
        ...req.body,
        createrId: req.staffMember._id,
      }
    ).exec((err, bannerImage) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (!bannerImage) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Banner image not found.";
        return SendResponse(res);
      } else {
        //send response to user
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = bannerImage;
        response.memberMessage = "Banner image has updated successfully.";
        return SendResponse(res);
      }
    });
  }
};

/*-----  End of updatebannerImage  ------*/
/*====================================
 ***   deactivate existnig BannerImage   ***
 ======================================*/
methods.deactivateBannerImageId = function(req, res) {
  //Check for POST request errors.
  req.checkBody("bannerImageId", "bannerImageId cannot be empty.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.memberMessage = "Validation Error";
    response.data = null;
    response.errors = errors;
    return SendResponse(res, 400);
  } else {
    BannerImage.findOneAndUpdate(
      { _id: req.body.bannerImageId },
      { active: false },
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
/*-----  End of deactivateBannerImageId  ------*/

/*========================================
***   update existnig BannerImage  ***
==========================================*/

methods.updateBannerImageStatus = (req, res) => {
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
    BannerImage.findOneAndUpdate(
      {
        _id: req.params.bannerImageId,
      },
      {
        public: req.body.public,
        approvedBy: req.staffMember._id,
        approvedAt: new Date(),
      }
    ).exec((err, banner) => {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (!banner) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.data = null;
        response.memberMessage = "Banner image not found.";
        return SendResponse(res);
      } else {
        //send response to user
        banner.public = req.body.public;
        response.error = false;
        response.status = 200;
        response.errors = null;
        response.data = banner;
        response.memberMessage = "Banner image has updated successfully.";
        return SendResponse(res);
      }
    });
  }
};

/*-----  End of updateBannerImageStatus  ------*/
