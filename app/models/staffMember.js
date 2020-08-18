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
  readOnly: {
    type: Boolean,
    default: false,
    enum: [true, false],
  },
  accessLevel: {
    type: Number,
    default: 1, //super admin, organization, agent
    enum: [1, 2, 3, 4, 5, 6],
  },
  active: {
    type: Number,
    default: 1, //active
    enum: [0, 1],
  },
  appVersion: {
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
