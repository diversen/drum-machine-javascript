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
const simpleTracker = require('./simple-tracker');
const audioDistortionNode = require('./audio-distortion-node');
const sampleLoader = require('tiny-sample-loader');
const FileSaver = require('file-saver');

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

var schedule = new simpleTracker(ctx, scheduleAudioBeat);

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
        schedule = new simpleTracker(ctx, scheduleAudioBeat);
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

},{"./audio-distortion-node":12,"./get-set-controls":13,"./simple-tracker":15,"./track-2":16,"adsr-gain-node":1,"file-saver":3,"get-set-form-values":4,"load-sample-set":6,"select-element":8,"tiny-sample-loader":9}],15:[function(require,module,exports){
const WAAClock = require('waaclock');
const trackerTable = require('./tracker-table');
const hasClass = require('has-class');

/**
 * Construct object
 * @param {audioContext} ctx 
 * @param {function} scheduleAudioBeat funtion to call planning forward
 */
function tracker(ctx, scheduleAudioBeat) {

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
        
        // document.getElementById("tracker-parent").innerHTML = '';
        let t = document.getElementById('tracker-parent');
        t.innerHTML = '';
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

    /**
     * Get tracker values
     */
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

    /**
     * Load tracker values in JSON format
     */
    this.loadTrackerValues = function (json) {

        let elems = document.querySelectorAll('.tracker-enabled');
        elems.forEach(function(e) {
            e.classList.remove('tracker-enabled');
        });

        json.forEach(function (data) {
            if (data.enabled === true) {
                let selector = `.tracker-cell[data-row-id="${data.rowId}"][data-cell-id="${data.cellId}"]`;
                let elem = document.querySelector(selector);
                if (elem) {
                    elem.classList.add("tracker-enabled");
                }
            }
        });
    };

    /**
     * Listen on tracker-cell
     * Schedule if cell is clicked and toggle css class
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

module.exports = tracker;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvZ2V0LXNldC1mb3JtLXZhbHVlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oYXMtY2xhc3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9hZC1zYW1wbGUtc2V0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29iai10eXBlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjdC1lbGVtZW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Rpbnktc2FtcGxlLWxvYWRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy93YWFjbG9jay9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy93YWFjbG9jay9saWIvV0FBQ2xvY2suanMiLCJzcmMvYXVkaW8tZGlzdG9ydGlvbi1ub2RlLmpzIiwic3JjL2dldC1zZXQtY29udHJvbHMuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9zaW1wbGUtdHJhY2tlci5qcyIsInNyYy90cmFjay0yLmpzb24iLCJzcmMvdHJhY2tlci10YWJsZS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdk5BOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gR2FpbihjdHgpIHtcblxuICAgIHRoaXMuY3R4ID0gY3R4O1xuXG4gICAgdGhpcy5zZWNvbmRzVG9UaW1lQ29uc3RhbnQgPSBmdW5jdGlvbiAoc2VjKSB7XG4gICAgICAgIHJldHVybiAoc2VjICogMikgLyA4O1xuICAgIH07XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICAgIGluaXRHYWluOiAwLjEsIC8vIEluaXQgZ2FpbiBvbiBub3RlXG4gICAgICAgIG1heEdhaW46IDEuMCwgLy8gTWF4IGdhaW4gb24gbm90ZVxuICAgICAgICBhdHRhY2tUaW1lOiAwLjEsIC8vIEF0dGFja1RpbWUuIGdhaW4uaW5pdCB0byBnYWluLm1heCBpbiBhdHRhY2tUaW1lXG4gICAgICAgIHN1c3RhaW5UaW1lOiAxLCAvLyBTdXN0YWluIG5vdGUgaW4gdGltZVxuICAgICAgICByZWxlYXNlVGltZTogMSwgLy8gQXBwcm94aW1hdGVkIGVuZCB0aW1lLiBDYWxjdWxhdGVkIHdpdGggc2Vjb25kc1RvVGltZUNvbnN0YW50KClcbiAgICAgICAgLy8gZGlzY29ubmVjdDogZmFsc2UgLy8gU2hvdWxkIHdlIGF1dG9kaXNjb25uZWN0LiBEZWZhdWx0IGlzIHRydWVcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB9O1xuXG4gICAgdGhpcy5nYWluTm9kZTtcbiAgICAvKipcbiAgICAgKiBUaGUgZ2Fpbk5vZGVcbiAgICAgKiBAcGFyYW0ge2Zsb2F0fSBiZWdpbiBjdHggdGltZVxuICAgICAqIEByZXR1cm5zIHtHYWluLmdldEdhaW5Ob2RlLmdhaW5Ob2RlfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0R2Fpbk5vZGUgPSBmdW5jdGlvbiAoYmVnaW4pIHtcblxuICAgICAgICB0aGlzLmdhaW5Ob2RlID0gdGhpcy5jdHguY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSB0aGlzLm9wdGlvbnMuaW5pdEdhaW47XG5cbiAgICAgICAgLy8gQXR0YWNrIHRvIG1heFxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5tYXhHYWluLFxuICAgICAgICAgICAgICAgIGJlZ2luICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUsXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUpO1xuXG4gICAgICAgIC8vIFN1c3RhaW4gYW5kIGVuZCBub3RlXG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoXG4gICAgICAgICAgICAgICAgMC4wLFxuICAgICAgICAgICAgICAgIGJlZ2luICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUsXG4gICAgICAgICAgICAgICAgdGhpcy5zZWNvbmRzVG9UaW1lQ29uc3RhbnQodGhpcy5vcHRpb25zLnJlbGVhc2VUaW1lKSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmRpc2Nvbm5lY3QgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3QoYmVnaW4pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdGhpcy5nYWluTm9kZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGlzY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSArIHRoaXMub3B0aW9ucy5zdXN0YWluVGltZSArIHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZTtcbiAgICAgICAgXG4gICAgICAgIHNldFRpbWVvdXQoICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICB9LFxuICAgICAgICB0b3RhbExlbmd0aCAqIDEwMDApO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gR2FpbjsiLCIvLyBGcm9tOiBodHRwczovL2Rldi5vcGVyYS5jb20vYXJ0aWNsZXMvZHJ1bS1zb3VuZHMtd2ViYXVkaW8vXG5mdW5jdGlvbiBJbnN0cnVtZW50KGNvbnRleHQsIGJ1ZmZlcikge1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG59XG5cbkluc3RydW1lbnQucHJvdG90eXBlLnNldHVwID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHRoaXMuc291cmNlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbn07XG5cbkluc3RydW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2U7XG59O1xuXG5JbnN0cnVtZW50LnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB0aGlzLnNldHVwKCk7XG4gICAgdGhpcy5zb3VyY2Uuc3RhcnQodGltZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluc3RydW1lbnQ7XG4iLCIvKiBGaWxlU2F2ZXIuanNcbiAqIEEgc2F2ZUFzKCkgRmlsZVNhdmVyIGltcGxlbWVudGF0aW9uLlxuICogMS4zLjJcbiAqIDIwMTYtMDYtMTYgMTg6MjU6MTlcbiAqXG4gKiBCeSBFbGkgR3JleSwgaHR0cDovL2VsaWdyZXkuY29tXG4gKiBMaWNlbnNlOiBNSVRcbiAqICAgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGlncmV5L0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9MSUNFTlNFLm1kXG4gKi9cblxuLypnbG9iYWwgc2VsZiAqL1xuLypqc2xpbnQgYml0d2lzZTogdHJ1ZSwgaW5kZW50OiA0LCBsYXhicmVhazogdHJ1ZSwgbGF4Y29tbWE6IHRydWUsIHNtYXJ0dGFiczogdHJ1ZSwgcGx1c3BsdXM6IHRydWUgKi9cblxuLyohIEBzb3VyY2UgaHR0cDovL3B1cmwuZWxpZ3JleS5jb20vZ2l0aHViL0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9GaWxlU2F2ZXIuanMgKi9cblxudmFyIHNhdmVBcyA9IHNhdmVBcyB8fCAoZnVuY3Rpb24odmlldykge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0Ly8gSUUgPDEwIGlzIGV4cGxpY2l0bHkgdW5zdXBwb3J0ZWRcblx0aWYgKHR5cGVvZiB2aWV3ID09PSBcInVuZGVmaW5lZFwiIHx8IHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiYgL01TSUUgWzEtOV1cXC4vLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyXG5cdFx0ICBkb2MgPSB2aWV3LmRvY3VtZW50XG5cdFx0ICAvLyBvbmx5IGdldCBVUkwgd2hlbiBuZWNlc3NhcnkgaW4gY2FzZSBCbG9iLmpzIGhhc24ndCBvdmVycmlkZGVuIGl0IHlldFxuXHRcdCwgZ2V0X1VSTCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHZpZXcuVVJMIHx8IHZpZXcud2Via2l0VVJMIHx8IHZpZXc7XG5cdFx0fVxuXHRcdCwgc2F2ZV9saW5rID0gZG9jLmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIiwgXCJhXCIpXG5cdFx0LCBjYW5fdXNlX3NhdmVfbGluayA9IFwiZG93bmxvYWRcIiBpbiBzYXZlX2xpbmtcblx0XHQsIGNsaWNrID0gZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0dmFyIGV2ZW50ID0gbmV3IE1vdXNlRXZlbnQoXCJjbGlja1wiKTtcblx0XHRcdG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0fVxuXHRcdCwgaXNfc2FmYXJpID0gL2NvbnN0cnVjdG9yL2kudGVzdCh2aWV3LkhUTUxFbGVtZW50KSB8fCB2aWV3LnNhZmFyaVxuXHRcdCwgaXNfY2hyb21lX2lvcyA9L0NyaU9TXFwvW1xcZF0rLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpXG5cdFx0LCB0aHJvd19vdXRzaWRlID0gZnVuY3Rpb24oZXgpIHtcblx0XHRcdCh2aWV3LnNldEltbWVkaWF0ZSB8fCB2aWV3LnNldFRpbWVvdXQpKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aHJvdyBleDtcblx0XHRcdH0sIDApO1xuXHRcdH1cblx0XHQsIGZvcmNlX3NhdmVhYmxlX3R5cGUgPSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiXG5cdFx0Ly8gdGhlIEJsb2IgQVBJIGlzIGZ1bmRhbWVudGFsbHkgYnJva2VuIGFzIHRoZXJlIGlzIG5vIFwiZG93bmxvYWRmaW5pc2hlZFwiIGV2ZW50IHRvIHN1YnNjcmliZSB0b1xuXHRcdCwgYXJiaXRyYXJ5X3Jldm9rZV90aW1lb3V0ID0gMTAwMCAqIDQwIC8vIGluIG1zXG5cdFx0LCByZXZva2UgPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHR2YXIgcmV2b2tlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGZpbGUgPT09IFwic3RyaW5nXCIpIHsgLy8gZmlsZSBpcyBhbiBvYmplY3QgVVJMXG5cdFx0XHRcdFx0Z2V0X1VSTCgpLnJldm9rZU9iamVjdFVSTChmaWxlKTtcblx0XHRcdFx0fSBlbHNlIHsgLy8gZmlsZSBpcyBhIEZpbGVcblx0XHRcdFx0XHRmaWxlLnJlbW92ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0c2V0VGltZW91dChyZXZva2VyLCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQpO1xuXHRcdH1cblx0XHQsIGRpc3BhdGNoID0gZnVuY3Rpb24oZmlsZXNhdmVyLCBldmVudF90eXBlcywgZXZlbnQpIHtcblx0XHRcdGV2ZW50X3R5cGVzID0gW10uY29uY2F0KGV2ZW50X3R5cGVzKTtcblx0XHRcdHZhciBpID0gZXZlbnRfdHlwZXMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKGktLSkge1xuXHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBmaWxlc2F2ZXJbXCJvblwiICsgZXZlbnRfdHlwZXNbaV1dO1xuXHRcdFx0XHRpZiAodHlwZW9mIGxpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGlzdGVuZXIuY2FsbChmaWxlc2F2ZXIsIGV2ZW50IHx8IGZpbGVzYXZlcik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0XHRcdHRocm93X291dHNpZGUoZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQsIGF1dG9fYm9tID0gZnVuY3Rpb24oYmxvYikge1xuXHRcdFx0Ly8gcHJlcGVuZCBCT00gZm9yIFVURi04IFhNTCBhbmQgdGV4dC8qIHR5cGVzIChpbmNsdWRpbmcgSFRNTClcblx0XHRcdC8vIG5vdGU6IHlvdXIgYnJvd3NlciB3aWxsIGF1dG9tYXRpY2FsbHkgY29udmVydCBVVEYtMTYgVStGRUZGIHRvIEVGIEJCIEJGXG5cdFx0XHRpZiAoL15cXHMqKD86dGV4dFxcL1xcUyp8YXBwbGljYXRpb25cXC94bWx8XFxTKlxcL1xcUypcXCt4bWwpXFxzKjsuKmNoYXJzZXRcXHMqPVxccyp1dGYtOC9pLnRlc3QoYmxvYi50eXBlKSkge1xuXHRcdFx0XHRyZXR1cm4gbmV3IEJsb2IoW1N0cmluZy5mcm9tQ2hhckNvZGUoMHhGRUZGKSwgYmxvYl0sIHt0eXBlOiBibG9iLnR5cGV9KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBibG9iO1xuXHRcdH1cblx0XHQsIEZpbGVTYXZlciA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRpZiAoIW5vX2F1dG9fYm9tKSB7XG5cdFx0XHRcdGJsb2IgPSBhdXRvX2JvbShibG9iKTtcblx0XHRcdH1cblx0XHRcdC8vIEZpcnN0IHRyeSBhLmRvd25sb2FkLCB0aGVuIHdlYiBmaWxlc3lzdGVtLCB0aGVuIG9iamVjdCBVUkxzXG5cdFx0XHR2YXJcblx0XHRcdFx0ICBmaWxlc2F2ZXIgPSB0aGlzXG5cdFx0XHRcdCwgdHlwZSA9IGJsb2IudHlwZVxuXHRcdFx0XHQsIGZvcmNlID0gdHlwZSA9PT0gZm9yY2Vfc2F2ZWFibGVfdHlwZVxuXHRcdFx0XHQsIG9iamVjdF91cmxcblx0XHRcdFx0LCBkaXNwYXRjaF9hbGwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkaXNwYXRjaChmaWxlc2F2ZXIsIFwid3JpdGVzdGFydCBwcm9ncmVzcyB3cml0ZSB3cml0ZWVuZFwiLnNwbGl0KFwiIFwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gb24gYW55IGZpbGVzeXMgZXJyb3JzIHJldmVydCB0byBzYXZpbmcgd2l0aCBvYmplY3QgVVJMc1xuXHRcdFx0XHQsIGZzX2Vycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKChpc19jaHJvbWVfaW9zIHx8IChmb3JjZSAmJiBpc19zYWZhcmkpKSAmJiB2aWV3LkZpbGVSZWFkZXIpIHtcblx0XHRcdFx0XHRcdC8vIFNhZmFyaSBkb2Vzbid0IGFsbG93IGRvd25sb2FkaW5nIG9mIGJsb2IgdXJsc1xuXHRcdFx0XHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cdFx0XHRcdFx0XHRyZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB1cmwgPSBpc19jaHJvbWVfaW9zID8gcmVhZGVyLnJlc3VsdCA6IHJlYWRlci5yZXN1bHQucmVwbGFjZSgvXmRhdGE6W147XSo7LywgJ2RhdGE6YXR0YWNobWVudC9maWxlOycpO1xuXHRcdFx0XHRcdFx0XHR2YXIgcG9wdXAgPSB2aWV3Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG5cdFx0XHRcdFx0XHRcdGlmKCFwb3B1cCkgdmlldy5sb2NhdGlvbi5ocmVmID0gdXJsO1xuXHRcdFx0XHRcdFx0XHR1cmw9dW5kZWZpbmVkOyAvLyByZWxlYXNlIHJlZmVyZW5jZSBiZWZvcmUgZGlzcGF0Y2hpbmdcblx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0cmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYik7XG5cdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBkb24ndCBjcmVhdGUgbW9yZSBvYmplY3QgVVJMcyB0aGFuIG5lZWRlZFxuXHRcdFx0XHRcdGlmICghb2JqZWN0X3VybCkge1xuXHRcdFx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChmb3JjZSkge1xuXHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dmFyIG9wZW5lZCA9IHZpZXcub3BlbihvYmplY3RfdXJsLCBcIl9ibGFua1wiKTtcblx0XHRcdFx0XHRcdGlmICghb3BlbmVkKSB7XG5cdFx0XHRcdFx0XHRcdC8vIEFwcGxlIGRvZXMgbm90IGFsbG93IHdpbmRvdy5vcGVuLCBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIuYXBwbGUuY29tL2xpYnJhcnkvc2FmYXJpL2RvY3VtZW50YXRpb24vVG9vbHMvQ29uY2VwdHVhbC9TYWZhcmlFeHRlbnNpb25HdWlkZS9Xb3JraW5nd2l0aFdpbmRvd3NhbmRUYWJzL1dvcmtpbmd3aXRoV2luZG93c2FuZFRhYnMuaHRtbFxuXHRcdFx0XHRcdFx0XHR2aWV3LmxvY2F0aW9uLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0fVxuXHRcdFx0O1xuXHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuSU5JVDtcblxuXHRcdFx0aWYgKGNhbl91c2Vfc2F2ZV9saW5rKSB7XG5cdFx0XHRcdG9iamVjdF91cmwgPSBnZXRfVVJMKCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNhdmVfbGluay5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHRzYXZlX2xpbmsuZG93bmxvYWQgPSBuYW1lO1xuXHRcdFx0XHRcdGNsaWNrKHNhdmVfbGluayk7XG5cdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0fVxuXHRcdCwgRlNfcHJvdG8gPSBGaWxlU2F2ZXIucHJvdG90eXBlXG5cdFx0LCBzYXZlQXMgPSBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0cmV0dXJuIG5ldyBGaWxlU2F2ZXIoYmxvYiwgbmFtZSB8fCBibG9iLm5hbWUgfHwgXCJkb3dubG9hZFwiLCBub19hdXRvX2JvbSk7XG5cdFx0fVxuXHQ7XG5cdC8vIElFIDEwKyAobmF0aXZlIHNhdmVBcylcblx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiYgbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IpIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdG5hbWUgPSBuYW1lIHx8IGJsb2IubmFtZSB8fCBcImRvd25sb2FkXCI7XG5cblx0XHRcdGlmICghbm9fYXV0b19ib20pIHtcblx0XHRcdFx0YmxvYiA9IGF1dG9fYm9tKGJsb2IpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iKGJsb2IsIG5hbWUpO1xuXHRcdH07XG5cdH1cblxuXHRGU19wcm90by5hYm9ydCA9IGZ1bmN0aW9uKCl7fTtcblx0RlNfcHJvdG8ucmVhZHlTdGF0ZSA9IEZTX3Byb3RvLklOSVQgPSAwO1xuXHRGU19wcm90by5XUklUSU5HID0gMTtcblx0RlNfcHJvdG8uRE9ORSA9IDI7XG5cblx0RlNfcHJvdG8uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlc3RhcnQgPVxuXHRGU19wcm90by5vbnByb2dyZXNzID1cblx0RlNfcHJvdG8ub253cml0ZSA9XG5cdEZTX3Byb3RvLm9uYWJvcnQgPVxuXHRGU19wcm90by5vbmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZWVuZCA9XG5cdFx0bnVsbDtcblxuXHRyZXR1cm4gc2F2ZUFzO1xufShcblx0ICAgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgJiYgc2VsZlxuXHR8fCB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvd1xuXHR8fCB0aGlzLmNvbnRlbnRcbikpO1xuLy8gYHNlbGZgIGlzIHVuZGVmaW5lZCBpbiBGaXJlZm94IGZvciBBbmRyb2lkIGNvbnRlbnQgc2NyaXB0IGNvbnRleHRcbi8vIHdoaWxlIGB0aGlzYCBpcyBuc0lDb250ZW50RnJhbWVNZXNzYWdlTWFuYWdlclxuLy8gd2l0aCBhbiBhdHRyaWJ1dGUgYGNvbnRlbnRgIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHdpbmRvd1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cy5zYXZlQXMgPSBzYXZlQXM7XG59IGVsc2UgaWYgKCh0eXBlb2YgZGVmaW5lICE9PSBcInVuZGVmaW5lZFwiICYmIGRlZmluZSAhPT0gbnVsbCkgJiYgKGRlZmluZS5hbWQgIT09IG51bGwpKSB7XG4gIGRlZmluZShcIkZpbGVTYXZlci5qc1wiLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2F2ZUFzO1xuICB9KTtcbn1cbiIsImZ1bmN0aW9uIGdldEVsZW1Db3VudEJ5TmFtZShuYW1lKSB7XG4gICAgdmFyIG5hbWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUobmFtZSk7XG4gICAgcmV0dXJuIG5hbWVzLmxlbmd0aDtcbn1cblxuZnVuY3Rpb24gZ2V0Rm9ybVZhbHVlcyhmb3JtRWxlbWVudCkge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuICAgICAgICBzd2l0Y2ggKGVsZW0udHlwZSkge1xuXG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0uY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdFZhbHVlcyA9IGdldFNlbGVjdFZhbHVlcyhlbGVtKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gc2VsZWN0VmFsdWVzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0udmFsdWUgIT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZvcm1QYXJhbXM7XG59XG5cbmZ1bmN0aW9uIHNldEZvcm1WYWx1ZXMoZm9ybUVsZW1lbnQsIHZhbHVlcykge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuXG4gICAgICAgIHN3aXRjaCAoZWxlbS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSA9PT0gZWxlbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0gPT09IGVsZW0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBzZXRTZWxlY3RWYWx1ZXMoZWxlbSwgdmFsdWVzW2VsZW0ubmFtZV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0udmFsdWUgPSB2YWx1ZXNbZWxlbS5uYW1lXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0U2VsZWN0VmFsdWVzKHNlbGVjdEVsZW0sIHZhbHVlcykge1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0RWxlbS5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IG9wdGlvbnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgICAgIG9wdCA9IG9wdGlvbnNbaV07XG4gICAgICAgIGlmICh2YWx1ZXMuaW5kZXhPZihvcHQudmFsdWUpID4gLTEpIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0U2VsZWN0VmFsdWVzKHNlbGVjdCkge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgb3B0aW9ucyA9IHNlbGVjdCAmJiBzZWxlY3Qub3B0aW9ucztcbiAgICB2YXIgb3B0O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBvcHRpb25zLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgICAgICBvcHQgPSBvcHRpb25zW2ldO1xuXG4gICAgICAgIGlmIChvcHQuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG9wdC52YWx1ZSB8fCBvcHQudGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZ2V0U2V0Rm9ybVZhbHVlcygpIHtcbiAgICB0aGlzLnNldCA9IHNldEZvcm1WYWx1ZXM7XG4gICAgdGhpcy5nZXQgPSBnZXRGb3JtVmFsdWVzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNldEZvcm1WYWx1ZXM7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgb2JqVHlwZSA9IHJlcXVpcmUoJ29iai10eXBlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGVsLCBzdHIpIHtcblx0aWYgKG9ialR5cGUoZWwpLmluZGV4T2YoJ2VsZW1lbnQnKSA9PT0gLTEpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBhbiBIVE1MIERPTSBlbGVtZW50IGFzIGZpcnN0IGFyZ3VtZW50Jyk7XG5cdH1cblxuXHRpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBhIHN0cmluZyBhcyBzZWNvbmQgYXJndW1lbnQnKTtcblx0fVxuXG5cdGlmIChlbC5jbGFzc0xpc3QpIHtcblx0XHRyZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKHN0cik7XG5cdH1cblxuXHRyZXR1cm4gbmV3IFJlZ0V4cCgnKF58ICknICsgc3RyICsgJyggfCQpJywgJ2dpJykudGVzdChlbC5jbGFzc05hbWUpO1xufTtcbiIsInZhciB0aW55U2FtcGxlTG9hZGVyID0gcmVxdWlyZSgndGlueS1zYW1wbGUtbG9hZGVyJyk7XG52YXIgYXVkaW9CdWZmZXJJbnN0cnVtZW50ID0gcmVxdWlyZSgnYXVkaW8tYnVmZmVyLWluc3RydW1lbnQnKTtcblxuZnVuY3Rpb24gZ2V0SlNPTih1cmwpIHtcblxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIHJlcXVlc3Qub3BlbignZ2V0JywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAndGV4dCc7XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdKU09OIGNvdWxkIG5vdCBiZSBsb2FkZWQgJyArIHVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbnZhciBidWZmZXJzID0ge307XG5mdW5jdGlvbiBnZXRTYW1wbGVQcm9taXNlcyAoY3R4LCBkYXRhKSB7XG4gICAgdmFyIGJhc2VVcmwgPSBkYXRhLnNhbXBsZXM7XG4gICAgdmFyIHByb21pc2VzID0gW107XG5cbiAgICBkYXRhLmZpbGVuYW1lID0gW107XG4gICAgdmFyIGkgPSAwO1xuICAgIGRhdGEuZmlsZXMuZm9yRWFjaChmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhciBmaWxlbmFtZSA9IHZhbC5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIik7XG4gICAgICAgIGRhdGEuZmlsZW5hbWUucHVzaChmaWxlbmFtZSk7XG4gICAgICAgIHZhciByZW1vdGVVcmwgPSBiYXNlVXJsICsgdmFsO1xuXG4gICAgICAgIGxldCBsb2FkZXJQcm9taXNlID0gdGlueVNhbXBsZUxvYWRlcihyZW1vdGVVcmwsIGN0eCk7XG4gICAgICAgIGxvYWRlclByb21pc2UudGhlbihmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICBidWZmZXJzW2ZpbGVuYW1lXSA9IG5ldyBhdWRpb0J1ZmZlckluc3RydW1lbnQoY3R4LCBidWZmZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBwcm9taXNlcy5wdXNoKGxvYWRlclByb21pc2UpO1xuXG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIHByb21pc2VzO1xuXG59XG5cbmZ1bmN0aW9uIHNhbXBsZUFsbFByb21pc2UoY3R4LCBkYXRhVXJsKSB7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIFxuICAgICAgICB2YXIganNvblByb21pc2UgPSBnZXRKU09OKGRhdGFVcmwpO1xuICAgICAgICBqc29uUHJvbWlzZS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBzYW1wbGVQcm9taXNlcyA9IGdldFNhbXBsZVByb21pc2VzKGN0eCwgZGF0YSk7XG4gICAgICAgICAgICBQcm9taXNlLmFsbChzYW1wbGVQcm9taXNlcykudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtkYXRhOiBkYXRhLCBidWZmZXJzOiBidWZmZXJzfSk7XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkuY2F0Y2ggKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gbG9hZFNhbXBsZVNldChjdHgsIGRhdGFVcmwpIHtcbiAgICByZXR1cm4gc2FtcGxlQWxsUHJvbWlzZShjdHgsIGRhdGFVcmwpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvYWRTYW1wbGVTZXQ7IiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG5cdHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKS5yZXBsYWNlKC9eXFxbb2JqZWN0ICguKylcXF0kLywgJyQxJykudG9Mb3dlckNhc2UoKTtcbn07XG4iLCJmdW5jdGlvbiBzZWxlY3RFbGVtZW50KGFwcGVuZFRvSUQsIHNlbGVjdElELCBvcHRpb25zLCBzZWxlY3RlZCkge1xuXG4gICAgdGhpcy5hcHBlbmRUb0lEID0gYXBwZW5kVG9JRDtcbiAgICB0aGlzLnNlbGVjdElEID0gc2VsZWN0SUQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG4gICAgXG4gICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFwcGVuZFRvSUQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmFwcGVuZFRvSUQpO1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzZWxlY3RcIik7XG4gICAgICAgIHNlbGVjdExpc3QuaWQgPSB0aGlzLnNlbGVjdElEOyAgICAgICAgXG4gICAgICAgIGFwcGVuZFRvSUQuYXBwZW5kQ2hpbGQoc2VsZWN0TGlzdCk7XG4gICAgICAgIHRoaXMudXBkYXRlKHNlbGVjdElELCB0aGlzLm9wdGlvbnMsIHRoaXMuc2VsZWN0ZWQpO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbiAoZWxlbSwgb3B0aW9ucywgc2VsZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5kZWxldGUoZWxlbSk7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm9wdGlvblwiKTtcbiAgICAgICAgICAgIG9wdGlvbi52YWx1ZSA9IGtleTtcbiAgICAgICAgICAgIG9wdGlvbi50ZXh0ID0gb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgc2VsZWN0TGlzdC5hcHBlbmRDaGlsZChvcHRpb24pO1xuXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBzZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgIG9wdGlvbi5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0U2VsZWN0ZWQgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICB2YXIgb3B0O1xuICAgICAgICBmb3IgKCB2YXIgaSA9IDAsIGxlbiA9IHNlbGVjdExpc3Qub3B0aW9ucy5sZW5ndGg7IGkgPCBsZW47IGkrKyApIHtcbiAgICAgICAgICAgIG9wdCA9IHNlbGVjdExpc3Qub3B0aW9uc1tpXTtcbiAgICAgICAgICAgIGlmICggb3B0LnNlbGVjdGVkID09PSB0cnVlICkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcHQudmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICB2YXIgc2VsZWN0TGlzdD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgZm9yICh2YXIgb3B0aW9uIGluIHNlbGVjdExpc3Qpe1xuICAgICAgICAgICAgc2VsZWN0TGlzdC5yZW1vdmUob3B0aW9uKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRBc1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmFwcGVuZFRvSUQpO1xuICAgICAgICB2YXIgZWxlbWVudEh0bWwgPSBlbGVtZW50Lm91dGVySFRNTDtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnRIdG1sO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2VsZWN0RWxlbWVudDsiLCJmdW5jdGlvbiBzYW1wbGVMb2FkZXIgKHVybCwgY29udGV4dCkge1xuICAgIFxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICBcbiAgICAgICAgcmVxdWVzdC5vcGVuKCdnZXQnLCB1cmwsIHRydWUpO1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYocmVxdWVzdC5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgICAgICAgY29udGV4dC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24gKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgndGlueS1zYW1wbGUtbG9hZGVyIHJlcXVlc3QgZmFpbGVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xubW9kdWxlLmV4cG9ydHMgPSBzYW1wbGVMb2FkZXI7IiwidmFyIFdBQUNsb2NrID0gcmVxdWlyZSgnLi9saWIvV0FBQ2xvY2snKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdBQUNsb2NrXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHdpbmRvdy5XQUFDbG9jayA9IFdBQUNsb2NrXG4iLCJ2YXIgaXNCcm93c2VyID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuXG52YXIgQ0xPQ0tfREVGQVVMVFMgPSB7XG4gIHRvbGVyYW5jZUxhdGU6IDAuMTAsXG4gIHRvbGVyYW5jZUVhcmx5OiAwLjAwMVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBFdmVudCA9PT09PT09PT09PT09PT09PT09PSAvL1xudmFyIEV2ZW50ID0gZnVuY3Rpb24oY2xvY2ssIGRlYWRsaW5lLCBmdW5jKSB7XG4gIHRoaXMuY2xvY2sgPSBjbG9ja1xuICB0aGlzLmZ1bmMgPSBmdW5jXG4gIHRoaXMuX2NsZWFyZWQgPSBmYWxzZSAvLyBGbGFnIHVzZWQgdG8gY2xlYXIgYW4gZXZlbnQgaW5zaWRlIGNhbGxiYWNrXG5cbiAgdGhpcy50b2xlcmFuY2VMYXRlID0gY2xvY2sudG9sZXJhbmNlTGF0ZVxuICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gY2xvY2sudG9sZXJhbmNlRWFybHlcbiAgdGhpcy5fbGF0ZXN0VGltZSA9IG51bGxcbiAgdGhpcy5fZWFybGllc3RUaW1lID0gbnVsbFxuICB0aGlzLmRlYWRsaW5lID0gbnVsbFxuICB0aGlzLnJlcGVhdFRpbWUgPSBudWxsXG5cbiAgdGhpcy5zY2hlZHVsZShkZWFkbGluZSlcbn1cblxuLy8gVW5zY2hlZHVsZXMgdGhlIGV2ZW50XG5FdmVudC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgdGhpcy5fY2xlYXJlZCA9IHRydWVcbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gU2V0cyB0aGUgZXZlbnQgdG8gcmVwZWF0IGV2ZXJ5IGB0aW1lYCBzZWNvbmRzLlxuRXZlbnQucHJvdG90eXBlLnJlcGVhdCA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgaWYgKHRpbWUgPT09IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKCdkZWxheSBjYW5ub3QgYmUgMCcpXG4gIHRoaXMucmVwZWF0VGltZSA9IHRpbWVcbiAgaWYgKCF0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSlcbiAgICB0aGlzLnNjaGVkdWxlKHRoaXMuZGVhZGxpbmUgKyB0aGlzLnJlcGVhdFRpbWUpXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFNldHMgdGhlIHRpbWUgdG9sZXJhbmNlIG9mIHRoZSBldmVudC5cbi8vIFRoZSBldmVudCB3aWxsIGJlIGV4ZWN1dGVkIGluIHRoZSBpbnRlcnZhbCBgW2RlYWRsaW5lIC0gZWFybHksIGRlYWRsaW5lICsgbGF0ZV1gXG4vLyBJZiB0aGUgY2xvY2sgZmFpbHMgdG8gZXhlY3V0ZSB0aGUgZXZlbnQgaW4gdGltZSwgdGhlIGV2ZW50IHdpbGwgYmUgZHJvcHBlZC5cbkV2ZW50LnByb3RvdHlwZS50b2xlcmFuY2UgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZXMubGF0ZSA9PT0gJ251bWJlcicpXG4gICAgdGhpcy50b2xlcmFuY2VMYXRlID0gdmFsdWVzLmxhdGVcbiAgaWYgKHR5cGVvZiB2YWx1ZXMuZWFybHkgPT09ICdudW1iZXInKVxuICAgIHRoaXMudG9sZXJhbmNlRWFybHkgPSB2YWx1ZXMuZWFybHlcbiAgdGhpcy5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzKClcbiAgaWYgKHRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKSB7XG4gICAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgICB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgZXZlbnQgaXMgcmVwZWF0ZWQsIGZhbHNlIG90aGVyd2lzZVxuRXZlbnQucHJvdG90eXBlLmlzUmVwZWF0ZWQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucmVwZWF0VGltZSAhPT0gbnVsbCB9XG5cbi8vIFNjaGVkdWxlcyB0aGUgZXZlbnQgdG8gYmUgcmFuIGJlZm9yZSBgZGVhZGxpbmVgLlxuLy8gSWYgdGhlIHRpbWUgaXMgd2l0aGluIHRoZSBldmVudCB0b2xlcmFuY2UsIHdlIGhhbmRsZSB0aGUgZXZlbnQgaW1tZWRpYXRlbHkuXG4vLyBJZiB0aGUgZXZlbnQgd2FzIGFscmVhZHkgc2NoZWR1bGVkIGF0IGEgZGlmZmVyZW50IHRpbWUsIGl0IGlzIHJlc2NoZWR1bGVkLlxuRXZlbnQucHJvdG90eXBlLnNjaGVkdWxlID0gZnVuY3Rpb24oZGVhZGxpbmUpIHtcbiAgdGhpcy5fY2xlYXJlZCA9IGZhbHNlXG4gIHRoaXMuZGVhZGxpbmUgPSBkZWFkbGluZVxuICB0aGlzLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMoKVxuXG4gIGlmICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPj0gdGhpcy5fZWFybGllc3RUaW1lKSB7XG4gICAgdGhpcy5fZXhlY3V0ZSgpXG4gIFxuICB9IGVsc2UgaWYgKHRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKSB7XG4gICAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgICB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxuICBcbiAgfSBlbHNlIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG59XG5cbkV2ZW50LnByb3RvdHlwZS50aW1lU3RyZXRjaCA9IGZ1bmN0aW9uKHRSZWYsIHJhdGlvKSB7XG4gIGlmICh0aGlzLmlzUmVwZWF0ZWQoKSlcbiAgICB0aGlzLnJlcGVhdFRpbWUgPSB0aGlzLnJlcGVhdFRpbWUgKiByYXRpb1xuXG4gIHZhciBkZWFkbGluZSA9IHRSZWYgKyByYXRpbyAqICh0aGlzLmRlYWRsaW5lIC0gdFJlZilcbiAgLy8gSWYgdGhlIGRlYWRsaW5lIGlzIHRvbyBjbG9zZSBvciBwYXN0LCBhbmQgdGhlIGV2ZW50IGhhcyBhIHJlcGVhdCxcbiAgLy8gd2UgY2FsY3VsYXRlIHRoZSBuZXh0IHJlcGVhdCBwb3NzaWJsZSBpbiB0aGUgc3RyZXRjaGVkIHNwYWNlLlxuICBpZiAodGhpcy5pc1JlcGVhdGVkKCkpIHtcbiAgICB3aGlsZSAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lID49IGRlYWRsaW5lIC0gdGhpcy50b2xlcmFuY2VFYXJseSlcbiAgICAgIGRlYWRsaW5lICs9IHRoaXMucmVwZWF0VGltZVxuICB9XG4gIHRoaXMuc2NoZWR1bGUoZGVhZGxpbmUpXG59XG5cbi8vIEV4ZWN1dGVzIHRoZSBldmVudFxuRXZlbnQucHJvdG90eXBlLl9leGVjdXRlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmNsb2NrLl9zdGFydGVkID09PSBmYWxzZSkgcmV0dXJuXG4gIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG5cbiAgaWYgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA8IHRoaXMuX2xhdGVzdFRpbWUpXG4gICAgdGhpcy5mdW5jKHRoaXMpXG4gIGVsc2Uge1xuICAgIGlmICh0aGlzLm9uZXhwaXJlZCkgdGhpcy5vbmV4cGlyZWQodGhpcylcbiAgICBjb25zb2xlLndhcm4oJ2V2ZW50IGV4cGlyZWQnKVxuICB9XG4gIC8vIEluIHRoZSBjYXNlIGBzY2hlZHVsZWAgaXMgY2FsbGVkIGluc2lkZSBgZnVuY2AsIHdlIG5lZWQgdG8gYXZvaWRcbiAgLy8gb3ZlcnJ3cml0aW5nIHdpdGggeWV0IGFub3RoZXIgYHNjaGVkdWxlYC5cbiAgaWYgKCF0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSAmJiB0aGlzLmlzUmVwZWF0ZWQoKSAmJiAhdGhpcy5fY2xlYXJlZClcbiAgICB0aGlzLnNjaGVkdWxlKHRoaXMuZGVhZGxpbmUgKyB0aGlzLnJlcGVhdFRpbWUpIFxufVxuXG4vLyBVcGRhdGVzIGNhY2hlZCB0aW1lc1xuRXZlbnQucHJvdG90eXBlLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fbGF0ZXN0VGltZSA9IHRoaXMuZGVhZGxpbmUgKyB0aGlzLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy5fZWFybGllc3RUaW1lID0gdGhpcy5kZWFkbGluZSAtIHRoaXMudG9sZXJhbmNlRWFybHlcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT0gV0FBQ2xvY2sgPT09PT09PT09PT09PT09PT09PT0gLy9cbnZhciBXQUFDbG9jayA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGV4dCwgb3B0cykge1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgb3B0cyA9IG9wdHMgfHwge31cbiAgdGhpcy50aWNrTWV0aG9kID0gb3B0cy50aWNrTWV0aG9kIHx8ICdTY3JpcHRQcm9jZXNzb3JOb2RlJ1xuICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gb3B0cy50b2xlcmFuY2VFYXJseSB8fCBDTE9DS19ERUZBVUxUUy50b2xlcmFuY2VFYXJseVxuICB0aGlzLnRvbGVyYW5jZUxhdGUgPSBvcHRzLnRvbGVyYW5jZUxhdGUgfHwgQ0xPQ0tfREVGQVVMVFMudG9sZXJhbmNlTGF0ZVxuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0XG4gIHRoaXMuX2V2ZW50cyA9IFtdXG4gIHRoaXMuX3N0YXJ0ZWQgPSBmYWxzZVxufVxuXG4vLyAtLS0tLS0tLS0tIFB1YmxpYyBBUEkgLS0tLS0tLS0tLSAvL1xuLy8gU2NoZWR1bGVzIGBmdW5jYCB0byBydW4gYWZ0ZXIgYGRlbGF5YCBzZWNvbmRzLlxuV0FBQ2xvY2sucHJvdG90eXBlLnNldFRpbWVvdXQgPSBmdW5jdGlvbihmdW5jLCBkZWxheSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRXZlbnQoZnVuYywgdGhpcy5fYWJzVGltZShkZWxheSkpXG59XG5cbi8vIFNjaGVkdWxlcyBgZnVuY2AgdG8gcnVuIGJlZm9yZSBgZGVhZGxpbmVgLlxuV0FBQ2xvY2sucHJvdG90eXBlLmNhbGxiYWNrQXRUaW1lID0gZnVuY3Rpb24oZnVuYywgZGVhZGxpbmUpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUV2ZW50KGZ1bmMsIGRlYWRsaW5lKVxufVxuXG4vLyBTdHJldGNoZXMgYGRlYWRsaW5lYCBhbmQgYHJlcGVhdGAgb2YgYWxsIHNjaGVkdWxlZCBgZXZlbnRzYCBieSBgcmF0aW9gLCBrZWVwaW5nXG4vLyB0aGVpciByZWxhdGl2ZSBkaXN0YW5jZSB0byBgdFJlZmAuIEluIGZhY3QgdGhpcyBpcyBlcXVpdmFsZW50IHRvIGNoYW5naW5nIHRoZSB0ZW1wby5cbldBQUNsb2NrLnByb3RvdHlwZS50aW1lU3RyZXRjaCA9IGZ1bmN0aW9uKHRSZWYsIGV2ZW50cywgcmF0aW8pIHtcbiAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHsgZXZlbnQudGltZVN0cmV0Y2godFJlZiwgcmF0aW8pIH0pXG4gIHJldHVybiBldmVudHNcbn1cblxuLy8gUmVtb3ZlcyBhbGwgc2NoZWR1bGVkIGV2ZW50cyBhbmQgc3RhcnRzIHRoZSBjbG9jayBcbldBQUNsb2NrLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fc3RhcnRlZCA9PT0gZmFsc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB0aGlzLl9zdGFydGVkID0gdHJ1ZVxuICAgIHRoaXMuX2V2ZW50cyA9IFtdXG5cbiAgICBpZiAodGhpcy50aWNrTWV0aG9kID09PSAnU2NyaXB0UHJvY2Vzc29yTm9kZScpIHtcbiAgICAgIHZhciBidWZmZXJTaXplID0gMjU2XG4gICAgICAvLyBXZSBoYXZlIHRvIGtlZXAgYSByZWZlcmVuY2UgdG8gdGhlIG5vZGUgdG8gYXZvaWQgZ2FyYmFnZSBjb2xsZWN0aW9uXG4gICAgICB0aGlzLl9jbG9ja05vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIDEsIDEpXG4gICAgICB0aGlzLl9jbG9ja05vZGUuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pXG4gICAgICB0aGlzLl9jbG9ja05vZGUub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7IHNlbGYuX3RpY2soKSB9KVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy50aWNrTWV0aG9kID09PSAnbWFudWFsJykgbnVsbCAvLyBfdGljayBpcyBjYWxsZWQgbWFudWFsbHlcblxuICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIHRpY2tNZXRob2QgJyArIHRoaXMudGlja01ldGhvZClcbiAgfVxufVxuXG4vLyBTdG9wcyB0aGUgY2xvY2tcbldBQUNsb2NrLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9zdGFydGVkID09PSB0cnVlKSB7XG4gICAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlXG4gICAgdGhpcy5fY2xvY2tOb2RlLmRpc2Nvbm5lY3QoKVxuICB9ICBcbn1cblxuLy8gLS0tLS0tLS0tLSBQcml2YXRlIC0tLS0tLS0tLS0gLy9cblxuLy8gVGhpcyBmdW5jdGlvbiBpcyByYW4gcGVyaW9kaWNhbGx5LCBhbmQgYXQgZWFjaCB0aWNrIGl0IGV4ZWN1dGVzXG4vLyBldmVudHMgZm9yIHdoaWNoIGBjdXJyZW50VGltZWAgaXMgaW5jbHVkZWQgaW4gdGhlaXIgdG9sZXJhbmNlIGludGVydmFsLlxuV0FBQ2xvY2sucHJvdG90eXBlLl90aWNrID0gZnVuY3Rpb24oKSB7XG4gIHZhciBldmVudCA9IHRoaXMuX2V2ZW50cy5zaGlmdCgpXG5cbiAgd2hpbGUoZXZlbnQgJiYgZXZlbnQuX2VhcmxpZXN0VGltZSA8PSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUpIHtcbiAgICBldmVudC5fZXhlY3V0ZSgpXG4gICAgZXZlbnQgPSB0aGlzLl9ldmVudHMuc2hpZnQoKVxuICB9XG5cbiAgLy8gUHV0IGJhY2sgdGhlIGxhc3QgZXZlbnRcbiAgaWYoZXZlbnQpIHRoaXMuX2V2ZW50cy51bnNoaWZ0KGV2ZW50KVxufVxuXG4vLyBDcmVhdGVzIGFuIGV2ZW50IGFuZCBpbnNlcnQgaXQgdG8gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5fY3JlYXRlRXZlbnQgPSBmdW5jdGlvbihmdW5jLCBkZWFkbGluZSkge1xuICByZXR1cm4gbmV3IEV2ZW50KHRoaXMsIGRlYWRsaW5lLCBmdW5jKVxufVxuXG4vLyBJbnNlcnRzIGFuIGV2ZW50IHRvIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX2luc2VydEV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdGhpcy5fZXZlbnRzLnNwbGljZSh0aGlzLl9pbmRleEJ5VGltZShldmVudC5fZWFybGllc3RUaW1lKSwgMCwgZXZlbnQpXG59XG5cbi8vIFJlbW92ZXMgYW4gZXZlbnQgZnJvbSB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9yZW1vdmVFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBpbmQgPSB0aGlzLl9ldmVudHMuaW5kZXhPZihldmVudClcbiAgaWYgKGluZCAhPT0gLTEpIHRoaXMuX2V2ZW50cy5zcGxpY2UoaW5kLCAxKVxufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgYGV2ZW50YCBpcyBpbiBxdWV1ZSwgZmFsc2Ugb3RoZXJ3aXNlXG5XQUFDbG9jay5wcm90b3R5cGUuX2hhc0V2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiByZXR1cm4gdGhpcy5fZXZlbnRzLmluZGV4T2YoZXZlbnQpICE9PSAtMVxufVxuXG4vLyBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgZmlyc3QgZXZlbnQgd2hvc2UgZGVhZGxpbmUgaXMgPj0gdG8gYGRlYWRsaW5lYFxuV0FBQ2xvY2sucHJvdG90eXBlLl9pbmRleEJ5VGltZSA9IGZ1bmN0aW9uKGRlYWRsaW5lKSB7XG4gIC8vIHBlcmZvcm1zIGEgYmluYXJ5IHNlYXJjaFxuICB2YXIgbG93ID0gMFxuICAgICwgaGlnaCA9IHRoaXMuX2V2ZW50cy5sZW5ndGhcbiAgICAsIG1pZFxuICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgIG1pZCA9IE1hdGguZmxvb3IoKGxvdyArIGhpZ2gpIC8gMilcbiAgICBpZiAodGhpcy5fZXZlbnRzW21pZF0uX2VhcmxpZXN0VGltZSA8IGRlYWRsaW5lKVxuICAgICAgbG93ID0gbWlkICsgMVxuICAgIGVsc2UgaGlnaCA9IG1pZFxuICB9XG4gIHJldHVybiBsb3dcbn1cblxuLy8gQ29udmVydHMgZnJvbSByZWxhdGl2ZSB0aW1lIHRvIGFic29sdXRlIHRpbWVcbldBQUNsb2NrLnByb3RvdHlwZS5fYWJzVGltZSA9IGZ1bmN0aW9uKHJlbFRpbWUpIHtcbiAgcmV0dXJuIHJlbFRpbWUgKyB0aGlzLmNvbnRleHQuY3VycmVudFRpbWVcbn1cblxuLy8gQ29udmVydHMgZnJvbSBhYnNvbHV0ZSB0aW1lIHRvIHJlbGF0aXZlIHRpbWUgXG5XQUFDbG9jay5wcm90b3R5cGUuX3JlbFRpbWUgPSBmdW5jdGlvbihhYnNUaW1lKSB7XG4gIHJldHVybiBhYnNUaW1lIC0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lXG59IiwiZnVuY3Rpb24gYXVkaW9EaXN0b3J0aW9uTm9kZShjdHgpIHtcblxuICAgIHRoaXMuY3R4ID0gY3R4O1xuICAgIHRoaXMuZGlzdG9ydGlvbjtcbiAgICB0aGlzLmFtb3VudCA9IDQwMDtcblxuICAgIHRoaXMuZ2V0RGlzdG9ydGlvbk5vZGUgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG5cbiAgICAgICAgaWYgKGFtb3VudCkge1xuICAgICAgICAgICAgdGhpcy5hbW91bnQgPSBhbW91bnQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmRpc3RvcnRpb24gPSB0aGlzLmN0eC5jcmVhdGVXYXZlU2hhcGVyKCk7XG4gICAgICAgIHRoaXMuZGlzdG9ydGlvbi5vdmVyc2FtcGxlID0gJzR4JztcbiAgICAgICAgdGhpcy5kaXN0b3J0aW9uLmN1cnZlID0gdGhpcy5tYWtlRGlzdG9ydGlvbkN1cnZlKHRoaXMuYW1vdW50KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlzdG9ydGlvbjtcbiAgICB9XG5cbiAgICB0aGlzLm1ha2VEaXN0b3J0aW9uQ3VydmUgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgICAgIHZhciBrID0gdHlwZW9mIGFtb3VudCA9PT0gJ251bWJlcicgPyBhbW91bnQgOiA1MCxcbiAgICAgICAgICAgICAgICBuX3NhbXBsZXMgPSA0NDEwMCxcbiAgICAgICAgICAgICAgICBjdXJ2ZSA9IG5ldyBGbG9hdDMyQXJyYXkobl9zYW1wbGVzKSxcbiAgICAgICAgICAgICAgICBkZWcgPSBNYXRoLlBJIC8gMTgwLFxuICAgICAgICAgICAgICAgIGkgPSAwLFxuICAgICAgICAgICAgICAgIHg7XG4gICAgICAgIGZvciAoOyBpIDwgbl9zYW1wbGVzOyArK2kpIHtcbiAgICAgICAgICAgIHggPSBpICogMiAvIG5fc2FtcGxlcyAtIDE7XG4gICAgICAgICAgICBjdXJ2ZVtpXSA9ICgzICsgaykgKiB4ICogMjAgKiBkZWcgLyAoTWF0aC5QSSArIGsgKiBNYXRoLmFicyh4KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnZlO1xuXG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBhdWRpb0Rpc3RvcnRpb25Ob2RlOyIsImNvbnN0IGdldFNldEZvcm1WYWx1ZXMgPSByZXF1aXJlKCdnZXQtc2V0LWZvcm0tdmFsdWVzJyk7XG5cbmZ1bmN0aW9uIGdldFNldENvbnRyb2xzKCkge1xuXG4gICAgdGhpcy5nZXRUcmFja2VyQ29udHJvbHMgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBmb3JtVmFsdWVzLmdldChmb3JtKTtcbiAgICAgICAgbGV0IHJldCA9IHt9O1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gdmFsdWVzKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdkZWxheUVuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSAnZGVsYXknO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2dhaW5FbmFibGVkJykge1xuICAgICAgICAgICAgICAgIHJldFtrZXldID0gJ2dhaW4nO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5ID09PSAnc2FtcGxlU2V0JykgeyBcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9IHZhbHVlc1trZXldO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0W2tleV0gPSBwYXJzZUZsb2F0KHZhbHVlc1trZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIHRoaXMuc2V0VHJhY2tlckNvbnRyb2xzID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICBpZiAoIXZhbHVlcykge1xuICAgICAgICAgICAgdmFsdWVzID0gdGhpcy5nZXRUcmFja2VyQ29udHJvbHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB2YWx1ZXM7XG4gICAgfTsgIFxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U2V0Q29udHJvbHM7XG4iLCIvLyByZXF1aXJlKFwiYmFiZWwtcG9seWZpbGxcIik7IFxuY29uc3QgbG9hZFNhbXBsZVNldCA9IHJlcXVpcmUoJ2xvYWQtc2FtcGxlLXNldCcpO1xuY29uc3Qgc2VsZWN0RWxlbWVudCA9IHJlcXVpcmUoJ3NlbGVjdC1lbGVtZW50Jyk7XG5jb25zdCBnZXRTZXRGb3JtVmFsdWVzID0gcmVxdWlyZSgnZ2V0LXNldC1mb3JtLXZhbHVlcycpO1xuY29uc3QgYWRzckdhaW5Ob2RlID0gcmVxdWlyZSgnYWRzci1nYWluLW5vZGUnKTtcbmNvbnN0IHNpbXBsZVRyYWNrZXIgPSByZXF1aXJlKCcuL3NpbXBsZS10cmFja2VyJyk7XG5jb25zdCBhdWRpb0Rpc3RvcnRpb25Ob2RlID0gcmVxdWlyZSgnLi9hdWRpby1kaXN0b3J0aW9uLW5vZGUnKTtcbmNvbnN0IHNhbXBsZUxvYWRlciA9IHJlcXVpcmUoJ3Rpbnktc2FtcGxlLWxvYWRlcicpO1xuY29uc3QgRmlsZVNhdmVyID0gcmVxdWlyZSgnZmlsZS1zYXZlcicpO1xuXG5jb25zdCBnZXRTZXRDb250cm9scyA9IHJlcXVpcmUoJy4vZ2V0LXNldC1jb250cm9scycpO1xuY29uc3QgZ2V0U2V0QXVkaW9PcHRpb25zID0gbmV3IGdldFNldENvbnRyb2xzKCk7XG5cbmNvbnN0IGN0eCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbmNvbnN0IGRlZmF1bHRUcmFjayA9IHJlcXVpcmUoJy4vdHJhY2stMicpO1xuXG52YXIgYnVmZmVycztcbnZhciBjdXJyZW50U2FtcGxlRGF0YTtcbnZhciBzdG9yYWdlO1xudmFyIHRyYWNrZXJEZWJ1ZztcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIGRhdGFVcmwsIHRyYWNrKSB7XG5cbiAgICB2YXIgc2FtcGxlU2V0UHJvbWlzZSA9IGxvYWRTYW1wbGVTZXQoY3R4LCBkYXRhVXJsKTtcbiAgICBzYW1wbGVTZXRQcm9taXNlLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcblxuICAgICAgICBidWZmZXJzID0gZGF0YS5idWZmZXJzO1xuICAgICAgICBzYW1wbGVEYXRhID0gZGF0YS5kYXRhO1xuXG4gICAgICAgIGlmICghdHJhY2spIHtcbiAgICAgICAgICAgIHRyYWNrID0gc3RvcmFnZS5nZXRUcmFjaygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoKSB7XG4gICAgICAgICAgICB0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoID0gMTY7XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50U2FtcGxlRGF0YSA9IHNhbXBsZURhdGE7XG4gICAgICAgIHNldHVwVHJhY2tlckh0bWwoc2FtcGxlRGF0YSwgdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCk7XG4gICAgICAgIHNjaGVkdWxlLmxvYWRUcmFja2VyVmFsdWVzKHRyYWNrLmJlYXQpO1xuICAgICAgICBzY2hlZHVsZS5zZXR1cEV2ZW50cygpO1xuICAgIH0pO1xuICAgXG59XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgbGV0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXJDb250cm9sc1wiKTtcblxuICAgIGZvcm1WYWx1ZXMuc2V0KGZvcm0sIGRlZmF1bHRUcmFjay5zZXR0aW5ncyk7XG4gICAgZ2V0U2V0QXVkaW9PcHRpb25zLnNldFRyYWNrZXJDb250cm9scyhkZWZhdWx0VHJhY2suc2V0dGluZ3MpO1xuXG4gICAgaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIGRlZmF1bHRUcmFjay5zZXR0aW5ncy5zYW1wbGVTZXQsIGRlZmF1bHRUcmFjayk7XG4gICAgc2V0dXBCYXNlRXZlbnRzKCk7XG5cbiAgICBzdG9yYWdlID0gbmV3IHRyYWNrc0xvY2FsU3RvcmFnZSgpO1xuICAgIHN0b3JhZ2Uuc2V0dXBTdG9yYWdlKCk7XG59O1xuXG52YXIgaW5zdHJ1bWVudERhdGEgPSB7fTtcbmZ1bmN0aW9uIHNldHVwVHJhY2tlckh0bWwoZGF0YSwgbWVhc3VyZUxlbmd0aCkge1xuICAgIGluc3RydW1lbnREYXRhID0gZGF0YTtcbiAgICBpbnN0cnVtZW50RGF0YS50aXRsZSA9IGluc3RydW1lbnREYXRhLmZpbGVuYW1lO1xuXG4gICAgXG4gICAgc2NoZWR1bGUuZHJhd1RyYWNrZXIoZGF0YS5maWxlbmFtZS5sZW5ndGgsIG1lYXN1cmVMZW5ndGgsIGluc3RydW1lbnREYXRhKTtcbiAgICByZXR1cm47XG59XG5cbmZ1bmN0aW9uIGRpc2Nvbm5lY3ROb2RlKG5vZGUsIG9wdGlvbnMpIHtcbiAgICBsZXQgdG90YWxMZW5ndGggPVxuICAgICAgICBvcHRpb25zLmF0dGFja1RpbWUgKyBvcHRpb25zLnN1c3RhaW5UaW1lICsgb3B0aW9ucy5yZWxlYXNlVGltZTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgbm9kZS5kaXNjb25uZWN0KCk7XG4gICAgfSwgdG90YWxMZW5ndGggKiAxMDAwKTtcbn1cblxuXG4vLyBjb21wcmVzc29yLmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcblxubGV0IGRpc3RvcnRpb25Ob2RlID0gbmV3IGF1ZGlvRGlzdG9ydGlvbk5vZGUoY3R4KTtcbmxldCBkaXN0b3J0aW9uID0gZGlzdG9ydGlvbk5vZGUuZ2V0RGlzdG9ydGlvbk5vZGUoMTAwKTtcblxuZnVuY3Rpb24gc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpIHtcblxuICAgIGxldCBpbnN0cnVtZW50TmFtZSA9IGluc3RydW1lbnREYXRhLmZpbGVuYW1lW2JlYXQucm93SWRdO1xuICAgIGxldCBpbnN0cnVtZW50ID0gYnVmZmVyc1tpbnN0cnVtZW50TmFtZV0uZ2V0KCk7XG4gICAgbGV0IG9wdGlvbnMgPSBnZXRTZXRBdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG5cbiAgICBmdW5jdGlvbiBwbGF5KHNvdXJjZSkge1xuXG4gICAgICAgIHNvdXJjZS5kZXR1bmUudmFsdWUgPSBvcHRpb25zLmRldHVuZTtcblxuICAgICAgICAvLyBHYWluXG4gICAgICAgIGxldCBub2RlID0gcm91dGVHYWluKHNvdXJjZSlcbiAgICAgICAgbm9kZSA9IHJvdXRlRGVsYXkobm9kZSk7XG4gICAgICAgIG5vZGUgPSByb3V0ZUNvbXByZXNzb3Iobm9kZSk7XG4gICAgICAgIG5vZGUuY29ubmVjdChjdHguZGVzdGluYXRpb24pO1xuICAgICAgICBzb3VyY2Uuc3RhcnQodHJpZ2dlclRpbWUpO1xuXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcm91dGVDb21wcmVzc29yIChub2RlKSB7XG4gICAgICAgIC8vIE5vdCB1c2VkIHlldFxuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgdmFyIGNvbXByZXNzb3IgPSBjdHguY3JlYXRlRHluYW1pY3NDb21wcmVzc29yKCk7XG4gICAgICAgIGNvbXByZXNzb3IudGhyZXNob2xkLnZhbHVlID0gLTEwMDsgLy8gLTEwMCAtIDBcbiAgICAgICAgY29tcHJlc3Nvci5rbmVlLnZhbHVlID0gMTA7IC8vIDEgLSA0MFxuICAgICAgICBjb21wcmVzc29yLnJhdGlvLnZhbHVlID0gMTI7IC8vIDEgLSAyMFxuICAgICAgICBjb21wcmVzc29yLmF0dGFjay52YWx1ZSA9IDE7IC8vIDAgLSAxXG4gICAgICAgIGNvbXByZXNzb3IucmVsZWFzZS52YWx1ZSA9IDA7IC8vIDAgLSAxXG5cbiAgICAgICAgbm9kZS5jb25uZWN0KGNvbXByZXNzb3IpO1xuICAgICAgICByZXR1cm4gY29tcHJlc3NvcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByb3V0ZUdhaW4gKHNvdXJjZSkge1xuICAgICAgICBsZXQgZ2FpbiA9IG5ldyBhZHNyR2Fpbk5vZGUoY3R4KTtcbiAgICAgICAgbGV0IG9wdGlvbnMgPSBnZXRTZXRBdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIGxldCBnYWluTm9kZTsgXG5cbiAgICAgICAgLy8gTm90IGVuYWJsZWQgLSBkZWZhdWx0IGdhaW5cbiAgICAgICAgaWYgKCFvcHRpb25zLmdhaW5FbmFibGVkKSB7XG4gICAgICAgICAgICBnYWluTm9kZSA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuICAgICAgICAgICAgc291cmNlLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICAgICAgcmV0dXJuIGdhaW5Ob2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgZ2Fpbi5zZXRPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICBnYWluTm9kZSA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuICAgICAgICBzb3VyY2UuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICAgIHJldHVybiBnYWluTm9kZTtcblxuXG4gICAgfVxuXG4gICAgLy8gTm90ZSBkZWxheSBhbHdheXMgdXNlcyBhYm92ZSBnYWluIC0gZXZlbiBpZiBub3QgZW5hYmxlZFxuICAgIGZ1bmN0aW9uIHJvdXRlRGVsYXkobm9kZSkge1xuICAgICAgICBpZiAoIW9wdGlvbnMuZGVsYXlFbmFibGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNyZWF0ZSBkZWxheSBub2RlXG4gICAgICAgIGxldCBkZWxheSA9IGN0eC5jcmVhdGVEZWxheSgpO1xuICAgICAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBvcHRpb25zLmRlbGF5O1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhZHNyIGdhaW4gbm9kZVxuICAgICAgICBsZXQgZ2FpbiA9IG5ldyBhZHNyR2Fpbk5vZGUoY3R4KTtcbiAgICAgICAgZ2Fpbi5zZXRPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICBsZXQgZmVlZGJhY2tHYWluID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGZpbHRlclxuICAgICAgICBsZXQgZmlsdGVyID0gY3R4LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICBmaWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gb3B0aW9ucy5maWx0ZXI7XG5cbiAgICAgICAgLy8gZGVsYXkgLT4gZmVlZGJhY2tHYWluXG4gICAgICAgIGRlbGF5LmNvbm5lY3QoZmVlZGJhY2tHYWluKTtcbiAgICAgICAgZGlzY29ubmVjdE5vZGUoZGVsYXksIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIGZlZWRiYWNrIC0+IGZpbHRlclxuICAgICAgICBmZWVkYmFja0dhaW4uY29ubmVjdChmaWx0ZXIpO1xuXG4gICAgICAgIC8vIGZpbHRlciAtPmRlbGF5XG4gICAgICAgIGZpbHRlci5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICBub2RlLmNvbm5lY3QoZGVsYXkpO1xuXG4gICAgICAgIHJldHVybiBkZWxheTtcbiAgICB9XG4gICAgcGxheShpbnN0cnVtZW50KTtcbn1cblxudmFyIHNjaGVkdWxlID0gbmV3IHNpbXBsZVRyYWNrZXIoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCk7XG5cbmZ1bmN0aW9uIHNldHVwQmFzZUV2ZW50cygpIHtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICBzY2hlZHVsZS5ydW5TY2hlZHVsZShnZXRTZXRBdWRpb09wdGlvbnMub3B0aW9ucy5icG0pO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhdXNlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RvcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICBzY2hlZHVsZSA9IG5ldyBzaW1wbGVUcmFja2VyKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JwbScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGdldFNldEF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoKTtcbiAgICAgICAgaWYgKHNjaGVkdWxlLnJ1bm5pbmcpIHtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnJ1blNjaGVkdWxlKGdldFNldEF1ZGlvT3B0aW9ucy5vcHRpb25zLmJwbSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZWFzdXJlTGVuZ3RoJykuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoZSkgPT4ge1xuXG4gICAgICAgICQoJyNtZWFzdXJlTGVuZ3RoJykuYmluZCgna2V5cHJlc3Mga2V5ZG93biBrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVhc3VyZUxlbmd0aCcpLnZhbHVlO1xuICAgICAgICAgICAgICAgIGxldCBsZW5ndGggPSBwYXJzZUludCh2YWx1ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobGVuZ3RoIDwgMSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSBsZW5ndGg7XG5cbiAgICAgICAgICAgICAgICBsZXQgdHJhY2sgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgc2V0dXBUcmFja2VySHRtbChjdXJyZW50U2FtcGxlRGF0YSwgbGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gbGVuZ3RoO1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlLmxvYWRUcmFja2VyVmFsdWVzKHRyYWNrKVxuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnNldHVwRXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgJCgnLmJhc2UnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgfSk7XG59XG5cbiQoJyNzYW1wbGVTZXQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0aGlzLnZhbHVlKTtcbn0pO1xuXG5mdW5jdGlvbiB0cmFja3NMb2NhbFN0b3JhZ2UoKSB7XG5cbiAgICB0aGlzLnNldExvY2FsU3RvcmFnZSA9IGZ1bmN0aW9uICh1cGRhdGUpIHtcbiAgICAgICAgdmFyIHN0b3JhZ2UgPSB7fTtcbiAgICAgICAgc3RvcmFnZVsnU2VsZWN0J10gPSAnU2VsZWN0JztcblxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBsb2NhbFN0b3JhZ2UubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gbG9jYWxTdG9yYWdlLmtleShpKTtcbiAgICAgICAgICAgIHN0b3JhZ2VbaXRlbV0gPSBpdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHNlbGVjdCBlbGVtZW50XG4gICAgICAgIHZhciBzID0gbmV3IHNlbGVjdEVsZW1lbnQoXG4gICAgICAgICAgICAnbG9hZC1zdG9yYWdlJywgLy8gaWQgdG8gYXBwZW5kIHRoZSBzZWxlY3QgbGlzdCB0b1xuICAgICAgICAgICAgJ2JlYXQtbGlzdCcsIC8vIGlkIG9mIHRoZSBzZWxlY3QgbGlzdFxuICAgICAgICAgICAgc3RvcmFnZSAvL1xuICAgICAgICApO1xuXG4gICAgICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgICAgIHMudXBkYXRlKCdiZWF0LWxpc3QnLCBzdG9yYWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMuY3JlYXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRGaWxlbmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGZpbGVuYW1lID0gJCgnI2ZpbGVuYW1lJykudmFsKCk7XG4gICAgICAgIGlmICghZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIGZpbGVuYW1lID0gJ3VudGl0bGVkJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsZW5hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGNvbXBsZXRlIHNvbmdcbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgZm9ybURhdGEgPSBnZXRTZXRBdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG5cbiAgICAgICAgbGV0IGJlYXQgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgIGxldCBzb25nID0geyBcImJlYXRcIjogYmVhdCwgXCJzZXR0aW5nc1wiOiBmb3JtRGF0YSB9O1xuICAgICAgICByZXR1cm4gc29uZztcbiAgICB9XG5cbiAgICB0aGlzLnNldHVwU3RvcmFnZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgbGV0IHNvbmcgPSB0aGlzLmdldFRyYWNrKCk7XG4gICAgICAgICAgICBsZXQganNvbiA9IEpTT04uc3RyaW5naWZ5KHNvbmcpO1xuXG4gICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSB0aGlzLmdldEZpbGVuYW1lKCk7XG5cbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGZpbGVuYW1lLCBqc29uKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcblxuICAgICAgICAgICAgJChcIiNiZWF0LWxpc3RcIikudmFsKGZpbGVuYW1lKTtcbiAgICAgICAgICAgIC8vIGFsZXJ0KCdUcmFjayBzYXZlZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBzYXZlQXNKc29uXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlQXNKc29uJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBsZXQgc29uZyA9IHRoaXMuZ2V0VHJhY2soKTtcbiAgICAgICAgICAgIGxldCBqc29uID0gSlNPTi5zdHJpbmdpZnkoc29uZyk7XG5cbiAgICAgICAgICAgIGxldCBmaWxlbmFtZSA9IHRoaXMuZ2V0RmlsZW5hbWUoKTtcblxuICAgICAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbanNvbl0sIHt0eXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIn0pO1xuICAgICAgICAgICAgRmlsZVNhdmVyLnNhdmVBcyhibG9iLCBmaWxlbmFtZSArIFwiLmpzb25cIik7XG5cblxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjZmlsZW5hbWUnKS5iaW5kKCdrZXlwcmVzcyBrZXlkb3duIGtleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiZWF0LWxpc3QnKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSAkKCcjYmVhdC1saXN0JykudmFsKCk7XG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gJ1NlbGVjdCcpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSBpdGVtO1xuICAgICAgICAgICAgbGV0IHRyYWNrID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShpdGVtKSk7XG5cbiAgICAgICAgICAgIGxldCBmb3JtVmFsdWVzID0gbmV3IGdldFNldEZvcm1WYWx1ZXMoKTtcbiAgICAgICAgICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG5cbiAgICAgICAgICAgIGZvcm1WYWx1ZXMuc2V0KGZvcm0sIHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgICAgIGdldFNldEF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHModHJhY2suc2V0dGluZ3MpO1xuICAgICAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICAgICAgc2NoZWR1bGUubWVhc3VyZUxlbmd0aCA9IHRyYWNrLnNldHRpbmdzLm1lYXN1cmVMZW5ndGg7XG5cbiAgICAgICAgICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0cmFjay5zZXR0aW5ncy5zYW1wbGVTZXQsIHRyYWNrKTtcblxuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGVsZXRlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmVhdC1saXN0Jyk7XG4gICAgICAgICAgICBsZXQgdG9EZWxldGUgPSBlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS50ZXh0O1xuXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0b0RlbGV0ZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UoJ3VwZGF0ZScpO1xuXG4gICAgICAgIH0pO1xuICAgIH07XG59XG4iLCJjb25zdCBXQUFDbG9jayA9IHJlcXVpcmUoJ3dhYWNsb2NrJyk7XG5jb25zdCB0cmFja2VyVGFibGUgPSByZXF1aXJlKCcuL3RyYWNrZXItdGFibGUnKTtcbmNvbnN0IGhhc0NsYXNzID0gcmVxdWlyZSgnaGFzLWNsYXNzJyk7XG5cbi8qKlxuICogQ29uc3RydWN0IG9iamVjdFxuICogQHBhcmFtIHthdWRpb0NvbnRleHR9IGN0eCBcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHNjaGVkdWxlQXVkaW9CZWF0IGZ1bnRpb24gdG8gY2FsbCBwbGFubmluZyBmb3J3YXJkXG4gKi9cbmZ1bmN0aW9uIHRyYWNrZXIoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCkge1xuXG4gICAgdGhpcy5tZWFzdXJlTGVuZ3RoID0gMTY7XG4gICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdCA9IHNjaGVkdWxlQXVkaW9CZWF0O1xuICAgIHRoaXMuc2NoZWR1bGVGb3J3YXJkID0gMC4xO1xuICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgdGhpcy5ldmVudE1hcCA9IHt9O1xuICAgIHRoaXMuY2xvY2sgPSBuZXcgV0FBQ2xvY2soY3R4KTtcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XG4gICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBEcmF3IGEgdHJhY2tlciB0YWJsZSBieSBudW1Sb3dzIGFuZCBudW1Db2xzXG4gICAgICovXG4gICAgdGhpcy5kcmF3VHJhY2tlciA9IGZ1bmN0aW9uKG51bVJvd3MsIG51bUNvbHMsIGRhdGEpIHtcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sVGFibGUgPSBuZXcgdHJhY2tlclRhYmxlKCk7XG4gICAgICAgIFxuICAgICAgICBodG1sVGFibGUuc2V0Um93cyhudW1Sb3dzLCBudW1Db2xzLCBkYXRhKTtcbiAgICAgICAgbGV0IHN0ciA9IGh0bWxUYWJsZS5nZXRUYWJsZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyLXBhcmVudFwiKS5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgbGV0IHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndHJhY2tlci1wYXJlbnQnKTtcbiAgICAgICAgdC5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgdC5pbnNlcnRBZGphY2VudEhUTUwoJ2FmdGVyYmVnaW4nLCBzdHIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFB1c2ggY3VycmVudCBiZWF0IG9uZSBmb3J3YXJkXG4gICAgICovXG4gICAgdGhpcy5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmN1cnJlbnQrKztcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudCA+PSB0aGlzLm1lYXN1cmVMZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIG1pbGxpIHNlY29uZHMgcGVyIGJlYXRcbiAgICAgKi9cbiAgICB0aGlzLm1pbGxpUGVyQmVhdCA9IGZ1bmN0aW9uIChiZWF0cykge1xuICAgICAgICBpZiAoIWJlYXRzKSB7XG4gICAgICAgICAgICBiZWF0cyA9IDYwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAxMDAwICogNjAgLyBiZWF0cztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0IGEgdHJhY2tlciByb3cgZnJvbSBhIGNlbGwtaWRcbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWNrZXJSb3dWYWx1ZXMgPSBmdW5jdGlvbiAoY2VsbElkKSB7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLWNlbGwtaWQ9XCIke2NlbGxJZH1cIl1gO1xuXG4gICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICBlbGVtcy5mb3JFYWNoKChlbCkgPT4ge1xuICAgICAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIGVsLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBlbC5jbGFzc0xpc3QuY29udGFpbnMoJ3RyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICAgICAgdmFsdWVzLnB1c2godmFsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNjaGVkdWxlIGEgYmVhdCBjb2x1bW5cbiAgICAgKi9cbiAgICB0aGlzLnNjaGVkdWxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgYmVhdENvbHVtbiA9IHRoaXMuZ2V0VHJhY2tlclJvd1ZhbHVlcyh0aGlzLmN1cnJlbnQpO1xuICAgICAgICBsZXQgbm93ID0gY3R4LmN1cnJlbnRUaW1lO1xuXG4gICAgICAgIGxldCBzZWxlY3RvciA9IGBbZGF0YS1jZWxsLWlkPVwiJHt0aGlzLmN1cnJlbnR9XCJdYDtcblxuICAgICAgICBsZXQgZXZlbnQgPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgZWxlbXMuZm9yRWFjaCggKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLmNsYXNzTGlzdC5hZGQoJ3RyYWNrZXItY3VycmVudCcpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCk7XG5cbiAgICAgICAgdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIGVsZW1zLmZvckVhY2goIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5jbGFzc0xpc3QucmVtb3ZlKCd0cmFja2VyLWN1cnJlbnQnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQgKyB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwKTtcblxuICAgICAgICBiZWF0Q29sdW1uLmZvckVhY2goKGJlYXQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVCZWF0KGJlYXQsIG5vdyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlQmVhdCA9IGZ1bmN0aW9uIChiZWF0LCBub3cpIHtcblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZDtcbiAgICAgICAgdGhpcy5zY2hlZHVsZU1hcFtiZWF0LmNlbGxJZF0gPSB0cmlnZ2VyVGltZTtcbiAgICAgICAgaWYgKGJlYXQuZW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXSA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICAgICAgfSwgbm93KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlTWFwID0ge307XG5cbiAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0Tm93ID0gZnVuY3Rpb24gKGJlYXQpIHtcblxuICAgICAgICBpZiAoYmVhdC5lbmFibGVkKSB7XG4gICAgICAgICAgICBsZXQgYmVhdEV2ZW50ID0gdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIGlmIChiZWF0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICBiZWF0RXZlbnQuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB0cmlnZ2VyVGltZSA9IHRoaXMuc2NoZWR1bGVNYXBbMF0gKyBiZWF0LmNlbGxJZCAqIHRoaXMubWlsbGlQZXJCZWF0KHRoaXMuYnBtKSAvIDEwMDA7XG4gICAgICAgIGxldCBub3cgPSBjdHguY3VycmVudFRpbWU7XG4gICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICB9LCBub3cpO1xuICAgIH07XG5cbiAgICB0aGlzLmludGVydmFsO1xuICAgIHRoaXMucnVuU2NoZWR1bGUgPSBmdW5jdGlvbiAoYnBtKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuYnBtID0gYnBtO1xuICAgICAgICBsZXQgaW50ZXJ2YWwgPSB0aGlzLm1pbGxpUGVyQmVhdChicG0pO1xuXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgIH0sIDApO1xuXG4gICAgICAgIHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcblxuICAgICAgICB9LCBpbnRlcnZhbCk7XG4gICAgfTtcblxuICAgIHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RXZlbnRLZXkgPSBmdW5jdGlvbiBnZXRFdmVudEtleShiZWF0KSB7XG4gICAgICAgIHJldHVybiBiZWF0LnJvd0lkICsgYmVhdC5jZWxsSWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCB0cmFja2VyIHZhbHVlc1xuICAgICAqL1xuICAgIHRoaXMuZ2V0VHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudHJhY2tlci1jZWxsJyk7XG4gICAgICAgIGVsZW1zLmZvckVhY2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBoYXNDbGFzcyhlLCBcInRyYWNrZXItZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHRyYWNrZXIgdmFsdWVzIGluIEpTT04gZm9ybWF0XG4gICAgICovXG4gICAgdGhpcy5sb2FkVHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uIChqc29uKSB7XG5cbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZSgndHJhY2tlci1lbmFibGVkJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGpzb24uZm9yRWFjaChmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEuZW5hYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAudHJhY2tlci1jZWxsW2RhdGEtcm93LWlkPVwiJHtkYXRhLnJvd0lkfVwiXVtkYXRhLWNlbGwtaWQ9XCIke2RhdGEuY2VsbElkfVwiXWA7XG4gICAgICAgICAgICAgICAgbGV0IGVsZW0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNsYXNzTGlzdC5hZGQoXCJ0cmFja2VyLWVuYWJsZWRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTGlzdGVuIG9uIHRyYWNrZXItY2VsbFxuICAgICAqIFNjaGVkdWxlIGlmIGNlbGwgaXMgY2xpY2tlZCBhbmQgdG9nZ2xlIGNzcyBjbGFzc1xuICAgICAqL1xuICAgIHRoaXMuc2V0dXBFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFxuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudHJhY2tlci1jZWxsJyk7XG4gICAgICAgIFxuICAgICAgICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlLnRhcmdldC5kYXRhc2V0KTtcbiAgICAgICAgICAgICAgICB2YWwuZW5hYmxlZCA9IGhhc0NsYXNzKGUudGFyZ2V0LCBcInRyYWNrZXItZW5hYmxlZFwiKTtcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudEJlYXQgPSBlLnRhcmdldC5kYXRhc2V0LmNlbGxJZDtcbiAgICAgICAgICAgICAgICBpZiAodmFsLmNlbGxJZCA+IGN1cnJlbnRCZWF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXROb3codmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZS50YXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSgndHJhY2tlci1lbmFibGVkJyk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0cmFja2VyOyIsIm1vZHVsZS5leHBvcnRzPW1vZHVsZS5leHBvcnRzID0ge1wiYmVhdFwiOlt7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjExXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjExXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEyXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEyXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTVcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTVcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTZcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTZcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTdcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTdcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMThcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMThcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTlcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTlcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjBcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjBcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjFcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjFcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjJcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjJcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjNcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjNcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjRcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjRcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjVcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjVcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjZcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjZcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjdcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjdcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjhcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjhcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX1dLFwic2V0dGluZ3NcIjp7XCJzYW1wbGVTZXRcIjpcImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9vcmFtaWNzL3NhbXBsZWQvbWFzdGVyL0RNL0xNLTIvc2FtcGxlZC5pbnN0cnVtZW50Lmpzb25cIixcIm1lYXN1cmVMZW5ndGhcIjoxNixcImJwbVwiOjE5MCxcImRldHVuZVwiOi0xMjAwLFwiaW5pdEdhaW5cIjoxLFwibWF4R2FpblwiOjEsXCJhdHRhY2tUaW1lXCI6MSxcInN1c3RhaW5UaW1lXCI6MS45LFwicmVsZWFzZVRpbWVcIjo1LFwiZGVsYXlFbmFibGVkXCI6XCJkZWxheVwiLFwiZGVsYXlcIjowLjYzLFwiZmlsdGVyXCI6OTkyLjZ9fSIsImZ1bmN0aW9uIHRyYWNrZXJUYWJsZSgpIHtcblxuICAgIHRoaXMuc3RyID0gJyc7XG4gICAgdGhpcy5nZXRUYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICc8dGFibGUgaWQ9XCJ0cmFja2VyLXRhYmxlXCI+JyArIHRoaXMuc3RyICsgJzwvdGFibGU+JztcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRIZWFkZXIgPSBmdW5jdGlvbiAobnVtQ2VsbHMsIGRhdGEpIHtcbiAgICAgICAgdGhpcy5zdHIgKz0gYDx0ciBjbGFzcz1cInRyYWNrZXItcm93IGhlYWRlclwiPmA7XG4gICAgICAgIHRoaXMuc3RyICs9IHRoaXMuZ2V0Q2VsbHMoJ2hlYWRlcicsIG51bUNlbGxzLCB7IGhlYWRlcjogdHJ1ZSB9KTtcbiAgICAgICAgdGhpcy5zdHIgKz0gYDwvdHI+YDtcblxuICAgIH07XG5cbiAgICB0aGlzLnNldFJvd3MgPSBmdW5jdGlvbiAobnVtUm93cywgbnVtQ2VsbHMsIGRhdGEpIHtcblxuICAgICAgICB0aGlzLnNldEhlYWRlcihudW1DZWxscywgZGF0YSk7XG4gICAgICAgIGZvciAobGV0IHJvd0lEID0gMDsgcm93SUQgPCBudW1Sb3dzOyByb3dJRCsrKSB7XG4gICAgICAgICAgICB0aGlzLnN0ciArPSBgPHRyIGNsYXNzPVwidHJhY2tlci1yb3dcIiBkYXRhLWlkPVwiJHtyb3dJRH1cIj5gO1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gdGhpcy5nZXRDZWxscyhyb3dJRCwgbnVtQ2VsbHMsIGRhdGEpO1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gYDwvdHI+YDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldEZpcnN0Q2VsbCA9IGZ1bmN0aW9uIChyb3dJRCwgZGF0YSkge1xuICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgIFxuICAgICAgICBzdHIgKz0gYDx0ZCBjbGFzcz1cInRyYWNrZXItY2VsbCB0cmFja2VyLWZpcnN0LWNlbGxcIiBkYXRhLXJvdy1pZD1cIiR7cm93SUR9XCI+YDtcbiAgICAgICAgaWYgKGRhdGEudGl0bGUpIHsgXG4gICAgICAgICAgICBzdHIgKz0gZGF0YS50aXRsZVtyb3dJRF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN0ciArPSBgPC90ZD5gO1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH07XG5cbiAgICB0aGlzLmdldENlbGxzID0gZnVuY3Rpb24gKHJvd0lELCBudW1DZWxscywgZGF0YSkge1xuICAgICAgICB2YXIgc3RyID0gJyc7XG5cbiAgICAgICAgc3RyICs9IHRoaXMuZ2V0Rmlyc3RDZWxsKHJvd0lELCBkYXRhKTtcblxuICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IG51bUNlbGxzOyBjKyspIHtcbiAgICAgICAgICAgIHN0ciArPSBgPHRkIGNsYXNzPVwidHJhY2tlci1jZWxsXCIgZGF0YS1yb3ctaWQ9XCIke3Jvd0lEfVwiIGRhdGEtY2VsbC1pZD1cIiR7Y31cIj5gO1xuICAgICAgICAgICAgaWYgKGRhdGEuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGMgKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RyICs9IGA8L3RkPmA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYWNrZXJUYWJsZTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
