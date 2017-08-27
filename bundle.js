(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
        
        setTimeout( ()=>  {
            this.gainNode.disconnect();
        },
        totalLength * 1000);
    };
}

module.exports = Gain;
},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
function getHTMLRowsCells(numRows, numCells, div, span) {
    
    var str = '';
    
    if (!div) div = 'span';
    if (!span) span ='span';
    
    
    for (let rowID = 0; rowID < numRows; rowID++) {
        str += `<${div} class="row" data-id="${rowID}">`;
        str += getCells(rowID, numCells, span);
        str += `</${div}>`;
    }
    return str;
}

function getCells(rowID, numCells, span) {
    var str = '';
    for (let c = 0; c < numCells; c++) {
        str += `<${span} class="cell" data-row-id="${rowID}" data-cell-id="${c}"></${span}>`;
    }
    return str;
}




module.exports = getHTMLRowsCells;

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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
},{"audio-buffer-instrument":2,"tiny-sample-loader":7}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
var WAAClock = require('./lib/WAAClock')

module.exports = WAAClock
if (typeof window !== 'undefined') window.WAAClock = WAAClock

},{"./lib/WAAClock":9}],9:[function(require,module,exports){
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

},{"_process":14}],10:[function(require,module,exports){
const getControlValues = require('./get-tracker-controls');


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

module.exports = getAudioOptions;

},{"./get-tracker-controls":11}],11:[function(require,module,exports){
const getSetFormValues = require('get-set-form-values');

/**
 * Get all tracker values from HTML
 * @returns {object}
 */
function getTrackerControls() {
    let formValues = new getSetFormValues();
    let form = document.getElementById("trackerControls");
    let values = formValues.get(form);
    
    let ret = {};
    for (let key in values) {
        
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

module.exports = getTrackerControls;

},{"get-set-form-values":4}],12:[function(require,module,exports){
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
 
},{"./get-set-controls":10,"./get-tracker-controls":11,"./schedule-measure":13,"adsr-gain-node":1,"get-html-rows-cells":3,"get-set-form-values":4,"load-sample-set":5,"select-element":6}],13:[function(require,module,exports){
const WAAClock = require('waaclock');
const getAudioOptions = require('./get-set-controls');
const audioOptions = new getAudioOptions();

var measureLength = 16;

function scheduleMeasure(ctx, scheduleAudioBeat) {
    
    this.scheduleAudioBeat = scheduleAudioBeat;
    this.scheduleForward = 0.1;
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
            this.eventMap[this.getEventKey(beat)] = this.clock.callbackAtTime(() => {
                this.scheduleAudioBeat(beat, triggerTime);
            }, now);
        }
    };

    this.scheduleMap = {};

    this.scheduleAudioBeatNow = function (beat) {

        if (beat.enabled) {
            let beatEvent = this.eventMap[this.getEventKey(beat)];
            if (beatEvent) {
                beatEvent.clear();
                delete this.eventMap[this.getEventKey(beat)];
            }
            return;
        }

        let triggerTime = this.scheduleMap[0] + beat.cellId * this.milliPerBeat(this.bpm) / 1000;
        let now = ctx.currentTime;
        this.eventMap[this.getEventKey(beat)] = this.clock.callbackAtTime(() => {
            this.scheduleAudioBeat(beat, triggerTime);
        }, now);
    };

    this.interval;
    this.runSchedule = function (bpm) {
        this.running = true;
        this.bpm = bpm;
        let interval = this.milliPerBeat(bpm);

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
    
    this.getEventKey = function getEventKey(beat) {
        return beat.rowId + beat.cellId;
    };
    
    this.getTrackerValues = function () {
        let values = [];
        $(".cell").each(function () {
            let val = Object.assign({}, this.dataset);
            val.enabled = $(this).hasClass("enabled");
            values.push(val);
        });
        return values;
    };
    
    this.loadTrackerValues = function(json) {
        $('.cell').removeClass('enabled');
        json.forEach(function (elem) {
            if (elem.enabled === true) {
                let selector = `[data-row-id="${elem.rowId}"][data-cell-id="${elem.cellId}"]`;
                $(selector).addClass("enabled");
            }
        });
    };

}

module.exports = scheduleMeasure;
},{"./get-set-controls":10,"waaclock":8}],14:[function(require,module,exports){
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

},{}]},{},[12])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2V0LWh0bWwtcm93cy1jZWxscy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nZXQtc2V0LWZvcm0tdmFsdWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvYWQtc2FtcGxlLXNldC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9zZWxlY3QtZWxlbWVudC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90aW55LXNhbXBsZS1sb2FkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svbGliL1dBQUNsb2NrLmpzIiwic3JjL2dldC1zZXQtY29udHJvbHMuanMiLCJzcmMvZ2V0LXRyYWNrZXItY29udHJvbHMuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9zY2hlZHVsZS1tZWFzdXJlLmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gR2FpbihjdHgpIHtcblxuICAgIHRoaXMuY3R4ID0gY3R4O1xuXG4gICAgdGhpcy5zZWNvbmRzVG9UaW1lQ29uc3RhbnQgPSBmdW5jdGlvbiAoc2VjKSB7XG4gICAgICAgIHJldHVybiAoc2VjICogMikgLyA4O1xuICAgIH07XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICAgIGluaXRHYWluOiAwLjEsIC8vIEluaXQgZ2FpbiBvbiBub3RlXG4gICAgICAgIG1heEdhaW46IDEuMCwgLy8gTWF4IGdhaW4gb24gbm90ZVxuICAgICAgICBhdHRhY2tUaW1lOiAwLjEsIC8vIEF0dGFja1RpbWUuIGdhaW4uaW5pdCB0byBnYWluLm1heCBpbiBhdHRhY2tUaW1lXG4gICAgICAgIHN1c3RhaW5UaW1lOiAxLCAvLyBTdXN0YWluIG5vdGUgaW4gdGltZVxuICAgICAgICByZWxlYXNlVGltZTogMSwgLy8gQXBwcm94aW1hdGVkIGVuZCB0aW1lLiBDYWxjdWxhdGVkIHdpdGggc2Vjb25kc1RvVGltZUNvbnN0YW50KClcbiAgICAgICAgLy8gZGlzY29ubmVjdDogZmFsc2UgLy8gU2hvdWxkIHdlIGF1dG9kaXNjb25uZWN0LiBEZWZhdWx0IGlzIHRydWVcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB9O1xuXG4gICAgdGhpcy5nYWluTm9kZTtcbiAgICAvKipcbiAgICAgKiBUaGUgZ2Fpbk5vZGVcbiAgICAgKiBAcGFyYW0ge2Zsb2F0fSBiZWdpbiBjdHggdGltZVxuICAgICAqIEByZXR1cm5zIHtHYWluLmdldEdhaW5Ob2RlLmdhaW5Ob2RlfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0R2Fpbk5vZGUgPSBmdW5jdGlvbiAoYmVnaW4pIHtcblxuICAgICAgICB0aGlzLmdhaW5Ob2RlID0gdGhpcy5jdHguY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSB0aGlzLm9wdGlvbnMuaW5pdEdhaW47XG5cbiAgICAgICAgLy8gQXR0YWNrIHRvIG1heFxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5tYXhHYWluLFxuICAgICAgICAgICAgICAgIGJlZ2luICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUsXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUpO1xuXG4gICAgICAgIC8vIFN1c3RhaW4gYW5kIGVuZCBub3RlXG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoXG4gICAgICAgICAgICAgICAgMC4wLFxuICAgICAgICAgICAgICAgIGJlZ2luICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUsXG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRzVG9UaW1lQ29uc3RhbnQodGhpcy5vcHRpb25zLnJlbGVhc2VUaW1lKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpc2Nvbm5lY3QgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3QoYmVnaW4pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5nYWluTm9kZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGlzY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSArIHRoaXMub3B0aW9ucy5zdXN0YWluVGltZSArIHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZTtcbiAgICAgICAgXG4gICAgICAgIHNldFRpbWVvdXQoICgpPT4gIHtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICB9LFxuICAgICAgICB0b3RhbExlbmd0aCAqIDEwMDApO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gR2FpbjsiLCIvLyBGcm9tOiBodHRwczovL2Rldi5vcGVyYS5jb20vYXJ0aWNsZXMvZHJ1bS1zb3VuZHMtd2ViYXVkaW8vXG5mdW5jdGlvbiBJbnN0cnVtZW50KGNvbnRleHQsIGJ1ZmZlcikge1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG59XG5cbkluc3RydW1lbnQucHJvdG90eXBlLnNldHVwID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHRoaXMuc291cmNlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbn07XG5cbkluc3RydW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2U7XG59O1xuXG5JbnN0cnVtZW50LnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB0aGlzLnNldHVwKCk7XG4gICAgdGhpcy5zb3VyY2Uuc3RhcnQodGltZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluc3RydW1lbnQ7XG4iLCJmdW5jdGlvbiBnZXRIVE1MUm93c0NlbGxzKG51bVJvd3MsIG51bUNlbGxzLCBkaXYsIHNwYW4pIHtcbiAgICBcbiAgICB2YXIgc3RyID0gJyc7XG4gICAgXG4gICAgaWYgKCFkaXYpIGRpdiA9ICdzcGFuJztcbiAgICBpZiAoIXNwYW4pIHNwYW4gPSdzcGFuJztcbiAgICBcbiAgICBcbiAgICBmb3IgKGxldCByb3dJRCA9IDA7IHJvd0lEIDwgbnVtUm93czsgcm93SUQrKykge1xuICAgICAgICBzdHIgKz0gYDwke2Rpdn0gY2xhc3M9XCJyb3dcIiBkYXRhLWlkPVwiJHtyb3dJRH1cIj5gO1xuICAgICAgICBzdHIgKz0gZ2V0Q2VsbHMocm93SUQsIG51bUNlbGxzLCBzcGFuKTtcbiAgICAgICAgc3RyICs9IGA8LyR7ZGl2fT5gO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xufVxuXG5mdW5jdGlvbiBnZXRDZWxscyhyb3dJRCwgbnVtQ2VsbHMsIHNwYW4pIHtcbiAgICB2YXIgc3RyID0gJyc7XG4gICAgZm9yIChsZXQgYyA9IDA7IGMgPCBudW1DZWxsczsgYysrKSB7XG4gICAgICAgIHN0ciArPSBgPCR7c3Bhbn0gY2xhc3M9XCJjZWxsXCIgZGF0YS1yb3ctaWQ9XCIke3Jvd0lEfVwiIGRhdGEtY2VsbC1pZD1cIiR7Y31cIj48LyR7c3Bhbn0+YDtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn1cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRIVE1MUm93c0NlbGxzO1xuIiwiZnVuY3Rpb24gZ2V0RWxlbUNvdW50QnlOYW1lIChuYW1lKSB7XG4gICAgdmFyIG5hbWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUobmFtZSk7XG4gICAgcmV0dXJuIG5hbWVzLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gZ2V0Rm9ybVZhbHVlcyhmb3JtRWxlbWVudCkge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuICAgICAgICBzd2l0Y2ggKGVsZW0udHlwZSkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2luZ2xlIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgdmFyIG51bUVsZW1zID0gZ2V0RWxlbUNvdW50QnlOYW1lKGVsZW0ubmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKG51bUVsZW1zID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZm9ybVBhcmFtc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTXVsdGlwbGVcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZm9ybVBhcmFtc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBbZWxlbS52YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0ucHVzaChlbGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdFZhbHVlcyA9IGdldFNlbGVjdFZhbHVlcyhlbGVtKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gc2VsZWN0VmFsdWVzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0udmFsdWUgIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZvcm1QYXJhbXM7XG59XG5cbmZ1bmN0aW9uIHNldEZvcm1WYWx1ZXMoZm9ybUVsZW1lbnQsIHZhbHVlcykge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuICAgICAgICBcbiAgICAgICAgaWYgKCAhKGVsZW0ubmFtZSBpbiB2YWx1ZXMpICkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZWxlbS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSA9PT0gZWxlbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0uaW5kZXhPZihlbGVtLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFNlbGVjdFZhbHVlcyhlbGVtLCB2YWx1ZXNbZWxlbS5uYW1lXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS52YWx1ZSA9IHZhbHVlc1tlbGVtLm5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0U2VsZWN0VmFsdWVzKHNlbGVjdEVsZW0sIHZhbHVlcykge1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0RWxlbS5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBvcHRpb25zLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgICAgICBvcHQgPSBvcHRpb25zW2ldO1xuICAgICAgICBpZiAodmFsdWVzLmluZGV4T2Yob3B0LnZhbHVlKSA+IC0xICkge1xuICAgICAgICAgICAgb3B0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICB9ICAgICAgICBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFNlbGVjdFZhbHVlcyhzZWxlY3QpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIG9wdGlvbnMgPSBzZWxlY3QgJiYgc2VsZWN0Lm9wdGlvbnM7XG4gICAgdmFyIG9wdDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcblxuICAgICAgICBpZiAob3B0LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChvcHQudmFsdWUgfHwgb3B0LnRleHQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdldFNldEZvcm1WYWx1ZXMgKCkge1xuICAgIHRoaXMuc2V0ID0gc2V0Rm9ybVZhbHVlcztcbiAgICB0aGlzLmdldCA9IGdldEZvcm1WYWx1ZXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U2V0Rm9ybVZhbHVlcztcbiIsInZhciB0aW55U2FtcGxlTG9hZGVyID0gcmVxdWlyZSgndGlueS1zYW1wbGUtbG9hZGVyJyk7XG52YXIgYXVkaW9CdWZmZXJJbnN0cnVtZW50ID0gcmVxdWlyZSgnYXVkaW8tYnVmZmVyLWluc3RydW1lbnQnKTtcblxuZnVuY3Rpb24gbG9hZFNhbXBsZVNldChjdHgsIGRhdGFVcmwsIGNiKSB7XG4gICAgXG4gICAgZmV0Y2goZGF0YVVybCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyAhPT0gMjAwKSB7ICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb29rcyBsaWtlIHRoZXJlIHdhcyBhIHByb2JsZW0uIFN0YXR1cyBDb2RlOiAnICsgIHJlc3BvbnNlLnN0YXR1cyk7ICBcbiAgICAgICAgICAgIHJldHVybjsgIFxuICAgICAgICB9XG5cbiAgICAgICAgcmVzcG9uc2UuanNvbigpLnRoZW4oZnVuY3Rpb24oZGF0YSkgeyAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBiYXNlVXJsID0gZGF0YS5zYW1wbGVzO1xuICAgICAgICAgICAgdmFyIGJ1ZmZlcnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlcyA9IFtdO1xuXG4gICAgICAgICAgICBkYXRhLmZpbGVuYW1lID0gW107XG4gICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICBkYXRhLmZpbGVzLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgIHZhciBmaWxlbmFtZSA9IHZhbC5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIik7XG4gICAgICAgICAgICAgICAgZGF0YS5maWxlbmFtZS5wdXNoKGZpbGVuYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVtb3RlVXJsID0gYmFzZVVybCArIHZhbDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsZXQgbG9hZGVyUHJvbWlzZSA9IHRpbnlTYW1wbGVMb2FkZXIocmVtb3RlVXJsLCBjdHgsIChidWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyc1tmaWxlbmFtZV0gPSBuZXcgYXVkaW9CdWZmZXJJbnN0cnVtZW50KGN0eCwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKGxvYWRlclByb21pc2UpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKHZhbHVlcyA9PiB7IFxuICAgICAgICAgICAgICAgIGNiKGRhdGEsIGJ1ZmZlcnMpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIH0pOyAgICBcbiAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHsgIFxuICAgICAgICBjb25zb2xlLmxvZygnRmV0Y2ggRXJyb3IgOi1TJywgZXJyKTsgIFxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvYWRTYW1wbGVTZXQ7IiwiZnVuY3Rpb24gc2VsZWN0RWxlbWVudChhcHBlbmRUb0lELCBzZWxlY3RJRCwgb3B0aW9ucywgc2VsZWN0ZWQpIHtcblxuICAgIHRoaXMuYXBwZW5kVG9JRCA9IGFwcGVuZFRvSUQ7XG4gICAgdGhpcy5zZWxlY3RJRCA9IHNlbGVjdElEO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuICAgIFxuICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcHBlbmRUb0lEID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpO1xuICAgICAgICBzZWxlY3RMaXN0LmlkID0gdGhpcy5zZWxlY3RJRDsgICAgICAgIFxuICAgICAgICBhcHBlbmRUb0lELmFwcGVuZENoaWxkKHNlbGVjdExpc3QpO1xuICAgICAgICB0aGlzLnVwZGF0ZShzZWxlY3RJRCwgdGhpcy5vcHRpb25zLCB0aGlzLnNlbGVjdGVkKTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGVsZW0sIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG4gICAgICAgIHRoaXMuZGVsZXRlKGVsZW0pO1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICBvcHRpb24udmFsdWUgPSBrZXk7XG4gICAgICAgICAgICBvcHRpb24udGV4dCA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIHNlbGVjdExpc3QuYXBwZW5kQ2hpbGQob3B0aW9uKTtcblxuICAgICAgICAgICAgaWYgKGtleSA9PT0gc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb24uc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNlbGVjdGVkID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgdmFyIG9wdDtcbiAgICAgICAgZm9yICggdmFyIGkgPSAwLCBsZW4gPSBzZWxlY3RMaXN0Lm9wdGlvbnMubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XG4gICAgICAgICAgICBvcHQgPSBzZWxlY3RMaXN0Lm9wdGlvbnNbaV07XG4gICAgICAgICAgICBpZiAoIG9wdC5zZWxlY3RlZCA9PT0gdHJ1ZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0LnZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3Q9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIGZvciAodmFyIG9wdGlvbiBpbiBzZWxlY3RMaXN0KXtcbiAgICAgICAgICAgIHNlbGVjdExpc3QucmVtb3ZlKG9wdGlvbik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0QXNTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIGVsZW1lbnRIdG1sID0gZWxlbWVudC5vdXRlckhUTUw7XG4gICAgICAgIHJldHVybiBlbGVtZW50SHRtbDtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdEVsZW1lbnQ7IiwiZnVuY3Rpb24gc2FtcGxlTG9hZGVyICh1cmwsIGNvbnRleHQsIGNhbGxiYWNrKSB7XG4gICAgXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIFxuICAgICAgICByZXF1ZXN0Lm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZihyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKXtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoJ3NhbXBsZUxvYWRlciByZXF1ZXN0IHN1Y2Nlc3MnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdzYW1wbGVMb2FkZXIgcmVxdWVzdCBmYWlsZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNhbXBsZUxvYWRlcjsiLCJ2YXIgV0FBQ2xvY2sgPSByZXF1aXJlKCcuL2xpYi9XQUFDbG9jaycpXG5cbm1vZHVsZS5leHBvcnRzID0gV0FBQ2xvY2tcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgd2luZG93LldBQUNsb2NrID0gV0FBQ2xvY2tcbiIsInZhciBpc0Jyb3dzZXIgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG5cbnZhciBDTE9DS19ERUZBVUxUUyA9IHtcbiAgdG9sZXJhbmNlTGF0ZTogMC4xMCxcbiAgdG9sZXJhbmNlRWFybHk6IDAuMDAxXG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IEV2ZW50ID09PT09PT09PT09PT09PT09PT09IC8vXG52YXIgRXZlbnQgPSBmdW5jdGlvbihjbG9jaywgZGVhZGxpbmUsIGZ1bmMpIHtcbiAgdGhpcy5jbG9jayA9IGNsb2NrXG4gIHRoaXMuZnVuYyA9IGZ1bmNcbiAgdGhpcy5fY2xlYXJlZCA9IGZhbHNlIC8vIEZsYWcgdXNlZCB0byBjbGVhciBhbiBldmVudCBpbnNpZGUgY2FsbGJhY2tcblxuICB0aGlzLnRvbGVyYW5jZUxhdGUgPSBjbG9jay50b2xlcmFuY2VMYXRlXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBjbG9jay50b2xlcmFuY2VFYXJseVxuICB0aGlzLl9sYXRlc3RUaW1lID0gbnVsbFxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSBudWxsXG4gIHRoaXMuZGVhZGxpbmUgPSBudWxsXG4gIHRoaXMucmVwZWF0VGltZSA9IG51bGxcblxuICB0aGlzLnNjaGVkdWxlKGRlYWRsaW5lKVxufVxuXG4vLyBVbnNjaGVkdWxlcyB0aGUgZXZlbnRcbkV2ZW50LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICB0aGlzLl9jbGVhcmVkID0gdHJ1ZVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBTZXRzIHRoZSBldmVudCB0byByZXBlYXQgZXZlcnkgYHRpbWVgIHNlY29uZHMuXG5FdmVudC5wcm90b3R5cGUucmVwZWF0ID0gZnVuY3Rpb24odGltZSkge1xuICBpZiAodGltZSA9PT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2RlbGF5IGNhbm5vdCBiZSAwJylcbiAgdGhpcy5yZXBlYXRUaW1lID0gdGltZVxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSlcbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gU2V0cyB0aGUgdGltZSB0b2xlcmFuY2Ugb2YgdGhlIGV2ZW50LlxuLy8gVGhlIGV2ZW50IHdpbGwgYmUgZXhlY3V0ZWQgaW4gdGhlIGludGVydmFsIGBbZGVhZGxpbmUgLSBlYXJseSwgZGVhZGxpbmUgKyBsYXRlXWBcbi8vIElmIHRoZSBjbG9jayBmYWlscyB0byBleGVjdXRlIHRoZSBldmVudCBpbiB0aW1lLCB0aGUgZXZlbnQgd2lsbCBiZSBkcm9wcGVkLlxuRXZlbnQucHJvdG90eXBlLnRvbGVyYW5jZSA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICBpZiAodHlwZW9mIHZhbHVlcy5sYXRlID09PSAnbnVtYmVyJylcbiAgICB0aGlzLnRvbGVyYW5jZUxhdGUgPSB2YWx1ZXMubGF0ZVxuICBpZiAodHlwZW9mIHZhbHVlcy5lYXJseSA9PT0gJ251bWJlcicpXG4gICAgdGhpcy50b2xlcmFuY2VFYXJseSA9IHZhbHVlcy5lYXJseVxuICB0aGlzLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMoKVxuICBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBldmVudCBpcyByZXBlYXRlZCwgZmFsc2Ugb3RoZXJ3aXNlXG5FdmVudC5wcm90b3R5cGUuaXNSZXBlYXRlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yZXBlYXRUaW1lICE9PSBudWxsIH1cblxuLy8gU2NoZWR1bGVzIHRoZSBldmVudCB0byBiZSByYW4gYmVmb3JlIGBkZWFkbGluZWAuXG4vLyBJZiB0aGUgdGltZSBpcyB3aXRoaW4gdGhlIGV2ZW50IHRvbGVyYW5jZSwgd2UgaGFuZGxlIHRoZSBldmVudCBpbW1lZGlhdGVseS5cbi8vIElmIHRoZSBldmVudCB3YXMgYWxyZWFkeSBzY2hlZHVsZWQgYXQgYSBkaWZmZXJlbnQgdGltZSwgaXQgaXMgcmVzY2hlZHVsZWQuXG5FdmVudC5wcm90b3R5cGUuc2NoZWR1bGUgPSBmdW5jdGlvbihkZWFkbGluZSkge1xuICB0aGlzLl9jbGVhcmVkID0gZmFsc2VcbiAgdGhpcy5kZWFkbGluZSA9IGRlYWRsaW5lXG4gIHRoaXMuX3JlZnJlc2hFYXJseUxhdGVEYXRlcygpXG5cbiAgaWYgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA+PSB0aGlzLl9lYXJsaWVzdFRpbWUpIHtcbiAgICB0aGlzLl9leGVjdXRlKClcbiAgXG4gIH0gZWxzZSBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIFxuICB9IGVsc2UgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbn1cblxuRXZlbnQucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgcmF0aW8pIHtcbiAgaWYgKHRoaXMuaXNSZXBlYXRlZCgpKVxuICAgIHRoaXMucmVwZWF0VGltZSA9IHRoaXMucmVwZWF0VGltZSAqIHJhdGlvXG5cbiAgdmFyIGRlYWRsaW5lID0gdFJlZiArIHJhdGlvICogKHRoaXMuZGVhZGxpbmUgLSB0UmVmKVxuICAvLyBJZiB0aGUgZGVhZGxpbmUgaXMgdG9vIGNsb3NlIG9yIHBhc3QsIGFuZCB0aGUgZXZlbnQgaGFzIGEgcmVwZWF0LFxuICAvLyB3ZSBjYWxjdWxhdGUgdGhlIG5leHQgcmVwZWF0IHBvc3NpYmxlIGluIHRoZSBzdHJldGNoZWQgc3BhY2UuXG4gIGlmICh0aGlzLmlzUmVwZWF0ZWQoKSkge1xuICAgIHdoaWxlICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPj0gZGVhZGxpbmUgLSB0aGlzLnRvbGVyYW5jZUVhcmx5KVxuICAgICAgZGVhZGxpbmUgKz0gdGhpcy5yZXBlYXRUaW1lXG4gIH1cbiAgdGhpcy5zY2hlZHVsZShkZWFkbGluZSlcbn1cblxuLy8gRXhlY3V0ZXMgdGhlIGV2ZW50XG5FdmVudC5wcm90b3R5cGUuX2V4ZWN1dGUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY2xvY2suX3N0YXJ0ZWQgPT09IGZhbHNlKSByZXR1cm5cbiAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcblxuICBpZiAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lIDwgdGhpcy5fbGF0ZXN0VGltZSlcbiAgICB0aGlzLmZ1bmModGhpcylcbiAgZWxzZSB7XG4gICAgaWYgKHRoaXMub25leHBpcmVkKSB0aGlzLm9uZXhwaXJlZCh0aGlzKVxuICAgIGNvbnNvbGUud2FybignZXZlbnQgZXhwaXJlZCcpXG4gIH1cbiAgLy8gSW4gdGhlIGNhc2UgYHNjaGVkdWxlYCBpcyBjYWxsZWQgaW5zaWRlIGBmdW5jYCwgd2UgbmVlZCB0byBhdm9pZFxuICAvLyBvdmVycndyaXRpbmcgd2l0aCB5ZXQgYW5vdGhlciBgc2NoZWR1bGVgLlxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpICYmIHRoaXMuaXNSZXBlYXRlZCgpICYmICF0aGlzLl9jbGVhcmVkKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSkgXG59XG5cbi8vIFVwZGF0ZXMgY2FjaGVkIHRpbWVzXG5FdmVudC5wcm90b3R5cGUuX3JlZnJlc2hFYXJseUxhdGVEYXRlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9sYXRlc3RUaW1lID0gdGhpcy5kZWFkbGluZSArIHRoaXMudG9sZXJhbmNlTGF0ZVxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSB0aGlzLmRlYWRsaW5lIC0gdGhpcy50b2xlcmFuY2VFYXJseVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBXQUFDbG9jayA9PT09PT09PT09PT09PT09PT09PSAvL1xudmFyIFdBQUNsb2NrID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICBvcHRzID0gb3B0cyB8fCB7fVxuICB0aGlzLnRpY2tNZXRob2QgPSBvcHRzLnRpY2tNZXRob2QgfHwgJ1NjcmlwdFByb2Nlc3Nvck5vZGUnXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBvcHRzLnRvbGVyYW5jZUVhcmx5IHx8IENMT0NLX0RFRkFVTFRTLnRvbGVyYW5jZUVhcmx5XG4gIHRoaXMudG9sZXJhbmNlTGF0ZSA9IG9wdHMudG9sZXJhbmNlTGF0ZSB8fCBDTE9DS19ERUZBVUxUUy50b2xlcmFuY2VMYXRlXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHRcbiAgdGhpcy5fZXZlbnRzID0gW11cbiAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlXG59XG5cbi8vIC0tLS0tLS0tLS0gUHVibGljIEFQSSAtLS0tLS0tLS0tIC8vXG4vLyBTY2hlZHVsZXMgYGZ1bmNgIHRvIHJ1biBhZnRlciBgZGVsYXlgIHNlY29uZHMuXG5XQUFDbG9jay5wcm90b3R5cGUuc2V0VGltZW91dCA9IGZ1bmN0aW9uKGZ1bmMsIGRlbGF5KSB7XG4gIHJldHVybiB0aGlzLl9jcmVhdGVFdmVudChmdW5jLCB0aGlzLl9hYnNUaW1lKGRlbGF5KSlcbn1cblxuLy8gU2NoZWR1bGVzIGBmdW5jYCB0byBydW4gYmVmb3JlIGBkZWFkbGluZWAuXG5XQUFDbG9jay5wcm90b3R5cGUuY2FsbGJhY2tBdFRpbWUgPSBmdW5jdGlvbihmdW5jLCBkZWFkbGluZSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRXZlbnQoZnVuYywgZGVhZGxpbmUpXG59XG5cbi8vIFN0cmV0Y2hlcyBgZGVhZGxpbmVgIGFuZCBgcmVwZWF0YCBvZiBhbGwgc2NoZWR1bGVkIGBldmVudHNgIGJ5IGByYXRpb2AsIGtlZXBpbmdcbi8vIHRoZWlyIHJlbGF0aXZlIGRpc3RhbmNlIHRvIGB0UmVmYC4gSW4gZmFjdCB0aGlzIGlzIGVxdWl2YWxlbnQgdG8gY2hhbmdpbmcgdGhlIHRlbXBvLlxuV0FBQ2xvY2sucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgZXZlbnRzLCByYXRpbykge1xuICBldmVudHMuZm9yRWFjaChmdW5jdGlvbihldmVudCkgeyBldmVudC50aW1lU3RyZXRjaCh0UmVmLCByYXRpbykgfSlcbiAgcmV0dXJuIGV2ZW50c1xufVxuXG4vLyBSZW1vdmVzIGFsbCBzY2hlZHVsZWQgZXZlbnRzIGFuZCBzdGFydHMgdGhlIGNsb2NrIFxuV0FBQ2xvY2sucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9zdGFydGVkID09PSBmYWxzZSkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHRoaXMuX3N0YXJ0ZWQgPSB0cnVlXG4gICAgdGhpcy5fZXZlbnRzID0gW11cblxuICAgIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdTY3JpcHRQcm9jZXNzb3JOb2RlJykge1xuICAgICAgdmFyIGJ1ZmZlclNpemUgPSAyNTZcbiAgICAgIC8vIFdlIGhhdmUgdG8ga2VlcCBhIHJlZmVyZW5jZSB0byB0aGUgbm9kZSB0byBhdm9pZCBnYXJiYWdlIGNvbGxlY3Rpb25cbiAgICAgIHRoaXMuX2Nsb2NrTm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgMSwgMSlcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbilcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHsgc2VsZi5fdGljaygpIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdtYW51YWwnKSBudWxsIC8vIF90aWNrIGlzIGNhbGxlZCBtYW51YWxseVxuXG4gICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgdGlja01ldGhvZCAnICsgdGhpcy50aWNrTWV0aG9kKVxuICB9XG59XG5cbi8vIFN0b3BzIHRoZSBjbG9ja1xuV0FBQ2xvY2sucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3N0YXJ0ZWQgPT09IHRydWUpIHtcbiAgICB0aGlzLl9zdGFydGVkID0gZmFsc2VcbiAgICB0aGlzLl9jbG9ja05vZGUuZGlzY29ubmVjdCgpXG4gIH0gIFxufVxuXG4vLyAtLS0tLS0tLS0tIFByaXZhdGUgLS0tLS0tLS0tLSAvL1xuXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIHJhbiBwZXJpb2RpY2FsbHksIGFuZCBhdCBlYWNoIHRpY2sgaXQgZXhlY3V0ZXNcbi8vIGV2ZW50cyBmb3Igd2hpY2ggYGN1cnJlbnRUaW1lYCBpcyBpbmNsdWRlZCBpbiB0aGVpciB0b2xlcmFuY2UgaW50ZXJ2YWwuXG5XQUFDbG9jay5wcm90b3R5cGUuX3RpY2sgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGV2ZW50ID0gdGhpcy5fZXZlbnRzLnNoaWZ0KClcblxuICB3aGlsZShldmVudCAmJiBldmVudC5fZWFybGllc3RUaW1lIDw9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZSkge1xuICAgIGV2ZW50Ll9leGVjdXRlKClcbiAgICBldmVudCA9IHRoaXMuX2V2ZW50cy5zaGlmdCgpXG4gIH1cblxuICAvLyBQdXQgYmFjayB0aGUgbGFzdCBldmVudFxuICBpZihldmVudCkgdGhpcy5fZXZlbnRzLnVuc2hpZnQoZXZlbnQpXG59XG5cbi8vIENyZWF0ZXMgYW4gZXZlbnQgYW5kIGluc2VydCBpdCB0byB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9jcmVhdGVFdmVudCA9IGZ1bmN0aW9uKGZ1bmMsIGRlYWRsaW5lKSB7XG4gIHJldHVybiBuZXcgRXZlbnQodGhpcywgZGVhZGxpbmUsIGZ1bmMpXG59XG5cbi8vIEluc2VydHMgYW4gZXZlbnQgdG8gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5faW5zZXJ0RXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLl9ldmVudHMuc3BsaWNlKHRoaXMuX2luZGV4QnlUaW1lKGV2ZW50Ll9lYXJsaWVzdFRpbWUpLCAwLCBldmVudClcbn1cblxuLy8gUmVtb3ZlcyBhbiBldmVudCBmcm9tIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX3JlbW92ZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGluZCA9IHRoaXMuX2V2ZW50cy5pbmRleE9mKGV2ZW50KVxuICBpZiAoaW5kICE9PSAtMSkgdGhpcy5fZXZlbnRzLnNwbGljZShpbmQsIDEpXG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiBgZXZlbnRgIGlzIGluIHF1ZXVlLCBmYWxzZSBvdGhlcndpc2VcbldBQUNsb2NrLnByb3RvdHlwZS5faGFzRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuIHJldHVybiB0aGlzLl9ldmVudHMuaW5kZXhPZihldmVudCkgIT09IC0xXG59XG5cbi8vIFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBldmVudCB3aG9zZSBkZWFkbGluZSBpcyA+PSB0byBgZGVhZGxpbmVgXG5XQUFDbG9jay5wcm90b3R5cGUuX2luZGV4QnlUaW1lID0gZnVuY3Rpb24oZGVhZGxpbmUpIHtcbiAgLy8gcGVyZm9ybXMgYSBiaW5hcnkgc2VhcmNoXG4gIHZhciBsb3cgPSAwXG4gICAgLCBoaWdoID0gdGhpcy5fZXZlbnRzLmxlbmd0aFxuICAgICwgbWlkXG4gIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgbWlkID0gTWF0aC5mbG9vcigobG93ICsgaGlnaCkgLyAyKVxuICAgIGlmICh0aGlzLl9ldmVudHNbbWlkXS5fZWFybGllc3RUaW1lIDwgZGVhZGxpbmUpXG4gICAgICBsb3cgPSBtaWQgKyAxXG4gICAgZWxzZSBoaWdoID0gbWlkXG4gIH1cbiAgcmV0dXJuIGxvd1xufVxuXG4vLyBDb252ZXJ0cyBmcm9tIHJlbGF0aXZlIHRpbWUgdG8gYWJzb2x1dGUgdGltZVxuV0FBQ2xvY2sucHJvdG90eXBlLl9hYnNUaW1lID0gZnVuY3Rpb24ocmVsVGltZSkge1xuICByZXR1cm4gcmVsVGltZSArIHRoaXMuY29udGV4dC5jdXJyZW50VGltZVxufVxuXG4vLyBDb252ZXJ0cyBmcm9tIGFic29sdXRlIHRpbWUgdG8gcmVsYXRpdmUgdGltZSBcbldBQUNsb2NrLnByb3RvdHlwZS5fcmVsVGltZSA9IGZ1bmN0aW9uKGFic1RpbWUpIHtcbiAgcmV0dXJuIGFic1RpbWUgLSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWVcbn0iLCJjb25zdCBnZXRDb250cm9sVmFsdWVzID0gcmVxdWlyZSgnLi9nZXQtdHJhY2tlci1jb250cm9scycpO1xuXG5cbmZ1bmN0aW9uIGdldEF1ZGlvT3B0aW9ucygpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBnZXRDb250cm9sVmFsdWVzKCk7XG4gICAgdGhpcy5nZXRPcHRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZ2V0Q29udHJvbFZhbHVlcygpO1xuICAgIH07XG4gICAgdGhpcy5zZXRPcHRpb25zID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICBpZiAoIXZhbHVlcykge1xuICAgICAgICAgICAgdmFsdWVzID0gZ2V0Q29udHJvbFZhbHVlcygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHZhbHVlcztcbiAgICB9OyAgXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0QXVkaW9PcHRpb25zO1xuIiwiY29uc3QgZ2V0U2V0Rm9ybVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1zZXQtZm9ybS12YWx1ZXMnKTtcblxuLyoqXG4gKiBHZXQgYWxsIHRyYWNrZXIgdmFsdWVzIGZyb20gSFRNTFxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuZnVuY3Rpb24gZ2V0VHJhY2tlckNvbnRyb2xzKCkge1xuICAgIGxldCBmb3JtVmFsdWVzID0gbmV3IGdldFNldEZvcm1WYWx1ZXMoKTtcbiAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuICAgIGxldCB2YWx1ZXMgPSBmb3JtVmFsdWVzLmdldChmb3JtKTtcbiAgICBcbiAgICBsZXQgcmV0ID0ge307XG4gICAgZm9yIChsZXQga2V5IGluIHZhbHVlcykge1xuICAgICAgICBcbiAgICAgICAgaWYgKGtleSA9PT0gJ2RlbGF5RW5hYmxlZCcpIHtcbiAgICAgICAgICAgIHJldFtrZXldID0gJ3RydWUnO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChrZXkgPT09ICdzYW1wbGVTZXQnKSB7IFxuICAgICAgICAgICAgcmV0W2tleV0gPSB2YWx1ZXNba2V5XTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldFtrZXldID0gcGFyc2VGbG9hdCh2YWx1ZXNba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0VHJhY2tlckNvbnRyb2xzO1xuIiwiLy8gcmVxdWlyZShcImJhYmVsLXBvbHlmaWxsXCIpOyBcbmNvbnN0IGxvYWRTYW1wbGVTZXQgPSByZXF1aXJlKCdsb2FkLXNhbXBsZS1zZXQnKTtcbmNvbnN0IHNlbGVjdEVsZW1lbnQgPSByZXF1aXJlKCdzZWxlY3QtZWxlbWVudCcpO1xuY29uc3QgZ2V0U2V0Rm9ybVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1zZXQtZm9ybS12YWx1ZXMnKTtcbmNvbnN0IGFkc3JHYWluTm9kZSA9IHJlcXVpcmUoJ2Fkc3ItZ2Fpbi1ub2RlJyk7XG5jb25zdCBnZXRIdG1sUm93c0NlbGxzID0gcmVxdWlyZSgnZ2V0LWh0bWwtcm93cy1jZWxscycpO1xuY29uc3QgZ2V0Q29udHJvbFZhbHVlcyA9IHJlcXVpcmUoJy4vZ2V0LXRyYWNrZXItY29udHJvbHMnKTtcbmNvbnN0IGdldEF1ZGlvT3B0aW9ucyA9IHJlcXVpcmUoJy4vZ2V0LXNldC1jb250cm9scycpO1xuY29uc3Qgc2NoZWR1bGVNZWFzdXJlID0gcmVxdWlyZSgnLi9zY2hlZHVsZS1tZWFzdXJlJyk7XG5jb25zdCBhdWRpb09wdGlvbnMgPSBuZXcgZ2V0QXVkaW9PcHRpb25zKCk7XG5jb25zdCBjdHggPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5cbnZhciBtZWFzdXJlTGVuZ3RoID0gMTY7XG52YXIgZGF0YVVybCA9IFwiaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL29yYW1pY3Mvc2FtcGxlZC9tYXN0ZXIvRE0vQ1ItNzgvc2FtcGxlZC5pbnN0cnVtZW50Lmpzb25cIjtcbnZhciBidWZmZXJzO1xuXG5mdW5jdGlvbiBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgZGF0YVVybCwgdHJhY2spIHtcbiAgICBcbiAgICBsb2FkU2FtcGxlU2V0KGN0eCwgZGF0YVVybCwgZnVuY3Rpb24gKHNhbXBsZURhdGEsIHNhbXBsZUJ1ZmZlcnMpIHtcbiAgICAgICAgYnVmZmVycyA9IHNhbXBsZUJ1ZmZlcnM7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRyYWNrKSB7XG4gICAgICAgICAgICB0cmFjayA9IHNjaGVkdWxlLmdldFRyYWNrZXJWYWx1ZXMoKTtcbiAgICAgICAgfSBcbiAgICAgICAgc2V0dXBUcmFja2VySHRtbChzYW1wbGVEYXRhKTsgICAgXG4gICAgICAgIHNjaGVkdWxlLmxvYWRUcmFja2VyVmFsdWVzKHRyYWNrKVxuICAgICAgICBzZXR1cEV2ZW50cygpO1xuICAgIH0pO1xufVxuXG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRlZmF1bHRCZWF0ID0gW3tcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTBcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEyXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTNcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTNcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNVwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNVwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX1dXG4gICAgaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIGRhdGFVcmwsIGRlZmF1bHRCZWF0KTtcbiAgICBzZXR1cEJhc2VFdmVudHMoKTtcbiAgICB2YXIgc3RvcmFnZSA9IG5ldyB0cmFja3NMb2NhbFN0b3JhZ2UoKTtcbiAgICBzdG9yYWdlLnNldHVwU3RvcmFnZSgpO1xufTtcblxudmFyIGluc3RydW1lbnREYXRhID0ge307XG5mdW5jdGlvbiBzZXR1cFRyYWNrZXJIdG1sKGRhdGEpIHtcbiAgICBpbnN0cnVtZW50RGF0YSA9IGRhdGE7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyXCIpLmlubmVySFRNTCA9ICcnO1xuICAgIHZhciBzdHIgPSBnZXRIdG1sUm93c0NlbGxzKGRhdGEuZmlsZW5hbWUubGVuZ3RoLCBtZWFzdXJlTGVuZ3RoLCAndHInLCAndGQnKTtcbiAgICB2YXIgdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0cmFja2VyJyk7XG4gICAgdC5pbnNlcnRBZGphY2VudEhUTUwoJ2FmdGVyYmVnaW4nLCBzdHIpO1xuICAgIFxufVxuXG5mdW5jdGlvbiBkaXNjb25uZWN0Tm9kZShub2RlLCBvcHRpb25zKSB7XG4gICAgbGV0IHRvdGFsTGVuZ3RoID1cbiAgICAgICAgICAgIG9wdGlvbnMuYXR0YWNrVGltZSArIG9wdGlvbnMuc3VzdGFpblRpbWUgKyBvcHRpb25zLnJlbGVhc2VUaW1lO1xuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIG5vZGUuZGlzY29ubmVjdCgpO1xuICAgIH0sIHRvdGFsTGVuZ3RoICogMTAwMCk7XG59XG5cbmZ1bmN0aW9uIHNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKSB7XG4gICAgXG4gICAgbGV0IGluc3RydW1lbnROYW1lID0gaW5zdHJ1bWVudERhdGEuZmlsZW5hbWVbYmVhdC5yb3dJZF07XG4gICAgbGV0IGluc3RydW1lbnQgPSBidWZmZXJzW2luc3RydW1lbnROYW1lXS5nZXQoKTtcblxuICAgIGZ1bmN0aW9uIGNvbm5lY3REZWxheShpbnN0cnVtZW50KSB7XG5cbiAgICAgICAgLy8gV2l0aCBzdXN0YWluIGFuZCBmZWVkYmFjayBmaWx0ZXJcbiAgICAgICAgbGV0IGRlbGF5ID0gY3R4LmNyZWF0ZURlbGF5KCk7XG4gICAgICAgIGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRlbGF5O1xuXG4gICAgICAgIGxldCBnYWluID0gbmV3IGFkc3JHYWluTm9kZShjdHgpO1xuICAgICAgICBnYWluLnNldE9wdGlvbnMoYXVkaW9PcHRpb25zLmdldE9wdGlvbnMoKSk7XG4gICAgICAgIGxldCBmZWVkYmFja0dhaW4gPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcblxuXG4gICAgICAgIGxldCBmaWx0ZXIgPSBjdHguY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgICAgIGZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSBhdWRpb09wdGlvbnMub3B0aW9ucy5maWx0ZXI7XG5cbiAgICAgICAgLy8gZGVsYXkgLT4gZmVlZGJhY2tcbiAgICAgICAgZGVsYXkuY29ubmVjdChmZWVkYmFja0dhaW4pO1xuICAgICAgICBkaXNjb25uZWN0Tm9kZShkZWxheSwgYXVkaW9PcHRpb25zLmdldE9wdGlvbnMoKSk7XG5cbiAgICAgICAgLy8gZmVlZGJhY2sgLT4gZmlsdGVyXG4gICAgICAgIGZlZWRiYWNrR2Fpbi5jb25uZWN0KGZpbHRlcik7XG5cbiAgICAgICAgLy8gZmlsdGVyIC0+ZGVsYXlcbiAgICAgICAgZmlsdGVyLmNvbm5lY3QoZGVsYXkpO1xuXG4gICAgICAgIGluc3RydW1lbnQuZGV0dW5lLnZhbHVlID0gYXVkaW9PcHRpb25zLm9wdGlvbnMuZGV0dW5lO1xuXG4gICAgICAgIC8vIGRlbGF5IC0+IGluc3RydW1lbnRcbiAgICAgICAgaW5zdHJ1bWVudC5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICAvLyBJbnN0cnVtZW50IC0+XG4gICAgICAgIGluc3RydW1lbnQuY29ubmVjdChjdHguZGVzdGluYXRpb24pO1xuXG4gICAgICAgIC8vIERlbGF5IC0+XG4gICAgICAgIGRlbGF5LmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICBpbnN0cnVtZW50LnN0YXJ0KHRyaWdnZXJUaW1lKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbm5lY3RDbGVhbihpbnN0cnVtZW50KSB7XG4gICAgICAgIC8vIFRyaWdnZXIgdG9uZVxuICAgICAgICBsZXQgZ2FpbiA9IG5ldyBhZHNyR2Fpbk5vZGUoY3R4KTtcbiAgICAgICAgZ2Fpbi5zZXRPcHRpb25zKGF1ZGlvT3B0aW9ucy5nZXRPcHRpb25zKCkpO1xuICAgICAgICBsZXQgZ2Fpbk5vZGUgPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcblxuICAgICAgICBpbnN0cnVtZW50LmRldHVuZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRldHVuZTtcbiAgICAgICAgLy8gaW5zdHJ1bWVudCAtPiBnYWluXG4gICAgICAgIFxuICAgICAgICBpbnN0cnVtZW50LmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICBnYWluTm9kZS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5zdGFydCh0cmlnZ2VyVGltZSk7XG4gICAgfVxuXG4gICAgaWYgKGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRlbGF5RW5hYmxlZCkge1xuICAgICAgICBjb25uZWN0RGVsYXkoaW5zdHJ1bWVudClcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25uZWN0Q2xlYW4oaW5zdHJ1bWVudCk7XG4gICAgfVxufVxuXG52YXIgc2NoZWR1bGUgPSBuZXcgc2NoZWR1bGVNZWFzdXJlKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuXG5mdW5jdGlvbiBzZXR1cEJhc2VFdmVudHMgKCkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgIHNjaGVkdWxlLnJ1blNjaGVkdWxlKGF1ZGlvT3B0aW9ucy5vcHRpb25zLmJwbSk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGF1c2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTsgXG4gICAgfSk7XG4gICAgXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0b3AnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgc2NoZWR1bGUgPSBuZXcgc2NoZWR1bGVNZWFzdXJlKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuICAgIH0pO1xuICAgIFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdicG0nKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBhdWRpb09wdGlvbnMuc2V0T3B0aW9ucygpO1xuICAgICAgICBpZiAoc2NoZWR1bGUucnVubmluZykge1xuICAgICAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICAgICAgc2NoZWR1bGUucnVuU2NoZWR1bGUoYXVkaW9PcHRpb25zLm9wdGlvbnMuYnBtKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIFxuICAgICQoJy5iYXNlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgYXVkaW9PcHRpb25zLnNldE9wdGlvbnMoKTtcbiAgICB9KTtcbn1cbiAgICBcbmZ1bmN0aW9uIHNldHVwRXZlbnRzKCkge1xuICAgIFxuICAgICQoJy5jZWxsJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZGF0YXNldCk7XG4gICAgICAgIHZhbC5lbmFibGVkID0gJCh0aGlzKS5oYXNDbGFzcyhcImVuYWJsZWRcIik7XG5cbiAgICAgICAgbGV0IGN1cnJlbnRCZWF0ID0gJCgnLmN1cnJlbnQnKS5kYXRhKCdjZWxsLWlkJyk7XG4gICAgICAgIGlmICh2YWwuY2VsbElkID4gY3VycmVudEJlYXQpIHtcbiAgICAgICAgICAgIHNjaGVkdWxlLnNjaGVkdWxlQXVkaW9CZWF0Tm93KHZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMpLnRvZ2dsZUNsYXNzKCdlbmFibGVkJyk7XG4gICAgfSk7XG59XG5cbiQoJyNzYW1wbGVTZXQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0aGlzLnZhbHVlKTtcbn0pO1xuXG5cblxuZnVuY3Rpb24gdHJhY2tzTG9jYWxTdG9yYWdlICgpIHtcblxuICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlID0gZnVuY3Rpb24odXBkYXRlKSB7XG4gICAgICAgIHZhciBzdG9yYWdlID0ge307XG4gICAgICAgIHN0b3JhZ2VbJ1NlbGVjdCddID0gJ1NlbGVjdCc7XG5cblxuICAgICAgICBmb3IgKCB2YXIgaSA9IDAsIGxlbiA9IGxvY2FsU3RvcmFnZS5sZW5ndGg7IGkgPCBsZW47ICsraSApIHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gbG9jYWxTdG9yYWdlLmtleShpKTtcbiAgICAgICAgICAgIHN0b3JhZ2VbaXRlbV0gPSBpdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHNlbGVjdCBlbGVtZW50XG4gICAgICAgIHZhciBzID0gbmV3IHNlbGVjdEVsZW1lbnQoXG4gICAgICAgICAgICAnbG9hZC1zdG9yYWdlJywgLy8gaWQgdG8gYXBwZW5kIHRoZSBzZWxlY3QgbGlzdCB0b1xuICAgICAgICAgICAgJ2JlYXQtbGlzdCcsIC8vIGlkIG9mIHRoZSBzZWxlY3QgbGlzdFxuICAgICAgICAgICAgc3RvcmFnZSAvL1xuICAgICAgICApO1xuXG4gICAgICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgICAgIHMudXBkYXRlKCdiZWF0LWxpc3QnLCBzdG9yYWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMuY3JlYXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5zZXR1cFN0b3JhZ2UgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgbGV0IGZvcm1EYXRhID0gZ2V0Q29udHJvbFZhbHVlcygpO1xuICAgICAgICAgICAgbGV0IGZpbGVuYW1lID0gJCgnI2ZpbGVuYW1lJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgICAgICAgICAgICAgZmlsZW5hbWUgPSAndW50aXRsZWQnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgYmVhdCA9IHNjaGVkdWxlLmdldFRyYWNrZXJWYWx1ZXMoKTtcbiAgICAgICAgICAgIGxldCBzb25nID0ge1wiYmVhdFwiOiBiZWF0LCBcInNldHRpbmdzXCI6IGZvcm1EYXRhfVxuXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShmaWxlbmFtZSwgSlNPTi5zdHJpbmdpZnkoc29uZykpO1xuICAgICAgICAgICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UoJ3VwZGF0ZScpO1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgYWxlcnQoJ1RyYWNrIHNhdmVkJyk7IH0sIDEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmVhdC1saXN0JykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gJCgnI2JlYXQtbGlzdCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdTZWxlY3QnKSB7ICAgIFxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZSA9IGl0ZW07XG4gICAgICAgICAgICBsZXQgdHJhY2sgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKGl0ZW0pKTtcbiAgICAgICAgICAgIGxldCBmb3JtVmFsdWVzID0gbmV3IGdldFNldEZvcm1WYWx1ZXMoKTtcbiAgICAgICAgICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG5cbiAgICAgICAgICAgIGZvcm1WYWx1ZXMuc2V0KGZvcm0sIHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgICAgIGF1ZGlvT3B0aW9ucy5zZXRPcHRpb25zKHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcblxuICAgICAgICAgICAgaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIHRyYWNrLnNldHRpbmdzLnNhbXBsZVNldCwgdHJhY2suYmVhdCk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlbGV0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpO1xuICAgICAgICAgICAgbGV0IHRvRGVsZXRlID0gZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udGV4dDtcblxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odG9EZWxldGUpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcblxuICAgICAgICB9KTtcbiAgICB9O1xuIH1cbiAiLCJjb25zdCBXQUFDbG9jayA9IHJlcXVpcmUoJ3dhYWNsb2NrJyk7XG5jb25zdCBnZXRBdWRpb09wdGlvbnMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IGF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRBdWRpb09wdGlvbnMoKTtcblxudmFyIG1lYXN1cmVMZW5ndGggPSAxNjtcblxuZnVuY3Rpb24gc2NoZWR1bGVNZWFzdXJlKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpIHtcbiAgICBcbiAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0ID0gc2NoZWR1bGVBdWRpb0JlYXQ7XG4gICAgdGhpcy5zY2hlZHVsZUZvcndhcmQgPSAwLjE7XG4gICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICB0aGlzLmV2ZW50TWFwID0ge307XG4gICAgdGhpcy5jbG9jayA9IG5ldyBXQUFDbG9jayhjdHgpO1xuICAgIHRoaXMuY2xvY2suc3RhcnQoKTtcbiAgICB0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcblxuICAgIHRoaXMubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50Kys7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnQgPj0gbWVhc3VyZUxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5taWxsaVBlckJlYXQgPSBmdW5jdGlvbiAoYmVhdHMpIHtcbiAgICAgICAgaWYgKCFiZWF0cykge1xuICAgICAgICAgICAgYmVhdHMgPSA2MDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTAwMCAqIDYwIC8gYmVhdHM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VHJhY2tlclJvd1ZhbHVlcyA9IGZ1bmN0aW9uIChjZWxsSWQpIHtcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtY2VsbC1pZD1cIiR7Y2VsbElkfVwiXWA7XG5cbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGVsZW1zLmZvckVhY2goKGVsKSA9PiB7XG4gICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgZWwuZGF0YXNldCk7XG4gICAgICAgICAgICB2YWwuZW5hYmxlZCA9IGVsLmNsYXNzTGlzdC5jb250YWlucygnZW5hYmxlZCcpO1xuICAgICAgICAgICAgdmFsdWVzLnB1c2godmFsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfTtcbiAgICBcblxuICAgIHRoaXMuc2NoZWR1bGUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgbGV0IGJlYXRzID0gdGhpcy5nZXRUcmFja2VyUm93VmFsdWVzKHRoaXMuY3VycmVudCk7XG4gICAgICAgIGxldCBub3cgPSBjdHguY3VycmVudFRpbWU7XG5cbiAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLWNlbGwtaWQ9XCIke3RoaXMuY3VycmVudH1cIl1gO1xuXG4gICAgICAgIGxldCBldmVudCA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgJChzZWxlY3RvcikuYWRkQ2xhc3MoJ2N1cnJlbnQnKTtcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQpO1xuXG4gICAgICAgIHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgJChzZWxlY3RvcikucmVtb3ZlQ2xhc3MoJ2N1cnJlbnQnKTtcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQgKyB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwKTtcblxuICAgICAgICBiZWF0cy5mb3JFYWNoKChiZWF0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlQmVhdChiZWF0LCBub3cpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5zY2hlZHVsZUJlYXQgPSBmdW5jdGlvbiAoYmVhdCwgbm93KSB7XG5cbiAgICAgICAgbGV0IHRyaWdnZXJUaW1lID0gbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQ7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVNYXBbYmVhdC5jZWxsSWRdID0gdHJpZ2dlclRpbWU7XG4gICAgICAgIGlmIChiZWF0LmVuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKTtcbiAgICAgICAgICAgIH0sIG5vdyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5zY2hlZHVsZU1hcCA9IHt9O1xuXG4gICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdE5vdyA9IGZ1bmN0aW9uIChiZWF0KSB7XG5cbiAgICAgICAgaWYgKGJlYXQuZW5hYmxlZCkge1xuICAgICAgICAgICAgbGV0IGJlYXRFdmVudCA9IHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV07XG4gICAgICAgICAgICBpZiAoYmVhdEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgYmVhdEV2ZW50LmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSB0aGlzLnNjaGVkdWxlTWFwWzBdICsgYmVhdC5jZWxsSWQgKiB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwO1xuICAgICAgICBsZXQgbm93ID0gY3R4LmN1cnJlbnRUaW1lO1xuICAgICAgICB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKTtcbiAgICAgICAgfSwgbm93KTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbnRlcnZhbDtcbiAgICB0aGlzLnJ1blNjaGVkdWxlID0gZnVuY3Rpb24gKGJwbSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmJwbSA9IGJwbTtcbiAgICAgICAgbGV0IGludGVydmFsID0gdGhpcy5taWxsaVBlckJlYXQoYnBtKTtcblxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGUoKTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICB9LCAwKTtcblxuICAgICAgICB0aGlzLmludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG5cbiAgICAgICAgfSwgaW50ZXJ2YWwpO1xuICAgIH07XG5cbiAgICB0aGlzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRFdmVudEtleSA9IGZ1bmN0aW9uIGdldEV2ZW50S2V5KGJlYXQpIHtcbiAgICAgICAgcmV0dXJuIGJlYXQucm93SWQgKyBiZWF0LmNlbGxJZDtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0VHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICAgICAkKFwiLmNlbGxcIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5kYXRhc2V0KTtcbiAgICAgICAgICAgIHZhbC5lbmFibGVkID0gJCh0aGlzKS5oYXNDbGFzcyhcImVuYWJsZWRcIik7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh2YWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9O1xuICAgIFxuICAgIHRoaXMubG9hZFRyYWNrZXJWYWx1ZXMgPSBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICQoJy5jZWxsJykucmVtb3ZlQ2xhc3MoJ2VuYWJsZWQnKTtcbiAgICAgICAganNvbi5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgICAgICBpZiAoZWxlbS5lbmFibGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLXJvdy1pZD1cIiR7ZWxlbS5yb3dJZH1cIl1bZGF0YS1jZWxsLWlkPVwiJHtlbGVtLmNlbGxJZH1cIl1gO1xuICAgICAgICAgICAgICAgICQoc2VsZWN0b3IpLmFkZENsYXNzKFwiZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNjaGVkdWxlTWVhc3VyZTsiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIl19
