var multer = require("multer");
var excel2Json = require("node-excel-to-json");
const csv = require("csvtojson");
var ActiveDirectory = require("activedirectory");
var Request = require("request");

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

var validation = {};

validation.checkFile = function(req, res, next) {
  var storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
      req.fileName = file.originalname;
      var ext = (req.fileName.split(".").pop() || "").toLowerCase();
      if (ext != "xls" && ext != "xlsx" && ext != "csv")
        req.error = "file format not supported";
      cb(null, req.fileName);
    },
  });

  var uploadfile = multer({
    storage: storage,
  }).single("file");

  uploadfile(req, res, function(err) {
    if (err) {
      //send response to user
      response.error = true;
      response.status = 500;
      response.errors = err;
      response.memberMessage = "Some server error has occurred.";
      response.data = null;
      return SendResponse(res);
    } else {
      if (req.error) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.memberMessage = req.error;
        response.data = null;
        return SendResponse(res);
      } else if (!req.fileName) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.memberMessage =
          "Excel/CSV file containing employees information is missing.";
        response.data = null;
        return SendResponse(res);
      }

      function validateMembers(output) {
        if (Object.keys(output).length !== 1) {
          //send response to user
          response.error = true;
          response.status = 400;
          response.errors = null;
          response.memberMessage =
            "Your excel file should contain only 1 sheet.";
          response.data = null;
          return SendResponse(res);
        }

        var valid = false;
        // var keys = ["EmployeeId", "EmployeeName", "EmployeeMail", "Designation", "Department", "Branch"];
        // var EmailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        // var keys = ["Id", "Name", "Email"];

        var errorMessage = "File contains invalid data";
        req.sheets = [];
        req.totalPolicy = 0;
        var Policys = [];
        req.body.policyPlanInfo = [];
        req.body.policyPlan = [];
        /**
         *  yearOfReturn: {
    type: String
  },
  planInfo: [
    {
      durationYear: String,
      revivalAmount: Number
    }
  ]
         */
        Object.keys(output).map((sheet) => {
          console.log({ output, sheet });
          req.sheets.push(output[sheet]);
          Policys = Policys.concat(output[sheet]);
        });
        req.totalPolicy = Policys.length;
        let duplicates = {};
        let duplicateYears = {};
        // console.log({ Policys });
        var arrayPlanInfo = [];

        if (Policys.length > 0) {
          valid = Policys.every((policy, i) => {
            // console.log({ policy, i });
            // console.log({ policy, i }, policy["years"]);
            // policy["years"] = policy["years"].trim();

            if (duplicateYears[policy["years"]]) {
              errorMessage = `Row ${i + 1} contains duplicate policy years`;
              return false;
            } else {
              duplicateYears[policy["years"]] = true;
            }

            req.body.policyPlan.push(policy);
            return true;
          });
        }
        for (let i = 0; i < Policys.length; i++) {
          // Policys[i].Object.keys()
          var arrayPlanYearInfo = [];
          for (var key in Policys[i]) {
            // console.log({ key });
            // console.log(Policys[i][key]);
            if (key != "years") {
              arrayPlanYearInfo.push({
                durationYear: key,
                revivalAmount: Policys[i][key],
              });
            }
          }
          req.body.policyPlanInfo.push({
            yearOfReturn: Policys[i]["years"],
            planInfo: arrayPlanYearInfo,
          });
        }

        if (!valid) {
          //send response to user
          response.error = true;
          response.status = 400;
          response.errors = null;
          response.memberMessage = errorMessage;
          response.data = null;
          return SendResponse(res);
        } else {
          next();
        }
      }
      console.log((req.fileName.split(".").pop() || "").toLowerCase());
      const filePath = `${uploadPath}/${req.fileName}`;
      if ((req.fileName.split(".").pop() || "").toLowerCase() == "csv") {
        csv()
          .fromFile(filePath)
          .then((output) => {
            // console.log({ output });
            validateMembers([output]);
          })
          .catch((err) => {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage =
              "Some error occurred while parsing csv file.";
            return SendResponse(res);
          });
      } else {
        excel2Json(filePath, (err, output) => {
          if (err) {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.memberMessage = "Some server error has occurred.";
            response.data = null;
            return SendResponse(res);
          } else if (!output) {
            //send response to user
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.memberMessage = "File contains invalid data";
            response.data = null;
            return SendResponse(res);
          } else {
            // console.log({ output }, JSON.stringify(output));
            validateMembers(output);
          }
        });
      }
    }
  });
};

validation.checkADMembers = function(req, res, next) {
  //Check for POST request errors.
  req.checkBody("membername", "membername code is required.").notEmpty();
  req.checkBody("password", "password code is required.").notEmpty();
  req.checkBody("domain", "domain code is required.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.status = 400;
    response.errors = errors;
    response.memberMessage = "Validation errors";
    return SendResponse(res);
  } else {
    //Database functions here
    var config = {
      url: "ldap://" + req.body.domain,
      baseDN: req.body.domain
        .split(".")
        .map((term) => "dc=" + term)
        .join(","),
      membername: req.body.membername + "@" + req.body.domain,
      password: req.body.password,
      attributes: {
        staffMember: [
          "dn",
          "memberPrincipalName",
          "mobile",
          "title",
          "department",
          "company",
          "mail",
          "whenCreated",
          "employeeID",
          "displayName",
          ,
          "description",
          "office",
        ],
      },
    };
    var ad = new ActiveDirectory(config);
    var membername = req.body.membername + "@" + req.body.domain;
    var password = req.body.password;

    ad.authenticate(membername, password, function(err, auth) {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.memberMessage = "Some server error has occurred.";
        response.data = null;
        return SendResponse(res);
      }

      if (auth) {
        console.log("Authenticated!");

        var query = "cn=*";
        ad.find(query, function(err, results) {
          if (err) {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.memberMessage = "Some server error has occurred.";
            response.data = null;
            return SendResponse(res);
          } else {
            req.body.members = results ? results.members : [];
            next();
          }
        });
      } else {
        console.log("Authentication failed!");
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.memberMessage = "Authenticated failed!";
        response.data = null;
        return SendResponse(res);
      }
    });
  }
};

validation.checkFile1 = function(req, res, next) {
  var storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
      req.fileName = file.originalname;
      var ext = (req.fileName.split(".").pop() || "").toLowerCase();
      if (ext != "xls" && ext != "xlsx" && ext != "csv")
        req.error = "file format not supported";
      cb(null, req.fileName);
    },
  });

  var uploadfile = multer({
    storage: storage,
  }).single("file");

  uploadfile(req, res, function(err) {
    if (err) {
      //send response to user
      response.error = true;
      response.status = 500;
      response.errors = err;
      response.memberMessage = "Some server error has occurred.";
      response.data = null;
      return SendResponse(res);
    } else {
      if (req.error) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.memberMessage = req.error;
        response.data = null;
        return SendResponse(res);
      } else if (!req.fileName) {
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.memberMessage =
          "Excel/CSV file containing employees information is missing.";
        response.data = null;
        return SendResponse(res);
      }

      function validateMembers(output) {
        if (Object.keys(output).length !== 1) {
          //send response to user
          response.error = true;
          response.status = 400;
          response.errors = null;
          response.memberMessage =
            "Your excel file should contain only 1 sheet.";
          response.data = null;
          return SendResponse(res);
        }

        var valid = false;
        // var keys = ["EmployeeId", "EmployeeName", "EmployeeMail", "Designation", "Department", "Branch"];
        var EmailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var keys = ["Id", "Name", "Email"];

        var errorMessage = "File contains invalid data";
        req.sheets = [];
        req.totalMembers = 0;
        var Employees = [];
        req.body.members = [];
        Object.keys(output).map((sheet) => {
          req.sheets.push(output[sheet]);
          Employees = Employees.concat(output[sheet]);
        });
        req.totalMembers = Employees.length;
        let duplicates = {};
        let duplicateIds = {};

        if (Employees.length > 0) {
          valid = Employees.every((employee, i) => {
            if (!employee) {
              errorMessage = `Row ${i + 1} contains invalid data`;
              return false;
            }

            if (
              keys.some((key) => {
                if (Object.keys(employee).indexOf(key) < 0) {
                  return true;
                }
              })
            ) {
              console.log(keys, employee);
              errorMessage = `Row ${i + 1} must contains  ${keys.join(", ")}`;
              return false;
            }

            employee["Email"] = employee["Email"].trim();

            if (duplicates[employee["Email"]]) {
              errorMessage = `Row ${i + 1} contains duplicate employee email`;
              return false;
            } else {
              duplicates[employee["Email"]] = true;
            }

            if (duplicateIds[employee["Id"]]) {
              errorMessage = `Row ${i + 1} contains duplicate employee Id`;
              return false;
            } else {
              duplicateIds[employee["Id"]] = true;
            }

            if (!employee["Id"] || !employee["Name"]) {
              errorMessage = `Row ${i +
                1} contains invalid employee Id or employee Name`;
              return false;
            }

            if (!EmailRegex.test((employee["Email"] + "").toLowerCase())) {
              errorMessage = `Row ${i + 1} contains invalid employee email`;
              return false;
            }

            req.body.members.push(employee);
            return true;
          });
        }

        if (!valid) {
          //send response to user
          response.error = true;
          response.status = 400;
          response.errors = null;
          response.memberMessage = errorMessage;
          response.data = null;
          return SendResponse(res);
        } else {
          next();
        }
      }

      console.log((req.fileName.split(".").pop() || "").toLowerCase());
      const filePath = `${uploadPath}/${req.fileName}`;
      if ((req.fileName.split(".").pop() || "").toLowerCase() == "csv") {
        csv()
          .fromFile(filePath)
          .then((output) => {
            validateMembers([output]);
          })
          .catch((err) => {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.data = null;
            response.memberMessage =
              "Some error occurred while parsing csv file.";
            return SendResponse(res);
          });
      } else {
        excel2Json(filePath, (err, output) => {
          if (err) {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.memberMessage = "Some server error has occurred.";
            response.data = null;
            return SendResponse(res);
          } else if (!output) {
            //send response to user
            response.error = true;
            response.status = 400;
            response.errors = null;
            response.memberMessage = "File contains invalid data";
            response.data = null;
            return SendResponse(res);
          } else {
            validateMembers(output);
          }
        });
      }
    }
  });
};

validation.checkADMembers1 = function(req, res, next) {
  //Check for POST request errors.
  req.checkBody("membername", "membername code is required.").notEmpty();
  req.checkBody("password", "password code is required.").notEmpty();
  req.checkBody("domain", "domain code is required.").notEmpty();
  var errors = req.validationErrors(true);
  if (errors) {
    response.error = true;
    response.status = 400;
    response.errors = errors;
    response.memberMessage = "Validation errors";
    return SendResponse(res);
  } else {
    //Database functions here
    var config = {
      url: "ldap://" + req.body.domain,
      baseDN: req.body.domain
        .split(".")
        .map((term) => "dc=" + term)
        .join(","),
      membername: req.body.membername + "@" + req.body.domain,
      password: req.body.password,
      attributes: {
        staffMember: [
          "dn",
          "memberPrincipalName",
          "mobile",
          "title",
          "department",
          "company",
          "mail",
          "whenCreated",
          "employeeID",
          "displayName",
          ,
          "description",
          "office",
        ],
      },
    };
    var ad = new ActiveDirectory(config);
    var membername = req.body.membername + "@" + req.body.domain;
    var password = req.body.password;

    ad.authenticate(membername, password, function(err, auth) {
      if (err) {
        //send response to user
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.memberMessage = "Some server error has occurred.";
        response.data = null;
        return SendResponse(res);
      }

      if (auth) {
        console.log("Authenticated!");

        var query = "cn=*";
        ad.find(query, function(err, results) {
          if (err) {
            //send response to user
            response.error = true;
            response.status = 500;
            response.errors = err;
            response.memberMessage = "Some server error has occurred.";
            response.data = null;
            return SendResponse(res);
          } else {
            req.body.members = results ? results.members : [];
            next();
          }
        });
      } else {
        console.log("Authentication failed!");
        //send response to user
        response.error = true;
        response.status = 400;
        response.errors = null;
        response.memberMessage = "Authenticated failed!";
        response.data = null;
        return SendResponse(res);
      }
    });
  }
};
validation.checkValidPolicyPlan = function(req, res, next) {
  console.log({ req });
  if (req.query.importType == "file") {
    validation.checkFile(req, res, next);
  } else if (req.body.importType == "AD") {
    validation.checkADMembers(req, res, next);
  } else {
    //send response to user
    response.error = true;
    response.status = 400;
    response.errors = null;
    response.data = null;
    response.memberMessage = "Invalid import type.";
    return SendResponse(res);
  }
};

module.exports = { ...validation };
