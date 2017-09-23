/* Package: drum-machine. Version: 2.0.0. License: MIT. Author: dennis iversen. Homepage: https://github.com/diversen/drum-machine-javascript#readme   */ (function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.drumMachine = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
function getElemCountByName(name) {
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
                if (elem.checked) {
                    formParams[elem.name] = elem.value;
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
                if (values[elem.name] === elem.value) {
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
        if (values.indexOf(opt.value) > -1) {
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

function getSetFormValues() {
    this.set = setFormValues;
    this.get = getFormValues;
}

module.exports = getSetFormValues;

},{}],4:[function(require,module,exports){
var tinySampleLoader = require('tiny-sample-loader');
var audioBufferInstrument = require('audio-buffer-instrument');

function getJSON(url) {

    var promise = new Promise((resolve, reject) => {
        var request = new XMLHttpRequest();

        request.open('get', url, true);
        request.responseType = 'text';
        request.onload = function () {
            if (request.status === 200) {
                resolve(JSON.parse(request.responseText));
            } else {
                reject('JSON could not be loaded ' + url);
            }
        };
        request.send();
    });

    return promise;
}

var buffers = {};
function getSamplePromises (ctx, data) {
    var baseUrl = data.samples;
    var promises = [];

    data.filename = [];
    var i = 0;
    data.files.forEach(function (val) {
        var filename = val.replace(/\.[^/.]+$/, "");
        data.filename.push(filename);
        var remoteUrl = baseUrl + val;

        let loaderPromise = tinySampleLoader(remoteUrl, ctx);
        loaderPromise.then(function (buffer) {
            buffers[filename] = new audioBufferInstrument(ctx, buffer);
        });

        promises.push(loaderPromise);

    });
    
    return promises;

}

function sampleAllPromise(ctx, dataUrl) {
    var promise = new Promise((resolve, reject) => {
        
        var jsonPromise = getJSON(dataUrl);
        jsonPromise.then(function(data) {
            var samplePromises = getSamplePromises(ctx, data);
            Promise.all(samplePromises).then(function() {
                resolve({data: data, buffers: buffers});
            }).catch(function (error) {
                console.log(error);
            });
        }).catch (function (error) {
            reject(error);
        });
    });

    return promise;
}

function loadSampleSet(ctx, dataUrl) {
    return sampleAllPromise(ctx, dataUrl);
}

module.exports = loadSampleSet;
},{"audio-buffer-instrument":2,"tiny-sample-loader":6}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
function sampleLoader (url, context) {
    
    var promise = new Promise((resolve, reject) => { 
        var request = new XMLHttpRequest();
    
        request.open('get', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function () {
            if(request.status === 200){
                context.decodeAudioData(request.response, function (buffer) {
                    resolve(buffer);
                });
            } else {
                reject('tiny-sample-loader request failed');
            }

        };
        request.send();
    });
    
    return promise;
};
module.exports = sampleLoader;
},{}],7:[function(require,module,exports){
var WAAClock = require('./lib/WAAClock')

module.exports = WAAClock
if (typeof window !== 'undefined') window.WAAClock = WAAClock

},{"./lib/WAAClock":8}],8:[function(require,module,exports){
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
},{"_process":15}],9:[function(require,module,exports){
function audioDistortionNode(ctx) {

    this.ctx = ctx;
    this.distortion;
    this.amount = 400;

    this.getDistortionNode = function () {
        this.distortion = this.ctx.createWaveShaper();
        this.distortion.oversample = '4x';
        this.distortion.curve = this.makeDistortionCurve(this.amount);
        return this.distortion;
    }

    // http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion
    this.makeDistortionCurve = function (amount) {
        let k = typeof amount === 'number' ? amount : 50,
            n_samples = 44100,
            curve = new Float32Array(n_samples),
            deg = Math.PI / 180,
            i = 0,
            x;
        for (; i < n_samples; ++i) {
            x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        console.log('ok')
        return curve;
    };
}

module.exports = audioDistortionNode;
},{}],10:[function(require,module,exports){
module.exports = {
  "beat": [
    {
      "rowId": "0",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "7",
      "enabled": true
    },
    {
      "rowId": "0",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "0",
      "cellId": "15",
      "enabled": true
    },
    {
      "rowId": "1",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "5",
      "enabled": true
    },
    {
      "rowId": "1",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "1",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "2",
      "enabled": true
    },
    {
      "rowId": "2",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "2",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "3",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "0",
      "enabled": true
    },
    {
      "rowId": "4",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "3",
      "enabled": true
    },
    {
      "rowId": "4",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "7",
      "enabled": true
    },
    {
      "rowId": "4",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "9",
      "enabled": true
    },
    {
      "rowId": "4",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "13",
      "enabled": true
    },
    {
      "rowId": "4",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "4",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "5",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "6",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "5",
      "enabled": true
    },
    {
      "rowId": "7",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "11",
      "enabled": true
    },
    {
      "rowId": "7",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "7",
      "cellId": "15",
      "enabled": true
    },
    {
      "rowId": "8",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "8",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "0",
      "enabled": true
    },
    {
      "rowId": "9",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "3",
      "enabled": true
    },
    {
      "rowId": "9",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "9",
      "enabled": true
    },
    {
      "rowId": "9",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "9",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "1",
      "enabled": true
    },
    {
      "rowId": "10",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "4",
      "enabled": true
    },
    {
      "rowId": "10",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "13",
      "enabled": true
    },
    {
      "rowId": "10",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "10",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "7",
      "enabled": true
    },
    {
      "rowId": "11",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "11",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "11",
      "enabled": true
    },
    {
      "rowId": "12",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "12",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "13",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "14",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "15",
      "cellId": "15",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "0",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "1",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "2",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "3",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "4",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "5",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "6",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "7",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "8",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "9",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "10",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "11",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "12",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "13",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "14",
      "enabled": false
    },
    {
      "rowId": "16",
      "cellId": "15",
      "enabled": false
    }
  ],
  "settings": {
    "sampleSet": "https://raw.githubusercontent.com/oramics/sampled/master/DM/CR-78/sampled.instrument.json",
    "bpm": 460,
    "initGain": 0.5,
    "maxGain": 0.6,
    "attackTime": 0.27,
    "sustainTime": 1.8,
    "releaseTime": 2,
    "detune": 1200,
    "delayEnabled": "true",
    "delay": 0.05,
    "filter": 2599.6,
    "measureLength": 16
  }
};
},{}],11:[function(require,module,exports){
const getSetFormValues = require('get-set-form-values');

function getSetControls() {

    this.getTrackerControls = function() {

        let formValues = new getSetFormValues();
        let form = document.getElementById("trackerControls");
        let values = formValues.get(form);
        let ret = {};
        for (let key in values) {
            
            if (key === 'delayEnabled') {
                ret[key] = 'delay';
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

    this.setTrackerControls = function (values) {
        if (!values) {
            values = this.getTrackerControls();
        }
        this.options = values;
    };  

}

module.exports = getSetControls;

},{"get-set-form-values":3}],12:[function(require,module,exports){
// require("babel-polyfill"); 
const loadSampleSet = require('load-sample-set');
const selectElement = require('select-element');
const getSetFormValues = require('get-set-form-values');
const adsrGainNode = require('adsr-gain-node');
const trackerTable = require('./tracker-table');
const scheduleMeasure = require('./schedule-measure');
const audioDistortionNode = require('./audio-distortion-node');
const sampleLoader = require('tiny-sample-loader');

const getSetControls = require('./get-set-controls');
const getSetAudioOptions = new getSetControls();

const ctx = new AudioContext();
const defaultTrack = require('./default-track');


var remoteUrl = 'https://mdn.github.io/voice-change-o-matic/audio/concert-crowd.ogg'

async function go() {
  try {
        const sample = await sampleLoader(remoteUrl, ctx);
        console.log(sample)
    } catch (e) {
        console.error(e); // 💩
    }
}

go();

/*
sampleLoader(remoteUrl, ctx).then(function (value) {
    console.log(value)
    // console.log(hihat);
}).catch(function (value) {
    console.log(value)
    console.log('error')
});*/


var buffers;
var currentSampleData;
var storage;
var trackerDebug;


function initializeSampleSet(ctx, dataUrl, track) {
    
    var sampleSetPromise = loadSampleSet(ctx, dataUrl);
    sampleSetPromise.then(function(data) {
        
        buffers = data.buffers;
        sampleData = data.data;
        
        if (!track) {
            track = storage.getTrack();
        }

        if (!track.settings.measureLength) {
            track.settings.measureLength = 16;
        }

        currentSampleData = sampleData;
        setupTrackerHtml(sampleData, track.settings.measureLength);   
        schedule.loadTrackerValues(track.beat)
        setupEvents();
    });
}

window.onload = function () {

    let formValues = new getSetFormValues();
    let form = document.getElementById("trackerControls");

    formValues.set(form, defaultTrack.settings);
    getSetAudioOptions.setTrackerControls(defaultTrack.settings);
    
    initializeSampleSet(ctx, defaultTrack.settings.sampleSet, defaultTrack);
    setupBaseEvents();
    
    storage = new tracksLocalStorage();
    storage.setupStorage();
};

var instrumentData = {};
function setupTrackerHtml(data, measureLength) {
    instrumentData = data;
    document.getElementById("tracker-parent").innerHTML = '';
    
    let htmlTable = new trackerTable();

    htmlTable.setRows(data.filename.length, measureLength);
    var str = htmlTable.getTable();
    
    var t = document.getElementById('tracker-parent');
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
        delay.delayTime.value = getSetAudioOptions.options.delay;

        let gain = new adsrGainNode(ctx);
        gain.setOptions(getSetAudioOptions.getTrackerControls());
        let feedbackGain = gain.getGainNode(triggerTime);


        let filter = ctx.createBiquadFilter();
        filter.frequency.value = getSetAudioOptions.options.filter;

        // delay -> feedback
        delay.connect(feedbackGain);
        disconnectNode(delay, getSetAudioOptions.getTrackerControls());

        // feedback -> filter
        feedbackGain.connect(filter);

        // filter ->delay
        filter.connect(delay);

        instrument.detune.value = getSetAudioOptions.options.detune;

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
        gain.setOptions(getSetAudioOptions.getTrackerControls());
        let gainNode = gain.getGainNode(triggerTime);

        instrument.detune.value = getSetAudioOptions.options.detune;
        // instrument -> gain
        
        instrument.connect(gainNode);

        
        let distortion = new audioDistortionNode(ctx)
        let distortionNode = distortion.getDistortionNode();

        gainNode.connect(distortionNode);


        distortionNode.connect(ctx.destination);
        
        /*
        gainNode.connect(ctx.destination);
        */
        instrument.start(triggerTime);
    }

    if (getSetAudioOptions.options.delayEnabled) {
        connectDelay(instrument)
    } else {
        connectClean(instrument);
    }
}

var schedule = new scheduleMeasure(ctx, scheduleAudioBeat);

function setupBaseEvents () {
    document.getElementById('play').addEventListener('click', function (e) {
        schedule.stop();
        schedule.runSchedule(getSetAudioOptions.options.bpm);
    });

    document.getElementById('pause').addEventListener('click', function (e) {
        schedule.stop(); 
    });
    
    document.getElementById('stop').addEventListener('click', function (e) {
        schedule.stop();
        schedule = new scheduleMeasure(ctx, scheduleAudioBeat);
        schedule.measureLength = measureLength;
    });
    
    document.getElementById('bpm').addEventListener('change', function (e) {
        getSetAudioOptions.setTrackerControls();
        if (schedule.running) {
            schedule.stop();
            schedule.runSchedule(getSetAudioOptions.options.bpm);
        }
    });

    document.getElementById('measureLength').addEventListener('input',  (e) => {

        $('#measureLength').bind('keypress keydown keyup', (e) =>{
            if(e.keyCode == 13) { 

                e.preventDefault(); 

                let value = document.getElementById('measureLength').value;
                let length = parseInt(value);
                
                if (length < 1) return;
                schedule.measureLength = length;
        
                let track = schedule.getTrackerValues();                
                setupTrackerHtml(currentSampleData, length);
                schedule.measureLength = length;
                schedule.loadTrackerValues(track)
                setupEvents();
            }
        });
    });
    
    $('.base').on('change', function () {
        getSetAudioOptions.setTrackerControls();
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

    this.getFilename = function () {
        let filename = $('#filename').val();
        if (!filename) {
            filename = 'untitled';
        }
        return filename;
    }

    /**
     * Get complete song
     */
    this.getTrack = function () {
        let formData = getSetAudioOptions.getTrackerControls();
        
        let beat = schedule.getTrackerValues();
        let song = {"beat": beat, "settings": formData};
        return song;
    }

    this.setupStorage = function() {

        this.setLocalStorage();
        document.getElementById('save').addEventListener('click', (e) => {
            e.preventDefault();

            let song = this.getTrack();
            let json = JSON.stringify(song);

            let filename = this.getFilename();

            localStorage.setItem(filename, json);
            this.setLocalStorage('update');

            $("#beat-list").val(filename);
            alert('Track saved'); 
        });

        $('#filename').bind('keypress keydown keyup', (e) =>{
            if(e.keyCode == 13) { 
                e.preventDefault(); 
            }
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
            getSetAudioOptions.setTrackerControls(track.settings);
            schedule.stop();
            schedule.measureLength = track.settings.measureLength;

            initializeSampleSet(ctx, track.settings.sampleSet, track);

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
 
},{"./audio-distortion-node":9,"./default-track":10,"./get-set-controls":11,"./schedule-measure":13,"./tracker-table":14,"adsr-gain-node":1,"get-set-form-values":3,"load-sample-set":4,"select-element":5,"tiny-sample-loader":6}],13:[function(require,module,exports){
const WAAClock = require('waaclock');
const getAudioOptions = require('./get-set-controls');
const audioOptions = new getAudioOptions();

function scheduleMeasure(ctx, scheduleAudioBeat) {
    
    this.measureLength = 16;
    this.scheduleAudioBeat = scheduleAudioBeat;
    this.scheduleForward = 1;
    this.current = 0;
    this.eventMap = {};
    this.clock = new WAAClock(ctx);
    this.clock.start();
    this.running = false;

    this.next = function () {
        this.current++;
        if (this.current >= this.measureLength) {
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
},{"./get-set-controls":11,"waaclock":7}],14:[function(require,module,exports){
function trackerTable() {
    
    this.str = '';
    this.getTable = function () {
        return '<table id="tracker">' + this.str + '</table>';
    };
    
    this.setHeader = function (numCells) {

        this.str += `<tr class="row header">`;
        this.str += this.getCells('header', numCells, true);
        this.str += `</tr>`;
        
    };
    
    this.setRows = function (numRows, numCells) {
        
        this.setHeader(numCells);
        for (let rowID = 0; rowID < numRows; rowID++) {
            this.str += `<tr class="row" data-id="${rowID}">`;
            this.str += this.getCells(rowID, numCells);
            this.str += `</tr>`;
        }
    };
    
    this.getCells = function(rowID, numCells, header) {
        var str = '';
        for (let c = 0; c < numCells; c++) {
            str += `<td class="cell" data-row-id="${rowID}" data-cell-id="${c}">`;
            if (header)str += c + 1;
            str += `</td>`;
        }
        return str;
    };
}

module.exports = trackerTable;

},{}],15:[function(require,module,exports){
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
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[12])(12)
});