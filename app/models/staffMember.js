var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var staffMember = new Schema({
  name: {
    type: String,
    default: "",
  },
  dealerId: {
    type: ObjectId,
    default: null,
    ref: "dealer",
  },
  profilePicUrl: {
    type: String,
    default: "/staffMember/profile/default-staffMember.png",
  },
  email: {
    type: String,
    default: "",
    index: {
      unique: true,
    },
  },
  contactNumber: {
    type: String,
    default: "",
  },
  password: {
    type: String,
    default: "",
  },
  passwordReset: {
    type: Boolean,
    default: false,
    enum: [true, false],
  },
  readOnly: {
    type: Boolean,
    default: false,
    enum: [true, false],
  },
  accessLevel: {
    type: Number,
    default: 1, //super admin, organization, agent
    enum: [1, 2, 3],
  },
  active: {
    type: Boolean,
    default: true,
    enum: [true, false],
  },
  appVersion: {
    type: String,
    default: "",
  },
  city: {
    type: String,
    default: "",
  },
  aboutMe: {
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
  address: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

var session = new Schema({
  staffMemberId: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  authToken: {
    type: String,
  },
});

mongoose.model("staff-member", staffMember);
mongoose.model("session", session);
