require("./../../config.js");
let $ = require('jquery');
const {ipcRenderer, remote} = require('electron');

const webview = document.getElementById('webview');
let window;
let fail = false;
let history = [];
let config;

let timeoutInterval, errorInterval;

/**
 * Display an error
 * @param message
 */
function error(message) {
    clearInterval(timeoutInterval);
    timeoutInterval = null;

    let error = document.getElementById("error");

    // Set the error message to display
    error.innerText = message;

    // Display the error
    error.style.display = "inline";
}

timeoutInterval = setInterval(function() {
    error("This is taking longer than it should. Are you connected to the internet?");
    clearInterval(timeoutInterval);
}, 7500);

ipcRenderer.on("url", function(event, url) {
    webview.src = url;
});

ipcRenderer.on("config", function(event, c) {
    config = c;

    // If config is not valid, display an error
    if(config===null)
        error("Error: Could not read config");

    // Update colors
    let body = $("body");
    body.css("background-color", "#" + readConfigItem(config, "color.primary"));
    body.css("color", "#" + readConfigItem(config, "color.primaryText"));

    // Load logo
    let logo = readConfigItem(config, "logo.wide");

    // If there is a logo
    if(logo) {

        // Display the logo
        var logoElement = $("#logo");
        logoElement.attr("src", "../config/" + logo);
        logoElement.css("display", "inline");

        // Remove spacers
        $(".spacer").remove();
    }
});

ipcRenderer.on("reload", function(event, url) {
    webview.reload();
});

ipcRenderer.on("window", function(event, w) {
    window = w;
});

ipcRenderer.on("goBack", function(event) {

    // Pop the current page from the history
    history.pop();

    // Pop the last page from the history
    let url = history.pop();

    // If URL was found from history
    if(typeof url !== "undefined") {
        webview.src = url;
    }
});

webview.addEventListener("did-fail-load", function() {
    fail = true;
    error("Error connecting to server. Are you connected to the internet?");
    webview.reload();
});

webview.addEventListener("did-finish-load", function() {

    // Add item to history
    history.push(webview.getURL());

    // If not a failure
    if(!fail) {
        const initialLoader = document.getElementById('initialLoader');
        initialLoader.style.display = "none";
        webview.style.display = "default";
    }
});