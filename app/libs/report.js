const { TemplateHandler } = require("easy-template-x");
const path = require("path");
// const libre = require("libreoffice-convert");

const carbone = require("carbone");
var fs = require("fs");

let report = {};

report.generateStaticDoc = async (id, invoice, callback) => {
  if (invoice.imageUrl) {
    invoice["invoiceLogo"] = {
      _type: "image",
      source: fs.readFileSync(
        path.resolve(__dirname, "../../" + invoice.imageUrl)
      ),
      format: "image/png",
      width: 150,
      height: 90,
    };
  }
  console.log({ invoice });
  var valueItem = [
    {
      valueText: invoice.subtotalText,
      value: "$" + invoice.subtotal,
    },
  ];
  if (invoice.tax != 0) {
    valueItem.push({
      valueText: invoice.taxText,
      value: invoice.tax + "%",
    });
  }
  if (invoice.discount != 0) {
    valueItem.push({
      valueText: invoice.discountText,
      value: invoice.discount + "%",
    });
  }
  if (invoice.shipping != 0) {
    valueItem.push({
      valueText: invoice.shippingText,
      value: "$" + invoice.shipping,
    });
  }
  if (invoice.total != 0) {
    valueItem.push({
      valueText: invoice.totalText,
      value: "$" + invoice.total,
    });
  }
  if (invoice.amountPaid != 0) {
    valueItem.push({
      valueText: invoice.amountPaidText,
      value: "$" + invoice.amountPaid,
    });
  }
  invoice["valueItem"] = valueItem;
  //subtotalText taxText discountText shippingText totalText amountPaidText
  const handler = new TemplateHandler();
  var content = fs.readFileSync(path.resolve(sample, "invoice_doc.docx"));
  const doc = await handler.process(content, invoice);
  var createDocxPath =
    reportPath + "/" + invoice._id + "/invoice-" + invoice._id + ".docx";
  fs.writeFileSync(createDocxPath, doc);
  // fs.writeFileSync(createDocxPath, doc, function(err) {
  //   if (err) {
  //     callback(err);
  //   } else {
  //     callback(null, createDocxPath);
  //   }
  // });

  const extend = ".pdf";
  // const enterPath = path.join(__dirname, "../../" + createDocxPath);
  // const outputPath =
  //   reportPath + "/" + invoice._id + "/invoice-" + invoice._id + extend;
  // console.log({ outputPath });

  // carbone.render(
  //   path.resolve(sample, "invoice_doc.docx"),
  //   {},
  //   { convertTo: "pdf" },
  //   function(err, result) {
  //     if (err) {
  //       return console.log("error----------------", { err });
  //     }
  //     // write the result
  //     fs.writeFileSync(outputPath, result);
  //   }
  // );
  // Read file
  // const file = fs.readFileSync(enterPath);
  // Convert it to pdf format with undefined filter (see Libreoffice doc about filter)
  // libre.convert(enterPath, extend, undefined, (err, done) => {
  //   if (err) {
  //     console.log(`Error converting file: ${err}`);
  //   }
  //   // Here in done you have pdf file which you can save or transfer in another stream
  //   fs.writeFileSync(outputPath, done);
  //   // callback(null, createDocxPath);
  // });
  callback(null, createDocxPath);
};

module.exports = report;
