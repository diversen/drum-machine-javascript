// require("babel-polyfill"); 
const loadSampleSet = require('load-sample-set');
const selectElement = require('select-element');
const getSetFormValues = require('get-set-form-values');
const adsrGainNode = require('adsr-gain-node');
const getHtmlRowsCells = require('get-html-rows-cells');
const getControlValues = require('./get-tracker-controls');
const getAudioOptions = require('./get-set-controls');
const scheduleMeasure = require('./schedule-measure');
const audioOptions = new getAudioOptions();
const ctx = new AudioContext();

var measureLength = 16;
var dataUrl = "https://raw.githubusercontent.com/oramics/sampled/master/DM/CR-78/sampled.instrument.json";
var buffers;

function initializeSampleSet(ctx, dataUrl, track) {
    
    loadSampleSet(ctx, dataUrl, function (sampleData, sampleBuffers) {
        buffers = sampleBuffers;
        
        if (!track) {
            track = schedule.getTrackerValues();
        } 
        setupTrackerHtml(sampleData);    
        schedule.loadTrackerValues(track)
        setupEvents();
    });
}


window.onload = function () {
    var defaultBeat = [{"rowId": "0", "cellId": "0", "enabled": false}, {"rowId": "0", "cellId": "1", "enabled": false}, {"rowId": "0", "cellId": "2", "enabled": false}, {"rowId": "0", "cellId": "3", "enabled": false}, {"rowId": "0", "cellId": "4", "enabled": false}, {"rowId": "0", "cellId": "5", "enabled": false}, {"rowId": "0", "cellId": "6", "enabled": false}, {"rowId": "0", "cellId": "7", "enabled": false}, {"rowId": "0", "cellId": "8", "enabled": false}, {"rowId": "0", "cellId": "9", "enabled": false}, {"rowId": "0", "cellId": "10", "enabled": false}, {"rowId": "0", "cellId": "11", "enabled": false}, {"rowId": "0", "cellId": "12", "enabled": false}, {"rowId": "0", "cellId": "13", "enabled": false}, {"rowId": "0", "cellId": "14", "enabled": false}, {"rowId": "0", "cellId": "15", "enabled": false}, {"rowId": "1", "cellId": "0", "enabled": false}, {"rowId": "1", "cellId": "1", "enabled": false}, {"rowId": "1", "cellId": "2", "enabled": false}, {"rowId": "1", "cellId": "3", "enabled": false}, {"rowId": "1", "cellId": "4", "enabled": false}, {"rowId": "1", "cellId": "5", "enabled": false}, {"rowId": "1", "cellId": "6", "enabled": false}, {"rowId": "1", "cellId": "7", "enabled": false}, {"rowId": "1", "cellId": "8", "enabled": false}, {"rowId": "1", "cellId": "9", "enabled": false}, {"rowId": "1", "cellId": "10", "enabled": false}, {"rowId": "1", "cellId": "11", "enabled": false}, {"rowId": "1", "cellId": "12", "enabled": false}, {"rowId": "1", "cellId": "13", "enabled": false}, {"rowId": "1", "cellId": "14", "enabled": false}, {"rowId": "1", "cellId": "15", "enabled": false}, {"rowId": "2", "cellId": "0", "enabled": false}, {"rowId": "2", "cellId": "1", "enabled": false}, {"rowId": "2", "cellId": "2", "enabled": false}, {"rowId": "2", "cellId": "3", "enabled": false}, {"rowId": "2", "cellId": "4", "enabled": false}, {"rowId": "2", "cellId": "5", "enabled": false}, {"rowId": "2", "cellId": "6", "enabled": false}, {"rowId": "2", "cellId": "7", "enabled": false}, {"rowId": "2", "cellId": "8", "enabled": false}, {"rowId": "2", "cellId": "9", "enabled": false}, {"rowId": "2", "cellId": "10", "enabled": false}, {"rowId": "2", "cellId": "11", "enabled": false}, {"rowId": "2", "cellId": "12", "enabled": false}, {"rowId": "2", "cellId": "13", "enabled": false}, {"rowId": "2", "cellId": "14", "enabled": false}, {"rowId": "2", "cellId": "15", "enabled": false}, {"rowId": "3", "cellId": "0", "enabled": false}, {"rowId": "3", "cellId": "1", "enabled": false}, {"rowId": "3", "cellId": "2", "enabled": false}, {"rowId": "3", "cellId": "3", "enabled": false}, {"rowId": "3", "cellId": "4", "enabled": false}, {"rowId": "3", "cellId": "5", "enabled": false}, {"rowId": "3", "cellId": "6", "enabled": false}, {"rowId": "3", "cellId": "7", "enabled": false}, {"rowId": "3", "cellId": "8", "enabled": false}, {"rowId": "3", "cellId": "9", "enabled": false}, {"rowId": "3", "cellId": "10", "enabled": false}, {"rowId": "3", "cellId": "11", "enabled": false}, {"rowId": "3", "cellId": "12", "enabled": false}, {"rowId": "3", "cellId": "13", "enabled": false}, {"rowId": "3", "cellId": "14", "enabled": false}, {"rowId": "3", "cellId": "15", "enabled": false}, {"rowId": "4", "cellId": "0", "enabled": true}, {"rowId": "4", "cellId": "1", "enabled": false}, {"rowId": "4", "cellId": "2", "enabled": false}, {"rowId": "4", "cellId": "3", "enabled": true}, {"rowId": "4", "cellId": "4", "enabled": false}, {"rowId": "4", "cellId": "5", "enabled": false}, {"rowId": "4", "cellId": "6", "enabled": false}, {"rowId": "4", "cellId": "7", "enabled": true}, {"rowId": "4", "cellId": "8", "enabled": false}, {"rowId": "4", "cellId": "9", "enabled": false}, {"rowId": "4", "cellId": "10", "enabled": false}, {"rowId": "4", "cellId": "11", "enabled": false}, {"rowId": "4", "cellId": "12", "enabled": false}, {"rowId": "4", "cellId": "13", "enabled": true}, {"rowId": "4", "cellId": "14", "enabled": false}, {"rowId": "4", "cellId": "15", "enabled": false}, {"rowId": "5", "cellId": "0", "enabled": false}, {"rowId": "5", "cellId": "1", "enabled": false}, {"rowId": "5", "cellId": "2", "enabled": false}, {"rowId": "5", "cellId": "3", "enabled": false}, {"rowId": "5", "cellId": "4", "enabled": false}, {"rowId": "5", "cellId": "5", "enabled": false}, {"rowId": "5", "cellId": "6", "enabled": false}, {"rowId": "5", "cellId": "7", "enabled": false}, {"rowId": "5", "cellId": "8", "enabled": false}, {"rowId": "5", "cellId": "9", "enabled": false}, {"rowId": "5", "cellId": "10", "enabled": false}, {"rowId": "5", "cellId": "11", "enabled": false}, {"rowId": "5", "cellId": "12", "enabled": false}, {"rowId": "5", "cellId": "13", "enabled": false}, {"rowId": "5", "cellId": "14", "enabled": false}, {"rowId": "5", "cellId": "15", "enabled": false}, {"rowId": "6", "cellId": "0", "enabled": false}, {"rowId": "6", "cellId": "1", "enabled": true}, {"rowId": "6", "cellId": "2", "enabled": false}, {"rowId": "6", "cellId": "3", "enabled": false}, {"rowId": "6", "cellId": "4", "enabled": true}, {"rowId": "6", "cellId": "5", "enabled": false}, {"rowId": "6", "cellId": "6", "enabled": false}, {"rowId": "6", "cellId": "7", "enabled": false}, {"rowId": "6", "cellId": "8", "enabled": false}, {"rowId": "6", "cellId": "9", "enabled": true}, {"rowId": "6", "cellId": "10", "enabled": false}, {"rowId": "6", "cellId": "11", "enabled": false}, {"rowId": "6", "cellId": "12", "enabled": false}, {"rowId": "6", "cellId": "13", "enabled": false}, {"rowId": "6", "cellId": "14", "enabled": false}, {"rowId": "6", "cellId": "15", "enabled": false}, {"rowId": "7", "cellId": "0", "enabled": false}, {"rowId": "7", "cellId": "1", "enabled": false}, {"rowId": "7", "cellId": "2", "enabled": false}, {"rowId": "7", "cellId": "3", "enabled": false}, {"rowId": "7", "cellId": "4", "enabled": false}, {"rowId": "7", "cellId": "5", "enabled": true}, {"rowId": "7", "cellId": "6", "enabled": false}, {"rowId": "7", "cellId": "7", "enabled": false}, {"rowId": "7", "cellId": "8", "enabled": false}, {"rowId": "7", "cellId": "9", "enabled": false}, {"rowId": "7", "cellId": "10", "enabled": false}, {"rowId": "7", "cellId": "11", "enabled": true}, {"rowId": "7", "cellId": "12", "enabled": false}, {"rowId": "7", "cellId": "13", "enabled": false}, {"rowId": "7", "cellId": "14", "enabled": false}, {"rowId": "7", "cellId": "15", "enabled": true}, {"rowId": "8", "cellId": "0", "enabled": false}, {"rowId": "8", "cellId": "1", "enabled": false}, {"rowId": "8", "cellId": "2", "enabled": false}, {"rowId": "8", "cellId": "3", "enabled": false}, {"rowId": "8", "cellId": "4", "enabled": false}, {"rowId": "8", "cellId": "5", "enabled": false}, {"rowId": "8", "cellId": "6", "enabled": false}, {"rowId": "8", "cellId": "7", "enabled": false}, {"rowId": "8", "cellId": "8", "enabled": false}, {"rowId": "8", "cellId": "9", "enabled": false}, {"rowId": "8", "cellId": "10", "enabled": false}, {"rowId": "8", "cellId": "11", "enabled": false}, {"rowId": "8", "cellId": "12", "enabled": false}, {"rowId": "8", "cellId": "13", "enabled": false}, {"rowId": "8", "cellId": "14", "enabled": false}, {"rowId": "8", "cellId": "15", "enabled": false}, {"rowId": "9", "cellId": "0", "enabled": true}, {"rowId": "9", "cellId": "1", "enabled": false}, {"rowId": "9", "cellId": "2", "enabled": false}, {"rowId": "9", "cellId": "3", "enabled": false}, {"rowId": "9", "cellId": "4", "enabled": false}, {"rowId": "9", "cellId": "5", "enabled": false}, {"rowId": "9", "cellId": "6", "enabled": false}, {"rowId": "9", "cellId": "7", "enabled": false}, {"rowId": "9", "cellId": "8", "enabled": false}, {"rowId": "9", "cellId": "9", "enabled": true}, {"rowId": "9", "cellId": "10", "enabled": false}, {"rowId": "9", "cellId": "11", "enabled": false}, {"rowId": "9", "cellId": "12", "enabled": false}, {"rowId": "9", "cellId": "13", "enabled": false}, {"rowId": "9", "cellId": "14", "enabled": false}, {"rowId": "9", "cellId": "15", "enabled": false}, {"rowId": "10", "cellId": "0", "enabled": false}, {"rowId": "10", "cellId": "1", "enabled": true}, {"rowId": "10", "cellId": "2", "enabled": false}, {"rowId": "10", "cellId": "3", "enabled": false}, {"rowId": "10", "cellId": "4", "enabled": false}, {"rowId": "10", "cellId": "5", "enabled": false}, {"rowId": "10", "cellId": "6", "enabled": false}, {"rowId": "10", "cellId": "7", "enabled": false}, {"rowId": "10", "cellId": "8", "enabled": false}, {"rowId": "10", "cellId": "9", "enabled": false}, {"rowId": "10", "cellId": "10", "enabled": false}, {"rowId": "10", "cellId": "11", "enabled": false}, {"rowId": "10", "cellId": "12", "enabled": false}, {"rowId": "10", "cellId": "13", "enabled": true}, {"rowId": "10", "cellId": "14", "enabled": false}, {"rowId": "10", "cellId": "15", "enabled": false}, {"rowId": "11", "cellId": "0", "enabled": false}, {"rowId": "11", "cellId": "1", "enabled": false}, {"rowId": "11", "cellId": "2", "enabled": false}, {"rowId": "11", "cellId": "3", "enabled": false}, {"rowId": "11", "cellId": "4", "enabled": false}, {"rowId": "11", "cellId": "5", "enabled": false}, {"rowId": "11", "cellId": "6", "enabled": false}, {"rowId": "11", "cellId": "7", "enabled": true}, {"rowId": "11", "cellId": "8", "enabled": false}, {"rowId": "11", "cellId": "9", "enabled": false}, {"rowId": "11", "cellId": "10", "enabled": false}, {"rowId": "11", "cellId": "11", "enabled": false}, {"rowId": "11", "cellId": "12", "enabled": false}, {"rowId": "11", "cellId": "13", "enabled": false}, {"rowId": "11", "cellId": "14", "enabled": false}, {"rowId": "11", "cellId": "15", "enabled": false}, {"rowId": "12", "cellId": "0", "enabled": false}, {"rowId": "12", "cellId": "1", "enabled": false}, {"rowId": "12", "cellId": "2", "enabled": false}, {"rowId": "12", "cellId": "3", "enabled": false}, {"rowId": "12", "cellId": "4", "enabled": false}, {"rowId": "12", "cellId": "5", "enabled": false}, {"rowId": "12", "cellId": "6", "enabled": false}, {"rowId": "12", "cellId": "7", "enabled": false}, {"rowId": "12", "cellId": "8", "enabled": false}, {"rowId": "12", "cellId": "9", "enabled": false}, {"rowId": "12", "cellId": "10", "enabled": false}, {"rowId": "12", "cellId": "11", "enabled": true}, {"rowId": "12", "cellId": "12", "enabled": false}, {"rowId": "12", "cellId": "13", "enabled": false}, {"rowId": "12", "cellId": "14", "enabled": false}, {"rowId": "12", "cellId": "15", "enabled": false}, {"rowId": "13", "cellId": "0", "enabled": false}, {"rowId": "13", "cellId": "1", "enabled": false}, {"rowId": "13", "cellId": "2", "enabled": false}, {"rowId": "13", "cellId": "3", "enabled": false}, {"rowId": "13", "cellId": "4", "enabled": false}, {"rowId": "13", "cellId": "5", "enabled": false}, {"rowId": "13", "cellId": "6", "enabled": false}, {"rowId": "13", "cellId": "7", "enabled": false}, {"rowId": "13", "cellId": "8", "enabled": false}, {"rowId": "13", "cellId": "9", "enabled": false}, {"rowId": "13", "cellId": "10", "enabled": false}, {"rowId": "13", "cellId": "11", "enabled": false}, {"rowId": "13", "cellId": "12", "enabled": false}, {"rowId": "13", "cellId": "13", "enabled": false}, {"rowId": "13", "cellId": "14", "enabled": false}, {"rowId": "13", "cellId": "15", "enabled": false}, {"rowId": "14", "cellId": "0", "enabled": false}, {"rowId": "14", "cellId": "1", "enabled": false}, {"rowId": "14", "cellId": "2", "enabled": false}, {"rowId": "14", "cellId": "3", "enabled": false}, {"rowId": "14", "cellId": "4", "enabled": false}, {"rowId": "14", "cellId": "5", "enabled": true}, {"rowId": "14", "cellId": "6", "enabled": false}, {"rowId": "14", "cellId": "7", "enabled": false}, {"rowId": "14", "cellId": "8", "enabled": false}, {"rowId": "14", "cellId": "9", "enabled": false}, {"rowId": "14", "cellId": "10", "enabled": false}, {"rowId": "14", "cellId": "11", "enabled": false}, {"rowId": "14", "cellId": "12", "enabled": false}, {"rowId": "14", "cellId": "13", "enabled": false}, {"rowId": "14", "cellId": "14", "enabled": false}, {"rowId": "14", "cellId": "15", "enabled": false}, {"rowId": "15", "cellId": "0", "enabled": false}, {"rowId": "15", "cellId": "1", "enabled": false}, {"rowId": "15", "cellId": "2", "enabled": false}, {"rowId": "15", "cellId": "3", "enabled": false}, {"rowId": "15", "cellId": "4", "enabled": false}, {"rowId": "15", "cellId": "5", "enabled": false}, {"rowId": "15", "cellId": "6", "enabled": false}, {"rowId": "15", "cellId": "7", "enabled": false}, {"rowId": "15", "cellId": "8", "enabled": false}, {"rowId": "15", "cellId": "9", "enabled": false}, {"rowId": "15", "cellId": "10", "enabled": false}, {"rowId": "15", "cellId": "11", "enabled": false}, {"rowId": "15", "cellId": "12", "enabled": false}, {"rowId": "15", "cellId": "13", "enabled": false}, {"rowId": "15", "cellId": "14", "enabled": false}, {"rowId": "15", "cellId": "15", "enabled": false}]
    initializeSampleSet(ctx, dataUrl, defaultBeat);
    setupBaseEvents();
    var storage = new tracksLocalStorage();
    storage.setupStorage();
};

var instrumentData = {};
function setupTrackerHtml(data) {
    instrumentData = data;
    document.getElementById("tracker").innerHTML = '';
    var str = getHtmlRowsCells(data.filename.length, measureLength, 'tr', 'td');
    var t = document.getElementById('tracker');
    t.insertAdjacentHTML('afterbegin', str);
    
}

function disconnectNode(node, options) {
    let totalLength =
            options.attackTime + options.sustainTime + options.releaseTime;

    setTimeout(() => {
        node.disconnect();
    }, totalLength * 1000);
}

function scheduleAudioBeat(beat, triggerTime) {
    
    let instrumentName = instrumentData.filename[beat.rowId];
    let instrument = buffers[instrumentName].get();

    function connectDelay(instrument) {

        // With sustain and feedback filter
        let delay = ctx.createDelay();
        delay.delayTime.value = audioOptions.options.delay;

        let gain = new adsrGainNode(ctx);
        gain.setOptions(audioOptions.getOptions());
        let feedbackGain = gain.getGainNode(triggerTime);


        let filter = ctx.createBiquadFilter();
        filter.frequency.value = audioOptions.options.filter;

        // delay -> feedback
        delay.connect(feedbackGain);
        disconnectNode(delay, audioOptions.getOptions());

        // feedback -> filter
        feedbackGain.connect(filter);

        // filter ->delay
        filter.connect(delay);

        instrument.detune.value = audioOptions.options.detune;

        // delay -> instrument
        instrument.connect(delay);

        // Instrument ->
        instrument.connect(ctx.destination);

        // Delay ->
        delay.connect(ctx.destination);

        instrument.start(triggerTime)
    }

    function connectClean(instrument) {
        // Trigger tone
        let gain = new adsrGainNode(ctx);
        gain.setOptions(audioOptions.getOptions());
        let gainNode = gain.getGainNode(triggerTime);

        instrument.detune.value = audioOptions.options.detune;
        // instrument -> gain
        
        instrument.connect(gainNode);
        gainNode.connect(ctx.destination);

        instrument.start(triggerTime);
    }

    if (audioOptions.options.delayEnabled) {
        connectDelay(instrument)
    } else {
        connectClean(instrument);
    }
}

var schedule = new scheduleMeasure(ctx, scheduleAudioBeat);

function setupBaseEvents () {
    document.getElementById('play').addEventListener('click', function (e) {
        schedule.stop();
        schedule.runSchedule(audioOptions.options.bpm);
    });

    document.getElementById('pause').addEventListener('click', function (e) {
        schedule.stop(); 
    });
    
    document.getElementById('stop').addEventListener('click', function (e) {
        schedule.stop();
        schedule = new scheduleMeasure(ctx, scheduleAudioBeat);
    });
    
    document.getElementById('bpm').addEventListener('change', function (e) {
        audioOptions.setOptions();
        if (schedule.running) {
            schedule.stop();
            schedule.runSchedule(audioOptions.options.bpm);
        }
    });
    
    
    $('.base').on('change', function () {
        audioOptions.setOptions();
    });
}
    
function setupEvents() {
    
    $('.cell').on('click', function (e) {
        let val = Object.assign({}, this.dataset);
        val.enabled = $(this).hasClass("enabled");

        let currentBeat = $('.current').data('cell-id');
        if (val.cellId > currentBeat) {
            schedule.scheduleAudioBeatNow(val);
        }

        $(this).toggleClass('enabled');
    });
}

$('#sampleSet').on('change', function () {
    initializeSampleSet(ctx, this.value);
});



function tracksLocalStorage () {

    this.setLocalStorage = function(update) {
        var storage = {};
        storage['Select'] = 'Select';


        for ( var i = 0, len = localStorage.length; i < len; ++i ) {
            let item = localStorage.key(i);
            storage[item] = item;
        }

        // Create select element
        var s = new selectElement(
            'load-storage', // id to append the select list to
            'beat-list', // id of the select list
            storage //
        );

        if (update) {
            s.update('beat-list', storage);
        } else {
            s.create();
        }
    };

    this.setupStorage = function() {

        this.setLocalStorage();
        document.getElementById('save').addEventListener('click', (e) => {
            e.preventDefault();

            let formData = getControlValues();
            let filename = $('#filename').val();
            if (!filename) {
                filename = 'untitled';
            }

            let beat = schedule.getTrackerValues();
            let song = {"beat": beat, "settings": formData}

            localStorage.setItem(filename, JSON.stringify(song));
            this.setLocalStorage('update');
            setTimeout(function() { alert('Track saved'); }, 1);
        });

        document.getElementById('beat-list').addEventListener('change', (e) => {
            let item = $('#beat-list').val();
            if (item === 'Select') {    
                document.getElementById('filename').value = '';
                return;
            }

            document.getElementById('filename').value = item;
            let track = JSON.parse(localStorage.getItem(item));
            let formValues = new getSetFormValues();
            let form = document.getElementById("trackerControls");

            formValues.set(form, track.settings);
            audioOptions.setOptions(track.settings);
            schedule.stop();

            initializeSampleSet(ctx, track.settings.sampleSet, track.beat);

        });

        document.getElementById('delete').addEventListener('click', (e) => {
            let elem = document.getElementById('beat-list');
            let toDelete = elem.options[elem.selectedIndex].text;

            localStorage.removeItem(toDelete);
            document.getElementById('filename').value = '';
            this.setLocalStorage('update');

        });
    };
 }
 