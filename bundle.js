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
        gain.mode = 'linearRampToValueAtTime';
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

    this.alert = function (message) {
        let appMessage = document.getElementById('app-message');

        appMessage.innerHTML = message
        appMessage.style.display = 'block'
        setTimeout(function () {
            appMessage.style.display = 'none'
        }, 2000)
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

            this.alert(`The track has been saved to local storage as <strong>${filename}</strong>`)

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

            this.alert(`Track has been deleted`)

        });
    };
}

},{"./default-track":14,"./get-set-controls":15,"./simple-tracker":16,"adsr-gain-node":1,"file-saver":3,"get-set-form-values":5,"load-sample-set":7,"select-element":10}],14:[function(require,module,exports){
module.exports = {
  beat: [
    { rowId: "0", colId: "0", enabled: false },
    { rowId: "0", colId: "1", enabled: false },
    { rowId: "0", colId: "2", enabled: false },
    { rowId: "0", colId: "3", enabled: false },
    { rowId: "0", colId: "4", enabled: false },
    { rowId: "0", colId: "5", enabled: false },
    { rowId: "0", colId: "6", enabled: false },
    { rowId: "0", colId: "7", enabled: false },
    { rowId: "0", colId: "8", enabled: false },
    { rowId: "0", colId: "9", enabled: false },
    { rowId: "0", colId: "10", enabled: false },
    { rowId: "0", colId: "11", enabled: false },
    { rowId: "0", colId: "12", enabled: false },
    { rowId: "0", colId: "13", enabled: false },
    { rowId: "0", colId: "14", enabled: false },
    { rowId: "0", colId: "15", enabled: false },
    { rowId: "0", colId: "16", enabled: false },
    { rowId: "0", colId: "17", enabled: false },
    { rowId: "0", colId: "18", enabled: false },
    { rowId: "0", colId: "19", enabled: false },
    { rowId: "0", colId: "20", enabled: false },
    { rowId: "0", colId: "21", enabled: false },
    { rowId: "0", colId: "22", enabled: false },
    { rowId: "0", colId: "23", enabled: false },
    { rowId: "0", colId: "24", enabled: false },
    { rowId: "0", colId: "25", enabled: false },
    { rowId: "0", colId: "26", enabled: false },
    { rowId: "0", colId: "27", enabled: false },
    { rowId: "0", colId: "28", enabled: false },
    { rowId: "0", colId: "29", enabled: false },
    { rowId: "0", colId: "30", enabled: false },
    { rowId: "0", colId: "31", enabled: false },
    { rowId: "1", colId: "0", enabled: false },
    { rowId: "1", colId: "1", enabled: false },
    { rowId: "1", colId: "2", enabled: false },
    { rowId: "1", colId: "3", enabled: false },
    { rowId: "1", colId: "4", enabled: false },
    { rowId: "1", colId: "5", enabled: false },
    { rowId: "1", colId: "6", enabled: false },
    { rowId: "1", colId: "7", enabled: false },
    { rowId: "1", colId: "8", enabled: false },
    { rowId: "1", colId: "9", enabled: false },
    { rowId: "1", colId: "10", enabled: false },
    { rowId: "1", colId: "11", enabled: false },
    { rowId: "1", colId: "12", enabled: false },
    { rowId: "1", colId: "13", enabled: false },
    { rowId: "1", colId: "14", enabled: false },
    { rowId: "1", colId: "15", enabled: false },
    { rowId: "1", colId: "16", enabled: false },
    { rowId: "1", colId: "17", enabled: false },
    { rowId: "1", colId: "18", enabled: false },
    { rowId: "1", colId: "19", enabled: false },
    { rowId: "1", colId: "20", enabled: false },
    { rowId: "1", colId: "21", enabled: false },
    { rowId: "1", colId: "22", enabled: false },
    { rowId: "1", colId: "23", enabled: false },
    { rowId: "1", colId: "24", enabled: false },
    { rowId: "1", colId: "25", enabled: false },
    { rowId: "1", colId: "26", enabled: false },
    { rowId: "1", colId: "27", enabled: false },
    { rowId: "1", colId: "28", enabled: false },
    { rowId: "1", colId: "29", enabled: false },
    { rowId: "1", colId: "30", enabled: false },
    { rowId: "1", colId: "31", enabled: false },
    { rowId: "2", colId: "0", enabled: false },
    { rowId: "2", colId: "1", enabled: false },
    { rowId: "2", colId: "2", enabled: false },
    { rowId: "2", colId: "3", enabled: false },
    { rowId: "2", colId: "4", enabled: true },
    { rowId: "2", colId: "5", enabled: false },
    { rowId: "2", colId: "6", enabled: false },
    { rowId: "2", colId: "7", enabled: false },
    { rowId: "2", colId: "8", enabled: false },
    { rowId: "2", colId: "9", enabled: false },
    { rowId: "2", colId: "10", enabled: false },
    { rowId: "2", colId: "11", enabled: false },
    { rowId: "2", colId: "12", enabled: false },
    { rowId: "2", colId: "13", enabled: false },
    { rowId: "2", colId: "14", enabled: false },
    { rowId: "2", colId: "15", enabled: false },
    { rowId: "2", colId: "16", enabled: false },
    { rowId: "2", colId: "17", enabled: false },
    { rowId: "2", colId: "18", enabled: false },
    { rowId: "2", colId: "19", enabled: false },
    { rowId: "2", colId: "20", enabled: false },
    { rowId: "2", colId: "21", enabled: false },
    { rowId: "2", colId: "22", enabled: false },
    { rowId: "2", colId: "23", enabled: true },
    { rowId: "2", colId: "24", enabled: false },
    { rowId: "2", colId: "25", enabled: false },
    { rowId: "2", colId: "26", enabled: false },
    { rowId: "2", colId: "27", enabled: false },
    { rowId: "2", colId: "28", enabled: false },
    { rowId: "2", colId: "29", enabled: false },
    { rowId: "2", colId: "30", enabled: false },
    { rowId: "2", colId: "31", enabled: false },
    { rowId: "3", colId: "0", enabled: false },
    { rowId: "3", colId: "1", enabled: true },
    { rowId: "3", colId: "2", enabled: false },
    { rowId: "3", colId: "3", enabled: false },
    { rowId: "3", colId: "4", enabled: false },
    { rowId: "3", colId: "5", enabled: false },
    { rowId: "3", colId: "6", enabled: true },
    { rowId: "3", colId: "7", enabled: false },
    { rowId: "3", colId: "8", enabled: false },
    { rowId: "3", colId: "9", enabled: false },
    { rowId: "3", colId: "10", enabled: false },
    { rowId: "3", colId: "11", enabled: false },
    { rowId: "3", colId: "12", enabled: false },
    { rowId: "3", colId: "13", enabled: false },
    { rowId: "3", colId: "14", enabled: false },
    { rowId: "3", colId: "15", enabled: false },
    { rowId: "3", colId: "16", enabled: false },
    { rowId: "3", colId: "17", enabled: true },
    { rowId: "3", colId: "18", enabled: false },
    { rowId: "3", colId: "19", enabled: false },
    { rowId: "3", colId: "20", enabled: false },
    { rowId: "3", colId: "21", enabled: false },
    { rowId: "3", colId: "22", enabled: false },
    { rowId: "3", colId: "23", enabled: false },
    { rowId: "3", colId: "24", enabled: false },
    { rowId: "3", colId: "25", enabled: false },
    { rowId: "3", colId: "26", enabled: false },
    { rowId: "3", colId: "27", enabled: false },
    { rowId: "3", colId: "28", enabled: false },
    { rowId: "3", colId: "29", enabled: false },
    { rowId: "3", colId: "30", enabled: false },
    { rowId: "3", colId: "31", enabled: false },
    { rowId: "4", colId: "0", enabled: true },
    { rowId: "4", colId: "1", enabled: false },
    { rowId: "4", colId: "2", enabled: true },
    { rowId: "4", colId: "3", enabled: false },
    { rowId: "4", colId: "4", enabled: false },
    { rowId: "4", colId: "5", enabled: false },
    { rowId: "4", colId: "6", enabled: false },
    { rowId: "4", colId: "7", enabled: false },
    { rowId: "4", colId: "8", enabled: false },
    { rowId: "4", colId: "9", enabled: false },
    { rowId: "4", colId: "10", enabled: false },
    { rowId: "4", colId: "11", enabled: false },
    { rowId: "4", colId: "12", enabled: true },
    { rowId: "4", colId: "13", enabled: false },
    { rowId: "4", colId: "14", enabled: true },
    { rowId: "4", colId: "15", enabled: false },
    { rowId: "4", colId: "16", enabled: false },
    { rowId: "4", colId: "17", enabled: false },
    { rowId: "4", colId: "18", enabled: false },
    { rowId: "4", colId: "19", enabled: false },
    { rowId: "4", colId: "20", enabled: false },
    { rowId: "4", colId: "21", enabled: true },
    { rowId: "4", colId: "22", enabled: false },
    { rowId: "4", colId: "23", enabled: false },
    { rowId: "4", colId: "24", enabled: false },
    { rowId: "4", colId: "25", enabled: true },
    { rowId: "4", colId: "26", enabled: false },
    { rowId: "4", colId: "27", enabled: false },
    { rowId: "4", colId: "28", enabled: false },
    { rowId: "4", colId: "29", enabled: false },
    { rowId: "4", colId: "30", enabled: false },
    { rowId: "4", colId: "31", enabled: false },
    { rowId: "5", colId: "0", enabled: false },
    { rowId: "5", colId: "1", enabled: false },
    { rowId: "5", colId: "2", enabled: false },
    { rowId: "5", colId: "3", enabled: false },
    { rowId: "5", colId: "4", enabled: true },
    { rowId: "5", colId: "5", enabled: false },
    { rowId: "5", colId: "6", enabled: false },
    { rowId: "5", colId: "7", enabled: true },
    { rowId: "5", colId: "8", enabled: false },
    { rowId: "5", colId: "9", enabled: false },
    { rowId: "5", colId: "10", enabled: false },
    { rowId: "5", colId: "11", enabled: true },
    { rowId: "5", colId: "12", enabled: false },
    { rowId: "5", colId: "13", enabled: false },
    { rowId: "5", colId: "14", enabled: false },
    { rowId: "5", colId: "15", enabled: true },
    { rowId: "5", colId: "16", enabled: false },
    { rowId: "5", colId: "17", enabled: false },
    { rowId: "5", colId: "18", enabled: false },
    { rowId: "5", colId: "19", enabled: true },
    { rowId: "5", colId: "20", enabled: false },
    { rowId: "5", colId: "21", enabled: false },
    { rowId: "5", colId: "22", enabled: false },
    { rowId: "5", colId: "23", enabled: false },
    { rowId: "5", colId: "24", enabled: false },
    { rowId: "5", colId: "25", enabled: false },
    { rowId: "5", colId: "26", enabled: false },
    { rowId: "5", colId: "27", enabled: false },
    { rowId: "5", colId: "28", enabled: false },
    { rowId: "5", colId: "29", enabled: false },
    { rowId: "5", colId: "30", enabled: false },
    { rowId: "5", colId: "31", enabled: false },
    { rowId: "6", colId: "0", enabled: false },
    { rowId: "6", colId: "1", enabled: false },
    { rowId: "6", colId: "2", enabled: false },
    { rowId: "6", colId: "3", enabled: false },
    { rowId: "6", colId: "4", enabled: false },
    { rowId: "6", colId: "5", enabled: false },
    { rowId: "6", colId: "6", enabled: false },
    { rowId: "6", colId: "7", enabled: false },
    { rowId: "6", colId: "8", enabled: false },
    { rowId: "6", colId: "9", enabled: false },
    { rowId: "6", colId: "10", enabled: false },
    { rowId: "6", colId: "11", enabled: false },
    { rowId: "6", colId: "12", enabled: false },
    { rowId: "6", colId: "13", enabled: false },
    { rowId: "6", colId: "14", enabled: false },
    { rowId: "6", colId: "15", enabled: false },
    { rowId: "6", colId: "16", enabled: false },
    { rowId: "6", colId: "17", enabled: false },
    { rowId: "6", colId: "18", enabled: false },
    { rowId: "6", colId: "19", enabled: false },
    { rowId: "6", colId: "20", enabled: false },
    { rowId: "6", colId: "21", enabled: false },
    { rowId: "6", colId: "22", enabled: false },
    { rowId: "6", colId: "23", enabled: false },
    { rowId: "6", colId: "24", enabled: false },
    { rowId: "6", colId: "25", enabled: false },
    { rowId: "6", colId: "26", enabled: false },
    { rowId: "6", colId: "27", enabled: true },
    { rowId: "6", colId: "28", enabled: false },
    { rowId: "6", colId: "29", enabled: false },
    { rowId: "6", colId: "30", enabled: false },
    { rowId: "6", colId: "31", enabled: true },
    { rowId: "7", colId: "0", enabled: false },
    { rowId: "7", colId: "1", enabled: false },
    { rowId: "7", colId: "2", enabled: false },
    { rowId: "7", colId: "3", enabled: false },
    { rowId: "7", colId: "4", enabled: false },
    { rowId: "7", colId: "5", enabled: false },
    { rowId: "7", colId: "6", enabled: false },
    { rowId: "7", colId: "7", enabled: false },
    { rowId: "7", colId: "8", enabled: false },
    { rowId: "7", colId: "9", enabled: true },
    { rowId: "7", colId: "10", enabled: false },
    { rowId: "7", colId: "11", enabled: false },
    { rowId: "7", colId: "12", enabled: false },
    { rowId: "7", colId: "13", enabled: false },
    { rowId: "7", colId: "14", enabled: false },
    { rowId: "7", colId: "15", enabled: false },
    { rowId: "7", colId: "16", enabled: false },
    { rowId: "7", colId: "17", enabled: false },
    { rowId: "7", colId: "18", enabled: false },
    { rowId: "7", colId: "19", enabled: false },
    { rowId: "7", colId: "20", enabled: false },
    { rowId: "7", colId: "21", enabled: false },
    { rowId: "7", colId: "22", enabled: false },
    { rowId: "7", colId: "23", enabled: false },
    { rowId: "7", colId: "24", enabled: false },
    { rowId: "7", colId: "25", enabled: false },
    { rowId: "7", colId: "26", enabled: false },
    { rowId: "7", colId: "27", enabled: false },
    { rowId: "7", colId: "28", enabled: false },
    { rowId: "7", colId: "29", enabled: false },
    { rowId: "7", colId: "30", enabled: false },
    { rowId: "7", colId: "31", enabled: false },
    { rowId: "8", colId: "0", enabled: false },
    { rowId: "8", colId: "1", enabled: false },
    { rowId: "8", colId: "2", enabled: false },
    { rowId: "8", colId: "3", enabled: false },
    { rowId: "8", colId: "4", enabled: false },
    { rowId: "8", colId: "5", enabled: false },
    { rowId: "8", colId: "6", enabled: false },
    { rowId: "8", colId: "7", enabled: false },
    { rowId: "8", colId: "8", enabled: false },
    { rowId: "8", colId: "9", enabled: false },
    { rowId: "8", colId: "10", enabled: false },
    { rowId: "8", colId: "11", enabled: false },
    { rowId: "8", colId: "12", enabled: false },
    { rowId: "8", colId: "13", enabled: false },
    { rowId: "8", colId: "14", enabled: false },
    { rowId: "8", colId: "15", enabled: false },
    { rowId: "8", colId: "16", enabled: false },
    { rowId: "8", colId: "17", enabled: false },
    { rowId: "8", colId: "18", enabled: false },
    { rowId: "8", colId: "19", enabled: false },
    { rowId: "8", colId: "20", enabled: false },
    { rowId: "8", colId: "21", enabled: false },
    { rowId: "8", colId: "22", enabled: false },
    { rowId: "8", colId: "23", enabled: false },
    { rowId: "8", colId: "24", enabled: false },
    { rowId: "8", colId: "25", enabled: false },
    { rowId: "8", colId: "26", enabled: false },
    { rowId: "8", colId: "27", enabled: false },
    { rowId: "8", colId: "28", enabled: false },
    { rowId: "8", colId: "29", enabled: true },
    { rowId: "8", colId: "30", enabled: false },
    { rowId: "8", colId: "31", enabled: false },
    { rowId: "9", colId: "0", enabled: false },
    { rowId: "9", colId: "1", enabled: false },
    { rowId: "9", colId: "2", enabled: false },
    { rowId: "9", colId: "3", enabled: false },
    { rowId: "9", colId: "4", enabled: false },
    { rowId: "9", colId: "5", enabled: false },
    { rowId: "9", colId: "6", enabled: false },
    { rowId: "9", colId: "7", enabled: false },
    { rowId: "9", colId: "8", enabled: false },
    { rowId: "9", colId: "9", enabled: false },
    { rowId: "9", colId: "10", enabled: false },
    { rowId: "9", colId: "11", enabled: false },
    { rowId: "9", colId: "12", enabled: false },
    { rowId: "9", colId: "13", enabled: false },
    { rowId: "9", colId: "14", enabled: false },
    { rowId: "9", colId: "15", enabled: false },
    { rowId: "9", colId: "16", enabled: false },
    { rowId: "9", colId: "17", enabled: false },
    { rowId: "9", colId: "18", enabled: false },
    { rowId: "9", colId: "19", enabled: false },
    { rowId: "9", colId: "20", enabled: false },
    { rowId: "9", colId: "21", enabled: false },
    { rowId: "9", colId: "22", enabled: false },
    { rowId: "9", colId: "23", enabled: false },
    { rowId: "9", colId: "24", enabled: false },
    { rowId: "9", colId: "25", enabled: false },
    { rowId: "9", colId: "26", enabled: false },
    { rowId: "9", colId: "27", enabled: false },
    { rowId: "9", colId: "28", enabled: false },
    { rowId: "9", colId: "29", enabled: false },
    { rowId: "9", colId: "30", enabled: false },
    { rowId: "9", colId: "31", enabled: false },
    { rowId: "10", colId: "0", enabled: false },
    { rowId: "10", colId: "1", enabled: false },
    { rowId: "10", colId: "2", enabled: false },
    { rowId: "10", colId: "3", enabled: false },
    { rowId: "10", colId: "4", enabled: false },
    { rowId: "10", colId: "5", enabled: false },
    { rowId: "10", colId: "6", enabled: false },
    { rowId: "10", colId: "7", enabled: false },
    { rowId: "10", colId: "8", enabled: false },
    { rowId: "10", colId: "9", enabled: false },
    { rowId: "10", colId: "10", enabled: false },
    { rowId: "10", colId: "11", enabled: false },
    { rowId: "10", colId: "12", enabled: false },
    { rowId: "10", colId: "13", enabled: false },
    { rowId: "10", colId: "14", enabled: false },
    { rowId: "10", colId: "15", enabled: false },
    { rowId: "10", colId: "16", enabled: false },
    { rowId: "10", colId: "17", enabled: false },
    { rowId: "10", colId: "18", enabled: false },
    { rowId: "10", colId: "19", enabled: false },
    { rowId: "10", colId: "20", enabled: false },
    { rowId: "10", colId: "21", enabled: false },
    { rowId: "10", colId: "22", enabled: false },
    { rowId: "10", colId: "23", enabled: false },
    { rowId: "10", colId: "24", enabled: false },
    { rowId: "10", colId: "25", enabled: false },
    { rowId: "10", colId: "26", enabled: false },
    { rowId: "10", colId: "27", enabled: false },
    { rowId: "10", colId: "28", enabled: false },
    { rowId: "10", colId: "29", enabled: false },
    { rowId: "10", colId: "30", enabled: false },
    { rowId: "10", colId: "31", enabled: false },
    { rowId: "11", colId: "0", enabled: false },
    { rowId: "11", colId: "1", enabled: false },
    { rowId: "11", colId: "2", enabled: false },
    { rowId: "11", colId: "3", enabled: false },
    { rowId: "11", colId: "4", enabled: false },
    { rowId: "11", colId: "5", enabled: false },
    { rowId: "11", colId: "6", enabled: false },
    { rowId: "11", colId: "7", enabled: false },
    { rowId: "11", colId: "8", enabled: false },
    { rowId: "11", colId: "9", enabled: false },
    { rowId: "11", colId: "10", enabled: false },
    { rowId: "11", colId: "11", enabled: false },
    { rowId: "11", colId: "12", enabled: false },
    { rowId: "11", colId: "13", enabled: false },
    { rowId: "11", colId: "14", enabled: false },
    { rowId: "11", colId: "15", enabled: false },
    { rowId: "11", colId: "16", enabled: false },
    { rowId: "11", colId: "17", enabled: false },
    { rowId: "11", colId: "18", enabled: false },
    { rowId: "11", colId: "19", enabled: false },
    { rowId: "11", colId: "20", enabled: false },
    { rowId: "11", colId: "21", enabled: false },
    { rowId: "11", colId: "22", enabled: false },
    { rowId: "11", colId: "23", enabled: false },
    { rowId: "11", colId: "24", enabled: false },
    { rowId: "11", colId: "25", enabled: false },
    { rowId: "11", colId: "26", enabled: false },
    { rowId: "11", colId: "27", enabled: false },
    { rowId: "11", colId: "28", enabled: false },
    { rowId: "11", colId: "29", enabled: false },
    { rowId: "11", colId: "30", enabled: false },
    { rowId: "11", colId: "31", enabled: false },
    { rowId: "12", colId: "0", enabled: false },
    { rowId: "12", colId: "1", enabled: false },
    { rowId: "12", colId: "2", enabled: false },
    { rowId: "12", colId: "3", enabled: false },
    { rowId: "12", colId: "4", enabled: false },
    { rowId: "12", colId: "5", enabled: false },
    { rowId: "12", colId: "6", enabled: false },
    { rowId: "12", colId: "7", enabled: false },
    { rowId: "12", colId: "8", enabled: false },
    { rowId: "12", colId: "9", enabled: false },
    { rowId: "12", colId: "10", enabled: false },
    { rowId: "12", colId: "11", enabled: false },
    { rowId: "12", colId: "12", enabled: false },
    { rowId: "12", colId: "13", enabled: false },
    { rowId: "12", colId: "14", enabled: false },
    { rowId: "12", colId: "15", enabled: false },
    { rowId: "12", colId: "16", enabled: false },
    { rowId: "12", colId: "17", enabled: false },
    { rowId: "12", colId: "18", enabled: false },
    { rowId: "12", colId: "19", enabled: false },
    { rowId: "12", colId: "20", enabled: false },
    { rowId: "12", colId: "21", enabled: false },
    { rowId: "12", colId: "22", enabled: false },
    { rowId: "12", colId: "23", enabled: true },
    { rowId: "12", colId: "24", enabled: false },
    { rowId: "12", colId: "25", enabled: true },
    { rowId: "12", colId: "26", enabled: false },
    { rowId: "12", colId: "27", enabled: false },
    { rowId: "12", colId: "28", enabled: false },
    { rowId: "12", colId: "29", enabled: false },
    { rowId: "12", colId: "30", enabled: false },
    { rowId: "12", colId: "31", enabled: false },
    { rowId: "13", colId: "0", enabled: false },
    { rowId: "13", colId: "1", enabled: false },
    { rowId: "13", colId: "2", enabled: false },
    { rowId: "13", colId: "3", enabled: false },
    { rowId: "13", colId: "4", enabled: false },
    { rowId: "13", colId: "5", enabled: false },
    { rowId: "13", colId: "6", enabled: false },
    { rowId: "13", colId: "7", enabled: false },
    { rowId: "13", colId: "8", enabled: false },
    { rowId: "13", colId: "9", enabled: false },
    { rowId: "13", colId: "10", enabled: false },
    { rowId: "13", colId: "11", enabled: false },
    { rowId: "13", colId: "12", enabled: false },
    { rowId: "13", colId: "13", enabled: false },
    { rowId: "13", colId: "14", enabled: false },
    { rowId: "13", colId: "15", enabled: false },
    { rowId: "13", colId: "16", enabled: false },
    { rowId: "13", colId: "17", enabled: false },
    { rowId: "13", colId: "18", enabled: false },
    { rowId: "13", colId: "19", enabled: false },
    { rowId: "13", colId: "20", enabled: false },
    { rowId: "13", colId: "21", enabled: false },
    { rowId: "13", colId: "22", enabled: false },
    { rowId: "13", colId: "23", enabled: false },
    { rowId: "13", colId: "24", enabled: true },
    { rowId: "13", colId: "25", enabled: false },
    { rowId: "13", colId: "26", enabled: false },
    { rowId: "13", colId: "27", enabled: false },
    { rowId: "13", colId: "28", enabled: true },
    { rowId: "13", colId: "29", enabled: false },
    { rowId: "13", colId: "30", enabled: false },
    { rowId: "13", colId: "31", enabled: false },
    { rowId: "14", colId: "0", enabled: false },
    { rowId: "14", colId: "1", enabled: false },
    { rowId: "14", colId: "2", enabled: false },
    { rowId: "14", colId: "3", enabled: false },
    { rowId: "14", colId: "4", enabled: false },
    { rowId: "14", colId: "5", enabled: false },
    { rowId: "14", colId: "6", enabled: false },
    { rowId: "14", colId: "7", enabled: false },
    { rowId: "14", colId: "8", enabled: false },
    { rowId: "14", colId: "9", enabled: false },
    { rowId: "14", colId: "10", enabled: false },
    { rowId: "14", colId: "11", enabled: false },
    { rowId: "14", colId: "12", enabled: false },
    { rowId: "14", colId: "13", enabled: false },
    { rowId: "14", colId: "14", enabled: false },
    { rowId: "14", colId: "15", enabled: false },
    { rowId: "14", colId: "16", enabled: false },
    { rowId: "14", colId: "17", enabled: false },
    { rowId: "14", colId: "18", enabled: false },
    { rowId: "14", colId: "19", enabled: false },
    { rowId: "14", colId: "20", enabled: false },
    { rowId: "14", colId: "21", enabled: false },
    { rowId: "14", colId: "22", enabled: false },
    { rowId: "14", colId: "23", enabled: false },
    { rowId: "14", colId: "24", enabled: false },
    { rowId: "14", colId: "25", enabled: false },
    { rowId: "14", colId: "26", enabled: true },
    { rowId: "14", colId: "27", enabled: false },
    { rowId: "14", colId: "28", enabled: false },
    { rowId: "14", colId: "29", enabled: false },
    { rowId: "14", colId: "30", enabled: false },
    { rowId: "14", colId: "31", enabled: false }
  ],
  settings: {
    sampleSet:
      "https://raw.githubusercontent.com/oramics/sampled/master/DRUMS/pearl-master-studio/sampled.instrument.json",
    measureLength: 32,
    bpm: 460,
    detune: 0,
    gainEnabled: "gain",
    attackAmp: 0,
    sustainAmp: 0.4,
    decayAmp: 0.7,
    releaseAmp: 1,
    attackTime: 0,
    decayTime: 0,
    sustainTime: 2,
    releaseTime: 2,
    adsrInterval: 0.1,
    delay: 0.01,
    filter: 1000
  }
};

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvZ2V0LWpzb24tcHJvbWlzZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nZXQtc2V0LWZvcm0tdmFsdWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2hhcy1jbGFzcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2FkLXNhbXBsZS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9hZC1zYW1wbGUtc2V0L25vZGVfbW9kdWxlcy90aW55LXNhbXBsZS1sb2FkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqLXR5cGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc2VsZWN0LWVsZW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svbGliL1dBQUNsb2NrLmpzIiwic3JjL2FwcC5qcyIsInNyYy9kZWZhdWx0LXRyYWNrLmpzIiwic3JjL2dldC1zZXQtY29udHJvbHMuanMiLCJzcmMvc2ltcGxlLXRyYWNrZXIuanMiLCJzcmMvdHJhY2tlci10YWJsZS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDek9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2ZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIEFkc3JHYWluTm9kZShjdHgpIHtcblxuICAgIHRoaXMuY3R4ID0gY3R4O1xuXG4gICAgdGhpcy5tb2RlID0gJ2V4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUnO1xuICAgIC8vIHRoaXMubW9kZSA9ICdsaW5lYXJSYW1wVG9WYWx1ZUF0VGltZSc7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICAgIGF0dGFja0FtcDogMC4xLCBcbiAgICAgICAgZGVjYXlBbXA6IDAuMyxcbiAgICAgICAgc3VzdGFpbkFtcDogMC43LFxuICAgICAgICByZWxlYXNlQW1wOiAwLjAxLFxuICAgICAgICBhdHRhY2tUaW1lOiAwLjEsXG4gICAgICAgIGRlY2F5VGltZTogMC4yLFxuICAgICAgICBzdXN0YWluVGltZTogMS4wLCBcbiAgICAgICAgcmVsZWFzZVRpbWU6IDMuNCxcbiAgICAgICAgYXV0b1JlbGVhc2U6IHRydWVcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0IG9wdGlvbnMgb3IgdXNlIGRlZmF1bHRzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgXG4gICAgICovXG4gICAgdGhpcy5zZXRPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zID0gT2JqZWN0LmFzc2lnbih0aGlzLm9wdGlvbnMsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICB0aGlzLmdhaW5Ob2RlXG4gICAgdGhpcy5hdWRpb1RpbWVcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgYSBnYWluIG5vZGUgZnJvbSBkZWZpbmVkIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Zsb2F0fSBhdWRpb1RpbWUgYW4gYXVkaW8gY29udGV4dCB0aW1lIHN0YW1wXG4gICAgICovXG4gICAgdGhpcy5nZXRHYWluTm9kZSA9ICAoYXVkaW9UaW1lKSA9PiB7XG5cbiAgICAgICAgdGhpcy5nYWluTm9kZSA9IHRoaXMuY3R4LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgdGhpcy5hdWRpb1RpbWUgPSBhdWRpb1RpbWVcblxuICAgICAgICAvLyBGaXJlZm94IGRvZXMgbm90IGxpa2UgMCAtPiB0aGVyZWZvciAwLjAwMDAwMDFcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnNldFZhbHVlQXRUaW1lKDAuMDAwMDAwMSwgYXVkaW9UaW1lKSAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBBdHRhY2tcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluW3RoaXMubW9kZV0oXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMuYXR0YWNrQW1wLCBcbiAgICAgICAgICAgIGF1ZGlvVGltZSArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lKVxuXG4gICAgICAgIC8vIERlY2F5XG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpblt0aGlzLm1vZGVdKFxuICAgICAgICAgICAgdGhpcy5vcHRpb25zLmRlY2F5QW1wLCBcbiAgICAgICAgICAgIGF1ZGlvVGltZSArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lICsgdGhpcy5vcHRpb25zLmRlY2F5VGltZSlcblxuICAgICAgICAvLyBTdXN0YWluXG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpblt0aGlzLm1vZGVdKFxuICAgICAgICAgICAgdGhpcy5vcHRpb25zLnN1c3RhaW5BbXAsIFxuICAgICAgICAgICAgYXVkaW9UaW1lICsgdGhpcy5vcHRpb25zLmF0dGFja1RpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUpXG4gXG4gICAgICAgIC8vIENoZWNrIGlmIGF1dG8tcmVsZWFzZVxuICAgICAgICAvLyBUaGVuIGNhbGN1bGF0ZSB3aGVuIG5vdGUgc2hvdWxkIHN0b3BcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUmVsZWFzZSkge1xuICAgICAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluW3RoaXMubW9kZV0oXG4gICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLnJlbGVhc2VBbXAsXG4gICAgICAgICAgICAgICAgYXVkaW9UaW1lICsgdGhpcy5yZWxlYXNlVGltZSgpXG4gICAgICAgICAgICApXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERpc2Nvbm5lY3QgdGhlIGdhaW4gbm9kZSBcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdChhdWRpb1RpbWUgKyB0aGlzLnJlbGVhc2VUaW1lKCkpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZ2Fpbk5vZGU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJlbGVhc2UgdGhlIG5vdGUgZHluYW1pY2FseVxuICAgICAqIEUuZy4gaWYgeW91ciBhcmUgbWFraW5nIGEga2V5Ym9hcmQsIGFuZCB5b3Ugd2FudCB0aGUgbm90ZVxuICAgICAqIHRvIGJlIHJlbGVhc2VkIGFjY29yZGluZyB0byBjdXJyZW50IGF1ZGlvIHRpbWUgKyB0aGUgQURTUiByZWxlYXNlIHRpbWUgXG4gICAgICovXG4gICAgdGhpcy5yZWxlYXNlTm93ID0gKCkgPT4ge1xuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW5bdGhpcy5tb2RlXShcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5yZWxlYXNlQW1wLFxuICAgICAgICAgICAgdGhpcy5jdHguY3VycmVudFRpbWUgKyB0aGlzLm9wdGlvbnMucmVsZWFzZVRpbWUpIFxuICAgICAgICB0aGlzLmRpc2Nvbm5lY3QodGhpcy5vcHRpb25zLnJlbGVhc2VUaW1lKVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCByZWxlYXNlIHRpbWUgYWNjb3JkaW5nIHRvIHRoZSBhZHNyIHJlbGVhc2UgdGltZVxuICAgICAqL1xuICAgIHRoaXMucmVsZWFzZVRpbWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lICsgdGhpcy5vcHRpb25zLmRlY2F5VGltZSArIHRoaXMub3B0aW9ucy5zdXN0YWluVGltZSArIHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCByZWxlYXNlIHRpbWUgYWNjb3JkaW5nIHRvICdub3cnXG4gICAgICovXG4gICAgdGhpcy5yZWxlYXNlVGltZU5vdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3R4LmN1cnJlbnRUaW1lICsgdGhpcy5yZWxlYXNlVGltZSgpXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7ZmxvYXR9IGRpc2Nvbm5lY3RUaW1lIHRoZSB0aW1lIHdoZW4gZ2Fpbk5vZGUgc2hvdWxkIGRpc2Nvbm5lY3QgXG4gICAgICovXG4gICAgdGhpcy5kaXNjb25uZWN0ID0gKGRpc2Nvbm5lY3RUaW1lKSA9PiB7XG4gICAgICAgIHNldFRpbWVvdXQoICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICB9LFxuICAgICAgICBkaXNjb25uZWN0VGltZSAqIDEwMDApO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQWRzckdhaW5Ob2RlO1xuIiwiLy8gRnJvbTogaHR0cHM6Ly9kZXYub3BlcmEuY29tL2FydGljbGVzL2RydW0tc291bmRzLXdlYmF1ZGlvL1xuZnVuY3Rpb24gYXVkaW9CdWZmZXJJbnN0cnVtZW50KGNvbnRleHQsIGJ1ZmZlcikge1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5idWZmZXIgPSBidWZmZXI7XG59XG5cbmF1ZGlvQnVmZmVySW5zdHJ1bWVudC5wcm90b3R5cGUuc2V0dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgdGhpcy5zb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgdGhpcy5zb3VyY2UuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pO1xufTtcblxuYXVkaW9CdWZmZXJJbnN0cnVtZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgdGhpcy5zb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlO1xufTtcblxuYXVkaW9CdWZmZXJJbnN0cnVtZW50LnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24gKHRpbWUpIHtcbiAgICB0aGlzLnNldHVwKCk7XG4gICAgdGhpcy5zb3VyY2Uuc3RhcnQodGltZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGF1ZGlvQnVmZmVySW5zdHJ1bWVudDsiLCIvKiBGaWxlU2F2ZXIuanNcbiAqIEEgc2F2ZUFzKCkgRmlsZVNhdmVyIGltcGxlbWVudGF0aW9uLlxuICogMS4zLjJcbiAqIDIwMTYtMDYtMTYgMTg6MjU6MTlcbiAqXG4gKiBCeSBFbGkgR3JleSwgaHR0cDovL2VsaWdyZXkuY29tXG4gKiBMaWNlbnNlOiBNSVRcbiAqICAgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGlncmV5L0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9MSUNFTlNFLm1kXG4gKi9cblxuLypnbG9iYWwgc2VsZiAqL1xuLypqc2xpbnQgYml0d2lzZTogdHJ1ZSwgaW5kZW50OiA0LCBsYXhicmVhazogdHJ1ZSwgbGF4Y29tbWE6IHRydWUsIHNtYXJ0dGFiczogdHJ1ZSwgcGx1c3BsdXM6IHRydWUgKi9cblxuLyohIEBzb3VyY2UgaHR0cDovL3B1cmwuZWxpZ3JleS5jb20vZ2l0aHViL0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9GaWxlU2F2ZXIuanMgKi9cblxudmFyIHNhdmVBcyA9IHNhdmVBcyB8fCAoZnVuY3Rpb24odmlldykge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0Ly8gSUUgPDEwIGlzIGV4cGxpY2l0bHkgdW5zdXBwb3J0ZWRcblx0aWYgKHR5cGVvZiB2aWV3ID09PSBcInVuZGVmaW5lZFwiIHx8IHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiYgL01TSUUgWzEtOV1cXC4vLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyXG5cdFx0ICBkb2MgPSB2aWV3LmRvY3VtZW50XG5cdFx0ICAvLyBvbmx5IGdldCBVUkwgd2hlbiBuZWNlc3NhcnkgaW4gY2FzZSBCbG9iLmpzIGhhc24ndCBvdmVycmlkZGVuIGl0IHlldFxuXHRcdCwgZ2V0X1VSTCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHZpZXcuVVJMIHx8IHZpZXcud2Via2l0VVJMIHx8IHZpZXc7XG5cdFx0fVxuXHRcdCwgc2F2ZV9saW5rID0gZG9jLmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIiwgXCJhXCIpXG5cdFx0LCBjYW5fdXNlX3NhdmVfbGluayA9IFwiZG93bmxvYWRcIiBpbiBzYXZlX2xpbmtcblx0XHQsIGNsaWNrID0gZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0dmFyIGV2ZW50ID0gbmV3IE1vdXNlRXZlbnQoXCJjbGlja1wiKTtcblx0XHRcdG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0fVxuXHRcdCwgaXNfc2FmYXJpID0gL2NvbnN0cnVjdG9yL2kudGVzdCh2aWV3LkhUTUxFbGVtZW50KSB8fCB2aWV3LnNhZmFyaVxuXHRcdCwgaXNfY2hyb21lX2lvcyA9L0NyaU9TXFwvW1xcZF0rLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpXG5cdFx0LCB0aHJvd19vdXRzaWRlID0gZnVuY3Rpb24oZXgpIHtcblx0XHRcdCh2aWV3LnNldEltbWVkaWF0ZSB8fCB2aWV3LnNldFRpbWVvdXQpKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aHJvdyBleDtcblx0XHRcdH0sIDApO1xuXHRcdH1cblx0XHQsIGZvcmNlX3NhdmVhYmxlX3R5cGUgPSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiXG5cdFx0Ly8gdGhlIEJsb2IgQVBJIGlzIGZ1bmRhbWVudGFsbHkgYnJva2VuIGFzIHRoZXJlIGlzIG5vIFwiZG93bmxvYWRmaW5pc2hlZFwiIGV2ZW50IHRvIHN1YnNjcmliZSB0b1xuXHRcdCwgYXJiaXRyYXJ5X3Jldm9rZV90aW1lb3V0ID0gMTAwMCAqIDQwIC8vIGluIG1zXG5cdFx0LCByZXZva2UgPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHR2YXIgcmV2b2tlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGZpbGUgPT09IFwic3RyaW5nXCIpIHsgLy8gZmlsZSBpcyBhbiBvYmplY3QgVVJMXG5cdFx0XHRcdFx0Z2V0X1VSTCgpLnJldm9rZU9iamVjdFVSTChmaWxlKTtcblx0XHRcdFx0fSBlbHNlIHsgLy8gZmlsZSBpcyBhIEZpbGVcblx0XHRcdFx0XHRmaWxlLnJlbW92ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0c2V0VGltZW91dChyZXZva2VyLCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQpO1xuXHRcdH1cblx0XHQsIGRpc3BhdGNoID0gZnVuY3Rpb24oZmlsZXNhdmVyLCBldmVudF90eXBlcywgZXZlbnQpIHtcblx0XHRcdGV2ZW50X3R5cGVzID0gW10uY29uY2F0KGV2ZW50X3R5cGVzKTtcblx0XHRcdHZhciBpID0gZXZlbnRfdHlwZXMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKGktLSkge1xuXHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBmaWxlc2F2ZXJbXCJvblwiICsgZXZlbnRfdHlwZXNbaV1dO1xuXHRcdFx0XHRpZiAodHlwZW9mIGxpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGlzdGVuZXIuY2FsbChmaWxlc2F2ZXIsIGV2ZW50IHx8IGZpbGVzYXZlcik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0XHRcdHRocm93X291dHNpZGUoZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQsIGF1dG9fYm9tID0gZnVuY3Rpb24oYmxvYikge1xuXHRcdFx0Ly8gcHJlcGVuZCBCT00gZm9yIFVURi04IFhNTCBhbmQgdGV4dC8qIHR5cGVzIChpbmNsdWRpbmcgSFRNTClcblx0XHRcdC8vIG5vdGU6IHlvdXIgYnJvd3NlciB3aWxsIGF1dG9tYXRpY2FsbHkgY29udmVydCBVVEYtMTYgVStGRUZGIHRvIEVGIEJCIEJGXG5cdFx0XHRpZiAoL15cXHMqKD86dGV4dFxcL1xcUyp8YXBwbGljYXRpb25cXC94bWx8XFxTKlxcL1xcUypcXCt4bWwpXFxzKjsuKmNoYXJzZXRcXHMqPVxccyp1dGYtOC9pLnRlc3QoYmxvYi50eXBlKSkge1xuXHRcdFx0XHRyZXR1cm4gbmV3IEJsb2IoW1N0cmluZy5mcm9tQ2hhckNvZGUoMHhGRUZGKSwgYmxvYl0sIHt0eXBlOiBibG9iLnR5cGV9KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBibG9iO1xuXHRcdH1cblx0XHQsIEZpbGVTYXZlciA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRpZiAoIW5vX2F1dG9fYm9tKSB7XG5cdFx0XHRcdGJsb2IgPSBhdXRvX2JvbShibG9iKTtcblx0XHRcdH1cblx0XHRcdC8vIEZpcnN0IHRyeSBhLmRvd25sb2FkLCB0aGVuIHdlYiBmaWxlc3lzdGVtLCB0aGVuIG9iamVjdCBVUkxzXG5cdFx0XHR2YXJcblx0XHRcdFx0ICBmaWxlc2F2ZXIgPSB0aGlzXG5cdFx0XHRcdCwgdHlwZSA9IGJsb2IudHlwZVxuXHRcdFx0XHQsIGZvcmNlID0gdHlwZSA9PT0gZm9yY2Vfc2F2ZWFibGVfdHlwZVxuXHRcdFx0XHQsIG9iamVjdF91cmxcblx0XHRcdFx0LCBkaXNwYXRjaF9hbGwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkaXNwYXRjaChmaWxlc2F2ZXIsIFwid3JpdGVzdGFydCBwcm9ncmVzcyB3cml0ZSB3cml0ZWVuZFwiLnNwbGl0KFwiIFwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gb24gYW55IGZpbGVzeXMgZXJyb3JzIHJldmVydCB0byBzYXZpbmcgd2l0aCBvYmplY3QgVVJMc1xuXHRcdFx0XHQsIGZzX2Vycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKChpc19jaHJvbWVfaW9zIHx8IChmb3JjZSAmJiBpc19zYWZhcmkpKSAmJiB2aWV3LkZpbGVSZWFkZXIpIHtcblx0XHRcdFx0XHRcdC8vIFNhZmFyaSBkb2Vzbid0IGFsbG93IGRvd25sb2FkaW5nIG9mIGJsb2IgdXJsc1xuXHRcdFx0XHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cdFx0XHRcdFx0XHRyZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB1cmwgPSBpc19jaHJvbWVfaW9zID8gcmVhZGVyLnJlc3VsdCA6IHJlYWRlci5yZXN1bHQucmVwbGFjZSgvXmRhdGE6W147XSo7LywgJ2RhdGE6YXR0YWNobWVudC9maWxlOycpO1xuXHRcdFx0XHRcdFx0XHR2YXIgcG9wdXAgPSB2aWV3Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG5cdFx0XHRcdFx0XHRcdGlmKCFwb3B1cCkgdmlldy5sb2NhdGlvbi5ocmVmID0gdXJsO1xuXHRcdFx0XHRcdFx0XHR1cmw9dW5kZWZpbmVkOyAvLyByZWxlYXNlIHJlZmVyZW5jZSBiZWZvcmUgZGlzcGF0Y2hpbmdcblx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0cmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYik7XG5cdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBkb24ndCBjcmVhdGUgbW9yZSBvYmplY3QgVVJMcyB0aGFuIG5lZWRlZFxuXHRcdFx0XHRcdGlmICghb2JqZWN0X3VybCkge1xuXHRcdFx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChmb3JjZSkge1xuXHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dmFyIG9wZW5lZCA9IHZpZXcub3BlbihvYmplY3RfdXJsLCBcIl9ibGFua1wiKTtcblx0XHRcdFx0XHRcdGlmICghb3BlbmVkKSB7XG5cdFx0XHRcdFx0XHRcdC8vIEFwcGxlIGRvZXMgbm90IGFsbG93IHdpbmRvdy5vcGVuLCBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIuYXBwbGUuY29tL2xpYnJhcnkvc2FmYXJpL2RvY3VtZW50YXRpb24vVG9vbHMvQ29uY2VwdHVhbC9TYWZhcmlFeHRlbnNpb25HdWlkZS9Xb3JraW5nd2l0aFdpbmRvd3NhbmRUYWJzL1dvcmtpbmd3aXRoV2luZG93c2FuZFRhYnMuaHRtbFxuXHRcdFx0XHRcdFx0XHR2aWV3LmxvY2F0aW9uLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0fVxuXHRcdFx0O1xuXHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuSU5JVDtcblxuXHRcdFx0aWYgKGNhbl91c2Vfc2F2ZV9saW5rKSB7XG5cdFx0XHRcdG9iamVjdF91cmwgPSBnZXRfVVJMKCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNhdmVfbGluay5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHRzYXZlX2xpbmsuZG93bmxvYWQgPSBuYW1lO1xuXHRcdFx0XHRcdGNsaWNrKHNhdmVfbGluayk7XG5cdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0fVxuXHRcdCwgRlNfcHJvdG8gPSBGaWxlU2F2ZXIucHJvdG90eXBlXG5cdFx0LCBzYXZlQXMgPSBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0cmV0dXJuIG5ldyBGaWxlU2F2ZXIoYmxvYiwgbmFtZSB8fCBibG9iLm5hbWUgfHwgXCJkb3dubG9hZFwiLCBub19hdXRvX2JvbSk7XG5cdFx0fVxuXHQ7XG5cdC8vIElFIDEwKyAobmF0aXZlIHNhdmVBcylcblx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiYgbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IpIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdG5hbWUgPSBuYW1lIHx8IGJsb2IubmFtZSB8fCBcImRvd25sb2FkXCI7XG5cblx0XHRcdGlmICghbm9fYXV0b19ib20pIHtcblx0XHRcdFx0YmxvYiA9IGF1dG9fYm9tKGJsb2IpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iKGJsb2IsIG5hbWUpO1xuXHRcdH07XG5cdH1cblxuXHRGU19wcm90by5hYm9ydCA9IGZ1bmN0aW9uKCl7fTtcblx0RlNfcHJvdG8ucmVhZHlTdGF0ZSA9IEZTX3Byb3RvLklOSVQgPSAwO1xuXHRGU19wcm90by5XUklUSU5HID0gMTtcblx0RlNfcHJvdG8uRE9ORSA9IDI7XG5cblx0RlNfcHJvdG8uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlc3RhcnQgPVxuXHRGU19wcm90by5vbnByb2dyZXNzID1cblx0RlNfcHJvdG8ub253cml0ZSA9XG5cdEZTX3Byb3RvLm9uYWJvcnQgPVxuXHRGU19wcm90by5vbmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZWVuZCA9XG5cdFx0bnVsbDtcblxuXHRyZXR1cm4gc2F2ZUFzO1xufShcblx0ICAgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgJiYgc2VsZlxuXHR8fCB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvd1xuXHR8fCB0aGlzLmNvbnRlbnRcbikpO1xuLy8gYHNlbGZgIGlzIHVuZGVmaW5lZCBpbiBGaXJlZm94IGZvciBBbmRyb2lkIGNvbnRlbnQgc2NyaXB0IGNvbnRleHRcbi8vIHdoaWxlIGB0aGlzYCBpcyBuc0lDb250ZW50RnJhbWVNZXNzYWdlTWFuYWdlclxuLy8gd2l0aCBhbiBhdHRyaWJ1dGUgYGNvbnRlbnRgIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHdpbmRvd1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cy5zYXZlQXMgPSBzYXZlQXM7XG59IGVsc2UgaWYgKCh0eXBlb2YgZGVmaW5lICE9PSBcInVuZGVmaW5lZFwiICYmIGRlZmluZSAhPT0gbnVsbCkgJiYgKGRlZmluZS5hbWQgIT09IG51bGwpKSB7XG4gIGRlZmluZShcIkZpbGVTYXZlci5qc1wiLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2F2ZUFzO1xuICB9KTtcbn1cbiIsImZ1bmN0aW9uIGdldEpTT05Qcm9taXNlKHVybCkge1xuXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgcmVxdWVzdC5vcGVuKCdnZXQnLCB1cmwsIHRydWUpO1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICd0ZXh0JztcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAocmVxdWVzdC5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ0pTT04gY291bGQgbm90IGJlIGxvYWRlZCAnICsgdXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvbWlzZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRKU09OUHJvbWlzZTtcbiIsImZ1bmN0aW9uIGdldEZvcm1WYWx1ZXMoZm9ybUVsZW1lbnQpIHtcbiAgICB2YXIgZm9ybUVsZW1lbnRzID0gZm9ybUVsZW1lbnQuZWxlbWVudHM7XG4gICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGVsZW0gPSBudWxsO1xuICAgIGZvciAoaSA9IDA7IGkgPCBmb3JtRWxlbWVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgZWxlbSA9IGZvcm1FbGVtZW50c1tpXTtcbiAgICAgICAgc3dpdGNoIChlbGVtLnR5cGUpIHtcblxuICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAncmFkaW8nOlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLmNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrYm94JzpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICAgICAgICAgIHZhciBzZWxlY3RWYWx1ZXMgPSBnZXRTZWxlY3RWYWx1ZXMoZWxlbSk7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IHNlbGVjdFZhbHVlcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmIChlbGVtLnZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybVBhcmFtc1tlbGVtLm5hbWVdID0gZWxlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZvcm1QYXJhbXM7XG59XG5cbmZ1bmN0aW9uIHNldEZvcm1WYWx1ZXMoZm9ybUVsZW1lbnQsIHZhbHVlcykge1xuICAgIHZhciBmb3JtRWxlbWVudHMgPSBmb3JtRWxlbWVudC5lbGVtZW50cztcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGVsZW0gPSBudWxsO1xuICAgIGZvciAoaSA9IDA7IGkgPCBmb3JtRWxlbWVudHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgZWxlbSA9IGZvcm1FbGVtZW50c1tpXTtcblxuICAgICAgICBzd2l0Y2ggKGVsZW0udHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnc3VibWl0JzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0gPT09IGVsZW0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdID09PSBlbGVtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0U2VsZWN0VmFsdWVzKGVsZW0sIHZhbHVlc1tlbGVtLm5hbWVdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0udmFsdWUgPSB2YWx1ZXNbZWxlbS5uYW1lXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gc2V0U2VsZWN0VmFsdWVzKHNlbGVjdEVsZW0sIHZhbHVlcykge1xuICAgIHZhciBvcHRpb25zID0gc2VsZWN0RWxlbS5vcHRpb25zO1xuICAgIHZhciBvcHQ7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IG9wdGlvbnMubGVuZ3RoOyBpIDwgaUxlbjsgaSsrKSB7XG4gICAgICAgIG9wdCA9IG9wdGlvbnNbaV07XG4gICAgICAgIGlmICh2YWx1ZXMuaW5kZXhPZihvcHQudmFsdWUpID4gLTEpIHtcbiAgICAgICAgICAgIG9wdC5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHQuc2VsZWN0ZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0U2VsZWN0VmFsdWVzKHNlbGVjdCkge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgb3B0aW9ucyA9IHNlbGVjdCAmJiBzZWxlY3Qub3B0aW9ucztcbiAgICB2YXIgb3B0O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBvcHRpb25zLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgICAgICBvcHQgPSBvcHRpb25zW2ldO1xuXG4gICAgICAgIGlmIChvcHQuc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKG9wdC52YWx1ZSB8fCBvcHQudGV4dCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZ2V0U2V0Rm9ybVZhbHVlcygpIHtcbiAgICB0aGlzLnNldCA9IHNldEZvcm1WYWx1ZXM7XG4gICAgdGhpcy5nZXQgPSBnZXRGb3JtVmFsdWVzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNldEZvcm1WYWx1ZXM7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgb2JqVHlwZSA9IHJlcXVpcmUoJ29iai10eXBlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGVsLCBzdHIpIHtcblx0aWYgKG9ialR5cGUoZWwpLmluZGV4T2YoJ2VsZW1lbnQnKSA9PT0gLTEpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBhbiBIVE1MIERPTSBlbGVtZW50IGFzIGZpcnN0IGFyZ3VtZW50Jyk7XG5cdH1cblxuXHRpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBhIHN0cmluZyBhcyBzZWNvbmQgYXJndW1lbnQnKTtcblx0fVxuXG5cdGlmIChlbC5jbGFzc0xpc3QpIHtcblx0XHRyZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKHN0cik7XG5cdH1cblxuXHRyZXR1cm4gbmV3IFJlZ0V4cCgnKF58ICknICsgc3RyICsgJyggfCQpJywgJ2dpJykudGVzdChlbC5jbGFzc05hbWUpO1xufTtcbiIsInZhciB0aW55U2FtcGxlTG9hZGVyID0gcmVxdWlyZSgndGlueS1zYW1wbGUtbG9hZGVyJyk7XG52YXIgYXVkaW9CdWZmZXJJbnN0cnVtZW50ID0gcmVxdWlyZSgnYXVkaW8tYnVmZmVyLWluc3RydW1lbnQnKTtcbnZhciBnZXRKU09OID0gcmVxdWlyZSgnZ2V0LWpzb24tcHJvbWlzZScpO1xuXG52YXIgYnVmZmVycyA9IHt9O1xuZnVuY3Rpb24gZ2V0U2FtcGxlUHJvbWlzZXMgKGN0eCwgZGF0YSkge1xuICAgIHZhciBiYXNlVXJsID0gZGF0YS5zYW1wbGVzO1xuICAgIHZhciBwcm9taXNlcyA9IFtdO1xuXG4gICAgZGF0YS5maWxlbmFtZSA9IFtdO1xuICAgIHZhciBpID0gMDtcbiAgICBkYXRhLmZpbGVzLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YXIgZmlsZW5hbWUgPSB2YWwucmVwbGFjZSgvXFwuW14vLl0rJC8sIFwiXCIpO1xuICAgICAgICBkYXRhLmZpbGVuYW1lLnB1c2goZmlsZW5hbWUpO1xuICAgICAgICB2YXIgcmVtb3RlVXJsID0gYmFzZVVybCArIHZhbDtcblxuICAgICAgICBsZXQgbG9hZGVyUHJvbWlzZSA9IHRpbnlTYW1wbGVMb2FkZXIoY3R4LCByZW1vdGVVcmwpO1xuICAgICAgICBsb2FkZXJQcm9taXNlLnRoZW4oZnVuY3Rpb24gKGJ1ZmZlcikge1xuICAgICAgICAgICAgYnVmZmVyc1tmaWxlbmFtZV0gPSBuZXcgYXVkaW9CdWZmZXJJbnN0cnVtZW50KGN0eCwgYnVmZmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcHJvbWlzZXMucHVzaChsb2FkZXJQcm9taXNlKTtcblxuICAgIH0pO1xuICAgIFxuICAgIHJldHVybiBwcm9taXNlcztcbn1cblxuZnVuY3Rpb24gc2FtcGxlQWxsUHJvbWlzZShjdHgsIGRhdGFVcmwpIHtcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdmFyIGpzb25Qcm9taXNlID0gZ2V0SlNPTihkYXRhVXJsKTtcbiAgICAgICAganNvblByb21pc2UudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICB2YXIgc2FtcGxlUHJvbWlzZXMgPSBnZXRTYW1wbGVQcm9taXNlcyhjdHgsIGRhdGEpO1xuICAgICAgICAgICAgUHJvbWlzZS5hbGwoc2FtcGxlUHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7ZGF0YTogZGF0YSwgYnVmZmVyczogYnVmZmVyc30pO1xuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLmNhdGNoIChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbmZ1bmN0aW9uIGxvYWRTYW1wbGVTZXQoY3R4LCBkYXRhVXJsKSB7XG4gICAgcmV0dXJuIHNhbXBsZUFsbFByb21pc2UoY3R4LCBkYXRhVXJsKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBsb2FkU2FtcGxlU2V0O1xuIiwiZnVuY3Rpb24gc2FtcGxlTG9hZGVyIChjb250ZXh0LCB1cmwpIHtcbiAgICBcbiAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsgXG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgXG4gICAgICAgIHJlcXVlc3Qub3BlbignZ2V0JywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKHJlcXVlc3Quc3RhdHVzID09PSAyMDApe1xuICAgICAgICAgICAgICAgIGNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShidWZmZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoJ3Rpbnktc2FtcGxlLWxvYWRlciByZXF1ZXN0IGZhaWxlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xuICAgIFxuICAgIHJldHVybiBwcm9taXNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzYW1wbGVMb2FkZXI7XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcblx0cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopLnJlcGxhY2UoL15cXFtvYmplY3QgKC4rKVxcXSQvLCAnJDEnKS50b0xvd2VyQ2FzZSgpO1xufTtcbiIsImZ1bmN0aW9uIHNlbGVjdEVsZW1lbnQoYXBwZW5kVG9JRCwgc2VsZWN0SUQsIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG5cbiAgICB0aGlzLmFwcGVuZFRvSUQgPSBhcHBlbmRUb0lEO1xuICAgIHRoaXMuc2VsZWN0SUQgPSBzZWxlY3RJRDtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuc2VsZWN0ZWQgPSBzZWxlY3RlZDtcblxuICAgIHRoaXMuc2VsZWN0TGlzdDtcbiAgICBcbiAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgICAgIHZhciBhcHBlbmRUb0lEID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdGhpcy5zZWxlY3RMaXN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNlbGVjdFwiKTtcbiAgICAgICAgdGhpcy5zZWxlY3RMaXN0LmlkID0gdGhpcy5zZWxlY3RJRDsgICAgICAgIFxuICAgICAgICBhcHBlbmRUb0lELmFwcGVuZENoaWxkKHRoaXMuc2VsZWN0TGlzdCk7XG4gICAgICAgIHRoaXMudXBkYXRlKHNlbGVjdElELCB0aGlzLm9wdGlvbnMsIHRoaXMuc2VsZWN0ZWQpO1xuICAgIH07XG5cbiAgICB0aGlzLm9uQ2hhbmdlID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0TGlzdC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgY2IodGhpcy52YWx1ZSlcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGUgPSBmdW5jdGlvbiAoZWxlbSwgb3B0aW9ucywgc2VsZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5kZWxldGUoZWxlbSk7XG4gICAgICAgIHZhciBzZWxlY3RMaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgb3B0aW9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm9wdGlvblwiKTtcbiAgICAgICAgICAgIG9wdGlvbi52YWx1ZSA9IGtleTtcbiAgICAgICAgICAgIG9wdGlvbi50ZXh0ID0gb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgc2VsZWN0TGlzdC5hcHBlbmRDaGlsZChvcHRpb24pO1xuXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBzZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgIG9wdGlvbi5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0U2VsZWN0ZWQgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICB2YXIgb3B0O1xuICAgICAgICBmb3IgKCB2YXIgaSA9IDAsIGxlbiA9IHNlbGVjdExpc3Qub3B0aW9ucy5sZW5ndGg7IGkgPCBsZW47IGkrKyApIHtcbiAgICAgICAgICAgIG9wdCA9IHNlbGVjdExpc3Qub3B0aW9uc1tpXTtcbiAgICAgICAgICAgIGlmICggb3B0LnNlbGVjdGVkID09PSB0cnVlICkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcHQudmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgXG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICB2YXIgc2VsZWN0TGlzdD1kb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgZm9yICh2YXIgb3B0aW9uIGluIHNlbGVjdExpc3Qpe1xuICAgICAgICAgICAgc2VsZWN0TGlzdC5yZW1vdmUob3B0aW9uKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgdGhpcy5nZXRBc1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmFwcGVuZFRvSUQpO1xuICAgICAgICB2YXIgZWxlbWVudEh0bWwgPSBlbGVtZW50Lm91dGVySFRNTDtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnRIdG1sO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2VsZWN0RWxlbWVudDsiLCJ2YXIgV0FBQ2xvY2sgPSByZXF1aXJlKCcuL2xpYi9XQUFDbG9jaycpXG5cbm1vZHVsZS5leHBvcnRzID0gV0FBQ2xvY2tcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgd2luZG93LldBQUNsb2NrID0gV0FBQ2xvY2tcbiIsInZhciBpc0Jyb3dzZXIgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG5cbnZhciBDTE9DS19ERUZBVUxUUyA9IHtcbiAgdG9sZXJhbmNlTGF0ZTogMC4xMCxcbiAgdG9sZXJhbmNlRWFybHk6IDAuMDAxXG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IEV2ZW50ID09PT09PT09PT09PT09PT09PT09IC8vXG52YXIgRXZlbnQgPSBmdW5jdGlvbihjbG9jaywgZGVhZGxpbmUsIGZ1bmMpIHtcbiAgdGhpcy5jbG9jayA9IGNsb2NrXG4gIHRoaXMuZnVuYyA9IGZ1bmNcbiAgdGhpcy5fY2xlYXJlZCA9IGZhbHNlIC8vIEZsYWcgdXNlZCB0byBjbGVhciBhbiBldmVudCBpbnNpZGUgY2FsbGJhY2tcblxuICB0aGlzLnRvbGVyYW5jZUxhdGUgPSBjbG9jay50b2xlcmFuY2VMYXRlXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBjbG9jay50b2xlcmFuY2VFYXJseVxuICB0aGlzLl9sYXRlc3RUaW1lID0gbnVsbFxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSBudWxsXG4gIHRoaXMuZGVhZGxpbmUgPSBudWxsXG4gIHRoaXMucmVwZWF0VGltZSA9IG51bGxcblxuICB0aGlzLnNjaGVkdWxlKGRlYWRsaW5lKVxufVxuXG4vLyBVbnNjaGVkdWxlcyB0aGUgZXZlbnRcbkV2ZW50LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICB0aGlzLl9jbGVhcmVkID0gdHJ1ZVxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBTZXRzIHRoZSBldmVudCB0byByZXBlYXQgZXZlcnkgYHRpbWVgIHNlY29uZHMuXG5FdmVudC5wcm90b3R5cGUucmVwZWF0ID0gZnVuY3Rpb24odGltZSkge1xuICBpZiAodGltZSA9PT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2RlbGF5IGNhbm5vdCBiZSAwJylcbiAgdGhpcy5yZXBlYXRUaW1lID0gdGltZVxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSlcbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gU2V0cyB0aGUgdGltZSB0b2xlcmFuY2Ugb2YgdGhlIGV2ZW50LlxuLy8gVGhlIGV2ZW50IHdpbGwgYmUgZXhlY3V0ZWQgaW4gdGhlIGludGVydmFsIGBbZGVhZGxpbmUgLSBlYXJseSwgZGVhZGxpbmUgKyBsYXRlXWBcbi8vIElmIHRoZSBjbG9jayBmYWlscyB0byBleGVjdXRlIHRoZSBldmVudCBpbiB0aW1lLCB0aGUgZXZlbnQgd2lsbCBiZSBkcm9wcGVkLlxuRXZlbnQucHJvdG90eXBlLnRvbGVyYW5jZSA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICBpZiAodHlwZW9mIHZhbHVlcy5sYXRlID09PSAnbnVtYmVyJylcbiAgICB0aGlzLnRvbGVyYW5jZUxhdGUgPSB2YWx1ZXMubGF0ZVxuICBpZiAodHlwZW9mIHZhbHVlcy5lYXJseSA9PT0gJ251bWJlcicpXG4gICAgdGhpcy50b2xlcmFuY2VFYXJseSA9IHZhbHVlcy5lYXJseVxuICB0aGlzLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMoKVxuICBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBldmVudCBpcyByZXBlYXRlZCwgZmFsc2Ugb3RoZXJ3aXNlXG5FdmVudC5wcm90b3R5cGUuaXNSZXBlYXRlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yZXBlYXRUaW1lICE9PSBudWxsIH1cblxuLy8gU2NoZWR1bGVzIHRoZSBldmVudCB0byBiZSByYW4gYmVmb3JlIGBkZWFkbGluZWAuXG4vLyBJZiB0aGUgdGltZSBpcyB3aXRoaW4gdGhlIGV2ZW50IHRvbGVyYW5jZSwgd2UgaGFuZGxlIHRoZSBldmVudCBpbW1lZGlhdGVseS5cbi8vIElmIHRoZSBldmVudCB3YXMgYWxyZWFkeSBzY2hlZHVsZWQgYXQgYSBkaWZmZXJlbnQgdGltZSwgaXQgaXMgcmVzY2hlZHVsZWQuXG5FdmVudC5wcm90b3R5cGUuc2NoZWR1bGUgPSBmdW5jdGlvbihkZWFkbGluZSkge1xuICB0aGlzLl9jbGVhcmVkID0gZmFsc2VcbiAgdGhpcy5kZWFkbGluZSA9IGRlYWRsaW5lXG4gIHRoaXMuX3JlZnJlc2hFYXJseUxhdGVEYXRlcygpXG5cbiAgaWYgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA+PSB0aGlzLl9lYXJsaWVzdFRpbWUpIHtcbiAgICB0aGlzLl9leGVjdXRlKClcbiAgXG4gIH0gZWxzZSBpZiAodGhpcy5jbG9jay5faGFzRXZlbnQodGhpcykpIHtcbiAgICB0aGlzLmNsb2NrLl9yZW1vdmVFdmVudCh0aGlzKVxuICAgIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG4gIFxuICB9IGVsc2UgdGhpcy5jbG9jay5faW5zZXJ0RXZlbnQodGhpcylcbn1cblxuRXZlbnQucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgcmF0aW8pIHtcbiAgaWYgKHRoaXMuaXNSZXBlYXRlZCgpKVxuICAgIHRoaXMucmVwZWF0VGltZSA9IHRoaXMucmVwZWF0VGltZSAqIHJhdGlvXG5cbiAgdmFyIGRlYWRsaW5lID0gdFJlZiArIHJhdGlvICogKHRoaXMuZGVhZGxpbmUgLSB0UmVmKVxuICAvLyBJZiB0aGUgZGVhZGxpbmUgaXMgdG9vIGNsb3NlIG9yIHBhc3QsIGFuZCB0aGUgZXZlbnQgaGFzIGEgcmVwZWF0LFxuICAvLyB3ZSBjYWxjdWxhdGUgdGhlIG5leHQgcmVwZWF0IHBvc3NpYmxlIGluIHRoZSBzdHJldGNoZWQgc3BhY2UuXG4gIGlmICh0aGlzLmlzUmVwZWF0ZWQoKSkge1xuICAgIHdoaWxlICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPj0gZGVhZGxpbmUgLSB0aGlzLnRvbGVyYW5jZUVhcmx5KVxuICAgICAgZGVhZGxpbmUgKz0gdGhpcy5yZXBlYXRUaW1lXG4gIH1cbiAgdGhpcy5zY2hlZHVsZShkZWFkbGluZSlcbn1cblxuLy8gRXhlY3V0ZXMgdGhlIGV2ZW50XG5FdmVudC5wcm90b3R5cGUuX2V4ZWN1dGUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuY2xvY2suX3N0YXJ0ZWQgPT09IGZhbHNlKSByZXR1cm5cbiAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcblxuICBpZiAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lIDwgdGhpcy5fbGF0ZXN0VGltZSlcbiAgICB0aGlzLmZ1bmModGhpcylcbiAgZWxzZSB7XG4gICAgaWYgKHRoaXMub25leHBpcmVkKSB0aGlzLm9uZXhwaXJlZCh0aGlzKVxuICAgIGNvbnNvbGUud2FybignZXZlbnQgZXhwaXJlZCcpXG4gIH1cbiAgLy8gSW4gdGhlIGNhc2UgYHNjaGVkdWxlYCBpcyBjYWxsZWQgaW5zaWRlIGBmdW5jYCwgd2UgbmVlZCB0byBhdm9pZFxuICAvLyBvdmVycndyaXRpbmcgd2l0aCB5ZXQgYW5vdGhlciBgc2NoZWR1bGVgLlxuICBpZiAoIXRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpICYmIHRoaXMuaXNSZXBlYXRlZCgpICYmICF0aGlzLl9jbGVhcmVkKVxuICAgIHRoaXMuc2NoZWR1bGUodGhpcy5kZWFkbGluZSArIHRoaXMucmVwZWF0VGltZSkgXG59XG5cbi8vIFVwZGF0ZXMgY2FjaGVkIHRpbWVzXG5FdmVudC5wcm90b3R5cGUuX3JlZnJlc2hFYXJseUxhdGVEYXRlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9sYXRlc3RUaW1lID0gdGhpcy5kZWFkbGluZSArIHRoaXMudG9sZXJhbmNlTGF0ZVxuICB0aGlzLl9lYXJsaWVzdFRpbWUgPSB0aGlzLmRlYWRsaW5lIC0gdGhpcy50b2xlcmFuY2VFYXJseVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBXQUFDbG9jayA9PT09PT09PT09PT09PT09PT09PSAvL1xudmFyIFdBQUNsb2NrID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRzKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuICBvcHRzID0gb3B0cyB8fCB7fVxuICB0aGlzLnRpY2tNZXRob2QgPSBvcHRzLnRpY2tNZXRob2QgfHwgJ1NjcmlwdFByb2Nlc3Nvck5vZGUnXG4gIHRoaXMudG9sZXJhbmNlRWFybHkgPSBvcHRzLnRvbGVyYW5jZUVhcmx5IHx8IENMT0NLX0RFRkFVTFRTLnRvbGVyYW5jZUVhcmx5XG4gIHRoaXMudG9sZXJhbmNlTGF0ZSA9IG9wdHMudG9sZXJhbmNlTGF0ZSB8fCBDTE9DS19ERUZBVUxUUy50b2xlcmFuY2VMYXRlXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHRcbiAgdGhpcy5fZXZlbnRzID0gW11cbiAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlXG59XG5cbi8vIC0tLS0tLS0tLS0gUHVibGljIEFQSSAtLS0tLS0tLS0tIC8vXG4vLyBTY2hlZHVsZXMgYGZ1bmNgIHRvIHJ1biBhZnRlciBgZGVsYXlgIHNlY29uZHMuXG5XQUFDbG9jay5wcm90b3R5cGUuc2V0VGltZW91dCA9IGZ1bmN0aW9uKGZ1bmMsIGRlbGF5KSB7XG4gIHJldHVybiB0aGlzLl9jcmVhdGVFdmVudChmdW5jLCB0aGlzLl9hYnNUaW1lKGRlbGF5KSlcbn1cblxuLy8gU2NoZWR1bGVzIGBmdW5jYCB0byBydW4gYmVmb3JlIGBkZWFkbGluZWAuXG5XQUFDbG9jay5wcm90b3R5cGUuY2FsbGJhY2tBdFRpbWUgPSBmdW5jdGlvbihmdW5jLCBkZWFkbGluZSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRXZlbnQoZnVuYywgZGVhZGxpbmUpXG59XG5cbi8vIFN0cmV0Y2hlcyBgZGVhZGxpbmVgIGFuZCBgcmVwZWF0YCBvZiBhbGwgc2NoZWR1bGVkIGBldmVudHNgIGJ5IGByYXRpb2AsIGtlZXBpbmdcbi8vIHRoZWlyIHJlbGF0aXZlIGRpc3RhbmNlIHRvIGB0UmVmYC4gSW4gZmFjdCB0aGlzIGlzIGVxdWl2YWxlbnQgdG8gY2hhbmdpbmcgdGhlIHRlbXBvLlxuV0FBQ2xvY2sucHJvdG90eXBlLnRpbWVTdHJldGNoID0gZnVuY3Rpb24odFJlZiwgZXZlbnRzLCByYXRpbykge1xuICBldmVudHMuZm9yRWFjaChmdW5jdGlvbihldmVudCkgeyBldmVudC50aW1lU3RyZXRjaCh0UmVmLCByYXRpbykgfSlcbiAgcmV0dXJuIGV2ZW50c1xufVxuXG4vLyBSZW1vdmVzIGFsbCBzY2hlZHVsZWQgZXZlbnRzIGFuZCBzdGFydHMgdGhlIGNsb2NrIFxuV0FBQ2xvY2sucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9zdGFydGVkID09PSBmYWxzZSkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIHRoaXMuX3N0YXJ0ZWQgPSB0cnVlXG4gICAgdGhpcy5fZXZlbnRzID0gW11cblxuICAgIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdTY3JpcHRQcm9jZXNzb3JOb2RlJykge1xuICAgICAgdmFyIGJ1ZmZlclNpemUgPSAyNTZcbiAgICAgIC8vIFdlIGhhdmUgdG8ga2VlcCBhIHJlZmVyZW5jZSB0byB0aGUgbm9kZSB0byBhdm9pZCBnYXJiYWdlIGNvbGxlY3Rpb25cbiAgICAgIHRoaXMuX2Nsb2NrTm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgMSwgMSlcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbilcbiAgICAgIHRoaXMuX2Nsb2NrTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHsgc2VsZi5fdGljaygpIH0pXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLnRpY2tNZXRob2QgPT09ICdtYW51YWwnKSBudWxsIC8vIF90aWNrIGlzIGNhbGxlZCBtYW51YWxseVxuXG4gICAgZWxzZSB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgdGlja01ldGhvZCAnICsgdGhpcy50aWNrTWV0aG9kKVxuICB9XG59XG5cbi8vIFN0b3BzIHRoZSBjbG9ja1xuV0FBQ2xvY2sucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuX3N0YXJ0ZWQgPT09IHRydWUpIHtcbiAgICB0aGlzLl9zdGFydGVkID0gZmFsc2VcbiAgICB0aGlzLl9jbG9ja05vZGUuZGlzY29ubmVjdCgpXG4gIH0gIFxufVxuXG4vLyAtLS0tLS0tLS0tIFByaXZhdGUgLS0tLS0tLS0tLSAvL1xuXG4vLyBUaGlzIGZ1bmN0aW9uIGlzIHJhbiBwZXJpb2RpY2FsbHksIGFuZCBhdCBlYWNoIHRpY2sgaXQgZXhlY3V0ZXNcbi8vIGV2ZW50cyBmb3Igd2hpY2ggYGN1cnJlbnRUaW1lYCBpcyBpbmNsdWRlZCBpbiB0aGVpciB0b2xlcmFuY2UgaW50ZXJ2YWwuXG5XQUFDbG9jay5wcm90b3R5cGUuX3RpY2sgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGV2ZW50ID0gdGhpcy5fZXZlbnRzLnNoaWZ0KClcblxuICB3aGlsZShldmVudCAmJiBldmVudC5fZWFybGllc3RUaW1lIDw9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZSkge1xuICAgIGV2ZW50Ll9leGVjdXRlKClcbiAgICBldmVudCA9IHRoaXMuX2V2ZW50cy5zaGlmdCgpXG4gIH1cblxuICAvLyBQdXQgYmFjayB0aGUgbGFzdCBldmVudFxuICBpZihldmVudCkgdGhpcy5fZXZlbnRzLnVuc2hpZnQoZXZlbnQpXG59XG5cbi8vIENyZWF0ZXMgYW4gZXZlbnQgYW5kIGluc2VydCBpdCB0byB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9jcmVhdGVFdmVudCA9IGZ1bmN0aW9uKGZ1bmMsIGRlYWRsaW5lKSB7XG4gIHJldHVybiBuZXcgRXZlbnQodGhpcywgZGVhZGxpbmUsIGZ1bmMpXG59XG5cbi8vIEluc2VydHMgYW4gZXZlbnQgdG8gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5faW5zZXJ0RXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICB0aGlzLl9ldmVudHMuc3BsaWNlKHRoaXMuX2luZGV4QnlUaW1lKGV2ZW50Ll9lYXJsaWVzdFRpbWUpLCAwLCBldmVudClcbn1cblxuLy8gUmVtb3ZlcyBhbiBldmVudCBmcm9tIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX3JlbW92ZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGluZCA9IHRoaXMuX2V2ZW50cy5pbmRleE9mKGV2ZW50KVxuICBpZiAoaW5kICE9PSAtMSkgdGhpcy5fZXZlbnRzLnNwbGljZShpbmQsIDEpXG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiBgZXZlbnRgIGlzIGluIHF1ZXVlLCBmYWxzZSBvdGhlcndpc2VcbldBQUNsb2NrLnByb3RvdHlwZS5faGFzRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuIHJldHVybiB0aGlzLl9ldmVudHMuaW5kZXhPZihldmVudCkgIT09IC0xXG59XG5cbi8vIFJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBmaXJzdCBldmVudCB3aG9zZSBkZWFkbGluZSBpcyA+PSB0byBgZGVhZGxpbmVgXG5XQUFDbG9jay5wcm90b3R5cGUuX2luZGV4QnlUaW1lID0gZnVuY3Rpb24oZGVhZGxpbmUpIHtcbiAgLy8gcGVyZm9ybXMgYSBiaW5hcnkgc2VhcmNoXG4gIHZhciBsb3cgPSAwXG4gICAgLCBoaWdoID0gdGhpcy5fZXZlbnRzLmxlbmd0aFxuICAgICwgbWlkXG4gIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgbWlkID0gTWF0aC5mbG9vcigobG93ICsgaGlnaCkgLyAyKVxuICAgIGlmICh0aGlzLl9ldmVudHNbbWlkXS5fZWFybGllc3RUaW1lIDwgZGVhZGxpbmUpXG4gICAgICBsb3cgPSBtaWQgKyAxXG4gICAgZWxzZSBoaWdoID0gbWlkXG4gIH1cbiAgcmV0dXJuIGxvd1xufVxuXG4vLyBDb252ZXJ0cyBmcm9tIHJlbGF0aXZlIHRpbWUgdG8gYWJzb2x1dGUgdGltZVxuV0FBQ2xvY2sucHJvdG90eXBlLl9hYnNUaW1lID0gZnVuY3Rpb24ocmVsVGltZSkge1xuICByZXR1cm4gcmVsVGltZSArIHRoaXMuY29udGV4dC5jdXJyZW50VGltZVxufVxuXG4vLyBDb252ZXJ0cyBmcm9tIGFic29sdXRlIHRpbWUgdG8gcmVsYXRpdmUgdGltZSBcbldBQUNsb2NrLnByb3RvdHlwZS5fcmVsVGltZSA9IGZ1bmN0aW9uKGFic1RpbWUpIHtcbiAgcmV0dXJuIGFic1RpbWUgLSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWVcbn0iLCJjb25zdCBsb2FkU2FtcGxlU2V0ID0gcmVxdWlyZSgnbG9hZC1zYW1wbGUtc2V0Jyk7XG5jb25zdCBzZWxlY3RFbGVtZW50ID0gcmVxdWlyZSgnc2VsZWN0LWVsZW1lbnQnKTtcbmNvbnN0IGdldFNldEZvcm1WYWx1ZXMgPSByZXF1aXJlKCdnZXQtc2V0LWZvcm0tdmFsdWVzJyk7XG5jb25zdCBhZHNyR2Fpbk5vZGUgPSByZXF1aXJlKCdhZHNyLWdhaW4tbm9kZScpO1xuY29uc3Qgc2ltcGxlVHJhY2tlciA9IHJlcXVpcmUoJy4vc2ltcGxlLXRyYWNrZXInKTtcbmNvbnN0IEZpbGVTYXZlciA9IHJlcXVpcmUoJ2ZpbGUtc2F2ZXInKTtcblxuY29uc3QgZ2V0U2V0Q29udHJvbHMgPSByZXF1aXJlKCcuL2dldC1zZXQtY29udHJvbHMnKTtcbmNvbnN0IGdldFNldEF1ZGlvT3B0aW9ucyA9IG5ldyBnZXRTZXRDb250cm9scygpO1xuXG5jb25zdCBjdHggPSBuZXcgQXVkaW9Db250ZXh0KCk7XG5jb25zdCBkZWZhdWx0VHJhY2sgPSByZXF1aXJlKCcuL2RlZmF1bHQtdHJhY2snKTtcblxudmFyIGJ1ZmZlcnM7XG52YXIgY3VycmVudFNhbXBsZURhdGE7XG52YXIgc3RvcmFnZTtcblxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIGRhdGFVcmwsIHRyYWNrKSB7XG5cbiAgICB2YXIgc2FtcGxlU2V0UHJvbWlzZSA9IGxvYWRTYW1wbGVTZXQoY3R4LCBkYXRhVXJsKTtcbiAgICBzYW1wbGVTZXRQcm9taXNlLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcblxuICAgICAgICBidWZmZXJzID0gZGF0YS5idWZmZXJzO1xuICAgICAgICBzYW1wbGVEYXRhID0gZGF0YS5kYXRhO1xuXG4gICAgICAgIGlmICghdHJhY2spIHtcbiAgICAgICAgICAgIHRyYWNrID0gc3RvcmFnZS5nZXRUcmFjaygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoKSB7XG4gICAgICAgICAgICB0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoID0gMTY7XG4gICAgICAgIH1cblxuICAgICAgICBjdXJyZW50U2FtcGxlRGF0YSA9IHNhbXBsZURhdGE7XG4gICAgICAgIHNldHVwVHJhY2tlckh0bWwoc2FtcGxlRGF0YSwgdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCk7XG4gICAgICAgIHNjaGVkdWxlLmxvYWRUcmFja2VyVmFsdWVzKHRyYWNrLmJlYXQpO1xuICAgICAgICBzY2hlZHVsZS5zZXR1cEV2ZW50cygpO1xuICAgIH0pO1xuICAgXG59XG5cbndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgbGV0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXJDb250cm9sc1wiKTtcblxuICAgIGZvcm1WYWx1ZXMuc2V0KGZvcm0sIGRlZmF1bHRUcmFjay5zZXR0aW5ncyk7XG4gICAgZ2V0U2V0QXVkaW9PcHRpb25zLnNldFRyYWNrZXJDb250cm9scyhkZWZhdWx0VHJhY2suc2V0dGluZ3MpO1xuXG4gICAgaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIGRlZmF1bHRUcmFjay5zZXR0aW5ncy5zYW1wbGVTZXQsIGRlZmF1bHRUcmFjayk7XG4gICAgc2V0dXBCYXNlRXZlbnRzKCk7XG5cbiAgICBzdG9yYWdlID0gbmV3IHRyYWNrc0xvY2FsU3RvcmFnZSgpO1xuICAgIHN0b3JhZ2Uuc2V0dXBTdG9yYWdlKCk7XG59O1xuXG52YXIgaW5zdHJ1bWVudERhdGEgPSB7fTtcbmZ1bmN0aW9uIHNldHVwVHJhY2tlckh0bWwoZGF0YSwgbWVhc3VyZUxlbmd0aCkge1xuICAgIGluc3RydW1lbnREYXRhID0gZGF0YTtcbiAgICBpbnN0cnVtZW50RGF0YS50aXRsZSA9IGluc3RydW1lbnREYXRhLmZpbGVuYW1lO1xuICAgIHNjaGVkdWxlLmRyYXdUcmFja2VyKGRhdGEuZmlsZW5hbWUubGVuZ3RoLCBtZWFzdXJlTGVuZ3RoLCBpbnN0cnVtZW50RGF0YSk7XG4gICAgcmV0dXJuO1xufVxuXG5mdW5jdGlvbiBkaXNjb25uZWN0Tm9kZShub2RlLCBvcHRpb25zKSB7XG4gICAgbGV0IHRvdGFsTGVuZ3RoID1cbiAgICAgICAgb3B0aW9ucy5hdHRhY2tUaW1lICsgb3B0aW9ucy5zdXN0YWluVGltZSArIG9wdGlvbnMucmVsZWFzZVRpbWU7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIG5vZGUuZGlzY29ubmVjdCgpO1xuICAgIH0sIHRvdGFsTGVuZ3RoICogMTAwMCk7XG59XG5cbmZ1bmN0aW9uIHNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKSB7XG5cbiAgICBsZXQgaW5zdHJ1bWVudE5hbWUgPSBpbnN0cnVtZW50RGF0YS5maWxlbmFtZVtiZWF0LnJvd0lkXTtcbiAgICBsZXQgaW5zdHJ1bWVudCA9IGJ1ZmZlcnNbaW5zdHJ1bWVudE5hbWVdLmdldCgpO1xuICAgIGxldCBvcHRpb25zID0gZ2V0U2V0QXVkaW9PcHRpb25zLmdldFRyYWNrZXJDb250cm9scygpO1xuXG5cbiAgICBmdW5jdGlvbiBwbGF5KHNvdXJjZSkge1xuXG4gICAgICAgIHNvdXJjZS5kZXR1bmUudmFsdWUgPSBvcHRpb25zLmRldHVuZTtcblxuICAgICAgICAvLyBHYWluXG4gICAgICAgIGxldCBub2RlID0gcm91dGVHYWluKHNvdXJjZSlcbiAgICAgICAgbm9kZSA9IHJvdXRlRGVsYXkobm9kZSk7XG4gICAgICAgIC8vIG5vZGUgPSByb3V0ZUNvbXByZXNzb3Iobm9kZSk7XG4gICAgICAgIG5vZGUuY29ubmVjdChjdHguZGVzdGluYXRpb24pO1xuICAgICAgICBzb3VyY2Uuc3RhcnQodHJpZ2dlclRpbWUpO1xuXG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiByb3V0ZUdhaW4gKHNvdXJjZSkge1xuICAgICAgICBsZXQgZ2FpbiA9IG5ldyBhZHNyR2Fpbk5vZGUoY3R4KTtcbiAgICAgICAgZ2Fpbi5tb2RlID0gJ2xpbmVhclJhbXBUb1ZhbHVlQXRUaW1lJztcbiAgICAgICAgbGV0IG9wdGlvbnMgPSBnZXRTZXRBdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG5cbiAgICAgICAgbGV0IGdhaW5Ob2RlOyBcblxuICAgICAgICAvLyBOb3QgZW5hYmxlZCAtIGRlZmF1bHQgZ2FpblxuICAgICAgICBpZiAoIW9wdGlvbnMuZ2FpbkVuYWJsZWQpIHtcbiAgICAgICAgICAgIGdhaW5Ob2RlID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG4gICAgICAgICAgICBzb3VyY2UuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICAgICAgICByZXR1cm4gZ2Fpbk5vZGU7XG4gICAgICAgIH1cblxuICAgICAgICBnYWluLnNldE9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIGdhaW5Ob2RlID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG4gICAgICAgIHNvdXJjZS5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgcmV0dXJuIGdhaW5Ob2RlO1xuXG5cbiAgICB9XG5cbiAgICAvLyBOb3RlIGRlbGF5IGFsd2F5cyB1c2VzIGFib3ZlIGdhaW4gLSBldmVuIGlmIG5vdCBlbmFibGVkXG4gICAgZnVuY3Rpb24gcm91dGVEZWxheShub2RlKSB7XG4gICAgICAgIGlmICghb3B0aW9ucy5kZWxheUVuYWJsZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY3JlYXRlIGRlbGF5IG5vZGVcbiAgICAgICAgbGV0IGRlbGF5ID0gY3R4LmNyZWF0ZURlbGF5KCk7XG4gICAgICAgIGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IG9wdGlvbnMuZGVsYXk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGFkc3IgZ2FpbiBub2RlXG4gICAgICAgIGxldCBnYWluID0gbmV3IGFkc3JHYWluTm9kZShjdHgpO1xuICAgICAgICBnYWluLm1vZGUgPSAnbGluZWFyUmFtcFRvVmFsdWVBdFRpbWUnO1xuICAgICAgICBnYWluLnNldE9wdGlvbnMob3B0aW9ucyk7XG4gICAgICAgIGxldCBmZWVkYmFja0dhaW4gPSBnYWluLmdldEdhaW5Ob2RlKHRyaWdnZXJUaW1lKTtcblxuICAgICAgICAvLyBjcmVhdGUgZmlsdGVyXG4gICAgICAgIGxldCBmaWx0ZXIgPSBjdHguY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgICAgIGZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSBvcHRpb25zLmZpbHRlcjtcblxuICAgICAgICAvLyBkZWxheSAtPiBmZWVkYmFja0dhaW5cbiAgICAgICAgZGVsYXkuY29ubmVjdChmZWVkYmFja0dhaW4pO1xuICAgICAgICBkaXNjb25uZWN0Tm9kZShkZWxheSwgb3B0aW9ucyk7XG5cbiAgICAgICAgLy8gZmVlZGJhY2sgLT4gZmlsdGVyXG4gICAgICAgIGZlZWRiYWNrR2Fpbi5jb25uZWN0KGZpbHRlcik7XG5cbiAgICAgICAgLy8gZmlsdGVyIC0+ZGVsYXlcbiAgICAgICAgZmlsdGVyLmNvbm5lY3QoZGVsYXkpO1xuXG4gICAgICAgIG5vZGUuY29ubmVjdChkZWxheSk7XG5cbiAgICAgICAgcmV0dXJuIGRlbGF5O1xuICAgIH1cbiAgICBwbGF5KGluc3RydW1lbnQpO1xufVxuXG52YXIgc2NoZWR1bGUgPSBuZXcgc2ltcGxlVHJhY2tlcihjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KTtcblxuZnVuY3Rpb24gc2V0dXBCYXNlRXZlbnRzKCkge1xuXG4gICAgLy8gdmFyIGluaXRpYWxpemVkQ3R4O1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwbGF5JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgIGN0eC5yZXN1bWUoKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQbGF5YmFjayByZXN1bWVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgc3RvcmFnZSA9IG5ldyB0cmFja3NMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgbGV0IHRyYWNrID0gc3RvcmFnZS5nZXRUcmFjaygpO1xuXG4gICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSB0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoO1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgIFxuICAgICAgICBzY2hlZHVsZS5ydW5TY2hlZHVsZShnZXRTZXRBdWRpb09wdGlvbnMub3B0aW9ucy5icG0pO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhdXNlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RvcCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICBzY2hlZHVsZSA9IG5ldyBzaW1wbGVUcmFja2VyKGN0eCwgc2NoZWR1bGVBdWRpb0JlYXQpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JwbScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGdldFNldEF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoKTtcbiAgICAgICAgaWYgKHNjaGVkdWxlLnJ1bm5pbmcpIHtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnJ1blNjaGVkdWxlKGdldFNldEF1ZGlvT3B0aW9ucy5vcHRpb25zLmJwbSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZWFzdXJlTGVuZ3RoJykuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoZSkgPT4ge1xuXG4gICAgICAgICQoJyNtZWFzdXJlTGVuZ3RoJykuYmluZCgna2V5cHJlc3Mga2V5ZG93biBrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG5cbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVhc3VyZUxlbmd0aCcpLnZhbHVlO1xuICAgICAgICAgICAgICAgIGxldCBsZW5ndGggPSBwYXJzZUludCh2YWx1ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobGVuZ3RoIDwgMSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSBsZW5ndGg7XG5cbiAgICAgICAgICAgICAgICBsZXQgdHJhY2sgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgc2V0dXBUcmFja2VySHRtbChjdXJyZW50U2FtcGxlRGF0YSwgbGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gbGVuZ3RoO1xuICAgICAgICAgICAgICAgIHNjaGVkdWxlLmxvYWRUcmFja2VyVmFsdWVzKHRyYWNrKVxuICAgICAgICAgICAgICAgIHNjaGVkdWxlLnNldHVwRXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgJCgnLmJhc2UnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgfSk7XG59XG5cbiQoJyNzYW1wbGVTZXQnKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCB0aGlzLnZhbHVlKTtcbn0pO1xuXG5mdW5jdGlvbiB0cmFja3NMb2NhbFN0b3JhZ2UoKSB7XG5cbiAgICB0aGlzLnNldExvY2FsU3RvcmFnZSA9IGZ1bmN0aW9uICh1cGRhdGUpIHtcbiAgICAgICAgdmFyIHN0b3JhZ2UgPSB7fTtcbiAgICAgICAgc3RvcmFnZVsnU2VsZWN0J10gPSAnU2VsZWN0JztcblxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBsb2NhbFN0b3JhZ2UubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gbG9jYWxTdG9yYWdlLmtleShpKTtcbiAgICAgICAgICAgIHN0b3JhZ2VbaXRlbV0gPSBpdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHNlbGVjdCBlbGVtZW50XG4gICAgICAgIHZhciBzID0gbmV3IHNlbGVjdEVsZW1lbnQoXG4gICAgICAgICAgICAnbG9hZC1zdG9yYWdlJywgLy8gaWQgdG8gYXBwZW5kIHRoZSBzZWxlY3QgbGlzdCB0b1xuICAgICAgICAgICAgJ2JlYXQtbGlzdCcsIC8vIGlkIG9mIHRoZSBzZWxlY3QgbGlzdFxuICAgICAgICAgICAgc3RvcmFnZSAvL1xuICAgICAgICApO1xuXG4gICAgICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgICAgIHMudXBkYXRlKCdiZWF0LWxpc3QnLCBzdG9yYWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMuY3JlYXRlKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5nZXRGaWxlbmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGZpbGVuYW1lID0gJCgnI2ZpbGVuYW1lJykudmFsKCk7XG4gICAgICAgIGlmICghZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIGZpbGVuYW1lID0gJ3VudGl0bGVkJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsZW5hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGNvbXBsZXRlIHNvbmdcbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgZm9ybURhdGEgPSBnZXRTZXRBdWRpb09wdGlvbnMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG5cbiAgICAgICAgbGV0IGJlYXQgPSBzY2hlZHVsZS5nZXRUcmFja2VyVmFsdWVzKCk7XG4gICAgICAgIGxldCBzb25nID0geyBcImJlYXRcIjogYmVhdCwgXCJzZXR0aW5nc1wiOiBmb3JtRGF0YSB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNvbmc7XG4gICAgfVxuXG4gICAgdGhpcy5hbGVydCA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIGxldCBhcHBNZXNzYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwcC1tZXNzYWdlJyk7XG5cbiAgICAgICAgYXBwTWVzc2FnZS5pbm5lckhUTUwgPSBtZXNzYWdlXG4gICAgICAgIGFwcE1lc3NhZ2Uuc3R5bGUuZGlzcGxheSA9ICdibG9jaydcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhcHBNZXNzYWdlLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSdcbiAgICAgICAgfSwgMjAwMClcbiAgICB9XG5cbiAgICB0aGlzLnNldHVwU3RvcmFnZSA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgpO1xuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgbGV0IHNvbmcgPSB0aGlzLmdldFRyYWNrKCk7XG4gICAgICAgICAgICBsZXQganNvbiA9IEpTT04uc3RyaW5naWZ5KHNvbmcpO1xuXG4gICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSB0aGlzLmdldEZpbGVuYW1lKCk7XG5cbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGZpbGVuYW1lLCBqc29uKTtcbiAgICAgICAgICAgIHRoaXMuc2V0TG9jYWxTdG9yYWdlKCd1cGRhdGUnKTtcblxuICAgICAgICAgICAgJChcIiNiZWF0LWxpc3RcIikudmFsKGZpbGVuYW1lKTtcblxuICAgICAgICAgICAgdGhpcy5hbGVydChgVGhlIHRyYWNrIGhhcyBiZWVuIHNhdmVkIHRvIGxvY2FsIHN0b3JhZ2UgYXMgPHN0cm9uZz4ke2ZpbGVuYW1lfTwvc3Ryb25nPmApXG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc2F2ZUFzSnNvblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZUFzSnNvbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgbGV0IHNvbmcgPSB0aGlzLmdldFRyYWNrKCk7XG4gICAgICAgICAgICBsZXQganNvbiA9IEpTT04uc3RyaW5naWZ5KHNvbmcpO1xuXG4gICAgICAgICAgICBsZXQgZmlsZW5hbWUgPSB0aGlzLmdldEZpbGVuYW1lKCk7XG5cbiAgICAgICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2pzb25dLCB7dHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJ9KTtcbiAgICAgICAgICAgIEZpbGVTYXZlci5zYXZlQXMoYmxvYiwgZmlsZW5hbWUgKyBcIi5qc29uXCIpO1xuXG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI2ZpbGVuYW1lJykuYmluZCgna2V5cHJlc3Mga2V5ZG93biBrZXl1cCcsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09IDEzKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmVhdC1saXN0JykuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBpdGVtID0gJCgnI2JlYXQtbGlzdCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKGl0ZW0gPT09ICdTZWxlY3QnKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVuYW1lJykudmFsdWUgPSAnJztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gaXRlbTtcbiAgICAgICAgICAgIGxldCB0cmFjayA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oaXRlbSkpO1xuXG4gICAgICAgICAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuXG4gICAgICAgICAgICBmb3JtVmFsdWVzLnNldChmb3JtLCB0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKHRyYWNrLnNldHRpbmdzKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgICAgIHNjaGVkdWxlLm1lYXN1cmVMZW5ndGggPSB0cmFjay5zZXR0aW5ncy5tZWFzdXJlTGVuZ3RoO1xuXG4gICAgICAgICAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdHJhY2suc2V0dGluZ3Muc2FtcGxlU2V0LCB0cmFjayk7XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RlbGV0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcblxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBsZXQgZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdiZWF0LWxpc3QnKTtcbiAgICAgICAgICAgIGxldCB0b0RlbGV0ZSA9IGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnRleHQ7XG5cbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRvRGVsZXRlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gJyc7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG5cbiAgICAgICAgICAgIHRoaXMuYWxlcnQoYFRyYWNrIGhhcyBiZWVuIGRlbGV0ZWRgKVxuXG4gICAgICAgIH0pO1xuICAgIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYmVhdDogW1xuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjBcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjBcIiwgY29sSWQ6IFwiNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjBcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjExXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjEyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjE3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjE4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjE5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjMwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjMxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMVwiLCBjb2xJZDogXCIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMVwiLCBjb2xJZDogXCI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMVwiLCBjb2xJZDogXCI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMTBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMTFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMTNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMTRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMTZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMTdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMTlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMzBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCI0XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjExXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjEyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjE3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjE4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjE5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjIzXCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiMjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiMjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiMjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiMjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiMjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiMzBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIxXCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCI2XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMTBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMTFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMTNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMTRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMTZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMTdcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIxOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIxOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIyMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIyNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIyNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIyOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCIzMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIwXCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIyXCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIxMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIxMlwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMTZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMTdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMTlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMjFcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIyNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIyNVwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjMwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjMxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiNFwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCI3XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjExXCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiMTNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiMTRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIxNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIxN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIxOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIxOVwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjMwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjMxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMTBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMTFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMTNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMTRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMTZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMTdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMTlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMjdcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCIyOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCIzMVwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI3XCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI3XCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI3XCIsIGNvbElkOiBcIjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI3XCIsIGNvbElkOiBcIjlcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIxMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIxMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIxM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIxNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIxNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIxNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIxN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIxOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIxOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIzMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjhcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjhcIiwgY29sSWQ6IFwiNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjhcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjExXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjEyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjE3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjE4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjE5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjI5XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjhcIiwgY29sSWQ6IFwiMzBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjhcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI5XCIsIGNvbElkOiBcIjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI5XCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI5XCIsIGNvbElkOiBcIjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIxOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIzMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMTBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjExXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIxMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMTNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIxNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMTZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjE3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIxOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMTlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIyMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIyNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIxNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIxN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjE5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMzBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjMxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIxMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMTFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjEyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIxM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMTRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIxNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMTdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjE4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIxOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMjNcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIxNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIxN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjE5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMjhcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjMwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIzMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMTBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjExXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIxMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMTNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIxNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMTZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjE3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIxOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMTlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIyMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIyNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIyOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjMwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIzMVwiLCBlbmFibGVkOiBmYWxzZSB9XG4gIF0sXG4gIHNldHRpbmdzOiB7XG4gICAgc2FtcGxlU2V0OlxuICAgICAgXCJodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vb3JhbWljcy9zYW1wbGVkL21hc3Rlci9EUlVNUy9wZWFybC1tYXN0ZXItc3R1ZGlvL3NhbXBsZWQuaW5zdHJ1bWVudC5qc29uXCIsXG4gICAgbWVhc3VyZUxlbmd0aDogMzIsXG4gICAgYnBtOiA0NjAsXG4gICAgZGV0dW5lOiAwLFxuICAgIGdhaW5FbmFibGVkOiBcImdhaW5cIixcbiAgICBhdHRhY2tBbXA6IDAsXG4gICAgc3VzdGFpbkFtcDogMC40LFxuICAgIGRlY2F5QW1wOiAwLjcsXG4gICAgcmVsZWFzZUFtcDogMSxcbiAgICBhdHRhY2tUaW1lOiAwLFxuICAgIGRlY2F5VGltZTogMCxcbiAgICBzdXN0YWluVGltZTogMixcbiAgICByZWxlYXNlVGltZTogMixcbiAgICBhZHNySW50ZXJ2YWw6IDAuMSxcbiAgICBkZWxheTogMC4wMSxcbiAgICBmaWx0ZXI6IDEwMDBcbiAgfVxufTtcbiIsImNvbnN0IGdldFNldEZvcm1WYWx1ZXMgPSByZXF1aXJlKCdnZXQtc2V0LWZvcm0tdmFsdWVzJyk7XG5cbmZ1bmN0aW9uIGdldFNldENvbnRyb2xzKCkge1xuXG4gICAgdGhpcy5nZXRUcmFja2VyQ29udHJvbHMgPSBmdW5jdGlvbigpIHtcblxuICAgICAgICBsZXQgZm9ybVZhbHVlcyA9IG5ldyBnZXRTZXRGb3JtVmFsdWVzKCk7XG4gICAgICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBmb3JtVmFsdWVzLmdldChmb3JtKTtcbiAgICAgICAgbGV0IHJldCA9IHt9O1xuICAgICAgICBmb3IgKGxldCBrZXkgaW4gdmFsdWVzKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdkZWxheUVuYWJsZWQnKSB7XG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSAnZGVsYXknO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2dhaW5FbmFibGVkJykge1xuICAgICAgICAgICAgICAgIHJldFtrZXldID0gJ2dhaW4nO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5ID09PSAnc2FtcGxlU2V0JykgeyBcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9IHZhbHVlc1trZXldO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0W2tleV0gPSBwYXJzZUZsb2F0KHZhbHVlc1trZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIHRoaXMuc2V0VHJhY2tlckNvbnRyb2xzID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgICAgICBpZiAoIXZhbHVlcykge1xuICAgICAgICAgICAgdmFsdWVzID0gdGhpcy5nZXRUcmFja2VyQ29udHJvbHMoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnMgPSB2YWx1ZXM7XG4gICAgfTsgIFxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U2V0Q29udHJvbHM7XG4iLCJjb25zdCBXQUFDbG9jayA9IHJlcXVpcmUoJ3dhYWNsb2NrJyk7XG5jb25zdCB0cmFja2VyVGFibGUgPSByZXF1aXJlKCcuL3RyYWNrZXItdGFibGUnKTtcbmNvbnN0IGhhc0NsYXNzID0gcmVxdWlyZSgnaGFzLWNsYXNzJyk7XG5cbi8qKlxuICogQ29uc3RydWN0IG9iamVjdFxuICogQHBhcmFtIHthdWRpb0NvbnRleHR9IGN0eCBcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHNjaGVkdWxlQXVkaW9CZWF0IGZ1bnRpb24gd2hlbiBhbiBhdWRpbyBpcyBwbGF5ZWRcbiAqL1xuZnVuY3Rpb24gdHJhY2tlcihjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KSB7XG5cbiAgICB0aGlzLm1lYXN1cmVMZW5ndGggPSAxNjtcbiAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0ID0gc2NoZWR1bGVBdWRpb0JlYXQ7XG4gICAgdGhpcy5zY2hlZHVsZUZvcndhcmQgPSAwLjE7XG4gICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgICB0aGlzLmV2ZW50TWFwID0ge307XG4gICAgdGhpcy5jbG9jayA9IG5ldyBXQUFDbG9jayhjdHgpO1xuICAgIHRoaXMuY2xvY2suc3RhcnQoKTtcbiAgICB0aGlzLnJ1bm5pbmcgPSBmYWxzZTtcblxuICAgIC8qKlxuICAgICAqIERyYXcgYSB0cmFja2VyIHRhYmxlIGJ5IG51bVJvd3MgYW5kIG51bUNvbHNcbiAgICAgKi9cbiAgICB0aGlzLmRyYXdUcmFja2VyID0gZnVuY3Rpb24obnVtUm93cywgbnVtQ29scywgZGF0YSkge1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWxUYWJsZSA9IG5ldyB0cmFja2VyVGFibGUoKTtcblxuICAgICAgICBodG1sVGFibGUuc2V0Um93cyhudW1Sb3dzLCBudW1Db2xzLCBkYXRhKTtcbiAgICAgICAgbGV0IHN0ciA9IGh0bWxUYWJsZS5nZXRUYWJsZSgpO1xuICAgICAgICBcbiAgICAgICAgbGV0IHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndHJhY2tlci1wYXJlbnQnKTtcbiAgICAgICAgdC5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgdC5pbnNlcnRBZGphY2VudEhUTUwoJ2FmdGVyYmVnaW4nLCBzdHIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFB1c2ggY3VycmVudCBiZWF0IG9uZSBmb3J3YXJkXG4gICAgICovXG4gICAgdGhpcy5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmN1cnJlbnQrKztcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudCA+PSB0aGlzLm1lYXN1cmVMZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIG1pbGxpIHNlY29uZHMgcGVyIGJlYXRcbiAgICAgKi9cbiAgICB0aGlzLm1pbGxpUGVyQmVhdCA9IGZ1bmN0aW9uIChiZWF0cykge1xuICAgICAgICBpZiAoIWJlYXRzKSB7XG4gICAgICAgICAgICBiZWF0cyA9IDYwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAxMDAwICogNjAgLyBiZWF0cztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0IGEgdHJhY2tlciByb3cgZnJvbSBhIGNlbGwtaWRcbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWNrZXJSb3dWYWx1ZXMgPSBmdW5jdGlvbiAoY29sSWQpIHtcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtY29sLWlkPVwiJHtjb2xJZH1cIl1gO1xuXG4gICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICBlbGVtcy5mb3JFYWNoKChlbCkgPT4ge1xuICAgICAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIGVsLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBlbC5jbGFzc0xpc3QuY29udGFpbnMoJ3RyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICAgICAgdmFsdWVzLnB1c2godmFsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNjaGVkdWxlIGEgYmVhdCBjb2x1bW5cbiAgICAgKi9cbiAgICB0aGlzLnNjaGVkdWxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgYmVhdENvbHVtbiA9IHRoaXMuZ2V0VHJhY2tlclJvd1ZhbHVlcyh0aGlzLmN1cnJlbnQpO1xuICAgICAgICBsZXQgbm93ID0gY3R4LmN1cnJlbnRUaW1lO1xuXG4gICAgICAgIGxldCBzZWxlY3RvciA9IGBbZGF0YS1jb2wtaWQ9XCIke3RoaXMuY3VycmVudH1cIl1gO1xuXG4gICAgICAgIGxldCBldmVudCA9IHRoaXMuY2xvY2suY2FsbGJhY2tBdFRpbWUoKCkgPT4ge1xuICAgICAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgICAgICBlbGVtcy5mb3JFYWNoKCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGUuY2xhc3NMaXN0LmFkZCgndHJhY2tlci1jdXJyZW50JylcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0sIG5vdyArIHRoaXMuc2NoZWR1bGVGb3J3YXJkKTtcblxuICAgICAgICB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgZWxlbXMuZm9yRWFjaCggKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLmNsYXNzTGlzdC5yZW1vdmUoJ3RyYWNrZXItY3VycmVudCcpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCArIHRoaXMubWlsbGlQZXJCZWF0KHRoaXMuYnBtKSAvIDEwMDApO1xuXG4gICAgICAgIGJlYXRDb2x1bW4uZm9yRWFjaCgoYmVhdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUJlYXQoYmVhdCwgbm93KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuc2NoZWR1bGVCZWF0ID0gZnVuY3Rpb24gKGJlYXQsIG5vdykge1xuXG4gICAgICAgIGxldCB0cmlnZ2VyVGltZSA9IG5vdyArIHRoaXMuc2NoZWR1bGVGb3J3YXJkO1xuICAgICAgICB0aGlzLnNjaGVkdWxlTWFwW2JlYXQuY29sSWRdID0gdHJpZ2dlclRpbWU7XG4gICAgICAgIGlmIChiZWF0LmVuYWJsZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKTtcbiAgICAgICAgICAgIH0sIG5vdyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5zY2hlZHVsZU1hcCA9IHt9O1xuXG4gICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdE5vdyA9IGZ1bmN0aW9uIChiZWF0KSB7XG5cbiAgICAgICAgaWYgKGJlYXQuZW5hYmxlZCkge1xuICAgICAgICAgICAgbGV0IGJlYXRFdmVudCA9IHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV07XG4gICAgICAgICAgICBpZiAoYmVhdEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgYmVhdEV2ZW50LmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSB0aGlzLnNjaGVkdWxlTWFwWzBdICsgYmVhdC5jb2xJZCAqIHRoaXMubWlsbGlQZXJCZWF0KHRoaXMuYnBtKSAvIDEwMDA7XG4gICAgICAgIGxldCBub3cgPSBjdHguY3VycmVudFRpbWU7XG4gICAgICAgIHRoaXMuZXZlbnRNYXBbdGhpcy5nZXRFdmVudEtleShiZWF0KV0gPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXQoYmVhdCwgdHJpZ2dlclRpbWUpO1xuICAgICAgICB9LCBub3cpO1xuICAgIH07XG5cbiAgICB0aGlzLmludGVydmFsO1xuICAgIHRoaXMucnVuU2NoZWR1bGUgPSBmdW5jdGlvbiAoYnBtKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuYnBtID0gYnBtO1xuICAgICAgICBsZXQgaW50ZXJ2YWwgPSB0aGlzLm1pbGxpUGVyQmVhdChicG0pO1xuXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgIH0sIDApO1xuXG4gICAgICAgIHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlKCk7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcblxuICAgICAgICB9LCBpbnRlcnZhbCk7XG4gICAgfTtcblxuICAgIHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RXZlbnRLZXkgPSBmdW5jdGlvbiBnZXRFdmVudEtleShiZWF0KSB7XG4gICAgICAgIHJldHVybiBiZWF0LnJvd0lkICsgYmVhdC5jb2xJZDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogR2V0IHRyYWNrZXIgdmFsdWVzXG4gICAgICovXG4gICAgdGhpcy5nZXRUcmFja2VyVmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgdmFsdWVzID0gW107XG4gICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy50cmFja2VyLWNlbGwnKTtcbiAgICAgICAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgbGV0IHZhbCA9IE9iamVjdC5hc3NpZ24oe30sIGUuZGF0YXNldCk7XG4gICAgICAgICAgICB2YWwuZW5hYmxlZCA9IGhhc0NsYXNzKGUsIFwidHJhY2tlci1lbmFibGVkXCIpO1xuICAgICAgICAgICAgdmFsdWVzLnB1c2godmFsKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIExvYWQgdHJhY2tlciB2YWx1ZXMgaW4gSlNPTiBmb3JtYXRcbiAgICAgKi9cbiAgICB0aGlzLmxvYWRUcmFja2VyVmFsdWVzID0gZnVuY3Rpb24gKGpzb24pIHtcblxuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudHJhY2tlci1lbmFibGVkJyk7XG4gICAgICAgIGVsZW1zLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5jbGFzc0xpc3QucmVtb3ZlKCd0cmFja2VyLWVuYWJsZWQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAganNvbi5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5lbmFibGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdG9yID0gYC50cmFja2VyLWNlbGxbZGF0YS1yb3ctaWQ9XCIke2RhdGEucm93SWR9XCJdW2RhdGEtY29sLWlkPVwiJHtkYXRhLmNvbElkfVwiXWA7XG4gICAgICAgICAgICAgICAgbGV0IGVsZW0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNsYXNzTGlzdC5hZGQoXCJ0cmFja2VyLWVuYWJsZWRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogTGlzdGVuIG9uIHRyYWNrZXItY2VsbFxuICAgICAqIFNjaGVkdWxlIGlmIGNlbGwgaXMgY2xpY2tlZCBhbmQgdG9nZ2xlIGNzcyBjbGFzc1xuICAgICAqL1xuICAgIHRoaXMuc2V0dXBFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFxuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudHJhY2tlci1jZWxsJyk7XG4gICAgICAgIFxuICAgICAgICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlLnRhcmdldC5kYXRhc2V0KTtcbiAgICAgICAgICAgICAgICB2YWwuZW5hYmxlZCA9IGhhc0NsYXNzKGUudGFyZ2V0LCBcInRyYWNrZXItZW5hYmxlZFwiKTtcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudEJlYXQgPSBlLnRhcmdldC5kYXRhc2V0LmNvbElkO1xuICAgICAgICAgICAgICAgIGlmICh2YWwuY29sSWQgPiBjdXJyZW50QmVhdCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0Tm93KHZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGUudGFyZ2V0LmNsYXNzTGlzdC50b2dnbGUoJ3RyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdHJhY2tlcjsiLCJmdW5jdGlvbiB0cmFja2VyVGFibGUoKSB7XG5cbiAgICB0aGlzLnN0ciA9ICcnO1xuICAgIHRoaXMuZ2V0VGFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAnPHRhYmxlIGlkPVwidHJhY2tlci10YWJsZVwiPicgKyB0aGlzLnN0ciArICc8L3RhYmxlPic7XG4gICAgfTtcblxuICAgIHRoaXMuc2V0SGVhZGVyID0gZnVuY3Rpb24gKG51bVJvd3MsIGRhdGEpIHtcbiAgICAgICAgdGhpcy5zdHIgKz0gYDx0ciBjbGFzcz1cInRyYWNrZXItcm93IGhlYWRlclwiPmA7XG4gICAgICAgIHRoaXMuc3RyICs9IHRoaXMuZ2V0Q2VsbHMoJ2hlYWRlcicsIG51bVJvd3MsIHsgaGVhZGVyOiB0cnVlIH0pO1xuICAgICAgICB0aGlzLnN0ciArPSBgPC90cj5gO1xuXG4gICAgfTtcblxuICAgIHRoaXMuc2V0Um93cyA9IGZ1bmN0aW9uIChudW1Sb3dzLCBudW1Db2xzLCBkYXRhKSB7XG5cbiAgICAgICAgdGhpcy5zZXRIZWFkZXIobnVtQ29scywgZGF0YSk7XG4gICAgICAgIGZvciAobGV0IHJvd0lEID0gMDsgcm93SUQgPCBudW1Sb3dzOyByb3dJRCsrKSB7XG4gICAgICAgICAgICB0aGlzLnN0ciArPSBgPHRyIGNsYXNzPVwidHJhY2tlci1yb3dcIiBkYXRhLWlkPVwiJHtyb3dJRH1cIj5gO1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gdGhpcy5nZXRDZWxscyhyb3dJRCwgbnVtQ29scywgZGF0YSk7XG4gICAgICAgICAgICB0aGlzLnN0ciArPSBgPC90cj5gO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0Rmlyc3RDZWxsID0gZnVuY3Rpb24gKHJvd0lELCBkYXRhKSB7XG4gICAgICAgIHZhciBzdHIgPSAnJztcbiAgICAgICAgXG4gICAgICAgIHN0ciArPSBgPHRkIGNsYXNzPVwidHJhY2tlci1maXJzdC1jZWxsXCIgZGF0YS1yb3ctaWQ9XCIke3Jvd0lEfVwiPmA7XG4gICAgICAgIGlmIChkYXRhLnRpdGxlKSB7IFxuICAgICAgICAgICAgc3RyICs9IGRhdGEudGl0bGVbcm93SURdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzdHIgKz0gYDwvdGQ+YDtcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xuXG4gICAgdGhpcy5nZXRDZWxscyA9IGZ1bmN0aW9uIChyb3dJRCwgbnVtUm93cywgZGF0YSkge1xuICAgICAgICB2YXIgc3RyID0gJyc7XG5cbiAgICAgICAgc3RyICs9IHRoaXMuZ2V0Rmlyc3RDZWxsKHJvd0lELCBkYXRhKTtcblxuICAgICAgICBsZXQgY3NzQ2xhc3MgPSAndHJhY2tlci1jZWxsJ1xuXG4gICAgICAgIGlmIChyb3dJRCA9PSAnaGVhZGVyJykge1xuICAgICAgICAgICAgY3NzQ2xhc3MgPSAndHJhY2tlci1jZWxsLWhlYWRlcidcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgbnVtUm93czsgYysrKSB7XG4gICAgICAgICAgICBzdHIgKz0gYDx0ZCBjbGFzcz1cIiR7Y3NzQ2xhc3N9XCIgZGF0YS1yb3ctaWQ9XCIke3Jvd0lEfVwiIGRhdGEtY29sLWlkPVwiJHtjfVwiPmA7XG4gICAgICAgICAgICBpZiAoZGF0YS5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBzdHIgKz0gYyArIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdHIgKz0gYDwvdGQ+YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdHJhY2tlclRhYmxlO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiJdfQ==
