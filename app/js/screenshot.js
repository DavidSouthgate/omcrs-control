const {desktopCapturer, screen} = require('electron');

/**
 * Create a screenshot of the entire screen using the desktopCapturer module of Electron.
 *
 * @param callback {Function} callback receives as first parameter the base64 string of the image
 * @param imageFormat {String} Format of the image to generate ('image/jpeg' or 'image/png')
 **/
global.fullscreenScreenshot = (callback, imageFormat) => {
    console.log("screenshot.js: Starting Screenshot");
    imageFormat = imageFormat || 'image/jpeg';

    let handleStream = (stream) => {
        // Create hidden video tag
        let video = document.createElement('video');
        video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';
        // Event connected to stream
        video.onloadedmetadata = function () {
            // Set video ORIGINAL height (screenshot)
            video.style.height = this.videoHeight + 'px'; // videoHeight
            video.style.width = this.videoWidth + 'px'; // videoWidth

            // Create canvas
            let canvas = document.createElement('canvas');
            canvas.width = this.videoWidth;
            canvas.height = this.videoHeight;
            let ctx = canvas.getContext('2d');
            // Draw video on canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            if (callback) {
                // Save screenshot to base64
                console.log("screenshot.js: Sending to callback");
                callback(canvas.toDataURL(imageFormat));
            } else {
                console.log('Need callback!');
            }

            // Remove hidden video tag
            video.remove();
            try {
                // Destroy connect to stream
                stream.getTracks()[0].stop();
            } catch (e) {}
        };
        video.src = URL.createObjectURL(stream);
        document.body.appendChild(video);
    };

    let handleError = function(e) {
        console.log(e);
    };

    let screenshotSource = function(sources, i) {
        console.log("screenshot.js: Using " + sources[i].name);

        navigator.webkitGetUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: sources[i].id,
                    minWidth: 1280,
                    maxWidth: 4000,
                    minHeight: 720,
                    maxHeight: 4000
                }
            }
        }, handleStream, handleError);
    };

    // Filter only screen type
    desktopCapturer.getSources({types: ['screen']}, (error, sources) => {
        if (error) throw error;
        let screen1 = null;

        for (let i = 0; i < sources.length; ++i) {

            console.log("screenshot.js: Source -- " + JSON.stringify(sources[i]));

            // Entire screen
            if (sources[i].name === "Entire screen") {
                screenshotSource(sources, i);
                return;
            }

            else if(sources[i].name === "Screen 1") {
                screen1 = i;
            }
        }

        // If no 'entire screen' source was found, but screen 1 was found0
        if(screen1 !== null) {

            // Screenshot screen 1 instead
            screenshotSource(sources, screen1);
            return;
        }

        console.log("screenshot.js: ERROR No usable source found");
    });
};