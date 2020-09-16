var session = require("../libs/session");
var report = require("../libs/report");
var path = require("path");
const carbone = require("carbone");
var mime = require("mime");
var mongoose = require("mongoose");
var Session = mongoose.model("session");
// var User = mongoose.model("user");
var Invoice = mongoose.model("invoice");
var InvoiceNumber = mongoose.model("invoice_number");
// var _ = require("lodash");
var mkdirp = require("mkdirp");
// const word2pdf = require("word2pdf-promises");
const fs = require("fs");
/* the response object for API
    error : true / false 
    code : contains any error code
    data : the object or array for data
    memberMessage : the message for user, if any.
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
var manageAssessments = function(assessments) {
  var assessmentsData = {};
  for (let i = 0; i < assessments.length; i++) {
    if (assessmentsData[assessments[i]["level"]]) {
      var data = [];
      data = assessmentsData[assessments[i]["level"]];
      data.push(assessments[i]);
      assessmentsData[assessments[i]["level"]] = data;
    } else {
      assessmentsData[assessments[i]["level"]] = [assessments[i]];
    }
  }
  return assessmentsData;
};
var methods = {};

/*
Routings/controller goes here
*/
module.exports.controller = function(router) {
  router
    .route("/invoice/number")
    .get(session.checkToken, methods.getInvoiceNumber);
  router
    .route("/invoice")
    .get(session.checkToken, methods.getInvoice)
    .post(session.checkToken, methods.generateDocReportv2);
  router.route("/invoice/:id/:fileName").get(function(req, res) {
    console.log(req.params.fileName, "req.params.fileName");
    res.sendFile(reportPath + "/" + req.params.id + "/" + req.params.fileName);
  });
  router.route("/invoice/sample/:name").get(function(req, res) {
    // console.log(req.params.fileName, "req.params.fileName");
    var excelfile = `${reportPath}/invoice-${req.params.name}.pdf`;
    res.sendFile(
      excelfile
      // reportPath + "/" + req.params.id + "/" + req.params.fileName
    );
  });
  router.route("/invoice/sample").get(function(req, res) {
    const libre = require("libreoffice-convert");

    // const path = require("path");
    // const fs = require("fs");

    const extend = ".pdf";
    const enterPath = path.join(__dirname, "/public/sample/invoice_doc.docx"); // path.join(__dirname, "/resources/example.docx");
    const outputPath = path.join(__dirname, `/resources/example${extend}`);

    var excelfile = `${reportPath}/invoice-${req.query.name}.pdf`;
    console.log({
      excelfile,
      enterPath: sample + "/invoice_doc.docx",
    });
    var docxConverter = require("docx-pdf");

    docxConverter(path.resolve(sample, "invoice_doc.docx"), excelfile, function(
      err,
      result
    ) {
      if (err) {
        console.log(err);
      }
      console.log("result" + result);
    });
    // Read file
    // var content = fs.readFileSync(sample, "/invoice_doc.docx");
    // const file = fs.readFileSync(sample, "/invoice_doc.docx");
    // Convert it to pdf format with undefined filter (see Libreoffice doc about filter)
    // libre.convert(content, extend, undefined, (err, done) => {
    //   if (err) {
    //     console.log(`Error converting file: ${err}`);
    //   }
    //   // Here in done you have pdf file which you can save or transfer in another stream
    //   fs.writeFileSync(excelfile, done);
    // });
    // carbone.render(
    //   path.resolve(sample, "invoice_doc.docx"),
    //   {},
    //   { convertTo: "pdf" },
    //   function(err, result) {
    //     if (err) {
    //       return console.log("error----------------", { err });
    //     }
    //     // write the result
    //     fs.writeFileSync(excelfile, result);
    //   }
    // );
  });
};

/*=====================================
***   get list of invoices  ***
=======================================*/

methods.getInvoiceNumber = async (req, res) => {
  InvoiceNumber.findOne({})
    .lean()
    .exec((err, invoiceNumber) => {
      console.log({ invoiceNumber });
      if (err) {
        //send response to client
        response.error = true;
        response.status = 500;
        response.errors = err;
        response.data = null;
        response.memberMessage = "Some server error has occurred.";
        return SendResponse(res);
      } else if (invoiceNumber) {
        //send response to client
        // invoiceNumber.invoice = invoiceNumber.invoice + 1;
        InvoiceNumber.findOneAndUpdate(
          {
            _id: invoiceNumber._id,
          },
          {
            invoice: invoiceNumber.invoice + 1,
          },
          { new: true }
        ).exec((err, invoiceNumber) => {
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
            response.data = invoiceNumber;
            response.memberMessage = "Fetched successfully.";
            return SendResponse(res);
          }
        });
      } else {
        invoiceNumber = new InvoiceNumber({
          invoice: 100,
        });
        invoiceNumber.save((err) => {
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
            response.data = invoiceNumber;
            response.memberMessage = "Fetched successfully.";
            return SendResponse(res);
          }
        });
      }
    });
};
methods.getInvoice = async (req, res) => {
  if (req.query.invoiceId) {
    Invoice.findOne({ _id: req.query.invoiceId })
      .populate("createrId", "name profilePicUrl")
      .lean()
      .exec((err, invoices) => {
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
          response.data = invoices;
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
    Invoice.find(query)
      .populate("createrId", "name profilePicUrl")
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .skip(page * limit)
      .lean()
      .exec((err, invoices) => {
        if (err) {
          //send response to client
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.data = null;
          response.memberMessage = "Some server error has occurred.";
          return SendResponse(res);
        } else {
          Invoice.count(query, async function(err, totalRecords) {
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
              response.data = invoices;
              response.totalRecords = totalRecords;
              response.memberMessage = "List of invoice fetched successfully.";
              return SendResponse(res);
            }
          });
        }
      });
  }
};

/*-----  End of getdealers  ------*/
/*============================================
***   generate doc report of campaign  ***
==============================================*/

methods.generateDocReportv2 = async function(req, res) {
  // Database functions here
  console.log("chartReport");
  // var staffMember = {};
  var query = {};

  var invoice = new Invoice({
    ...req.body,
    createrId: req.staffMember._id,
  });
  invoice.save((err) => {
    if (err) {
      response.error = true;
      response.status = 500;
      response.errors = err;
      response.data = null;
      response.memberMessage = "Some server error has occurred.";
      return SendResponse(res);
    } else {
      mkdirp(reportPath + "/" + invoice._id, function() {
        try {
          report.generateStaticDoc(invoice._id, invoice, (err, written) => {
            // return
            if (err) {
              console.log(err);
              // send response to client
              response.error = true;
              response.status = 500;
              response.errors = err;
              response.memberMessage = "Some server error has occurred,";
              response.data = null;
              return SendResponse(res);
            } else {
              // console.log("Finish to create a Document file.\nTotal bytes created: " + written + "\n");
              // send response to client
              var excelfile = `${reportPath}/${invoice._id}/invoice-${invoice._id}.docx`;
              // var createDocxPath =
              //   reportPath + "/" + invoice._id + "/invoice-" + invoice._id + ".docx";
              // fs.writeFileSync(createDocxPath, doc);
              var excelfilename = path.basename(excelfile);
              console.log(excelfile, "File");
              response.error = false;
              response.status = 200;
              response.errors = null;
              response.memberMessage = "Invoice created";
              response.data = `/invoice/${invoice._id}/${excelfilename}`;
              return SendResponse(res);
            }
          });
        } catch (err) {
          //send response to client
          response.error = true;
          response.status = 500;
          response.errors = err;
          response.data = null;
          response.memberMessage =
            "Some server error has occurred while generating doc report.";
          return SendResponse(res);
        }
      });
    }
  });
};

/*-----  End of generateDocReport  ------*/
