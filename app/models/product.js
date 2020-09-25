var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var product = new Schema({
  brandId: {
    type: ObjectId,
    default: null,
    ref: "brand",
  },
  categoryId: {
    type: ObjectId,
    default: null,
    ref: "category",
  },
  subCategory: [
    {
      customOption: { type: Boolean, default: false },
      id: { type: String, default: "" },
      label: { type: String, default: "" },
    },
  ],
  createrId: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  sTitle: {
    type: String,
    default: "",
  },
  sKeyword: {
    type: String,
    default: "",
  },
  sUrl: {
    type: String,
    default: "",
  },

  fullUrl: {
    type: String,
    default: "",
  },
  brandUrl: {
    type: String,
    default: "",
  },
  categoryUrl: {
    type: String,
    default: "",
  },
  bannerImageUrl: {
    type: String,
    default: "",
  },
  isBannerShow: {
    type: Boolean,
    default: false, //active
    enum: [false, true],
  },
  categories: {
    type: String,
    default: "",
  },
  subCategories: {
    type: String,
    default: "",
  },
  model: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  shortDescription: {
    type: String,
    default: "",
  },
  pictursList: [
    {
      uid: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        default: "",
      },
      name: {
        type: String,
        default: "",
      },
      url: {
        type: String,
        default: "",
      },
    },
  ],
  pdfFileName: {
    type: String,
    default: "",
  },
  pdfFileUrl: {
    type: String,
    default: "",
  },
  active: {
    type: Boolean,
    default: true, //active
    enum: [false, true],
  },
  quality: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  approvedBy: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  approvedAt: {
    type: Date,
    default: "",
  },
  public: {
    type: Boolean,
    default: true, //inActive
    enum: [false, true],
  },
});

var brand = new Schema({
  createrId: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  sTitle: {
    type: String,
    default: "",
  },
  sKeyword: {
    type: String,
    default: "",
  },
  sUrl: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  shortDescription: {
    type: String,
    default: "",
  },
  imageUrl: {
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
  approvedBy: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  approvedAt: {
    type: Date,
    default: "",
  },
  public: {
    type: Boolean,
    default: true, //inActive
    enum: [false, true],
  },
});

var Category = new Schema({
  createrId: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  sTitle: {
    type: String,
    default: "",
  },
  sKeyword: {
    type: String,
    default: "",
  },
  sUrl: {
    type: String,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  subCategory: [
    {
      customOption: { type: Boolean, default: false },
      id: { type: String, default: "" },
      label: { type: String, default: "" },
    },
  ],
  shortDescription: {
    type: String,
    default: "",
  },
  imageUrl: {
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
  approvedBy: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  approvedAt: {
    type: Date,
    default: "",
  },
  public: {
    type: Boolean,
    default: true, //inActive
    enum: [false, true],
  },
});

var BannerImage = new Schema({
  createrId: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  productId: {
    type: ObjectId,
    default: null,
    ref: "category",
  },
  title: {
    type: String,
    default: "",
  },
  subTitle: {
    type: String,
    default: "",
  },
  imageUrl: {
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
  approvedBy: {
    type: ObjectId,
    default: null,
    ref: "staff-member",
  },
  approvedAt: {
    type: Date,
    default: "",
  },
  public: {
    type: Boolean,
    default: true, //inActive
    enum: [false, true],
  },
});

mongoose.model("banners_image", BannerImage);
mongoose.model("category", Category);
mongoose.model("brand", brand);
mongoose.model("product", product);
