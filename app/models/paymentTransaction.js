const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const PaymentTransaction = new Schema({
  paymentId: {
    type: String,
    default: "",
  },
  staffMemberId: {
    type: ObjectId,
    default: null,
    ref: "staffMember",
  },
  status: {
    type: String,
    default: "",
  },
  price: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiredAt: {
    type: Date,
    default: null,
  },
});

mongoose.model("paymentTransaction", PaymentTransaction);
