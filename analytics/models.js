const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const RestaurantAnalyticsSchema = new Schema({
    restaurantId: { type: ObjectId, required: true, index: { unique: true, dropDups: true } },
    views: { type: Number, default: 0 },
})

const RestaurantAnalyticsModel = mongoose.model("RestaurantAnalytics", RestaurantAnalyticsSchema)

module.exports = { RestaurantAnalyticsModel }
