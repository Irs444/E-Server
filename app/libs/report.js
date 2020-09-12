var fs = require("fs");
const { TemplateHandler } = require("easy-template-x");
const path = require("path");

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
  callback(null, createDocxPath);
};

module.exports = report;
