(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var adsrGainNode = require('adsr-gain-node');
var getHtmlRowsCells = require('get-html-rows-cells');
var WAAClock = require('waaclock');
var loadSampleSet = require('load-sample-set');
var getSetFormValues = require('get-set-form-values');
var selectElement = require('select-element');

var ctx = new AudioContext();
var measureLength = 16;

function scheduleMeasure(ctx) {

    this.scheduleForward = 0.1;
    this.bpm = audioOptions.options.bpm;
    this.current = 0;
    this.eventMap = {};
    this.clock = new WAAClock(ctx);
    this.clock.start();
    this.running = false;

    this.next = function () {
        this.current++;
        if (this.current >= measureLength) {
            this.current = 0;
        }
    };
    this.milliPerBeat = function (beats) {
        if (!beats) {
            beats = 60;
        }
        return 1000 * 60 / beats;
    };

    this.getTrackerRowValues = function (cellId) {
        var values = [];
        var selector = '[data-cell-id="' + cellId + '"]';

        var elems = document.querySelectorAll(selector);
        elems.forEach(function (el) {
            var val = Object.assign({}, el.dataset);
            val.enabled = el.classList.contains('enabled');
            values.push(val);
        });
        return values;
    };

    this.schedule = function () {
        var _this = this;

        var beats = this.getTrackerRowValues(this.current);
        var now = ctx.currentTime;

        var selector = '[data-cell-id="' + this.current + '"]';

        var event = this.clock.callbackAtTime(function () {
            $(selector).addClass('current');
        }, now + this.scheduleForward);

        this.clock.callbackAtTime(function () {
            $(selector).removeClass('current');
        }, now + this.scheduleForward + this.milliPerBeat(this.bpm) / 1000);

        beats.forEach(function (beat) {
            _this.scheduleBeat(beat, now);
        });
    };

    this.scheduleBeat = function (beat, now) {

        var triggerTime = now + this.scheduleForward;
        this.scheduleMap[beat.cellId] = triggerTime;
        if (beat.enabled) {
            this.eventMap[this.getEventKey(beat)] = this.clock.callbackAtTime(function () {
                scheduleAudioBeat(beat, triggerTime);
            }, now);
        }
    };

    this.scheduleMap = {};

    this.scheduleAudioBeatNow = function (beat) {

        if (beat.enabled) {
            var beatEvent = this.eventMap[this.getEventKey(beat)];
            if (beatEvent) {
                beatEvent.clear();
                delete this.eventMap[this.getEventKey(beat)];
            }
            return;
        }

        var triggerTime = this.scheduleMap[0] + beat.cellId * this.milliPerBeat(this.bpm) / 1000;
        var now = ctx.currentTime;
        this.eventMap[this.getEventKey(beat)] = this.clock.callbackAtTime(function () {
            scheduleAudioBeat(beat, triggerTime);
        }, now);
    };

    this.interval;
    this.runSchedule = function () {
        var _this2 = this;

        this.running = true;
        this.bpm = audioOptions.options.bpm;
        var interval = this.milliPerBeat(this.bpm);

        setTimeout(function () {
            _this2.schedule();
            _this2.next();
        }, 0);

        this.interval = setInterval(function () {
            _this2.schedule();
            _this2.next();
        }, interval);
    };

    this.stop = function () {
        this.running = false;
        clearInterval(this.interval);
    };

    this.getEventKey = function getEventKey(beat) {
        return beat.rowId + beat.cellId;
    };
}

function getAudioOptions() {
    this.options = getControlValues();
    this.getOptions = function () {
        return getControlValues();
    };
    this.setOptions = function (values) {
        if (!values) {
            values = getControlValues();
        }
        this.options = values;
    };
}

var audioOptions = new getAudioOptions();

function disconnectNode(node, options) {
    var totalLength = options.attackTime + options.sustainTime + options.releaseTime;

    setTimeout(function () {
        node.disconnect();
    }, totalLength * 1000);
}

function scheduleAudioBeat(beat, triggerTime) {

    var instrumentName = instrumentData.filename[beat.rowId];
    var instrument = buffers[instrumentName].get();

    function connectDelay(instrument) {

        // With sustain and feedback filter
        var delay = ctx.createDelay();
        delay.delayTime.value = audioOptions.options.delay;

        var gain = new adsrGainNode(ctx);
        gain.setOptions(audioOptions.getOptions());
        var feedbackGain = gain.getGainNode(triggerTime);

        var filter = ctx.createBiquadFilter();
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

        instrument.start(triggerTime);
    }

    function connectClean(instrument) {
        // Trigger tone
        var gain = new adsrGainNode(ctx);
        gain.setOptions(audioOptions.getOptions());
        var gainNode = gain.getGainNode(triggerTime);

        instrument.detune.value = audioOptions.options.detune;
        // instrument -> gain

        instrument.connect(gainNode);

        //let reverb = getReverb();
        //gainNode.connect(reverb);
        //reverb.connect(ctx.destination);

        gainNode.connect(ctx.destination);

        instrument.start(triggerTime);
    }

    if (audioOptions.options.delayEnabled) {
        connectDelay(instrument);
    } else {
        connectClean(instrument);
    }

    function getReverb() {

        var reverb = soundbankReverb(ctx);
        // reverb.connect(ctx.destination)

        reverb.time = 1; //seconds
        reverb.wet.value = 0.8;
        reverb.dry.value = 1;

        reverb.filterType = 'lowpass';
        reverb.cutoff.value = 4000; //Hz
        return reverb;
    }
}

var dataUrl = "https://raw.githubusercontent.com/oramics/sampled/master/DM/CR-78/sampled.instrument.json";
var buffers;

function initializeSampleSet(ctx, dataUrl, track) {

    loadSampleSet(ctx, dataUrl, function (sampleData, sampleBuffers) {
        buffers = sampleBuffers;

        if (!track) {
            track = getTrackerValues();
        }
        setupTrackerHtml(sampleData);
        loadTrackerValues(track);
        setupEvents();
    });
}

window.onload = function () {
    var defaultBeat = [{ "rowId": "0", "cellId": "0", "enabled": false }, { "rowId": "0", "cellId": "1", "enabled": false }, { "rowId": "0", "cellId": "2", "enabled": false }, { "rowId": "0", "cellId": "3", "enabled": false }, { "rowId": "0", "cellId": "4", "enabled": false }, { "rowId": "0", "cellId": "5", "enabled": false }, { "rowId": "0", "cellId": "6", "enabled": false }, { "rowId": "0", "cellId": "7", "enabled": false }, { "rowId": "0", "cellId": "8", "enabled": false }, { "rowId": "0", "cellId": "9", "enabled": false }, { "rowId": "0", "cellId": "10", "enabled": false }, { "rowId": "0", "cellId": "11", "enabled": false }, { "rowId": "0", "cellId": "12", "enabled": false }, { "rowId": "0", "cellId": "13", "enabled": false }, { "rowId": "0", "cellId": "14", "enabled": false }, { "rowId": "0", "cellId": "15", "enabled": false }, { "rowId": "1", "cellId": "0", "enabled": false }, { "rowId": "1", "cellId": "1", "enabled": false }, { "rowId": "1", "cellId": "2", "enabled": false }, { "rowId": "1", "cellId": "3", "enabled": false }, { "rowId": "1", "cellId": "4", "enabled": false }, { "rowId": "1", "cellId": "5", "enabled": false }, { "rowId": "1", "cellId": "6", "enabled": false }, { "rowId": "1", "cellId": "7", "enabled": false }, { "rowId": "1", "cellId": "8", "enabled": false }, { "rowId": "1", "cellId": "9", "enabled": false }, { "rowId": "1", "cellId": "10", "enabled": false }, { "rowId": "1", "cellId": "11", "enabled": false }, { "rowId": "1", "cellId": "12", "enabled": false }, { "rowId": "1", "cellId": "13", "enabled": false }, { "rowId": "1", "cellId": "14", "enabled": false }, { "rowId": "1", "cellId": "15", "enabled": false }, { "rowId": "2", "cellId": "0", "enabled": false }, { "rowId": "2", "cellId": "1", "enabled": false }, { "rowId": "2", "cellId": "2", "enabled": false }, { "rowId": "2", "cellId": "3", "enabled": false }, { "rowId": "2", "cellId": "4", "enabled": false }, { "rowId": "2", "cellId": "5", "enabled": false }, { "rowId": "2", "cellId": "6", "enabled": false }, { "rowId": "2", "cellId": "7", "enabled": false }, { "rowId": "2", "cellId": "8", "enabled": false }, { "rowId": "2", "cellId": "9", "enabled": false }, { "rowId": "2", "cellId": "10", "enabled": false }, { "rowId": "2", "cellId": "11", "enabled": false }, { "rowId": "2", "cellId": "12", "enabled": false }, { "rowId": "2", "cellId": "13", "enabled": false }, { "rowId": "2", "cellId": "14", "enabled": false }, { "rowId": "2", "cellId": "15", "enabled": false }, { "rowId": "3", "cellId": "0", "enabled": false }, { "rowId": "3", "cellId": "1", "enabled": false }, { "rowId": "3", "cellId": "2", "enabled": false }, { "rowId": "3", "cellId": "3", "enabled": false }, { "rowId": "3", "cellId": "4", "enabled": false }, { "rowId": "3", "cellId": "5", "enabled": false }, { "rowId": "3", "cellId": "6", "enabled": false }, { "rowId": "3", "cellId": "7", "enabled": false }, { "rowId": "3", "cellId": "8", "enabled": false }, { "rowId": "3", "cellId": "9", "enabled": false }, { "rowId": "3", "cellId": "10", "enabled": false }, { "rowId": "3", "cellId": "11", "enabled": false }, { "rowId": "3", "cellId": "12", "enabled": false }, { "rowId": "3", "cellId": "13", "enabled": false }, { "rowId": "3", "cellId": "14", "enabled": false }, { "rowId": "3", "cellId": "15", "enabled": false }, { "rowId": "4", "cellId": "0", "enabled": true }, { "rowId": "4", "cellId": "1", "enabled": false }, { "rowId": "4", "cellId": "2", "enabled": false }, { "rowId": "4", "cellId": "3", "enabled": true }, { "rowId": "4", "cellId": "4", "enabled": false }, { "rowId": "4", "cellId": "5", "enabled": false }, { "rowId": "4", "cellId": "6", "enabled": false }, { "rowId": "4", "cellId": "7", "enabled": true }, { "rowId": "4", "cellId": "8", "enabled": false }, { "rowId": "4", "cellId": "9", "enabled": false }, { "rowId": "4", "cellId": "10", "enabled": false }, { "rowId": "4", "cellId": "11", "enabled": false }, { "rowId": "4", "cellId": "12", "enabled": false }, { "rowId": "4", "cellId": "13", "enabled": true }, { "rowId": "4", "cellId": "14", "enabled": false }, { "rowId": "4", "cellId": "15", "enabled": false }, { "rowId": "5", "cellId": "0", "enabled": false }, { "rowId": "5", "cellId": "1", "enabled": false }, { "rowId": "5", "cellId": "2", "enabled": false }, { "rowId": "5", "cellId": "3", "enabled": false }, { "rowId": "5", "cellId": "4", "enabled": false }, { "rowId": "5", "cellId": "5", "enabled": false }, { "rowId": "5", "cellId": "6", "enabled": false }, { "rowId": "5", "cellId": "7", "enabled": false }, { "rowId": "5", "cellId": "8", "enabled": false }, { "rowId": "5", "cellId": "9", "enabled": false }, { "rowId": "5", "cellId": "10", "enabled": false }, { "rowId": "5", "cellId": "11", "enabled": false }, { "rowId": "5", "cellId": "12", "enabled": false }, { "rowId": "5", "cellId": "13", "enabled": false }, { "rowId": "5", "cellId": "14", "enabled": false }, { "rowId": "5", "cellId": "15", "enabled": false }, { "rowId": "6", "cellId": "0", "enabled": false }, { "rowId": "6", "cellId": "1", "enabled": true }, { "rowId": "6", "cellId": "2", "enabled": false }, { "rowId": "6", "cellId": "3", "enabled": false }, { "rowId": "6", "cellId": "4", "enabled": true }, { "rowId": "6", "cellId": "5", "enabled": false }, { "rowId": "6", "cellId": "6", "enabled": false }, { "rowId": "6", "cellId": "7", "enabled": false }, { "rowId": "6", "cellId": "8", "enabled": false }, { "rowId": "6", "cellId": "9", "enabled": true }, { "rowId": "6", "cellId": "10", "enabled": false }, { "rowId": "6", "cellId": "11", "enabled": false }, { "rowId": "6", "cellId": "12", "enabled": false }, { "rowId": "6", "cellId": "13", "enabled": false }, { "rowId": "6", "cellId": "14", "enabled": false }, { "rowId": "6", "cellId": "15", "enabled": false }, { "rowId": "7", "cellId": "0", "enabled": false }, { "rowId": "7", "cellId": "1", "enabled": false }, { "rowId": "7", "cellId": "2", "enabled": false }, { "rowId": "7", "cellId": "3", "enabled": false }, { "rowId": "7", "cellId": "4", "enabled": false }, { "rowId": "7", "cellId": "5", "enabled": true }, { "rowId": "7", "cellId": "6", "enabled": false }, { "rowId": "7", "cellId": "7", "enabled": false }, { "rowId": "7", "cellId": "8", "enabled": false }, { "rowId": "7", "cellId": "9", "enabled": false }, { "rowId": "7", "cellId": "10", "enabled": false }, { "rowId": "7", "cellId": "11", "enabled": true }, { "rowId": "7", "cellId": "12", "enabled": false }, { "rowId": "7", "cellId": "13", "enabled": false }, { "rowId": "7", "cellId": "14", "enabled": false }, { "rowId": "7", "cellId": "15", "enabled": true }, { "rowId": "8", "cellId": "0", "enabled": false }, { "rowId": "8", "cellId": "1", "enabled": false }, { "rowId": "8", "cellId": "2", "enabled": false }, { "rowId": "8", "cellId": "3", "enabled": false }, { "rowId": "8", "cellId": "4", "enabled": false }, { "rowId": "8", "cellId": "5", "enabled": false }, { "rowId": "8", "cellId": "6", "enabled": false }, { "rowId": "8", "cellId": "7", "enabled": false }, { "rowId": "8", "cellId": "8", "enabled": false }, { "rowId": "8", "cellId": "9", "enabled": false }, { "rowId": "8", "cellId": "10", "enabled": false }, { "rowId": "8", "cellId": "11", "enabled": false }, { "rowId": "8", "cellId": "12", "enabled": false }, { "rowId": "8", "cellId": "13", "enabled": false }, { "rowId": "8", "cellId": "14", "enabled": false }, { "rowId": "8", "cellId": "15", "enabled": false }, { "rowId": "9", "cellId": "0", "enabled": true }, { "rowId": "9", "cellId": "1", "enabled": false }, { "rowId": "9", "cellId": "2", "enabled": false }, { "rowId": "9", "cellId": "3", "enabled": false }, { "rowId": "9", "cellId": "4", "enabled": false }, { "rowId": "9", "cellId": "5", "enabled": false }, { "rowId": "9", "cellId": "6", "enabled": false }, { "rowId": "9", "cellId": "7", "enabled": false }, { "rowId": "9", "cellId": "8", "enabled": false }, { "rowId": "9", "cellId": "9", "enabled": true }, { "rowId": "9", "cellId": "10", "enabled": false }, { "rowId": "9", "cellId": "11", "enabled": false }, { "rowId": "9", "cellId": "12", "enabled": false }, { "rowId": "9", "cellId": "13", "enabled": false }, { "rowId": "9", "cellId": "14", "enabled": false }, { "rowId": "9", "cellId": "15", "enabled": false }, { "rowId": "10", "cellId": "0", "enabled": false }, { "rowId": "10", "cellId": "1", "enabled": true }, { "rowId": "10", "cellId": "2", "enabled": false }, { "rowId": "10", "cellId": "3", "enabled": false }, { "rowId": "10", "cellId": "4", "enabled": false }, { "rowId": "10", "cellId": "5", "enabled": false }, { "rowId": "10", "cellId": "6", "enabled": false }, { "rowId": "10", "cellId": "7", "enabled": false }, { "rowId": "10", "cellId": "8", "enabled": false }, { "rowId": "10", "cellId": "9", "enabled": false }, { "rowId": "10", "cellId": "10", "enabled": false }, { "rowId": "10", "cellId": "11", "enabled": false }, { "rowId": "10", "cellId": "12", "enabled": false }, { "rowId": "10", "cellId": "13", "enabled": true }, { "rowId": "10", "cellId": "14", "enabled": false }, { "rowId": "10", "cellId": "15", "enabled": false }, { "rowId": "11", "cellId": "0", "enabled": false }, { "rowId": "11", "cellId": "1", "enabled": false }, { "rowId": "11", "cellId": "2", "enabled": false }, { "rowId": "11", "cellId": "3", "enabled": false }, { "rowId": "11", "cellId": "4", "enabled": false }, { "rowId": "11", "cellId": "5", "enabled": false }, { "rowId": "11", "cellId": "6", "enabled": false }, { "rowId": "11", "cellId": "7", "enabled": true }, { "rowId": "11", "cellId": "8", "enabled": false }, { "rowId": "11", "cellId": "9", "enabled": false }, { "rowId": "11", "cellId": "10", "enabled": false }, { "rowId": "11", "cellId": "11", "enabled": false }, { "rowId": "11", "cellId": "12", "enabled": false }, { "rowId": "11", "cellId": "13", "enabled": false }, { "rowId": "11", "cellId": "14", "enabled": false }, { "rowId": "11", "cellId": "15", "enabled": false }, { "rowId": "12", "cellId": "0", "enabled": false }, { "rowId": "12", "cellId": "1", "enabled": false }, { "rowId": "12", "cellId": "2", "enabled": false }, { "rowId": "12", "cellId": "3", "enabled": false }, { "rowId": "12", "cellId": "4", "enabled": false }, { "rowId": "12", "cellId": "5", "enabled": false }, { "rowId": "12", "cellId": "6", "enabled": false }, { "rowId": "12", "cellId": "7", "enabled": false }, { "rowId": "12", "cellId": "8", "enabled": false }, { "rowId": "12", "cellId": "9", "enabled": false }, { "rowId": "12", "cellId": "10", "enabled": false }, { "rowId": "12", "cellId": "11", "enabled": true }, { "rowId": "12", "cellId": "12", "enabled": false }, { "rowId": "12", "cellId": "13", "enabled": false }, { "rowId": "12", "cellId": "14", "enabled": false }, { "rowId": "12", "cellId": "15", "enabled": false }, { "rowId": "13", "cellId": "0", "enabled": false }, { "rowId": "13", "cellId": "1", "enabled": false }, { "rowId": "13", "cellId": "2", "enabled": false }, { "rowId": "13", "cellId": "3", "enabled": false }, { "rowId": "13", "cellId": "4", "enabled": false }, { "rowId": "13", "cellId": "5", "enabled": false }, { "rowId": "13", "cellId": "6", "enabled": false }, { "rowId": "13", "cellId": "7", "enabled": false }, { "rowId": "13", "cellId": "8", "enabled": false }, { "rowId": "13", "cellId": "9", "enabled": false }, { "rowId": "13", "cellId": "10", "enabled": false }, { "rowId": "13", "cellId": "11", "enabled": false }, { "rowId": "13", "cellId": "12", "enabled": false }, { "rowId": "13", "cellId": "13", "enabled": false }, { "rowId": "13", "cellId": "14", "enabled": false }, { "rowId": "13", "cellId": "15", "enabled": false }, { "rowId": "14", "cellId": "0", "enabled": false }, { "rowId": "14", "cellId": "1", "enabled": false }, { "rowId": "14", "cellId": "2", "enabled": false }, { "rowId": "14", "cellId": "3", "enabled": false }, { "rowId": "14", "cellId": "4", "enabled": false }, { "rowId": "14", "cellId": "5", "enabled": true }, { "rowId": "14", "cellId": "6", "enabled": false }, { "rowId": "14", "cellId": "7", "enabled": false }, { "rowId": "14", "cellId": "8", "enabled": false }, { "rowId": "14", "cellId": "9", "enabled": false }, { "rowId": "14", "cellId": "10", "enabled": false }, { "rowId": "14", "cellId": "11", "enabled": false }, { "rowId": "14", "cellId": "12", "enabled": false }, { "rowId": "14", "cellId": "13", "enabled": false }, { "rowId": "14", "cellId": "14", "enabled": false }, { "rowId": "14", "cellId": "15", "enabled": false }, { "rowId": "15", "cellId": "0", "enabled": false }, { "rowId": "15", "cellId": "1", "enabled": false }, { "rowId": "15", "cellId": "2", "enabled": false }, { "rowId": "15", "cellId": "3", "enabled": false }, { "rowId": "15", "cellId": "4", "enabled": false }, { "rowId": "15", "cellId": "5", "enabled": false }, { "rowId": "15", "cellId": "6", "enabled": false }, { "rowId": "15", "cellId": "7", "enabled": false }, { "rowId": "15", "cellId": "8", "enabled": false }, { "rowId": "15", "cellId": "9", "enabled": false }, { "rowId": "15", "cellId": "10", "enabled": false }, { "rowId": "15", "cellId": "11", "enabled": false }, { "rowId": "15", "cellId": "12", "enabled": false }, { "rowId": "15", "cellId": "13", "enabled": false }, { "rowId": "15", "cellId": "14", "enabled": false }, { "rowId": "15", "cellId": "15", "enabled": false }];
    initializeSampleSet(ctx, dataUrl, defaultBeat);
    setupBaseEvents();
    setupStorage();
};

var instrumentData = {};
function setupTrackerHtml(data) {

    instrumentData = data;
    document.getElementById("tracker").innerHTML = '';
    var str = getHtmlRowsCells(data.filename.length, measureLength, 'tr', 'td');
    var t = document.getElementById('tracker');
    t.insertAdjacentHTML('afterbegin', str);
}

var schedule = new scheduleMeasure(ctx);
function setupBaseEvents() {
    document.getElementById('play').addEventListener('click', function (e) {
        schedule.stop();
        schedule.runSchedule();
    });

    document.getElementById('pause').addEventListener('click', function (e) {
        schedule.stop();
    });

    document.getElementById('stop').addEventListener('click', function (e) {
        schedule.stop();
        schedule = new scheduleMeasure(ctx);
    });

    document.getElementById('bpm').addEventListener('change', function (e) {
        audioOptions.setOptions();
        if (schedule.running) {
            schedule.stop();
            schedule.runSchedule();
        }
    });

    $('.base').on('change', function () {
        audioOptions.setOptions();
    });
}

function setupEvents() {

    $('.cell').on('click', function (e) {
        var val = Object.assign({}, this.dataset);
        val.enabled = $(this).hasClass("enabled");

        var currentBeat = $('.current').data('cell-id');
        if (val.cellId > currentBeat) {
            schedule.scheduleAudioBeatNow(val);
        }

        $(this).toggleClass('enabled');
    });
}

$('#sampleSet').on('change', function () {
    initializeSampleSet(ctx, this.value);
});

function getControlValues() {
    var formValues = new getSetFormValues();
    var form = document.getElementById("trackerControls");
    var values = formValues.get(form);

    var ret = {};
    for (var key in values) {

        if (key === 'delayEnabled') {
            ret[key] = 'true';
            continue;
        }

        if (key === 'sampleSet') {
            ret[key] = values[key];
            continue;
        }
        ret[key] = parseFloat(values[key]);
    }
    return ret;
}

function setLocalStorage(update) {
    var storage = {};
    storage['Select'] = 'Select';

    for (var i = 0, len = localStorage.length; i < len; ++i) {
        var item = localStorage.key(i);
        storage[item] = item;
    }

    // Create select element
    var s = new selectElement('load-storage', // id to append the select list to
    'beat-list', // id of the select list
    storage //
    );

    if (update) {
        s.update('beat-list', storage);
    } else {
        s.create();
    }
}

function setupStorage() {

    setLocalStorage();
    document.getElementById('save').addEventListener('click', function (e) {
        e.preventDefault();

        var formData = getControlValues();
        var filename = $('#filename').val();
        if (!filename) {
            filename = 'untitled';
        }

        var beat = getTrackerValues();
        var song = { "beat": beat, "settings": formData };

        localStorage.setItem(filename, JSON.stringify(song));
        setLocalStorage('update');
        setTimeout(function () {
            alert('Track saved');
        }, 1);
    });

    document.getElementById('beat-list').addEventListener('change', function (e) {
        var item = $('#beat-list').val();
        if (item === 'Select') {
            document.getElementById('filename').value = '';
            return;
        }

        document.getElementById('filename').value = item;
        var track = JSON.parse(localStorage.getItem(item));
        var formValues = new getSetFormValues();
        var form = document.getElementById("trackerControls");

        formValues.set(form, track.settings);
        audioOptions.setOptions(track.settings);
        schedule.stop();

        initializeSampleSet(ctx, track.settings.sampleSet, track.beat);
    });

    document.getElementById('delete').addEventListener('click', function (e) {
        var elem = document.getElementById('beat-list');
        var toDelete = elem.options[elem.selectedIndex].text;

        localStorage.removeItem(toDelete);
        document.getElementById('filename').value = '';
        setLocalStorage('update');
    });
}

function loadTrackerValues(json) {
    $('.cell').removeClass('enabled');
    json.forEach(function (elem) {
        if (elem.enabled === true) {
            var selector = '[data-row-id="' + elem.rowId + '"][data-cell-id="' + elem.cellId + '"]';
            $(selector).addClass("enabled");
        }
    });
}

function getTrackerValues() {
    var values = [];
    $(".cell").each(function () {
        var val = Object.assign({}, this.dataset);
        val.enabled = $(this).hasClass("enabled");
        values.push(val);
    });
    return values;
}

},{"adsr-gain-node":2,"get-html-rows-cells":4,"get-set-form-values":5,"load-sample-set":6,"select-element":7,"waaclock":9}],2:[function(require,module,exports){
function Gain(ctx) {

    this.ctx = ctx;

    this.secondsToTimeConstant = function (sec) {
        return (sec * 2) / 8;
    };

    this.options = {
        initGain: 0.1, // Init gain on note
        maxGain: 1.0, // Max gain on note
        attackTime: 0.1, // AttackTime. gain.init to gain.max in attackTime
        sustainTime: 1, // Sustain note in time
        releaseTime: 1, // Approximated end time. Calculated with secondsToTimeConstant()
        // disconnect: false // Should we autodisconnect. Default is true
    };

    this.setOptions = function (options) {
        this.options = options;
    };

    this.gainNode;
    /**
     * The gainNode
     * @param {float} begin ctx time
     * @returns {Gain.getGainNode.gainNode}
     */
    this.getGainNode = function (begin) {

        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = this.options.initGain;

        // Attack to max
        this.gainNode.gain.setTargetAtTime(
                this.options.maxGain,
                begin + this.options.attackTime,
                this.options.attackTime);

        // Sustain and end note
        this.gainNode.gain.setTargetAtTime(
                0.0,
                begin + this.options.attackTime + this.options.sustainTime,
                this.secondsToTimeConstant(this.options.releaseTime));
        
        if (this.options.disconnect !== false) {
            this.disconnect(begin);
        }
        
        return this.gainNode;
    };
    
    this.disconnect = function() {
        var totalLength = 
                this.options.attackTime + this.options.sustainTime + this.options.releaseTime;
        
        setTimeout( () => {
            this.gainNode.disconnect();
        },
        totalLength * 1000);
    };
}

module.exports = Gain;
},{}],3:[function(require,module,exports){
// From: https://dev.opera.com/articles/drum-sounds-webaudio/
function Instrument(context, buffer) {
    this.context = context;
    this.buffer = buffer;
}

Instrument.prototype.setup = function () {
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.context.destination);
};

Instrument.prototype.get = function () {
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    return this.source;
};

Instrument.prototype.trigger = function (time) {
    this.setup();
    this.source.start(time);
};

module.exports = Instrument;

},{}],4:[function(require,module,exports){
function getHTMLRowsCells(numRows, numCells, div, span) {
    
    var str = '';
    
    if (!div) div = 'span';
    if (!span) span ='span';
    
    
    for (rowID = 0; rowID < numRows; rowID++) {
        str += `<${div} class="row" data-id="${rowID}">`;
        str += getCells(rowID, numCells, span);
        str += `</${div}>`;
    }
    return str;
}

function getCells(rowID, numCells, span) {
    var str = '';
    for (c = 0; c < numCells; c++) {
        str += `<${span} class="cell" data-row-id="${rowID}" data-cell-id="${c}"></${span}>`;
    }
    return str;
}




module.exports = getHTMLRowsCells;

},{}],5:[function(require,module,exports){
function getElemCountByName (name) {
    var names = document.getElementsByName(name);
    return names.length;
}

function getFormValues(formElement) {
    var formElements = formElement.elements;
    var formParams = {};
    var i = 0;
    var elem = null;
    for (i = 0; i < formElements.length; i += 1) {
        elem = formElements[i];
        switch (elem.type) {
            
            case 'submit':
                break;
            case 'radio':
                if (elem.checked) {
                    formParams[elem.name] = elem.value;
                }
                break;
            case 'checkbox':
                
                // Single checkbox
                var numElems = getElemCountByName(elem.name);
                if (numElems === 1) {
                    if (elem.checked) {
                        if (!formParams[elem.name]) {
                            formParams[elem.name] = elem.value;
                        }
                    }
                    break;
                }
                
                // Multiple
                if (elem.checked) {
                    if (!formParams[elem.name]) {
                        formParams[elem.name] = [elem.value];
                    } else {
                        formParams[elem.name].push(elem.value);
                    }
                }
                break;
            case 'select-multiple':
                var selectValues = getSelectValues(elem);
                if (selectValues.length > 0) {
                    formParams[elem.name] = selectValues;
                }
                break;
            default:
                if (elem.value !== "") {
                    formParams[elem.name] = elem.value;
                }
        }
    }
    return formParams;
}

function setFormValues(formElement, values) {
    var formElements = formElement.elements;
    var formParams = {};
    var i = 0;
    var elem = null;
    for (i = 0; i < formElements.length; i += 1) {
        elem = formElements[i];
        
        if ( !(elem.name in values) ) {
            continue;
        }
        
        switch (elem.type) {
            case 'submit':
                break;
            case 'radio':
                if (values[elem.name] === elem.value) {
                    elem.checked = true;
                } else {
                    elem.checked = false;
                }
                break;
            case 'checkbox':
                if (values[elem.name].indexOf(elem.value)) {
                    elem.checked = true;
                } else {
                    elem.checked = false;
                }
                break;
            case 'select-multiple':
                if (values[elem.name]) {
                    setSelectValues(elem, values[elem.name]);
                }
                break;
            default:
                if (values[elem.name]) {
                    elem.value = values[elem.name];
                }
                
        }
    }
}

function setSelectValues(selectElem, values) {
    var options = selectElem.options;
    var opt;
    
    for (var i = 0, iLen = options.length; i < iLen; i++) {
        opt = options[i];
        if (values.indexOf(opt.value) > -1 ) {
            opt.selected = true;
        } else {
            opt.selected = false;
        }        
    }
}

function getSelectValues(select) {
    var result = [];
    var options = select && select.options;
    var opt;

    for (var i = 0, iLen = options.length; i < iLen; i++) {
        opt = options[i];

        if (opt.selected) {
            result.push(opt.value || opt.text);
        }
    }
    return result;
}

function getSetFormValues () {
    this.set = setFormValues;
    this.get = getFormValues;
}

module.exports = getSetFormValues;

},{}],6:[function(require,module,exports){
var tinySampleLoader = require('tiny-sample-loader');
var audioBufferInstrument = require('audio-buffer-instrument');

function loadSampleSet(ctx, dataUrl, cb) {
    
    fetch(dataUrl).then(function(response) {
        
        if (response.status !== 200) {  
            console.log('Looks like there was a problem. Status Code: ' +  response.status);  
            return;  
        }

        response.json().then(function(data) {  
            
            var baseUrl = data.samples;
            var buffers = {};
            var promises = [];

            data.filename = [];
            var i = 0;
            data.files.forEach(function (val) {
                var filename = val.replace(/\.[^/.]+$/, "");
                data.filename.push(filename);
                var remoteUrl = baseUrl + val;
                
                let loaderPromise = tinySampleLoader(remoteUrl, ctx, (buffer) => {
                    buffers[filename] = new audioBufferInstrument(ctx, buffer);
                });
                
                promises.push(loaderPromise);
                
            });
            
            Promise.all(promises).then(values => { 
                cb(data, buffers);
            }).catch(e => {
                console.log(e);
            });
            
            
        });    
    }).catch(function(err) {  
        console.log('Fetch Error :-S', err);  
    });
}

module.exports = loadSampleSet;
},{"audio-buffer-instrument":3,"tiny-sample-loader":8}],7:[function(require,module,exports){
function selectElement(appendToID, selectID, options, selected) {

    this.appendToID = appendToID;
    this.selectID = selectID;
    this.options = options;
    this.selected = selected;
    
    this.create = function() {
        var appendToID = document.getElementById(this.appendToID);
        var selectList = document.createElement("select");
        selectList.id = this.selectID;        
        appendToID.appendChild(selectList);
        this.update(selectID, this.options, this.selected);
    };
    
    this.update = function (elem, options, selected) {
        this.delete(elem);
        var selectList = document.getElementById(elem);
        for (var key in options) {
            var option = document.createElement("option");
            option.value = key;
            option.text = options[key];
            selectList.appendChild(option);

            if (key === selected) {
                option.setAttribute('selected', true);
            }
        }
    };
    
    this.getSelected = function (elem) {
        var selectList = document.getElementById(elem);
        var opt;
        for ( var i = 0, len = selectList.options.length; i < len; i++ ) {
            opt = selectList.options[i];
            if ( opt.selected === true ) {
                return opt.value;
                break;
            }
        }
        return false;
    };
    
    this.delete = function (elem) {
        var selectList=document.getElementById(elem);
        for (var option in selectList){
            selectList.remove(option);
        }
    };
    
    this.getAsString = function () {
        var element = document.getElementById(this.appendToID);
        var elementHtml = element.outerHTML;
        return elementHtml;
    };
}

module.exports = selectElement;
},{}],8:[function(require,module,exports){
function sampleLoader (url, context, callback) {
    
    var promise = new Promise((resolve, reject) => { 
        var request = new XMLHttpRequest();
    
        request.open('get', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function () {
            if(request.status === 200){
                context.decodeAudioData(request.response, function (buffer) {
                    callback(buffer);
                    resolve('sampleLoader request success');
                });
            } else {
                reject('sampleLoader request failed');
            }

        };
        request.send();
    });
    
    return promise;
};
module.exports = sampleLoader;
},{}],9:[function(require,module,exports){
var WAAClock = require('./lib/WAAClock')

module.exports = WAAClock
if (typeof window !== 'undefined') window.WAAClock = WAAClock

},{"./lib/WAAClock":10}],10:[function(require,module,exports){
(function (process){
var isBrowser = (typeof window !== 'undefined')

var CLOCK_DEFAULTS = {
  toleranceLate: 0.10,
  toleranceEarly: 0.001
}

// ==================== Event ==================== //
var Event = function(clock, deadline, func) {
  this.clock = clock
  this.func = func
  this._cleared = false // Flag used to clear an event inside callback

  this.toleranceLate = clock.toleranceLate
  this.toleranceEarly = clock.toleranceEarly
  this._latestTime = null
  this._earliestTime = null
  this.deadline = null
  this.repeatTime = null

  this.schedule(deadline)
}

// Unschedules the event
Event.prototype.clear = function() {
  this.clock._removeEvent(this)
  this._cleared = true
  return this
}

// Sets the event to repeat every `time` seconds.
Event.prototype.repeat = function(time) {
  if (time === 0)
    throw new Error('delay cannot be 0')
  this.repeatTime = time
  if (!this.clock._hasEvent(this))
    this.schedule(this.deadline + this.repeatTime)
  return this
}

// Sets the time tolerance of the event.
// The event will be executed in the interval `[deadline - early, deadline + late]`
// If the clock fails to execute the event in time, the event will be dropped.
Event.prototype.tolerance = function(values) {
  if (typeof values.late === 'number')
    this.toleranceLate = values.late
  if (typeof values.early === 'number')
    this.toleranceEarly = values.early
  this._refreshEarlyLateDates()
  if (this.clock._hasEvent(this)) {
    this.clock._removeEvent(this)
    this.clock._insertEvent(this)
  }
  return this
}

// Returns true if the event is repeated, false otherwise
Event.prototype.isRepeated = function() { return this.repeatTime !== null }

// Schedules the event to be ran before `deadline`.
// If the time is within the event tolerance, we handle the event immediately.
// If the event was already scheduled at a different time, it is rescheduled.
Event.prototype.schedule = function(deadline) {
  this._cleared = false
  this.deadline = deadline
  this._refreshEarlyLateDates()

  if (this.clock.context.currentTime >= this._earliestTime) {
    this._execute()
  
  } else if (this.clock._hasEvent(this)) {
    this.clock._removeEvent(this)
    this.clock._insertEvent(this)
  
  } else this.clock._insertEvent(this)
}

Event.prototype.timeStretch = function(tRef, ratio) {
  if (this.isRepeated())
    this.repeatTime = this.repeatTime * ratio

  var deadline = tRef + ratio * (this.deadline - tRef)
  // If the deadline is too close or past, and the event has a repeat,
  // we calculate the next repeat possible in the stretched space.
  if (this.isRepeated()) {
    while (this.clock.context.currentTime >= deadline - this.toleranceEarly)
      deadline += this.repeatTime
  }
  this.schedule(deadline)
}

// Executes the event
Event.prototype._execute = function() {
  if (this.clock._started === false) return
  this.clock._removeEvent(this)

  if (this.clock.context.currentTime < this._latestTime)
    this.func(this)
  else {
    if (this.onexpired) this.onexpired(this)
    console.warn('event expired')
  }
  // In the case `schedule` is called inside `func`, we need to avoid
  // overrwriting with yet another `schedule`.
  if (!this.clock._hasEvent(this) && this.isRepeated() && !this._cleared)
    this.schedule(this.deadline + this.repeatTime) 
}

// Updates cached times
Event.prototype._refreshEarlyLateDates = function() {
  this._latestTime = this.deadline + this.toleranceLate
  this._earliestTime = this.deadline - this.toleranceEarly
}

// ==================== WAAClock ==================== //
var WAAClock = module.exports = function(context, opts) {
  var self = this
  opts = opts || {}
  this.tickMethod = opts.tickMethod || 'ScriptProcessorNode'
  this.toleranceEarly = opts.toleranceEarly || CLOCK_DEFAULTS.toleranceEarly
  this.toleranceLate = opts.toleranceLate || CLOCK_DEFAULTS.toleranceLate
  this.context = context
  this._events = []
  this._started = false
}

// ---------- Public API ---------- //
// Schedules `func` to run after `delay` seconds.
WAAClock.prototype.setTimeout = function(func, delay) {
  return this._createEvent(func, this._absTime(delay))
}

// Schedules `func` to run before `deadline`.
WAAClock.prototype.callbackAtTime = function(func, deadline) {
  return this._createEvent(func, deadline)
}

// Stretches `deadline` and `repeat` of all scheduled `events` by `ratio`, keeping
// their relative distance to `tRef`. In fact this is equivalent to changing the tempo.
WAAClock.prototype.timeStretch = function(tRef, events, ratio) {
  events.forEach(function(event) { event.timeStretch(tRef, ratio) })
  return events
}

// Removes all scheduled events and starts the clock 
WAAClock.prototype.start = function() {
  if (this._started === false) {
    var self = this
    this._started = true
    this._events = []

    if (this.tickMethod === 'ScriptProcessorNode') {
      var bufferSize = 256
      // We have to keep a reference to the node to avoid garbage collection
      this._clockNode = this.context.createScriptProcessor(bufferSize, 1, 1)
      this._clockNode.connect(this.context.destination)
      this._clockNode.onaudioprocess = function () {
        process.nextTick(function() { self._tick() })
      }
    } else if (this.tickMethod === 'manual') null // _tick is called manually

    else throw new Error('invalid tickMethod ' + this.tickMethod)
  }
}

// Stops the clock
WAAClock.prototype.stop = function() {
  if (this._started === true) {
    this._started = false
    this._clockNode.disconnect()
  }  
}

// ---------- Private ---------- //

// This function is ran periodically, and at each tick it executes
// events for which `currentTime` is included in their tolerance interval.
WAAClock.prototype._tick = function() {
  var event = this._events.shift()

  while(event && event._earliestTime <= this.context.currentTime) {
    event._execute()
    event = this._events.shift()
  }

  // Put back the last event
  if(event) this._events.unshift(event)
}

// Creates an event and insert it to the list
WAAClock.prototype._createEvent = function(func, deadline) {
  return new Event(this, deadline, func)
}

// Inserts an event to the list
WAAClock.prototype._insertEvent = function(event) {
  this._events.splice(this._indexByTime(event._earliestTime), 0, event)
}

// Removes an event from the list
WAAClock.prototype._removeEvent = function(event) {
  var ind = this._events.indexOf(event)
  if (ind !== -1) this._events.splice(ind, 1)
}

// Returns true if `event` is in queue, false otherwise
WAAClock.prototype._hasEvent = function(event) {
 return this._events.indexOf(event) !== -1
}

// Returns the index of the first event whose deadline is >= to `deadline`
WAAClock.prototype._indexByTime = function(deadline) {
  // performs a binary search
  var low = 0
    , high = this._events.length
    , mid
  while (low < high) {
    mid = Math.floor((low + high) / 2)
    if (this._events[mid]._earliestTime < deadline)
      low = mid + 1
    else high = mid
  }
  return low
}

// Converts from relative time to absolute time
WAAClock.prototype._absTime = function(relTime) {
  return relTime + this.context.currentTime
}

// Converts from absolute time to relative time 
WAAClock.prototype._relTime = function(absTime) {
  return absTime - this.context.currentTime
}
}).call(this,require('_process'))

},{"_process":11}],11:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJtYWluLmpzIiwibm9kZV9tb2R1bGVzL2Fkc3ItZ2Fpbi1ub2RlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2F1ZGlvLWJ1ZmZlci1pbnN0cnVtZW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2dldC1odG1sLXJvd3MtY2VsbHMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2V0LXNldC1mb3JtLXZhbHVlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2FkLXNhbXBsZS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc2VsZWN0LWVsZW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdGlueS1zYW1wbGUtbG9hZGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2xpYi9XQUFDbG9jay5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQU0sZUFBZSxRQUFRLGdCQUFSLENBQXJCO0FBQ0EsSUFBTSxtQkFBbUIsUUFBUSxxQkFBUixDQUF6QjtBQUNBLElBQU0sV0FBVyxRQUFRLFVBQVIsQ0FBakI7QUFDQSxJQUFNLGdCQUFnQixRQUFRLGlCQUFSLENBQXRCO0FBQ0EsSUFBTSxtQkFBbUIsUUFBUSxxQkFBUixDQUF6QjtBQUNBLElBQU0sZ0JBQWdCLFFBQVEsZ0JBQVIsQ0FBdEI7O0FBRUEsSUFBTSxNQUFNLElBQUksWUFBSixFQUFaO0FBQ0EsSUFBSSxnQkFBZ0IsRUFBcEI7O0FBRUEsU0FBUyxl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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBhZHNyR2Fpbk5vZGUgPSByZXF1aXJlKCdhZHNyLWdhaW4tbm9kZScpO1xuY29uc3QgZ2V0SHRtbFJvd3NDZWxscyA9IHJlcXVpcmUoJ2dldC1odG1sLXJvd3MtY2VsbHMnKTtcbmNvbnN0IFdBQUNsb2NrID0gcmVxdWlyZSgnd2FhY2xvY2snKTtcbmNvbnN0IGxvYWRTYW1wbGVTZXQgPSByZXF1aXJlKCdsb2FkLXNhbXBsZS1zZXQnKTtcbmNvbnN0IGdldFNldEZvcm1WYWx1ZXMgPSByZXF1aXJlKCdnZXQtc2V0LWZvcm0tdmFsdWVzJyk7XG5jb25zdCBzZWxlY3RFbGVtZW50ID0gcmVxdWlyZSgnc2VsZWN0LWVsZW1lbnQnKTtcblxuY29uc3QgY3R4ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xudmFyIG1lYXN1cmVMZW5ndGggPSAxNjtcblxuZnVuY3Rpb24gc2NoZWR1bGVNZWFzdXJlKGN0eCkge1xuXG4gICAgdGhpcy5zY2hlZHVsZUZvcndhcmQgPSAwLjE7XG4gICAgdGhpcy5icG0gPSBhdWRpb09wdGlvbnMub3B0aW9ucy5icG07XG4gICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICB0aGlzLmV2ZW50TWFwID0ge307XG4gICAgdGhpcy5jbG9jayA9IG5ldyBXQUFDbG9jayhjdHgpO1xuICAgIHRoaXMuY2xvY2suc3RhcnQoKTtcbiAgICB0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcblxuICAgIHRoaXMubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50Kys7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnQgPj0gbWVhc3VyZUxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5taWxsaVBlckJlYXQgPSBmdW5jdGlvbiAoYmVhdHMpIHtcbiAgICAgICAgaWYgKCFiZWF0cykge1xuICAgICAgICAgICAgYmVhdHMgPSA2MDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTAwMCAqIDYwIC8gYmVhdHM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VHJhY2tlclJvd1ZhbHVlcyA9IGZ1bmN0aW9uIChjZWxsSWQpIHtcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtY2VsbC1pZD1cIiR7Y2VsbElkfVwiXWA7XG5cbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGVsZW1zLmZvckVhY2goKGVsKSA9PiB7XG4gICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgZWwuZGF0YXNldCk7XG4gICAgICAgICAgICB2YWwuZW5hYmxlZCA9IGVsLmNsYXNzTGlzdC5jb250YWlucygnZW5hYmxlZCcpO1xuICAgICAgICAgICAgdmFsdWVzLnB1c2godmFsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfTtcblxuICAgIHRoaXMuc2NoZWR1bGUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgbGV0IGJlYXRzID0gdGhpcy5nZXRUcmFja2VyUm93VmFsdWVzKHRoaXMuY3VycmVudCk7XG4gICAgICAgIGxldCBub3cgPSBjdHguY3VycmVudFRpbWU7XG5cbiAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLWNlbGwtaWQ9XCIke3RoaXMuY3VycmVudH1cIl1gO1xuXG4gICAgICAgIGxldCBldmVudCA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgJChzZWxlY3RvcikuYWRkQ2xhc3MoJ2N1cnJlbnQnKTtcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQpO1xuXG4gICAgICAgIHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgJChzZWxlY3RvcikucmVtb3ZlQ2xhc3MoJ2N1cnJlbnQnKTtcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQgKyB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwKTtcblxuICAgICAgICBiZWF0cy5mb3JFYWNoKChiZWF0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlQmVhdChiZWF0LCBub3cpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5zY2hlZHVsZUJlYXQgPSBmdW5jdGlvbiAoYmVhdCwgbm93KSB7XG5cbiAgICAgICAgbGV0IHRyaWdnZXJUaW1lID0gbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQ7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVNYXBbYmVhdC5jZWxsSWRdID0gdHJpZ2dlclRpbWU7XG4gICAgICAgIGlmIChiZWF0LmVuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZUF1ZGlvQmVhdChiZWF0LCB0cmlnZ2VyVGltZSk7XG4gICAgICAgICAgICB9LCBub3cpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuc2NoZWR1bGVNYXAgPSB7fTtcblxuICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXROb3cgPSBmdW5jdGlvbiAoYmVhdCkge1xuXG4gICAgICAgIGlmIChiZWF0LmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGxldCBiZWF0RXZlbnQgPSB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldO1xuICAgICAgICAgICAgaWYgKGJlYXRFdmVudCkge1xuICAgICAgICAgICAgICAgIGJlYXRFdmVudC5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHRyaWdnZXJUaW1lID0gdGhpcy5zY2hlZHVsZU1hcFswXSArIGJlYXQuY2VsbElkICogdGhpcy5taWxsaVBlckJlYXQodGhpcy5icG0pIC8gMTAwMDtcbiAgICAgICAgbGV0IG5vdyA9IGN0eC5jdXJyZW50VGltZTtcbiAgICAgICAgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXSA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICB9LCBub3cpO1xuICAgIH07XG5cbiAgICB0aGlzLmludGVydmFsO1xuICAgIHRoaXMucnVuU2NoZWR1bGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuYnBtID0gYXVkaW9PcHRpb25zLm9wdGlvbnMuYnBtO1xuICAgICAgICBsZXQgaW50ZXJ2YWwgPSB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSk7XG5cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgICAgfSwgMCk7XG5cbiAgICAgICAgdGhpcy5pbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGUoKTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuXG4gICAgICAgIH0sIGludGVydmFsKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsKTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0RXZlbnRLZXkgPSBmdW5jdGlvbiBnZXRFdmVudEtleShiZWF0KSB7XG4gICAgICAgIHJldHVybiBiZWF0LnJvd0lkICsgYmVhdC5jZWxsSWQ7XG4gICAgfTtcbn1cblxuXG5cbmZ1bmN0aW9uIGdldEF1ZGlvT3B0aW9ucygpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBnZXRDb250cm9sVmFsdWVzKCk7XG4gICAgdGhpcy5nZXRPcHRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZ2V0Q29udHJvbFZhbHVlcygpO1xuICAgIH07XG4gICAgdGhpcy5zZXRPcHRpb25zID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICBpZiAoIXZhbHVlcykge1xuICAgICAgICAgICAgdmFsdWVzID0gZ2V0Q29udHJvbFZhbHVlcygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHZhbHVlcztcbiAgICB9OyAgXG59XG5cbnZhciBhdWRpb09wdGlvbnMgPSBuZXcgZ2V0QXVkaW9PcHRpb25zKCk7XG5cbmZ1bmN0aW9uIGRpc2Nvbm5lY3ROb2RlKG5vZGUsIG9wdGlvbnMpIHtcbiAgICBsZXQgdG90YWxMZW5ndGggPVxuICAgICAgICAgICAgb3B0aW9ucy5hdHRhY2tUaW1lICsgb3B0aW9ucy5zdXN0YWluVGltZSArIG9wdGlvbnMucmVsZWFzZVRpbWU7XG5cbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgbm9kZS5kaXNjb25uZWN0KCk7XG4gICAgfSwgdG90YWxMZW5ndGggKiAxMDAwKTtcbn1cblxuZnVuY3Rpb24gc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpIHtcblxuICAgIGxldCBpbnN0cnVtZW50TmFtZSA9IGluc3RydW1lbnREYXRhLmZpbGVuYW1lW2JlYXQucm93SWRdO1xuICAgIGxldCBpbnN0cnVtZW50ID0gYnVmZmVyc1tpbnN0cnVtZW50TmFtZV0uZ2V0KCk7XG5cbiAgICBmdW5jdGlvbiBjb25uZWN0RGVsYXkoaW5zdHJ1bWVudCkge1xuXG4gICAgICAgIC8vIFdpdGggc3VzdGFpbiBhbmQgZmVlZGJhY2sgZmlsdGVyXG4gICAgICAgIGxldCBkZWxheSA9IGN0eC5jcmVhdGVEZWxheSgpO1xuICAgICAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBhdWRpb09wdGlvbnMub3B0aW9ucy5kZWxheTtcblxuICAgICAgICBsZXQgZ2FpbiA9IG5ldyBhZHNyR2Fpbk5vZGUoY3R4KTtcbiAgICAgICAgZ2Fpbi5zZXRPcHRpb25zKGF1ZGlvT3B0aW9ucy5nZXRPcHRpb25zKCkpO1xuICAgICAgICBsZXQgZmVlZGJhY2tHYWluID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG5cblxuICAgICAgICBsZXQgZmlsdGVyID0gY3R4LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICBmaWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gYXVkaW9PcHRpb25zLm9wdGlvbnMuZmlsdGVyO1xuXG4gICAgICAgIC8vIGRlbGF5IC0+IGZlZWRiYWNrXG4gICAgICAgIGRlbGF5LmNvbm5lY3QoZmVlZGJhY2tHYWluKTtcbiAgICAgICAgZGlzY29ubmVjdE5vZGUoZGVsYXksIGF1ZGlvT3B0aW9ucy5nZXRPcHRpb25zKCkpO1xuXG4gICAgICAgIC8vIGZlZWRiYWNrIC0+IGZpbHRlclxuICAgICAgICBmZWVkYmFja0dhaW4uY29ubmVjdChmaWx0ZXIpO1xuXG4gICAgICAgIC8vIGZpbHRlciAtPmRlbGF5XG4gICAgICAgIGZpbHRlci5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICBpbnN0cnVtZW50LmRldHVuZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRldHVuZTtcblxuICAgICAgICAvLyBkZWxheSAtPiBpbnN0cnVtZW50XG4gICAgICAgIGluc3RydW1lbnQuY29ubmVjdChkZWxheSk7XG5cbiAgICAgICAgLy8gSW5zdHJ1bWVudCAtPlxuICAgICAgICBpbnN0cnVtZW50LmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAvLyBEZWxheSAtPlxuICAgICAgICBkZWxheS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5zdGFydCh0cmlnZ2VyVGltZSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb25uZWN0Q2xlYW4oaW5zdHJ1bWVudCkge1xuICAgICAgICAvLyBUcmlnZ2VyIHRvbmVcbiAgICAgICAgbGV0IGdhaW4gPSBuZXcgYWRzckdhaW5Ob2RlKGN0eCk7XG4gICAgICAgIGdhaW4uc2V0T3B0aW9ucyhhdWRpb09wdGlvbnMuZ2V0T3B0aW9ucygpKTtcbiAgICAgICAgbGV0IGdhaW5Ob2RlID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5kZXR1bmUudmFsdWUgPSBhdWRpb09wdGlvbnMub3B0aW9ucy5kZXR1bmU7XG4gICAgICAgIC8vIGluc3RydW1lbnQgLT4gZ2FpblxuICAgICAgICBcbiAgICAgICAgaW5zdHJ1bWVudC5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgXG4gICAgICAgIC8vbGV0IHJldmVyYiA9IGdldFJldmVyYigpO1xuICAgICAgICAvL2dhaW5Ob2RlLmNvbm5lY3QocmV2ZXJiKTtcbiAgICAgICAgLy9yZXZlcmIuY29ubmVjdChjdHguZGVzdGluYXRpb24pO1xuICAgICAgICBcbiAgICAgICAgZ2Fpbk5vZGUuY29ubmVjdChjdHguZGVzdGluYXRpb24pO1xuXG4gICAgICAgIGluc3RydW1lbnQuc3RhcnQodHJpZ2dlclRpbWUpO1xuICAgIH1cblxuICAgIGlmIChhdWRpb09wdGlvbnMub3B0aW9ucy5kZWxheUVuYWJsZWQpIHtcbiAgICAgICAgY29ubmVjdERlbGF5KGluc3RydW1lbnQpXG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29ubmVjdENsZWFuKGluc3RydW1lbnQpO1xuICAgIH1cbiAgICBcbiAgICBmdW5jdGlvbiBnZXRSZXZlcmIgKCkge1xuICAgICAgICAgICAgICAgIFxuICAgICAgICBsZXQgcmV2ZXJiID0gc291bmRiYW5rUmV2ZXJiKGN0eClcbiAgICAgICAgLy8gcmV2ZXJiLmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKVxuXG4gICAgICAgIHJldmVyYi50aW1lID0gMSAvL3NlY29uZHNcbiAgICAgICAgcmV2ZXJiLndldC52YWx1ZSA9IDAuOFxuICAgICAgICByZXZlcmIuZHJ5LnZhbHVlID0gMVxuXG4gICAgICAgIHJldmVyYi5maWx0ZXJUeXBlID0gJ2xvd3Bhc3MnXG4gICAgICAgIHJldmVyYi5jdXRvZmYudmFsdWUgPSA0MDAwIC8vSHpcbiAgICAgICAgcmV0dXJuIHJldmVyYjtcbiAgICB9XG4gICAgXG59XG5cbnZhciBkYXRhVXJsID0gXCJodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vb3JhbWljcy9zYW1wbGVkL21hc3Rlci9ETS9DUi03OC9zYW1wbGVkLmluc3RydW1lbnQuanNvblwiO1xudmFyIGJ1ZmZlcnM7XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCB0cmFjaykge1xuICAgIFxuICAgIGxvYWRTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCBmdW5jdGlvbiAoc2FtcGxlRGF0YSwgc2FtcGxlQnVmZmVycykge1xuICAgICAgICBidWZmZXJzID0gc2FtcGxlQnVmZmVycztcbiAgICAgICAgXG4gICAgICAgIGlmICghdHJhY2spIHtcbiAgICAgICAgICAgIHRyYWNrID0gZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICB9IFxuICAgICAgICBzZXR1cFRyYWNrZXJIdG1sKHNhbXBsZURhdGEpOyAgICBcbiAgICAgICAgbG9hZFRyYWNrZXJWYWx1ZXModHJhY2spXG4gICAgICAgIHNldHVwRXZlbnRzKCk7XG4gICAgfSk7XG59XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRlZmF1bHRCZWF0ID0gW3tcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTBcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEyXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTNcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTNcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNVwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNVwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX1dXG4gICAgaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIGRhdGFVcmwsIGRlZmF1bHRCZWF0KTtcbiAgICBzZXR1cEJhc2VFdmVudHMoKTtcbiAgICBzZXR1cFN0b3JhZ2UoKTtcbn07XG5cbnZhciBpbnN0cnVtZW50RGF0YSA9IHt9O1xuZnVuY3Rpb24gc2V0dXBUcmFja2VySHRtbChkYXRhKSB7XG4gICAgXG4gICAgaW5zdHJ1bWVudERhdGEgPSBkYXRhO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlclwiKS5pbm5lckhUTUwgPSAnJztcbiAgICB2YXIgc3RyID0gZ2V0SHRtbFJvd3NDZWxscyhkYXRhLmZpbGVuYW1lLmxlbmd0aCwgbWVhc3VyZUxlbmd0aCwgJ3RyJywgJ3RkJyk7XG4gICAgdmFyIHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndHJhY2tlcicpO1xuICAgIHQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdhZnRlcmJlZ2luJywgc3RyKTtcbiAgICBcbn1cblxudmFyIHNjaGVkdWxlID0gbmV3IHNjaGVkdWxlTWVhc3VyZShjdHgpO1xuZnVuY3Rpb24gc2V0dXBCYXNlRXZlbnRzICgpIHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICBzY2hlZHVsZS5ydW5TY2hlZHVsZSgpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhdXNlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7IFxuICAgIH0pO1xuICAgIFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgIHNjaGVkdWxlID0gbmV3IHNjaGVkdWxlTWVhc3VyZShjdHgpO1xuICAgIH0pO1xuICAgIFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdicG0nKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBhdWRpb09wdGlvbnMuc2V0T3B0aW9ucygpO1xuICAgICAgICBpZiAoc2NoZWR1bGUucnVubmluZykge1xuICAgICAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICAgICAgc2NoZWR1bGUucnVuU2NoZWR1bGUoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIFxuICAgICQoJy5iYXNlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgYXVkaW9PcHRpb25zLnNldE9wdGlvbnMoKTtcbiAgICB9KTtcbn1cbiAgICBcbmZ1bmN0aW9uIHNldHVwRXZlbnRzKCkge1xuICAgIFxuICAgICQoJy5jZWxsJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZGF0YXNldCk7XG4gICAgICAgIHZhbC5lbmFibGVkID0gJCh0aGlzKS5oYXNDbGFzcyhcImVuYWJsZWRcIik7XG5cbiAgICAgICAgbGV0IGN1cnJlbnRCZWF0ID0gJCgnLmN1cnJlbnQnKS5kYXRhKCdjZWxsLWlkJyk7XG4gICAgICAgIGlmICh2YWwuY2VsbElkID4gY3VycmVudEJlYXQpIHtcbiAgICAgICAgICAgIHNjaGVkdWxlLnNjaGVkdWxlQXVkaW9CZWF0Tm93KHZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMpLnRvZ2dsZUNsYXNzKCdlbmFibGVkJyk7XG4gICAgfSk7XG59XG5cbiQoJyNzYW1wbGVTZXQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0aGlzLnZhbHVlKTtcbn0pO1xuXG5mdW5jdGlvbiBnZXRDb250cm9sVmFsdWVzKCkge1xuICAgIGxldCBmb3JtVmFsdWVzID0gbmV3IGdldFNldEZvcm1WYWx1ZXMoKTtcbiAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuICAgIGxldCB2YWx1ZXMgPSBmb3JtVmFsdWVzLmdldChmb3JtKTtcbiAgICBcbiAgICBsZXQgcmV0ID0ge307XG4gICAgZm9yIChsZXQga2V5IGluIHZhbHVlcykge1xuICAgICAgICBcbiAgICAgICAgaWYgKGtleSA9PT0gJ2RlbGF5RW5hYmxlZCcpIHtcbiAgICAgICAgICAgIHJldFtrZXldID0gJ3RydWUnO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChrZXkgPT09ICdzYW1wbGVTZXQnKSB7IFxuICAgICAgICAgICAgcmV0W2tleV0gPSB2YWx1ZXNba2V5XTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldFtrZXldID0gcGFyc2VGbG9hdCh2YWx1ZXNba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIHNldExvY2FsU3RvcmFnZSh1cGRhdGUpIHtcbiAgICB2YXIgc3RvcmFnZSA9IHt9O1xuICAgIHN0b3JhZ2VbJ1NlbGVjdCddID0gJ1NlbGVjdCc7XG4gICAgXG4gICAgXG4gICAgZm9yICggdmFyIGkgPSAwLCBsZW4gPSBsb2NhbFN0b3JhZ2UubGVuZ3RoOyBpIDwgbGVuOyArK2kgKSB7XG4gICAgICAgIGxldCBpdGVtID0gbG9jYWxTdG9yYWdlLmtleShpKTtcbiAgICAgICAgc3RvcmFnZVtpdGVtXSA9IGl0ZW07XG4gICAgfVxuICAgIFxuICAgIC8vIENyZWF0ZSBzZWxlY3QgZWxlbWVudFxuICAgIHZhciBzID0gbmV3IHNlbGVjdEVsZW1lbnQoXG4gICAgICAgICdsb2FkLXN0b3JhZ2UnLCAvLyBpZCB0byBhcHBlbmQgdGhlIHNlbGVjdCBsaXN0IHRvXG4gICAgICAgICdiZWF0LWxpc3QnLCAvLyBpZCBvZiB0aGUgc2VsZWN0IGxpc3RcbiAgICAgICAgc3RvcmFnZSAvL1xuICAgICk7XG4gICAgXG4gICAgaWYgKHVwZGF0ZSkge1xuICAgICAgICBzLnVwZGF0ZSgnYmVhdC1saXN0Jywgc3RvcmFnZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcy5jcmVhdGUoKTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gc2V0dXBTdG9yYWdlKCkge1xuXG4gICAgc2V0TG9jYWxTdG9yYWdlKCk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBsZXQgZm9ybURhdGEgPSBnZXRDb250cm9sVmFsdWVzKCk7XG4gICAgICAgIGxldCBmaWxlbmFtZSA9ICQoJyNmaWxlbmFtZScpLnZhbCgpO1xuICAgICAgICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgICAgICAgICBmaWxlbmFtZSA9ICd1bnRpdGxlZCc7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYmVhdCA9IGdldFRyYWNrZXJWYWx1ZXMoKTtcbiAgICAgICAgbGV0IHNvbmcgPSB7XCJiZWF0XCI6IGJlYXQsIFwic2V0dGluZ3NcIjogZm9ybURhdGF9XG5cbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oZmlsZW5hbWUsIEpTT04uc3RyaW5naWZ5KHNvbmcpKTtcbiAgICAgICAgc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgYWxlcnQoJ1RyYWNrIHNhdmVkJyk7IH0sIDEpO1xuICAgIH0pO1xuICAgIFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiZWF0LWxpc3QnKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBsZXQgaXRlbSA9ICQoJyNiZWF0LWxpc3QnKS52YWwoKTtcbiAgICAgICAgaWYgKGl0ZW0gPT09ICdTZWxlY3QnKSB7ICAgIFxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSBpdGVtO1xuICAgICAgICBsZXQgdHJhY2sgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKGl0ZW0pKTtcbiAgICAgICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuXG4gICAgICAgIGZvcm1WYWx1ZXMuc2V0KGZvcm0sIHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgYXVkaW9PcHRpb25zLnNldE9wdGlvbnModHJhY2suc2V0dGluZ3MpO1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG5cbiAgICAgICAgaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIHRyYWNrLnNldHRpbmdzLnNhbXBsZVNldCwgdHJhY2suYmVhdCk7XG4gICBcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkZWxldGUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGxldCBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpO1xuICAgICAgICBsZXQgdG9EZWxldGUgPSBlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS50ZXh0O1xuICAgICAgICBcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odG9EZWxldGUpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZSA9ICcnO1xuICAgICAgICBzZXRMb2NhbFN0b3JhZ2UoJ3VwZGF0ZScpO1xuICAgICAgICBcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gbG9hZFRyYWNrZXJWYWx1ZXMoanNvbikge1xuICAgICQoJy5jZWxsJykucmVtb3ZlQ2xhc3MoJ2VuYWJsZWQnKTtcbiAgICBqc29uLmZvckVhY2goZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgaWYgKGVsZW0uZW5hYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLXJvdy1pZD1cIiR7ZWxlbS5yb3dJZH1cIl1bZGF0YS1jZWxsLWlkPVwiJHtlbGVtLmNlbGxJZH1cIl1gO1xuICAgICAgICAgICAgJChzZWxlY3RvcikuYWRkQ2xhc3MoXCJlbmFibGVkXCIpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldFRyYWNrZXJWYWx1ZXMoKSB7XG4gICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICQoXCIuY2VsbFwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZGF0YXNldCk7XG4gICAgICAgIHZhbC5lbmFibGVkID0gJCh0aGlzKS5oYXNDbGFzcyhcImVuYWJsZWRcIik7XG4gICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHZhbHVlcztcbn1cblxuIiwiZnVuY3Rpb24gR2FpbihjdHgpIHtcblxuICAgIHRoaXMuY3R4ID0gY3R4O1xuXG4gICAgdGhpcy5zZWNvbmRzVG9UaW1lQ29uc3RhbnQgPSBmdW5jdGlvbiAoc2VjKSB7XG4gICAgICAgIHJldHVybiAoc2VjICogMikgLyA4O1xuICAgIH07XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICAgIGluaXRHYWluOiAwLjEsIC8vIEluaXQgZ2FpbiBvbiBub3RlXG4gICAgICAgIG1heEdhaW46IDEuMCwgLy8gTWF4IGdhaW4gb24gbm90ZVxuICAgICAgICBhdHRhY2tUaW1lOiAwLjEsIC8vIEF0dGFja1RpbWUuIGdhaW4uaW5pdCB0byBnYWluLm1heCBpbiBhdHRhY2tUaW1lXG4gICAgICAgIHN1c3RhaW5UaW1lOiAxLCAvLyBTdXN0YWluIG5vdGUgaW4gdGltZVxuICAgICAgICByZWxlYXNlVGltZTogMSwgLy8gQXBwcm94aW1hdGVkIGVuZCB0aW1lLiBDYWxjdWxhdGVkIHdpdGggc2Vjb25kc1RvVGltZUNvbnN0YW50KClcbiAgICAgICAgLy8gZGlzY29ubmVjdDogZmFsc2UgLy8gU2hvdWxkIHdlIGF1dG9kaXNjb25uZWN0LiBEZWZhdWx0IGlzIHRydWVcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB9O1xuXG4gICAgdGhpcy5nYWluTm9kZTtcbiAgICAvKipcbiAgICAgKiBUaGUgZ2Fpbk5vZGVcbiAgICAgKiBAcGFyYW0ge2Zsb2F0fSBiZWdpbiBjdHggdGltZVxuICAgICAqIEByZXR1cm5zIHtHYWluLmdldEdhaW5Ob2RlLmdhaW5Ob2RlfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0R2Fpbk5vZGUgPSBmdW5jdGlvbiAoYmVnaW4pIHtcblxuICAgICAgICB0aGlzLmdhaW5Ob2RlID0gdGhpcy5jdHguY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSB0aGlzLm9wdGlvbnMuaW5pdEdhaW47XG5cbiAgICAgICAgLy8gQXR0YWNrIHRvIG1heFxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5tYXhHYWluLFxuICAgICAgICAgICAgICAgIGJlZ2luICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUsXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUpO1xuXG4gICAgICAgIC8vIFN1c3RhaW4gYW5kIGVuZCBub3RlXG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoXG4gICAgICAgICAgICAgICAgMC4wLFxuICAgICAgICAgICAgICAgIGJlZ2luICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUsXG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRzVG9UaW1lQ29uc3RhbnQodGhpcy5vcHRpb25zLnJlbGVhc2VUaW1lKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpc2Nvbm5lY3QgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3QoYmVnaW4pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5nYWluTm9kZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGlzY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSArIHRoaXMub3B0aW9ucy5zdXN0YWluVGltZSArIHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZTtcbiAgICAgICAgXG4gICAgICAgIHNldFRpbWVvdXQoICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICB9LFxuICAgICAgICB0b3RhbExlbmd0aCAqIDEwMDApO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gR2FpbjsiLCIvLyBGcm9tOiBodHRwczovL2Rldi5vcGVyYS5jb20vYXJ0aWNsZXMvZHJ1bS1zb3VuZHMtd2ViYXVkaW8vXG5mdW5jdGlvbiBJbnN0cnVtZW50KGNvbnRleHQsIGJ1ZmZlcikge1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG59XG5cbkluc3RydW1lbnQucHJvdG90eXBlLnNldHVwID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHRoaXMuc291cmNlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbn07XG5cbkluc3RydW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2U7XG59O1xuXG5JbnN0cnVtZW50LnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB0aGlzLnNldHVwKCk7XG4gICAgdGhpcy5zb3VyY2Uuc3RhcnQodGltZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluc3RydW1lbnQ7XG4iLCJmdW5jdGlvbiBnZXRIVE1MUm93c0NlbGxzKG51bVJvd3MsIG51bUNlbGxzLCBkaXYsIHNwYW4pIHtcbiAgICBcbiAgICB2YXIgc3RyID0gJyc7XG4gICAgXG4gICAgaWYgKCFkaXYpIGRpdiA9ICdzcGFuJztcbiAgICBpZiAoIXNwYW4pIHNwYW4gPSdzcGFuJztcbiAgICBcbiAgICBcbiAgICBmb3IgKHJvd0lEID0gMDsgcm93SUQgPCBudW1Sb3dzOyByb3dJRCsrKSB7XG4gICAgICAgIHN0ciArPSBgPCR7ZGl2fSBjbGFzcz1cInJvd1wiIGRhdGEtaWQ9XCIke3Jvd0lEfVwiPmA7XG4gICAgICAgIHN0ciArPSBnZXRDZWxscyhyb3dJRCwgbnVtQ2VsbHMsIHNwYW4pO1xuICAgICAgICBzdHIgKz0gYDwvJHtkaXZ9PmA7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG5cbmZ1bmN0aW9uIGdldENlbGxzKHJvd0lELCBudW1DZWxscywgc3Bhbikge1xuICAgIHZhciBzdHIgPSAnJztcbiAgICBmb3IgKGMgPSAwOyBjIDwgbnVtQ2VsbHM7IGMrKykge1xuICAgICAgICBzdHIgKz0gYDwke3NwYW59IGNsYXNzPVwiY2VsbFwiIGRhdGEtcm93LWlkPVwiJHtyb3dJRH1cIiBkYXRhLWNlbGwtaWQ9XCIke2N9XCI+PC8ke3NwYW59PmA7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0SFRNTFJvd3NDZWxscztcbiIsImZ1bmN0aW9uIGdldEVsZW1Db3VudEJ5TmFtZSAobmFtZSkge1xuICAgIHZhciBuYW1lcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKG5hbWUpO1xuICAgIHJldHVybiBuYW1lcy5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIGdldEZvcm1WYWx1ZXMoZm9ybUVsZW1lbnQpIHtcbiAgICB2YXIgZm9ybUVsZW1lbnRzID0gZm9ybUVsZW1lbnQuZWxlbWVudHM7XG4gICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGVsZW0gPSBudWxsO1xuICAgIGZvciAoaSA9IDA7IGkgPCBmb3JtRWxlbWVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgZWxlbSA9IGZvcm1FbGVtZW50c1tpXTtcbiAgICAgICAgc3dpdGNoIChlbGVtLnR5cGUpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNpbmdsZSBjaGVja2JveFxuICAgICAgICAgICAgICAgIHZhciBudW1FbGVtcyA9IGdldEVsZW1Db3VudEJ5TmFtZShlbGVtLm5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChudW1FbGVtcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZvcm1QYXJhbXNbZWxlbS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE11bHRpcGxlXG4gICAgICAgICAgICAgICAgaWYgKGVsZW0uY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWZvcm1QYXJhbXNbZWxlbS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gW2VsZW0udmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdLnB1c2goZWxlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RWYWx1ZXMgPSBnZXRTZWxlY3RWYWx1ZXMoZWxlbSk7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IHNlbGVjdFZhbHVlcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLnZhbHVlICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmb3JtUGFyYW1zO1xufVxuXG5mdW5jdGlvbiBzZXRGb3JtVmFsdWVzKGZvcm1FbGVtZW50LCB2YWx1ZXMpIHtcbiAgICB2YXIgZm9ybUVsZW1lbnRzID0gZm9ybUVsZW1lbnQuZWxlbWVudHM7XG4gICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGVsZW0gPSBudWxsO1xuICAgIGZvciAoaSA9IDA7IGkgPCBmb3JtRWxlbWVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgZWxlbSA9IGZvcm1FbGVtZW50c1tpXTtcbiAgICAgICAgXG4gICAgICAgIGlmICggIShlbGVtLm5hbWUgaW4gdmFsdWVzKSApIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGVsZW0udHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0gPT09IGVsZW0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdLmluZGV4T2YoZWxlbS52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBzZXRTZWxlY3RWYWx1ZXMoZWxlbSwgdmFsdWVzW2VsZW0ubmFtZV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0udmFsdWUgPSB2YWx1ZXNbZWxlbS5uYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldFNlbGVjdFZhbHVlcyhzZWxlY3RFbGVtLCB2YWx1ZXMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHNlbGVjdEVsZW0ub3B0aW9ucztcbiAgICB2YXIgb3B0O1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcbiAgICAgICAgaWYgKHZhbHVlcy5pbmRleE9mKG9wdC52YWx1ZSkgPiAtMSApIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgfSAgICAgICAgXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRTZWxlY3RWYWx1ZXMoc2VsZWN0KSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0ICYmIHNlbGVjdC5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IG9wdGlvbnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgICAgIG9wdCA9IG9wdGlvbnNbaV07XG5cbiAgICAgICAgaWYgKG9wdC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gob3B0LnZhbHVlIHx8IG9wdC50ZXh0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBnZXRTZXRGb3JtVmFsdWVzICgpIHtcbiAgICB0aGlzLnNldCA9IHNldEZvcm1WYWx1ZXM7XG4gICAgdGhpcy5nZXQgPSBnZXRGb3JtVmFsdWVzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNldEZvcm1WYWx1ZXM7XG4iLCJ2YXIgdGlueVNhbXBsZUxvYWRlciA9IHJlcXVpcmUoJ3Rpbnktc2FtcGxlLWxvYWRlcicpO1xudmFyIGF1ZGlvQnVmZmVySW5zdHJ1bWVudCA9IHJlcXVpcmUoJ2F1ZGlvLWJ1ZmZlci1pbnN0cnVtZW50Jyk7XG5cbmZ1bmN0aW9uIGxvYWRTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCBjYikge1xuICAgIFxuICAgIGZldGNoKGRhdGFVcmwpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgIT09IDIwMCkgeyAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTG9va3MgbGlrZSB0aGVyZSB3YXMgYSBwcm9ibGVtLiBTdGF0dXMgQ29kZTogJyArICByZXNwb25zZS5zdGF0dXMpOyAgXG4gICAgICAgICAgICByZXR1cm47ICBcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3BvbnNlLmpzb24oKS50aGVuKGZ1bmN0aW9uKGRhdGEpIHsgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgYmFzZVVybCA9IGRhdGEuc2FtcGxlcztcbiAgICAgICAgICAgIHZhciBidWZmZXJzID0ge307XG4gICAgICAgICAgICB2YXIgcHJvbWlzZXMgPSBbXTtcblxuICAgICAgICAgICAgZGF0YS5maWxlbmFtZSA9IFtdO1xuICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgZGF0YS5maWxlcy5mb3JFYWNoKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlsZW5hbWUgPSB2YWwucmVwbGFjZSgvXFwuW14vLl0rJC8sIFwiXCIpO1xuICAgICAgICAgICAgICAgIGRhdGEuZmlsZW5hbWUucHVzaChmaWxlbmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIHJlbW90ZVVybCA9IGJhc2VVcmwgKyB2YWw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbGV0IGxvYWRlclByb21pc2UgPSB0aW55U2FtcGxlTG9hZGVyKHJlbW90ZVVybCwgY3R4LCAoYnVmZmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcnNbZmlsZW5hbWVdID0gbmV3IGF1ZGlvQnVmZmVySW5zdHJ1bWVudChjdHgsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaChsb2FkZXJQcm9taXNlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbih2YWx1ZXMgPT4geyBcbiAgICAgICAgICAgICAgICBjYihkYXRhLCBidWZmZXJzKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICB9KTsgICAgXG4gICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7ICBcbiAgICAgICAgY29uc29sZS5sb2coJ0ZldGNoIEVycm9yIDotUycsIGVycik7ICBcbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBsb2FkU2FtcGxlU2V0OyIsImZ1bmN0aW9uIHNlbGVjdEVsZW1lbnQoYXBwZW5kVG9JRCwgc2VsZWN0SUQsIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG5cbiAgICB0aGlzLmFwcGVuZFRvSUQgPSBhcHBlbmRUb0lEO1xuICAgIHRoaXMuc2VsZWN0SUQgPSBzZWxlY3RJRDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuc2VsZWN0ZWQgPSBzZWxlY3RlZDtcbiAgICBcbiAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXBwZW5kVG9JRCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuYXBwZW5kVG9JRCk7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNlbGVjdFwiKTtcbiAgICAgICAgc2VsZWN0TGlzdC5pZCA9IHRoaXMuc2VsZWN0SUQ7ICAgICAgICBcbiAgICAgICAgYXBwZW5kVG9JRC5hcHBlbmRDaGlsZChzZWxlY3RMaXN0KTtcbiAgICAgICAgdGhpcy51cGRhdGUoc2VsZWN0SUQsIHRoaXMub3B0aW9ucywgdGhpcy5zZWxlY3RlZCk7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uIChlbGVtLCBvcHRpb25zLCBzZWxlY3RlZCkge1xuICAgICAgICB0aGlzLmRlbGV0ZShlbGVtKTtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpO1xuICAgICAgICAgICAgb3B0aW9uLnZhbHVlID0ga2V5O1xuICAgICAgICAgICAgb3B0aW9uLnRleHQgPSBvcHRpb25zW2tleV07XG4gICAgICAgICAgICBzZWxlY3RMaXN0LmFwcGVuZENoaWxkKG9wdGlvbik7XG5cbiAgICAgICAgICAgIGlmIChrZXkgPT09IHNlbGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRTZWxlY3RlZCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIHZhciBvcHQ7XG4gICAgICAgIGZvciAoIHZhciBpID0gMCwgbGVuID0gc2VsZWN0TGlzdC5vcHRpb25zLmxlbmd0aDsgaSA8IGxlbjsgaSsrICkge1xuICAgICAgICAgICAgb3B0ID0gc2VsZWN0TGlzdC5vcHRpb25zW2ldO1xuICAgICAgICAgICAgaWYgKCBvcHQuc2VsZWN0ZWQgPT09IHRydWUgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdC52YWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBvcHRpb24gaW4gc2VsZWN0TGlzdCl7XG4gICAgICAgICAgICBzZWxlY3RMaXN0LnJlbW92ZShvcHRpb24pO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldEFzU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuYXBwZW5kVG9JRCk7XG4gICAgICAgIHZhciBlbGVtZW50SHRtbCA9IGVsZW1lbnQub3V0ZXJIVE1MO1xuICAgICAgICByZXR1cm4gZWxlbWVudEh0bWw7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZWxlY3RFbGVtZW50OyIsImZ1bmN0aW9uIHNhbXBsZUxvYWRlciAodXJsLCBjb250ZXh0LCBjYWxsYmFjaykge1xuICAgIFxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICBcbiAgICAgICAgcmVxdWVzdC5vcGVuKCdnZXQnLCB1cmwsIHRydWUpO1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYocmVxdWVzdC5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgICAgICAgY29udGV4dC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24gKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCdzYW1wbGVMb2FkZXIgcmVxdWVzdCBzdWNjZXNzJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnc2FtcGxlTG9hZGVyIHJlcXVlc3QgZmFpbGVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzYW1wbGVMb2FkZXI7IiwidmFyIFdBQUNsb2NrID0gcmVxdWlyZSgnLi9saWIvV0FBQ2xvY2snKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdBQUNsb2NrXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHdpbmRvdy5XQUFDbG9jayA9IFdBQUNsb2NrXG4iLCJ2YXIgaXNCcm93c2VyID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuXG52YXIgQ0xPQ0tfREVGQVVMVFMgPSB7XG4gIHRvbGVyYW5jZUxhdGU6IDAuMTAsXG4gIHRvbGVyYW5jZUVhcmx5OiAwLjAwMVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBFdmVudCA9PT09PT09PT09PT09PT09PT09PSAvL1xudmFyIEV2ZW50ID0gZnVuY3Rpb24oY2xvY2ssIGRlYWRsaW5lLCBmdW5jKSB7XG4gIHRoaXMuY2xvY2sgPSBjbG9ja1xuICB0aGlzLmZ1bmMgPSBmdW5jXG4gIHRoaXMuX2NsZWFyZWQgPSBmYWxzZSAvLyBGbGFnIHVzZWQgdG8gY2xlYXIgYW4gZXZlbnQgaW5zaWRlIGNhbGxiYWNrXG5cbiAgdGhpcy50b2xlcmFuY2VMYXRlID0gY2xvY2sudG9sZXJhbmNlTGF0ZVxuICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gY2xvY2sudG9sZXJhbmNlRWFybHlcbiAgdGhpcy5fbGF0ZXN0VGltZSA9IG51bGxcbiAgdGhpcy5fZWFybGllc3RUaW1lID0gbnVsbFxuICB0aGlzLmRlYWRsaW5lID0gbnVsbFxuICB0aGlzLnJlcGVhdFRpbWUgPSBudWxsXG5cbiAgdGhpcy5zY2hlZHVsZShkZWFkbGluZSlcbn1cblxuLy8gVW5zY2hlZHVsZXMgdGhlIGV2ZW50XG5FdmVudC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgdGhpcy5fY2xlYXJlZCA9IHRydWVcbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gU2V0cyB0aGUgZXZlbnQgdG8gcmVwZWF0IGV2ZXJ5IGB0aW1lYCBzZWNvbmRzLlxuRXZlbnQucHJvdG90eXBlLnJlcGVhdCA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgaWYgKHRpbWUgPT09IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKCdkZWxheSBjYW5ub3QgYmUgMCcpXG4gIHRoaXMucmVwZWF0VGltZSA9IHRpbWVcbiAgaWYgKCF0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSlcbiAgICB0aGlzLnNjaGVkdWxlKHRoaXMuZGVhZGxpbmUgKyB0aGlzLnJlcGVhdFRpbWUpXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFNldHMgdGhlIHRpbWUgdG9sZXJhbmNlIG9mIHRoZSBldmVudC5cbi8vIFRoZSBldmVudCB3aWxsIGJlIGV4ZWN1dGVkIGluIHRoZSBpbnRlcnZhbCBgW2RlYWRsaW5lIC0gZWFybHksIGRlYWRsaW5lICsgbGF0ZV1gXG4vLyBJZiB0aGUgY2xvY2sgZmFpbHMgdG8gZXhlY3V0ZSB0aGUgZXZlbnQgaW4gdGltZSwgdGhlIGV2ZW50IHdpbGwgYmUgZHJvcHBlZC5cbkV2ZW50LnByb3RvdHlwZS50b2xlcmFuY2UgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZXMubGF0ZSA9PT0gJ251bWJlcicpXG4gICAgdGhpcy50b2xlcmFuY2VMYXRlID0gdmFsdWVzLmxhdGVcbiAgaWYgKHR5cGVvZiB2YWx1ZXMuZWFybHkgPT09ICdudW1iZXInKVxuICAgIHRoaXMudG9sZXJhbmNlRWFybHkgPSB2YWx1ZXMuZWFybHlcbiAgdGhpcy5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzKClcbiAgaWYgKHRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKSB7XG4gICAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgICB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgZXZlbnQgaXMgcmVwZWF0ZWQsIGZhbHNlIG90aGVyd2lzZVxuRXZlbnQucHJvdG90eXBlLmlzUmVwZWF0ZWQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucmVwZWF0VGltZSAhPT0gbnVsbCB9XG5cbi8vIFNjaGVkdWxlcyB0aGUgZXZlbnQgdG8gYmUgcmFuIGJlZm9yZSBgZGVhZGxpbmVgLlxuLy8gSWYgdGhlIHRpbWUgaXMgd2l0aGluIHRoZSBldmVudCB0b2xlcmFuY2UsIHdlIGhhbmRsZSB0aGUgZXZlbnQgaW1tZWRpYXRlbHkuXG4vLyBJZiB0aGUgZXZlbnQgd2FzIGFscmVhZHkgc2NoZWR1bGVkIGF0IGEgZGlmZmVyZW50IHRpbWUsIGl0IGlzIHJlc2NoZWR1bGVkLlxuRXZlbnQucHJvdG90eXBlLnNjaGVkdWxlID0gZnVuY3Rpb24oZGVhZGxpbmUpIHtcbiAgdGhpcy5fY2xlYXJlZCA9IGZhbHNlXG4gIHRoaXMuZGVhZGxpbmUgPSBkZWFkbGluZVxuICB0aGlzLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMoKVxuXG4gIGlmICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPj0gdGhpcy5fZWFybGllc3RUaW1lKSB7XG4gICAgdGhpcy5fZXhlY3V0ZSgpXG4gIFxuICB9IGVsc2UgaWYgKHRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKSB7XG4gICAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgICB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxuICBcbiAgfSBlbHNlIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG59XG5cbkV2ZW50LnByb3RvdHlwZS50aW1lU3RyZXRjaCA9IGZ1bmN0aW9uKHRSZWYsIHJhdGlvKSB7XG4gIGlmICh0aGlzLmlzUmVwZWF0ZWQoKSlcbiAgICB0aGlzLnJlcGVhdFRpbWUgPSB0aGlzLnJlcGVhdFRpbWUgKiByYXRpb1xuXG4gIHZhciBkZWFkbGluZSA9IHRSZWYgKyByYXRpbyAqICh0aGlzLmRlYWRsaW5lIC0gdFJlZilcbiAgLy8gSWYgdGhlIGRlYWRsaW5lIGlzIHRvbyBjbG9zZSBvciBwYXN0LCBhbmQgdGhlIGV2ZW50IGhhcyBhIHJlcGVhdCxcbiAgLy8gd2UgY2FsY3VsYXRlIHRoZSBuZXh0IHJlcGVhdCBwb3NzaWJsZSBpbiB0aGUgc3RyZXRjaGVkIHNwYWNlLlxuICBpZiAodGhpcy5pc1JlcGVhdGVkKCkpIHtcbiAgICB3aGlsZSAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lID49IGRlYWRsaW5lIC0gdGhpcy50b2xlcmFuY2VFYXJseSlcbiAgICAgIGRlYWRsaW5lICs9IHRoaXMucmVwZWF0VGltZVxuICB9XG4gIHRoaXMuc2NoZWR1bGUoZGVhZGxpbmUpXG59XG5cbi8vIEV4ZWN1dGVzIHRoZSBldmVudFxuRXZlbnQucHJvdG90eXBlLl9leGVjdXRlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmNsb2NrLl9zdGFydGVkID09PSBmYWxzZSkgcmV0dXJuXG4gIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG5cbiAgaWYgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA8IHRoaXMuX2xhdGVzdFRpbWUpXG4gICAgdGhpcy5mdW5jKHRoaXMpXG4gIGVsc2Uge1xuICAgIGlmICh0aGlzLm9uZXhwaXJlZCkgdGhpcy5vbmV4cGlyZWQodGhpcylcbiAgICBjb25zb2xlLndhcm4oJ2V2ZW50IGV4cGlyZWQnKVxuICB9XG4gIC8vIEluIHRoZSBjYXNlIGBzY2hlZHVsZWAgaXMgY2FsbGVkIGluc2lkZSBgZnVuY2AsIHdlIG5lZWQgdG8gYXZvaWRcbiAgLy8gb3ZlcnJ3cml0aW5nIHdpdGggeWV0IGFub3RoZXIgYHNjaGVkdWxlYC5cbiAgaWYgKCF0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSAmJiB0aGlzLmlzUmVwZWF0ZWQoKSAmJiAhdGhpcy5fY2xlYXJlZClcbiAgICB0aGlzLnNjaGVkdWxlKHRoaXMuZGVhZGxpbmUgKyB0aGlzLnJlcGVhdFRpbWUpIFxufVxuXG4vLyBVcGRhdGVzIGNhY2hlZCB0aW1lc1xuRXZlbnQucHJvdG90eXBlLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fbGF0ZXN0VGltZSA9IHRoaXMuZGVhZGxpbmUgKyB0aGlzLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy5fZWFybGllc3RUaW1lID0gdGhpcy5kZWFkbGluZSAtIHRoaXMudG9sZXJhbmNlRWFybHlcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT0gV0FBQ2xvY2sgPT09PT09PT09PT09PT09PT09PT0gLy9cbnZhciBXQUFDbG9jayA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGV4dCwgb3B0cykge1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgb3B0cyA9IG9wdHMgfHwge31cbiAgdGhpcy50aWNrTWV0aG9kID0gb3B0cy50aWNrTWV0aG9kIHx8ICdTY3JpcHRQcm9jZXNzb3JOb2RlJ1xuICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gb3B0cy50b2xlcmFuY2VFYXJseSB8fCBDTE9DS19ERUZBVUxUUy50b2xlcmFuY2VFYXJseVxuICB0aGlzLnRvbGVyYW5jZUxhdGUgPSBvcHRzLnRvbGVyYW5jZUxhdGUgfHwgQ0xPQ0tfREVGQVVMVFMudG9sZXJhbmNlTGF0ZVxuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0XG4gIHRoaXMuX2V2ZW50cyA9IFtdXG4gIHRoaXMuX3N0YXJ0ZWQgPSBmYWxzZVxufVxuXG4vLyAtLS0tLS0tLS0tIFB1YmxpYyBBUEkgLS0tLS0tLS0tLSAvL1xuLy8gU2NoZWR1bGVzIGBmdW5jYCB0byBydW4gYWZ0ZXIgYGRlbGF5YCBzZWNvbmRzLlxuV0FBQ2xvY2sucHJvdG90eXBlLnNldFRpbWVvdXQgPSBmdW5jdGlvbihmdW5jLCBkZWxheSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRXZlbnQoZnVuYywgdGhpcy5fYWJzVGltZShkZWxheSkpXG59XG5cbi8vIFNjaGVkdWxlcyBgZnVuY2AgdG8gcnVuIGJlZm9yZSBgZGVhZGxpbmVgLlxuV0FBQ2xvY2sucHJvdG90eXBlLmNhbGxiYWNrQXRUaW1lID0gZnVuY3Rpb24oZnVuYywgZGVhZGxpbmUpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUV2ZW50KGZ1bmMsIGRlYWRsaW5lKVxufVxuXG4vLyBTdHJldGNoZXMgYGRlYWRsaW5lYCBhbmQgYHJlcGVhdGAgb2YgYWxsIHNjaGVkdWxlZCBgZXZlbnRzYCBieSBgcmF0aW9gLCBrZWVwaW5nXG4vLyB0aGVpciByZWxhdGl2ZSBkaXN0YW5jZSB0byBgdFJlZmAuIEluIGZhY3QgdGhpcyBpcyBlcXVpdmFsZW50IHRvIGNoYW5naW5nIHRoZSB0ZW1wby5cbldBQUNsb2NrLnByb3RvdHlwZS50aW1lU3RyZXRjaCA9IGZ1bmN0aW9uKHRSZWYsIGV2ZW50cywgcmF0aW8pIHtcbiAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHsgZXZlbnQudGltZVN0cmV0Y2godFJlZiwgcmF0aW8pIH0pXG4gIHJldHVybiBldmVudHNcbn1cblxuLy8gUmVtb3ZlcyBhbGwgc2NoZWR1bGVkIGV2ZW50cyBhbmQgc3RhcnRzIHRoZSBjbG9jayBcbldBQUNsb2NrLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fc3RhcnRlZCA9PT0gZmFsc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB0aGlzLl9zdGFydGVkID0gdHJ1ZVxuICAgIHRoaXMuX2V2ZW50cyA9IFtdXG5cbiAgICBpZiAodGhpcy50aWNrTWV0aG9kID09PSAnU2NyaXB0UHJvY2Vzc29yTm9kZScpIHtcbiAgICAgIHZhciBidWZmZXJTaXplID0gMjU2XG4gICAgICAvLyBXZSBoYXZlIHRvIGtlZXAgYSByZWZlcmVuY2UgdG8gdGhlIG5vZGUgdG8gYXZvaWQgZ2FyYmFnZSBjb2xsZWN0aW9uXG4gICAgICB0aGlzLl9jbG9ja05vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIDEsIDEpXG4gICAgICB0aGlzLl9jbG9ja05vZGUuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pXG4gICAgICB0aGlzLl9jbG9ja05vZGUub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7IHNlbGYuX3RpY2soKSB9KVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy50aWNrTWV0aG9kID09PSAnbWFudWFsJykgbnVsbCAvLyBfdGljayBpcyBjYWxsZWQgbWFudWFsbHlcblxuICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIHRpY2tNZXRob2QgJyArIHRoaXMudGlja01ldGhvZClcbiAgfVxufVxuXG4vLyBTdG9wcyB0aGUgY2xvY2tcbldBQUNsb2NrLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9zdGFydGVkID09PSB0cnVlKSB7XG4gICAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlXG4gICAgdGhpcy5fY2xvY2tOb2RlLmRpc2Nvbm5lY3QoKVxuICB9ICBcbn1cblxuLy8gLS0tLS0tLS0tLSBQcml2YXRlIC0tLS0tLS0tLS0gLy9cblxuLy8gVGhpcyBmdW5jdGlvbiBpcyByYW4gcGVyaW9kaWNhbGx5LCBhbmQgYXQgZWFjaCB0aWNrIGl0IGV4ZWN1dGVzXG4vLyBldmVudHMgZm9yIHdoaWNoIGBjdXJyZW50VGltZWAgaXMgaW5jbHVkZWQgaW4gdGhlaXIgdG9sZXJhbmNlIGludGVydmFsLlxuV0FBQ2xvY2sucHJvdG90eXBlLl90aWNrID0gZnVuY3Rpb24oKSB7XG4gIHZhciBldmVudCA9IHRoaXMuX2V2ZW50cy5zaGlmdCgpXG5cbiAgd2hpbGUoZXZlbnQgJiYgZXZlbnQuX2VhcmxpZXN0VGltZSA8PSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUpIHtcbiAgICBldmVudC5fZXhlY3V0ZSgpXG4gICAgZXZlbnQgPSB0aGlzLl9ldmVudHMuc2hpZnQoKVxuICB9XG5cbiAgLy8gUHV0IGJhY2sgdGhlIGxhc3QgZXZlbnRcbiAgaWYoZXZlbnQpIHRoaXMuX2V2ZW50cy51bnNoaWZ0KGV2ZW50KVxufVxuXG4vLyBDcmVhdGVzIGFuIGV2ZW50IGFuZCBpbnNlcnQgaXQgdG8gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5fY3JlYXRlRXZlbnQgPSBmdW5jdGlvbihmdW5jLCBkZWFkbGluZSkge1xuICByZXR1cm4gbmV3IEV2ZW50KHRoaXMsIGRlYWRsaW5lLCBmdW5jKVxufVxuXG4vLyBJbnNlcnRzIGFuIGV2ZW50IHRvIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX2luc2VydEV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdGhpcy5fZXZlbnRzLnNwbGljZSh0aGlzLl9pbmRleEJ5VGltZShldmVudC5fZWFybGllc3RUaW1lKSwgMCwgZXZlbnQpXG59XG5cbi8vIFJlbW92ZXMgYW4gZXZlbnQgZnJvbSB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9yZW1vdmVFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBpbmQgPSB0aGlzLl9ldmVudHMuaW5kZXhPZihldmVudClcbiAgaWYgKGluZCAhPT0gLTEpIHRoaXMuX2V2ZW50cy5zcGxpY2UoaW5kLCAxKVxufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgYGV2ZW50YCBpcyBpbiBxdWV1ZSwgZmFsc2Ugb3RoZXJ3aXNlXG5XQUFDbG9jay5wcm90b3R5cGUuX2hhc0V2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiByZXR1cm4gdGhpcy5fZXZlbnRzLmluZGV4T2YoZXZlbnQpICE9PSAtMVxufVxuXG4vLyBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgZmlyc3QgZXZlbnQgd2hvc2UgZGVhZGxpbmUgaXMgPj0gdG8gYGRlYWRsaW5lYFxuV0FBQ2xvY2sucHJvdG90eXBlLl9pbmRleEJ5VGltZSA9IGZ1bmN0aW9uKGRlYWRsaW5lKSB7XG4gIC8vIHBlcmZvcm1zIGEgYmluYXJ5IHNlYXJjaFxuICB2YXIgbG93ID0gMFxuICAgICwgaGlnaCA9IHRoaXMuX2V2ZW50cy5sZW5ndGhcbiAgICAsIG1pZFxuICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgIG1pZCA9IE1hdGguZmxvb3IoKGxvdyArIGhpZ2gpIC8gMilcbiAgICBpZiAodGhpcy5fZXZlbnRzW21pZF0uX2VhcmxpZXN0VGltZSA8IGRlYWRsaW5lKVxuICAgICAgbG93ID0gbWlkICsgMVxuICAgIGVsc2UgaGlnaCA9IG1pZFxuICB9XG4gIHJldHVybiBsb3dcbn1cblxuLy8gQ29udmVydHMgZnJvbSByZWxhdGl2ZSB0aW1lIHRvIGFic29sdXRlIHRpbWVcbldBQUNsb2NrLnByb3RvdHlwZS5fYWJzVGltZSA9IGZ1bmN0aW9uKHJlbFRpbWUpIHtcbiAgcmV0dXJuIHJlbFRpbWUgKyB0aGlzLmNvbnRleHQuY3VycmVudFRpbWVcbn1cblxuLy8gQ29udmVydHMgZnJvbSBhYnNvbHV0ZSB0aW1lIHRvIHJlbGF0aXZlIHRpbWUgXG5XQUFDbG9jay5wcm90b3R5cGUuX3JlbFRpbWUgPSBmdW5jdGlvbihhYnNUaW1lKSB7XG4gIHJldHVybiBhYnNUaW1lIC0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lXG59IiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiJdfQ==
