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

},{}],4:[function(require,module,exports){
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

},{"_process":14}],9:[function(require,module,exports){
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
    "filter": 2599.6
  }
};

},{}],10:[function(require,module,exports){
const getSetFormValues = require('get-set-form-values');

function getSetControls() {

    this.getTrackerControls = function() {

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

    this.setTrackerControls = function (values) {
        if (!values) {
            values = this.getTrackerControls();
        }
        this.options = values;
    };  

}

module.exports = getSetControls;

},{"get-set-form-values":3}],11:[function(require,module,exports){
// require("babel-polyfill"); 
const loadSampleSet = require('load-sample-set');
const selectElement = require('select-element');
const getSetFormValues = require('get-set-form-values');
const adsrGainNode = require('adsr-gain-node');
const trackerTable = require('./tracker-table');
const scheduleMeasure = require('./schedule-measure');

const getAudioOptions = require('./get-set-controls');
const audioOptions = new getAudioOptions();

const ctx = new AudioContext();
const defaultTrack = require('./default-track');

// var measureLength = 16;
var buffers;
var currentSampleData;

function initializeSampleSet(ctx, dataUrl, track) {
    
    loadSampleSet(ctx, dataUrl, function (sampleData, sampleBuffers) {
        buffers = sampleBuffers;
        
        if (!track) {
            track = schedule.getTrackerValues();
        } 

        currentSampleData = sampleData;
        setupTrackerHtml(sampleData, 16);    
        schedule.loadTrackerValues(track)
        setupEvents();
    });
}


window.onload = function () {

    let formValues = new getSetFormValues();
    let form = document.getElementById("trackerControls");

    formValues.set(form, defaultTrack.settings);
    audioOptions.setTrackerControls(defaultTrack.settings);
    
    initializeSampleSet(ctx, defaultTrack.settings.sampleSet, defaultTrack.beat);
    setupBaseEvents();
    
    var storage = new tracksLocalStorage();
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
        delay.delayTime.value = audioOptions.options.delay;

        let gain = new adsrGainNode(ctx);
        gain.setOptions(audioOptions.getTrackerControls());
        let feedbackGain = gain.getGainNode(triggerTime);


        let filter = ctx.createBiquadFilter();
        filter.frequency.value = audioOptions.options.filter;

        // delay -> feedback
        delay.connect(feedbackGain);
        disconnectNode(delay, audioOptions.getTrackerControls());

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
        gain.setOptions(audioOptions.getTrackerControls());
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
        schedule.measureLength = measureLength;
    });
    
    document.getElementById('bpm').addEventListener('change', function (e) {
        audioOptions.setTrackerControls();
        if (schedule.running) {
            schedule.stop();
            schedule.runSchedule(audioOptions.options.bpm);
        }
    });

    document.getElementById('measureLength').addEventListener('input',  (e) => {

        //let measureLength = this.value;
        // console.log(measureLength)
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

        console.log('entered')

    });
    
    
    $('.base').on('change', function () {
        audioOptions.setTrackerControls();
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
        storage['Select'] = 'Load selected';


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

            let formData = audioOptions.getTrackerControls();
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
            audioOptions.setTrackerControls(track.settings);
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
 
},{"./default-track":9,"./get-set-controls":10,"./schedule-measure":12,"./tracker-table":13,"adsr-gain-node":1,"get-set-form-values":3,"load-sample-set":4,"select-element":5}],12:[function(require,module,exports){
const WAAClock = require('waaclock');
const getAudioOptions = require('./get-set-controls');
const audioOptions = new getAudioOptions();

function scheduleMeasure(ctx, scheduleAudioBeat) {
    
    this.measureLength = 16;
    this.scheduleAudioBeat = scheduleAudioBeat;
    this.scheduleForward = 0.1;
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
},{"./get-set-controls":10,"waaclock":7}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{}]},{},[11])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2V0LXNldC1mb3JtLXZhbHVlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2FkLXNhbXBsZS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc2VsZWN0LWVsZW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdGlueS1zYW1wbGUtbG9hZGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2xpYi9XQUFDbG9jay5qcyIsInNyYy9kZWZhdWx0LXRyYWNrLmpzIiwic3JjL2dldC1zZXQtY29udHJvbHMuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9zY2hlZHVsZS1tZWFzdXJlLmpzIiwic3JjL3RyYWNrZXItdGFibGUuanMiLCIuLi8uLi8uLi91c3IvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDek9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2oyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIEdhaW4oY3R4KSB7XG5cbiAgICB0aGlzLmN0eCA9IGN0eDtcblxuICAgIHRoaXMuc2Vjb25kc1RvVGltZUNvbnN0YW50ID0gZnVuY3Rpb24gKHNlYykge1xuICAgICAgICByZXR1cm4gKHNlYyAqIDIpIC8gODtcbiAgICB9O1xuXG4gICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgICBpbml0R2FpbjogMC4xLCAvLyBJbml0IGdhaW4gb24gbm90ZVxuICAgICAgICBtYXhHYWluOiAxLjAsIC8vIE1heCBnYWluIG9uIG5vdGVcbiAgICAgICAgYXR0YWNrVGltZTogMC4xLCAvLyBBdHRhY2tUaW1lLiBnYWluLmluaXQgdG8gZ2Fpbi5tYXggaW4gYXR0YWNrVGltZVxuICAgICAgICBzdXN0YWluVGltZTogMSwgLy8gU3VzdGFpbiBub3RlIGluIHRpbWVcbiAgICAgICAgcmVsZWFzZVRpbWU6IDEsIC8vIEFwcHJveGltYXRlZCBlbmQgdGltZS4gQ2FsY3VsYXRlZCB3aXRoIHNlY29uZHNUb1RpbWVDb25zdGFudCgpXG4gICAgICAgIC8vIGRpc2Nvbm5lY3Q6IGZhbHNlIC8vIFNob3VsZCB3ZSBhdXRvZGlzY29ubmVjdC4gRGVmYXVsdCBpcyB0cnVlXG4gICAgfTtcblxuICAgIHRoaXMuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2Fpbk5vZGU7XG4gICAgLyoqXG4gICAgICogVGhlIGdhaW5Ob2RlXG4gICAgICogQHBhcmFtIHtmbG9hdH0gYmVnaW4gY3R4IHRpbWVcbiAgICAgKiBAcmV0dXJucyB7R2Fpbi5nZXRHYWluTm9kZS5nYWluTm9kZX1cbiAgICAgKi9cbiAgICB0aGlzLmdldEdhaW5Ob2RlID0gZnVuY3Rpb24gKGJlZ2luKSB7XG5cbiAgICAgICAgdGhpcy5nYWluTm9kZSA9IHRoaXMuY3R4LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlID0gdGhpcy5vcHRpb25zLmluaXRHYWluO1xuXG4gICAgICAgIC8vIEF0dGFjayB0byBtYXhcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnNldFRhcmdldEF0VGltZShcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubWF4R2FpbixcbiAgICAgICAgICAgICAgICBiZWdpbiArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lLFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lKTtcblxuICAgICAgICAvLyBTdXN0YWluIGFuZCBlbmQgbm90ZVxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKFxuICAgICAgICAgICAgICAgIDAuMCxcbiAgICAgICAgICAgICAgICBiZWdpbiArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lICsgdGhpcy5vcHRpb25zLnN1c3RhaW5UaW1lLFxuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kc1RvVGltZUNvbnN0YW50KHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZSkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5kaXNjb25uZWN0ICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0KGJlZ2luKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2Fpbk5vZGU7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUgKyB0aGlzLm9wdGlvbnMucmVsZWFzZVRpbWU7XG4gICAgICAgIFxuICAgICAgICBzZXRUaW1lb3V0KCAoKT0+ICB7XG4gICAgICAgICAgICB0aGlzLmdhaW5Ob2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdG90YWxMZW5ndGggKiAxMDAwKTtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdhaW47IiwiLy8gRnJvbTogaHR0cHM6Ly9kZXYub3BlcmEuY29tL2FydGljbGVzL2RydW0tc291bmRzLXdlYmF1ZGlvL1xuZnVuY3Rpb24gSW5zdHJ1bWVudChjb250ZXh0LCBidWZmZXIpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xufVxuXG5JbnN0cnVtZW50LnByb3RvdHlwZS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICB0aGlzLnNvdXJjZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG59O1xuXG5JbnN0cnVtZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgdGhpcy5zb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlO1xufTtcblxuSW5zdHJ1bWVudC5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdGhpcy5zZXR1cCgpO1xuICAgIHRoaXMuc291cmNlLnN0YXJ0KHRpbWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnN0cnVtZW50O1xuIiwiZnVuY3Rpb24gZ2V0RWxlbUNvdW50QnlOYW1lIChuYW1lKSB7XG4gICAgdmFyIG5hbWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUobmFtZSk7XG4gICAgcmV0dXJuIG5hbWVzLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gZ2V0Rm9ybVZhbHVlcyhmb3JtRWxlbWVudCkge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuICAgICAgICBzd2l0Y2ggKGVsZW0udHlwZSkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2luZ2xlIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgdmFyIG51bUVsZW1zID0gZ2V0RWxlbUNvdW50QnlOYW1lKGVsZW0ubmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKG51bUVsZW1zID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZm9ybVBhcmFtc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTXVsdGlwbGVcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZm9ybVBhcmFtc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBbZWxlbS52YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0ucHVzaChlbGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdFZhbHVlcyA9IGdldFNlbGVjdFZhbHVlcyhlbGVtKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gc2VsZWN0VmFsdWVzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0udmFsdWUgIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZvcm1QYXJhbXM7XG59XG5cbmZ1bmN0aW9uIHNldEZvcm1WYWx1ZXMoZm9ybUVsZW1lbnQsIHZhbHVlcykge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuICAgICAgICBcbiAgICAgICAgaWYgKCAhKGVsZW0ubmFtZSBpbiB2YWx1ZXMpICkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZWxlbS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSA9PT0gZWxlbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0uaW5kZXhPZihlbGVtLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFNlbGVjdFZhbHVlcyhlbGVtLCB2YWx1ZXNbZWxlbS5uYW1lXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS52YWx1ZSA9IHZhbHVlc1tlbGVtLm5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0U2VsZWN0VmFsdWVzKHNlbGVjdEVsZW0sIHZhbHVlcykge1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0RWxlbS5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBvcHRpb25zLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgICAgICBvcHQgPSBvcHRpb25zW2ldO1xuICAgICAgICBpZiAodmFsdWVzLmluZGV4T2Yob3B0LnZhbHVlKSA+IC0xICkge1xuICAgICAgICAgICAgb3B0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICB9ICAgICAgICBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFNlbGVjdFZhbHVlcyhzZWxlY3QpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIG9wdGlvbnMgPSBzZWxlY3QgJiYgc2VsZWN0Lm9wdGlvbnM7XG4gICAgdmFyIG9wdDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcblxuICAgICAgICBpZiAob3B0LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChvcHQudmFsdWUgfHwgb3B0LnRleHQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdldFNldEZvcm1WYWx1ZXMgKCkge1xuICAgIHRoaXMuc2V0ID0gc2V0Rm9ybVZhbHVlcztcbiAgICB0aGlzLmdldCA9IGdldEZvcm1WYWx1ZXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U2V0Rm9ybVZhbHVlcztcbiIsInZhciB0aW55U2FtcGxlTG9hZGVyID0gcmVxdWlyZSgndGlueS1zYW1wbGUtbG9hZGVyJyk7XG52YXIgYXVkaW9CdWZmZXJJbnN0cnVtZW50ID0gcmVxdWlyZSgnYXVkaW8tYnVmZmVyLWluc3RydW1lbnQnKTtcblxuZnVuY3Rpb24gbG9hZFNhbXBsZVNldChjdHgsIGRhdGFVcmwsIGNiKSB7XG4gICAgXG4gICAgZmV0Y2goZGF0YVVybCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyAhPT0gMjAwKSB7ICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb29rcyBsaWtlIHRoZXJlIHdhcyBhIHByb2JsZW0uIFN0YXR1cyBDb2RlOiAnICsgIHJlc3BvbnNlLnN0YXR1cyk7ICBcbiAgICAgICAgICAgIHJldHVybjsgIFxuICAgICAgICB9XG5cbiAgICAgICAgcmVzcG9uc2UuanNvbigpLnRoZW4oZnVuY3Rpb24oZGF0YSkgeyAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBiYXNlVXJsID0gZGF0YS5zYW1wbGVzO1xuICAgICAgICAgICAgdmFyIGJ1ZmZlcnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlcyA9IFtdO1xuXG4gICAgICAgICAgICBkYXRhLmZpbGVuYW1lID0gW107XG4gICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICBkYXRhLmZpbGVzLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgIHZhciBmaWxlbmFtZSA9IHZhbC5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIik7XG4gICAgICAgICAgICAgICAgZGF0YS5maWxlbmFtZS5wdXNoKGZpbGVuYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVtb3RlVXJsID0gYmFzZVVybCArIHZhbDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsZXQgbG9hZGVyUHJvbWlzZSA9IHRpbnlTYW1wbGVMb2FkZXIocmVtb3RlVXJsLCBjdHgsIChidWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyc1tmaWxlbmFtZV0gPSBuZXcgYXVkaW9CdWZmZXJJbnN0cnVtZW50KGN0eCwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKGxvYWRlclByb21pc2UpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKHZhbHVlcyA9PiB7IFxuICAgICAgICAgICAgICAgIGNiKGRhdGEsIGJ1ZmZlcnMpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIH0pOyAgICBcbiAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHsgIFxuICAgICAgICBjb25zb2xlLmxvZygnRmV0Y2ggRXJyb3IgOi1TJywgZXJyKTsgIFxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvYWRTYW1wbGVTZXQ7IiwiZnVuY3Rpb24gc2VsZWN0RWxlbWVudChhcHBlbmRUb0lELCBzZWxlY3RJRCwgb3B0aW9ucywgc2VsZWN0ZWQpIHtcblxuICAgIHRoaXMuYXBwZW5kVG9JRCA9IGFwcGVuZFRvSUQ7XG4gICAgdGhpcy5zZWxlY3RJRCA9IHNlbGVjdElEO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuICAgIFxuICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcHBlbmRUb0lEID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpO1xuICAgICAgICBzZWxlY3RMaXN0LmlkID0gdGhpcy5zZWxlY3RJRDsgICAgICAgIFxuICAgICAgICBhcHBlbmRUb0lELmFwcGVuZENoaWxkKHNlbGVjdExpc3QpO1xuICAgICAgICB0aGlzLnVwZGF0ZShzZWxlY3RJRCwgdGhpcy5vcHRpb25zLCB0aGlzLnNlbGVjdGVkKTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGVsZW0sIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG4gICAgICAgIHRoaXMuZGVsZXRlKGVsZW0pO1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICBvcHRpb24udmFsdWUgPSBrZXk7XG4gICAgICAgICAgICBvcHRpb24udGV4dCA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIHNlbGVjdExpc3QuYXBwZW5kQ2hpbGQob3B0aW9uKTtcblxuICAgICAgICAgICAgaWYgKGtleSA9PT0gc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb24uc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNlbGVjdGVkID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgdmFyIG9wdDtcbiAgICAgICAgZm9yICggdmFyIGkgPSAwLCBsZW4gPSBzZWxlY3RMaXN0Lm9wdGlvbnMubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XG4gICAgICAgICAgICBvcHQgPSBzZWxlY3RMaXN0Lm9wdGlvbnNbaV07XG4gICAgICAgICAgICBpZiAoIG9wdC5zZWxlY3RlZCA9PT0gdHJ1ZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0LnZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3Q9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIGZvciAodmFyIG9wdGlvbiBpbiBzZWxlY3RMaXN0KXtcbiAgICAgICAgICAgIHNlbGVjdExpc3QucmVtb3ZlKG9wdGlvbik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0QXNTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIGVsZW1lbnRIdG1sID0gZWxlbWVudC5vdXRlckhUTUw7XG4gICAgICAgIHJldHVybiBlbGVtZW50SHRtbDtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdEVsZW1lbnQ7IiwiZnVuY3Rpb24gc2FtcGxlTG9hZGVyICh1cmwsIGNvbnRleHQsIGNhbGxiYWNrKSB7XG4gICAgXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIFxuICAgICAgICByZXF1ZXN0Lm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZihyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKXtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoJ3NhbXBsZUxvYWRlciByZXF1ZXN0IHN1Y2Nlc3MnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdzYW1wbGVMb2FkZXIgcmVxdWVzdCBmYWlsZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNhbXBsZUxvYWRlcjsiLCJ2YXIgV0FBQ2xvY2sgPSByZXF1aXJlKCcuL2xpYi9XQUFDbG9jaycpXG5cbm1vZHVsZS5leHBvcnRzID0gV0FBQ2xvY2tcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgd2luZG93LldBQUNsb2NrID0gV0FBQ2xvY2tcbiIsInZhciBpc0Jyb3dzZXIgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG5cbnZhciBDTE9DS19ERUZBVUxUUyA9IHtcbiAgdG9sZXJhbmNlTGF0ZTogMC4xMCxcbiAgdG9sZXJhbmNlRWFybHk6IDAuMDAxXG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IEV2ZW50ID09PT09PT09PT09PT09PT09PT09IC8vXG52YXIgRXZlbnQgPSBmdW5jdGlvbihjbG9jaywgZGVhZGxpbmUsIGZ1bmMpIHtcbiAgdGhpcy5jbG9jayA9IGNsb2NrXG4gIHRoaXMuZnVuYyA9IGZ1bmNcbiAgdGhpcy5fY2xlYXJlZCA9IGZhbHNlIC8vIEZsYWcgdXNlZCB0byBjbGVhciBhbiBldmVudCBpbnNpZGUgY2FsbGJhY2tcblxuICB0aGlzLnRvbGVyYW5jZUxhdGUgPSBjbG9jay50b2xlcmFuY2VMYXRlXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBjbG9jay50b2xlcmFuY2VFYXJseVxuICB0aGlzLl9sYXRlc3RUaW1lID0gbnVsbFxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSBudWxsXG4gIHRoaXMuZGVhZGxpbmUgPSBudWxsXG4gIHRoaXMucmVwZWF0VGltZSA9IG51bGxcblxuICB0aGlzLnNjaGVkdWxlKGRlYWRsaW5lKVxufVxuXG4vLyBVbnNjaGVkdWxlcyB0aGUgZXZlbnRcbkV2ZW50LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICB0aGlzLl9jbGVhcmVkID0gdHJ1ZVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBTZXRzIHRoZSBldmVudCB0byByZXBlYXQgZXZlcnkgYHRpbWVgIHNlY29uZHMuXG5FdmVudC5wcm90b3R5cGUucmVwZWF0ID0gZnVuY3Rpb24odGltZSkge1xuICBpZiAodGltZSA9PT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2RlbGF5IGNhbm5vdCBiZSAwJylcbiAgdGhpcy5yZXBlYXRUaW1lID0gdGltZVxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSlcbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gU2V0cyB0aGUgdGltZSB0b2xlcmFuY2Ugb2YgdGhlIGV2ZW50LlxuLy8gVGhlIGV2ZW50IHdpbGwgYmUgZXhlY3V0ZWQgaW4gdGhlIGludGVydmFsIGBbZGVhZGxpbmUgLSBlYXJseSwgZGVhZGxpbmUgKyBsYXRlXWBcbi8vIElmIHRoZSBjbG9jayBmYWlscyB0byBleGVjdXRlIHRoZSBldmVudCBpbiB0aW1lLCB0aGUgZXZlbnQgd2lsbCBiZSBkcm9wcGVkLlxuRXZlbnQucHJvdG90eXBlLnRvbGVyYW5jZSA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICBpZiAodHlwZW9mIHZhbHVlcy5sYXRlID09PSAnbnVtYmVyJylcbiAgICB0aGlzLnRvbGVyYW5jZUxhdGUgPSB2YWx1ZXMubGF0ZVxuICBpZiAodHlwZW9mIHZhbHVlcy5lYXJseSA9PT0gJ251bWJlcicpXG4gICAgdGhpcy50b2xlcmFuY2VFYXJseSA9IHZhbHVlcy5lYXJseVxuICB0aGlzLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMoKVxuICBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBldmVudCBpcyByZXBlYXRlZCwgZmFsc2Ugb3RoZXJ3aXNlXG5FdmVudC5wcm90b3R5cGUuaXNSZXBlYXRlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yZXBlYXRUaW1lICE9PSBudWxsIH1cblxuLy8gU2NoZWR1bGVzIHRoZSBldmVudCB0byBiZSByYW4gYmVmb3JlIGBkZWFkbGluZWAuXG4vLyBJZiB0aGUgdGltZSBpcyB3aXRoaW4gdGhlIGV2ZW50IHRvbGVyYW5jZSwgd2UgaGFuZGxlIHRoZSBldmVudCBpbW1lZGlhdGVseS5cbi8vIElmIHRoZSBldmVudCB3YXMgYWxyZWFkeSBzY2hlZHVsZWQgYXQgYSBkaWZmZXJlbnQgdGltZSwgaXQgaXMgcmVzY2hlZHVsZWQuXG5FdmVudC5wcm90b3R5cGUuc2NoZWR1bGUgPSBmdW5jdGlvbihkZWFkbGluZSkge1xuICB0aGlzLl9jbGVhcmVkID0gZmFsc2VcbiAgdGhpcy5kZWFkbGluZSA9IGRlYWRsaW5lXG4gIHRoaXMuX3JlZnJlc2hFYXJseUxhdGVEYXRlcygpXG5cbiAgaWYgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA+PSB0aGlzLl9lYXJsaWVzdFRpbWUpIHtcbiAgICB0aGlzLl9leGVjdXRlKClcbiAgXG4gIH0gZWxzZSBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIFxuICB9IGVsc2UgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbn1cblxuRXZlbnQucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgcmF0aW8pIHtcbiAgaWYgKHRoaXMuaXNSZXBlYXRlZCgpKVxuICAgIHRoaXMucmVwZWF0VGltZSA9IHRoaXMucmVwZWF0VGltZSAqIHJhdGlvXG5cbiAgdmFyIGRlYWRsaW5lID0gdFJlZiArIHJhdGlvICogKHRoaXMuZGVhZGxpbmUgLSB0UmVmKVxuICAvLyBJZiB0aGUgZGVhZGxpbmUgaXMgdG9vIGNsb3NlIG9yIHBhc3QsIGFuZCB0aGUgZXZlbnQgaGFzIGEgcmVwZWF0LFxuICAvLyB3ZSBjYWxjdWxhdGUgdGhlIG5leHQgcmVwZWF0IHBvc3NpYmxlIGluIHRoZSBzdHJldGNoZWQgc3BhY2UuXG4gIGlmICh0aGlzLmlzUmVwZWF0ZWQoKSkge1xuICAgIHdoaWxlICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPj0gZGVhZGxpbmUgLSB0aGlzLnRvbGVyYW5jZUVhcmx5KVxuICAgICAgZGVhZGxpbmUgKz0gdGhpcy5yZXBlYXRUaW1lXG4gIH1cbiAgdGhpcy5zY2hlZHVsZShkZWFkbGluZSlcbn1cblxuLy8gRXhlY3V0ZXMgdGhlIGV2ZW50XG5FdmVudC5wcm90b3R5cGUuX2V4ZWN1dGUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY2xvY2suX3N0YXJ0ZWQgPT09IGZhbHNlKSByZXR1cm5cbiAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcblxuICBpZiAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lIDwgdGhpcy5fbGF0ZXN0VGltZSlcbiAgICB0aGlzLmZ1bmModGhpcylcbiAgZWxzZSB7XG4gICAgaWYgKHRoaXMub25leHBpcmVkKSB0aGlzLm9uZXhwaXJlZCh0aGlzKVxuICAgIGNvbnNvbGUud2FybignZXZlbnQgZXhwaXJlZCcpXG4gIH1cbiAgLy8gSW4gdGhlIGNhc2UgYHNjaGVkdWxlYCBpcyBjYWxsZWQgaW5zaWRlIGBmdW5jYCwgd2UgbmVlZCB0byBhdm9pZFxuICAvLyBvdmVycndyaXRpbmcgd2l0aCB5ZXQgYW5vdGhlciBgc2NoZWR1bGVgLlxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpICYmIHRoaXMuaXNSZXBlYXRlZCgpICYmICF0aGlzLl9jbGVhcmVkKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSkgXG59XG5cbi8vIFVwZGF0ZXMgY2FjaGVkIHRpbWVzXG5FdmVudC5wcm90b3R5cGUuX3JlZnJlc2hFYXJseUxhdGVEYXRlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9sYXRlc3RUaW1lID0gdGhpcy5kZWFkbGluZSArIHRoaXMudG9sZXJhbmNlTGF0ZVxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSB0aGlzLmRlYWRsaW5lIC0gdGhpcy50b2xlcmFuY2VFYXJseVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBXQUFDbG9jayA9PT09PT09PT09PT09PT09PT09PSAvL1xudmFyIFdBQUNsb2NrID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICBvcHRzID0gb3B0cyB8fCB7fVxuICB0aGlzLnRpY2tNZXRob2QgPSBvcHRzLnRpY2tNZXRob2QgfHwgJ1NjcmlwdFByb2Nlc3Nvck5vZGUnXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBvcHRzLnRvbGVyYW5jZUVhcmx5IHx8IENMT0NLX0RFRkFVTFRTLnRvbGVyYW5jZUVhcmx5XG4gIHRoaXMudG9sZXJhbmNlTGF0ZSA9IG9wdHMudG9sZXJhbmNlTGF0ZSB8fCBDTE9DS19ERUZBVUxUUy50b2xlcmFuY2VMYXRlXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHRcbiAgdGhpcy5fZXZlbnRzID0gW11cbiAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlXG59XG5cbi8vIC0tLS0tLS0tLS0gUHVibGljIEFQSSAtLS0tLS0tLS0tIC8vXG4vLyBTY2hlZHVsZXMgYGZ1bmNgIHRvIHJ1biBhZnRlciBgZGVsYXlgIHNlY29uZHMuXG5XQUFDbG9jay5wcm90b3R5cGUuc2V0VGltZW91dCA9IGZ1bmN0aW9uKGZ1bmMsIGRlbGF5KSB7XG4gIHJldHVybiB0aGlzLl9jcmVhdGVFdmVudChmdW5jLCB0aGlzLl9hYnNUaW1lKGRlbGF5KSlcbn1cblxuLy8gU2NoZWR1bGVzIGBmdW5jYCB0byBydW4gYmVmb3JlIGBkZWFkbGluZWAuXG5XQUFDbG9jay5wcm90b3R5cGUuY2FsbGJhY2tBdFRpbWUgPSBmdW5jdGlvbihmdW5jLCBkZWFkbGluZSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRXZlbnQoZnVuYywgZGVhZGxpbmUpXG59XG5cbi8vIFN0cmV0Y2hlcyBgZGVhZGxpbmVgIGFuZCBgcmVwZWF0YCBvZiBhbGwgc2NoZWR1bGVkIGBldmVudHNgIGJ5IGByYXRpb2AsIGtlZXBpbmdcbi8vIHRoZWlyIHJlbGF0aXZlIGRpc3RhbmNlIHRvIGB0UmVmYC4gSW4gZmFjdCB0aGlzIGlzIGVxdWl2YWxlbnQgdG8gY2hhbmdpbmcgdGhlIHRlbXBvLlxuV0FBQ2xvY2sucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgZXZlbnRzLCByYXRpbykge1xuICBldmVudHMuZm9yRWFjaChmdW5jdGlvbihldmVudCkgeyBldmVudC50aW1lU3RyZXRjaCh0UmVmLCByYXRpbykgfSlcbiAgcmV0dXJuIGV2ZW50c1xufVxuXG4vLyBSZW1vdmVzIGFsbCBzY2hlZHVsZWQgZXZlbnRzIGFuZCBzdGFydHMgdGhlIGNsb2NrIFxuV0FBQ2xvY2sucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9zdGFydGVkID09PSBmYWxzZSkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHRoaXMuX3N0YXJ0ZWQgPSB0cnVlXG4gICAgdGhpcy5fZXZlbnRzID0gW11cblxuICAgIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdTY3JpcHRQcm9jZXNzb3JOb2RlJykge1xuICAgICAgdmFyIGJ1ZmZlclNpemUgPSAyNTZcbiAgICAgIC8vIFdlIGhhdmUgdG8ga2VlcCBhIHJlZmVyZW5jZSB0byB0aGUgbm9kZSB0byBhdm9pZCBnYXJiYWdlIGNvbGxlY3Rpb25cbiAgICAgIHRoaXMuX2Nsb2NrTm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgMSwgMSlcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbilcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHsgc2VsZi5fdGljaygpIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdtYW51YWwnKSBudWxsIC8vIF90aWNrIGlzIGNhbGxlZCBtYW51YWxseVxuXG4gICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgdGlja01ldGhvZCAnICsgdGhpcy50aWNrTWV0aG9kKVxuICB9XG59XG5cbi8vIFN0b3BzIHRoZSBjbG9ja1xuV0FBQ2xvY2sucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3N0YXJ0ZWQgPT09IHRydWUpIHtcbiAgICB0aGlzLl9zdGFydGVkID0gZmFsc2VcbiAgICB0aGlzLl9jbG9ja05vZGUuZGlzY29ubmVjdCgpXG4gIH0gIFxufVxuXG4vLyAtLS0tLS0tLS0tIFByaXZhdGUgLS0tLS0tLS0tLSAvL1xuXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIHJhbiBwZXJpb2RpY2FsbHksIGFuZCBhdCBlYWNoIHRpY2sgaXQgZXhlY3V0ZXNcbi8vIGV2ZW50cyBmb3Igd2hpY2ggYGN1cnJlbnRUaW1lYCBpcyBpbmNsdWRlZCBpbiB0aGVpciB0b2xlcmFuY2UgaW50ZXJ2YWwuXG5XQUFDbG9jay5wcm90b3R5cGUuX3RpY2sgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGV2ZW50ID0gdGhpcy5fZXZlbnRzLnNoaWZ0KClcblxuICB3aGlsZShldmVudCAmJiBldmVudC5fZWFybGllc3RUaW1lIDw9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZSkge1xuICAgIGV2ZW50Ll9leGVjdXRlKClcbiAgICBldmVudCA9IHRoaXMuX2V2ZW50cy5zaGlmdCgpXG4gIH1cblxuICAvLyBQdXQgYmFjayB0aGUgbGFzdCBldmVudFxuICBpZihldmVudCkgdGhpcy5fZXZlbnRzLnVuc2hpZnQoZXZlbnQpXG59XG5cbi8vIENyZWF0ZXMgYW4gZXZlbnQgYW5kIGluc2VydCBpdCB0byB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9jcmVhdGVFdmVudCA9IGZ1bmN0aW9uKGZ1bmMsIGRlYWRsaW5lKSB7XG4gIHJldHVybiBuZXcgRXZlbnQodGhpcywgZGVhZGxpbmUsIGZ1bmMpXG59XG5cbi8vIEluc2VydHMgYW4gZXZlbnQgdG8gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5faW5zZXJ0RXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLl9ldmVudHMuc3BsaWNlKHRoaXMuX2luZGV4QnlUaW1lKGV2ZW50Ll9lYXJsaWVzdFRpbWUpLCAwLCBldmVudClcbn1cblxuLy8gUmVtb3ZlcyBhbiBldmVudCBmcm9tIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX3JlbW92ZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGluZCA9IHRoaXMuX2V2ZW50cy5pbmRleE9mKGV2ZW50KVxuICBpZiAoaW5kICE9PSAtMSkgdGhpcy5fZXZlbnRzLnNwbGljZShpbmQsIDEpXG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiBgZXZlbnRgIGlzIGluIHF1ZXVlLCBmYWxzZSBvdGhlcndpc2VcbldBQUNsb2NrLnByb3RvdHlwZS5faGFzRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuIHJldHVybiB0aGlzLl9ldmVudHMuaW5kZXhPZihldmVudCkgIT09IC0xXG59XG5cbi8vIFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBldmVudCB3aG9zZSBkZWFkbGluZSBpcyA+PSB0byBgZGVhZGxpbmVgXG5XQUFDbG9jay5wcm90b3R5cGUuX2luZGV4QnlUaW1lID0gZnVuY3Rpb24oZGVhZGxpbmUpIHtcbiAgLy8gcGVyZm9ybXMgYSBiaW5hcnkgc2VhcmNoXG4gIHZhciBsb3cgPSAwXG4gICAgLCBoaWdoID0gdGhpcy5fZXZlbnRzLmxlbmd0aFxuICAgICwgbWlkXG4gIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgbWlkID0gTWF0aC5mbG9vcigobG93ICsgaGlnaCkgLyAyKVxuICAgIGlmICh0aGlzLl9ldmVudHNbbWlkXS5fZWFybGllc3RUaW1lIDwgZGVhZGxpbmUpXG4gICAgICBsb3cgPSBtaWQgKyAxXG4gICAgZWxzZSBoaWdoID0gbWlkXG4gIH1cbiAgcmV0dXJuIGxvd1xufVxuXG4vLyBDb252ZXJ0cyBmcm9tIHJlbGF0aXZlIHRpbWUgdG8gYWJzb2x1dGUgdGltZVxuV0FBQ2xvY2sucHJvdG90eXBlLl9hYnNUaW1lID0gZnVuY3Rpb24ocmVsVGltZSkge1xuICByZXR1cm4gcmVsVGltZSArIHRoaXMuY29udGV4dC5jdXJyZW50VGltZVxufVxuXG4vLyBDb252ZXJ0cyBmcm9tIGFic29sdXRlIHRpbWUgdG8gcmVsYXRpdmUgdGltZSBcbldBQUNsb2NrLnByb3RvdHlwZS5fcmVsVGltZSA9IGZ1bmN0aW9uKGFic1RpbWUpIHtcbiAgcmV0dXJuIGFic1RpbWUgLSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWVcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgXCJiZWF0XCI6IFtcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfVxuICBdLFxuICBcInNldHRpbmdzXCI6IHtcbiAgICBcInNhbXBsZVNldFwiOiBcImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9vcmFtaWNzL3NhbXBsZWQvbWFzdGVyL0RNL0NSLTc4L3NhbXBsZWQuaW5zdHJ1bWVudC5qc29uXCIsXG4gICAgXCJicG1cIjogNDYwLFxuICAgIFwiaW5pdEdhaW5cIjogMC41LFxuICAgIFwibWF4R2FpblwiOiAwLjYsXG4gICAgXCJhdHRhY2tUaW1lXCI6IDAuMjcsXG4gICAgXCJzdXN0YWluVGltZVwiOiAxLjgsXG4gICAgXCJyZWxlYXNlVGltZVwiOiAyLFxuICAgIFwiZGV0dW5lXCI6IDEyMDAsXG4gICAgXCJkZWxheUVuYWJsZWRcIjogXCJ0cnVlXCIsXG4gICAgXCJkZWxheVwiOiAwLjA1LFxuICAgIFwiZmlsdGVyXCI6IDI1OTkuNlxuICB9XG59O1xuIiwiY29uc3QgZ2V0U2V0Rm9ybVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1zZXQtZm9ybS12YWx1ZXMnKTtcblxuZnVuY3Rpb24gZ2V0U2V0Q29udHJvbHMoKSB7XG5cbiAgICB0aGlzLmdldFRyYWNrZXJDb250cm9scyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIGxldCBmb3JtVmFsdWVzID0gbmV3IGdldFNldEZvcm1WYWx1ZXMoKTtcbiAgICAgICAgbGV0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXJDb250cm9sc1wiKTtcbiAgICAgICAgbGV0IHZhbHVlcyA9IGZvcm1WYWx1ZXMuZ2V0KGZvcm0pO1xuICAgICAgICBcbiAgICAgICAgbGV0IHJldCA9IHt9O1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gdmFsdWVzKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdkZWxheUVuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSAndHJ1ZSc7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdzYW1wbGVTZXQnKSB7IFxuICAgICAgICAgICAgICAgIHJldFtrZXldID0gdmFsdWVzW2tleV07XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXRba2V5XSA9IHBhcnNlRmxvYXQodmFsdWVzW2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgdGhpcy5zZXRUcmFja2VyQ29udHJvbHMgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgICAgIGlmICghdmFsdWVzKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSB0aGlzLmdldFRyYWNrZXJDb250cm9scygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHZhbHVlcztcbiAgICB9OyAgXG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRTZXRDb250cm9scztcbiIsIi8vIHJlcXVpcmUoXCJiYWJlbC1wb2x5ZmlsbFwiKTsgXG5jb25zdCBsb2FkU2FtcGxlU2V0ID0gcmVxdWlyZSgnbG9hZC1zYW1wbGUtc2V0Jyk7XG5jb25zdCBzZWxlY3RFbGVtZW50ID0gcmVxdWlyZSgnc2VsZWN0LWVsZW1lbnQnKTtcbmNvbnN0IGdldFNldEZvcm1WYWx1ZXMgPSByZXF1aXJlKCdnZXQtc2V0LWZvcm0tdmFsdWVzJyk7XG5jb25zdCBhZHNyR2Fpbk5vZGUgPSByZXF1aXJlKCdhZHNyLWdhaW4tbm9kZScpO1xuY29uc3QgdHJhY2tlclRhYmxlID0gcmVxdWlyZSgnLi90cmFja2VyLXRhYmxlJyk7XG5jb25zdCBzY2hlZHVsZU1lYXN1cmUgPSByZXF1aXJlKCcuL3NjaGVkdWxlLW1lYXN1cmUnKTtcblxuY29uc3QgZ2V0QXVkaW9PcHRpb25zID0gcmVxdWlyZSgnLi9nZXQtc2V0LWNvbnRyb2xzJyk7XG5jb25zdCBhdWRpb09wdGlvbnMgPSBuZXcgZ2V0QXVkaW9PcHRpb25zKCk7XG5cbmNvbnN0IGN0eCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbmNvbnN0IGRlZmF1bHRUcmFjayA9IHJlcXVpcmUoJy4vZGVmYXVsdC10cmFjaycpO1xuXG4vLyB2YXIgbWVhc3VyZUxlbmd0aCA9IDE2O1xudmFyIGJ1ZmZlcnM7XG52YXIgY3VycmVudFNhbXBsZURhdGE7XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCB0cmFjaykge1xuICAgIFxuICAgIGxvYWRTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCBmdW5jdGlvbiAoc2FtcGxlRGF0YSwgc2FtcGxlQnVmZmVycykge1xuICAgICAgICBidWZmZXJzID0gc2FtcGxlQnVmZmVycztcbiAgICAgICAgXG4gICAgICAgIGlmICghdHJhY2spIHtcbiAgICAgICAgICAgIHRyYWNrID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICB9IFxuXG4gICAgICAgIGN1cnJlbnRTYW1wbGVEYXRhID0gc2FtcGxlRGF0YTtcbiAgICAgICAgc2V0dXBUcmFja2VySHRtbChzYW1wbGVEYXRhLCAxNik7ICAgIFxuICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjaylcbiAgICAgICAgc2V0dXBFdmVudHMoKTtcbiAgICB9KTtcbn1cblxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG5cbiAgICBmb3JtVmFsdWVzLnNldChmb3JtLCBkZWZhdWx0VHJhY2suc2V0dGluZ3MpO1xuICAgIGF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoZGVmYXVsdFRyYWNrLnNldHRpbmdzKTtcbiAgICBcbiAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgZGVmYXVsdFRyYWNrLnNldHRpbmdzLnNhbXBsZVNldCwgZGVmYXVsdFRyYWNrLmJlYXQpO1xuICAgIHNldHVwQmFzZUV2ZW50cygpO1xuICAgIFxuICAgIHZhciBzdG9yYWdlID0gbmV3IHRyYWNrc0xvY2FsU3RvcmFnZSgpO1xuICAgIHN0b3JhZ2Uuc2V0dXBTdG9yYWdlKCk7XG59O1xuXG52YXIgaW5zdHJ1bWVudERhdGEgPSB7fTtcbmZ1bmN0aW9uIHNldHVwVHJhY2tlckh0bWwoZGF0YSwgbWVhc3VyZUxlbmd0aCkge1xuICAgIGluc3RydW1lbnREYXRhID0gZGF0YTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXItcGFyZW50XCIpLmlubmVySFRNTCA9ICcnO1xuICAgIFxuICAgIGxldCBodG1sVGFibGUgPSBuZXcgdHJhY2tlclRhYmxlKCk7XG5cbiAgICBodG1sVGFibGUuc2V0Um93cyhkYXRhLmZpbGVuYW1lLmxlbmd0aCwgbWVhc3VyZUxlbmd0aCk7XG4gICAgdmFyIHN0ciA9IGh0bWxUYWJsZS5nZXRUYWJsZSgpO1xuICAgIFxuICAgIHZhciB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RyYWNrZXItcGFyZW50Jyk7XG4gICAgdC5pbnNlcnRBZGphY2VudEhUTUwoJ2FmdGVyYmVnaW4nLCBzdHIpO1xufVxuXG5mdW5jdGlvbiBkaXNjb25uZWN0Tm9kZShub2RlLCBvcHRpb25zKSB7XG4gICAgbGV0IHRvdGFsTGVuZ3RoID1cbiAgICAgICAgICAgIG9wdGlvbnMuYXR0YWNrVGltZSArIG9wdGlvbnMuc3VzdGFpblRpbWUgKyBvcHRpb25zLnJlbGVhc2VUaW1lO1xuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIG5vZGUuZGlzY29ubmVjdCgpO1xuICAgIH0sIHRvdGFsTGVuZ3RoICogMTAwMCk7XG59XG5cbmZ1bmN0aW9uIHNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKSB7XG4gICAgXG4gICAgbGV0IGluc3RydW1lbnROYW1lID0gaW5zdHJ1bWVudERhdGEuZmlsZW5hbWVbYmVhdC5yb3dJZF07XG4gICAgbGV0IGluc3RydW1lbnQgPSBidWZmZXJzW2luc3RydW1lbnROYW1lXS5nZXQoKTtcblxuICAgIGZ1bmN0aW9uIGNvbm5lY3REZWxheShpbnN0cnVtZW50KSB7XG5cbiAgICAgICAgLy8gV2l0aCBzdXN0YWluIGFuZCBmZWVkYmFjayBmaWx0ZXJcbiAgICAgICAgbGV0IGRlbGF5ID0gY3R4LmNyZWF0ZURlbGF5KCk7XG4gICAgICAgIGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRlbGF5O1xuXG4gICAgICAgIGxldCBnYWluID0gbmV3IGFkc3JHYWluTm9kZShjdHgpO1xuICAgICAgICBnYWluLnNldE9wdGlvbnMoYXVkaW9PcHRpb25zLmdldFRyYWNrZXJDb250cm9scygpKTtcbiAgICAgICAgbGV0IGZlZWRiYWNrR2FpbiA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuXG5cbiAgICAgICAgbGV0IGZpbHRlciA9IGN0eC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAgICAgZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmZpbHRlcjtcblxuICAgICAgICAvLyBkZWxheSAtPiBmZWVkYmFja1xuICAgICAgICBkZWxheS5jb25uZWN0KGZlZWRiYWNrR2Fpbik7XG4gICAgICAgIGRpc2Nvbm5lY3ROb2RlKGRlbGF5LCBhdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCkpO1xuXG4gICAgICAgIC8vIGZlZWRiYWNrIC0+IGZpbHRlclxuICAgICAgICBmZWVkYmFja0dhaW4uY29ubmVjdChmaWx0ZXIpO1xuXG4gICAgICAgIC8vIGZpbHRlciAtPmRlbGF5XG4gICAgICAgIGZpbHRlci5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICBpbnN0cnVtZW50LmRldHVuZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRldHVuZTtcblxuICAgICAgICAvLyBkZWxheSAtPiBpbnN0cnVtZW50XG4gICAgICAgIGluc3RydW1lbnQuY29ubmVjdChkZWxheSk7XG5cbiAgICAgICAgLy8gSW5zdHJ1bWVudCAtPlxuICAgICAgICBpbnN0cnVtZW50LmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAvLyBEZWxheSAtPlxuICAgICAgICBkZWxheS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5zdGFydCh0cmlnZ2VyVGltZSlcbiAgICAgICAgXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29ubmVjdENsZWFuKGluc3RydW1lbnQpIHtcblxuICAgICAgICAvLyBUcmlnZ2VyIHRvbmVcbiAgICAgICAgbGV0IGdhaW4gPSBuZXcgYWRzckdhaW5Ob2RlKGN0eCk7XG4gICAgICAgIGdhaW4uc2V0T3B0aW9ucyhhdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCkpO1xuICAgICAgICBsZXQgZ2Fpbk5vZGUgPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcblxuICAgICAgICBpbnN0cnVtZW50LmRldHVuZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRldHVuZTtcbiAgICAgICAgLy8gaW5zdHJ1bWVudCAtPiBnYWluXG4gICAgICAgIFxuICAgICAgICBpbnN0cnVtZW50LmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICBnYWluTm9kZS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5zdGFydCh0cmlnZ2VyVGltZSk7XG4gICAgfVxuXG4gICAgaWYgKGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRlbGF5RW5hYmxlZCkge1xuICAgICAgICBjb25uZWN0RGVsYXkoaW5zdHJ1bWVudClcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25uZWN0Q2xlYW4oaW5zdHJ1bWVudCk7XG4gICAgfVxufVxuXG52YXIgc2NoZWR1bGUgPSBuZXcgc2NoZWR1bGVNZWFzdXJlKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuXG5mdW5jdGlvbiBzZXR1cEJhc2VFdmVudHMgKCkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgIHNjaGVkdWxlLnJ1blNjaGVkdWxlKGF1ZGlvT3B0aW9ucy5vcHRpb25zLmJwbSk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGF1c2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTsgXG4gICAgfSk7XG4gICAgXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0b3AnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgc2NoZWR1bGUgPSBuZXcgc2NoZWR1bGVNZWFzdXJlKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gbWVhc3VyZUxlbmd0aDtcbiAgICB9KTtcbiAgICBcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnBtJykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgYXVkaW9PcHRpb25zLnNldFRyYWNrZXJDb250cm9scygpO1xuICAgICAgICBpZiAoc2NoZWR1bGUucnVubmluZykge1xuICAgICAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICAgICAgc2NoZWR1bGUucnVuU2NoZWR1bGUoYXVkaW9PcHRpb25zLm9wdGlvbnMuYnBtKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lYXN1cmVMZW5ndGgnKS5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICAoZSkgPT4ge1xuXG4gICAgICAgIC8vbGV0IG1lYXN1cmVMZW5ndGggPSB0aGlzLnZhbHVlO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhtZWFzdXJlTGVuZ3RoKVxuICAgICAgICAkKCcjbWVhc3VyZUxlbmd0aCcpLmJpbmQoJ2tleXByZXNzIGtleWRvd24ga2V5dXAnLCAoZSkgPT57XG4gICAgICAgICAgICBpZihlLmtleUNvZGUgPT0gMTMpIHsgXG5cbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7IFxuXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lYXN1cmVMZW5ndGgnKS52YWx1ZTtcbiAgICAgICAgICAgICAgICBsZXQgbGVuZ3RoID0gcGFyc2VJbnQodmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChsZW5ndGggPCAxKSByZXR1cm47XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUubWVhc3VyZUxlbmd0aCA9IGxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgICAgICAgICAgbGV0IHRyYWNrID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpOyAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBzZXR1cFRyYWNrZXJIdG1sKGN1cnJlbnRTYW1wbGVEYXRhLCBsZW5ndGgpO1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSBsZW5ndGg7XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUubG9hZFRyYWNrZXJWYWx1ZXModHJhY2spXG4gICAgICAgICAgICAgICAgc2V0dXBFdmVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ2VudGVyZWQnKVxuXG4gICAgfSk7XG4gICAgXG4gICAgXG4gICAgJCgnLmJhc2UnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBhdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgfSk7XG59XG4gICAgXG5mdW5jdGlvbiBzZXR1cEV2ZW50cygpIHtcbiAgICBcbiAgICAkKCcuY2VsbCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmRhdGFzZXQpO1xuICAgICAgICB2YWwuZW5hYmxlZCA9ICQodGhpcykuaGFzQ2xhc3MoXCJlbmFibGVkXCIpO1xuXG4gICAgICAgIGxldCBjdXJyZW50QmVhdCA9ICQoJy5jdXJyZW50JykuZGF0YSgnY2VsbC1pZCcpO1xuICAgICAgICBpZiAodmFsLmNlbGxJZCA+IGN1cnJlbnRCZWF0KSB7XG4gICAgICAgICAgICBzY2hlZHVsZS5zY2hlZHVsZUF1ZGlvQmVhdE5vdyh2YWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCh0aGlzKS50b2dnbGVDbGFzcygnZW5hYmxlZCcpO1xuICAgIH0pO1xufVxuXG4kKCcjc2FtcGxlU2V0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdGhpcy52YWx1ZSk7XG59KTtcblxuXG5cbmZ1bmN0aW9uIHRyYWNrc0xvY2FsU3RvcmFnZSAoKSB7XG5cbiAgICB0aGlzLnNldExvY2FsU3RvcmFnZSA9IGZ1bmN0aW9uKHVwZGF0ZSkge1xuICAgICAgICB2YXIgc3RvcmFnZSA9IHt9O1xuICAgICAgICBzdG9yYWdlWydTZWxlY3QnXSA9ICdMb2FkIHNlbGVjdGVkJztcblxuXG4gICAgICAgIGZvciAoIHZhciBpID0gMCwgbGVuID0gbG9jYWxTdG9yYWdlLmxlbmd0aDsgaSA8IGxlbjsgKytpICkge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSBsb2NhbFN0b3JhZ2Uua2V5KGkpO1xuICAgICAgICAgICAgc3RvcmFnZVtpdGVtXSA9IGl0ZW07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgc2VsZWN0IGVsZW1lbnRcbiAgICAgICAgdmFyIHMgPSBuZXcgc2VsZWN0RWxlbWVudChcbiAgICAgICAgICAgICdsb2FkLXN0b3JhZ2UnLCAvLyBpZCB0byBhcHBlbmQgdGhlIHNlbGVjdCBsaXN0IHRvXG4gICAgICAgICAgICAnYmVhdC1saXN0JywgLy8gaWQgb2YgdGhlIHNlbGVjdCBsaXN0XG4gICAgICAgICAgICBzdG9yYWdlIC8vXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKHVwZGF0ZSkge1xuICAgICAgICAgICAgcy51cGRhdGUoJ2JlYXQtbGlzdCcsIHN0b3JhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcy5jcmVhdGUoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnNldHVwU3RvcmFnZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBsZXQgZm9ybURhdGEgPSBhdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSAkKCcjZmlsZW5hbWUnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghZmlsZW5hbWUpIHtcbiAgICAgICAgICAgICAgICBmaWxlbmFtZSA9ICd1bnRpdGxlZCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBiZWF0ID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICAgICAgbGV0IHNvbmcgPSB7XCJiZWF0XCI6IGJlYXQsIFwic2V0dGluZ3NcIjogZm9ybURhdGF9XG5cbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGZpbGVuYW1lLCBKU09OLnN0cmluZ2lmeShzb25nKSk7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBhbGVydCgnVHJhY2sgc2F2ZWQnKTsgfSwgMSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiZWF0LWxpc3QnKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSAkKCcjYmVhdC1saXN0JykudmFsKCk7XG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gJ1NlbGVjdCcpIHsgICAgXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gaXRlbTtcbiAgICAgICAgICAgIGxldCB0cmFjayA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oaXRlbSkpO1xuICAgICAgICAgICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgICAgICAgICAgbGV0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXJDb250cm9sc1wiKTtcblxuICAgICAgICAgICAgZm9ybVZhbHVlcy5zZXQoZm9ybSwgdHJhY2suc2V0dGluZ3MpO1xuICAgICAgICAgICAgYXVkaW9PcHRpb25zLnNldFRyYWNrZXJDb250cm9scyh0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG5cbiAgICAgICAgICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0cmFjay5zZXR0aW5ncy5zYW1wbGVTZXQsIHRyYWNrLmJlYXQpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkZWxldGUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiZWF0LWxpc3QnKTtcbiAgICAgICAgICAgIGxldCB0b0RlbGV0ZSA9IGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnRleHQ7XG5cbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRvRGVsZXRlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gJyc7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG5cbiAgICAgICAgfSk7XG4gICAgfTtcbiB9XG4gIiwiY29uc3QgV0FBQ2xvY2sgPSByZXF1aXJlKCd3YWFjbG9jaycpO1xuY29uc3QgZ2V0QXVkaW9PcHRpb25zID0gcmVxdWlyZSgnLi9nZXQtc2V0LWNvbnRyb2xzJyk7XG5jb25zdCBhdWRpb09wdGlvbnMgPSBuZXcgZ2V0QXVkaW9PcHRpb25zKCk7XG5cbmZ1bmN0aW9uIHNjaGVkdWxlTWVhc3VyZShjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KSB7XG4gICAgXG4gICAgdGhpcy5tZWFzdXJlTGVuZ3RoID0gMTY7XG4gICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdCA9IHNjaGVkdWxlQXVkaW9CZWF0O1xuICAgIHRoaXMuc2NoZWR1bGVGb3J3YXJkID0gMC4xO1xuICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgdGhpcy5ldmVudE1hcCA9IHt9O1xuICAgIHRoaXMuY2xvY2sgPSBuZXcgV0FBQ2xvY2soY3R4KTtcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XG4gICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG5cbiAgICB0aGlzLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudCsrO1xuICAgICAgICBpZiAodGhpcy5jdXJyZW50ID49IHRoaXMubWVhc3VyZUxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5taWxsaVBlckJlYXQgPSBmdW5jdGlvbiAoYmVhdHMpIHtcbiAgICAgICAgaWYgKCFiZWF0cykge1xuICAgICAgICAgICAgYmVhdHMgPSA2MDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTAwMCAqIDYwIC8gYmVhdHM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VHJhY2tlclJvd1ZhbHVlcyA9IGZ1bmN0aW9uIChjZWxsSWQpIHtcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtY2VsbC1pZD1cIiR7Y2VsbElkfVwiXWA7XG5cbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGVsZW1zLmZvckVhY2goKGVsKSA9PiB7XG4gICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgZWwuZGF0YXNldCk7XG4gICAgICAgICAgICB2YWwuZW5hYmxlZCA9IGVsLmNsYXNzTGlzdC5jb250YWlucygnZW5hYmxlZCcpO1xuICAgICAgICAgICAgdmFsdWVzLnB1c2godmFsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfTtcbiAgICBcblxuICAgIHRoaXMuc2NoZWR1bGUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgbGV0IGJlYXRzID0gdGhpcy5nZXRUcmFja2VyUm93VmFsdWVzKHRoaXMuY3VycmVudCk7XG4gICAgICAgIGxldCBub3cgPSBjdHguY3VycmVudFRpbWU7XG5cbiAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLWNlbGwtaWQ9XCIke3RoaXMuY3VycmVudH1cIl1gO1xuXG4gICAgICAgIGxldCBldmVudCA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgJChzZWxlY3RvcikuYWRkQ2xhc3MoJ2N1cnJlbnQnKTtcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQpO1xuXG4gICAgICAgIHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgJChzZWxlY3RvcikucmVtb3ZlQ2xhc3MoJ2N1cnJlbnQnKTtcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQgKyB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwKTtcblxuICAgICAgICBiZWF0cy5mb3JFYWNoKChiZWF0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlQmVhdChiZWF0LCBub3cpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5zY2hlZHVsZUJlYXQgPSBmdW5jdGlvbiAoYmVhdCwgbm93KSB7XG5cbiAgICAgICAgbGV0IHRyaWdnZXJUaW1lID0gbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQ7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVNYXBbYmVhdC5jZWxsSWRdID0gdHJpZ2dlclRpbWU7XG4gICAgICAgIGlmIChiZWF0LmVuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKTtcbiAgICAgICAgICAgIH0sIG5vdyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5zY2hlZHVsZU1hcCA9IHt9O1xuXG4gICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdE5vdyA9IGZ1bmN0aW9uIChiZWF0KSB7XG5cbiAgICAgICAgaWYgKGJlYXQuZW5hYmxlZCkge1xuICAgICAgICAgICAgbGV0IGJlYXRFdmVudCA9IHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV07XG4gICAgICAgICAgICBpZiAoYmVhdEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgYmVhdEV2ZW50LmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSB0aGlzLnNjaGVkdWxlTWFwWzBdICsgYmVhdC5jZWxsSWQgKiB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwO1xuICAgICAgICBsZXQgbm93ID0gY3R4LmN1cnJlbnRUaW1lO1xuICAgICAgICB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKTtcbiAgICAgICAgfSwgbm93KTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbnRlcnZhbDtcbiAgICB0aGlzLnJ1blNjaGVkdWxlID0gZnVuY3Rpb24gKGJwbSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmJwbSA9IGJwbTtcbiAgICAgICAgbGV0IGludGVydmFsID0gdGhpcy5taWxsaVBlckJlYXQoYnBtKTtcblxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGUoKTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICB9LCAwKTtcblxuICAgICAgICB0aGlzLmludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG5cbiAgICAgICAgfSwgaW50ZXJ2YWwpO1xuICAgIH07XG5cbiAgICB0aGlzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRFdmVudEtleSA9IGZ1bmN0aW9uIGdldEV2ZW50S2V5KGJlYXQpIHtcbiAgICAgICAgcmV0dXJuIGJlYXQucm93SWQgKyBiZWF0LmNlbGxJZDtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0VHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICAgICAkKFwiLmNlbGxcIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5kYXRhc2V0KTtcbiAgICAgICAgICAgIHZhbC5lbmFibGVkID0gJCh0aGlzKS5oYXNDbGFzcyhcImVuYWJsZWRcIik7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh2YWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9O1xuICAgIFxuICAgIHRoaXMubG9hZFRyYWNrZXJWYWx1ZXMgPSBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICQoJy5jZWxsJykucmVtb3ZlQ2xhc3MoJ2VuYWJsZWQnKTtcbiAgICAgICAganNvbi5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgICAgICBpZiAoZWxlbS5lbmFibGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLXJvdy1pZD1cIiR7ZWxlbS5yb3dJZH1cIl1bZGF0YS1jZWxsLWlkPVwiJHtlbGVtLmNlbGxJZH1cIl1gO1xuICAgICAgICAgICAgICAgICQoc2VsZWN0b3IpLmFkZENsYXNzKFwiZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNjaGVkdWxlTWVhc3VyZTsiLCJmdW5jdGlvbiB0cmFja2VyVGFibGUoKSB7XG4gICAgXG4gICAgdGhpcy5zdHIgPSAnJztcbiAgICB0aGlzLmdldFRhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJzx0YWJsZSBpZD1cInRyYWNrZXJcIj4nICsgdGhpcy5zdHIgKyAnPC90YWJsZT4nO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5zZXRIZWFkZXIgPSBmdW5jdGlvbiAobnVtQ2VsbHMpIHtcblxuICAgICAgICB0aGlzLnN0ciArPSBgPHRyIGNsYXNzPVwicm93IGhlYWRlclwiPmA7XG4gICAgICAgIHRoaXMuc3RyICs9IHRoaXMuZ2V0Q2VsbHMoJ2hlYWRlcicsIG51bUNlbGxzLCB0cnVlKTtcbiAgICAgICAgdGhpcy5zdHIgKz0gYDwvdHI+YDtcbiAgICAgICAgXG4gICAgfTtcbiAgICBcbiAgICB0aGlzLnNldFJvd3MgPSBmdW5jdGlvbiAobnVtUm93cywgbnVtQ2VsbHMpIHtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0SGVhZGVyKG51bUNlbGxzKTtcbiAgICAgICAgZm9yIChsZXQgcm93SUQgPSAwOyByb3dJRCA8IG51bVJvd3M7IHJvd0lEKyspIHtcbiAgICAgICAgICAgIHRoaXMuc3RyICs9IGA8dHIgY2xhc3M9XCJyb3dcIiBkYXRhLWlkPVwiJHtyb3dJRH1cIj5gO1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gdGhpcy5nZXRDZWxscyhyb3dJRCwgbnVtQ2VsbHMpO1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gYDwvdHI+YDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRDZWxscyA9IGZ1bmN0aW9uKHJvd0lELCBudW1DZWxscywgaGVhZGVyKSB7XG4gICAgICAgIHZhciBzdHIgPSAnJztcbiAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBudW1DZWxsczsgYysrKSB7XG4gICAgICAgICAgICBzdHIgKz0gYDx0ZCBjbGFzcz1cImNlbGxcIiBkYXRhLXJvdy1pZD1cIiR7cm93SUR9XCIgZGF0YS1jZWxsLWlkPVwiJHtjfVwiPmA7XG4gICAgICAgICAgICBpZiAoaGVhZGVyKXN0ciArPSBjICsgMTtcbiAgICAgICAgICAgIHN0ciArPSBgPC90ZD5gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0cmFja2VyVGFibGU7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIl19
