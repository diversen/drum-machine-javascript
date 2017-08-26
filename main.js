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
        let values = [];
        let selector = `[data-cell-id="${cellId}"]`;

        let elems = document.querySelectorAll(selector);
        elems.forEach((el) => {
            let val = Object.assign({}, el.dataset);
            val.enabled = el.classList.contains('enabled');
            values.push(val);
        });
        return values;
    };

    this.schedule = function () {

        let beats = this.getTrackerRowValues(this.current);
        let now = ctx.currentTime;

        let selector = `[data-cell-id="${this.current}"]`;

        let event = this.clock.callbackAtTime(() => {
            $(selector).addClass('current');
        }, now + this.scheduleForward);

        this.clock.callbackAtTime(() => {
            $(selector).removeClass('current');
        }, now + this.scheduleForward + this.milliPerBeat(this.bpm) / 1000);

        beats.forEach((beat) => {
            this.scheduleBeat(beat, now);
        });
    };

    this.scheduleBeat = function (beat, now) {

        let triggerTime = now + this.scheduleForward;
        this.scheduleMap[beat.cellId] = triggerTime;
        if (beat.enabled) {
            this.eventMap[getEventKey(beat)] = this.clock.callbackAtTime(() => {
                scheduleAudioBeat(beat, triggerTime);
            }, now);
        }
    };

    this.scheduleMap = {};

    this.scheduleAudioBeatNow = function (beat) {

        if (beat.enabled) {
            let beatEvent = this.eventMap[getEventKey(beat)];
            if (beatEvent) {
                beatEvent.clear();
                delete this.eventMap[getEventKey(beat)];
            }
            return;
        }

        let triggerTime = this.scheduleMap[0] + beat.cellId * this.milliPerBeat(this.bpm) / 1000;
        let now = ctx.currentTime;
        this.eventMap[getEventKey(beat)] = this.clock.callbackAtTime(() => {
            scheduleAudioBeat(beat, triggerTime);
        }, now);
    };

    this.interval;
    this.runSchedule = function () {
        this.running = true;
        this.bpm = audioOptions.options.bpm;
        let interval = this.milliPerBeat(this.bpm);

        setTimeout(() => {
            this.schedule();
            this.next();
        }, 0);

        this.interval = setInterval(() => {
            this.schedule();
            this.next();

        }, interval);
    };

    this.stop = function () {
        this.running = false;
        clearInterval(this.interval);
    };
}

function getEventKey(beat) {
    return beat.rowId + beat.cellId;
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
        
        //let reverb = getReverb();
        //gainNode.connect(reverb);
        //reverb.connect(ctx.destination);
        
        gainNode.connect(ctx.destination);

        instrument.start(triggerTime);
    }

    if (audioOptions.options.delayEnabled) {
        connectDelay(instrument)
    } else {
        connectClean(instrument);
    }
    
    function getReverb () {
                
        let reverb = soundbankReverb(ctx)
        // reverb.connect(ctx.destination)

        reverb.time = 1 //seconds
        reverb.wet.value = 0.8
        reverb.dry.value = 1

        reverb.filterType = 'lowpass'
        reverb.cutoff.value = 4000 //Hz
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
        loadTrackerValues(track)
        setupEvents();
    });
}

window.onload = function () {
    var defaultBeat = [{"rowId": "0", "cellId": "0", "enabled": false}, {"rowId": "0", "cellId": "1", "enabled": false}, {"rowId": "0", "cellId": "2", "enabled": false}, {"rowId": "0", "cellId": "3", "enabled": false}, {"rowId": "0", "cellId": "4", "enabled": false}, {"rowId": "0", "cellId": "5", "enabled": false}, {"rowId": "0", "cellId": "6", "enabled": false}, {"rowId": "0", "cellId": "7", "enabled": false}, {"rowId": "0", "cellId": "8", "enabled": false}, {"rowId": "0", "cellId": "9", "enabled": false}, {"rowId": "0", "cellId": "10", "enabled": false}, {"rowId": "0", "cellId": "11", "enabled": false}, {"rowId": "0", "cellId": "12", "enabled": false}, {"rowId": "0", "cellId": "13", "enabled": false}, {"rowId": "0", "cellId": "14", "enabled": false}, {"rowId": "0", "cellId": "15", "enabled": false}, {"rowId": "1", "cellId": "0", "enabled": false}, {"rowId": "1", "cellId": "1", "enabled": false}, {"rowId": "1", "cellId": "2", "enabled": false}, {"rowId": "1", "cellId": "3", "enabled": false}, {"rowId": "1", "cellId": "4", "enabled": false}, {"rowId": "1", "cellId": "5", "enabled": false}, {"rowId": "1", "cellId": "6", "enabled": false}, {"rowId": "1", "cellId": "7", "enabled": false}, {"rowId": "1", "cellId": "8", "enabled": false}, {"rowId": "1", "cellId": "9", "enabled": false}, {"rowId": "1", "cellId": "10", "enabled": false}, {"rowId": "1", "cellId": "11", "enabled": false}, {"rowId": "1", "cellId": "12", "enabled": false}, {"rowId": "1", "cellId": "13", "enabled": false}, {"rowId": "1", "cellId": "14", "enabled": false}, {"rowId": "1", "cellId": "15", "enabled": false}, {"rowId": "2", "cellId": "0", "enabled": false}, {"rowId": "2", "cellId": "1", "enabled": false}, {"rowId": "2", "cellId": "2", "enabled": false}, {"rowId": "2", "cellId": "3", "enabled": false}, {"rowId": "2", "cellId": "4", "enabled": false}, {"rowId": "2", "cellId": "5", "enabled": false}, {"rowId": "2", "cellId": "6", "enabled": false}, {"rowId": "2", "cellId": "7", "enabled": false}, {"rowId": "2", "cellId": "8", "enabled": false}, {"rowId": "2", "cellId": "9", "enabled": false}, {"rowId": "2", "cellId": "10", "enabled": false}, {"rowId": "2", "cellId": "11", "enabled": false}, {"rowId": "2", "cellId": "12", "enabled": false}, {"rowId": "2", "cellId": "13", "enabled": false}, {"rowId": "2", "cellId": "14", "enabled": false}, {"rowId": "2", "cellId": "15", "enabled": false}, {"rowId": "3", "cellId": "0", "enabled": false}, {"rowId": "3", "cellId": "1", "enabled": false}, {"rowId": "3", "cellId": "2", "enabled": false}, {"rowId": "3", "cellId": "3", "enabled": false}, {"rowId": "3", "cellId": "4", "enabled": false}, {"rowId": "3", "cellId": "5", "enabled": false}, {"rowId": "3", "cellId": "6", "enabled": false}, {"rowId": "3", "cellId": "7", "enabled": false}, {"rowId": "3", "cellId": "8", "enabled": false}, {"rowId": "3", "cellId": "9", "enabled": false}, {"rowId": "3", "cellId": "10", "enabled": false}, {"rowId": "3", "cellId": "11", "enabled": false}, {"rowId": "3", "cellId": "12", "enabled": false}, {"rowId": "3", "cellId": "13", "enabled": false}, {"rowId": "3", "cellId": "14", "enabled": false}, {"rowId": "3", "cellId": "15", "enabled": false}, {"rowId": "4", "cellId": "0", "enabled": true}, {"rowId": "4", "cellId": "1", "enabled": false}, {"rowId": "4", "cellId": "2", "enabled": false}, {"rowId": "4", "cellId": "3", "enabled": true}, {"rowId": "4", "cellId": "4", "enabled": false}, {"rowId": "4", "cellId": "5", "enabled": false}, {"rowId": "4", "cellId": "6", "enabled": false}, {"rowId": "4", "cellId": "7", "enabled": true}, {"rowId": "4", "cellId": "8", "enabled": false}, {"rowId": "4", "cellId": "9", "enabled": false}, {"rowId": "4", "cellId": "10", "enabled": false}, {"rowId": "4", "cellId": "11", "enabled": false}, {"rowId": "4", "cellId": "12", "enabled": false}, {"rowId": "4", "cellId": "13", "enabled": true}, {"rowId": "4", "cellId": "14", "enabled": false}, {"rowId": "4", "cellId": "15", "enabled": false}, {"rowId": "5", "cellId": "0", "enabled": false}, {"rowId": "5", "cellId": "1", "enabled": false}, {"rowId": "5", "cellId": "2", "enabled": false}, {"rowId": "5", "cellId": "3", "enabled": false}, {"rowId": "5", "cellId": "4", "enabled": false}, {"rowId": "5", "cellId": "5", "enabled": false}, {"rowId": "5", "cellId": "6", "enabled": false}, {"rowId": "5", "cellId": "7", "enabled": false}, {"rowId": "5", "cellId": "8", "enabled": false}, {"rowId": "5", "cellId": "9", "enabled": false}, {"rowId": "5", "cellId": "10", "enabled": false}, {"rowId": "5", "cellId": "11", "enabled": false}, {"rowId": "5", "cellId": "12", "enabled": false}, {"rowId": "5", "cellId": "13", "enabled": false}, {"rowId": "5", "cellId": "14", "enabled": false}, {"rowId": "5", "cellId": "15", "enabled": false}, {"rowId": "6", "cellId": "0", "enabled": false}, {"rowId": "6", "cellId": "1", "enabled": true}, {"rowId": "6", "cellId": "2", "enabled": false}, {"rowId": "6", "cellId": "3", "enabled": false}, {"rowId": "6", "cellId": "4", "enabled": true}, {"rowId": "6", "cellId": "5", "enabled": false}, {"rowId": "6", "cellId": "6", "enabled": false}, {"rowId": "6", "cellId": "7", "enabled": false}, {"rowId": "6", "cellId": "8", "enabled": false}, {"rowId": "6", "cellId": "9", "enabled": true}, {"rowId": "6", "cellId": "10", "enabled": false}, {"rowId": "6", "cellId": "11", "enabled": false}, {"rowId": "6", "cellId": "12", "enabled": false}, {"rowId": "6", "cellId": "13", "enabled": false}, {"rowId": "6", "cellId": "14", "enabled": false}, {"rowId": "6", "cellId": "15", "enabled": false}, {"rowId": "7", "cellId": "0", "enabled": false}, {"rowId": "7", "cellId": "1", "enabled": false}, {"rowId": "7", "cellId": "2", "enabled": false}, {"rowId": "7", "cellId": "3", "enabled": false}, {"rowId": "7", "cellId": "4", "enabled": false}, {"rowId": "7", "cellId": "5", "enabled": true}, {"rowId": "7", "cellId": "6", "enabled": false}, {"rowId": "7", "cellId": "7", "enabled": false}, {"rowId": "7", "cellId": "8", "enabled": false}, {"rowId": "7", "cellId": "9", "enabled": false}, {"rowId": "7", "cellId": "10", "enabled": false}, {"rowId": "7", "cellId": "11", "enabled": true}, {"rowId": "7", "cellId": "12", "enabled": false}, {"rowId": "7", "cellId": "13", "enabled": false}, {"rowId": "7", "cellId": "14", "enabled": false}, {"rowId": "7", "cellId": "15", "enabled": true}, {"rowId": "8", "cellId": "0", "enabled": false}, {"rowId": "8", "cellId": "1", "enabled": false}, {"rowId": "8", "cellId": "2", "enabled": false}, {"rowId": "8", "cellId": "3", "enabled": false}, {"rowId": "8", "cellId": "4", "enabled": false}, {"rowId": "8", "cellId": "5", "enabled": false}, {"rowId": "8", "cellId": "6", "enabled": false}, {"rowId": "8", "cellId": "7", "enabled": false}, {"rowId": "8", "cellId": "8", "enabled": false}, {"rowId": "8", "cellId": "9", "enabled": false}, {"rowId": "8", "cellId": "10", "enabled": false}, {"rowId": "8", "cellId": "11", "enabled": false}, {"rowId": "8", "cellId": "12", "enabled": false}, {"rowId": "8", "cellId": "13", "enabled": false}, {"rowId": "8", "cellId": "14", "enabled": false}, {"rowId": "8", "cellId": "15", "enabled": false}, {"rowId": "9", "cellId": "0", "enabled": true}, {"rowId": "9", "cellId": "1", "enabled": false}, {"rowId": "9", "cellId": "2", "enabled": false}, {"rowId": "9", "cellId": "3", "enabled": false}, {"rowId": "9", "cellId": "4", "enabled": false}, {"rowId": "9", "cellId": "5", "enabled": false}, {"rowId": "9", "cellId": "6", "enabled": false}, {"rowId": "9", "cellId": "7", "enabled": false}, {"rowId": "9", "cellId": "8", "enabled": false}, {"rowId": "9", "cellId": "9", "enabled": true}, {"rowId": "9", "cellId": "10", "enabled": false}, {"rowId": "9", "cellId": "11", "enabled": false}, {"rowId": "9", "cellId": "12", "enabled": false}, {"rowId": "9", "cellId": "13", "enabled": false}, {"rowId": "9", "cellId": "14", "enabled": false}, {"rowId": "9", "cellId": "15", "enabled": false}, {"rowId": "10", "cellId": "0", "enabled": false}, {"rowId": "10", "cellId": "1", "enabled": true}, {"rowId": "10", "cellId": "2", "enabled": false}, {"rowId": "10", "cellId": "3", "enabled": false}, {"rowId": "10", "cellId": "4", "enabled": false}, {"rowId": "10", "cellId": "5", "enabled": false}, {"rowId": "10", "cellId": "6", "enabled": false}, {"rowId": "10", "cellId": "7", "enabled": false}, {"rowId": "10", "cellId": "8", "enabled": false}, {"rowId": "10", "cellId": "9", "enabled": false}, {"rowId": "10", "cellId": "10", "enabled": false}, {"rowId": "10", "cellId": "11", "enabled": false}, {"rowId": "10", "cellId": "12", "enabled": false}, {"rowId": "10", "cellId": "13", "enabled": true}, {"rowId": "10", "cellId": "14", "enabled": false}, {"rowId": "10", "cellId": "15", "enabled": false}, {"rowId": "11", "cellId": "0", "enabled": false}, {"rowId": "11", "cellId": "1", "enabled": false}, {"rowId": "11", "cellId": "2", "enabled": false}, {"rowId": "11", "cellId": "3", "enabled": false}, {"rowId": "11", "cellId": "4", "enabled": false}, {"rowId": "11", "cellId": "5", "enabled": false}, {"rowId": "11", "cellId": "6", "enabled": false}, {"rowId": "11", "cellId": "7", "enabled": true}, {"rowId": "11", "cellId": "8", "enabled": false}, {"rowId": "11", "cellId": "9", "enabled": false}, {"rowId": "11", "cellId": "10", "enabled": false}, {"rowId": "11", "cellId": "11", "enabled": false}, {"rowId": "11", "cellId": "12", "enabled": false}, {"rowId": "11", "cellId": "13", "enabled": false}, {"rowId": "11", "cellId": "14", "enabled": false}, {"rowId": "11", "cellId": "15", "enabled": false}, {"rowId": "12", "cellId": "0", "enabled": false}, {"rowId": "12", "cellId": "1", "enabled": false}, {"rowId": "12", "cellId": "2", "enabled": false}, {"rowId": "12", "cellId": "3", "enabled": false}, {"rowId": "12", "cellId": "4", "enabled": false}, {"rowId": "12", "cellId": "5", "enabled": false}, {"rowId": "12", "cellId": "6", "enabled": false}, {"rowId": "12", "cellId": "7", "enabled": false}, {"rowId": "12", "cellId": "8", "enabled": false}, {"rowId": "12", "cellId": "9", "enabled": false}, {"rowId": "12", "cellId": "10", "enabled": false}, {"rowId": "12", "cellId": "11", "enabled": true}, {"rowId": "12", "cellId": "12", "enabled": false}, {"rowId": "12", "cellId": "13", "enabled": false}, {"rowId": "12", "cellId": "14", "enabled": false}, {"rowId": "12", "cellId": "15", "enabled": false}, {"rowId": "13", "cellId": "0", "enabled": false}, {"rowId": "13", "cellId": "1", "enabled": false}, {"rowId": "13", "cellId": "2", "enabled": false}, {"rowId": "13", "cellId": "3", "enabled": false}, {"rowId": "13", "cellId": "4", "enabled": false}, {"rowId": "13", "cellId": "5", "enabled": false}, {"rowId": "13", "cellId": "6", "enabled": false}, {"rowId": "13", "cellId": "7", "enabled": false}, {"rowId": "13", "cellId": "8", "enabled": false}, {"rowId": "13", "cellId": "9", "enabled": false}, {"rowId": "13", "cellId": "10", "enabled": false}, {"rowId": "13", "cellId": "11", "enabled": false}, {"rowId": "13", "cellId": "12", "enabled": false}, {"rowId": "13", "cellId": "13", "enabled": false}, {"rowId": "13", "cellId": "14", "enabled": false}, {"rowId": "13", "cellId": "15", "enabled": false}, {"rowId": "14", "cellId": "0", "enabled": false}, {"rowId": "14", "cellId": "1", "enabled": false}, {"rowId": "14", "cellId": "2", "enabled": false}, {"rowId": "14", "cellId": "3", "enabled": false}, {"rowId": "14", "cellId": "4", "enabled": false}, {"rowId": "14", "cellId": "5", "enabled": true}, {"rowId": "14", "cellId": "6", "enabled": false}, {"rowId": "14", "cellId": "7", "enabled": false}, {"rowId": "14", "cellId": "8", "enabled": false}, {"rowId": "14", "cellId": "9", "enabled": false}, {"rowId": "14", "cellId": "10", "enabled": false}, {"rowId": "14", "cellId": "11", "enabled": false}, {"rowId": "14", "cellId": "12", "enabled": false}, {"rowId": "14", "cellId": "13", "enabled": false}, {"rowId": "14", "cellId": "14", "enabled": false}, {"rowId": "14", "cellId": "15", "enabled": false}, {"rowId": "15", "cellId": "0", "enabled": false}, {"rowId": "15", "cellId": "1", "enabled": false}, {"rowId": "15", "cellId": "2", "enabled": false}, {"rowId": "15", "cellId": "3", "enabled": false}, {"rowId": "15", "cellId": "4", "enabled": false}, {"rowId": "15", "cellId": "5", "enabled": false}, {"rowId": "15", "cellId": "6", "enabled": false}, {"rowId": "15", "cellId": "7", "enabled": false}, {"rowId": "15", "cellId": "8", "enabled": false}, {"rowId": "15", "cellId": "9", "enabled": false}, {"rowId": "15", "cellId": "10", "enabled": false}, {"rowId": "15", "cellId": "11", "enabled": false}, {"rowId": "15", "cellId": "12", "enabled": false}, {"rowId": "15", "cellId": "13", "enabled": false}, {"rowId": "15", "cellId": "14", "enabled": false}, {"rowId": "15", "cellId": "15", "enabled": false}]
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
function setupBaseEvents () {
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
