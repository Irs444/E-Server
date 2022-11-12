var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var User = new Schema({
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
  countryCode: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: true, //active
    enum: [true, false],
  },
  staffMemberId: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
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

var UserSession = new Schema({
  userId: {
    type: ObjectId,
    default: null,
    ref: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  authToken: {
    type: String,
  },
});

mongoose.model("UserSession", UserSession, "UserSession");
mongoose.model("User", User, "User");
