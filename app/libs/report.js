const { TemplateHandler } = require("easy-template-x");
const path = require("path");
// const libre = require("libreoffice-convert");
var pdf = require("pdf-creator-node");
const carbone = require("carbone");
var fs = require("fs");

let report = {};

report.generateStaticDoc2 = async (id, invoice, callback) => {
  // if (invoice.imageUrl) {
  invoice["invoiceLogo"] = {
    _type: "image",
    source: fs.readFileSync(path.resolve(sample, "ATS_Logo.png")),
    format: "image/png",
    width: 290,
    height: 70,
  };
  // }
  console.log({ invoice });
  var valueItem = [
    {
      valueText: invoice.subtotalText,
      value: "QR " + invoice.subtotal,
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
      value: "QR " + invoice.shipping,
    });
  }
  if (invoice.total != 0) {
    valueItem.push({
      valueText: invoice.totalText,
      value: "QR " + invoice.total,
    });
  }
  if (invoice.amountPaid != 0) {
    valueItem.push({
      valueText: invoice.amountPaidText,
      value: "QR " + invoice.amountPaid,
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
  //     console.log(`Error converting file: QR {err}`);
  //   }
  //   // Here in done you have pdf file which you can save or transfer in another stream
  //   fs.writeFileSync(outputPath, done);
  //   // callback(null, createDocxPath);
  // });
  callback(null, createDocxPath);
};

report.generateStaticDoc = async (id, invoice, callback) => {
  // if (invoice.imageUrl) {
  invoice["invoiceLogo"] = {
    _type: "image",
    source: fs.readFileSync(path.resolve(sample, "ATS_Logo.png")),
    format: "image/png",
    width: 290,
    height: 70,
  };
  // }
  // console.log({ invoice });
  var valueItem = [
    {
      valueText: invoice.subtotalText,
      value: "QR " + invoice.subtotal,
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
      value: "QR " + invoice.shipping,
    });
  }
  if (invoice.total != 0) {
    valueItem.push({
      valueText: invoice.totalText,
      value: "QR " + invoice.total,
    });
  }
  if (invoice.amountPaid != 0) {
    valueItem.push({
      valueText: invoice.amountPaidText,
      value: "QR " + invoice.amountPaid,
    });
  }
  invoice["valueItem"] = valueItem;
  var infoInvoiceItems = [];
  var count = 1;
  for (let i = 0; i < invoice.infoInvoiceItems.length; i++) {
    infoInvoiceItems.push({
      itemIndex: count,
      item: invoice.infoInvoiceItems[i]["item"],
      quantity: invoice.infoInvoiceItems[i]["quantity"],
      rate: invoice.infoInvoiceItems[i]["rate"],
      amount: invoice.infoInvoiceItems[i]["amount"],
    });
    count = count + 1;
  }
  var invoiceInfo = {};
  invoiceInfo["image"] = process.env.SAMPLE_URL + "/ATS_Logo.png";
  invoiceInfo["imageSeal"] = process.env.SAMPLE_URL + "/ATS_Seal.png";
  invoiceInfo["valueItem"] = valueItem;
  invoiceInfo["invoice"] = invoice.invoice;
  invoiceInfo["invoiceNumber"] = invoice.invoiceNumber;
  invoiceInfo["infoInvoiceItems"] = infoInvoiceItems;
  invoiceInfo["amountText"] = invoice.amountText;

  invoiceInfo["rateText"] = invoice.rateText;
  invoiceInfo["quantityText"] = invoice.quantityText;
  invoiceInfo["itemText"] = invoice.itemText;
  invoiceInfo["balanceDue"] = invoice.balanceDue;
  invoiceInfo["balanceDueText"] = invoice.balanceDueText;
  invoiceInfo["amountPaid"] = invoice.amountPaid;
  invoiceInfo["amountPaidText"] = invoice.amountPaidText;
  invoiceInfo["total"] = invoice.total;
  invoiceInfo["totalText"] = invoice.totalText;

  invoiceInfo["shipping"] = invoice.shipping;
  invoiceInfo["shippingText"] = invoice.shippingText;
  invoiceInfo["discount"] = invoice.discount;
  invoiceInfo["discountText"] = invoice.discountText;
  invoiceInfo["tax"] = invoice.tax;
  invoiceInfo["taxText"] = invoice.taxText;
  invoiceInfo["subtotal"] = invoice.subtotal;
  invoiceInfo["subtotalText"] = invoice.subtotalText;

  invoiceInfo["terms"] = invoice.terms;
  invoiceInfo["termsText"] = invoice.termsText;
  invoiceInfo["notes"] = invoice.notes;
  invoiceInfo["notesText"] = invoice.notesText;
  invoiceInfo["dueDate"] = invoice.dueDate;
  invoiceInfo["dueDateText"] = invoice.dueDateText;
  invoiceInfo["paymentTerms"] = invoice.paymentTerms;
  invoiceInfo["paymentTermsText"] = invoice.paymentTermsText;

  invoiceInfo["billDate"] = invoice.billDate;
  invoiceInfo["billDateText"] = invoice.billDateText;
  invoiceInfo["shipTo"] = invoice.shipTo;
  invoiceInfo["shipToText"] = invoice.shipToText;
  invoiceInfo["billTo"] = invoice.billTo;
  invoiceInfo["billToText"] = invoice.billToText;
  invoiceInfo["invoiceForm"] = invoice.invoiceForm;

  var options = {
    format: "A4",
    orientation: "portrait",
    border: "10mm",
    // header: {
    //   height: "45mm",
    //   contents: '<div style="text-align: center;">Author: Shyam Hajare</div>',
    // },//Invoice - system generated invoice doesn't require any signature.
    // footer: {
    //   height: "28mm",
    //   contents: {
    //     first: "Cover page",
    //     2: "Second page", // Any page number is working. 1-based index
    //     default:
    //       '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
    //     last: "Last Page",
    //   },
    // },
    footer: {
      height: "20mm",
      width: "100%",
      contents: ` 
      <table class="table table-striped" style="width: 100%; font-size: 8px;">
        <thead>
          <tr>
            <th
              style=" width: 100%;  border-top: 3px solid #000; font-weight: 600; text-align: center;"
            >
              <p style="color: #000;  width: 100%;  font-size: 8px;    text-align: center; ">Invoice - System Generated. Invoice doesn't require any signature.</p>
            </th>
          </tr>
        </thead>
      </table>
          `, // fallback value
    },
  };
  var users = [
    {
      name: "Shyam",
      age: "26",
    },
    {
      name: "Navjot",
      age: "26",
    },
    {
      name: "Vitthal",
      age: "26",
    },
  ];
  console.log("---------", { imageSeal: invoiceInfo.imageSeal }, "-----");
  // var html = fs.readFileSync("template.html", "utf8");
  var html = fs.readFileSync(path.resolve(sample, "newbill.html"), "utf8");
  var createDocxPath =
    reportPath + "/" + invoice._id + "/invoice-" + invoice._id + ".pdf";
  var document = {
    html: html,
    data: invoiceInfo,
    path: createDocxPath,
  };
  pdf
    .create(document, options)
    .then((res) => {
      console.log(res);
      callback(null, createDocxPath);
    })
    .catch((error) => {
      console.error(error);
      callback(error);
    });
  //subtotalText taxText discountText shippingText totalText amountPaidText
  // const handler = new TemplateHandler();
  // var content = fs.readFileSync(path.resolve(sample, "invoice_doc.docx"));
  // const doc = await handler.process(content, invoice);
  // var createDocxPath =
  //   reportPath + "/" + invoice._id + "/invoice-" + invoice._id + ".docx";
  // fs.writeFileSync(createDocxPath, doc);

  // const extend = ".pdf";

  // callback(null, createDocxPath);
};

module.exports = report;
