const {ipcRenderer} = require('electron');
require("./screenshot.js");

global.liveViewEnter = (sessionIdentifier) => {
    ipcRenderer.send("liveViewEnter", sessionIdentifier)
};

/**
 * View the live view responses
 * @param sessionIdentifier
 * @param sessionQuestionID
 */
global.liveViewResponses = (sessionIdentifier, sessionQuestionID) => {
    ipcRenderer.send("liveViewResponses", sessionIdentifier, sessionQuestionID);
};

/**
 * The following functions should have equivalents in web app web-app.js
 */

/**
 * Determines whether running as a desktop app
 * @returns {boolean}
 */
global.isDesktopApp = () => {
    return true;
};

/**
 * Go back a page
 */
global.goBack = () => {
    ipcRenderer.send("mainViewGoBack");
};