const mongoose = require("mongoose");
const Schema = mongoose.Schema;

class BaseSchema extends Schema {
    constructor(schema) {
        super(schema);
        this.set('toJSON', {
            virtuals: true,
            transform: (doc, converted) => { delete converted._id; }
        }
        );
        this.set('toObject', {virtuals:true});        
    };
}

const LocationSchema = new BaseSchema({
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    areaName: { type: String, required: true },
    fullAddress: { type: String },
});


const DishSchema = new BaseSchema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: String, required: true },
    category: { type: String, required: true },
    dishType: { type: String, required: true },
    specialTag: { type: String, enum: ["Bestseller"] }
});

const TodaySpecialSchema = new BaseSchema({
    dish: { type: DishSchema, required: true },
    asOfDate: { type: Date, default: Date.now() },
})

const RestaurantMetadataSchema = new BaseSchema({
    isActive: { type: Boolean, default: false },
    onboardedOn: { type: Date },
    subscriptionExpiresOn: { type: Date },
    isFreeSubscription: { type: Boolean },
});

const RestaurantServiceType = ["Dine In", "Delivery", "Both"];

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

    dineInServiceTimings: {type: [String], default: []},
    deliveryServiceTimings: {type: [String], default: []},
    serviceType: { type: String, enum: RestaurantServiceType },

    facilities: { type: [String], default: [] },

    metadata: { type: RestaurantMetadataSchema }
});


const RestaurantModel = mongoose.model("Restaurant", RestaurantSchema);

module.exports = { RestaurantModel, DishSchema, LocationSchema }


