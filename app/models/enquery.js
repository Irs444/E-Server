var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Enquery = new Schema({
  productId: {
    type: ObjectId,
    default: null,
    ref: "product",
  },
  memberId: {
    type: ObjectId,
    default: null,
    ref: "member",
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
  message: {
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

mongoose.model("enquery", Enquery);
