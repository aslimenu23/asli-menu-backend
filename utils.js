const axios = require("axios");

export const getCoordinatesFromGmapLink = async (mapLink) => {
  const response = await axios.get(mapLink);
  const expression =
    /window.APP_INITIALIZATION_STATE=\[\[\[\d+.\d+,(\d+.\d+),(\d+.\d+)/;
  const [, lat, long] = response.data
    .match(expression)[0]
    .split("[[[")[1]
    .split(",");
  return { lat, long };
};
