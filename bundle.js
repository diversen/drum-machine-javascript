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

var measureLength = 16;
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
function setupTrackerHtml(data) {
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
schedule.measureLength = measureLength;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2V0LXNldC1mb3JtLXZhbHVlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2FkLXNhbXBsZS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc2VsZWN0LWVsZW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdGlueS1zYW1wbGUtbG9hZGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2xpYi9XQUFDbG9jay5qcyIsInNyYy9kZWZhdWx0LXRyYWNrLmpzIiwic3JjL2dldC1zZXQtY29udHJvbHMuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9zY2hlZHVsZS1tZWFzdXJlLmpzIiwic3JjL3RyYWNrZXItdGFibGUuanMiLCIuLi8uLi8uLi91c3IvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDek9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2oyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gR2FpbihjdHgpIHtcblxuICAgIHRoaXMuY3R4ID0gY3R4O1xuXG4gICAgdGhpcy5zZWNvbmRzVG9UaW1lQ29uc3RhbnQgPSBmdW5jdGlvbiAoc2VjKSB7XG4gICAgICAgIHJldHVybiAoc2VjICogMikgLyA4O1xuICAgIH07XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICAgIGluaXRHYWluOiAwLjEsIC8vIEluaXQgZ2FpbiBvbiBub3RlXG4gICAgICAgIG1heEdhaW46IDEuMCwgLy8gTWF4IGdhaW4gb24gbm90ZVxuICAgICAgICBhdHRhY2tUaW1lOiAwLjEsIC8vIEF0dGFja1RpbWUuIGdhaW4uaW5pdCB0byBnYWluLm1heCBpbiBhdHRhY2tUaW1lXG4gICAgICAgIHN1c3RhaW5UaW1lOiAxLCAvLyBTdXN0YWluIG5vdGUgaW4gdGltZVxuICAgICAgICByZWxlYXNlVGltZTogMSwgLy8gQXBwcm94aW1hdGVkIGVuZCB0aW1lLiBDYWxjdWxhdGVkIHdpdGggc2Vjb25kc1RvVGltZUNvbnN0YW50KClcbiAgICAgICAgLy8gZGlzY29ubmVjdDogZmFsc2UgLy8gU2hvdWxkIHdlIGF1dG9kaXNjb25uZWN0LiBEZWZhdWx0IGlzIHRydWVcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB9O1xuXG4gICAgdGhpcy5nYWluTm9kZTtcbiAgICAvKipcbiAgICAgKiBUaGUgZ2Fpbk5vZGVcbiAgICAgKiBAcGFyYW0ge2Zsb2F0fSBiZWdpbiBjdHggdGltZVxuICAgICAqIEByZXR1cm5zIHtHYWluLmdldEdhaW5Ob2RlLmdhaW5Ob2RlfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0R2Fpbk5vZGUgPSBmdW5jdGlvbiAoYmVnaW4pIHtcblxuICAgICAgICB0aGlzLmdhaW5Ob2RlID0gdGhpcy5jdHguY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSB0aGlzLm9wdGlvbnMuaW5pdEdhaW47XG5cbiAgICAgICAgLy8gQXR0YWNrIHRvIG1heFxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5tYXhHYWluLFxuICAgICAgICAgICAgICAgIGJlZ2luICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUsXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUpO1xuXG4gICAgICAgIC8vIFN1c3RhaW4gYW5kIGVuZCBub3RlXG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoXG4gICAgICAgICAgICAgICAgMC4wLFxuICAgICAgICAgICAgICAgIGJlZ2luICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUsXG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRzVG9UaW1lQ29uc3RhbnQodGhpcy5vcHRpb25zLnJlbGVhc2VUaW1lKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpc2Nvbm5lY3QgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3QoYmVnaW4pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5nYWluTm9kZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGlzY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSArIHRoaXMub3B0aW9ucy5zdXN0YWluVGltZSArIHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZTtcbiAgICAgICAgXG4gICAgICAgIHNldFRpbWVvdXQoICgpPT4gIHtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICB9LFxuICAgICAgICB0b3RhbExlbmd0aCAqIDEwMDApO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gR2FpbjsiLCIvLyBGcm9tOiBodHRwczovL2Rldi5vcGVyYS5jb20vYXJ0aWNsZXMvZHJ1bS1zb3VuZHMtd2ViYXVkaW8vXG5mdW5jdGlvbiBJbnN0cnVtZW50KGNvbnRleHQsIGJ1ZmZlcikge1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG59XG5cbkluc3RydW1lbnQucHJvdG90eXBlLnNldHVwID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHRoaXMuc291cmNlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbn07XG5cbkluc3RydW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2U7XG59O1xuXG5JbnN0cnVtZW50LnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB0aGlzLnNldHVwKCk7XG4gICAgdGhpcy5zb3VyY2Uuc3RhcnQodGltZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluc3RydW1lbnQ7XG4iLCJmdW5jdGlvbiBnZXRFbGVtQ291bnRCeU5hbWUgKG5hbWUpIHtcbiAgICB2YXIgbmFtZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZShuYW1lKTtcbiAgICByZXR1cm4gbmFtZXMubGVuZ3RoO1xufVxuXG5mdW5jdGlvbiBnZXRGb3JtVmFsdWVzKGZvcm1FbGVtZW50KSB7XG4gICAgdmFyIGZvcm1FbGVtZW50cyA9IGZvcm1FbGVtZW50LmVsZW1lbnRzO1xuICAgIHZhciBmb3JtUGFyYW1zID0ge307XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBlbGVtID0gbnVsbDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZm9ybUVsZW1lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGVsZW0gPSBmb3JtRWxlbWVudHNbaV07XG4gICAgICAgIHN3aXRjaCAoZWxlbS50eXBlKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0uY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaW5nbGUgY2hlY2tib3hcbiAgICAgICAgICAgICAgICB2YXIgbnVtRWxlbXMgPSBnZXRFbGVtQ291bnRCeU5hbWUoZWxlbS5uYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAobnVtRWxlbXMgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW0uY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmb3JtUGFyYW1zW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBNdWx0aXBsZVxuICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmb3JtUGFyYW1zW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IFtlbGVtLnZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXS5wdXNoKGVsZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0VmFsdWVzID0gZ2V0U2VsZWN0VmFsdWVzKGVsZW0pO1xuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBzZWxlY3RWYWx1ZXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS52YWx1ZSAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZm9ybVBhcmFtcztcbn1cblxuZnVuY3Rpb24gc2V0Rm9ybVZhbHVlcyhmb3JtRWxlbWVudCwgdmFsdWVzKSB7XG4gICAgdmFyIGZvcm1FbGVtZW50cyA9IGZvcm1FbGVtZW50LmVsZW1lbnRzO1xuICAgIHZhciBmb3JtUGFyYW1zID0ge307XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBlbGVtID0gbnVsbDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZm9ybUVsZW1lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGVsZW0gPSBmb3JtRWxlbWVudHNbaV07XG4gICAgICAgIFxuICAgICAgICBpZiAoICEoZWxlbS5uYW1lIGluIHZhbHVlcykgKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoIChlbGVtLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdID09PSBlbGVtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXS5pbmRleE9mKGVsZW0udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0U2VsZWN0VmFsdWVzKGVsZW0sIHZhbHVlc1tlbGVtLm5hbWVdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLnZhbHVlID0gdmFsdWVzW2VsZW0ubmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRTZWxlY3RWYWx1ZXMoc2VsZWN0RWxlbSwgdmFsdWVzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBzZWxlY3RFbGVtLm9wdGlvbnM7XG4gICAgdmFyIG9wdDtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IG9wdGlvbnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgICAgIG9wdCA9IG9wdGlvbnNbaV07XG4gICAgICAgIGlmICh2YWx1ZXMuaW5kZXhPZihvcHQudmFsdWUpID4gLTEgKSB7XG4gICAgICAgICAgICBvcHQuc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0LnNlbGVjdGVkID0gZmFsc2U7XG4gICAgICAgIH0gICAgICAgIFxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0U2VsZWN0VmFsdWVzKHNlbGVjdCkge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgb3B0aW9ucyA9IHNlbGVjdCAmJiBzZWxlY3Qub3B0aW9ucztcbiAgICB2YXIgb3B0O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBvcHRpb25zLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgICAgICBvcHQgPSBvcHRpb25zW2ldO1xuXG4gICAgICAgIGlmIChvcHQuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG9wdC52YWx1ZSB8fCBvcHQudGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZ2V0U2V0Rm9ybVZhbHVlcyAoKSB7XG4gICAgdGhpcy5zZXQgPSBzZXRGb3JtVmFsdWVzO1xuICAgIHRoaXMuZ2V0ID0gZ2V0Rm9ybVZhbHVlcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRTZXRGb3JtVmFsdWVzO1xuIiwidmFyIHRpbnlTYW1wbGVMb2FkZXIgPSByZXF1aXJlKCd0aW55LXNhbXBsZS1sb2FkZXInKTtcbnZhciBhdWRpb0J1ZmZlckluc3RydW1lbnQgPSByZXF1aXJlKCdhdWRpby1idWZmZXItaW5zdHJ1bWVudCcpO1xuXG5mdW5jdGlvbiBsb2FkU2FtcGxlU2V0KGN0eCwgZGF0YVVybCwgY2IpIHtcbiAgICBcbiAgICBmZXRjaChkYXRhVXJsKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzICE9PSAyMDApIHsgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0xvb2tzIGxpa2UgdGhlcmUgd2FzIGEgcHJvYmxlbS4gU3RhdHVzIENvZGU6ICcgKyAgcmVzcG9uc2Uuc3RhdHVzKTsgIFxuICAgICAgICAgICAgcmV0dXJuOyAgXG4gICAgICAgIH1cblxuICAgICAgICByZXNwb25zZS5qc29uKCkudGhlbihmdW5jdGlvbihkYXRhKSB7ICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFyIGJhc2VVcmwgPSBkYXRhLnNhbXBsZXM7XG4gICAgICAgICAgICB2YXIgYnVmZmVycyA9IHt9O1xuICAgICAgICAgICAgdmFyIHByb21pc2VzID0gW107XG5cbiAgICAgICAgICAgIGRhdGEuZmlsZW5hbWUgPSBbXTtcbiAgICAgICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgICAgIGRhdGEuZmlsZXMuZm9yRWFjaChmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpbGVuYW1lID0gdmFsLnJlcGxhY2UoL1xcLlteLy5dKyQvLCBcIlwiKTtcbiAgICAgICAgICAgICAgICBkYXRhLmZpbGVuYW1lLnB1c2goZmlsZW5hbWUpO1xuICAgICAgICAgICAgICAgIHZhciByZW1vdGVVcmwgPSBiYXNlVXJsICsgdmFsO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGxldCBsb2FkZXJQcm9taXNlID0gdGlueVNhbXBsZUxvYWRlcihyZW1vdGVVcmwsIGN0eCwgKGJ1ZmZlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBidWZmZXJzW2ZpbGVuYW1lXSA9IG5ldyBhdWRpb0J1ZmZlckluc3RydW1lbnQoY3R4LCBidWZmZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2gobG9hZGVyUHJvbWlzZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4odmFsdWVzID0+IHsgXG4gICAgICAgICAgICAgICAgY2IoZGF0YSwgYnVmZmVycyk7XG4gICAgICAgICAgICB9KS5jYXRjaChlID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgfSk7ICAgIFxuICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikgeyAgXG4gICAgICAgIGNvbnNvbGUubG9nKCdGZXRjaCBFcnJvciA6LVMnLCBlcnIpOyAgXG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbG9hZFNhbXBsZVNldDsiLCJmdW5jdGlvbiBzZWxlY3RFbGVtZW50KGFwcGVuZFRvSUQsIHNlbGVjdElELCBvcHRpb25zLCBzZWxlY3RlZCkge1xuXG4gICAgdGhpcy5hcHBlbmRUb0lEID0gYXBwZW5kVG9JRDtcbiAgICB0aGlzLnNlbGVjdElEID0gc2VsZWN0SUQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgXG4gICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFwcGVuZFRvSUQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmFwcGVuZFRvSUQpO1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzZWxlY3RcIik7XG4gICAgICAgIHNlbGVjdExpc3QuaWQgPSB0aGlzLnNlbGVjdElEOyAgICAgICAgXG4gICAgICAgIGFwcGVuZFRvSUQuYXBwZW5kQ2hpbGQoc2VsZWN0TGlzdCk7XG4gICAgICAgIHRoaXMudXBkYXRlKHNlbGVjdElELCB0aGlzLm9wdGlvbnMsIHRoaXMuc2VsZWN0ZWQpO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbiAoZWxlbSwgb3B0aW9ucywgc2VsZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5kZWxldGUoZWxlbSk7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm9wdGlvblwiKTtcbiAgICAgICAgICAgIG9wdGlvbi52YWx1ZSA9IGtleTtcbiAgICAgICAgICAgIG9wdGlvbi50ZXh0ID0gb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgc2VsZWN0TGlzdC5hcHBlbmRDaGlsZChvcHRpb24pO1xuXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBzZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgIG9wdGlvbi5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0U2VsZWN0ZWQgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICB2YXIgb3B0O1xuICAgICAgICBmb3IgKCB2YXIgaSA9IDAsIGxlbiA9IHNlbGVjdExpc3Qub3B0aW9ucy5sZW5ndGg7IGkgPCBsZW47IGkrKyApIHtcbiAgICAgICAgICAgIG9wdCA9IHNlbGVjdExpc3Qub3B0aW9uc1tpXTtcbiAgICAgICAgICAgIGlmICggb3B0LnNlbGVjdGVkID09PSB0cnVlICkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcHQudmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICB2YXIgc2VsZWN0TGlzdD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgZm9yICh2YXIgb3B0aW9uIGluIHNlbGVjdExpc3Qpe1xuICAgICAgICAgICAgc2VsZWN0TGlzdC5yZW1vdmUob3B0aW9uKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRBc1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmFwcGVuZFRvSUQpO1xuICAgICAgICB2YXIgZWxlbWVudEh0bWwgPSBlbGVtZW50Lm91dGVySFRNTDtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnRIdG1sO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2VsZWN0RWxlbWVudDsiLCJmdW5jdGlvbiBzYW1wbGVMb2FkZXIgKHVybCwgY29udGV4dCwgY2FsbGJhY2spIHtcbiAgICBcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgXG4gICAgICAgIHJlcXVlc3Qub3BlbignZ2V0JywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKHJlcXVlc3Quc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgICAgICAgIGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgnc2FtcGxlTG9hZGVyIHJlcXVlc3Qgc3VjY2VzcycpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ3NhbXBsZUxvYWRlciByZXF1ZXN0IGZhaWxlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xuICAgIFxuICAgIHJldHVybiBwcm9taXNlO1xufTtcbm1vZHVsZS5leHBvcnRzID0gc2FtcGxlTG9hZGVyOyIsInZhciBXQUFDbG9jayA9IHJlcXVpcmUoJy4vbGliL1dBQUNsb2NrJylcblxubW9kdWxlLmV4cG9ydHMgPSBXQUFDbG9ja1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB3aW5kb3cuV0FBQ2xvY2sgPSBXQUFDbG9ja1xuIiwidmFyIGlzQnJvd3NlciA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJylcblxudmFyIENMT0NLX0RFRkFVTFRTID0ge1xuICB0b2xlcmFuY2VMYXRlOiAwLjEwLFxuICB0b2xlcmFuY2VFYXJseTogMC4wMDFcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT0gRXZlbnQgPT09PT09PT09PT09PT09PT09PT0gLy9cbnZhciBFdmVudCA9IGZ1bmN0aW9uKGNsb2NrLCBkZWFkbGluZSwgZnVuYykge1xuICB0aGlzLmNsb2NrID0gY2xvY2tcbiAgdGhpcy5mdW5jID0gZnVuY1xuICB0aGlzLl9jbGVhcmVkID0gZmFsc2UgLy8gRmxhZyB1c2VkIHRvIGNsZWFyIGFuIGV2ZW50IGluc2lkZSBjYWxsYmFja1xuXG4gIHRoaXMudG9sZXJhbmNlTGF0ZSA9IGNsb2NrLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy50b2xlcmFuY2VFYXJseSA9IGNsb2NrLnRvbGVyYW5jZUVhcmx5XG4gIHRoaXMuX2xhdGVzdFRpbWUgPSBudWxsXG4gIHRoaXMuX2VhcmxpZXN0VGltZSA9IG51bGxcbiAgdGhpcy5kZWFkbGluZSA9IG51bGxcbiAgdGhpcy5yZXBlYXRUaW1lID0gbnVsbFxuXG4gIHRoaXMuc2NoZWR1bGUoZGVhZGxpbmUpXG59XG5cbi8vIFVuc2NoZWR1bGVzIHRoZSBldmVudFxuRXZlbnQucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gIHRoaXMuX2NsZWFyZWQgPSB0cnVlXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFNldHMgdGhlIGV2ZW50IHRvIHJlcGVhdCBldmVyeSBgdGltZWAgc2Vjb25kcy5cbkV2ZW50LnByb3RvdHlwZS5yZXBlYXQgPSBmdW5jdGlvbih0aW1lKSB7XG4gIGlmICh0aW1lID09PSAwKVxuICAgIHRocm93IG5ldyBFcnJvcignZGVsYXkgY2Fubm90IGJlIDAnKVxuICB0aGlzLnJlcGVhdFRpbWUgPSB0aW1lXG4gIGlmICghdGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpXG4gICAgdGhpcy5zY2hlZHVsZSh0aGlzLmRlYWRsaW5lICsgdGhpcy5yZXBlYXRUaW1lKVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBTZXRzIHRoZSB0aW1lIHRvbGVyYW5jZSBvZiB0aGUgZXZlbnQuXG4vLyBUaGUgZXZlbnQgd2lsbCBiZSBleGVjdXRlZCBpbiB0aGUgaW50ZXJ2YWwgYFtkZWFkbGluZSAtIGVhcmx5LCBkZWFkbGluZSArIGxhdGVdYFxuLy8gSWYgdGhlIGNsb2NrIGZhaWxzIHRvIGV4ZWN1dGUgdGhlIGV2ZW50IGluIHRpbWUsIHRoZSBldmVudCB3aWxsIGJlIGRyb3BwZWQuXG5FdmVudC5wcm90b3R5cGUudG9sZXJhbmNlID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIGlmICh0eXBlb2YgdmFsdWVzLmxhdGUgPT09ICdudW1iZXInKVxuICAgIHRoaXMudG9sZXJhbmNlTGF0ZSA9IHZhbHVlcy5sYXRlXG4gIGlmICh0eXBlb2YgdmFsdWVzLmVhcmx5ID09PSAnbnVtYmVyJylcbiAgICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gdmFsdWVzLmVhcmx5XG4gIHRoaXMuX3JlZnJlc2hFYXJseUxhdGVEYXRlcygpXG4gIGlmICh0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSkge1xuICAgIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gICAgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIGV2ZW50IGlzIHJlcGVhdGVkLCBmYWxzZSBvdGhlcndpc2VcbkV2ZW50LnByb3RvdHlwZS5pc1JlcGVhdGVkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJlcGVhdFRpbWUgIT09IG51bGwgfVxuXG4vLyBTY2hlZHVsZXMgdGhlIGV2ZW50IHRvIGJlIHJhbiBiZWZvcmUgYGRlYWRsaW5lYC5cbi8vIElmIHRoZSB0aW1lIGlzIHdpdGhpbiB0aGUgZXZlbnQgdG9sZXJhbmNlLCB3ZSBoYW5kbGUgdGhlIGV2ZW50IGltbWVkaWF0ZWx5LlxuLy8gSWYgdGhlIGV2ZW50IHdhcyBhbHJlYWR5IHNjaGVkdWxlZCBhdCBhIGRpZmZlcmVudCB0aW1lLCBpdCBpcyByZXNjaGVkdWxlZC5cbkV2ZW50LnByb3RvdHlwZS5zY2hlZHVsZSA9IGZ1bmN0aW9uKGRlYWRsaW5lKSB7XG4gIHRoaXMuX2NsZWFyZWQgPSBmYWxzZVxuICB0aGlzLmRlYWRsaW5lID0gZGVhZGxpbmVcbiAgdGhpcy5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzKClcblxuICBpZiAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lID49IHRoaXMuX2VhcmxpZXN0VGltZSkge1xuICAgIHRoaXMuX2V4ZWN1dGUoKVxuICBcbiAgfSBlbHNlIGlmICh0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSkge1xuICAgIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gICAgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbiAgXG4gIH0gZWxzZSB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxufVxuXG5FdmVudC5wcm90b3R5cGUudGltZVN0cmV0Y2ggPSBmdW5jdGlvbih0UmVmLCByYXRpbykge1xuICBpZiAodGhpcy5pc1JlcGVhdGVkKCkpXG4gICAgdGhpcy5yZXBlYXRUaW1lID0gdGhpcy5yZXBlYXRUaW1lICogcmF0aW9cblxuICB2YXIgZGVhZGxpbmUgPSB0UmVmICsgcmF0aW8gKiAodGhpcy5kZWFkbGluZSAtIHRSZWYpXG4gIC8vIElmIHRoZSBkZWFkbGluZSBpcyB0b28gY2xvc2Ugb3IgcGFzdCwgYW5kIHRoZSBldmVudCBoYXMgYSByZXBlYXQsXG4gIC8vIHdlIGNhbGN1bGF0ZSB0aGUgbmV4dCByZXBlYXQgcG9zc2libGUgaW4gdGhlIHN0cmV0Y2hlZCBzcGFjZS5cbiAgaWYgKHRoaXMuaXNSZXBlYXRlZCgpKSB7XG4gICAgd2hpbGUgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA+PSBkZWFkbGluZSAtIHRoaXMudG9sZXJhbmNlRWFybHkpXG4gICAgICBkZWFkbGluZSArPSB0aGlzLnJlcGVhdFRpbWVcbiAgfVxuICB0aGlzLnNjaGVkdWxlKGRlYWRsaW5lKVxufVxuXG4vLyBFeGVjdXRlcyB0aGUgZXZlbnRcbkV2ZW50LnByb3RvdHlwZS5fZXhlY3V0ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5jbG9jay5fc3RhcnRlZCA9PT0gZmFsc2UpIHJldHVyblxuICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuXG4gIGlmICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPCB0aGlzLl9sYXRlc3RUaW1lKVxuICAgIHRoaXMuZnVuYyh0aGlzKVxuICBlbHNlIHtcbiAgICBpZiAodGhpcy5vbmV4cGlyZWQpIHRoaXMub25leHBpcmVkKHRoaXMpXG4gICAgY29uc29sZS53YXJuKCdldmVudCBleHBpcmVkJylcbiAgfVxuICAvLyBJbiB0aGUgY2FzZSBgc2NoZWR1bGVgIGlzIGNhbGxlZCBpbnNpZGUgYGZ1bmNgLCB3ZSBuZWVkIHRvIGF2b2lkXG4gIC8vIG92ZXJyd3JpdGluZyB3aXRoIHlldCBhbm90aGVyIGBzY2hlZHVsZWAuXG4gIGlmICghdGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykgJiYgdGhpcy5pc1JlcGVhdGVkKCkgJiYgIXRoaXMuX2NsZWFyZWQpXG4gICAgdGhpcy5zY2hlZHVsZSh0aGlzLmRlYWRsaW5lICsgdGhpcy5yZXBlYXRUaW1lKSBcbn1cblxuLy8gVXBkYXRlcyBjYWNoZWQgdGltZXNcbkV2ZW50LnByb3RvdHlwZS5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2xhdGVzdFRpbWUgPSB0aGlzLmRlYWRsaW5lICsgdGhpcy50b2xlcmFuY2VMYXRlXG4gIHRoaXMuX2VhcmxpZXN0VGltZSA9IHRoaXMuZGVhZGxpbmUgLSB0aGlzLnRvbGVyYW5jZUVhcmx5XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IFdBQUNsb2NrID09PT09PT09PT09PT09PT09PT09IC8vXG52YXIgV0FBQ2xvY2sgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIG9wdHMgPSBvcHRzIHx8IHt9XG4gIHRoaXMudGlja01ldGhvZCA9IG9wdHMudGlja01ldGhvZCB8fCAnU2NyaXB0UHJvY2Vzc29yTm9kZSdcbiAgdGhpcy50b2xlcmFuY2VFYXJseSA9IG9wdHMudG9sZXJhbmNlRWFybHkgfHwgQ0xPQ0tfREVGQVVMVFMudG9sZXJhbmNlRWFybHlcbiAgdGhpcy50b2xlcmFuY2VMYXRlID0gb3B0cy50b2xlcmFuY2VMYXRlIHx8IENMT0NLX0RFRkFVTFRTLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dFxuICB0aGlzLl9ldmVudHMgPSBbXVxuICB0aGlzLl9zdGFydGVkID0gZmFsc2Vcbn1cblxuLy8gLS0tLS0tLS0tLSBQdWJsaWMgQVBJIC0tLS0tLS0tLS0gLy9cbi8vIFNjaGVkdWxlcyBgZnVuY2AgdG8gcnVuIGFmdGVyIGBkZWxheWAgc2Vjb25kcy5cbldBQUNsb2NrLnByb3RvdHlwZS5zZXRUaW1lb3V0ID0gZnVuY3Rpb24oZnVuYywgZGVsYXkpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUV2ZW50KGZ1bmMsIHRoaXMuX2Fic1RpbWUoZGVsYXkpKVxufVxuXG4vLyBTY2hlZHVsZXMgYGZ1bmNgIHRvIHJ1biBiZWZvcmUgYGRlYWRsaW5lYC5cbldBQUNsb2NrLnByb3RvdHlwZS5jYWxsYmFja0F0VGltZSA9IGZ1bmN0aW9uKGZ1bmMsIGRlYWRsaW5lKSB7XG4gIHJldHVybiB0aGlzLl9jcmVhdGVFdmVudChmdW5jLCBkZWFkbGluZSlcbn1cblxuLy8gU3RyZXRjaGVzIGBkZWFkbGluZWAgYW5kIGByZXBlYXRgIG9mIGFsbCBzY2hlZHVsZWQgYGV2ZW50c2AgYnkgYHJhdGlvYCwga2VlcGluZ1xuLy8gdGhlaXIgcmVsYXRpdmUgZGlzdGFuY2UgdG8gYHRSZWZgLiBJbiBmYWN0IHRoaXMgaXMgZXF1aXZhbGVudCB0byBjaGFuZ2luZyB0aGUgdGVtcG8uXG5XQUFDbG9jay5wcm90b3R5cGUudGltZVN0cmV0Y2ggPSBmdW5jdGlvbih0UmVmLCBldmVudHMsIHJhdGlvKSB7XG4gIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7IGV2ZW50LnRpbWVTdHJldGNoKHRSZWYsIHJhdGlvKSB9KVxuICByZXR1cm4gZXZlbnRzXG59XG5cbi8vIFJlbW92ZXMgYWxsIHNjaGVkdWxlZCBldmVudHMgYW5kIHN0YXJ0cyB0aGUgY2xvY2sgXG5XQUFDbG9jay5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3N0YXJ0ZWQgPT09IGZhbHNlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdGhpcy5fc3RhcnRlZCA9IHRydWVcbiAgICB0aGlzLl9ldmVudHMgPSBbXVxuXG4gICAgaWYgKHRoaXMudGlja01ldGhvZCA9PT0gJ1NjcmlwdFByb2Nlc3Nvck5vZGUnKSB7XG4gICAgICB2YXIgYnVmZmVyU2l6ZSA9IDI1NlxuICAgICAgLy8gV2UgaGF2ZSB0byBrZWVwIGEgcmVmZXJlbmNlIHRvIHRoZSBub2RlIHRvIGF2b2lkIGdhcmJhZ2UgY29sbGVjdGlvblxuICAgICAgdGhpcy5fY2xvY2tOb2RlID0gdGhpcy5jb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKVxuICAgICAgdGhpcy5fY2xvY2tOb2RlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKVxuICAgICAgdGhpcy5fY2xvY2tOb2RlLm9uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkgeyBzZWxmLl90aWNrKCkgfSlcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMudGlja01ldGhvZCA9PT0gJ21hbnVhbCcpIG51bGwgLy8gX3RpY2sgaXMgY2FsbGVkIG1hbnVhbGx5XG5cbiAgICBlbHNlIHRocm93IG5ldyBFcnJvcignaW52YWxpZCB0aWNrTWV0aG9kICcgKyB0aGlzLnRpY2tNZXRob2QpXG4gIH1cbn1cblxuLy8gU3RvcHMgdGhlIGNsb2NrXG5XQUFDbG9jay5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fc3RhcnRlZCA9PT0gdHJ1ZSkge1xuICAgIHRoaXMuX3N0YXJ0ZWQgPSBmYWxzZVxuICAgIHRoaXMuX2Nsb2NrTm9kZS5kaXNjb25uZWN0KClcbiAgfSAgXG59XG5cbi8vIC0tLS0tLS0tLS0gUHJpdmF0ZSAtLS0tLS0tLS0tIC8vXG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgcmFuIHBlcmlvZGljYWxseSwgYW5kIGF0IGVhY2ggdGljayBpdCBleGVjdXRlc1xuLy8gZXZlbnRzIGZvciB3aGljaCBgY3VycmVudFRpbWVgIGlzIGluY2x1ZGVkIGluIHRoZWlyIHRvbGVyYW5jZSBpbnRlcnZhbC5cbldBQUNsb2NrLnByb3RvdHlwZS5fdGljayA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZXZlbnQgPSB0aGlzLl9ldmVudHMuc2hpZnQoKVxuXG4gIHdoaWxlKGV2ZW50ICYmIGV2ZW50Ll9lYXJsaWVzdFRpbWUgPD0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKSB7XG4gICAgZXZlbnQuX2V4ZWN1dGUoKVxuICAgIGV2ZW50ID0gdGhpcy5fZXZlbnRzLnNoaWZ0KClcbiAgfVxuXG4gIC8vIFB1dCBiYWNrIHRoZSBsYXN0IGV2ZW50XG4gIGlmKGV2ZW50KSB0aGlzLl9ldmVudHMudW5zaGlmdChldmVudClcbn1cblxuLy8gQ3JlYXRlcyBhbiBldmVudCBhbmQgaW5zZXJ0IGl0IHRvIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX2NyZWF0ZUV2ZW50ID0gZnVuY3Rpb24oZnVuYywgZGVhZGxpbmUpIHtcbiAgcmV0dXJuIG5ldyBFdmVudCh0aGlzLCBkZWFkbGluZSwgZnVuYylcbn1cblxuLy8gSW5zZXJ0cyBhbiBldmVudCB0byB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9pbnNlcnRFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHRoaXMuX2V2ZW50cy5zcGxpY2UodGhpcy5faW5kZXhCeVRpbWUoZXZlbnQuX2VhcmxpZXN0VGltZSksIDAsIGV2ZW50KVxufVxuXG4vLyBSZW1vdmVzIGFuIGV2ZW50IGZyb20gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5fcmVtb3ZlRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgaW5kID0gdGhpcy5fZXZlbnRzLmluZGV4T2YoZXZlbnQpXG4gIGlmIChpbmQgIT09IC0xKSB0aGlzLl9ldmVudHMuc3BsaWNlKGluZCwgMSlcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIGBldmVudGAgaXMgaW4gcXVldWUsIGZhbHNlIG90aGVyd2lzZVxuV0FBQ2xvY2sucHJvdG90eXBlLl9oYXNFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gcmV0dXJuIHRoaXMuX2V2ZW50cy5pbmRleE9mKGV2ZW50KSAhPT0gLTFcbn1cblxuLy8gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IGV2ZW50IHdob3NlIGRlYWRsaW5lIGlzID49IHRvIGBkZWFkbGluZWBcbldBQUNsb2NrLnByb3RvdHlwZS5faW5kZXhCeVRpbWUgPSBmdW5jdGlvbihkZWFkbGluZSkge1xuICAvLyBwZXJmb3JtcyBhIGJpbmFyeSBzZWFyY2hcbiAgdmFyIGxvdyA9IDBcbiAgICAsIGhpZ2ggPSB0aGlzLl9ldmVudHMubGVuZ3RoXG4gICAgLCBtaWRcbiAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICBtaWQgPSBNYXRoLmZsb29yKChsb3cgKyBoaWdoKSAvIDIpXG4gICAgaWYgKHRoaXMuX2V2ZW50c1ttaWRdLl9lYXJsaWVzdFRpbWUgPCBkZWFkbGluZSlcbiAgICAgIGxvdyA9IG1pZCArIDFcbiAgICBlbHNlIGhpZ2ggPSBtaWRcbiAgfVxuICByZXR1cm4gbG93XG59XG5cbi8vIENvbnZlcnRzIGZyb20gcmVsYXRpdmUgdGltZSB0byBhYnNvbHV0ZSB0aW1lXG5XQUFDbG9jay5wcm90b3R5cGUuX2Fic1RpbWUgPSBmdW5jdGlvbihyZWxUaW1lKSB7XG4gIHJldHVybiByZWxUaW1lICsgdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lXG59XG5cbi8vIENvbnZlcnRzIGZyb20gYWJzb2x1dGUgdGltZSB0byByZWxhdGl2ZSB0aW1lIFxuV0FBQ2xvY2sucHJvdG90eXBlLl9yZWxUaW1lID0gZnVuY3Rpb24oYWJzVGltZSkge1xuICByZXR1cm4gYWJzVGltZSAtIHRoaXMuY29udGV4dC5jdXJyZW50VGltZVxufSIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBcImJlYXRcIjogW1xuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9XG4gIF0sXG4gIFwic2V0dGluZ3NcIjoge1xuICAgIFwic2FtcGxlU2V0XCI6IFwiaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL29yYW1pY3Mvc2FtcGxlZC9tYXN0ZXIvRE0vQ1ItNzgvc2FtcGxlZC5pbnN0cnVtZW50Lmpzb25cIixcbiAgICBcImJwbVwiOiA0NjAsXG4gICAgXCJpbml0R2FpblwiOiAwLjUsXG4gICAgXCJtYXhHYWluXCI6IDAuNixcbiAgICBcImF0dGFja1RpbWVcIjogMC4yNyxcbiAgICBcInN1c3RhaW5UaW1lXCI6IDEuOCxcbiAgICBcInJlbGVhc2VUaW1lXCI6IDIsXG4gICAgXCJkZXR1bmVcIjogMTIwMCxcbiAgICBcImRlbGF5RW5hYmxlZFwiOiBcInRydWVcIixcbiAgICBcImRlbGF5XCI6IDAuMDUsXG4gICAgXCJmaWx0ZXJcIjogMjU5OS42XG4gIH1cbn07XG4iLCJjb25zdCBnZXRTZXRGb3JtVmFsdWVzID0gcmVxdWlyZSgnZ2V0LXNldC1mb3JtLXZhbHVlcycpO1xuXG5mdW5jdGlvbiBnZXRTZXRDb250cm9scygpIHtcblxuICAgIHRoaXMuZ2V0VHJhY2tlckNvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuICAgICAgICBsZXQgdmFsdWVzID0gZm9ybVZhbHVlcy5nZXQoZm9ybSk7XG4gICAgICAgIFxuICAgICAgICBsZXQgcmV0ID0ge307XG4gICAgICAgIGZvciAobGV0IGtleSBpbiB2YWx1ZXMpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2RlbGF5RW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9ICd0cnVlJztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ3NhbXBsZVNldCcpIHsgXG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSB2YWx1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldFtrZXldID0gcGFyc2VGbG9hdCh2YWx1ZXNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB0aGlzLnNldFRyYWNrZXJDb250cm9scyA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgaWYgKCF2YWx1ZXMpIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHRoaXMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0gdmFsdWVzO1xuICAgIH07ICBcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNldENvbnRyb2xzO1xuIiwiLy8gcmVxdWlyZShcImJhYmVsLXBvbHlmaWxsXCIpOyBcbmNvbnN0IGxvYWRTYW1wbGVTZXQgPSByZXF1aXJlKCdsb2FkLXNhbXBsZS1zZXQnKTtcbmNvbnN0IHNlbGVjdEVsZW1lbnQgPSByZXF1aXJlKCdzZWxlY3QtZWxlbWVudCcpO1xuY29uc3QgZ2V0U2V0Rm9ybVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1zZXQtZm9ybS12YWx1ZXMnKTtcbmNvbnN0IGFkc3JHYWluTm9kZSA9IHJlcXVpcmUoJ2Fkc3ItZ2Fpbi1ub2RlJyk7XG5jb25zdCB0cmFja2VyVGFibGUgPSByZXF1aXJlKCcuL3RyYWNrZXItdGFibGUnKTtcbmNvbnN0IHNjaGVkdWxlTWVhc3VyZSA9IHJlcXVpcmUoJy4vc2NoZWR1bGUtbWVhc3VyZScpO1xuXG5jb25zdCBnZXRBdWRpb09wdGlvbnMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IGF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRBdWRpb09wdGlvbnMoKTtcblxuY29uc3QgY3R4ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuY29uc3QgZGVmYXVsdFRyYWNrID0gcmVxdWlyZSgnLi9kZWZhdWx0LXRyYWNrJyk7XG5cbnZhciBtZWFzdXJlTGVuZ3RoID0gMTY7XG52YXIgYnVmZmVycztcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIGRhdGFVcmwsIHRyYWNrKSB7XG4gICAgXG4gICAgbG9hZFNhbXBsZVNldChjdHgsIGRhdGFVcmwsIGZ1bmN0aW9uIChzYW1wbGVEYXRhLCBzYW1wbGVCdWZmZXJzKSB7XG4gICAgICAgIGJ1ZmZlcnMgPSBzYW1wbGVCdWZmZXJzO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0cmFjaykge1xuICAgICAgICAgICAgdHJhY2sgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgIH0gXG4gICAgICAgIHNldHVwVHJhY2tlckh0bWwoc2FtcGxlRGF0YSk7ICAgIFxuICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjaylcbiAgICAgICAgc2V0dXBFdmVudHMoKTtcbiAgICB9KTtcbn1cblxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG5cbiAgICBmb3JtVmFsdWVzLnNldChmb3JtLCBkZWZhdWx0VHJhY2suc2V0dGluZ3MpO1xuICAgIGF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoZGVmYXVsdFRyYWNrLnNldHRpbmdzKTtcbiAgICBcbiAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgZGVmYXVsdFRyYWNrLnNldHRpbmdzLnNhbXBsZVNldCwgZGVmYXVsdFRyYWNrLmJlYXQpO1xuICAgIHNldHVwQmFzZUV2ZW50cygpO1xuICAgIFxuICAgIHZhciBzdG9yYWdlID0gbmV3IHRyYWNrc0xvY2FsU3RvcmFnZSgpO1xuICAgIHN0b3JhZ2Uuc2V0dXBTdG9yYWdlKCk7XG59O1xuXG52YXIgaW5zdHJ1bWVudERhdGEgPSB7fTtcbmZ1bmN0aW9uIHNldHVwVHJhY2tlckh0bWwoZGF0YSkge1xuICAgIGluc3RydW1lbnREYXRhID0gZGF0YTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXItcGFyZW50XCIpLmlubmVySFRNTCA9ICcnO1xuICAgIFxuICAgIGxldCBodG1sVGFibGUgPSBuZXcgdHJhY2tlclRhYmxlKCk7XG5cbiAgICBodG1sVGFibGUuc2V0Um93cyhkYXRhLmZpbGVuYW1lLmxlbmd0aCwgbWVhc3VyZUxlbmd0aCk7XG4gICAgdmFyIHN0ciA9IGh0bWxUYWJsZS5nZXRUYWJsZSgpO1xuICAgIFxuICAgIHZhciB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RyYWNrZXItcGFyZW50Jyk7XG4gICAgdC5pbnNlcnRBZGphY2VudEhUTUwoJ2FmdGVyYmVnaW4nLCBzdHIpO1xufVxuXG5mdW5jdGlvbiBkaXNjb25uZWN0Tm9kZShub2RlLCBvcHRpb25zKSB7XG4gICAgbGV0IHRvdGFsTGVuZ3RoID1cbiAgICAgICAgICAgIG9wdGlvbnMuYXR0YWNrVGltZSArIG9wdGlvbnMuc3VzdGFpblRpbWUgKyBvcHRpb25zLnJlbGVhc2VUaW1lO1xuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIG5vZGUuZGlzY29ubmVjdCgpO1xuICAgIH0sIHRvdGFsTGVuZ3RoICogMTAwMCk7XG59XG5cbmZ1bmN0aW9uIHNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKSB7XG4gICAgXG4gICAgbGV0IGluc3RydW1lbnROYW1lID0gaW5zdHJ1bWVudERhdGEuZmlsZW5hbWVbYmVhdC5yb3dJZF07XG4gICAgbGV0IGluc3RydW1lbnQgPSBidWZmZXJzW2luc3RydW1lbnROYW1lXS5nZXQoKTtcblxuICAgIGZ1bmN0aW9uIGNvbm5lY3REZWxheShpbnN0cnVtZW50KSB7XG5cbiAgICAgICAgLy8gV2l0aCBzdXN0YWluIGFuZCBmZWVkYmFjayBmaWx0ZXJcbiAgICAgICAgbGV0IGRlbGF5ID0gY3R4LmNyZWF0ZURlbGF5KCk7XG4gICAgICAgIGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRlbGF5O1xuXG4gICAgICAgIGxldCBnYWluID0gbmV3IGFkc3JHYWluTm9kZShjdHgpO1xuICAgICAgICBnYWluLnNldE9wdGlvbnMoYXVkaW9PcHRpb25zLmdldFRyYWNrZXJDb250cm9scygpKTtcbiAgICAgICAgbGV0IGZlZWRiYWNrR2FpbiA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuXG5cbiAgICAgICAgbGV0IGZpbHRlciA9IGN0eC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAgICAgZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmZpbHRlcjtcblxuICAgICAgICAvLyBkZWxheSAtPiBmZWVkYmFja1xuICAgICAgICBkZWxheS5jb25uZWN0KGZlZWRiYWNrR2Fpbik7XG4gICAgICAgIGRpc2Nvbm5lY3ROb2RlKGRlbGF5LCBhdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCkpO1xuXG4gICAgICAgIC8vIGZlZWRiYWNrIC0+IGZpbHRlclxuICAgICAgICBmZWVkYmFja0dhaW4uY29ubmVjdChmaWx0ZXIpO1xuXG4gICAgICAgIC8vIGZpbHRlciAtPmRlbGF5XG4gICAgICAgIGZpbHRlci5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICBpbnN0cnVtZW50LmRldHVuZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRldHVuZTtcblxuICAgICAgICAvLyBkZWxheSAtPiBpbnN0cnVtZW50XG4gICAgICAgIGluc3RydW1lbnQuY29ubmVjdChkZWxheSk7XG5cbiAgICAgICAgLy8gSW5zdHJ1bWVudCAtPlxuICAgICAgICBpbnN0cnVtZW50LmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAvLyBEZWxheSAtPlxuICAgICAgICBkZWxheS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5zdGFydCh0cmlnZ2VyVGltZSlcbiAgICAgICAgXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29ubmVjdENsZWFuKGluc3RydW1lbnQpIHtcblxuICAgICAgICAvLyBUcmlnZ2VyIHRvbmVcbiAgICAgICAgbGV0IGdhaW4gPSBuZXcgYWRzckdhaW5Ob2RlKGN0eCk7XG4gICAgICAgIGdhaW4uc2V0T3B0aW9ucyhhdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCkpO1xuICAgICAgICBsZXQgZ2Fpbk5vZGUgPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcblxuICAgICAgICBpbnN0cnVtZW50LmRldHVuZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRldHVuZTtcbiAgICAgICAgLy8gaW5zdHJ1bWVudCAtPiBnYWluXG4gICAgICAgIFxuICAgICAgICBpbnN0cnVtZW50LmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICBnYWluTm9kZS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5zdGFydCh0cmlnZ2VyVGltZSk7XG4gICAgfVxuXG4gICAgaWYgKGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRlbGF5RW5hYmxlZCkge1xuICAgICAgICBjb25uZWN0RGVsYXkoaW5zdHJ1bWVudClcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25uZWN0Q2xlYW4oaW5zdHJ1bWVudCk7XG4gICAgfVxufVxuXG52YXIgc2NoZWR1bGUgPSBuZXcgc2NoZWR1bGVNZWFzdXJlKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuc2NoZWR1bGUubWVhc3VyZUxlbmd0aCA9IG1lYXN1cmVMZW5ndGg7XG5cbmZ1bmN0aW9uIHNldHVwQmFzZUV2ZW50cyAoKSB7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXknKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgc2NoZWR1bGUucnVuU2NoZWR1bGUoYXVkaW9PcHRpb25zLm9wdGlvbnMuYnBtKTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYXVzZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpOyBcbiAgICB9KTtcbiAgICBcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RvcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICBzY2hlZHVsZSA9IG5ldyBzY2hlZHVsZU1lYXN1cmUoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCk7XG4gICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSBtZWFzdXJlTGVuZ3RoO1xuICAgIH0pO1xuICAgIFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdicG0nKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBhdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIGlmIChzY2hlZHVsZS5ydW5uaW5nKSB7XG4gICAgICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgICAgICBzY2hlZHVsZS5ydW5TY2hlZHVsZShhdWRpb09wdGlvbnMub3B0aW9ucy5icG0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgXG4gICAgJCgnLmJhc2UnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBhdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgfSk7XG59XG4gICAgXG5mdW5jdGlvbiBzZXR1cEV2ZW50cygpIHtcbiAgICBcbiAgICAkKCcuY2VsbCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmRhdGFzZXQpO1xuICAgICAgICB2YWwuZW5hYmxlZCA9ICQodGhpcykuaGFzQ2xhc3MoXCJlbmFibGVkXCIpO1xuXG4gICAgICAgIGxldCBjdXJyZW50QmVhdCA9ICQoJy5jdXJyZW50JykuZGF0YSgnY2VsbC1pZCcpO1xuICAgICAgICBpZiAodmFsLmNlbGxJZCA+IGN1cnJlbnRCZWF0KSB7XG4gICAgICAgICAgICBzY2hlZHVsZS5zY2hlZHVsZUF1ZGlvQmVhdE5vdyh2YWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgJCh0aGlzKS50b2dnbGVDbGFzcygnZW5hYmxlZCcpO1xuICAgIH0pO1xufVxuXG4kKCcjc2FtcGxlU2V0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdGhpcy52YWx1ZSk7XG59KTtcblxuXG5cbmZ1bmN0aW9uIHRyYWNrc0xvY2FsU3RvcmFnZSAoKSB7XG5cbiAgICB0aGlzLnNldExvY2FsU3RvcmFnZSA9IGZ1bmN0aW9uKHVwZGF0ZSkge1xuICAgICAgICB2YXIgc3RvcmFnZSA9IHt9O1xuICAgICAgICBzdG9yYWdlWydTZWxlY3QnXSA9ICdTZWxlY3QnO1xuXG5cbiAgICAgICAgZm9yICggdmFyIGkgPSAwLCBsZW4gPSBsb2NhbFN0b3JhZ2UubGVuZ3RoOyBpIDwgbGVuOyArK2kgKSB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IGxvY2FsU3RvcmFnZS5rZXkoaSk7XG4gICAgICAgICAgICBzdG9yYWdlW2l0ZW1dID0gaXRlbTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBzZWxlY3QgZWxlbWVudFxuICAgICAgICB2YXIgcyA9IG5ldyBzZWxlY3RFbGVtZW50KFxuICAgICAgICAgICAgJ2xvYWQtc3RvcmFnZScsIC8vIGlkIHRvIGFwcGVuZCB0aGUgc2VsZWN0IGxpc3QgdG9cbiAgICAgICAgICAgICdiZWF0LWxpc3QnLCAvLyBpZCBvZiB0aGUgc2VsZWN0IGxpc3RcbiAgICAgICAgICAgIHN0b3JhZ2UgLy9cbiAgICAgICAgKTtcblxuICAgICAgICBpZiAodXBkYXRlKSB7XG4gICAgICAgICAgICBzLnVwZGF0ZSgnYmVhdC1saXN0Jywgc3RvcmFnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzLmNyZWF0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuc2V0dXBTdG9yYWdlID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBmb3JtRGF0YSA9IGF1ZGlvT3B0aW9ucy5nZXRUcmFja2VyQ29udHJvbHMoKTtcbiAgICAgICAgICAgIGxldCBmaWxlbmFtZSA9ICQoJyNmaWxlbmFtZScpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICAgICAgICAgIGZpbGVuYW1lID0gJ3VudGl0bGVkJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGJlYXQgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgc29uZyA9IHtcImJlYXRcIjogYmVhdCwgXCJzZXR0aW5nc1wiOiBmb3JtRGF0YX1cblxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oZmlsZW5hbWUsIEpTT04uc3RyaW5naWZ5KHNvbmcpKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IGFsZXJ0KCdUcmFjayBzYXZlZCcpOyB9LCAxKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9ICQoJyNiZWF0LWxpc3QnKS52YWwoKTtcbiAgICAgICAgICAgIGlmIChpdGVtID09PSAnU2VsZWN0JykgeyAgICBcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSBpdGVtO1xuICAgICAgICAgICAgbGV0IHRyYWNrID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShpdGVtKSk7XG4gICAgICAgICAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuXG4gICAgICAgICAgICBmb3JtVmFsdWVzLnNldChmb3JtLCB0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBhdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcblxuICAgICAgICAgICAgaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIHRyYWNrLnNldHRpbmdzLnNhbXBsZVNldCwgdHJhY2suYmVhdCk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlbGV0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpO1xuICAgICAgICAgICAgbGV0IHRvRGVsZXRlID0gZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udGV4dDtcblxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odG9EZWxldGUpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcblxuICAgICAgICB9KTtcbiAgICB9O1xuIH1cbiAiLCJjb25zdCBXQUFDbG9jayA9IHJlcXVpcmUoJ3dhYWNsb2NrJyk7XG5jb25zdCBnZXRBdWRpb09wdGlvbnMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IGF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRBdWRpb09wdGlvbnMoKTtcblxuZnVuY3Rpb24gc2NoZWR1bGVNZWFzdXJlKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpIHtcbiAgICBcbiAgICB0aGlzLm1lYXN1cmVMZW5ndGggPSAxNjtcbiAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0ID0gc2NoZWR1bGVBdWRpb0JlYXQ7XG4gICAgdGhpcy5zY2hlZHVsZUZvcndhcmQgPSAwLjE7XG4gICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICB0aGlzLmV2ZW50TWFwID0ge307XG4gICAgdGhpcy5jbG9jayA9IG5ldyBXQUFDbG9jayhjdHgpO1xuICAgIHRoaXMuY2xvY2suc3RhcnQoKTtcbiAgICB0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcblxuICAgIHRoaXMubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50Kys7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnQgPj0gdGhpcy5tZWFzdXJlTGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLm1pbGxpUGVyQmVhdCA9IGZ1bmN0aW9uIChiZWF0cykge1xuICAgICAgICBpZiAoIWJlYXRzKSB7XG4gICAgICAgICAgICBiZWF0cyA9IDYwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAxMDAwICogNjAgLyBiZWF0cztcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRUcmFja2VyUm93VmFsdWVzID0gZnVuY3Rpb24gKGNlbGxJZCkge1xuICAgICAgICBsZXQgdmFsdWVzID0gW107XG4gICAgICAgIGxldCBzZWxlY3RvciA9IGBbZGF0YS1jZWxsLWlkPVwiJHtjZWxsSWR9XCJdYDtcblxuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZWxlbXMuZm9yRWFjaCgoZWwpID0+IHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlbC5kYXRhc2V0KTtcbiAgICAgICAgICAgIHZhbC5lbmFibGVkID0gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdlbmFibGVkJyk7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh2YWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9O1xuICAgIFxuXG4gICAgdGhpcy5zY2hlZHVsZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICBsZXQgYmVhdHMgPSB0aGlzLmdldFRyYWNrZXJSb3dWYWx1ZXModGhpcy5jdXJyZW50KTtcbiAgICAgICAgbGV0IG5vdyA9IGN0eC5jdXJyZW50VGltZTtcblxuICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtY2VsbC1pZD1cIiR7dGhpcy5jdXJyZW50fVwiXWA7XG5cbiAgICAgICAgbGV0IGV2ZW50ID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5hZGRDbGFzcygnY3VycmVudCcpO1xuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCk7XG5cbiAgICAgICAgdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICAkKHNlbGVjdG9yKS5yZW1vdmVDbGFzcygnY3VycmVudCcpO1xuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCArIHRoaXMubWlsbGlQZXJCZWF0KHRoaXMuYnBtKSAvIDEwMDApO1xuXG4gICAgICAgIGJlYXRzLmZvckVhY2goKGJlYXQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVCZWF0KGJlYXQsIG5vdyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlQmVhdCA9IGZ1bmN0aW9uIChiZWF0LCBub3cpIHtcblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZDtcbiAgICAgICAgdGhpcy5zY2hlZHVsZU1hcFtiZWF0LmNlbGxJZF0gPSB0cmlnZ2VyVGltZTtcbiAgICAgICAgaWYgKGJlYXQuZW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXSA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICAgICAgfSwgbm93KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlTWFwID0ge307XG5cbiAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0Tm93ID0gZnVuY3Rpb24gKGJlYXQpIHtcblxuICAgICAgICBpZiAoYmVhdC5lbmFibGVkKSB7XG4gICAgICAgICAgICBsZXQgYmVhdEV2ZW50ID0gdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIGlmIChiZWF0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICBiZWF0RXZlbnQuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB0cmlnZ2VyVGltZSA9IHRoaXMuc2NoZWR1bGVNYXBbMF0gKyBiZWF0LmNlbGxJZCAqIHRoaXMubWlsbGlQZXJCZWF0KHRoaXMuYnBtKSAvIDEwMDA7XG4gICAgICAgIGxldCBub3cgPSBjdHguY3VycmVudFRpbWU7XG4gICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICB9LCBub3cpO1xuICAgIH07XG5cbiAgICB0aGlzLmludGVydmFsO1xuICAgIHRoaXMucnVuU2NoZWR1bGUgPSBmdW5jdGlvbiAoYnBtKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuYnBtID0gYnBtO1xuICAgICAgICBsZXQgaW50ZXJ2YWwgPSB0aGlzLm1pbGxpUGVyQmVhdChicG0pO1xuXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgIH0sIDApO1xuXG4gICAgICAgIHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcblxuICAgICAgICB9LCBpbnRlcnZhbCk7XG4gICAgfTtcblxuICAgIHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldEV2ZW50S2V5ID0gZnVuY3Rpb24gZ2V0RXZlbnRLZXkoYmVhdCkge1xuICAgICAgICByZXR1cm4gYmVhdC5yb3dJZCArIGJlYXQuY2VsbElkO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRUcmFja2VyVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgdmFsdWVzID0gW107XG4gICAgICAgICQoXCIuY2VsbFwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSAkKHRoaXMpLmhhc0NsYXNzKFwiZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5sb2FkVHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgICAgJCgnLmNlbGwnKS5yZW1vdmVDbGFzcygnZW5hYmxlZCcpO1xuICAgICAgICBqc29uLmZvckVhY2goZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgICAgIGlmIChlbGVtLmVuYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtcm93LWlkPVwiJHtlbGVtLnJvd0lkfVwiXVtkYXRhLWNlbGwtaWQ9XCIke2VsZW0uY2VsbElkfVwiXWA7XG4gICAgICAgICAgICAgICAgJChzZWxlY3RvcikuYWRkQ2xhc3MoXCJlbmFibGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2NoZWR1bGVNZWFzdXJlOyIsImZ1bmN0aW9uIHRyYWNrZXJUYWJsZSgpIHtcbiAgICBcbiAgICB0aGlzLnN0ciA9ICcnO1xuICAgIHRoaXMuZ2V0VGFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAnPHRhYmxlIGlkPVwidHJhY2tlclwiPicgKyB0aGlzLnN0ciArICc8L3RhYmxlPic7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLnNldEhlYWRlciA9IGZ1bmN0aW9uIChudW1DZWxscykge1xuXG4gICAgICAgIHRoaXMuc3RyICs9IGA8dHIgY2xhc3M9XCJyb3cgaGVhZGVyXCI+YDtcbiAgICAgICAgdGhpcy5zdHIgKz0gdGhpcy5nZXRDZWxscygnaGVhZGVyJywgbnVtQ2VsbHMsIHRydWUpO1xuICAgICAgICB0aGlzLnN0ciArPSBgPC90cj5gO1xuICAgICAgICBcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuc2V0Um93cyA9IGZ1bmN0aW9uIChudW1Sb3dzLCBudW1DZWxscykge1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXRIZWFkZXIobnVtQ2VsbHMpO1xuICAgICAgICBmb3IgKGxldCByb3dJRCA9IDA7IHJvd0lEIDwgbnVtUm93czsgcm93SUQrKykge1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gYDx0ciBjbGFzcz1cInJvd1wiIGRhdGEtaWQ9XCIke3Jvd0lEfVwiPmA7XG4gICAgICAgICAgICB0aGlzLnN0ciArPSB0aGlzLmdldENlbGxzKHJvd0lELCBudW1DZWxscyk7XG4gICAgICAgICAgICB0aGlzLnN0ciArPSBgPC90cj5gO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldENlbGxzID0gZnVuY3Rpb24ocm93SUQsIG51bUNlbGxzLCBoZWFkZXIpIHtcbiAgICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IG51bUNlbGxzOyBjKyspIHtcbiAgICAgICAgICAgIHN0ciArPSBgPHRkIGNsYXNzPVwiY2VsbFwiIGRhdGEtcm93LWlkPVwiJHtyb3dJRH1cIiBkYXRhLWNlbGwtaWQ9XCIke2N9XCI+YDtcbiAgICAgICAgICAgIGlmIChoZWFkZXIpc3RyICs9IGMgKyAxO1xuICAgICAgICAgICAgc3RyICs9IGA8L3RkPmA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYWNrZXJUYWJsZTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
