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
    "filter": 2599.6,
    "measureLength": 16
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

var buffers;
var currentSampleData;
var storage;
var trackerDebug;

function initializeSampleSet(ctx, dataUrl, track) {
    
    loadSampleSet(ctx, dataUrl, function (sampleData, sampleBuffers) {
        buffers = sampleBuffers;
        
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
    audioOptions.setTrackerControls(defaultTrack.settings);
    
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
        let formData = audioOptions.getTrackerControls();
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
            audioOptions.setTrackerControls(track.settings);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2V0LXNldC1mb3JtLXZhbHVlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2FkLXNhbXBsZS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc2VsZWN0LWVsZW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdGlueS1zYW1wbGUtbG9hZGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2xpYi9XQUFDbG9jay5qcyIsInNyYy9kZWZhdWx0LXRyYWNrLmpzIiwic3JjL2dldC1zZXQtY29udHJvbHMuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9zY2hlZHVsZS1tZWFzdXJlLmpzIiwic3JjL3RyYWNrZXItdGFibGUuanMiLCIuLi8uLi8uLi91c3IvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDek9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2oyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIEdhaW4oY3R4KSB7XG5cbiAgICB0aGlzLmN0eCA9IGN0eDtcblxuICAgIHRoaXMuc2Vjb25kc1RvVGltZUNvbnN0YW50ID0gZnVuY3Rpb24gKHNlYykge1xuICAgICAgICByZXR1cm4gKHNlYyAqIDIpIC8gODtcbiAgICB9O1xuXG4gICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgICBpbml0R2FpbjogMC4xLCAvLyBJbml0IGdhaW4gb24gbm90ZVxuICAgICAgICBtYXhHYWluOiAxLjAsIC8vIE1heCBnYWluIG9uIG5vdGVcbiAgICAgICAgYXR0YWNrVGltZTogMC4xLCAvLyBBdHRhY2tUaW1lLiBnYWluLmluaXQgdG8gZ2Fpbi5tYXggaW4gYXR0YWNrVGltZVxuICAgICAgICBzdXN0YWluVGltZTogMSwgLy8gU3VzdGFpbiBub3RlIGluIHRpbWVcbiAgICAgICAgcmVsZWFzZVRpbWU6IDEsIC8vIEFwcHJveGltYXRlZCBlbmQgdGltZS4gQ2FsY3VsYXRlZCB3aXRoIHNlY29uZHNUb1RpbWVDb25zdGFudCgpXG4gICAgICAgIC8vIGRpc2Nvbm5lY3Q6IGZhbHNlIC8vIFNob3VsZCB3ZSBhdXRvZGlzY29ubmVjdC4gRGVmYXVsdCBpcyB0cnVlXG4gICAgfTtcblxuICAgIHRoaXMuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2Fpbk5vZGU7XG4gICAgLyoqXG4gICAgICogVGhlIGdhaW5Ob2RlXG4gICAgICogQHBhcmFtIHtmbG9hdH0gYmVnaW4gY3R4IHRpbWVcbiAgICAgKiBAcmV0dXJucyB7R2Fpbi5nZXRHYWluTm9kZS5nYWluTm9kZX1cbiAgICAgKi9cbiAgICB0aGlzLmdldEdhaW5Ob2RlID0gZnVuY3Rpb24gKGJlZ2luKSB7XG5cbiAgICAgICAgdGhpcy5nYWluTm9kZSA9IHRoaXMuY3R4LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlID0gdGhpcy5vcHRpb25zLmluaXRHYWluO1xuXG4gICAgICAgIC8vIEF0dGFjayB0byBtYXhcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnNldFRhcmdldEF0VGltZShcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubWF4R2FpbixcbiAgICAgICAgICAgICAgICBiZWdpbiArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lLFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lKTtcblxuICAgICAgICAvLyBTdXN0YWluIGFuZCBlbmQgbm90ZVxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKFxuICAgICAgICAgICAgICAgIDAuMCxcbiAgICAgICAgICAgICAgICBiZWdpbiArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lICsgdGhpcy5vcHRpb25zLnN1c3RhaW5UaW1lLFxuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kc1RvVGltZUNvbnN0YW50KHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZSkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5kaXNjb25uZWN0ICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0KGJlZ2luKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2Fpbk5vZGU7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUgKyB0aGlzLm9wdGlvbnMucmVsZWFzZVRpbWU7XG4gICAgICAgIFxuICAgICAgICBzZXRUaW1lb3V0KCAoKT0+ICB7XG4gICAgICAgICAgICB0aGlzLmdhaW5Ob2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdG90YWxMZW5ndGggKiAxMDAwKTtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdhaW47IiwiLy8gRnJvbTogaHR0cHM6Ly9kZXYub3BlcmEuY29tL2FydGljbGVzL2RydW0tc291bmRzLXdlYmF1ZGlvL1xuZnVuY3Rpb24gSW5zdHJ1bWVudChjb250ZXh0LCBidWZmZXIpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xufVxuXG5JbnN0cnVtZW50LnByb3RvdHlwZS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICB0aGlzLnNvdXJjZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG59O1xuXG5JbnN0cnVtZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgdGhpcy5zb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlO1xufTtcblxuSW5zdHJ1bWVudC5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdGhpcy5zZXR1cCgpO1xuICAgIHRoaXMuc291cmNlLnN0YXJ0KHRpbWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnN0cnVtZW50O1xuIiwiZnVuY3Rpb24gZ2V0RWxlbUNvdW50QnlOYW1lIChuYW1lKSB7XG4gICAgdmFyIG5hbWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUobmFtZSk7XG4gICAgcmV0dXJuIG5hbWVzLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gZ2V0Rm9ybVZhbHVlcyhmb3JtRWxlbWVudCkge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuICAgICAgICBzd2l0Y2ggKGVsZW0udHlwZSkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2luZ2xlIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgdmFyIG51bUVsZW1zID0gZ2V0RWxlbUNvdW50QnlOYW1lKGVsZW0ubmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKG51bUVsZW1zID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZm9ybVBhcmFtc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTXVsdGlwbGVcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZm9ybVBhcmFtc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBbZWxlbS52YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0ucHVzaChlbGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdFZhbHVlcyA9IGdldFNlbGVjdFZhbHVlcyhlbGVtKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gc2VsZWN0VmFsdWVzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0udmFsdWUgIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZvcm1QYXJhbXM7XG59XG5cbmZ1bmN0aW9uIHNldEZvcm1WYWx1ZXMoZm9ybUVsZW1lbnQsIHZhbHVlcykge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuICAgICAgICBcbiAgICAgICAgaWYgKCAhKGVsZW0ubmFtZSBpbiB2YWx1ZXMpICkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZWxlbS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSA9PT0gZWxlbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0uaW5kZXhPZihlbGVtLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFNlbGVjdFZhbHVlcyhlbGVtLCB2YWx1ZXNbZWxlbS5uYW1lXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS52YWx1ZSA9IHZhbHVlc1tlbGVtLm5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0U2VsZWN0VmFsdWVzKHNlbGVjdEVsZW0sIHZhbHVlcykge1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0RWxlbS5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBvcHRpb25zLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgICAgICBvcHQgPSBvcHRpb25zW2ldO1xuICAgICAgICBpZiAodmFsdWVzLmluZGV4T2Yob3B0LnZhbHVlKSA+IC0xICkge1xuICAgICAgICAgICAgb3B0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICB9ICAgICAgICBcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFNlbGVjdFZhbHVlcyhzZWxlY3QpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIG9wdGlvbnMgPSBzZWxlY3QgJiYgc2VsZWN0Lm9wdGlvbnM7XG4gICAgdmFyIG9wdDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcblxuICAgICAgICBpZiAob3B0LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChvcHQudmFsdWUgfHwgb3B0LnRleHQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdldFNldEZvcm1WYWx1ZXMgKCkge1xuICAgIHRoaXMuc2V0ID0gc2V0Rm9ybVZhbHVlcztcbiAgICB0aGlzLmdldCA9IGdldEZvcm1WYWx1ZXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U2V0Rm9ybVZhbHVlcztcbiIsInZhciB0aW55U2FtcGxlTG9hZGVyID0gcmVxdWlyZSgndGlueS1zYW1wbGUtbG9hZGVyJyk7XG52YXIgYXVkaW9CdWZmZXJJbnN0cnVtZW50ID0gcmVxdWlyZSgnYXVkaW8tYnVmZmVyLWluc3RydW1lbnQnKTtcblxuZnVuY3Rpb24gbG9hZFNhbXBsZVNldChjdHgsIGRhdGFVcmwsIGNiKSB7XG4gICAgXG4gICAgZmV0Y2goZGF0YVVybCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyAhPT0gMjAwKSB7ICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb29rcyBsaWtlIHRoZXJlIHdhcyBhIHByb2JsZW0uIFN0YXR1cyBDb2RlOiAnICsgIHJlc3BvbnNlLnN0YXR1cyk7ICBcbiAgICAgICAgICAgIHJldHVybjsgIFxuICAgICAgICB9XG5cbiAgICAgICAgcmVzcG9uc2UuanNvbigpLnRoZW4oZnVuY3Rpb24oZGF0YSkgeyAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBiYXNlVXJsID0gZGF0YS5zYW1wbGVzO1xuICAgICAgICAgICAgdmFyIGJ1ZmZlcnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBwcm9taXNlcyA9IFtdO1xuXG4gICAgICAgICAgICBkYXRhLmZpbGVuYW1lID0gW107XG4gICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICBkYXRhLmZpbGVzLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgIHZhciBmaWxlbmFtZSA9IHZhbC5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIik7XG4gICAgICAgICAgICAgICAgZGF0YS5maWxlbmFtZS5wdXNoKGZpbGVuYW1lKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVtb3RlVXJsID0gYmFzZVVybCArIHZhbDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBsZXQgbG9hZGVyUHJvbWlzZSA9IHRpbnlTYW1wbGVMb2FkZXIocmVtb3RlVXJsLCBjdHgsIChidWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYnVmZmVyc1tmaWxlbmFtZV0gPSBuZXcgYXVkaW9CdWZmZXJJbnN0cnVtZW50KGN0eCwgYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKGxvYWRlclByb21pc2UpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFByb21pc2UuYWxsKHByb21pc2VzKS50aGVuKHZhbHVlcyA9PiB7IFxuICAgICAgICAgICAgICAgIGNiKGRhdGEsIGJ1ZmZlcnMpO1xuICAgICAgICAgICAgfSkuY2F0Y2goZSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIH0pOyAgICBcbiAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHsgIFxuICAgICAgICBjb25zb2xlLmxvZygnRmV0Y2ggRXJyb3IgOi1TJywgZXJyKTsgIFxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvYWRTYW1wbGVTZXQ7IiwiZnVuY3Rpb24gc2VsZWN0RWxlbWVudChhcHBlbmRUb0lELCBzZWxlY3RJRCwgb3B0aW9ucywgc2VsZWN0ZWQpIHtcblxuICAgIHRoaXMuYXBwZW5kVG9JRCA9IGFwcGVuZFRvSUQ7XG4gICAgdGhpcy5zZWxlY3RJRCA9IHNlbGVjdElEO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuICAgIFxuICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcHBlbmRUb0lEID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpO1xuICAgICAgICBzZWxlY3RMaXN0LmlkID0gdGhpcy5zZWxlY3RJRDsgICAgICAgIFxuICAgICAgICBhcHBlbmRUb0lELmFwcGVuZENoaWxkKHNlbGVjdExpc3QpO1xuICAgICAgICB0aGlzLnVwZGF0ZShzZWxlY3RJRCwgdGhpcy5vcHRpb25zLCB0aGlzLnNlbGVjdGVkKTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGVsZW0sIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG4gICAgICAgIHRoaXMuZGVsZXRlKGVsZW0pO1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICBvcHRpb24udmFsdWUgPSBrZXk7XG4gICAgICAgICAgICBvcHRpb24udGV4dCA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIHNlbGVjdExpc3QuYXBwZW5kQ2hpbGQob3B0aW9uKTtcblxuICAgICAgICAgICAgaWYgKGtleSA9PT0gc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb24uc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNlbGVjdGVkID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgdmFyIG9wdDtcbiAgICAgICAgZm9yICggdmFyIGkgPSAwLCBsZW4gPSBzZWxlY3RMaXN0Lm9wdGlvbnMubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XG4gICAgICAgICAgICBvcHQgPSBzZWxlY3RMaXN0Lm9wdGlvbnNbaV07XG4gICAgICAgICAgICBpZiAoIG9wdC5zZWxlY3RlZCA9PT0gdHJ1ZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0LnZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3Q9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIGZvciAodmFyIG9wdGlvbiBpbiBzZWxlY3RMaXN0KXtcbiAgICAgICAgICAgIHNlbGVjdExpc3QucmVtb3ZlKG9wdGlvbik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0QXNTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIGVsZW1lbnRIdG1sID0gZWxlbWVudC5vdXRlckhUTUw7XG4gICAgICAgIHJldHVybiBlbGVtZW50SHRtbDtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdEVsZW1lbnQ7IiwiZnVuY3Rpb24gc2FtcGxlTG9hZGVyICh1cmwsIGNvbnRleHQsIGNhbGxiYWNrKSB7XG4gICAgXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIFxuICAgICAgICByZXF1ZXN0Lm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZihyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKXtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoJ3NhbXBsZUxvYWRlciByZXF1ZXN0IHN1Y2Nlc3MnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdzYW1wbGVMb2FkZXIgcmVxdWVzdCBmYWlsZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNhbXBsZUxvYWRlcjsiLCJ2YXIgV0FBQ2xvY2sgPSByZXF1aXJlKCcuL2xpYi9XQUFDbG9jaycpXG5cbm1vZHVsZS5leHBvcnRzID0gV0FBQ2xvY2tcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgd2luZG93LldBQUNsb2NrID0gV0FBQ2xvY2tcbiIsInZhciBpc0Jyb3dzZXIgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG5cbnZhciBDTE9DS19ERUZBVUxUUyA9IHtcbiAgdG9sZXJhbmNlTGF0ZTogMC4xMCxcbiAgdG9sZXJhbmNlRWFybHk6IDAuMDAxXG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IEV2ZW50ID09PT09PT09PT09PT09PT09PT09IC8vXG52YXIgRXZlbnQgPSBmdW5jdGlvbihjbG9jaywgZGVhZGxpbmUsIGZ1bmMpIHtcbiAgdGhpcy5jbG9jayA9IGNsb2NrXG4gIHRoaXMuZnVuYyA9IGZ1bmNcbiAgdGhpcy5fY2xlYXJlZCA9IGZhbHNlIC8vIEZsYWcgdXNlZCB0byBjbGVhciBhbiBldmVudCBpbnNpZGUgY2FsbGJhY2tcblxuICB0aGlzLnRvbGVyYW5jZUxhdGUgPSBjbG9jay50b2xlcmFuY2VMYXRlXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBjbG9jay50b2xlcmFuY2VFYXJseVxuICB0aGlzLl9sYXRlc3RUaW1lID0gbnVsbFxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSBudWxsXG4gIHRoaXMuZGVhZGxpbmUgPSBudWxsXG4gIHRoaXMucmVwZWF0VGltZSA9IG51bGxcblxuICB0aGlzLnNjaGVkdWxlKGRlYWRsaW5lKVxufVxuXG4vLyBVbnNjaGVkdWxlcyB0aGUgZXZlbnRcbkV2ZW50LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICB0aGlzLl9jbGVhcmVkID0gdHJ1ZVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBTZXRzIHRoZSBldmVudCB0byByZXBlYXQgZXZlcnkgYHRpbWVgIHNlY29uZHMuXG5FdmVudC5wcm90b3R5cGUucmVwZWF0ID0gZnVuY3Rpb24odGltZSkge1xuICBpZiAodGltZSA9PT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2RlbGF5IGNhbm5vdCBiZSAwJylcbiAgdGhpcy5yZXBlYXRUaW1lID0gdGltZVxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSlcbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gU2V0cyB0aGUgdGltZSB0b2xlcmFuY2Ugb2YgdGhlIGV2ZW50LlxuLy8gVGhlIGV2ZW50IHdpbGwgYmUgZXhlY3V0ZWQgaW4gdGhlIGludGVydmFsIGBbZGVhZGxpbmUgLSBlYXJseSwgZGVhZGxpbmUgKyBsYXRlXWBcbi8vIElmIHRoZSBjbG9jayBmYWlscyB0byBleGVjdXRlIHRoZSBldmVudCBpbiB0aW1lLCB0aGUgZXZlbnQgd2lsbCBiZSBkcm9wcGVkLlxuRXZlbnQucHJvdG90eXBlLnRvbGVyYW5jZSA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICBpZiAodHlwZW9mIHZhbHVlcy5sYXRlID09PSAnbnVtYmVyJylcbiAgICB0aGlzLnRvbGVyYW5jZUxhdGUgPSB2YWx1ZXMubGF0ZVxuICBpZiAodHlwZW9mIHZhbHVlcy5lYXJseSA9PT0gJ251bWJlcicpXG4gICAgdGhpcy50b2xlcmFuY2VFYXJseSA9IHZhbHVlcy5lYXJseVxuICB0aGlzLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMoKVxuICBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBldmVudCBpcyByZXBlYXRlZCwgZmFsc2Ugb3RoZXJ3aXNlXG5FdmVudC5wcm90b3R5cGUuaXNSZXBlYXRlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yZXBlYXRUaW1lICE9PSBudWxsIH1cblxuLy8gU2NoZWR1bGVzIHRoZSBldmVudCB0byBiZSByYW4gYmVmb3JlIGBkZWFkbGluZWAuXG4vLyBJZiB0aGUgdGltZSBpcyB3aXRoaW4gdGhlIGV2ZW50IHRvbGVyYW5jZSwgd2UgaGFuZGxlIHRoZSBldmVudCBpbW1lZGlhdGVseS5cbi8vIElmIHRoZSBldmVudCB3YXMgYWxyZWFkeSBzY2hlZHVsZWQgYXQgYSBkaWZmZXJlbnQgdGltZSwgaXQgaXMgcmVzY2hlZHVsZWQuXG5FdmVudC5wcm90b3R5cGUuc2NoZWR1bGUgPSBmdW5jdGlvbihkZWFkbGluZSkge1xuICB0aGlzLl9jbGVhcmVkID0gZmFsc2VcbiAgdGhpcy5kZWFkbGluZSA9IGRlYWRsaW5lXG4gIHRoaXMuX3JlZnJlc2hFYXJseUxhdGVEYXRlcygpXG5cbiAgaWYgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA+PSB0aGlzLl9lYXJsaWVzdFRpbWUpIHtcbiAgICB0aGlzLl9leGVjdXRlKClcbiAgXG4gIH0gZWxzZSBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIFxuICB9IGVsc2UgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbn1cblxuRXZlbnQucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgcmF0aW8pIHtcbiAgaWYgKHRoaXMuaXNSZXBlYXRlZCgpKVxuICAgIHRoaXMucmVwZWF0VGltZSA9IHRoaXMucmVwZWF0VGltZSAqIHJhdGlvXG5cbiAgdmFyIGRlYWRsaW5lID0gdFJlZiArIHJhdGlvICogKHRoaXMuZGVhZGxpbmUgLSB0UmVmKVxuICAvLyBJZiB0aGUgZGVhZGxpbmUgaXMgdG9vIGNsb3NlIG9yIHBhc3QsIGFuZCB0aGUgZXZlbnQgaGFzIGEgcmVwZWF0LFxuICAvLyB3ZSBjYWxjdWxhdGUgdGhlIG5leHQgcmVwZWF0IHBvc3NpYmxlIGluIHRoZSBzdHJldGNoZWQgc3BhY2UuXG4gIGlmICh0aGlzLmlzUmVwZWF0ZWQoKSkge1xuICAgIHdoaWxlICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPj0gZGVhZGxpbmUgLSB0aGlzLnRvbGVyYW5jZUVhcmx5KVxuICAgICAgZGVhZGxpbmUgKz0gdGhpcy5yZXBlYXRUaW1lXG4gIH1cbiAgdGhpcy5zY2hlZHVsZShkZWFkbGluZSlcbn1cblxuLy8gRXhlY3V0ZXMgdGhlIGV2ZW50XG5FdmVudC5wcm90b3R5cGUuX2V4ZWN1dGUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY2xvY2suX3N0YXJ0ZWQgPT09IGZhbHNlKSByZXR1cm5cbiAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcblxuICBpZiAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lIDwgdGhpcy5fbGF0ZXN0VGltZSlcbiAgICB0aGlzLmZ1bmModGhpcylcbiAgZWxzZSB7XG4gICAgaWYgKHRoaXMub25leHBpcmVkKSB0aGlzLm9uZXhwaXJlZCh0aGlzKVxuICAgIGNvbnNvbGUud2FybignZXZlbnQgZXhwaXJlZCcpXG4gIH1cbiAgLy8gSW4gdGhlIGNhc2UgYHNjaGVkdWxlYCBpcyBjYWxsZWQgaW5zaWRlIGBmdW5jYCwgd2UgbmVlZCB0byBhdm9pZFxuICAvLyBvdmVycndyaXRpbmcgd2l0aCB5ZXQgYW5vdGhlciBgc2NoZWR1bGVgLlxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpICYmIHRoaXMuaXNSZXBlYXRlZCgpICYmICF0aGlzLl9jbGVhcmVkKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSkgXG59XG5cbi8vIFVwZGF0ZXMgY2FjaGVkIHRpbWVzXG5FdmVudC5wcm90b3R5cGUuX3JlZnJlc2hFYXJseUxhdGVEYXRlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9sYXRlc3RUaW1lID0gdGhpcy5kZWFkbGluZSArIHRoaXMudG9sZXJhbmNlTGF0ZVxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSB0aGlzLmRlYWRsaW5lIC0gdGhpcy50b2xlcmFuY2VFYXJseVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBXQUFDbG9jayA9PT09PT09PT09PT09PT09PT09PSAvL1xudmFyIFdBQUNsb2NrID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICBvcHRzID0gb3B0cyB8fCB7fVxuICB0aGlzLnRpY2tNZXRob2QgPSBvcHRzLnRpY2tNZXRob2QgfHwgJ1NjcmlwdFByb2Nlc3Nvck5vZGUnXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBvcHRzLnRvbGVyYW5jZUVhcmx5IHx8IENMT0NLX0RFRkFVTFRTLnRvbGVyYW5jZUVhcmx5XG4gIHRoaXMudG9sZXJhbmNlTGF0ZSA9IG9wdHMudG9sZXJhbmNlTGF0ZSB8fCBDTE9DS19ERUZBVUxUUy50b2xlcmFuY2VMYXRlXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHRcbiAgdGhpcy5fZXZlbnRzID0gW11cbiAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlXG59XG5cbi8vIC0tLS0tLS0tLS0gUHVibGljIEFQSSAtLS0tLS0tLS0tIC8vXG4vLyBTY2hlZHVsZXMgYGZ1bmNgIHRvIHJ1biBhZnRlciBgZGVsYXlgIHNlY29uZHMuXG5XQUFDbG9jay5wcm90b3R5cGUuc2V0VGltZW91dCA9IGZ1bmN0aW9uKGZ1bmMsIGRlbGF5KSB7XG4gIHJldHVybiB0aGlzLl9jcmVhdGVFdmVudChmdW5jLCB0aGlzLl9hYnNUaW1lKGRlbGF5KSlcbn1cblxuLy8gU2NoZWR1bGVzIGBmdW5jYCB0byBydW4gYmVmb3JlIGBkZWFkbGluZWAuXG5XQUFDbG9jay5wcm90b3R5cGUuY2FsbGJhY2tBdFRpbWUgPSBmdW5jdGlvbihmdW5jLCBkZWFkbGluZSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRXZlbnQoZnVuYywgZGVhZGxpbmUpXG59XG5cbi8vIFN0cmV0Y2hlcyBgZGVhZGxpbmVgIGFuZCBgcmVwZWF0YCBvZiBhbGwgc2NoZWR1bGVkIGBldmVudHNgIGJ5IGByYXRpb2AsIGtlZXBpbmdcbi8vIHRoZWlyIHJlbGF0aXZlIGRpc3RhbmNlIHRvIGB0UmVmYC4gSW4gZmFjdCB0aGlzIGlzIGVxdWl2YWxlbnQgdG8gY2hhbmdpbmcgdGhlIHRlbXBvLlxuV0FBQ2xvY2sucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgZXZlbnRzLCByYXRpbykge1xuICBldmVudHMuZm9yRWFjaChmdW5jdGlvbihldmVudCkgeyBldmVudC50aW1lU3RyZXRjaCh0UmVmLCByYXRpbykgfSlcbiAgcmV0dXJuIGV2ZW50c1xufVxuXG4vLyBSZW1vdmVzIGFsbCBzY2hlZHVsZWQgZXZlbnRzIGFuZCBzdGFydHMgdGhlIGNsb2NrIFxuV0FBQ2xvY2sucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9zdGFydGVkID09PSBmYWxzZSkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHRoaXMuX3N0YXJ0ZWQgPSB0cnVlXG4gICAgdGhpcy5fZXZlbnRzID0gW11cblxuICAgIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdTY3JpcHRQcm9jZXNzb3JOb2RlJykge1xuICAgICAgdmFyIGJ1ZmZlclNpemUgPSAyNTZcbiAgICAgIC8vIFdlIGhhdmUgdG8ga2VlcCBhIHJlZmVyZW5jZSB0byB0aGUgbm9kZSB0byBhdm9pZCBnYXJiYWdlIGNvbGxlY3Rpb25cbiAgICAgIHRoaXMuX2Nsb2NrTm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgMSwgMSlcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbilcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHsgc2VsZi5fdGljaygpIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdtYW51YWwnKSBudWxsIC8vIF90aWNrIGlzIGNhbGxlZCBtYW51YWxseVxuXG4gICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgdGlja01ldGhvZCAnICsgdGhpcy50aWNrTWV0aG9kKVxuICB9XG59XG5cbi8vIFN0b3BzIHRoZSBjbG9ja1xuV0FBQ2xvY2sucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3N0YXJ0ZWQgPT09IHRydWUpIHtcbiAgICB0aGlzLl9zdGFydGVkID0gZmFsc2VcbiAgICB0aGlzLl9jbG9ja05vZGUuZGlzY29ubmVjdCgpXG4gIH0gIFxufVxuXG4vLyAtLS0tLS0tLS0tIFByaXZhdGUgLS0tLS0tLS0tLSAvL1xuXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIHJhbiBwZXJpb2RpY2FsbHksIGFuZCBhdCBlYWNoIHRpY2sgaXQgZXhlY3V0ZXNcbi8vIGV2ZW50cyBmb3Igd2hpY2ggYGN1cnJlbnRUaW1lYCBpcyBpbmNsdWRlZCBpbiB0aGVpciB0b2xlcmFuY2UgaW50ZXJ2YWwuXG5XQUFDbG9jay5wcm90b3R5cGUuX3RpY2sgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGV2ZW50ID0gdGhpcy5fZXZlbnRzLnNoaWZ0KClcblxuICB3aGlsZShldmVudCAmJiBldmVudC5fZWFybGllc3RUaW1lIDw9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZSkge1xuICAgIGV2ZW50Ll9leGVjdXRlKClcbiAgICBldmVudCA9IHRoaXMuX2V2ZW50cy5zaGlmdCgpXG4gIH1cblxuICAvLyBQdXQgYmFjayB0aGUgbGFzdCBldmVudFxuICBpZihldmVudCkgdGhpcy5fZXZlbnRzLnVuc2hpZnQoZXZlbnQpXG59XG5cbi8vIENyZWF0ZXMgYW4gZXZlbnQgYW5kIGluc2VydCBpdCB0byB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9jcmVhdGVFdmVudCA9IGZ1bmN0aW9uKGZ1bmMsIGRlYWRsaW5lKSB7XG4gIHJldHVybiBuZXcgRXZlbnQodGhpcywgZGVhZGxpbmUsIGZ1bmMpXG59XG5cbi8vIEluc2VydHMgYW4gZXZlbnQgdG8gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5faW5zZXJ0RXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLl9ldmVudHMuc3BsaWNlKHRoaXMuX2luZGV4QnlUaW1lKGV2ZW50Ll9lYXJsaWVzdFRpbWUpLCAwLCBldmVudClcbn1cblxuLy8gUmVtb3ZlcyBhbiBldmVudCBmcm9tIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX3JlbW92ZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGluZCA9IHRoaXMuX2V2ZW50cy5pbmRleE9mKGV2ZW50KVxuICBpZiAoaW5kICE9PSAtMSkgdGhpcy5fZXZlbnRzLnNwbGljZShpbmQsIDEpXG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiBgZXZlbnRgIGlzIGluIHF1ZXVlLCBmYWxzZSBvdGhlcndpc2VcbldBQUNsb2NrLnByb3RvdHlwZS5faGFzRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuIHJldHVybiB0aGlzLl9ldmVudHMuaW5kZXhPZihldmVudCkgIT09IC0xXG59XG5cbi8vIFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBldmVudCB3aG9zZSBkZWFkbGluZSBpcyA+PSB0byBgZGVhZGxpbmVgXG5XQUFDbG9jay5wcm90b3R5cGUuX2luZGV4QnlUaW1lID0gZnVuY3Rpb24oZGVhZGxpbmUpIHtcbiAgLy8gcGVyZm9ybXMgYSBiaW5hcnkgc2VhcmNoXG4gIHZhciBsb3cgPSAwXG4gICAgLCBoaWdoID0gdGhpcy5fZXZlbnRzLmxlbmd0aFxuICAgICwgbWlkXG4gIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgbWlkID0gTWF0aC5mbG9vcigobG93ICsgaGlnaCkgLyAyKVxuICAgIGlmICh0aGlzLl9ldmVudHNbbWlkXS5fZWFybGllc3RUaW1lIDwgZGVhZGxpbmUpXG4gICAgICBsb3cgPSBtaWQgKyAxXG4gICAgZWxzZSBoaWdoID0gbWlkXG4gIH1cbiAgcmV0dXJuIGxvd1xufVxuXG4vLyBDb252ZXJ0cyBmcm9tIHJlbGF0aXZlIHRpbWUgdG8gYWJzb2x1dGUgdGltZVxuV0FBQ2xvY2sucHJvdG90eXBlLl9hYnNUaW1lID0gZnVuY3Rpb24ocmVsVGltZSkge1xuICByZXR1cm4gcmVsVGltZSArIHRoaXMuY29udGV4dC5jdXJyZW50VGltZVxufVxuXG4vLyBDb252ZXJ0cyBmcm9tIGFic29sdXRlIHRpbWUgdG8gcmVsYXRpdmUgdGltZSBcbldBQUNsb2NrLnByb3RvdHlwZS5fcmVsVGltZSA9IGZ1bmN0aW9uKGFic1RpbWUpIHtcbiAgcmV0dXJuIGFic1RpbWUgLSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWVcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgXCJiZWF0XCI6IFtcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfVxuICBdLFxuICBcInNldHRpbmdzXCI6IHtcbiAgICBcInNhbXBsZVNldFwiOiBcImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9vcmFtaWNzL3NhbXBsZWQvbWFzdGVyL0RNL0NSLTc4L3NhbXBsZWQuaW5zdHJ1bWVudC5qc29uXCIsXG4gICAgXCJicG1cIjogNDYwLFxuICAgIFwiaW5pdEdhaW5cIjogMC41LFxuICAgIFwibWF4R2FpblwiOiAwLjYsXG4gICAgXCJhdHRhY2tUaW1lXCI6IDAuMjcsXG4gICAgXCJzdXN0YWluVGltZVwiOiAxLjgsXG4gICAgXCJyZWxlYXNlVGltZVwiOiAyLFxuICAgIFwiZGV0dW5lXCI6IDEyMDAsXG4gICAgXCJkZWxheUVuYWJsZWRcIjogXCJ0cnVlXCIsXG4gICAgXCJkZWxheVwiOiAwLjA1LFxuICAgIFwiZmlsdGVyXCI6IDI1OTkuNixcbiAgICBcIm1lYXN1cmVMZW5ndGhcIjogMTZcbiAgfVxufTsiLCJjb25zdCBnZXRTZXRGb3JtVmFsdWVzID0gcmVxdWlyZSgnZ2V0LXNldC1mb3JtLXZhbHVlcycpO1xuXG5mdW5jdGlvbiBnZXRTZXRDb250cm9scygpIHtcblxuICAgIHRoaXMuZ2V0VHJhY2tlckNvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuICAgICAgICBsZXQgdmFsdWVzID0gZm9ybVZhbHVlcy5nZXQoZm9ybSk7XG4gICAgICAgIFxuICAgICAgICBsZXQgcmV0ID0ge307XG4gICAgICAgIGZvciAobGV0IGtleSBpbiB2YWx1ZXMpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2RlbGF5RW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9ICd0cnVlJztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ3NhbXBsZVNldCcpIHsgXG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSB2YWx1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldFtrZXldID0gcGFyc2VGbG9hdCh2YWx1ZXNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB0aGlzLnNldFRyYWNrZXJDb250cm9scyA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgaWYgKCF2YWx1ZXMpIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHRoaXMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0gdmFsdWVzO1xuICAgIH07ICBcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNldENvbnRyb2xzO1xuIiwiLy8gcmVxdWlyZShcImJhYmVsLXBvbHlmaWxsXCIpOyBcbmNvbnN0IGxvYWRTYW1wbGVTZXQgPSByZXF1aXJlKCdsb2FkLXNhbXBsZS1zZXQnKTtcbmNvbnN0IHNlbGVjdEVsZW1lbnQgPSByZXF1aXJlKCdzZWxlY3QtZWxlbWVudCcpO1xuY29uc3QgZ2V0U2V0Rm9ybVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1zZXQtZm9ybS12YWx1ZXMnKTtcbmNvbnN0IGFkc3JHYWluTm9kZSA9IHJlcXVpcmUoJ2Fkc3ItZ2Fpbi1ub2RlJyk7XG5jb25zdCB0cmFja2VyVGFibGUgPSByZXF1aXJlKCcuL3RyYWNrZXItdGFibGUnKTtcbmNvbnN0IHNjaGVkdWxlTWVhc3VyZSA9IHJlcXVpcmUoJy4vc2NoZWR1bGUtbWVhc3VyZScpO1xuXG5jb25zdCBnZXRBdWRpb09wdGlvbnMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IGF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRBdWRpb09wdGlvbnMoKTtcblxuY29uc3QgY3R4ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuY29uc3QgZGVmYXVsdFRyYWNrID0gcmVxdWlyZSgnLi9kZWZhdWx0LXRyYWNrJyk7XG5cbnZhciBidWZmZXJzO1xudmFyIGN1cnJlbnRTYW1wbGVEYXRhO1xudmFyIHN0b3JhZ2U7XG52YXIgdHJhY2tlckRlYnVnO1xuXG5mdW5jdGlvbiBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgZGF0YVVybCwgdHJhY2spIHtcbiAgICBcbiAgICBsb2FkU2FtcGxlU2V0KGN0eCwgZGF0YVVybCwgZnVuY3Rpb24gKHNhbXBsZURhdGEsIHNhbXBsZUJ1ZmZlcnMpIHtcbiAgICAgICAgYnVmZmVycyA9IHNhbXBsZUJ1ZmZlcnM7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRyYWNrKSB7XG4gICAgICAgICAgICB0cmFjayA9IHN0b3JhZ2UuZ2V0VHJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCkge1xuICAgICAgICAgICAgdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCA9IDE2O1xuICAgICAgICB9XG5cbiAgICAgICAgY3VycmVudFNhbXBsZURhdGEgPSBzYW1wbGVEYXRhO1xuICAgICAgICBzZXR1cFRyYWNrZXJIdG1sKHNhbXBsZURhdGEsIHRyYWNrLnNldHRpbmdzLm1lYXN1cmVMZW5ndGgpOyAgIFxuICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjay5iZWF0KVxuICAgICAgICBzZXR1cEV2ZW50cygpO1xuICAgIH0pO1xufVxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG5cbiAgICBmb3JtVmFsdWVzLnNldChmb3JtLCBkZWZhdWx0VHJhY2suc2V0dGluZ3MpO1xuICAgIGF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoZGVmYXVsdFRyYWNrLnNldHRpbmdzKTtcbiAgICBcbiAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgZGVmYXVsdFRyYWNrLnNldHRpbmdzLnNhbXBsZVNldCwgZGVmYXVsdFRyYWNrKTtcbiAgICBzZXR1cEJhc2VFdmVudHMoKTtcbiAgICBcbiAgICBzdG9yYWdlID0gbmV3IHRyYWNrc0xvY2FsU3RvcmFnZSgpO1xuICAgIHN0b3JhZ2Uuc2V0dXBTdG9yYWdlKCk7XG59O1xuXG52YXIgaW5zdHJ1bWVudERhdGEgPSB7fTtcbmZ1bmN0aW9uIHNldHVwVHJhY2tlckh0bWwoZGF0YSwgbWVhc3VyZUxlbmd0aCkge1xuICAgIGluc3RydW1lbnREYXRhID0gZGF0YTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXItcGFyZW50XCIpLmlubmVySFRNTCA9ICcnO1xuICAgIFxuICAgIGxldCBodG1sVGFibGUgPSBuZXcgdHJhY2tlclRhYmxlKCk7XG5cbiAgICBodG1sVGFibGUuc2V0Um93cyhkYXRhLmZpbGVuYW1lLmxlbmd0aCwgbWVhc3VyZUxlbmd0aCk7XG4gICAgdmFyIHN0ciA9IGh0bWxUYWJsZS5nZXRUYWJsZSgpO1xuICAgIFxuICAgIHZhciB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RyYWNrZXItcGFyZW50Jyk7XG4gICAgdC5pbnNlcnRBZGphY2VudEhUTUwoJ2FmdGVyYmVnaW4nLCBzdHIpO1xufVxuXG5mdW5jdGlvbiBkaXNjb25uZWN0Tm9kZShub2RlLCBvcHRpb25zKSB7XG4gICAgbGV0IHRvdGFsTGVuZ3RoID1cbiAgICAgICAgICAgIG9wdGlvbnMuYXR0YWNrVGltZSArIG9wdGlvbnMuc3VzdGFpblRpbWUgKyBvcHRpb25zLnJlbGVhc2VUaW1lO1xuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIG5vZGUuZGlzY29ubmVjdCgpO1xuICAgIH0sIHRvdGFsTGVuZ3RoICogMTAwMCk7XG59XG5cbmZ1bmN0aW9uIHNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKSB7XG4gICAgXG4gICAgbGV0IGluc3RydW1lbnROYW1lID0gaW5zdHJ1bWVudERhdGEuZmlsZW5hbWVbYmVhdC5yb3dJZF07XG4gICAgbGV0IGluc3RydW1lbnQgPSBidWZmZXJzW2luc3RydW1lbnROYW1lXS5nZXQoKTtcblxuICAgIGZ1bmN0aW9uIGNvbm5lY3REZWxheShpbnN0cnVtZW50KSB7XG5cbiAgICAgICAgLy8gV2l0aCBzdXN0YWluIGFuZCBmZWVkYmFjayBmaWx0ZXJcbiAgICAgICAgbGV0IGRlbGF5ID0gY3R4LmNyZWF0ZURlbGF5KCk7XG4gICAgICAgIGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRlbGF5O1xuXG4gICAgICAgIGxldCBnYWluID0gbmV3IGFkc3JHYWluTm9kZShjdHgpO1xuICAgICAgICBnYWluLnNldE9wdGlvbnMoYXVkaW9PcHRpb25zLmdldFRyYWNrZXJDb250cm9scygpKTtcbiAgICAgICAgbGV0IGZlZWRiYWNrR2FpbiA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuXG5cbiAgICAgICAgbGV0IGZpbHRlciA9IGN0eC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAgICAgZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmZpbHRlcjtcblxuICAgICAgICAvLyBkZWxheSAtPiBmZWVkYmFja1xuICAgICAgICBkZWxheS5jb25uZWN0KGZlZWRiYWNrR2Fpbik7XG4gICAgICAgIGRpc2Nvbm5lY3ROb2RlKGRlbGF5LCBhdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCkpO1xuXG4gICAgICAgIC8vIGZlZWRiYWNrIC0+IGZpbHRlclxuICAgICAgICBmZWVkYmFja0dhaW4uY29ubmVjdChmaWx0ZXIpO1xuXG4gICAgICAgIC8vIGZpbHRlciAtPmRlbGF5XG4gICAgICAgIGZpbHRlci5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICBpbnN0cnVtZW50LmRldHVuZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRldHVuZTtcblxuICAgICAgICAvLyBkZWxheSAtPiBpbnN0cnVtZW50XG4gICAgICAgIGluc3RydW1lbnQuY29ubmVjdChkZWxheSk7XG5cbiAgICAgICAgLy8gSW5zdHJ1bWVudCAtPlxuICAgICAgICBpbnN0cnVtZW50LmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAvLyBEZWxheSAtPlxuICAgICAgICBkZWxheS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5zdGFydCh0cmlnZ2VyVGltZSlcbiAgICAgICAgXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29ubmVjdENsZWFuKGluc3RydW1lbnQpIHtcblxuICAgICAgICAvLyBUcmlnZ2VyIHRvbmVcbiAgICAgICAgbGV0IGdhaW4gPSBuZXcgYWRzckdhaW5Ob2RlKGN0eCk7XG4gICAgICAgIGdhaW4uc2V0T3B0aW9ucyhhdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCkpO1xuICAgICAgICBsZXQgZ2Fpbk5vZGUgPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcblxuICAgICAgICBpbnN0cnVtZW50LmRldHVuZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRldHVuZTtcbiAgICAgICAgLy8gaW5zdHJ1bWVudCAtPiBnYWluXG4gICAgICAgIFxuICAgICAgICBpbnN0cnVtZW50LmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICBnYWluTm9kZS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5zdGFydCh0cmlnZ2VyVGltZSk7XG4gICAgfVxuXG4gICAgaWYgKGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRlbGF5RW5hYmxlZCkge1xuICAgICAgICBjb25uZWN0RGVsYXkoaW5zdHJ1bWVudClcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25uZWN0Q2xlYW4oaW5zdHJ1bWVudCk7XG4gICAgfVxufVxuXG52YXIgc2NoZWR1bGUgPSBuZXcgc2NoZWR1bGVNZWFzdXJlKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuXG5mdW5jdGlvbiBzZXR1cEJhc2VFdmVudHMgKCkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgIHNjaGVkdWxlLnJ1blNjaGVkdWxlKGF1ZGlvT3B0aW9ucy5vcHRpb25zLmJwbSk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGF1c2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTsgXG4gICAgfSk7XG4gICAgXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0b3AnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgc2NoZWR1bGUgPSBuZXcgc2NoZWR1bGVNZWFzdXJlKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gbWVhc3VyZUxlbmd0aDtcbiAgICB9KTtcbiAgICBcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnBtJykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgYXVkaW9PcHRpb25zLnNldFRyYWNrZXJDb250cm9scygpO1xuICAgICAgICBpZiAoc2NoZWR1bGUucnVubmluZykge1xuICAgICAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICAgICAgc2NoZWR1bGUucnVuU2NoZWR1bGUoYXVkaW9PcHRpb25zLm9wdGlvbnMuYnBtKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lYXN1cmVMZW5ndGgnKS5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsICAoZSkgPT4ge1xuXG4gICAgICAgICQoJyNtZWFzdXJlTGVuZ3RoJykuYmluZCgna2V5cHJlc3Mga2V5ZG93biBrZXl1cCcsIChlKSA9PntcbiAgICAgICAgICAgIGlmKGUua2V5Q29kZSA9PSAxMykgeyBcblxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTsgXG5cbiAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVhc3VyZUxlbmd0aCcpLnZhbHVlO1xuICAgICAgICAgICAgICAgIGxldCBsZW5ndGggPSBwYXJzZUludCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGxlbmd0aCA8IDEpIHJldHVybjtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gbGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgICAgICAgICBsZXQgdHJhY2sgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7ICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHNldHVwVHJhY2tlckh0bWwoY3VycmVudFNhbXBsZURhdGEsIGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUubWVhc3VyZUxlbmd0aCA9IGxlbmd0aDtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjaylcbiAgICAgICAgICAgICAgICBzZXR1cEV2ZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBcbiAgICAkKCcuYmFzZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoKTtcbiAgICB9KTtcbn1cbiAgICBcbmZ1bmN0aW9uIHNldHVwRXZlbnRzKCkge1xuICAgIFxuICAgICQoJy5jZWxsJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZGF0YXNldCk7XG4gICAgICAgIHZhbC5lbmFibGVkID0gJCh0aGlzKS5oYXNDbGFzcyhcImVuYWJsZWRcIik7XG5cbiAgICAgICAgbGV0IGN1cnJlbnRCZWF0ID0gJCgnLmN1cnJlbnQnKS5kYXRhKCdjZWxsLWlkJyk7XG4gICAgICAgIGlmICh2YWwuY2VsbElkID4gY3VycmVudEJlYXQpIHtcbiAgICAgICAgICAgIHNjaGVkdWxlLnNjaGVkdWxlQXVkaW9CZWF0Tm93KHZhbCk7XG4gICAgICAgIH1cblxuICAgICAgICAkKHRoaXMpLnRvZ2dsZUNsYXNzKCdlbmFibGVkJyk7XG4gICAgfSk7XG59XG5cbiQoJyNzYW1wbGVTZXQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0aGlzLnZhbHVlKTtcbn0pO1xuXG5cblxuZnVuY3Rpb24gdHJhY2tzTG9jYWxTdG9yYWdlICgpIHtcblxuICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlID0gZnVuY3Rpb24odXBkYXRlKSB7XG4gICAgICAgIHZhciBzdG9yYWdlID0ge307XG4gICAgICAgIHN0b3JhZ2VbJ1NlbGVjdCddID0gJ1NlbGVjdCc7XG5cblxuICAgICAgICBmb3IgKCB2YXIgaSA9IDAsIGxlbiA9IGxvY2FsU3RvcmFnZS5sZW5ndGg7IGkgPCBsZW47ICsraSApIHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gbG9jYWxTdG9yYWdlLmtleShpKTtcbiAgICAgICAgICAgIHN0b3JhZ2VbaXRlbV0gPSBpdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHNlbGVjdCBlbGVtZW50XG4gICAgICAgIHZhciBzID0gbmV3IHNlbGVjdEVsZW1lbnQoXG4gICAgICAgICAgICAnbG9hZC1zdG9yYWdlJywgLy8gaWQgdG8gYXBwZW5kIHRoZSBzZWxlY3QgbGlzdCB0b1xuICAgICAgICAgICAgJ2JlYXQtbGlzdCcsIC8vIGlkIG9mIHRoZSBzZWxlY3QgbGlzdFxuICAgICAgICAgICAgc3RvcmFnZSAvL1xuICAgICAgICApO1xuXG4gICAgICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgICAgIHMudXBkYXRlKCdiZWF0LWxpc3QnLCBzdG9yYWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMuY3JlYXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRGaWxlbmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGZpbGVuYW1lID0gJCgnI2ZpbGVuYW1lJykudmFsKCk7XG4gICAgICAgIGlmICghZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIGZpbGVuYW1lID0gJ3VudGl0bGVkJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsZW5hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGNvbXBsZXRlIHNvbmdcbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgZm9ybURhdGEgPSBhdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIGxldCBiZWF0ID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICBsZXQgc29uZyA9IHtcImJlYXRcIjogYmVhdCwgXCJzZXR0aW5nc1wiOiBmb3JtRGF0YX07XG4gICAgICAgIHJldHVybiBzb25nO1xuICAgIH1cblxuICAgIHRoaXMuc2V0dXBTdG9yYWdlID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBzb25nID0gdGhpcy5nZXRUcmFjaygpO1xuICAgICAgICAgICAgbGV0IGpzb24gPSBKU09OLnN0cmluZ2lmeShzb25nKTtcblxuICAgICAgICAgICAgbGV0IGZpbGVuYW1lID0gdGhpcy5nZXRGaWxlbmFtZSgpO1xuXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShmaWxlbmFtZSwganNvbik7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG5cbiAgICAgICAgICAgICQoXCIjYmVhdC1saXN0XCIpLnZhbChmaWxlbmFtZSk7XG4gICAgICAgICAgICBhbGVydCgnVHJhY2sgc2F2ZWQnKTsgXG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNmaWxlbmFtZScpLmJpbmQoJ2tleXByZXNzIGtleWRvd24ga2V5dXAnLCAoZSkgPT57XG4gICAgICAgICAgICBpZihlLmtleUNvZGUgPT0gMTMpIHsgXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9ICQoJyNiZWF0LWxpc3QnKS52YWwoKTtcbiAgICAgICAgICAgIGlmIChpdGVtID09PSAnU2VsZWN0JykgeyAgICBcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSBpdGVtO1xuICAgICAgICAgICAgbGV0IHRyYWNrID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShpdGVtKSk7XG4gICAgICAgICAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuXG4gICAgICAgICAgICBmb3JtVmFsdWVzLnNldChmb3JtLCB0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBhdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSB0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoO1xuXG4gICAgICAgICAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdHJhY2suc2V0dGluZ3Muc2FtcGxlU2V0LCB0cmFjayk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlbGV0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpO1xuICAgICAgICAgICAgbGV0IHRvRGVsZXRlID0gZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udGV4dDtcblxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odG9EZWxldGUpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcblxuICAgICAgICB9KTtcbiAgICB9O1xuIH1cbiAiLCJjb25zdCBXQUFDbG9jayA9IHJlcXVpcmUoJ3dhYWNsb2NrJyk7XG5jb25zdCBnZXRBdWRpb09wdGlvbnMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IGF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRBdWRpb09wdGlvbnMoKTtcblxuZnVuY3Rpb24gc2NoZWR1bGVNZWFzdXJlKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpIHtcbiAgICBcbiAgICB0aGlzLm1lYXN1cmVMZW5ndGggPSAxNjtcbiAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0ID0gc2NoZWR1bGVBdWRpb0JlYXQ7XG4gICAgdGhpcy5zY2hlZHVsZUZvcndhcmQgPSAwLjE7XG4gICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICB0aGlzLmV2ZW50TWFwID0ge307XG4gICAgdGhpcy5jbG9jayA9IG5ldyBXQUFDbG9jayhjdHgpO1xuICAgIHRoaXMuY2xvY2suc3RhcnQoKTtcbiAgICB0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcblxuICAgIHRoaXMubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50Kys7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnQgPj0gdGhpcy5tZWFzdXJlTGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm1pbGxpUGVyQmVhdCA9IGZ1bmN0aW9uIChiZWF0cykge1xuICAgICAgICBpZiAoIWJlYXRzKSB7XG4gICAgICAgICAgICBiZWF0cyA9IDYwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAxMDAwICogNjAgLyBiZWF0cztcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRUcmFja2VyUm93VmFsdWVzID0gZnVuY3Rpb24gKGNlbGxJZCkge1xuICAgICAgICBsZXQgdmFsdWVzID0gW107XG4gICAgICAgIGxldCBzZWxlY3RvciA9IGBbZGF0YS1jZWxsLWlkPVwiJHtjZWxsSWR9XCJdYDtcblxuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZWxlbXMuZm9yRWFjaCgoZWwpID0+IHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlbC5kYXRhc2V0KTtcbiAgICAgICAgICAgIHZhbC5lbmFibGVkID0gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdlbmFibGVkJyk7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh2YWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9O1xuICAgIFxuXG4gICAgdGhpcy5zY2hlZHVsZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgYmVhdHMgPSB0aGlzLmdldFRyYWNrZXJSb3dWYWx1ZXModGhpcy5jdXJyZW50KTtcbiAgICAgICAgbGV0IG5vdyA9IGN0eC5jdXJyZW50VGltZTtcblxuICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtY2VsbC1pZD1cIiR7dGhpcy5jdXJyZW50fVwiXWA7XG5cbiAgICAgICAgbGV0IGV2ZW50ID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5hZGRDbGFzcygnY3VycmVudCcpO1xuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCk7XG5cbiAgICAgICAgdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5yZW1vdmVDbGFzcygnY3VycmVudCcpO1xuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCArIHRoaXMubWlsbGlQZXJCZWF0KHRoaXMuYnBtKSAvIDEwMDApO1xuXG4gICAgICAgIGJlYXRzLmZvckVhY2goKGJlYXQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVCZWF0KGJlYXQsIG5vdyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlQmVhdCA9IGZ1bmN0aW9uIChiZWF0LCBub3cpIHtcblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZDtcbiAgICAgICAgdGhpcy5zY2hlZHVsZU1hcFtiZWF0LmNlbGxJZF0gPSB0cmlnZ2VyVGltZTtcbiAgICAgICAgaWYgKGJlYXQuZW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXSA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICAgICAgfSwgbm93KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlTWFwID0ge307XG5cbiAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0Tm93ID0gZnVuY3Rpb24gKGJlYXQpIHtcblxuICAgICAgICBpZiAoYmVhdC5lbmFibGVkKSB7XG4gICAgICAgICAgICBsZXQgYmVhdEV2ZW50ID0gdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIGlmIChiZWF0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICBiZWF0RXZlbnQuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB0cmlnZ2VyVGltZSA9IHRoaXMuc2NoZWR1bGVNYXBbMF0gKyBiZWF0LmNlbGxJZCAqIHRoaXMubWlsbGlQZXJCZWF0KHRoaXMuYnBtKSAvIDEwMDA7XG4gICAgICAgIGxldCBub3cgPSBjdHguY3VycmVudFRpbWU7XG4gICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICB9LCBub3cpO1xuICAgIH07XG5cbiAgICB0aGlzLmludGVydmFsO1xuICAgIHRoaXMucnVuU2NoZWR1bGUgPSBmdW5jdGlvbiAoYnBtKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuYnBtID0gYnBtO1xuICAgICAgICBsZXQgaW50ZXJ2YWwgPSB0aGlzLm1pbGxpUGVyQmVhdChicG0pO1xuXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgIH0sIDApO1xuXG4gICAgICAgIHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcblxuICAgICAgICB9LCBpbnRlcnZhbCk7XG4gICAgfTtcblxuICAgIHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldEV2ZW50S2V5ID0gZnVuY3Rpb24gZ2V0RXZlbnRLZXkoYmVhdCkge1xuICAgICAgICByZXR1cm4gYmVhdC5yb3dJZCArIGJlYXQuY2VsbElkO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRUcmFja2VyVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgdmFsdWVzID0gW107XG4gICAgICAgICQoXCIuY2VsbFwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSAkKHRoaXMpLmhhc0NsYXNzKFwiZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5sb2FkVHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgJCgnLmNlbGwnKS5yZW1vdmVDbGFzcygnZW5hYmxlZCcpO1xuICAgICAgICBqc29uLmZvckVhY2goZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgICAgIGlmIChlbGVtLmVuYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtcm93LWlkPVwiJHtlbGVtLnJvd0lkfVwiXVtkYXRhLWNlbGwtaWQ9XCIke2VsZW0uY2VsbElkfVwiXWA7XG4gICAgICAgICAgICAgICAgJChzZWxlY3RvcikuYWRkQ2xhc3MoXCJlbmFibGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2NoZWR1bGVNZWFzdXJlOyIsImZ1bmN0aW9uIHRyYWNrZXJUYWJsZSgpIHtcbiAgICBcbiAgICB0aGlzLnN0ciA9ICcnO1xuICAgIHRoaXMuZ2V0VGFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAnPHRhYmxlIGlkPVwidHJhY2tlclwiPicgKyB0aGlzLnN0ciArICc8L3RhYmxlPic7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLnNldEhlYWRlciA9IGZ1bmN0aW9uIChudW1DZWxscykge1xuXG4gICAgICAgIHRoaXMuc3RyICs9IGA8dHIgY2xhc3M9XCJyb3cgaGVhZGVyXCI+YDtcbiAgICAgICAgdGhpcy5zdHIgKz0gdGhpcy5nZXRDZWxscygnaGVhZGVyJywgbnVtQ2VsbHMsIHRydWUpO1xuICAgICAgICB0aGlzLnN0ciArPSBgPC90cj5gO1xuICAgICAgICBcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuc2V0Um93cyA9IGZ1bmN0aW9uIChudW1Sb3dzLCBudW1DZWxscykge1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXRIZWFkZXIobnVtQ2VsbHMpO1xuICAgICAgICBmb3IgKGxldCByb3dJRCA9IDA7IHJvd0lEIDwgbnVtUm93czsgcm93SUQrKykge1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gYDx0ciBjbGFzcz1cInJvd1wiIGRhdGEtaWQ9XCIke3Jvd0lEfVwiPmA7XG4gICAgICAgICAgICB0aGlzLnN0ciArPSB0aGlzLmdldENlbGxzKHJvd0lELCBudW1DZWxscyk7XG4gICAgICAgICAgICB0aGlzLnN0ciArPSBgPC90cj5gO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldENlbGxzID0gZnVuY3Rpb24ocm93SUQsIG51bUNlbGxzLCBoZWFkZXIpIHtcbiAgICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IG51bUNlbGxzOyBjKyspIHtcbiAgICAgICAgICAgIHN0ciArPSBgPHRkIGNsYXNzPVwiY2VsbFwiIGRhdGEtcm93LWlkPVwiJHtyb3dJRH1cIiBkYXRhLWNlbGwtaWQ9XCIke2N9XCI+YDtcbiAgICAgICAgICAgIGlmIChoZWFkZXIpc3RyICs9IGMgKyAxO1xuICAgICAgICAgICAgc3RyICs9IGA8L3RkPmA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYWNrZXJUYWJsZTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
