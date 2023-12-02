const axios = require("axios");

const getCoordinatesFromGmapLink = async (mapLink) => {
  const response = await axios.get(mapLink);
  const expression =
    /window.APP_INITIALIZATION_STATE=\[\[\[\d+.\d+,(\d+.\d+),(\d+.\d+)/;
  const [, lat, long] = response.data
    .match(expression)[0]
    .split("[[[")[1]
    .split(",");
  return { lat, long };
};


function arraysAreEqual(arr1, arr2) {
  if (!arr1 && !arr2) return true;

  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

function calculateCriticalRestaurantUpdateChanges(oldValue, newValue) {
  const updatedFields = [];
  if (oldValue.name != newValue.name) updatedFields.push("name");
  if (oldValue.description != newValue.description)
    updatedFields.push("description");
  if (oldValue.location.gmapLink != newValue.location.gmapLink)
    updatedFields.push("gmapLink");
  if (!arraysAreEqual(oldValue.cuisines, newValue.cuisines))
    updatedFields.push("cuisines");
  if (!arraysAreEqual(oldValue.phoneNumbers, newValue.phoneNumbers))
    updatedFields.push("phoneNumbers");
  if (oldValue.avgPrice != newValue.avgPrice) updatedFields.push("avgPrice");

  // we don't check for dine in / takeaway / delivery details => those are auto-approved

  return updatedFields;
}

module.exports = {
  arraysAreEqual,
  getCoordinatesFromGmapLink,
  calculateCriticalRestaurantUpdateChanges,
};
