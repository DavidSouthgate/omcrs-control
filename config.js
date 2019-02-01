global.loadConfig = () => {
    try {
        let config = require("./config/config.json");
        console.log("config.js: Loaded config");
        return config;
    }
    catch(e) {
        console.log("config.js: Could not load config");
        return null;
    }
};

global.readConfigItem = (config, key) => {
    switch(key) {
        case "server":
            try {
                return config.server;
            }
            catch(e) {
                console.log("config.js: Count not read " + key);
                return null;
            }
        case "color.primary":
            try {
                return config.color.primary;
            }
            catch(e) {
                console.log("config.js: Count not read " + key);
                return "42bff4";
            }
        case "color.primaryText":
            try {
                return config.color.primaryText;
            }
            catch(e) {
                console.log("config.js: Count not read " + key);
                return "000000";
            }
        case "color.hover":
            try {
                return config.color.hover;
            }
            catch(e) {
                console.log("config.js: Count not read " + key);
                return "565656";
            }
        case "logo.wide":
            try {
                return config.logo.wide;
            }
            catch(e) {
                console.log("config.js: Count not read " + key);
                return null;
            }
        case "logo.narrow":
            try {
                return config.logo.narrow;
            }
            catch(e) {
                console.log("config.js: Count not read " + key);
                return null;
            }
        default:
            console.log("config.js: Count not read " + key);
            return null;
    }
};