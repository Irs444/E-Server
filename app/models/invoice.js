var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Invoice = new Schema({
  createrId: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  active: {
    type: Boolean,
    default: true, //active
    enum: [true, false],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  imageUrl: {
    type: String,
    default: "",
  },
  invoice: {
    type: String,
    default: "",
  },
  invoiceNumber: {
    type: String,
    default: "",
  },
  invoiceForm: {
    type: String,
    default: "",
  },
  billToText: {
    type: String,
    default: "",
  },
  billTo: {
    type: String,
    default: "",
  },
  shipToText: {
    type: String,
    default: "",
  },
  shipTo: {
    type: String,
    default: "",
  },
  billDateText: {
    type: String,
    default: "",
  },
  billDate: {
    type: String,
    default: "",
  },
  paymentTermsText: {
    type: String,
    default: "",
  },
  paymentTerms: {
    type: String,
    default: "",
  },
  dueDateText: {
    type: String,
    default: "",
  },
  dueDate: {
    type: String,
    default: "",
  },
  notesText: {
    type: String,
    default: "",
  },
  notes: {
    type: String,
    default: "",
  },
  termsText: {
    type: String,
    default: "",
  },
  terms: {
    type: String,
    default: "",
  },
  subtotalText: {
    type: String,
    default: "",
  },
  subtotal: {
    type: Number,
    default: 0,
  },
  taxText: {
    type: String,
    default: "",
  },
  tax: {
    type: Number,
    default: 0,
  },
  discountText: {
    type: String,
    default: "",
  },
  discount: {
    type: Number,
    default: 0,
  },
  shippingText: {
    type: String,
    default: "",
  },
  shipping: {
    type: Number,
    default: 0,
  },
  totalText: {
    type: String,
    default: "",
  },
  total: {
    type: Number,
    default: 0,
  },
  amountPaidText: {
    type: String,
    default: "",
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  balanceDueText: {
    type: String,
    default: "",
  },
  balanceDue: {
    type: Number,
    default: 0,
  },
  itemText: {
    type: String,
    default: "",
  },
  quantityText: {
    type: String,
    default: "",
  },
  rateText: {
    type: String,
    default: "",
  },
  amountText: {
    type: String,
    default: "",
  },
  infoInvoiceItems: [
    {
      item: {
        type: String,
        default: "",
      },
      quantity: {
        type: Number,
        default: 0,
      },
      rate: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },
  ],
});
mongoose.model("invoice", Invoice);
