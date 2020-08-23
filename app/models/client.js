var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Client = new Schema({
  // productId: {
  //   type: ObjectId,
  //   default: null,
  //   ref: "product",
  // },
  // adminId: {
  //   type: ObjectId,
  //   default: null,
  //   ref: "staff-member",
  // },
  name: {
    type: String,
    default: "",
  },
  contactNumber: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    default: "",
  },
  postalCode: {
    type: String,
    default: "",
  },
  country: {
    type: String,
    default: "",
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
});

mongoose.model("client", Client);
