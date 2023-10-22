const mongoose = require("mongoose");
const Schema = mongoose.Schema;

class BaseSchema extends Schema {
  constructor(schema) {
    super(schema);
    this.set("toJSON", {
      virtuals: true,
      transform: (doc, converted) => {
        delete converted._id;
      },
    });
    this.set("toObject", { virtuals: true });
  }
}

const LocationSchema = new BaseSchema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  areaName: { type: String, required: true },
  fullAddress: { type: String },
});

const DishTypeEnum = ["veg", "veg_egg", "non_veg"]

const DishSchema = new BaseSchema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: String, required: true },
  category: { type: String, required: true },
  dishType: { type: DishTypeEnum, required: true },
  isRecommended: {type: Boolean, default: false},
  specialTag: { type: String, enum: ["Bestseller"] },
});


const TodaySpecialSchema = new BaseSchema({

  dish: { type: DishSchema, required: true },
  asOfDate: { type: Date, default: Date.now() },
});

const RestaurantMetadataSchema = new BaseSchema({
  isActive: { type: Boolean, default: false },
  onboardedOn: { type: Date },
  subscriptionExpiresOn: { type: Date },
  isFreeSubscription: { type: Boolean },
});

const RestaurantServiceTypeEnum = ["Dine In", "Delivery", "Dine In & Delivery"];

const TimeOfDaySchema = new BaseSchema({
  hour: { type: Number, required: true },
  minute: { type: Number, required: true },
});

const TimePeriodSchema = new BaseSchema({
  startTime: { type: TimeOfDaySchema, required: true },
  endTime: { type: TimeOfDaySchema, required: true },
});

const RestaurantSchema = new BaseSchema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  imageUrl: { type: String },
  contacts: { type: [String], default: [] },
  location: { type: LocationSchema, required: true },
  priceBand: { type: String },
  cuisineTags: { type: [String], default: [] },
  dishes: { type: [DishSchema], required: true },
  todaySpecial: { type: TodaySpecialSchema },

  dineInServiceTimings: { type: [TimePeriodSchema], default: [] },
  deliveryServiceTimings: { type: [TimePeriodSchema], default: [] },
  serviceType: { type: String, enum: RestaurantServiceTypeEnum },

  facilities: { type: [String], default: [] },

  metadata: { type: RestaurantMetadataSchema },
});

const RestaurantModel = mongoose.model("Restaurant", RestaurantSchema);

module.exports = { RestaurantModel, DishSchema, LocationSchema };
