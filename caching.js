const MiniSearch = require('minisearch')

// search indices for searching restaurant by its name or dishes
const restaurantNameSearchIndex = new MiniSearch({ fields: ['name'], storeFields: ['name', 'id', 'isActive'], idField: 'id' });
const dishNameSearchIndex = new MiniSearch({ fields: ['dishName'], storeFields: ['dishName'], idField: 'dishName' });
const resaturantByNameAndDishesSearchIndex = new MiniSearch({ fields: ['name', 'dishes', 'isActive'], storeFields: ['id', 'isActive'], idField: 'id' });
const uniqueDishNames = new Set();

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

module.exports = { restaurantNameSearchIndex, dishNameSearchIndex, resaturantByNameAndDishesSearchIndex, uniqueDishNames, pre_process_search_index_from_scratch }
