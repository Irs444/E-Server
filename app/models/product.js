var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var product = new Schema({
  brandId: {
    type: ObjectId,
    default: null,
    ref: "brand",
  },
  name: {
    type: String,
    default: "",
  },
  avatar: {
    type: String,
    default: "/api/media/default-member.png",
  },
  email: {
    type: String,
    default: "",
    // index: {
    //   unique: true
    // }
  },
  contactNumber: {
    type: String,
    // default: ""
    index: {
      unique: true,
    },
  },
  password: {
    type: String,
    default: "",
  },
  dealerId: {
    type: ObjectId,
    default: null,
    ref: "dealer",
  },
  memberType: {
    type: Number,
    default: 1, //super admin, dealer, agent
    enum: [1, 2, 3],
  },
  isSubscribe: {
    type: Number,
    default: 0, //unsubscribe
    enum: [0, 1],
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
  expiredAt: {
    type: Date,
    default: "",
  },
  subscribedAt: {
    type: Date,
    default: "",
  },
});

var brand = new Schema({
  memberId: {
    type: ObjectId,
    default: null,
    ref: "member",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  authToken: {
    type: String,
  },
});

mongoose.model("brand", brand);
mongoose.model("product", product);
