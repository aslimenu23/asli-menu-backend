const { RestaurantModel } = require("./models")

const dummyDishes = [
    {
        name: "Mozzarella E Caprese",
        description: "Plum tomato and buffalo mozzarella, basil pesto, pine nuts, extra virgin olive oil",
        price: 395,
        category: "INSALATA / SALADS",
        dishType: "veg",

    },
    {
        name: "Insalata Di Caesar",
        description: "Ice burg and romaine lettuce, herbed chicken, garlic croutons, and parmesan cheese, poached egg",
        price: 395,
        category: "INSALATA / SALADS",
        dishType: "veg",

    },
    {
        name: "Spaghetti Aglio Olid Gamberi",
        description: "Sphagetti tossed in olive oil, garlic, chilli, herbs etc.",
        price: 535,
        category: "PASTA E RISOTTI",
        dishType: "non_veg",

    },
    {
        name: "Penne Milanese",
        description: "Penne with chicken, mushroom, oregano etc.",
        price: 485,
        category: "PASTA E RISOTTI",
        dishType: "non_veg",

    },

    {
        name: "Salmone",
        description: "Tomato sauce, mozzarella, smoked salmon, onion, capers",
        price: 655,
        category: "SELECTION OF PIZZA",
        dishType: "non_veg",

    },
    {
        name: "Pollo Funghi Spinaci",
        description: "Tomato sauce, mozzarella, pesto chicken, spinach, olives, sun-dried tomatoes",
        price: 585,
        category: "SELECTION OF PIZZA",
        dishType: "non_veg",

    },
    {
        name: "Tiramisu",
        description: "Italian mascarpone, lavazza espresso, coffee ice cream",
        price: 295,
        category: "DOLCI / DESSERTS",
        dishType: "veg",

    },
    {
        name: "Orange Creme Bruilee",
        description: "Classcic creme brulee with orange zest",
        price: 295,
        category: "DOLCI / DESSERTS",
        dishType: "veg",

    },
]

const dummyRestaurants = [
    {
        name: "Via Milano",
        description: "",
        location: { latitude: 23.8555564, longitude: 25.154465, areaName: "Sarjapur", },
        cuisineTags: ["Italian", "Pizza", "Continental"],
        dishes: dummyDishes,
        todaySpecial: { dish: dummyDishes[3] },

        opensAt: "11:00",
        closesAt: "23:30",
        serviceType: "Dine In",

        metadata: { "isActive": true, isFreeSubscription: true },
    },
    {
        name: "Via Milano",
        description: "",
        location: { latitude: 23.8555564, longitude: 25.154465, areaName: "Sarjapur", },
        cuisineTags: ["Italian", "Pizza", "Continental"],
        dishes: dummyDishes,
        todaySpecial: { dish: dummyDishes[3] },

        opensAt: "11:00",
        closesAt: "23:30",
        serviceType: "Dine In",

        metadata: { "isActive": true, isFreeSubscription: true },

    },
    {
        name: "Hashtag 88",
        description: "",
        location: { latitude: 23.8555564, longitude: 25.154465, areaName: "Marathalli", },
        cuisineTags: ["Salad", "Chinese", "Asian"],
        dishes: dummyDishes,
        todaySpecial: { dish: dummyDishes[3] },

        opensAt: "12:00",
        closesAt: "01:00",
        serviceType: "Dine In",

        metadata: { "isActive": true, isFreeSubscription: true },

    },
    {
        name: "Backstreet Brewery",
        description: "",
        location: { latitude: 23.8555564, longitude: 25.154465, areaName: "Sarjapur", },
        cuisineTags: ["Italian", "Bar Food", "Pizza"],
        dishes: dummyDishes,
        todaySpecial: { dish: dummyDishes[3] },

        opensAt: "12:30",
        closesAt: "00:00",
        serviceType: "Dine In",

        metadata: { "isActive": true, isFreeSubscription: true },

    },
    {
        name: "Roxie",
        description: "",
        location: { latitude: 23.8555564, longitude: 25.154465, areaName: "Sarjapur", },
        cuisineTags: ["Bar Food", "South Indian"],
        dishes: dummyDishes,
        todaySpecial: { dish: dummyDishes[3] },

        opensAt: "12:00",
        closesAt: "00:00",
        serviceType: "Dine In",

        metadata: { "isActive": true, isFreeSubscription: true },
    },
    {
        name: "Street 1522",
        description: "",
        location: { latitude: 23.8555564, longitude: 25.154465, areaName: "Sarjapur", },
        cuisineTags: ["North Indian", "Asian", "Street Food"],
        dishes: dummyDishes,
        todaySpecial: { dish: dummyDishes[3] },

        opensAt: "12:00",
        closesAt: "01:00",
        serviceType: "Dine In",

        metadata: { "isActive": true, isFreeSubscription: true },
    },
    {
        name: "Iris Cafe",
        description: "",
        location: { latitude: 23.8555564, longitude: 25.154465, areaName: "Sarjapur", },
        cuisineTags: ["Fast Food", "Irish", "Italian"],
        dishes: dummyDishes,
        todaySpecial: { dish: dummyDishes[3] },

        opensAt: "10:00",
        closesAt: "23:00",
        serviceType: "Dine In",

        metadata: { "isActive": true, isFreeSubscription: true },
    },
]

async function saveDummyRestaurants() {
    const allRestaurants = await RestaurantModel.find();
    const resNames = new Set(allRestaurants.map(val => val.name));

    for (var res of dummyRestaurants) {

        const newRes = new RestaurantModel(res);
        if (resNames.has(newRes.name)) break;

        try {
            await newRes.save()
            console.log(`added dummy restaurant: ${newRes.name}`)
        } catch (error) {
            console.log('error in saving res');
            console.error(error);
        }
    }
}

module.exports = { saveDummyRestaurants }