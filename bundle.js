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
    
    // Get gain node
    this.getGainNode = function (begin) {

        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setTargetAtTime(this.options.initGain, begin, 0)

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

    this.selectList;
    
    this.create = function(cb) {
        var appendToID = document.getElementById(this.appendToID);
        this.selectList = document.createElement("select");
        this.selectList.id = this.selectID;        
        appendToID.appendChild(this.selectList);
        this.update(selectID, this.options, this.selected);
    };

    this.onChange = function (cb) {
        this.selectList.addEventListener('change', function(){
            cb(this.value)
        });
    }

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
const defaultTrack = require('./track-3');

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
           //  console.log('no measure length')
            track.settings.measureLength = 16;
        }

        console.log(track.settings.measureLength)

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

    // var initializedCtx;
    document.getElementById('play').addEventListener('click', function (e) {

        ctx.resume().then(() => {
            console.log('Playback resumed successfully');
        });

        let storage = new tracksLocalStorage();
        let track = storage.getTrack();

        schedule.measureLength = track.settings.measureLength;
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
            alert('Track saved');
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

            e.preventDefault();

            let elem = document.getElementById('beat-list');
            let toDelete = elem.options[elem.selectedIndex].text;

            localStorage.removeItem(toDelete);
            document.getElementById('filename').value = '';
            this.setLocalStorage('update');

            alert('Track has been deleted')

        });
    };
}

},{"./audio-distortion-node":14,"./get-set-controls":15,"./simple-tracker":17,"./track-3":18,"adsr-gain-node":1,"file-saver":3,"get-set-form-values":5,"load-sample-set":7,"select-element":10,"tiny-sample-loader":11}],17:[function(require,module,exports){
const WAAClock = require('waaclock');
const trackerTable = require('./tracker-table');
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
    this.getTrackerRowValues = function (colId) {
        let values = [];
        let selector = `[data-col-id="${colId}"]`;

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

        let selector = `[data-col-id="${this.current}"]`;

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
        this.scheduleMap[beat.colId] = triggerTime;
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

        let triggerTime = this.scheduleMap[0] + beat.colId * this.milliPerBeat(this.bpm) / 1000;
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
        return beat.rowId + beat.colId;
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
                let selector = `.tracker-cell[data-row-id="${data.rowId}"][data-col-id="${data.colId}"]`;
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
                let currentBeat = e.target.dataset.colId;
                if (val.colId > currentBeat) {
                    this.scheduleAudioBeatNow(val);
                }
                e.target.classList.toggle('tracker-enabled');
            })
        })
    }
}

module.exports = tracker;
},{"./tracker-table":19,"has-class":6,"waaclock":12}],18:[function(require,module,exports){
module.exports=module.exports = {
    "beat": [
        {
            "rowId": "0",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "0",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "1",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "4",
            "enabled": true
        },
        {
            "rowId": "2",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "23",
            "enabled": true
        },
        {
            "rowId": "2",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "2",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "1",
            "enabled": true
        },
        {
            "rowId": "3",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "6",
            "enabled": true
        },
        {
            "rowId": "3",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "17",
            "enabled": true
        },
        {
            "rowId": "3",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "3",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "0",
            "enabled": true
        },
        {
            "rowId": "4",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "2",
            "enabled": true
        },
        {
            "rowId": "4",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "12",
            "enabled": true
        },
        {
            "rowId": "4",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "14",
            "enabled": true
        },
        {
            "rowId": "4",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "21",
            "enabled": true
        },
        {
            "rowId": "4",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "25",
            "enabled": true
        },
        {
            "rowId": "4",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "4",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "4",
            "enabled": true
        },
        {
            "rowId": "5",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "7",
            "enabled": true
        },
        {
            "rowId": "5",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "11",
            "enabled": true
        },
        {
            "rowId": "5",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "15",
            "enabled": true
        },
        {
            "rowId": "5",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "19",
            "enabled": true
        },
        {
            "rowId": "5",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "5",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "27",
            "enabled": true
        },
        {
            "rowId": "6",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "6",
            "colId": "31",
            "enabled": true
        },
        {
            "rowId": "7",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "9",
            "enabled": true
        },
        {
            "rowId": "7",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "7",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "29",
            "enabled": true
        },
        {
            "rowId": "8",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "8",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "9",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "10",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "11",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "23",
            "enabled": true
        },
        {
            "rowId": "12",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "25",
            "enabled": true
        },
        {
            "rowId": "12",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "12",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "24",
            "enabled": true
        },
        {
            "rowId": "13",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "26",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "28",
            "enabled": true
        },
        {
            "rowId": "13",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "13",
            "colId": "31",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "0",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "1",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "2",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "3",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "4",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "5",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "6",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "7",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "8",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "9",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "10",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "11",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "12",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "13",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "14",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "15",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "16",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "17",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "18",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "19",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "20",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "21",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "22",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "23",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "24",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "25",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "26",
            "enabled": true
        },
        {
            "rowId": "14",
            "colId": "27",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "28",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "29",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "30",
            "enabled": false
        },
        {
            "rowId": "14",
            "colId": "31",
            "enabled": false
        }
    ],
    "settings": {
        "sampleSet": "https://raw.githubusercontent.com/oramics/sampled/master/DRUMS/pearl-master-studio/sampled.instrument.json",
        "measureLength": 32,
        "bpm": 373,
        "detune": -210,
        "gainEnabled": "gain",
        "initGain": 0.4,
        "maxGain": 0.5,
        "attackTime": 0.47,
        "sustainTime": 1.7,
        "releaseTime": 2.8,
        "delayEnabled": "delay",
        "delay": 0.56,
        "filter": 9450.3
    }
}
},{}],19:[function(require,module,exports){
function trackerTable() {

    this.str = '';
    this.getTable = function () {
        return '<table id="tracker-table">' + this.str + '</table>';
    };

    this.setHeader = function (numRows, data) {
        this.str += `<tr class="tracker-row header">`;
        this.str += this.getCells('header', numRows, { header: true });
        this.str += `</tr>`;

    };

    this.setRows = function (numRows, numCols, data) {

        this.setHeader(numCols, data);
        for (let rowID = 0; rowID < numRows; rowID++) {
            this.str += `<tr class="tracker-row" data-id="${rowID}">`;
            this.str += this.getCells(rowID, numCols, data);
            this.str += `</tr>`;
        }
    };

    this.getFirstCell = function (rowID, data) {
        var str = '';
        
        str += `<td class="tracker-first-cell" data-row-id="${rowID}">`;
        if (data.title) { 
            str += data.title[rowID];
        }
        
        str += `</td>`;
        return str;
    };

    this.getCells = function (rowID, numRows, data) {
        var str = '';

        str += this.getFirstCell(rowID, data);

        let cssClass = 'tracker-cell'

        if (rowID == 'header') {
            cssClass = 'tracker-cell-header'
        }

        for (let c = 0; c < numRows; c++) {
            str += `<td class="${cssClass}" data-row-id="${rowID}" data-col-id="${c}">`;
            if (data.header) {
                str += c + 1;
            }
            str += `</td>`;
        }
        return str;
    };
}

module.exports = trackerTable;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvZ2V0LWpzb24tcHJvbWlzZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nZXQtc2V0LWZvcm0tdmFsdWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2hhcy1jbGFzcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2FkLXNhbXBsZS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9hZC1zYW1wbGUtc2V0L25vZGVfbW9kdWxlcy90aW55LXNhbXBsZS1sb2FkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqLXR5cGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc2VsZWN0LWVsZW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdGlueS1zYW1wbGUtbG9hZGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhYWNsb2NrL2xpYi9XQUFDbG9jay5qcyIsInNyYy9hdWRpby1kaXN0b3J0aW9uLW5vZGUuanMiLCJzcmMvZ2V0LXNldC1jb250cm9scy5qcyIsInNyYy9tYWluLmpzIiwic3JjL3NpbXBsZS10cmFja2VyLmpzIiwic3JjL3RyYWNrLTMuanNvbiIsInNyYy90cmFja2VyLXRhYmxlLmpzIiwiLi4vLi4vLi4vdXNyL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN6T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBHYWluKGN0eCkge1xuXG4gICAgdGhpcy5jdHggPSBjdHg7XG5cbiAgICB0aGlzLnNlY29uZHNUb1RpbWVDb25zdGFudCA9IGZ1bmN0aW9uIChzZWMpIHtcbiAgICAgICAgcmV0dXJuIChzZWMgKiAyKSAvIDg7XG4gICAgfTtcblxuICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgICAgaW5pdEdhaW46IDAuMSwgLy8gSW5pdCBnYWluIG9uIG5vdGVcbiAgICAgICAgbWF4R2FpbjogMS4wLCAvLyBNYXggZ2FpbiBvbiBub3RlXG4gICAgICAgIGF0dGFja1RpbWU6IDAuMSwgLy8gQXR0YWNrVGltZS4gZ2Fpbi5pbml0IHRvIGdhaW4ubWF4IGluIGF0dGFja1RpbWVcbiAgICAgICAgc3VzdGFpblRpbWU6IDEsIC8vIFN1c3RhaW4gbm90ZSBpbiB0aW1lXG4gICAgICAgIHJlbGVhc2VUaW1lOiAxLCAvLyBBcHByb3hpbWF0ZWQgZW5kIHRpbWUuIENhbGN1bGF0ZWQgd2l0aCBzZWNvbmRzVG9UaW1lQ29uc3RhbnQoKVxuICAgICAgICAvLyBkaXNjb25uZWN0OiBmYWxzZSAvLyBTaG91bGQgd2UgYXV0b2Rpc2Nvbm5lY3QuIERlZmF1bHQgaXMgdHJ1ZVxuICAgIH07XG5cbiAgICB0aGlzLnNldE9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIH07XG5cbiAgICB0aGlzLmdhaW5Ob2RlO1xuICAgIFxuICAgIC8vIEdldCBnYWluIG5vZGVcbiAgICB0aGlzLmdldEdhaW5Ob2RlID0gZnVuY3Rpb24gKGJlZ2luKSB7XG5cbiAgICAgICAgdGhpcy5nYWluTm9kZSA9IHRoaXMuY3R4LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnNldFRhcmdldEF0VGltZSh0aGlzLm9wdGlvbnMuaW5pdEdhaW4sIGJlZ2luLCAwKVxuXG4gICAgICAgIC8vIEF0dGFjayB0byBtYXhcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnNldFRhcmdldEF0VGltZShcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMubWF4R2FpbixcbiAgICAgICAgICAgICAgICBiZWdpbiArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lLFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lKTtcblxuICAgICAgICAvLyBTdXN0YWluIGFuZCBlbmQgbm90ZVxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKFxuICAgICAgICAgICAgICAgIDAuMCxcbiAgICAgICAgICAgICAgICBiZWdpbiArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lICsgdGhpcy5vcHRpb25zLnN1c3RhaW5UaW1lLFxuICAgICAgICAgICAgICAgIHRoaXMuc2Vjb25kc1RvVGltZUNvbnN0YW50KHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZSkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5kaXNjb25uZWN0ICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0KGJlZ2luKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2Fpbk5vZGU7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0VG90YWxMZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSArIHRoaXMub3B0aW9ucy5zdXN0YWluVGltZSArIHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZVxuICAgIH1cbiAgICBcbiAgICB0aGlzLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRvdGFsTGVuZ3RoID0gdGhpcy5nZXRUb3RhbExlbmd0aCgpO1xuICAgICAgICBcbiAgICAgICAgc2V0VGltZW91dCggKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nYWluTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIHRvdGFsTGVuZ3RoICogMTAwMCk7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBHYWluOyIsIi8vIEZyb206IGh0dHBzOi8vZGV2Lm9wZXJhLmNvbS9hcnRpY2xlcy9kcnVtLXNvdW5kcy13ZWJhdWRpby9cbmZ1bmN0aW9uIGF1ZGlvQnVmZmVySW5zdHJ1bWVudChjb250ZXh0LCBidWZmZXIpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xufVxuXG5hdWRpb0J1ZmZlckluc3RydW1lbnQucHJvdG90eXBlLnNldHVwID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHRoaXMuc291cmNlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbn07XG5cbmF1ZGlvQnVmZmVySW5zdHJ1bWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHJldHVybiB0aGlzLnNvdXJjZTtcbn07XG5cbmF1ZGlvQnVmZmVySW5zdHJ1bWVudC5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdGhpcy5zZXR1cCgpO1xuICAgIHRoaXMuc291cmNlLnN0YXJ0KHRpbWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBhdWRpb0J1ZmZlckluc3RydW1lbnQ7IiwiLyogRmlsZVNhdmVyLmpzXG4gKiBBIHNhdmVBcygpIEZpbGVTYXZlciBpbXBsZW1lbnRhdGlvbi5cbiAqIDEuMy4yXG4gKiAyMDE2LTA2LTE2IDE4OjI1OjE5XG4gKlxuICogQnkgRWxpIEdyZXksIGh0dHA6Ly9lbGlncmV5LmNvbVxuICogTGljZW5zZTogTUlUXG4gKiAgIFNlZSBodHRwczovL2dpdGh1Yi5jb20vZWxpZ3JleS9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvTElDRU5TRS5tZFxuICovXG5cbi8qZ2xvYmFsIHNlbGYgKi9cbi8qanNsaW50IGJpdHdpc2U6IHRydWUsIGluZGVudDogNCwgbGF4YnJlYWs6IHRydWUsIGxheGNvbW1hOiB0cnVlLCBzbWFydHRhYnM6IHRydWUsIHBsdXNwbHVzOiB0cnVlICovXG5cbi8qISBAc291cmNlIGh0dHA6Ly9wdXJsLmVsaWdyZXkuY29tL2dpdGh1Yi9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvRmlsZVNhdmVyLmpzICovXG5cbnZhciBzYXZlQXMgPSBzYXZlQXMgfHwgKGZ1bmN0aW9uKHZpZXcpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdC8vIElFIDwxMCBpcyBleHBsaWNpdGx5IHVuc3VwcG9ydGVkXG5cdGlmICh0eXBlb2YgdmlldyA9PT0gXCJ1bmRlZmluZWRcIiB8fCB0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIC9NU0lFIFsxLTldXFwuLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhclxuXHRcdCAgZG9jID0gdmlldy5kb2N1bWVudFxuXHRcdCAgLy8gb25seSBnZXQgVVJMIHdoZW4gbmVjZXNzYXJ5IGluIGNhc2UgQmxvYi5qcyBoYXNuJ3Qgb3ZlcnJpZGRlbiBpdCB5ZXRcblx0XHQsIGdldF9VUkwgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2aWV3LlVSTCB8fCB2aWV3LndlYmtpdFVSTCB8fCB2aWV3O1xuXHRcdH1cblx0XHQsIHNhdmVfbGluayA9IGRvYy5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsIFwiYVwiKVxuXHRcdCwgY2FuX3VzZV9zYXZlX2xpbmsgPSBcImRvd25sb2FkXCIgaW4gc2F2ZV9saW5rXG5cdFx0LCBjbGljayA9IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHZhciBldmVudCA9IG5ldyBNb3VzZUV2ZW50KFwiY2xpY2tcIik7XG5cdFx0XHRub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdH1cblx0XHQsIGlzX3NhZmFyaSA9IC9jb25zdHJ1Y3Rvci9pLnRlc3Qodmlldy5IVE1MRWxlbWVudCkgfHwgdmlldy5zYWZhcmlcblx0XHQsIGlzX2Nocm9tZV9pb3MgPS9DcmlPU1xcL1tcXGRdKy8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KVxuXHRcdCwgdGhyb3dfb3V0c2lkZSA9IGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHQodmlldy5zZXRJbW1lZGlhdGUgfHwgdmlldy5zZXRUaW1lb3V0KShmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhyb3cgZXg7XG5cdFx0XHR9LCAwKTtcblx0XHR9XG5cdFx0LCBmb3JjZV9zYXZlYWJsZV90eXBlID0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIlxuXHRcdC8vIHRoZSBCbG9iIEFQSSBpcyBmdW5kYW1lbnRhbGx5IGJyb2tlbiBhcyB0aGVyZSBpcyBubyBcImRvd25sb2FkZmluaXNoZWRcIiBldmVudCB0byBzdWJzY3JpYmUgdG9cblx0XHQsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCA9IDEwMDAgKiA0MCAvLyBpbiBtc1xuXHRcdCwgcmV2b2tlID0gZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0dmFyIHJldm9rZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlID09PSBcInN0cmluZ1wiKSB7IC8vIGZpbGUgaXMgYW4gb2JqZWN0IFVSTFxuXHRcdFx0XHRcdGdldF9VUkwoKS5yZXZva2VPYmplY3RVUkwoZmlsZSk7XG5cdFx0XHRcdH0gZWxzZSB7IC8vIGZpbGUgaXMgYSBGaWxlXG5cdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHNldFRpbWVvdXQocmV2b2tlciwgYXJiaXRyYXJ5X3Jldm9rZV90aW1lb3V0KTtcblx0XHR9XG5cdFx0LCBkaXNwYXRjaCA9IGZ1bmN0aW9uKGZpbGVzYXZlciwgZXZlbnRfdHlwZXMsIGV2ZW50KSB7XG5cdFx0XHRldmVudF90eXBlcyA9IFtdLmNvbmNhdChldmVudF90eXBlcyk7XG5cdFx0XHR2YXIgaSA9IGV2ZW50X3R5cGVzLmxlbmd0aDtcblx0XHRcdHdoaWxlIChpLS0pIHtcblx0XHRcdFx0dmFyIGxpc3RlbmVyID0gZmlsZXNhdmVyW1wib25cIiArIGV2ZW50X3R5cGVzW2ldXTtcblx0XHRcdFx0aWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGxpc3RlbmVyLmNhbGwoZmlsZXNhdmVyLCBldmVudCB8fCBmaWxlc2F2ZXIpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdFx0XHR0aHJvd19vdXRzaWRlKGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0LCBhdXRvX2JvbSA9IGZ1bmN0aW9uKGJsb2IpIHtcblx0XHRcdC8vIHByZXBlbmQgQk9NIGZvciBVVEYtOCBYTUwgYW5kIHRleHQvKiB0eXBlcyAoaW5jbHVkaW5nIEhUTUwpXG5cdFx0XHQvLyBub3RlOiB5b3VyIGJyb3dzZXIgd2lsbCBhdXRvbWF0aWNhbGx5IGNvbnZlcnQgVVRGLTE2IFUrRkVGRiB0byBFRiBCQiBCRlxuXHRcdFx0aWYgKC9eXFxzKig/OnRleHRcXC9cXFMqfGFwcGxpY2F0aW9uXFwveG1sfFxcUypcXC9cXFMqXFwreG1sKVxccyo7LipjaGFyc2V0XFxzKj1cXHMqdXRmLTgvaS50ZXN0KGJsb2IudHlwZSkpIHtcblx0XHRcdFx0cmV0dXJuIG5ldyBCbG9iKFtTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkVGRiksIGJsb2JdLCB7dHlwZTogYmxvYi50eXBlfSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYmxvYjtcblx0XHR9XG5cdFx0LCBGaWxlU2F2ZXIgPSBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0aWYgKCFub19hdXRvX2JvbSkge1xuXHRcdFx0XHRibG9iID0gYXV0b19ib20oYmxvYik7XG5cdFx0XHR9XG5cdFx0XHQvLyBGaXJzdCB0cnkgYS5kb3dubG9hZCwgdGhlbiB3ZWIgZmlsZXN5c3RlbSwgdGhlbiBvYmplY3QgVVJMc1xuXHRcdFx0dmFyXG5cdFx0XHRcdCAgZmlsZXNhdmVyID0gdGhpc1xuXHRcdFx0XHQsIHR5cGUgPSBibG9iLnR5cGVcblx0XHRcdFx0LCBmb3JjZSA9IHR5cGUgPT09IGZvcmNlX3NhdmVhYmxlX3R5cGVcblx0XHRcdFx0LCBvYmplY3RfdXJsXG5cdFx0XHRcdCwgZGlzcGF0Y2hfYWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgd3JpdGVlbmRcIi5zcGxpdChcIiBcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIG9uIGFueSBmaWxlc3lzIGVycm9ycyByZXZlcnQgdG8gc2F2aW5nIHdpdGggb2JqZWN0IFVSTHNcblx0XHRcdFx0LCBmc19lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICgoaXNfY2hyb21lX2lvcyB8fCAoZm9yY2UgJiYgaXNfc2FmYXJpKSkgJiYgdmlldy5GaWxlUmVhZGVyKSB7XG5cdFx0XHRcdFx0XHQvLyBTYWZhcmkgZG9lc24ndCBhbGxvdyBkb3dubG9hZGluZyBvZiBibG9iIHVybHNcblx0XHRcdFx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXHRcdFx0XHRcdFx0cmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdXJsID0gaXNfY2hyb21lX2lvcyA/IHJlYWRlci5yZXN1bHQgOiByZWFkZXIucmVzdWx0LnJlcGxhY2UoL15kYXRhOlteO10qOy8sICdkYXRhOmF0dGFjaG1lbnQvZmlsZTsnKTtcblx0XHRcdFx0XHRcdFx0dmFyIHBvcHVwID0gdmlldy5vcGVuKHVybCwgJ19ibGFuaycpO1xuXHRcdFx0XHRcdFx0XHRpZighcG9wdXApIHZpZXcubG9jYXRpb24uaHJlZiA9IHVybDtcblx0XHRcdFx0XHRcdFx0dXJsPXVuZGVmaW5lZDsgLy8gcmVsZWFzZSByZWZlcmVuY2UgYmVmb3JlIGRpc3BhdGNoaW5nXG5cdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdHJlYWRlci5yZWFkQXNEYXRhVVJMKGJsb2IpO1xuXHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuSU5JVDtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gZG9uJ3QgY3JlYXRlIG1vcmUgb2JqZWN0IFVSTHMgdGhhbiBuZWVkZWRcblx0XHRcdFx0XHRpZiAoIW9iamVjdF91cmwpIHtcblx0XHRcdFx0XHRcdG9iamVjdF91cmwgPSBnZXRfVVJMKCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZm9yY2UpIHtcblx0XHRcdFx0XHRcdHZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBvcGVuZWQgPSB2aWV3Lm9wZW4ob2JqZWN0X3VybCwgXCJfYmxhbmtcIik7XG5cdFx0XHRcdFx0XHRpZiAoIW9wZW5lZCkge1xuXHRcdFx0XHRcdFx0XHQvLyBBcHBsZSBkb2VzIG5vdCBhbGxvdyB3aW5kb3cub3Blbiwgc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLmFwcGxlLmNvbS9saWJyYXJ5L3NhZmFyaS9kb2N1bWVudGF0aW9uL1Rvb2xzL0NvbmNlcHR1YWwvU2FmYXJpRXh0ZW5zaW9uR3VpZGUvV29ya2luZ3dpdGhXaW5kb3dzYW5kVGFicy9Xb3JraW5nd2l0aFdpbmRvd3NhbmRUYWJzLmh0bWxcblx0XHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRyZXZva2Uob2JqZWN0X3VybCk7XG5cdFx0XHRcdH1cblx0XHRcdDtcblx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLklOSVQ7XG5cblx0XHRcdGlmIChjYW5fdXNlX3NhdmVfbGluaykge1xuXHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzYXZlX2xpbmsuaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0c2F2ZV9saW5rLmRvd25sb2FkID0gbmFtZTtcblx0XHRcdFx0XHRjbGljayhzYXZlX2xpbmspO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRmc19lcnJvcigpO1xuXHRcdH1cblx0XHQsIEZTX3Byb3RvID0gRmlsZVNhdmVyLnByb3RvdHlwZVxuXHRcdCwgc2F2ZUFzID0gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdHJldHVybiBuZXcgRmlsZVNhdmVyKGJsb2IsIG5hbWUgfHwgYmxvYi5uYW1lIHx8IFwiZG93bmxvYWRcIiwgbm9fYXV0b19ib20pO1xuXHRcdH1cblx0O1xuXHQvLyBJRSAxMCsgKG5hdGl2ZSBzYXZlQXMpXG5cdGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRuYW1lID0gbmFtZSB8fCBibG9iLm5hbWUgfHwgXCJkb3dubG9hZFwiO1xuXG5cdFx0XHRpZiAoIW5vX2F1dG9fYm9tKSB7XG5cdFx0XHRcdGJsb2IgPSBhdXRvX2JvbShibG9iKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYihibG9iLCBuYW1lKTtcblx0XHR9O1xuXHR9XG5cblx0RlNfcHJvdG8uYWJvcnQgPSBmdW5jdGlvbigpe307XG5cdEZTX3Byb3RvLnJlYWR5U3RhdGUgPSBGU19wcm90by5JTklUID0gMDtcblx0RlNfcHJvdG8uV1JJVElORyA9IDE7XG5cdEZTX3Byb3RvLkRPTkUgPSAyO1xuXG5cdEZTX3Byb3RvLmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZXN0YXJ0ID1cblx0RlNfcHJvdG8ub25wcm9ncmVzcyA9XG5cdEZTX3Byb3RvLm9ud3JpdGUgPVxuXHRGU19wcm90by5vbmFib3J0ID1cblx0RlNfcHJvdG8ub25lcnJvciA9XG5cdEZTX3Byb3RvLm9ud3JpdGVlbmQgPVxuXHRcdG51bGw7XG5cblx0cmV0dXJuIHNhdmVBcztcbn0oXG5cdCAgIHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiICYmIHNlbGZcblx0fHwgdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3dcblx0fHwgdGhpcy5jb250ZW50XG4pKTtcbi8vIGBzZWxmYCBpcyB1bmRlZmluZWQgaW4gRmlyZWZveCBmb3IgQW5kcm9pZCBjb250ZW50IHNjcmlwdCBjb250ZXh0XG4vLyB3aGlsZSBgdGhpc2AgaXMgbnNJQ29udGVudEZyYW1lTWVzc2FnZU1hbmFnZXJcbi8vIHdpdGggYW4gYXR0cmlidXRlIGBjb250ZW50YCB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSB3aW5kb3dcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgbW9kdWxlLmV4cG9ydHMuc2F2ZUFzID0gc2F2ZUFzO1xufSBlbHNlIGlmICgodHlwZW9mIGRlZmluZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBkZWZpbmUgIT09IG51bGwpICYmIChkZWZpbmUuYW1kICE9PSBudWxsKSkge1xuICBkZWZpbmUoXCJGaWxlU2F2ZXIuanNcIiwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNhdmVBcztcbiAgfSk7XG59XG4iLCJmdW5jdGlvbiBnZXRKU09OUHJvbWlzZSh1cmwpIHtcblxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIHJlcXVlc3Qub3BlbignZ2V0JywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAndGV4dCc7XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdKU09OIGNvdWxkIG5vdCBiZSBsb2FkZWQgJyArIHVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0SlNPTlByb21pc2U7XG4iLCJmdW5jdGlvbiBnZXRFbGVtQ291bnRCeU5hbWUobmFtZSkge1xuICAgIHZhciBuYW1lcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKG5hbWUpO1xuICAgIHJldHVybiBuYW1lcy5sZW5ndGg7XG59XG5cbmZ1bmN0aW9uIGdldEZvcm1WYWx1ZXMoZm9ybUVsZW1lbnQpIHtcbiAgICB2YXIgZm9ybUVsZW1lbnRzID0gZm9ybUVsZW1lbnQuZWxlbWVudHM7XG4gICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGVsZW0gPSBudWxsO1xuICAgIGZvciAoaSA9IDA7IGkgPCBmb3JtRWxlbWVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgZWxlbSA9IGZvcm1FbGVtZW50c1tpXTtcbiAgICAgICAgc3dpdGNoIChlbGVtLnR5cGUpIHtcblxuICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RWYWx1ZXMgPSBnZXRTZWxlY3RWYWx1ZXMoZWxlbSk7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IHNlbGVjdFZhbHVlcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLnZhbHVlICE9PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmb3JtUGFyYW1zO1xufVxuXG5mdW5jdGlvbiBzZXRGb3JtVmFsdWVzKGZvcm1FbGVtZW50LCB2YWx1ZXMpIHtcbiAgICB2YXIgZm9ybUVsZW1lbnRzID0gZm9ybUVsZW1lbnQuZWxlbWVudHM7XG4gICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGVsZW0gPSBudWxsO1xuICAgIGZvciAoaSA9IDA7IGkgPCBmb3JtRWxlbWVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgZWxlbSA9IGZvcm1FbGVtZW50c1tpXTtcblxuICAgICAgICBzd2l0Y2ggKGVsZW0udHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0gPT09IGVsZW0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdID09PSBlbGVtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0U2VsZWN0VmFsdWVzKGVsZW0sIHZhbHVlc1tlbGVtLm5hbWVdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLnZhbHVlID0gdmFsdWVzW2VsZW0ubmFtZV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldFNlbGVjdFZhbHVlcyhzZWxlY3RFbGVtLCB2YWx1ZXMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHNlbGVjdEVsZW0ub3B0aW9ucztcbiAgICB2YXIgb3B0O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBvcHRpb25zLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgICAgICBvcHQgPSBvcHRpb25zW2ldO1xuICAgICAgICBpZiAodmFsdWVzLmluZGV4T2Yob3B0LnZhbHVlKSA+IC0xKSB7XG4gICAgICAgICAgICBvcHQuc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0LnNlbGVjdGVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFNlbGVjdFZhbHVlcyhzZWxlY3QpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIG9wdGlvbnMgPSBzZWxlY3QgJiYgc2VsZWN0Lm9wdGlvbnM7XG4gICAgdmFyIG9wdDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcblxuICAgICAgICBpZiAob3B0LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChvcHQudmFsdWUgfHwgb3B0LnRleHQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdldFNldEZvcm1WYWx1ZXMoKSB7XG4gICAgdGhpcy5zZXQgPSBzZXRGb3JtVmFsdWVzO1xuICAgIHRoaXMuZ2V0ID0gZ2V0Rm9ybVZhbHVlcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRTZXRGb3JtVmFsdWVzO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIG9ialR5cGUgPSByZXF1aXJlKCdvYmotdHlwZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChlbCwgc3RyKSB7XG5cdGlmIChvYmpUeXBlKGVsKS5pbmRleE9mKCdlbGVtZW50JykgPT09IC0xKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYW4gSFRNTCBET00gZWxlbWVudCBhcyBmaXJzdCBhcmd1bWVudCcpO1xuXHR9XG5cblx0aWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYSBzdHJpbmcgYXMgc2Vjb25kIGFyZ3VtZW50Jyk7XG5cdH1cblxuXHRpZiAoZWwuY2xhc3NMaXN0KSB7XG5cdFx0cmV0dXJuIGVsLmNsYXNzTGlzdC5jb250YWlucyhzdHIpO1xuXHR9XG5cblx0cmV0dXJuIG5ldyBSZWdFeHAoJyhefCApJyArIHN0ciArICcoIHwkKScsICdnaScpLnRlc3QoZWwuY2xhc3NOYW1lKTtcbn07XG4iLCJ2YXIgdGlueVNhbXBsZUxvYWRlciA9IHJlcXVpcmUoJ3Rpbnktc2FtcGxlLWxvYWRlcicpO1xudmFyIGF1ZGlvQnVmZmVySW5zdHJ1bWVudCA9IHJlcXVpcmUoJ2F1ZGlvLWJ1ZmZlci1pbnN0cnVtZW50Jyk7XG52YXIgZ2V0SlNPTiA9IHJlcXVpcmUoJ2dldC1qc29uLXByb21pc2UnKTtcblxudmFyIGJ1ZmZlcnMgPSB7fTtcbmZ1bmN0aW9uIGdldFNhbXBsZVByb21pc2VzIChjdHgsIGRhdGEpIHtcbiAgICB2YXIgYmFzZVVybCA9IGRhdGEuc2FtcGxlcztcbiAgICB2YXIgcHJvbWlzZXMgPSBbXTtcblxuICAgIGRhdGEuZmlsZW5hbWUgPSBbXTtcbiAgICB2YXIgaSA9IDA7XG4gICAgZGF0YS5maWxlcy5mb3JFYWNoKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFyIGZpbGVuYW1lID0gdmFsLnJlcGxhY2UoL1xcLlteLy5dKyQvLCBcIlwiKTtcbiAgICAgICAgZGF0YS5maWxlbmFtZS5wdXNoKGZpbGVuYW1lKTtcbiAgICAgICAgdmFyIHJlbW90ZVVybCA9IGJhc2VVcmwgKyB2YWw7XG5cbiAgICAgICAgbGV0IGxvYWRlclByb21pc2UgPSB0aW55U2FtcGxlTG9hZGVyKGN0eCwgcmVtb3RlVXJsKTtcbiAgICAgICAgbG9hZGVyUHJvbWlzZS50aGVuKGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgICAgIGJ1ZmZlcnNbZmlsZW5hbWVdID0gbmV3IGF1ZGlvQnVmZmVySW5zdHJ1bWVudChjdHgsIGJ1ZmZlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHByb21pc2VzLnB1c2gobG9hZGVyUHJvbWlzZSk7XG5cbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gcHJvbWlzZXM7XG59XG5cbmZ1bmN0aW9uIHNhbXBsZUFsbFByb21pc2UoY3R4LCBkYXRhVXJsKSB7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZhciBqc29uUHJvbWlzZSA9IGdldEpTT04oZGF0YVVybCk7XG4gICAgICAgIGpzb25Qcm9taXNlLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgdmFyIHNhbXBsZVByb21pc2VzID0gZ2V0U2FtcGxlUHJvbWlzZXMoY3R4LCBkYXRhKTtcbiAgICAgICAgICAgIFByb21pc2UuYWxsKHNhbXBsZVByb21pc2VzKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe2RhdGE6IGRhdGEsIGJ1ZmZlcnM6IGJ1ZmZlcnN9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5jYXRjaCAoZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG5mdW5jdGlvbiBsb2FkU2FtcGxlU2V0KGN0eCwgZGF0YVVybCkge1xuICAgIHJldHVybiBzYW1wbGVBbGxQcm9taXNlKGN0eCwgZGF0YVVybCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbG9hZFNhbXBsZVNldDtcbiIsImZ1bmN0aW9uIHNhbXBsZUxvYWRlciAoY29udGV4dCwgdXJsKSB7XG4gICAgXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIFxuICAgICAgICByZXF1ZXN0Lm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZihyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKXtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCd0aW55LXNhbXBsZS1sb2FkZXIgcmVxdWVzdCBmYWlsZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2FtcGxlTG9hZGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG5cdHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKS5yZXBsYWNlKC9eXFxbb2JqZWN0ICguKylcXF0kLywgJyQxJykudG9Mb3dlckNhc2UoKTtcbn07XG4iLCJmdW5jdGlvbiBzZWxlY3RFbGVtZW50KGFwcGVuZFRvSUQsIHNlbGVjdElELCBvcHRpb25zLCBzZWxlY3RlZCkge1xuXG4gICAgdGhpcy5hcHBlbmRUb0lEID0gYXBwZW5kVG9JRDtcbiAgICB0aGlzLnNlbGVjdElEID0gc2VsZWN0SUQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG5cbiAgICB0aGlzLnNlbGVjdExpc3Q7XG4gICAgXG4gICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbihjYikge1xuICAgICAgICB2YXIgYXBwZW5kVG9JRCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuYXBwZW5kVG9JRCk7XG4gICAgICAgIHRoaXMuc2VsZWN0TGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzZWxlY3RcIik7XG4gICAgICAgIHRoaXMuc2VsZWN0TGlzdC5pZCA9IHRoaXMuc2VsZWN0SUQ7ICAgICAgICBcbiAgICAgICAgYXBwZW5kVG9JRC5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdExpc3QpO1xuICAgICAgICB0aGlzLnVwZGF0ZShzZWxlY3RJRCwgdGhpcy5vcHRpb25zLCB0aGlzLnNlbGVjdGVkKTtcbiAgICB9O1xuXG4gICAgdGhpcy5vbkNoYW5nZSA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICB0aGlzLnNlbGVjdExpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNiKHRoaXMudmFsdWUpXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGVsZW0sIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG4gICAgICAgIHRoaXMuZGVsZXRlKGVsZW0pO1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICBvcHRpb24udmFsdWUgPSBrZXk7XG4gICAgICAgICAgICBvcHRpb24udGV4dCA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIHNlbGVjdExpc3QuYXBwZW5kQ2hpbGQob3B0aW9uKTtcblxuICAgICAgICAgICAgaWYgKGtleSA9PT0gc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb24uc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNlbGVjdGVkID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgdmFyIG9wdDtcbiAgICAgICAgZm9yICggdmFyIGkgPSAwLCBsZW4gPSBzZWxlY3RMaXN0Lm9wdGlvbnMubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XG4gICAgICAgICAgICBvcHQgPSBzZWxlY3RMaXN0Lm9wdGlvbnNbaV07XG4gICAgICAgICAgICBpZiAoIG9wdC5zZWxlY3RlZCA9PT0gdHJ1ZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0LnZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3Q9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIGZvciAodmFyIG9wdGlvbiBpbiBzZWxlY3RMaXN0KXtcbiAgICAgICAgICAgIHNlbGVjdExpc3QucmVtb3ZlKG9wdGlvbik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0QXNTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIGVsZW1lbnRIdG1sID0gZWxlbWVudC5vdXRlckhUTUw7XG4gICAgICAgIHJldHVybiBlbGVtZW50SHRtbDtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdEVsZW1lbnQ7IiwiZnVuY3Rpb24gc2FtcGxlTG9hZGVyICh1cmwsIGNvbnRleHQpIHtcbiAgICBcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgXG4gICAgICAgIHJlcXVlc3Qub3BlbignZ2V0JywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKHJlcXVlc3Quc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgICAgICAgIGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShidWZmZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ3Rpbnktc2FtcGxlLWxvYWRlciByZXF1ZXN0IGZhaWxlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xuICAgIFxuICAgIHJldHVybiBwcm9taXNlO1xufTtcbm1vZHVsZS5leHBvcnRzID0gc2FtcGxlTG9hZGVyOyIsInZhciBXQUFDbG9jayA9IHJlcXVpcmUoJy4vbGliL1dBQUNsb2NrJylcblxubW9kdWxlLmV4cG9ydHMgPSBXQUFDbG9ja1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB3aW5kb3cuV0FBQ2xvY2sgPSBXQUFDbG9ja1xuIiwidmFyIGlzQnJvd3NlciA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJylcblxudmFyIENMT0NLX0RFRkFVTFRTID0ge1xuICB0b2xlcmFuY2VMYXRlOiAwLjEwLFxuICB0b2xlcmFuY2VFYXJseTogMC4wMDFcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT0gRXZlbnQgPT09PT09PT09PT09PT09PT09PT0gLy9cbnZhciBFdmVudCA9IGZ1bmN0aW9uKGNsb2NrLCBkZWFkbGluZSwgZnVuYykge1xuICB0aGlzLmNsb2NrID0gY2xvY2tcbiAgdGhpcy5mdW5jID0gZnVuY1xuICB0aGlzLl9jbGVhcmVkID0gZmFsc2UgLy8gRmxhZyB1c2VkIHRvIGNsZWFyIGFuIGV2ZW50IGluc2lkZSBjYWxsYmFja1xuXG4gIHRoaXMudG9sZXJhbmNlTGF0ZSA9IGNsb2NrLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy50b2xlcmFuY2VFYXJseSA9IGNsb2NrLnRvbGVyYW5jZUVhcmx5XG4gIHRoaXMuX2xhdGVzdFRpbWUgPSBudWxsXG4gIHRoaXMuX2VhcmxpZXN0VGltZSA9IG51bGxcbiAgdGhpcy5kZWFkbGluZSA9IG51bGxcbiAgdGhpcy5yZXBlYXRUaW1lID0gbnVsbFxuXG4gIHRoaXMuc2NoZWR1bGUoZGVhZGxpbmUpXG59XG5cbi8vIFVuc2NoZWR1bGVzIHRoZSBldmVudFxuRXZlbnQucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gIHRoaXMuX2NsZWFyZWQgPSB0cnVlXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFNldHMgdGhlIGV2ZW50IHRvIHJlcGVhdCBldmVyeSBgdGltZWAgc2Vjb25kcy5cbkV2ZW50LnByb3RvdHlwZS5yZXBlYXQgPSBmdW5jdGlvbih0aW1lKSB7XG4gIGlmICh0aW1lID09PSAwKVxuICAgIHRocm93IG5ldyBFcnJvcignZGVsYXkgY2Fubm90IGJlIDAnKVxuICB0aGlzLnJlcGVhdFRpbWUgPSB0aW1lXG4gIGlmICghdGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpXG4gICAgdGhpcy5zY2hlZHVsZSh0aGlzLmRlYWRsaW5lICsgdGhpcy5yZXBlYXRUaW1lKVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBTZXRzIHRoZSB0aW1lIHRvbGVyYW5jZSBvZiB0aGUgZXZlbnQuXG4vLyBUaGUgZXZlbnQgd2lsbCBiZSBleGVjdXRlZCBpbiB0aGUgaW50ZXJ2YWwgYFtkZWFkbGluZSAtIGVhcmx5LCBkZWFkbGluZSArIGxhdGVdYFxuLy8gSWYgdGhlIGNsb2NrIGZhaWxzIHRvIGV4ZWN1dGUgdGhlIGV2ZW50IGluIHRpbWUsIHRoZSBldmVudCB3aWxsIGJlIGRyb3BwZWQuXG5FdmVudC5wcm90b3R5cGUudG9sZXJhbmNlID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIGlmICh0eXBlb2YgdmFsdWVzLmxhdGUgPT09ICdudW1iZXInKVxuICAgIHRoaXMudG9sZXJhbmNlTGF0ZSA9IHZhbHVlcy5sYXRlXG4gIGlmICh0eXBlb2YgdmFsdWVzLmVhcmx5ID09PSAnbnVtYmVyJylcbiAgICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gdmFsdWVzLmVhcmx5XG4gIHRoaXMuX3JlZnJlc2hFYXJseUxhdGVEYXRlcygpXG4gIGlmICh0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSkge1xuICAgIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gICAgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIGV2ZW50IGlzIHJlcGVhdGVkLCBmYWxzZSBvdGhlcndpc2VcbkV2ZW50LnByb3RvdHlwZS5pc1JlcGVhdGVkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJlcGVhdFRpbWUgIT09IG51bGwgfVxuXG4vLyBTY2hlZHVsZXMgdGhlIGV2ZW50IHRvIGJlIHJhbiBiZWZvcmUgYGRlYWRsaW5lYC5cbi8vIElmIHRoZSB0aW1lIGlzIHdpdGhpbiB0aGUgZXZlbnQgdG9sZXJhbmNlLCB3ZSBoYW5kbGUgdGhlIGV2ZW50IGltbWVkaWF0ZWx5LlxuLy8gSWYgdGhlIGV2ZW50IHdhcyBhbHJlYWR5IHNjaGVkdWxlZCBhdCBhIGRpZmZlcmVudCB0aW1lLCBpdCBpcyByZXNjaGVkdWxlZC5cbkV2ZW50LnByb3RvdHlwZS5zY2hlZHVsZSA9IGZ1bmN0aW9uKGRlYWRsaW5lKSB7XG4gIHRoaXMuX2NsZWFyZWQgPSBmYWxzZVxuICB0aGlzLmRlYWRsaW5lID0gZGVhZGxpbmVcbiAgdGhpcy5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzKClcblxuICBpZiAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lID49IHRoaXMuX2VhcmxpZXN0VGltZSkge1xuICAgIHRoaXMuX2V4ZWN1dGUoKVxuICBcbiAgfSBlbHNlIGlmICh0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSkge1xuICAgIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gICAgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbiAgXG4gIH0gZWxzZSB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxufVxuXG5FdmVudC5wcm90b3R5cGUudGltZVN0cmV0Y2ggPSBmdW5jdGlvbih0UmVmLCByYXRpbykge1xuICBpZiAodGhpcy5pc1JlcGVhdGVkKCkpXG4gICAgdGhpcy5yZXBlYXRUaW1lID0gdGhpcy5yZXBlYXRUaW1lICogcmF0aW9cblxuICB2YXIgZGVhZGxpbmUgPSB0UmVmICsgcmF0aW8gKiAodGhpcy5kZWFkbGluZSAtIHRSZWYpXG4gIC8vIElmIHRoZSBkZWFkbGluZSBpcyB0b28gY2xvc2Ugb3IgcGFzdCwgYW5kIHRoZSBldmVudCBoYXMgYSByZXBlYXQsXG4gIC8vIHdlIGNhbGN1bGF0ZSB0aGUgbmV4dCByZXBlYXQgcG9zc2libGUgaW4gdGhlIHN0cmV0Y2hlZCBzcGFjZS5cbiAgaWYgKHRoaXMuaXNSZXBlYXRlZCgpKSB7XG4gICAgd2hpbGUgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA+PSBkZWFkbGluZSAtIHRoaXMudG9sZXJhbmNlRWFybHkpXG4gICAgICBkZWFkbGluZSArPSB0aGlzLnJlcGVhdFRpbWVcbiAgfVxuICB0aGlzLnNjaGVkdWxlKGRlYWRsaW5lKVxufVxuXG4vLyBFeGVjdXRlcyB0aGUgZXZlbnRcbkV2ZW50LnByb3RvdHlwZS5fZXhlY3V0ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5jbG9jay5fc3RhcnRlZCA9PT0gZmFsc2UpIHJldHVyblxuICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuXG4gIGlmICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPCB0aGlzLl9sYXRlc3RUaW1lKVxuICAgIHRoaXMuZnVuYyh0aGlzKVxuICBlbHNlIHtcbiAgICBpZiAodGhpcy5vbmV4cGlyZWQpIHRoaXMub25leHBpcmVkKHRoaXMpXG4gICAgY29uc29sZS53YXJuKCdldmVudCBleHBpcmVkJylcbiAgfVxuICAvLyBJbiB0aGUgY2FzZSBgc2NoZWR1bGVgIGlzIGNhbGxlZCBpbnNpZGUgYGZ1bmNgLCB3ZSBuZWVkIHRvIGF2b2lkXG4gIC8vIG92ZXJyd3JpdGluZyB3aXRoIHlldCBhbm90aGVyIGBzY2hlZHVsZWAuXG4gIGlmICghdGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykgJiYgdGhpcy5pc1JlcGVhdGVkKCkgJiYgIXRoaXMuX2NsZWFyZWQpXG4gICAgdGhpcy5zY2hlZHVsZSh0aGlzLmRlYWRsaW5lICsgdGhpcy5yZXBlYXRUaW1lKSBcbn1cblxuLy8gVXBkYXRlcyBjYWNoZWQgdGltZXNcbkV2ZW50LnByb3RvdHlwZS5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2xhdGVzdFRpbWUgPSB0aGlzLmRlYWRsaW5lICsgdGhpcy50b2xlcmFuY2VMYXRlXG4gIHRoaXMuX2VhcmxpZXN0VGltZSA9IHRoaXMuZGVhZGxpbmUgLSB0aGlzLnRvbGVyYW5jZUVhcmx5XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IFdBQUNsb2NrID09PT09PT09PT09PT09PT09PT09IC8vXG52YXIgV0FBQ2xvY2sgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIG9wdHMgPSBvcHRzIHx8IHt9XG4gIHRoaXMudGlja01ldGhvZCA9IG9wdHMudGlja01ldGhvZCB8fCAnU2NyaXB0UHJvY2Vzc29yTm9kZSdcbiAgdGhpcy50b2xlcmFuY2VFYXJseSA9IG9wdHMudG9sZXJhbmNlRWFybHkgfHwgQ0xPQ0tfREVGQVVMVFMudG9sZXJhbmNlRWFybHlcbiAgdGhpcy50b2xlcmFuY2VMYXRlID0gb3B0cy50b2xlcmFuY2VMYXRlIHx8IENMT0NLX0RFRkFVTFRTLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dFxuICB0aGlzLl9ldmVudHMgPSBbXVxuICB0aGlzLl9zdGFydGVkID0gZmFsc2Vcbn1cblxuLy8gLS0tLS0tLS0tLSBQdWJsaWMgQVBJIC0tLS0tLS0tLS0gLy9cbi8vIFNjaGVkdWxlcyBgZnVuY2AgdG8gcnVuIGFmdGVyIGBkZWxheWAgc2Vjb25kcy5cbldBQUNsb2NrLnByb3RvdHlwZS5zZXRUaW1lb3V0ID0gZnVuY3Rpb24oZnVuYywgZGVsYXkpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUV2ZW50KGZ1bmMsIHRoaXMuX2Fic1RpbWUoZGVsYXkpKVxufVxuXG4vLyBTY2hlZHVsZXMgYGZ1bmNgIHRvIHJ1biBiZWZvcmUgYGRlYWRsaW5lYC5cbldBQUNsb2NrLnByb3RvdHlwZS5jYWxsYmFja0F0VGltZSA9IGZ1bmN0aW9uKGZ1bmMsIGRlYWRsaW5lKSB7XG4gIHJldHVybiB0aGlzLl9jcmVhdGVFdmVudChmdW5jLCBkZWFkbGluZSlcbn1cblxuLy8gU3RyZXRjaGVzIGBkZWFkbGluZWAgYW5kIGByZXBlYXRgIG9mIGFsbCBzY2hlZHVsZWQgYGV2ZW50c2AgYnkgYHJhdGlvYCwga2VlcGluZ1xuLy8gdGhlaXIgcmVsYXRpdmUgZGlzdGFuY2UgdG8gYHRSZWZgLiBJbiBmYWN0IHRoaXMgaXMgZXF1aXZhbGVudCB0byBjaGFuZ2luZyB0aGUgdGVtcG8uXG5XQUFDbG9jay5wcm90b3R5cGUudGltZVN0cmV0Y2ggPSBmdW5jdGlvbih0UmVmLCBldmVudHMsIHJhdGlvKSB7XG4gIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7IGV2ZW50LnRpbWVTdHJldGNoKHRSZWYsIHJhdGlvKSB9KVxuICByZXR1cm4gZXZlbnRzXG59XG5cbi8vIFJlbW92ZXMgYWxsIHNjaGVkdWxlZCBldmVudHMgYW5kIHN0YXJ0cyB0aGUgY2xvY2sgXG5XQUFDbG9jay5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3N0YXJ0ZWQgPT09IGZhbHNlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdGhpcy5fc3RhcnRlZCA9IHRydWVcbiAgICB0aGlzLl9ldmVudHMgPSBbXVxuXG4gICAgaWYgKHRoaXMudGlja01ldGhvZCA9PT0gJ1NjcmlwdFByb2Nlc3Nvck5vZGUnKSB7XG4gICAgICB2YXIgYnVmZmVyU2l6ZSA9IDI1NlxuICAgICAgLy8gV2UgaGF2ZSB0byBrZWVwIGEgcmVmZXJlbmNlIHRvIHRoZSBub2RlIHRvIGF2b2lkIGdhcmJhZ2UgY29sbGVjdGlvblxuICAgICAgdGhpcy5fY2xvY2tOb2RlID0gdGhpcy5jb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKVxuICAgICAgdGhpcy5fY2xvY2tOb2RlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKVxuICAgICAgdGhpcy5fY2xvY2tOb2RlLm9uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkgeyBzZWxmLl90aWNrKCkgfSlcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMudGlja01ldGhvZCA9PT0gJ21hbnVhbCcpIG51bGwgLy8gX3RpY2sgaXMgY2FsbGVkIG1hbnVhbGx5XG5cbiAgICBlbHNlIHRocm93IG5ldyBFcnJvcignaW52YWxpZCB0aWNrTWV0aG9kICcgKyB0aGlzLnRpY2tNZXRob2QpXG4gIH1cbn1cblxuLy8gU3RvcHMgdGhlIGNsb2NrXG5XQUFDbG9jay5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fc3RhcnRlZCA9PT0gdHJ1ZSkge1xuICAgIHRoaXMuX3N0YXJ0ZWQgPSBmYWxzZVxuICAgIHRoaXMuX2Nsb2NrTm9kZS5kaXNjb25uZWN0KClcbiAgfSAgXG59XG5cbi8vIC0tLS0tLS0tLS0gUHJpdmF0ZSAtLS0tLS0tLS0tIC8vXG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgcmFuIHBlcmlvZGljYWxseSwgYW5kIGF0IGVhY2ggdGljayBpdCBleGVjdXRlc1xuLy8gZXZlbnRzIGZvciB3aGljaCBgY3VycmVudFRpbWVgIGlzIGluY2x1ZGVkIGluIHRoZWlyIHRvbGVyYW5jZSBpbnRlcnZhbC5cbldBQUNsb2NrLnByb3RvdHlwZS5fdGljayA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZXZlbnQgPSB0aGlzLl9ldmVudHMuc2hpZnQoKVxuXG4gIHdoaWxlKGV2ZW50ICYmIGV2ZW50Ll9lYXJsaWVzdFRpbWUgPD0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKSB7XG4gICAgZXZlbnQuX2V4ZWN1dGUoKVxuICAgIGV2ZW50ID0gdGhpcy5fZXZlbnRzLnNoaWZ0KClcbiAgfVxuXG4gIC8vIFB1dCBiYWNrIHRoZSBsYXN0IGV2ZW50XG4gIGlmKGV2ZW50KSB0aGlzLl9ldmVudHMudW5zaGlmdChldmVudClcbn1cblxuLy8gQ3JlYXRlcyBhbiBldmVudCBhbmQgaW5zZXJ0IGl0IHRvIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX2NyZWF0ZUV2ZW50ID0gZnVuY3Rpb24oZnVuYywgZGVhZGxpbmUpIHtcbiAgcmV0dXJuIG5ldyBFdmVudCh0aGlzLCBkZWFkbGluZSwgZnVuYylcbn1cblxuLy8gSW5zZXJ0cyBhbiBldmVudCB0byB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9pbnNlcnRFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHRoaXMuX2V2ZW50cy5zcGxpY2UodGhpcy5faW5kZXhCeVRpbWUoZXZlbnQuX2VhcmxpZXN0VGltZSksIDAsIGV2ZW50KVxufVxuXG4vLyBSZW1vdmVzIGFuIGV2ZW50IGZyb20gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5fcmVtb3ZlRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgaW5kID0gdGhpcy5fZXZlbnRzLmluZGV4T2YoZXZlbnQpXG4gIGlmIChpbmQgIT09IC0xKSB0aGlzLl9ldmVudHMuc3BsaWNlKGluZCwgMSlcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIGBldmVudGAgaXMgaW4gcXVldWUsIGZhbHNlIG90aGVyd2lzZVxuV0FBQ2xvY2sucHJvdG90eXBlLl9oYXNFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gcmV0dXJuIHRoaXMuX2V2ZW50cy5pbmRleE9mKGV2ZW50KSAhPT0gLTFcbn1cblxuLy8gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IGV2ZW50IHdob3NlIGRlYWRsaW5lIGlzID49IHRvIGBkZWFkbGluZWBcbldBQUNsb2NrLnByb3RvdHlwZS5faW5kZXhCeVRpbWUgPSBmdW5jdGlvbihkZWFkbGluZSkge1xuICAvLyBwZXJmb3JtcyBhIGJpbmFyeSBzZWFyY2hcbiAgdmFyIGxvdyA9IDBcbiAgICAsIGhpZ2ggPSB0aGlzLl9ldmVudHMubGVuZ3RoXG4gICAgLCBtaWRcbiAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICBtaWQgPSBNYXRoLmZsb29yKChsb3cgKyBoaWdoKSAvIDIpXG4gICAgaWYgKHRoaXMuX2V2ZW50c1ttaWRdLl9lYXJsaWVzdFRpbWUgPCBkZWFkbGluZSlcbiAgICAgIGxvdyA9IG1pZCArIDFcbiAgICBlbHNlIGhpZ2ggPSBtaWRcbiAgfVxuICByZXR1cm4gbG93XG59XG5cbi8vIENvbnZlcnRzIGZyb20gcmVsYXRpdmUgdGltZSB0byBhYnNvbHV0ZSB0aW1lXG5XQUFDbG9jay5wcm90b3R5cGUuX2Fic1RpbWUgPSBmdW5jdGlvbihyZWxUaW1lKSB7XG4gIHJldHVybiByZWxUaW1lICsgdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lXG59XG5cbi8vIENvbnZlcnRzIGZyb20gYWJzb2x1dGUgdGltZSB0byByZWxhdGl2ZSB0aW1lIFxuV0FBQ2xvY2sucHJvdG90eXBlLl9yZWxUaW1lID0gZnVuY3Rpb24oYWJzVGltZSkge1xuICByZXR1cm4gYWJzVGltZSAtIHRoaXMuY29udGV4dC5jdXJyZW50VGltZVxufSIsImZ1bmN0aW9uIGF1ZGlvRGlzdG9ydGlvbk5vZGUoY3R4KSB7XG5cbiAgICB0aGlzLmN0eCA9IGN0eDtcbiAgICB0aGlzLmRpc3RvcnRpb247XG4gICAgdGhpcy5hbW91bnQgPSA0MDA7XG5cbiAgICB0aGlzLmdldERpc3RvcnRpb25Ob2RlID0gZnVuY3Rpb24gKGFtb3VudCkge1xuXG4gICAgICAgIGlmIChhbW91bnQpIHtcbiAgICAgICAgICAgIHRoaXMuYW1vdW50ID0gYW1vdW50O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5kaXN0b3J0aW9uID0gdGhpcy5jdHguY3JlYXRlV2F2ZVNoYXBlcigpO1xuICAgICAgICB0aGlzLmRpc3RvcnRpb24ub3ZlcnNhbXBsZSA9ICc0eCc7XG4gICAgICAgIHRoaXMuZGlzdG9ydGlvbi5jdXJ2ZSA9IHRoaXMubWFrZURpc3RvcnRpb25DdXJ2ZSh0aGlzLmFtb3VudCk7XG4gICAgICAgIHJldHVybiB0aGlzLmRpc3RvcnRpb247XG4gICAgfVxuXG4gICAgdGhpcy5tYWtlRGlzdG9ydGlvbkN1cnZlID0gZnVuY3Rpb24gKGFtb3VudCkge1xuICAgICAgICB2YXIgayA9IHR5cGVvZiBhbW91bnQgPT09ICdudW1iZXInID8gYW1vdW50IDogNTAsXG4gICAgICAgICAgICAgICAgbl9zYW1wbGVzID0gNDQxMDAsXG4gICAgICAgICAgICAgICAgY3VydmUgPSBuZXcgRmxvYXQzMkFycmF5KG5fc2FtcGxlcyksXG4gICAgICAgICAgICAgICAgZGVnID0gTWF0aC5QSSAvIDE4MCxcbiAgICAgICAgICAgICAgICBpID0gMCxcbiAgICAgICAgICAgICAgICB4O1xuICAgICAgICBmb3IgKDsgaSA8IG5fc2FtcGxlczsgKytpKSB7XG4gICAgICAgICAgICB4ID0gaSAqIDIgLyBuX3NhbXBsZXMgLSAxO1xuICAgICAgICAgICAgY3VydmVbaV0gPSAoMyArIGspICogeCAqIDIwICogZGVnIC8gKE1hdGguUEkgKyBrICogTWF0aC5hYnMoeCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJ2ZTtcblxuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYXVkaW9EaXN0b3J0aW9uTm9kZTsiLCJjb25zdCBnZXRTZXRGb3JtVmFsdWVzID0gcmVxdWlyZSgnZ2V0LXNldC1mb3JtLXZhbHVlcycpO1xuXG5mdW5jdGlvbiBnZXRTZXRDb250cm9scygpIHtcblxuICAgIHRoaXMuZ2V0VHJhY2tlckNvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuICAgICAgICBsZXQgdmFsdWVzID0gZm9ybVZhbHVlcy5nZXQoZm9ybSk7XG4gICAgICAgIGxldCByZXQgPSB7fTtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHZhbHVlcykge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5ID09PSAnZGVsYXlFbmFibGVkJykge1xuICAgICAgICAgICAgICAgIHJldFtrZXldID0gJ2RlbGF5JztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdnYWluRW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9ICdnYWluJztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ3NhbXBsZVNldCcpIHsgXG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSB2YWx1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldFtrZXldID0gcGFyc2VGbG9hdCh2YWx1ZXNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB0aGlzLnNldFRyYWNrZXJDb250cm9scyA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgaWYgKCF2YWx1ZXMpIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHRoaXMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0gdmFsdWVzO1xuICAgIH07ICBcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNldENvbnRyb2xzO1xuIiwiLy8gcmVxdWlyZShcImJhYmVsLXBvbHlmaWxsXCIpOyBcbmNvbnN0IGxvYWRTYW1wbGVTZXQgPSByZXF1aXJlKCdsb2FkLXNhbXBsZS1zZXQnKTtcbmNvbnN0IHNlbGVjdEVsZW1lbnQgPSByZXF1aXJlKCdzZWxlY3QtZWxlbWVudCcpO1xuY29uc3QgZ2V0U2V0Rm9ybVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1zZXQtZm9ybS12YWx1ZXMnKTtcbmNvbnN0IGFkc3JHYWluTm9kZSA9IHJlcXVpcmUoJ2Fkc3ItZ2Fpbi1ub2RlJyk7XG5jb25zdCBzaW1wbGVUcmFja2VyID0gcmVxdWlyZSgnLi9zaW1wbGUtdHJhY2tlcicpO1xuY29uc3QgYXVkaW9EaXN0b3J0aW9uTm9kZSA9IHJlcXVpcmUoJy4vYXVkaW8tZGlzdG9ydGlvbi1ub2RlJyk7XG5jb25zdCBzYW1wbGVMb2FkZXIgPSByZXF1aXJlKCd0aW55LXNhbXBsZS1sb2FkZXInKTtcbmNvbnN0IEZpbGVTYXZlciA9IHJlcXVpcmUoJ2ZpbGUtc2F2ZXInKTtcblxuY29uc3QgZ2V0U2V0Q29udHJvbHMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IGdldFNldEF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRTZXRDb250cm9scygpO1xuXG5jb25zdCBjdHggPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5jb25zdCBkZWZhdWx0VHJhY2sgPSByZXF1aXJlKCcuL3RyYWNrLTMnKTtcblxudmFyIGJ1ZmZlcnM7XG52YXIgY3VycmVudFNhbXBsZURhdGE7XG52YXIgc3RvcmFnZTtcbnZhciB0cmFja2VyRGVidWc7XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCB0cmFjaykge1xuXG4gICAgdmFyIHNhbXBsZVNldFByb21pc2UgPSBsb2FkU2FtcGxlU2V0KGN0eCwgZGF0YVVybCk7XG4gICAgc2FtcGxlU2V0UHJvbWlzZS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgYnVmZmVycyA9IGRhdGEuYnVmZmVycztcbiAgICAgICAgc2FtcGxlRGF0YSA9IGRhdGEuZGF0YTtcblxuICAgICAgICBpZiAoIXRyYWNrKSB7XG4gICAgICAgICAgICB0cmFjayA9IHN0b3JhZ2UuZ2V0VHJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCkge1xuICAgICAgICAgICAvLyAgY29uc29sZS5sb2coJ25vIG1lYXN1cmUgbGVuZ3RoJylcbiAgICAgICAgICAgIHRyYWNrLnNldHRpbmdzLm1lYXN1cmVMZW5ndGggPSAxNjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKHRyYWNrLnNldHRpbmdzLm1lYXN1cmVMZW5ndGgpXG5cbiAgICAgICAgY3VycmVudFNhbXBsZURhdGEgPSBzYW1wbGVEYXRhO1xuICAgICAgICBzZXR1cFRyYWNrZXJIdG1sKHNhbXBsZURhdGEsIHRyYWNrLnNldHRpbmdzLm1lYXN1cmVMZW5ndGgpO1xuICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjay5iZWF0KTtcbiAgICAgICAgc2NoZWR1bGUuc2V0dXBFdmVudHMoKTtcbiAgICB9KTtcbiAgIFxufVxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG5cbiAgICBmb3JtVmFsdWVzLnNldChmb3JtLCBkZWZhdWx0VHJhY2suc2V0dGluZ3MpO1xuICAgIGdldFNldEF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoZGVmYXVsdFRyYWNrLnNldHRpbmdzKTtcblxuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkZWZhdWx0VHJhY2suc2V0dGluZ3Muc2FtcGxlU2V0LCBkZWZhdWx0VHJhY2spO1xuICAgIHNldHVwQmFzZUV2ZW50cygpO1xuXG4gICAgc3RvcmFnZSA9IG5ldyB0cmFja3NMb2NhbFN0b3JhZ2UoKTtcbiAgICBzdG9yYWdlLnNldHVwU3RvcmFnZSgpO1xufTtcblxudmFyIGluc3RydW1lbnREYXRhID0ge307XG5mdW5jdGlvbiBzZXR1cFRyYWNrZXJIdG1sKGRhdGEsIG1lYXN1cmVMZW5ndGgpIHtcbiAgICBpbnN0cnVtZW50RGF0YSA9IGRhdGE7XG4gICAgaW5zdHJ1bWVudERhdGEudGl0bGUgPSBpbnN0cnVtZW50RGF0YS5maWxlbmFtZTtcbiAgICBzY2hlZHVsZS5kcmF3VHJhY2tlcihkYXRhLmZpbGVuYW1lLmxlbmd0aCwgbWVhc3VyZUxlbmd0aCwgaW5zdHJ1bWVudERhdGEpO1xuICAgIHJldHVybjtcbn1cblxuZnVuY3Rpb24gZGlzY29ubmVjdE5vZGUobm9kZSwgb3B0aW9ucykge1xuICAgIGxldCB0b3RhbExlbmd0aCA9XG4gICAgICAgIG9wdGlvbnMuYXR0YWNrVGltZSArIG9wdGlvbnMuc3VzdGFpblRpbWUgKyBvcHRpb25zLnJlbGVhc2VUaW1lO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBub2RlLmRpc2Nvbm5lY3QoKTtcbiAgICB9LCB0b3RhbExlbmd0aCAqIDEwMDApO1xufVxuXG5mdW5jdGlvbiBzY2hlZHVsZUF1ZGlvQmVhdChiZWF0LCB0cmlnZ2VyVGltZSkge1xuXG4gICAgbGV0IGluc3RydW1lbnROYW1lID0gaW5zdHJ1bWVudERhdGEuZmlsZW5hbWVbYmVhdC5yb3dJZF07XG4gICAgbGV0IGluc3RydW1lbnQgPSBidWZmZXJzW2luc3RydW1lbnROYW1lXS5nZXQoKTtcbiAgICBsZXQgb3B0aW9ucyA9IGdldFNldEF1ZGlvT3B0aW9ucy5nZXRUcmFja2VyQ29udHJvbHMoKTtcblxuICAgIGZ1bmN0aW9uIHBsYXkoc291cmNlKSB7XG5cbiAgICAgICAgc291cmNlLmRldHVuZS52YWx1ZSA9IG9wdGlvbnMuZGV0dW5lO1xuXG4gICAgICAgIC8vIEdhaW5cbiAgICAgICAgbGV0IG5vZGUgPSByb3V0ZUdhaW4oc291cmNlKVxuICAgICAgICBub2RlID0gcm91dGVEZWxheShub2RlKTtcbiAgICAgICAgbm9kZSA9IHJvdXRlQ29tcHJlc3Nvcihub2RlKTtcbiAgICAgICAgbm9kZS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG4gICAgICAgIHNvdXJjZS5zdGFydCh0cmlnZ2VyVGltZSk7XG5cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByb3V0ZUNvbXByZXNzb3IgKG5vZGUpIHtcbiAgICAgICAgLy8gTm90IHVzZWQgeWV0XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICB2YXIgY29tcHJlc3NvciA9IGN0eC5jcmVhdGVEeW5hbWljc0NvbXByZXNzb3IoKTtcbiAgICAgICAgY29tcHJlc3Nvci50aHJlc2hvbGQudmFsdWUgPSAtMTAwOyAvLyAtMTAwIC0gMFxuICAgICAgICBjb21wcmVzc29yLmtuZWUudmFsdWUgPSAxMDsgLy8gMSAtIDQwXG4gICAgICAgIGNvbXByZXNzb3IucmF0aW8udmFsdWUgPSAxMjsgLy8gMSAtIDIwXG4gICAgICAgIGNvbXByZXNzb3IuYXR0YWNrLnZhbHVlID0gMTsgLy8gMCAtIDFcbiAgICAgICAgY29tcHJlc3Nvci5yZWxlYXNlLnZhbHVlID0gMDsgLy8gMCAtIDFcblxuICAgICAgICBub2RlLmNvbm5lY3QoY29tcHJlc3Nvcik7XG4gICAgICAgIHJldHVybiBjb21wcmVzc29yO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJvdXRlR2FpbiAoc291cmNlKSB7XG4gICAgICAgIGxldCBnYWluID0gbmV3IGFkc3JHYWluTm9kZShjdHgpO1xuICAgICAgICBsZXQgb3B0aW9ucyA9IGdldFNldEF1ZGlvT3B0aW9ucy5nZXRUcmFja2VyQ29udHJvbHMoKTtcbiAgICAgICAgbGV0IGdhaW5Ob2RlOyBcblxuICAgICAgICAvLyBOb3QgZW5hYmxlZCAtIGRlZmF1bHQgZ2FpblxuICAgICAgICBpZiAoIW9wdGlvbnMuZ2FpbkVuYWJsZWQpIHtcbiAgICAgICAgICAgIGdhaW5Ob2RlID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG4gICAgICAgICAgICBzb3VyY2UuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICAgICAgICByZXR1cm4gZ2Fpbk5vZGU7XG4gICAgICAgIH1cblxuICAgICAgICBnYWluLnNldE9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIGdhaW5Ob2RlID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG4gICAgICAgIHNvdXJjZS5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgcmV0dXJuIGdhaW5Ob2RlO1xuXG5cbiAgICB9XG5cbiAgICAvLyBOb3RlIGRlbGF5IGFsd2F5cyB1c2VzIGFib3ZlIGdhaW4gLSBldmVuIGlmIG5vdCBlbmFibGVkXG4gICAgZnVuY3Rpb24gcm91dGVEZWxheShub2RlKSB7XG4gICAgICAgIGlmICghb3B0aW9ucy5kZWxheUVuYWJsZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY3JlYXRlIGRlbGF5IG5vZGVcbiAgICAgICAgbGV0IGRlbGF5ID0gY3R4LmNyZWF0ZURlbGF5KCk7XG4gICAgICAgIGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IG9wdGlvbnMuZGVsYXk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGFkc3IgZ2FpbiBub2RlXG4gICAgICAgIGxldCBnYWluID0gbmV3IGFkc3JHYWluTm9kZShjdHgpO1xuICAgICAgICBnYWluLnNldE9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIGxldCBmZWVkYmFja0dhaW4gPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcblxuICAgICAgICAvLyBjcmVhdGUgZmlsdGVyXG4gICAgICAgIGxldCBmaWx0ZXIgPSBjdHguY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgICAgIGZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSBvcHRpb25zLmZpbHRlcjtcblxuICAgICAgICAvLyBkZWxheSAtPiBmZWVkYmFja0dhaW5cbiAgICAgICAgZGVsYXkuY29ubmVjdChmZWVkYmFja0dhaW4pO1xuICAgICAgICBkaXNjb25uZWN0Tm9kZShkZWxheSwgb3B0aW9ucyk7XG5cbiAgICAgICAgLy8gZmVlZGJhY2sgLT4gZmlsdGVyXG4gICAgICAgIGZlZWRiYWNrR2Fpbi5jb25uZWN0KGZpbHRlcik7XG5cbiAgICAgICAgLy8gZmlsdGVyIC0+ZGVsYXlcbiAgICAgICAgZmlsdGVyLmNvbm5lY3QoZGVsYXkpO1xuXG4gICAgICAgIG5vZGUuY29ubmVjdChkZWxheSk7XG5cbiAgICAgICAgcmV0dXJuIGRlbGF5O1xuICAgIH1cbiAgICBwbGF5KGluc3RydW1lbnQpO1xufVxuXG52YXIgc2NoZWR1bGUgPSBuZXcgc2ltcGxlVHJhY2tlcihjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KTtcblxuZnVuY3Rpb24gc2V0dXBCYXNlRXZlbnRzKCkge1xuXG4gICAgLy8gdmFyIGluaXRpYWxpemVkQ3R4O1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgIGN0eC5yZXN1bWUoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQbGF5YmFjayByZXN1bWVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgc3RvcmFnZSA9IG5ldyB0cmFja3NMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgbGV0IHRyYWNrID0gc3RvcmFnZS5nZXRUcmFjaygpO1xuXG4gICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSB0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoO1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgIFxuICAgICAgICBzY2hlZHVsZS5ydW5TY2hlZHVsZShnZXRTZXRBdWRpb09wdGlvbnMub3B0aW9ucy5icG0pO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhdXNlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RvcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICBzY2hlZHVsZSA9IG5ldyBzaW1wbGVUcmFja2VyKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JwbScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGdldFNldEF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoKTtcbiAgICAgICAgaWYgKHNjaGVkdWxlLnJ1bm5pbmcpIHtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnJ1blNjaGVkdWxlKGdldFNldEF1ZGlvT3B0aW9ucy5vcHRpb25zLmJwbSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZWFzdXJlTGVuZ3RoJykuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoZSkgPT4ge1xuXG4gICAgICAgICQoJyNtZWFzdXJlTGVuZ3RoJykuYmluZCgna2V5cHJlc3Mga2V5ZG93biBrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVhc3VyZUxlbmd0aCcpLnZhbHVlO1xuICAgICAgICAgICAgICAgIGxldCBsZW5ndGggPSBwYXJzZUludCh2YWx1ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobGVuZ3RoIDwgMSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSBsZW5ndGg7XG5cbiAgICAgICAgICAgICAgICBsZXQgdHJhY2sgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgc2V0dXBUcmFja2VySHRtbChjdXJyZW50U2FtcGxlRGF0YSwgbGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gbGVuZ3RoO1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlLmxvYWRUcmFja2VyVmFsdWVzKHRyYWNrKVxuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnNldHVwRXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgJCgnLmJhc2UnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgfSk7XG59XG5cbiQoJyNzYW1wbGVTZXQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0aGlzLnZhbHVlKTtcbn0pO1xuXG5mdW5jdGlvbiB0cmFja3NMb2NhbFN0b3JhZ2UoKSB7XG5cbiAgICB0aGlzLnNldExvY2FsU3RvcmFnZSA9IGZ1bmN0aW9uICh1cGRhdGUpIHtcbiAgICAgICAgdmFyIHN0b3JhZ2UgPSB7fTtcbiAgICAgICAgc3RvcmFnZVsnU2VsZWN0J10gPSAnU2VsZWN0JztcblxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBsb2NhbFN0b3JhZ2UubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gbG9jYWxTdG9yYWdlLmtleShpKTtcbiAgICAgICAgICAgIHN0b3JhZ2VbaXRlbV0gPSBpdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHNlbGVjdCBlbGVtZW50XG4gICAgICAgIHZhciBzID0gbmV3IHNlbGVjdEVsZW1lbnQoXG4gICAgICAgICAgICAnbG9hZC1zdG9yYWdlJywgLy8gaWQgdG8gYXBwZW5kIHRoZSBzZWxlY3QgbGlzdCB0b1xuICAgICAgICAgICAgJ2JlYXQtbGlzdCcsIC8vIGlkIG9mIHRoZSBzZWxlY3QgbGlzdFxuICAgICAgICAgICAgc3RvcmFnZSAvL1xuICAgICAgICApO1xuXG4gICAgICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgICAgIHMudXBkYXRlKCdiZWF0LWxpc3QnLCBzdG9yYWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMuY3JlYXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRGaWxlbmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGZpbGVuYW1lID0gJCgnI2ZpbGVuYW1lJykudmFsKCk7XG4gICAgICAgIGlmICghZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIGZpbGVuYW1lID0gJ3VudGl0bGVkJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsZW5hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGNvbXBsZXRlIHNvbmdcbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgZm9ybURhdGEgPSBnZXRTZXRBdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG5cbiAgICAgICAgbGV0IGJlYXQgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgIGxldCBzb25nID0geyBcImJlYXRcIjogYmVhdCwgXCJzZXR0aW5nc1wiOiBmb3JtRGF0YSB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNvbmc7XG4gICAgfVxuXG4gICAgdGhpcy5zZXR1cFN0b3JhZ2UgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBzb25nID0gdGhpcy5nZXRUcmFjaygpO1xuICAgICAgICAgICAgbGV0IGpzb24gPSBKU09OLnN0cmluZ2lmeShzb25nKTtcblxuICAgICAgICAgICAgbGV0IGZpbGVuYW1lID0gdGhpcy5nZXRGaWxlbmFtZSgpO1xuXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShmaWxlbmFtZSwganNvbik7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG5cbiAgICAgICAgICAgICQoXCIjYmVhdC1saXN0XCIpLnZhbChmaWxlbmFtZSk7XG4gICAgICAgICAgICBhbGVydCgnVHJhY2sgc2F2ZWQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc2F2ZUFzSnNvblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZUFzSnNvbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgbGV0IHNvbmcgPSB0aGlzLmdldFRyYWNrKCk7XG4gICAgICAgICAgICBsZXQganNvbiA9IEpTT04uc3RyaW5naWZ5KHNvbmcpO1xuXG4gICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSB0aGlzLmdldEZpbGVuYW1lKCk7XG5cbiAgICAgICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2pzb25dLCB7dHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJ9KTtcbiAgICAgICAgICAgIEZpbGVTYXZlci5zYXZlQXMoYmxvYiwgZmlsZW5hbWUgKyBcIi5qc29uXCIpO1xuXG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI2ZpbGVuYW1lJykuYmluZCgna2V5cHJlc3Mga2V5ZG93biBrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmVhdC1saXN0JykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gJCgnI2JlYXQtbGlzdCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdTZWxlY3QnKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gaXRlbTtcbiAgICAgICAgICAgIGxldCB0cmFjayA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oaXRlbSkpO1xuXG4gICAgICAgICAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuXG4gICAgICAgICAgICBmb3JtVmFsdWVzLnNldChmb3JtLCB0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSB0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoO1xuXG4gICAgICAgICAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdHJhY2suc2V0dGluZ3Muc2FtcGxlU2V0LCB0cmFjayk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlbGV0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcblxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBsZXQgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiZWF0LWxpc3QnKTtcbiAgICAgICAgICAgIGxldCB0b0RlbGV0ZSA9IGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnRleHQ7XG5cbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRvRGVsZXRlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gJyc7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG5cbiAgICAgICAgICAgIGFsZXJ0KCdUcmFjayBoYXMgYmVlbiBkZWxldGVkJylcblxuICAgICAgICB9KTtcbiAgICB9O1xufVxuIiwiY29uc3QgV0FBQ2xvY2sgPSByZXF1aXJlKCd3YWFjbG9jaycpO1xuY29uc3QgdHJhY2tlclRhYmxlID0gcmVxdWlyZSgnLi90cmFja2VyLXRhYmxlJyk7XG5jb25zdCBoYXNDbGFzcyA9IHJlcXVpcmUoJ2hhcy1jbGFzcycpO1xuXG4vKipcbiAqIENvbnN0cnVjdCBvYmplY3RcbiAqIEBwYXJhbSB7YXVkaW9Db250ZXh0fSBjdHggXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzY2hlZHVsZUF1ZGlvQmVhdCBmdW50aW9uIHdoZW4gYW4gYXVkaW8gaXMgcGxheWVkXG4gKi9cbmZ1bmN0aW9uIHRyYWNrZXIoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCkge1xuXG4gICAgdGhpcy5tZWFzdXJlTGVuZ3RoID0gMTY7XG4gICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdCA9IHNjaGVkdWxlQXVkaW9CZWF0O1xuICAgIHRoaXMuc2NoZWR1bGVGb3J3YXJkID0gMC4xO1xuICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgdGhpcy5ldmVudE1hcCA9IHt9O1xuICAgIHRoaXMuY2xvY2sgPSBuZXcgV0FBQ2xvY2soY3R4KTtcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XG4gICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBEcmF3IGEgdHJhY2tlciB0YWJsZSBieSBudW1Sb3dzIGFuZCBudW1Db2xzXG4gICAgICovXG4gICAgdGhpcy5kcmF3VHJhY2tlciA9IGZ1bmN0aW9uKG51bVJvd3MsIG51bUNvbHMsIGRhdGEpIHtcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sVGFibGUgPSBuZXcgdHJhY2tlclRhYmxlKCk7XG5cbiAgICAgICAgaHRtbFRhYmxlLnNldFJvd3MobnVtUm93cywgbnVtQ29scywgZGF0YSk7XG4gICAgICAgIGxldCBzdHIgPSBodG1sVGFibGUuZ2V0VGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIGxldCB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RyYWNrZXItcGFyZW50Jyk7XG4gICAgICAgIHQuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIHQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdhZnRlcmJlZ2luJywgc3RyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQdXNoIGN1cnJlbnQgYmVhdCBvbmUgZm9yd2FyZFxuICAgICAqL1xuICAgIHRoaXMubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50Kys7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnQgPj0gdGhpcy5tZWFzdXJlTGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBtaWxsaSBzZWNvbmRzIHBlciBiZWF0XG4gICAgICovXG4gICAgdGhpcy5taWxsaVBlckJlYXQgPSBmdW5jdGlvbiAoYmVhdHMpIHtcbiAgICAgICAgaWYgKCFiZWF0cykge1xuICAgICAgICAgICAgYmVhdHMgPSA2MDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTAwMCAqIDYwIC8gYmVhdHM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCBhIHRyYWNrZXIgcm93IGZyb20gYSBjZWxsLWlkXG4gICAgICovXG4gICAgdGhpcy5nZXRUcmFja2VyUm93VmFsdWVzID0gZnVuY3Rpb24gKGNvbElkKSB7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLWNvbC1pZD1cIiR7Y29sSWR9XCJdYDtcblxuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZWxlbXMuZm9yRWFjaCgoZWwpID0+IHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlbC5kYXRhc2V0KTtcbiAgICAgICAgICAgIHZhbC5lbmFibGVkID0gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCd0cmFja2VyLWVuYWJsZWQnKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTY2hlZHVsZSBhIGJlYXQgY29sdW1uXG4gICAgICovXG4gICAgdGhpcy5zY2hlZHVsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGJlYXRDb2x1bW4gPSB0aGlzLmdldFRyYWNrZXJSb3dWYWx1ZXModGhpcy5jdXJyZW50KTtcbiAgICAgICAgbGV0IG5vdyA9IGN0eC5jdXJyZW50VGltZTtcblxuICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtY29sLWlkPVwiJHt0aGlzLmN1cnJlbnR9XCJdYDtcblxuICAgICAgICBsZXQgZXZlbnQgPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgZWxlbXMuZm9yRWFjaCggKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLmNsYXNzTGlzdC5hZGQoJ3RyYWNrZXItY3VycmVudCcpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCk7XG5cbiAgICAgICAgdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIGVsZW1zLmZvckVhY2goIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5jbGFzc0xpc3QucmVtb3ZlKCd0cmFja2VyLWN1cnJlbnQnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQgKyB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwKTtcblxuICAgICAgICBiZWF0Q29sdW1uLmZvckVhY2goKGJlYXQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVCZWF0KGJlYXQsIG5vdyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlQmVhdCA9IGZ1bmN0aW9uIChiZWF0LCBub3cpIHtcblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZDtcbiAgICAgICAgdGhpcy5zY2hlZHVsZU1hcFtiZWF0LmNvbElkXSA9IHRyaWdnZXJUaW1lO1xuICAgICAgICBpZiAoYmVhdC5lbmFibGVkKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdChiZWF0LCB0cmlnZ2VyVGltZSk7XG4gICAgICAgICAgICB9LCBub3cpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuc2NoZWR1bGVNYXAgPSB7fTtcblxuICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXROb3cgPSBmdW5jdGlvbiAoYmVhdCkge1xuXG4gICAgICAgIGlmIChiZWF0LmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGxldCBiZWF0RXZlbnQgPSB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldO1xuICAgICAgICAgICAgaWYgKGJlYXRFdmVudCkge1xuICAgICAgICAgICAgICAgIGJlYXRFdmVudC5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHRyaWdnZXJUaW1lID0gdGhpcy5zY2hlZHVsZU1hcFswXSArIGJlYXQuY29sSWQgKiB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwO1xuICAgICAgICBsZXQgbm93ID0gY3R4LmN1cnJlbnRUaW1lO1xuICAgICAgICB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKTtcbiAgICAgICAgfSwgbm93KTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbnRlcnZhbDtcbiAgICB0aGlzLnJ1blNjaGVkdWxlID0gZnVuY3Rpb24gKGJwbSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmJwbSA9IGJwbTtcbiAgICAgICAgbGV0IGludGVydmFsID0gdGhpcy5taWxsaVBlckJlYXQoYnBtKTtcblxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGUoKTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICB9LCAwKTtcblxuICAgICAgICB0aGlzLmludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG5cbiAgICAgICAgfSwgaW50ZXJ2YWwpO1xuICAgIH07XG5cbiAgICB0aGlzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEV2ZW50S2V5ID0gZnVuY3Rpb24gZ2V0RXZlbnRLZXkoYmVhdCkge1xuICAgICAgICByZXR1cm4gYmVhdC5yb3dJZCArIGJlYXQuY29sSWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCB0cmFja2VyIHZhbHVlc1xuICAgICAqL1xuICAgIHRoaXMuZ2V0VHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudHJhY2tlci1jZWxsJyk7XG4gICAgICAgIGVsZW1zLmZvckVhY2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBoYXNDbGFzcyhlLCBcInRyYWNrZXItZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHRyYWNrZXIgdmFsdWVzIGluIEpTT04gZm9ybWF0XG4gICAgICovXG4gICAgdGhpcy5sb2FkVHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uIChqc29uKSB7XG5cbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZSgndHJhY2tlci1lbmFibGVkJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGpzb24uZm9yRWFjaChmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEuZW5hYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAudHJhY2tlci1jZWxsW2RhdGEtcm93LWlkPVwiJHtkYXRhLnJvd0lkfVwiXVtkYXRhLWNvbC1pZD1cIiR7ZGF0YS5jb2xJZH1cIl1gO1xuICAgICAgICAgICAgICAgIGxldCBlbGVtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jbGFzc0xpc3QuYWRkKFwidHJhY2tlci1lbmFibGVkXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIExpc3RlbiBvbiB0cmFja2VyLWNlbGxcbiAgICAgKiBTY2hlZHVsZSBpZiBjZWxsIGlzIGNsaWNrZWQgYW5kIHRvZ2dsZSBjc3MgY2xhc3NcbiAgICAgKi9cbiAgICB0aGlzLnNldHVwRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBcbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRyYWNrZXItY2VsbCcpO1xuICAgICAgICBcbiAgICAgICAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgZS50YXJnZXQuZGF0YXNldCk7XG4gICAgICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBoYXNDbGFzcyhlLnRhcmdldCwgXCJ0cmFja2VyLWVuYWJsZWRcIik7XG4gICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRCZWF0ID0gZS50YXJnZXQuZGF0YXNldC5jb2xJZDtcbiAgICAgICAgICAgICAgICBpZiAodmFsLmNvbElkID4gY3VycmVudEJlYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdE5vdyh2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlLnRhcmdldC5jbGFzc0xpc3QudG9nZ2xlKCd0cmFja2VyLWVuYWJsZWQnKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYWNrZXI7IiwibW9kdWxlLmV4cG9ydHM9bW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgXCJiZWF0XCI6IFtcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTdcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjMwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMzFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjMwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMzFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjdcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMzBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjMxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMThcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMzFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMThcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjRcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjdcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjZcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMzFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTdcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjMwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjMwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjlcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMzFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjMwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMzFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjMwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMzFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjRcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEyXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjMxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjRcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI1XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjdcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTdcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIyXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjhcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI5XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjEzXCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMzBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTNcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjBcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjNcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjZcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCI3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiOFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjExXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTJcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxM1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMTVcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxNlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjE3XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMThcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIxOVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIwXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjFcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyMlwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjIzXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjRcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyNVwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI2XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIyN1wiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjI4XCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJyb3dJZFwiOiBcIjE0XCIsXG4gICAgICAgICAgICBcImNvbElkXCI6IFwiMjlcIixcbiAgICAgICAgICAgIFwiZW5hYmxlZFwiOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcInJvd0lkXCI6IFwiMTRcIixcbiAgICAgICAgICAgIFwiY29sSWRcIjogXCIzMFwiLFxuICAgICAgICAgICAgXCJlbmFibGVkXCI6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwicm93SWRcIjogXCIxNFwiLFxuICAgICAgICAgICAgXCJjb2xJZFwiOiBcIjMxXCIsXG4gICAgICAgICAgICBcImVuYWJsZWRcIjogZmFsc2VcbiAgICAgICAgfVxuICAgIF0sXG4gICAgXCJzZXR0aW5nc1wiOiB7XG4gICAgICAgIFwic2FtcGxlU2V0XCI6IFwiaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL29yYW1pY3Mvc2FtcGxlZC9tYXN0ZXIvRFJVTVMvcGVhcmwtbWFzdGVyLXN0dWRpby9zYW1wbGVkLmluc3RydW1lbnQuanNvblwiLFxuICAgICAgICBcIm1lYXN1cmVMZW5ndGhcIjogMzIsXG4gICAgICAgIFwiYnBtXCI6IDM3MyxcbiAgICAgICAgXCJkZXR1bmVcIjogLTIxMCxcbiAgICAgICAgXCJnYWluRW5hYmxlZFwiOiBcImdhaW5cIixcbiAgICAgICAgXCJpbml0R2FpblwiOiAwLjQsXG4gICAgICAgIFwibWF4R2FpblwiOiAwLjUsXG4gICAgICAgIFwiYXR0YWNrVGltZVwiOiAwLjQ3LFxuICAgICAgICBcInN1c3RhaW5UaW1lXCI6IDEuNyxcbiAgICAgICAgXCJyZWxlYXNlVGltZVwiOiAyLjgsXG4gICAgICAgIFwiZGVsYXlFbmFibGVkXCI6IFwiZGVsYXlcIixcbiAgICAgICAgXCJkZWxheVwiOiAwLjU2LFxuICAgICAgICBcImZpbHRlclwiOiA5NDUwLjNcbiAgICB9XG59IiwiZnVuY3Rpb24gdHJhY2tlclRhYmxlKCkge1xuXG4gICAgdGhpcy5zdHIgPSAnJztcbiAgICB0aGlzLmdldFRhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJzx0YWJsZSBpZD1cInRyYWNrZXItdGFibGVcIj4nICsgdGhpcy5zdHIgKyAnPC90YWJsZT4nO1xuICAgIH07XG5cbiAgICB0aGlzLnNldEhlYWRlciA9IGZ1bmN0aW9uIChudW1Sb3dzLCBkYXRhKSB7XG4gICAgICAgIHRoaXMuc3RyICs9IGA8dHIgY2xhc3M9XCJ0cmFja2VyLXJvdyBoZWFkZXJcIj5gO1xuICAgICAgICB0aGlzLnN0ciArPSB0aGlzLmdldENlbGxzKCdoZWFkZXInLCBudW1Sb3dzLCB7IGhlYWRlcjogdHJ1ZSB9KTtcbiAgICAgICAgdGhpcy5zdHIgKz0gYDwvdHI+YDtcblxuICAgIH07XG5cbiAgICB0aGlzLnNldFJvd3MgPSBmdW5jdGlvbiAobnVtUm93cywgbnVtQ29scywgZGF0YSkge1xuXG4gICAgICAgIHRoaXMuc2V0SGVhZGVyKG51bUNvbHMsIGRhdGEpO1xuICAgICAgICBmb3IgKGxldCByb3dJRCA9IDA7IHJvd0lEIDwgbnVtUm93czsgcm93SUQrKykge1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gYDx0ciBjbGFzcz1cInRyYWNrZXItcm93XCIgZGF0YS1pZD1cIiR7cm93SUR9XCI+YDtcbiAgICAgICAgICAgIHRoaXMuc3RyICs9IHRoaXMuZ2V0Q2VsbHMocm93SUQsIG51bUNvbHMsIGRhdGEpO1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gYDwvdHI+YDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldEZpcnN0Q2VsbCA9IGZ1bmN0aW9uIChyb3dJRCwgZGF0YSkge1xuICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgIFxuICAgICAgICBzdHIgKz0gYDx0ZCBjbGFzcz1cInRyYWNrZXItZmlyc3QtY2VsbFwiIGRhdGEtcm93LWlkPVwiJHtyb3dJRH1cIj5gO1xuICAgICAgICBpZiAoZGF0YS50aXRsZSkgeyBcbiAgICAgICAgICAgIHN0ciArPSBkYXRhLnRpdGxlW3Jvd0lEXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3RyICs9IGA8L3RkPmA7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0Q2VsbHMgPSBmdW5jdGlvbiAocm93SUQsIG51bVJvd3MsIGRhdGEpIHtcbiAgICAgICAgdmFyIHN0ciA9ICcnO1xuXG4gICAgICAgIHN0ciArPSB0aGlzLmdldEZpcnN0Q2VsbChyb3dJRCwgZGF0YSk7XG5cbiAgICAgICAgbGV0IGNzc0NsYXNzID0gJ3RyYWNrZXItY2VsbCdcblxuICAgICAgICBpZiAocm93SUQgPT0gJ2hlYWRlcicpIHtcbiAgICAgICAgICAgIGNzc0NsYXNzID0gJ3RyYWNrZXItY2VsbC1oZWFkZXInXG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IG51bVJvd3M7IGMrKykge1xuICAgICAgICAgICAgc3RyICs9IGA8dGQgY2xhc3M9XCIke2Nzc0NsYXNzfVwiIGRhdGEtcm93LWlkPVwiJHtyb3dJRH1cIiBkYXRhLWNvbC1pZD1cIiR7Y31cIj5gO1xuICAgICAgICAgICAgaWYgKGRhdGEuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGMgKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RyICs9IGA8L3RkPmA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYWNrZXJUYWJsZTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
