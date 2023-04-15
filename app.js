const express = require("express");
const { RestaurantModel } = require("./models")
const { RestaurantAnalyticsModel } = require("./analytics/models");
const haversine = require('haversine-distance')
const cron = require('node-cron');
const bodyParser = require('body-parser')
const MiniSearch = require('minisearch')
const initDatabaseConnection = require('./init_db')

initDatabaseConnection();

const app = express();
app.use(bodyParser.json())

// TODO: only use cors for local testing
const cors = require("cors");
app.use(cors());

var PORT = 3000;
app.listen(PORT, err => {
  if (err) console.log(`err while starting server ${err}`);
  console.log(`Server listening on port ${PORT}`);
});

// cached restaurants in memory
var allRestaurantsByIdCached = {};
var isCached = false;
var restaurantNameSearchIndex = new MiniSearch({ fields: ['name'], storeFields: ['name', 'id', 'isActive'], idField: 'id' });
var dishNameSearchIndex = new MiniSearch({ fields: ['dishName'], storeFields: ['dishName'], idField: 'dishName' });
var resaturantByNameAndDishesSearchIndex = new MiniSearch({ fields: ['name', 'dishes', 'isActive'], storeFields: ['id', 'isActive'], idField: 'id' });
var uniqueDishNames = new Set();

function serializeRestaurantTiming(timing) {
  function serializeTime(value) {
    var hours = parseInt(value.split(':')[0]);
    var minutes = parseInt(value.split(':')[1]);

    const mt = hours < 12 ? 'am' : 'pm';
    if(hours > 12) hours = hours - 12;

    if (minutes == 0) return `${hours}${mt}`;

    return `${hours}.${minutes}${mt}`;
  }
  const opensAt = serializeTime(timing.split('-')[0].trim());
  const closesAt = serializeTime(timing.split('-')[1].trim());
  return `${opensAt} - ${closesAt}`;
}

function serializeRestaurantsForResponse(restaurants) {
  // transform restaurants data according to FE
  const serializedData = restaurants.map(res => res.toJSON());
  for (var data of serializedData) {
    data.dineInServiceTimings = data.dineInServiceTimings.map(timing => serializeRestaurantTiming(timing));
    data.deliveryServiceTimings = data.deliveryServiceTimings.map(timing => serializeRestaurantTiming(timing));

    if (data.serviceType == 'Both') {
      data.serviceType = "Dine In & Delivery";
    }
  }
  return serializedData;
};


function filter_active_restaurants(allRestaurants) {
  var filteredRestaurants = []
  for (var restaurant of allRestaurants) {
    if (restaurant.metadata.isActive) {
      filteredRestaurants.push(restaurant);
    }
  }
  return filteredRestaurants;
}

function on_restaurant_add_or_update(restaurant) {
  allRestaurantsByIdCached[`${restaurant.id}`] = restaurant;

  // Adding to search indices and helper variables
  var dishNames = []
  for (var dish of restaurant.dishes) {
    dishNames.append(dish.toLowerCase());
  }

  var nameDoc = { 'id': restaurant.id, 'name': restaurant.name.toLowerCase(), 'isActive': restaurant.metadata.isActive };
  var nameAndDishesDoc = { 'id': restaurant.id, 'name': restaurant.name.toLowerCase(), 'dishes': dishNames, 'isActive': restaurant.metadata.isActive };


  var dishDocs = [];
  for (var dishName of dishNames) {
    if (!uniqueDishNames.has(dishName)) {
      uniqueDishNames.add(dishName);
      dishDocs.push({ 'dishName': dishName });
    }
  }

  // discarding old entries if exist
  if (restaurantNameSearchIndex.has(restaurant.id)) {
    restaurantNameSearchIndex.discard(restaurant.id);
  }
  if (resaturantByNameAndDishesSearchIndex.has(restaurant.id)) {
    resaturantByNameAndDishesSearchIndex.discard(restaurant.id);
  }

  // adding entries to search indices
  restaurantNameSearchIndex.add(nameDoc);
  resaturantByNameAndDishesSearchIndex.add(nameAndDishesDoc);
  dishNameSearchIndex.addAll(dishDocs);

}

async function pre_process_search_index_from_scratch(restaurants) {
  // empty the current search indices and helper variables
  restaurantNameSearchIndex.removeAll();
  dishNameSearchIndex.removeAll();
  resaturantByNameAndDishesSearchIndex.removeAll();
  uniqueDishNames = new Set();

  // build indices from scratch
  var nameDocs = [];
  var nameAndDishesDocs = [];
  for (var restaurant of restaurants) {
    nameDocs.push({
      'id': restaurant.id,
      'name': restaurant.name.toLowerCase(),
      'isActive': restaurant.metadata.isActive,
    });

    var dishNames = []
    for (var dish of restaurant.dishes) {
      var dishName = dish.name.toLowerCase();
      dishNames.push(dishName);
      uniqueDishNames.add(dishName);
    }

    nameAndDishesDocs.push({
      'id': restaurant.id,
      'name': restaurant.name.toLowerCase(),
      'dishes': dishNames,
      'isActive': restaurant.metadata.isActive,
    });
  }

  var dishDocs = []
  for (var dishName of uniqueDishNames) {
    dishDocs.push({ 'dishName': dishName });
  }

  await Promise.all([
    restaurantNameSearchIndex.addAllAsync(nameDocs),
    dishNameSearchIndex.addAllAsync(dishDocs),
    resaturantByNameAndDishesSearchIndex.addAllAsync(nameAndDishesDocs),
  ])
}


async function get_and_cache_all_restaurants({ returnOnlyActive = true, resetCache = false } = {}) {
  if (resetCache) { isCached = false; allRestaurantsByIdCached = {}; }

  var allRestaurants;
  if (isCached) {
    allRestaurants = Object.values(allRestaurantsByIdCached);
  } else {
    allRestaurants = await RestaurantModel.find();
    for (var restaurant of allRestaurants) {
      allRestaurantsByIdCached[`${restaurant.id}`] = restaurant;
    }
    isCached = true;

    // preparing search index for active restaurants
    await pre_process_search_index_from_scratch(allRestaurants);
  }
  if (returnOnlyActive) return filter_active_restaurants(allRestaurants);
  else return allRestaurants;
}


const myLogger = function (req, res, next) {
  console.log(`request hit: ${req.originalUrl}`)
  next();
}
app.use(myLogger);

app.post("/restaurants/search_suggestions", async (req, res) => {
  var searchText = req.body.searchText;
  const onlyActive = req.body.onlyActive;
  if (!searchText) {
    return res.send(`Invalid search, text: ${searchText}`).status(400);
  }

  searchText = searchText.trim().toLowerCase();

  const restaurantNames = []
  const nameResults = restaurantNameSearchIndex.search(
    searchText,
    { filter: (nameDoc) => { return !(onlyActive && (!nameDoc.isActive)) } }
  ).slice(0, 10);
  for (var nameDoc of nameResults) {
    restaurantNames.push(nameDoc.name);
  }

  const dishNameResults = dishNameSearchIndex.search(searchText).slice(0, 10);
  const dishNames = [];
  for (var dishNameDoc of dishNameResults) {
    dishNames.push(dishNameDoc.dishName);
  }

  return res.send({ "dishNames": dishNames, "restaurantNames": restaurantNames }).status(200);
});

app.post("/restaurants/search", async (req, res) => {
  const searchText = req.body.searchText;
  const searchBasis = req.body.searchBasis;
  const onlyActive = req.body.onlyActive;

  if (!searchText) return res.send(`Invalid search, text: ${searchText}`).status(400);

  var searchConfig = { boost: {}, filter: null };
  if (onlyActive) searchConfig['filter'] = (result) => { return !(onlyActive && (!result.isActive)) };
  if (searchBasis == "byDish") {
    searchConfig['boost'] = { 'dishes': 2 };
  }
  else if (searchBasis == "byRestaurant") {
    searchConfig['boost'] = { 'name': 2 };
  }

  const searchResults = resaturantByNameAndDishesSearchIndex.search(searchText, searchConfig).slice(0, 50);

  const restaurants = [];
  await get_and_cache_all_restaurants();
  const allRestaurantsById = allRestaurantsByIdCached;

  for (var result of searchResults) {
    restaurants.push(allRestaurantsById[result.id]);
  }
  return res.send(serializeRestaurantsForResponse(restaurants)).status(200);
});

app.get("/restaurants/all", async (req, res) => {
  var allRestaurants = await get_and_cache_all_restaurants();
  return res.send(serializeRestaurantsForResponse(allRestaurants)).status(200);
});

app.post("/restaurants/by_location", async (req, res) => {
  const currentLocation = { latitude: req.headers.latitude, longitude: req.headers.longitude };
  
  
  const distanceFilter = 10; // searching in 10 kms of radius

  const allRestaurants = await get_and_cache_all_restaurants();
  var filteredRestaurants = [];
  const distances = []
  for (var restaurant of allRestaurants) {
    const resLocation = { latitude: restaurant.location.latitude, longitude: restaurant.location.longitude }
    const distance = haversine(currentLocation, resLocation) / 1000; // in km
    if (distance <= distanceFilter && restaurant.metadata.isActive) {
      distances.push(distance.toFixed(2));
      filteredRestaurants.push(restaurant)
    }
  }

  filteredRestaurants = serializeRestaurantsForResponse(filteredRestaurants);
  for (var index in filteredRestaurants) {
    filteredRestaurants[index].distance = distances[index];
  }
  filteredRestaurants.sort((a, b) => { a.distance < b.distance });

  return res.send(filteredRestaurants).status(200);
});

app.post("/restaurants/add", async (req, res) => {
  let restaurantBody = req.body.restaurant;
  let restaurant = new RestaurantModel({
    name: restaurantBody.name,
    description: restaurantBody.description,
    contact: restaurantBody.contact,
    location: { latitude: restaurantBody.location.latitude, longitude: restaurantBody.location.longitude, areaName: restaurantBody.location.areaName },
    priceBand: restaurantBody.priceBand,
    cuisineTags: restaurantBody.cuisineTags,
    dishes: restaurantBody.dishes,
    opensAt: restaurantBody.opensAt,
    closesAt: restaurantBody.closesAt,
  });
  await restaurant.save()

  on_restaurant_add_or_update(restaurant);

  return res.send(restaurant).status(200)
});

app.post("/restaurants/:id/update", async (req, res) => {
  const restaurantId = req.params.id;
  const updatedRestaurant = req.body.restaurant;

  if (updatedRestaurant.id && updatedRestaurant.id != restaurantId) {
    return res.send("id in params and in payload does not match").status(400);
  }

  const restaurant = await RestaurantModel.findById(restaurantId);
  if (!restaurant) {
    return res.send().status(404);
  }

  await restaurant.save(updatedRestaurant);

  on_restaurant_add_or_update(restaurant);

  return res.send(restaurant).status(200);
});


// Analytics endpoints

app.post("/analytics/restaurants/:id/viewed", async (req, res) => {
  const restaurantId = req.params.id;
  await RestaurantAnalyticsModel.findOneAndUpdate(
    { restaurantId: restaurantId },
    { restaurantId: restaurantId, $inc: { views: 1 } },
    { upsert: true }
  );

  return res.send().status(200);
})



// cron jobs
var dailyCronJob = cron.schedule('0 3 * * *', async () => {
  // runs every day at 3.00 am

  try {
    await RestaurantModel.updateMany(
      { 'todaySpecial': { $exists: true } },
      { $unset: { 'todaySpecial': "" } },
    );
    await get_and_cache_all_restaurants({ resetCache: true });

    // todo: BACKUP data, choices -
    // 1. create copy collections and dump data there (for e.g. Restaurant_copy) 
    // 2. create another cluster and dump data there as it is
    // 3. dump data to another database service, for e.g. firestore
    // 4. export all the data to a excel sheet and email it.
  } catch (error) {
    console.log(`error in dailyCronJob: ${error}`);
  }

},
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
    recoverMissedExecutions: true,
  }
);
dailyCronJob.start()

