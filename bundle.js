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
        
        setTimeout( () => {
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
/**
 * Code refactored from Mozilla Developer Network:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 */

'use strict';

function assign(target, firstSource) {
  if (target === undefined || target === null) {
    throw new TypeError('Cannot convert first argument to object');
  }

  var to = Object(target);
  for (var i = 1; i < arguments.length; i++) {
    var nextSource = arguments[i];
    if (nextSource === undefined || nextSource === null) {
      continue;
    }

    var keysArray = Object.keys(Object(nextSource));
    for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
      var nextKey = keysArray[nextIndex];
      var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
      if (desc !== undefined && desc.enumerable) {
        to[nextKey] = nextSource[nextKey];
      }
    }
  }
  return to;
}

function polyfill() {
  if (!Object.assign) {
    Object.defineProperty(Object, 'assign', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: assign
    });
  }
}

module.exports = {
  assign: assign,
  polyfill: polyfill
};

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
},{"audio-buffer-instrument":2,"tiny-sample-loader":8}],7:[function(require,module,exports){
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

},{"_process":15}],11:[function(require,module,exports){
'use strict';

var getControlValues = require('./get-tracker-controls');

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

},{"./get-tracker-controls":12}],12:[function(require,module,exports){
'use strict';

var getSetFormValues = require('get-set-form-values');

/**
 * Get all tracker values from HTML
 * @returns {object}
 */
function getTrackerControls() {
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

module.exports = getTrackerControls;

},{"get-set-form-values":5}],13:[function(require,module,exports){
'use strict';

require('es6-object-assign').polyfill();

var adsrGainNode = require('adsr-gain-node');
var getHtmlRowsCells = require('get-html-rows-cells');
var WAAClock = require('waaclock');
var loadSampleSet = require('load-sample-set');
var getControlValues = require('./get-tracker-controls');
var getAudioOptions = require('./get-set-controls');
var scheduleMeasure = require('./schedule-measure');
var selectElement = require('select-element');
var getSetFormValues = require('get-set-form-values');
var audioOptions = new getAudioOptions();
var ctx = new AudioContext();

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
        schedule.loadTrackerValues(track);
        setupEvents();
    });
}

window.onload = function () {
    var defaultBeat = [{ "rowId": "0", "cellId": "0", "enabled": false }, { "rowId": "0", "cellId": "1", "enabled": false }, { "rowId": "0", "cellId": "2", "enabled": false }, { "rowId": "0", "cellId": "3", "enabled": false }, { "rowId": "0", "cellId": "4", "enabled": false }, { "rowId": "0", "cellId": "5", "enabled": false }, { "rowId": "0", "cellId": "6", "enabled": false }, { "rowId": "0", "cellId": "7", "enabled": false }, { "rowId": "0", "cellId": "8", "enabled": false }, { "rowId": "0", "cellId": "9", "enabled": false }, { "rowId": "0", "cellId": "10", "enabled": false }, { "rowId": "0", "cellId": "11", "enabled": false }, { "rowId": "0", "cellId": "12", "enabled": false }, { "rowId": "0", "cellId": "13", "enabled": false }, { "rowId": "0", "cellId": "14", "enabled": false }, { "rowId": "0", "cellId": "15", "enabled": false }, { "rowId": "1", "cellId": "0", "enabled": false }, { "rowId": "1", "cellId": "1", "enabled": false }, { "rowId": "1", "cellId": "2", "enabled": false }, { "rowId": "1", "cellId": "3", "enabled": false }, { "rowId": "1", "cellId": "4", "enabled": false }, { "rowId": "1", "cellId": "5", "enabled": false }, { "rowId": "1", "cellId": "6", "enabled": false }, { "rowId": "1", "cellId": "7", "enabled": false }, { "rowId": "1", "cellId": "8", "enabled": false }, { "rowId": "1", "cellId": "9", "enabled": false }, { "rowId": "1", "cellId": "10", "enabled": false }, { "rowId": "1", "cellId": "11", "enabled": false }, { "rowId": "1", "cellId": "12", "enabled": false }, { "rowId": "1", "cellId": "13", "enabled": false }, { "rowId": "1", "cellId": "14", "enabled": false }, { "rowId": "1", "cellId": "15", "enabled": false }, { "rowId": "2", "cellId": "0", "enabled": false }, { "rowId": "2", "cellId": "1", "enabled": false }, { "rowId": "2", "cellId": "2", "enabled": false }, { "rowId": "2", "cellId": "3", "enabled": false }, { "rowId": "2", "cellId": "4", "enabled": false }, { "rowId": "2", "cellId": "5", "enabled": false }, { "rowId": "2", "cellId": "6", "enabled": false }, { "rowId": "2", "cellId": "7", "enabled": false }, { "rowId": "2", "cellId": "8", "enabled": false }, { "rowId": "2", "cellId": "9", "enabled": false }, { "rowId": "2", "cellId": "10", "enabled": false }, { "rowId": "2", "cellId": "11", "enabled": false }, { "rowId": "2", "cellId": "12", "enabled": false }, { "rowId": "2", "cellId": "13", "enabled": false }, { "rowId": "2", "cellId": "14", "enabled": false }, { "rowId": "2", "cellId": "15", "enabled": false }, { "rowId": "3", "cellId": "0", "enabled": false }, { "rowId": "3", "cellId": "1", "enabled": false }, { "rowId": "3", "cellId": "2", "enabled": false }, { "rowId": "3", "cellId": "3", "enabled": false }, { "rowId": "3", "cellId": "4", "enabled": false }, { "rowId": "3", "cellId": "5", "enabled": false }, { "rowId": "3", "cellId": "6", "enabled": false }, { "rowId": "3", "cellId": "7", "enabled": false }, { "rowId": "3", "cellId": "8", "enabled": false }, { "rowId": "3", "cellId": "9", "enabled": false }, { "rowId": "3", "cellId": "10", "enabled": false }, { "rowId": "3", "cellId": "11", "enabled": false }, { "rowId": "3", "cellId": "12", "enabled": false }, { "rowId": "3", "cellId": "13", "enabled": false }, { "rowId": "3", "cellId": "14", "enabled": false }, { "rowId": "3", "cellId": "15", "enabled": false }, { "rowId": "4", "cellId": "0", "enabled": true }, { "rowId": "4", "cellId": "1", "enabled": false }, { "rowId": "4", "cellId": "2", "enabled": false }, { "rowId": "4", "cellId": "3", "enabled": true }, { "rowId": "4", "cellId": "4", "enabled": false }, { "rowId": "4", "cellId": "5", "enabled": false }, { "rowId": "4", "cellId": "6", "enabled": false }, { "rowId": "4", "cellId": "7", "enabled": true }, { "rowId": "4", "cellId": "8", "enabled": false }, { "rowId": "4", "cellId": "9", "enabled": false }, { "rowId": "4", "cellId": "10", "enabled": false }, { "rowId": "4", "cellId": "11", "enabled": false }, { "rowId": "4", "cellId": "12", "enabled": false }, { "rowId": "4", "cellId": "13", "enabled": true }, { "rowId": "4", "cellId": "14", "enabled": false }, { "rowId": "4", "cellId": "15", "enabled": false }, { "rowId": "5", "cellId": "0", "enabled": false }, { "rowId": "5", "cellId": "1", "enabled": false }, { "rowId": "5", "cellId": "2", "enabled": false }, { "rowId": "5", "cellId": "3", "enabled": false }, { "rowId": "5", "cellId": "4", "enabled": false }, { "rowId": "5", "cellId": "5", "enabled": false }, { "rowId": "5", "cellId": "6", "enabled": false }, { "rowId": "5", "cellId": "7", "enabled": false }, { "rowId": "5", "cellId": "8", "enabled": false }, { "rowId": "5", "cellId": "9", "enabled": false }, { "rowId": "5", "cellId": "10", "enabled": false }, { "rowId": "5", "cellId": "11", "enabled": false }, { "rowId": "5", "cellId": "12", "enabled": false }, { "rowId": "5", "cellId": "13", "enabled": false }, { "rowId": "5", "cellId": "14", "enabled": false }, { "rowId": "5", "cellId": "15", "enabled": false }, { "rowId": "6", "cellId": "0", "enabled": false }, { "rowId": "6", "cellId": "1", "enabled": true }, { "rowId": "6", "cellId": "2", "enabled": false }, { "rowId": "6", "cellId": "3", "enabled": false }, { "rowId": "6", "cellId": "4", "enabled": true }, { "rowId": "6", "cellId": "5", "enabled": false }, { "rowId": "6", "cellId": "6", "enabled": false }, { "rowId": "6", "cellId": "7", "enabled": false }, { "rowId": "6", "cellId": "8", "enabled": false }, { "rowId": "6", "cellId": "9", "enabled": true }, { "rowId": "6", "cellId": "10", "enabled": false }, { "rowId": "6", "cellId": "11", "enabled": false }, { "rowId": "6", "cellId": "12", "enabled": false }, { "rowId": "6", "cellId": "13", "enabled": false }, { "rowId": "6", "cellId": "14", "enabled": false }, { "rowId": "6", "cellId": "15", "enabled": false }, { "rowId": "7", "cellId": "0", "enabled": false }, { "rowId": "7", "cellId": "1", "enabled": false }, { "rowId": "7", "cellId": "2", "enabled": false }, { "rowId": "7", "cellId": "3", "enabled": false }, { "rowId": "7", "cellId": "4", "enabled": false }, { "rowId": "7", "cellId": "5", "enabled": true }, { "rowId": "7", "cellId": "6", "enabled": false }, { "rowId": "7", "cellId": "7", "enabled": false }, { "rowId": "7", "cellId": "8", "enabled": false }, { "rowId": "7", "cellId": "9", "enabled": false }, { "rowId": "7", "cellId": "10", "enabled": false }, { "rowId": "7", "cellId": "11", "enabled": true }, { "rowId": "7", "cellId": "12", "enabled": false }, { "rowId": "7", "cellId": "13", "enabled": false }, { "rowId": "7", "cellId": "14", "enabled": false }, { "rowId": "7", "cellId": "15", "enabled": true }, { "rowId": "8", "cellId": "0", "enabled": false }, { "rowId": "8", "cellId": "1", "enabled": false }, { "rowId": "8", "cellId": "2", "enabled": false }, { "rowId": "8", "cellId": "3", "enabled": false }, { "rowId": "8", "cellId": "4", "enabled": false }, { "rowId": "8", "cellId": "5", "enabled": false }, { "rowId": "8", "cellId": "6", "enabled": false }, { "rowId": "8", "cellId": "7", "enabled": false }, { "rowId": "8", "cellId": "8", "enabled": false }, { "rowId": "8", "cellId": "9", "enabled": false }, { "rowId": "8", "cellId": "10", "enabled": false }, { "rowId": "8", "cellId": "11", "enabled": false }, { "rowId": "8", "cellId": "12", "enabled": false }, { "rowId": "8", "cellId": "13", "enabled": false }, { "rowId": "8", "cellId": "14", "enabled": false }, { "rowId": "8", "cellId": "15", "enabled": false }, { "rowId": "9", "cellId": "0", "enabled": true }, { "rowId": "9", "cellId": "1", "enabled": false }, { "rowId": "9", "cellId": "2", "enabled": false }, { "rowId": "9", "cellId": "3", "enabled": false }, { "rowId": "9", "cellId": "4", "enabled": false }, { "rowId": "9", "cellId": "5", "enabled": false }, { "rowId": "9", "cellId": "6", "enabled": false }, { "rowId": "9", "cellId": "7", "enabled": false }, { "rowId": "9", "cellId": "8", "enabled": false }, { "rowId": "9", "cellId": "9", "enabled": true }, { "rowId": "9", "cellId": "10", "enabled": false }, { "rowId": "9", "cellId": "11", "enabled": false }, { "rowId": "9", "cellId": "12", "enabled": false }, { "rowId": "9", "cellId": "13", "enabled": false }, { "rowId": "9", "cellId": "14", "enabled": false }, { "rowId": "9", "cellId": "15", "enabled": false }, { "rowId": "10", "cellId": "0", "enabled": false }, { "rowId": "10", "cellId": "1", "enabled": true }, { "rowId": "10", "cellId": "2", "enabled": false }, { "rowId": "10", "cellId": "3", "enabled": false }, { "rowId": "10", "cellId": "4", "enabled": false }, { "rowId": "10", "cellId": "5", "enabled": false }, { "rowId": "10", "cellId": "6", "enabled": false }, { "rowId": "10", "cellId": "7", "enabled": false }, { "rowId": "10", "cellId": "8", "enabled": false }, { "rowId": "10", "cellId": "9", "enabled": false }, { "rowId": "10", "cellId": "10", "enabled": false }, { "rowId": "10", "cellId": "11", "enabled": false }, { "rowId": "10", "cellId": "12", "enabled": false }, { "rowId": "10", "cellId": "13", "enabled": true }, { "rowId": "10", "cellId": "14", "enabled": false }, { "rowId": "10", "cellId": "15", "enabled": false }, { "rowId": "11", "cellId": "0", "enabled": false }, { "rowId": "11", "cellId": "1", "enabled": false }, { "rowId": "11", "cellId": "2", "enabled": false }, { "rowId": "11", "cellId": "3", "enabled": false }, { "rowId": "11", "cellId": "4", "enabled": false }, { "rowId": "11", "cellId": "5", "enabled": false }, { "rowId": "11", "cellId": "6", "enabled": false }, { "rowId": "11", "cellId": "7", "enabled": true }, { "rowId": "11", "cellId": "8", "enabled": false }, { "rowId": "11", "cellId": "9", "enabled": false }, { "rowId": "11", "cellId": "10", "enabled": false }, { "rowId": "11", "cellId": "11", "enabled": false }, { "rowId": "11", "cellId": "12", "enabled": false }, { "rowId": "11", "cellId": "13", "enabled": false }, { "rowId": "11", "cellId": "14", "enabled": false }, { "rowId": "11", "cellId": "15", "enabled": false }, { "rowId": "12", "cellId": "0", "enabled": false }, { "rowId": "12", "cellId": "1", "enabled": false }, { "rowId": "12", "cellId": "2", "enabled": false }, { "rowId": "12", "cellId": "3", "enabled": false }, { "rowId": "12", "cellId": "4", "enabled": false }, { "rowId": "12", "cellId": "5", "enabled": false }, { "rowId": "12", "cellId": "6", "enabled": false }, { "rowId": "12", "cellId": "7", "enabled": false }, { "rowId": "12", "cellId": "8", "enabled": false }, { "rowId": "12", "cellId": "9", "enabled": false }, { "rowId": "12", "cellId": "10", "enabled": false }, { "rowId": "12", "cellId": "11", "enabled": true }, { "rowId": "12", "cellId": "12", "enabled": false }, { "rowId": "12", "cellId": "13", "enabled": false }, { "rowId": "12", "cellId": "14", "enabled": false }, { "rowId": "12", "cellId": "15", "enabled": false }, { "rowId": "13", "cellId": "0", "enabled": false }, { "rowId": "13", "cellId": "1", "enabled": false }, { "rowId": "13", "cellId": "2", "enabled": false }, { "rowId": "13", "cellId": "3", "enabled": false }, { "rowId": "13", "cellId": "4", "enabled": false }, { "rowId": "13", "cellId": "5", "enabled": false }, { "rowId": "13", "cellId": "6", "enabled": false }, { "rowId": "13", "cellId": "7", "enabled": false }, { "rowId": "13", "cellId": "8", "enabled": false }, { "rowId": "13", "cellId": "9", "enabled": false }, { "rowId": "13", "cellId": "10", "enabled": false }, { "rowId": "13", "cellId": "11", "enabled": false }, { "rowId": "13", "cellId": "12", "enabled": false }, { "rowId": "13", "cellId": "13", "enabled": false }, { "rowId": "13", "cellId": "14", "enabled": false }, { "rowId": "13", "cellId": "15", "enabled": false }, { "rowId": "14", "cellId": "0", "enabled": false }, { "rowId": "14", "cellId": "1", "enabled": false }, { "rowId": "14", "cellId": "2", "enabled": false }, { "rowId": "14", "cellId": "3", "enabled": false }, { "rowId": "14", "cellId": "4", "enabled": false }, { "rowId": "14", "cellId": "5", "enabled": true }, { "rowId": "14", "cellId": "6", "enabled": false }, { "rowId": "14", "cellId": "7", "enabled": false }, { "rowId": "14", "cellId": "8", "enabled": false }, { "rowId": "14", "cellId": "9", "enabled": false }, { "rowId": "14", "cellId": "10", "enabled": false }, { "rowId": "14", "cellId": "11", "enabled": false }, { "rowId": "14", "cellId": "12", "enabled": false }, { "rowId": "14", "cellId": "13", "enabled": false }, { "rowId": "14", "cellId": "14", "enabled": false }, { "rowId": "14", "cellId": "15", "enabled": false }, { "rowId": "15", "cellId": "0", "enabled": false }, { "rowId": "15", "cellId": "1", "enabled": false }, { "rowId": "15", "cellId": "2", "enabled": false }, { "rowId": "15", "cellId": "3", "enabled": false }, { "rowId": "15", "cellId": "4", "enabled": false }, { "rowId": "15", "cellId": "5", "enabled": false }, { "rowId": "15", "cellId": "6", "enabled": false }, { "rowId": "15", "cellId": "7", "enabled": false }, { "rowId": "15", "cellId": "8", "enabled": false }, { "rowId": "15", "cellId": "9", "enabled": false }, { "rowId": "15", "cellId": "10", "enabled": false }, { "rowId": "15", "cellId": "11", "enabled": false }, { "rowId": "15", "cellId": "12", "enabled": false }, { "rowId": "15", "cellId": "13", "enabled": false }, { "rowId": "15", "cellId": "14", "enabled": false }, { "rowId": "15", "cellId": "15", "enabled": false }];
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
        gainNode.connect(ctx.destination);

        instrument.start(triggerTime);
    }

    if (audioOptions.options.delayEnabled) {
        connectDelay(instrument);
    } else {
        connectClean(instrument);
    }
}

var schedule = new scheduleMeasure(ctx, scheduleAudioBeat);

function setupBaseEvents() {
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

function tracksLocalStorage() {

    this.setLocalStorage = function (update) {
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
    };

    this.setupStorage = function () {
        var _this = this;

        this.setLocalStorage();
        document.getElementById('save').addEventListener('click', function (e) {
            e.preventDefault();

            var formData = getControlValues();
            var filename = $('#filename').val();
            if (!filename) {
                filename = 'untitled';
            }

            var beat = schedule.getTrackerValues();
            var song = { "beat": beat, "settings": formData };

            localStorage.setItem(filename, JSON.stringify(song));
            _this.setLocalStorage('update');
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
            _this.setLocalStorage('update');
        });
    };
}

},{"./get-set-controls":11,"./get-tracker-controls":12,"./schedule-measure":14,"adsr-gain-node":1,"es6-object-assign":3,"get-html-rows-cells":4,"get-set-form-values":5,"load-sample-set":6,"select-element":7,"waaclock":9}],14:[function(require,module,exports){
'use strict';

var adsrGainNode = require('adsr-gain-node');
var WAAClock = require('waaclock');
var getAudioOptions = require('./get-set-controls');
var audioOptions = new getAudioOptions();

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
        var _this2 = this;

        var triggerTime = now + this.scheduleForward;
        this.scheduleMap[beat.cellId] = triggerTime;
        if (beat.enabled) {
            this.eventMap[this.getEventKey(beat)] = this.clock.callbackAtTime(function () {
                _this2.scheduleAudioBeat(beat, triggerTime);
            }, now);
        }
    };

    this.scheduleMap = {};

    this.scheduleAudioBeatNow = function (beat) {
        var _this3 = this;

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
            _this3.scheduleAudioBeat(beat, triggerTime);
        }, now);
    };

    this.interval;
    this.runSchedule = function (bpm) {
        var _this4 = this;

        this.running = true;
        this.bpm = bpm;
        var interval = this.milliPerBeat(bpm);

        setTimeout(function () {
            _this4.schedule();
            _this4.next();
        }, 0);

        this.interval = setInterval(function () {
            _this4.schedule();
            _this4.next();
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
        var values = [];
        $(".cell").each(function () {
            var val = Object.assign({}, this.dataset);
            val.enabled = $(this).hasClass("enabled");
            values.push(val);
        });
        return values;
    };

    this.loadTrackerValues = function (json) {
        $('.cell').removeClass('enabled');
        json.forEach(function (elem) {
            if (elem.enabled === true) {
                var selector = '[data-row-id="' + elem.rowId + '"][data-cell-id="' + elem.cellId + '"]';
                $(selector).addClass("enabled");
            }
        });
    };
}

module.exports = scheduleMeasure;

},{"./get-set-controls":11,"adsr-gain-node":1,"waaclock":9}],15:[function(require,module,exports){
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

},{}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZXM2LW9iamVjdC1hc3NpZ24vaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2V0LWh0bWwtcm93cy1jZWxscy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nZXQtc2V0LWZvcm0tdmFsdWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvYWQtc2FtcGxlLXNldC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9zZWxlY3QtZWxlbWVudC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90aW55LXNhbXBsZS1sb2FkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svbGliL1dBQUNsb2NrLmpzIiwic3JjL2dldC1zZXQtY29udHJvbHMuanMiLCJzcmMvZ2V0LXRyYWNrZXItY29udHJvbHMuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9zY2hlZHVsZS1tZWFzdXJlLmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIEdhaW4oY3R4KSB7XG5cbiAgICB0aGlzLmN0eCA9IGN0eDtcblxuICAgIHRoaXMuc2Vjb25kc1RvVGltZUNvbnN0YW50ID0gZnVuY3Rpb24gKHNlYykge1xuICAgICAgICByZXR1cm4gKHNlYyAqIDIpIC8gODtcbiAgICB9O1xuXG4gICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgICBpbml0R2FpbjogMC4xLCAvLyBJbml0IGdhaW4gb24gbm90ZVxuICAgICAgICBtYXhHYWluOiAxLjAsIC8vIE1heCBnYWluIG9uIG5vdGVcbiAgICAgICAgYXR0YWNrVGltZTogMC4xLCAvLyBBdHRhY2tUaW1lLiBnYWluLmluaXQgdG8gZ2Fpbi5tYXggaW4gYXR0YWNrVGltZVxuICAgICAgICBzdXN0YWluVGltZTogMSwgLy8gU3VzdGFpbiBub3RlIGluIHRpbWVcbiAgICAgICAgcmVsZWFzZVRpbWU6IDEsIC8vIEFwcHJveGltYXRlZCBlbmQgdGltZS4gQ2FsY3VsYXRlZCB3aXRoIHNlY29uZHNUb1RpbWVDb25zdGFudCgpXG4gICAgICAgIC8vIGRpc2Nvbm5lY3Q6IGZhbHNlIC8vIFNob3VsZCB3ZSBhdXRvZGlzY29ubmVjdC4gRGVmYXVsdCBpcyB0cnVlXG4gICAgfTtcblxuICAgIHRoaXMuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2Fpbk5vZGU7XG4gICAgLyoqXG4gICAgICogVGhlIGdhaW5Ob2RlXG4gICAgICogQHBhcmFtIHtmbG9hdH0gYmVnaW4gY3R4IHRpbWVcbiAgICAgKiBAcmV0dXJucyB7R2Fpbi5nZXRHYWluTm9kZS5nYWluTm9kZX1cbiAgICAgKi9cbiAgICB0aGlzLmdldEdhaW5Ob2RlID0gZnVuY3Rpb24gKGJlZ2luKSB7XG5cbiAgICAgICAgdGhpcy5nYWluTm9kZSA9IHRoaXMuY3R4LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlID0gdGhpcy5vcHRpb25zLmluaXRHYWluO1xuXG4gICAgICAgIC8vIEF0dGFjayB0byBtYXhcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnNldFRhcmdldEF0VGltZShcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubWF4R2FpbixcbiAgICAgICAgICAgICAgICBiZWdpbiArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lLFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lKTtcblxuICAgICAgICAvLyBTdXN0YWluIGFuZCBlbmQgbm90ZVxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKFxuICAgICAgICAgICAgICAgIDAuMCxcbiAgICAgICAgICAgICAgICBiZWdpbiArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lICsgdGhpcy5vcHRpb25zLnN1c3RhaW5UaW1lLFxuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kc1RvVGltZUNvbnN0YW50KHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZSkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5kaXNjb25uZWN0ICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0KGJlZ2luKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2Fpbk5vZGU7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUgKyB0aGlzLm9wdGlvbnMucmVsZWFzZVRpbWU7XG4gICAgICAgIFxuICAgICAgICBzZXRUaW1lb3V0KCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmdhaW5Ob2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdG90YWxMZW5ndGggKiAxMDAwKTtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdhaW47IiwiLy8gRnJvbTogaHR0cHM6Ly9kZXYub3BlcmEuY29tL2FydGljbGVzL2RydW0tc291bmRzLXdlYmF1ZGlvL1xuZnVuY3Rpb24gSW5zdHJ1bWVudChjb250ZXh0LCBidWZmZXIpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xufVxuXG5JbnN0cnVtZW50LnByb3RvdHlwZS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICB0aGlzLnNvdXJjZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG59O1xuXG5JbnN0cnVtZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgdGhpcy5zb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlO1xufTtcblxuSW5zdHJ1bWVudC5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdGhpcy5zZXR1cCgpO1xuICAgIHRoaXMuc291cmNlLnN0YXJ0KHRpbWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnN0cnVtZW50O1xuIiwiLyoqXG4gKiBDb2RlIHJlZmFjdG9yZWQgZnJvbSBNb3ppbGxhIERldmVsb3BlciBOZXR3b3JrOlxuICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvT2JqZWN0L2Fzc2lnblxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gYXNzaWduKHRhcmdldCwgZmlyc3RTb3VyY2UpIHtcbiAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkIHx8IHRhcmdldCA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IGZpcnN0IGFyZ3VtZW50IHRvIG9iamVjdCcpO1xuICB9XG5cbiAgdmFyIHRvID0gT2JqZWN0KHRhcmdldCk7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG5leHRTb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgaWYgKG5leHRTb3VyY2UgPT09IHVuZGVmaW5lZCB8fCBuZXh0U291cmNlID09PSBudWxsKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICB2YXIga2V5c0FycmF5ID0gT2JqZWN0LmtleXMoT2JqZWN0KG5leHRTb3VyY2UpKTtcbiAgICBmb3IgKHZhciBuZXh0SW5kZXggPSAwLCBsZW4gPSBrZXlzQXJyYXkubGVuZ3RoOyBuZXh0SW5kZXggPCBsZW47IG5leHRJbmRleCsrKSB7XG4gICAgICB2YXIgbmV4dEtleSA9IGtleXNBcnJheVtuZXh0SW5kZXhdO1xuICAgICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG5leHRTb3VyY2UsIG5leHRLZXkpO1xuICAgICAgaWYgKGRlc2MgIT09IHVuZGVmaW5lZCAmJiBkZXNjLmVudW1lcmFibGUpIHtcbiAgICAgICAgdG9bbmV4dEtleV0gPSBuZXh0U291cmNlW25leHRLZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdG87XG59XG5cbmZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICBpZiAoIU9iamVjdC5hc3NpZ24pIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnYXNzaWduJywge1xuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIHZhbHVlOiBhc3NpZ25cbiAgICB9KTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYXNzaWduOiBhc3NpZ24sXG4gIHBvbHlmaWxsOiBwb2x5ZmlsbFxufTtcbiIsImZ1bmN0aW9uIGdldEhUTUxSb3dzQ2VsbHMobnVtUm93cywgbnVtQ2VsbHMsIGRpdiwgc3Bhbikge1xuICAgIFxuICAgIHZhciBzdHIgPSAnJztcbiAgICBcbiAgICBpZiAoIWRpdikgZGl2ID0gJ3NwYW4nO1xuICAgIGlmICghc3Bhbikgc3BhbiA9J3NwYW4nO1xuICAgIFxuICAgIFxuICAgIGZvciAocm93SUQgPSAwOyByb3dJRCA8IG51bVJvd3M7IHJvd0lEKyspIHtcbiAgICAgICAgc3RyICs9IGA8JHtkaXZ9IGNsYXNzPVwicm93XCIgZGF0YS1pZD1cIiR7cm93SUR9XCI+YDtcbiAgICAgICAgc3RyICs9IGdldENlbGxzKHJvd0lELCBudW1DZWxscywgc3Bhbik7XG4gICAgICAgIHN0ciArPSBgPC8ke2Rpdn0+YDtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gZ2V0Q2VsbHMocm93SUQsIG51bUNlbGxzLCBzcGFuKSB7XG4gICAgdmFyIHN0ciA9ICcnO1xuICAgIGZvciAoYyA9IDA7IGMgPCBudW1DZWxsczsgYysrKSB7XG4gICAgICAgIHN0ciArPSBgPCR7c3Bhbn0gY2xhc3M9XCJjZWxsXCIgZGF0YS1yb3ctaWQ9XCIke3Jvd0lEfVwiIGRhdGEtY2VsbC1pZD1cIiR7Y31cIj48LyR7c3Bhbn0+YDtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn1cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRIVE1MUm93c0NlbGxzO1xuIiwiZnVuY3Rpb24gZ2V0RWxlbUNvdW50QnlOYW1lIChuYW1lKSB7XG4gICAgdmFyIG5hbWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUobmFtZSk7XG4gICAgcmV0dXJuIG5hbWVzLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gZ2V0Rm9ybVZhbHVlcyhmb3JtRWxlbWVudCkge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuICAgICAgICBzd2l0Y2ggKGVsZW0udHlwZSkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2luZ2xlIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgdmFyIG51bUVsZW1zID0gZ2V0RWxlbUNvdW50QnlOYW1lKGVsZW0ubmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKG51bUVsZW1zID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZm9ybVBhcmFtc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTXVsdGlwbGVcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZm9ybVBhcmFtc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBbZWxlbS52YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0ucHVzaChlbGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdFZhbHVlcyA9IGdldFNlbGVjdFZhbHVlcyhlbGVtKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gc2VsZWN0VmFsdWVzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0udmFsdWUgIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZvcm1QYXJhbXM7XG59XG5cbmZ1bmN0aW9uIHNldEZvcm1WYWx1ZXMoZm9ybUVsZW1lbnQsIHZhbHVlcykge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuICAgICAgICBcbiAgICAgICAgaWYgKCAhKGVsZW0ubmFtZSBpbiB2YWx1ZXMpICkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZWxlbS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSA9PT0gZWxlbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0uaW5kZXhPZihlbGVtLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFNlbGVjdFZhbHVlcyhlbGVtLCB2YWx1ZXNbZWxlbS5uYW1lXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS52YWx1ZSA9IHZhbHVlc1tlbGVtLm5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0U2VsZWN0VmFsdWVzKHNlbGVjdEVsZW0sIHZhbHVlcykge1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0RWxlbS5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBvcHRpb25zLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgICAgICBvcHQgPSBvcHRpb25zW2ldO1xuICAgICAgICBpZiAodmFsdWVzLmluZGV4T2Yob3B0LnZhbHVlKSA+IC0xICkge1xuICAgICAgICAgICAgb3B0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICB9ICAgICAgICBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFNlbGVjdFZhbHVlcyhzZWxlY3QpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIG9wdGlvbnMgPSBzZWxlY3QgJiYgc2VsZWN0Lm9wdGlvbnM7XG4gICAgdmFyIG9wdDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcblxuICAgICAgICBpZiAob3B0LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChvcHQudmFsdWUgfHwgb3B0LnRleHQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdldFNldEZvcm1WYWx1ZXMgKCkge1xuICAgIHRoaXMuc2V0ID0gc2V0Rm9ybVZhbHVlcztcbiAgICB0aGlzLmdldCA9IGdldEZvcm1WYWx1ZXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U2V0Rm9ybVZhbHVlcztcbiIsInZhciB0aW55U2FtcGxlTG9hZGVyID0gcmVxdWlyZSgndGlueS1zYW1wbGUtbG9hZGVyJyk7XG52YXIgYXVkaW9CdWZmZXJJbnN0cnVtZW50ID0gcmVxdWlyZSgnYXVkaW8tYnVmZmVyLWluc3RydW1lbnQnKTtcblxuZnVuY3Rpb24gbG9hZFNhbXBsZVNldChjdHgsIGRhdGFVcmwsIGNiKSB7XG4gICAgXG4gICAgZmV0Y2goZGF0YVVybCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyAhPT0gMjAwKSB7ICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb29rcyBsaWtlIHRoZXJlIHdhcyBhIHByb2JsZW0uIFN0YXR1cyBDb2RlOiAnICsgIHJlc3BvbnNlLnN0YXR1cyk7ICBcbiAgICAgICAgICAgIHJldHVybjsgIFxuICAgICAgICB9XG5cbiAgICAgICAgcmVzcG9uc2UuanNvbigpLnRoZW4oZnVuY3Rpb24oZGF0YSkgeyAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBiYXNlVXJsID0gZGF0YS5zYW1wbGVzO1xuICAgICAgICAgICAgdmFyIGJ1ZmZlcnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlcyA9IFtdO1xuXG4gICAgICAgICAgICBkYXRhLmZpbGVuYW1lID0gW107XG4gICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICBkYXRhLmZpbGVzLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgIHZhciBmaWxlbmFtZSA9IHZhbC5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIik7XG4gICAgICAgICAgICAgICAgZGF0YS5maWxlbmFtZS5wdXNoKGZpbGVuYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVtb3RlVXJsID0gYmFzZVVybCArIHZhbDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsZXQgbG9hZGVyUHJvbWlzZSA9IHRpbnlTYW1wbGVMb2FkZXIocmVtb3RlVXJsLCBjdHgsIChidWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyc1tmaWxlbmFtZV0gPSBuZXcgYXVkaW9CdWZmZXJJbnN0cnVtZW50KGN0eCwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKGxvYWRlclByb21pc2UpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKHZhbHVlcyA9PiB7IFxuICAgICAgICAgICAgICAgIGNiKGRhdGEsIGJ1ZmZlcnMpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIH0pOyAgICBcbiAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHsgIFxuICAgICAgICBjb25zb2xlLmxvZygnRmV0Y2ggRXJyb3IgOi1TJywgZXJyKTsgIFxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvYWRTYW1wbGVTZXQ7IiwiZnVuY3Rpb24gc2VsZWN0RWxlbWVudChhcHBlbmRUb0lELCBzZWxlY3RJRCwgb3B0aW9ucywgc2VsZWN0ZWQpIHtcblxuICAgIHRoaXMuYXBwZW5kVG9JRCA9IGFwcGVuZFRvSUQ7XG4gICAgdGhpcy5zZWxlY3RJRCA9IHNlbGVjdElEO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuICAgIFxuICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcHBlbmRUb0lEID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpO1xuICAgICAgICBzZWxlY3RMaXN0LmlkID0gdGhpcy5zZWxlY3RJRDsgICAgICAgIFxuICAgICAgICBhcHBlbmRUb0lELmFwcGVuZENoaWxkKHNlbGVjdExpc3QpO1xuICAgICAgICB0aGlzLnVwZGF0ZShzZWxlY3RJRCwgdGhpcy5vcHRpb25zLCB0aGlzLnNlbGVjdGVkKTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGVsZW0sIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG4gICAgICAgIHRoaXMuZGVsZXRlKGVsZW0pO1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICBvcHRpb24udmFsdWUgPSBrZXk7XG4gICAgICAgICAgICBvcHRpb24udGV4dCA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIHNlbGVjdExpc3QuYXBwZW5kQ2hpbGQob3B0aW9uKTtcblxuICAgICAgICAgICAgaWYgKGtleSA9PT0gc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb24uc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNlbGVjdGVkID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgdmFyIG9wdDtcbiAgICAgICAgZm9yICggdmFyIGkgPSAwLCBsZW4gPSBzZWxlY3RMaXN0Lm9wdGlvbnMubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XG4gICAgICAgICAgICBvcHQgPSBzZWxlY3RMaXN0Lm9wdGlvbnNbaV07XG4gICAgICAgICAgICBpZiAoIG9wdC5zZWxlY3RlZCA9PT0gdHJ1ZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0LnZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3Q9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIGZvciAodmFyIG9wdGlvbiBpbiBzZWxlY3RMaXN0KXtcbiAgICAgICAgICAgIHNlbGVjdExpc3QucmVtb3ZlKG9wdGlvbik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0QXNTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIGVsZW1lbnRIdG1sID0gZWxlbWVudC5vdXRlckhUTUw7XG4gICAgICAgIHJldHVybiBlbGVtZW50SHRtbDtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdEVsZW1lbnQ7IiwiZnVuY3Rpb24gc2FtcGxlTG9hZGVyICh1cmwsIGNvbnRleHQsIGNhbGxiYWNrKSB7XG4gICAgXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIFxuICAgICAgICByZXF1ZXN0Lm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZihyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKXtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoJ3NhbXBsZUxvYWRlciByZXF1ZXN0IHN1Y2Nlc3MnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdzYW1wbGVMb2FkZXIgcmVxdWVzdCBmYWlsZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNhbXBsZUxvYWRlcjsiLCJ2YXIgV0FBQ2xvY2sgPSByZXF1aXJlKCcuL2xpYi9XQUFDbG9jaycpXG5cbm1vZHVsZS5leHBvcnRzID0gV0FBQ2xvY2tcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgd2luZG93LldBQUNsb2NrID0gV0FBQ2xvY2tcbiIsInZhciBpc0Jyb3dzZXIgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG5cbnZhciBDTE9DS19ERUZBVUxUUyA9IHtcbiAgdG9sZXJhbmNlTGF0ZTogMC4xMCxcbiAgdG9sZXJhbmNlRWFybHk6IDAuMDAxXG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IEV2ZW50ID09PT09PT09PT09PT09PT09PT09IC8vXG52YXIgRXZlbnQgPSBmdW5jdGlvbihjbG9jaywgZGVhZGxpbmUsIGZ1bmMpIHtcbiAgdGhpcy5jbG9jayA9IGNsb2NrXG4gIHRoaXMuZnVuYyA9IGZ1bmNcbiAgdGhpcy5fY2xlYXJlZCA9IGZhbHNlIC8vIEZsYWcgdXNlZCB0byBjbGVhciBhbiBldmVudCBpbnNpZGUgY2FsbGJhY2tcblxuICB0aGlzLnRvbGVyYW5jZUxhdGUgPSBjbG9jay50b2xlcmFuY2VMYXRlXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBjbG9jay50b2xlcmFuY2VFYXJseVxuICB0aGlzLl9sYXRlc3RUaW1lID0gbnVsbFxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSBudWxsXG4gIHRoaXMuZGVhZGxpbmUgPSBudWxsXG4gIHRoaXMucmVwZWF0VGltZSA9IG51bGxcblxuICB0aGlzLnNjaGVkdWxlKGRlYWRsaW5lKVxufVxuXG4vLyBVbnNjaGVkdWxlcyB0aGUgZXZlbnRcbkV2ZW50LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICB0aGlzLl9jbGVhcmVkID0gdHJ1ZVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBTZXRzIHRoZSBldmVudCB0byByZXBlYXQgZXZlcnkgYHRpbWVgIHNlY29uZHMuXG5FdmVudC5wcm90b3R5cGUucmVwZWF0ID0gZnVuY3Rpb24odGltZSkge1xuICBpZiAodGltZSA9PT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2RlbGF5IGNhbm5vdCBiZSAwJylcbiAgdGhpcy5yZXBlYXRUaW1lID0gdGltZVxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSlcbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gU2V0cyB0aGUgdGltZSB0b2xlcmFuY2Ugb2YgdGhlIGV2ZW50LlxuLy8gVGhlIGV2ZW50IHdpbGwgYmUgZXhlY3V0ZWQgaW4gdGhlIGludGVydmFsIGBbZGVhZGxpbmUgLSBlYXJseSwgZGVhZGxpbmUgKyBsYXRlXWBcbi8vIElmIHRoZSBjbG9jayBmYWlscyB0byBleGVjdXRlIHRoZSBldmVudCBpbiB0aW1lLCB0aGUgZXZlbnQgd2lsbCBiZSBkcm9wcGVkLlxuRXZlbnQucHJvdG90eXBlLnRvbGVyYW5jZSA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICBpZiAodHlwZW9mIHZhbHVlcy5sYXRlID09PSAnbnVtYmVyJylcbiAgICB0aGlzLnRvbGVyYW5jZUxhdGUgPSB2YWx1ZXMubGF0ZVxuICBpZiAodHlwZW9mIHZhbHVlcy5lYXJseSA9PT0gJ251bWJlcicpXG4gICAgdGhpcy50b2xlcmFuY2VFYXJseSA9IHZhbHVlcy5lYXJseVxuICB0aGlzLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMoKVxuICBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBldmVudCBpcyByZXBlYXRlZCwgZmFsc2Ugb3RoZXJ3aXNlXG5FdmVudC5wcm90b3R5cGUuaXNSZXBlYXRlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yZXBlYXRUaW1lICE9PSBudWxsIH1cblxuLy8gU2NoZWR1bGVzIHRoZSBldmVudCB0byBiZSByYW4gYmVmb3JlIGBkZWFkbGluZWAuXG4vLyBJZiB0aGUgdGltZSBpcyB3aXRoaW4gdGhlIGV2ZW50IHRvbGVyYW5jZSwgd2UgaGFuZGxlIHRoZSBldmVudCBpbW1lZGlhdGVseS5cbi8vIElmIHRoZSBldmVudCB3YXMgYWxyZWFkeSBzY2hlZHVsZWQgYXQgYSBkaWZmZXJlbnQgdGltZSwgaXQgaXMgcmVzY2hlZHVsZWQuXG5FdmVudC5wcm90b3R5cGUuc2NoZWR1bGUgPSBmdW5jdGlvbihkZWFkbGluZSkge1xuICB0aGlzLl9jbGVhcmVkID0gZmFsc2VcbiAgdGhpcy5kZWFkbGluZSA9IGRlYWRsaW5lXG4gIHRoaXMuX3JlZnJlc2hFYXJseUxhdGVEYXRlcygpXG5cbiAgaWYgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA+PSB0aGlzLl9lYXJsaWVzdFRpbWUpIHtcbiAgICB0aGlzLl9leGVjdXRlKClcbiAgXG4gIH0gZWxzZSBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIFxuICB9IGVsc2UgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbn1cblxuRXZlbnQucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgcmF0aW8pIHtcbiAgaWYgKHRoaXMuaXNSZXBlYXRlZCgpKVxuICAgIHRoaXMucmVwZWF0VGltZSA9IHRoaXMucmVwZWF0VGltZSAqIHJhdGlvXG5cbiAgdmFyIGRlYWRsaW5lID0gdFJlZiArIHJhdGlvICogKHRoaXMuZGVhZGxpbmUgLSB0UmVmKVxuICAvLyBJZiB0aGUgZGVhZGxpbmUgaXMgdG9vIGNsb3NlIG9yIHBhc3QsIGFuZCB0aGUgZXZlbnQgaGFzIGEgcmVwZWF0LFxuICAvLyB3ZSBjYWxjdWxhdGUgdGhlIG5leHQgcmVwZWF0IHBvc3NpYmxlIGluIHRoZSBzdHJldGNoZWQgc3BhY2UuXG4gIGlmICh0aGlzLmlzUmVwZWF0ZWQoKSkge1xuICAgIHdoaWxlICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPj0gZGVhZGxpbmUgLSB0aGlzLnRvbGVyYW5jZUVhcmx5KVxuICAgICAgZGVhZGxpbmUgKz0gdGhpcy5yZXBlYXRUaW1lXG4gIH1cbiAgdGhpcy5zY2hlZHVsZShkZWFkbGluZSlcbn1cblxuLy8gRXhlY3V0ZXMgdGhlIGV2ZW50XG5FdmVudC5wcm90b3R5cGUuX2V4ZWN1dGUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY2xvY2suX3N0YXJ0ZWQgPT09IGZhbHNlKSByZXR1cm5cbiAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcblxuICBpZiAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lIDwgdGhpcy5fbGF0ZXN0VGltZSlcbiAgICB0aGlzLmZ1bmModGhpcylcbiAgZWxzZSB7XG4gICAgaWYgKHRoaXMub25leHBpcmVkKSB0aGlzLm9uZXhwaXJlZCh0aGlzKVxuICAgIGNvbnNvbGUud2FybignZXZlbnQgZXhwaXJlZCcpXG4gIH1cbiAgLy8gSW4gdGhlIGNhc2UgYHNjaGVkdWxlYCBpcyBjYWxsZWQgaW5zaWRlIGBmdW5jYCwgd2UgbmVlZCB0byBhdm9pZFxuICAvLyBvdmVycndyaXRpbmcgd2l0aCB5ZXQgYW5vdGhlciBgc2NoZWR1bGVgLlxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpICYmIHRoaXMuaXNSZXBlYXRlZCgpICYmICF0aGlzLl9jbGVhcmVkKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSkgXG59XG5cbi8vIFVwZGF0ZXMgY2FjaGVkIHRpbWVzXG5FdmVudC5wcm90b3R5cGUuX3JlZnJlc2hFYXJseUxhdGVEYXRlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9sYXRlc3RUaW1lID0gdGhpcy5kZWFkbGluZSArIHRoaXMudG9sZXJhbmNlTGF0ZVxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSB0aGlzLmRlYWRsaW5lIC0gdGhpcy50b2xlcmFuY2VFYXJseVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBXQUFDbG9jayA9PT09PT09PT09PT09PT09PT09PSAvL1xudmFyIFdBQUNsb2NrID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICBvcHRzID0gb3B0cyB8fCB7fVxuICB0aGlzLnRpY2tNZXRob2QgPSBvcHRzLnRpY2tNZXRob2QgfHwgJ1NjcmlwdFByb2Nlc3Nvck5vZGUnXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBvcHRzLnRvbGVyYW5jZUVhcmx5IHx8IENMT0NLX0RFRkFVTFRTLnRvbGVyYW5jZUVhcmx5XG4gIHRoaXMudG9sZXJhbmNlTGF0ZSA9IG9wdHMudG9sZXJhbmNlTGF0ZSB8fCBDTE9DS19ERUZBVUxUUy50b2xlcmFuY2VMYXRlXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHRcbiAgdGhpcy5fZXZlbnRzID0gW11cbiAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlXG59XG5cbi8vIC0tLS0tLS0tLS0gUHVibGljIEFQSSAtLS0tLS0tLS0tIC8vXG4vLyBTY2hlZHVsZXMgYGZ1bmNgIHRvIHJ1biBhZnRlciBgZGVsYXlgIHNlY29uZHMuXG5XQUFDbG9jay5wcm90b3R5cGUuc2V0VGltZW91dCA9IGZ1bmN0aW9uKGZ1bmMsIGRlbGF5KSB7XG4gIHJldHVybiB0aGlzLl9jcmVhdGVFdmVudChmdW5jLCB0aGlzLl9hYnNUaW1lKGRlbGF5KSlcbn1cblxuLy8gU2NoZWR1bGVzIGBmdW5jYCB0byBydW4gYmVmb3JlIGBkZWFkbGluZWAuXG5XQUFDbG9jay5wcm90b3R5cGUuY2FsbGJhY2tBdFRpbWUgPSBmdW5jdGlvbihmdW5jLCBkZWFkbGluZSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRXZlbnQoZnVuYywgZGVhZGxpbmUpXG59XG5cbi8vIFN0cmV0Y2hlcyBgZGVhZGxpbmVgIGFuZCBgcmVwZWF0YCBvZiBhbGwgc2NoZWR1bGVkIGBldmVudHNgIGJ5IGByYXRpb2AsIGtlZXBpbmdcbi8vIHRoZWlyIHJlbGF0aXZlIGRpc3RhbmNlIHRvIGB0UmVmYC4gSW4gZmFjdCB0aGlzIGlzIGVxdWl2YWxlbnQgdG8gY2hhbmdpbmcgdGhlIHRlbXBvLlxuV0FBQ2xvY2sucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgZXZlbnRzLCByYXRpbykge1xuICBldmVudHMuZm9yRWFjaChmdW5jdGlvbihldmVudCkgeyBldmVudC50aW1lU3RyZXRjaCh0UmVmLCByYXRpbykgfSlcbiAgcmV0dXJuIGV2ZW50c1xufVxuXG4vLyBSZW1vdmVzIGFsbCBzY2hlZHVsZWQgZXZlbnRzIGFuZCBzdGFydHMgdGhlIGNsb2NrIFxuV0FBQ2xvY2sucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9zdGFydGVkID09PSBmYWxzZSkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHRoaXMuX3N0YXJ0ZWQgPSB0cnVlXG4gICAgdGhpcy5fZXZlbnRzID0gW11cblxuICAgIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdTY3JpcHRQcm9jZXNzb3JOb2RlJykge1xuICAgICAgdmFyIGJ1ZmZlclNpemUgPSAyNTZcbiAgICAgIC8vIFdlIGhhdmUgdG8ga2VlcCBhIHJlZmVyZW5jZSB0byB0aGUgbm9kZSB0byBhdm9pZCBnYXJiYWdlIGNvbGxlY3Rpb25cbiAgICAgIHRoaXMuX2Nsb2NrTm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgMSwgMSlcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbilcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHsgc2VsZi5fdGljaygpIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdtYW51YWwnKSBudWxsIC8vIF90aWNrIGlzIGNhbGxlZCBtYW51YWxseVxuXG4gICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgdGlja01ldGhvZCAnICsgdGhpcy50aWNrTWV0aG9kKVxuICB9XG59XG5cbi8vIFN0b3BzIHRoZSBjbG9ja1xuV0FBQ2xvY2sucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3N0YXJ0ZWQgPT09IHRydWUpIHtcbiAgICB0aGlzLl9zdGFydGVkID0gZmFsc2VcbiAgICB0aGlzLl9jbG9ja05vZGUuZGlzY29ubmVjdCgpXG4gIH0gIFxufVxuXG4vLyAtLS0tLS0tLS0tIFByaXZhdGUgLS0tLS0tLS0tLSAvL1xuXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIHJhbiBwZXJpb2RpY2FsbHksIGFuZCBhdCBlYWNoIHRpY2sgaXQgZXhlY3V0ZXNcbi8vIGV2ZW50cyBmb3Igd2hpY2ggYGN1cnJlbnRUaW1lYCBpcyBpbmNsdWRlZCBpbiB0aGVpciB0b2xlcmFuY2UgaW50ZXJ2YWwuXG5XQUFDbG9jay5wcm90b3R5cGUuX3RpY2sgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGV2ZW50ID0gdGhpcy5fZXZlbnRzLnNoaWZ0KClcblxuICB3aGlsZShldmVudCAmJiBldmVudC5fZWFybGllc3RUaW1lIDw9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZSkge1xuICAgIGV2ZW50Ll9leGVjdXRlKClcbiAgICBldmVudCA9IHRoaXMuX2V2ZW50cy5zaGlmdCgpXG4gIH1cblxuICAvLyBQdXQgYmFjayB0aGUgbGFzdCBldmVudFxuICBpZihldmVudCkgdGhpcy5fZXZlbnRzLnVuc2hpZnQoZXZlbnQpXG59XG5cbi8vIENyZWF0ZXMgYW4gZXZlbnQgYW5kIGluc2VydCBpdCB0byB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9jcmVhdGVFdmVudCA9IGZ1bmN0aW9uKGZ1bmMsIGRlYWRsaW5lKSB7XG4gIHJldHVybiBuZXcgRXZlbnQodGhpcywgZGVhZGxpbmUsIGZ1bmMpXG59XG5cbi8vIEluc2VydHMgYW4gZXZlbnQgdG8gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5faW5zZXJ0RXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLl9ldmVudHMuc3BsaWNlKHRoaXMuX2luZGV4QnlUaW1lKGV2ZW50Ll9lYXJsaWVzdFRpbWUpLCAwLCBldmVudClcbn1cblxuLy8gUmVtb3ZlcyBhbiBldmVudCBmcm9tIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX3JlbW92ZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGluZCA9IHRoaXMuX2V2ZW50cy5pbmRleE9mKGV2ZW50KVxuICBpZiAoaW5kICE9PSAtMSkgdGhpcy5fZXZlbnRzLnNwbGljZShpbmQsIDEpXG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiBgZXZlbnRgIGlzIGluIHF1ZXVlLCBmYWxzZSBvdGhlcndpc2VcbldBQUNsb2NrLnByb3RvdHlwZS5faGFzRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuIHJldHVybiB0aGlzLl9ldmVudHMuaW5kZXhPZihldmVudCkgIT09IC0xXG59XG5cbi8vIFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBldmVudCB3aG9zZSBkZWFkbGluZSBpcyA+PSB0byBgZGVhZGxpbmVgXG5XQUFDbG9jay5wcm90b3R5cGUuX2luZGV4QnlUaW1lID0gZnVuY3Rpb24oZGVhZGxpbmUpIHtcbiAgLy8gcGVyZm9ybXMgYSBiaW5hcnkgc2VhcmNoXG4gIHZhciBsb3cgPSAwXG4gICAgLCBoaWdoID0gdGhpcy5fZXZlbnRzLmxlbmd0aFxuICAgICwgbWlkXG4gIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgbWlkID0gTWF0aC5mbG9vcigobG93ICsgaGlnaCkgLyAyKVxuICAgIGlmICh0aGlzLl9ldmVudHNbbWlkXS5fZWFybGllc3RUaW1lIDwgZGVhZGxpbmUpXG4gICAgICBsb3cgPSBtaWQgKyAxXG4gICAgZWxzZSBoaWdoID0gbWlkXG4gIH1cbiAgcmV0dXJuIGxvd1xufVxuXG4vLyBDb252ZXJ0cyBmcm9tIHJlbGF0aXZlIHRpbWUgdG8gYWJzb2x1dGUgdGltZVxuV0FBQ2xvY2sucHJvdG90eXBlLl9hYnNUaW1lID0gZnVuY3Rpb24ocmVsVGltZSkge1xuICByZXR1cm4gcmVsVGltZSArIHRoaXMuY29udGV4dC5jdXJyZW50VGltZVxufVxuXG4vLyBDb252ZXJ0cyBmcm9tIGFic29sdXRlIHRpbWUgdG8gcmVsYXRpdmUgdGltZSBcbldBQUNsb2NrLnByb3RvdHlwZS5fcmVsVGltZSA9IGZ1bmN0aW9uKGFic1RpbWUpIHtcbiAgcmV0dXJuIGFic1RpbWUgLSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWVcbn0iLCJjb25zdCBnZXRDb250cm9sVmFsdWVzID0gcmVxdWlyZSgnLi9nZXQtdHJhY2tlci1jb250cm9scycpO1xuXG5cbmZ1bmN0aW9uIGdldEF1ZGlvT3B0aW9ucygpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBnZXRDb250cm9sVmFsdWVzKCk7XG4gICAgdGhpcy5nZXRPcHRpb25zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZ2V0Q29udHJvbFZhbHVlcygpO1xuICAgIH07XG4gICAgdGhpcy5zZXRPcHRpb25zID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICBpZiAoIXZhbHVlcykge1xuICAgICAgICAgICAgdmFsdWVzID0gZ2V0Q29udHJvbFZhbHVlcygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHZhbHVlcztcbiAgICB9OyAgXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0QXVkaW9PcHRpb25zO1xuIiwiY29uc3QgZ2V0U2V0Rm9ybVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1zZXQtZm9ybS12YWx1ZXMnKTtcblxuLyoqXG4gKiBHZXQgYWxsIHRyYWNrZXIgdmFsdWVzIGZyb20gSFRNTFxuICogQHJldHVybnMge29iamVjdH1cbiAqL1xuZnVuY3Rpb24gZ2V0VHJhY2tlckNvbnRyb2xzKCkge1xuICAgIGxldCBmb3JtVmFsdWVzID0gbmV3IGdldFNldEZvcm1WYWx1ZXMoKTtcbiAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuICAgIGxldCB2YWx1ZXMgPSBmb3JtVmFsdWVzLmdldChmb3JtKTtcbiAgICBcbiAgICBsZXQgcmV0ID0ge307XG4gICAgZm9yIChsZXQga2V5IGluIHZhbHVlcykge1xuICAgICAgICBcbiAgICAgICAgaWYgKGtleSA9PT0gJ2RlbGF5RW5hYmxlZCcpIHtcbiAgICAgICAgICAgIHJldFtrZXldID0gJ3RydWUnO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChrZXkgPT09ICdzYW1wbGVTZXQnKSB7IFxuICAgICAgICAgICAgcmV0W2tleV0gPSB2YWx1ZXNba2V5XTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldFtrZXldID0gcGFyc2VGbG9hdCh2YWx1ZXNba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0VHJhY2tlckNvbnRyb2xzO1xuIiwicmVxdWlyZSgnZXM2LW9iamVjdC1hc3NpZ24nKS5wb2x5ZmlsbCgpO1xuXG5jb25zdCBhZHNyR2Fpbk5vZGUgPSByZXF1aXJlKCdhZHNyLWdhaW4tbm9kZScpO1xuY29uc3QgZ2V0SHRtbFJvd3NDZWxscyA9IHJlcXVpcmUoJ2dldC1odG1sLXJvd3MtY2VsbHMnKTtcbmNvbnN0IFdBQUNsb2NrID0gcmVxdWlyZSgnd2FhY2xvY2snKTtcbmNvbnN0IGxvYWRTYW1wbGVTZXQgPSByZXF1aXJlKCdsb2FkLXNhbXBsZS1zZXQnKTtcbmNvbnN0IGdldENvbnRyb2xWYWx1ZXMgPSByZXF1aXJlKCcuL2dldC10cmFja2VyLWNvbnRyb2xzJyk7XG5jb25zdCBnZXRBdWRpb09wdGlvbnMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IHNjaGVkdWxlTWVhc3VyZSA9IHJlcXVpcmUoJy4vc2NoZWR1bGUtbWVhc3VyZScpO1xuY29uc3Qgc2VsZWN0RWxlbWVudCA9IHJlcXVpcmUoJ3NlbGVjdC1lbGVtZW50Jyk7XG5jb25zdCBnZXRTZXRGb3JtVmFsdWVzID0gcmVxdWlyZSgnZ2V0LXNldC1mb3JtLXZhbHVlcycpO1xuY29uc3QgYXVkaW9PcHRpb25zID0gbmV3IGdldEF1ZGlvT3B0aW9ucygpO1xuY29uc3QgY3R4ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuXG52YXIgbWVhc3VyZUxlbmd0aCA9IDE2O1xudmFyIGRhdGFVcmwgPSBcImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9vcmFtaWNzL3NhbXBsZWQvbWFzdGVyL0RNL0NSLTc4L3NhbXBsZWQuaW5zdHJ1bWVudC5qc29uXCI7XG52YXIgYnVmZmVycztcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIGRhdGFVcmwsIHRyYWNrKSB7XG4gICAgXG4gICAgbG9hZFNhbXBsZVNldChjdHgsIGRhdGFVcmwsIGZ1bmN0aW9uIChzYW1wbGVEYXRhLCBzYW1wbGVCdWZmZXJzKSB7XG4gICAgICAgIGJ1ZmZlcnMgPSBzYW1wbGVCdWZmZXJzO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0cmFjaykge1xuICAgICAgICAgICAgdHJhY2sgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgIH0gXG4gICAgICAgIHNldHVwVHJhY2tlckh0bWwoc2FtcGxlRGF0YSk7ICAgIFxuICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjaylcbiAgICAgICAgc2V0dXBFdmVudHMoKTtcbiAgICB9KTtcbn1cblxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkZWZhdWx0QmVhdCA9IFt7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTBcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTBcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTBcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTBcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEyXCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjEyXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEyXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTNcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTNcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNVwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNVwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9XVxuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCBkZWZhdWx0QmVhdCk7XG4gICAgc2V0dXBCYXNlRXZlbnRzKCk7XG4gICAgdmFyIHN0b3JhZ2UgPSBuZXcgdHJhY2tzTG9jYWxTdG9yYWdlKCk7XG4gICAgc3RvcmFnZS5zZXR1cFN0b3JhZ2UoKTtcbn07XG5cbnZhciBpbnN0cnVtZW50RGF0YSA9IHt9O1xuZnVuY3Rpb24gc2V0dXBUcmFja2VySHRtbChkYXRhKSB7XG4gICAgaW5zdHJ1bWVudERhdGEgPSBkYXRhO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlclwiKS5pbm5lckhUTUwgPSAnJztcbiAgICB2YXIgc3RyID0gZ2V0SHRtbFJvd3NDZWxscyhkYXRhLmZpbGVuYW1lLmxlbmd0aCwgbWVhc3VyZUxlbmd0aCwgJ3RyJywgJ3RkJyk7XG4gICAgdmFyIHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndHJhY2tlcicpO1xuICAgIHQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdhZnRlcmJlZ2luJywgc3RyKTtcbiAgICBcbn1cblxuZnVuY3Rpb24gZGlzY29ubmVjdE5vZGUobm9kZSwgb3B0aW9ucykge1xuICAgIGxldCB0b3RhbExlbmd0aCA9XG4gICAgICAgICAgICBvcHRpb25zLmF0dGFja1RpbWUgKyBvcHRpb25zLnN1c3RhaW5UaW1lICsgb3B0aW9ucy5yZWxlYXNlVGltZTtcblxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBub2RlLmRpc2Nvbm5lY3QoKTtcbiAgICB9LCB0b3RhbExlbmd0aCAqIDEwMDApO1xufVxuXG5mdW5jdGlvbiBzY2hlZHVsZUF1ZGlvQmVhdChiZWF0LCB0cmlnZ2VyVGltZSkge1xuICAgIFxuICAgIGxldCBpbnN0cnVtZW50TmFtZSA9IGluc3RydW1lbnREYXRhLmZpbGVuYW1lW2JlYXQucm93SWRdO1xuICAgIGxldCBpbnN0cnVtZW50ID0gYnVmZmVyc1tpbnN0cnVtZW50TmFtZV0uZ2V0KCk7XG5cbiAgICBmdW5jdGlvbiBjb25uZWN0RGVsYXkoaW5zdHJ1bWVudCkge1xuXG4gICAgICAgIC8vIFdpdGggc3VzdGFpbiBhbmQgZmVlZGJhY2sgZmlsdGVyXG4gICAgICAgIGxldCBkZWxheSA9IGN0eC5jcmVhdGVEZWxheSgpO1xuICAgICAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBhdWRpb09wdGlvbnMub3B0aW9ucy5kZWxheTtcblxuICAgICAgICBsZXQgZ2FpbiA9IG5ldyBhZHNyR2Fpbk5vZGUoY3R4KTtcbiAgICAgICAgZ2Fpbi5zZXRPcHRpb25zKGF1ZGlvT3B0aW9ucy5nZXRPcHRpb25zKCkpO1xuICAgICAgICBsZXQgZmVlZGJhY2tHYWluID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG5cblxuICAgICAgICBsZXQgZmlsdGVyID0gY3R4LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICBmaWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gYXVkaW9PcHRpb25zLm9wdGlvbnMuZmlsdGVyO1xuXG4gICAgICAgIC8vIGRlbGF5IC0+IGZlZWRiYWNrXG4gICAgICAgIGRlbGF5LmNvbm5lY3QoZmVlZGJhY2tHYWluKTtcbiAgICAgICAgZGlzY29ubmVjdE5vZGUoZGVsYXksIGF1ZGlvT3B0aW9ucy5nZXRPcHRpb25zKCkpO1xuXG4gICAgICAgIC8vIGZlZWRiYWNrIC0+IGZpbHRlclxuICAgICAgICBmZWVkYmFja0dhaW4uY29ubmVjdChmaWx0ZXIpO1xuXG4gICAgICAgIC8vIGZpbHRlciAtPmRlbGF5XG4gICAgICAgIGZpbHRlci5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICBpbnN0cnVtZW50LmRldHVuZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRldHVuZTtcblxuICAgICAgICAvLyBkZWxheSAtPiBpbnN0cnVtZW50XG4gICAgICAgIGluc3RydW1lbnQuY29ubmVjdChkZWxheSk7XG5cbiAgICAgICAgLy8gSW5zdHJ1bWVudCAtPlxuICAgICAgICBpbnN0cnVtZW50LmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAvLyBEZWxheSAtPlxuICAgICAgICBkZWxheS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5zdGFydCh0cmlnZ2VyVGltZSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb25uZWN0Q2xlYW4oaW5zdHJ1bWVudCkge1xuICAgICAgICAvLyBUcmlnZ2VyIHRvbmVcbiAgICAgICAgbGV0IGdhaW4gPSBuZXcgYWRzckdhaW5Ob2RlKGN0eCk7XG4gICAgICAgIGdhaW4uc2V0T3B0aW9ucyhhdWRpb09wdGlvbnMuZ2V0T3B0aW9ucygpKTtcbiAgICAgICAgbGV0IGdhaW5Ob2RlID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5kZXR1bmUudmFsdWUgPSBhdWRpb09wdGlvbnMub3B0aW9ucy5kZXR1bmU7XG4gICAgICAgIC8vIGluc3RydW1lbnQgLT4gZ2FpblxuICAgICAgICBcbiAgICAgICAgaW5zdHJ1bWVudC5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgZ2Fpbk5vZGUuY29ubmVjdChjdHguZGVzdGluYXRpb24pO1xuXG4gICAgICAgIGluc3RydW1lbnQuc3RhcnQodHJpZ2dlclRpbWUpO1xuICAgIH1cblxuICAgIGlmIChhdWRpb09wdGlvbnMub3B0aW9ucy5kZWxheUVuYWJsZWQpIHtcbiAgICAgICAgY29ubmVjdERlbGF5KGluc3RydW1lbnQpXG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29ubmVjdENsZWFuKGluc3RydW1lbnQpO1xuICAgIH1cbn1cblxudmFyIHNjaGVkdWxlID0gbmV3IHNjaGVkdWxlTWVhc3VyZShjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KTtcblxuZnVuY3Rpb24gc2V0dXBCYXNlRXZlbnRzICgpIHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICBzY2hlZHVsZS5ydW5TY2hlZHVsZShhdWRpb09wdGlvbnMub3B0aW9ucy5icG0pO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhdXNlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7IFxuICAgIH0pO1xuICAgIFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgIHNjaGVkdWxlID0gbmV3IHNjaGVkdWxlTWVhc3VyZShjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KTtcbiAgICB9KTtcbiAgICBcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnBtJykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgYXVkaW9PcHRpb25zLnNldE9wdGlvbnMoKTtcbiAgICAgICAgaWYgKHNjaGVkdWxlLnJ1bm5pbmcpIHtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnJ1blNjaGVkdWxlKGF1ZGlvT3B0aW9ucy5vcHRpb25zLmJwbSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICBcbiAgICAkKCcuYmFzZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGF1ZGlvT3B0aW9ucy5zZXRPcHRpb25zKCk7XG4gICAgfSk7XG59XG4gICAgXG5mdW5jdGlvbiBzZXR1cEV2ZW50cygpIHtcbiAgICBcbiAgICAkKCcuY2VsbCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmRhdGFzZXQpO1xuICAgICAgICB2YWwuZW5hYmxlZCA9ICQodGhpcykuaGFzQ2xhc3MoXCJlbmFibGVkXCIpO1xuXG4gICAgICAgIGxldCBjdXJyZW50QmVhdCA9ICQoJy5jdXJyZW50JykuZGF0YSgnY2VsbC1pZCcpO1xuICAgICAgICBpZiAodmFsLmNlbGxJZCA+IGN1cnJlbnRCZWF0KSB7XG4gICAgICAgICAgICBzY2hlZHVsZS5zY2hlZHVsZUF1ZGlvQmVhdE5vdyh2YWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCh0aGlzKS50b2dnbGVDbGFzcygnZW5hYmxlZCcpO1xuICAgIH0pO1xufVxuXG4kKCcjc2FtcGxlU2V0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdGhpcy52YWx1ZSk7XG59KTtcblxuXG5cbmZ1bmN0aW9uIHRyYWNrc0xvY2FsU3RvcmFnZSAoKSB7XG5cbiAgICB0aGlzLnNldExvY2FsU3RvcmFnZSA9IGZ1bmN0aW9uKHVwZGF0ZSkge1xuICAgICAgICB2YXIgc3RvcmFnZSA9IHt9O1xuICAgICAgICBzdG9yYWdlWydTZWxlY3QnXSA9ICdTZWxlY3QnO1xuXG5cbiAgICAgICAgZm9yICggdmFyIGkgPSAwLCBsZW4gPSBsb2NhbFN0b3JhZ2UubGVuZ3RoOyBpIDwgbGVuOyArK2kgKSB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IGxvY2FsU3RvcmFnZS5rZXkoaSk7XG4gICAgICAgICAgICBzdG9yYWdlW2l0ZW1dID0gaXRlbTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBzZWxlY3QgZWxlbWVudFxuICAgICAgICB2YXIgcyA9IG5ldyBzZWxlY3RFbGVtZW50KFxuICAgICAgICAgICAgJ2xvYWQtc3RvcmFnZScsIC8vIGlkIHRvIGFwcGVuZCB0aGUgc2VsZWN0IGxpc3QgdG9cbiAgICAgICAgICAgICdiZWF0LWxpc3QnLCAvLyBpZCBvZiB0aGUgc2VsZWN0IGxpc3RcbiAgICAgICAgICAgIHN0b3JhZ2UgLy9cbiAgICAgICAgKTtcblxuICAgICAgICBpZiAodXBkYXRlKSB7XG4gICAgICAgICAgICBzLnVwZGF0ZSgnYmVhdC1saXN0Jywgc3RvcmFnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzLmNyZWF0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuc2V0dXBTdG9yYWdlID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBmb3JtRGF0YSA9IGdldENvbnRyb2xWYWx1ZXMoKTtcbiAgICAgICAgICAgIGxldCBmaWxlbmFtZSA9ICQoJyNmaWxlbmFtZScpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICAgICAgICAgIGZpbGVuYW1lID0gJ3VudGl0bGVkJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGJlYXQgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgc29uZyA9IHtcImJlYXRcIjogYmVhdCwgXCJzZXR0aW5nc1wiOiBmb3JtRGF0YX1cblxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oZmlsZW5hbWUsIEpTT04uc3RyaW5naWZ5KHNvbmcpKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGFsZXJ0KCdUcmFjayBzYXZlZCcpOyB9LCAxKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9ICQoJyNiZWF0LWxpc3QnKS52YWwoKTtcbiAgICAgICAgICAgIGlmIChpdGVtID09PSAnU2VsZWN0JykgeyAgICBcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSBpdGVtO1xuICAgICAgICAgICAgbGV0IHRyYWNrID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShpdGVtKSk7XG4gICAgICAgICAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuXG4gICAgICAgICAgICBmb3JtVmFsdWVzLnNldChmb3JtLCB0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBhdWRpb09wdGlvbnMuc2V0T3B0aW9ucyh0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG5cbiAgICAgICAgICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0cmFjay5zZXR0aW5ncy5zYW1wbGVTZXQsIHRyYWNrLmJlYXQpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkZWxldGUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiZWF0LWxpc3QnKTtcbiAgICAgICAgICAgIGxldCB0b0RlbGV0ZSA9IGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnRleHQ7XG5cbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRvRGVsZXRlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gJyc7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG5cbiAgICAgICAgfSk7XG4gICAgfTtcbiB9XG4gIiwiY29uc3QgYWRzckdhaW5Ob2RlID0gcmVxdWlyZSgnYWRzci1nYWluLW5vZGUnKTtcbmNvbnN0IFdBQUNsb2NrID0gcmVxdWlyZSgnd2FhY2xvY2snKTtcbmNvbnN0IGdldEF1ZGlvT3B0aW9ucyA9IHJlcXVpcmUoJy4vZ2V0LXNldC1jb250cm9scycpO1xuY29uc3QgYXVkaW9PcHRpb25zID0gbmV3IGdldEF1ZGlvT3B0aW9ucygpO1xuXG52YXIgbWVhc3VyZUxlbmd0aCA9IDE2O1xuXG5mdW5jdGlvbiBzY2hlZHVsZU1lYXN1cmUoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCkge1xuICAgIFxuICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQgPSBzY2hlZHVsZUF1ZGlvQmVhdDtcbiAgICB0aGlzLnNjaGVkdWxlRm9yd2FyZCA9IDAuMTtcbiAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgIHRoaXMuZXZlbnRNYXAgPSB7fTtcbiAgICB0aGlzLmNsb2NrID0gbmV3IFdBQUNsb2NrKGN0eCk7XG4gICAgdGhpcy5jbG9jay5zdGFydCgpO1xuICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuXG4gICAgdGhpcy5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmN1cnJlbnQrKztcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudCA+PSBtZWFzdXJlTGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm1pbGxpUGVyQmVhdCA9IGZ1bmN0aW9uIChiZWF0cykge1xuICAgICAgICBpZiAoIWJlYXRzKSB7XG4gICAgICAgICAgICBiZWF0cyA9IDYwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAxMDAwICogNjAgLyBiZWF0cztcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRUcmFja2VyUm93VmFsdWVzID0gZnVuY3Rpb24gKGNlbGxJZCkge1xuICAgICAgICBsZXQgdmFsdWVzID0gW107XG4gICAgICAgIGxldCBzZWxlY3RvciA9IGBbZGF0YS1jZWxsLWlkPVwiJHtjZWxsSWR9XCJdYDtcblxuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZWxlbXMuZm9yRWFjaCgoZWwpID0+IHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlbC5kYXRhc2V0KTtcbiAgICAgICAgICAgIHZhbC5lbmFibGVkID0gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdlbmFibGVkJyk7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh2YWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9O1xuXG4gICAgdGhpcy5zY2hlZHVsZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgYmVhdHMgPSB0aGlzLmdldFRyYWNrZXJSb3dWYWx1ZXModGhpcy5jdXJyZW50KTtcbiAgICAgICAgbGV0IG5vdyA9IGN0eC5jdXJyZW50VGltZTtcblxuICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtY2VsbC1pZD1cIiR7dGhpcy5jdXJyZW50fVwiXWA7XG5cbiAgICAgICAgbGV0IGV2ZW50ID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5hZGRDbGFzcygnY3VycmVudCcpO1xuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCk7XG5cbiAgICAgICAgdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5yZW1vdmVDbGFzcygnY3VycmVudCcpO1xuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCArIHRoaXMubWlsbGlQZXJCZWF0KHRoaXMuYnBtKSAvIDEwMDApO1xuXG4gICAgICAgIGJlYXRzLmZvckVhY2goKGJlYXQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVCZWF0KGJlYXQsIG5vdyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlQmVhdCA9IGZ1bmN0aW9uIChiZWF0LCBub3cpIHtcblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZDtcbiAgICAgICAgdGhpcy5zY2hlZHVsZU1hcFtiZWF0LmNlbGxJZF0gPSB0cmlnZ2VyVGltZTtcbiAgICAgICAgaWYgKGJlYXQuZW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXSA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICAgICAgfSwgbm93KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlTWFwID0ge307XG5cbiAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0Tm93ID0gZnVuY3Rpb24gKGJlYXQpIHtcblxuICAgICAgICBpZiAoYmVhdC5lbmFibGVkKSB7XG4gICAgICAgICAgICBsZXQgYmVhdEV2ZW50ID0gdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIGlmIChiZWF0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICBiZWF0RXZlbnQuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB0cmlnZ2VyVGltZSA9IHRoaXMuc2NoZWR1bGVNYXBbMF0gKyBiZWF0LmNlbGxJZCAqIHRoaXMubWlsbGlQZXJCZWF0KHRoaXMuYnBtKSAvIDEwMDA7XG4gICAgICAgIGxldCBub3cgPSBjdHguY3VycmVudFRpbWU7XG4gICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICB9LCBub3cpO1xuICAgIH07XG5cbiAgICB0aGlzLmludGVydmFsO1xuICAgIHRoaXMucnVuU2NoZWR1bGUgPSBmdW5jdGlvbiAoYnBtKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuYnBtID0gYnBtO1xuICAgICAgICBsZXQgaW50ZXJ2YWwgPSB0aGlzLm1pbGxpUGVyQmVhdChicG0pO1xuXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgIH0sIDApO1xuXG4gICAgICAgIHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcblxuICAgICAgICB9LCBpbnRlcnZhbCk7XG4gICAgfTtcblxuICAgIHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldEV2ZW50S2V5ID0gZnVuY3Rpb24gZ2V0RXZlbnRLZXkoYmVhdCkge1xuICAgICAgICByZXR1cm4gYmVhdC5yb3dJZCArIGJlYXQuY2VsbElkO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRUcmFja2VyVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgdmFsdWVzID0gW107XG4gICAgICAgICQoXCIuY2VsbFwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSAkKHRoaXMpLmhhc0NsYXNzKFwiZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5sb2FkVHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgJCgnLmNlbGwnKS5yZW1vdmVDbGFzcygnZW5hYmxlZCcpO1xuICAgICAgICBqc29uLmZvckVhY2goZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgICAgIGlmIChlbGVtLmVuYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtcm93LWlkPVwiJHtlbGVtLnJvd0lkfVwiXVtkYXRhLWNlbGwtaWQ9XCIke2VsZW0uY2VsbElkfVwiXWA7XG4gICAgICAgICAgICAgICAgJChzZWxlY3RvcikuYWRkQ2xhc3MoXCJlbmFibGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2NoZWR1bGVNZWFzdXJlOyIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
