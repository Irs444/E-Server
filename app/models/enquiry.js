var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Enquiry = new Schema({
  productId: {
    type: ObjectId,
    default: null,
    ref: "product",
  },
  clientId: {
    type: ObjectId,
    default: null,
    ref: "client",
  },
  staffMemberId: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  quantity: {
    type: Number,
    default: 0,
  },
  contactUs: {
    type: Boolean,
    default: false,
  },
  subject: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: true, //active
    enum: [true, false],
  },
  isApproved: {
    type: Boolean,
    default: false, //active
    enum: [true, false],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

mongoose.model("enquiry", Enquiry);
