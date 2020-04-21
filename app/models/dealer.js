var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var Dealer = new Schema({
  name: {
    type: String,
    default: ""
  },
  dealerCode: {
    type: String,
    index: {
      unique: true
    }},
  contactNumber: {
    type: String,
    index: {
      unique: true
    }
  },
  email: {
    type: String,
    default: ""
  }, 
  address: {
    type: String,
    default: ""
  },
  active: {
    type: Number,
    default: 1, //active
    enum: [0, 1]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

mongoose.model("dealer", Dealer);
