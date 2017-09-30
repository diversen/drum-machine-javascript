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
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement) || view.safari
		, is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
			;
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
  define("FileSaver.js", function() {
    return saveAs;
  });
}

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
'use strict';
var objType = require('obj-type');

module.exports = function (el, str) {
	if (objType(el).indexOf('element') === -1) {
		throw new TypeError('Expected an HTML DOM element as first argument');
	}

	if (typeof str !== 'string') {
		throw new TypeError('Expected a string as second argument');
	}

	if (el.classList) {
		return el.classList.contains(str);
	}

	return new RegExp('(^| )' + str + '( |$)', 'gi').test(el.className);
};

},{"obj-type":7}],6:[function(require,module,exports){
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
},{"audio-buffer-instrument":2,"tiny-sample-loader":9}],7:[function(require,module,exports){
'use strict';
module.exports = function (obj) {
	return Object.prototype.toString.call(obj).replace(/^\[object (.+)\]$/, '$1').toLowerCase();
};

},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
var WAAClock = require('./lib/WAAClock')

module.exports = WAAClock
if (typeof window !== 'undefined') window.WAAClock = WAAClock

},{"./lib/WAAClock":11}],11:[function(require,module,exports){
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

},{"_process":18}],12:[function(require,module,exports){
function audioDistortionNode(ctx) {

    this.ctx = ctx;
    this.distortion;
    this.amount = 400;

    this.getDistortionNode = function (amount) {

        if (amount) {
            this.amount = amount;
        }

        this.distortion = this.ctx.createWaveShaper();
        this.distortion.oversample = '4x';
        this.distortion.curve = this.makeDistortionCurve(this.amount);
        return this.distortion;
    }

    this.makeDistortionCurve = function (amount) {
        var k = typeof amount === 'number' ? amount : 50,
                n_samples = 44100,
                curve = new Float32Array(n_samples),
                deg = Math.PI / 180,
                i = 0,
                x;
        for (; i < n_samples; ++i) {
            x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;

    };
}

module.exports = audioDistortionNode;
},{}],13:[function(require,module,exports){
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
            if (key === 'gainEnabled') {
                ret[key] = 'gain';
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

},{"get-set-form-values":4}],14:[function(require,module,exports){
// require("babel-polyfill"); 
const loadSampleSet = require('load-sample-set');
const selectElement = require('select-element');
const getSetFormValues = require('get-set-form-values');
const adsrGainNode = require('adsr-gain-node');
const trackerTable = require('./tracker-table');
const scheduleMeasure = require('./schedule-measure');
const audioDistortionNode = require('./audio-distortion-node');
const sampleLoader = require('tiny-sample-loader');
const FileSaver = require('file-saver');
// var $ = require('cheerio');

const getSetControls = require('./get-set-controls');
const getSetAudioOptions = new getSetControls();

const ctx = new AudioContext();
const defaultTrack = require('./track-2');

var buffers;
var currentSampleData;
var storage;
var trackerDebug;

function initializeSampleSet(ctx, dataUrl, track) {

    var sampleSetPromise = loadSampleSet(ctx, dataUrl);
    sampleSetPromise.then(function (data) {

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
        schedule.loadTrackerValues(track.beat);
        schedule.setupEvents();
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
    instrumentData.title = instrumentData.filename;

    document.getElementById("tracker-parent").innerHTML = '';
    schedule.drawTracker(data.filename.length, measureLength, instrumentData);
    return;
}

function disconnectNode(node, options) {
    let totalLength =
        options.attackTime + options.sustainTime + options.releaseTime;
    setTimeout(() => {
        node.disconnect();
    }, totalLength * 1000);
}


// compressor.connect(ctx.destination);

let distortionNode = new audioDistortionNode(ctx);
let distortion = distortionNode.getDistortionNode(100);

function scheduleAudioBeat(beat, triggerTime) {

    let instrumentName = instrumentData.filename[beat.rowId];
    let instrument = buffers[instrumentName].get();
    let options = getSetAudioOptions.getTrackerControls();

    function play(source) {

        source.detune.value = options.detune;

        // Gain
        let node = routeGain(source)
        node = routeDelay(node);
        node = routeCompressor(node);
        node.connect(ctx.destination);
        source.start(triggerTime);

    }

    function routeCompressor (node) {
        // Not used yet
        return node;
        var compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -100; // -100 - 0
        compressor.knee.value = 10; // 1 - 40
        compressor.ratio.value = 12; // 1 - 20
        compressor.attack.value = 1; // 0 - 1
        compressor.release.value = 0; // 0 - 1

        node.connect(compressor);
        return compressor;
    }

    function routeGain (source) {
        let gain = new adsrGainNode(ctx);
        let options = getSetAudioOptions.getTrackerControls();
        let gainNode; 

        // Not enabled - default gain
        if (!options.gainEnabled) {
            gainNode = gain.getGainNode(triggerTime);
            source.connect(gainNode);
            return gainNode;
        }

        gain.setOptions(options);
        gainNode = gain.getGainNode(triggerTime);
        source.connect(gainNode);
        return gainNode;


    }

    // Note delay always uses above gain - even if not enabled
    function routeDelay(node) {
        if (!options.delayEnabled) {
            return node;
        }

        // create delay node
        let delay = ctx.createDelay();
        delay.delayTime.value = options.delay;

        // create adsr gain node
        let gain = new adsrGainNode(ctx);
        gain.setOptions(options);
        let feedbackGain = gain.getGainNode(triggerTime);

        // create filter
        let filter = ctx.createBiquadFilter();
        filter.frequency.value = options.filter;

        // delay -> feedbackGain
        delay.connect(feedbackGain);
        disconnectNode(delay, options);

        // feedback -> filter
        feedbackGain.connect(filter);

        // filter ->delay
        filter.connect(delay);

        node.connect(delay);

        return delay;
    }
    play(instrument);
}

var schedule = new scheduleMeasure(ctx, scheduleAudioBeat);

function setupBaseEvents() {
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
    });

    document.getElementById('bpm').addEventListener('change', function (e) {
        getSetAudioOptions.setTrackerControls();
        if (schedule.running) {
            schedule.stop();
            schedule.runSchedule(getSetAudioOptions.options.bpm);
        }
    });

    document.getElementById('measureLength').addEventListener('input', (e) => {

        $('#measureLength').bind('keypress keydown keyup', (e) => {
            if (e.keyCode == 13) {

                e.preventDefault();

                let value = document.getElementById('measureLength').value;
                let length = parseInt(value);

                if (length < 1) return;
                schedule.measureLength = length;

                let track = schedule.getTrackerValues();
                setupTrackerHtml(currentSampleData, length);
                schedule.measureLength = length;
                schedule.loadTrackerValues(track)
                schedule.setupEvents();
            }
        });
    });

    $('.base').on('change', function () {
        getSetAudioOptions.setTrackerControls();
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
        let song = { "beat": beat, "settings": formData };
        return song;
    }

    this.setupStorage = function () {

        this.setLocalStorage();
        document.getElementById('save').addEventListener('click', (e) => {
            e.preventDefault();

            let song = this.getTrack();
            let json = JSON.stringify(song);

            let filename = this.getFilename();

            localStorage.setItem(filename, json);
            this.setLocalStorage('update');

            $("#beat-list").val(filename);
            // alert('Track saved');
        });

        // saveAsJson
        document.getElementById('saveAsJson').addEventListener('click', (e) => {
            e.preventDefault();

            let song = this.getTrack();
            let json = JSON.stringify(song);

            let filename = this.getFilename();

            var blob = new Blob([json], {type: "application/json"});
            FileSaver.saveAs(blob, filename + ".json");


        });

        $('#filename').bind('keypress keydown keyup', (e) => {
            if (e.keyCode == 13) {
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

},{"./audio-distortion-node":12,"./get-set-controls":13,"./schedule-measure":15,"./track-2":16,"./tracker-table":17,"adsr-gain-node":1,"file-saver":3,"get-set-form-values":4,"load-sample-set":6,"select-element":8,"tiny-sample-loader":9}],15:[function(require,module,exports){
const WAAClock = require('waaclock');
const trackerTable = require('./tracker-table');
const hasClass = require('has-class');

/**
 * Construct object
 * @param {audioContext} ctx 
 * @param {function} scheduleAudioBeat
 */
function scheduleMeasure(ctx, scheduleAudioBeat) {

    this.measureLength = 16;
    this.scheduleAudioBeat = scheduleAudioBeat;
    this.scheduleForward = 0.1;
    this.current = 0;
    this.eventMap = {};
    this.clock = new WAAClock(ctx);
    this.clock.start();
    this.running = false;

    /**
     * Draw a tracker table by numRows and numCols
     */
    this.drawTracker = function(numRows, numCols, data) {
        
        let htmlTable = new trackerTable();
        
        htmlTable.setRows(numRows, numCols, data);
        let str = htmlTable.getTable();
        
        let t = document.getElementById('tracker-parent');
        t.insertAdjacentHTML('afterbegin', str);
    }

    /**
     * Push current beat one forward
     */
    this.next = function () {
        this.current++;
        if (this.current >= this.measureLength) {
            this.current = 0;
        }
    };

    /**
     * Calculate milli seconds per beat
     */
    this.milliPerBeat = function (beats) {
        if (!beats) {
            beats = 60;
        }
        return 1000 * 60 / beats;
    };

    /**
     * Get a tracker row from a cell-id
     */
    this.getTrackerRowValues = function (cellId) {
        let values = [];
        let selector = `[data-cell-id="${cellId}"]`;

        let elems = document.querySelectorAll(selector);
        elems.forEach((el) => {
            let val = Object.assign({}, el.dataset);
            val.enabled = el.classList.contains('tracker-enabled');
            values.push(val);
        });
        return values;
    };

    /**
     * Schedule a beat column
     */
    this.schedule = function () {
        let beatColumn = this.getTrackerRowValues(this.current);
        let now = ctx.currentTime;

        let selector = `[data-cell-id="${this.current}"]`;

        let event = this.clock.callbackAtTime(() => {
            let elems = document.querySelectorAll(selector);
            elems.forEach( (e) => {
                e.classList.add('tracker-current')
            })
        }, now + this.scheduleForward);

        this.clock.callbackAtTime(() => {
            let elems = document.querySelectorAll(selector);
            elems.forEach( (e) => {
                e.classList.remove('tracker-current')
            })
        }, now + this.scheduleForward + this.milliPerBeat(this.bpm) / 1000);

        beatColumn.forEach((beat) => {
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
        let elems = document.querySelectorAll('.tracker-cell');
        elems.forEach(function (e) {
            let val = Object.assign({}, e.dataset);
            val.enabled = hasClass(e, "tracker-enabled");
            values.push(val);
        });
        return values;
    };

    this.loadTrackerValues = function (json) {

        let elems = document.querySelectorAll('.tracker-enabled');
        elems.forEach(function(e) {
            e.classList.remove('tracker-enabled');
        });

        json.forEach(function (data) {
            if (data.enabled === true) {
                let selector = `.tracker-cell[data-row-id="${data.rowId}"][data-cell-id="${data.cellId}"]`;
                let elem = document.querySelector(selector);
                elem.classList.add("tracker-enabled");
            }
        });
    };

    /**
     * Listen on tracker-cell
     */
    this.setupEvents = function () {
        
        let elems = document.querySelectorAll('.tracker-cell');
        
        elems.forEach(function (e) {
            e.addEventListener('click', function(e) {
                let val = Object.assign({}, e.target.dataset);
                val.enabled = hasClass(e.target, "tracker-enabled");
                let currentBeat = e.target.dataset.cellId;
                if (val.cellId > currentBeat) {
                    this.scheduleAudioBeatNow(val);
                }
                e.target.classList.toggle('tracker-enabled');
            })
        })
    }
}

module.exports = scheduleMeasure;
},{"./tracker-table":17,"has-class":5,"waaclock":10}],16:[function(require,module,exports){
module.exports=module.exports = {"beat":[{"rowId":"header","cellId":"0","enabled":false},{"rowId":"header","cellId":"1","enabled":false},{"rowId":"header","cellId":"2","enabled":false},{"rowId":"header","cellId":"3","enabled":false},{"rowId":"header","cellId":"4","enabled":false},{"rowId":"header","cellId":"5","enabled":false},{"rowId":"header","cellId":"6","enabled":false},{"rowId":"header","cellId":"7","enabled":false},{"rowId":"header","cellId":"8","enabled":false},{"rowId":"header","cellId":"9","enabled":false},{"rowId":"header","cellId":"10","enabled":false},{"rowId":"header","cellId":"11","enabled":false},{"rowId":"header","cellId":"12","enabled":false},{"rowId":"header","cellId":"13","enabled":false},{"rowId":"header","cellId":"14","enabled":false},{"rowId":"header","cellId":"15","enabled":false},{"rowId":"0","cellId":"0","enabled":false},{"rowId":"0","cellId":"1","enabled":false},{"rowId":"0","cellId":"2","enabled":false},{"rowId":"0","cellId":"3","enabled":false},{"rowId":"0","cellId":"4","enabled":false},{"rowId":"0","cellId":"5","enabled":false},{"rowId":"0","cellId":"6","enabled":false},{"rowId":"0","cellId":"7","enabled":false},{"rowId":"0","cellId":"8","enabled":false},{"rowId":"0","cellId":"9","enabled":false},{"rowId":"0","cellId":"10","enabled":false},{"rowId":"0","cellId":"11","enabled":false},{"rowId":"0","cellId":"12","enabled":false},{"rowId":"0","cellId":"13","enabled":false},{"rowId":"0","cellId":"14","enabled":false},{"rowId":"0","cellId":"15","enabled":false},{"rowId":"1","cellId":"0","enabled":false},{"rowId":"1","cellId":"1","enabled":false},{"rowId":"1","cellId":"2","enabled":false},{"rowId":"1","cellId":"3","enabled":false},{"rowId":"1","cellId":"4","enabled":false},{"rowId":"1","cellId":"5","enabled":false},{"rowId":"1","cellId":"6","enabled":false},{"rowId":"1","cellId":"7","enabled":false},{"rowId":"1","cellId":"8","enabled":false},{"rowId":"1","cellId":"9","enabled":false},{"rowId":"1","cellId":"10","enabled":false},{"rowId":"1","cellId":"11","enabled":false},{"rowId":"1","cellId":"12","enabled":false},{"rowId":"1","cellId":"13","enabled":false},{"rowId":"1","cellId":"14","enabled":false},{"rowId":"1","cellId":"15","enabled":false},{"rowId":"2","cellId":"0","enabled":false},{"rowId":"2","cellId":"1","enabled":false},{"rowId":"2","cellId":"2","enabled":false},{"rowId":"2","cellId":"3","enabled":false},{"rowId":"2","cellId":"4","enabled":false},{"rowId":"2","cellId":"5","enabled":false},{"rowId":"2","cellId":"6","enabled":false},{"rowId":"2","cellId":"7","enabled":false},{"rowId":"2","cellId":"8","enabled":false},{"rowId":"2","cellId":"9","enabled":false},{"rowId":"2","cellId":"10","enabled":false},{"rowId":"2","cellId":"11","enabled":false},{"rowId":"2","cellId":"12","enabled":false},{"rowId":"2","cellId":"13","enabled":false},{"rowId":"2","cellId":"14","enabled":false},{"rowId":"2","cellId":"15","enabled":false},{"rowId":"3","cellId":"0","enabled":false},{"rowId":"3","cellId":"1","enabled":false},{"rowId":"3","cellId":"2","enabled":false},{"rowId":"3","cellId":"3","enabled":false},{"rowId":"3","cellId":"4","enabled":false},{"rowId":"3","cellId":"5","enabled":false},{"rowId":"3","cellId":"6","enabled":false},{"rowId":"3","cellId":"7","enabled":false},{"rowId":"3","cellId":"8","enabled":false},{"rowId":"3","cellId":"9","enabled":false},{"rowId":"3","cellId":"10","enabled":false},{"rowId":"3","cellId":"11","enabled":false},{"rowId":"3","cellId":"12","enabled":false},{"rowId":"3","cellId":"13","enabled":false},{"rowId":"3","cellId":"14","enabled":false},{"rowId":"3","cellId":"15","enabled":false},{"rowId":"4","cellId":"0","enabled":true},{"rowId":"4","cellId":"1","enabled":false},{"rowId":"4","cellId":"2","enabled":false},{"rowId":"4","cellId":"3","enabled":false},{"rowId":"4","cellId":"4","enabled":false},{"rowId":"4","cellId":"5","enabled":false},{"rowId":"4","cellId":"6","enabled":false},{"rowId":"4","cellId":"7","enabled":false},{"rowId":"4","cellId":"8","enabled":false},{"rowId":"4","cellId":"9","enabled":false},{"rowId":"4","cellId":"10","enabled":false},{"rowId":"4","cellId":"11","enabled":false},{"rowId":"4","cellId":"12","enabled":true},{"rowId":"4","cellId":"13","enabled":false},{"rowId":"4","cellId":"14","enabled":true},{"rowId":"4","cellId":"15","enabled":false},{"rowId":"5","cellId":"0","enabled":false},{"rowId":"5","cellId":"1","enabled":false},{"rowId":"5","cellId":"2","enabled":false},{"rowId":"5","cellId":"3","enabled":true},{"rowId":"5","cellId":"4","enabled":false},{"rowId":"5","cellId":"5","enabled":false},{"rowId":"5","cellId":"6","enabled":false},{"rowId":"5","cellId":"7","enabled":true},{"rowId":"5","cellId":"8","enabled":false},{"rowId":"5","cellId":"9","enabled":false},{"rowId":"5","cellId":"10","enabled":false},{"rowId":"5","cellId":"11","enabled":true},{"rowId":"5","cellId":"12","enabled":false},{"rowId":"5","cellId":"13","enabled":true},{"rowId":"5","cellId":"14","enabled":false},{"rowId":"5","cellId":"15","enabled":true},{"rowId":"6","cellId":"0","enabled":false},{"rowId":"6","cellId":"1","enabled":false},{"rowId":"6","cellId":"2","enabled":false},{"rowId":"6","cellId":"3","enabled":false},{"rowId":"6","cellId":"4","enabled":false},{"rowId":"6","cellId":"5","enabled":false},{"rowId":"6","cellId":"6","enabled":false},{"rowId":"6","cellId":"7","enabled":false},{"rowId":"6","cellId":"8","enabled":false},{"rowId":"6","cellId":"9","enabled":false},{"rowId":"6","cellId":"10","enabled":true},{"rowId":"6","cellId":"11","enabled":false},{"rowId":"6","cellId":"12","enabled":false},{"rowId":"6","cellId":"13","enabled":false},{"rowId":"6","cellId":"14","enabled":false},{"rowId":"6","cellId":"15","enabled":false},{"rowId":"7","cellId":"0","enabled":false},{"rowId":"7","cellId":"1","enabled":false},{"rowId":"7","cellId":"2","enabled":false},{"rowId":"7","cellId":"3","enabled":false},{"rowId":"7","cellId":"4","enabled":false},{"rowId":"7","cellId":"5","enabled":false},{"rowId":"7","cellId":"6","enabled":false},{"rowId":"7","cellId":"7","enabled":false},{"rowId":"7","cellId":"8","enabled":false},{"rowId":"7","cellId":"9","enabled":true},{"rowId":"7","cellId":"10","enabled":false},{"rowId":"7","cellId":"11","enabled":false},{"rowId":"7","cellId":"12","enabled":false},{"rowId":"7","cellId":"13","enabled":false},{"rowId":"7","cellId":"14","enabled":false},{"rowId":"7","cellId":"15","enabled":false},{"rowId":"8","cellId":"0","enabled":false},{"rowId":"8","cellId":"1","enabled":false},{"rowId":"8","cellId":"2","enabled":false},{"rowId":"8","cellId":"3","enabled":false},{"rowId":"8","cellId":"4","enabled":false},{"rowId":"8","cellId":"5","enabled":false},{"rowId":"8","cellId":"6","enabled":false},{"rowId":"8","cellId":"7","enabled":false},{"rowId":"8","cellId":"8","enabled":false},{"rowId":"8","cellId":"9","enabled":false},{"rowId":"8","cellId":"10","enabled":false},{"rowId":"8","cellId":"11","enabled":false},{"rowId":"8","cellId":"12","enabled":false},{"rowId":"8","cellId":"13","enabled":false},{"rowId":"8","cellId":"14","enabled":false},{"rowId":"8","cellId":"15","enabled":false},{"rowId":"9","cellId":"0","enabled":false},{"rowId":"9","cellId":"1","enabled":false},{"rowId":"9","cellId":"2","enabled":false},{"rowId":"9","cellId":"3","enabled":false},{"rowId":"9","cellId":"4","enabled":false},{"rowId":"9","cellId":"5","enabled":false},{"rowId":"9","cellId":"6","enabled":false},{"rowId":"9","cellId":"7","enabled":false},{"rowId":"9","cellId":"8","enabled":false},{"rowId":"9","cellId":"9","enabled":false},{"rowId":"9","cellId":"10","enabled":false},{"rowId":"9","cellId":"11","enabled":false},{"rowId":"9","cellId":"12","enabled":false},{"rowId":"9","cellId":"13","enabled":false},{"rowId":"9","cellId":"14","enabled":false},{"rowId":"9","cellId":"15","enabled":false},{"rowId":"10","cellId":"0","enabled":false},{"rowId":"10","cellId":"1","enabled":false},{"rowId":"10","cellId":"2","enabled":false},{"rowId":"10","cellId":"3","enabled":false},{"rowId":"10","cellId":"4","enabled":false},{"rowId":"10","cellId":"5","enabled":false},{"rowId":"10","cellId":"6","enabled":false},{"rowId":"10","cellId":"7","enabled":false},{"rowId":"10","cellId":"8","enabled":false},{"rowId":"10","cellId":"9","enabled":false},{"rowId":"10","cellId":"10","enabled":false},{"rowId":"10","cellId":"11","enabled":false},{"rowId":"10","cellId":"12","enabled":false},{"rowId":"10","cellId":"13","enabled":false},{"rowId":"10","cellId":"14","enabled":false},{"rowId":"10","cellId":"15","enabled":false},{"rowId":"11","cellId":"0","enabled":false},{"rowId":"11","cellId":"1","enabled":false},{"rowId":"11","cellId":"2","enabled":false},{"rowId":"11","cellId":"3","enabled":false},{"rowId":"11","cellId":"4","enabled":false},{"rowId":"11","cellId":"5","enabled":false},{"rowId":"11","cellId":"6","enabled":false},{"rowId":"11","cellId":"7","enabled":false},{"rowId":"11","cellId":"8","enabled":false},{"rowId":"11","cellId":"9","enabled":false},{"rowId":"11","cellId":"10","enabled":false},{"rowId":"11","cellId":"11","enabled":false},{"rowId":"11","cellId":"12","enabled":false},{"rowId":"11","cellId":"13","enabled":false},{"rowId":"11","cellId":"14","enabled":false},{"rowId":"11","cellId":"15","enabled":false},{"rowId":"12","cellId":"0","enabled":false},{"rowId":"12","cellId":"1","enabled":false},{"rowId":"12","cellId":"2","enabled":false},{"rowId":"12","cellId":"3","enabled":false},{"rowId":"12","cellId":"4","enabled":false},{"rowId":"12","cellId":"5","enabled":false},{"rowId":"12","cellId":"6","enabled":false},{"rowId":"12","cellId":"7","enabled":false},{"rowId":"12","cellId":"8","enabled":false},{"rowId":"12","cellId":"9","enabled":false},{"rowId":"12","cellId":"10","enabled":false},{"rowId":"12","cellId":"11","enabled":false},{"rowId":"12","cellId":"12","enabled":false},{"rowId":"12","cellId":"13","enabled":false},{"rowId":"12","cellId":"14","enabled":false},{"rowId":"12","cellId":"15","enabled":false},{"rowId":"13","cellId":"0","enabled":false},{"rowId":"13","cellId":"1","enabled":false},{"rowId":"13","cellId":"2","enabled":false},{"rowId":"13","cellId":"3","enabled":false},{"rowId":"13","cellId":"4","enabled":false},{"rowId":"13","cellId":"5","enabled":false},{"rowId":"13","cellId":"6","enabled":false},{"rowId":"13","cellId":"7","enabled":false},{"rowId":"13","cellId":"8","enabled":false},{"rowId":"13","cellId":"9","enabled":false},{"rowId":"13","cellId":"10","enabled":false},{"rowId":"13","cellId":"11","enabled":false},{"rowId":"13","cellId":"12","enabled":false},{"rowId":"13","cellId":"13","enabled":false},{"rowId":"13","cellId":"14","enabled":false},{"rowId":"13","cellId":"15","enabled":false},{"rowId":"14","cellId":"0","enabled":false},{"rowId":"14","cellId":"1","enabled":false},{"rowId":"14","cellId":"2","enabled":false},{"rowId":"14","cellId":"3","enabled":false},{"rowId":"14","cellId":"4","enabled":false},{"rowId":"14","cellId":"5","enabled":false},{"rowId":"14","cellId":"6","enabled":false},{"rowId":"14","cellId":"7","enabled":false},{"rowId":"14","cellId":"8","enabled":false},{"rowId":"14","cellId":"9","enabled":false},{"rowId":"14","cellId":"10","enabled":false},{"rowId":"14","cellId":"11","enabled":false},{"rowId":"14","cellId":"12","enabled":false},{"rowId":"14","cellId":"13","enabled":false},{"rowId":"14","cellId":"14","enabled":false},{"rowId":"14","cellId":"15","enabled":false},{"rowId":"15","cellId":"0","enabled":false},{"rowId":"15","cellId":"1","enabled":true},{"rowId":"15","cellId":"2","enabled":false},{"rowId":"15","cellId":"3","enabled":false},{"rowId":"15","cellId":"4","enabled":false},{"rowId":"15","cellId":"5","enabled":false},{"rowId":"15","cellId":"6","enabled":false},{"rowId":"15","cellId":"7","enabled":false},{"rowId":"15","cellId":"8","enabled":false},{"rowId":"15","cellId":"9","enabled":false},{"rowId":"15","cellId":"10","enabled":false},{"rowId":"15","cellId":"11","enabled":false},{"rowId":"15","cellId":"12","enabled":false},{"rowId":"15","cellId":"13","enabled":false},{"rowId":"15","cellId":"14","enabled":false},{"rowId":"15","cellId":"15","enabled":false},{"rowId":"16","cellId":"0","enabled":false},{"rowId":"16","cellId":"1","enabled":false},{"rowId":"16","cellId":"2","enabled":false},{"rowId":"16","cellId":"3","enabled":false},{"rowId":"16","cellId":"4","enabled":false},{"rowId":"16","cellId":"5","enabled":false},{"rowId":"16","cellId":"6","enabled":false},{"rowId":"16","cellId":"7","enabled":false},{"rowId":"16","cellId":"8","enabled":false},{"rowId":"16","cellId":"9","enabled":false},{"rowId":"16","cellId":"10","enabled":false},{"rowId":"16","cellId":"11","enabled":false},{"rowId":"16","cellId":"12","enabled":false},{"rowId":"16","cellId":"13","enabled":false},{"rowId":"16","cellId":"14","enabled":false},{"rowId":"16","cellId":"15","enabled":false},{"rowId":"17","cellId":"0","enabled":false},{"rowId":"17","cellId":"1","enabled":false},{"rowId":"17","cellId":"2","enabled":false},{"rowId":"17","cellId":"3","enabled":false},{"rowId":"17","cellId":"4","enabled":false},{"rowId":"17","cellId":"5","enabled":false},{"rowId":"17","cellId":"6","enabled":false},{"rowId":"17","cellId":"7","enabled":false},{"rowId":"17","cellId":"8","enabled":false},{"rowId":"17","cellId":"9","enabled":false},{"rowId":"17","cellId":"10","enabled":false},{"rowId":"17","cellId":"11","enabled":false},{"rowId":"17","cellId":"12","enabled":false},{"rowId":"17","cellId":"13","enabled":false},{"rowId":"17","cellId":"14","enabled":false},{"rowId":"17","cellId":"15","enabled":false},{"rowId":"18","cellId":"0","enabled":false},{"rowId":"18","cellId":"1","enabled":false},{"rowId":"18","cellId":"2","enabled":false},{"rowId":"18","cellId":"3","enabled":false},{"rowId":"18","cellId":"4","enabled":false},{"rowId":"18","cellId":"5","enabled":false},{"rowId":"18","cellId":"6","enabled":false},{"rowId":"18","cellId":"7","enabled":false},{"rowId":"18","cellId":"8","enabled":false},{"rowId":"18","cellId":"9","enabled":false},{"rowId":"18","cellId":"10","enabled":false},{"rowId":"18","cellId":"11","enabled":false},{"rowId":"18","cellId":"12","enabled":false},{"rowId":"18","cellId":"13","enabled":false},{"rowId":"18","cellId":"14","enabled":false},{"rowId":"18","cellId":"15","enabled":false},{"rowId":"19","cellId":"0","enabled":false},{"rowId":"19","cellId":"1","enabled":false},{"rowId":"19","cellId":"2","enabled":false},{"rowId":"19","cellId":"3","enabled":false},{"rowId":"19","cellId":"4","enabled":false},{"rowId":"19","cellId":"5","enabled":false},{"rowId":"19","cellId":"6","enabled":false},{"rowId":"19","cellId":"7","enabled":false},{"rowId":"19","cellId":"8","enabled":false},{"rowId":"19","cellId":"9","enabled":false},{"rowId":"19","cellId":"10","enabled":false},{"rowId":"19","cellId":"11","enabled":false},{"rowId":"19","cellId":"12","enabled":false},{"rowId":"19","cellId":"13","enabled":false},{"rowId":"19","cellId":"14","enabled":false},{"rowId":"19","cellId":"15","enabled":false},{"rowId":"20","cellId":"0","enabled":false},{"rowId":"20","cellId":"1","enabled":false},{"rowId":"20","cellId":"2","enabled":false},{"rowId":"20","cellId":"3","enabled":false},{"rowId":"20","cellId":"4","enabled":false},{"rowId":"20","cellId":"5","enabled":false},{"rowId":"20","cellId":"6","enabled":false},{"rowId":"20","cellId":"7","enabled":false},{"rowId":"20","cellId":"8","enabled":false},{"rowId":"20","cellId":"9","enabled":false},{"rowId":"20","cellId":"10","enabled":false},{"rowId":"20","cellId":"11","enabled":false},{"rowId":"20","cellId":"12","enabled":false},{"rowId":"20","cellId":"13","enabled":false},{"rowId":"20","cellId":"14","enabled":false},{"rowId":"20","cellId":"15","enabled":false},{"rowId":"21","cellId":"0","enabled":false},{"rowId":"21","cellId":"1","enabled":false},{"rowId":"21","cellId":"2","enabled":false},{"rowId":"21","cellId":"3","enabled":false},{"rowId":"21","cellId":"4","enabled":false},{"rowId":"21","cellId":"5","enabled":false},{"rowId":"21","cellId":"6","enabled":false},{"rowId":"21","cellId":"7","enabled":false},{"rowId":"21","cellId":"8","enabled":false},{"rowId":"21","cellId":"9","enabled":false},{"rowId":"21","cellId":"10","enabled":false},{"rowId":"21","cellId":"11","enabled":false},{"rowId":"21","cellId":"12","enabled":false},{"rowId":"21","cellId":"13","enabled":false},{"rowId":"21","cellId":"14","enabled":false},{"rowId":"21","cellId":"15","enabled":false},{"rowId":"22","cellId":"0","enabled":false},{"rowId":"22","cellId":"1","enabled":false},{"rowId":"22","cellId":"2","enabled":false},{"rowId":"22","cellId":"3","enabled":false},{"rowId":"22","cellId":"4","enabled":false},{"rowId":"22","cellId":"5","enabled":false},{"rowId":"22","cellId":"6","enabled":false},{"rowId":"22","cellId":"7","enabled":false},{"rowId":"22","cellId":"8","enabled":false},{"rowId":"22","cellId":"9","enabled":false},{"rowId":"22","cellId":"10","enabled":false},{"rowId":"22","cellId":"11","enabled":false},{"rowId":"22","cellId":"12","enabled":false},{"rowId":"22","cellId":"13","enabled":false},{"rowId":"22","cellId":"14","enabled":false},{"rowId":"22","cellId":"15","enabled":false},{"rowId":"23","cellId":"0","enabled":false},{"rowId":"23","cellId":"1","enabled":false},{"rowId":"23","cellId":"2","enabled":false},{"rowId":"23","cellId":"3","enabled":false},{"rowId":"23","cellId":"4","enabled":false},{"rowId":"23","cellId":"5","enabled":false},{"rowId":"23","cellId":"6","enabled":false},{"rowId":"23","cellId":"7","enabled":false},{"rowId":"23","cellId":"8","enabled":false},{"rowId":"23","cellId":"9","enabled":false},{"rowId":"23","cellId":"10","enabled":false},{"rowId":"23","cellId":"11","enabled":false},{"rowId":"23","cellId":"12","enabled":false},{"rowId":"23","cellId":"13","enabled":false},{"rowId":"23","cellId":"14","enabled":false},{"rowId":"23","cellId":"15","enabled":false},{"rowId":"24","cellId":"0","enabled":false},{"rowId":"24","cellId":"1","enabled":false},{"rowId":"24","cellId":"2","enabled":false},{"rowId":"24","cellId":"3","enabled":false},{"rowId":"24","cellId":"4","enabled":false},{"rowId":"24","cellId":"5","enabled":false},{"rowId":"24","cellId":"6","enabled":false},{"rowId":"24","cellId":"7","enabled":false},{"rowId":"24","cellId":"8","enabled":false},{"rowId":"24","cellId":"9","enabled":false},{"rowId":"24","cellId":"10","enabled":false},{"rowId":"24","cellId":"11","enabled":false},{"rowId":"24","cellId":"12","enabled":false},{"rowId":"24","cellId":"13","enabled":false},{"rowId":"24","cellId":"14","enabled":false},{"rowId":"24","cellId":"15","enabled":false},{"rowId":"25","cellId":"0","enabled":false},{"rowId":"25","cellId":"1","enabled":false},{"rowId":"25","cellId":"2","enabled":false},{"rowId":"25","cellId":"3","enabled":false},{"rowId":"25","cellId":"4","enabled":false},{"rowId":"25","cellId":"5","enabled":false},{"rowId":"25","cellId":"6","enabled":false},{"rowId":"25","cellId":"7","enabled":false},{"rowId":"25","cellId":"8","enabled":false},{"rowId":"25","cellId":"9","enabled":false},{"rowId":"25","cellId":"10","enabled":false},{"rowId":"25","cellId":"11","enabled":false},{"rowId":"25","cellId":"12","enabled":false},{"rowId":"25","cellId":"13","enabled":false},{"rowId":"25","cellId":"14","enabled":false},{"rowId":"25","cellId":"15","enabled":false},{"rowId":"26","cellId":"0","enabled":false},{"rowId":"26","cellId":"1","enabled":false},{"rowId":"26","cellId":"2","enabled":false},{"rowId":"26","cellId":"3","enabled":false},{"rowId":"26","cellId":"4","enabled":false},{"rowId":"26","cellId":"5","enabled":false},{"rowId":"26","cellId":"6","enabled":false},{"rowId":"26","cellId":"7","enabled":false},{"rowId":"26","cellId":"8","enabled":false},{"rowId":"26","cellId":"9","enabled":false},{"rowId":"26","cellId":"10","enabled":false},{"rowId":"26","cellId":"11","enabled":false},{"rowId":"26","cellId":"12","enabled":false},{"rowId":"26","cellId":"13","enabled":false},{"rowId":"26","cellId":"14","enabled":false},{"rowId":"26","cellId":"15","enabled":false},{"rowId":"27","cellId":"0","enabled":false},{"rowId":"27","cellId":"1","enabled":false},{"rowId":"27","cellId":"2","enabled":false},{"rowId":"27","cellId":"3","enabled":false},{"rowId":"27","cellId":"4","enabled":false},{"rowId":"27","cellId":"5","enabled":false},{"rowId":"27","cellId":"6","enabled":false},{"rowId":"27","cellId":"7","enabled":false},{"rowId":"27","cellId":"8","enabled":false},{"rowId":"27","cellId":"9","enabled":false},{"rowId":"27","cellId":"10","enabled":false},{"rowId":"27","cellId":"11","enabled":false},{"rowId":"27","cellId":"12","enabled":false},{"rowId":"27","cellId":"13","enabled":false},{"rowId":"27","cellId":"14","enabled":false},{"rowId":"27","cellId":"15","enabled":false},{"rowId":"28","cellId":"0","enabled":false},{"rowId":"28","cellId":"1","enabled":false},{"rowId":"28","cellId":"2","enabled":false},{"rowId":"28","cellId":"3","enabled":false},{"rowId":"28","cellId":"4","enabled":false},{"rowId":"28","cellId":"5","enabled":false},{"rowId":"28","cellId":"6","enabled":false},{"rowId":"28","cellId":"7","enabled":false},{"rowId":"28","cellId":"8","enabled":false},{"rowId":"28","cellId":"9","enabled":false},{"rowId":"28","cellId":"10","enabled":false},{"rowId":"28","cellId":"11","enabled":false},{"rowId":"28","cellId":"12","enabled":false},{"rowId":"28","cellId":"13","enabled":false},{"rowId":"28","cellId":"14","enabled":false},{"rowId":"28","cellId":"15","enabled":false}],"settings":{"sampleSet":"https://raw.githubusercontent.com/oramics/sampled/master/DM/LM-2/sampled.instrument.json","measureLength":16,"bpm":190,"detune":-1200,"initGain":1,"maxGain":1,"attackTime":1,"sustainTime":1.9,"releaseTime":5,"delayEnabled":"delay","delay":0.63,"filter":992.6}}
},{}],17:[function(require,module,exports){
function trackerTable() {

    this.str = '';
    this.getTable = function () {
        return '<table id="tracker-table">' + this.str + '</table>';
    };

    this.setHeader = function (numCells, data) {
        this.str += `<tr class="tracker-row header">`;
        this.str += this.getCells('header', numCells, { header: true });
        this.str += `</tr>`;

    };

    this.setRows = function (numRows, numCells, data) {

        this.setHeader(numCells, data);
        for (let rowID = 0; rowID < numRows; rowID++) {
            this.str += `<tr class="tracker-row" data-id="${rowID}">`;
            this.str += this.getCells(rowID, numCells, data);
            this.str += `</tr>`;
        }
    };

    this.getFirstCell = function (rowID, data) {
        var str = '';
        
        str += `<td class="tracker-cell tracker-first-cell" data-row-id="${rowID}">`;
        if (data.title) { 
            str += data.title[rowID];
        }
        
        str += `</td>`;
        return str;
    };

    this.getCells = function (rowID, numCells, data) {
        var str = '';

        str += this.getFirstCell(rowID, data);

        for (let c = 0; c < numCells; c++) {
            str += `<td class="tracker-cell" data-row-id="${rowID}" data-cell-id="${c}">`;
            if (data.header) {
                str += c + 1;
            }
            str += `</td>`;
        }
        return str;
    };
}

module.exports = trackerTable;

},{}],18:[function(require,module,exports){
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

},{}]},{},[14])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvZ2V0LXNldC1mb3JtLXZhbHVlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oYXMtY2xhc3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9hZC1zYW1wbGUtc2V0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29iai10eXBlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjdC1lbGVtZW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Rpbnktc2FtcGxlLWxvYWRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy93YWFjbG9jay9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy93YWFjbG9jay9saWIvV0FBQ2xvY2suanMiLCJzcmMvYXVkaW8tZGlzdG9ydGlvbi1ub2RlLmpzIiwic3JjL2dldC1zZXQtY29udHJvbHMuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9zY2hlZHVsZS1tZWFzdXJlLmpzIiwic3JjL3RyYWNrLTIuanNvbiIsInNyYy90cmFja2VyLXRhYmxlLmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDek9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBHYWluKGN0eCkge1xuXG4gICAgdGhpcy5jdHggPSBjdHg7XG5cbiAgICB0aGlzLnNlY29uZHNUb1RpbWVDb25zdGFudCA9IGZ1bmN0aW9uIChzZWMpIHtcbiAgICAgICAgcmV0dXJuIChzZWMgKiAyKSAvIDg7XG4gICAgfTtcblxuICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgICAgaW5pdEdhaW46IDAuMSwgLy8gSW5pdCBnYWluIG9uIG5vdGVcbiAgICAgICAgbWF4R2FpbjogMS4wLCAvLyBNYXggZ2FpbiBvbiBub3RlXG4gICAgICAgIGF0dGFja1RpbWU6IDAuMSwgLy8gQXR0YWNrVGltZS4gZ2Fpbi5pbml0IHRvIGdhaW4ubWF4IGluIGF0dGFja1RpbWVcbiAgICAgICAgc3VzdGFpblRpbWU6IDEsIC8vIFN1c3RhaW4gbm90ZSBpbiB0aW1lXG4gICAgICAgIHJlbGVhc2VUaW1lOiAxLCAvLyBBcHByb3hpbWF0ZWQgZW5kIHRpbWUuIENhbGN1bGF0ZWQgd2l0aCBzZWNvbmRzVG9UaW1lQ29uc3RhbnQoKVxuICAgICAgICAvLyBkaXNjb25uZWN0OiBmYWxzZSAvLyBTaG91bGQgd2UgYXV0b2Rpc2Nvbm5lY3QuIERlZmF1bHQgaXMgdHJ1ZVxuICAgIH07XG5cbiAgICB0aGlzLnNldE9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIH07XG5cbiAgICB0aGlzLmdhaW5Ob2RlO1xuICAgIC8qKlxuICAgICAqIFRoZSBnYWluTm9kZVxuICAgICAqIEBwYXJhbSB7ZmxvYXR9IGJlZ2luIGN0eCB0aW1lXG4gICAgICogQHJldHVybnMge0dhaW4uZ2V0R2Fpbk5vZGUuZ2Fpbk5vZGV9XG4gICAgICovXG4gICAgdGhpcy5nZXRHYWluTm9kZSA9IGZ1bmN0aW9uIChiZWdpbikge1xuXG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUgPSB0aGlzLmN0eC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IHRoaXMub3B0aW9ucy5pbml0R2FpbjtcblxuICAgICAgICAvLyBBdHRhY2sgdG8gbWF4XG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1heEdhaW4sXG4gICAgICAgICAgICAgICAgYmVnaW4gKyB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSxcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSk7XG5cbiAgICAgICAgLy8gU3VzdGFpbiBhbmQgZW5kIG5vdGVcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnNldFRhcmdldEF0VGltZShcbiAgICAgICAgICAgICAgICAwLjAsXG4gICAgICAgICAgICAgICAgYmVnaW4gKyB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSArIHRoaXMub3B0aW9ucy5zdXN0YWluVGltZSxcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZHNUb1RpbWVDb25zdGFudCh0aGlzLm9wdGlvbnMucmVsZWFzZVRpbWUpKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGlzY29ubmVjdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdChiZWdpbik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLmdhaW5Ob2RlO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5kaXNjb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0b3RhbExlbmd0aCA9IFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lICsgdGhpcy5vcHRpb25zLnN1c3RhaW5UaW1lICsgdGhpcy5vcHRpb25zLnJlbGVhc2VUaW1lO1xuICAgICAgICBcbiAgICAgICAgc2V0VGltZW91dCggKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nYWluTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIHRvdGFsTGVuZ3RoICogMTAwMCk7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBHYWluOyIsIi8vIEZyb206IGh0dHBzOi8vZGV2Lm9wZXJhLmNvbS9hcnRpY2xlcy9kcnVtLXNvdW5kcy13ZWJhdWRpby9cbmZ1bmN0aW9uIEluc3RydW1lbnQoY29udGV4dCwgYnVmZmVyKSB7XG4gICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbn1cblxuSW5zdHJ1bWVudC5wcm90b3R5cGUuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgdGhpcy5zb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgdGhpcy5zb3VyY2UuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pO1xufTtcblxuSW5zdHJ1bWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHJldHVybiB0aGlzLnNvdXJjZTtcbn07XG5cbkluc3RydW1lbnQucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbiAodGltZSkge1xuICAgIHRoaXMuc2V0dXAoKTtcbiAgICB0aGlzLnNvdXJjZS5zdGFydCh0aW1lKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW5zdHJ1bWVudDtcbiIsIi8qIEZpbGVTYXZlci5qc1xuICogQSBzYXZlQXMoKSBGaWxlU2F2ZXIgaW1wbGVtZW50YXRpb24uXG4gKiAxLjMuMlxuICogMjAxNi0wNi0xNiAxODoyNToxOVxuICpcbiAqIEJ5IEVsaSBHcmV5LCBodHRwOi8vZWxpZ3JleS5jb21cbiAqIExpY2Vuc2U6IE1JVFxuICogICBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWRcbiAqL1xuXG4vKmdsb2JhbCBzZWxmICovXG4vKmpzbGludCBiaXR3aXNlOiB0cnVlLCBpbmRlbnQ6IDQsIGxheGJyZWFrOiB0cnVlLCBsYXhjb21tYTogdHJ1ZSwgc21hcnR0YWJzOiB0cnVlLCBwbHVzcGx1czogdHJ1ZSAqL1xuXG4vKiEgQHNvdXJjZSBodHRwOi8vcHVybC5lbGlncmV5LmNvbS9naXRodWIvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL0ZpbGVTYXZlci5qcyAqL1xuXG52YXIgc2F2ZUFzID0gc2F2ZUFzIHx8IChmdW5jdGlvbih2aWV3KSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXHQvLyBJRSA8MTAgaXMgZXhwbGljaXRseSB1bnN1cHBvcnRlZFxuXHRpZiAodHlwZW9mIHZpZXcgPT09IFwidW5kZWZpbmVkXCIgfHwgdHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIiAmJiAvTVNJRSBbMS05XVxcLi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXJcblx0XHQgIGRvYyA9IHZpZXcuZG9jdW1lbnRcblx0XHQgIC8vIG9ubHkgZ2V0IFVSTCB3aGVuIG5lY2Vzc2FyeSBpbiBjYXNlIEJsb2IuanMgaGFzbid0IG92ZXJyaWRkZW4gaXQgeWV0XG5cdFx0LCBnZXRfVVJMID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdmlldy5VUkwgfHwgdmlldy53ZWJraXRVUkwgfHwgdmlldztcblx0XHR9XG5cdFx0LCBzYXZlX2xpbmsgPSBkb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLCBcImFcIilcblx0XHQsIGNhbl91c2Vfc2F2ZV9saW5rID0gXCJkb3dubG9hZFwiIGluIHNhdmVfbGlua1xuXHRcdCwgY2xpY2sgPSBmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgZXZlbnQgPSBuZXcgTW91c2VFdmVudChcImNsaWNrXCIpO1xuXHRcdFx0bm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHR9XG5cdFx0LCBpc19zYWZhcmkgPSAvY29uc3RydWN0b3IvaS50ZXN0KHZpZXcuSFRNTEVsZW1lbnQpIHx8IHZpZXcuc2FmYXJpXG5cdFx0LCBpc19jaHJvbWVfaW9zID0vQ3JpT1NcXC9bXFxkXSsvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudClcblx0XHQsIHRocm93X291dHNpZGUgPSBmdW5jdGlvbihleCkge1xuXHRcdFx0KHZpZXcuc2V0SW1tZWRpYXRlIHx8IHZpZXcuc2V0VGltZW91dCkoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRocm93IGV4O1xuXHRcdFx0fSwgMCk7XG5cdFx0fVxuXHRcdCwgZm9yY2Vfc2F2ZWFibGVfdHlwZSA9IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCJcblx0XHQvLyB0aGUgQmxvYiBBUEkgaXMgZnVuZGFtZW50YWxseSBicm9rZW4gYXMgdGhlcmUgaXMgbm8gXCJkb3dubG9hZGZpbmlzaGVkXCIgZXZlbnQgdG8gc3Vic2NyaWJlIHRvXG5cdFx0LCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQgPSAxMDAwICogNDAgLy8gaW4gbXNcblx0XHQsIHJldm9rZSA9IGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdHZhciByZXZva2VyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZmlsZSA9PT0gXCJzdHJpbmdcIikgeyAvLyBmaWxlIGlzIGFuIG9iamVjdCBVUkxcblx0XHRcdFx0XHRnZXRfVVJMKCkucmV2b2tlT2JqZWN0VVJMKGZpbGUpO1xuXHRcdFx0XHR9IGVsc2UgeyAvLyBmaWxlIGlzIGEgRmlsZVxuXHRcdFx0XHRcdGZpbGUucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRzZXRUaW1lb3V0KHJldm9rZXIsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCk7XG5cdFx0fVxuXHRcdCwgZGlzcGF0Y2ggPSBmdW5jdGlvbihmaWxlc2F2ZXIsIGV2ZW50X3R5cGVzLCBldmVudCkge1xuXHRcdFx0ZXZlbnRfdHlwZXMgPSBbXS5jb25jYXQoZXZlbnRfdHlwZXMpO1xuXHRcdFx0dmFyIGkgPSBldmVudF90eXBlcy5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRcdHZhciBsaXN0ZW5lciA9IGZpbGVzYXZlcltcIm9uXCIgKyBldmVudF90eXBlc1tpXV07XG5cdFx0XHRcdGlmICh0eXBlb2YgbGlzdGVuZXIgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRsaXN0ZW5lci5jYWxsKGZpbGVzYXZlciwgZXZlbnQgfHwgZmlsZXNhdmVyKTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRcdFx0dGhyb3dfb3V0c2lkZShleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCwgYXV0b19ib20gPSBmdW5jdGlvbihibG9iKSB7XG5cdFx0XHQvLyBwcmVwZW5kIEJPTSBmb3IgVVRGLTggWE1MIGFuZCB0ZXh0LyogdHlwZXMgKGluY2x1ZGluZyBIVE1MKVxuXHRcdFx0Ly8gbm90ZTogeW91ciBicm93c2VyIHdpbGwgYXV0b21hdGljYWxseSBjb252ZXJ0IFVURi0xNiBVK0ZFRkYgdG8gRUYgQkIgQkZcblx0XHRcdGlmICgvXlxccyooPzp0ZXh0XFwvXFxTKnxhcHBsaWNhdGlvblxcL3htbHxcXFMqXFwvXFxTKlxcK3htbClcXHMqOy4qY2hhcnNldFxccyo9XFxzKnV0Zi04L2kudGVzdChibG9iLnR5cGUpKSB7XG5cdFx0XHRcdHJldHVybiBuZXcgQmxvYihbU3RyaW5nLmZyb21DaGFyQ29kZSgweEZFRkYpLCBibG9iXSwge3R5cGU6IGJsb2IudHlwZX0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGJsb2I7XG5cdFx0fVxuXHRcdCwgRmlsZVNhdmVyID0gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdGlmICghbm9fYXV0b19ib20pIHtcblx0XHRcdFx0YmxvYiA9IGF1dG9fYm9tKGJsb2IpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gRmlyc3QgdHJ5IGEuZG93bmxvYWQsIHRoZW4gd2ViIGZpbGVzeXN0ZW0sIHRoZW4gb2JqZWN0IFVSTHNcblx0XHRcdHZhclxuXHRcdFx0XHQgIGZpbGVzYXZlciA9IHRoaXNcblx0XHRcdFx0LCB0eXBlID0gYmxvYi50eXBlXG5cdFx0XHRcdCwgZm9yY2UgPSB0eXBlID09PSBmb3JjZV9zYXZlYWJsZV90eXBlXG5cdFx0XHRcdCwgb2JqZWN0X3VybFxuXHRcdFx0XHQsIGRpc3BhdGNoX2FsbCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRpc3BhdGNoKGZpbGVzYXZlciwgXCJ3cml0ZXN0YXJ0IHByb2dyZXNzIHdyaXRlIHdyaXRlZW5kXCIuc3BsaXQoXCIgXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBvbiBhbnkgZmlsZXN5cyBlcnJvcnMgcmV2ZXJ0IHRvIHNhdmluZyB3aXRoIG9iamVjdCBVUkxzXG5cdFx0XHRcdCwgZnNfZXJyb3IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAoKGlzX2Nocm9tZV9pb3MgfHwgKGZvcmNlICYmIGlzX3NhZmFyaSkpICYmIHZpZXcuRmlsZVJlYWRlcikge1xuXHRcdFx0XHRcdFx0Ly8gU2FmYXJpIGRvZXNuJ3QgYWxsb3cgZG93bmxvYWRpbmcgb2YgYmxvYiB1cmxzXG5cdFx0XHRcdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblx0XHRcdFx0XHRcdHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHVybCA9IGlzX2Nocm9tZV9pb3MgPyByZWFkZXIucmVzdWx0IDogcmVhZGVyLnJlc3VsdC5yZXBsYWNlKC9eZGF0YTpbXjtdKjsvLCAnZGF0YTphdHRhY2htZW50L2ZpbGU7Jyk7XG5cdFx0XHRcdFx0XHRcdHZhciBwb3B1cCA9IHZpZXcub3Blbih1cmwsICdfYmxhbmsnKTtcblx0XHRcdFx0XHRcdFx0aWYoIXBvcHVwKSB2aWV3LmxvY2F0aW9uLmhyZWYgPSB1cmw7XG5cdFx0XHRcdFx0XHRcdHVybD11bmRlZmluZWQ7IC8vIHJlbGVhc2UgcmVmZXJlbmNlIGJlZm9yZSBkaXNwYXRjaGluZ1xuXHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRyZWFkZXIucmVhZEFzRGF0YVVSTChibG9iKTtcblx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLklOSVQ7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIGRvbid0IGNyZWF0ZSBtb3JlIG9iamVjdCBVUkxzIHRoYW4gbmVlZGVkXG5cdFx0XHRcdFx0aWYgKCFvYmplY3RfdXJsKSB7XG5cdFx0XHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGZvcmNlKSB7XG5cdFx0XHRcdFx0XHR2aWV3LmxvY2F0aW9uLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR2YXIgb3BlbmVkID0gdmlldy5vcGVuKG9iamVjdF91cmwsIFwiX2JsYW5rXCIpO1xuXHRcdFx0XHRcdFx0aWYgKCFvcGVuZWQpIHtcblx0XHRcdFx0XHRcdFx0Ly8gQXBwbGUgZG9lcyBub3QgYWxsb3cgd2luZG93Lm9wZW4sIHNlZSBodHRwczovL2RldmVsb3Blci5hcHBsZS5jb20vbGlicmFyeS9zYWZhcmkvZG9jdW1lbnRhdGlvbi9Ub29scy9Db25jZXB0dWFsL1NhZmFyaUV4dGVuc2lvbkd1aWRlL1dvcmtpbmd3aXRoV2luZG93c2FuZFRhYnMvV29ya2luZ3dpdGhXaW5kb3dzYW5kVGFicy5odG1sXG5cdFx0XHRcdFx0XHRcdHZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHR9XG5cdFx0XHQ7XG5cdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXG5cdFx0XHRpZiAoY2FuX3VzZV9zYXZlX2xpbmspIHtcblx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2F2ZV9saW5rLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdHNhdmVfbGluay5kb3dubG9hZCA9IG5hbWU7XG5cdFx0XHRcdFx0Y2xpY2soc2F2ZV9saW5rKTtcblx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRyZXZva2Uob2JqZWN0X3VybCk7XG5cdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0ZnNfZXJyb3IoKTtcblx0XHR9XG5cdFx0LCBGU19wcm90byA9IEZpbGVTYXZlci5wcm90b3R5cGVcblx0XHQsIHNhdmVBcyA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRyZXR1cm4gbmV3IEZpbGVTYXZlcihibG9iLCBuYW1lIHx8IGJsb2IubmFtZSB8fCBcImRvd25sb2FkXCIsIG5vX2F1dG9fYm9tKTtcblx0XHR9XG5cdDtcblx0Ly8gSUUgMTArIChuYXRpdmUgc2F2ZUFzKVxuXHRpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIiAmJiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYikge1xuXHRcdHJldHVybiBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0bmFtZSA9IG5hbWUgfHwgYmxvYi5uYW1lIHx8IFwiZG93bmxvYWRcIjtcblxuXHRcdFx0aWYgKCFub19hdXRvX2JvbSkge1xuXHRcdFx0XHRibG9iID0gYXV0b19ib20oYmxvYik7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IoYmxvYiwgbmFtZSk7XG5cdFx0fTtcblx0fVxuXG5cdEZTX3Byb3RvLmFib3J0ID0gZnVuY3Rpb24oKXt9O1xuXHRGU19wcm90by5yZWFkeVN0YXRlID0gRlNfcHJvdG8uSU5JVCA9IDA7XG5cdEZTX3Byb3RvLldSSVRJTkcgPSAxO1xuXHRGU19wcm90by5ET05FID0gMjtcblxuXHRGU19wcm90by5lcnJvciA9XG5cdEZTX3Byb3RvLm9ud3JpdGVzdGFydCA9XG5cdEZTX3Byb3RvLm9ucHJvZ3Jlc3MgPVxuXHRGU19wcm90by5vbndyaXRlID1cblx0RlNfcHJvdG8ub25hYm9ydCA9XG5cdEZTX3Byb3RvLm9uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlZW5kID1cblx0XHRudWxsO1xuXG5cdHJldHVybiBzYXZlQXM7XG59KFxuXHQgICB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBzZWxmXG5cdHx8IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93XG5cdHx8IHRoaXMuY29udGVudFxuKSk7XG4vLyBgc2VsZmAgaXMgdW5kZWZpbmVkIGluIEZpcmVmb3ggZm9yIEFuZHJvaWQgY29udGVudCBzY3JpcHQgY29udGV4dFxuLy8gd2hpbGUgYHRoaXNgIGlzIG5zSUNvbnRlbnRGcmFtZU1lc3NhZ2VNYW5hZ2VyXG4vLyB3aXRoIGFuIGF0dHJpYnV0ZSBgY29udGVudGAgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgd2luZG93XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzLnNhdmVBcyA9IHNhdmVBcztcbn0gZWxzZSBpZiAoKHR5cGVvZiBkZWZpbmUgIT09IFwidW5kZWZpbmVkXCIgJiYgZGVmaW5lICE9PSBudWxsKSAmJiAoZGVmaW5lLmFtZCAhPT0gbnVsbCkpIHtcbiAgZGVmaW5lKFwiRmlsZVNhdmVyLmpzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzYXZlQXM7XG4gIH0pO1xufVxuIiwiZnVuY3Rpb24gZ2V0RWxlbUNvdW50QnlOYW1lKG5hbWUpIHtcbiAgICB2YXIgbmFtZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZShuYW1lKTtcbiAgICByZXR1cm4gbmFtZXMubGVuZ3RoO1xufVxuXG5mdW5jdGlvbiBnZXRGb3JtVmFsdWVzKGZvcm1FbGVtZW50KSB7XG4gICAgdmFyIGZvcm1FbGVtZW50cyA9IGZvcm1FbGVtZW50LmVsZW1lbnRzO1xuICAgIHZhciBmb3JtUGFyYW1zID0ge307XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBlbGVtID0gbnVsbDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZm9ybUVsZW1lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGVsZW0gPSBmb3JtRWxlbWVudHNbaV07XG4gICAgICAgIHN3aXRjaCAoZWxlbS50eXBlKSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0uY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0VmFsdWVzID0gZ2V0U2VsZWN0VmFsdWVzKGVsZW0pO1xuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBzZWxlY3RWYWx1ZXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS52YWx1ZSAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZm9ybVBhcmFtcztcbn1cblxuZnVuY3Rpb24gc2V0Rm9ybVZhbHVlcyhmb3JtRWxlbWVudCwgdmFsdWVzKSB7XG4gICAgdmFyIGZvcm1FbGVtZW50cyA9IGZvcm1FbGVtZW50LmVsZW1lbnRzO1xuICAgIHZhciBmb3JtUGFyYW1zID0ge307XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBlbGVtID0gbnVsbDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZm9ybUVsZW1lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGVsZW0gPSBmb3JtRWxlbWVudHNbaV07XG5cbiAgICAgICAgc3dpdGNoIChlbGVtLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdID09PSBlbGVtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSA9PT0gZWxlbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFNlbGVjdFZhbHVlcyhlbGVtLCB2YWx1ZXNbZWxlbS5uYW1lXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS52YWx1ZSA9IHZhbHVlc1tlbGVtLm5hbWVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRTZWxlY3RWYWx1ZXMoc2VsZWN0RWxlbSwgdmFsdWVzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBzZWxlY3RFbGVtLm9wdGlvbnM7XG4gICAgdmFyIG9wdDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcbiAgICAgICAgaWYgKHZhbHVlcy5pbmRleE9mKG9wdC52YWx1ZSkgPiAtMSkge1xuICAgICAgICAgICAgb3B0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRTZWxlY3RWYWx1ZXMoc2VsZWN0KSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0ICYmIHNlbGVjdC5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IG9wdGlvbnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgICAgIG9wdCA9IG9wdGlvbnNbaV07XG5cbiAgICAgICAgaWYgKG9wdC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gob3B0LnZhbHVlIHx8IG9wdC50ZXh0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBnZXRTZXRGb3JtVmFsdWVzKCkge1xuICAgIHRoaXMuc2V0ID0gc2V0Rm9ybVZhbHVlcztcbiAgICB0aGlzLmdldCA9IGdldEZvcm1WYWx1ZXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U2V0Rm9ybVZhbHVlcztcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBvYmpUeXBlID0gcmVxdWlyZSgnb2JqLXR5cGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZWwsIHN0cikge1xuXHRpZiAob2JqVHlwZShlbCkuaW5kZXhPZignZWxlbWVudCcpID09PSAtMSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGFuIEhUTUwgRE9NIGVsZW1lbnQgYXMgZmlyc3QgYXJndW1lbnQnKTtcblx0fVxuXG5cdGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgc3RyaW5nIGFzIHNlY29uZCBhcmd1bWVudCcpO1xuXHR9XG5cblx0aWYgKGVsLmNsYXNzTGlzdCkge1xuXHRcdHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoc3RyKTtcblx0fVxuXG5cdHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBzdHIgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG59O1xuIiwidmFyIHRpbnlTYW1wbGVMb2FkZXIgPSByZXF1aXJlKCd0aW55LXNhbXBsZS1sb2FkZXInKTtcbnZhciBhdWRpb0J1ZmZlckluc3RydW1lbnQgPSByZXF1aXJlKCdhdWRpby1idWZmZXItaW5zdHJ1bWVudCcpO1xuXG5mdW5jdGlvbiBnZXRKU09OKHVybCkge1xuXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgcmVxdWVzdC5vcGVuKCdnZXQnLCB1cmwsIHRydWUpO1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICd0ZXh0JztcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ0pTT04gY291bGQgbm90IGJlIGxvYWRlZCAnICsgdXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxudmFyIGJ1ZmZlcnMgPSB7fTtcbmZ1bmN0aW9uIGdldFNhbXBsZVByb21pc2VzIChjdHgsIGRhdGEpIHtcbiAgICB2YXIgYmFzZVVybCA9IGRhdGEuc2FtcGxlcztcbiAgICB2YXIgcHJvbWlzZXMgPSBbXTtcblxuICAgIGRhdGEuZmlsZW5hbWUgPSBbXTtcbiAgICB2YXIgaSA9IDA7XG4gICAgZGF0YS5maWxlcy5mb3JFYWNoKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFyIGZpbGVuYW1lID0gdmFsLnJlcGxhY2UoL1xcLlteLy5dKyQvLCBcIlwiKTtcbiAgICAgICAgZGF0YS5maWxlbmFtZS5wdXNoKGZpbGVuYW1lKTtcbiAgICAgICAgdmFyIHJlbW90ZVVybCA9IGJhc2VVcmwgKyB2YWw7XG5cbiAgICAgICAgbGV0IGxvYWRlclByb21pc2UgPSB0aW55U2FtcGxlTG9hZGVyKHJlbW90ZVVybCwgY3R4KTtcbiAgICAgICAgbG9hZGVyUHJvbWlzZS50aGVuKGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgICAgIGJ1ZmZlcnNbZmlsZW5hbWVdID0gbmV3IGF1ZGlvQnVmZmVySW5zdHJ1bWVudChjdHgsIGJ1ZmZlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHByb21pc2VzLnB1c2gobG9hZGVyUHJvbWlzZSk7XG5cbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gcHJvbWlzZXM7XG5cbn1cblxuZnVuY3Rpb24gc2FtcGxlQWxsUHJvbWlzZShjdHgsIGRhdGFVcmwpIHtcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgXG4gICAgICAgIHZhciBqc29uUHJvbWlzZSA9IGdldEpTT04oZGF0YVVybCk7XG4gICAgICAgIGpzb25Qcm9taXNlLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgdmFyIHNhbXBsZVByb21pc2VzID0gZ2V0U2FtcGxlUHJvbWlzZXMoY3R4LCBkYXRhKTtcbiAgICAgICAgICAgIFByb21pc2UuYWxsKHNhbXBsZVByb21pc2VzKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe2RhdGE6IGRhdGEsIGJ1ZmZlcnM6IGJ1ZmZlcnN9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5jYXRjaCAoZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG5mdW5jdGlvbiBsb2FkU2FtcGxlU2V0KGN0eCwgZGF0YVVybCkge1xuICAgIHJldHVybiBzYW1wbGVBbGxQcm9taXNlKGN0eCwgZGF0YVVybCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbG9hZFNhbXBsZVNldDsiLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcblx0cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopLnJlcGxhY2UoL15cXFtvYmplY3QgKC4rKVxcXSQvLCAnJDEnKS50b0xvd2VyQ2FzZSgpO1xufTtcbiIsImZ1bmN0aW9uIHNlbGVjdEVsZW1lbnQoYXBwZW5kVG9JRCwgc2VsZWN0SUQsIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG5cbiAgICB0aGlzLmFwcGVuZFRvSUQgPSBhcHBlbmRUb0lEO1xuICAgIHRoaXMuc2VsZWN0SUQgPSBzZWxlY3RJRDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuc2VsZWN0ZWQgPSBzZWxlY3RlZDtcbiAgICBcbiAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXBwZW5kVG9JRCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuYXBwZW5kVG9JRCk7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNlbGVjdFwiKTtcbiAgICAgICAgc2VsZWN0TGlzdC5pZCA9IHRoaXMuc2VsZWN0SUQ7ICAgICAgICBcbiAgICAgICAgYXBwZW5kVG9JRC5hcHBlbmRDaGlsZChzZWxlY3RMaXN0KTtcbiAgICAgICAgdGhpcy51cGRhdGUoc2VsZWN0SUQsIHRoaXMub3B0aW9ucywgdGhpcy5zZWxlY3RlZCk7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uIChlbGVtLCBvcHRpb25zLCBzZWxlY3RlZCkge1xuICAgICAgICB0aGlzLmRlbGV0ZShlbGVtKTtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpO1xuICAgICAgICAgICAgb3B0aW9uLnZhbHVlID0ga2V5O1xuICAgICAgICAgICAgb3B0aW9uLnRleHQgPSBvcHRpb25zW2tleV07XG4gICAgICAgICAgICBzZWxlY3RMaXN0LmFwcGVuZENoaWxkKG9wdGlvbik7XG5cbiAgICAgICAgICAgIGlmIChrZXkgPT09IHNlbGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRTZWxlY3RlZCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIHZhciBvcHQ7XG4gICAgICAgIGZvciAoIHZhciBpID0gMCwgbGVuID0gc2VsZWN0TGlzdC5vcHRpb25zLmxlbmd0aDsgaSA8IGxlbjsgaSsrICkge1xuICAgICAgICAgICAgb3B0ID0gc2VsZWN0TGlzdC5vcHRpb25zW2ldO1xuICAgICAgICAgICAgaWYgKCBvcHQuc2VsZWN0ZWQgPT09IHRydWUgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdC52YWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBvcHRpb24gaW4gc2VsZWN0TGlzdCl7XG4gICAgICAgICAgICBzZWxlY3RMaXN0LnJlbW92ZShvcHRpb24pO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldEFzU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuYXBwZW5kVG9JRCk7XG4gICAgICAgIHZhciBlbGVtZW50SHRtbCA9IGVsZW1lbnQub3V0ZXJIVE1MO1xuICAgICAgICByZXR1cm4gZWxlbWVudEh0bWw7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZWxlY3RFbGVtZW50OyIsImZ1bmN0aW9uIHNhbXBsZUxvYWRlciAodXJsLCBjb250ZXh0KSB7XG4gICAgXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIFxuICAgICAgICByZXF1ZXN0Lm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZihyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKXtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCd0aW55LXNhbXBsZS1sb2FkZXIgcmVxdWVzdCBmYWlsZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5tb2R1bGUuZXhwb3J0cyA9IHNhbXBsZUxvYWRlcjsiLCJ2YXIgV0FBQ2xvY2sgPSByZXF1aXJlKCcuL2xpYi9XQUFDbG9jaycpXG5cbm1vZHVsZS5leHBvcnRzID0gV0FBQ2xvY2tcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgd2luZG93LldBQUNsb2NrID0gV0FBQ2xvY2tcbiIsInZhciBpc0Jyb3dzZXIgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG5cbnZhciBDTE9DS19ERUZBVUxUUyA9IHtcbiAgdG9sZXJhbmNlTGF0ZTogMC4xMCxcbiAgdG9sZXJhbmNlRWFybHk6IDAuMDAxXG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IEV2ZW50ID09PT09PT09PT09PT09PT09PT09IC8vXG52YXIgRXZlbnQgPSBmdW5jdGlvbihjbG9jaywgZGVhZGxpbmUsIGZ1bmMpIHtcbiAgdGhpcy5jbG9jayA9IGNsb2NrXG4gIHRoaXMuZnVuYyA9IGZ1bmNcbiAgdGhpcy5fY2xlYXJlZCA9IGZhbHNlIC8vIEZsYWcgdXNlZCB0byBjbGVhciBhbiBldmVudCBpbnNpZGUgY2FsbGJhY2tcblxuICB0aGlzLnRvbGVyYW5jZUxhdGUgPSBjbG9jay50b2xlcmFuY2VMYXRlXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBjbG9jay50b2xlcmFuY2VFYXJseVxuICB0aGlzLl9sYXRlc3RUaW1lID0gbnVsbFxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSBudWxsXG4gIHRoaXMuZGVhZGxpbmUgPSBudWxsXG4gIHRoaXMucmVwZWF0VGltZSA9IG51bGxcblxuICB0aGlzLnNjaGVkdWxlKGRlYWRsaW5lKVxufVxuXG4vLyBVbnNjaGVkdWxlcyB0aGUgZXZlbnRcbkV2ZW50LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICB0aGlzLl9jbGVhcmVkID0gdHJ1ZVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBTZXRzIHRoZSBldmVudCB0byByZXBlYXQgZXZlcnkgYHRpbWVgIHNlY29uZHMuXG5FdmVudC5wcm90b3R5cGUucmVwZWF0ID0gZnVuY3Rpb24odGltZSkge1xuICBpZiAodGltZSA9PT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2RlbGF5IGNhbm5vdCBiZSAwJylcbiAgdGhpcy5yZXBlYXRUaW1lID0gdGltZVxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSlcbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gU2V0cyB0aGUgdGltZSB0b2xlcmFuY2Ugb2YgdGhlIGV2ZW50LlxuLy8gVGhlIGV2ZW50IHdpbGwgYmUgZXhlY3V0ZWQgaW4gdGhlIGludGVydmFsIGBbZGVhZGxpbmUgLSBlYXJseSwgZGVhZGxpbmUgKyBsYXRlXWBcbi8vIElmIHRoZSBjbG9jayBmYWlscyB0byBleGVjdXRlIHRoZSBldmVudCBpbiB0aW1lLCB0aGUgZXZlbnQgd2lsbCBiZSBkcm9wcGVkLlxuRXZlbnQucHJvdG90eXBlLnRvbGVyYW5jZSA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICBpZiAodHlwZW9mIHZhbHVlcy5sYXRlID09PSAnbnVtYmVyJylcbiAgICB0aGlzLnRvbGVyYW5jZUxhdGUgPSB2YWx1ZXMubGF0ZVxuICBpZiAodHlwZW9mIHZhbHVlcy5lYXJseSA9PT0gJ251bWJlcicpXG4gICAgdGhpcy50b2xlcmFuY2VFYXJseSA9IHZhbHVlcy5lYXJseVxuICB0aGlzLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMoKVxuICBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBldmVudCBpcyByZXBlYXRlZCwgZmFsc2Ugb3RoZXJ3aXNlXG5FdmVudC5wcm90b3R5cGUuaXNSZXBlYXRlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yZXBlYXRUaW1lICE9PSBudWxsIH1cblxuLy8gU2NoZWR1bGVzIHRoZSBldmVudCB0byBiZSByYW4gYmVmb3JlIGBkZWFkbGluZWAuXG4vLyBJZiB0aGUgdGltZSBpcyB3aXRoaW4gdGhlIGV2ZW50IHRvbGVyYW5jZSwgd2UgaGFuZGxlIHRoZSBldmVudCBpbW1lZGlhdGVseS5cbi8vIElmIHRoZSBldmVudCB3YXMgYWxyZWFkeSBzY2hlZHVsZWQgYXQgYSBkaWZmZXJlbnQgdGltZSwgaXQgaXMgcmVzY2hlZHVsZWQuXG5FdmVudC5wcm90b3R5cGUuc2NoZWR1bGUgPSBmdW5jdGlvbihkZWFkbGluZSkge1xuICB0aGlzLl9jbGVhcmVkID0gZmFsc2VcbiAgdGhpcy5kZWFkbGluZSA9IGRlYWRsaW5lXG4gIHRoaXMuX3JlZnJlc2hFYXJseUxhdGVEYXRlcygpXG5cbiAgaWYgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA+PSB0aGlzLl9lYXJsaWVzdFRpbWUpIHtcbiAgICB0aGlzLl9leGVjdXRlKClcbiAgXG4gIH0gZWxzZSBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIFxuICB9IGVsc2UgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbn1cblxuRXZlbnQucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgcmF0aW8pIHtcbiAgaWYgKHRoaXMuaXNSZXBlYXRlZCgpKVxuICAgIHRoaXMucmVwZWF0VGltZSA9IHRoaXMucmVwZWF0VGltZSAqIHJhdGlvXG5cbiAgdmFyIGRlYWRsaW5lID0gdFJlZiArIHJhdGlvICogKHRoaXMuZGVhZGxpbmUgLSB0UmVmKVxuICAvLyBJZiB0aGUgZGVhZGxpbmUgaXMgdG9vIGNsb3NlIG9yIHBhc3QsIGFuZCB0aGUgZXZlbnQgaGFzIGEgcmVwZWF0LFxuICAvLyB3ZSBjYWxjdWxhdGUgdGhlIG5leHQgcmVwZWF0IHBvc3NpYmxlIGluIHRoZSBzdHJldGNoZWQgc3BhY2UuXG4gIGlmICh0aGlzLmlzUmVwZWF0ZWQoKSkge1xuICAgIHdoaWxlICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPj0gZGVhZGxpbmUgLSB0aGlzLnRvbGVyYW5jZUVhcmx5KVxuICAgICAgZGVhZGxpbmUgKz0gdGhpcy5yZXBlYXRUaW1lXG4gIH1cbiAgdGhpcy5zY2hlZHVsZShkZWFkbGluZSlcbn1cblxuLy8gRXhlY3V0ZXMgdGhlIGV2ZW50XG5FdmVudC5wcm90b3R5cGUuX2V4ZWN1dGUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY2xvY2suX3N0YXJ0ZWQgPT09IGZhbHNlKSByZXR1cm5cbiAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcblxuICBpZiAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lIDwgdGhpcy5fbGF0ZXN0VGltZSlcbiAgICB0aGlzLmZ1bmModGhpcylcbiAgZWxzZSB7XG4gICAgaWYgKHRoaXMub25leHBpcmVkKSB0aGlzLm9uZXhwaXJlZCh0aGlzKVxuICAgIGNvbnNvbGUud2FybignZXZlbnQgZXhwaXJlZCcpXG4gIH1cbiAgLy8gSW4gdGhlIGNhc2UgYHNjaGVkdWxlYCBpcyBjYWxsZWQgaW5zaWRlIGBmdW5jYCwgd2UgbmVlZCB0byBhdm9pZFxuICAvLyBvdmVycndyaXRpbmcgd2l0aCB5ZXQgYW5vdGhlciBgc2NoZWR1bGVgLlxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpICYmIHRoaXMuaXNSZXBlYXRlZCgpICYmICF0aGlzLl9jbGVhcmVkKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSkgXG59XG5cbi8vIFVwZGF0ZXMgY2FjaGVkIHRpbWVzXG5FdmVudC5wcm90b3R5cGUuX3JlZnJlc2hFYXJseUxhdGVEYXRlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9sYXRlc3RUaW1lID0gdGhpcy5kZWFkbGluZSArIHRoaXMudG9sZXJhbmNlTGF0ZVxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSB0aGlzLmRlYWRsaW5lIC0gdGhpcy50b2xlcmFuY2VFYXJseVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBXQUFDbG9jayA9PT09PT09PT09PT09PT09PT09PSAvL1xudmFyIFdBQUNsb2NrID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICBvcHRzID0gb3B0cyB8fCB7fVxuICB0aGlzLnRpY2tNZXRob2QgPSBvcHRzLnRpY2tNZXRob2QgfHwgJ1NjcmlwdFByb2Nlc3Nvck5vZGUnXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBvcHRzLnRvbGVyYW5jZUVhcmx5IHx8IENMT0NLX0RFRkFVTFRTLnRvbGVyYW5jZUVhcmx5XG4gIHRoaXMudG9sZXJhbmNlTGF0ZSA9IG9wdHMudG9sZXJhbmNlTGF0ZSB8fCBDTE9DS19ERUZBVUxUUy50b2xlcmFuY2VMYXRlXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHRcbiAgdGhpcy5fZXZlbnRzID0gW11cbiAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlXG59XG5cbi8vIC0tLS0tLS0tLS0gUHVibGljIEFQSSAtLS0tLS0tLS0tIC8vXG4vLyBTY2hlZHVsZXMgYGZ1bmNgIHRvIHJ1biBhZnRlciBgZGVsYXlgIHNlY29uZHMuXG5XQUFDbG9jay5wcm90b3R5cGUuc2V0VGltZW91dCA9IGZ1bmN0aW9uKGZ1bmMsIGRlbGF5KSB7XG4gIHJldHVybiB0aGlzLl9jcmVhdGVFdmVudChmdW5jLCB0aGlzLl9hYnNUaW1lKGRlbGF5KSlcbn1cblxuLy8gU2NoZWR1bGVzIGBmdW5jYCB0byBydW4gYmVmb3JlIGBkZWFkbGluZWAuXG5XQUFDbG9jay5wcm90b3R5cGUuY2FsbGJhY2tBdFRpbWUgPSBmdW5jdGlvbihmdW5jLCBkZWFkbGluZSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRXZlbnQoZnVuYywgZGVhZGxpbmUpXG59XG5cbi8vIFN0cmV0Y2hlcyBgZGVhZGxpbmVgIGFuZCBgcmVwZWF0YCBvZiBhbGwgc2NoZWR1bGVkIGBldmVudHNgIGJ5IGByYXRpb2AsIGtlZXBpbmdcbi8vIHRoZWlyIHJlbGF0aXZlIGRpc3RhbmNlIHRvIGB0UmVmYC4gSW4gZmFjdCB0aGlzIGlzIGVxdWl2YWxlbnQgdG8gY2hhbmdpbmcgdGhlIHRlbXBvLlxuV0FBQ2xvY2sucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgZXZlbnRzLCByYXRpbykge1xuICBldmVudHMuZm9yRWFjaChmdW5jdGlvbihldmVudCkgeyBldmVudC50aW1lU3RyZXRjaCh0UmVmLCByYXRpbykgfSlcbiAgcmV0dXJuIGV2ZW50c1xufVxuXG4vLyBSZW1vdmVzIGFsbCBzY2hlZHVsZWQgZXZlbnRzIGFuZCBzdGFydHMgdGhlIGNsb2NrIFxuV0FBQ2xvY2sucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9zdGFydGVkID09PSBmYWxzZSkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHRoaXMuX3N0YXJ0ZWQgPSB0cnVlXG4gICAgdGhpcy5fZXZlbnRzID0gW11cblxuICAgIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdTY3JpcHRQcm9jZXNzb3JOb2RlJykge1xuICAgICAgdmFyIGJ1ZmZlclNpemUgPSAyNTZcbiAgICAgIC8vIFdlIGhhdmUgdG8ga2VlcCBhIHJlZmVyZW5jZSB0byB0aGUgbm9kZSB0byBhdm9pZCBnYXJiYWdlIGNvbGxlY3Rpb25cbiAgICAgIHRoaXMuX2Nsb2NrTm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgMSwgMSlcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbilcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHsgc2VsZi5fdGljaygpIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdtYW51YWwnKSBudWxsIC8vIF90aWNrIGlzIGNhbGxlZCBtYW51YWxseVxuXG4gICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgdGlja01ldGhvZCAnICsgdGhpcy50aWNrTWV0aG9kKVxuICB9XG59XG5cbi8vIFN0b3BzIHRoZSBjbG9ja1xuV0FBQ2xvY2sucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3N0YXJ0ZWQgPT09IHRydWUpIHtcbiAgICB0aGlzLl9zdGFydGVkID0gZmFsc2VcbiAgICB0aGlzLl9jbG9ja05vZGUuZGlzY29ubmVjdCgpXG4gIH0gIFxufVxuXG4vLyAtLS0tLS0tLS0tIFByaXZhdGUgLS0tLS0tLS0tLSAvL1xuXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIHJhbiBwZXJpb2RpY2FsbHksIGFuZCBhdCBlYWNoIHRpY2sgaXQgZXhlY3V0ZXNcbi8vIGV2ZW50cyBmb3Igd2hpY2ggYGN1cnJlbnRUaW1lYCBpcyBpbmNsdWRlZCBpbiB0aGVpciB0b2xlcmFuY2UgaW50ZXJ2YWwuXG5XQUFDbG9jay5wcm90b3R5cGUuX3RpY2sgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGV2ZW50ID0gdGhpcy5fZXZlbnRzLnNoaWZ0KClcblxuICB3aGlsZShldmVudCAmJiBldmVudC5fZWFybGllc3RUaW1lIDw9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZSkge1xuICAgIGV2ZW50Ll9leGVjdXRlKClcbiAgICBldmVudCA9IHRoaXMuX2V2ZW50cy5zaGlmdCgpXG4gIH1cblxuICAvLyBQdXQgYmFjayB0aGUgbGFzdCBldmVudFxuICBpZihldmVudCkgdGhpcy5fZXZlbnRzLnVuc2hpZnQoZXZlbnQpXG59XG5cbi8vIENyZWF0ZXMgYW4gZXZlbnQgYW5kIGluc2VydCBpdCB0byB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9jcmVhdGVFdmVudCA9IGZ1bmN0aW9uKGZ1bmMsIGRlYWRsaW5lKSB7XG4gIHJldHVybiBuZXcgRXZlbnQodGhpcywgZGVhZGxpbmUsIGZ1bmMpXG59XG5cbi8vIEluc2VydHMgYW4gZXZlbnQgdG8gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5faW5zZXJ0RXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLl9ldmVudHMuc3BsaWNlKHRoaXMuX2luZGV4QnlUaW1lKGV2ZW50Ll9lYXJsaWVzdFRpbWUpLCAwLCBldmVudClcbn1cblxuLy8gUmVtb3ZlcyBhbiBldmVudCBmcm9tIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX3JlbW92ZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGluZCA9IHRoaXMuX2V2ZW50cy5pbmRleE9mKGV2ZW50KVxuICBpZiAoaW5kICE9PSAtMSkgdGhpcy5fZXZlbnRzLnNwbGljZShpbmQsIDEpXG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiBgZXZlbnRgIGlzIGluIHF1ZXVlLCBmYWxzZSBvdGhlcndpc2VcbldBQUNsb2NrLnByb3RvdHlwZS5faGFzRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuIHJldHVybiB0aGlzLl9ldmVudHMuaW5kZXhPZihldmVudCkgIT09IC0xXG59XG5cbi8vIFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBldmVudCB3aG9zZSBkZWFkbGluZSBpcyA+PSB0byBgZGVhZGxpbmVgXG5XQUFDbG9jay5wcm90b3R5cGUuX2luZGV4QnlUaW1lID0gZnVuY3Rpb24oZGVhZGxpbmUpIHtcbiAgLy8gcGVyZm9ybXMgYSBiaW5hcnkgc2VhcmNoXG4gIHZhciBsb3cgPSAwXG4gICAgLCBoaWdoID0gdGhpcy5fZXZlbnRzLmxlbmd0aFxuICAgICwgbWlkXG4gIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgbWlkID0gTWF0aC5mbG9vcigobG93ICsgaGlnaCkgLyAyKVxuICAgIGlmICh0aGlzLl9ldmVudHNbbWlkXS5fZWFybGllc3RUaW1lIDwgZGVhZGxpbmUpXG4gICAgICBsb3cgPSBtaWQgKyAxXG4gICAgZWxzZSBoaWdoID0gbWlkXG4gIH1cbiAgcmV0dXJuIGxvd1xufVxuXG4vLyBDb252ZXJ0cyBmcm9tIHJlbGF0aXZlIHRpbWUgdG8gYWJzb2x1dGUgdGltZVxuV0FBQ2xvY2sucHJvdG90eXBlLl9hYnNUaW1lID0gZnVuY3Rpb24ocmVsVGltZSkge1xuICByZXR1cm4gcmVsVGltZSArIHRoaXMuY29udGV4dC5jdXJyZW50VGltZVxufVxuXG4vLyBDb252ZXJ0cyBmcm9tIGFic29sdXRlIHRpbWUgdG8gcmVsYXRpdmUgdGltZSBcbldBQUNsb2NrLnByb3RvdHlwZS5fcmVsVGltZSA9IGZ1bmN0aW9uKGFic1RpbWUpIHtcbiAgcmV0dXJuIGFic1RpbWUgLSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWVcbn0iLCJmdW5jdGlvbiBhdWRpb0Rpc3RvcnRpb25Ob2RlKGN0eCkge1xuXG4gICAgdGhpcy5jdHggPSBjdHg7XG4gICAgdGhpcy5kaXN0b3J0aW9uO1xuICAgIHRoaXMuYW1vdW50ID0gNDAwO1xuXG4gICAgdGhpcy5nZXREaXN0b3J0aW9uTm9kZSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcblxuICAgICAgICBpZiAoYW1vdW50KSB7XG4gICAgICAgICAgICB0aGlzLmFtb3VudCA9IGFtb3VudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZGlzdG9ydGlvbiA9IHRoaXMuY3R4LmNyZWF0ZVdhdmVTaGFwZXIoKTtcbiAgICAgICAgdGhpcy5kaXN0b3J0aW9uLm92ZXJzYW1wbGUgPSAnNHgnO1xuICAgICAgICB0aGlzLmRpc3RvcnRpb24uY3VydmUgPSB0aGlzLm1ha2VEaXN0b3J0aW9uQ3VydmUodGhpcy5hbW91bnQpO1xuICAgICAgICByZXR1cm4gdGhpcy5kaXN0b3J0aW9uO1xuICAgIH1cblxuICAgIHRoaXMubWFrZURpc3RvcnRpb25DdXJ2ZSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcbiAgICAgICAgdmFyIGsgPSB0eXBlb2YgYW1vdW50ID09PSAnbnVtYmVyJyA/IGFtb3VudCA6IDUwLFxuICAgICAgICAgICAgICAgIG5fc2FtcGxlcyA9IDQ0MTAwLFxuICAgICAgICAgICAgICAgIGN1cnZlID0gbmV3IEZsb2F0MzJBcnJheShuX3NhbXBsZXMpLFxuICAgICAgICAgICAgICAgIGRlZyA9IE1hdGguUEkgLyAxODAsXG4gICAgICAgICAgICAgICAgaSA9IDAsXG4gICAgICAgICAgICAgICAgeDtcbiAgICAgICAgZm9yICg7IGkgPCBuX3NhbXBsZXM7ICsraSkge1xuICAgICAgICAgICAgeCA9IGkgKiAyIC8gbl9zYW1wbGVzIC0gMTtcbiAgICAgICAgICAgIGN1cnZlW2ldID0gKDMgKyBrKSAqIHggKiAyMCAqIGRlZyAvIChNYXRoLlBJICsgayAqIE1hdGguYWJzKHgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VydmU7XG5cbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGF1ZGlvRGlzdG9ydGlvbk5vZGU7IiwiY29uc3QgZ2V0U2V0Rm9ybVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1zZXQtZm9ybS12YWx1ZXMnKTtcblxuZnVuY3Rpb24gZ2V0U2V0Q29udHJvbHMoKSB7XG5cbiAgICB0aGlzLmdldFRyYWNrZXJDb250cm9scyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIGxldCBmb3JtVmFsdWVzID0gbmV3IGdldFNldEZvcm1WYWx1ZXMoKTtcbiAgICAgICAgbGV0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXJDb250cm9sc1wiKTtcbiAgICAgICAgbGV0IHZhbHVlcyA9IGZvcm1WYWx1ZXMuZ2V0KGZvcm0pO1xuICAgICAgICBsZXQgcmV0ID0ge307XG4gICAgICAgIGZvciAobGV0IGtleSBpbiB2YWx1ZXMpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2RlbGF5RW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9ICdkZWxheSc7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoa2V5ID09PSAnZ2FpbkVuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSAnZ2Fpbic7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdzYW1wbGVTZXQnKSB7IFxuICAgICAgICAgICAgICAgIHJldFtrZXldID0gdmFsdWVzW2tleV07XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXRba2V5XSA9IHBhcnNlRmxvYXQodmFsdWVzW2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgdGhpcy5zZXRUcmFja2VyQ29udHJvbHMgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgICAgIGlmICghdmFsdWVzKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSB0aGlzLmdldFRyYWNrZXJDb250cm9scygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHZhbHVlcztcbiAgICB9OyAgXG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRTZXRDb250cm9scztcbiIsIi8vIHJlcXVpcmUoXCJiYWJlbC1wb2x5ZmlsbFwiKTsgXG5jb25zdCBsb2FkU2FtcGxlU2V0ID0gcmVxdWlyZSgnbG9hZC1zYW1wbGUtc2V0Jyk7XG5jb25zdCBzZWxlY3RFbGVtZW50ID0gcmVxdWlyZSgnc2VsZWN0LWVsZW1lbnQnKTtcbmNvbnN0IGdldFNldEZvcm1WYWx1ZXMgPSByZXF1aXJlKCdnZXQtc2V0LWZvcm0tdmFsdWVzJyk7XG5jb25zdCBhZHNyR2Fpbk5vZGUgPSByZXF1aXJlKCdhZHNyLWdhaW4tbm9kZScpO1xuY29uc3QgdHJhY2tlclRhYmxlID0gcmVxdWlyZSgnLi90cmFja2VyLXRhYmxlJyk7XG5jb25zdCBzY2hlZHVsZU1lYXN1cmUgPSByZXF1aXJlKCcuL3NjaGVkdWxlLW1lYXN1cmUnKTtcbmNvbnN0IGF1ZGlvRGlzdG9ydGlvbk5vZGUgPSByZXF1aXJlKCcuL2F1ZGlvLWRpc3RvcnRpb24tbm9kZScpO1xuY29uc3Qgc2FtcGxlTG9hZGVyID0gcmVxdWlyZSgndGlueS1zYW1wbGUtbG9hZGVyJyk7XG5jb25zdCBGaWxlU2F2ZXIgPSByZXF1aXJlKCdmaWxlLXNhdmVyJyk7XG4vLyB2YXIgJCA9IHJlcXVpcmUoJ2NoZWVyaW8nKTtcblxuY29uc3QgZ2V0U2V0Q29udHJvbHMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IGdldFNldEF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRTZXRDb250cm9scygpO1xuXG5jb25zdCBjdHggPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5jb25zdCBkZWZhdWx0VHJhY2sgPSByZXF1aXJlKCcuL3RyYWNrLTInKTtcblxudmFyIGJ1ZmZlcnM7XG52YXIgY3VycmVudFNhbXBsZURhdGE7XG52YXIgc3RvcmFnZTtcbnZhciB0cmFja2VyRGVidWc7XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCB0cmFjaykge1xuXG4gICAgdmFyIHNhbXBsZVNldFByb21pc2UgPSBsb2FkU2FtcGxlU2V0KGN0eCwgZGF0YVVybCk7XG4gICAgc2FtcGxlU2V0UHJvbWlzZS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgYnVmZmVycyA9IGRhdGEuYnVmZmVycztcbiAgICAgICAgc2FtcGxlRGF0YSA9IGRhdGEuZGF0YTtcblxuICAgICAgICBpZiAoIXRyYWNrKSB7XG4gICAgICAgICAgICB0cmFjayA9IHN0b3JhZ2UuZ2V0VHJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCkge1xuICAgICAgICAgICAgdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCA9IDE2O1xuICAgICAgICB9XG5cbiAgICAgICAgY3VycmVudFNhbXBsZURhdGEgPSBzYW1wbGVEYXRhO1xuICAgICAgICBzZXR1cFRyYWNrZXJIdG1sKHNhbXBsZURhdGEsIHRyYWNrLnNldHRpbmdzLm1lYXN1cmVMZW5ndGgpO1xuICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjay5iZWF0KTtcbiAgICAgICAgc2NoZWR1bGUuc2V0dXBFdmVudHMoKTtcbiAgICB9KTtcbiAgIFxufVxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG5cbiAgICBmb3JtVmFsdWVzLnNldChmb3JtLCBkZWZhdWx0VHJhY2suc2V0dGluZ3MpO1xuICAgIGdldFNldEF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoZGVmYXVsdFRyYWNrLnNldHRpbmdzKTtcblxuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkZWZhdWx0VHJhY2suc2V0dGluZ3Muc2FtcGxlU2V0LCBkZWZhdWx0VHJhY2spO1xuICAgIHNldHVwQmFzZUV2ZW50cygpO1xuXG4gICAgc3RvcmFnZSA9IG5ldyB0cmFja3NMb2NhbFN0b3JhZ2UoKTtcbiAgICBzdG9yYWdlLnNldHVwU3RvcmFnZSgpO1xufTtcblxudmFyIGluc3RydW1lbnREYXRhID0ge307XG5mdW5jdGlvbiBzZXR1cFRyYWNrZXJIdG1sKGRhdGEsIG1lYXN1cmVMZW5ndGgpIHtcbiAgICBpbnN0cnVtZW50RGF0YSA9IGRhdGE7XG4gICAgaW5zdHJ1bWVudERhdGEudGl0bGUgPSBpbnN0cnVtZW50RGF0YS5maWxlbmFtZTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlci1wYXJlbnRcIikuaW5uZXJIVE1MID0gJyc7XG4gICAgc2NoZWR1bGUuZHJhd1RyYWNrZXIoZGF0YS5maWxlbmFtZS5sZW5ndGgsIG1lYXN1cmVMZW5ndGgsIGluc3RydW1lbnREYXRhKTtcbiAgICByZXR1cm47XG59XG5cbmZ1bmN0aW9uIGRpc2Nvbm5lY3ROb2RlKG5vZGUsIG9wdGlvbnMpIHtcbiAgICBsZXQgdG90YWxMZW5ndGggPVxuICAgICAgICBvcHRpb25zLmF0dGFja1RpbWUgKyBvcHRpb25zLnN1c3RhaW5UaW1lICsgb3B0aW9ucy5yZWxlYXNlVGltZTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgbm9kZS5kaXNjb25uZWN0KCk7XG4gICAgfSwgdG90YWxMZW5ndGggKiAxMDAwKTtcbn1cblxuXG4vLyBjb21wcmVzc29yLmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxubGV0IGRpc3RvcnRpb25Ob2RlID0gbmV3IGF1ZGlvRGlzdG9ydGlvbk5vZGUoY3R4KTtcbmxldCBkaXN0b3J0aW9uID0gZGlzdG9ydGlvbk5vZGUuZ2V0RGlzdG9ydGlvbk5vZGUoMTAwKTtcblxuZnVuY3Rpb24gc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpIHtcblxuICAgIGxldCBpbnN0cnVtZW50TmFtZSA9IGluc3RydW1lbnREYXRhLmZpbGVuYW1lW2JlYXQucm93SWRdO1xuICAgIGxldCBpbnN0cnVtZW50ID0gYnVmZmVyc1tpbnN0cnVtZW50TmFtZV0uZ2V0KCk7XG4gICAgbGV0IG9wdGlvbnMgPSBnZXRTZXRBdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG5cbiAgICBmdW5jdGlvbiBwbGF5KHNvdXJjZSkge1xuXG4gICAgICAgIHNvdXJjZS5kZXR1bmUudmFsdWUgPSBvcHRpb25zLmRldHVuZTtcblxuICAgICAgICAvLyBHYWluXG4gICAgICAgIGxldCBub2RlID0gcm91dGVHYWluKHNvdXJjZSlcbiAgICAgICAgbm9kZSA9IHJvdXRlRGVsYXkobm9kZSk7XG4gICAgICAgIG5vZGUgPSByb3V0ZUNvbXByZXNzb3Iobm9kZSk7XG4gICAgICAgIG5vZGUuY29ubmVjdChjdHguZGVzdGluYXRpb24pO1xuICAgICAgICBzb3VyY2Uuc3RhcnQodHJpZ2dlclRpbWUpO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcm91dGVDb21wcmVzc29yIChub2RlKSB7XG4gICAgICAgIC8vIE5vdCB1c2VkIHlldFxuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgdmFyIGNvbXByZXNzb3IgPSBjdHguY3JlYXRlRHluYW1pY3NDb21wcmVzc29yKCk7XG4gICAgICAgIGNvbXByZXNzb3IudGhyZXNob2xkLnZhbHVlID0gLTEwMDsgLy8gLTEwMCAtIDBcbiAgICAgICAgY29tcHJlc3Nvci5rbmVlLnZhbHVlID0gMTA7IC8vIDEgLSA0MFxuICAgICAgICBjb21wcmVzc29yLnJhdGlvLnZhbHVlID0gMTI7IC8vIDEgLSAyMFxuICAgICAgICBjb21wcmVzc29yLmF0dGFjay52YWx1ZSA9IDE7IC8vIDAgLSAxXG4gICAgICAgIGNvbXByZXNzb3IucmVsZWFzZS52YWx1ZSA9IDA7IC8vIDAgLSAxXG5cbiAgICAgICAgbm9kZS5jb25uZWN0KGNvbXByZXNzb3IpO1xuICAgICAgICByZXR1cm4gY29tcHJlc3NvcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByb3V0ZUdhaW4gKHNvdXJjZSkge1xuICAgICAgICBsZXQgZ2FpbiA9IG5ldyBhZHNyR2Fpbk5vZGUoY3R4KTtcbiAgICAgICAgbGV0IG9wdGlvbnMgPSBnZXRTZXRBdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIGxldCBnYWluTm9kZTsgXG5cbiAgICAgICAgLy8gTm90IGVuYWJsZWQgLSBkZWZhdWx0IGdhaW5cbiAgICAgICAgaWYgKCFvcHRpb25zLmdhaW5FbmFibGVkKSB7XG4gICAgICAgICAgICBnYWluTm9kZSA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuICAgICAgICAgICAgc291cmNlLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICAgICAgcmV0dXJuIGdhaW5Ob2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgZ2Fpbi5zZXRPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICBnYWluTm9kZSA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuICAgICAgICBzb3VyY2UuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICAgIHJldHVybiBnYWluTm9kZTtcblxuXG4gICAgfVxuXG4gICAgLy8gTm90ZSBkZWxheSBhbHdheXMgdXNlcyBhYm92ZSBnYWluIC0gZXZlbiBpZiBub3QgZW5hYmxlZFxuICAgIGZ1bmN0aW9uIHJvdXRlRGVsYXkobm9kZSkge1xuICAgICAgICBpZiAoIW9wdGlvbnMuZGVsYXlFbmFibGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNyZWF0ZSBkZWxheSBub2RlXG4gICAgICAgIGxldCBkZWxheSA9IGN0eC5jcmVhdGVEZWxheSgpO1xuICAgICAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBvcHRpb25zLmRlbGF5O1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhZHNyIGdhaW4gbm9kZVxuICAgICAgICBsZXQgZ2FpbiA9IG5ldyBhZHNyR2Fpbk5vZGUoY3R4KTtcbiAgICAgICAgZ2Fpbi5zZXRPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICBsZXQgZmVlZGJhY2tHYWluID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGZpbHRlclxuICAgICAgICBsZXQgZmlsdGVyID0gY3R4LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICBmaWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gb3B0aW9ucy5maWx0ZXI7XG5cbiAgICAgICAgLy8gZGVsYXkgLT4gZmVlZGJhY2tHYWluXG4gICAgICAgIGRlbGF5LmNvbm5lY3QoZmVlZGJhY2tHYWluKTtcbiAgICAgICAgZGlzY29ubmVjdE5vZGUoZGVsYXksIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIGZlZWRiYWNrIC0+IGZpbHRlclxuICAgICAgICBmZWVkYmFja0dhaW4uY29ubmVjdChmaWx0ZXIpO1xuXG4gICAgICAgIC8vIGZpbHRlciAtPmRlbGF5XG4gICAgICAgIGZpbHRlci5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICBub2RlLmNvbm5lY3QoZGVsYXkpO1xuXG4gICAgICAgIHJldHVybiBkZWxheTtcbiAgICB9XG4gICAgcGxheShpbnN0cnVtZW50KTtcbn1cblxudmFyIHNjaGVkdWxlID0gbmV3IHNjaGVkdWxlTWVhc3VyZShjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KTtcblxuZnVuY3Rpb24gc2V0dXBCYXNlRXZlbnRzKCkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgIHNjaGVkdWxlLnJ1blNjaGVkdWxlKGdldFNldEF1ZGlvT3B0aW9ucy5vcHRpb25zLmJwbSk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGF1c2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgIHNjaGVkdWxlID0gbmV3IHNjaGVkdWxlTWVhc3VyZShjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdicG0nKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIGlmIChzY2hlZHVsZS5ydW5uaW5nKSB7XG4gICAgICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgICAgICBzY2hlZHVsZS5ydW5TY2hlZHVsZShnZXRTZXRBdWRpb09wdGlvbnMub3B0aW9ucy5icG0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVhc3VyZUxlbmd0aCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGUpID0+IHtcblxuICAgICAgICAkKCcjbWVhc3VyZUxlbmd0aCcpLmJpbmQoJ2tleXByZXNzIGtleWRvd24ga2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lYXN1cmVMZW5ndGgnKS52YWx1ZTtcbiAgICAgICAgICAgICAgICBsZXQgbGVuZ3RoID0gcGFyc2VJbnQodmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGxlbmd0aCA8IDEpIHJldHVybjtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gbGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgbGV0IHRyYWNrID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICAgICAgICAgIHNldHVwVHJhY2tlckh0bWwoY3VycmVudFNhbXBsZURhdGEsIGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUubWVhc3VyZUxlbmd0aCA9IGxlbmd0aDtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjaylcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5zZXR1cEV2ZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgICQoJy5iYXNlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZ2V0U2V0QXVkaW9PcHRpb25zLnNldFRyYWNrZXJDb250cm9scygpO1xuICAgIH0pO1xufVxuXG4kKCcjc2FtcGxlU2V0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdGhpcy52YWx1ZSk7XG59KTtcblxuZnVuY3Rpb24gdHJhY2tzTG9jYWxTdG9yYWdlKCkge1xuXG4gICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UgPSBmdW5jdGlvbiAodXBkYXRlKSB7XG4gICAgICAgIHZhciBzdG9yYWdlID0ge307XG4gICAgICAgIHN0b3JhZ2VbJ1NlbGVjdCddID0gJ1NlbGVjdCc7XG5cblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbG9jYWxTdG9yYWdlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IGxvY2FsU3RvcmFnZS5rZXkoaSk7XG4gICAgICAgICAgICBzdG9yYWdlW2l0ZW1dID0gaXRlbTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBzZWxlY3QgZWxlbWVudFxuICAgICAgICB2YXIgcyA9IG5ldyBzZWxlY3RFbGVtZW50KFxuICAgICAgICAgICAgJ2xvYWQtc3RvcmFnZScsIC8vIGlkIHRvIGFwcGVuZCB0aGUgc2VsZWN0IGxpc3QgdG9cbiAgICAgICAgICAgICdiZWF0LWxpc3QnLCAvLyBpZCBvZiB0aGUgc2VsZWN0IGxpc3RcbiAgICAgICAgICAgIHN0b3JhZ2UgLy9cbiAgICAgICAgKTtcblxuICAgICAgICBpZiAodXBkYXRlKSB7XG4gICAgICAgICAgICBzLnVwZGF0ZSgnYmVhdC1saXN0Jywgc3RvcmFnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzLmNyZWF0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RmlsZW5hbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBmaWxlbmFtZSA9ICQoJyNmaWxlbmFtZScpLnZhbCgpO1xuICAgICAgICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgICAgICAgICBmaWxlbmFtZSA9ICd1bnRpdGxlZCc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjb21wbGV0ZSBzb25nXG4gICAgICovXG4gICAgdGhpcy5nZXRUcmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGZvcm1EYXRhID0gZ2V0U2V0QXVkaW9PcHRpb25zLmdldFRyYWNrZXJDb250cm9scygpO1xuXG4gICAgICAgIGxldCBiZWF0ID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICBsZXQgc29uZyA9IHsgXCJiZWF0XCI6IGJlYXQsIFwic2V0dGluZ3NcIjogZm9ybURhdGEgfTtcbiAgICAgICAgcmV0dXJuIHNvbmc7XG4gICAgfVxuXG4gICAgdGhpcy5zZXR1cFN0b3JhZ2UgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBzb25nID0gdGhpcy5nZXRUcmFjaygpO1xuICAgICAgICAgICAgbGV0IGpzb24gPSBKU09OLnN0cmluZ2lmeShzb25nKTtcblxuICAgICAgICAgICAgbGV0IGZpbGVuYW1lID0gdGhpcy5nZXRGaWxlbmFtZSgpO1xuXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShmaWxlbmFtZSwganNvbik7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG5cbiAgICAgICAgICAgICQoXCIjYmVhdC1saXN0XCIpLnZhbChmaWxlbmFtZSk7XG4gICAgICAgICAgICAvLyBhbGVydCgnVHJhY2sgc2F2ZWQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc2F2ZUFzSnNvblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZUFzSnNvbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgbGV0IHNvbmcgPSB0aGlzLmdldFRyYWNrKCk7XG4gICAgICAgICAgICBsZXQganNvbiA9IEpTT04uc3RyaW5naWZ5KHNvbmcpO1xuXG4gICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSB0aGlzLmdldEZpbGVuYW1lKCk7XG5cbiAgICAgICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2pzb25dLCB7dHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJ9KTtcbiAgICAgICAgICAgIEZpbGVTYXZlci5zYXZlQXMoYmxvYiwgZmlsZW5hbWUgKyBcIi5qc29uXCIpO1xuXG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI2ZpbGVuYW1lJykuYmluZCgna2V5cHJlc3Mga2V5ZG93biBrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmVhdC1saXN0JykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gJCgnI2JlYXQtbGlzdCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdTZWxlY3QnKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gaXRlbTtcbiAgICAgICAgICAgIGxldCB0cmFjayA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oaXRlbSkpO1xuXG4gICAgICAgICAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuXG4gICAgICAgICAgICBmb3JtVmFsdWVzLnNldChmb3JtLCB0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSB0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoO1xuXG4gICAgICAgICAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdHJhY2suc2V0dGluZ3Muc2FtcGxlU2V0LCB0cmFjayk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlbGV0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpO1xuICAgICAgICAgICAgbGV0IHRvRGVsZXRlID0gZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udGV4dDtcblxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odG9EZWxldGUpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcblxuICAgICAgICB9KTtcbiAgICB9O1xufVxuIiwiY29uc3QgV0FBQ2xvY2sgPSByZXF1aXJlKCd3YWFjbG9jaycpO1xuY29uc3QgdHJhY2tlclRhYmxlID0gcmVxdWlyZSgnLi90cmFja2VyLXRhYmxlJyk7XG5jb25zdCBoYXNDbGFzcyA9IHJlcXVpcmUoJ2hhcy1jbGFzcycpO1xuXG4vKipcbiAqIENvbnN0cnVjdCBvYmplY3RcbiAqIEBwYXJhbSB7YXVkaW9Db250ZXh0fSBjdHggXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzY2hlZHVsZUF1ZGlvQmVhdFxuICovXG5mdW5jdGlvbiBzY2hlZHVsZU1lYXN1cmUoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCkge1xuXG4gICAgdGhpcy5tZWFzdXJlTGVuZ3RoID0gMTY7XG4gICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdCA9IHNjaGVkdWxlQXVkaW9CZWF0O1xuICAgIHRoaXMuc2NoZWR1bGVGb3J3YXJkID0gMC4xO1xuICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgdGhpcy5ldmVudE1hcCA9IHt9O1xuICAgIHRoaXMuY2xvY2sgPSBuZXcgV0FBQ2xvY2soY3R4KTtcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XG4gICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBEcmF3IGEgdHJhY2tlciB0YWJsZSBieSBudW1Sb3dzIGFuZCBudW1Db2xzXG4gICAgICovXG4gICAgdGhpcy5kcmF3VHJhY2tlciA9IGZ1bmN0aW9uKG51bVJvd3MsIG51bUNvbHMsIGRhdGEpIHtcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sVGFibGUgPSBuZXcgdHJhY2tlclRhYmxlKCk7XG4gICAgICAgIFxuICAgICAgICBodG1sVGFibGUuc2V0Um93cyhudW1Sb3dzLCBudW1Db2xzLCBkYXRhKTtcbiAgICAgICAgbGV0IHN0ciA9IGh0bWxUYWJsZS5nZXRUYWJsZSgpO1xuICAgICAgICBcbiAgICAgICAgbGV0IHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndHJhY2tlci1wYXJlbnQnKTtcbiAgICAgICAgdC5pbnNlcnRBZGphY2VudEhUTUwoJ2FmdGVyYmVnaW4nLCBzdHIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFB1c2ggY3VycmVudCBiZWF0IG9uZSBmb3J3YXJkXG4gICAgICovXG4gICAgdGhpcy5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmN1cnJlbnQrKztcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudCA+PSB0aGlzLm1lYXN1cmVMZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIG1pbGxpIHNlY29uZHMgcGVyIGJlYXRcbiAgICAgKi9cbiAgICB0aGlzLm1pbGxpUGVyQmVhdCA9IGZ1bmN0aW9uIChiZWF0cykge1xuICAgICAgICBpZiAoIWJlYXRzKSB7XG4gICAgICAgICAgICBiZWF0cyA9IDYwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAxMDAwICogNjAgLyBiZWF0cztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0IGEgdHJhY2tlciByb3cgZnJvbSBhIGNlbGwtaWRcbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWNrZXJSb3dWYWx1ZXMgPSBmdW5jdGlvbiAoY2VsbElkKSB7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLWNlbGwtaWQ9XCIke2NlbGxJZH1cIl1gO1xuXG4gICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICBlbGVtcy5mb3JFYWNoKChlbCkgPT4ge1xuICAgICAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIGVsLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBlbC5jbGFzc0xpc3QuY29udGFpbnMoJ3RyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICAgICAgdmFsdWVzLnB1c2godmFsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNjaGVkdWxlIGEgYmVhdCBjb2x1bW5cbiAgICAgKi9cbiAgICB0aGlzLnNjaGVkdWxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgYmVhdENvbHVtbiA9IHRoaXMuZ2V0VHJhY2tlclJvd1ZhbHVlcyh0aGlzLmN1cnJlbnQpO1xuICAgICAgICBsZXQgbm93ID0gY3R4LmN1cnJlbnRUaW1lO1xuXG4gICAgICAgIGxldCBzZWxlY3RvciA9IGBbZGF0YS1jZWxsLWlkPVwiJHt0aGlzLmN1cnJlbnR9XCJdYDtcblxuICAgICAgICBsZXQgZXZlbnQgPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgZWxlbXMuZm9yRWFjaCggKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLmNsYXNzTGlzdC5hZGQoJ3RyYWNrZXItY3VycmVudCcpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCk7XG5cbiAgICAgICAgdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIGVsZW1zLmZvckVhY2goIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5jbGFzc0xpc3QucmVtb3ZlKCd0cmFja2VyLWN1cnJlbnQnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQgKyB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwKTtcblxuICAgICAgICBiZWF0Q29sdW1uLmZvckVhY2goKGJlYXQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVCZWF0KGJlYXQsIG5vdyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlQmVhdCA9IGZ1bmN0aW9uIChiZWF0LCBub3cpIHtcblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZDtcbiAgICAgICAgdGhpcy5zY2hlZHVsZU1hcFtiZWF0LmNlbGxJZF0gPSB0cmlnZ2VyVGltZTtcbiAgICAgICAgaWYgKGJlYXQuZW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXSA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICAgICAgfSwgbm93KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlTWFwID0ge307XG5cbiAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0Tm93ID0gZnVuY3Rpb24gKGJlYXQpIHtcblxuICAgICAgICBpZiAoYmVhdC5lbmFibGVkKSB7XG4gICAgICAgICAgICBsZXQgYmVhdEV2ZW50ID0gdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIGlmIChiZWF0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICBiZWF0RXZlbnQuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB0cmlnZ2VyVGltZSA9IHRoaXMuc2NoZWR1bGVNYXBbMF0gKyBiZWF0LmNlbGxJZCAqIHRoaXMubWlsbGlQZXJCZWF0KHRoaXMuYnBtKSAvIDEwMDA7XG4gICAgICAgIGxldCBub3cgPSBjdHguY3VycmVudFRpbWU7XG4gICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICB9LCBub3cpO1xuICAgIH07XG5cbiAgICB0aGlzLmludGVydmFsO1xuICAgIHRoaXMucnVuU2NoZWR1bGUgPSBmdW5jdGlvbiAoYnBtKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuYnBtID0gYnBtO1xuICAgICAgICBsZXQgaW50ZXJ2YWwgPSB0aGlzLm1pbGxpUGVyQmVhdChicG0pO1xuXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgIH0sIDApO1xuXG4gICAgICAgIHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcblxuICAgICAgICB9LCBpbnRlcnZhbCk7XG4gICAgfTtcblxuICAgIHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RXZlbnRLZXkgPSBmdW5jdGlvbiBnZXRFdmVudEtleShiZWF0KSB7XG4gICAgICAgIHJldHVybiBiZWF0LnJvd0lkICsgYmVhdC5jZWxsSWQ7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudHJhY2tlci1jZWxsJyk7XG4gICAgICAgIGVsZW1zLmZvckVhY2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBoYXNDbGFzcyhlLCBcInRyYWNrZXItZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG5cbiAgICB0aGlzLmxvYWRUcmFja2VyVmFsdWVzID0gZnVuY3Rpb24gKGpzb24pIHtcblxuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudHJhY2tlci1lbmFibGVkJyk7XG4gICAgICAgIGVsZW1zLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5jbGFzc0xpc3QucmVtb3ZlKCd0cmFja2VyLWVuYWJsZWQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAganNvbi5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5lbmFibGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYC50cmFja2VyLWNlbGxbZGF0YS1yb3ctaWQ9XCIke2RhdGEucm93SWR9XCJdW2RhdGEtY2VsbC1pZD1cIiR7ZGF0YS5jZWxsSWR9XCJdYDtcbiAgICAgICAgICAgICAgICBsZXQgZWxlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIGVsZW0uY2xhc3NMaXN0LmFkZChcInRyYWNrZXItZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIExpc3RlbiBvbiB0cmFja2VyLWNlbGxcbiAgICAgKi9cbiAgICB0aGlzLnNldHVwRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBcbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRyYWNrZXItY2VsbCcpO1xuICAgICAgICBcbiAgICAgICAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgZS50YXJnZXQuZGF0YXNldCk7XG4gICAgICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBoYXNDbGFzcyhlLnRhcmdldCwgXCJ0cmFja2VyLWVuYWJsZWRcIik7XG4gICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRCZWF0ID0gZS50YXJnZXQuZGF0YXNldC5jZWxsSWQ7XG4gICAgICAgICAgICAgICAgaWYgKHZhbC5jZWxsSWQgPiBjdXJyZW50QmVhdCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0Tm93KHZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTGlzdC50b2dnbGUoJ3RyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2NoZWR1bGVNZWFzdXJlOyIsIm1vZHVsZS5leHBvcnRzPW1vZHVsZS5leHBvcnRzID0ge1wiYmVhdFwiOlt7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjExXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjExXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEyXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEyXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTVcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTVcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTZcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTZcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTdcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTdcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMThcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMThcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTlcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTlcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjBcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjBcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjFcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjFcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjJcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjJcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjNcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjNcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjRcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjRcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjVcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjVcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjZcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjZcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjdcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjdcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjhcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjhcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX1dLFwic2V0dGluZ3NcIjp7XCJzYW1wbGVTZXRcIjpcImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9vcmFtaWNzL3NhbXBsZWQvbWFzdGVyL0RNL0xNLTIvc2FtcGxlZC5pbnN0cnVtZW50Lmpzb25cIixcIm1lYXN1cmVMZW5ndGhcIjoxNixcImJwbVwiOjE5MCxcImRldHVuZVwiOi0xMjAwLFwiaW5pdEdhaW5cIjoxLFwibWF4R2FpblwiOjEsXCJhdHRhY2tUaW1lXCI6MSxcInN1c3RhaW5UaW1lXCI6MS45LFwicmVsZWFzZVRpbWVcIjo1LFwiZGVsYXlFbmFibGVkXCI6XCJkZWxheVwiLFwiZGVsYXlcIjowLjYzLFwiZmlsdGVyXCI6OTkyLjZ9fSIsImZ1bmN0aW9uIHRyYWNrZXJUYWJsZSgpIHtcblxuICAgIHRoaXMuc3RyID0gJyc7XG4gICAgdGhpcy5nZXRUYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICc8dGFibGUgaWQ9XCJ0cmFja2VyLXRhYmxlXCI+JyArIHRoaXMuc3RyICsgJzwvdGFibGU+JztcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRIZWFkZXIgPSBmdW5jdGlvbiAobnVtQ2VsbHMsIGRhdGEpIHtcbiAgICAgICAgdGhpcy5zdHIgKz0gYDx0ciBjbGFzcz1cInRyYWNrZXItcm93IGhlYWRlclwiPmA7XG4gICAgICAgIHRoaXMuc3RyICs9IHRoaXMuZ2V0Q2VsbHMoJ2hlYWRlcicsIG51bUNlbGxzLCB7IGhlYWRlcjogdHJ1ZSB9KTtcbiAgICAgICAgdGhpcy5zdHIgKz0gYDwvdHI+YDtcblxuICAgIH07XG5cbiAgICB0aGlzLnNldFJvd3MgPSBmdW5jdGlvbiAobnVtUm93cywgbnVtQ2VsbHMsIGRhdGEpIHtcblxuICAgICAgICB0aGlzLnNldEhlYWRlcihudW1DZWxscywgZGF0YSk7XG4gICAgICAgIGZvciAobGV0IHJvd0lEID0gMDsgcm93SUQgPCBudW1Sb3dzOyByb3dJRCsrKSB7XG4gICAgICAgICAgICB0aGlzLnN0ciArPSBgPHRyIGNsYXNzPVwidHJhY2tlci1yb3dcIiBkYXRhLWlkPVwiJHtyb3dJRH1cIj5gO1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gdGhpcy5nZXRDZWxscyhyb3dJRCwgbnVtQ2VsbHMsIGRhdGEpO1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gYDwvdHI+YDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldEZpcnN0Q2VsbCA9IGZ1bmN0aW9uIChyb3dJRCwgZGF0YSkge1xuICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgIFxuICAgICAgICBzdHIgKz0gYDx0ZCBjbGFzcz1cInRyYWNrZXItY2VsbCB0cmFja2VyLWZpcnN0LWNlbGxcIiBkYXRhLXJvdy1pZD1cIiR7cm93SUR9XCI+YDtcbiAgICAgICAgaWYgKGRhdGEudGl0bGUpIHsgXG4gICAgICAgICAgICBzdHIgKz0gZGF0YS50aXRsZVtyb3dJRF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN0ciArPSBgPC90ZD5gO1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH07XG5cbiAgICB0aGlzLmdldENlbGxzID0gZnVuY3Rpb24gKHJvd0lELCBudW1DZWxscywgZGF0YSkge1xuICAgICAgICB2YXIgc3RyID0gJyc7XG5cbiAgICAgICAgc3RyICs9IHRoaXMuZ2V0Rmlyc3RDZWxsKHJvd0lELCBkYXRhKTtcblxuICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IG51bUNlbGxzOyBjKyspIHtcbiAgICAgICAgICAgIHN0ciArPSBgPHRkIGNsYXNzPVwidHJhY2tlci1jZWxsXCIgZGF0YS1yb3ctaWQ9XCIke3Jvd0lEfVwiIGRhdGEtY2VsbC1pZD1cIiR7Y31cIj5gO1xuICAgICAgICAgICAgaWYgKGRhdGEuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGMgKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RyICs9IGA8L3RkPmA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYWNrZXJUYWJsZTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
