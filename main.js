require('./config.js');

const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const url = require('url');
let currentWindow, mainWindow, liveWindow, responsesWindow, liveInterval, responsesInterval;

// Load the config;
const config = loadConfig();

/**
 * Load URL into webview inside a window
 * @param window The window to use
 * @param location The URL
 * @param html The HTML template
 */
function windowLoadUrl(window, location, html) {

    // If no html file specified, use app.html
    if(!html)
        html = "app/app.html";

    // Load HTMl into window
    window.loadURL(url.format({
        pathname: path.join(__dirname, html),
        protocol: 'file:',
        slashes: true
    }));

    // Once the main window has been loaded
    window.webContents.on('did-finish-load', function() {

        // Send the url and config
        window.webContents.send("config", config);
        window.webContents.send("url", location);
    });

    // Change current window to this window
    currentWindow = window;
}

/**
 * Puts a window always on top. Windows does not require a looping interval to do this but if you use one it messes
 * up dropdown boxes within the app. So this is why we check for the OS.
 * @param ref Object in format {
 *       window: liveWindow,
 *       interval: liveInterval
 *   }
 */
function windowAlwaysOnTop(ref) {
    ref.window.setAlwaysOnTop(true, "floating", 1);
    ref.window.setVisibleOnAllWorkspaces(true);

    if(process.platform !== "win32") {
        ref.interval = setInterval(function() {
            try {
                ref.window.setAlwaysOnTop(true);
            }
            catch(e) {
                clearInterval(ref.interval);
                ref.interval = null;
            }
        }, 1);
    }
}

/**
 * When the app is ready to be run. Create a new window.
 */
function init() {

    // If the application should quit, quit
    if (shouldQuit) {
        app.quit()
    }

    // Create a new window for the main window
    mainWindow = new BrowserWindow({
        title: "OMCRS",
        width: 1020,
        height: 700,
        resizable: true,
        fullscreenable: true,
        icon: path.join(__dirname, 'build/64x64.png'),
        show: false,
        backgroundColor: "#" + readConfigItem(config, "color.primary")
    });

    // Clear cache
    mainWindow.webContents.session.clearCache(function() {});

    // Don't display an application menu bar
    mainWindow.setMenu(null);

    // Load main window contents
    windowLoadUrl(mainWindow, readConfigItem(config, "server"), "app/app.html");

    mainWindow.webContents.on('did-finish-load', function() {
        mainWindow.show();
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null
    });

    // Create a new window for the live window
    liveWindow = new BrowserWindow({
        parent: mainWindow,
        title: "OMCRS",
        width: 760,
        height: 80,
        resizable: false,
        fullscreenable: false,
        frame: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'app/js/webview-preload.js')
        },
        icon: path.join(__dirname, 'build/64x64.png'),
    });

    liveWindow.webContents.session.clearCache(function() {});

    liveWindow.on('close', function (event) {
        liveWindow.hide();
        mainWindow.show();
        mainWindow.webContents.send("reload");
        event.preventDefault();
    });

    // Load HTMl into window
    liveWindow.loadURL(url.format({
        pathname: path.join(__dirname, "app/live.html"),
        protocol: 'file:',
        slashes: true
    }));

    windowAlwaysOnTop({
        window: liveWindow,
        interval: liveInterval
    });
}

app.on('ready', init);

// Quit when all windows are closed.
app.on('window-all-closed', function () {

    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        init()
    }
});

// This is a single instance app. If someone opens a new instance, focus the old and set variable to quit.
let shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {

    // Someone tried to run a second instance, we should focus our window.
    if(mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

/**
 * IPC
 */

ipcMain.on("liveViewEnter", function (e, sessionIdentifier) {

    // Hide the main window
    mainWindow.hide();

    // Send the config to the live window
    liveWindow.webContents.send("config", config);

    // Send the url and window
    liveWindow.webContents.send("liveViewStart", sessionIdentifier);

    liveWindow.show();
});

ipcMain.on("liveViewResponses", function (e, sessionIdentifier, sessionQuestionID) {

    // Create a new window for the live window
    responsesWindow = new BrowserWindow({
        parent: liveWindow,
        title: "Responses",
        width: 800,
        height: 720,
        resizable: true,
        fullscreenable: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'app/js/webview-preload.js')
        },
        icon: path.join(__dirname, 'build/64x64.png'),
    });

    responsesWindow.webContents.session.clearCache(function() {});

    responsesWindow.setMenu(null);

    // Load main window contents
    windowLoadUrl(responsesWindow, readConfigItem(config, "server") + "session/" + sessionIdentifier + "/edit/question/" + sessionQuestionID + "/response/live/", "app/app-nosplash.html");

    windowAlwaysOnTop({
        window: responsesWindow,
        interval: responsesInterval
    });

    responsesWindow.show();
});

/***********************************************************************************************************************
 * MAIN VIEW IPC
 **********************************************************************************************************************/

ipcMain.on("mainViewGoBack", function (e) {
    mainWindow.webContents.send("goBack");
});