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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYWRzci1nYWluLW5vZGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXVkaW8tYnVmZmVyLWluc3RydW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvZ2V0LWpzb24tcHJvbWlzZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nZXQtc2V0LWZvcm0tdmFsdWVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2hhcy1jbGFzcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2FkLXNhbXBsZS1zZXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9hZC1zYW1wbGUtc2V0L25vZGVfbW9kdWxlcy90aW55LXNhbXBsZS1sb2FkZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqLXR5cGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvc2VsZWN0LWVsZW1lbnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2FhY2xvY2svbGliL1dBQUNsb2NrLmpzIiwic3JjL2FwcC5qcyIsInNyYy9kZWZhdWx0LXRyYWNrLmpzIiwic3JjL2dldC1zZXQtY29udHJvbHMuanMiLCJzcmMvc2ltcGxlLXRyYWNrZXIuanMiLCJzcmMvdHJhY2tlci10YWJsZS5qcyIsIi4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDek9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBBZHNyR2Fpbk5vZGUoY3R4KSB7XG5cbiAgICB0aGlzLmN0eCA9IGN0eDtcblxuICAgIHRoaXMubW9kZSA9ICdleHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lJztcbiAgICAvLyB0aGlzLm1vZGUgPSAnbGluZWFyUmFtcFRvVmFsdWVBdFRpbWUnO1xuXG4gICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgICBhdHRhY2tBbXA6IDAuMSwgXG4gICAgICAgIGRlY2F5QW1wOiAwLjMsXG4gICAgICAgIHN1c3RhaW5BbXA6IDAuNyxcbiAgICAgICAgcmVsZWFzZUFtcDogMC4wMSxcbiAgICAgICAgYXR0YWNrVGltZTogMC4xLFxuICAgICAgICBkZWNheVRpbWU6IDAuMixcbiAgICAgICAgc3VzdGFpblRpbWU6IDEuMCwgXG4gICAgICAgIHJlbGVhc2VUaW1lOiAzLjQsXG4gICAgICAgIGF1dG9SZWxlYXNlOiB0cnVlXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldCBvcHRpb25zIG9yIHVzZSBkZWZhdWx0c1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIFxuICAgICAqL1xuICAgIHRoaXMuc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucyA9IE9iamVjdC5hc3NpZ24odGhpcy5vcHRpb25zLCBvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgdGhpcy5nYWluTm9kZVxuICAgIHRoaXMuYXVkaW9UaW1lXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGEgZ2FpbiBub2RlIGZyb20gZGVmaW5lZCBvcHRpb25zXG4gICAgICogQHBhcmFtIHtmbG9hdH0gYXVkaW9UaW1lIGFuIGF1ZGlvIGNvbnRleHQgdGltZSBzdGFtcFxuICAgICAqL1xuICAgIHRoaXMuZ2V0R2Fpbk5vZGUgPSAgKGF1ZGlvVGltZSkgPT4ge1xuXG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUgPSB0aGlzLmN0eC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHRoaXMuYXVkaW9UaW1lID0gYXVkaW9UaW1lXG5cbiAgICAgICAgLy8gRmlyZWZveCBkb2VzIG5vdCBsaWtlIDAgLT4gdGhlcmVmb3IgMC4wMDAwMDAxXG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLjAwMDAwMDEsIGF1ZGlvVGltZSkgICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gQXR0YWNrXG4gICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpblt0aGlzLm1vZGVdKFxuICAgICAgICAgICAgdGhpcy5vcHRpb25zLmF0dGFja0FtcCwgXG4gICAgICAgICAgICBhdWRpb1RpbWUgKyB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSlcblxuICAgICAgICAvLyBEZWNheVxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW5bdGhpcy5tb2RlXShcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5kZWNheUFtcCwgXG4gICAgICAgICAgICBhdWRpb1RpbWUgKyB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSArIHRoaXMub3B0aW9ucy5kZWNheVRpbWUpXG5cbiAgICAgICAgLy8gU3VzdGFpblxuICAgICAgICB0aGlzLmdhaW5Ob2RlLmdhaW5bdGhpcy5tb2RlXShcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5zdXN0YWluQW1wLCBcbiAgICAgICAgICAgIGF1ZGlvVGltZSArIHRoaXMub3B0aW9ucy5hdHRhY2tUaW1lICsgdGhpcy5vcHRpb25zLnN1c3RhaW5UaW1lKVxuIFxuICAgICAgICAvLyBDaGVjayBpZiBhdXRvLXJlbGVhc2VcbiAgICAgICAgLy8gVGhlbiBjYWxjdWxhdGUgd2hlbiBub3RlIHNob3VsZCBzdG9wXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1JlbGVhc2UpIHtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpblt0aGlzLm1vZGVdKFxuICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5yZWxlYXNlQW1wLFxuICAgICAgICAgICAgICAgIGF1ZGlvVGltZSArIHRoaXMucmVsZWFzZVRpbWUoKVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEaXNjb25uZWN0IHRoZSBnYWluIG5vZGUgXG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3QoYXVkaW9UaW1lICsgdGhpcy5yZWxlYXNlVGltZSgpKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmdhaW5Ob2RlO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZWxlYXNlIHRoZSBub3RlIGR5bmFtaWNhbHlcbiAgICAgKiBFLmcuIGlmIHlvdXIgYXJlIG1ha2luZyBhIGtleWJvYXJkLCBhbmQgeW91IHdhbnQgdGhlIG5vdGVcbiAgICAgKiB0byBiZSByZWxlYXNlZCBhY2NvcmRpbmcgdG8gY3VycmVudCBhdWRpbyB0aW1lICsgdGhlIEFEU1IgcmVsZWFzZSB0aW1lIFxuICAgICAqL1xuICAgIHRoaXMucmVsZWFzZU5vdyA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5nYWluTm9kZS5nYWluW3RoaXMubW9kZV0oXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMucmVsZWFzZUFtcCxcbiAgICAgICAgICAgIHRoaXMuY3R4LmN1cnJlbnRUaW1lICsgdGhpcy5vcHRpb25zLnJlbGVhc2VUaW1lKSBcbiAgICAgICAgdGhpcy5kaXNjb25uZWN0KHRoaXMub3B0aW9ucy5yZWxlYXNlVGltZSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVsZWFzZSB0aW1lIGFjY29yZGluZyB0byB0aGUgYWRzciByZWxlYXNlIHRpbWVcbiAgICAgKi9cbiAgICB0aGlzLnJlbGVhc2VUaW1lID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9wdGlvbnMuYXR0YWNrVGltZSArIHRoaXMub3B0aW9ucy5kZWNheVRpbWUgKyB0aGlzLm9wdGlvbnMuc3VzdGFpblRpbWUgKyB0aGlzLm9wdGlvbnMucmVsZWFzZVRpbWVcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVsZWFzZSB0aW1lIGFjY29yZGluZyB0byAnbm93J1xuICAgICAqL1xuICAgIHRoaXMucmVsZWFzZVRpbWVOb3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN0eC5jdXJyZW50VGltZSArIHRoaXMucmVsZWFzZVRpbWUoKVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Zsb2F0fSBkaXNjb25uZWN0VGltZSB0aGUgdGltZSB3aGVuIGdhaW5Ob2RlIHNob3VsZCBkaXNjb25uZWN0IFxuICAgICAqL1xuICAgIHRoaXMuZGlzY29ubmVjdCA9IChkaXNjb25uZWN0VGltZSkgPT4ge1xuICAgICAgICBzZXRUaW1lb3V0KCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmdhaW5Ob2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGlzY29ubmVjdFRpbWUgKiAxMDAwKTtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFkc3JHYWluTm9kZTtcbiIsIi8vIEZyb206IGh0dHBzOi8vZGV2Lm9wZXJhLmNvbS9hcnRpY2xlcy9kcnVtLXNvdW5kcy13ZWJhdWRpby9cbmZ1bmN0aW9uIGF1ZGlvQnVmZmVySW5zdHJ1bWVudChjb250ZXh0LCBidWZmZXIpIHtcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuYnVmZmVyID0gYnVmZmVyO1xufVxuXG5hdWRpb0J1ZmZlckluc3RydW1lbnQucHJvdG90eXBlLnNldHVwID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHRoaXMuc291cmNlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbn07XG5cbmF1ZGlvQnVmZmVySW5zdHJ1bWVudC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHJldHVybiB0aGlzLnNvdXJjZTtcbn07XG5cbmF1ZGlvQnVmZmVySW5zdHJ1bWVudC5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgdGhpcy5zZXR1cCgpO1xuICAgIHRoaXMuc291cmNlLnN0YXJ0KHRpbWUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBhdWRpb0J1ZmZlckluc3RydW1lbnQ7IiwiLyogRmlsZVNhdmVyLmpzXG4gKiBBIHNhdmVBcygpIEZpbGVTYXZlciBpbXBsZW1lbnRhdGlvbi5cbiAqIDEuMy4yXG4gKiAyMDE2LTA2LTE2IDE4OjI1OjE5XG4gKlxuICogQnkgRWxpIEdyZXksIGh0dHA6Ly9lbGlncmV5LmNvbVxuICogTGljZW5zZTogTUlUXG4gKiAgIFNlZSBodHRwczovL2dpdGh1Yi5jb20vZWxpZ3JleS9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvTElDRU5TRS5tZFxuICovXG5cbi8qZ2xvYmFsIHNlbGYgKi9cbi8qanNsaW50IGJpdHdpc2U6IHRydWUsIGluZGVudDogNCwgbGF4YnJlYWs6IHRydWUsIGxheGNvbW1hOiB0cnVlLCBzbWFydHRhYnM6IHRydWUsIHBsdXNwbHVzOiB0cnVlICovXG5cbi8qISBAc291cmNlIGh0dHA6Ly9wdXJsLmVsaWdyZXkuY29tL2dpdGh1Yi9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvRmlsZVNhdmVyLmpzICovXG5cbnZhciBzYXZlQXMgPSBzYXZlQXMgfHwgKGZ1bmN0aW9uKHZpZXcpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdC8vIElFIDwxMCBpcyBleHBsaWNpdGx5IHVuc3VwcG9ydGVkXG5cdGlmICh0eXBlb2YgdmlldyA9PT0gXCJ1bmRlZmluZWRcIiB8fCB0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIC9NU0lFIFsxLTldXFwuLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhclxuXHRcdCAgZG9jID0gdmlldy5kb2N1bWVudFxuXHRcdCAgLy8gb25seSBnZXQgVVJMIHdoZW4gbmVjZXNzYXJ5IGluIGNhc2UgQmxvYi5qcyBoYXNuJ3Qgb3ZlcnJpZGRlbiBpdCB5ZXRcblx0XHQsIGdldF9VUkwgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2aWV3LlVSTCB8fCB2aWV3LndlYmtpdFVSTCB8fCB2aWV3O1xuXHRcdH1cblx0XHQsIHNhdmVfbGluayA9IGRvYy5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsIFwiYVwiKVxuXHRcdCwgY2FuX3VzZV9zYXZlX2xpbmsgPSBcImRvd25sb2FkXCIgaW4gc2F2ZV9saW5rXG5cdFx0LCBjbGljayA9IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHZhciBldmVudCA9IG5ldyBNb3VzZUV2ZW50KFwiY2xpY2tcIik7XG5cdFx0XHRub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdH1cblx0XHQsIGlzX3NhZmFyaSA9IC9jb25zdHJ1Y3Rvci9pLnRlc3Qodmlldy5IVE1MRWxlbWVudCkgfHwgdmlldy5zYWZhcmlcblx0XHQsIGlzX2Nocm9tZV9pb3MgPS9DcmlPU1xcL1tcXGRdKy8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KVxuXHRcdCwgdGhyb3dfb3V0c2lkZSA9IGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHQodmlldy5zZXRJbW1lZGlhdGUgfHwgdmlldy5zZXRUaW1lb3V0KShmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhyb3cgZXg7XG5cdFx0XHR9LCAwKTtcblx0XHR9XG5cdFx0LCBmb3JjZV9zYXZlYWJsZV90eXBlID0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIlxuXHRcdC8vIHRoZSBCbG9iIEFQSSBpcyBmdW5kYW1lbnRhbGx5IGJyb2tlbiBhcyB0aGVyZSBpcyBubyBcImRvd25sb2FkZmluaXNoZWRcIiBldmVudCB0byBzdWJzY3JpYmUgdG9cblx0XHQsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCA9IDEwMDAgKiA0MCAvLyBpbiBtc1xuXHRcdCwgcmV2b2tlID0gZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0dmFyIHJldm9rZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlID09PSBcInN0cmluZ1wiKSB7IC8vIGZpbGUgaXMgYW4gb2JqZWN0IFVSTFxuXHRcdFx0XHRcdGdldF9VUkwoKS5yZXZva2VPYmplY3RVUkwoZmlsZSk7XG5cdFx0XHRcdH0gZWxzZSB7IC8vIGZpbGUgaXMgYSBGaWxlXG5cdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHNldFRpbWVvdXQocmV2b2tlciwgYXJiaXRyYXJ5X3Jldm9rZV90aW1lb3V0KTtcblx0XHR9XG5cdFx0LCBkaXNwYXRjaCA9IGZ1bmN0aW9uKGZpbGVzYXZlciwgZXZlbnRfdHlwZXMsIGV2ZW50KSB7XG5cdFx0XHRldmVudF90eXBlcyA9IFtdLmNvbmNhdChldmVudF90eXBlcyk7XG5cdFx0XHR2YXIgaSA9IGV2ZW50X3R5cGVzLmxlbmd0aDtcblx0XHRcdHdoaWxlIChpLS0pIHtcblx0XHRcdFx0dmFyIGxpc3RlbmVyID0gZmlsZXNhdmVyW1wib25cIiArIGV2ZW50X3R5cGVzW2ldXTtcblx0XHRcdFx0aWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGxpc3RlbmVyLmNhbGwoZmlsZXNhdmVyLCBldmVudCB8fCBmaWxlc2F2ZXIpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdFx0XHR0aHJvd19vdXRzaWRlKGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0LCBhdXRvX2JvbSA9IGZ1bmN0aW9uKGJsb2IpIHtcblx0XHRcdC8vIHByZXBlbmQgQk9NIGZvciBVVEYtOCBYTUwgYW5kIHRleHQvKiB0eXBlcyAoaW5jbHVkaW5nIEhUTUwpXG5cdFx0XHQvLyBub3RlOiB5b3VyIGJyb3dzZXIgd2lsbCBhdXRvbWF0aWNhbGx5IGNvbnZlcnQgVVRGLTE2IFUrRkVGRiB0byBFRiBCQiBCRlxuXHRcdFx0aWYgKC9eXFxzKig/OnRleHRcXC9cXFMqfGFwcGxpY2F0aW9uXFwveG1sfFxcUypcXC9cXFMqXFwreG1sKVxccyo7LipjaGFyc2V0XFxzKj1cXHMqdXRmLTgvaS50ZXN0KGJsb2IudHlwZSkpIHtcblx0XHRcdFx0cmV0dXJuIG5ldyBCbG9iKFtTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkVGRiksIGJsb2JdLCB7dHlwZTogYmxvYi50eXBlfSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYmxvYjtcblx0XHR9XG5cdFx0LCBGaWxlU2F2ZXIgPSBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0aWYgKCFub19hdXRvX2JvbSkge1xuXHRcdFx0XHRibG9iID0gYXV0b19ib20oYmxvYik7XG5cdFx0XHR9XG5cdFx0XHQvLyBGaXJzdCB0cnkgYS5kb3dubG9hZCwgdGhlbiB3ZWIgZmlsZXN5c3RlbSwgdGhlbiBvYmplY3QgVVJMc1xuXHRcdFx0dmFyXG5cdFx0XHRcdCAgZmlsZXNhdmVyID0gdGhpc1xuXHRcdFx0XHQsIHR5cGUgPSBibG9iLnR5cGVcblx0XHRcdFx0LCBmb3JjZSA9IHR5cGUgPT09IGZvcmNlX3NhdmVhYmxlX3R5cGVcblx0XHRcdFx0LCBvYmplY3RfdXJsXG5cdFx0XHRcdCwgZGlzcGF0Y2hfYWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgd3JpdGVlbmRcIi5zcGxpdChcIiBcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIG9uIGFueSBmaWxlc3lzIGVycm9ycyByZXZlcnQgdG8gc2F2aW5nIHdpdGggb2JqZWN0IFVSTHNcblx0XHRcdFx0LCBmc19lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICgoaXNfY2hyb21lX2lvcyB8fCAoZm9yY2UgJiYgaXNfc2FmYXJpKSkgJiYgdmlldy5GaWxlUmVhZGVyKSB7XG5cdFx0XHRcdFx0XHQvLyBTYWZhcmkgZG9lc24ndCBhbGxvdyBkb3dubG9hZGluZyBvZiBibG9iIHVybHNcblx0XHRcdFx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXHRcdFx0XHRcdFx0cmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdXJsID0gaXNfY2hyb21lX2lvcyA/IHJlYWRlci5yZXN1bHQgOiByZWFkZXIucmVzdWx0LnJlcGxhY2UoL15kYXRhOlteO10qOy8sICdkYXRhOmF0dGFjaG1lbnQvZmlsZTsnKTtcblx0XHRcdFx0XHRcdFx0dmFyIHBvcHVwID0gdmlldy5vcGVuKHVybCwgJ19ibGFuaycpO1xuXHRcdFx0XHRcdFx0XHRpZighcG9wdXApIHZpZXcubG9jYXRpb24uaHJlZiA9IHVybDtcblx0XHRcdFx0XHRcdFx0dXJsPXVuZGVmaW5lZDsgLy8gcmVsZWFzZSByZWZlcmVuY2UgYmVmb3JlIGRpc3BhdGNoaW5nXG5cdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdHJlYWRlci5yZWFkQXNEYXRhVVJMKGJsb2IpO1xuXHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuSU5JVDtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gZG9uJ3QgY3JlYXRlIG1vcmUgb2JqZWN0IFVSTHMgdGhhbiBuZWVkZWRcblx0XHRcdFx0XHRpZiAoIW9iamVjdF91cmwpIHtcblx0XHRcdFx0XHRcdG9iamVjdF91cmwgPSBnZXRfVVJMKCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZm9yY2UpIHtcblx0XHRcdFx0XHRcdHZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBvcGVuZWQgPSB2aWV3Lm9wZW4ob2JqZWN0X3VybCwgXCJfYmxhbmtcIik7XG5cdFx0XHRcdFx0XHRpZiAoIW9wZW5lZCkge1xuXHRcdFx0XHRcdFx0XHQvLyBBcHBsZSBkb2VzIG5vdCBhbGxvdyB3aW5kb3cub3Blbiwgc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLmFwcGxlLmNvbS9saWJyYXJ5L3NhZmFyaS9kb2N1bWVudGF0aW9uL1Rvb2xzL0NvbmNlcHR1YWwvU2FmYXJpRXh0ZW5zaW9uR3VpZGUvV29ya2luZ3dpdGhXaW5kb3dzYW5kVGFicy9Xb3JraW5nd2l0aFdpbmRvd3NhbmRUYWJzLmh0bWxcblx0XHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRyZXZva2Uob2JqZWN0X3VybCk7XG5cdFx0XHRcdH1cblx0XHRcdDtcblx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLklOSVQ7XG5cblx0XHRcdGlmIChjYW5fdXNlX3NhdmVfbGluaykge1xuXHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzYXZlX2xpbmsuaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0c2F2ZV9saW5rLmRvd25sb2FkID0gbmFtZTtcblx0XHRcdFx0XHRjbGljayhzYXZlX2xpbmspO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRmc19lcnJvcigpO1xuXHRcdH1cblx0XHQsIEZTX3Byb3RvID0gRmlsZVNhdmVyLnByb3RvdHlwZVxuXHRcdCwgc2F2ZUFzID0gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdHJldHVybiBuZXcgRmlsZVNhdmVyKGJsb2IsIG5hbWUgfHwgYmxvYi5uYW1lIHx8IFwiZG93bmxvYWRcIiwgbm9fYXV0b19ib20pO1xuXHRcdH1cblx0O1xuXHQvLyBJRSAxMCsgKG5hdGl2ZSBzYXZlQXMpXG5cdGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRuYW1lID0gbmFtZSB8fCBibG9iLm5hbWUgfHwgXCJkb3dubG9hZFwiO1xuXG5cdFx0XHRpZiAoIW5vX2F1dG9fYm9tKSB7XG5cdFx0XHRcdGJsb2IgPSBhdXRvX2JvbShibG9iKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYihibG9iLCBuYW1lKTtcblx0XHR9O1xuXHR9XG5cblx0RlNfcHJvdG8uYWJvcnQgPSBmdW5jdGlvbigpe307XG5cdEZTX3Byb3RvLnJlYWR5U3RhdGUgPSBGU19wcm90by5JTklUID0gMDtcblx0RlNfcHJvdG8uV1JJVElORyA9IDE7XG5cdEZTX3Byb3RvLkRPTkUgPSAyO1xuXG5cdEZTX3Byb3RvLmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZXN0YXJ0ID1cblx0RlNfcHJvdG8ub25wcm9ncmVzcyA9XG5cdEZTX3Byb3RvLm9ud3JpdGUgPVxuXHRGU19wcm90by5vbmFib3J0ID1cblx0RlNfcHJvdG8ub25lcnJvciA9XG5cdEZTX3Byb3RvLm9ud3JpdGVlbmQgPVxuXHRcdG51bGw7XG5cblx0cmV0dXJuIHNhdmVBcztcbn0oXG5cdCAgIHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiICYmIHNlbGZcblx0fHwgdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3dcblx0fHwgdGhpcy5jb250ZW50XG4pKTtcbi8vIGBzZWxmYCBpcyB1bmRlZmluZWQgaW4gRmlyZWZveCBmb3IgQW5kcm9pZCBjb250ZW50IHNjcmlwdCBjb250ZXh0XG4vLyB3aGlsZSBgdGhpc2AgaXMgbnNJQ29udGVudEZyYW1lTWVzc2FnZU1hbmFnZXJcbi8vIHdpdGggYW4gYXR0cmlidXRlIGBjb250ZW50YCB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSB3aW5kb3dcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgbW9kdWxlLmV4cG9ydHMuc2F2ZUFzID0gc2F2ZUFzO1xufSBlbHNlIGlmICgodHlwZW9mIGRlZmluZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBkZWZpbmUgIT09IG51bGwpICYmIChkZWZpbmUuYW1kICE9PSBudWxsKSkge1xuICBkZWZpbmUoXCJGaWxlU2F2ZXIuanNcIiwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNhdmVBcztcbiAgfSk7XG59XG4iLCJmdW5jdGlvbiBnZXRKU09OUHJvbWlzZSh1cmwpIHtcblxuICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIHJlcXVlc3Qub3BlbignZ2V0JywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAndGV4dCc7XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UocmVxdWVzdC5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCdKU09OIGNvdWxkIG5vdCBiZSBsb2FkZWQgJyArIHVybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0SlNPTlByb21pc2U7XG4iLCJmdW5jdGlvbiBnZXRGb3JtVmFsdWVzKGZvcm1FbGVtZW50KSB7XG4gICAgdmFyIGZvcm1FbGVtZW50cyA9IGZvcm1FbGVtZW50LmVsZW1lbnRzO1xuICAgIHZhciBmb3JtUGFyYW1zID0ge307XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBlbGVtID0gbnVsbDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZm9ybUVsZW1lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGVsZW0gPSBmb3JtRWxlbWVudHNbaV07XG4gICAgICAgIHN3aXRjaCAoZWxlbS50eXBlKSB7XG5cbiAgICAgICAgICAgIGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdjaGVja2JveCc6XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0uY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBlbGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnc2VsZWN0LW11bHRpcGxlJzpcbiAgICAgICAgICAgICAgICB2YXIgc2VsZWN0VmFsdWVzID0gZ2V0U2VsZWN0VmFsdWVzKGVsZW0pO1xuICAgICAgICAgICAgICAgIGlmIChzZWxlY3RWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtUGFyYW1zW2VsZW0ubmFtZV0gPSBzZWxlY3RWYWx1ZXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAoZWxlbS52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1QYXJhbXNbZWxlbS5uYW1lXSA9IGVsZW0udmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmb3JtUGFyYW1zO1xufVxuXG5mdW5jdGlvbiBzZXRGb3JtVmFsdWVzKGZvcm1FbGVtZW50LCB2YWx1ZXMpIHtcbiAgICB2YXIgZm9ybUVsZW1lbnRzID0gZm9ybUVsZW1lbnQuZWxlbWVudHM7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBlbGVtID0gbnVsbDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZm9ybUVsZW1lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGVsZW0gPSBmb3JtRWxlbWVudHNbaV07XG5cbiAgICAgICAgc3dpdGNoIChlbGVtLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N1Ym1pdCc6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyYWRpbyc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdID09PSBlbGVtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZXNbZWxlbS5uYW1lXSA9PT0gZWxlbS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlc1tlbGVtLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFNlbGVjdFZhbHVlcyhlbGVtLCB2YWx1ZXNbZWxlbS5uYW1lXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodmFsdWVzW2VsZW0ubmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtLnZhbHVlID0gdmFsdWVzW2VsZW0ubmFtZV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNldFNlbGVjdFZhbHVlcyhzZWxlY3RFbGVtLCB2YWx1ZXMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHNlbGVjdEVsZW0ub3B0aW9ucztcbiAgICB2YXIgb3B0O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBvcHRpb25zLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgICAgICBvcHQgPSBvcHRpb25zW2ldO1xuICAgICAgICBpZiAodmFsdWVzLmluZGV4T2Yob3B0LnZhbHVlKSA+IC0xKSB7XG4gICAgICAgICAgICBvcHQuc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3B0LnNlbGVjdGVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFNlbGVjdFZhbHVlcyhzZWxlY3QpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIG9wdGlvbnMgPSBzZWxlY3QgJiYgc2VsZWN0Lm9wdGlvbnM7XG4gICAgdmFyIG9wdDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBpTGVuID0gb3B0aW9ucy5sZW5ndGg7IGkgPCBpTGVuOyBpKyspIHtcbiAgICAgICAgb3B0ID0gb3B0aW9uc1tpXTtcblxuICAgICAgICBpZiAob3B0LnNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChvcHQudmFsdWUgfHwgb3B0LnRleHQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdldFNldEZvcm1WYWx1ZXMoKSB7XG4gICAgdGhpcy5zZXQgPSBzZXRGb3JtVmFsdWVzO1xuICAgIHRoaXMuZ2V0ID0gZ2V0Rm9ybVZhbHVlcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRTZXRGb3JtVmFsdWVzO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIG9ialR5cGUgPSByZXF1aXJlKCdvYmotdHlwZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChlbCwgc3RyKSB7XG5cdGlmIChvYmpUeXBlKGVsKS5pbmRleE9mKCdlbGVtZW50JykgPT09IC0xKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYW4gSFRNTCBET00gZWxlbWVudCBhcyBmaXJzdCBhcmd1bWVudCcpO1xuXHR9XG5cblx0aWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignRXhwZWN0ZWQgYSBzdHJpbmcgYXMgc2Vjb25kIGFyZ3VtZW50Jyk7XG5cdH1cblxuXHRpZiAoZWwuY2xhc3NMaXN0KSB7XG5cdFx0cmV0dXJuIGVsLmNsYXNzTGlzdC5jb250YWlucyhzdHIpO1xuXHR9XG5cblx0cmV0dXJuIG5ldyBSZWdFeHAoJyhefCApJyArIHN0ciArICcoIHwkKScsICdnaScpLnRlc3QoZWwuY2xhc3NOYW1lKTtcbn07XG4iLCJ2YXIgdGlueVNhbXBsZUxvYWRlciA9IHJlcXVpcmUoJ3Rpbnktc2FtcGxlLWxvYWRlcicpO1xudmFyIGF1ZGlvQnVmZmVySW5zdHJ1bWVudCA9IHJlcXVpcmUoJ2F1ZGlvLWJ1ZmZlci1pbnN0cnVtZW50Jyk7XG52YXIgZ2V0SlNPTiA9IHJlcXVpcmUoJ2dldC1qc29uLXByb21pc2UnKTtcblxudmFyIGJ1ZmZlcnMgPSB7fTtcbmZ1bmN0aW9uIGdldFNhbXBsZVByb21pc2VzIChjdHgsIGRhdGEpIHtcbiAgICB2YXIgYmFzZVVybCA9IGRhdGEuc2FtcGxlcztcbiAgICB2YXIgcHJvbWlzZXMgPSBbXTtcblxuICAgIGRhdGEuZmlsZW5hbWUgPSBbXTtcbiAgICB2YXIgaSA9IDA7XG4gICAgZGF0YS5maWxlcy5mb3JFYWNoKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFyIGZpbGVuYW1lID0gdmFsLnJlcGxhY2UoL1xcLlteLy5dKyQvLCBcIlwiKTtcbiAgICAgICAgZGF0YS5maWxlbmFtZS5wdXNoKGZpbGVuYW1lKTtcbiAgICAgICAgdmFyIHJlbW90ZVVybCA9IGJhc2VVcmwgKyB2YWw7XG5cbiAgICAgICAgbGV0IGxvYWRlclByb21pc2UgPSB0aW55U2FtcGxlTG9hZGVyKGN0eCwgcmVtb3RlVXJsKTtcbiAgICAgICAgbG9hZGVyUHJvbWlzZS50aGVuKGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgICAgIGJ1ZmZlcnNbZmlsZW5hbWVdID0gbmV3IGF1ZGlvQnVmZmVySW5zdHJ1bWVudChjdHgsIGJ1ZmZlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHByb21pc2VzLnB1c2gobG9hZGVyUHJvbWlzZSk7XG5cbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gcHJvbWlzZXM7XG59XG5cbmZ1bmN0aW9uIHNhbXBsZUFsbFByb21pc2UoY3R4LCBkYXRhVXJsKSB7XG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIHZhciBqc29uUHJvbWlzZSA9IGdldEpTT04oZGF0YVVybCk7XG4gICAgICAgIGpzb25Qcm9taXNlLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgdmFyIHNhbXBsZVByb21pc2VzID0gZ2V0U2FtcGxlUHJvbWlzZXMoY3R4LCBkYXRhKTtcbiAgICAgICAgICAgIFByb21pc2UuYWxsKHNhbXBsZVByb21pc2VzKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe2RhdGE6IGRhdGEsIGJ1ZmZlcnM6IGJ1ZmZlcnN9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5jYXRjaCAoZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBwcm9taXNlO1xufVxuXG5mdW5jdGlvbiBsb2FkU2FtcGxlU2V0KGN0eCwgZGF0YVVybCkge1xuICAgIHJldHVybiBzYW1wbGVBbGxQcm9taXNlKGN0eCwgZGF0YVVybCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbG9hZFNhbXBsZVNldDtcbiIsImZ1bmN0aW9uIHNhbXBsZUxvYWRlciAoY29udGV4dCwgdXJsKSB7XG4gICAgXG4gICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7IFxuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIFxuICAgICAgICByZXF1ZXN0Lm9wZW4oJ2dldCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZihyZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKXtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmRlY29kZUF1ZGlvRGF0YShyZXF1ZXN0LnJlc3BvbnNlLCBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KCd0aW55LXNhbXBsZS1sb2FkZXIgcmVxdWVzdCBmYWlsZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9KTtcbiAgICBcbiAgICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2FtcGxlTG9hZGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqKSB7XG5cdHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKS5yZXBsYWNlKC9eXFxbb2JqZWN0ICguKylcXF0kLywgJyQxJykudG9Mb3dlckNhc2UoKTtcbn07XG4iLCJmdW5jdGlvbiBzZWxlY3RFbGVtZW50KGFwcGVuZFRvSUQsIHNlbGVjdElELCBvcHRpb25zLCBzZWxlY3RlZCkge1xuXG4gICAgdGhpcy5hcHBlbmRUb0lEID0gYXBwZW5kVG9JRDtcbiAgICB0aGlzLnNlbGVjdElEID0gc2VsZWN0SUQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLnNlbGVjdGVkID0gc2VsZWN0ZWQ7XG5cbiAgICB0aGlzLnNlbGVjdExpc3Q7XG4gICAgXG4gICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbihjYikge1xuICAgICAgICB2YXIgYXBwZW5kVG9JRCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuYXBwZW5kVG9JRCk7XG4gICAgICAgIHRoaXMuc2VsZWN0TGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzZWxlY3RcIik7XG4gICAgICAgIHRoaXMuc2VsZWN0TGlzdC5pZCA9IHRoaXMuc2VsZWN0SUQ7ICAgICAgICBcbiAgICAgICAgYXBwZW5kVG9JRC5hcHBlbmRDaGlsZCh0aGlzLnNlbGVjdExpc3QpO1xuICAgICAgICB0aGlzLnVwZGF0ZShzZWxlY3RJRCwgdGhpcy5vcHRpb25zLCB0aGlzLnNlbGVjdGVkKTtcbiAgICB9O1xuXG4gICAgdGhpcy5vbkNoYW5nZSA9IGZ1bmN0aW9uIChjYikge1xuICAgICAgICB0aGlzLnNlbGVjdExpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGNiKHRoaXMudmFsdWUpXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKGVsZW0sIG9wdGlvbnMsIHNlbGVjdGVkKSB7XG4gICAgICAgIHRoaXMuZGVsZXRlKGVsZW0pO1xuICAgICAgICB2YXIgc2VsZWN0TGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW0pO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XG4gICAgICAgICAgICBvcHRpb24udmFsdWUgPSBrZXk7XG4gICAgICAgICAgICBvcHRpb24udGV4dCA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgICAgIHNlbGVjdExpc3QuYXBwZW5kQ2hpbGQob3B0aW9uKTtcblxuICAgICAgICAgICAgaWYgKGtleSA9PT0gc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBvcHRpb24uc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB0aGlzLmdldFNlbGVjdGVkID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtKTtcbiAgICAgICAgdmFyIG9wdDtcbiAgICAgICAgZm9yICggdmFyIGkgPSAwLCBsZW4gPSBzZWxlY3RMaXN0Lm9wdGlvbnMubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XG4gICAgICAgICAgICBvcHQgPSBzZWxlY3RMaXN0Lm9wdGlvbnNbaV07XG4gICAgICAgICAgICBpZiAoIG9wdC5zZWxlY3RlZCA9PT0gdHJ1ZSApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0LnZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIHNlbGVjdExpc3Q9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbSk7XG4gICAgICAgIGZvciAodmFyIG9wdGlvbiBpbiBzZWxlY3RMaXN0KXtcbiAgICAgICAgICAgIHNlbGVjdExpc3QucmVtb3ZlKG9wdGlvbik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHRoaXMuZ2V0QXNTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGhpcy5hcHBlbmRUb0lEKTtcbiAgICAgICAgdmFyIGVsZW1lbnRIdG1sID0gZWxlbWVudC5vdXRlckhUTUw7XG4gICAgICAgIHJldHVybiBlbGVtZW50SHRtbDtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNlbGVjdEVsZW1lbnQ7IiwidmFyIFdBQUNsb2NrID0gcmVxdWlyZSgnLi9saWIvV0FBQ2xvY2snKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdBQUNsb2NrXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHdpbmRvdy5XQUFDbG9jayA9IFdBQUNsb2NrXG4iLCJ2YXIgaXNCcm93c2VyID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuXG52YXIgQ0xPQ0tfREVGQVVMVFMgPSB7XG4gIHRvbGVyYW5jZUxhdGU6IDAuMTAsXG4gIHRvbGVyYW5jZUVhcmx5OiAwLjAwMVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBFdmVudCA9PT09PT09PT09PT09PT09PT09PSAvL1xudmFyIEV2ZW50ID0gZnVuY3Rpb24oY2xvY2ssIGRlYWRsaW5lLCBmdW5jKSB7XG4gIHRoaXMuY2xvY2sgPSBjbG9ja1xuICB0aGlzLmZ1bmMgPSBmdW5jXG4gIHRoaXMuX2NsZWFyZWQgPSBmYWxzZSAvLyBGbGFnIHVzZWQgdG8gY2xlYXIgYW4gZXZlbnQgaW5zaWRlIGNhbGxiYWNrXG5cbiAgdGhpcy50b2xlcmFuY2VMYXRlID0gY2xvY2sudG9sZXJhbmNlTGF0ZVxuICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gY2xvY2sudG9sZXJhbmNlRWFybHlcbiAgdGhpcy5fbGF0ZXN0VGltZSA9IG51bGxcbiAgdGhpcy5fZWFybGllc3RUaW1lID0gbnVsbFxuICB0aGlzLmRlYWRsaW5lID0gbnVsbFxuICB0aGlzLnJlcGVhdFRpbWUgPSBudWxsXG5cbiAgdGhpcy5zY2hlZHVsZShkZWFkbGluZSlcbn1cblxuLy8gVW5zY2hlZHVsZXMgdGhlIGV2ZW50XG5FdmVudC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgdGhpcy5fY2xlYXJlZCA9IHRydWVcbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gU2V0cyB0aGUgZXZlbnQgdG8gcmVwZWF0IGV2ZXJ5IGB0aW1lYCBzZWNvbmRzLlxuRXZlbnQucHJvdG90eXBlLnJlcGVhdCA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgaWYgKHRpbWUgPT09IDApXG4gICAgdGhyb3cgbmV3IEVycm9yKCdkZWxheSBjYW5ub3QgYmUgMCcpXG4gIHRoaXMucmVwZWF0VGltZSA9IHRpbWVcbiAgaWYgKCF0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSlcbiAgICB0aGlzLnNjaGVkdWxlKHRoaXMuZGVhZGxpbmUgKyB0aGlzLnJlcGVhdFRpbWUpXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFNldHMgdGhlIHRpbWUgdG9sZXJhbmNlIG9mIHRoZSBldmVudC5cbi8vIFRoZSBldmVudCB3aWxsIGJlIGV4ZWN1dGVkIGluIHRoZSBpbnRlcnZhbCBgW2RlYWRsaW5lIC0gZWFybHksIGRlYWRsaW5lICsgbGF0ZV1gXG4vLyBJZiB0aGUgY2xvY2sgZmFpbHMgdG8gZXhlY3V0ZSB0aGUgZXZlbnQgaW4gdGltZSwgdGhlIGV2ZW50IHdpbGwgYmUgZHJvcHBlZC5cbkV2ZW50LnByb3RvdHlwZS50b2xlcmFuY2UgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZXMubGF0ZSA9PT0gJ251bWJlcicpXG4gICAgdGhpcy50b2xlcmFuY2VMYXRlID0gdmFsdWVzLmxhdGVcbiAgaWYgKHR5cGVvZiB2YWx1ZXMuZWFybHkgPT09ICdudW1iZXInKVxuICAgIHRoaXMudG9sZXJhbmNlRWFybHkgPSB2YWx1ZXMuZWFybHlcbiAgdGhpcy5fcmVmcmVzaEVhcmx5TGF0ZURhdGVzKClcbiAgaWYgKHRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKSB7XG4gICAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgICB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgZXZlbnQgaXMgcmVwZWF0ZWQsIGZhbHNlIG90aGVyd2lzZVxuRXZlbnQucHJvdG90eXBlLmlzUmVwZWF0ZWQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucmVwZWF0VGltZSAhPT0gbnVsbCB9XG5cbi8vIFNjaGVkdWxlcyB0aGUgZXZlbnQgdG8gYmUgcmFuIGJlZm9yZSBgZGVhZGxpbmVgLlxuLy8gSWYgdGhlIHRpbWUgaXMgd2l0aGluIHRoZSBldmVudCB0b2xlcmFuY2UsIHdlIGhhbmRsZSB0aGUgZXZlbnQgaW1tZWRpYXRlbHkuXG4vLyBJZiB0aGUgZXZlbnQgd2FzIGFscmVhZHkgc2NoZWR1bGVkIGF0IGEgZGlmZmVyZW50IHRpbWUsIGl0IGlzIHJlc2NoZWR1bGVkLlxuRXZlbnQucHJvdG90eXBlLnNjaGVkdWxlID0gZnVuY3Rpb24oZGVhZGxpbmUpIHtcbiAgdGhpcy5fY2xlYXJlZCA9IGZhbHNlXG4gIHRoaXMuZGVhZGxpbmUgPSBkZWFkbGluZVxuICB0aGlzLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMoKVxuXG4gIGlmICh0aGlzLmNsb2NrLmNvbnRleHQuY3VycmVudFRpbWUgPj0gdGhpcy5fZWFybGllc3RUaW1lKSB7XG4gICAgdGhpcy5fZXhlY3V0ZSgpXG4gIFxuICB9IGVsc2UgaWYgKHRoaXMuY2xvY2suX2hhc0V2ZW50KHRoaXMpKSB7XG4gICAgdGhpcy5jbG9jay5fcmVtb3ZlRXZlbnQodGhpcylcbiAgICB0aGlzLmNsb2NrLl9pbnNlcnRFdmVudCh0aGlzKVxuICBcbiAgfSBlbHNlIHRoaXMuY2xvY2suX2luc2VydEV2ZW50KHRoaXMpXG59XG5cbkV2ZW50LnByb3RvdHlwZS50aW1lU3RyZXRjaCA9IGZ1bmN0aW9uKHRSZWYsIHJhdGlvKSB7XG4gIGlmICh0aGlzLmlzUmVwZWF0ZWQoKSlcbiAgICB0aGlzLnJlcGVhdFRpbWUgPSB0aGlzLnJlcGVhdFRpbWUgKiByYXRpb1xuXG4gIHZhciBkZWFkbGluZSA9IHRSZWYgKyByYXRpbyAqICh0aGlzLmRlYWRsaW5lIC0gdFJlZilcbiAgLy8gSWYgdGhlIGRlYWRsaW5lIGlzIHRvbyBjbG9zZSBvciBwYXN0LCBhbmQgdGhlIGV2ZW50IGhhcyBhIHJlcGVhdCxcbiAgLy8gd2UgY2FsY3VsYXRlIHRoZSBuZXh0IHJlcGVhdCBwb3NzaWJsZSBpbiB0aGUgc3RyZXRjaGVkIHNwYWNlLlxuICBpZiAodGhpcy5pc1JlcGVhdGVkKCkpIHtcbiAgICB3aGlsZSAodGhpcy5jbG9jay5jb250ZXh0LmN1cnJlbnRUaW1lID49IGRlYWRsaW5lIC0gdGhpcy50b2xlcmFuY2VFYXJseSlcbiAgICAgIGRlYWRsaW5lICs9IHRoaXMucmVwZWF0VGltZVxuICB9XG4gIHRoaXMuc2NoZWR1bGUoZGVhZGxpbmUpXG59XG5cbi8vIEV4ZWN1dGVzIHRoZSBldmVudFxuRXZlbnQucHJvdG90eXBlLl9leGVjdXRlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmNsb2NrLl9zdGFydGVkID09PSBmYWxzZSkgcmV0dXJuXG4gIHRoaXMuY2xvY2suX3JlbW92ZUV2ZW50KHRoaXMpXG5cbiAgaWYgKHRoaXMuY2xvY2suY29udGV4dC5jdXJyZW50VGltZSA8IHRoaXMuX2xhdGVzdFRpbWUpXG4gICAgdGhpcy5mdW5jKHRoaXMpXG4gIGVsc2Uge1xuICAgIGlmICh0aGlzLm9uZXhwaXJlZCkgdGhpcy5vbmV4cGlyZWQodGhpcylcbiAgICBjb25zb2xlLndhcm4oJ2V2ZW50IGV4cGlyZWQnKVxuICB9XG4gIC8vIEluIHRoZSBjYXNlIGBzY2hlZHVsZWAgaXMgY2FsbGVkIGluc2lkZSBgZnVuY2AsIHdlIG5lZWQgdG8gYXZvaWRcbiAgLy8gb3ZlcnJ3cml0aW5nIHdpdGggeWV0IGFub3RoZXIgYHNjaGVkdWxlYC5cbiAgaWYgKCF0aGlzLmNsb2NrLl9oYXNFdmVudCh0aGlzKSAmJiB0aGlzLmlzUmVwZWF0ZWQoKSAmJiAhdGhpcy5fY2xlYXJlZClcbiAgICB0aGlzLnNjaGVkdWxlKHRoaXMuZGVhZGxpbmUgKyB0aGlzLnJlcGVhdFRpbWUpIFxufVxuXG4vLyBVcGRhdGVzIGNhY2hlZCB0aW1lc1xuRXZlbnQucHJvdG90eXBlLl9yZWZyZXNoRWFybHlMYXRlRGF0ZXMgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fbGF0ZXN0VGltZSA9IHRoaXMuZGVhZGxpbmUgKyB0aGlzLnRvbGVyYW5jZUxhdGVcbiAgdGhpcy5fZWFybGllc3RUaW1lID0gdGhpcy5kZWFkbGluZSAtIHRoaXMudG9sZXJhbmNlRWFybHlcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT0gV0FBQ2xvY2sgPT09PT09PT09PT09PT09PT09PT0gLy9cbnZhciBXQUFDbG9jayA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29udGV4dCwgb3B0cykge1xuICB2YXIgc2VsZiA9IHRoaXNcbiAgb3B0cyA9IG9wdHMgfHwge31cbiAgdGhpcy50aWNrTWV0aG9kID0gb3B0cy50aWNrTWV0aG9kIHx8ICdTY3JpcHRQcm9jZXNzb3JOb2RlJ1xuICB0aGlzLnRvbGVyYW5jZUVhcmx5ID0gb3B0cy50b2xlcmFuY2VFYXJseSB8fCBDTE9DS19ERUZBVUxUUy50b2xlcmFuY2VFYXJseVxuICB0aGlzLnRvbGVyYW5jZUxhdGUgPSBvcHRzLnRvbGVyYW5jZUxhdGUgfHwgQ0xPQ0tfREVGQVVMVFMudG9sZXJhbmNlTGF0ZVxuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0XG4gIHRoaXMuX2V2ZW50cyA9IFtdXG4gIHRoaXMuX3N0YXJ0ZWQgPSBmYWxzZVxufVxuXG4vLyAtLS0tLS0tLS0tIFB1YmxpYyBBUEkgLS0tLS0tLS0tLSAvL1xuLy8gU2NoZWR1bGVzIGBmdW5jYCB0byBydW4gYWZ0ZXIgYGRlbGF5YCBzZWNvbmRzLlxuV0FBQ2xvY2sucHJvdG90eXBlLnNldFRpbWVvdXQgPSBmdW5jdGlvbihmdW5jLCBkZWxheSkge1xuICByZXR1cm4gdGhpcy5fY3JlYXRlRXZlbnQoZnVuYywgdGhpcy5fYWJzVGltZShkZWxheSkpXG59XG5cbi8vIFNjaGVkdWxlcyBgZnVuY2AgdG8gcnVuIGJlZm9yZSBgZGVhZGxpbmVgLlxuV0FBQ2xvY2sucHJvdG90eXBlLmNhbGxiYWNrQXRUaW1lID0gZnVuY3Rpb24oZnVuYywgZGVhZGxpbmUpIHtcbiAgcmV0dXJuIHRoaXMuX2NyZWF0ZUV2ZW50KGZ1bmMsIGRlYWRsaW5lKVxufVxuXG4vLyBTdHJldGNoZXMgYGRlYWRsaW5lYCBhbmQgYHJlcGVhdGAgb2YgYWxsIHNjaGVkdWxlZCBgZXZlbnRzYCBieSBgcmF0aW9gLCBrZWVwaW5nXG4vLyB0aGVpciByZWxhdGl2ZSBkaXN0YW5jZSB0byBgdFJlZmAuIEluIGZhY3QgdGhpcyBpcyBlcXVpdmFsZW50IHRvIGNoYW5naW5nIHRoZSB0ZW1wby5cbldBQUNsb2NrLnByb3RvdHlwZS50aW1lU3RyZXRjaCA9IGZ1bmN0aW9uKHRSZWYsIGV2ZW50cywgcmF0aW8pIHtcbiAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHsgZXZlbnQudGltZVN0cmV0Y2godFJlZiwgcmF0aW8pIH0pXG4gIHJldHVybiBldmVudHNcbn1cblxuLy8gUmVtb3ZlcyBhbGwgc2NoZWR1bGVkIGV2ZW50cyBhbmQgc3RhcnRzIHRoZSBjbG9jayBcbldBQUNsb2NrLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fc3RhcnRlZCA9PT0gZmFsc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICB0aGlzLl9zdGFydGVkID0gdHJ1ZVxuICAgIHRoaXMuX2V2ZW50cyA9IFtdXG5cbiAgICBpZiAodGhpcy50aWNrTWV0aG9kID09PSAnU2NyaXB0UHJvY2Vzc29yTm9kZScpIHtcbiAgICAgIHZhciBidWZmZXJTaXplID0gMjU2XG4gICAgICAvLyBXZSBoYXZlIHRvIGtlZXAgYSByZWZlcmVuY2UgdG8gdGhlIG5vZGUgdG8gYXZvaWQgZ2FyYmFnZSBjb2xsZWN0aW9uXG4gICAgICB0aGlzLl9jbG9ja05vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIDEsIDEpXG4gICAgICB0aGlzLl9jbG9ja05vZGUuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pXG4gICAgICB0aGlzLl9jbG9ja05vZGUub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7IHNlbGYuX3RpY2soKSB9KVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGhpcy50aWNrTWV0aG9kID09PSAnbWFudWFsJykgbnVsbCAvLyBfdGljayBpcyBjYWxsZWQgbWFudWFsbHlcblxuICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKCdpbnZhbGlkIHRpY2tNZXRob2QgJyArIHRoaXMudGlja01ldGhvZClcbiAgfVxufVxuXG4vLyBTdG9wcyB0aGUgY2xvY2tcbldBQUNsb2NrLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9zdGFydGVkID09PSB0cnVlKSB7XG4gICAgdGhpcy5fc3RhcnRlZCA9IGZhbHNlXG4gICAgdGhpcy5fY2xvY2tOb2RlLmRpc2Nvbm5lY3QoKVxuICB9ICBcbn1cblxuLy8gLS0tLS0tLS0tLSBQcml2YXRlIC0tLS0tLS0tLS0gLy9cblxuLy8gVGhpcyBmdW5jdGlvbiBpcyByYW4gcGVyaW9kaWNhbGx5LCBhbmQgYXQgZWFjaCB0aWNrIGl0IGV4ZWN1dGVzXG4vLyBldmVudHMgZm9yIHdoaWNoIGBjdXJyZW50VGltZWAgaXMgaW5jbHVkZWQgaW4gdGhlaXIgdG9sZXJhbmNlIGludGVydmFsLlxuV0FBQ2xvY2sucHJvdG90eXBlLl90aWNrID0gZnVuY3Rpb24oKSB7XG4gIHZhciBldmVudCA9IHRoaXMuX2V2ZW50cy5zaGlmdCgpXG5cbiAgd2hpbGUoZXZlbnQgJiYgZXZlbnQuX2VhcmxpZXN0VGltZSA8PSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUpIHtcbiAgICBldmVudC5fZXhlY3V0ZSgpXG4gICAgZXZlbnQgPSB0aGlzLl9ldmVudHMuc2hpZnQoKVxuICB9XG5cbiAgLy8gUHV0IGJhY2sgdGhlIGxhc3QgZXZlbnRcbiAgaWYoZXZlbnQpIHRoaXMuX2V2ZW50cy51bnNoaWZ0KGV2ZW50KVxufVxuXG4vLyBDcmVhdGVzIGFuIGV2ZW50IGFuZCBpbnNlcnQgaXQgdG8gdGhlIGxpc3RcbldBQUNsb2NrLnByb3RvdHlwZS5fY3JlYXRlRXZlbnQgPSBmdW5jdGlvbihmdW5jLCBkZWFkbGluZSkge1xuICByZXR1cm4gbmV3IEV2ZW50KHRoaXMsIGRlYWRsaW5lLCBmdW5jKVxufVxuXG4vLyBJbnNlcnRzIGFuIGV2ZW50IHRvIHRoZSBsaXN0XG5XQUFDbG9jay5wcm90b3R5cGUuX2luc2VydEV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdGhpcy5fZXZlbnRzLnNwbGljZSh0aGlzLl9pbmRleEJ5VGltZShldmVudC5fZWFybGllc3RUaW1lKSwgMCwgZXZlbnQpXG59XG5cbi8vIFJlbW92ZXMgYW4gZXZlbnQgZnJvbSB0aGUgbGlzdFxuV0FBQ2xvY2sucHJvdG90eXBlLl9yZW1vdmVFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBpbmQgPSB0aGlzLl9ldmVudHMuaW5kZXhPZihldmVudClcbiAgaWYgKGluZCAhPT0gLTEpIHRoaXMuX2V2ZW50cy5zcGxpY2UoaW5kLCAxKVxufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgYGV2ZW50YCBpcyBpbiBxdWV1ZSwgZmFsc2Ugb3RoZXJ3aXNlXG5XQUFDbG9jay5wcm90b3R5cGUuX2hhc0V2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiByZXR1cm4gdGhpcy5fZXZlbnRzLmluZGV4T2YoZXZlbnQpICE9PSAtMVxufVxuXG4vLyBSZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgZmlyc3QgZXZlbnQgd2hvc2UgZGVhZGxpbmUgaXMgPj0gdG8gYGRlYWRsaW5lYFxuV0FBQ2xvY2sucHJvdG90eXBlLl9pbmRleEJ5VGltZSA9IGZ1bmN0aW9uKGRlYWRsaW5lKSB7XG4gIC8vIHBlcmZvcm1zIGEgYmluYXJ5IHNlYXJjaFxuICB2YXIgbG93ID0gMFxuICAgICwgaGlnaCA9IHRoaXMuX2V2ZW50cy5sZW5ndGhcbiAgICAsIG1pZFxuICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgIG1pZCA9IE1hdGguZmxvb3IoKGxvdyArIGhpZ2gpIC8gMilcbiAgICBpZiAodGhpcy5fZXZlbnRzW21pZF0uX2VhcmxpZXN0VGltZSA8IGRlYWRsaW5lKVxuICAgICAgbG93ID0gbWlkICsgMVxuICAgIGVsc2UgaGlnaCA9IG1pZFxuICB9XG4gIHJldHVybiBsb3dcbn1cblxuLy8gQ29udmVydHMgZnJvbSByZWxhdGl2ZSB0aW1lIHRvIGFic29sdXRlIHRpbWVcbldBQUNsb2NrLnByb3RvdHlwZS5fYWJzVGltZSA9IGZ1bmN0aW9uKHJlbFRpbWUpIHtcbiAgcmV0dXJuIHJlbFRpbWUgKyB0aGlzLmNvbnRleHQuY3VycmVudFRpbWVcbn1cblxuLy8gQ29udmVydHMgZnJvbSBhYnNvbHV0ZSB0aW1lIHRvIHJlbGF0aXZlIHRpbWUgXG5XQUFDbG9jay5wcm90b3R5cGUuX3JlbFRpbWUgPSBmdW5jdGlvbihhYnNUaW1lKSB7XG4gIHJldHVybiBhYnNUaW1lIC0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lXG59IiwiY29uc3QgbG9hZFNhbXBsZVNldCA9IHJlcXVpcmUoJ2xvYWQtc2FtcGxlLXNldCcpO1xuY29uc3Qgc2VsZWN0RWxlbWVudCA9IHJlcXVpcmUoJ3NlbGVjdC1lbGVtZW50Jyk7XG5jb25zdCBnZXRTZXRGb3JtVmFsdWVzID0gcmVxdWlyZSgnZ2V0LXNldC1mb3JtLXZhbHVlcycpO1xuY29uc3QgYWRzckdhaW5Ob2RlID0gcmVxdWlyZSgnYWRzci1nYWluLW5vZGUnKTtcbmNvbnN0IHNpbXBsZVRyYWNrZXIgPSByZXF1aXJlKCcuL3NpbXBsZS10cmFja2VyJyk7XG5jb25zdCBGaWxlU2F2ZXIgPSByZXF1aXJlKCdmaWxlLXNhdmVyJyk7XG5cbmNvbnN0IGdldFNldENvbnRyb2xzID0gcmVxdWlyZSgnLi9nZXQtc2V0LWNvbnRyb2xzJyk7XG5jb25zdCBnZXRTZXRBdWRpb09wdGlvbnMgPSBuZXcgZ2V0U2V0Q29udHJvbHMoKTtcblxuY29uc3QgY3R4ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xuY29uc3QgZGVmYXVsdFRyYWNrID0gcmVxdWlyZSgnLi9kZWZhdWx0LXRyYWNrJyk7XG5cbnZhciBidWZmZXJzO1xudmFyIGN1cnJlbnRTYW1wbGVEYXRhO1xudmFyIHN0b3JhZ2U7XG5cbmZ1bmN0aW9uIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkYXRhVXJsLCB0cmFjaykge1xuXG4gICAgdmFyIHNhbXBsZVNldFByb21pc2UgPSBsb2FkU2FtcGxlU2V0KGN0eCwgZGF0YVVybCk7XG4gICAgc2FtcGxlU2V0UHJvbWlzZS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG5cbiAgICAgICAgYnVmZmVycyA9IGRhdGEuYnVmZmVycztcbiAgICAgICAgc2FtcGxlRGF0YSA9IGRhdGEuZGF0YTtcblxuICAgICAgICBpZiAoIXRyYWNrKSB7XG4gICAgICAgICAgICB0cmFjayA9IHN0b3JhZ2UuZ2V0VHJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCkge1xuICAgICAgICAgICAgdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aCA9IDE2O1xuICAgICAgICB9XG5cbiAgICAgICAgY3VycmVudFNhbXBsZURhdGEgPSBzYW1wbGVEYXRhO1xuICAgICAgICBzZXR1cFRyYWNrZXJIdG1sKHNhbXBsZURhdGEsIHRyYWNrLnNldHRpbmdzLm1lYXN1cmVMZW5ndGgpO1xuICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjay5iZWF0KTtcbiAgICAgICAgc2NoZWR1bGUuc2V0dXBFdmVudHMoKTtcbiAgICB9KTtcbiAgIFxufVxuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgIGxldCBmb3JtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0cmFja2VyQ29udHJvbHNcIik7XG5cbiAgICBmb3JtVmFsdWVzLnNldChmb3JtLCBkZWZhdWx0VHJhY2suc2V0dGluZ3MpO1xuICAgIGdldFNldEF1ZGlvT3B0aW9ucy5zZXRUcmFja2VyQ29udHJvbHMoZGVmYXVsdFRyYWNrLnNldHRpbmdzKTtcblxuICAgIGluaXRpYWxpemVTYW1wbGVTZXQoY3R4LCBkZWZhdWx0VHJhY2suc2V0dGluZ3Muc2FtcGxlU2V0LCBkZWZhdWx0VHJhY2spO1xuICAgIHNldHVwQmFzZUV2ZW50cygpO1xuXG4gICAgc3RvcmFnZSA9IG5ldyB0cmFja3NMb2NhbFN0b3JhZ2UoKTtcbiAgICBzdG9yYWdlLnNldHVwU3RvcmFnZSgpO1xufTtcblxudmFyIGluc3RydW1lbnREYXRhID0ge307XG5mdW5jdGlvbiBzZXR1cFRyYWNrZXJIdG1sKGRhdGEsIG1lYXN1cmVMZW5ndGgpIHtcbiAgICBpbnN0cnVtZW50RGF0YSA9IGRhdGE7XG4gICAgaW5zdHJ1bWVudERhdGEudGl0bGUgPSBpbnN0cnVtZW50RGF0YS5maWxlbmFtZTtcbiAgICBzY2hlZHVsZS5kcmF3VHJhY2tlcihkYXRhLmZpbGVuYW1lLmxlbmd0aCwgbWVhc3VyZUxlbmd0aCwgaW5zdHJ1bWVudERhdGEpO1xuICAgIHJldHVybjtcbn1cblxuZnVuY3Rpb24gZGlzY29ubmVjdE5vZGUobm9kZSwgb3B0aW9ucykge1xuICAgIGxldCB0b3RhbExlbmd0aCA9XG4gICAgICAgIG9wdGlvbnMuYXR0YWNrVGltZSArIG9wdGlvbnMuc3VzdGFpblRpbWUgKyBvcHRpb25zLnJlbGVhc2VUaW1lO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBub2RlLmRpc2Nvbm5lY3QoKTtcbiAgICB9LCB0b3RhbExlbmd0aCAqIDEwMDApO1xufVxuXG5mdW5jdGlvbiBzY2hlZHVsZUF1ZGlvQmVhdChiZWF0LCB0cmlnZ2VyVGltZSkge1xuXG4gICAgbGV0IGluc3RydW1lbnROYW1lID0gaW5zdHJ1bWVudERhdGEuZmlsZW5hbWVbYmVhdC5yb3dJZF07XG4gICAgbGV0IGluc3RydW1lbnQgPSBidWZmZXJzW2luc3RydW1lbnROYW1lXS5nZXQoKTtcbiAgICBsZXQgb3B0aW9ucyA9IGdldFNldEF1ZGlvT3B0aW9ucy5nZXRUcmFja2VyQ29udHJvbHMoKTtcblxuXG4gICAgZnVuY3Rpb24gcGxheShzb3VyY2UpIHtcblxuICAgICAgICBzb3VyY2UuZGV0dW5lLnZhbHVlID0gb3B0aW9ucy5kZXR1bmU7XG5cbiAgICAgICAgLy8gR2FpblxuICAgICAgICBsZXQgbm9kZSA9IHJvdXRlR2Fpbihzb3VyY2UpXG4gICAgICAgIG5vZGUgPSByb3V0ZURlbGF5KG5vZGUpO1xuICAgICAgICAvLyBub2RlID0gcm91dGVDb21wcmVzc29yKG5vZGUpO1xuICAgICAgICBub2RlLmNvbm5lY3QoY3R4LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgc291cmNlLnN0YXJ0KHRyaWdnZXJUaW1lKTtcblxuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcm91dGVHYWluIChzb3VyY2UpIHtcbiAgICAgICAgbGV0IGdhaW4gPSBuZXcgYWRzckdhaW5Ob2RlKGN0eCk7XG4gICAgICAgIGdhaW4ubW9kZSA9ICdsaW5lYXJSYW1wVG9WYWx1ZUF0VGltZSc7XG4gICAgICAgIGxldCBvcHRpb25zID0gZ2V0U2V0QXVkaW9PcHRpb25zLmdldFRyYWNrZXJDb250cm9scygpO1xuXG4gICAgICAgIGxldCBnYWluTm9kZTsgXG5cbiAgICAgICAgLy8gTm90IGVuYWJsZWQgLSBkZWZhdWx0IGdhaW5cbiAgICAgICAgaWYgKCFvcHRpb25zLmdhaW5FbmFibGVkKSB7XG4gICAgICAgICAgICBnYWluTm9kZSA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuICAgICAgICAgICAgc291cmNlLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICAgICAgcmV0dXJuIGdhaW5Ob2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgZ2Fpbi5zZXRPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICBnYWluTm9kZSA9IGdhaW4uZ2V0R2Fpbk5vZGUodHJpZ2dlclRpbWUpO1xuICAgICAgICBzb3VyY2UuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICAgIHJldHVybiBnYWluTm9kZTtcblxuXG4gICAgfVxuXG4gICAgLy8gTm90ZSBkZWxheSBhbHdheXMgdXNlcyBhYm92ZSBnYWluIC0gZXZlbiBpZiBub3QgZW5hYmxlZFxuICAgIGZ1bmN0aW9uIHJvdXRlRGVsYXkobm9kZSkge1xuICAgICAgICBpZiAoIW9wdGlvbnMuZGVsYXlFbmFibGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNyZWF0ZSBkZWxheSBub2RlXG4gICAgICAgIGxldCBkZWxheSA9IGN0eC5jcmVhdGVEZWxheSgpO1xuICAgICAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBvcHRpb25zLmRlbGF5O1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhZHNyIGdhaW4gbm9kZVxuICAgICAgICBsZXQgZ2FpbiA9IG5ldyBhZHNyR2Fpbk5vZGUoY3R4KTtcbiAgICAgICAgZ2Fpbi5zZXRPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICBsZXQgZmVlZGJhY2tHYWluID0gZ2Fpbi5nZXRHYWluTm9kZSh0cmlnZ2VyVGltZSk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGZpbHRlclxuICAgICAgICBsZXQgZmlsdGVyID0gY3R4LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICBmaWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gb3B0aW9ucy5maWx0ZXI7XG5cbiAgICAgICAgLy8gZGVsYXkgLT4gZmVlZGJhY2tHYWluXG4gICAgICAgIGRlbGF5LmNvbm5lY3QoZmVlZGJhY2tHYWluKTtcbiAgICAgICAgZGlzY29ubmVjdE5vZGUoZGVsYXksIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIGZlZWRiYWNrIC0+IGZpbHRlclxuICAgICAgICBmZWVkYmFja0dhaW4uY29ubmVjdChmaWx0ZXIpO1xuXG4gICAgICAgIC8vIGZpbHRlciAtPmRlbGF5XG4gICAgICAgIGZpbHRlci5jb25uZWN0KGRlbGF5KTtcblxuICAgICAgICBub2RlLmNvbm5lY3QoZGVsYXkpO1xuXG4gICAgICAgIHJldHVybiBkZWxheTtcbiAgICB9XG4gICAgcGxheShpbnN0cnVtZW50KTtcbn1cblxudmFyIHNjaGVkdWxlID0gbmV3IHNpbXBsZVRyYWNrZXIoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCk7XG5cbmZ1bmN0aW9uIHNldHVwQmFzZUV2ZW50cygpIHtcblxuICAgIC8vIHZhciBpbml0aWFsaXplZEN0eDtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncGxheScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICBjdHgucmVzdW1lKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUGxheWJhY2sgcmVzdW1lZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IHN0b3JhZ2UgPSBuZXcgdHJhY2tzTG9jYWxTdG9yYWdlKCk7XG4gICAgICAgIGxldCB0cmFjayA9IHN0b3JhZ2UuZ2V0VHJhY2soKTtcblxuICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aDtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgICAgICBcbiAgICAgICAgc2NoZWR1bGUucnVuU2NoZWR1bGUoZ2V0U2V0QXVkaW9PcHRpb25zLm9wdGlvbnMuYnBtKTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYXVzZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgc2NoZWR1bGUuc3RvcCgpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0b3AnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHNjaGVkdWxlLnN0b3AoKTtcbiAgICAgICAgc2NoZWR1bGUgPSBuZXcgc2ltcGxlVHJhY2tlcihjdHgsIHNjaGVkdWxlQXVkaW9CZWF0KTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdicG0nKS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBnZXRTZXRBdWRpb09wdGlvbnMuc2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIGlmIChzY2hlZHVsZS5ydW5uaW5nKSB7XG4gICAgICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgICAgICBzY2hlZHVsZS5ydW5TY2hlZHVsZShnZXRTZXRBdWRpb09wdGlvbnMub3B0aW9ucy5icG0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVhc3VyZUxlbmd0aCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGUpID0+IHtcblxuICAgICAgICAkKCcjbWVhc3VyZUxlbmd0aCcpLmJpbmQoJ2tleXByZXNzIGtleWRvd24ga2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lYXN1cmVMZW5ndGgnKS52YWx1ZTtcbiAgICAgICAgICAgICAgICBsZXQgbGVuZ3RoID0gcGFyc2VJbnQodmFsdWUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGxlbmd0aCA8IDEpIHJldHVybjtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gbGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgbGV0IHRyYWNrID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICAgICAgICAgIHNldHVwVHJhY2tlckh0bWwoY3VycmVudFNhbXBsZURhdGEsIGxlbmd0aCk7XG4gICAgICAgICAgICAgICAgc2NoZWR1bGUubWVhc3VyZUxlbmd0aCA9IGxlbmd0aDtcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5sb2FkVHJhY2tlclZhbHVlcyh0cmFjaylcbiAgICAgICAgICAgICAgICBzY2hlZHVsZS5zZXR1cEV2ZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgICQoJy5iYXNlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZ2V0U2V0QXVkaW9PcHRpb25zLnNldFRyYWNrZXJDb250cm9scygpO1xuICAgIH0pO1xufVxuXG4kKCcjc2FtcGxlU2V0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcbiAgICBpbml0aWFsaXplU2FtcGxlU2V0KGN0eCwgdGhpcy52YWx1ZSk7XG59KTtcblxuZnVuY3Rpb24gdHJhY2tzTG9jYWxTdG9yYWdlKCkge1xuXG4gICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UgPSBmdW5jdGlvbiAodXBkYXRlKSB7XG4gICAgICAgIHZhciBzdG9yYWdlID0ge307XG4gICAgICAgIHN0b3JhZ2VbJ1NlbGVjdCddID0gJ1NlbGVjdCc7XG5cblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbG9jYWxTdG9yYWdlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IGxvY2FsU3RvcmFnZS5rZXkoaSk7XG4gICAgICAgICAgICBzdG9yYWdlW2l0ZW1dID0gaXRlbTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBzZWxlY3QgZWxlbWVudFxuICAgICAgICB2YXIgcyA9IG5ldyBzZWxlY3RFbGVtZW50KFxuICAgICAgICAgICAgJ2xvYWQtc3RvcmFnZScsIC8vIGlkIHRvIGFwcGVuZCB0aGUgc2VsZWN0IGxpc3QgdG9cbiAgICAgICAgICAgICdiZWF0LWxpc3QnLCAvLyBpZCBvZiB0aGUgc2VsZWN0IGxpc3RcbiAgICAgICAgICAgIHN0b3JhZ2UgLy9cbiAgICAgICAgKTtcblxuICAgICAgICBpZiAodXBkYXRlKSB7XG4gICAgICAgICAgICBzLnVwZGF0ZSgnYmVhdC1saXN0Jywgc3RvcmFnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzLmNyZWF0ZSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0RmlsZW5hbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBmaWxlbmFtZSA9ICQoJyNmaWxlbmFtZScpLnZhbCgpO1xuICAgICAgICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgICAgICAgICBmaWxlbmFtZSA9ICd1bnRpdGxlZCc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbGVuYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjb21wbGV0ZSBzb25nXG4gICAgICovXG4gICAgdGhpcy5nZXRUcmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGZvcm1EYXRhID0gZ2V0U2V0QXVkaW9PcHRpb25zLmdldFRyYWNrZXJDb250cm9scygpO1xuXG4gICAgICAgIGxldCBiZWF0ID0gc2NoZWR1bGUuZ2V0VHJhY2tlclZhbHVlcygpO1xuICAgICAgICBsZXQgc29uZyA9IHsgXCJiZWF0XCI6IGJlYXQsIFwic2V0dGluZ3NcIjogZm9ybURhdGEgfTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzb25nO1xuICAgIH1cblxuICAgIHRoaXMuYWxlcnQgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICBsZXQgYXBwTWVzc2FnZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcHAtbWVzc2FnZScpO1xuXG4gICAgICAgIGFwcE1lc3NhZ2UuaW5uZXJIVE1MID0gbWVzc2FnZVxuICAgICAgICBhcHBNZXNzYWdlLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXBwTWVzc2FnZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gICAgICAgIH0sIDIwMDApXG4gICAgfVxuXG4gICAgdGhpcy5zZXR1cFN0b3JhZ2UgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UoKTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBzb25nID0gdGhpcy5nZXRUcmFjaygpO1xuICAgICAgICAgICAgbGV0IGpzb24gPSBKU09OLnN0cmluZ2lmeShzb25nKTtcblxuICAgICAgICAgICAgbGV0IGZpbGVuYW1lID0gdGhpcy5nZXRGaWxlbmFtZSgpO1xuXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShmaWxlbmFtZSwganNvbik7XG4gICAgICAgICAgICB0aGlzLnNldExvY2FsU3RvcmFnZSgndXBkYXRlJyk7XG5cbiAgICAgICAgICAgICQoXCIjYmVhdC1saXN0XCIpLnZhbChmaWxlbmFtZSk7XG5cbiAgICAgICAgICAgIHRoaXMuYWxlcnQoYFRoZSB0cmFjayBoYXMgYmVlbiBzYXZlZCB0byBsb2NhbCBzdG9yYWdlIGFzIDxzdHJvbmc+JHtmaWxlbmFtZX08L3N0cm9uZz5gKVxuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHNhdmVBc0pzb25cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NhdmVBc0pzb24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBzb25nID0gdGhpcy5nZXRUcmFjaygpO1xuICAgICAgICAgICAgbGV0IGpzb24gPSBKU09OLnN0cmluZ2lmeShzb25nKTtcblxuICAgICAgICAgICAgbGV0IGZpbGVuYW1lID0gdGhpcy5nZXRGaWxlbmFtZSgpO1xuXG4gICAgICAgICAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtqc29uXSwge3R5cGU6IFwiYXBwbGljYXRpb24vanNvblwifSk7XG4gICAgICAgICAgICBGaWxlU2F2ZXIuc2F2ZUFzKGJsb2IsIGZpbGVuYW1lICsgXCIuanNvblwiKTtcblxuXG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNmaWxlbmFtZScpLmJpbmQoJ2tleXByZXNzIGtleWRvd24ga2V5dXAnLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JlYXQtbGlzdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9ICQoJyNiZWF0LWxpc3QnKS52YWwoKTtcbiAgICAgICAgICAgIGlmIChpdGVtID09PSAnU2VsZWN0Jykge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlbmFtZScpLnZhbHVlID0gJyc7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZSA9IGl0ZW07XG4gICAgICAgICAgICBsZXQgdHJhY2sgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKGl0ZW0pKTtcblxuICAgICAgICAgICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgICAgICAgICAgbGV0IGZvcm0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRyYWNrZXJDb250cm9sc1wiKTtcblxuICAgICAgICAgICAgZm9ybVZhbHVlcy5zZXQoZm9ybSwgdHJhY2suc2V0dGluZ3MpO1xuICAgICAgICAgICAgZ2V0U2V0QXVkaW9PcHRpb25zLnNldFRyYWNrZXJDb250cm9scyh0cmFjay5zZXR0aW5ncyk7XG4gICAgICAgICAgICBzY2hlZHVsZS5zdG9wKCk7XG4gICAgICAgICAgICBzY2hlZHVsZS5tZWFzdXJlTGVuZ3RoID0gdHJhY2suc2V0dGluZ3MubWVhc3VyZUxlbmd0aDtcblxuICAgICAgICAgICAgaW5pdGlhbGl6ZVNhbXBsZVNldChjdHgsIHRyYWNrLnNldHRpbmdzLnNhbXBsZVNldCwgdHJhY2spO1xuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkZWxldGUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG5cbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgbGV0IGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYmVhdC1saXN0Jyk7XG4gICAgICAgICAgICBsZXQgdG9EZWxldGUgPSBlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS50ZXh0O1xuXG4gICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0b0RlbGV0ZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmlsZW5hbWUnKS52YWx1ZSA9ICcnO1xuICAgICAgICAgICAgdGhpcy5zZXRMb2NhbFN0b3JhZ2UoJ3VwZGF0ZScpO1xuXG4gICAgICAgICAgICB0aGlzLmFsZXJ0KGBUcmFjayBoYXMgYmVlbiBkZWxldGVkYClcblxuICAgICAgICB9KTtcbiAgICB9O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGJlYXQ6IFtcbiAgICB7IHJvd0lkOiBcIjBcIiwgY29sSWQ6IFwiMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjBcIiwgY29sSWQ6IFwiM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjBcIiwgY29sSWQ6IFwiNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIwXCIsIGNvbElkOiBcIjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjBcIiwgY29sSWQ6IFwiOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIxOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIyMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIyNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIyNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIyOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMFwiLCBjb2xJZDogXCIzMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMVwiLCBjb2xJZDogXCIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMVwiLCBjb2xJZDogXCIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMVwiLCBjb2xJZDogXCI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjFcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMVwiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjExXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjEyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjE3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjE4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjE5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjMwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxXCIsIGNvbElkOiBcIjMxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiNFwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjJcIiwgY29sSWQ6IFwiOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIxOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIyMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMlwiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjMwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIyXCIsIGNvbElkOiBcIjMxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiNlwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiM1wiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjExXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjEyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIzXCIsIGNvbElkOiBcIjE3XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMTlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMzBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjNcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMFwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMTBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMTFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIxM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIxNFwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjE3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjE4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjE5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI0XCIsIGNvbElkOiBcIjIxXCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjRcIiwgY29sSWQ6IFwiMjVcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIyOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNFwiLCBjb2xJZDogXCIzMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiN1wiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIxMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjEyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI1XCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiMTZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiMTdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjVcIiwgY29sSWQ6IFwiMTlcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNVwiLCBjb2xJZDogXCIzMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiNlwiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjExXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjEyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjE3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjE4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjE5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI2XCIsIGNvbElkOiBcIjI3XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMzBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjZcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogdHJ1ZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI3XCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI3XCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI3XCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiN1wiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMTBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMTFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMTNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMTRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMTZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMTdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMTlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMzBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjdcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjhcIiwgY29sSWQ6IFwiMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjhcIiwgY29sSWQ6IFwiM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjhcIiwgY29sSWQ6IFwiNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjhcIiwgY29sSWQ6IFwiOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIxOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIyMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIyNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIyNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIyOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOFwiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjMwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI4XCIsIGNvbElkOiBcIjMxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI5XCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI5XCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI5XCIsIGNvbElkOiBcIjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiOVwiLCBjb2xJZDogXCI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCI5XCIsIGNvbElkOiBcIjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMTBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMTFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMTNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMTRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMTZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMTdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMTlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMzBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjlcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIxNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIxN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjE5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMFwiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTBcIiwgY29sSWQ6IFwiMzBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEwXCIsIGNvbElkOiBcIjMxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIxMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMTFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjEyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIxM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMTRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIxNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMTdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjE4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIxOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIyNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIyOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTFcIiwgY29sSWQ6IFwiMjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjExXCIsIGNvbElkOiBcIjMwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMVwiLCBjb2xJZDogXCIzMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMTBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjExXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIxMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMTNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjE0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIxNVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMTZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjE3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIxOFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMTlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIyMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjIzXCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIyNVwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxMlwiLCBjb2xJZDogXCIyOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTJcIiwgY29sSWQ6IFwiMzBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEyXCIsIGNvbElkOiBcIjMxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCI0XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCI2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCI3XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCI4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIxMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMTFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjEyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIxM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMTRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjE1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIxNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMTdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjE4XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIxOVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjIxXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIyMlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjI0XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjI4XCIsIGVuYWJsZWQ6IHRydWUgfSxcbiAgICB7IHJvd0lkOiBcIjEzXCIsIGNvbElkOiBcIjI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxM1wiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTNcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjBcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjNcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjZcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjdcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjlcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjEwXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIxMVwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMTJcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjEzXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIxNFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMTVcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjE2XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIxN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMThcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjE5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIyMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMjFcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjIyXCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIyM1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMjRcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjI1XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIyNlwiLCBlbmFibGVkOiB0cnVlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIyN1wiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMjhcIiwgZW5hYmxlZDogZmFsc2UgfSxcbiAgICB7IHJvd0lkOiBcIjE0XCIsIGNvbElkOiBcIjI5XCIsIGVuYWJsZWQ6IGZhbHNlIH0sXG4gICAgeyByb3dJZDogXCIxNFwiLCBjb2xJZDogXCIzMFwiLCBlbmFibGVkOiBmYWxzZSB9LFxuICAgIHsgcm93SWQ6IFwiMTRcIiwgY29sSWQ6IFwiMzFcIiwgZW5hYmxlZDogZmFsc2UgfVxuICBdLFxuICBzZXR0aW5nczoge1xuICAgIHNhbXBsZVNldDpcbiAgICAgIFwiaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL29yYW1pY3Mvc2FtcGxlZC9tYXN0ZXIvRFJVTVMvcGVhcmwtbWFzdGVyLXN0dWRpby9zYW1wbGVkLmluc3RydW1lbnQuanNvblwiLFxuICAgIG1lYXN1cmVMZW5ndGg6IDMyLFxuICAgIGJwbTogNDYwLFxuICAgIGRldHVuZTogMCxcbiAgICBnYWluRW5hYmxlZDogXCJnYWluXCIsXG4gICAgYXR0YWNrQW1wOiAwLFxuICAgIHN1c3RhaW5BbXA6IDAuNCxcbiAgICBkZWNheUFtcDogMC43LFxuICAgIHJlbGVhc2VBbXA6IDEsXG4gICAgYXR0YWNrVGltZTogMCxcbiAgICBkZWNheVRpbWU6IDAsXG4gICAgc3VzdGFpblRpbWU6IDIsXG4gICAgcmVsZWFzZVRpbWU6IDIsXG4gICAgYWRzckludGVydmFsOiAwLjEsXG4gICAgZGVsYXk6IDAuMDEsXG4gICAgZmlsdGVyOiAxMDAwXG4gIH1cbn07XG4iLCJjb25zdCBnZXRTZXRGb3JtVmFsdWVzID0gcmVxdWlyZSgnZ2V0LXNldC1mb3JtLXZhbHVlcycpO1xuXG5mdW5jdGlvbiBnZXRTZXRDb250cm9scygpIHtcblxuICAgIHRoaXMuZ2V0VHJhY2tlckNvbnRyb2xzID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgbGV0IGZvcm1WYWx1ZXMgPSBuZXcgZ2V0U2V0Rm9ybVZhbHVlcygpO1xuICAgICAgICBsZXQgZm9ybSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidHJhY2tlckNvbnRyb2xzXCIpO1xuICAgICAgICBsZXQgdmFsdWVzID0gZm9ybVZhbHVlcy5nZXQoZm9ybSk7XG4gICAgICAgIGxldCByZXQgPSB7fTtcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHZhbHVlcykge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoa2V5ID09PSAnZGVsYXlFbmFibGVkJykge1xuICAgICAgICAgICAgICAgIHJldFtrZXldID0gJ2RlbGF5JztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdnYWluRW5hYmxlZCcpIHtcbiAgICAgICAgICAgICAgICByZXRba2V5XSA9ICdnYWluJztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ3NhbXBsZVNldCcpIHsgXG4gICAgICAgICAgICAgICAgcmV0W2tleV0gPSB2YWx1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldFtrZXldID0gcGFyc2VGbG9hdCh2YWx1ZXNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB0aGlzLnNldFRyYWNrZXJDb250cm9scyA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgaWYgKCF2YWx1ZXMpIHtcbiAgICAgICAgICAgIHZhbHVlcyA9IHRoaXMuZ2V0VHJhY2tlckNvbnRyb2xzKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zID0gdmFsdWVzO1xuICAgIH07ICBcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdldFNldENvbnRyb2xzO1xuIiwiY29uc3QgV0FBQ2xvY2sgPSByZXF1aXJlKCd3YWFjbG9jaycpO1xuY29uc3QgdHJhY2tlclRhYmxlID0gcmVxdWlyZSgnLi90cmFja2VyLXRhYmxlJyk7XG5jb25zdCBoYXNDbGFzcyA9IHJlcXVpcmUoJ2hhcy1jbGFzcycpO1xuXG4vKipcbiAqIENvbnN0cnVjdCBvYmplY3RcbiAqIEBwYXJhbSB7YXVkaW9Db250ZXh0fSBjdHggXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzY2hlZHVsZUF1ZGlvQmVhdCBmdW50aW9uIHdoZW4gYW4gYXVkaW8gaXMgcGxheWVkXG4gKi9cbmZ1bmN0aW9uIHRyYWNrZXIoY3R4LCBzY2hlZHVsZUF1ZGlvQmVhdCkge1xuXG4gICAgdGhpcy5tZWFzdXJlTGVuZ3RoID0gMTY7XG4gICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdCA9IHNjaGVkdWxlQXVkaW9CZWF0O1xuICAgIHRoaXMuc2NoZWR1bGVGb3J3YXJkID0gMC4xO1xuICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgdGhpcy5ldmVudE1hcCA9IHt9O1xuICAgIHRoaXMuY2xvY2sgPSBuZXcgV0FBQ2xvY2soY3R4KTtcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XG4gICAgdGhpcy5ydW5uaW5nID0gZmFsc2U7XG5cbiAgICAvKipcbiAgICAgKiBEcmF3IGEgdHJhY2tlciB0YWJsZSBieSBudW1Sb3dzIGFuZCBudW1Db2xzXG4gICAgICovXG4gICAgdGhpcy5kcmF3VHJhY2tlciA9IGZ1bmN0aW9uKG51bVJvd3MsIG51bUNvbHMsIGRhdGEpIHtcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sVGFibGUgPSBuZXcgdHJhY2tlclRhYmxlKCk7XG5cbiAgICAgICAgaHRtbFRhYmxlLnNldFJvd3MobnVtUm93cywgbnVtQ29scywgZGF0YSk7XG4gICAgICAgIGxldCBzdHIgPSBodG1sVGFibGUuZ2V0VGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIGxldCB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RyYWNrZXItcGFyZW50Jyk7XG4gICAgICAgIHQuaW5uZXJIVE1MID0gJyc7XG4gICAgICAgIHQuaW5zZXJ0QWRqYWNlbnRIVE1MKCdhZnRlcmJlZ2luJywgc3RyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQdXNoIGN1cnJlbnQgYmVhdCBvbmUgZm9yd2FyZFxuICAgICAqL1xuICAgIHRoaXMubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50Kys7XG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnQgPj0gdGhpcy5tZWFzdXJlTGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQgPSAwO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBtaWxsaSBzZWNvbmRzIHBlciBiZWF0XG4gICAgICovXG4gICAgdGhpcy5taWxsaVBlckJlYXQgPSBmdW5jdGlvbiAoYmVhdHMpIHtcbiAgICAgICAgaWYgKCFiZWF0cykge1xuICAgICAgICAgICAgYmVhdHMgPSA2MDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTAwMCAqIDYwIC8gYmVhdHM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCBhIHRyYWNrZXIgcm93IGZyb20gYSBjZWxsLWlkXG4gICAgICovXG4gICAgdGhpcy5nZXRUcmFja2VyUm93VmFsdWVzID0gZnVuY3Rpb24gKGNvbElkKSB7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBbXTtcbiAgICAgICAgbGV0IHNlbGVjdG9yID0gYFtkYXRhLWNvbC1pZD1cIiR7Y29sSWR9XCJdYDtcblxuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgZWxlbXMuZm9yRWFjaCgoZWwpID0+IHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlbC5kYXRhc2V0KTtcbiAgICAgICAgICAgIHZhbC5lbmFibGVkID0gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCd0cmFja2VyLWVuYWJsZWQnKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBTY2hlZHVsZSBhIGJlYXQgY29sdW1uXG4gICAgICovXG4gICAgdGhpcy5zY2hlZHVsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IGJlYXRDb2x1bW4gPSB0aGlzLmdldFRyYWNrZXJSb3dWYWx1ZXModGhpcy5jdXJyZW50KTtcbiAgICAgICAgbGV0IG5vdyA9IGN0eC5jdXJyZW50VGltZTtcblxuICAgICAgICBsZXQgc2VsZWN0b3IgPSBgW2RhdGEtY29sLWlkPVwiJHt0aGlzLmN1cnJlbnR9XCJdYDtcblxuICAgICAgICBsZXQgZXZlbnQgPSB0aGlzLmNsb2NrLmNhbGxiYWNrQXRUaW1lKCgpID0+IHtcbiAgICAgICAgICAgIGxldCBlbGVtcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgICAgICAgICAgZWxlbXMuZm9yRWFjaCggKGUpID0+IHtcbiAgICAgICAgICAgICAgICBlLmNsYXNzTGlzdC5hZGQoJ3RyYWNrZXItY3VycmVudCcpXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LCBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZCk7XG5cbiAgICAgICAgdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIGVsZW1zLmZvckVhY2goIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgZS5jbGFzc0xpc3QucmVtb3ZlKCd0cmFja2VyLWN1cnJlbnQnKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSwgbm93ICsgdGhpcy5zY2hlZHVsZUZvcndhcmQgKyB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwKTtcblxuICAgICAgICBiZWF0Q29sdW1uLmZvckVhY2goKGJlYXQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGVCZWF0KGJlYXQsIG5vdyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLnNjaGVkdWxlQmVhdCA9IGZ1bmN0aW9uIChiZWF0LCBub3cpIHtcblxuICAgICAgICBsZXQgdHJpZ2dlclRpbWUgPSBub3cgKyB0aGlzLnNjaGVkdWxlRm9yd2FyZDtcbiAgICAgICAgdGhpcy5zY2hlZHVsZU1hcFtiZWF0LmNvbElkXSA9IHRyaWdnZXJUaW1lO1xuICAgICAgICBpZiAoYmVhdC5lbmFibGVkKSB7XG4gICAgICAgICAgICB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdChiZWF0LCB0cmlnZ2VyVGltZSk7XG4gICAgICAgICAgICB9LCBub3cpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuc2NoZWR1bGVNYXAgPSB7fTtcblxuICAgIHRoaXMuc2NoZWR1bGVBdWRpb0JlYXROb3cgPSBmdW5jdGlvbiAoYmVhdCkge1xuXG4gICAgICAgIGlmIChiZWF0LmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGxldCBiZWF0RXZlbnQgPSB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldO1xuICAgICAgICAgICAgaWYgKGJlYXRFdmVudCkge1xuICAgICAgICAgICAgICAgIGJlYXRFdmVudC5jbGVhcigpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHRyaWdnZXJUaW1lID0gdGhpcy5zY2hlZHVsZU1hcFswXSArIGJlYXQuY29sSWQgKiB0aGlzLm1pbGxpUGVyQmVhdCh0aGlzLmJwbSkgLyAxMDAwO1xuICAgICAgICBsZXQgbm93ID0gY3R4LmN1cnJlbnRUaW1lO1xuICAgICAgICB0aGlzLmV2ZW50TWFwW3RoaXMuZ2V0RXZlbnRLZXkoYmVhdCldID0gdGhpcy5jbG9jay5jYWxsYmFja0F0VGltZSgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNjaGVkdWxlQXVkaW9CZWF0KGJlYXQsIHRyaWdnZXJUaW1lKTtcbiAgICAgICAgfSwgbm93KTtcbiAgICB9O1xuXG4gICAgdGhpcy5pbnRlcnZhbDtcbiAgICB0aGlzLnJ1blNjaGVkdWxlID0gZnVuY3Rpb24gKGJwbSkge1xuICAgICAgICB0aGlzLnJ1bm5pbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmJwbSA9IGJwbTtcbiAgICAgICAgbGV0IGludGVydmFsID0gdGhpcy5taWxsaVBlckJlYXQoYnBtKTtcblxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2NoZWR1bGUoKTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICB9LCAwKTtcblxuICAgICAgICB0aGlzLmludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zY2hlZHVsZSgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG5cbiAgICAgICAgfSwgaW50ZXJ2YWwpO1xuICAgIH07XG5cbiAgICB0aGlzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucnVubmluZyA9IGZhbHNlO1xuICAgICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpO1xuICAgIH07XG5cbiAgICB0aGlzLmdldEV2ZW50S2V5ID0gZnVuY3Rpb24gZ2V0RXZlbnRLZXkoYmVhdCkge1xuICAgICAgICByZXR1cm4gYmVhdC5yb3dJZCArIGJlYXQuY29sSWQ7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEdldCB0cmFja2VyIHZhbHVlc1xuICAgICAqL1xuICAgIHRoaXMuZ2V0VHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHZhbHVlcyA9IFtdO1xuICAgICAgICBsZXQgZWxlbXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcudHJhY2tlci1jZWxsJyk7XG4gICAgICAgIGVsZW1zLmZvckVhY2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgIGxldCB2YWwgPSBPYmplY3QuYXNzaWduKHt9LCBlLmRhdGFzZXQpO1xuICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBoYXNDbGFzcyhlLCBcInRyYWNrZXItZW5hYmxlZFwiKTtcbiAgICAgICAgICAgIHZhbHVlcy5wdXNoKHZhbCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHRyYWNrZXIgdmFsdWVzIGluIEpTT04gZm9ybWF0XG4gICAgICovXG4gICAgdGhpcy5sb2FkVHJhY2tlclZhbHVlcyA9IGZ1bmN0aW9uIChqc29uKSB7XG5cbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRyYWNrZXItZW5hYmxlZCcpO1xuICAgICAgICBlbGVtcy5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUuY2xhc3NMaXN0LnJlbW92ZSgndHJhY2tlci1lbmFibGVkJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGpzb24uZm9yRWFjaChmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEuZW5hYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGxldCBzZWxlY3RvciA9IGAudHJhY2tlci1jZWxsW2RhdGEtcm93LWlkPVwiJHtkYXRhLnJvd0lkfVwiXVtkYXRhLWNvbC1pZD1cIiR7ZGF0YS5jb2xJZH1cIl1gO1xuICAgICAgICAgICAgICAgIGxldCBlbGVtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbS5jbGFzc0xpc3QuYWRkKFwidHJhY2tlci1lbmFibGVkXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIExpc3RlbiBvbiB0cmFja2VyLWNlbGxcbiAgICAgKiBTY2hlZHVsZSBpZiBjZWxsIGlzIGNsaWNrZWQgYW5kIHRvZ2dsZSBjc3MgY2xhc3NcbiAgICAgKi9cbiAgICB0aGlzLnNldHVwRXZlbnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBcbiAgICAgICAgbGV0IGVsZW1zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRyYWNrZXItY2VsbCcpO1xuICAgICAgICBcbiAgICAgICAgZWxlbXMuZm9yRWFjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBsZXQgdmFsID0gT2JqZWN0LmFzc2lnbih7fSwgZS50YXJnZXQuZGF0YXNldCk7XG4gICAgICAgICAgICAgICAgdmFsLmVuYWJsZWQgPSBoYXNDbGFzcyhlLnRhcmdldCwgXCJ0cmFja2VyLWVuYWJsZWRcIik7XG4gICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRCZWF0ID0gZS50YXJnZXQuZGF0YXNldC5jb2xJZDtcbiAgICAgICAgICAgICAgICBpZiAodmFsLmNvbElkID4gY3VycmVudEJlYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zY2hlZHVsZUF1ZGlvQmVhdE5vdyh2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlLnRhcmdldC5jbGFzc0xpc3QudG9nZ2xlKCd0cmFja2VyLWVuYWJsZWQnKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYWNrZXI7IiwiZnVuY3Rpb24gdHJhY2tlclRhYmxlKCkge1xuXG4gICAgdGhpcy5zdHIgPSAnJztcbiAgICB0aGlzLmdldFRhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJzx0YWJsZSBpZD1cInRyYWNrZXItdGFibGVcIj4nICsgdGhpcy5zdHIgKyAnPC90YWJsZT4nO1xuICAgIH07XG5cbiAgICB0aGlzLnNldEhlYWRlciA9IGZ1bmN0aW9uIChudW1Sb3dzLCBkYXRhKSB7XG4gICAgICAgIHRoaXMuc3RyICs9IGA8dHIgY2xhc3M9XCJ0cmFja2VyLXJvdyBoZWFkZXJcIj5gO1xuICAgICAgICB0aGlzLnN0ciArPSB0aGlzLmdldENlbGxzKCdoZWFkZXInLCBudW1Sb3dzLCB7IGhlYWRlcjogdHJ1ZSB9KTtcbiAgICAgICAgdGhpcy5zdHIgKz0gYDwvdHI+YDtcblxuICAgIH07XG5cbiAgICB0aGlzLnNldFJvd3MgPSBmdW5jdGlvbiAobnVtUm93cywgbnVtQ29scywgZGF0YSkge1xuXG4gICAgICAgIHRoaXMuc2V0SGVhZGVyKG51bUNvbHMsIGRhdGEpO1xuICAgICAgICBmb3IgKGxldCByb3dJRCA9IDA7IHJvd0lEIDwgbnVtUm93czsgcm93SUQrKykge1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gYDx0ciBjbGFzcz1cInRyYWNrZXItcm93XCIgZGF0YS1pZD1cIiR7cm93SUR9XCI+YDtcbiAgICAgICAgICAgIHRoaXMuc3RyICs9IHRoaXMuZ2V0Q2VsbHMocm93SUQsIG51bUNvbHMsIGRhdGEpO1xuICAgICAgICAgICAgdGhpcy5zdHIgKz0gYDwvdHI+YDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmdldEZpcnN0Q2VsbCA9IGZ1bmN0aW9uIChyb3dJRCwgZGF0YSkge1xuICAgICAgICB2YXIgc3RyID0gJyc7XG4gICAgICAgIFxuICAgICAgICBzdHIgKz0gYDx0ZCBjbGFzcz1cInRyYWNrZXItZmlyc3QtY2VsbFwiIGRhdGEtcm93LWlkPVwiJHtyb3dJRH1cIj5gO1xuICAgICAgICBpZiAoZGF0YS50aXRsZSkgeyBcbiAgICAgICAgICAgIHN0ciArPSBkYXRhLnRpdGxlW3Jvd0lEXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3RyICs9IGA8L3RkPmA7XG4gICAgICAgIHJldHVybiBzdHI7XG4gICAgfTtcblxuICAgIHRoaXMuZ2V0Q2VsbHMgPSBmdW5jdGlvbiAocm93SUQsIG51bVJvd3MsIGRhdGEpIHtcbiAgICAgICAgdmFyIHN0ciA9ICcnO1xuXG4gICAgICAgIHN0ciArPSB0aGlzLmdldEZpcnN0Q2VsbChyb3dJRCwgZGF0YSk7XG5cbiAgICAgICAgbGV0IGNzc0NsYXNzID0gJ3RyYWNrZXItY2VsbCdcblxuICAgICAgICBpZiAocm93SUQgPT0gJ2hlYWRlcicpIHtcbiAgICAgICAgICAgIGNzc0NsYXNzID0gJ3RyYWNrZXItY2VsbC1oZWFkZXInXG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBjID0gMDsgYyA8IG51bVJvd3M7IGMrKykge1xuICAgICAgICAgICAgc3RyICs9IGA8dGQgY2xhc3M9XCIke2Nzc0NsYXNzfVwiIGRhdGEtcm93LWlkPVwiJHtyb3dJRH1cIiBkYXRhLWNvbC1pZD1cIiR7Y31cIj5gO1xuICAgICAgICAgICAgaWYgKGRhdGEuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGMgKyAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RyICs9IGA8L3RkPmA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYWNrZXJUYWJsZTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iXX0=
