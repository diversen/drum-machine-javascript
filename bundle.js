(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function AdsrGainNode(ctx) {

    this.ctx = ctx;

    this.mode = 'exponentialRampToValueAtTime';
    // this.mode = 'linearRampToValueAtTime';

    this.options = {
        attackAmp: 0.1, 
        decayAmp: 0.3,
        sustainAmp: 0.7,
        releaseAmp: 0.01,
        attackTime: 0.1,
        decayTime: 0.2,
        sustainTime: 1.0, 
        releaseTime: 3.4,
        autoRelease: true
    };

    /**
     * Set options or use defaults
     * @param {object} options 
     */
    this.setOptions = function (options) {
        this.options = Object.assign(this.options, options);
    };

    this.gainNode
    this.audioTime
    
    /**
     * Get a gain node from defined options
     * @param {float} audioTime an audio context time stamp
     */
    this.getGainNode =  (audioTime) => {

        this.gainNode = this.ctx.createGain();
        this.audioTime = audioTime

        // Firefox does not like 0 -> therefor 0.0000001
        this.gainNode.gain.setValueAtTime(0.0000001, audioTime)        
        
        // Attack
        this.gainNode.gain[this.mode](
            this.options.attackAmp, 
            audioTime + this.options.attackTime)

        // Decay
        this.gainNode.gain[this.mode](
            this.options.decayAmp, 
            audioTime + this.options.attackTime + this.options.decayTime)

        // Sustain
        this.gainNode.gain[this.mode](
            this.options.sustainAmp, 
            audioTime + this.options.attackTime + this.options.sustainTime)
 
        // Check if auto-release
        // Then calculate when note should stop
        if (this.options.autoRelease) {
            this.gainNode.gain[this.mode](
                this.options.releaseAmp,
                audioTime + this.releaseTime()
            )
            
            // Disconnect the gain node 
            this.disconnect(audioTime + this.releaseTime())
        }
        return this.gainNode;
    };

    /**
     * Release the note dynamicaly
     * E.g. if your are making a keyboard, and you want the note
     * to be released according to current audio time + the ADSR release time 
     */
    this.releaseNow = () => {
        this.gainNode.gain[this.mode](
            this.options.releaseAmp,
            this.ctx.currentTime + this.options.releaseTime) 
        this.disconnect(this.options.releaseTime)
    }

    /**
     * Get release time according to the adsr release time
     */
    this.releaseTime = function() {
        return this.options.attackTime + this.options.decayTime + this.options.sustainTime + this.options.releaseTime
    }

    /**
     * Get release time according to 'now'
     */
    this.releaseTimeNow = function () {
        return this.ctx.currentTime + this.releaseTime()
    }
    
    /**
     * 
     * @param {float} disconnectTime the time when gainNode should disconnect 
     */
    this.disconnect = (disconnectTime) => {
        setTimeout( () => {
            this.gainNode.disconnect();
        },
        disconnectTime * 1000);
    };
}

module.exports = AdsrGainNode;

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
                if (elem.value !== undefined) {
                    formParams[elem.name] = elem.value;
                }
        }
    }
    return formParams;
}

function setFormValues(formElement, values) {
    var formElements = formElement.elements;
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
                if (values[elem.name] !== undefined) {
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
var WAAClock = require('./lib/WAAClock')

module.exports = WAAClock
if (typeof window !== 'undefined') window.WAAClock = WAAClock

},{"./lib/WAAClock":12}],12:[function(require,module,exports){
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

},{"_process":18}],13:[function(require,module,exports){
// require("babel-polyfill"); 
const loadSampleSet = require('load-sample-set');
const selectElement = require('select-element');
const getSetFormValues = require('get-set-form-values');
const adsrGainNode = require('adsr-gain-node');
const simpleTracker = require('./simple-tracker');
const FileSaver = require('file-saver');

const getSetControls = require('./get-set-controls');
const getSetAudioOptions = new getSetControls();

const ctx = new AudioContext();
const defaultTrack = require('./default-track');

var buffers;
var currentSampleData;
var storage;

function debug (v) {
    console.log(v)
} 

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

    debug (defaultTrack.settings)
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
        // node = routeCompressor(node);
        node.connect(ctx.destination);
        source.start(triggerTime);

    }


    function routeGain (source) {
        let gain = new adsrGainNode(ctx);
        gain.mode = 'linearRampToValueAtTime';
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

},{"./default-track":14,"./get-set-controls":15,"./simple-tracker":16,"adsr-gain-node":1,"file-saver":3,"get-set-form-values":5,"load-sample-set":7,"select-element":10}],14:[function(require,module,exports){
module.exports = {"beat":[{"rowId":"0","colId":"0","enabled":false},{"rowId":"0","colId":"1","enabled":false},{"rowId":"0","colId":"2","enabled":false},{"rowId":"0","colId":"3","enabled":false},{"rowId":"0","colId":"4","enabled":false},{"rowId":"0","colId":"5","enabled":false},{"rowId":"0","colId":"6","enabled":false},{"rowId":"0","colId":"7","enabled":false},{"rowId":"0","colId":"8","enabled":false},{"rowId":"0","colId":"9","enabled":false},{"rowId":"0","colId":"10","enabled":false},{"rowId":"0","colId":"11","enabled":false},{"rowId":"0","colId":"12","enabled":false},{"rowId":"0","colId":"13","enabled":false},{"rowId":"0","colId":"14","enabled":false},{"rowId":"0","colId":"15","enabled":false},{"rowId":"0","colId":"16","enabled":false},{"rowId":"0","colId":"17","enabled":false},{"rowId":"0","colId":"18","enabled":false},{"rowId":"0","colId":"19","enabled":false},{"rowId":"0","colId":"20","enabled":false},{"rowId":"0","colId":"21","enabled":false},{"rowId":"0","colId":"22","enabled":false},{"rowId":"0","colId":"23","enabled":false},{"rowId":"0","colId":"24","enabled":false},{"rowId":"0","colId":"25","enabled":false},{"rowId":"0","colId":"26","enabled":false},{"rowId":"0","colId":"27","enabled":false},{"rowId":"0","colId":"28","enabled":false},{"rowId":"0","colId":"29","enabled":false},{"rowId":"0","colId":"30","enabled":false},{"rowId":"0","colId":"31","enabled":false},{"rowId":"1","colId":"0","enabled":false},{"rowId":"1","colId":"1","enabled":false},{"rowId":"1","colId":"2","enabled":false},{"rowId":"1","colId":"3","enabled":false},{"rowId":"1","colId":"4","enabled":false},{"rowId":"1","colId":"5","enabled":false},{"rowId":"1","colId":"6","enabled":false},{"rowId":"1","colId":"7","enabled":false},{"rowId":"1","colId":"8","enabled":false},{"rowId":"1","colId":"9","enabled":false},{"rowId":"1","colId":"10","enabled":false},{"rowId":"1","colId":"11","enabled":false},{"rowId":"1","colId":"12","enabled":false},{"rowId":"1","colId":"13","enabled":false},{"rowId":"1","colId":"14","enabled":false},{"rowId":"1","colId":"15","enabled":false},{"rowId":"1","colId":"16","enabled":false},{"rowId":"1","colId":"17","enabled":false},{"rowId":"1","colId":"18","enabled":false},{"rowId":"1","colId":"19","enabled":false},{"rowId":"1","colId":"20","enabled":false},{"rowId":"1","colId":"21","enabled":false},{"rowId":"1","colId":"22","enabled":false},{"rowId":"1","colId":"23","enabled":false},{"rowId":"1","colId":"24","enabled":false},{"rowId":"1","colId":"25","enabled":false},{"rowId":"1","colId":"26","enabled":false},{"rowId":"1","colId":"27","enabled":false},{"rowId":"1","colId":"28","enabled":false},{"rowId":"1","colId":"29","enabled":false},{"rowId":"1","colId":"30","enabled":false},{"rowId":"1","colId":"31","enabled":false},{"rowId":"2","colId":"0","enabled":false},{"rowId":"2","colId":"1","enabled":false},{"rowId":"2","colId":"2","enabled":false},{"rowId":"2","colId":"3","enabled":false},{"rowId":"2","colId":"4","enabled":true},{"rowId":"2","colId":"5","enabled":false},{"rowId":"2","colId":"6","enabled":false},{"rowId":"2","colId":"7","enabled":false},{"rowId":"2","colId":"8","enabled":false},{"rowId":"2","colId":"9","enabled":false},{"rowId":"2","colId":"10","enabled":false},{"rowId":"2","colId":"11","enabled":false},{"rowId":"2","colId":"12","enabled":false},{"rowId":"2","colId":"13","enabled":false},{"rowId":"2","colId":"14","enabled":false},{"rowId":"2","colId":"15","enabled":false},{"rowId":"2","colId":"16","enabled":false},{"rowId":"2","colId":"17","enabled":false},{"rowId":"2","colId":"18","enabled":false},{"rowId":"2","colId":"19","enabled":false},{"rowId":"2","colId":"20","enabled":false},{"rowId":"2","colId":"21","enabled":false},{"rowId":"2","colId":"22","enabled":false},{"rowId":"2","colId":"23","enabled":true},{"rowId":"2","colId":"24","enabled":false},{"rowId":"2","colId":"25","enabled":false},{"rowId":"2","colId":"26","enabled":false},{"rowId":"2","colId":"27","enabled":false},{"rowId":"2","colId":"28","enabled":false},{"rowId":"2","colId":"29","enabled":false},{"rowId":"2","colId":"30","enabled":false},{"rowId":"2","colId":"31","enabled":false},{"rowId":"3","colId":"0","enabled":false},{"rowId":"3","colId":"1","enabled":true},{"rowId":"3","colId":"2","enabled":false},{"rowId":"3","colId":"3","enabled":false},{"rowId":"3","colId":"4","enabled":false},{"rowId":"3","colId":"5","enabled":false},{"rowId":"3","colId":"6","enabled":true},{"rowId":"3","colId":"7","enabled":false},{"rowId":"3","colId":"8","enabled":false},{"rowId":"3","colId":"9","enabled":false},{"rowId":"3","colId":"10","enabled":false},{"rowId":"3","colId":"11","enabled":false},{"rowId":"3","colId":"12","enabled":false},{"rowId":"3","colId":"13","enabled":false},{"rowId":"3","colId":"14","enabled":false},{"rowId":"3","colId":"15","enabled":false},{"rowId":"3","colId":"16","enabled":false},{"rowId":"3","colId":"17","enabled":true},{"rowId":"3","colId":"18","enabled":false},{"rowId":"3","colId":"19","enabled":false},{"rowId":"3","colId":"20","enabled":false},{"rowId":"3","colId":"21","enabled":false},{"rowId":"3","colId":"22","enabled":false},{"rowId":"3","colId":"23","enabled":false},{"rowId":"3","colId":"24","enabled":false},{"rowId":"3","colId":"25","enabled":false},{"rowId":"3","colId":"26","enabled":false},{"rowId":"3","colId":"27","enabled":false},{"rowId":"3","colId":"28","enabled":false},{"rowId":"3","colId":"29","enabled":false},{"rowId":"3","colId":"30","enabled":false},{"rowId":"3","colId":"31","enabled":false},{"rowId":"4","colId":"0","enabled":true},{"rowId":"4","colId":"1","enabled":false},{"rowId":"4","colId":"2","enabled":true},{"rowId":"4","colId":"3","enabled":false},{"rowId":"4","colId":"4","enabled":false},{"rowId":"4","colId":"5","enabled":false},{"rowId":"4","colId":"6","enabled":false},{"rowId":"4","colId":"7","enabled":false},{"rowId":"4","colId":"8","enabled":false},{"rowId":"4","colId":"9","enabled":false},{"rowId":"4","colId":"10","enabled":false},{"rowId":"4","colId":"11","enabled":false},{"rowId":"4","colId":"12","enabled":true},{"rowId":"4","colId":"13","enabled":false},{"rowId":"4","colId":"14","enabled":true},{"rowId":"4","colId":"15","enabled":false},{"rowId":"4","colId":"16","enabled":false},{"rowId":"4","colId":"17","enabled":false},{"rowId":"4","colId":"18","enabled":false},{"rowId":"4","colId":"19","enabled":false},{"rowId":"4","colId":"20","enabled":false},{"rowId":"4","colId":"21","enabled":true},{"rowId":"4","colId":"22","enabled":false},{"rowId":"4","colId":"23","enabled":false},{"rowId":"4","colId":"24","enabled":false},{"rowId":"4","colId":"25","enabled":true},{"rowId":"4","colId":"26","enabled":false},{"rowId":"4","colId":"27","enabled":false},{"rowId":"4","colId":"28","enabled":false},{"rowId":"4","colId":"29","enabled":false},{"rowId":"4","colId":"30","enabled":false},{"rowId":"4","colId":"31","enabled":false},{"rowId":"5","colId":"0","enabled":false},{"rowId":"5","colId":"1","enabled":false},{"rowId":"5","colId":"2","enabled":false},{"rowId":"5","colId":"3","enabled":false},{"rowId":"5","colId":"4","enabled":true},{"rowId":"5","colId":"5","enabled":false},{"rowId":"5","colId":"6","enabled":false},{"rowId":"5","colId":"7","enabled":true},{"rowId":"5","colId":"8","enabled":false},{"rowId":"5","colId":"9","enabled":false},{"rowId":"5","colId":"10","enabled":false},{"rowId":"5","colId":"11","enabled":true},{"rowId":"5","colId":"12","enabled":false},{"rowId":"5","colId":"13","enabled":false},{"rowId":"5","colId":"14","enabled":false},{"rowId":"5","colId":"15","enabled":true},{"rowId":"5","colId":"16","enabled":false},{"rowId":"5","colId":"17","enabled":false},{"rowId":"5","colId":"18","enabled":false},{"rowId":"5","colId":"19","enabled":true},{"rowId":"5","colId":"20","enabled":false},{"rowId":"5","colId":"21","enabled":false},{"rowId":"5","colId":"22","enabled":false},{"rowId":"5","colId":"23","enabled":false},{"rowId":"5","colId":"24","enabled":false},{"rowId":"5","colId":"25","enabled":false},{"rowId":"5","colId":"26","enabled":false},{"rowId":"5","colId":"27","enabled":false},{"rowId":"5","colId":"28","enabled":false},{"rowId":"5","colId":"29","enabled":false},{"rowId":"5","colId":"30","enabled":false},{"rowId":"5","colId":"31","enabled":false},{"rowId":"6","colId":"0","enabled":false},{"rowId":"6","colId":"1","enabled":false},{"rowId":"6","colId":"2","enabled":false},{"rowId":"6","colId":"3","enabled":false},{"rowId":"6","colId":"4","enabled":false},{"rowId":"6","colId":"5","enabled":false},{"rowId":"6","colId":"6","enabled":false},{"rowId":"6","colId":"7","enabled":false},{"rowId":"6","colId":"8","enabled":false},{"rowId":"6","colId":"9","enabled":false},{"rowId":"6","colId":"10","enabled":false},{"rowId":"6","colId":"11","enabled":false},{"rowId":"6","colId":"12","enabled":false},{"rowId":"6","colId":"13","enabled":false},{"rowId":"6","colId":"14","enabled":false},{"rowId":"6","colId":"15","enabled":false},{"rowId":"6","colId":"16","enabled":false},{"rowId":"6","colId":"17","enabled":false},{"rowId":"6","colId":"18","enabled":false},{"rowId":"6","colId":"19","enabled":false},{"rowId":"6","colId":"20","enabled":false},{"rowId":"6","colId":"21","enabled":false},{"rowId":"6","colId":"22","enabled":false},{"rowId":"6","colId":"23","enabled":false},{"rowId":"6","colId":"24","enabled":false},{"rowId":"6","colId":"25","enabled":false},{"rowId":"6","colId":"26","enabled":false},{"rowId":"6","colId":"27","enabled":true},{"rowId":"6","colId":"28","enabled":false},{"rowId":"6","colId":"29","enabled":false},{"rowId":"6","colId":"30","enabled":false},{"rowId":"6","colId":"31","enabled":true},{"rowId":"7","colId":"0","enabled":false},{"rowId":"7","colId":"1","enabled":false},{"rowId":"7","colId":"2","enabled":false},{"rowId":"7","colId":"3","enabled":false},{"rowId":"7","colId":"4","enabled":false},{"rowId":"7","colId":"5","enabled":false},{"rowId":"7","colId":"6","enabled":false},{"rowId":"7","colId":"7","enabled":false},{"rowId":"7","colId":"8","enabled":false},{"rowId":"7","colId":"9","enabled":true},{"rowId":"7","colId":"10","enabled":false},{"rowId":"7","colId":"11","enabled":false},{"rowId":"7","colId":"12","enabled":false},{"rowId":"7","colId":"13","enabled":false},{"rowId":"7","colId":"14","enabled":false},{"rowId":"7","colId":"15","enabled":false},{"rowId":"7","colId":"16","enabled":false},{"rowId":"7","colId":"17","enabled":false},{"rowId":"7","colId":"18","enabled":false},{"rowId":"7","colId":"19","enabled":false},{"rowId":"7","colId":"20","enabled":false},{"rowId":"7","colId":"21","enabled":false},{"rowId":"7","colId":"22","enabled":false},{"rowId":"7","colId":"23","enabled":false},{"rowId":"7","colId":"24","enabled":false},{"rowId":"7","colId":"25","enabled":false},{"rowId":"7","colId":"26","enabled":false},{"rowId":"7","colId":"27","enabled":false},{"rowId":"7","colId":"28","enabled":false},{"rowId":"7","colId":"29","enabled":false},{"rowId":"7","colId":"30","enabled":false},{"rowId":"7","colId":"31","enabled":false},{"rowId":"8","colId":"0","enabled":false},{"rowId":"8","colId":"1","enabled":false},{"rowId":"8","colId":"2","enabled":false},{"rowId":"8","colId":"3","enabled":false},{"rowId":"8","colId":"4","enabled":false},{"rowId":"8","colId":"5","enabled":false},{"rowId":"8","colId":"6","enabled":false},{"rowId":"8","colId":"7","enabled":false},{"rowId":"8","colId":"8","enabled":false},{"rowId":"8","colId":"9","enabled":false},{"rowId":"8","colId":"10","enabled":false},{"rowId":"8","colId":"11","enabled":false},{"rowId":"8","colId":"12","enabled":false},{"rowId":"8","colId":"13","enabled":false},{"rowId":"8","colId":"14","enabled":false},{"rowId":"8","colId":"15","enabled":false},{"rowId":"8","colId":"16","enabled":false},{"rowId":"8","colId":"17","enabled":false},{"rowId":"8","colId":"18","enabled":false},{"rowId":"8","colId":"19","enabled":false},{"rowId":"8","colId":"20","enabled":false},{"rowId":"8","colId":"21","enabled":false},{"rowId":"8","colId":"22","enabled":false},{"rowId":"8","colId":"23","enabled":false},{"rowId":"8","colId":"24","enabled":false},{"rowId":"8","colId":"25","enabled":false},{"rowId":"8","colId":"26","enabled":false},{"rowId":"8","colId":"27","enabled":false},{"rowId":"8","colId":"28","enabled":false},{"rowId":"8","colId":"29","enabled":true},{"rowId":"8","colId":"30","enabled":false},{"rowId":"8","colId":"31","enabled":false},{"rowId":"9","colId":"0","enabled":false},{"rowId":"9","colId":"1","enabled":false},{"rowId":"9","colId":"2","enabled":false},{"rowId":"9","colId":"3","enabled":false},{"rowId":"9","colId":"4","enabled":false},{"rowId":"9","colId":"5","enabled":false},{"rowId":"9","colId":"6","enabled":false},{"rowId":"9","colId":"7","enabled":false},{"rowId":"9","colId":"8","enabled":false},{"rowId":"9","colId":"9","enabled":false},{"rowId":"9","colId":"10","enabled":false},{"rowId":"9","colId":"11","enabled":false},{"rowId":"9","colId":"12","enabled":false},{"rowId":"9","colId":"13","enabled":false},{"rowId":"9","colId":"14","enabled":false},{"rowId":"9","colId":"15","enabled":false},{"rowId":"9","colId":"16","enabled":false},{"rowId":"9","colId":"17","enabled":false},{"rowId":"9","colId":"18","enabled":false},{"rowId":"9","colId":"19","enabled":false},{"rowId":"9","colId":"20","enabled":false},{"rowId":"9","colId":"21","enabled":false},{"rowId":"9","colId":"22","enabled":false},{"rowId":"9","colId":"23","enabled":false},{"rowId":"9","colId":"24","enabled":false},{"rowId":"9","colId":"25","enabled":false},{"rowId":"9","colId":"26","enabled":false},{"rowId":"9","colId":"27","enabled":false},{"rowId":"9","colId":"28","enabled":false},{"rowId":"9","colId":"29","enabled":false},{"rowId":"9","colId":"30","enabled":false},{"rowId":"9","colId":"31","enabled":false},{"rowId":"10","colId":"0","enabled":false},{"rowId":"10","colId":"1","enabled":false},{"rowId":"10","colId":"2","enabled":false},{"rowId":"10","colId":"3","enabled":false},{"rowId":"10","colId":"4","enabled":false},{"rowId":"10","colId":"5","enabled":false},{"rowId":"10","colId":"6","enabled":false},{"rowId":"10","colId":"7","enabled":false},{"rowId":"10","colId":"8","enabled":false},{"rowId":"10","colId":"9","enabled":false},{"rowId":"10","colId":"10","enabled":false},{"rowId":"10","colId":"11","enabled":false},{"rowId":"10","colId":"12","enabled":false},{"rowId":"10","colId":"13","enabled":false},{"rowId":"10","colId":"14","enabled":false},{"rowId":"10","colId":"15","enabled":false},{"rowId":"10","colId":"16","enabled":false},{"rowId":"10","colId":"17","enabled":false},{"rowId":"10","colId":"18","enabled":false},{"rowId":"10","colId":"19","enabled":false},{"rowId":"10","colId":"20","enabled":false},{"rowId":"10","colId":"21","enabled":false},{"rowId":"10","colId":"22","enabled":false},{"rowId":"10","colId":"23","enabled":false},{"rowId":"10","colId":"24","enabled":false},{"rowId":"10","colId":"25","enabled":false},{"rowId":"10","colId":"26","enabled":false},{"rowId":"10","colId":"27","enabled":false},{"rowId":"10","colId":"28","enabled":false},{"rowId":"10","colId":"29","enabled":false},{"rowId":"10","colId":"30","enabled":false},{"rowId":"10","colId":"31","enabled":false},{"rowId":"11","colId":"0","enabled":false},{"rowId":"11","colId":"1","enabled":false},{"rowId":"11","colId":"2","enabled":false},{"rowId":"11","colId":"3","enabled":false},{"rowId":"11","colId":"4","enabled":false},{"rowId":"11","colId":"5","enabled":false},{"rowId":"11","colId":"6","enabled":false},{"rowId":"11","colId":"7","enabled":false},{"rowId":"11","colId":"8","enabled":false},{"rowId":"11","colId":"9","enabled":false},{"rowId":"11","colId":"10","enabled":false},{"rowId":"11","colId":"11","enabled":false},{"rowId":"11","colId":"12","enabled":false},{"rowId":"11","colId":"13","enabled":false},{"rowId":"11","colId":"14","enabled":false},{"rowId":"11","colId":"15","enabled":false},{"rowId":"11","colId":"16","enabled":false},{"rowId":"11","colId":"17","enabled":false},{"rowId":"11","colId":"18","enabled":false},{"rowId":"11","colId":"19","enabled":false},{"rowId":"11","colId":"20","enabled":false},{"rowId":"11","colId":"21","enabled":false},{"rowId":"11","colId":"22","enabled":false},{"rowId":"11","colId":"23","enabled":false},{"rowId":"11","colId":"24","enabled":false},{"rowId":"11","colId":"25","enabled":false},{"rowId":"11","colId":"26","enabled":false},{"rowId":"11","colId":"27","enabled":false},{"rowId":"11","colId":"28","enabled":false},{"rowId":"11","colId":"29","enabled":false},{"rowId":"11","colId":"30","enabled":false},{"rowId":"11","colId":"31","enabled":false},{"rowId":"12","colId":"0","enabled":false},{"rowId":"12","colId":"1","enabled":false},{"rowId":"12","colId":"2","enabled":false},{"rowId":"12","colId":"3","enabled":false},{"rowId":"12","colId":"4","enabled":false},{"rowId":"12","colId":"5","enabled":false},{"rowId":"12","colId":"6","enabled":false},{"rowId":"12","colId":"7","enabled":false},{"rowId":"12","colId":"8","enabled":false},{"rowId":"12","colId":"9","enabled":false},{"rowId":"12","colId":"10","enabled":false},{"rowId":"12","colId":"11","enabled":false},{"rowId":"12","colId":"12","enabled":false},{"rowId":"12","colId":"13","enabled":false},{"rowId":"12","colId":"14","enabled":false},{"rowId":"12","colId":"15","enabled":false},{"rowId":"12","colId":"16","enabled":false},{"rowId":"12","colId":"17","enabled":false},{"rowId":"12","colId":"18","enabled":false},{"rowId":"12","colId":"19","enabled":false},{"rowId":"12","colId":"20","enabled":false},{"rowId":"12","colId":"21","enabled":false},{"rowId":"12","colId":"22","enabled":false},{"rowId":"12","colId":"23","enabled":true},{"rowId":"12","colId":"24","enabled":false},{"rowId":"12","colId":"25","enabled":true},{"rowId":"12","colId":"26","enabled":false},{"rowId":"12","colId":"27","enabled":false},{"rowId":"12","colId":"28","enabled":false},{"rowId":"12","colId":"29","enabled":false},{"rowId":"12","colId":"30","enabled":false},{"rowId":"12","colId":"31","enabled":false},{"rowId":"13","colId":"0","enabled":false},{"rowId":"13","colId":"1","enabled":false},{"rowId":"13","colId":"2","enabled":false},{"rowId":"13","colId":"3","enabled":false},{"rowId":"13","colId":"4","enabled":false},{"rowId":"13","colId":"5","enabled":false},{"rowId":"13","colId":"6","enabled":false},{"rowId":"13","colId":"7","enabled":false},{"rowId":"13","colId":"8","enabled":false},{"rowId":"13","colId":"9","enabled":false},{"rowId":"13","colId":"10","enabled":false},{"rowId":"13","colId":"11","enabled":false},{"rowId":"13","colId":"12","enabled":false},{"rowId":"13","colId":"13","enabled":false},{"rowId":"13","colId":"14","enabled":false},{"rowId":"13","colId":"15","enabled":false},{"rowId":"13","colId":"16","enabled":false},{"rowId":"13","colId":"17","enabled":false},{"rowId":"13","colId":"18","enabled":false},{"rowId":"13","colId":"19","enabled":false},{"rowId":"13","colId":"20","enabled":false},{"rowId":"13","colId":"21","enabled":false},{"rowId":"13","colId":"22","enabled":false},{"rowId":"13","colId":"23","enabled":false},{"rowId":"13","colId":"24","enabled":true},{"rowId":"13","colId":"25","enabled":false},{"rowId":"13","colId":"26","enabled":false},{"rowId":"13","colId":"27","enabled":false},{"rowId":"13","colId":"28","enabled":true},{"rowId":"13","colId":"29","enabled":false},{"rowId":"13","colId":"30","enabled":false},{"rowId":"13","colId":"31","enabled":false},{"rowId":"14","colId":"0","enabled":false},{"rowId":"14","colId":"1","enabled":false},{"rowId":"14","colId":"2","enabled":false},{"rowId":"14","colId":"3","enabled":false},{"rowId":"14","colId":"4","enabled":false},{"rowId":"14","colId":"5","enabled":false},{"rowId":"14","colId":"6","enabled":false},{"rowId":"14","colId":"7","enabled":false},{"rowId":"14","colId":"8","enabled":false},{"rowId":"14","colId":"9","enabled":false},{"rowId":"14","colId":"10","enabled":false},{"rowId":"14","colId":"11","enabled":false},{"rowId":"14","colId":"12","enabled":false},{"rowId":"14","colId":"13","enabled":false},{"rowId":"14","colId":"14","enabled":false},{"rowId":"14","colId":"15","enabled":false},{"rowId":"14","colId":"16","enabled":false},{"rowId":"14","colId":"17","enabled":false},{"rowId":"14","colId":"18","enabled":false},{"rowId":"14","colId":"19","enabled":false},{"rowId":"14","colId":"20","enabled":false},{"rowId":"14","colId":"21","enabled":false},{"rowId":"14","colId":"22","enabled":false},{"rowId":"14","colId":"23","enabled":false},{"rowId":"14","colId":"24","enabled":false},{"rowId":"14","colId":"25","enabled":false},{"rowId":"14","colId":"26","enabled":true},{"rowId":"14","colId":"27","enabled":false},{"rowId":"14","colId":"28","enabled":false},{"rowId":"14","colId":"29","enabled":false},{"rowId":"14","colId":"30","enabled":false},{"rowId":"14","colId":"31","enabled":false}],"settings":{"sampleSet":"https://raw.githubusercontent.com/oramics/sampled/master/DRUMS/pearl-master-studio/sampled.instrument.json","measureLength":32,"bpm":460,"detune":0,"gainEnabled":"gain","attackAmp":0,"sustainAmp":0.4,"decayAmp":0.7,"releaseAmp":1,"attackTime":0,"decayTime":0,"sustainTime":2,"releaseTime":2,"adsrInterval":0.1,"delay":0.01,"filter":1000}}
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
},{"./tracker-table":17,"has-class":6,"waaclock":11}],17:[function(require,module,exports){
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

},{}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvZ2V0LWpzb24tcHJvbWlzZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nZXQtc2V0LWZvcm0tdmFsdWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2hhcy1jbGFzcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2FkLXNhbXBsZS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9hZC1zYW1wbGUtc2V0L25vZGVfbW9kdWxlcy90aW55LXNhbXBsZS1sb2FkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqLXR5cGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc2VsZWN0LWVsZW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svbGliL1dBQUNsb2NrLmpzIiwic3JjL2FwcC5qcyIsInNyYy9kZWZhdWx0LXRyYWNrLmpzIiwic3JjL2dldC1zZXQtY29udHJvbHMuanMiLCJzcmMvc2ltcGxlLXRyYWNrZXIuanMiLCJzcmMvdHJhY2tlci10YWJsZS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDek9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVWQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ROQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZnVuY3Rpb24gQWRzckdhaW5Ob2RlKGN0eCkge1xuXG4gICAgdGhpcy5jdHggPSBjdHg7XG5cbiAgICB0aGlzLm1vZGUgPSAnZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSc7XG4gICAgLy8gdGhpcy5tb2RlID0gJ2xpbmVhclJhbXBUb1ZhbHVlQXRUaW1lJztcblxuICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgICAgYXR0YWNrQW1wOiAwLjEsIFxuICAgICAgICBkZWNheUFtcDogMC4zLFxuICAgICAgICBzdXN0YWluQW1wOiAwLjcsXG4gICAgICAgIHJlbGVhc2VBbXA6IDAuMDEsXG4gICAgICAgIGF0dGFja1RpbWU6IDAuMSxcbiAgICAgICAgZGVjYXlUaW1lOiAwLjIsXG4gICAgICAgIHN1c3RhaW5UaW1lOiAxLjAsIFxuICAgICAgICByZWxlYXNlVGltZTogMy40LFxuICAgICAgICBhdXRvUmVsZWFzZTogdHJ1ZVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTZXQgb3B0aW9ucyBvciB1c2UgZGVmYXVsdHNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBcbiAgICAgKi9cbiAgICB0aGlzLnNldE9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICB0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHRoaXMub3B0aW9ucywgb3B0aW9ucyk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2Fpbk5vZGVcbiAgICB0aGlzLmF1ZGlvVGltZVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBhIGdhaW4gbm9kZSBmcm9tIGRlZmluZWQgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7ZmxvYXR9IGF1ZGlvVGltZSBhbiBhdWRpbyBjb250ZXh0IHRpbWUgc3RhbXBcbiAgICAgKi9cbiAgICB0aGlzLmdldEdhaW5Ob2RlID0gIChhdWRpb1RpbWUpID0+IHtcblxuICAgICAgICB0aGlzLmdhaW5Ob2RlID0gdGhpcy5jdHguY3JlYXRlR2FpbigpO1xuICAgICAgICB0aGlzLmF1ZGlvVGltZSA9IGF1ZGlvVGltZVxuXG4gICAgICAgIC8vIEZpcmVmb3ggZG9lcyBub3QgbGlrZSAwIC0+IHRoZXJlZm9yIDAuMDAwMDAwMVxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4uc2V0VmFsdWVBdFRpbWUoMC4wMDAwMDAxLCBhdWRpb1RpbWUpICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIEF0dGFja1xuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW5bdGhpcy5tb2RlXShcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hdHRhY2tBbXAsIFxuICAgICAgICAgICAgYXVkaW9UaW1lICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUpXG5cbiAgICAgICAgLy8gRGVjYXlcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluW3RoaXMubW9kZV0oXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMuZGVjYXlBbXAsIFxuICAgICAgICAgICAgYXVkaW9UaW1lICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuZGVjYXlUaW1lKVxuXG4gICAgICAgIC8vIFN1c3RhaW5cbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluW3RoaXMubW9kZV0oXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMuc3VzdGFpbkFtcCwgXG4gICAgICAgICAgICBhdWRpb1RpbWUgKyB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSArIHRoaXMub3B0aW9ucy5zdXN0YWluVGltZSlcbiBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYXV0by1yZWxlYXNlXG4gICAgICAgIC8vIFRoZW4gY2FsY3VsYXRlIHdoZW4gbm90ZSBzaG91bGQgc3RvcFxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9SZWxlYXNlKSB7XG4gICAgICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW5bdGhpcy5tb2RlXShcbiAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMucmVsZWFzZUFtcCxcbiAgICAgICAgICAgICAgICBhdWRpb1RpbWUgKyB0aGlzLnJlbGVhc2VUaW1lKClcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGlzY29ubmVjdCB0aGUgZ2FpbiBub2RlIFxuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0KGF1ZGlvVGltZSArIHRoaXMucmVsZWFzZVRpbWUoKSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5nYWluTm9kZTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVsZWFzZSB0aGUgbm90ZSBkeW5hbWljYWx5XG4gICAgICogRS5nLiBpZiB5b3VyIGFyZSBtYWtpbmcgYSBrZXlib2FyZCwgYW5kIHlvdSB3YW50IHRoZSBub3RlXG4gICAgICogdG8gYmUgcmVsZWFzZWQgYWNjb3JkaW5nIHRvIGN1cnJlbnQgYXVkaW8gdGltZSArIHRoZSBBRFNSIHJlbGVhc2UgdGltZSBcbiAgICAgKi9cbiAgICB0aGlzLnJlbGVhc2VOb3cgPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpblt0aGlzLm1vZGVdKFxuICAgICAgICAgICAgdGhpcy5vcHRpb25zLnJlbGVhc2VBbXAsXG4gICAgICAgICAgICB0aGlzLmN0eC5jdXJyZW50VGltZSArIHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZSkgXG4gICAgICAgIHRoaXMuZGlzY29ubmVjdCh0aGlzLm9wdGlvbnMucmVsZWFzZVRpbWUpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlbGVhc2UgdGltZSBhY2NvcmRpbmcgdG8gdGhlIGFkc3IgcmVsZWFzZSB0aW1lXG4gICAgICovXG4gICAgdGhpcy5yZWxlYXNlVGltZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuZGVjYXlUaW1lICsgdGhpcy5vcHRpb25zLnN1c3RhaW5UaW1lICsgdGhpcy5vcHRpb25zLnJlbGVhc2VUaW1lXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlbGVhc2UgdGltZSBhY2NvcmRpbmcgdG8gJ25vdydcbiAgICAgKi9cbiAgICB0aGlzLnJlbGVhc2VUaW1lTm93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jdHguY3VycmVudFRpbWUgKyB0aGlzLnJlbGVhc2VUaW1lKClcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmbG9hdH0gZGlzY29ubmVjdFRpbWUgdGhlIHRpbWUgd2hlbiBnYWluTm9kZSBzaG91bGQgZGlzY29ubmVjdCBcbiAgICAgKi9cbiAgICB0aGlzLmRpc2Nvbm5lY3QgPSAoZGlzY29ubmVjdFRpbWUpID0+IHtcbiAgICAgICAgc2V0VGltZW91dCggKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5nYWluTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIGRpc2Nvbm5lY3RUaW1lICogMTAwMCk7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBZHNyR2Fpbk5vZGU7XG4iLCIvLyBGcm9tOiBodHRwczovL2Rldi5vcGVyYS5jb20vYXJ0aWNsZXMvZHJ1bS1zb3VuZHMtd2ViYXVkaW8vXG5mdW5jdGlvbiBhdWRpb0J1ZmZlckluc3RydW1lbnQoY29udGV4dCwgYnVmZmVyKSB7XG4gICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLmJ1ZmZlciA9IGJ1ZmZlcjtcbn1cblxuYXVkaW9CdWZmZXJJbnN0cnVtZW50LnByb3RvdHlwZS5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICB0aGlzLnNvdXJjZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG59O1xuXG5hdWRpb0J1ZmZlckluc3RydW1lbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICByZXR1cm4gdGhpcy5zb3VyY2U7XG59O1xuXG5hdWRpb0J1ZmZlckluc3RydW1lbnQucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbiAodGltZSkge1xuICAgIHRoaXMuc2V0dXAoKTtcbiAgICB0aGlzLnNvdXJjZS5zdGFydCh0aW1lKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYXVkaW9CdWZmZXJJbnN0cnVtZW50OyIsIi8qIEZpbGVTYXZlci5qc1xuICogQSBzYXZlQXMoKSBGaWxlU2F2ZXIgaW1wbGVtZW50YXRpb24uXG4gKiAxLjMuMlxuICogMjAxNi0wNi0xNiAxODoyNToxOVxuICpcbiAqIEJ5IEVsaSBHcmV5LCBodHRwOi8vZWxpZ3JleS5jb21cbiAqIExpY2Vuc2U6IE1JVFxuICogICBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2VsaWdyZXkvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWRcbiAqL1xuXG4vKmdsb2JhbCBzZWxmICovXG4vKmpzbGludCBiaXR3aXNlOiB0cnVlLCBpbmRlbnQ6IDQsIGxheGJyZWFrOiB0cnVlLCBsYXhjb21tYTogdHJ1ZSwgc21hcnR0YWJzOiB0cnVlLCBwbHVzcGx1czogdHJ1ZSAqL1xuXG4vKiEgQHNvdXJjZSBodHRwOi8vcHVybC5lbGlncmV5LmNvbS9naXRodWIvRmlsZVNhdmVyLmpzL2Jsb2IvbWFzdGVyL0ZpbGVTYXZlci5qcyAqL1xuXG52YXIgc2F2ZUFzID0gc2F2ZUFzIHx8IChmdW5jdGlvbih2aWV3KSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXHQvLyBJRSA8MTAgaXMgZXhwbGljaXRseSB1bnN1cHBvcnRlZFxuXHRpZiAodHlwZW9mIHZpZXcgPT09IFwidW5kZWZpbmVkXCIgfHwgdHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIiAmJiAvTVNJRSBbMS05XVxcLi8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSkge1xuXHRcdHJldHVybjtcblx0fVxuXHR2YXJcblx0XHQgIGRvYyA9IHZpZXcuZG9jdW1lbnRcblx0XHQgIC8vIG9ubHkgZ2V0IFVSTCB3aGVuIG5lY2Vzc2FyeSBpbiBjYXNlIEJsb2IuanMgaGFzbid0IG92ZXJyaWRkZW4gaXQgeWV0XG5cdFx0LCBnZXRfVVJMID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdmlldy5VUkwgfHwgdmlldy53ZWJraXRVUkwgfHwgdmlldztcblx0XHR9XG5cdFx0LCBzYXZlX2xpbmsgPSBkb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLCBcImFcIilcblx0XHQsIGNhbl91c2Vfc2F2ZV9saW5rID0gXCJkb3dubG9hZFwiIGluIHNhdmVfbGlua1xuXHRcdCwgY2xpY2sgPSBmdW5jdGlvbihub2RlKSB7XG5cdFx0XHR2YXIgZXZlbnQgPSBuZXcgTW91c2VFdmVudChcImNsaWNrXCIpO1xuXHRcdFx0bm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcblx0XHR9XG5cdFx0LCBpc19zYWZhcmkgPSAvY29uc3RydWN0b3IvaS50ZXN0KHZpZXcuSFRNTEVsZW1lbnQpIHx8IHZpZXcuc2FmYXJpXG5cdFx0LCBpc19jaHJvbWVfaW9zID0vQ3JpT1NcXC9bXFxkXSsvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudClcblx0XHQsIHRocm93X291dHNpZGUgPSBmdW5jdGlvbihleCkge1xuXHRcdFx0KHZpZXcuc2V0SW1tZWRpYXRlIHx8IHZpZXcuc2V0VGltZW91dCkoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHRocm93IGV4O1xuXHRcdFx0fSwgMCk7XG5cdFx0fVxuXHRcdCwgZm9yY2Vfc2F2ZWFibGVfdHlwZSA9IFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCJcblx0XHQvLyB0aGUgQmxvYiBBUEkgaXMgZnVuZGFtZW50YWxseSBicm9rZW4gYXMgdGhlcmUgaXMgbm8gXCJkb3dubG9hZGZpbmlzaGVkXCIgZXZlbnQgdG8gc3Vic2NyaWJlIHRvXG5cdFx0LCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQgPSAxMDAwICogNDAgLy8gaW4gbXNcblx0XHQsIHJldm9rZSA9IGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdHZhciByZXZva2VyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZmlsZSA9PT0gXCJzdHJpbmdcIikgeyAvLyBmaWxlIGlzIGFuIG9iamVjdCBVUkxcblx0XHRcdFx0XHRnZXRfVVJMKCkucmV2b2tlT2JqZWN0VVJMKGZpbGUpO1xuXHRcdFx0XHR9IGVsc2UgeyAvLyBmaWxlIGlzIGEgRmlsZVxuXHRcdFx0XHRcdGZpbGUucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHRzZXRUaW1lb3V0KHJldm9rZXIsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCk7XG5cdFx0fVxuXHRcdCwgZGlzcGF0Y2ggPSBmdW5jdGlvbihmaWxlc2F2ZXIsIGV2ZW50X3R5cGVzLCBldmVudCkge1xuXHRcdFx0ZXZlbnRfdHlwZXMgPSBbXS5jb25jYXQoZXZlbnRfdHlwZXMpO1xuXHRcdFx0dmFyIGkgPSBldmVudF90eXBlcy5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRcdHZhciBsaXN0ZW5lciA9IGZpbGVzYXZlcltcIm9uXCIgKyBldmVudF90eXBlc1tpXV07XG5cdFx0XHRcdGlmICh0eXBlb2YgbGlzdGVuZXIgPT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRsaXN0ZW5lci5jYWxsKGZpbGVzYXZlciwgZXZlbnQgfHwgZmlsZXNhdmVyKTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRcdFx0dGhyb3dfb3V0c2lkZShleCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCwgYXV0b19ib20gPSBmdW5jdGlvbihibG9iKSB7XG5cdFx0XHQvLyBwcmVwZW5kIEJPTSBmb3IgVVRGLTggWE1MIGFuZCB0ZXh0LyogdHlwZXMgKGluY2x1ZGluZyBIVE1MKVxuXHRcdFx0Ly8gbm90ZTogeW91ciBicm93c2VyIHdpbGwgYXV0b21hdGljYWxseSBjb252ZXJ0IFVURi0xNiBVK0ZFRkYgdG8gRUYgQkIgQkZcblx0XHRcdGlmICgvXlxccyooPzp0ZXh0XFwvXFxTKnxhcHBsaWNhdGlvblxcL3htbHxcXFMqXFwvXFxTKlxcK3htbClcXHMqOy4qY2hhcnNldFxccyo9XFxzKnV0Zi04L2kudGVzdChibG9iLnR5cGUpKSB7XG5cdFx0XHRcdHJldHVybiBuZXcgQmxvYihbU3RyaW5nLmZyb21DaGFyQ29kZSgweEZFRkYpLCBibG9iXSwge3R5cGU6IGJsb2IudHlwZX0pO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGJsb2I7XG5cdFx0fVxuXHRcdCwgRmlsZVNhdmVyID0gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdGlmICghbm9fYXV0b19ib20pIHtcblx0XHRcdFx0YmxvYiA9IGF1dG9fYm9tKGJsb2IpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gRmlyc3QgdHJ5IGEuZG93bmxvYWQsIHRoZW4gd2ViIGZpbGVzeXN0ZW0sIHRoZW4gb2JqZWN0IFVSTHNcblx0XHRcdHZhclxuXHRcdFx0XHQgIGZpbGVzYXZlciA9IHRoaXNcblx0XHRcdFx0LCB0eXBlID0gYmxvYi50eXBlXG5cdFx0XHRcdCwgZm9yY2UgPSB0eXBlID09PSBmb3JjZV9zYXZlYWJsZV90eXBlXG5cdFx0XHRcdCwgb2JqZWN0X3VybFxuXHRcdFx0XHQsIGRpc3BhdGNoX2FsbCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGRpc3BhdGNoKGZpbGVzYXZlciwgXCJ3cml0ZXN0YXJ0IHByb2dyZXNzIHdyaXRlIHdyaXRlZW5kXCIuc3BsaXQoXCIgXCIpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBvbiBhbnkgZmlsZXN5cyBlcnJvcnMgcmV2ZXJ0IHRvIHNhdmluZyB3aXRoIG9iamVjdCBVUkxzXG5cdFx0XHRcdCwgZnNfZXJyb3IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAoKGlzX2Nocm9tZV9pb3MgfHwgKGZvcmNlICYmIGlzX3NhZmFyaSkpICYmIHZpZXcuRmlsZVJlYWRlcikge1xuXHRcdFx0XHRcdFx0Ly8gU2FmYXJpIGRvZXNuJ3QgYWxsb3cgZG93bmxvYWRpbmcgb2YgYmxvYiB1cmxzXG5cdFx0XHRcdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblx0XHRcdFx0XHRcdHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHVybCA9IGlzX2Nocm9tZV9pb3MgPyByZWFkZXIucmVzdWx0IDogcmVhZGVyLnJlc3VsdC5yZXBsYWNlKC9eZGF0YTpbXjtdKjsvLCAnZGF0YTphdHRhY2htZW50L2ZpbGU7Jyk7XG5cdFx0XHRcdFx0XHRcdHZhciBwb3B1cCA9IHZpZXcub3Blbih1cmwsICdfYmxhbmsnKTtcblx0XHRcdFx0XHRcdFx0aWYoIXBvcHVwKSB2aWV3LmxvY2F0aW9uLmhyZWYgPSB1cmw7XG5cdFx0XHRcdFx0XHRcdHVybD11bmRlZmluZWQ7IC8vIHJlbGVhc2UgcmVmZXJlbmNlIGJlZm9yZSBkaXNwYXRjaGluZ1xuXHRcdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRyZWFkZXIucmVhZEFzRGF0YVVSTChibG9iKTtcblx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLklOSVQ7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIGRvbid0IGNyZWF0ZSBtb3JlIG9iamVjdCBVUkxzIHRoYW4gbmVlZGVkXG5cdFx0XHRcdFx0aWYgKCFvYmplY3RfdXJsKSB7XG5cdFx0XHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGZvcmNlKSB7XG5cdFx0XHRcdFx0XHR2aWV3LmxvY2F0aW9uLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR2YXIgb3BlbmVkID0gdmlldy5vcGVuKG9iamVjdF91cmwsIFwiX2JsYW5rXCIpO1xuXHRcdFx0XHRcdFx0aWYgKCFvcGVuZWQpIHtcblx0XHRcdFx0XHRcdFx0Ly8gQXBwbGUgZG9lcyBub3QgYWxsb3cgd2luZG93Lm9wZW4sIHNlZSBodHRwczovL2RldmVsb3Blci5hcHBsZS5jb20vbGlicmFyeS9zYWZhcmkvZG9jdW1lbnRhdGlvbi9Ub29scy9Db25jZXB0dWFsL1NhZmFyaUV4dGVuc2lvbkd1aWRlL1dvcmtpbmd3aXRoV2luZG93c2FuZFRhYnMvV29ya2luZ3dpdGhXaW5kb3dzYW5kVGFicy5odG1sXG5cdFx0XHRcdFx0XHRcdHZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHR9XG5cdFx0XHQ7XG5cdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXG5cdFx0XHRpZiAoY2FuX3VzZV9zYXZlX2xpbmspIHtcblx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2F2ZV9saW5rLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdHNhdmVfbGluay5kb3dubG9hZCA9IG5hbWU7XG5cdFx0XHRcdFx0Y2xpY2soc2F2ZV9saW5rKTtcblx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRyZXZva2Uob2JqZWN0X3VybCk7XG5cdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0ZnNfZXJyb3IoKTtcblx0XHR9XG5cdFx0LCBGU19wcm90byA9IEZpbGVTYXZlci5wcm90b3R5cGVcblx0XHQsIHNhdmVBcyA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRyZXR1cm4gbmV3IEZpbGVTYXZlcihibG9iLCBuYW1lIHx8IGJsb2IubmFtZSB8fCBcImRvd25sb2FkXCIsIG5vX2F1dG9fYm9tKTtcblx0XHR9XG5cdDtcblx0Ly8gSUUgMTArIChuYXRpdmUgc2F2ZUFzKVxuXHRpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gXCJ1bmRlZmluZWRcIiAmJiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYikge1xuXHRcdHJldHVybiBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0bmFtZSA9IG5hbWUgfHwgYmxvYi5uYW1lIHx8IFwiZG93bmxvYWRcIjtcblxuXHRcdFx0aWYgKCFub19hdXRvX2JvbSkge1xuXHRcdFx0XHRibG9iID0gYXV0b19ib20oYmxvYik7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IoYmxvYiwgbmFtZSk7XG5cdFx0fTtcblx0fVxuXG5cdEZTX3Byb3RvLmFib3J0ID0gZnVuY3Rpb24oKXt9O1xuXHRGU19wcm90by5yZWFkeVN0YXRlID0gRlNfcHJvdG8uSU5JVCA9IDA7XG5cdEZTX3Byb3RvLldSSVRJTkcgPSAxO1xuXHRGU19wcm90by5ET05FID0gMjtcblxuXHRGU19wcm90by5lcnJvciA9XG5cdEZTX3Byb3RvLm9ud3JpdGVzdGFydCA9XG5cdEZTX3Byb3RvLm9ucHJvZ3Jlc3MgPVxuXHRGU19wcm90by5vbndyaXRlID1cblx0RlNfcHJvdG8ub25hYm9ydCA9XG5cdEZTX3Byb3RvLm9uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlZW5kID1cblx0XHRudWxsO1xuXG5cdHJldHVybiBzYXZlQXM7XG59KFxuXHQgICB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBzZWxmXG5cdHx8IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93XG5cdHx8IHRoaXMuY29udGVudFxuKSk7XG4vLyBgc2VsZmAgaXMgdW5kZWZpbmVkIGluIEZpcmVmb3ggZm9yIEFuZHJvaWQgY29udGVudCBzY3JpcHQgY29udGV4dFxuLy8gd2hpbGUgYHRoaXNgIGlzIG5zSUNvbnRlbnRGcmFtZU1lc3NhZ2VNYW5hZ2VyXG4vLyB3aXRoIGFuIGF0dHJpYnV0ZSBgY29udGVudGAgdGhhdCBjb3JyZXNwb25kcyB0byB0aGUgd2luZG93XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzLnNhdmVBcyA9IHNhdmVBcztcbn0gZWxzZSBpZiAoKHR5cGVvZiBkZWZpbmUgIT09IFwidW5kZWZpbmVkXCIgJiYgZGVmaW5lICE9PSBudWxsKSAmJiAoZGVmaW5lLmFtZCAhPT0gbnVsbCkpIHtcbiAgZGVmaW5lKFwiRmlsZVNhdmVyLmpzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBzYXZlQXM7XG4gIH0pO1xufVxuIiwiZnVuY3Rpb24gZ2V0SlNPTlByb21pc2UodXJsKSB7XG5cbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICByZXF1ZXN0Lm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ3RleHQnO1xuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKHJlcXVlc3QucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgnSlNPTiBjb3VsZCBub3QgYmUgbG9hZGVkICcgKyB1cmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldEpTT05Qcm9taXNlO1xuIiwiZnVuY3Rpb24gZ2V0Rm9ybVZhbHVlcyhmb3JtRWxlbWVudCkge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuICAgICAgICBzd2l0Y2ggKGVsZW0udHlwZSkge1xuXG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0uY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgdmFyIHNlbGVjdFZhbHVlcyA9IGdldFNlbGVjdFZhbHVlcyhlbGVtKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gc2VsZWN0VmFsdWVzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0udmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZm9ybVBhcmFtcztcbn1cblxuZnVuY3Rpb24gc2V0Rm9ybVZhbHVlcyhmb3JtRWxlbWVudCwgdmFsdWVzKSB7XG4gICAgdmFyIGZvcm1FbGVtZW50cyA9IGZvcm1FbGVtZW50LmVsZW1lbnRzO1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgZWxlbSA9IG51bGw7XG4gICAgZm9yIChpID0gMDsgaSA8IGZvcm1FbGVtZW50cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICBlbGVtID0gZm9ybUVsZW1lbnRzW2ldO1xuXG4gICAgICAgIHN3aXRjaCAoZWxlbS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdzdWJtaXQnOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSA9PT0gZWxlbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0gPT09IGVsZW0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBzZXRTZWxlY3RWYWx1ZXMoZWxlbSwgdmFsdWVzW2VsZW0ubmFtZV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS52YWx1ZSA9IHZhbHVlc1tlbGVtLm5hbWVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXRTZWxlY3RWYWx1ZXMoc2VsZWN0RWxlbSwgdmFsdWVzKSB7XG4gICAgdmFyIG9wdGlvbnMgPSBzZWxlY3RFbGVtLm9wdGlvbnM7XG4gICAgdmFyIG9wdDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcbiAgICAgICAgaWYgKHZhbHVlcy5pbmRleE9mKG9wdC52YWx1ZSkgPiAtMSkge1xuICAgICAgICAgICAgb3B0LnNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRTZWxlY3RWYWx1ZXMoc2VsZWN0KSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0ICYmIHNlbGVjdC5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IG9wdGlvbnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgICAgIG9wdCA9IG9wdGlvbnNbaV07XG5cbiAgICAgICAgaWYgKG9wdC5zZWxlY3RlZCkge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2gob3B0LnZhbHVlIHx8IG9wdC50ZXh0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBnZXRTZXRGb3JtVmFsdWVzKCkge1xuICAgIHRoaXMuc2V0ID0gc2V0Rm9ybVZhbHVlcztcbiAgICB0aGlzLmdldCA9IGdldEZvcm1WYWx1ZXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U2V0Rm9ybVZhbHVlcztcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBvYmpUeXBlID0gcmVxdWlyZSgnb2JqLXR5cGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZWwsIHN0cikge1xuXHRpZiAob2JqVHlwZShlbCkuaW5kZXhPZignZWxlbWVudCcpID09PSAtMSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGFuIEhUTUwgRE9NIGVsZW1lbnQgYXMgZmlyc3QgYXJndW1lbnQnKTtcblx0fVxuXG5cdGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGEgc3RyaW5nIGFzIHNlY29uZCBhcmd1bWVudCcpO1xuXHR9XG5cblx0aWYgKGVsLmNsYXNzTGlzdCkge1xuXHRcdHJldHVybiBlbC5jbGFzc0xpc3QuY29udGFpbnMoc3RyKTtcblx0fVxuXG5cdHJldHVybiBuZXcgUmVnRXhwKCcoXnwgKScgKyBzdHIgKyAnKCB8JCknLCAnZ2knKS50ZXN0KGVsLmNsYXNzTmFtZSk7XG59O1xuIiwidmFyIHRpbnlTYW1wbGVMb2FkZXIgPSByZXF1aXJlKCd0aW55LXNhbXBsZS1sb2FkZXInKTtcbnZhciBhdWRpb0J1ZmZlckluc3RydW1lbnQgPSByZXF1aXJlKCdhdWRpby1idWZmZXItaW5zdHJ1bWVudCcpO1xudmFyIGdldEpTT04gPSByZXF1aXJlKCdnZXQtanNvbi1wcm9taXNlJyk7XG5cbnZhciBidWZmZXJzID0ge307XG5mdW5jdGlvbiBnZXRTYW1wbGVQcm9taXNlcyAoY3R4LCBkYXRhKSB7XG4gICAgdmFyIGJhc2VVcmwgPSBkYXRhLnNhbXBsZXM7XG4gICAgdmFyIHByb21pc2VzID0gW107XG5cbiAgICBkYXRhLmZpbGVuYW1lID0gW107XG4gICAgdmFyIGkgPSAwO1xuICAgIGRhdGEuZmlsZXMuZm9yRWFjaChmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhciBmaWxlbmFtZSA9IHZhbC5yZXBsYWNlKC9cXC5bXi8uXSskLywgXCJcIik7XG4gICAgICAgIGRhdGEuZmlsZW5hbWUucHVzaChmaWxlbmFtZSk7XG4gICAgICAgIHZhciByZW1vdGVVcmwgPSBiYXNlVXJsICsgdmFsO1xuXG4gICAgICAgIGxldCBsb2FkZXJQcm9taXNlID0gdGlueVNhbXBsZUxvYWRlcihjdHgsIHJlbW90ZVVybCk7XG4gICAgICAgIGxvYWRlclByb21pc2UudGhlbihmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICBidWZmZXJzW2ZpbGVuYW1lXSA9IG5ldyBhdWRpb0J1ZmZlckluc3RydW1lbnQoY3R4LCBidWZmZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBwcm9taXNlcy5wdXNoKGxvYWRlclByb21pc2UpO1xuXG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIHByb21pc2VzO1xufVxuXG5mdW5jdGlvbiBzYW1wbGVBbGxQcm9taXNlKGN0eCwgZGF0YVVybCkge1xuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB2YXIganNvblByb21pc2UgPSBnZXRKU09OKGRhdGFVcmwpO1xuICAgICAgICBqc29uUHJvbWlzZS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBzYW1wbGVQcm9taXNlcyA9IGdldFNhbXBsZVByb21pc2VzKGN0eCwgZGF0YSk7XG4gICAgICAgICAgICBQcm9taXNlLmFsbChzYW1wbGVQcm9taXNlcykudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtkYXRhOiBkYXRhLCBidWZmZXJzOiBidWZmZXJzfSk7XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkuY2F0Y2ggKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gbG9hZFNhbXBsZVNldChjdHgsIGRhdGFVcmwpIHtcbiAgICByZXR1cm4gc2FtcGxlQWxsUHJvbWlzZShjdHgsIGRhdGFVcmwpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvYWRTYW1wbGVTZXQ7XG4iLCJmdW5jdGlvbiBzYW1wbGVMb2FkZXIgKGNvbnRleHQsIHVybCkge1xuICAgIFxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4geyBcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICBcbiAgICAgICAgcmVxdWVzdC5vcGVuKCdnZXQnLCB1cmwsIHRydWUpO1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYocmVxdWVzdC5zdGF0dXMgPT09IDIwMCl7XG4gICAgICAgICAgICAgICAgY29udGV4dC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24gKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdCgndGlueS1zYW1wbGUtbG9hZGVyIHJlcXVlc3QgZmFpbGVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfSk7XG4gICAgXG4gICAgcmV0dXJuIHByb21pc2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNhbXBsZUxvYWRlcjtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuXHRyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikucmVwbGFjZSgvXlxcW29iamVjdCAoLispXFxdJC8sICckMScpLnRvTG93ZXJDYXNlKCk7XG59O1xuIiwiZnVuY3Rpb24gc2VsZWN0RWxlbWVudChhcHBlbmRUb0lELCBzZWxlY3RJRCwgb3B0aW9ucywgc2VsZWN0ZWQpIHtcblxuICAgIHRoaXMuYXBwZW5kVG9JRCA9IGFwcGVuZFRvSUQ7XG4gICAgdGhpcy5zZWxlY3RJRCA9IHNlbGVjdElEO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5zZWxlY3RlZCA9IHNlbGVjdGVkO1xuXG4gICAgdGhpcy5zZWxlY3RMaXN0O1xuICAgIFxuICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24oY2IpIHtcbiAgICAgICAgdmFyIGFwcGVuZFRvSUQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmFwcGVuZFRvSUQpO1xuICAgICAgICB0aGlzLnNlbGVjdExpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpO1xuICAgICAgICB0aGlzLnNlbGVjdExpc3QuaWQgPSB0aGlzLnNlbGVjdElEOyAgICAgICAgXG4gICAgICAgIGFwcGVuZFRvSUQuYXBwZW5kQ2hpbGQodGhpcy5zZWxlY3RMaXN0KTtcbiAgICAgICAgdGhpcy51cGRhdGUoc2VsZWN0SUQsIHRoaXMub3B0aW9ucywgdGhpcy5zZWxlY3RlZCk7XG4gICAgfTtcblxuICAgIHRoaXMub25DaGFuZ2UgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RMaXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjYih0aGlzLnZhbHVlKVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uIChlbGVtLCBvcHRpb25zLCBzZWxlY3RlZCkge1xuICAgICAgICB0aGlzLmRlbGV0ZShlbGVtKTtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBvcHRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpO1xuICAgICAgICAgICAgb3B0aW9uLnZhbHVlID0ga2V5O1xuICAgICAgICAgICAgb3B0aW9uLnRleHQgPSBvcHRpb25zW2tleV07XG4gICAgICAgICAgICBzZWxlY3RMaXN0LmFwcGVuZENoaWxkKG9wdGlvbik7XG5cbiAgICAgICAgICAgIGlmIChrZXkgPT09IHNlbGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgb3B0aW9uLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRTZWxlY3RlZCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIHZhciBvcHQ7XG4gICAgICAgIGZvciAoIHZhciBpID0gMCwgbGVuID0gc2VsZWN0TGlzdC5vcHRpb25zLmxlbmd0aDsgaSA8IGxlbjsgaSsrICkge1xuICAgICAgICAgICAgb3B0ID0gc2VsZWN0TGlzdC5vcHRpb25zW2ldO1xuICAgICAgICAgICAgaWYgKCBvcHQuc2VsZWN0ZWQgPT09IHRydWUgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdC52YWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBvcHRpb24gaW4gc2VsZWN0TGlzdCl7XG4gICAgICAgICAgICBzZWxlY3RMaXN0LnJlbW92ZShvcHRpb24pO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldEFzU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuYXBwZW5kVG9JRCk7XG4gICAgICAgIHZhciBlbGVtZW50SHRtbCA9IGVsZW1lbnQub3V0ZXJIVE1MO1xuICAgICAgICByZXR1cm4gZWxlbWVudEh0bWw7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZWxlY3RFbGVtZW50OyIsInZhciBXQUFDbG9jayA9IHJlcXVpcmUoJy4vbGliL1dBQUNsb2NrJylcblxubW9kdWxlLmV4cG9ydHMgPSBXQUFDbG9ja1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB3aW5kb3cuV0FBQ2xvY2sgPSBXQUFDbG9ja1xuIiwidmFyIGlzQnJvd3NlciA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJylcblxudmFyIENMT0NLX0RFRkFVTFRTID0ge1xuICB0b2xlcmFuY2VMYXRlOiAwLjEwLFxuICB0b2xlcmFuY2VFYXJseTogMC4wMDFcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT0gRXZlbnQgPT09PT09PT09PT09PT09PT09PT0gLy9cbnZhciBFdmVudCA9IGZ1bmN0aW9uKGNsb2NrLCBkZWFkbGluZSwgZnVuYykge1xuICB0aGlzLmNsb2NrID0gY2xvY2tcbiAgdGhpcy5mdW5jID0gZnVuY1xuICB0aGlzLl9jbGVhcmVkID0gZmFsc2UgLy8gRmxhZyB1c2VkIHRvIGNsZWFyIGFuIGV2ZW50IGluc2lkZSBjYWxsYmFja1xuXG4gIHRoaXMudG9sZXJhbmNlTGF0ZSA9IGNsb2NrLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy50b2xlcmFuY2VFYXJseSA9IGNsb2NrLnRvbGVyYW5jZUVhcmx5XG4gIHRoaXMuX2xhdGVzdFRpbWUgPSBudWxsXG4gIHRoaXMuX2VhcmxpZXN0VGltZSA9IG51bGxcbiAgdGhpcy5kZWFkbGluZSA9IG51bGxcbiAgdGhpcy5yZXBlYXRUaW1lID0gbnVsbFxuXG4gIHRoaXMuc2NoZWR1bGUoZGVhZGxpbmUpXG59XG5cbi8vIFVuc2NoZWR1bGVzIHRoZSBldmVudFxuRXZlbnQucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gIHRoaXMuX2NsZWFyZWQgPSB0cnVlXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFNldHMgdGhlIGV2ZW50IHRvIHJlcGVhdCBldmVyeSBgdGltZWAgc2Vjb25kcy5cbkV2ZW50LnByb3RvdHlwZS5yZXBlYXQgPSBmdW5jdGlvbih0aW1lKSB7XG4gIGlmICh0aW1lID09PSAwKVxuICAgIHRocm93IG5ldyBFcnJvcignZGVsYXkgY2Fubm90IGJlIDAnKVxuICB0aGlzLnJlcGVhdFRpbWUgPSB0aW1lXG4gIGlmICghdGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpXG4gICAgdGhpcy5zY2hlZHVsZSh0aGlzLmRlYWRsaW5lICsgdGhpcy5yZXBlYXRUaW1lKVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBTZXRzIHRoZSB0aW1lIHRvbGVyYW5jZSBvZiB0aGUgZXZlbnQuXG4vLyBUaGUgZXZlbnQgd2lsbCBiZSBleGVjdXRlZCBpbiB0aGUgaW50ZXJ2YWwgYFtkZWFkbGluZSAtIGVhcmx5LCBkZWFkbGluZSArIGxhdGVdYFxuLy8gSWYgdGhlIGNsb2NrIGZhaWxzIHRvIGV4ZWN1dGUgdGhlIGV2ZW50IGluIHRpbWUsIHRoZSBldmVudCB3aWxsIGJlIGRyb3BwZWQuXG5FdmVudC5wcm90b3R5cGUudG9sZXJhbmNlID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIGlmICh0eXBlb2YgdmFsdWVzLmxhdGUgPT09ICdudW1iZXInKVxuICAgIHRoaXMudG9sZXJhbmNlTGF0ZSA9IHZhbHVlcy5sYXRlXG4gIGlmICh0eXBlb2YgdmFsdWVzLmVhcmx5ID09PSAnbnVtYmVyJylcbiAgICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gdmFsdWVzLmVhcmx5XG4gIHRoaXMuX3JlZnJlc2hFYXJseUxhdGVEYXRlcygpXG4gIGlmICh0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSkge1xuICAgIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gICAgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIGV2ZW50IGlzIHJlcGVhdGVkLCBmYWxzZSBvdGhlcndpc2VcbkV2ZW50LnByb3RvdHlwZS5pc1JlcGVhdGVkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJlcGVhdFRpbWUgIT09IG51bGwgfVxuXG4vLyBTY2hlZHVsZXMgdGhlIGV2ZW50IHRvIGJlIHJhbiBiZWZvcmUgYGRlYWRsaW5lYC5cbi8vIElmIHRoZSB0aW1lIGlzIHdpdGhpbiB0aGUgZXZlbnQgdG9sZXJhbmNlLCB3ZSBoYW5kbGUgdGhlIGV2ZW50IGltbWVkaWF0ZWx5LlxuLy8gSWYgdGhlIGV2ZW50IHdhcyBhbHJlYWR5IHNjaGVkdWxlZCBhdCBhIGRpZmZlcmVudCB0aW1lLCBpdCBpcyByZXNjaGVkdWxlZC5cbkV2ZW50LnByb3RvdHlwZS5zY2hlZHVsZSA9IGZ1bmN0aW9uKGRlYWRsaW5lKSB7XG4gIHRoaXMuX2NsZWFyZWQgPSBmYWxzZVxuICB0aGlzLmRlYWRsaW5lID0gZGVhZGxpbmVcbiAgdGhpcy5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzKClcblxuICBpZiAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lID49IHRoaXMuX2VhcmxpZXN0VGltZSkge1xuICAgIHRoaXMuX2V4ZWN1dGUoKVxuICBcbiAgfSBlbHNlIGlmICh0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSkge1xuICAgIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG4gICAgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbiAgXG4gIH0gZWxzZSB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxufVxuXG5FdmVudC5wcm90b3R5cGUudGltZVN0cmV0Y2ggPSBmdW5jdGlvbih0UmVmLCByYXRpbykge1xuICBpZiAodGhpcy5pc1JlcGVhdGVkKCkpXG4gICAgdGhpcy5yZXBlYXRUaW1lID0gdGhpcy5yZXBlYXRUaW1lICogcmF0aW9cblxuICB2YXIgZGVhZGxpbmUgPSB0UmVmICsgcmF0aW8gKiAodGhpcy5kZWFkbGluZSAtIHRSZWYpXG4gIC8vIElmIHRoZSBkZWFkbGluZSBpcyB0b28gY2xvc2Ugb3IgcGFzdCwgYW5kIHRoZSBldmVudCBoYXMgYSByZXBlYXQsXG4gIC8vIHdlIGNhbGN1bGF0ZSB0aGUgbmV4dCByZXBlYXQgcG9zc2libGUgaW4gdGhlIHN0cmV0Y2hlZCBzcGFjZS5cbiAgaWYgKHRoaXMuaXNSZXBlYXRlZCgpKSB7XG4gICAgd2hpbGUgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA+PSBkZWFkbGluZSAtIHRoaXMudG9sZXJhbmNlRWFybHkpXG4gICAgICBkZWFkbGluZSArPSB0aGlzLnJlcGVhdFRpbWVcbiAgfVxuICB0aGlzLnNjaGVkdWxlKGRlYWRsaW5lKVxufVxuXG4vLyBFeGVjdXRlcyB0aGUgZXZlbnRcbkV2ZW50LnByb3RvdHlwZS5fZXhlY3V0ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5jbG9jay5fc3RhcnRlZCA9PT0gZmFsc2UpIHJldHVyblxuICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuXG4gIGlmICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPCB0aGlzLl9sYXRlc3RUaW1lKVxuICAgIHRoaXMuZnVuYyh0aGlzKVxuICBlbHNlIHtcbiAgICBpZiAodGhpcy5vbmV4cGlyZWQpIHRoaXMub25leHBpcmVkKHRoaXMpXG4gICAgY29uc29sZS53YXJuKCdldmVudCBleHBpcmVkJylcbiAgfVxuICAvLyBJbiB0aGUgY2FzZSBgc2NoZWR1bGVgIGlzIGNhbGxlZCBpbnNpZGUgYGZ1bmNgLCB3ZSBuZWVkIHRvIGF2b2lkXG4gIC8vIG92ZXJyd3JpdGluZyB3aXRoIHlldCBhbm90aGVyIGBzY2hlZHVsZWAuXG4gIGlmICghdGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykgJiYgdGhpcy5pc1JlcGVhdGVkKCkgJiYgIXRoaXMuX2NsZWFyZWQpXG4gICAgdGhpcy5zY2hlZHVsZSh0aGlzLmRlYWRsaW5lICsgdGhpcy5yZXBlYXRUaW1lKSBcbn1cblxuLy8gVXBkYXRlcyBjYWNoZWQgdGltZXNcbkV2ZW50LnByb3RvdHlwZS5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2xhdGVzdFRpbWUgPSB0aGlzLmRlYWRsaW5lICsgdGhpcy50b2xlcmFuY2VMYXRlXG4gIHRoaXMuX2VhcmxpZXN0VGltZSA9IHRoaXMuZGVhZGxpbmUgLSB0aGlzLnRvbGVyYW5jZUVhcmx5XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IFdBQUNsb2NrID09PT09PT09PT09PT09PT09PT09IC8vXG52YXIgV0FBQ2xvY2sgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG4gIG9wdHMgPSBvcHRzIHx8IHt9XG4gIHRoaXMudGlja01ldGhvZCA9IG9wdHMudGlja01ldGhvZCB8fCAnU2NyaXB0UHJvY2Vzc29yTm9kZSdcbiAgdGhpcy50b2xlcmFuY2VFYXJseSA9IG9wdHMudG9sZXJhbmNlRWFybHkgfHwgQ0xPQ0tfREVGQVVMVFMudG9sZXJhbmNlRWFybHlcbiAgdGhpcy50b2xlcmFuY2VMYXRlID0gb3B0cy50b2xlcmFuY2VMYXRlIHx8IENMT0NLX0RFRkFVTFRTLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dFxuICB0aGlzLl9ldmVudHMgPSBbXVxuICB0aGlzLl9zdGFydGVkID0gZmFsc2Vcbn1cblxuLy8gLS0tLS0tLS0tLSBQdWJsaWMgQVBJIC0tLS0tLS0tLS0gLy9cbi8vIFNjaGVkdWxlcyBgZnVuY2AgdG8gcnVuIGFmdGVyIGBkZWxheWAgc2Vjb25kcy5cbldBQUNsb2NrLnByb3RvdHlwZS5zZXRUaW1lb3V0ID0gZnVuY3Rpb24oZnVuYywgZGVsYXkpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUV2ZW50KGZ1bmMsIHRoaXMuX2Fic1RpbWUoZGVsYXkpKVxufVxuXG4vLyBTY2hlZHVsZXMgYGZ1bmNgIHRvIHJ1biBiZWZvcmUgYGRlYWRsaW5lYC5cbldBQUNsb2NrLnByb3RvdHlwZS5jYWxsYmFja0F0VGltZSA9IGZ1bmN0aW9uKGZ1bmMsIGRlYWRsaW5lKSB7XG4gIHJldHVybiB0aGlzLl9jcmVhdGVFdmVudChmdW5jLCBkZWFkbGluZSlcbn1cblxuLy8gU3RyZXRjaGVzIGBkZWFkbGluZWAgYW5kIGByZXBlYXRgIG9mIGFsbCBzY2hlZHVsZWQgYGV2ZW50c2AgYnkgYHJhdGlvYCwga2VlcGluZ1xuLy8gdGhlaXIgcmVsYXRpdmUgZGlzdGFuY2UgdG8gYHRSZWZgLiBJbiBmYWN0IHRoaXMgaXMgZXF1aXZhbGVudCB0byBjaGFuZ2luZyB0aGUgdGVtcG8uXG5XQUFDbG9jay5wcm90b3R5cGUudGltZVN0cmV0Y2ggPSBmdW5jdGlvbih0UmVmLCBldmVudHMsIHJhdGlvKSB7XG4gIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7IGV2ZW50LnRpbWVTdHJldGNoKHRSZWYsIHJhdGlvKSB9KVxuICByZXR1cm4gZXZlbnRzXG59XG5cbi8vIFJlbW92ZXMgYWxsIHNjaGVkdWxlZCBldmVudHMgYW5kIHN0YXJ0cyB0aGUgY2xvY2sgXG5XQUFDbG9jay5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3N0YXJ0ZWQgPT09IGZhbHNlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdGhpcy5fc3RhcnRlZCA9IHRydWVcbiAgICB0aGlzLl9ldmVudHMgPSBbXVxuXG4gICAgaWYgKHRoaXMudGlja01ldGhvZCA9PT0gJ1NjcmlwdFByb2Nlc3Nvck5vZGUnKSB7XG4gICAgICB2YXIgYnVmZmVyU2l6ZSA9IDI1NlxuICAgICAgLy8gV2UgaGF2ZSB0byBrZWVwIGEgcmVmZXJlbmNlIHRvIHRoZSBub2RlIHRvIGF2b2lkIGdhcmJhZ2UgY29sbGVjdGlvblxuICAgICAgdGhpcy5fY2xvY2tOb2RlID0gdGhpcy5jb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKVxuICAgICAgdGhpcy5fY2xvY2tOb2RlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKVxuICAgICAgdGhpcy5fY2xvY2tOb2RlLm9uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkgeyBzZWxmLl90aWNrKCkgfSlcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMudGlja01ldGhvZCA9PT0gJ21hbnVhbCcpIG51bGwgLy8gX3RpY2sgaXMgY2FsbGVkIG1hbnVhbGx5XG5cbiAgICBlbHNlIHRocm93IG5ldyBFcnJvcignaW52YWxpZCB0aWNrTWV0aG9kICcgKyB0aGlzLnRpY2tNZXRob2QpXG4gIH1cbn1cblxuLy8gU3RvcHMgdGhlIGNsb2NrXG5XQUFDbG9jay5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fc3RhcnRlZCA9PT0gdHJ1ZSkge1xuICAgIHRoaXMuX3N0YXJ0ZWQgPSBmYWxzZVxuICAgIHRoaXMuX2Nsb2NrTm9kZS5kaXNjb25uZWN0KClcbiAgfSAgXG59XG5cbi8vIC0tLS0tLS0tLS0gUHJpdmF0ZSAtLS0tLS0tLS0tIC8vXG5cbi8vIFRoaXMgZnVuY3Rpb24gaXMgcmFuIHBlcmlvZGljYWxseSwgYW5kIGF0IGVhY2ggdGljayBpdCBleGVjdXRlc1xuLy8gZXZlbnRzIGZvciB3aGljaCBgY3VycmVudFRpbWVgIGlzIGluY2x1ZGVkIGluIHRoZWlyIHRvbGVyYW5jZSBpbnRlcnZhbC5cbldBQUNsb2NrLnByb3RvdHlwZS5fdGljayA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZXZlbnQgPSB0aGlzLl9ldmVudHMuc2hpZnQoKVxuXG4gIHdoaWxlKGV2ZW50ICYmIGV2ZW50Ll9lYXJsaWVzdFRpbWUgPD0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKSB7XG4gICAgZXZlbnQuX2V4ZWN1dGUoKVxuICAgIGV2ZW50ID0gdGhpcy5fZXZlbnRzLnNoaWZ0KClcbiAgfVxuXG4gIC8vIFB1dCBiYWNrIHRoZSBsYXN0IGV2ZW50XG4gIGlmKGV2ZW50KSB0aGlzLl9ldmVudHMudW5zaGlmdChldmVudClcbn1cblxuLy8gQ3JlYXRlcyBhbiBldmVudCBhbmQgaW5zZXJ0IGl0IHRvIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX2NyZWF0ZUV2ZW50ID0gZnVuY3Rpb24oZnVuYywgZGVhZGxpbmUpIHtcbiAgcmV0dXJuIG5ldyBFdmVudCh0aGlzLCBkZWFkbGluZSwgZnVuYylcbn1cblxuLy8gSW5zZXJ0cyBhbiBldmVudCB0byB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9pbnNlcnRFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHRoaXMuX2V2ZW50cy5zcGxpY2UodGhpcy5faW5kZXhCeVRpbWUoZXZlbnQuX2VhcmxpZXN0VGltZSksIDAsIGV2ZW50KVxufVxuXG4vLyBSZW1vdmVzIGFuIGV2ZW50IGZyb20gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5fcmVtb3ZlRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgaW5kID0gdGhpcy5fZXZlbnRzLmluZGV4T2YoZXZlbnQpXG4gIGlmIChpbmQgIT09IC0xKSB0aGlzLl9ldmVudHMuc3BsaWNlKGluZCwgMSlcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIGBldmVudGAgaXMgaW4gcXVldWUsIGZhbHNlIG90aGVyd2lzZVxuV0FBQ2xvY2sucHJvdG90eXBlLl9oYXNFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gcmV0dXJuIHRoaXMuX2V2ZW50cy5pbmRleE9mKGV2ZW50KSAhPT0gLTFcbn1cblxuLy8gUmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGZpcnN0IGV2ZW50IHdob3NlIGRlYWRsaW5lIGlzID49IHRvIGBkZWFkbGluZWBcbldBQUNsb2NrLnByb3RvdHlwZS5faW5kZXhCeVRpbWUgPSBmdW5jdGlvbihkZWFkbGluZSkge1xuICAvLyBwZXJmb3JtcyBhIGJpbmFyeSBzZWFyY2hcbiAgdmFyIGxvdyA9IDBcbiAgICAsIGhpZ2ggPSB0aGlzLl9ldmVudHMubGVuZ3RoXG4gICAgLCBtaWRcbiAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICBtaWQgPSBNYXRoLmZsb29yKChsb3cgKyBoaWdoKSAvIDIpXG4gICAgaWYgKHRoaXMuX2V2ZW50c1ttaWRdLl9lYXJsaWVzdFRpbWUgPCBkZWFkbGluZSlcbiAgICAgIGxvdyA9IG1pZCArIDFcbiAgICBlbHNlIGhpZ2ggPSBtaWRcbiAgfVxuICByZXR1cm4gbG93XG59XG5cbi8vIENvbnZlcnRzIGZyb20gcmVsYXRpdmUgdGltZSB0byBhYnNvbHV0ZSB0aW1lXG5XQUFDbG9jay5wcm90b3R5cGUuX2Fic1RpbWUgPSBmdW5jdGlvbihyZWxUaW1lKSB7XG4gIHJldHVybiByZWxUaW1lICsgdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lXG59XG5cbi8vIENvbnZlcnRzIGZyb20gYWJzb2x1dGUgdGltZSB0byByZWxhdGl2ZSB0aW1lIFxuV0FBQ2xvY2sucHJvdG90eXBlLl9yZWxUaW1lID0gZnVuY3Rpb24oYWJzVGltZSkge1xuICByZXR1cm4gYWJzVGltZSAtIHRoaXMuY29udGV4dC5jdXJyZW50VGltZVxufSIsIi8vIHJlcXVpcmUoXCJiYWJlbC1wb2x5ZmlsbFwiKTsgXG5jb25zdCBsb2FkU2FtcGxlU2V0ID0gcmVxdWlyZSgnbG9hZC1zYW1wbGUtc2V0Jyk7XG5jb25zdCBzZWxlY3RFbGVtZW50ID0gcmVxdWlyZSgnc2VsZWN0LWVsZW1lbnQnKTtcbmNvbnN0IGdldFNldEZvcm1WYWx1ZXMgPSByZXF1aXJlKCdnZXQtc2V0LWZvcm0tdmFsdWVzJyk7XG5jb25zdCBhZHNyR2Fpbk5vZGUgPSByZXF1aXJlKCdhZHNyLWdhaW4tbm9kZScpO1xuY29uc3Qgc2ltcGxlVHJhY2tlciA9IHJlcXVpcmUoJy4vc2ltcGxlLXRyYWNrZXInKTtcbmNvbnN0IEZpbGVTYXZlciA9IHJlcXVpcmUoJ2ZpbGUtc2F2ZXInKTtcblxuY29uc3QgZ2V0U2V0Q29udHJvbHMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IGdldFNldEF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRTZXRDb250cm9scygpO1xuXG5jb25zdCBjdHggPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5jb25zdCBkZWZhdWx0VHJhY2sgPSByZXF1aXJlKCcuL2RlZmF1bHQtdHJhY2snKTtcblxudmFyIGJ1ZmZlcnM7XG52YXIgY3VycmVudFNhbXBsZURhdGE7XG52YXIgc3RvcmFnZTtcblxuZnVuY3Rpb24gZGVidWcgKHYpIHtcbiAgICBjb25zb2xlLmxvZyh2KVxufSBcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIGRhdGFVcmwsIHRyYWNrKSB7XG5cbiAgICB2YXIgc2FtcGxlU2V0UHJvbWlzZSA9IGxvYWRTYW1wbGVTZXQoY3R4LCBkYXRhVXJsKTtcbiAgICBzYW1wbGVTZXRQcm9taXNlLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcblxuICAgICAgICBidWZmZXJzID0gZGF0YS5idWZmZXJzO1xuICAgICAgICBzYW1wbGVEYXRhID0gZGF0YS5kYXRhO1xuXG4gICAgICAgIGlmICghdHJhY2spIHtcbiAgICAgICAgICAgIHRyYWNrID0gc3RvcmFnZS5nZXRUcmFjaygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoKSB7XG4gICAgICAgICAgICB0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoID0gMTY7XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50U2FtcGxlRGF0YSA9IHNhbXBsZURhdGE7XG4gICAgICAgIHNldHVwVHJhY2tlckh0bWwoc2FtcGxlRGF0YSwgdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCk7XG4gICAgICAgIHNjaGVkdWxlLmxvYWRUcmFja2VyVmFsdWVzKHRyYWNrLmJlYXQpO1xuICAgICAgICBzY2hlZHVsZS5zZXR1cEV2ZW50cygpO1xuICAgIH0pO1xuICAgXG59XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgbGV0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXJDb250cm9sc1wiKTtcblxuICAgIGRlYnVnIChkZWZhdWx0VHJhY2suc2V0dGluZ3MpXG4gICAgZm9ybVZhbHVlcy5zZXQoZm9ybSwgZGVmYXVsdFRyYWNrLnNldHRpbmdzKTtcbiAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKGRlZmF1bHRUcmFjay5zZXR0aW5ncyk7XG5cbiAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgZGVmYXVsdFRyYWNrLnNldHRpbmdzLnNhbXBsZVNldCwgZGVmYXVsdFRyYWNrKTtcbiAgICBzZXR1cEJhc2VFdmVudHMoKTtcblxuICAgIHN0b3JhZ2UgPSBuZXcgdHJhY2tzTG9jYWxTdG9yYWdlKCk7XG4gICAgc3RvcmFnZS5zZXR1cFN0b3JhZ2UoKTtcbn07XG5cbnZhciBpbnN0cnVtZW50RGF0YSA9IHt9O1xuZnVuY3Rpb24gc2V0dXBUcmFja2VySHRtbChkYXRhLCBtZWFzdXJlTGVuZ3RoKSB7XG4gICAgaW5zdHJ1bWVudERhdGEgPSBkYXRhO1xuICAgIGluc3RydW1lbnREYXRhLnRpdGxlID0gaW5zdHJ1bWVudERhdGEuZmlsZW5hbWU7XG4gICAgc2NoZWR1bGUuZHJhd1RyYWNrZXIoZGF0YS5maWxlbmFtZS5sZW5ndGgsIG1lYXN1cmVMZW5ndGgsIGluc3RydW1lbnREYXRhKTtcbiAgICByZXR1cm47XG59XG5cbmZ1bmN0aW9uIGRpc2Nvbm5lY3ROb2RlKG5vZGUsIG9wdGlvbnMpIHtcbiAgICBsZXQgdG90YWxMZW5ndGggPVxuICAgICAgICBvcHRpb25zLmF0dGFja1RpbWUgKyBvcHRpb25zLnN1c3RhaW5UaW1lICsgb3B0aW9ucy5yZWxlYXNlVGltZTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgbm9kZS5kaXNjb25uZWN0KCk7XG4gICAgfSwgdG90YWxMZW5ndGggKiAxMDAwKTtcbn1cblxuZnVuY3Rpb24gc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpIHtcblxuICAgIGxldCBpbnN0cnVtZW50TmFtZSA9IGluc3RydW1lbnREYXRhLmZpbGVuYW1lW2JlYXQucm93SWRdO1xuICAgIGxldCBpbnN0cnVtZW50ID0gYnVmZmVyc1tpbnN0cnVtZW50TmFtZV0uZ2V0KCk7XG4gICAgbGV0IG9wdGlvbnMgPSBnZXRTZXRBdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG5cblxuICAgIGZ1bmN0aW9uIHBsYXkoc291cmNlKSB7XG5cbiAgICAgICAgc291cmNlLmRldHVuZS52YWx1ZSA9IG9wdGlvbnMuZGV0dW5lO1xuXG4gICAgICAgIC8vIEdhaW5cbiAgICAgICAgbGV0IG5vZGUgPSByb3V0ZUdhaW4oc291cmNlKVxuICAgICAgICBub2RlID0gcm91dGVEZWxheShub2RlKTtcbiAgICAgICAgLy8gbm9kZSA9IHJvdXRlQ29tcHJlc3Nvcihub2RlKTtcbiAgICAgICAgbm9kZS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG4gICAgICAgIHNvdXJjZS5zdGFydCh0cmlnZ2VyVGltZSk7XG5cbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHJvdXRlR2FpbiAoc291cmNlKSB7XG4gICAgICAgIGxldCBnYWluID0gbmV3IGFkc3JHYWluTm9kZShjdHgpO1xuICAgICAgICBnYWluLm1vZGUgPSAnbGluZWFyUmFtcFRvVmFsdWVBdFRpbWUnO1xuICAgICAgICBsZXQgb3B0aW9ucyA9IGdldFNldEF1ZGlvT3B0aW9ucy5nZXRUcmFja2VyQ29udHJvbHMoKTtcblxuICAgICAgICBsZXQgZ2Fpbk5vZGU7IFxuXG4gICAgICAgIC8vIE5vdCBlbmFibGVkIC0gZGVmYXVsdCBnYWluXG4gICAgICAgIGlmICghb3B0aW9ucy5nYWluRW5hYmxlZCkge1xuICAgICAgICAgICAgZ2Fpbk5vZGUgPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcbiAgICAgICAgICAgIHNvdXJjZS5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgICAgIHJldHVybiBnYWluTm9kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGdhaW4uc2V0T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgZ2Fpbk5vZGUgPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcbiAgICAgICAgc291cmNlLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICByZXR1cm4gZ2Fpbk5vZGU7XG5cblxuICAgIH1cblxuICAgIC8vIE5vdGUgZGVsYXkgYWx3YXlzIHVzZXMgYWJvdmUgZ2FpbiAtIGV2ZW4gaWYgbm90IGVuYWJsZWRcbiAgICBmdW5jdGlvbiByb3V0ZURlbGF5KG5vZGUpIHtcbiAgICAgICAgaWYgKCFvcHRpb25zLmRlbGF5RW5hYmxlZCkge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjcmVhdGUgZGVsYXkgbm9kZVxuICAgICAgICBsZXQgZGVsYXkgPSBjdHguY3JlYXRlRGVsYXkoKTtcbiAgICAgICAgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gb3B0aW9ucy5kZWxheTtcblxuICAgICAgICAvLyBjcmVhdGUgYWRzciBnYWluIG5vZGVcbiAgICAgICAgbGV0IGdhaW4gPSBuZXcgYWRzckdhaW5Ob2RlKGN0eCk7XG4gICAgICAgIGdhaW4uc2V0T3B0aW9ucyhvcHRpb25zKTtcbiAgICAgICAgbGV0IGZlZWRiYWNrR2FpbiA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBmaWx0ZXJcbiAgICAgICAgbGV0IGZpbHRlciA9IGN0eC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAgICAgZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IG9wdGlvbnMuZmlsdGVyO1xuXG4gICAgICAgIC8vIGRlbGF5IC0+IGZlZWRiYWNrR2FpblxuICAgICAgICBkZWxheS5jb25uZWN0KGZlZWRiYWNrR2Fpbik7XG4gICAgICAgIGRpc2Nvbm5lY3ROb2RlKGRlbGF5LCBvcHRpb25zKTtcblxuICAgICAgICAvLyBmZWVkYmFjayAtPiBmaWx0ZXJcbiAgICAgICAgZmVlZGJhY2tHYWluLmNvbm5lY3QoZmlsdGVyKTtcblxuICAgICAgICAvLyBmaWx0ZXIgLT5kZWxheVxuICAgICAgICBmaWx0ZXIuY29ubmVjdChkZWxheSk7XG5cbiAgICAgICAgbm9kZS5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICByZXR1cm4gZGVsYXk7XG4gICAgfVxuICAgIHBsYXkoaW5zdHJ1bWVudCk7XG59XG5cbnZhciBzY2hlZHVsZSA9IG5ldyBzaW1wbGVUcmFja2VyKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuXG5mdW5jdGlvbiBzZXR1cEJhc2VFdmVudHMoKSB7XG5cbiAgICAvLyB2YXIgaW5pdGlhbGl6ZWRDdHg7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BsYXknKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgY3R4LnJlc3VtZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1BsYXliYWNrIHJlc3VtZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBzdG9yYWdlID0gbmV3IHRyYWNrc0xvY2FsU3RvcmFnZSgpO1xuICAgICAgICBsZXQgdHJhY2sgPSBzdG9yYWdlLmdldFRyYWNrKCk7XG5cbiAgICAgICAgc2NoZWR1bGUubWVhc3VyZUxlbmd0aCA9IHRyYWNrLnNldHRpbmdzLm1lYXN1cmVMZW5ndGg7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgXG4gICAgICAgIHNjaGVkdWxlLnJ1blNjaGVkdWxlKGdldFNldEF1ZGlvT3B0aW9ucy5vcHRpb25zLmJwbSk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGF1c2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdG9wJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgIHNjaGVkdWxlID0gbmV3IHNpbXBsZVRyYWNrZXIoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnBtJykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgZ2V0U2V0QXVkaW9PcHRpb25zLnNldFRyYWNrZXJDb250cm9scygpO1xuICAgICAgICBpZiAoc2NoZWR1bGUucnVubmluZykge1xuICAgICAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICAgICAgc2NoZWR1bGUucnVuU2NoZWR1bGUoZ2V0U2V0QXVkaW9PcHRpb25zLm9wdGlvbnMuYnBtKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lYXN1cmVMZW5ndGgnKS5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIChlKSA9PiB7XG5cbiAgICAgICAgJCgnI21lYXN1cmVMZW5ndGgnKS5iaW5kKCdrZXlwcmVzcyBrZXlkb3duIGtleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgICAgIGxldCB2YWx1ZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZWFzdXJlTGVuZ3RoJykudmFsdWU7XG4gICAgICAgICAgICAgICAgbGV0IGxlbmd0aCA9IHBhcnNlSW50KHZhbHVlKTtcblxuICAgICAgICAgICAgICAgIGlmIChsZW5ndGggPCAxKSByZXR1cm47XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUubWVhc3VyZUxlbmd0aCA9IGxlbmd0aDtcblxuICAgICAgICAgICAgICAgIGxldCB0cmFjayA9IHNjaGVkdWxlLmdldFRyYWNrZXJWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICBzZXR1cFRyYWNrZXJIdG1sKGN1cnJlbnRTYW1wbGVEYXRhLCBsZW5ndGgpO1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSBsZW5ndGg7XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUubG9hZFRyYWNrZXJWYWx1ZXModHJhY2spXG4gICAgICAgICAgICAgICAgc2NoZWR1bGUuc2V0dXBFdmVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAkKCcuYmFzZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGdldFNldEF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoKTtcbiAgICB9KTtcbn1cblxuJCgnI3NhbXBsZVNldCcpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIHRoaXMudmFsdWUpO1xufSk7XG5cbmZ1bmN0aW9uIHRyYWNrc0xvY2FsU3RvcmFnZSgpIHtcblxuICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlID0gZnVuY3Rpb24gKHVwZGF0ZSkge1xuICAgICAgICB2YXIgc3RvcmFnZSA9IHt9O1xuICAgICAgICBzdG9yYWdlWydTZWxlY3QnXSA9ICdTZWxlY3QnO1xuXG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGxvY2FsU3RvcmFnZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSBsb2NhbFN0b3JhZ2Uua2V5KGkpO1xuICAgICAgICAgICAgc3RvcmFnZVtpdGVtXSA9IGl0ZW07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgc2VsZWN0IGVsZW1lbnRcbiAgICAgICAgdmFyIHMgPSBuZXcgc2VsZWN0RWxlbWVudChcbiAgICAgICAgICAgICdsb2FkLXN0b3JhZ2UnLCAvLyBpZCB0byBhcHBlbmQgdGhlIHNlbGVjdCBsaXN0IHRvXG4gICAgICAgICAgICAnYmVhdC1saXN0JywgLy8gaWQgb2YgdGhlIHNlbGVjdCBsaXN0XG4gICAgICAgICAgICBzdG9yYWdlIC8vXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKHVwZGF0ZSkge1xuICAgICAgICAgICAgcy51cGRhdGUoJ2JlYXQtbGlzdCcsIHN0b3JhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcy5jcmVhdGUoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldEZpbGVuYW1lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgZmlsZW5hbWUgPSAkKCcjZmlsZW5hbWUnKS52YWwoKTtcbiAgICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICAgICAgZmlsZW5hbWUgPSAndW50aXRsZWQnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWxlbmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY29tcGxldGUgc29uZ1xuICAgICAqL1xuICAgIHRoaXMuZ2V0VHJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBmb3JtRGF0YSA9IGdldFNldEF1ZGlvT3B0aW9ucy5nZXRUcmFja2VyQ29udHJvbHMoKTtcblxuICAgICAgICBsZXQgYmVhdCA9IHNjaGVkdWxlLmdldFRyYWNrZXJWYWx1ZXMoKTtcbiAgICAgICAgbGV0IHNvbmcgPSB7IFwiYmVhdFwiOiBiZWF0LCBcInNldHRpbmdzXCI6IGZvcm1EYXRhIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc29uZztcbiAgICB9XG5cbiAgICB0aGlzLnNldHVwU3RvcmFnZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgbGV0IHNvbmcgPSB0aGlzLmdldFRyYWNrKCk7XG4gICAgICAgICAgICBsZXQganNvbiA9IEpTT04uc3RyaW5naWZ5KHNvbmcpO1xuXG4gICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSB0aGlzLmdldEZpbGVuYW1lKCk7XG5cbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGZpbGVuYW1lLCBqc29uKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcblxuICAgICAgICAgICAgJChcIiNiZWF0LWxpc3RcIikudmFsKGZpbGVuYW1lKTtcbiAgICAgICAgICAgIGFsZXJ0KCdUcmFjayBzYXZlZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBzYXZlQXNKc29uXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzYXZlQXNKc29uJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBsZXQgc29uZyA9IHRoaXMuZ2V0VHJhY2soKTtcbiAgICAgICAgICAgIGxldCBqc29uID0gSlNPTi5zdHJpbmdpZnkoc29uZyk7XG5cbiAgICAgICAgICAgIGxldCBmaWxlbmFtZSA9IHRoaXMuZ2V0RmlsZW5hbWUoKTtcblxuICAgICAgICAgICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbanNvbl0sIHt0eXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIn0pO1xuICAgICAgICAgICAgRmlsZVNhdmVyLnNhdmVBcyhibG9iLCBmaWxlbmFtZSArIFwiLmpzb25cIik7XG5cblxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjZmlsZW5hbWUnKS5iaW5kKCdrZXlwcmVzcyBrZXlkb3duIGtleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiZWF0LWxpc3QnKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGl0ZW0gPSAkKCcjYmVhdC1saXN0JykudmFsKCk7XG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gJ1NlbGVjdCcpIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSBpdGVtO1xuICAgICAgICAgICAgbGV0IHRyYWNrID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShpdGVtKSk7XG5cbiAgICAgICAgICAgIGxldCBmb3JtVmFsdWVzID0gbmV3IGdldFNldEZvcm1WYWx1ZXMoKTtcbiAgICAgICAgICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG5cbiAgICAgICAgICAgIGZvcm1WYWx1ZXMuc2V0KGZvcm0sIHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgICAgIGdldFNldEF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHModHJhY2suc2V0dGluZ3MpO1xuICAgICAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICAgICAgc2NoZWR1bGUubWVhc3VyZUxlbmd0aCA9IHRyYWNrLnNldHRpbmdzLm1lYXN1cmVMZW5ndGg7XG5cbiAgICAgICAgICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0cmFjay5zZXR0aW5ncy5zYW1wbGVTZXQsIHRyYWNrKTtcblxuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGVsZXRlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpO1xuICAgICAgICAgICAgbGV0IHRvRGVsZXRlID0gZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udGV4dDtcblxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odG9EZWxldGUpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcblxuICAgICAgICAgICAgYWxlcnQoJ1RyYWNrIGhhcyBiZWVuIGRlbGV0ZWQnKVxuXG4gICAgICAgIH0pO1xuICAgIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcImJlYXRcIjpbe1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY29sSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY29sSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY29sSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY29sSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY29sSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiMTZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCIxN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY29sSWRcIjpcIjE4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiMTlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCIyMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY29sSWRcIjpcIjIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiMjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCIyM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY29sSWRcIjpcIjI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiMjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCIyNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY29sSWRcIjpcIjI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiMjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjBcIixcImNvbElkXCI6XCIyOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMFwiLFwiY29sSWRcIjpcIjMwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIwXCIsXCJjb2xJZFwiOlwiMzFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY29sSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY29sSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY29sSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY29sSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY29sSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiMTZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCIxN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY29sSWRcIjpcIjE4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiMTlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCIyMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY29sSWRcIjpcIjIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiMjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCIyM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY29sSWRcIjpcIjI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiMjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCIyNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY29sSWRcIjpcIjI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiMjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjFcIixcImNvbElkXCI6XCIyOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMVwiLFwiY29sSWRcIjpcIjMwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxXCIsXCJjb2xJZFwiOlwiMzFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjb2xJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjb2xJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCIyXCIsXCJjb2xJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjb2xJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjb2xJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjb2xJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCIxNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjE3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjb2xJZFwiOlwiMThcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCIxOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjb2xJZFwiOlwiMjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCIyMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjIzXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCIyNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjb2xJZFwiOlwiMjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCIyN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIyXCIsXCJjb2xJZFwiOlwiMjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjJcIixcImNvbElkXCI6XCIzMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMlwiLFwiY29sSWRcIjpcIjMxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjb2xJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjFcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjb2xJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjb2xJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjb2xJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjb2xJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCIxNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjE3XCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCIxOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjE5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjb2xJZFwiOlwiMjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCIyMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjb2xJZFwiOlwiMjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCIyNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjb2xJZFwiOlwiMjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCIyN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIzXCIsXCJjb2xJZFwiOlwiMjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjNcIixcImNvbElkXCI6XCIzMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiM1wiLFwiY29sSWRcIjpcIjMxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjJcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNvbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNvbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNvbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiMTJcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiMTRcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiMTZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNvbElkXCI6XCIxN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjE4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiMTlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNvbElkXCI6XCIyMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjIxXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjRcIixcImNvbElkXCI6XCIyMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiMjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNvbElkXCI6XCIyNVwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiMjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNvbElkXCI6XCIyN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI0XCIsXCJjb2xJZFwiOlwiMjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjRcIixcImNvbElkXCI6XCIzMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNFwiLFwiY29sSWRcIjpcIjMxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNvbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjRcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNvbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNvbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjVcIixcImNvbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNvbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOnRydWV9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiMTZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNvbElkXCI6XCIxN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjE4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiMTlcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiMjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNvbElkXCI6XCIyMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiMjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNvbElkXCI6XCIyNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiMjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNvbElkXCI6XCIyOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNVwiLFwiY29sSWRcIjpcIjI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI1XCIsXCJjb2xJZFwiOlwiMzBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjVcIixcImNvbElkXCI6XCIzMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNvbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjb2xJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNvbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjb2xJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNvbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjb2xJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNvbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjb2xJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNvbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjb2xJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNvbElkXCI6XCIxNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjE3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjb2xJZFwiOlwiMThcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNvbElkXCI6XCIxOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjb2xJZFwiOlwiMjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNvbElkXCI6XCIyMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjb2xJZFwiOlwiMjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNvbElkXCI6XCIyNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjb2xJZFwiOlwiMjdcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI2XCIsXCJjb2xJZFwiOlwiMjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjZcIixcImNvbElkXCI6XCIzMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiNlwiLFwiY29sSWRcIjpcIjMxXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjb2xJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY29sSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjb2xJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY29sSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjb2xJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY29sSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY29sSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjb2xJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY29sSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjb2xJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCIxNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY29sSWRcIjpcIjE3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjb2xJZFwiOlwiMThcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCIxOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY29sSWRcIjpcIjIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjb2xJZFwiOlwiMjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCIyMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY29sSWRcIjpcIjIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjb2xJZFwiOlwiMjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCIyNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY29sSWRcIjpcIjI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjb2xJZFwiOlwiMjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCIyOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiN1wiLFwiY29sSWRcIjpcIjI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI3XCIsXCJjb2xJZFwiOlwiMzBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjdcIixcImNvbElkXCI6XCIzMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjb2xJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjb2xJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjb2xJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjb2xJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjb2xJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCIxNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjE3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjb2xJZFwiOlwiMThcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCIxOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjb2xJZFwiOlwiMjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCIyMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjb2xJZFwiOlwiMjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCIyNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI4XCIsXCJjb2xJZFwiOlwiMjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCIyOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjI5XCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjhcIixcImNvbElkXCI6XCIzMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOFwiLFwiY29sSWRcIjpcIjMxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNvbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNvbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNvbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNvbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNvbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjE2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiMTdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNvbElkXCI6XCIxOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjE5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiMjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNvbElkXCI6XCIyMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiMjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNvbElkXCI6XCIyNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiMjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNvbElkXCI6XCIyN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCI5XCIsXCJjb2xJZFwiOlwiMjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjlcIixcImNvbElkXCI6XCIzMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiOVwiLFwiY29sSWRcIjpcIjMxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY29sSWRcIjpcIjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNvbElkXCI6XCIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY29sSWRcIjpcIjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNvbElkXCI6XCI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY29sSWRcIjpcIjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTBcIixcImNvbElkXCI6XCI4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMFwiLFwiY29sSWRcIjpcIjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMTBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMTFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMTJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMTNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMTRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMTVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMTZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMTdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMThcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMTlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMjBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMjNcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMzBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEwXCIsXCJjb2xJZFwiOlwiMzFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjExXCIsXCJjb2xJZFwiOlwiMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY29sSWRcIjpcIjJcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjExXCIsXCJjb2xJZFwiOlwiM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY29sSWRcIjpcIjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjExXCIsXCJjb2xJZFwiOlwiNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCI3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMVwiLFwiY29sSWRcIjpcIjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjExXCIsXCJjb2xJZFwiOlwiOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIxOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIyMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIyMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIyMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIyM1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIyNFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIyNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIyNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIyN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIyOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIyOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIzMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTFcIixcImNvbElkXCI6XCIzMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNvbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEyXCIsXCJjb2xJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNvbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEyXCIsXCJjb2xJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNvbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEyXCIsXCJjb2xJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNvbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjE2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjE3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjE4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjE5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxMlwiLFwiY29sSWRcIjpcIjIzXCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjEyXCIsXCJjb2xJZFwiOlwiMjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEyXCIsXCJjb2xJZFwiOlwiMjVcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNvbElkXCI6XCIyNlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNvbElkXCI6XCIyN1wiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNvbElkXCI6XCIyOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNvbElkXCI6XCIyOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNvbElkXCI6XCIzMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTJcIixcImNvbElkXCI6XCIzMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNvbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjb2xJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNvbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjb2xJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNvbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjb2xJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNvbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjE2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjE3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjE4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjE5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxM1wiLFwiY29sSWRcIjpcIjI0XCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjEzXCIsXCJjb2xJZFwiOlwiMjVcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjb2xJZFwiOlwiMjZcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjb2xJZFwiOlwiMjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjEzXCIsXCJjb2xJZFwiOlwiMjhcIixcImVuYWJsZWRcIjp0cnVlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNvbElkXCI6XCIyOVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNvbElkXCI6XCIzMFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTNcIixcImNvbElkXCI6XCIzMVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNvbElkXCI6XCIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjFcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjb2xJZFwiOlwiMlwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNvbElkXCI6XCIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjRcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjb2xJZFwiOlwiNVwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNvbElkXCI6XCI2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjb2xJZFwiOlwiOFwiLFwiZW5hYmxlZFwiOmZhbHNlfSx7XCJyb3dJZFwiOlwiMTRcIixcImNvbElkXCI6XCI5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjEwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjExXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjEyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjEzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjE0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjE1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjE2XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjE3XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjE4XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjE5XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjIwXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjIxXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjIyXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjIzXCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjI0XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjI1XCIsXCJlbmFibGVkXCI6ZmFsc2V9LHtcInJvd0lkXCI6XCIxNFwiLFwiY29sSWRcIjpcIjI2XCIsXCJlbmFibGVkXCI6dHJ1ZX0se1wicm93SWRcIjpcIjE0XCIsXCJjb2xJZFwiOlwiMjdcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjb2xJZFwiOlwiMjhcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjb2xJZFwiOlwiMjlcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjb2xJZFwiOlwiMzBcIixcImVuYWJsZWRcIjpmYWxzZX0se1wicm93SWRcIjpcIjE0XCIsXCJjb2xJZFwiOlwiMzFcIixcImVuYWJsZWRcIjpmYWxzZX1dLFwic2V0dGluZ3NcIjp7XCJzYW1wbGVTZXRcIjpcImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9vcmFtaWNzL3NhbXBsZWQvbWFzdGVyL0RSVU1TL3BlYXJsLW1hc3Rlci1zdHVkaW8vc2FtcGxlZC5pbnN0cnVtZW50Lmpzb25cIixcIm1lYXN1cmVMZW5ndGhcIjozMixcImJwbVwiOjQ2MCxcImRldHVuZVwiOjAsXCJnYWluRW5hYmxlZFwiOlwiZ2FpblwiLFwiYXR0YWNrQW1wXCI6MCxcInN1c3RhaW5BbXBcIjowLjQsXCJkZWNheUFtcFwiOjAuNyxcInJlbGVhc2VBbXBcIjoxLFwiYXR0YWNrVGltZVwiOjAsXCJkZWNheVRpbWVcIjowLFwic3VzdGFpblRpbWVcIjoyLFwicmVsZWFzZVRpbWVcIjoyLFwiYWRzckludGVydmFsXCI6MC4xLFwiZGVsYXlcIjowLjAxLFwiZmlsdGVyXCI6MTAwMH19IiwiY29uc3QgZ2V0U2V0Rm9ybVZhbHVlcyA9IHJlcXVpcmUoJ2dldC1zZXQtZm9ybS12YWx1ZXMnKTtcblxuZnVuY3Rpb24gZ2V0U2V0Q29udHJvbHMoKSB7XG5cbiAgICB0aGlzLmdldFRyYWNrZXJDb250cm9scyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIGxldCBmb3JtVmFsdWVzID0gbmV3IGdldFNldEZvcm1WYWx1ZXMoKTtcbiAgICAgICAgbGV0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXJDb250cm9sc1wiKTtcbiAgICAgICAgbGV0IHZhbHVlcyA9IGZvcm1WYWx1ZXMuZ2V0KGZvcm0pO1xuICAgICAgICBsZXQgcmV0ID0ge307XG4gICAgICAgIGZvciAobGV0IGtleSBpbiB2YWx1ZXMpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2RlbGF5RW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9ICdkZWxheSc7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoa2V5ID09PSAnZ2FpbkVuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSAnZ2Fpbic7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdzYW1wbGVTZXQnKSB7IFxuICAgICAgICAgICAgICAgIHJldFtrZXldID0gdmFsdWVzW2tleV07XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXRba2V5XSA9IHBhcnNlRmxvYXQodmFsdWVzW2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgdGhpcy5zZXRUcmFja2VyQ29udHJvbHMgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgICAgIGlmICghdmFsdWVzKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSB0aGlzLmdldFRyYWNrZXJDb250cm9scygpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IHZhbHVlcztcbiAgICB9OyAgXG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRTZXRDb250cm9scztcbiIsImNvbnN0IFdBQUNsb2NrID0gcmVxdWlyZSgnd2FhY2xvY2snKTtcbmNvbnN0IHRyYWNrZXJUYWJsZSA9IHJlcXVpcmUoJy4vdHJhY2tlci10YWJsZScpO1xuY29uc3QgaGFzQ2xhc3MgPSByZXF1aXJlKCdoYXMtY2xhc3MnKTtcblxuLyoqXG4gKiBDb25zdHJ1Y3Qgb2JqZWN0XG4gKiBAcGFyYW0ge2F1ZGlvQ29udGV4dH0gY3R4IFxuICogQHBhcmFtIHtmdW5jdGlvbn0gc2NoZWR1bGVBdWRpb0JlYXQgZnVudGlvbiB3aGVuIGFuIGF1ZGlvIGlzIHBsYXllZFxuICovXG5mdW5jdGlvbiB0cmFja2VyKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpIHtcblxuICAgIHRoaXMubWVhc3VyZUxlbmd0aCA9IDE2O1xuICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQgPSBzY2hlZHVsZUF1ZGlvQmVhdDtcbiAgICB0aGlzLnNjaGVkdWxlRm9yd2FyZCA9IDAuMTtcbiAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgIHRoaXMuZXZlbnRNYXAgPSB7fTtcbiAgICB0aGlzLmNsb2NrID0gbmV3IFdBQUNsb2NrKGN0eCk7XG4gICAgdGhpcy5jbG9jay5zdGFydCgpO1xuICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogRHJhdyBhIHRyYWNrZXIgdGFibGUgYnkgbnVtUm93cyBhbmQgbnVtQ29sc1xuICAgICAqL1xuICAgIHRoaXMuZHJhd1RyYWNrZXIgPSBmdW5jdGlvbihudW1Sb3dzLCBudW1Db2xzLCBkYXRhKSB7XG4gICAgICAgIFxuICAgICAgICBsZXQgaHRtbFRhYmxlID0gbmV3IHRyYWNrZXJUYWJsZSgpO1xuXG4gICAgICAgIGh0bWxUYWJsZS5zZXRSb3dzKG51bVJvd3MsIG51bUNvbHMsIGRhdGEpO1xuICAgICAgICBsZXQgc3RyID0gaHRtbFRhYmxlLmdldFRhYmxlKCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0cmFja2VyLXBhcmVudCcpO1xuICAgICAgICB0LmlubmVySFRNTCA9ICcnO1xuICAgICAgICB0Lmluc2VydEFkamFjZW50SFRNTCgnYWZ0ZXJiZWdpbicsIHN0cik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHVzaCBjdXJyZW50IGJlYXQgb25lIGZvcndhcmRcbiAgICAgKi9cbiAgICB0aGlzLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudCsrO1xuICAgICAgICBpZiAodGhpcy5jdXJyZW50ID49IHRoaXMubWVhc3VyZUxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgbWlsbGkgc2Vjb25kcyBwZXIgYmVhdFxuICAgICAqL1xuICAgIHRoaXMubWlsbGlQZXJCZWF0ID0gZnVuY3Rpb24gKGJlYXRzKSB7XG4gICAgICAgIGlmICghYmVhdHMpIHtcbiAgICAgICAgICAgIGJlYXRzID0gNjA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDEwMDAgKiA2MCAvIGJlYXRzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYSB0cmFja2VyIHJvdyBmcm9tIGEgY2VsbC1pZFxuICAgICAqL1xuICAgIHRoaXMuZ2V0VHJhY2tlclJvd1ZhbHVlcyA9IGZ1bmN0aW9uIChjb2xJZCkge1xuICAgICAgICBsZXQgdmFsdWVzID0gW107XG4gICAgICAgIGxldCBzZWxlY3RvciA9IGBbZGF0YS1jb2wtaWQ9XCIke2NvbElkfVwiXWA7XG5cbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGVsZW1zLmZvckVhY2goKGVsKSA9PiB7XG4gICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgZWwuZGF0YXNldCk7XG4gICAgICAgICAgICB2YWwuZW5hYmxlZCA9IGVsLmNsYXNzTGlzdC5jb250YWlucygndHJhY2tlci1lbmFibGVkJyk7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh2YWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2NoZWR1bGUgYSBiZWF0IGNvbHVtblxuICAgICAqL1xuICAgIHRoaXMuc2NoZWR1bGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBiZWF0Q29sdW1uID0gdGhpcy5nZXRUcmFja2VyUm93VmFsdWVzKHRoaXMuY3VycmVudCk7XG4gICAgICAgIGxldCBub3cgPSBjdHguY3VycmVudFRpbWU7XG5cbiAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLWNvbC1pZD1cIiR7dGhpcy5jdXJyZW50fVwiXWA7XG5cbiAgICAgICAgbGV0IGV2ZW50ID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIGVsZW1zLmZvckVhY2goIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5jbGFzc0xpc3QuYWRkKCd0cmFja2VyLWN1cnJlbnQnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQpO1xuXG4gICAgICAgIHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgICAgICBlbGVtcy5mb3JFYWNoKCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZSgndHJhY2tlci1jdXJyZW50JylcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0sIG5vdyArIHRoaXMuc2NoZWR1bGVGb3J3YXJkICsgdGhpcy5taWxsaVBlckJlYXQodGhpcy5icG0pIC8gMTAwMCk7XG5cbiAgICAgICAgYmVhdENvbHVtbi5mb3JFYWNoKChiZWF0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlQmVhdChiZWF0LCBub3cpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5zY2hlZHVsZUJlYXQgPSBmdW5jdGlvbiAoYmVhdCwgbm93KSB7XG5cbiAgICAgICAgbGV0IHRyaWdnZXJUaW1lID0gbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQ7XG4gICAgICAgIHRoaXMuc2NoZWR1bGVNYXBbYmVhdC5jb2xJZF0gPSB0cmlnZ2VyVGltZTtcbiAgICAgICAgaWYgKGJlYXQuZW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXSA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICAgICAgfSwgbm93KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlTWFwID0ge307XG5cbiAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0Tm93ID0gZnVuY3Rpb24gKGJlYXQpIHtcblxuICAgICAgICBpZiAoYmVhdC5lbmFibGVkKSB7XG4gICAgICAgICAgICBsZXQgYmVhdEV2ZW50ID0gdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIGlmIChiZWF0RXZlbnQpIHtcbiAgICAgICAgICAgICAgICBiZWF0RXZlbnQuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB0cmlnZ2VyVGltZSA9IHRoaXMuc2NoZWR1bGVNYXBbMF0gKyBiZWF0LmNvbElkICogdGhpcy5taWxsaVBlckJlYXQodGhpcy5icG0pIC8gMTAwMDtcbiAgICAgICAgbGV0IG5vdyA9IGN0eC5jdXJyZW50VGltZTtcbiAgICAgICAgdGhpcy5ldmVudE1hcFt0aGlzLmdldEV2ZW50S2V5KGJlYXQpXSA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdChiZWF0LCB0cmlnZ2VyVGltZSk7XG4gICAgICAgIH0sIG5vdyk7XG4gICAgfTtcblxuICAgIHRoaXMuaW50ZXJ2YWw7XG4gICAgdGhpcy5ydW5TY2hlZHVsZSA9IGZ1bmN0aW9uIChicG0pIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5icG0gPSBicG07XG4gICAgICAgIGxldCBpbnRlcnZhbCA9IHRoaXMubWlsbGlQZXJCZWF0KGJwbSk7XG5cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgICAgfSwgMCk7XG5cbiAgICAgICAgdGhpcy5pbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGUoKTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuXG4gICAgICAgIH0sIGludGVydmFsKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmludGVydmFsKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRFdmVudEtleSA9IGZ1bmN0aW9uIGdldEV2ZW50S2V5KGJlYXQpIHtcbiAgICAgICAgcmV0dXJuIGJlYXQucm93SWQgKyBiZWF0LmNvbElkO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdHJhY2tlciB2YWx1ZXNcbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWNrZXJWYWx1ZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRyYWNrZXItY2VsbCcpO1xuICAgICAgICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgZS5kYXRhc2V0KTtcbiAgICAgICAgICAgIHZhbC5lbmFibGVkID0gaGFzQ2xhc3MoZSwgXCJ0cmFja2VyLWVuYWJsZWRcIik7XG4gICAgICAgICAgICB2YWx1ZXMucHVzaCh2YWwpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTG9hZCB0cmFja2VyIHZhbHVlcyBpbiBKU09OIGZvcm1hdFxuICAgICAqL1xuICAgIHRoaXMubG9hZFRyYWNrZXJWYWx1ZXMgPSBmdW5jdGlvbiAoanNvbikge1xuXG4gICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy50cmFja2VyLWVuYWJsZWQnKTtcbiAgICAgICAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLmNsYXNzTGlzdC5yZW1vdmUoJ3RyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICBqc29uLmZvckVhY2goZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhLmVuYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBsZXQgc2VsZWN0b3IgPSBgLnRyYWNrZXItY2VsbFtkYXRhLXJvdy1pZD1cIiR7ZGF0YS5yb3dJZH1cIl1bZGF0YS1jb2wtaWQ9XCIke2RhdGEuY29sSWR9XCJdYDtcbiAgICAgICAgICAgICAgICBsZXQgZWxlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2xhc3NMaXN0LmFkZChcInRyYWNrZXItZW5hYmxlZFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBMaXN0ZW4gb24gdHJhY2tlci1jZWxsXG4gICAgICogU2NoZWR1bGUgaWYgY2VsbCBpcyBjbGlja2VkIGFuZCB0b2dnbGUgY3NzIGNsYXNzXG4gICAgICovXG4gICAgdGhpcy5zZXR1cEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgXG4gICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy50cmFja2VyLWNlbGwnKTtcbiAgICAgICAgXG4gICAgICAgIGVsZW1zLmZvckVhY2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIGUudGFyZ2V0LmRhdGFzZXQpO1xuICAgICAgICAgICAgICAgIHZhbC5lbmFibGVkID0gaGFzQ2xhc3MoZS50YXJnZXQsIFwidHJhY2tlci1lbmFibGVkXCIpO1xuICAgICAgICAgICAgICAgIGxldCBjdXJyZW50QmVhdCA9IGUudGFyZ2V0LmRhdGFzZXQuY29sSWQ7XG4gICAgICAgICAgICAgICAgaWYgKHZhbC5jb2xJZCA+IGN1cnJlbnRCZWF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXROb3codmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZS50YXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSgndHJhY2tlci1lbmFibGVkJyk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0cmFja2VyOyIsImZ1bmN0aW9uIHRyYWNrZXJUYWJsZSgpIHtcblxuICAgIHRoaXMuc3RyID0gJyc7XG4gICAgdGhpcy5nZXRUYWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICc8dGFibGUgaWQ9XCJ0cmFja2VyLXRhYmxlXCI+JyArIHRoaXMuc3RyICsgJzwvdGFibGU+JztcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRIZWFkZXIgPSBmdW5jdGlvbiAobnVtUm93cywgZGF0YSkge1xuICAgICAgICB0aGlzLnN0ciArPSBgPHRyIGNsYXNzPVwidHJhY2tlci1yb3cgaGVhZGVyXCI+YDtcbiAgICAgICAgdGhpcy5zdHIgKz0gdGhpcy5nZXRDZWxscygnaGVhZGVyJywgbnVtUm93cywgeyBoZWFkZXI6IHRydWUgfSk7XG4gICAgICAgIHRoaXMuc3RyICs9IGA8L3RyPmA7XG5cbiAgICB9O1xuXG4gICAgdGhpcy5zZXRSb3dzID0gZnVuY3Rpb24gKG51bVJvd3MsIG51bUNvbHMsIGRhdGEpIHtcblxuICAgICAgICB0aGlzLnNldEhlYWRlcihudW1Db2xzLCBkYXRhKTtcbiAgICAgICAgZm9yIChsZXQgcm93SUQgPSAwOyByb3dJRCA8IG51bVJvd3M7IHJvd0lEKyspIHtcbiAgICAgICAgICAgIHRoaXMuc3RyICs9IGA8dHIgY2xhc3M9XCJ0cmFja2VyLXJvd1wiIGRhdGEtaWQ9XCIke3Jvd0lEfVwiPmA7XG4gICAgICAgICAgICB0aGlzLnN0ciArPSB0aGlzLmdldENlbGxzKHJvd0lELCBudW1Db2xzLCBkYXRhKTtcbiAgICAgICAgICAgIHRoaXMuc3RyICs9IGA8L3RyPmA7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRGaXJzdENlbGwgPSBmdW5jdGlvbiAocm93SUQsIGRhdGEpIHtcbiAgICAgICAgdmFyIHN0ciA9ICcnO1xuICAgICAgICBcbiAgICAgICAgc3RyICs9IGA8dGQgY2xhc3M9XCJ0cmFja2VyLWZpcnN0LWNlbGxcIiBkYXRhLXJvdy1pZD1cIiR7cm93SUR9XCI+YDtcbiAgICAgICAgaWYgKGRhdGEudGl0bGUpIHsgXG4gICAgICAgICAgICBzdHIgKz0gZGF0YS50aXRsZVtyb3dJRF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN0ciArPSBgPC90ZD5gO1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH07XG5cbiAgICB0aGlzLmdldENlbGxzID0gZnVuY3Rpb24gKHJvd0lELCBudW1Sb3dzLCBkYXRhKSB7XG4gICAgICAgIHZhciBzdHIgPSAnJztcblxuICAgICAgICBzdHIgKz0gdGhpcy5nZXRGaXJzdENlbGwocm93SUQsIGRhdGEpO1xuXG4gICAgICAgIGxldCBjc3NDbGFzcyA9ICd0cmFja2VyLWNlbGwnXG5cbiAgICAgICAgaWYgKHJvd0lEID09ICdoZWFkZXInKSB7XG4gICAgICAgICAgICBjc3NDbGFzcyA9ICd0cmFja2VyLWNlbGwtaGVhZGVyJ1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBudW1Sb3dzOyBjKyspIHtcbiAgICAgICAgICAgIHN0ciArPSBgPHRkIGNsYXNzPVwiJHtjc3NDbGFzc31cIiBkYXRhLXJvdy1pZD1cIiR7cm93SUR9XCIgZGF0YS1jb2wtaWQ9XCIke2N9XCI+YDtcbiAgICAgICAgICAgIGlmIChkYXRhLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIHN0ciArPSBjICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0ciArPSBgPC90ZD5gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0cmFja2VyVGFibGU7XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIl19
