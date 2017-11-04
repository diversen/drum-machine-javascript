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

    this.getTotalLength = function () {
        return this.options.attackTime + this.options.sustainTime + this.options.releaseTime
    }
    
    this.disconnect = function() {
        var totalLength = this.getTotalLength();
        
        setTimeout( () => {
            this.gainNode.disconnect();
        },
        totalLength * 1000);
    };
}

module.exports = Gain;
},{}],2:[function(require,module,exports){
// From: https://dev.opera.com/articles/drum-sounds-webaudio/
function audioBufferInstrument(context, buffer) {
    this.context = context;
    this.buffer = buffer;
}

audioBufferInstrument.prototype.setup = function () {
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.context.destination);
};

audioBufferInstrument.prototype.get = function () {
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    return this.source;
};

audioBufferInstrument.prototype.trigger = function (time) {
    this.setup();
    this.source.start(time);
};

module.exports = audioBufferInstrument;
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
function getJSONPromise(url) {

    var promise = new Promise((resolve, reject) => {
        var request = new XMLHttpRequest();

        request.open('get', url, true);
        request.responseType = 'text';
        request.onload = function () {
            if (request.status === 200) {
                try {
                    resolve(JSON.parse(request.responseText));
                } catch (error) {
                    reject(error);
                }
            } else {
                reject('JSON could not be loaded ' + url);
            }
        };
        request.send();
    });

    return promise;
}

module.exports = getJSONPromise;

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{"obj-type":9}],7:[function(require,module,exports){
var tinySampleLoader = require('tiny-sample-loader');
var audioBufferInstrument = require('audio-buffer-instrument');
var getJSON = require('get-json-promise');

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

        let loaderPromise = tinySampleLoader(ctx, remoteUrl);
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

},{"audio-buffer-instrument":2,"get-json-promise":4,"tiny-sample-loader":8}],8:[function(require,module,exports){
function sampleLoader (context, url) {
    
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

},{}],9:[function(require,module,exports){
'use strict';
module.exports = function (obj) {
	return Object.prototype.toString.call(obj).replace(/^\[object (.+)\]$/, '$1').toLowerCase();
};

},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
var WAAClock = require('./lib/WAAClock')

module.exports = WAAClock
if (typeof window !== 'undefined') window.WAAClock = WAAClock

},{"./lib/WAAClock":13}],13:[function(require,module,exports){
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

},{"_process":20}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
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

},{"get-set-form-values":5}],16:[function(require,module,exports){
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

},{"./audio-distortion-node":14,"./get-set-controls":15,"./simple-tracker":17,"./track-2":18,"adsr-gain-node":1,"file-saver":3,"get-set-form-values":5,"load-sample-set":7,"select-element":10,"tiny-sample-loader":11}],17:[function(require,module,exports){
const WAAClock = require('waaclock');
const trackerTable = require('./tracker-table-svg');
const hasClass = require('has-class');

/**
 * Construct object
 * @param {audioContext} ctx 
 * @param {function} scheduleAudioBeat funtion when an audio is played
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
},{"./tracker-table-svg":19,"has-class":6,"waaclock":12}],18:[function(require,module,exports){
module.exports=module.exports = {"beat":[{"rowId":"header","cellId":"0","enabled":false},{"rowId":"header","cellId":"1","enabled":false},{"rowId":"header","cellId":"2","enabled":false},{"rowId":"header","cellId":"3","enabled":false},{"rowId":"header","cellId":"4","enabled":false},{"rowId":"header","cellId":"5","enabled":false},{"rowId":"header","cellId":"6","enabled":false},{"rowId":"header","cellId":"7","enabled":false},{"rowId":"header","cellId":"8","enabled":false},{"rowId":"header","cellId":"9","enabled":false},{"rowId":"header","cellId":"10","enabled":false},{"rowId":"header","cellId":"11","enabled":false},{"rowId":"header","cellId":"12","enabled":false},{"rowId":"header","cellId":"13","enabled":false},{"rowId":"header","cellId":"14","enabled":false},{"rowId":"header","cellId":"15","enabled":false},{"rowId":"0","cellId":"0","enabled":false},{"rowId":"0","cellId":"1","enabled":false},{"rowId":"0","cellId":"2","enabled":false},{"rowId":"0","cellId":"3","enabled":false},{"rowId":"0","cellId":"4","enabled":false},{"rowId":"0","cellId":"5","enabled":false},{"rowId":"0","cellId":"6","enabled":false},{"rowId":"0","cellId":"7","enabled":false},{"rowId":"0","cellId":"8","enabled":false},{"rowId":"0","cellId":"9","enabled":false},{"rowId":"0","cellId":"10","enabled":false},{"rowId":"0","cellId":"11","enabled":false},{"rowId":"0","cellId":"12","enabled":false},{"rowId":"0","cellId":"13","enabled":false},{"rowId":"0","cellId":"14","enabled":false},{"rowId":"0","cellId":"15","enabled":false},{"rowId":"1","cellId":"0","enabled":false},{"rowId":"1","cellId":"1","enabled":false},{"rowId":"1","cellId":"2","enabled":false},{"rowId":"1","cellId":"3","enabled":false},{"rowId":"1","cellId":"4","enabled":false},{"rowId":"1","cellId":"5","enabled":false},{"rowId":"1","cellId":"6","enabled":false},{"rowId":"1","cellId":"7","enabled":false},{"rowId":"1","cellId":"8","enabled":false},{"rowId":"1","cellId":"9","enabled":false},{"rowId":"1","cellId":"10","enabled":false},{"rowId":"1","cellId":"11","enabled":false},{"rowId":"1","cellId":"12","enabled":false},{"rowId":"1","cellId":"13","enabled":false},{"rowId":"1","cellId":"14","enabled":false},{"rowId":"1","cellId":"15","enabled":false},{"rowId":"2","cellId":"0","enabled":false},{"rowId":"2","cellId":"1","enabled":false},{"rowId":"2","cellId":"2","enabled":false},{"rowId":"2","cellId":"3","enabled":false},{"rowId":"2","cellId":"4","enabled":false},{"rowId":"2","cellId":"5","enabled":false},{"rowId":"2","cellId":"6","enabled":false},{"rowId":"2","cellId":"7","enabled":false},{"rowId":"2","cellId":"8","enabled":false},{"rowId":"2","cellId":"9","enabled":false},{"rowId":"2","cellId":"10","enabled":false},{"rowId":"2","cellId":"11","enabled":false},{"rowId":"2","cellId":"12","enabled":false},{"rowId":"2","cellId":"13","enabled":false},{"rowId":"2","cellId":"14","enabled":false},{"rowId":"2","cellId":"15","enabled":false},{"rowId":"3","cellId":"0","enabled":false},{"rowId":"3","cellId":"1","enabled":false},{"rowId":"3","cellId":"2","enabled":false},{"rowId":"3","cellId":"3","enabled":false},{"rowId":"3","cellId":"4","enabled":false},{"rowId":"3","cellId":"5","enabled":false},{"rowId":"3","cellId":"6","enabled":false},{"rowId":"3","cellId":"7","enabled":false},{"rowId":"3","cellId":"8","enabled":false},{"rowId":"3","cellId":"9","enabled":false},{"rowId":"3","cellId":"10","enabled":false},{"rowId":"3","cellId":"11","enabled":false},{"rowId":"3","cellId":"12","enabled":false},{"rowId":"3","cellId":"13","enabled":false},{"rowId":"3","cellId":"14","enabled":false},{"rowId":"3","cellId":"15","enabled":false},{"rowId":"4","cellId":"0","enabled":true},{"rowId":"4","cellId":"1","enabled":false},{"rowId":"4","cellId":"2","enabled":false},{"rowId":"4","cellId":"3","enabled":false},{"rowId":"4","cellId":"4","enabled":false},{"rowId":"4","cellId":"5","enabled":false},{"rowId":"4","cellId":"6","enabled":false},{"rowId":"4","cellId":"7","enabled":false},{"rowId":"4","cellId":"8","enabled":false},{"rowId":"4","cellId":"9","enabled":false},{"rowId":"4","cellId":"10","enabled":false},{"rowId":"4","cellId":"11","enabled":false},{"rowId":"4","cellId":"12","enabled":true},{"rowId":"4","cellId":"13","enabled":false},{"rowId":"4","cellId":"14","enabled":true},{"rowId":"4","cellId":"15","enabled":false},{"rowId":"5","cellId":"0","enabled":false},{"rowId":"5","cellId":"1","enabled":false},{"rowId":"5","cellId":"2","enabled":false},{"rowId":"5","cellId":"3","enabled":true},{"rowId":"5","cellId":"4","enabled":false},{"rowId":"5","cellId":"5","enabled":false},{"rowId":"5","cellId":"6","enabled":false},{"rowId":"5","cellId":"7","enabled":true},{"rowId":"5","cellId":"8","enabled":false},{"rowId":"5","cellId":"9","enabled":false},{"rowId":"5","cellId":"10","enabled":false},{"rowId":"5","cellId":"11","enabled":true},{"rowId":"5","cellId":"12","enabled":false},{"rowId":"5","cellId":"13","enabled":true},{"rowId":"5","cellId":"14","enabled":false},{"rowId":"5","cellId":"15","enabled":true},{"rowId":"6","cellId":"0","enabled":false},{"rowId":"6","cellId":"1","enabled":false},{"rowId":"6","cellId":"2","enabled":false},{"rowId":"6","cellId":"3","enabled":false},{"rowId":"6","cellId":"4","enabled":false},{"rowId":"6","cellId":"5","enabled":false},{"rowId":"6","cellId":"6","enabled":false},{"rowId":"6","cellId":"7","enabled":false},{"rowId":"6","cellId":"8","enabled":false},{"rowId":"6","cellId":"9","enabled":false},{"rowId":"6","cellId":"10","enabled":true},{"rowId":"6","cellId":"11","enabled":false},{"rowId":"6","cellId":"12","enabled":false},{"rowId":"6","cellId":"13","enabled":false},{"rowId":"6","cellId":"14","enabled":false},{"rowId":"6","cellId":"15","enabled":false},{"rowId":"7","cellId":"0","enabled":false},{"rowId":"7","cellId":"1","enabled":false},{"rowId":"7","cellId":"2","enabled":false},{"rowId":"7","cellId":"3","enabled":false},{"rowId":"7","cellId":"4","enabled":false},{"rowId":"7","cellId":"5","enabled":false},{"rowId":"7","cellId":"6","enabled":false},{"rowId":"7","cellId":"7","enabled":false},{"rowId":"7","cellId":"8","enabled":false},{"rowId":"7","cellId":"9","enabled":true},{"rowId":"7","cellId":"10","enabled":false},{"rowId":"7","cellId":"11","enabled":false},{"rowId":"7","cellId":"12","enabled":false},{"rowId":"7","cellId":"13","enabled":false},{"rowId":"7","cellId":"14","enabled":false},{"rowId":"7","cellId":"15","enabled":false},{"rowId":"8","cellId":"0","enabled":false},{"rowId":"8","cellId":"1","enabled":false},{"rowId":"8","cellId":"2","enabled":false},{"rowId":"8","cellId":"3","enabled":false},{"rowId":"8","cellId":"4","enabled":false},{"rowId":"8","cellId":"5","enabled":false},{"rowId":"8","cellId":"6","enabled":false},{"rowId":"8","cellId":"7","enabled":false},{"rowId":"8","cellId":"8","enabled":false},{"rowId":"8","cellId":"9","enabled":false},{"rowId":"8","cellId":"10","enabled":false},{"rowId":"8","cellId":"11","enabled":false},{"rowId":"8","cellId":"12","enabled":false},{"rowId":"8","cellId":"13","enabled":false},{"rowId":"8","cellId":"14","enabled":false},{"rowId":"8","cellId":"15","enabled":false},{"rowId":"9","cellId":"0","enabled":false},{"rowId":"9","cellId":"1","enabled":false},{"rowId":"9","cellId":"2","enabled":false},{"rowId":"9","cellId":"3","enabled":false},{"rowId":"9","cellId":"4","enabled":false},{"rowId":"9","cellId":"5","enabled":false},{"rowId":"9","cellId":"6","enabled":false},{"rowId":"9","cellId":"7","enabled":false},{"rowId":"9","cellId":"8","enabled":false},{"rowId":"9","cellId":"9","enabled":false},{"rowId":"9","cellId":"10","enabled":false},{"rowId":"9","cellId":"11","enabled":false},{"rowId":"9","cellId":"12","enabled":false},{"rowId":"9","cellId":"13","enabled":false},{"rowId":"9","cellId":"14","enabled":false},{"rowId":"9","cellId":"15","enabled":false},{"rowId":"10","cellId":"0","enabled":false},{"rowId":"10","cellId":"1","enabled":false},{"rowId":"10","cellId":"2","enabled":false},{"rowId":"10","cellId":"3","enabled":false},{"rowId":"10","cellId":"4","enabled":false},{"rowId":"10","cellId":"5","enabled":false},{"rowId":"10","cellId":"6","enabled":false},{"rowId":"10","cellId":"7","enabled":false},{"rowId":"10","cellId":"8","enabled":false},{"rowId":"10","cellId":"9","enabled":false},{"rowId":"10","cellId":"10","enabled":false},{"rowId":"10","cellId":"11","enabled":false},{"rowId":"10","cellId":"12","enabled":false},{"rowId":"10","cellId":"13","enabled":false},{"rowId":"10","cellId":"14","enabled":false},{"rowId":"10","cellId":"15","enabled":false},{"rowId":"11","cellId":"0","enabled":false},{"rowId":"11","cellId":"1","enabled":false},{"rowId":"11","cellId":"2","enabled":false},{"rowId":"11","cellId":"3","enabled":false},{"rowId":"11","cellId":"4","enabled":false},{"rowId":"11","cellId":"5","enabled":false},{"rowId":"11","cellId":"6","enabled":false},{"rowId":"11","cellId":"7","enabled":false},{"rowId":"11","cellId":"8","enabled":false},{"rowId":"11","cellId":"9","enabled":false},{"rowId":"11","cellId":"10","enabled":false},{"rowId":"11","cellId":"11","enabled":false},{"rowId":"11","cellId":"12","enabled":false},{"rowId":"11","cellId":"13","enabled":false},{"rowId":"11","cellId":"14","enabled":false},{"rowId":"11","cellId":"15","enabled":false},{"rowId":"12","cellId":"0","enabled":false},{"rowId":"12","cellId":"1","enabled":false},{"rowId":"12","cellId":"2","enabled":false},{"rowId":"12","cellId":"3","enabled":false},{"rowId":"12","cellId":"4","enabled":false},{"rowId":"12","cellId":"5","enabled":false},{"rowId":"12","cellId":"6","enabled":false},{"rowId":"12","cellId":"7","enabled":false},{"rowId":"12","cellId":"8","enabled":false},{"rowId":"12","cellId":"9","enabled":false},{"rowId":"12","cellId":"10","enabled":false},{"rowId":"12","cellId":"11","enabled":false},{"rowId":"12","cellId":"12","enabled":false},{"rowId":"12","cellId":"13","enabled":false},{"rowId":"12","cellId":"14","enabled":false},{"rowId":"12","cellId":"15","enabled":false},{"rowId":"13","cellId":"0","enabled":false},{"rowId":"13","cellId":"1","enabled":false},{"rowId":"13","cellId":"2","enabled":false},{"rowId":"13","cellId":"3","enabled":false},{"rowId":"13","cellId":"4","enabled":false},{"rowId":"13","cellId":"5","enabled":false},{"rowId":"13","cellId":"6","enabled":false},{"rowId":"13","cellId":"7","enabled":false},{"rowId":"13","cellId":"8","enabled":false},{"rowId":"13","cellId":"9","enabled":false},{"rowId":"13","cellId":"10","enabled":false},{"rowId":"13","cellId":"11","enabled":false},{"rowId":"13","cellId":"12","enabled":false},{"rowId":"13","cellId":"13","enabled":false},{"rowId":"13","cellId":"14","enabled":false},{"rowId":"13","cellId":"15","enabled":false},{"rowId":"14","cellId":"0","enabled":false},{"rowId":"14","cellId":"1","enabled":false},{"rowId":"14","cellId":"2","enabled":false},{"rowId":"14","cellId":"3","enabled":false},{"rowId":"14","cellId":"4","enabled":false},{"rowId":"14","cellId":"5","enabled":false},{"rowId":"14","cellId":"6","enabled":false},{"rowId":"14","cellId":"7","enabled":false},{"rowId":"14","cellId":"8","enabled":false},{"rowId":"14","cellId":"9","enabled":false},{"rowId":"14","cellId":"10","enabled":false},{"rowId":"14","cellId":"11","enabled":false},{"rowId":"14","cellId":"12","enabled":false},{"rowId":"14","cellId":"13","enabled":false},{"rowId":"14","cellId":"14","enabled":false},{"rowId":"14","cellId":"15","enabled":false},{"rowId":"15","cellId":"0","enabled":false},{"rowId":"15","cellId":"1","enabled":true},{"rowId":"15","cellId":"2","enabled":false},{"rowId":"15","cellId":"3","enabled":false},{"rowId":"15","cellId":"4","enabled":false},{"rowId":"15","cellId":"5","enabled":false},{"rowId":"15","cellId":"6","enabled":false},{"rowId":"15","cellId":"7","enabled":false},{"rowId":"15","cellId":"8","enabled":false},{"rowId":"15","cellId":"9","enabled":false},{"rowId":"15","cellId":"10","enabled":false},{"rowId":"15","cellId":"11","enabled":false},{"rowId":"15","cellId":"12","enabled":false},{"rowId":"15","cellId":"13","enabled":false},{"rowId":"15","cellId":"14","enabled":false},{"rowId":"15","cellId":"15","enabled":false},{"rowId":"16","cellId":"0","enabled":false},{"rowId":"16","cellId":"1","enabled":false},{"rowId":"16","cellId":"2","enabled":false},{"rowId":"16","cellId":"3","enabled":false},{"rowId":"16","cellId":"4","enabled":false},{"rowId":"16","cellId":"5","enabled":false},{"rowId":"16","cellId":"6","enabled":false},{"rowId":"16","cellId":"7","enabled":false},{"rowId":"16","cellId":"8","enabled":false},{"rowId":"16","cellId":"9","enabled":false},{"rowId":"16","cellId":"10","enabled":false},{"rowId":"16","cellId":"11","enabled":false},{"rowId":"16","cellId":"12","enabled":false},{"rowId":"16","cellId":"13","enabled":false},{"rowId":"16","cellId":"14","enabled":false},{"rowId":"16","cellId":"15","enabled":false},{"rowId":"17","cellId":"0","enabled":false},{"rowId":"17","cellId":"1","enabled":false},{"rowId":"17","cellId":"2","enabled":false},{"rowId":"17","cellId":"3","enabled":false},{"rowId":"17","cellId":"4","enabled":false},{"rowId":"17","cellId":"5","enabled":false},{"rowId":"17","cellId":"6","enabled":false},{"rowId":"17","cellId":"7","enabled":false},{"rowId":"17","cellId":"8","enabled":false},{"rowId":"17","cellId":"9","enabled":false},{"rowId":"17","cellId":"10","enabled":false},{"rowId":"17","cellId":"11","enabled":false},{"rowId":"17","cellId":"12","enabled":false},{"rowId":"17","cellId":"13","enabled":false},{"rowId":"17","cellId":"14","enabled":false},{"rowId":"17","cellId":"15","enabled":false},{"rowId":"18","cellId":"0","enabled":false},{"rowId":"18","cellId":"1","enabled":false},{"rowId":"18","cellId":"2","enabled":false},{"rowId":"18","cellId":"3","enabled":false},{"rowId":"18","cellId":"4","enabled":false},{"rowId":"18","cellId":"5","enabled":false},{"rowId":"18","cellId":"6","enabled":false},{"rowId":"18","cellId":"7","enabled":false},{"rowId":"18","cellId":"8","enabled":false},{"rowId":"18","cellId":"9","enabled":false},{"rowId":"18","cellId":"10","enabled":false},{"rowId":"18","cellId":"11","enabled":false},{"rowId":"18","cellId":"12","enabled":false},{"rowId":"18","cellId":"13","enabled":false},{"rowId":"18","cellId":"14","enabled":false},{"rowId":"18","cellId":"15","enabled":false},{"rowId":"19","cellId":"0","enabled":false},{"rowId":"19","cellId":"1","enabled":false},{"rowId":"19","cellId":"2","enabled":false},{"rowId":"19","cellId":"3","enabled":false},{"rowId":"19","cellId":"4","enabled":false},{"rowId":"19","cellId":"5","enabled":false},{"rowId":"19","cellId":"6","enabled":false},{"rowId":"19","cellId":"7","enabled":false},{"rowId":"19","cellId":"8","enabled":false},{"rowId":"19","cellId":"9","enabled":false},{"rowId":"19","cellId":"10","enabled":false},{"rowId":"19","cellId":"11","enabled":false},{"rowId":"19","cellId":"12","enabled":false},{"rowId":"19","cellId":"13","enabled":false},{"rowId":"19","cellId":"14","enabled":false},{"rowId":"19","cellId":"15","enabled":false},{"rowId":"20","cellId":"0","enabled":false},{"rowId":"20","cellId":"1","enabled":false},{"rowId":"20","cellId":"2","enabled":false},{"rowId":"20","cellId":"3","enabled":false},{"rowId":"20","cellId":"4","enabled":false},{"rowId":"20","cellId":"5","enabled":false},{"rowId":"20","cellId":"6","enabled":false},{"rowId":"20","cellId":"7","enabled":false},{"rowId":"20","cellId":"8","enabled":false},{"rowId":"20","cellId":"9","enabled":false},{"rowId":"20","cellId":"10","enabled":false},{"rowId":"20","cellId":"11","enabled":false},{"rowId":"20","cellId":"12","enabled":false},{"rowId":"20","cellId":"13","enabled":false},{"rowId":"20","cellId":"14","enabled":false},{"rowId":"20","cellId":"15","enabled":false},{"rowId":"21","cellId":"0","enabled":false},{"rowId":"21","cellId":"1","enabled":false},{"rowId":"21","cellId":"2","enabled":false},{"rowId":"21","cellId":"3","enabled":false},{"rowId":"21","cellId":"4","enabled":false},{"rowId":"21","cellId":"5","enabled":false},{"rowId":"21","cellId":"6","enabled":false},{"rowId":"21","cellId":"7","enabled":false},{"rowId":"21","cellId":"8","enabled":false},{"rowId":"21","cellId":"9","enabled":false},{"rowId":"21","cellId":"10","enabled":false},{"rowId":"21","cellId":"11","enabled":false},{"rowId":"21","cellId":"12","enabled":false},{"rowId":"21","cellId":"13","enabled":false},{"rowId":"21","cellId":"14","enabled":false},{"rowId":"21","cellId":"15","enabled":false},{"rowId":"22","cellId":"0","enabled":false},{"rowId":"22","cellId":"1","enabled":false},{"rowId":"22","cellId":"2","enabled":false},{"rowId":"22","cellId":"3","enabled":false},{"rowId":"22","cellId":"4","enabled":false},{"rowId":"22","cellId":"5","enabled":false},{"rowId":"22","cellId":"6","enabled":false},{"rowId":"22","cellId":"7","enabled":false},{"rowId":"22","cellId":"8","enabled":false},{"rowId":"22","cellId":"9","enabled":false},{"rowId":"22","cellId":"10","enabled":false},{"rowId":"22","cellId":"11","enabled":false},{"rowId":"22","cellId":"12","enabled":false},{"rowId":"22","cellId":"13","enabled":false},{"rowId":"22","cellId":"14","enabled":false},{"rowId":"22","cellId":"15","enabled":false},{"rowId":"23","cellId":"0","enabled":false},{"rowId":"23","cellId":"1","enabled":false},{"rowId":"23","cellId":"2","enabled":false},{"rowId":"23","cellId":"3","enabled":false},{"rowId":"23","cellId":"4","enabled":false},{"rowId":"23","cellId":"5","enabled":false},{"rowId":"23","cellId":"6","enabled":false},{"rowId":"23","cellId":"7","enabled":false},{"rowId":"23","cellId":"8","enabled":false},{"rowId":"23","cellId":"9","enabled":false},{"rowId":"23","cellId":"10","enabled":false},{"rowId":"23","cellId":"11","enabled":false},{"rowId":"23","cellId":"12","enabled":false},{"rowId":"23","cellId":"13","enabled":false},{"rowId":"23","cellId":"14","enabled":false},{"rowId":"23","cellId":"15","enabled":false},{"rowId":"24","cellId":"0","enabled":false},{"rowId":"24","cellId":"1","enabled":false},{"rowId":"24","cellId":"2","enabled":false},{"rowId":"24","cellId":"3","enabled":false},{"rowId":"24","cellId":"4","enabled":false},{"rowId":"24","cellId":"5","enabled":false},{"rowId":"24","cellId":"6","enabled":false},{"rowId":"24","cellId":"7","enabled":false},{"rowId":"24","cellId":"8","enabled":false},{"rowId":"24","cellId":"9","enabled":false},{"rowId":"24","cellId":"10","enabled":false},{"rowId":"24","cellId":"11","enabled":false},{"rowId":"24","cellId":"12","enabled":false},{"rowId":"24","cellId":"13","enabled":false},{"rowId":"24","cellId":"14","enabled":false},{"rowId":"24","cellId":"15","enabled":false},{"rowId":"25","cellId":"0","enabled":false},{"rowId":"25","cellId":"1","enabled":false},{"rowId":"25","cellId":"2","enabled":false},{"rowId":"25","cellId":"3","enabled":false},{"rowId":"25","cellId":"4","enabled":false},{"rowId":"25","cellId":"5","enabled":false},{"rowId":"25","cellId":"6","enabled":false},{"rowId":"25","cellId":"7","enabled":false},{"rowId":"25","cellId":"8","enabled":false},{"rowId":"25","cellId":"9","enabled":false},{"rowId":"25","cellId":"10","enabled":false},{"rowId":"25","cellId":"11","enabled":false},{"rowId":"25","cellId":"12","enabled":false},{"rowId":"25","cellId":"13","enabled":false},{"rowId":"25","cellId":"14","enabled":false},{"rowId":"25","cellId":"15","enabled":false},{"rowId":"26","cellId":"0","enabled":false},{"rowId":"26","cellId":"1","enabled":false},{"rowId":"26","cellId":"2","enabled":false},{"rowId":"26","cellId":"3","enabled":false},{"rowId":"26","cellId":"4","enabled":false},{"rowId":"26","cellId":"5","enabled":false},{"rowId":"26","cellId":"6","enabled":false},{"rowId":"26","cellId":"7","enabled":false},{"rowId":"26","cellId":"8","enabled":false},{"rowId":"26","cellId":"9","enabled":false},{"rowId":"26","cellId":"10","enabled":false},{"rowId":"26","cellId":"11","enabled":false},{"rowId":"26","cellId":"12","enabled":false},{"rowId":"26","cellId":"13","enabled":false},{"rowId":"26","cellId":"14","enabled":false},{"rowId":"26","cellId":"15","enabled":false},{"rowId":"27","cellId":"0","enabled":false},{"rowId":"27","cellId":"1","enabled":false},{"rowId":"27","cellId":"2","enabled":false},{"rowId":"27","cellId":"3","enabled":false},{"rowId":"27","cellId":"4","enabled":false},{"rowId":"27","cellId":"5","enabled":false},{"rowId":"27","cellId":"6","enabled":false},{"rowId":"27","cellId":"7","enabled":false},{"rowId":"27","cellId":"8","enabled":false},{"rowId":"27","cellId":"9","enabled":false},{"rowId":"27","cellId":"10","enabled":false},{"rowId":"27","cellId":"11","enabled":false},{"rowId":"27","cellId":"12","enabled":false},{"rowId":"27","cellId":"13","enabled":false},{"rowId":"27","cellId":"14","enabled":false},{"rowId":"27","cellId":"15","enabled":false},{"rowId":"28","cellId":"0","enabled":false},{"rowId":"28","cellId":"1","enabled":false},{"rowId":"28","cellId":"2","enabled":false},{"rowId":"28","cellId":"3","enabled":false},{"rowId":"28","cellId":"4","enabled":false},{"rowId":"28","cellId":"5","enabled":false},{"rowId":"28","cellId":"6","enabled":false},{"rowId":"28","cellId":"7","enabled":false},{"rowId":"28","cellId":"8","enabled":false},{"rowId":"28","cellId":"9","enabled":false},{"rowId":"28","cellId":"10","enabled":false},{"rowId":"28","cellId":"11","enabled":false},{"rowId":"28","cellId":"12","enabled":false},{"rowId":"28","cellId":"13","enabled":false},{"rowId":"28","cellId":"14","enabled":false},{"rowId":"28","cellId":"15","enabled":false}],"settings":{"sampleSet":"https://raw.githubusercontent.com/oramics/sampled/master/DM/LM-2/sampled.instrument.json","measureLength":16,"bpm":190,"detune":-1200,"initGain":1,"maxGain":1,"attackTime":1,"sustainTime":1.9,"releaseTime":5,"delayEnabled":"delay","delay":0.63,"filter":992.6}}
},{}],19:[function(require,module,exports){
function trackerTableSvg() {

    this.str = '';
    this.options = {
        cellFirst: 120,
        cellWidth: 16,
        cellSpace: 4
    }

    this.options.cellWithSpace = this.options.cellSpace + this.options.cellWidth
    this.options.cellFirstWithSpace = this.options.cellFirst + this.options.cellSpace

    this.op

    /**
     * @param int number of cells
     * @param int number of rows
     * @param object data
     */
    this.setRows = function (numRows, numCells, data) {

        this.numRows = numRows;
        this.numCells = numCells;

        this.setHeader(numCells, data);
        for (let rowID = 0; rowID < numRows; rowID++) {
            this.str += this.getCells(rowID, numCells, data);
        }
    };

    this.setHeader = function (numCells, data) {
        this.str += this.getCells('header', numCells, { header: true });
    };

    this.getTable = function () {

        
        let boxX = (this.options.cellFirst + this.options.cellSpace) + 
                   (this.numCells * this.options.cellWithSpace)
        let boxY = (this.numRows + 1) * (this.options.cellWithSpace)

        let html = `
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            preserveAspectRatio="none" 
            viewBox="0 0 ${boxX} ${boxY}" 
            class="tracker">
            <g>`;
        html += this.str;
        html += `
            </g>
        </svg>`
        return html
    };

    this.getFirstCell = function (rowID, data) {

        let str = '';
        str += `
            <rect
                class="tracker-cell-first" 
                data-row-id="${rowID}" 
                width="${this.options.cellFirst}" 
                height="${this.options.cellWidth}" 
                x="0" 
                y="${this.y}"></rect>`;
        
        if (data.title) {
            let text = data.title[rowID];
            str += `
                <text 
                    class="tracker-cell-text"
                    x="${this.options.cellSpace}"
                    y="${this.y+12}">${text}
                </text>`;
        }

        this.currentX = this.options.cellFirstWithSpace
        return str;
    };

    this.currentX = 0
    this.getCurrentX = function (x) {
        return x + this.currentX
    }

    this.y = 0;
    this.getCells = function (rowID, numCells, data) {
        var str = '';
        var x = 0;

        // Get first cell. E.g. instrument
        str += this.getFirstCell(rowID, data);
        for (let c = 0; c < numCells; c++) {
            
            str += `
            <rect 
                class="tracker-cell" 
                data-row-id="${rowID}" 
                data-cell-id="${c}" 
                width="${this.options.cellWidth}" 
                height="${this.options.cellWidth}" 
                x="${this.getCurrentX(x)}" 
                y="${this.y}">
            </rect>`;

            if (data.header) {
                // column header. A number
                let text = c + 1;
                str += `
                <text 
                    
                    class="tracker-cell-text" 
                    data-row-id="${rowID}" 
                    data-cell-id="${c}" 
                    x="${this.getCurrentX(x+2)}" 
                    y="10">${text}
                </text>`;
            }
            
            x += this.options.cellWithSpace
        }

        this.y += this.options.cellWithSpace
        return str;
    };
}

module.exports = trackerTableSvg;

},{}],20:[function(require,module,exports){
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

},{}]},{},[16])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvZ2V0LWpzb24tcHJvbWlzZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nZXQtc2V0LWZvcm0tdmFsdWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2hhcy1jbGFzcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2FkLXNhbXBsZS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9hZC1zYW1wbGUtc2V0L25vZGVfbW9kdWxlcy90aW55LXNhbXBsZS1sb2FkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqLXR5cGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc2VsZWN0LWVsZW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdGlueS1zYW1wbGUtbG9hZGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2xpYi9XQUFDbG9jay5qcyIsInNyYy9hdWRpby1kaXN0b3J0aW9uLW5vZGUuanMiLCJzcmMvZ2V0LXNldC1jb250cm9scy5qcyIsInNyYy9tYWluLmpzIiwic3JjL3NpbXBsZS10cmFja2VyLmpzIiwic3JjL3RyYWNrLTIuanNvbiIsInNyYy90cmFja2VyLXRhYmxlLXN2Zy5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN6T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZOQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBHYWluKGN0eCkge1xuXG4gICAgdGhpcy5jdHggPSBjdHg7XG5cbiAgICB0aGlzLnNlY29uZHNUb1RpbWVDb25zdGFudCA9IGZ1bmN0aW9uIChzZWMpIHtcbiAgICAgICAgcmV0dXJuIChzZWMgKiAyKSAvIDg7XG4gICAgfTtcblxuICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgICAgaW5pdEdhaW46IDAuMSwgLy8gSW5pdCBnYWluIG9uIG5vdGVcbiAgICAgICAgbWF4R2FpbjogMS4wLCAvLyBNYXggZ2FpbiBvbiBub3RlXG4gICAgICAgIGF0dGFja1RpbWU6IDAuMSwgLy8gQXR0YWNrVGltZS4gZ2Fpbi5pbml0IHRvIGdhaW4ubWF4IGluIGF0dGFja1RpbWVcbiAgICAgICAgc3VzdGFpblRpbWU6IDEsIC8vIFN1c3RhaW4gbm90ZSBpbiB0aW1lXG4gICAgICAgIHJlbGVhc2VUaW1lOiAxLCAvLyBBcHByb3hpbWF0ZWQgZW5kIHRpbWUuIENhbGN1bGF0ZWQgd2l0aCBzZWNvbmRzVG9UaW1lQ29uc3RhbnQoKVxuICAgICAgICAvLyBkaXNjb25uZWN0OiBmYWxzZSAvLyBTaG91bGQgd2UgYXV0b2Rpc2Nvbm5lY3QuIERlZmF1bHQgaXMgdHJ1ZVxuICAgIH07XG5cbiAgICB0aGlzLnNldE9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIH07XG5cbiAgICB0aGlzLmdhaW5Ob2RlO1xuICAgIC8qKlxuICAgICAqIFRoZSBnYWluTm9kZVxuICAgICAqIEBwYXJhbSB7ZmxvYXR9IGJlZ2luIGN0eCB0aW1lXG4gICAgICogQHJldHVybnMge0dhaW4uZ2V0R2Fpbk5vZGUuZ2Fpbk5vZGV9XG4gICAgICovXG4gICAgdGhpcy5nZXRHYWluTm9kZSA9IGZ1bmN0aW9uIChiZWdpbikge1xuXG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUgPSB0aGlzLmN0eC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IHRoaXMub3B0aW9ucy5pbml0R2FpbjtcblxuICAgICAgICAvLyBBdHRhY2sgdG8gbWF4XG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1heEdhaW4sXG4gICAgICAgICAgICAgICAgYmVnaW4gKyB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSxcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSk7XG5cbiAgICAgICAgLy8gU3VzdGFpbiBhbmQgZW5kIG5vdGVcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnNldFRhcmdldEF0VGltZShcbiAgICAgICAgICAgICAgICAwLjAsXG4gICAgICAgICAgICAgICAgYmVnaW4gKyB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSArIHRoaXMub3B0aW9ucy5zdXN0YWluVGltZSxcbiAgICAgICAgICAgICAgICB0aGlzLnNlY29uZHNUb1RpbWVDb25zdGFudCh0aGlzLm9wdGlvbnMucmVsZWFzZVRpbWUpKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuZGlzY29ubmVjdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdChiZWdpbik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLmdhaW5Ob2RlO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFRvdGFsTGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUgKyB0aGlzLm9wdGlvbnMucmVsZWFzZVRpbWVcbiAgICB9XG4gICAgXG4gICAgdGhpcy5kaXNjb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB0b3RhbExlbmd0aCA9IHRoaXMuZ2V0VG90YWxMZW5ndGgoKTtcbiAgICAgICAgXG4gICAgICAgIHNldFRpbWVvdXQoICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICB9LFxuICAgICAgICB0b3RhbExlbmd0aCAqIDEwMDApO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gR2FpbjsiLCIvLyBGcm9tOiBodHRwczovL2Rldi5vcGVyYS5jb20vYXJ0aWNsZXMvZHJ1bS1zb3VuZHMtd2ViYXVkaW8vXG5mdW5jdGlvbiBhdWRpb0J1ZmZlckluc3RydW1lbnQoY29udGV4dCwgYnVmZmVyKSB7XG4gICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbn1cblxuYXVkaW9CdWZmZXJJbnN0cnVtZW50LnByb3RvdHlwZS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICB0aGlzLnNvdXJjZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG59O1xuXG5hdWRpb0J1ZmZlckluc3RydW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2U7XG59O1xuXG5hdWRpb0J1ZmZlckluc3RydW1lbnQucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbiAodGltZSkge1xuICAgIHRoaXMuc2V0dXAoKTtcbiAgICB0aGlzLnNvdXJjZS5zdGFydCh0aW1lKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYXVkaW9CdWZmZXJJbnN0cnVtZW50OyIsIi8qIEZpbGVTYXZlci5qc1xuICogQSBzYXZlQXMoKSBGaWxlU2F2ZXIgaW1wbGVtZW50YXRpb24uXG4gKiAxLjMuMlxuICogMjAxNi0wNi0xNiAxODoyNToxOVxuICpcbiAqIEJ5IEVsaSBHcmV5LCBodHRwOi8vZWxpZ3JleS5jb21cbiAqIExpY2Vuc2U6IE1JVFxuICogICBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWRcbiAqL1xuXG4vKmdsb2JhbCBzZWxmICovXG4vKmpzbGludCBiaXR3aXNlOiB0cnVlLCBpbmRlbnQ6IDQsIGxheGJyZWFrOiB0cnVlLCBsYXhjb21tYTogdHJ1ZSwgc21hcnR0YWJzOiB0cnVlLCBwbHVzcGx1czogdHJ1ZSAqL1xuXG4vKiEgQHNvdXJjZSBodHRwOi8vcHVybC5lbGlncmV5LmNvbS9naXRodWIvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL0ZpbGVTYXZlci5qcyAqL1xuXG52YXIgc2F2ZUFzID0gc2F2ZUFzIHx8IChmdW5jdGlvbih2aWV3KSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXHQvLyBJRSA8MTAgaXMgZXhwbGljaXRseSB1bnN1cHBvcnRlZFxuXHRpZiAodHlwZW9mIHZpZXcgPT09IFwidW5kZWZpbmVkXCIgfHwgdHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIiAmJiAvTVNJRSBbMS05XVxcLi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXJcblx0XHQgIGRvYyA9IHZpZXcuZG9jdW1lbnRcblx0XHQgIC8vIG9ubHkgZ2V0IFVSTCB3aGVuIG5lY2Vzc2FyeSBpbiBjYXNlIEJsb2IuanMgaGFzbid0IG92ZXJyaWRkZW4gaXQgeWV0XG5cdFx0LCBnZXRfVVJMID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdmlldy5VUkwgfHwgdmlldy53ZWJraXRVUkwgfHwgdmlldztcblx0XHR9XG5cdFx0LCBzYXZlX2xpbmsgPSBkb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLCBcImFcIilcblx0XHQsIGNhbl91c2Vfc2F2ZV9saW5rID0gXCJkb3dubG9hZFwiIGluIHNhdmVfbGlua1xuXHRcdCwgY2xpY2sgPSBmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgZXZlbnQgPSBuZXcgTW91c2VFdmVudChcImNsaWNrXCIpO1xuXHRcdFx0bm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHR9XG5cdFx0LCBpc19zYWZhcmkgPSAvY29uc3RydWN0b3IvaS50ZXN0KHZpZXcuSFRNTEVsZW1lbnQpIHx8IHZpZXcuc2FmYXJpXG5cdFx0LCBpc19jaHJvbWVfaW9zID0vQ3JpT1NcXC9bXFxkXSsvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudClcblx0XHQsIHRocm93X291dHNpZGUgPSBmdW5jdGlvbihleCkge1xuXHRcdFx0KHZpZXcuc2V0SW1tZWRpYXRlIHx8IHZpZXcuc2V0VGltZW91dCkoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRocm93IGV4O1xuXHRcdFx0fSwgMCk7XG5cdFx0fVxuXHRcdCwgZm9yY2Vfc2F2ZWFibGVfdHlwZSA9IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCJcblx0XHQvLyB0aGUgQmxvYiBBUEkgaXMgZnVuZGFtZW50YWxseSBicm9rZW4gYXMgdGhlcmUgaXMgbm8gXCJkb3dubG9hZGZpbmlzaGVkXCIgZXZlbnQgdG8gc3Vic2NyaWJlIHRvXG5cdFx0LCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQgPSAxMDAwICogNDAgLy8gaW4gbXNcblx0XHQsIHJldm9rZSA9IGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdHZhciByZXZva2VyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZmlsZSA9PT0gXCJzdHJpbmdcIikgeyAvLyBmaWxlIGlzIGFuIG9iamVjdCBVUkxcblx0XHRcdFx0XHRnZXRfVVJMKCkucmV2b2tlT2JqZWN0VVJMKGZpbGUpO1xuXHRcdFx0XHR9IGVsc2UgeyAvLyBmaWxlIGlzIGEgRmlsZVxuXHRcdFx0XHRcdGZpbGUucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRzZXRUaW1lb3V0KHJldm9rZXIsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCk7XG5cdFx0fVxuXHRcdCwgZGlzcGF0Y2ggPSBmdW5jdGlvbihmaWxlc2F2ZXIsIGV2ZW50X3R5cGVzLCBldmVudCkge1xuXHRcdFx0ZXZlbnRfdHlwZXMgPSBbXS5jb25jYXQoZXZlbnRfdHlwZXMpO1xuXHRcdFx0dmFyIGkgPSBldmVudF90eXBlcy5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRcdHZhciBsaXN0ZW5lciA9IGZpbGVzYXZlcltcIm9uXCIgKyBldmVudF90eXBlc1tpXV07XG5cdFx0XHRcdGlmICh0eXBlb2YgbGlzdGVuZXIgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRsaXN0ZW5lci5jYWxsKGZpbGVzYXZlciwgZXZlbnQgfHwgZmlsZXNhdmVyKTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRcdFx0dGhyb3dfb3V0c2lkZShleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCwgYXV0b19ib20gPSBmdW5jdGlvbihibG9iKSB7XG5cdFx0XHQvLyBwcmVwZW5kIEJPTSBmb3IgVVRGLTggWE1MIGFuZCB0ZXh0LyogdHlwZXMgKGluY2x1ZGluZyBIVE1MKVxuXHRcdFx0Ly8gbm90ZTogeW91ciBicm93c2VyIHdpbGwgYXV0b21hdGljYWxseSBjb252ZXJ0IFVURi0xNiBVK0ZFRkYgdG8gRUYgQkIgQkZcblx0XHRcdGlmICgvXlxccyooPzp0ZXh0XFwvXFxTKnxhcHBsaWNhdGlvblxcL3htbHxcXFMqXFwvXFxTKlxcK3htbClcXHMqOy4qY2hhcnNldFxccyo9XFxzKnV0Zi04L2kudGVzdChibG9iLnR5cGUpKSB7XG5cdFx0XHRcdHJldHVybiBuZXcgQmxvYihbU3RyaW5nLmZyb21DaGFyQ29kZSgweEZFRkYpLCBibG9iXSwge3R5cGU6IGJsb2IudHlwZX0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGJsb2I7XG5cdFx0fVxuXHRcdCwgRmlsZVNhdmVyID0gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdGlmICghbm9fYXV0b19ib20pIHtcblx0XHRcdFx0YmxvYiA9IGF1dG9fYm9tKGJsb2IpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gRmlyc3QgdHJ5IGEuZG93bmxvYWQsIHRoZW4gd2ViIGZpbGVzeXN0ZW0sIHRoZW4gb2JqZWN0IFVSTHNcblx0XHRcdHZhclxuXHRcdFx0XHQgIGZpbGVzYXZlciA9IHRoaXNcblx0XHRcdFx0LCB0eXBlID0gYmxvYi50eXBlXG5cdFx0XHRcdCwgZm9yY2UgPSB0eXBlID09PSBmb3JjZV9zYXZlYWJsZV90eXBlXG5cdFx0XHRcdCwgb2JqZWN0X3VybFxuXHRcdFx0XHQsIGRpc3BhdGNoX2FsbCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRpc3BhdGNoKGZpbGVzYXZlciwgXCJ3cml0ZXN0YXJ0IHByb2dyZXNzIHdyaXRlIHdyaXRlZW5kXCIuc3BsaXQoXCIgXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBvbiBhbnkgZmlsZXN5cyBlcnJvcnMgcmV2ZXJ0IHRvIHNhdmluZyB3aXRoIG9iamVjdCBVUkxzXG5cdFx0XHRcdCwgZnNfZXJyb3IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAoKGlzX2Nocm9tZV9pb3MgfHwgKGZvcmNlICYmIGlzX3NhZmFyaSkpICYmIHZpZXcuRmlsZVJlYWRlcikge1xuXHRcdFx0XHRcdFx0Ly8gU2FmYXJpIGRvZXNuJ3QgYWxsb3cgZG93bmxvYWRpbmcgb2YgYmxvYiB1cmxzXG5cdFx0XHRcdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblx0XHRcdFx0XHRcdHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHVybCA9IGlzX2Nocm9tZV9pb3MgPyByZWFkZXIucmVzdWx0IDogcmVhZGVyLnJlc3VsdC5yZXBsYWNlKC9eZGF0YTpbXjtdKjsvLCAnZGF0YTphdHRhY2htZW50L2ZpbGU7Jyk7XG5cdFx0XHRcdFx0XHRcdHZhciBwb3B1cCA9IHZpZXcub3Blbih1cmwsICdfYmxhbmsnKTtcblx0XHRcdFx0XHRcdFx0aWYoIXBvcHVwKSB2aWV3LmxvY2F0aW9uLmhyZWYgPSB1cmw7XG5cdFx0XHRcdFx0XHRcdHVybD11bmRlZmluZWQ7IC8vIHJlbGVhc2UgcmVmZXJlbmNlIGJlZm9yZSBkaXNwYXRjaGluZ1xuXHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRyZWFkZXIucmVhZEFzRGF0YVVSTChibG9iKTtcblx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLklOSVQ7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIGRvbid0IGNyZWF0ZSBtb3JlIG9iamVjdCBVUkxzIHRoYW4gbmVlZGVkXG5cdFx0XHRcdFx0aWYgKCFvYmplY3RfdXJsKSB7XG5cdFx0XHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGZvcmNlKSB7XG5cdFx0XHRcdFx0XHR2aWV3LmxvY2F0aW9uLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR2YXIgb3BlbmVkID0gdmlldy5vcGVuKG9iamVjdF91cmwsIFwiX2JsYW5rXCIpO1xuXHRcdFx0XHRcdFx0aWYgKCFvcGVuZWQpIHtcblx0XHRcdFx0XHRcdFx0Ly8gQXBwbGUgZG9lcyBub3QgYWxsb3cgd2luZG93Lm9wZW4sIHNlZSBodHRwczovL2RldmVsb3Blci5hcHBsZS5jb20vbGlicmFyeS9zYWZhcmkvZG9jdW1lbnRhdGlvbi9Ub29scy9Db25jZXB0dWFsL1NhZmFyaUV4dGVuc2lvbkd1aWRlL1dvcmtpbmd3aXRoV2luZG93c2FuZFRhYnMvV29ya2luZ3dpdGhXaW5kb3dzYW5kVGFicy5odG1sXG5cdFx0XHRcdFx0XHRcdHZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHR9XG5cdFx0XHQ7XG5cdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXG5cdFx0XHRpZiAoY2FuX3VzZV9zYXZlX2xpbmspIHtcblx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2F2ZV9saW5rLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdHNhdmVfbGluay5kb3dubG9hZCA9IG5hbWU7XG5cdFx0XHRcdFx0Y2xpY2soc2F2ZV9saW5rKTtcblx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRyZXZva2Uob2JqZWN0X3VybCk7XG5cdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0ZnNfZXJyb3IoKTtcblx0XHR9XG5cdFx0LCBGU19wcm90byA9IEZpbGVTYXZlci5wcm90b3R5cGVcblx0XHQsIHNhdmVBcyA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRyZXR1cm4gbmV3IEZpbGVTYXZlcihibG9iLCBuYW1lIHx8IGJsb2IubmFtZSB8fCBcImRvd25sb2FkXCIsIG5vX2F1dG9fYm9tKTtcblx0XHR9XG5cdDtcblx0Ly8gSUUgMTArIChuYXRpdmUgc2F2ZUFzKVxuXHRpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIiAmJiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYikge1xuXHRcdHJldHVybiBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0bmFtZSA9IG5hbWUgfHwgYmxvYi5uYW1lIHx8IFwiZG93bmxvYWRcIjtcblxuXHRcdFx0aWYgKCFub19hdXRvX2JvbSkge1xuXHRcdFx0XHRibG9iID0gYXV0b19ib20oYmxvYik7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IoYmxvYiwgbmFtZSk7XG5cdFx0fTtcblx0fVxuXG5cdEZTX3Byb3RvLmFib3J0ID0gZnVuY3Rpb24oKXt9O1xuXHRGU19wcm90by5yZWFkeVN0YXRlID0gRlNfcHJvdG8uSU5JVCA9IDA7XG5cdEZTX3Byb3RvLldSSVRJTkcgPSAxO1xuXHRGU19wcm90by5ET05FID0gMjtcblxuXHRGU19wcm90by5lcnJvciA9XG5cdEZTX3Byb3RvLm9ud3JpdGVzdGFydCA9XG5cdEZTX3Byb3RvLm9ucHJvZ3Jlc3MgPVxuXHRGU19wcm90by5vbndyaXRlID1cblx0RlNfcHJvdG8ub25hYm9ydCA9XG5cdEZTX3Byb3RvLm9uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlZW5kID1cblx0XHRudWxsO1xuXG5cdHJldHVybiBzYXZlQXM7XG59KFxuXHQgICB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBzZWxmXG5cdHx8IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93XG5cdHx8IHRoaXMuY29udGVudFxuKSk7XG4vLyBgc2VsZmAgaXMgdW5kZWZpbmVkIGluIEZpcmVmb3ggZm9yIEFuZHJvaWQgY29udGVudCBzY3JpcHQgY29udGV4dFxuLy8gd2hpbGUgYHRoaXNgIGlzIG5zSUNvbnRlbnRGcmFtZU1lc3NhZ2VNYW5hZ2VyXG4vLyB3aXRoIGFuIGF0dHJpYnV0ZSBgY29udGVudGAgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgd2luZG93XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzLnNhdmVBcyA9IHNhdmVBcztcbn0gZWxzZSBpZiAoKHR5cGVvZiBkZWZpbmUgIT09IFwidW5kZWZpbmVkXCIgJiYgZGVmaW5lICE9PSBudWxsKSAmJiAoZGVmaW5lLmFtZCAhPT0gbnVsbCkpIHtcbiAgZGVmaW5lKFwiRmlsZVNhdmVyLmpzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzYXZlQXM7XG4gIH0pO1xufVxuIiwiZnVuY3Rpb24gZ2V0SlNPTlByb21pc2UodXJsKSB7XG5cbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICByZXF1ZXN0Lm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ3RleHQnO1xuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnSlNPTiBjb3VsZCBub3QgYmUgbG9hZGVkICcgKyB1cmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldEpTT05Qcm9taXNlO1xuIiwiZnVuY3Rpb24gZ2V0RWxlbUNvdW50QnlOYW1lKG5hbWUpIHtcbiAgICB2YXIgbmFtZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZShuYW1lKTtcbiAgICByZXR1cm4gbmFtZXMubGVuZ3RoO1xufVxuXG5mdW5jdGlvbiBnZXRGb3JtVmFsdWVzKGZvcm1FbGVtZW50KSB7XG4gICAgdmFyIGZvcm1FbGVtZW50cyA9IGZvcm1FbGVtZW50LmVsZW1lbnRzO1xuICAgIHZhciBmb3JtUGFyYW1zID0ge307XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBlbGVtID0gbnVsbDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZm9ybUVsZW1lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGVsZW0gPSBmb3JtRWxlbWVudHNbaV07XG4gICAgICAgIHN3aXRjaCAoZWxlbS50eXBlKSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0uY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0VmFsdWVzID0gZ2V0U2VsZWN0VmFsdWVzKGVsZW0pO1xuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBzZWxlY3RWYWx1ZXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS52YWx1ZSAhPT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZm9ybVBhcmFtcztcbn1cblxuZnVuY3Rpb24gc2V0Rm9ybVZhbHVlcyhmb3JtRWxlbWVudCwgdmFsdWVzKSB7XG4gICAgdmFyIGZvcm1FbGVtZW50cyA9IGZvcm1FbGVtZW50LmVsZW1lbnRzO1xuICAgIHZhciBmb3JtUGFyYW1zID0ge307XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBlbGVtID0gbnVsbDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZm9ybUVsZW1lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGVsZW0gPSBmb3JtRWxlbWVudHNbaV07XG5cbiAgICAgICAgc3dpdGNoIChlbGVtLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdID09PSBlbGVtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSA9PT0gZWxlbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFNlbGVjdFZhbHVlcyhlbGVtLCB2YWx1ZXNbZWxlbS5uYW1lXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS52YWx1ZSA9IHZhbHVlc1tlbGVtLm5hbWVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRTZWxlY3RWYWx1ZXMoc2VsZWN0RWxlbSwgdmFsdWVzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBzZWxlY3RFbGVtLm9wdGlvbnM7XG4gICAgdmFyIG9wdDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcbiAgICAgICAgaWYgKHZhbHVlcy5pbmRleE9mKG9wdC52YWx1ZSkgPiAtMSkge1xuICAgICAgICAgICAgb3B0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRTZWxlY3RWYWx1ZXMoc2VsZWN0KSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0ICYmIHNlbGVjdC5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IG9wdGlvbnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgICAgIG9wdCA9IG9wdGlvbnNbaV07XG5cbiAgICAgICAgaWYgKG9wdC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gob3B0LnZhbHVlIHx8IG9wdC50ZXh0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBnZXRTZXRGb3JtVmFsdWVzKCkge1xuICAgIHRoaXMuc2V0ID0gc2V0Rm9ybVZhbHVlcztcbiAgICB0aGlzLmdldCA9IGdldEZvcm1WYWx1ZXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U2V0Rm9ybVZhbHVlcztcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBvYmpUeXBlID0gcmVxdWlyZSgnb2JqLXR5cGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZWwsIHN0cikge1xuXHRpZiAob2JqVHlwZShlbCkuaW5kZXhPZignZWxlbWVudCcpID09PSAtMSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGFuIEhUTUwgRE9NIGVsZW1lbnQgYXMgZmlyc3QgYXJndW1lbnQnKTtcblx0fVxuXG5cdGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgc3RyaW5nIGFzIHNlY29uZCBhcmd1bWVudCcpO1xuXHR9XG5cblx0aWYgKGVsLmNsYXNzTGlzdCkge1xuXHRcdHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoc3RyKTtcblx0fVxuXG5cdHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBzdHIgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG59O1xuIiwidmFyIHRpbnlTYW1wbGVMb2FkZXIgPSByZXF1aXJlKCd0aW55LXNhbXBsZS1sb2FkZXInKTtcbnZhciBhdWRpb0J1ZmZlckluc3RydW1lbnQgPSByZXF1aXJlKCdhdWRpby1idWZmZXItaW5zdHJ1bWVudCcpO1xudmFyIGdldEpTT04gPSByZXF1aXJlKCdnZXQtanNvbi1wcm9taXNlJyk7XG5cbnZhciBidWZmZXJzID0ge307XG5mdW5jdGlvbiBnZXRTYW1wbGVQcm9taXNlcyAoY3R4LCBkYXRhKSB7XG4gICAgdmFyIGJhc2VVcmwgPSBkYXRhLnNhbXBsZXM7XG4gICAgdmFyIHByb21pc2VzID0gW107XG5cbiAgICBkYXRhLmZpbGVuYW1lID0gW107XG4gICAgdmFyIGkgPSAwO1xuICAgIGRhdGEuZmlsZXMuZm9yRWFjaChmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhciBmaWxlbmFtZSA9IHZhbC5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIik7XG4gICAgICAgIGRhdGEuZmlsZW5hbWUucHVzaChmaWxlbmFtZSk7XG4gICAgICAgIHZhciByZW1vdGVVcmwgPSBiYXNlVXJsICsgdmFsO1xuXG4gICAgICAgIGxldCBsb2FkZXJQcm9taXNlID0gdGlueVNhbXBsZUxvYWRlcihjdHgsIHJlbW90ZVVybCk7XG4gICAgICAgIGxvYWRlclByb21pc2UudGhlbihmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICBidWZmZXJzW2ZpbGVuYW1lXSA9IG5ldyBhdWRpb0J1ZmZlckluc3RydW1lbnQoY3R4LCBidWZmZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBwcm9taXNlcy5wdXNoKGxvYWRlclByb21pc2UpO1xuXG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIHByb21pc2VzO1xufVxuXG5mdW5jdGlvbiBzYW1wbGVBbGxQcm9taXNlKGN0eCwgZGF0YVVybCkge1xuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB2YXIganNvblByb21pc2UgPSBnZXRKU09OKGRhdGFVcmwpO1xuICAgICAgICBqc29uUHJvbWlzZS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBzYW1wbGVQcm9taXNlcyA9IGdldFNhbXBsZVByb21pc2VzKGN0eCwgZGF0YSk7XG4gICAgICAgICAgICBQcm9taXNlLmFsbChzYW1wbGVQcm9taXNlcykudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtkYXRhOiBkYXRhLCBidWZmZXJzOiBidWZmZXJzfSk7XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkuY2F0Y2ggKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gbG9hZFNhbXBsZVNldChjdHgsIGRhdGFVcmwpIHtcbiAgICByZXR1cm4gc2FtcGxlQWxsUHJvbWlzZShjdHgsIGRhdGFVcmwpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvYWRTYW1wbGVTZXQ7XG4iLCJmdW5jdGlvbiBzYW1wbGVMb2FkZXIgKGNvbnRleHQsIHVybCkge1xuICAgIFxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICBcbiAgICAgICAgcmVxdWVzdC5vcGVuKCdnZXQnLCB1cmwsIHRydWUpO1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYocmVxdWVzdC5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgICAgICAgY29udGV4dC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24gKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgndGlueS1zYW1wbGUtbG9hZGVyIHJlcXVlc3QgZmFpbGVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNhbXBsZUxvYWRlcjtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuXHRyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikucmVwbGFjZSgvXlxcW29iamVjdCAoLispXFxdJC8sICckMScpLnRvTG93ZXJDYXNlKCk7XG59O1xuIiwiZnVuY3Rpb24gc2VsZWN0RWxlbWVudChhcHBlbmRUb0lELCBzZWxlY3RJRCwgb3B0aW9ucywgc2VsZWN0ZWQpIHtcblxuICAgIHRoaXMuYXBwZW5kVG9JRCA9IGFwcGVuZFRvSUQ7XG4gICAgdGhpcy5zZWxlY3RJRCA9IHNlbGVjdElEO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuICAgIFxuICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcHBlbmRUb0lEID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpO1xuICAgICAgICBzZWxlY3RMaXN0LmlkID0gdGhpcy5zZWxlY3RJRDsgICAgICAgIFxuICAgICAgICBhcHBlbmRUb0lELmFwcGVuZENoaWxkKHNlbGVjdExpc3QpO1xuICAgICAgICB0aGlzLnVwZGF0ZShzZWxlY3RJRCwgdGhpcy5vcHRpb25zLCB0aGlzLnNlbGVjdGVkKTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGVsZW0sIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG4gICAgICAgIHRoaXMuZGVsZXRlKGVsZW0pO1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICBvcHRpb24udmFsdWUgPSBrZXk7XG4gICAgICAgICAgICBvcHRpb24udGV4dCA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIHNlbGVjdExpc3QuYXBwZW5kQ2hpbGQob3B0aW9uKTtcblxuICAgICAgICAgICAgaWYgKGtleSA9PT0gc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb24uc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNlbGVjdGVkID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgdmFyIG9wdDtcbiAgICAgICAgZm9yICggdmFyIGkgPSAwLCBsZW4gPSBzZWxlY3RMaXN0Lm9wdGlvbnMubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XG4gICAgICAgICAgICBvcHQgPSBzZWxlY3RMaXN0Lm9wdGlvbnNbaV07XG4gICAgICAgICAgICBpZiAoIG9wdC5zZWxlY3RlZCA9PT0gdHJ1ZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0LnZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3Q9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIGZvciAodmFyIG9wdGlvbiBpbiBzZWxlY3RMaXN0KXtcbiAgICAgICAgICAgIHNlbGVjdExpc3QucmVtb3ZlKG9wdGlvbik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0QXNTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIGVsZW1lbnRIdG1sID0gZWxlbWVudC5vdXRlckhUTUw7XG4gICAgICAgIHJldHVybiBlbGVtZW50SHRtbDtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdEVsZW1lbnQ7IiwiZnVuY3Rpb24gc2FtcGxlTG9hZGVyICh1cmwsIGNvbnRleHQpIHtcbiAgICBcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgXG4gICAgICAgIHJlcXVlc3Qub3BlbignZ2V0JywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKHJlcXVlc3Quc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgICAgICAgIGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShidWZmZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ3Rpbnktc2FtcGxlLWxvYWRlciByZXF1ZXN0IGZhaWxlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xuICAgIFxuICAgIHJldHVybiBwcm9taXNlO1xufTtcbm1vZHVsZS5leHBvcnRzID0gc2FtcGxlTG9hZGVyOyIsInZhciBXQUFDbG9jayA9IHJlcXVpcmUoJy4vbGliL1dBQUNsb2NrJylcblxubW9kdWxlLmV4cG9ydHMgPSBXQUFDbG9ja1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB3aW5kb3cuV0FBQ2xvY2sgPSBXQUFDbG9ja1xuIiwidmFyIGlzQnJvd3NlciA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJylcblxudmFyIENMT0NLX0RFRkFVTFRTID0ge1xuICB0b2xlcmFuY2VMYXRlOiAwLjEwLFxuICB0b2xlcmFuY2VFYXJseTogMC4wMDFcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT0gRXZlbnQgPT09PT09PT09PT09PT09PT09PT0gLy9cbnZhciBFdmVudCA9IGZ1bmN0aW9uKGNsb2NrLCBkZWFkbGluZSwgZnVuYykge1xuICB0aGlzLmNsb2NrID0gY2xvY2tcbiAgdGhpcy5mdW5jID0gZnVuY1xuICB0aGlzLl9jbGVhcmVkID0gZmFsc2UgLy8gRmxhZyB1c2VkIHRvIGNsZWFyIGFuIGV2ZW50IGluc2lkZSBjYWxsYmFja1xuXG4gIHRoaXMudG9sZXJhbmNlTGF0ZSA9IGNsb2NrLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy50b2xlcmFuY2VFYXJseSA9IGNsb2NrLnRvbGVyYW5jZUVhcmx5XG4gIHRoaXMuX2xhdGVzdFRpbWUgPSBudWxsXG4gIHRoaXMuX2VhcmxpZXN0VGltZSA9IG51bGxcbiAgdGhpcy5kZWFkbGluZSA9IG51bGxcbiAgdGhpcy5yZXBlYXRUaW1lID0gbnVsbFxuXG4gIHRoaXMuc2NoZWR1bGUoZGVhZGxpbmUpXG59XG5cbi8vIFVuc2NoZWR1bGVzIHRoZSBldmVudFxuRXZlbnQucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gIHRoaXMuX2NsZWFyZWQgPSB0cnVlXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFNldHMgdGhlIGV2ZW50IHRvIHJlcGVhdCBldmVyeSBgdGltZWAgc2Vjb25kcy5cbkV2ZW50LnByb3RvdHlwZS5yZXBlYXQgPSBmdW5jdGlvbih0aW1lKSB7XG4gIGlmICh0aW1lID09PSAwKVxuICAgIHRocm93IG5ldyBFcnJvcignZGVsYXkgY2Fubm90IGJlIDAnKVxuICB0aGlzLnJlcGVhdFRpbWUgPSB0aW1lXG4gIGlmICghdGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpXG4gICAgdGhpcy5zY2hlZHVsZSh0aGlzLmRlYWRsaW5lICsgdGhpcy5yZXBlYXRUaW1lKVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBTZXRzIHRoZSB0aW1lIHRvbGVyYW5jZSBvZiB0aGUgZXZlbnQuXG4vLyBUaGUgZXZlbnQgd2lsbCBiZSBleGVjdXRlZCBpbiB0aGUgaW50ZXJ2YWwgYFtkZWFkbGluZSAtIGVhcmx5LCBkZWFkbGluZSArIGxhdGVdYFxuLy8gSWYgdGhlIGNsb2NrIGZhaWxzIHRvIGV4ZWN1dGUgdGhlIGV2ZW50IGluIHRpbWUsIHRoZSBldmVudCB3aWxsIGJlIGRyb3BwZWQuXG5FdmVudC5wcm90b3R5cGUudG9sZXJhbmNlID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIGlmICh0eXBlb2YgdmFsdWVzLmxhdGUgPT09ICdudW1iZXInKVxuICAgIHRoaXMudG9sZXJhbmNlTGF0ZSA9IHZhbHVlcy5sYXRlXG4gIGlmICh0eXBlb2YgdmFsdWVzLmVhcmx5ID09PSAnbnVtYmVyJylcbiAgICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gdmFsdWVzLmVhcmx5XG4gIHRoaXMuX3JlZnJlc2hFYXJseUxhdGVEYXRlcygpXG4gIGlmICh0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSkge1xuICAgIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gICAgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIGV2ZW50IGlzIHJlcGVhdGVkLCBmYWxzZSBvdGhlcndpc2VcbkV2ZW50LnByb3RvdHlwZS5pc1JlcGVhdGVkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJlcGVhdFRpbWUgIT09IG51bGwgfVxuXG4vLyBTY2hlZHVsZXMgdGhlIGV2ZW50IHRvIGJlIHJhbiBiZWZvcmUgYGRlYWRsaW5lYC5cbi8vIElmIHRoZSB0aW1lIGlzIHdpdGhpbiB0aGUgZXZlbnQgdG9sZXJhbmNlLCB3ZSBoYW5kbGUgdGhlIGV2ZW50IGltbWVkaWF0ZWx5LlxuLy8gSWYgdGhlIGV2ZW50IHdhcyBhbHJlYWR5IHNjaGVkdWxlZCBhdCBhIGRpZmZlcmVudCB0aW1lLCBpdCBpcyByZXNjaGVkdWxlZC5cbkV2ZW50LnByb3RvdHlwZS5zY2hlZHVsZSA9IGZ1bmN0aW9uKGRlYWRsaW5lKSB7XG4gIHRoaXMuX2NsZWFyZWQgPSBmYWxzZVxuICB0aGlzLmRlYWRsaW5lID0gZGVhZGxpbmVcbiAgdGhpcy5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzKClcblxuICBpZiAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lID49IHRoaXMuX2VhcmxpZXN0VGltZSkge1xuICAgIHRoaXMuX2V4ZWN1dGUoKVxuICBcbiAgfSBlbHNlIGlmICh0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSkge1xuICAgIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gICAgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbiAgXG4gIH0gZWxzZSB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxufVxuXG5FdmVudC5wcm90b3R5cGUudGltZVN0cmV0Y2ggPSBmdW5jdGlvbih0UmVmLCByYXRpbykge1xuICBpZiAodGhpcy5pc1JlcGVhdGVkKCkpXG4gICAgdGhpcy5yZXBlYXRUaW1lID0gdGhpcy5yZXBlYXRUaW1lICogcmF0aW9cblxuICB2YXIgZGVhZGxpbmUgPSB0UmVmICsgcmF0aW8gKiAodGhpcy5kZWFkbGluZSAtIHRSZWYpXG4gIC8vIElmIHRoZSBkZWFkbGluZSBpcyB0b28gY2xvc2Ugb3IgcGFzdCwgYW5kIHRoZSBldmVudCBoYXMgYSByZXBlYXQsXG4gIC8vIHdlIGNhbGN1bGF0ZSB0aGUgbmV4dCByZXBlYXQgcG9zc2libGUgaW4gdGhlIHN0cmV0Y2hlZCBzcGFjZS5cbiAgaWYgKHRoaXMuaXNSZXBlYXRlZCgpKSB7XG4gICAgd2hpbGUgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA+PSBkZWFkbGluZSAtIHRoaXMudG9sZXJhbmNlRWFybHkpXG4gICAgICBkZWFkbGluZSArPSB0aGlzLnJlcGVhdFRpbWVcbiAgfVxuICB0aGlzLnNjaGVkdWxlKGRlYWRsaW5lKVxufVxuXG4vLyBFeGVjdXRlcyB0aGUgZXZlbnRcbkV2ZW50LnByb3RvdHlwZS5fZXhlY3V0ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5jbG9jay5fc3RhcnRlZCA9PT0gZmFsc2UpIHJldHVyblxuICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuXG4gIGlmICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPCB0aGlzLl9sYXRlc3RUaW1lKVxuICAgIHRoaXMuZnVuYyh0aGlzKVxuICBlbHNlIHtcbiAgICBpZiAodGhpcy5vbmV4cGlyZWQpIHRoaXMub25leHBpcmVkKHRoaXMpXG4gICAgY29uc29sZS53YXJuKCdldmVudCBleHBpcmVkJylcbiAgfVxuICAvLyBJbiB0aGUgY2FzZSBgc2NoZWR1bGVgIGlzIGNhbGxlZCBpbnNpZGUgYGZ1bmNgLCB3ZSBuZWVkIHRvIGF2b2lkXG4gIC8vIG92ZXJyd3JpdGluZyB3aXRoIHlldCBhbm90aGVyIGBzY2hlZHVsZWAuXG4gIGlmICghdGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykgJiYgdGhpcy5pc1JlcGVhdGVkKCkgJiYgIXRoaXMuX2NsZWFyZWQpXG4gICAgdGhpcy5zY2hlZHVsZSh0aGlzLmRlYWRsaW5lICsgdGhpcy5yZXBlYXRUaW1lKSBcbn1cblxuLy8gVXBkYXRlcyBjYWNoZWQgdGltZXNcbkV2ZW50LnByb3RvdHlwZS5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2xhdGVzdFRpbWUgPSB0aGlzLmRlYWRsaW5lICsgdGhpcy50b2xlcmFuY2VMYXRlXG4gIHRoaXMuX2VhcmxpZXN0VGltZSA9IHRoaXMuZGVhZGxpbmUgLSB0aGlzLnRvbGVyYW5jZUVhcmx5XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IFdBQUNsb2NrID09PT09PT09PT09PT09PT09PT09IC8vXG52YXIgV0FBQ2xvY2sgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIG9wdHMgPSBvcHRzIHx8IHt9XG4gIHRoaXMudGlja01ldGhvZCA9IG9wdHMudGlja01ldGhvZCB8fCAnU2NyaXB0UHJvY2Vzc29yTm9kZSdcbiAgdGhpcy50b2xlcmFuY2VFYXJseSA9IG9wdHMudG9sZXJhbmNlRWFybHkgfHwgQ0xPQ0tfREVGQVVMVFMudG9sZXJhbmNlRWFybHlcbiAgdGhpcy50b2xlcmFuY2VMYXRlID0gb3B0cy50b2xlcmFuY2VMYXRlIHx8IENMT0NLX0RFRkFVTFRTLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dFxuICB0aGlzLl9ldmVudHMgPSBbXVxuICB0aGlzLl9zdGFydGVkID0gZmFsc2Vcbn1cblxuLy8gLS0tLS0tLS0tLSBQdWJsaWMgQVBJIC0tLS0tLS0tLS0gLy9cbi8vIFNjaGVkdWxlcyBgZnVuY2AgdG8gcnVuIGFmdGVyIGBkZWxheWAgc2Vjb25kcy5cbldBQUNsb2NrLnByb3RvdHlwZS5zZXRUaW1lb3V0ID0gZnVuY3Rpb24oZnVuYywgZGVsYXkpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUV2ZW50KGZ1bmMsIHRoaXMuX2Fic1RpbWUoZGVsYXkpKVxufVxuXG4vLyBTY2hlZHVsZXMgYGZ1bmNgIHRvIHJ1biBiZWZvcmUgYGRlYWRsaW5lYC5cbldBQUNsb2NrLnByb3RvdHlwZS5jYWxsYmFja0F0VGltZSA9IGZ1bmN0aW9uKGZ1bmMsIGRlYWRsaW5lKSB7XG4gIHJldHVybiB0aGlzLl9jcmVhdGVFdmVudChmdW5jLCBkZWFkbGluZSlcbn1cblxuLy8gU3RyZXRjaGVzIGBkZWFkbGluZWAgYW5kIGByZXBlYXRgIG9mIGFsbCBzY2hlZHVsZWQgYGV2ZW50c2AgYnkgYHJhdGlvYCwga2VlcGluZ1xuLy8gdGhlaXIgcmVsYXRpdmUgZGlzdGFuY2UgdG8gYHRSZWZgLiBJbiBmYWN0IHRoaXMgaXMgZXF1aXZhbGVudCB0byBjaGFuZ2luZyB0aGUgdGVtcG8uXG5XQUFDbG9jay5wcm90b3R5cGUudGltZVN0cmV0Y2ggPSBmdW5jdGlvbih0UmVmLCBldmVudHMsIHJhdGlvKSB7XG4gIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7IGV2ZW50LnRpbWVTdHJldGNoKHRSZWYsIHJhdGlvKSB9KVxuICByZXR1cm4gZXZlbnRzXG59XG5cbi8vIFJlbW92ZXMgYWxsIHNjaGVkdWxlZCBldmVudHMgYW5kIHN0YXJ0cyB0aGUgY2xvY2sgXG5XQUFDbG9jay5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3N0YXJ0ZWQgPT09IGZhbHNlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdGhpcy5fc3RhcnRlZCA9IHRydWVcbiAgICB0aGlzLl9ldmVudHMgPSBbXVxuXG4gICAgaWYgKHRoaXMudGlja01ldGhvZCA9PT0gJ1NjcmlwdFByb2Nlc3Nvck5vZGUnKSB7XG4gICAgICB2YXIgYnVmZmVyU2l6ZSA9IDI1NlxuICAgICAgLy8gV2UgaGF2ZSB0byBrZWVwIGEgcmVmZXJlbmNlIHRvIHRoZSBub2RlIHRvIGF2b2lkIGdhcmJhZ2UgY29sbGVjdGlvblxuICAgICAgdGhpcy5fY2xvY2tOb2RlID0gdGhpcy5jb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKVxuICAgICAgdGhpcy5fY2xvY2tOb2RlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKVxuICAgICAgdGhpcy5fY2xvY2tOb2RlLm9uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkgeyBzZWxmLl90aWNrKCkgfSlcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMudGlja01ldGhvZCA9PT0gJ21hbnVhbCcpIG51bGwgLy8gX3RpY2sgaXMgY2FsbGVkIG1hbnVhbGx5XG5cbiAgICBlbHNlIHRocm93IG5ldyBFcnJvcignaW52YWxpZCB0aWNrTWV0aG9kICcgKyB0aGlzLnRpY2tNZXRob2QpXG4gIH1cbn1cblxuLy8gU3RvcHMgdGhlIGNsb2NrXG5XQUFDbG9jay5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fc3RhcnRlZCA9PT0gdHJ1ZSkge1xuICAgIHRoaXMuX3N0YXJ0ZWQgPSBmYWxzZVxuICAgIHRoaXMuX2Nsb2NrTm9kZS5kaXNjb25uZWN0KClcbiAgfSAgXG59XG5cbi8vIC0tLS0tLS0tLS0gUHJpdmF0ZSAtLS0tLS0tLS0tIC8vXG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgcmFuIHBlcmlvZGljYWxseSwgYW5kIGF0IGVhY2ggdGljayBpdCBleGVjdXRlc1xuLy8gZXZlbnRzIGZvciB3aGljaCBgY3VycmVudFRpbWVgIGlzIGluY2x1ZGVkIGluIHRoZWlyIHRvbGVyYW5jZSBpbnRlcnZhbC5cbldBQUNsb2NrLnByb3RvdHlwZS5fdGljayA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZXZlbnQgPSB0aGlzLl9ldmVudHMuc2hpZnQoKVxuXG4gIHdoaWxlKGV2ZW50ICYmIGV2ZW50Ll9lYXJsaWVzdFRpbWUgPD0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKSB7XG4gICAgZXZlbnQuX2V4ZWN1dGUoKVxuICAgIGV2ZW50ID0gdGhpcy5fZXZlbnRzLnNoaWZ0KClcbiAgfVxuXG4gIC8vIFB1dCBiYWNrIHRoZSBsYXN0IGV2ZW50XG4gIGlmKGV2ZW50KSB0aGlzLl9ldmVudHMudW5zaGlmdChldmVudClcbn1cblxuLy8gQ3JlYXRlcyBhbiBldmVudCBhbmQgaW5zZXJ0IGl0IHRvIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX2NyZWF0ZUV2ZW50ID0gZnVuY3Rpb24oZnVuYywgZGVhZGxpbmUpIHtcbiAgcmV0dXJuIG5ldyBFdmVudCh0aGlzLCBkZWFkbGluZSwgZnVuYylcbn1cblxuLy8gSW5zZXJ0cyBhbiBldmVudCB0byB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9pbnNlcnRFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHRoaXMuX2V2ZW50cy5zcGxpY2UodGhpcy5faW5kZXhCeVRpbWUoZXZlbnQuX2VhcmxpZXN0VGltZSksIDAsIGV2ZW50KVxufVxuXG4vLyBSZW1vdmVzIGFuIGV2ZW50IGZyb20gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5fcmVtb3ZlRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgaW5kID0gdGhpcy5fZXZlbnRzLmluZGV4T2YoZXZlbnQpXG4gIGlmIChpbmQgIT09IC0xKSB0aGlzLl9ldmVudHMuc3BsaWNlKGluZCwgMSlcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIGBldmVudGAgaXMgaW4gcXVldWUsIGZhbHNlIG90aGVyd2lzZVxuV0FBQ2xvY2sucHJvdG90eXBlLl9oYXNFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gcmV0dXJuIHRoaXMuX2V2ZW50cy5pbmRleE9mKGV2ZW50KSAhPT0gLTFcbn1cblxuLy8gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IGV2ZW50IHdob3NlIGRlYWRsaW5lIGlzID49IHRvIGBkZWFkbGluZWBcbldBQUNsb2NrLnByb3RvdHlwZS5faW5kZXhCeVRpbWUgPSBmdW5jdGlvbihkZWFkbGluZSkge1xuICAvLyBwZXJmb3JtcyBhIGJpbmFyeSBzZWFyY2hcbiAgdmFyIGxvdyA9IDBcbiAgICAsIGhpZ2ggPSB0aGlzLl9ldmVudHMubGVuZ3RoXG4gICAgLCBtaWRcbiAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICBtaWQgPSBNYXRoLmZsb29yKChsb3cgKyBoaWdoKSAvIDIpXG4gICAgaWYgKHRoaXMuX2V2ZW50c1ttaWRdLl9lYXJsaWVzdFRpbWUgPCBkZWFkbGluZSlcbiAgICAgIGxvdyA9IG1pZCArIDFcbiAgICBlbHNlIGhpZ2ggPSBtaWRcbiAgfVxuICByZXR1cm4gbG93XG59XG5cbi8vIENvbnZlcnRzIGZyb20gcmVsYXRpdmUgdGltZSB0byBhYnNvbHV0ZSB0aW1lXG5XQUFDbG9jay5wcm90b3R5cGUuX2Fic1RpbWUgPSBmdW5jdGlvbihyZWxUaW1lKSB7XG4gIHJldHVybiByZWxUaW1lICsgdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lXG59XG5cbi8vIENvbnZlcnRzIGZyb20gYWJzb2x1dGUgdGltZSB0byByZWxhdGl2ZSB0aW1lIFxuV0FBQ2xvY2sucHJvdG90eXBlLl9yZWxUaW1lID0gZnVuY3Rpb24oYWJzVGltZSkge1xuICByZXR1cm4gYWJzVGltZSAtIHRoaXMuY29udGV4dC5jdXJyZW50VGltZVxufSIsImZ1bmN0aW9uIGF1ZGlvRGlzdG9ydGlvbk5vZGUoY3R4KSB7XG5cbiAgICB0aGlzLmN0eCA9IGN0eDtcbiAgICB0aGlzLmRpc3RvcnRpb247XG4gICAgdGhpcy5hbW91bnQgPSA0MDA7XG5cbiAgICB0aGlzLmdldERpc3RvcnRpb25Ob2RlID0gZnVuY3Rpb24gKGFtb3VudCkge1xuXG4gICAgICAgIGlmIChhbW91bnQpIHtcbiAgICAgICAgICAgIHRoaXMuYW1vdW50ID0gYW1vdW50O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kaXN0b3J0aW9uID0gdGhpcy5jdHguY3JlYXRlV2F2ZVNoYXBlcigpO1xuICAgICAgICB0aGlzLmRpc3RvcnRpb24ub3ZlcnNhbXBsZSA9ICc0eCc7XG4gICAgICAgIHRoaXMuZGlzdG9ydGlvbi5jdXJ2ZSA9IHRoaXMubWFrZURpc3RvcnRpb25DdXJ2ZSh0aGlzLmFtb3VudCk7XG4gICAgICAgIHJldHVybiB0aGlzLmRpc3RvcnRpb247XG4gICAgfVxuXG4gICAgdGhpcy5tYWtlRGlzdG9ydGlvbkN1cnZlID0gZnVuY3Rpb24gKGFtb3VudCkge1xuICAgICAgICB2YXIgayA9IHR5cGVvZiBhbW91bnQgPT09ICdudW1iZXInID8gYW1vdW50IDogNTAsXG4gICAgICAgICAgICAgICAgbl9zYW1wbGVzID0gNDQxMDAsXG4gICAgICAgICAgICAgICAgY3VydmUgPSBuZXcgRmxvYXQzMkFycmF5KG5fc2FtcGxlcyksXG4gICAgICAgICAgICAgICAgZGVnID0gTWF0aC5QSSAvIDE4MCxcbiAgICAgICAgICAgICAgICBpID0gMCxcbiAgICAgICAgICAgICAgICB4O1xuICAgICAgICBmb3IgKDsgaSA8IG5fc2FtcGxlczsgKytpKSB7XG4gICAgICAgICAgICB4ID0gaSAqIDIgLyBuX3NhbXBsZXMgLSAxO1xuICAgICAgICAgICAgY3VydmVbaV0gPSAoMyArIGspICogeCAqIDIwICogZGVnIC8gKE1hdGguUEkgKyBrICogTWF0aC5hYnMoeCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJ2ZTtcblxuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYXVkaW9EaXN0b3J0aW9uTm9kZTsiLCJjb25zdCBnZXRTZXRGb3JtVmFsdWVzID0gcmVxdWlyZSgnZ2V0LXNldC1mb3JtLXZhbHVlcycpO1xuXG5mdW5jdGlvbiBnZXRTZXRDb250cm9scygpIHtcblxuICAgIHRoaXMuZ2V0VHJhY2tlckNvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuICAgICAgICBsZXQgdmFsdWVzID0gZm9ybVZhbHVlcy5nZXQoZm9ybSk7XG4gICAgICAgIGxldCByZXQgPSB7fTtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHZhbHVlcykge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5ID09PSAnZGVsYXlFbmFibGVkJykge1xuICAgICAgICAgICAgICAgIHJldFtrZXldID0gJ2RlbGF5JztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdnYWluRW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9ICdnYWluJztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ3NhbXBsZVNldCcpIHsgXG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSB2YWx1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldFtrZXldID0gcGFyc2VGbG9hdCh2YWx1ZXNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB0aGlzLnNldFRyYWNrZXJDb250cm9scyA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgaWYgKCF2YWx1ZXMpIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHRoaXMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0gdmFsdWVzO1xuICAgIH07ICBcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNldENvbnRyb2xzO1xuIiwiLy8gcmVxdWlyZShcImJhYmVsLXBvbHlmaWxsXCIpOyBcbmNvbnN0IGxvYWRTYW1wbGVTZXQgPSByZXF1aXJlKCdsb2FkLXNhbXBsZS1zZXQnKTtcbmNvbnN0IHNlbGVjdEVsZW1lbnQgPSByZXF1aXJlKCdzZWxlY3QtZWxlbWVudCcpO1xuY29uc3QgZ2V0U2V0Rm9ybVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1zZXQtZm9ybS12YWx1ZXMnKTtcbmNvbnN0IGFkc3JHYWluTm9kZSA9IHJlcXVpcmUoJ2Fkc3ItZ2Fpbi1ub2RlJyk7XG5jb25zdCBzaW1wbGVUcmFja2VyID0gcmVxdWlyZSgnLi9zaW1wbGUtdHJhY2tlcicpO1xuY29uc3QgYXVkaW9EaXN0b3J0aW9uTm9kZSA9IHJlcXVpcmUoJy4vYXVkaW8tZGlzdG9ydGlvbi1ub2RlJyk7XG5jb25zdCBzYW1wbGVMb2FkZXIgPSByZXF1aXJlKCd0aW55LXNhbXBsZS1sb2FkZXInKTtcbmNvbnN0IEZpbGVTYXZlciA9IHJlcXVpcmUoJ2ZpbGUtc2F2ZXInKTtcblxuY29uc3QgZ2V0U2V0Q29udHJvbHMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IGdldFNldEF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRTZXRDb250cm9scygpO1xuXG5jb25zdCBjdHggPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5jb25zdCBkZWZhdWx0VHJhY2sgPSByZXF1aXJlKCcuL3RyYWNrLTInKTtcblxudmFyIGJ1ZmZlcnM7XG52YXIgY3VycmVudFNhbXBsZURhdGE7XG52YXIgc3RvcmFnZTtcbnZhciB0cmFja2VyRGVidWc7XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCB0cmFjaykge1xuXG4gICAgdmFyIHNhbXBsZVNldFByb21pc2UgPSBsb2FkU2FtcGxlU2V0KGN0eCwgZGF0YVVybCk7XG4gICAgc2FtcGxlU2V0UHJvbWlzZS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgYnVmZmVycyA9IGRhdGEuYnVmZmVycztcbiAgICAgICAgc2FtcGxlRGF0YSA9IGRhdGEuZGF0YTtcblxuICAgICAgICBpZiAoIXRyYWNrKSB7XG4gICAgICAgICAgICB0cmFjayA9IHN0b3JhZ2UuZ2V0VHJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCkge1xuICAgICAgICAgICAgdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCA9IDE2O1xuICAgICAgICB9XG5cbiAgICAgICAgY3VycmVudFNhbXBsZURhdGEgPSBzYW1wbGVEYXRhO1xuICAgICAgICBzZXR1cFRyYWNrZXJIdG1sKHNhbXBsZURhdGEsIHRyYWNrLnNldHRpbmdzLm1lYXN1cmVMZW5ndGgpO1xuICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjay5iZWF0KTtcbiAgICAgICAgc2NoZWR1bGUuc2V0dXBFdmVudHMoKTtcbiAgICB9KTtcbiAgIFxufVxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG5cbiAgICBmb3JtVmFsdWVzLnNldChmb3JtLCBkZWZhdWx0VHJhY2suc2V0dGluZ3MpO1xuICAgIGdldFNldEF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoZGVmYXVsdFRyYWNrLnNldHRpbmdzKTtcblxuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkZWZhdWx0VHJhY2suc2V0dGluZ3Muc2FtcGxlU2V0LCBkZWZhdWx0VHJhY2spO1xuICAgIHNldHVwQmFzZUV2ZW50cygpO1xuXG4gICAgc3RvcmFnZSA9IG5ldyB0cmFja3NMb2NhbFN0b3JhZ2UoKTtcbiAgICBzdG9yYWdlLnNldHVwU3RvcmFnZSgpO1xufTtcblxudmFyIGluc3RydW1lbnREYXRhID0ge307XG5mdW5jdGlvbiBzZXR1cFRyYWNrZXJIdG1sKGRhdGEsIG1lYXN1cmVMZW5ndGgpIHtcbiAgICBpbnN0cnVtZW50RGF0YSA9IGRhdGE7XG4gICAgaW5zdHJ1bWVudERhdGEudGl0bGUgPSBpbnN0cnVtZW50RGF0YS5maWxlbmFtZTtcblxuICAgIFxuICAgIHNjaGVkdWxlLmRyYXdUcmFja2VyKGRhdGEuZmlsZW5hbWUubGVuZ3RoLCBtZWFzdXJlTGVuZ3RoLCBpbnN0cnVtZW50RGF0YSk7XG4gICAgcmV0dXJuO1xufVxuXG5mdW5jdGlvbiBkaXNjb25uZWN0Tm9kZShub2RlLCBvcHRpb25zKSB7XG4gICAgbGV0IHRvdGFsTGVuZ3RoID1cbiAgICAgICAgb3B0aW9ucy5hdHRhY2tUaW1lICsgb3B0aW9ucy5zdXN0YWluVGltZSArIG9wdGlvbnMucmVsZWFzZVRpbWU7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIG5vZGUuZGlzY29ubmVjdCgpO1xuICAgIH0sIHRvdGFsTGVuZ3RoICogMTAwMCk7XG59XG5cblxuLy8gY29tcHJlc3Nvci5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG5cbmxldCBkaXN0b3J0aW9uTm9kZSA9IG5ldyBhdWRpb0Rpc3RvcnRpb25Ob2RlKGN0eCk7XG5sZXQgZGlzdG9ydGlvbiA9IGRpc3RvcnRpb25Ob2RlLmdldERpc3RvcnRpb25Ob2RlKDEwMCk7XG5cbmZ1bmN0aW9uIHNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKSB7XG5cbiAgICBsZXQgaW5zdHJ1bWVudE5hbWUgPSBpbnN0cnVtZW50RGF0YS5maWxlbmFtZVtiZWF0LnJvd0lkXTtcbiAgICBsZXQgaW5zdHJ1bWVudCA9IGJ1ZmZlcnNbaW5zdHJ1bWVudE5hbWVdLmdldCgpO1xuICAgIGxldCBvcHRpb25zID0gZ2V0U2V0QXVkaW9PcHRpb25zLmdldFRyYWNrZXJDb250cm9scygpO1xuXG4gICAgZnVuY3Rpb24gcGxheShzb3VyY2UpIHtcblxuICAgICAgICBzb3VyY2UuZGV0dW5lLnZhbHVlID0gb3B0aW9ucy5kZXR1bmU7XG5cbiAgICAgICAgLy8gR2FpblxuICAgICAgICBsZXQgbm9kZSA9IHJvdXRlR2Fpbihzb3VyY2UpXG4gICAgICAgIG5vZGUgPSByb3V0ZURlbGF5KG5vZGUpO1xuICAgICAgICBub2RlID0gcm91dGVDb21wcmVzc29yKG5vZGUpO1xuICAgICAgICBub2RlLmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgc291cmNlLnN0YXJ0KHRyaWdnZXJUaW1lKTtcblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJvdXRlQ29tcHJlc3NvciAobm9kZSkge1xuICAgICAgICAvLyBOb3QgdXNlZCB5ZXRcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIHZhciBjb21wcmVzc29yID0gY3R4LmNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcigpO1xuICAgICAgICBjb21wcmVzc29yLnRocmVzaG9sZC52YWx1ZSA9IC0xMDA7IC8vIC0xMDAgLSAwXG4gICAgICAgIGNvbXByZXNzb3Iua25lZS52YWx1ZSA9IDEwOyAvLyAxIC0gNDBcbiAgICAgICAgY29tcHJlc3Nvci5yYXRpby52YWx1ZSA9IDEyOyAvLyAxIC0gMjBcbiAgICAgICAgY29tcHJlc3Nvci5hdHRhY2sudmFsdWUgPSAxOyAvLyAwIC0gMVxuICAgICAgICBjb21wcmVzc29yLnJlbGVhc2UudmFsdWUgPSAwOyAvLyAwIC0gMVxuXG4gICAgICAgIG5vZGUuY29ubmVjdChjb21wcmVzc29yKTtcbiAgICAgICAgcmV0dXJuIGNvbXByZXNzb3I7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcm91dGVHYWluIChzb3VyY2UpIHtcbiAgICAgICAgbGV0IGdhaW4gPSBuZXcgYWRzckdhaW5Ob2RlKGN0eCk7XG4gICAgICAgIGxldCBvcHRpb25zID0gZ2V0U2V0QXVkaW9PcHRpb25zLmdldFRyYWNrZXJDb250cm9scygpO1xuICAgICAgICBsZXQgZ2Fpbk5vZGU7IFxuXG4gICAgICAgIC8vIE5vdCBlbmFibGVkIC0gZGVmYXVsdCBnYWluXG4gICAgICAgIGlmICghb3B0aW9ucy5nYWluRW5hYmxlZCkge1xuICAgICAgICAgICAgZ2Fpbk5vZGUgPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcbiAgICAgICAgICAgIHNvdXJjZS5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgICAgIHJldHVybiBnYWluTm9kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGdhaW4uc2V0T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgZ2Fpbk5vZGUgPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcbiAgICAgICAgc291cmNlLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICByZXR1cm4gZ2Fpbk5vZGU7XG5cblxuICAgIH1cblxuICAgIC8vIE5vdGUgZGVsYXkgYWx3YXlzIHVzZXMgYWJvdmUgZ2FpbiAtIGV2ZW4gaWYgbm90IGVuYWJsZWRcbiAgICBmdW5jdGlvbiByb3V0ZURlbGF5KG5vZGUpIHtcbiAgICAgICAgaWYgKCFvcHRpb25zLmRlbGF5RW5hYmxlZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjcmVhdGUgZGVsYXkgbm9kZVxuICAgICAgICBsZXQgZGVsYXkgPSBjdHguY3JlYXRlRGVsYXkoKTtcbiAgICAgICAgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gb3B0aW9ucy5kZWxheTtcblxuICAgICAgICAvLyBjcmVhdGUgYWRzciBnYWluIG5vZGVcbiAgICAgICAgbGV0IGdhaW4gPSBuZXcgYWRzckdhaW5Ob2RlKGN0eCk7XG4gICAgICAgIGdhaW4uc2V0T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgbGV0IGZlZWRiYWNrR2FpbiA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBmaWx0ZXJcbiAgICAgICAgbGV0IGZpbHRlciA9IGN0eC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAgICAgZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IG9wdGlvbnMuZmlsdGVyO1xuXG4gICAgICAgIC8vIGRlbGF5IC0+IGZlZWRiYWNrR2FpblxuICAgICAgICBkZWxheS5jb25uZWN0KGZlZWRiYWNrR2Fpbik7XG4gICAgICAgIGRpc2Nvbm5lY3ROb2RlKGRlbGF5LCBvcHRpb25zKTtcblxuICAgICAgICAvLyBmZWVkYmFjayAtPiBmaWx0ZXJcbiAgICAgICAgZmVlZGJhY2tHYWluLmNvbm5lY3QoZmlsdGVyKTtcblxuICAgICAgICAvLyBmaWx0ZXIgLT5kZWxheVxuICAgICAgICBmaWx0ZXIuY29ubmVjdChkZWxheSk7XG5cbiAgICAgICAgbm9kZS5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICByZXR1cm4gZGVsYXk7XG4gICAgfVxuICAgIHBsYXkoaW5zdHJ1bWVudCk7XG59XG5cbnZhciBzY2hlZHVsZSA9IG5ldyBzaW1wbGVUcmFja2VyKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuXG5mdW5jdGlvbiBzZXR1cEJhc2VFdmVudHMoKSB7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXknKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgc2NoZWR1bGUucnVuU2NoZWR1bGUoZ2V0U2V0QXVkaW9PcHRpb25zLm9wdGlvbnMuYnBtKTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYXVzZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0b3AnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgc2NoZWR1bGUgPSBuZXcgc2ltcGxlVHJhY2tlcihjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdicG0nKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIGlmIChzY2hlZHVsZS5ydW5uaW5nKSB7XG4gICAgICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgICAgICBzY2hlZHVsZS5ydW5TY2hlZHVsZShnZXRTZXRBdWRpb09wdGlvbnMub3B0aW9ucy5icG0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVhc3VyZUxlbmd0aCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGUpID0+IHtcblxuICAgICAgICAkKCcjbWVhc3VyZUxlbmd0aCcpLmJpbmQoJ2tleXByZXNzIGtleWRvd24ga2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lYXN1cmVMZW5ndGgnKS52YWx1ZTtcbiAgICAgICAgICAgICAgICBsZXQgbGVuZ3RoID0gcGFyc2VJbnQodmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGxlbmd0aCA8IDEpIHJldHVybjtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gbGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgbGV0IHRyYWNrID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICAgICAgICAgIHNldHVwVHJhY2tlckh0bWwoY3VycmVudFNhbXBsZURhdGEsIGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUubWVhc3VyZUxlbmd0aCA9IGxlbmd0aDtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjaylcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5zZXR1cEV2ZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgICQoJy5iYXNlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZ2V0U2V0QXVkaW9PcHRpb25zLnNldFRyYWNrZXJDb250cm9scygpO1xuICAgIH0pO1xufVxuXG4kKCcjc2FtcGxlU2V0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdGhpcy52YWx1ZSk7XG59KTtcblxuZnVuY3Rpb24gdHJhY2tzTG9jYWxTdG9yYWdlKCkge1xuXG4gICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UgPSBmdW5jdGlvbiAodXBkYXRlKSB7XG4gICAgICAgIHZhciBzdG9yYWdlID0ge307XG4gICAgICAgIHN0b3JhZ2VbJ1NlbGVjdCddID0gJ1NlbGVjdCc7XG5cblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbG9jYWxTdG9yYWdlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IGxvY2FsU3RvcmFnZS5rZXkoaSk7XG4gICAgICAgICAgICBzdG9yYWdlW2l0ZW1dID0gaXRlbTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBzZWxlY3QgZWxlbWVudFxuICAgICAgICB2YXIgcyA9IG5ldyBzZWxlY3RFbGVtZW50KFxuICAgICAgICAgICAgJ2xvYWQtc3RvcmFnZScsIC8vIGlkIHRvIGFwcGVuZCB0aGUgc2VsZWN0IGxpc3QgdG9cbiAgICAgICAgICAgICdiZWF0LWxpc3QnLCAvLyBpZCBvZiB0aGUgc2VsZWN0IGxpc3RcbiAgICAgICAgICAgIHN0b3JhZ2UgLy9cbiAgICAgICAgKTtcblxuICAgICAgICBpZiAodXBkYXRlKSB7XG4gICAgICAgICAgICBzLnVwZGF0ZSgnYmVhdC1saXN0Jywgc3RvcmFnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzLmNyZWF0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RmlsZW5hbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBmaWxlbmFtZSA9ICQoJyNmaWxlbmFtZScpLnZhbCgpO1xuICAgICAgICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgICAgICAgICBmaWxlbmFtZSA9ICd1bnRpdGxlZCc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjb21wbGV0ZSBzb25nXG4gICAgICovXG4gICAgdGhpcy5nZXRUcmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGZvcm1EYXRhID0gZ2V0U2V0QXVkaW9PcHRpb25zLmdldFRyYWNrZXJDb250cm9scygpO1xuXG4gICAgICAgIGxldCBiZWF0ID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICBsZXQgc29uZyA9IHsgXCJiZWF0XCI6IGJlYXQsIFwic2V0dGluZ3NcIjogZm9ybURhdGEgfTtcbiAgICAgICAgcmV0dXJuIHNvbmc7XG4gICAgfVxuXG4gICAgdGhpcy5zZXR1cFN0b3JhZ2UgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBzb25nID0gdGhpcy5nZXRUcmFjaygpO1xuICAgICAgICAgICAgbGV0IGpzb24gPSBKU09OLnN0cmluZ2lmeShzb25nKTtcblxuICAgICAgICAgICAgbGV0IGZpbGVuYW1lID0gdGhpcy5nZXRGaWxlbmFtZSgpO1xuXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShmaWxlbmFtZSwganNvbik7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG5cbiAgICAgICAgICAgICQoXCIjYmVhdC1saXN0XCIpLnZhbChmaWxlbmFtZSk7XG4gICAgICAgICAgICAvLyBhbGVydCgnVHJhY2sgc2F2ZWQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc2F2ZUFzSnNvblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZUFzSnNvbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgbGV0IHNvbmcgPSB0aGlzLmdldFRyYWNrKCk7XG4gICAgICAgICAgICBsZXQganNvbiA9IEpTT04uc3RyaW5naWZ5KHNvbmcpO1xuXG4gICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSB0aGlzLmdldEZpbGVuYW1lKCk7XG5cbiAgICAgICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2pzb25dLCB7dHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJ9KTtcbiAgICAgICAgICAgIEZpbGVTYXZlci5zYXZlQXMoYmxvYiwgZmlsZW5hbWUgKyBcIi5qc29uXCIpO1xuXG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI2ZpbGVuYW1lJykuYmluZCgna2V5cHJlc3Mga2V5ZG93biBrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmVhdC1saXN0JykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gJCgnI2JlYXQtbGlzdCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdTZWxlY3QnKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gaXRlbTtcbiAgICAgICAgICAgIGxldCB0cmFjayA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oaXRlbSkpO1xuXG4gICAgICAgICAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuXG4gICAgICAgICAgICBmb3JtVmFsdWVzLnNldChmb3JtLCB0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSB0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoO1xuXG4gICAgICAgICAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdHJhY2suc2V0dGluZ3Muc2FtcGxlU2V0LCB0cmFjayk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlbGV0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpO1xuICAgICAgICAgICAgbGV0IHRvRGVsZXRlID0gZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udGV4dDtcblxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odG9EZWxldGUpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcblxuICAgICAgICB9KTtcbiAgICB9O1xufVxuIiwiY29uc3QgV0FBQ2xvY2sgPSByZXF1aXJlKCd3YWFjbG9jaycpO1xuY29uc3QgdHJhY2tlclRhYmxlID0gcmVxdWlyZSgnLi90cmFja2VyLXRhYmxlLXN2ZycpO1xuY29uc3QgaGFzQ2xhc3MgPSByZXF1aXJlKCdoYXMtY2xhc3MnKTtcblxuLyoqXG4gKiBDb25zdHJ1Y3Qgb2JqZWN0XG4gKiBAcGFyYW0ge2F1ZGlvQ29udGV4dH0gY3R4IFxuICogQHBhcmFtIHtmdW5jdGlvbn0gc2NoZWR1bGVBdWRpb0JlYXQgZnVudGlvbiB3aGVuIGFuIGF1ZGlvIGlzIHBsYXllZFxuICovXG5mdW5jdGlvbiB0cmFja2VyKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpIHtcblxuICAgIHRoaXMubWVhc3VyZUxlbmd0aCA9IDE2O1xuICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQgPSBzY2hlZHVsZUF1ZGlvQmVhdDtcbiAgICB0aGlzLnNjaGVkdWxlRm9yd2FyZCA9IDAuMTtcbiAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgIHRoaXMuZXZlbnRNYXAgPSB7fTtcbiAgICB0aGlzLmNsb2NrID0gbmV3IFdBQUNsb2NrKGN0eCk7XG4gICAgdGhpcy5jbG9jay5zdGFydCgpO1xuICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogRHJhdyBhIHRyYWNrZXIgdGFibGUgYnkgbnVtUm93cyBhbmQgbnVtQ29sc1xuICAgICAqL1xuICAgIHRoaXMuZHJhd1RyYWNrZXIgPSBmdW5jdGlvbihudW1Sb3dzLCBudW1Db2xzLCBkYXRhKSB7XG4gICAgICAgIFxuICAgICAgICBsZXQgaHRtbFRhYmxlID0gbmV3IHRyYWNrZXJUYWJsZSgpO1xuICAgICAgICBcbiAgICAgICAgaHRtbFRhYmxlLnNldFJvd3MobnVtUm93cywgbnVtQ29scywgZGF0YSk7XG4gICAgICAgIGxldCBzdHIgPSBodG1sVGFibGUuZ2V0VGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlci1wYXJlbnRcIikuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIGxldCB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RyYWNrZXItcGFyZW50Jyk7XG4gICAgICAgIHQuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIHQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdhZnRlcmJlZ2luJywgc3RyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQdXNoIGN1cnJlbnQgYmVhdCBvbmUgZm9yd2FyZFxuICAgICAqL1xuICAgIHRoaXMubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50Kys7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnQgPj0gdGhpcy5tZWFzdXJlTGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBtaWxsaSBzZWNvbmRzIHBlciBiZWF0XG4gICAgICovXG4gICAgdGhpcy5taWxsaVBlckJlYXQgPSBmdW5jdGlvbiAoYmVhdHMpIHtcbiAgICAgICAgaWYgKCFiZWF0cykge1xuICAgICAgICAgICAgYmVhdHMgPSA2MDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTAwMCAqIDYwIC8gYmVhdHM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCBhIHRyYWNrZXIgcm93IGZyb20gYSBjZWxsLWlkXG4gICAgICovXG4gICAgdGhpcy5nZXRUcmFja2VyUm93VmFsdWVzID0gZnVuY3Rpb24gKGNlbGxJZCkge1xuICAgICAgICBsZXQgdmFsdWVzID0gW107XG4gICAgICAgIGxldCBzZWxlY3RvciA9IGBbZGF0YS1jZWxsLWlkPVwiJHtjZWxsSWR9XCJdYDtcblxuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZWxlbXMuZm9yRWFjaCgoZWwpID0+IHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlbC5kYXRhc2V0KTtcbiAgICAgICAgICAgIHZhbC5lbmFibGVkID0gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCd0cmFja2VyLWVuYWJsZWQnKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTY2hlZHVsZSBhIGJlYXQgY29sdW1uXG4gICAgICovXG4gICAgdGhpcy5zY2hlZHVsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGJlYXRDb2x1bW4gPSB0aGlzLmdldFRyYWNrZXJSb3dWYWx1ZXModGhpcy5jdXJyZW50KTtcbiAgICAgICAgbGV0IG5vdyA9IGN0eC5jdXJyZW50VGltZTtcblxuICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtY2VsbC1pZD1cIiR7dGhpcy5jdXJyZW50fVwiXWA7XG5cbiAgICAgICAgbGV0IGV2ZW50ID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIGVsZW1zLmZvckVhY2goIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5jbGFzc0xpc3QuYWRkKCd0cmFja2VyLWN1cnJlbnQnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQpO1xuXG4gICAgICAgIHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgICAgICBlbGVtcy5mb3JFYWNoKCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZSgndHJhY2tlci1jdXJyZW50JylcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0sIG5vdyArIHRoaXMuc2NoZWR1bGVGb3J3YXJkICsgdGhpcy5taWxsaVBlckJlYXQodGhpcy5icG0pIC8gMTAwMCk7XG5cbiAgICAgICAgYmVhdENvbHVtbi5mb3JFYWNoKChiZWF0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlQmVhdChiZWF0LCBub3cpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5zY2hlZHVsZUJlYXQgPSBmdW5jdGlvbiAoYmVhdCwgbm93KSB7XG5cbiAgICAgICAgbGV0IHRyaWdnZXJUaW1lID0gbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQ7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVNYXBbYmVhdC5jZWxsSWRdID0gdHJpZ2dlclRpbWU7XG4gICAgICAgIGlmIChiZWF0LmVuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKTtcbiAgICAgICAgICAgIH0sIG5vdyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5zY2hlZHVsZU1hcCA9IHt9O1xuXG4gICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdE5vdyA9IGZ1bmN0aW9uIChiZWF0KSB7XG5cbiAgICAgICAgaWYgKGJlYXQuZW5hYmxlZCkge1xuICAgICAgICAgICAgbGV0IGJlYXRFdmVudCA9IHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV07XG4gICAgICAgICAgICBpZiAoYmVhdEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgYmVhdEV2ZW50LmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSB0aGlzLnNjaGVkdWxlTWFwWzBdICsgYmVhdC5jZWxsSWQgKiB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwO1xuICAgICAgICBsZXQgbm93ID0gY3R4LmN1cnJlbnRUaW1lO1xuICAgICAgICB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKTtcbiAgICAgICAgfSwgbm93KTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbnRlcnZhbDtcbiAgICB0aGlzLnJ1blNjaGVkdWxlID0gZnVuY3Rpb24gKGJwbSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmJwbSA9IGJwbTtcbiAgICAgICAgbGV0IGludGVydmFsID0gdGhpcy5taWxsaVBlckJlYXQoYnBtKTtcblxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGUoKTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICB9LCAwKTtcblxuICAgICAgICB0aGlzLmludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG5cbiAgICAgICAgfSwgaW50ZXJ2YWwpO1xuICAgIH07XG5cbiAgICB0aGlzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEV2ZW50S2V5ID0gZnVuY3Rpb24gZ2V0RXZlbnRLZXkoYmVhdCkge1xuICAgICAgICByZXR1cm4gYmVhdC5yb3dJZCArIGJlYXQuY2VsbElkO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdHJhY2tlciB2YWx1ZXNcbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWNrZXJWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRyYWNrZXItY2VsbCcpO1xuICAgICAgICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgZS5kYXRhc2V0KTtcbiAgICAgICAgICAgIHZhbC5lbmFibGVkID0gaGFzQ2xhc3MoZSwgXCJ0cmFja2VyLWVuYWJsZWRcIik7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh2YWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTG9hZCB0cmFja2VyIHZhbHVlcyBpbiBKU09OIGZvcm1hdFxuICAgICAqL1xuICAgIHRoaXMubG9hZFRyYWNrZXJWYWx1ZXMgPSBmdW5jdGlvbiAoanNvbikge1xuXG4gICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy50cmFja2VyLWVuYWJsZWQnKTtcbiAgICAgICAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLmNsYXNzTGlzdC5yZW1vdmUoJ3RyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICBqc29uLmZvckVhY2goZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhLmVuYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBsZXQgc2VsZWN0b3IgPSBgLnRyYWNrZXItY2VsbFtkYXRhLXJvdy1pZD1cIiR7ZGF0YS5yb3dJZH1cIl1bZGF0YS1jZWxsLWlkPVwiJHtkYXRhLmNlbGxJZH1cIl1gO1xuICAgICAgICAgICAgICAgIGxldCBlbGVtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jbGFzc0xpc3QuYWRkKFwidHJhY2tlci1lbmFibGVkXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIExpc3RlbiBvbiB0cmFja2VyLWNlbGxcbiAgICAgKiBTY2hlZHVsZSBpZiBjZWxsIGlzIGNsaWNrZWQgYW5kIHRvZ2dsZSBjc3MgY2xhc3NcbiAgICAgKi9cbiAgICB0aGlzLnNldHVwRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBcbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRyYWNrZXItY2VsbCcpO1xuICAgICAgICBcbiAgICAgICAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgZS50YXJnZXQuZGF0YXNldCk7XG4gICAgICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBoYXNDbGFzcyhlLnRhcmdldCwgXCJ0cmFja2VyLWVuYWJsZWRcIik7XG4gICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRCZWF0ID0gZS50YXJnZXQuZGF0YXNldC5jZWxsSWQ7XG4gICAgICAgICAgICAgICAgaWYgKHZhbC5jZWxsSWQgPiBjdXJyZW50QmVhdCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0Tm93KHZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTGlzdC50b2dnbGUoJ3RyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdHJhY2tlcjsiLCJtb2R1bGUuZXhwb3J0cz1tb2R1bGUuZXhwb3J0cyA9IHtcImJlYXRcIjpbe1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCJoZWFkZXJcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcImhlYWRlclwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiaGVhZGVyXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjZWxsSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjZWxsSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjZWxsSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjZWxsSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNlbGxJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjZWxsSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjExXCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjExXCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEyXCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEyXCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjZWxsSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNlbGxJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjZWxsSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY2VsbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTVcIixcImNlbGxJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTVcIixcImNlbGxJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTVcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNVwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTVcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE1XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTZcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNlwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTZcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE2XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTdcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxN1wiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTdcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE3XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMThcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMThcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE4XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTlcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxOVwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTlcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE5XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjBcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjBcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIwXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjFcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMVwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjFcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIxXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjJcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyMlwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjJcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIyXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjNcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyM1wiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjNcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjIzXCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjRcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjRcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI0XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjVcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNVwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjVcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI1XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjZcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyNlwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjZcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI2XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjdcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyN1wiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjdcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI3XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjhcIixcImNlbGxJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyOFwiLFwiY2VsbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMjhcIixcImNlbGxJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjI4XCIsXCJjZWxsSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9XSxcInNldHRpbmdzXCI6e1wic2FtcGxlU2V0XCI6XCJodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vb3JhbWljcy9zYW1wbGVkL21hc3Rlci9ETS9MTS0yL3NhbXBsZWQuaW5zdHJ1bWVudC5qc29uXCIsXCJtZWFzdXJlTGVuZ3RoXCI6MTYsXCJicG1cIjoxOTAsXCJkZXR1bmVcIjotMTIwMCxcImluaXRHYWluXCI6MSxcIm1heEdhaW5cIjoxLFwiYXR0YWNrVGltZVwiOjEsXCJzdXN0YWluVGltZVwiOjEuOSxcInJlbGVhc2VUaW1lXCI6NSxcImRlbGF5RW5hYmxlZFwiOlwiZGVsYXlcIixcImRlbGF5XCI6MC42MyxcImZpbHRlclwiOjk5Mi42fX0iLCJmdW5jdGlvbiB0cmFja2VyVGFibGVTdmcoKSB7XG5cbiAgICB0aGlzLnN0ciA9ICcnO1xuICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgICAgY2VsbEZpcnN0OiAxMjAsXG4gICAgICAgIGNlbGxXaWR0aDogMTYsXG4gICAgICAgIGNlbGxTcGFjZTogNFxuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucy5jZWxsV2l0aFNwYWNlID0gdGhpcy5vcHRpb25zLmNlbGxTcGFjZSArIHRoaXMub3B0aW9ucy5jZWxsV2lkdGhcbiAgICB0aGlzLm9wdGlvbnMuY2VsbEZpcnN0V2l0aFNwYWNlID0gdGhpcy5vcHRpb25zLmNlbGxGaXJzdCArIHRoaXMub3B0aW9ucy5jZWxsU3BhY2VcblxuICAgIHRoaXMub3BcblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSBpbnQgbnVtYmVyIG9mIGNlbGxzXG4gICAgICogQHBhcmFtIGludCBudW1iZXIgb2Ygcm93c1xuICAgICAqIEBwYXJhbSBvYmplY3QgZGF0YVxuICAgICAqL1xuICAgIHRoaXMuc2V0Um93cyA9IGZ1bmN0aW9uIChudW1Sb3dzLCBudW1DZWxscywgZGF0YSkge1xuXG4gICAgICAgIHRoaXMubnVtUm93cyA9IG51bVJvd3M7XG4gICAgICAgIHRoaXMubnVtQ2VsbHMgPSBudW1DZWxscztcblxuICAgICAgICB0aGlzLnNldEhlYWRlcihudW1DZWxscywgZGF0YSk7XG4gICAgICAgIGZvciAobGV0IHJvd0lEID0gMDsgcm93SUQgPCBudW1Sb3dzOyByb3dJRCsrKSB7XG4gICAgICAgICAgICB0aGlzLnN0ciArPSB0aGlzLmdldENlbGxzKHJvd0lELCBudW1DZWxscywgZGF0YSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5zZXRIZWFkZXIgPSBmdW5jdGlvbiAobnVtQ2VsbHMsIGRhdGEpIHtcbiAgICAgICAgdGhpcy5zdHIgKz0gdGhpcy5nZXRDZWxscygnaGVhZGVyJywgbnVtQ2VsbHMsIHsgaGVhZGVyOiB0cnVlIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLmdldFRhYmxlID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIFxuICAgICAgICBsZXQgYm94WCA9ICh0aGlzLm9wdGlvbnMuY2VsbEZpcnN0ICsgdGhpcy5vcHRpb25zLmNlbGxTcGFjZSkgKyBcbiAgICAgICAgICAgICAgICAgICAodGhpcy5udW1DZWxscyAqIHRoaXMub3B0aW9ucy5jZWxsV2l0aFNwYWNlKVxuICAgICAgICBsZXQgYm94WSA9ICh0aGlzLm51bVJvd3MgKyAxKSAqICh0aGlzLm9wdGlvbnMuY2VsbFdpdGhTcGFjZSlcblxuICAgICAgICBsZXQgaHRtbCA9IGBcbiAgICAgICAgPHN2ZyBcbiAgICAgICAgICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiBcbiAgICAgICAgICAgIHByZXNlcnZlQXNwZWN0UmF0aW89XCJub25lXCIgXG4gICAgICAgICAgICB2aWV3Qm94PVwiMCAwICR7Ym94WH0gJHtib3hZfVwiIFxuICAgICAgICAgICAgY2xhc3M9XCJ0cmFja2VyXCI+XG4gICAgICAgICAgICA8Zz5gO1xuICAgICAgICBodG1sICs9IHRoaXMuc3RyO1xuICAgICAgICBodG1sICs9IGBcbiAgICAgICAgICAgIDwvZz5cbiAgICAgICAgPC9zdmc+YFxuICAgICAgICByZXR1cm4gaHRtbFxuICAgIH07XG5cbiAgICB0aGlzLmdldEZpcnN0Q2VsbCA9IGZ1bmN0aW9uIChyb3dJRCwgZGF0YSkge1xuXG4gICAgICAgIGxldCBzdHIgPSAnJztcbiAgICAgICAgc3RyICs9IGBcbiAgICAgICAgICAgIDxyZWN0XG4gICAgICAgICAgICAgICAgY2xhc3M9XCJ0cmFja2VyLWNlbGwtZmlyc3RcIiBcbiAgICAgICAgICAgICAgICBkYXRhLXJvdy1pZD1cIiR7cm93SUR9XCIgXG4gICAgICAgICAgICAgICAgd2lkdGg9XCIke3RoaXMub3B0aW9ucy5jZWxsRmlyc3R9XCIgXG4gICAgICAgICAgICAgICAgaGVpZ2h0PVwiJHt0aGlzLm9wdGlvbnMuY2VsbFdpZHRofVwiIFxuICAgICAgICAgICAgICAgIHg9XCIwXCIgXG4gICAgICAgICAgICAgICAgeT1cIiR7dGhpcy55fVwiPjwvcmVjdD5gO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRhdGEudGl0bGUpIHtcbiAgICAgICAgICAgIGxldCB0ZXh0ID0gZGF0YS50aXRsZVtyb3dJRF07XG4gICAgICAgICAgICBzdHIgKz0gYFxuICAgICAgICAgICAgICAgIDx0ZXh0IFxuICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInRyYWNrZXItY2VsbC10ZXh0XCJcbiAgICAgICAgICAgICAgICAgICAgeD1cIiR7dGhpcy5vcHRpb25zLmNlbGxTcGFjZX1cIlxuICAgICAgICAgICAgICAgICAgICB5PVwiJHt0aGlzLnkrMTJ9XCI+JHt0ZXh0fVxuICAgICAgICAgICAgICAgIDwvdGV4dD5gO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jdXJyZW50WCA9IHRoaXMub3B0aW9ucy5jZWxsRmlyc3RXaXRoU3BhY2VcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xuXG4gICAgdGhpcy5jdXJyZW50WCA9IDBcbiAgICB0aGlzLmdldEN1cnJlbnRYID0gZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIHggKyB0aGlzLmN1cnJlbnRYXG4gICAgfVxuXG4gICAgdGhpcy55ID0gMDtcbiAgICB0aGlzLmdldENlbGxzID0gZnVuY3Rpb24gKHJvd0lELCBudW1DZWxscywgZGF0YSkge1xuICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgIHZhciB4ID0gMDtcblxuICAgICAgICAvLyBHZXQgZmlyc3QgY2VsbC4gRS5nLiBpbnN0cnVtZW50XG4gICAgICAgIHN0ciArPSB0aGlzLmdldEZpcnN0Q2VsbChyb3dJRCwgZGF0YSk7XG4gICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgbnVtQ2VsbHM7IGMrKykge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzdHIgKz0gYFxuICAgICAgICAgICAgPHJlY3QgXG4gICAgICAgICAgICAgICAgY2xhc3M9XCJ0cmFja2VyLWNlbGxcIiBcbiAgICAgICAgICAgICAgICBkYXRhLXJvdy1pZD1cIiR7cm93SUR9XCIgXG4gICAgICAgICAgICAgICAgZGF0YS1jZWxsLWlkPVwiJHtjfVwiIFxuICAgICAgICAgICAgICAgIHdpZHRoPVwiJHt0aGlzLm9wdGlvbnMuY2VsbFdpZHRofVwiIFxuICAgICAgICAgICAgICAgIGhlaWdodD1cIiR7dGhpcy5vcHRpb25zLmNlbGxXaWR0aH1cIiBcbiAgICAgICAgICAgICAgICB4PVwiJHt0aGlzLmdldEN1cnJlbnRYKHgpfVwiIFxuICAgICAgICAgICAgICAgIHk9XCIke3RoaXMueX1cIj5cbiAgICAgICAgICAgIDwvcmVjdD5gO1xuXG4gICAgICAgICAgICBpZiAoZGF0YS5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBjb2x1bW4gaGVhZGVyLiBBIG51bWJlclxuICAgICAgICAgICAgICAgIGxldCB0ZXh0ID0gYyArIDE7XG4gICAgICAgICAgICAgICAgc3RyICs9IGBcbiAgICAgICAgICAgICAgICA8dGV4dCBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidHJhY2tlci1jZWxsLXRleHRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1yb3ctaWQ9XCIke3Jvd0lEfVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNlbGwtaWQ9XCIke2N9XCIgXG4gICAgICAgICAgICAgICAgICAgIHg9XCIke3RoaXMuZ2V0Q3VycmVudFgoeCsyKX1cIiBcbiAgICAgICAgICAgICAgICAgICAgeT1cIjEwXCI+JHt0ZXh0fVxuICAgICAgICAgICAgICAgIDwvdGV4dD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB4ICs9IHRoaXMub3B0aW9ucy5jZWxsV2l0aFNwYWNlXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnkgKz0gdGhpcy5vcHRpb25zLmNlbGxXaXRoU3BhY2VcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYWNrZXJUYWJsZVN2ZztcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
