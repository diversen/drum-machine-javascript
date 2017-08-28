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

},{"_process":15}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"./get-tracker-controls":12}],12:[function(require,module,exports){
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

},{"get-set-form-values":4}],13:[function(require,module,exports){
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
const defaultTrack = require('./default-track');

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
    let formValues = new getSetFormValues();
    let form = document.getElementById("trackerControls");

    formValues.set(form, defaultTrack.settings);
    audioOptions.setOptions(defaultTrack.settings);
    
    // var defaultBeat = 
            
            
      //       [{"rowId": "0", "cellId": "0", "enabled": false}, {"rowId": "0", "cellId": "1", "enabled": false}, {"rowId": "0", "cellId": "2", "enabled": false}, {"rowId": "0", "cellId": "3", "enabled": false}, {"rowId": "0", "cellId": "4", "enabled": false}, {"rowId": "0", "cellId": "5", "enabled": false}, {"rowId": "0", "cellId": "6", "enabled": false}, {"rowId": "0", "cellId": "7", "enabled": false}, {"rowId": "0", "cellId": "8", "enabled": false}, {"rowId": "0", "cellId": "9", "enabled": false}, {"rowId": "0", "cellId": "10", "enabled": false}, {"rowId": "0", "cellId": "11", "enabled": false}, {"rowId": "0", "cellId": "12", "enabled": false}, {"rowId": "0", "cellId": "13", "enabled": false}, {"rowId": "0", "cellId": "14", "enabled": false}, {"rowId": "0", "cellId": "15", "enabled": false}, {"rowId": "1", "cellId": "0", "enabled": false}, {"rowId": "1", "cellId": "1", "enabled": false}, {"rowId": "1", "cellId": "2", "enabled": false}, {"rowId": "1", "cellId": "3", "enabled": false}, {"rowId": "1", "cellId": "4", "enabled": false}, {"rowId": "1", "cellId": "5", "enabled": false}, {"rowId": "1", "cellId": "6", "enabled": false}, {"rowId": "1", "cellId": "7", "enabled": false}, {"rowId": "1", "cellId": "8", "enabled": false}, {"rowId": "1", "cellId": "9", "enabled": false}, {"rowId": "1", "cellId": "10", "enabled": false}, {"rowId": "1", "cellId": "11", "enabled": false}, {"rowId": "1", "cellId": "12", "enabled": false}, {"rowId": "1", "cellId": "13", "enabled": false}, {"rowId": "1", "cellId": "14", "enabled": false}, {"rowId": "1", "cellId": "15", "enabled": false}, {"rowId": "2", "cellId": "0", "enabled": false}, {"rowId": "2", "cellId": "1", "enabled": false}, {"rowId": "2", "cellId": "2", "enabled": false}, {"rowId": "2", "cellId": "3", "enabled": false}, {"rowId": "2", "cellId": "4", "enabled": false}, {"rowId": "2", "cellId": "5", "enabled": false}, {"rowId": "2", "cellId": "6", "enabled": false}, {"rowId": "2", "cellId": "7", "enabled": false}, {"rowId": "2", "cellId": "8", "enabled": false}, {"rowId": "2", "cellId": "9", "enabled": false}, {"rowId": "2", "cellId": "10", "enabled": false}, {"rowId": "2", "cellId": "11", "enabled": false}, {"rowId": "2", "cellId": "12", "enabled": false}, {"rowId": "2", "cellId": "13", "enabled": false}, {"rowId": "2", "cellId": "14", "enabled": false}, {"rowId": "2", "cellId": "15", "enabled": false}, {"rowId": "3", "cellId": "0", "enabled": false}, {"rowId": "3", "cellId": "1", "enabled": false}, {"rowId": "3", "cellId": "2", "enabled": false}, {"rowId": "3", "cellId": "3", "enabled": false}, {"rowId": "3", "cellId": "4", "enabled": false}, {"rowId": "3", "cellId": "5", "enabled": false}, {"rowId": "3", "cellId": "6", "enabled": false}, {"rowId": "3", "cellId": "7", "enabled": false}, {"rowId": "3", "cellId": "8", "enabled": false}, {"rowId": "3", "cellId": "9", "enabled": false}, {"rowId": "3", "cellId": "10", "enabled": false}, {"rowId": "3", "cellId": "11", "enabled": false}, {"rowId": "3", "cellId": "12", "enabled": false}, {"rowId": "3", "cellId": "13", "enabled": false}, {"rowId": "3", "cellId": "14", "enabled": false}, {"rowId": "3", "cellId": "15", "enabled": false}, {"rowId": "4", "cellId": "0", "enabled": true}, {"rowId": "4", "cellId": "1", "enabled": false}, {"rowId": "4", "cellId": "2", "enabled": false}, {"rowId": "4", "cellId": "3", "enabled": true}, {"rowId": "4", "cellId": "4", "enabled": false}, {"rowId": "4", "cellId": "5", "enabled": false}, {"rowId": "4", "cellId": "6", "enabled": false}, {"rowId": "4", "cellId": "7", "enabled": true}, {"rowId": "4", "cellId": "8", "enabled": false}, {"rowId": "4", "cellId": "9", "enabled": false}, {"rowId": "4", "cellId": "10", "enabled": false}, {"rowId": "4", "cellId": "11", "enabled": false}, {"rowId": "4", "cellId": "12", "enabled": false}, {"rowId": "4", "cellId": "13", "enabled": true}, {"rowId": "4", "cellId": "14", "enabled": false}, {"rowId": "4", "cellId": "15", "enabled": false}, {"rowId": "5", "cellId": "0", "enabled": false}, {"rowId": "5", "cellId": "1", "enabled": false}, {"rowId": "5", "cellId": "2", "enabled": false}, {"rowId": "5", "cellId": "3", "enabled": false}, {"rowId": "5", "cellId": "4", "enabled": false}, {"rowId": "5", "cellId": "5", "enabled": false}, {"rowId": "5", "cellId": "6", "enabled": false}, {"rowId": "5", "cellId": "7", "enabled": false}, {"rowId": "5", "cellId": "8", "enabled": false}, {"rowId": "5", "cellId": "9", "enabled": false}, {"rowId": "5", "cellId": "10", "enabled": false}, {"rowId": "5", "cellId": "11", "enabled": false}, {"rowId": "5", "cellId": "12", "enabled": false}, {"rowId": "5", "cellId": "13", "enabled": false}, {"rowId": "5", "cellId": "14", "enabled": false}, {"rowId": "5", "cellId": "15", "enabled": false}, {"rowId": "6", "cellId": "0", "enabled": false}, {"rowId": "6", "cellId": "1", "enabled": true}, {"rowId": "6", "cellId": "2", "enabled": false}, {"rowId": "6", "cellId": "3", "enabled": false}, {"rowId": "6", "cellId": "4", "enabled": true}, {"rowId": "6", "cellId": "5", "enabled": false}, {"rowId": "6", "cellId": "6", "enabled": false}, {"rowId": "6", "cellId": "7", "enabled": false}, {"rowId": "6", "cellId": "8", "enabled": false}, {"rowId": "6", "cellId": "9", "enabled": true}, {"rowId": "6", "cellId": "10", "enabled": false}, {"rowId": "6", "cellId": "11", "enabled": false}, {"rowId": "6", "cellId": "12", "enabled": false}, {"rowId": "6", "cellId": "13", "enabled": false}, {"rowId": "6", "cellId": "14", "enabled": false}, {"rowId": "6", "cellId": "15", "enabled": false}, {"rowId": "7", "cellId": "0", "enabled": false}, {"rowId": "7", "cellId": "1", "enabled": false}, {"rowId": "7", "cellId": "2", "enabled": false}, {"rowId": "7", "cellId": "3", "enabled": false}, {"rowId": "7", "cellId": "4", "enabled": false}, {"rowId": "7", "cellId": "5", "enabled": true}, {"rowId": "7", "cellId": "6", "enabled": false}, {"rowId": "7", "cellId": "7", "enabled": false}, {"rowId": "7", "cellId": "8", "enabled": false}, {"rowId": "7", "cellId": "9", "enabled": false}, {"rowId": "7", "cellId": "10", "enabled": false}, {"rowId": "7", "cellId": "11", "enabled": true}, {"rowId": "7", "cellId": "12", "enabled": false}, {"rowId": "7", "cellId": "13", "enabled": false}, {"rowId": "7", "cellId": "14", "enabled": false}, {"rowId": "7", "cellId": "15", "enabled": true}, {"rowId": "8", "cellId": "0", "enabled": false}, {"rowId": "8", "cellId": "1", "enabled": false}, {"rowId": "8", "cellId": "2", "enabled": false}, {"rowId": "8", "cellId": "3", "enabled": false}, {"rowId": "8", "cellId": "4", "enabled": false}, {"rowId": "8", "cellId": "5", "enabled": false}, {"rowId": "8", "cellId": "6", "enabled": false}, {"rowId": "8", "cellId": "7", "enabled": false}, {"rowId": "8", "cellId": "8", "enabled": false}, {"rowId": "8", "cellId": "9", "enabled": false}, {"rowId": "8", "cellId": "10", "enabled": false}, {"rowId": "8", "cellId": "11", "enabled": false}, {"rowId": "8", "cellId": "12", "enabled": false}, {"rowId": "8", "cellId": "13", "enabled": false}, {"rowId": "8", "cellId": "14", "enabled": false}, {"rowId": "8", "cellId": "15", "enabled": false}, {"rowId": "9", "cellId": "0", "enabled": true}, {"rowId": "9", "cellId": "1", "enabled": false}, {"rowId": "9", "cellId": "2", "enabled": false}, {"rowId": "9", "cellId": "3", "enabled": false}, {"rowId": "9", "cellId": "4", "enabled": false}, {"rowId": "9", "cellId": "5", "enabled": false}, {"rowId": "9", "cellId": "6", "enabled": false}, {"rowId": "9", "cellId": "7", "enabled": false}, {"rowId": "9", "cellId": "8", "enabled": false}, {"rowId": "9", "cellId": "9", "enabled": true}, {"rowId": "9", "cellId": "10", "enabled": false}, {"rowId": "9", "cellId": "11", "enabled": false}, {"rowId": "9", "cellId": "12", "enabled": false}, {"rowId": "9", "cellId": "13", "enabled": false}, {"rowId": "9", "cellId": "14", "enabled": false}, {"rowId": "9", "cellId": "15", "enabled": false}, {"rowId": "10", "cellId": "0", "enabled": false}, {"rowId": "10", "cellId": "1", "enabled": true}, {"rowId": "10", "cellId": "2", "enabled": false}, {"rowId": "10", "cellId": "3", "enabled": false}, {"rowId": "10", "cellId": "4", "enabled": false}, {"rowId": "10", "cellId": "5", "enabled": false}, {"rowId": "10", "cellId": "6", "enabled": false}, {"rowId": "10", "cellId": "7", "enabled": false}, {"rowId": "10", "cellId": "8", "enabled": false}, {"rowId": "10", "cellId": "9", "enabled": false}, {"rowId": "10", "cellId": "10", "enabled": false}, {"rowId": "10", "cellId": "11", "enabled": false}, {"rowId": "10", "cellId": "12", "enabled": false}, {"rowId": "10", "cellId": "13", "enabled": true}, {"rowId": "10", "cellId": "14", "enabled": false}, {"rowId": "10", "cellId": "15", "enabled": false}, {"rowId": "11", "cellId": "0", "enabled": false}, {"rowId": "11", "cellId": "1", "enabled": false}, {"rowId": "11", "cellId": "2", "enabled": false}, {"rowId": "11", "cellId": "3", "enabled": false}, {"rowId": "11", "cellId": "4", "enabled": false}, {"rowId": "11", "cellId": "5", "enabled": false}, {"rowId": "11", "cellId": "6", "enabled": false}, {"rowId": "11", "cellId": "7", "enabled": true}, {"rowId": "11", "cellId": "8", "enabled": false}, {"rowId": "11", "cellId": "9", "enabled": false}, {"rowId": "11", "cellId": "10", "enabled": false}, {"rowId": "11", "cellId": "11", "enabled": false}, {"rowId": "11", "cellId": "12", "enabled": false}, {"rowId": "11", "cellId": "13", "enabled": false}, {"rowId": "11", "cellId": "14", "enabled": false}, {"rowId": "11", "cellId": "15", "enabled": false}, {"rowId": "12", "cellId": "0", "enabled": false}, {"rowId": "12", "cellId": "1", "enabled": false}, {"rowId": "12", "cellId": "2", "enabled": false}, {"rowId": "12", "cellId": "3", "enabled": false}, {"rowId": "12", "cellId": "4", "enabled": false}, {"rowId": "12", "cellId": "5", "enabled": false}, {"rowId": "12", "cellId": "6", "enabled": false}, {"rowId": "12", "cellId": "7", "enabled": false}, {"rowId": "12", "cellId": "8", "enabled": false}, {"rowId": "12", "cellId": "9", "enabled": false}, {"rowId": "12", "cellId": "10", "enabled": false}, {"rowId": "12", "cellId": "11", "enabled": true}, {"rowId": "12", "cellId": "12", "enabled": false}, {"rowId": "12", "cellId": "13", "enabled": false}, {"rowId": "12", "cellId": "14", "enabled": false}, {"rowId": "12", "cellId": "15", "enabled": false}, {"rowId": "13", "cellId": "0", "enabled": false}, {"rowId": "13", "cellId": "1", "enabled": false}, {"rowId": "13", "cellId": "2", "enabled": false}, {"rowId": "13", "cellId": "3", "enabled": false}, {"rowId": "13", "cellId": "4", "enabled": false}, {"rowId": "13", "cellId": "5", "enabled": false}, {"rowId": "13", "cellId": "6", "enabled": false}, {"rowId": "13", "cellId": "7", "enabled": false}, {"rowId": "13", "cellId": "8", "enabled": false}, {"rowId": "13", "cellId": "9", "enabled": false}, {"rowId": "13", "cellId": "10", "enabled": false}, {"rowId": "13", "cellId": "11", "enabled": false}, {"rowId": "13", "cellId": "12", "enabled": false}, {"rowId": "13", "cellId": "13", "enabled": false}, {"rowId": "13", "cellId": "14", "enabled": false}, {"rowId": "13", "cellId": "15", "enabled": false}, {"rowId": "14", "cellId": "0", "enabled": false}, {"rowId": "14", "cellId": "1", "enabled": false}, {"rowId": "14", "cellId": "2", "enabled": false}, {"rowId": "14", "cellId": "3", "enabled": false}, {"rowId": "14", "cellId": "4", "enabled": false}, {"rowId": "14", "cellId": "5", "enabled": true}, {"rowId": "14", "cellId": "6", "enabled": false}, {"rowId": "14", "cellId": "7", "enabled": false}, {"rowId": "14", "cellId": "8", "enabled": false}, {"rowId": "14", "cellId": "9", "enabled": false}, {"rowId": "14", "cellId": "10", "enabled": false}, {"rowId": "14", "cellId": "11", "enabled": false}, {"rowId": "14", "cellId": "12", "enabled": false}, {"rowId": "14", "cellId": "13", "enabled": false}, {"rowId": "14", "cellId": "14", "enabled": false}, {"rowId": "14", "cellId": "15", "enabled": false}, {"rowId": "15", "cellId": "0", "enabled": false}, {"rowId": "15", "cellId": "1", "enabled": false}, {"rowId": "15", "cellId": "2", "enabled": false}, {"rowId": "15", "cellId": "3", "enabled": false}, {"rowId": "15", "cellId": "4", "enabled": false}, {"rowId": "15", "cellId": "5", "enabled": false}, {"rowId": "15", "cellId": "6", "enabled": false}, {"rowId": "15", "cellId": "7", "enabled": false}, {"rowId": "15", "cellId": "8", "enabled": false}, {"rowId": "15", "cellId": "9", "enabled": false}, {"rowId": "15", "cellId": "10", "enabled": false}, {"rowId": "15", "cellId": "11", "enabled": false}, {"rowId": "15", "cellId": "12", "enabled": false}, {"rowId": "15", "cellId": "13", "enabled": false}, {"rowId": "15", "cellId": "14", "enabled": false}, {"rowId": "15", "cellId": "15", "enabled": false}]
    initializeSampleSet(ctx, defaultTrack.settings.sampleSet, defaultTrack.beat);
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
            console.log(track)
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
 
},{"./default-track":10,"./get-set-controls":11,"./get-tracker-controls":12,"./schedule-measure":14,"adsr-gain-node":1,"get-html-rows-cells":3,"get-set-form-values":4,"load-sample-set":5,"select-element":6}],14:[function(require,module,exports){
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
},{"./get-set-controls":11,"waaclock":8}],15:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZ2V0LWh0bWwtcm93cy1jZWxscy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nZXQtc2V0LWZvcm0tdmFsdWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvYWQtc2FtcGxlLXNldC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9zZWxlY3QtZWxlbWVudC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy90aW55LXNhbXBsZS1sb2FkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svbGliL1dBQUNsb2NrLmpzIiwic3JjL2RlZmF1bHQtdHJhY2suanMiLCJzcmMvZ2V0LXNldC1jb250cm9scy5qcyIsInNyYy9nZXQtdHJhY2tlci1jb250cm9scy5qcyIsInNyYy9tYWluLmpzIiwic3JjL3NjaGVkdWxlLW1lYXN1cmUuanMiLCIuLi8uLi8uLi91c3IvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDek9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2oyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIEdhaW4oY3R4KSB7XG5cbiAgICB0aGlzLmN0eCA9IGN0eDtcblxuICAgIHRoaXMuc2Vjb25kc1RvVGltZUNvbnN0YW50ID0gZnVuY3Rpb24gKHNlYykge1xuICAgICAgICByZXR1cm4gKHNlYyAqIDIpIC8gODtcbiAgICB9O1xuXG4gICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgICBpbml0R2FpbjogMC4xLCAvLyBJbml0IGdhaW4gb24gbm90ZVxuICAgICAgICBtYXhHYWluOiAxLjAsIC8vIE1heCBnYWluIG9uIG5vdGVcbiAgICAgICAgYXR0YWNrVGltZTogMC4xLCAvLyBBdHRhY2tUaW1lLiBnYWluLmluaXQgdG8gZ2Fpbi5tYXggaW4gYXR0YWNrVGltZVxuICAgICAgICBzdXN0YWluVGltZTogMSwgLy8gU3VzdGFpbiBub3RlIGluIHRpbWVcbiAgICAgICAgcmVsZWFzZVRpbWU6IDEsIC8vIEFwcHJveGltYXRlZCBlbmQgdGltZS4gQ2FsY3VsYXRlZCB3aXRoIHNlY29uZHNUb1RpbWVDb25zdGFudCgpXG4gICAgICAgIC8vIGRpc2Nvbm5lY3Q6IGZhbHNlIC8vIFNob3VsZCB3ZSBhdXRvZGlzY29ubmVjdC4gRGVmYXVsdCBpcyB0cnVlXG4gICAgfTtcblxuICAgIHRoaXMuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgfTtcblxuICAgIHRoaXMuZ2Fpbk5vZGU7XG4gICAgLyoqXG4gICAgICogVGhlIGdhaW5Ob2RlXG4gICAgICogQHBhcmFtIHtmbG9hdH0gYmVnaW4gY3R4IHRpbWVcbiAgICAgKiBAcmV0dXJucyB7R2Fpbi5nZXRHYWluTm9kZS5nYWluTm9kZX1cbiAgICAgKi9cbiAgICB0aGlzLmdldEdhaW5Ob2RlID0gZnVuY3Rpb24gKGJlZ2luKSB7XG5cbiAgICAgICAgdGhpcy5nYWluTm9kZSA9IHRoaXMuY3R4LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlID0gdGhpcy5vcHRpb25zLmluaXRHYWluO1xuXG4gICAgICAgIC8vIEF0dGFjayB0byBtYXhcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnNldFRhcmdldEF0VGltZShcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubWF4R2FpbixcbiAgICAgICAgICAgICAgICBiZWdpbiArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lLFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lKTtcblxuICAgICAgICAvLyBTdXN0YWluIGFuZCBlbmQgbm90ZVxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKFxuICAgICAgICAgICAgICAgIDAuMCxcbiAgICAgICAgICAgICAgICBiZWdpbiArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lICsgdGhpcy5vcHRpb25zLnN1c3RhaW5UaW1lLFxuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kc1RvVGltZUNvbnN0YW50KHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZSkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5kaXNjb25uZWN0ICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0KGJlZ2luKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2Fpbk5vZGU7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUgKyB0aGlzLm9wdGlvbnMucmVsZWFzZVRpbWU7XG4gICAgICAgIFxuICAgICAgICBzZXRUaW1lb3V0KCAoKT0+ICB7XG4gICAgICAgICAgICB0aGlzLmdhaW5Ob2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdG90YWxMZW5ndGggKiAxMDAwKTtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdhaW47IiwiLy8gRnJvbTogaHR0cHM6Ly9kZXYub3BlcmEuY29tL2FydGljbGVzL2RydW0tc291bmRzLXdlYmF1ZGlvL1xuZnVuY3Rpb24gSW5zdHJ1bWVudChjb250ZXh0LCBidWZmZXIpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xufVxuXG5JbnN0cnVtZW50LnByb3RvdHlwZS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICB0aGlzLnNvdXJjZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG59O1xuXG5JbnN0cnVtZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgdGhpcy5zb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlO1xufTtcblxuSW5zdHJ1bWVudC5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdGhpcy5zZXR1cCgpO1xuICAgIHRoaXMuc291cmNlLnN0YXJ0KHRpbWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnN0cnVtZW50O1xuIiwiZnVuY3Rpb24gZ2V0SFRNTFJvd3NDZWxscyhudW1Sb3dzLCBudW1DZWxscywgZGl2LCBzcGFuKSB7XG4gICAgXG4gICAgdmFyIHN0ciA9ICcnO1xuICAgIFxuICAgIGlmICghZGl2KSBkaXYgPSAnc3Bhbic7XG4gICAgaWYgKCFzcGFuKSBzcGFuID0nc3Bhbic7XG4gICAgXG4gICAgXG4gICAgZm9yIChsZXQgcm93SUQgPSAwOyByb3dJRCA8IG51bVJvd3M7IHJvd0lEKyspIHtcbiAgICAgICAgc3RyICs9IGA8JHtkaXZ9IGNsYXNzPVwicm93XCIgZGF0YS1pZD1cIiR7cm93SUR9XCI+YDtcbiAgICAgICAgc3RyICs9IGdldENlbGxzKHJvd0lELCBudW1DZWxscywgc3Bhbik7XG4gICAgICAgIHN0ciArPSBgPC8ke2Rpdn0+YDtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gZ2V0Q2VsbHMocm93SUQsIG51bUNlbGxzLCBzcGFuKSB7XG4gICAgdmFyIHN0ciA9ICcnO1xuICAgIGZvciAobGV0IGMgPSAwOyBjIDwgbnVtQ2VsbHM7IGMrKykge1xuICAgICAgICBzdHIgKz0gYDwke3NwYW59IGNsYXNzPVwiY2VsbFwiIGRhdGEtcm93LWlkPVwiJHtyb3dJRH1cIiBkYXRhLWNlbGwtaWQ9XCIke2N9XCI+PC8ke3NwYW59PmA7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0SFRNTFJvd3NDZWxscztcbiIsImZ1bmN0aW9uIGdldEVsZW1Db3VudEJ5TmFtZSAobmFtZSkge1xuICAgIHZhciBuYW1lcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKG5hbWUpO1xuICAgIHJldHVybiBuYW1lcy5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIGdldEZvcm1WYWx1ZXMoZm9ybUVsZW1lbnQpIHtcbiAgICB2YXIgZm9ybUVsZW1lbnRzID0gZm9ybUVsZW1lbnQuZWxlbWVudHM7XG4gICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGVsZW0gPSBudWxsO1xuICAgIGZvciAoaSA9IDA7IGkgPCBmb3JtRWxlbWVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgZWxlbSA9IGZvcm1FbGVtZW50c1tpXTtcbiAgICAgICAgc3dpdGNoIChlbGVtLnR5cGUpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNpbmdsZSBjaGVja2JveFxuICAgICAgICAgICAgICAgIHZhciBudW1FbGVtcyA9IGdldEVsZW1Db3VudEJ5TmFtZShlbGVtLm5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChudW1FbGVtcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZvcm1QYXJhbXNbZWxlbS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE11bHRpcGxlXG4gICAgICAgICAgICAgICAgaWYgKGVsZW0uY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWZvcm1QYXJhbXNbZWxlbS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gW2VsZW0udmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdLnB1c2goZWxlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RWYWx1ZXMgPSBnZXRTZWxlY3RWYWx1ZXMoZWxlbSk7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IHNlbGVjdFZhbHVlcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLnZhbHVlICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmb3JtUGFyYW1zO1xufVxuXG5mdW5jdGlvbiBzZXRGb3JtVmFsdWVzKGZvcm1FbGVtZW50LCB2YWx1ZXMpIHtcbiAgICB2YXIgZm9ybUVsZW1lbnRzID0gZm9ybUVsZW1lbnQuZWxlbWVudHM7XG4gICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGVsZW0gPSBudWxsO1xuICAgIGZvciAoaSA9IDA7IGkgPCBmb3JtRWxlbWVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgZWxlbSA9IGZvcm1FbGVtZW50c1tpXTtcbiAgICAgICAgXG4gICAgICAgIGlmICggIShlbGVtLm5hbWUgaW4gdmFsdWVzKSApIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGVsZW0udHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0gPT09IGVsZW0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdLmluZGV4T2YoZWxlbS52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBzZXRTZWxlY3RWYWx1ZXMoZWxlbSwgdmFsdWVzW2VsZW0ubmFtZV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0udmFsdWUgPSB2YWx1ZXNbZWxlbS5uYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldFNlbGVjdFZhbHVlcyhzZWxlY3RFbGVtLCB2YWx1ZXMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHNlbGVjdEVsZW0ub3B0aW9ucztcbiAgICB2YXIgb3B0O1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcbiAgICAgICAgaWYgKHZhbHVlcy5pbmRleE9mKG9wdC52YWx1ZSkgPiAtMSApIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgfSAgICAgICAgXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRTZWxlY3RWYWx1ZXMoc2VsZWN0KSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0ICYmIHNlbGVjdC5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IG9wdGlvbnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgICAgIG9wdCA9IG9wdGlvbnNbaV07XG5cbiAgICAgICAgaWYgKG9wdC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gob3B0LnZhbHVlIHx8IG9wdC50ZXh0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBnZXRTZXRGb3JtVmFsdWVzICgpIHtcbiAgICB0aGlzLnNldCA9IHNldEZvcm1WYWx1ZXM7XG4gICAgdGhpcy5nZXQgPSBnZXRGb3JtVmFsdWVzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNldEZvcm1WYWx1ZXM7XG4iLCJ2YXIgdGlueVNhbXBsZUxvYWRlciA9IHJlcXVpcmUoJ3Rpbnktc2FtcGxlLWxvYWRlcicpO1xudmFyIGF1ZGlvQnVmZmVySW5zdHJ1bWVudCA9IHJlcXVpcmUoJ2F1ZGlvLWJ1ZmZlci1pbnN0cnVtZW50Jyk7XG5cbmZ1bmN0aW9uIGxvYWRTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCBjYikge1xuICAgIFxuICAgIGZldGNoKGRhdGFVcmwpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgIT09IDIwMCkgeyAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTG9va3MgbGlrZSB0aGVyZSB3YXMgYSBwcm9ibGVtLiBTdGF0dXMgQ29kZTogJyArICByZXNwb25zZS5zdGF0dXMpOyAgXG4gICAgICAgICAgICByZXR1cm47ICBcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3BvbnNlLmpzb24oKS50aGVuKGZ1bmN0aW9uKGRhdGEpIHsgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB2YXIgYmFzZVVybCA9IGRhdGEuc2FtcGxlcztcbiAgICAgICAgICAgIHZhciBidWZmZXJzID0ge307XG4gICAgICAgICAgICB2YXIgcHJvbWlzZXMgPSBbXTtcblxuICAgICAgICAgICAgZGF0YS5maWxlbmFtZSA9IFtdO1xuICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgZGF0YS5maWxlcy5mb3JFYWNoKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlsZW5hbWUgPSB2YWwucmVwbGFjZSgvXFwuW14vLl0rJC8sIFwiXCIpO1xuICAgICAgICAgICAgICAgIGRhdGEuZmlsZW5hbWUucHVzaChmaWxlbmFtZSk7XG4gICAgICAgICAgICAgICAgdmFyIHJlbW90ZVVybCA9IGJhc2VVcmwgKyB2YWw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbGV0IGxvYWRlclByb21pc2UgPSB0aW55U2FtcGxlTG9hZGVyKHJlbW90ZVVybCwgY3R4LCAoYnVmZmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcnNbZmlsZW5hbWVdID0gbmV3IGF1ZGlvQnVmZmVySW5zdHJ1bWVudChjdHgsIGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaChsb2FkZXJQcm9taXNlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbih2YWx1ZXMgPT4geyBcbiAgICAgICAgICAgICAgICBjYihkYXRhLCBidWZmZXJzKTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGUgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICB9KTsgICAgXG4gICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7ICBcbiAgICAgICAgY29uc29sZS5sb2coJ0ZldGNoIEVycm9yIDotUycsIGVycik7ICBcbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBsb2FkU2FtcGxlU2V0OyIsImZ1bmN0aW9uIHNlbGVjdEVsZW1lbnQoYXBwZW5kVG9JRCwgc2VsZWN0SUQsIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG5cbiAgICB0aGlzLmFwcGVuZFRvSUQgPSBhcHBlbmRUb0lEO1xuICAgIHRoaXMuc2VsZWN0SUQgPSBzZWxlY3RJRDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuc2VsZWN0ZWQgPSBzZWxlY3RlZDtcbiAgICBcbiAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXBwZW5kVG9JRCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuYXBwZW5kVG9JRCk7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNlbGVjdFwiKTtcbiAgICAgICAgc2VsZWN0TGlzdC5pZCA9IHRoaXMuc2VsZWN0SUQ7ICAgICAgICBcbiAgICAgICAgYXBwZW5kVG9JRC5hcHBlbmRDaGlsZChzZWxlY3RMaXN0KTtcbiAgICAgICAgdGhpcy51cGRhdGUoc2VsZWN0SUQsIHRoaXMub3B0aW9ucywgdGhpcy5zZWxlY3RlZCk7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uIChlbGVtLCBvcHRpb25zLCBzZWxlY3RlZCkge1xuICAgICAgICB0aGlzLmRlbGV0ZShlbGVtKTtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpO1xuICAgICAgICAgICAgb3B0aW9uLnZhbHVlID0ga2V5O1xuICAgICAgICAgICAgb3B0aW9uLnRleHQgPSBvcHRpb25zW2tleV07XG4gICAgICAgICAgICBzZWxlY3RMaXN0LmFwcGVuZENoaWxkKG9wdGlvbik7XG5cbiAgICAgICAgICAgIGlmIChrZXkgPT09IHNlbGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRTZWxlY3RlZCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIHZhciBvcHQ7XG4gICAgICAgIGZvciAoIHZhciBpID0gMCwgbGVuID0gc2VsZWN0TGlzdC5vcHRpb25zLmxlbmd0aDsgaSA8IGxlbjsgaSsrICkge1xuICAgICAgICAgICAgb3B0ID0gc2VsZWN0TGlzdC5vcHRpb25zW2ldO1xuICAgICAgICAgICAgaWYgKCBvcHQuc2VsZWN0ZWQgPT09IHRydWUgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdC52YWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBvcHRpb24gaW4gc2VsZWN0TGlzdCl7XG4gICAgICAgICAgICBzZWxlY3RMaXN0LnJlbW92ZShvcHRpb24pO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldEFzU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuYXBwZW5kVG9JRCk7XG4gICAgICAgIHZhciBlbGVtZW50SHRtbCA9IGVsZW1lbnQub3V0ZXJIVE1MO1xuICAgICAgICByZXR1cm4gZWxlbWVudEh0bWw7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZWxlY3RFbGVtZW50OyIsImZ1bmN0aW9uIHNhbXBsZUxvYWRlciAodXJsLCBjb250ZXh0LCBjYWxsYmFjaykge1xuICAgIFxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICBcbiAgICAgICAgcmVxdWVzdC5vcGVuKCdnZXQnLCB1cmwsIHRydWUpO1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYocmVxdWVzdC5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgICAgICAgY29udGV4dC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24gKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCdzYW1wbGVMb2FkZXIgcmVxdWVzdCBzdWNjZXNzJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnc2FtcGxlTG9hZGVyIHJlcXVlc3QgZmFpbGVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzYW1wbGVMb2FkZXI7IiwidmFyIFdBQUNsb2NrID0gcmVxdWlyZSgnLi9saWIvV0FBQ2xvY2snKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdBQUNsb2NrXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHdpbmRvdy5XQUFDbG9jayA9IFdBQUNsb2NrXG4iLCJ2YXIgaXNCcm93c2VyID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuXG52YXIgQ0xPQ0tfREVGQVVMVFMgPSB7XG4gIHRvbGVyYW5jZUxhdGU6IDAuMTAsXG4gIHRvbGVyYW5jZUVhcmx5OiAwLjAwMVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBFdmVudCA9PT09PT09PT09PT09PT09PT09PSAvL1xudmFyIEV2ZW50ID0gZnVuY3Rpb24oY2xvY2ssIGRlYWRsaW5lLCBmdW5jKSB7XG4gIHRoaXMuY2xvY2sgPSBjbG9ja1xuICB0aGlzLmZ1bmMgPSBmdW5jXG4gIHRoaXMuX2NsZWFyZWQgPSBmYWxzZSAvLyBGbGFnIHVzZWQgdG8gY2xlYXIgYW4gZXZlbnQgaW5zaWRlIGNhbGxiYWNrXG5cbiAgdGhpcy50b2xlcmFuY2VMYXRlID0gY2xvY2sudG9sZXJhbmNlTGF0ZVxuICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gY2xvY2sudG9sZXJhbmNlRWFybHlcbiAgdGhpcy5fbGF0ZXN0VGltZSA9IG51bGxcbiAgdGhpcy5fZWFybGllc3RUaW1lID0gbnVsbFxuICB0aGlzLmRlYWRsaW5lID0gbnVsbFxuICB0aGlzLnJlcGVhdFRpbWUgPSBudWxsXG5cbiAgdGhpcy5zY2hlZHVsZShkZWFkbGluZSlcbn1cblxuLy8gVW5zY2hlZHVsZXMgdGhlIGV2ZW50XG5FdmVudC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgdGhpcy5fY2xlYXJlZCA9IHRydWVcbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gU2V0cyB0aGUgZXZlbnQgdG8gcmVwZWF0IGV2ZXJ5IGB0aW1lYCBzZWNvbmRzLlxuRXZlbnQucHJvdG90eXBlLnJlcGVhdCA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgaWYgKHRpbWUgPT09IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKCdkZWxheSBjYW5ub3QgYmUgMCcpXG4gIHRoaXMucmVwZWF0VGltZSA9IHRpbWVcbiAgaWYgKCF0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSlcbiAgICB0aGlzLnNjaGVkdWxlKHRoaXMuZGVhZGxpbmUgKyB0aGlzLnJlcGVhdFRpbWUpXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFNldHMgdGhlIHRpbWUgdG9sZXJhbmNlIG9mIHRoZSBldmVudC5cbi8vIFRoZSBldmVudCB3aWxsIGJlIGV4ZWN1dGVkIGluIHRoZSBpbnRlcnZhbCBgW2RlYWRsaW5lIC0gZWFybHksIGRlYWRsaW5lICsgbGF0ZV1gXG4vLyBJZiB0aGUgY2xvY2sgZmFpbHMgdG8gZXhlY3V0ZSB0aGUgZXZlbnQgaW4gdGltZSwgdGhlIGV2ZW50IHdpbGwgYmUgZHJvcHBlZC5cbkV2ZW50LnByb3RvdHlwZS50b2xlcmFuY2UgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZXMubGF0ZSA9PT0gJ251bWJlcicpXG4gICAgdGhpcy50b2xlcmFuY2VMYXRlID0gdmFsdWVzLmxhdGVcbiAgaWYgKHR5cGVvZiB2YWx1ZXMuZWFybHkgPT09ICdudW1iZXInKVxuICAgIHRoaXMudG9sZXJhbmNlRWFybHkgPSB2YWx1ZXMuZWFybHlcbiAgdGhpcy5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzKClcbiAgaWYgKHRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKSB7XG4gICAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgICB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgZXZlbnQgaXMgcmVwZWF0ZWQsIGZhbHNlIG90aGVyd2lzZVxuRXZlbnQucHJvdG90eXBlLmlzUmVwZWF0ZWQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucmVwZWF0VGltZSAhPT0gbnVsbCB9XG5cbi8vIFNjaGVkdWxlcyB0aGUgZXZlbnQgdG8gYmUgcmFuIGJlZm9yZSBgZGVhZGxpbmVgLlxuLy8gSWYgdGhlIHRpbWUgaXMgd2l0aGluIHRoZSBldmVudCB0b2xlcmFuY2UsIHdlIGhhbmRsZSB0aGUgZXZlbnQgaW1tZWRpYXRlbHkuXG4vLyBJZiB0aGUgZXZlbnQgd2FzIGFscmVhZHkgc2NoZWR1bGVkIGF0IGEgZGlmZmVyZW50IHRpbWUsIGl0IGlzIHJlc2NoZWR1bGVkLlxuRXZlbnQucHJvdG90eXBlLnNjaGVkdWxlID0gZnVuY3Rpb24oZGVhZGxpbmUpIHtcbiAgdGhpcy5fY2xlYXJlZCA9IGZhbHNlXG4gIHRoaXMuZGVhZGxpbmUgPSBkZWFkbGluZVxuICB0aGlzLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMoKVxuXG4gIGlmICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPj0gdGhpcy5fZWFybGllc3RUaW1lKSB7XG4gICAgdGhpcy5fZXhlY3V0ZSgpXG4gIFxuICB9IGVsc2UgaWYgKHRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKSB7XG4gICAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgICB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxuICBcbiAgfSBlbHNlIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG59XG5cbkV2ZW50LnByb3RvdHlwZS50aW1lU3RyZXRjaCA9IGZ1bmN0aW9uKHRSZWYsIHJhdGlvKSB7XG4gIGlmICh0aGlzLmlzUmVwZWF0ZWQoKSlcbiAgICB0aGlzLnJlcGVhdFRpbWUgPSB0aGlzLnJlcGVhdFRpbWUgKiByYXRpb1xuXG4gIHZhciBkZWFkbGluZSA9IHRSZWYgKyByYXRpbyAqICh0aGlzLmRlYWRsaW5lIC0gdFJlZilcbiAgLy8gSWYgdGhlIGRlYWRsaW5lIGlzIHRvbyBjbG9zZSBvciBwYXN0LCBhbmQgdGhlIGV2ZW50IGhhcyBhIHJlcGVhdCxcbiAgLy8gd2UgY2FsY3VsYXRlIHRoZSBuZXh0IHJlcGVhdCBwb3NzaWJsZSBpbiB0aGUgc3RyZXRjaGVkIHNwYWNlLlxuICBpZiAodGhpcy5pc1JlcGVhdGVkKCkpIHtcbiAgICB3aGlsZSAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lID49IGRlYWRsaW5lIC0gdGhpcy50b2xlcmFuY2VFYXJseSlcbiAgICAgIGRlYWRsaW5lICs9IHRoaXMucmVwZWF0VGltZVxuICB9XG4gIHRoaXMuc2NoZWR1bGUoZGVhZGxpbmUpXG59XG5cbi8vIEV4ZWN1dGVzIHRoZSBldmVudFxuRXZlbnQucHJvdG90eXBlLl9leGVjdXRlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmNsb2NrLl9zdGFydGVkID09PSBmYWxzZSkgcmV0dXJuXG4gIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG5cbiAgaWYgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA8IHRoaXMuX2xhdGVzdFRpbWUpXG4gICAgdGhpcy5mdW5jKHRoaXMpXG4gIGVsc2Uge1xuICAgIGlmICh0aGlzLm9uZXhwaXJlZCkgdGhpcy5vbmV4cGlyZWQodGhpcylcbiAgICBjb25zb2xlLndhcm4oJ2V2ZW50IGV4cGlyZWQnKVxuICB9XG4gIC8vIEluIHRoZSBjYXNlIGBzY2hlZHVsZWAgaXMgY2FsbGVkIGluc2lkZSBgZnVuY2AsIHdlIG5lZWQgdG8gYXZvaWRcbiAgLy8gb3ZlcnJ3cml0aW5nIHdpdGggeWV0IGFub3RoZXIgYHNjaGVkdWxlYC5cbiAgaWYgKCF0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSAmJiB0aGlzLmlzUmVwZWF0ZWQoKSAmJiAhdGhpcy5fY2xlYXJlZClcbiAgICB0aGlzLnNjaGVkdWxlKHRoaXMuZGVhZGxpbmUgKyB0aGlzLnJlcGVhdFRpbWUpIFxufVxuXG4vLyBVcGRhdGVzIGNhY2hlZCB0aW1lc1xuRXZlbnQucHJvdG90eXBlLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fbGF0ZXN0VGltZSA9IHRoaXMuZGVhZGxpbmUgKyB0aGlzLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy5fZWFybGllc3RUaW1lID0gdGhpcy5kZWFkbGluZSAtIHRoaXMudG9sZXJhbmNlRWFybHlcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT0gV0FBQ2xvY2sgPT09PT09PT09PT09PT09PT09PT0gLy9cbnZhciBXQUFDbG9jayA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGV4dCwgb3B0cykge1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgb3B0cyA9IG9wdHMgfHwge31cbiAgdGhpcy50aWNrTWV0aG9kID0gb3B0cy50aWNrTWV0aG9kIHx8ICdTY3JpcHRQcm9jZXNzb3JOb2RlJ1xuICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gb3B0cy50b2xlcmFuY2VFYXJseSB8fCBDTE9DS19ERUZBVUxUUy50b2xlcmFuY2VFYXJseVxuICB0aGlzLnRvbGVyYW5jZUxhdGUgPSBvcHRzLnRvbGVyYW5jZUxhdGUgfHwgQ0xPQ0tfREVGQVVMVFMudG9sZXJhbmNlTGF0ZVxuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0XG4gIHRoaXMuX2V2ZW50cyA9IFtdXG4gIHRoaXMuX3N0YXJ0ZWQgPSBmYWxzZVxufVxuXG4vLyAtLS0tLS0tLS0tIFB1YmxpYyBBUEkgLS0tLS0tLS0tLSAvL1xuLy8gU2NoZWR1bGVzIGBmdW5jYCB0byBydW4gYWZ0ZXIgYGRlbGF5YCBzZWNvbmRzLlxuV0FBQ2xvY2sucHJvdG90eXBlLnNldFRpbWVvdXQgPSBmdW5jdGlvbihmdW5jLCBkZWxheSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRXZlbnQoZnVuYywgdGhpcy5fYWJzVGltZShkZWxheSkpXG59XG5cbi8vIFNjaGVkdWxlcyBgZnVuY2AgdG8gcnVuIGJlZm9yZSBgZGVhZGxpbmVgLlxuV0FBQ2xvY2sucHJvdG90eXBlLmNhbGxiYWNrQXRUaW1lID0gZnVuY3Rpb24oZnVuYywgZGVhZGxpbmUpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUV2ZW50KGZ1bmMsIGRlYWRsaW5lKVxufVxuXG4vLyBTdHJldGNoZXMgYGRlYWRsaW5lYCBhbmQgYHJlcGVhdGAgb2YgYWxsIHNjaGVkdWxlZCBgZXZlbnRzYCBieSBgcmF0aW9gLCBrZWVwaW5nXG4vLyB0aGVpciByZWxhdGl2ZSBkaXN0YW5jZSB0byBgdFJlZmAuIEluIGZhY3QgdGhpcyBpcyBlcXVpdmFsZW50IHRvIGNoYW5naW5nIHRoZSB0ZW1wby5cbldBQUNsb2NrLnByb3RvdHlwZS50aW1lU3RyZXRjaCA9IGZ1bmN0aW9uKHRSZWYsIGV2ZW50cywgcmF0aW8pIHtcbiAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHsgZXZlbnQudGltZVN0cmV0Y2godFJlZiwgcmF0aW8pIH0pXG4gIHJldHVybiBldmVudHNcbn1cblxuLy8gUmVtb3ZlcyBhbGwgc2NoZWR1bGVkIGV2ZW50cyBhbmQgc3RhcnRzIHRoZSBjbG9jayBcbldBQUNsb2NrLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fc3RhcnRlZCA9PT0gZmFsc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB0aGlzLl9zdGFydGVkID0gdHJ1ZVxuICAgIHRoaXMuX2V2ZW50cyA9IFtdXG5cbiAgICBpZiAodGhpcy50aWNrTWV0aG9kID09PSAnU2NyaXB0UHJvY2Vzc29yTm9kZScpIHtcbiAgICAgIHZhciBidWZmZXJTaXplID0gMjU2XG4gICAgICAvLyBXZSBoYXZlIHRvIGtlZXAgYSByZWZlcmVuY2UgdG8gdGhlIG5vZGUgdG8gYXZvaWQgZ2FyYmFnZSBjb2xsZWN0aW9uXG4gICAgICB0aGlzLl9jbG9ja05vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIDEsIDEpXG4gICAgICB0aGlzLl9jbG9ja05vZGUuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pXG4gICAgICB0aGlzLl9jbG9ja05vZGUub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7IHNlbGYuX3RpY2soKSB9KVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy50aWNrTWV0aG9kID09PSAnbWFudWFsJykgbnVsbCAvLyBfdGljayBpcyBjYWxsZWQgbWFudWFsbHlcblxuICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIHRpY2tNZXRob2QgJyArIHRoaXMudGlja01ldGhvZClcbiAgfVxufVxuXG4vLyBTdG9wcyB0aGUgY2xvY2tcbldBQUNsb2NrLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9zdGFydGVkID09PSB0cnVlKSB7XG4gICAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlXG4gICAgdGhpcy5fY2xvY2tOb2RlLmRpc2Nvbm5lY3QoKVxuICB9ICBcbn1cblxuLy8gLS0tLS0tLS0tLSBQcml2YXRlIC0tLS0tLS0tLS0gLy9cblxuLy8gVGhpcyBmdW5jdGlvbiBpcyByYW4gcGVyaW9kaWNhbGx5LCBhbmQgYXQgZWFjaCB0aWNrIGl0IGV4ZWN1dGVzXG4vLyBldmVudHMgZm9yIHdoaWNoIGBjdXJyZW50VGltZWAgaXMgaW5jbHVkZWQgaW4gdGhlaXIgdG9sZXJhbmNlIGludGVydmFsLlxuV0FBQ2xvY2sucHJvdG90eXBlLl90aWNrID0gZnVuY3Rpb24oKSB7XG4gIHZhciBldmVudCA9IHRoaXMuX2V2ZW50cy5zaGlmdCgpXG5cbiAgd2hpbGUoZXZlbnQgJiYgZXZlbnQuX2VhcmxpZXN0VGltZSA8PSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUpIHtcbiAgICBldmVudC5fZXhlY3V0ZSgpXG4gICAgZXZlbnQgPSB0aGlzLl9ldmVudHMuc2hpZnQoKVxuICB9XG5cbiAgLy8gUHV0IGJhY2sgdGhlIGxhc3QgZXZlbnRcbiAgaWYoZXZlbnQpIHRoaXMuX2V2ZW50cy51bnNoaWZ0KGV2ZW50KVxufVxuXG4vLyBDcmVhdGVzIGFuIGV2ZW50IGFuZCBpbnNlcnQgaXQgdG8gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5fY3JlYXRlRXZlbnQgPSBmdW5jdGlvbihmdW5jLCBkZWFkbGluZSkge1xuICByZXR1cm4gbmV3IEV2ZW50KHRoaXMsIGRlYWRsaW5lLCBmdW5jKVxufVxuXG4vLyBJbnNlcnRzIGFuIGV2ZW50IHRvIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX2luc2VydEV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdGhpcy5fZXZlbnRzLnNwbGljZSh0aGlzLl9pbmRleEJ5VGltZShldmVudC5fZWFybGllc3RUaW1lKSwgMCwgZXZlbnQpXG59XG5cbi8vIFJlbW92ZXMgYW4gZXZlbnQgZnJvbSB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9yZW1vdmVFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBpbmQgPSB0aGlzLl9ldmVudHMuaW5kZXhPZihldmVudClcbiAgaWYgKGluZCAhPT0gLTEpIHRoaXMuX2V2ZW50cy5zcGxpY2UoaW5kLCAxKVxufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgYGV2ZW50YCBpcyBpbiBxdWV1ZSwgZmFsc2Ugb3RoZXJ3aXNlXG5XQUFDbG9jay5wcm90b3R5cGUuX2hhc0V2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiByZXR1cm4gdGhpcy5fZXZlbnRzLmluZGV4T2YoZXZlbnQpICE9PSAtMVxufVxuXG4vLyBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgZmlyc3QgZXZlbnQgd2hvc2UgZGVhZGxpbmUgaXMgPj0gdG8gYGRlYWRsaW5lYFxuV0FBQ2xvY2sucHJvdG90eXBlLl9pbmRleEJ5VGltZSA9IGZ1bmN0aW9uKGRlYWRsaW5lKSB7XG4gIC8vIHBlcmZvcm1zIGEgYmluYXJ5IHNlYXJjaFxuICB2YXIgbG93ID0gMFxuICAgICwgaGlnaCA9IHRoaXMuX2V2ZW50cy5sZW5ndGhcbiAgICAsIG1pZFxuICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgIG1pZCA9IE1hdGguZmxvb3IoKGxvdyArIGhpZ2gpIC8gMilcbiAgICBpZiAodGhpcy5fZXZlbnRzW21pZF0uX2VhcmxpZXN0VGltZSA8IGRlYWRsaW5lKVxuICAgICAgbG93ID0gbWlkICsgMVxuICAgIGVsc2UgaGlnaCA9IG1pZFxuICB9XG4gIHJldHVybiBsb3dcbn1cblxuLy8gQ29udmVydHMgZnJvbSByZWxhdGl2ZSB0aW1lIHRvIGFic29sdXRlIHRpbWVcbldBQUNsb2NrLnByb3RvdHlwZS5fYWJzVGltZSA9IGZ1bmN0aW9uKHJlbFRpbWUpIHtcbiAgcmV0dXJuIHJlbFRpbWUgKyB0aGlzLmNvbnRleHQuY3VycmVudFRpbWVcbn1cblxuLy8gQ29udmVydHMgZnJvbSBhYnNvbHV0ZSB0aW1lIHRvIHJlbGF0aXZlIHRpbWUgXG5XQUFDbG9jay5wcm90b3R5cGUuX3JlbFRpbWUgPSBmdW5jdGlvbihhYnNUaW1lKSB7XG4gIHJldHVybiBhYnNUaW1lIC0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lXG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIFwiYmVhdFwiOiBbXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjExXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiOVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiNlwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiN1wiLFxuICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxM1wiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjE1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIyXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI0XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI1XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI2XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI3XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI4XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCI5XCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE1XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNVwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTVcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjBcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjFcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjNcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjRcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjZcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjdcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjhcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjlcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEwXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxMVwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTJcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH0sXG4gICAge1xuICAgICAgXCJyb3dJZFwiOiBcIjE2XCIsXG4gICAgICBcImNlbGxJZFwiOiBcIjEzXCIsXG4gICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICB9LFxuICAgIHtcbiAgICAgIFwicm93SWRcIjogXCIxNlwiLFxuICAgICAgXCJjZWxsSWRcIjogXCIxNFwiLFxuICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgfSxcbiAgICB7XG4gICAgICBcInJvd0lkXCI6IFwiMTZcIixcbiAgICAgIFwiY2VsbElkXCI6IFwiMTVcIixcbiAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgIH1cbiAgXSxcbiAgXCJzZXR0aW5nc1wiOiB7XG4gICAgXCJzYW1wbGVTZXRcIjogXCJodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vb3JhbWljcy9zYW1wbGVkL21hc3Rlci9ETS9DUi03OC9zYW1wbGVkLmluc3RydW1lbnQuanNvblwiLFxuICAgIFwiYnBtXCI6IDQ2MCxcbiAgICBcImluaXRHYWluXCI6IDAuNSxcbiAgICBcIm1heEdhaW5cIjogMC42LFxuICAgIFwiYXR0YWNrVGltZVwiOiAwLjI3LFxuICAgIFwic3VzdGFpblRpbWVcIjogMS44LFxuICAgIFwicmVsZWFzZVRpbWVcIjogMixcbiAgICBcImRldHVuZVwiOiAxMjAwLFxuICAgIFwiZGVsYXlFbmFibGVkXCI6IFwidHJ1ZVwiLFxuICAgIFwiZGVsYXlcIjogMC4wNSxcbiAgICBcImZpbHRlclwiOiAyNTk5LjZcbiAgfVxufTtcbiIsImNvbnN0IGdldENvbnRyb2xWYWx1ZXMgPSByZXF1aXJlKCcuL2dldC10cmFja2VyLWNvbnRyb2xzJyk7XG5cblxuZnVuY3Rpb24gZ2V0QXVkaW9PcHRpb25zKCkge1xuICAgIHRoaXMub3B0aW9ucyA9IGdldENvbnRyb2xWYWx1ZXMoKTtcbiAgICB0aGlzLmdldE9wdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBnZXRDb250cm9sVmFsdWVzKCk7XG4gICAgfTtcbiAgICB0aGlzLnNldE9wdGlvbnMgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgICAgIGlmICghdmFsdWVzKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSBnZXRDb250cm9sVmFsdWVzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0gdmFsdWVzO1xuICAgIH07ICBcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRBdWRpb09wdGlvbnM7XG4iLCJjb25zdCBnZXRTZXRGb3JtVmFsdWVzID0gcmVxdWlyZSgnZ2V0LXNldC1mb3JtLXZhbHVlcycpO1xuXG4vKipcbiAqIEdldCBhbGwgdHJhY2tlciB2YWx1ZXMgZnJvbSBIVE1MXG4gKiBAcmV0dXJucyB7b2JqZWN0fVxuICovXG5mdW5jdGlvbiBnZXRUcmFja2VyQ29udHJvbHMoKSB7XG4gICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG4gICAgbGV0IHZhbHVlcyA9IGZvcm1WYWx1ZXMuZ2V0KGZvcm0pO1xuICAgIFxuICAgIGxldCByZXQgPSB7fTtcbiAgICBmb3IgKGxldCBrZXkgaW4gdmFsdWVzKSB7XG4gICAgICAgIFxuICAgICAgICBpZiAoa2V5ID09PSAnZGVsYXlFbmFibGVkJykge1xuICAgICAgICAgICAgcmV0W2tleV0gPSAndHJ1ZSc7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGtleSA9PT0gJ3NhbXBsZVNldCcpIHsgXG4gICAgICAgICAgICByZXRba2V5XSA9IHZhbHVlc1trZXldO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0W2tleV0gPSBwYXJzZUZsb2F0KHZhbHVlc1trZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRUcmFja2VyQ29udHJvbHM7XG4iLCIvLyByZXF1aXJlKFwiYmFiZWwtcG9seWZpbGxcIik7IFxuY29uc3QgbG9hZFNhbXBsZVNldCA9IHJlcXVpcmUoJ2xvYWQtc2FtcGxlLXNldCcpO1xuY29uc3Qgc2VsZWN0RWxlbWVudCA9IHJlcXVpcmUoJ3NlbGVjdC1lbGVtZW50Jyk7XG5jb25zdCBnZXRTZXRGb3JtVmFsdWVzID0gcmVxdWlyZSgnZ2V0LXNldC1mb3JtLXZhbHVlcycpO1xuY29uc3QgYWRzckdhaW5Ob2RlID0gcmVxdWlyZSgnYWRzci1nYWluLW5vZGUnKTtcbmNvbnN0IGdldEh0bWxSb3dzQ2VsbHMgPSByZXF1aXJlKCdnZXQtaHRtbC1yb3dzLWNlbGxzJyk7XG5jb25zdCBnZXRDb250cm9sVmFsdWVzID0gcmVxdWlyZSgnLi9nZXQtdHJhY2tlci1jb250cm9scycpO1xuY29uc3QgZ2V0QXVkaW9PcHRpb25zID0gcmVxdWlyZSgnLi9nZXQtc2V0LWNvbnRyb2xzJyk7XG5jb25zdCBzY2hlZHVsZU1lYXN1cmUgPSByZXF1aXJlKCcuL3NjaGVkdWxlLW1lYXN1cmUnKTtcbmNvbnN0IGF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRBdWRpb09wdGlvbnMoKTtcbmNvbnN0IGN0eCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbmNvbnN0IGRlZmF1bHRUcmFjayA9IHJlcXVpcmUoJy4vZGVmYXVsdC10cmFjaycpO1xuXG52YXIgbWVhc3VyZUxlbmd0aCA9IDE2O1xudmFyIGRhdGFVcmwgPSBcImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9vcmFtaWNzL3NhbXBsZWQvbWFzdGVyL0RNL0NSLTc4L3NhbXBsZWQuaW5zdHJ1bWVudC5qc29uXCI7XG52YXIgYnVmZmVycztcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIGRhdGFVcmwsIHRyYWNrKSB7XG4gICAgXG4gICAgbG9hZFNhbXBsZVNldChjdHgsIGRhdGFVcmwsIGZ1bmN0aW9uIChzYW1wbGVEYXRhLCBzYW1wbGVCdWZmZXJzKSB7XG4gICAgICAgIGJ1ZmZlcnMgPSBzYW1wbGVCdWZmZXJzO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0cmFjaykge1xuICAgICAgICAgICAgdHJhY2sgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgIH0gXG4gICAgICAgIHNldHVwVHJhY2tlckh0bWwoc2FtcGxlRGF0YSk7ICAgIFxuICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjaylcbiAgICAgICAgc2V0dXBFdmVudHMoKTtcbiAgICB9KTtcbn1cblxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIGxldCBmb3JtVmFsdWVzID0gbmV3IGdldFNldEZvcm1WYWx1ZXMoKTtcbiAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuXG4gICAgZm9ybVZhbHVlcy5zZXQoZm9ybSwgZGVmYXVsdFRyYWNrLnNldHRpbmdzKTtcbiAgICBhdWRpb09wdGlvbnMuc2V0T3B0aW9ucyhkZWZhdWx0VHJhY2suc2V0dGluZ3MpO1xuICAgIFxuICAgIC8vIHZhciBkZWZhdWx0QmVhdCA9IFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgIC8vICAgICAgIFt7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIwXCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjBcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMFwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjFcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMVwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMlwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIyXCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjJcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIzXCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjNcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiM1wiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNFwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI0XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjRcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI1XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjVcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNVwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiNlwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjZcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI2XCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjdcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiN1wiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI3XCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI4XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjhcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOFwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjlcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCI5XCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiOVwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTBcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTBcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTBcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEwXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiB0cnVlfSwge1wicm93SWRcIjogXCIxMFwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTBcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogdHJ1ZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjEyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTFcIiwgXCJjZWxsSWRcIjogXCIxM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjExXCIsIFwiY2VsbElkXCI6IFwiMTRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMVwiLCBcImNlbGxJZFwiOiBcIjE1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIyXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI1XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI2XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI3XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI4XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCI5XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEyXCIsIFwiY2VsbElkXCI6IFwiMTFcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjEyXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxMlwiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTJcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEyXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjZcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjdcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjhcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjlcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjEwXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTNcIiwgXCJjZWxsSWRcIjogXCIxMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMTJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxM1wiLCBcImNlbGxJZFwiOiBcIjEzXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTNcIiwgXCJjZWxsSWRcIjogXCIxNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjEzXCIsIFwiY2VsbElkXCI6IFwiMTVcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjFcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjJcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjRcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjVcIiwgXCJlbmFibGVkXCI6IHRydWV9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE0XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNFwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTRcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiM1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiNFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiNlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiN1wiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiOFwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiOVwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMTBcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNVwiLCBcImNlbGxJZFwiOiBcIjExXCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIxMlwiLCBcImVuYWJsZWRcIjogZmFsc2V9LCB7XCJyb3dJZFwiOiBcIjE1XCIsIFwiY2VsbElkXCI6IFwiMTNcIiwgXCJlbmFibGVkXCI6IGZhbHNlfSwge1wicm93SWRcIjogXCIxNVwiLCBcImNlbGxJZFwiOiBcIjE0XCIsIFwiZW5hYmxlZFwiOiBmYWxzZX0sIHtcInJvd0lkXCI6IFwiMTVcIiwgXCJjZWxsSWRcIjogXCIxNVwiLCBcImVuYWJsZWRcIjogZmFsc2V9XVxuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkZWZhdWx0VHJhY2suc2V0dGluZ3Muc2FtcGxlU2V0LCBkZWZhdWx0VHJhY2suYmVhdCk7XG4gICAgc2V0dXBCYXNlRXZlbnRzKCk7XG4gICAgdmFyIHN0b3JhZ2UgPSBuZXcgdHJhY2tzTG9jYWxTdG9yYWdlKCk7XG4gICAgc3RvcmFnZS5zZXR1cFN0b3JhZ2UoKTtcbn07XG5cbnZhciBpbnN0cnVtZW50RGF0YSA9IHt9O1xuZnVuY3Rpb24gc2V0dXBUcmFja2VySHRtbChkYXRhKSB7XG4gICAgaW5zdHJ1bWVudERhdGEgPSBkYXRhO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlclwiKS5pbm5lckhUTUwgPSAnJztcbiAgICB2YXIgc3RyID0gZ2V0SHRtbFJvd3NDZWxscyhkYXRhLmZpbGVuYW1lLmxlbmd0aCwgbWVhc3VyZUxlbmd0aCwgJ3RyJywgJ3RkJyk7XG4gICAgdmFyIHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndHJhY2tlcicpO1xuICAgIHQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdhZnRlcmJlZ2luJywgc3RyKTtcbiAgICBcbn1cblxuZnVuY3Rpb24gZGlzY29ubmVjdE5vZGUobm9kZSwgb3B0aW9ucykge1xuICAgIGxldCB0b3RhbExlbmd0aCA9XG4gICAgICAgICAgICBvcHRpb25zLmF0dGFja1RpbWUgKyBvcHRpb25zLnN1c3RhaW5UaW1lICsgb3B0aW9ucy5yZWxlYXNlVGltZTtcblxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBub2RlLmRpc2Nvbm5lY3QoKTtcbiAgICB9LCB0b3RhbExlbmd0aCAqIDEwMDApO1xufVxuXG5mdW5jdGlvbiBzY2hlZHVsZUF1ZGlvQmVhdChiZWF0LCB0cmlnZ2VyVGltZSkge1xuICAgIFxuICAgIGxldCBpbnN0cnVtZW50TmFtZSA9IGluc3RydW1lbnREYXRhLmZpbGVuYW1lW2JlYXQucm93SWRdO1xuICAgIGxldCBpbnN0cnVtZW50ID0gYnVmZmVyc1tpbnN0cnVtZW50TmFtZV0uZ2V0KCk7XG5cbiAgICBmdW5jdGlvbiBjb25uZWN0RGVsYXkoaW5zdHJ1bWVudCkge1xuXG4gICAgICAgIC8vIFdpdGggc3VzdGFpbiBhbmQgZmVlZGJhY2sgZmlsdGVyXG4gICAgICAgIGxldCBkZWxheSA9IGN0eC5jcmVhdGVEZWxheSgpO1xuICAgICAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBhdWRpb09wdGlvbnMub3B0aW9ucy5kZWxheTtcblxuICAgICAgICBsZXQgZ2FpbiA9IG5ldyBhZHNyR2Fpbk5vZGUoY3R4KTtcbiAgICAgICAgZ2Fpbi5zZXRPcHRpb25zKGF1ZGlvT3B0aW9ucy5nZXRPcHRpb25zKCkpO1xuICAgICAgICBsZXQgZmVlZGJhY2tHYWluID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG5cblxuICAgICAgICBsZXQgZmlsdGVyID0gY3R4LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICBmaWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gYXVkaW9PcHRpb25zLm9wdGlvbnMuZmlsdGVyO1xuXG4gICAgICAgIC8vIGRlbGF5IC0+IGZlZWRiYWNrXG4gICAgICAgIGRlbGF5LmNvbm5lY3QoZmVlZGJhY2tHYWluKTtcbiAgICAgICAgZGlzY29ubmVjdE5vZGUoZGVsYXksIGF1ZGlvT3B0aW9ucy5nZXRPcHRpb25zKCkpO1xuXG4gICAgICAgIC8vIGZlZWRiYWNrIC0+IGZpbHRlclxuICAgICAgICBmZWVkYmFja0dhaW4uY29ubmVjdChmaWx0ZXIpO1xuXG4gICAgICAgIC8vIGZpbHRlciAtPmRlbGF5XG4gICAgICAgIGZpbHRlci5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICBpbnN0cnVtZW50LmRldHVuZS52YWx1ZSA9IGF1ZGlvT3B0aW9ucy5vcHRpb25zLmRldHVuZTtcblxuICAgICAgICAvLyBkZWxheSAtPiBpbnN0cnVtZW50XG4gICAgICAgIGluc3RydW1lbnQuY29ubmVjdChkZWxheSk7XG5cbiAgICAgICAgLy8gSW5zdHJ1bWVudCAtPlxuICAgICAgICBpbnN0cnVtZW50LmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICAvLyBEZWxheSAtPlxuICAgICAgICBkZWxheS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgaW5zdHJ1bWVudC5zdGFydCh0cmlnZ2VyVGltZSlcbiAgICAgICAgXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29ubmVjdENsZWFuKGluc3RydW1lbnQpIHtcbiAgICAgICAgLy8gVHJpZ2dlciB0b25lXG4gICAgICAgIGxldCBnYWluID0gbmV3IGFkc3JHYWluTm9kZShjdHgpO1xuICAgICAgICBnYWluLnNldE9wdGlvbnMoYXVkaW9PcHRpb25zLmdldE9wdGlvbnMoKSk7XG4gICAgICAgIGxldCBnYWluTm9kZSA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuXG4gICAgICAgIGluc3RydW1lbnQuZGV0dW5lLnZhbHVlID0gYXVkaW9PcHRpb25zLm9wdGlvbnMuZGV0dW5lO1xuICAgICAgICAvLyBpbnN0cnVtZW50IC0+IGdhaW5cbiAgICAgICAgXG4gICAgICAgIGluc3RydW1lbnQuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICAgIGdhaW5Ob2RlLmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxuICAgICAgICBpbnN0cnVtZW50LnN0YXJ0KHRyaWdnZXJUaW1lKTtcbiAgICB9XG5cbiAgICBpZiAoYXVkaW9PcHRpb25zLm9wdGlvbnMuZGVsYXlFbmFibGVkKSB7XG4gICAgICAgIGNvbm5lY3REZWxheShpbnN0cnVtZW50KVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbm5lY3RDbGVhbihpbnN0cnVtZW50KTtcbiAgICB9XG59XG5cbnZhciBzY2hlZHVsZSA9IG5ldyBzY2hlZHVsZU1lYXN1cmUoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCk7XG5cbmZ1bmN0aW9uIHNldHVwQmFzZUV2ZW50cyAoKSB7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXknKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgc2NoZWR1bGUucnVuU2NoZWR1bGUoYXVkaW9PcHRpb25zLm9wdGlvbnMuYnBtKTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYXVzZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpOyBcbiAgICB9KTtcbiAgICBcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RvcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICBzY2hlZHVsZSA9IG5ldyBzY2hlZHVsZU1lYXN1cmUoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCk7XG4gICAgfSk7XG4gICAgXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JwbScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGF1ZGlvT3B0aW9ucy5zZXRPcHRpb25zKCk7XG4gICAgICAgIGlmIChzY2hlZHVsZS5ydW5uaW5nKSB7XG4gICAgICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgICAgICBzY2hlZHVsZS5ydW5TY2hlZHVsZShhdWRpb09wdGlvbnMub3B0aW9ucy5icG0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgXG4gICAgJCgnLmJhc2UnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBhdWRpb09wdGlvbnMuc2V0T3B0aW9ucygpO1xuICAgIH0pO1xufVxuICAgIFxuZnVuY3Rpb24gc2V0dXBFdmVudHMoKSB7XG4gICAgXG4gICAgJCgnLmNlbGwnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5kYXRhc2V0KTtcbiAgICAgICAgdmFsLmVuYWJsZWQgPSAkKHRoaXMpLmhhc0NsYXNzKFwiZW5hYmxlZFwiKTtcblxuICAgICAgICBsZXQgY3VycmVudEJlYXQgPSAkKCcuY3VycmVudCcpLmRhdGEoJ2NlbGwtaWQnKTtcbiAgICAgICAgaWYgKHZhbC5jZWxsSWQgPiBjdXJyZW50QmVhdCkge1xuICAgICAgICAgICAgc2NoZWR1bGUuc2NoZWR1bGVBdWRpb0JlYXROb3codmFsKTtcbiAgICAgICAgfVxuXG4gICAgICAgICQodGhpcykudG9nZ2xlQ2xhc3MoJ2VuYWJsZWQnKTtcbiAgICB9KTtcbn1cblxuJCgnI3NhbXBsZVNldCcpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIHRoaXMudmFsdWUpO1xufSk7XG5cblxuXG5mdW5jdGlvbiB0cmFja3NMb2NhbFN0b3JhZ2UgKCkge1xuXG4gICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UgPSBmdW5jdGlvbih1cGRhdGUpIHtcbiAgICAgICAgdmFyIHN0b3JhZ2UgPSB7fTtcbiAgICAgICAgc3RvcmFnZVsnU2VsZWN0J10gPSAnU2VsZWN0JztcblxuXG4gICAgICAgIGZvciAoIHZhciBpID0gMCwgbGVuID0gbG9jYWxTdG9yYWdlLmxlbmd0aDsgaSA8IGxlbjsgKytpICkge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSBsb2NhbFN0b3JhZ2Uua2V5KGkpO1xuICAgICAgICAgICAgc3RvcmFnZVtpdGVtXSA9IGl0ZW07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgc2VsZWN0IGVsZW1lbnRcbiAgICAgICAgdmFyIHMgPSBuZXcgc2VsZWN0RWxlbWVudChcbiAgICAgICAgICAgICdsb2FkLXN0b3JhZ2UnLCAvLyBpZCB0byBhcHBlbmQgdGhlIHNlbGVjdCBsaXN0IHRvXG4gICAgICAgICAgICAnYmVhdC1saXN0JywgLy8gaWQgb2YgdGhlIHNlbGVjdCBsaXN0XG4gICAgICAgICAgICBzdG9yYWdlIC8vXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKHVwZGF0ZSkge1xuICAgICAgICAgICAgcy51cGRhdGUoJ2JlYXQtbGlzdCcsIHN0b3JhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcy5jcmVhdGUoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnNldHVwU3RvcmFnZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBsZXQgZm9ybURhdGEgPSBnZXRDb250cm9sVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSAkKCcjZmlsZW5hbWUnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghZmlsZW5hbWUpIHtcbiAgICAgICAgICAgICAgICBmaWxlbmFtZSA9ICd1bnRpdGxlZCc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBiZWF0ID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICAgICAgbGV0IHNvbmcgPSB7XCJiZWF0XCI6IGJlYXQsIFwic2V0dGluZ3NcIjogZm9ybURhdGF9XG5cbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGZpbGVuYW1lLCBKU09OLnN0cmluZ2lmeShzb25nKSk7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBhbGVydCgnVHJhY2sgc2F2ZWQnKTsgfSwgMSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiZWF0LWxpc3QnKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSAkKCcjYmVhdC1saXN0JykudmFsKCk7XG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gJ1NlbGVjdCcpIHsgICAgXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gaXRlbTtcbiAgICAgICAgICAgIGxldCB0cmFjayA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oaXRlbSkpO1xuICAgICAgICAgICAgY29uc29sZS5sb2codHJhY2spXG4gICAgICAgICAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuXG4gICAgICAgICAgICBmb3JtVmFsdWVzLnNldChmb3JtLCB0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBhdWRpb09wdGlvbnMuc2V0T3B0aW9ucyh0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG5cbiAgICAgICAgICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0cmFjay5zZXR0aW5ncy5zYW1wbGVTZXQsIHRyYWNrLmJlYXQpO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkZWxldGUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiZWF0LWxpc3QnKTtcbiAgICAgICAgICAgIGxldCB0b0RlbGV0ZSA9IGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnRleHQ7XG5cbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRvRGVsZXRlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gJyc7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG5cbiAgICAgICAgfSk7XG4gICAgfTtcbiB9XG4gIiwiY29uc3QgV0FBQ2xvY2sgPSByZXF1aXJlKCd3YWFjbG9jaycpO1xuY29uc3QgZ2V0QXVkaW9PcHRpb25zID0gcmVxdWlyZSgnLi9nZXQtc2V0LWNvbnRyb2xzJyk7XG5jb25zdCBhdWRpb09wdGlvbnMgPSBuZXcgZ2V0QXVkaW9PcHRpb25zKCk7XG5cbnZhciBtZWFzdXJlTGVuZ3RoID0gMTY7XG5cbmZ1bmN0aW9uIHNjaGVkdWxlTWVhc3VyZShjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KSB7XG4gICAgXG4gICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdCA9IHNjaGVkdWxlQXVkaW9CZWF0O1xuICAgIHRoaXMuc2NoZWR1bGVGb3J3YXJkID0gMC4xO1xuICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgdGhpcy5ldmVudE1hcCA9IHt9O1xuICAgIHRoaXMuY2xvY2sgPSBuZXcgV0FBQ2xvY2soY3R4KTtcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XG4gICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG5cbiAgICB0aGlzLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudCsrO1xuICAgICAgICBpZiAodGhpcy5jdXJyZW50ID49IG1lYXN1cmVMZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMubWlsbGlQZXJCZWF0ID0gZnVuY3Rpb24gKGJlYXRzKSB7XG4gICAgICAgIGlmICghYmVhdHMpIHtcbiAgICAgICAgICAgIGJlYXRzID0gNjA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDEwMDAgKiA2MCAvIGJlYXRzO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFRyYWNrZXJSb3dWYWx1ZXMgPSBmdW5jdGlvbiAoY2VsbElkKSB7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLWNlbGwtaWQ9XCIke2NlbGxJZH1cIl1gO1xuXG4gICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICBlbGVtcy5mb3JFYWNoKChlbCkgPT4ge1xuICAgICAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIGVsLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2VuYWJsZWQnKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG4gICAgXG5cbiAgICB0aGlzLnNjaGVkdWxlID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIGxldCBiZWF0cyA9IHRoaXMuZ2V0VHJhY2tlclJvd1ZhbHVlcyh0aGlzLmN1cnJlbnQpO1xuICAgICAgICBsZXQgbm93ID0gY3R4LmN1cnJlbnRUaW1lO1xuXG4gICAgICAgIGxldCBzZWxlY3RvciA9IGBbZGF0YS1jZWxsLWlkPVwiJHt0aGlzLmN1cnJlbnR9XCJdYDtcblxuICAgICAgICBsZXQgZXZlbnQgPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgICQoc2VsZWN0b3IpLmFkZENsYXNzKCdjdXJyZW50Jyk7XG4gICAgICAgIH0sIG5vdyArIHRoaXMuc2NoZWR1bGVGb3J3YXJkKTtcblxuICAgICAgICB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgICQoc2VsZWN0b3IpLnJlbW92ZUNsYXNzKCdjdXJyZW50Jyk7XG4gICAgICAgIH0sIG5vdyArIHRoaXMuc2NoZWR1bGVGb3J3YXJkICsgdGhpcy5taWxsaVBlckJlYXQodGhpcy5icG0pIC8gMTAwMCk7XG5cbiAgICAgICAgYmVhdHMuZm9yRWFjaCgoYmVhdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUJlYXQoYmVhdCwgbm93KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuc2NoZWR1bGVCZWF0ID0gZnVuY3Rpb24gKGJlYXQsIG5vdykge1xuXG4gICAgICAgIGxldCB0cmlnZ2VyVGltZSA9IG5vdyArIHRoaXMuc2NoZWR1bGVGb3J3YXJkO1xuICAgICAgICB0aGlzLnNjaGVkdWxlTWFwW2JlYXQuY2VsbElkXSA9IHRyaWdnZXJUaW1lO1xuICAgICAgICBpZiAoYmVhdC5lbmFibGVkKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdChiZWF0LCB0cmlnZ2VyVGltZSk7XG4gICAgICAgICAgICB9LCBub3cpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuc2NoZWR1bGVNYXAgPSB7fTtcblxuICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXROb3cgPSBmdW5jdGlvbiAoYmVhdCkge1xuXG4gICAgICAgIGlmIChiZWF0LmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGxldCBiZWF0RXZlbnQgPSB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldO1xuICAgICAgICAgICAgaWYgKGJlYXRFdmVudCkge1xuICAgICAgICAgICAgICAgIGJlYXRFdmVudC5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHRyaWdnZXJUaW1lID0gdGhpcy5zY2hlZHVsZU1hcFswXSArIGJlYXQuY2VsbElkICogdGhpcy5taWxsaVBlckJlYXQodGhpcy5icG0pIC8gMTAwMDtcbiAgICAgICAgbGV0IG5vdyA9IGN0eC5jdXJyZW50VGltZTtcbiAgICAgICAgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXSA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdChiZWF0LCB0cmlnZ2VyVGltZSk7XG4gICAgICAgIH0sIG5vdyk7XG4gICAgfTtcblxuICAgIHRoaXMuaW50ZXJ2YWw7XG4gICAgdGhpcy5ydW5TY2hlZHVsZSA9IGZ1bmN0aW9uIChicG0pIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5icG0gPSBicG07XG4gICAgICAgIGxldCBpbnRlcnZhbCA9IHRoaXMubWlsbGlQZXJCZWF0KGJwbSk7XG5cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgICAgfSwgMCk7XG5cbiAgICAgICAgdGhpcy5pbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGUoKTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuXG4gICAgICAgIH0sIGludGVydmFsKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsKTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0RXZlbnRLZXkgPSBmdW5jdGlvbiBnZXRFdmVudEtleShiZWF0KSB7XG4gICAgICAgIHJldHVybiBiZWF0LnJvd0lkICsgYmVhdC5jZWxsSWQ7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFRyYWNrZXJWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgJChcIi5jZWxsXCIpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZGF0YXNldCk7XG4gICAgICAgICAgICB2YWwuZW5hYmxlZCA9ICQodGhpcykuaGFzQ2xhc3MoXCJlbmFibGVkXCIpO1xuICAgICAgICAgICAgdmFsdWVzLnB1c2godmFsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmxvYWRUcmFja2VyVmFsdWVzID0gZnVuY3Rpb24oanNvbikge1xuICAgICAgICAkKCcuY2VsbCcpLnJlbW92ZUNsYXNzKCdlbmFibGVkJyk7XG4gICAgICAgIGpzb24uZm9yRWFjaChmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICAgICAgaWYgKGVsZW0uZW5hYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGBbZGF0YS1yb3ctaWQ9XCIke2VsZW0ucm93SWR9XCJdW2RhdGEtY2VsbC1pZD1cIiR7ZWxlbS5jZWxsSWR9XCJdYDtcbiAgICAgICAgICAgICAgICAkKHNlbGVjdG9yKS5hZGRDbGFzcyhcImVuYWJsZWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzY2hlZHVsZU1lYXN1cmU7IiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiJdfQ==
