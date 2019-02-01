let $ = require('jquery');
require("./../../config.js");
require("./generic-questions.js");
require("./screenshot.js");
const {remote, ipcRenderer} = require('electron');
let config;

let questions = [];
let active = false;
let sessionIdentifier = null;
let sessionQuestionID = null;
let questionNumber = null;

let expanded = false;
let loadQuestionsInterval = null;
let loadUsersInterval = null;

let windowWidth = remote.getCurrentWindow().getSize()[0];
let windowWidthExpanded = windowWidth + 125;
let windowHeight = 80;

function setDefaults() {
    // If the load questions interval has started, stop it
    if(loadQuestionsInterval) {
        clearInterval(loadQuestionsInterval);
    }

    // If the load users interval has started, stop it
    if(loadUsersInterval) {
        clearInterval(loadUsersInterval);
    }

    questions = [];
    sessionIdentifier = null;
    sessionQuestionID = null;
    questionNumber = null;
    loadQuestionsInterval = null;
    loadUsersInterval = null;
}

/**********************************************************************************************************
 * IPC
 *********************************************************************************************************/

ipcRenderer.on("config", function (e, c) {
    if(!config) {
        config = c;

        // Update colors
        let body = $("body");
        body.css("background-color", "#" + readConfigItem(config, "color.primary"));
        body.css("color", "#" + readConfigItem(config, "color.primaryText"));

        // Link colors
        let a = $("a");
        a.css("color", "#" + readConfigItem(config, "color.primaryText"));
        a.mouseover(function() {
            $(this).css("color", "#" + readConfigItem(config, "color.hover"));
        }).mouseout(function() {
            $(this).css("color", "#" + readConfigItem(config, "color.primaryText"));
        });

        // Set logo
        let logo = readConfigItem(config, "logo.narrow");
        if(logo) {

            // Display logo
            $(".logo-container").css("display", "inline");

            // Load logo image
            var img = $(".logo-container img");
            img.attr("src", "../config/" + logo);

            // Once the image is loaded
            img.one("load", function() {

                // Increase size of window to fit logo
                windowWidth += Math.ceil(img.width());
                windowWidthExpanded += Math.ceil(img.width());

                remote.getCurrentWindow().setSize(windowWidth, windowHeight);
            });
        }
    }
});

// When start is sent over IPC, run the ready function
ipcRenderer.on("liveViewStart", function (e, args) {
    ready(args);
});

/**********************************************************************************************************
 * Start and KeyPress
 *********************************************************************************************************/

/**
 * Function to run when the page is ready to be run
 */
global.ready = (si) => {

    setDefaults();

    sessionIdentifier = si;

    // Start repeatedly loading all questions
    startLoadAllQuestionsInterval();
};

/**
 * Starts repeatedly loading all questions
 */
function startLoadAllQuestionsInterval() {

    // Load all questons
    loadQuestions(function() {

        // If this question is active and the user loader interval hasn't started
        if(active && !loadUsersInterval) {
            startLoadUsersInterval();
        }
    });

    // Start the load questions interval
    loadQuestionsInterval = setInterval(function() {
        loadQuestions();
    }, 1000);
}

/**
 * Starts repeatedly loading number of active users
 */
function startLoadUsersInterval() {

    // If the load user interval has not been started
    if(!loadUsersInterval) {

        // Load users
        loadUsers();

        // Start the load users interval
        loadUsersInterval = setInterval(function() {
            loadUsers();
        }, 1000);
    }
}

/**
 * Stop repeatedly loading number of active users
 */
function stopLoadUsersInterval() {
    clearInterval(loadUsersInterval);
    $("#users").text("");
    $(".button-container.users").addClass("display-none");
    $(".button-container.new-question").removeClass("display-none");
    loadUsersInterval = null;
}

/**
 * Load active users
 */
function loadUsers() {

    // Construct the URL for the api communication
    let url = readConfigItem(config, "server") + "api/session/" + sessionIdentifier + "/question/" + sessionQuestionID + "/users/";

    // Make an api request
    $.getJSON(url, function (data) {
        if(active) {
            $("#users").text(data["answered"] + "/" + data["total"]);
            $(".button-container.users").removeClass("display-none");
            $(".button-container.new-question").addClass("display-none");
        }
    });
}

/**
 * When a key is pressed
 */
$(document).keydown(function(e) {

    // Only process key presses if questions exist
    if(questions.length > 0) {

        switch(e.key) {

            // Left Key: Previous Question
            case "ArrowLeft":
                if(!active) {
                    nextQuestion([].concat(questions).reverse());
                }
                break;

            // Right Key: Next Question
            case "ArrowRight": // right
                if(!active) {
                    nextQuestion(questions);
                }
                break;

            // A Key: Activate/Deactivate Question
            case "a":
            case "A":

                // If question is active, deactivate
                if(active) {
                    deactivate();
                }

                // Otherwise, activate
                else {
                    activate();
                }

                break;

            // R Key: View Responses
            case "r":
            case "R":
                responses();
                break;

            // Escape Key: Exit live view
            case "Escape":
                exit();
                break;

            // Exit this handler for other keys
            default: return;
        }

        // prevent the default action (scroll / move caret)
        e.preventDefault();
    }
});

/**********************************************************************************************************
 * API
 *********************************************************************************************************/

/**
 * Load all questions
 * @param callback
 */
function loadQuestions(callback) {

    // Construct the URL for the api communication
    let url = readConfigItem(config, "server") + "api/session/" + sessionIdentifier + "/live/";

    // Make an api request
    $.getJSON(url, function (data) {

        // If there are questions
        if(data["questions"]) {

            $("#activate").removeClass("not-active");
            $("#deactivate").removeClass("not-active");
            $("#responses").removeClass("not-active");
            $("#new-question").removeClass("not-active");

            // TODO: check error
            questions = data["questions"].reverse();

            if(data["activeSessionQuestionID"]) {
                sessionQuestionID = data["activeSessionQuestionID"];
            }

            else if(data["questions"].length > 0 && sessionQuestionID === null) {
                sessionQuestionID = data["questions"][0]["sessionQuestionID"];
            }

            displayQuestion(callback);
        }

        // Otherwise, display an error
        else {
            $("#question-text").text("No Questions Available");
            $("#prev-question").addClass("not-active");
            $("#next-question").addClass("not-active");
            $("#activate").addClass("not-active");
            $("#deactivate").addClass("not-active");
            $("#responses").addClass("not-active");
            $("#new-question").removeClass("not-active");
        }
    });
}

/**********************************************************************************************************
 *
 *********************************************************************************************************/

/**
 * Display current question
 * @param callback
 */
function displayQuestion(callback) {
    let question;

    questionNumber = 1;

    // Loop for every question
    questions.some(function (q) {

        // If this is the current question
        if(q["sessionQuestionID"] === sessionQuestionID) {
            question = q;
            return true;
        }

        questionNumber++;
    });

    // If no question, just run the callback (if it exists)
    if(!question) {
        if(callback) {
            callback();
        }
        return;
    }

    // If this question is active, setup UI
    if(question["active"]) {
        activateDone(callback);
    }

    // Otherwise, setup UI for deactivated question
    else {
        deactivateDone(callback);
    }

    let nextQuestion = $("#next-question");
    let prevQuestion = $("#prev-question");

    // If first question, hide previous button
    if(questionNumber === 1 || active) {
        prevQuestion.addClass("not-active");
    }
    else if(!active) {
        prevQuestion.removeClass("not-active");
    }

    // If last question, hide next button
    if(questionNumber === questions.length || active) {
        nextQuestion.addClass("not-active");
    }
    else if(!active) {
        nextQuestion.removeClass("not-active");
    }

    // Update UI
    $("#question-text").text(questionNumber + ". " + question["question"]);
}

/**********************************************************************************************************
 * Question Navigation
 *********************************************************************************************************/

function nextQuestion(qs) {
    let found = false;
    qs.forEach(function(q) {
        if(q["sessionQuestionID"] === sessionQuestionID) {
            found = true;
        }
        else if(found) {
            sessionQuestionID = q["sessionQuestionID"];
            found = false;
        }
    });
    displayQuestion(function() {
        if(active) {
            startLoadUsersInterval();
        }
        else {
            stopLoadUsersInterval();
        }
    });
}

$("#prev-question").click(function () {
    nextQuestion([].concat(questions).reverse());
});

$("#next-question").click(function () {
    nextQuestion(questions);
});

/**********************************************************************************************************
 * Activate / Deactivate
 *********************************************************************************************************/

$("#activate").click(function () {
    activate();
});

$("#deactivate").click(function () {
    deactivate();
});

function activate() {
    clearInterval(loadQuestionsInterval);
    $("#activate").addClass("not-active");

    activateQuestion(sessionQuestionID, false, function() {
        activateDone(function() {

            // Take a screenshot and send it to the server
            fullscreenScreenshot(function(base64data) {

                // Construct the URL for the api communication
                let url = readConfigItem(config, "server") + "api/session/" + sessionIdentifier + "/question/" + sessionQuestionID + "/screenshot/";

                // Post the screenshot
                $.post(url, { base64: base64data}).done(function(data) {

                    // If the post was not successful, log error
                    if(data["success"] !== true) {
                        console.log("Could not send screenshot");
                    }
                });
            }, "image/png");

            startLoadUsersInterval();
        });
        expandedModeExit();
    });
}

function activateDone(callback) {
    let activate = $("#activate");
    let deactivate = $("#deactivate");
    $("#next-question").addClass("not-active");
    $("#prev-question").addClass("not-active");
    $("#new-question-container").addClass("display-none");
    $("#question-type-container").addClass("display-none");

    activate.addClass("display-none");
    deactivate.removeClass("display-none");

    activate.removeClass("not-active");
    active = true;

    if(callback) {
        callback();
    }

    //resize();
}

function deactivate() {
    $("#deactivate").addClass("not-active");

    activateQuestion(sessionQuestionID, true, function() {
        deactivateDone(function() {
            stopLoadUsersInterval();
            startLoadAllQuestionsInterval();
            expandedModeExit();
        });
    });
}

function deactivateDone(callback) {
    let activate = $("#activate");
    let deactivate = $("#deactivate");
    //$("#next-question").removeClass("not-active");
    //$("#prev-question").removeClass("not-active");

    deactivate.addClass("display-none");
    activate.removeClass("display-none");
    deactivate.removeClass("not-active");
    active = false;

    if(callback) {
        callback();
    }

    //resize();
}

/**
 * Change the activation status of the current question
 * @param sqid
 * @param deactivate True if deactivating, false if activating
 * @param callback
 */
function activateQuestion(sqid, deactivate = false, callback) {
    let activate = !deactivate;

    // If there is a session question ID
    if (sqid) {

        // Construct the URL for the api communication
        let url = readConfigItem(config, "server") + "api/session/" + sessionIdentifier + "/question/" + sqid + "/edit/?active=" + activate.toString();

        // Make an api request
        $.getJSON(url, function (data) {

            // If success
            if (data["active"] === activate) {

                if(callback) {
                    callback();
                }
            }

            // Otherwise, error
            else {
                console.log("Error activating/deactivating question");
            }
        });
    }
}

/**********************************************************************************************************
 * New Question
 *********************************************************************************************************/

$("#new-question").click(newQuestion);
$("#new-question-submit").click(newQuestionSubmit);

function newQuestion() {
    expandedModeEnter();
}

function newQuestionSubmit() {

    // Add a new active question
    addGenericQuestionFromCode($("#question-type").val(), sessionIdentifier, function(data) {

        sessionQuestionID = data["sessionQuestionID"];
        displayQuestion(function() {

            expandedModeExit();
        });
    }, false, config);
}

/**********************************************************************************************************
 * Results / Quit
 *********************************************************************************************************/

$("#responses").click(responses);
$("#power").click(exit);

/**
 * View responses
 */
function responses() {
    liveViewResponses(sessionIdentifier, sessionQuestionID);
}

/**
 * Exit the live view
 */
function exit() {
    let remoteWindow = remote.getCurrentWindow();
    remoteWindow.close();
}

/**********************************************************************************************************
 * Expanded mode
 *********************************************************************************************************/

function expandedModeEnter() {

    remote.getCurrentWindow().setSize(windowWidthExpanded, windowHeight);

    // Enter CSS into expanded mode
    $(".view").addClass("expanded");
    $(".button-container.new-question").addClass("display-none");
    $(".button-container.question-type").removeClass("display-none");

    expanded = true;
}

function expandedModeExit() {

    remote.getCurrentWindow().setSize(windowWidth, windowHeight);

    // Enter CSS into expanded mode
    $(".view").removeClass("expanded");
    $(".button-container.new-question").removeClass("display-none");
    $(".button-container.question-type").addClass("display-none");

    expanded = false;
}

/**********************************************************************************************************
 * DEBUG
 *********************************************************************************************************/

$("#debug-session-join").click(function() {
    let sessionIdentifier = $("#debug-session-identifier").val();
    ready(sessionIdentifier);
});

/**********************************************************************************************************
 * Resize
 *********************************************************************************************************/

function resize() {
    let width = $(window).width();
    let height = $(window).height();

    let view = $(".view");
    view.css("min-width", width+"px");
    view.css("max-width", width+"px");
    view.css("min-height", height+"px");

    let buttonContainer = $(".button-container");
    buttonContainer.css("height", (height-20)+"px");
    buttonContainer.css("line-height", (height-20)+"px");

    let questionContainer = $(".question-container");
    questionContainer.css("height", (height-20)+"px");

    let logo = $(".logo-container img");
    logo.css("height", (height-20)+"px");
}

$(document).ready(function() {
    resize();
});

$(window).resize(function() {
    resize();
});