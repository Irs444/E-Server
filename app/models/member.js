var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Member = new Schema({
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
  zipCode: {
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

mongoose.model("member", Member);
