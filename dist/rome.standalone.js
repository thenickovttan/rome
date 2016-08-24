/**
 * rome - Customizable date (and time) picker. Opt-in UI, no jQuery!
 * @version v2.1.23
 * @link https://github.com/bevacqua/rome
 * @license MIT
 */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.rome = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function atoa (a, n) { return Array.prototype.slice.call(a, n); }

},{}],2:[function(require,module,exports){
'use strict';

var crossvent = require('crossvent');
var throttle = require('./throttle');
var tailormade = require('./tailormade');

function bullseye (el, target, options) {
  var o = options;
  var domTarget = target && target.tagName;

  if (!domTarget && arguments.length === 2) {
    o = target;
  }
  if (!domTarget) {
    target = el;
  }
  if (!o) { o = {}; }

  var destroyed = false;
  var throttledWrite = throttle(write, 30);
  var tailorOptions = { update: o.autoupdateToCaret !== false && update };
  var tailor = o.caret && tailormade(target, tailorOptions);

  write();

  if (o.tracking !== false) {
    crossvent.add(window, 'resize', throttledWrite);
  }

  return {
    read: readNull,
    refresh: write,
    destroy: destroy,
    sleep: sleep
  };

  function sleep () {
    tailorOptions.sleeping = true;
  }

  function readNull () { return read(); }

  function read (readings) {
    var bounds = target.getBoundingClientRect();
    var scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
    if (tailor) {
      readings = tailor.read();
      return {
        x: (readings.absolute ? 0 : bounds.left) + readings.x,
        y: (readings.absolute ? 0 : bounds.top) + scrollTop + readings.y + 20
      };
    }
    return {
      x: bounds.left,
      y: bounds.top + scrollTop
    };
  }

  function update (readings) {
    write(readings);
  }

  function write (readings) {
    if (destroyed) {
      throw new Error('Bullseye can\'t refresh after being destroyed. Create another instance instead.');
    }
    if (tailor && !readings) {
      tailorOptions.sleeping = false;
      tailor.refresh(); return;
    }
    var p = read(readings);
    if (!tailor && target !== el) {
      p.y += target.offsetHeight;
    }
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
  }

  function destroy () {
    if (tailor) { tailor.destroy(); }
    crossvent.remove(window, 'resize', throttledWrite);
    destroyed = true;
  }
}

module.exports = bullseye;

},{"./tailormade":3,"./throttle":4,"crossvent":7}],3:[function(require,module,exports){
(function (global){
'use strict';

var sell = require('sell');
var crossvent = require('crossvent');
var seleccion = require('seleccion');
var throttle = require('./throttle');
var getSelection = seleccion.get;
var props = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing'
];
var win = global;
var doc = document;
var ff = win.mozInnerScreenX !== null && win.mozInnerScreenX !== void 0;

function tailormade (el, options) {
  var textInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
  var throttledRefresh = throttle(refresh, 30);
  var o = options || {};

  bind();

  return {
    read: readPosition,
    refresh: throttledRefresh,
    destroy: destroy
  };

  function noop () {}
  function readPosition () { return (textInput ? coordsText : coordsHTML)(); }

  function refresh () {
    if (o.sleeping) {
      return;
    }
    return (o.update || noop)(readPosition());
  }

  function coordsText () {
    var p = sell(el);
    var context = prepare();
    var readings = readTextCoords(context, p.start);
    doc.body.removeChild(context.mirror);
    return readings;
  }

  function coordsHTML () {
    var sel = getSelection();
    if (sel.rangeCount) {
      var range = sel.getRangeAt(0);
      var needsToWorkAroundNewlineBug = range.startContainer.nodeName === 'P' && range.startOffset === 0;
      if (needsToWorkAroundNewlineBug) {
        return {
          x: range.startContainer.offsetLeft,
          y: range.startContainer.offsetTop,
          absolute: true
        };
      }
      if (range.getClientRects) {
        var rects = range.getClientRects();
        if (rects.length > 0) {
          return {
            x: rects[0].left,
            y: rects[0].top,
            absolute: true
          };
        }
      }
    }
    return { x: 0, y: 0 };
  }

  function readTextCoords (context, p) {
    var rest = doc.createElement('span');
    var mirror = context.mirror;
    var computed = context.computed;

    write(mirror, read(el).substring(0, p));

    if (el.tagName === 'INPUT') {
      mirror.textContent = mirror.textContent.replace(/\s/g, '\u00a0');
    }

    write(rest, read(el).substring(p) || '.');

    mirror.appendChild(rest);

    return {
      x: rest.offsetLeft + parseInt(computed['borderLeftWidth']),
      y: rest.offsetTop + parseInt(computed['borderTopWidth'])
    };
  }

  function read (el) {
    return textInput ? el.value : el.innerHTML;
  }

  function prepare () {
    var computed = win.getComputedStyle ? getComputedStyle(el) : el.currentStyle;
    var mirror = doc.createElement('div');
    var style = mirror.style;

    doc.body.appendChild(mirror);

    if (el.tagName !== 'INPUT') {
      style.wordWrap = 'break-word';
    }
    style.whiteSpace = 'pre-wrap';
    style.position = 'absolute';
    style.visibility = 'hidden';
    props.forEach(copy);

    if (ff) {
      style.width = parseInt(computed.width) - 2 + 'px';
      if (el.scrollHeight > parseInt(computed.height)) {
        style.overflowY = 'scroll';
      }
    } else {
      style.overflow = 'hidden';
    }
    return { mirror: mirror, computed: computed };

    function copy (prop) {
      style[prop] = computed[prop];
    }
  }

  function write (el, value) {
    if (textInput) {
      el.textContent = value;
    } else {
      el.innerHTML = value;
    }
  }

  function bind (remove) {
    var op = remove ? 'remove' : 'add';
    crossvent[op](el, 'keydown', throttledRefresh);
    crossvent[op](el, 'keyup', throttledRefresh);
    crossvent[op](el, 'input', throttledRefresh);
    crossvent[op](el, 'paste', throttledRefresh);
    crossvent[op](el, 'change', throttledRefresh);
  }

  function destroy () {
    bind(true);
  }
}

module.exports = tailormade;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./throttle":4,"crossvent":7,"seleccion":16,"sell":18}],4:[function(require,module,exports){
'use strict';

function throttle (fn, boundary) {
  var last = -Infinity;
  var timer;
  return function bounced () {
    if (timer) {
      return;
    }
    unbound();

    function unbound () {
      clearTimeout(timer);
      timer = null;
      var next = last + boundary;
      var now = Date.now();
      if (now > next) {
        last = now;
        fn();
      } else {
        timer = setTimeout(unbound, next - now);
      }
    }
  };
}

module.exports = throttle;

},{}],5:[function(require,module,exports){
'use strict';

var ticky = require('ticky');

module.exports = function debounce (fn, args, ctx) {
  if (!fn) { return; }
  ticky(function run () {
    fn.apply(ctx || null, args || []);
  });
};

},{"ticky":19}],6:[function(require,module,exports){
'use strict';

var atoa = require('atoa');
var debounce = require('./debounce');

module.exports = function emitter (thing, options) {
  var opts = options || {};
  var evt = {};
  if (thing === undefined) { thing = {}; }
  thing.on = function (type, fn) {
    if (!evt[type]) {
      evt[type] = [fn];
    } else {
      evt[type].push(fn);
    }
    return thing;
  };
  thing.once = function (type, fn) {
    fn._once = true; // thing.off(fn) still works!
    thing.on(type, fn);
    return thing;
  };
  thing.off = function (type, fn) {
    var c = arguments.length;
    if (c === 1) {
      delete evt[type];
    } else if (c === 0) {
      evt = {};
    } else {
      var et = evt[type];
      if (!et) { return thing; }
      et.splice(et.indexOf(fn), 1);
    }
    return thing;
  };
  thing.emit = function () {
    var args = atoa(arguments);
    return thing.emitterSnapshot(args.shift()).apply(this, args);
  };
  thing.emitterSnapshot = function (type) {
    var et = (evt[type] || []).slice(0);
    return function () {
      var args = atoa(arguments);
      var ctx = this || thing;
      if (type === 'error' && opts.throws !== false && !et.length) { throw args.length === 1 ? args[0] : args; }
      et.forEach(function emitter (listen) {
        if (opts.async) { debounce(listen, args, ctx); } else { listen.apply(ctx, args); }
        if (listen._once) { thing.off(type, listen); }
      });
      return thing;
    };
  };
  return thing;
};

},{"./debounce":5,"atoa":1}],7:[function(require,module,exports){
(function (global){
'use strict';

var customEvent = require('custom-event');
var eventmap = require('./eventmap');
var doc = document;
var addEvent = addEventEasy;
var removeEvent = removeEventEasy;
var hardCache = [];

if (!global.addEventListener) {
  addEvent = addEventHard;
  removeEvent = removeEventHard;
}

function addEventEasy (el, type, fn, capturing) {
  return el.addEventListener(type, fn, capturing);
}

function addEventHard (el, type, fn) {
  return el.attachEvent('on' + type, wrap(el, type, fn));
}

function removeEventEasy (el, type, fn, capturing) {
  return el.removeEventListener(type, fn, capturing);
}

function removeEventHard (el, type, fn) {
  return el.detachEvent('on' + type, unwrap(el, type, fn));
}

function fabricateEvent (el, type, model) {
  var e = eventmap.indexOf(type) === -1 ? makeCustomEvent() : makeClassicEvent();
  if (el.dispatchEvent) {
    el.dispatchEvent(e);
  } else {
    el.fireEvent('on' + type, e);
  }
  function makeClassicEvent () {
    var e;
    if (doc.createEvent) {
      e = doc.createEvent('Event');
      e.initEvent(type, true, true);
    } else if (doc.createEventObject) {
      e = doc.createEventObject();
    }
    return e;
  }
  function makeCustomEvent () {
    return new customEvent(type, { detail: model });
  }
}

function wrapperFactory (el, type, fn) {
  return function wrapper (originalEvent) {
    var e = originalEvent || global.event;
    e.target = e.target || e.srcElement;
    e.preventDefault = e.preventDefault || function preventDefault () { e.returnValue = false; };
    e.stopPropagation = e.stopPropagation || function stopPropagation () { e.cancelBubble = true; };
    e.which = e.which || e.keyCode;
    fn.call(el, e);
  };
}

function wrap (el, type, fn) {
  var wrapper = unwrap(el, type, fn) || wrapperFactory(el, type, fn);
  hardCache.push({
    wrapper: wrapper,
    element: el,
    type: type,
    fn: fn
  });
  return wrapper;
}

function unwrap (el, type, fn) {
  var i = find(el, type, fn);
  if (i) {
    var wrapper = hardCache[i].wrapper;
    hardCache.splice(i, 1); // free up a tad of memory
    return wrapper;
  }
}

function find (el, type, fn) {
  var i, item;
  for (i = 0; i < hardCache.length; i++) {
    item = hardCache[i];
    if (item.element === el && item.type === type && item.fn === fn) {
      return i;
    }
  }
}

module.exports = {
  add: addEvent,
  remove: removeEvent,
  fabricate: fabricateEvent
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./eventmap":8,"custom-event":9}],8:[function(require,module,exports){
(function (global){
'use strict';

var eventmap = [];
var eventname = '';
var ron = /^on/;

for (eventname in global) {
  if (ron.test(eventname)) {
    eventmap.push(eventname.slice(2));
  }
}

module.exports = eventmap;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
(function (global){

var NativeCustomEvent = global.CustomEvent;

function useNative () {
  try {
    var p = new NativeCustomEvent('cat', { detail: { foo: 'bar' } });
    return  'cat' === p.type && 'bar' === p.detail.foo;
  } catch (e) {
  }
  return false;
}

/**
 * Cross-browser `CustomEvent` constructor.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent.CustomEvent
 *
 * @public
 */

module.exports = useNative() ? NativeCustomEvent :

// IE >= 9
'function' === typeof document.createEvent ? function CustomEvent (type, params) {
  var e = document.createEvent('CustomEvent');
  if (params) {
    e.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
  } else {
    e.initCustomEvent(type, false, false, void 0);
  }
  return e;
} :

// IE <= 8
function CustomEvent (type, params) {
  var e = document.createEventObject();
  e.type = type;
  if (params) {
    e.bubbles = Boolean(params.bubbles);
    e.cancelable = Boolean(params.cancelable);
    e.detail = params.detail;
  } else {
    e.bubbles = false;
    e.cancelable = false;
    e.detail = void 0;
  }
  return e;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(require,module,exports){
(function (global){
'use strict';

var getSelection;
var doc = global.document;
var getSelectionRaw = require('./getSelectionRaw');
var getSelectionNullOp = require('./getSelectionNullOp');
var getSelectionSynthetic = require('./getSelectionSynthetic');
var isHost = require('./isHost');
if (isHost.method(global, 'getSelection')) {
  getSelection = getSelectionRaw;
} else if (typeof doc.selection === 'object' && doc.selection) {
  getSelection = getSelectionSynthetic;
} else {
  getSelection = getSelectionNullOp;
}

module.exports = getSelection;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./getSelectionNullOp":11,"./getSelectionRaw":12,"./getSelectionSynthetic":13,"./isHost":14}],11:[function(require,module,exports){
'use strict';

function noop () {}

function getSelectionNullOp () {
  return {
    removeAllRanges: noop,
    addRange: noop
  };
}

module.exports = getSelectionNullOp;

},{}],12:[function(require,module,exports){
(function (global){
'use strict';

function getSelectionRaw () {
  return global.getSelection();
}

module.exports = getSelectionRaw;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],13:[function(require,module,exports){
(function (global){
'use strict';

var rangeToTextRange = require('./rangeToTextRange');
var doc = global.document;
var body = doc.body;
var GetSelectionProto = GetSelection.prototype;

function GetSelection (selection) {
  var self = this;
  var range = selection.createRange();

  this._selection = selection;
  this._ranges = [];

  if (selection.type === 'Control') {
    updateControlSelection(self);
  } else if (isTextRange(range)) {
    updateFromTextRange(self, range);
  } else {
    updateEmptySelection(self);
  }
}

GetSelectionProto.removeAllRanges = function () {
  var textRange;
  try {
    this._selection.empty();
    if (this._selection.type !== 'None') {
      textRange = body.createTextRange();
      textRange.select();
      this._selection.empty();
    }
  } catch (e) {
  }
  updateEmptySelection(this);
};

GetSelectionProto.addRange = function (range) {
  if (this._selection.type === 'Control') {
    addRangeToControlSelection(this, range);
  } else {
    rangeToTextRange(range).select();
    this._ranges[0] = range;
    this.rangeCount = 1;
    this.isCollapsed = this._ranges[0].collapsed;
    updateAnchorAndFocusFromRange(this, range, false);
  }
};

GetSelectionProto.setRanges = function (ranges) {
  this.removeAllRanges();
  var rangeCount = ranges.length;
  if (rangeCount > 1) {
    createControlSelection(this, ranges);
  } else if (rangeCount) {
    this.addRange(ranges[0]);
  }
};

GetSelectionProto.getRangeAt = function (index) {
  if (index < 0 || index >= this.rangeCount) {
    throw new Error('getRangeAt(): index out of bounds');
  } else {
    return this._ranges[index].cloneRange();
  }
};

GetSelectionProto.removeRange = function (range) {
  if (this._selection.type !== 'Control') {
    removeRangeManually(this, range);
    return;
  }
  var controlRange = this._selection.createRange();
  var rangeElement = getSingleElementFromRange(range);
  var newControlRange = body.createControlRange();
  var el;
  var removed = false;
  for (var i = 0, len = controlRange.length; i < len; ++i) {
    el = controlRange.item(i);
    if (el !== rangeElement || removed) {
      newControlRange.add(controlRange.item(i));
    } else {
      removed = true;
    }
  }
  newControlRange.select();
  updateControlSelection(this);
};

GetSelectionProto.eachRange = function (fn, returnValue) {
  var i = 0;
  var len = this._ranges.length;
  for (i = 0; i < len; ++i) {
    if (fn(this.getRangeAt(i))) {
      return returnValue;
    }
  }
};

GetSelectionProto.getAllRanges = function () {
  var ranges = [];
  this.eachRange(function (range) {
    ranges.push(range);
  });
  return ranges;
};

GetSelectionProto.setSingleRange = function (range) {
  this.removeAllRanges();
  this.addRange(range);
};

function createControlSelection (sel, ranges) {
  var controlRange = body.createControlRange();
  for (var i = 0, el, len = ranges.length; i < len; ++i) {
    el = getSingleElementFromRange(ranges[i]);
    try {
      controlRange.add(el);
    } catch (e) {
      throw new Error('setRanges(): Element could not be added to control selection');
    }
  }
  controlRange.select();
  updateControlSelection(sel);
}

function removeRangeManually (sel, range) {
  var ranges = sel.getAllRanges();
  sel.removeAllRanges();
  for (var i = 0, len = ranges.length; i < len; ++i) {
    if (!isSameRange(range, ranges[i])) {
      sel.addRange(ranges[i]);
    }
  }
  if (!sel.rangeCount) {
    updateEmptySelection(sel);
  }
}

function updateAnchorAndFocusFromRange (sel, range) {
  var anchorPrefix = 'start';
  var focusPrefix = 'end';
  sel.anchorNode = range[anchorPrefix + 'Container'];
  sel.anchorOffset = range[anchorPrefix + 'Offset'];
  sel.focusNode = range[focusPrefix + 'Container'];
  sel.focusOffset = range[focusPrefix + 'Offset'];
}

function updateEmptySelection (sel) {
  sel.anchorNode = sel.focusNode = null;
  sel.anchorOffset = sel.focusOffset = 0;
  sel.rangeCount = 0;
  sel.isCollapsed = true;
  sel._ranges.length = 0;
}

function rangeContainsSingleElement (rangeNodes) {
  if (!rangeNodes.length || rangeNodes[0].nodeType !== 1) {
    return false;
  }
  for (var i = 1, len = rangeNodes.length; i < len; ++i) {
    if (!isAncestorOf(rangeNodes[0], rangeNodes[i])) {
      return false;
    }
  }
  return true;
}

function getSingleElementFromRange (range) {
  var nodes = range.getNodes();
  if (!rangeContainsSingleElement(nodes)) {
    throw new Error('getSingleElementFromRange(): range did not consist of a single element');
  }
  return nodes[0];
}

function isTextRange (range) {
  return range && range.text !== void 0;
}

function updateFromTextRange (sel, range) {
  sel._ranges = [range];
  updateAnchorAndFocusFromRange(sel, range, false);
  sel.rangeCount = 1;
  sel.isCollapsed = range.collapsed;
}

function updateControlSelection (sel) {
  sel._ranges.length = 0;
  if (sel._selection.type === 'None') {
    updateEmptySelection(sel);
  } else {
    var controlRange = sel._selection.createRange();
    if (isTextRange(controlRange)) {
      updateFromTextRange(sel, controlRange);
    } else {
      sel.rangeCount = controlRange.length;
      var range;
      for (var i = 0; i < sel.rangeCount; ++i) {
        range = doc.createRange();
        range.selectNode(controlRange.item(i));
        sel._ranges.push(range);
      }
      sel.isCollapsed = sel.rangeCount === 1 && sel._ranges[0].collapsed;
      updateAnchorAndFocusFromRange(sel, sel._ranges[sel.rangeCount - 1], false);
    }
  }
}

function addRangeToControlSelection (sel, range) {
  var controlRange = sel._selection.createRange();
  var rangeElement = getSingleElementFromRange(range);
  var newControlRange = body.createControlRange();
  for (var i = 0, len = controlRange.length; i < len; ++i) {
    newControlRange.add(controlRange.item(i));
  }
  try {
    newControlRange.add(rangeElement);
  } catch (e) {
    throw new Error('addRange(): Element could not be added to control selection');
  }
  newControlRange.select();
  updateControlSelection(sel);
}

function isSameRange (left, right) {
  return (
    left.startContainer === right.startContainer &&
    left.startOffset === right.startOffset &&
    left.endContainer === right.endContainer &&
    left.endOffset === right.endOffset
  );
}

function isAncestorOf (ancestor, descendant) {
  var node = descendant;
  while (node.parentNode) {
    if (node.parentNode === ancestor) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

function getSelection () {
  return new GetSelection(global.document.selection);
}

module.exports = getSelection;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./rangeToTextRange":15}],14:[function(require,module,exports){
'use strict';

function isHostMethod (host, prop) {
  var type = typeof host[prop];
  return type === 'function' || !!(type === 'object' && host[prop]) || type === 'unknown';
}

function isHostProperty (host, prop) {
  return typeof host[prop] !== 'undefined';
}

function many (fn) {
  return function areHosted (host, props) {
    var i = props.length;
    while (i--) {
      if (!fn(host, props[i])) {
        return false;
      }
    }
    return true;
  };
}

module.exports = {
  method: isHostMethod,
  methods: many(isHostMethod),
  property: isHostProperty,
  properties: many(isHostProperty)
};

},{}],15:[function(require,module,exports){
(function (global){
'use strict';

var doc = global.document;
var body = doc.body;

function rangeToTextRange (p) {
  if (p.collapsed) {
    return createBoundaryTextRange({ node: p.startContainer, offset: p.startOffset }, true);
  }
  var startRange = createBoundaryTextRange({ node: p.startContainer, offset: p.startOffset }, true);
  var endRange = createBoundaryTextRange({ node: p.endContainer, offset: p.endOffset }, false);
  var textRange = body.createTextRange();
  textRange.setEndPoint('StartToStart', startRange);
  textRange.setEndPoint('EndToEnd', endRange);
  return textRange;
}

function isCharacterDataNode (node) {
  var t = node.nodeType;
  return t === 3 || t === 4 || t === 8 ;
}

function createBoundaryTextRange (p, starting) {
  var bound;
  var parent;
  var offset = p.offset;
  var workingNode;
  var childNodes;
  var range = body.createTextRange();
  var data = isCharacterDataNode(p.node);

  if (data) {
    bound = p.node;
    parent = bound.parentNode;
  } else {
    childNodes = p.node.childNodes;
    bound = offset < childNodes.length ? childNodes[offset] : null;
    parent = p.node;
  }

  workingNode = doc.createElement('span');
  workingNode.innerHTML = '&#feff;';

  if (bound) {
    parent.insertBefore(workingNode, bound);
  } else {
    parent.appendChild(workingNode);
  }

  range.moveToElementText(workingNode);
  range.collapse(!starting);
  parent.removeChild(workingNode);

  if (data) {
    range[starting ? 'moveStart' : 'moveEnd']('character', offset);
  }
  return range;
}

module.exports = rangeToTextRange;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],16:[function(require,module,exports){
'use strict';

var getSelection = require('./getSelection');
var setSelection = require('./setSelection');

module.exports = {
  get: getSelection,
  set: setSelection
};

},{"./getSelection":10,"./setSelection":17}],17:[function(require,module,exports){
(function (global){
'use strict';

var getSelection = require('./getSelection');
var rangeToTextRange = require('./rangeToTextRange');
var doc = global.document;

function setSelection (p) {
  if (doc.createRange) {
    modernSelection();
  } else {
    oldSelection();
  }

  function modernSelection () {
    var sel = getSelection();
    var range = doc.createRange();
    if (!p.startContainer) {
      return;
    }
    if (p.endContainer) {
      range.setEnd(p.endContainer, p.endOffset);
    } else {
      range.setEnd(p.startContainer, p.startOffset);
    }
    range.setStart(p.startContainer, p.startOffset);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function oldSelection () {
    rangeToTextRange(p).select();
  }
}

module.exports = setSelection;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./getSelection":10,"./rangeToTextRange":15}],18:[function(require,module,exports){
'use strict';

var get = easyGet;
var set = easySet;

if (document.selection && document.selection.createRange) {
  get = hardGet;
  set = hardSet;
}

function easyGet (el) {
  return {
    start: el.selectionStart,
    end: el.selectionEnd
  };
}

function hardGet (el) {
  var active = document.activeElement;
  if (active !== el) {
    el.focus();
  }

  var range = document.selection.createRange();
  var bookmark = range.getBookmark();
  var original = el.value;
  var marker = getUniqueMarker(original);
  var parent = range.parentElement();
  if (parent === null || !inputs(parent)) {
    return result(0, 0);
  }
  range.text = marker + range.text + marker;

  var contents = el.value;

  el.value = original;
  range.moveToBookmark(bookmark);
  range.select();

  return result(contents.indexOf(marker), contents.lastIndexOf(marker) - marker.length);

  function result (start, end) {
    if (active !== el) { // don't disrupt pre-existing state
      if (active) {
        active.focus();
      } else {
        el.blur();
      }
    }
    return { start: start, end: end };
  }
}

function getUniqueMarker (contents) {
  var marker;
  do {
    marker = '@@marker.' + Math.random() * new Date();
  } while (contents.indexOf(marker) !== -1);
  return marker;
}

function inputs (el) {
  return ((el.tagName === 'INPUT' && el.type === 'text') || el.tagName === 'TEXTAREA');
}

function easySet (el, p) {
  el.selectionStart = parse(el, p.start);
  el.selectionEnd = parse(el, p.end);
}

function hardSet (el, p) {
  var range = el.createTextRange();

  if (p.start === 'end' && p.end === 'end') {
    range.collapse(false);
    range.select();
  } else {
    range.collapse(true);
    range.moveEnd('character', parse(el, p.end));
    range.moveStart('character', parse(el, p.start));
    range.select();
  }
}

function parse (el, value) {
  return value === 'end' ? el.value.length : value || 0;
}

function sell (el, p) {
  if (arguments.length === 2) {
    set(el, p);
  }
  return get(el);
}

module.exports = sell;

},{}],19:[function(require,module,exports){
var si = typeof setImmediate === 'function', tick;
if (si) {
  tick = function (fn) { setImmediate(fn); };
} else {
  tick = function (fn) { setTimeout(fn, 0); };
}

module.exports = tick;
},{}],20:[function(require,module,exports){
'use strict';

var isInput = require('./isInput');
var bindings = {};

function has (source, target) {
  var binding = bindings[source.id];
  return binding && binding[target.id];
}

function insert (source, target) {
  var binding = bindings[source.id];
  if (!binding) {
    binding = bindings[source.id] = {};
  }
  var invalidate = invalidator(target);
  binding[target.id] = invalidate;
  source.on('data', invalidate);
  source.on('destroyed', remove.bind(null, source, target));
}

function remove (source, target) {
  var binding = bindings[source.id];
  if (!binding) {
    return;
  }
  var invalidate = binding[target.id];
  source.off('data', invalidate);
  delete binding[target.id];
}

function invalidator (target) {
  return function invalidate () {
    target.refresh();
  };
}

function add (source, target) {
  if (isInput(target.associated) || has(source, target)) {
    return;
  }
  insert(source, target);
}

module.exports = {
  add: add,
  remove: remove
};

},{"./isInput":30}],21:[function(require,module,exports){
'use strict';

var crossvent = require('crossvent');
var emitter = require('contra/emitter');
var dom = require('./dom');
var text = require('./text');
var parse = require('./parse');
var clone = require('./clone');
var defaults = require('./defaults');
var momentum = require('./momentum');
var classes = require('./classes');
var noop = require('./noop');
var no;

function calendar (calendarOptions) {
  var o;
  var ref;
  var refCal;
  var container;
  var rendered = false;

  // date variables
  var monthOffsetAttribute = 'data-rome-offset';
  var weekdays;
  var weekdayCount;
  var calendarMonths = [];
  var lastYear;
  var lastMonth;
  var lastDay;
  var lastDayElement;
  var datewrapper;
  var back;
  var next;

  // time variables
  var secondsInDay = 60 * 60 * 24;
  var time;
  var timelist;

  var api = emitter({
    associated: calendarOptions.associated
  });

  init();
  setTimeout(ready, 0);

  return api;

  function napi () { return api; }

  function init (initOptions) {
    o = defaults(initOptions || calendarOptions, api);
    if (!container) { container = dom({ className: o.styles.container }); }
    weekdays = o.weekdayFormat;
    weekdayCount = weekdays.length;
    lastMonth = no;
    lastYear = no;
    lastDay = no;
    lastDayElement = no;
    o.appendTo.appendChild(container);

    removeChildren(container);
    rendered = false;
    ref = o.initialValue ? o.initialValue : momentum.moment();
    refCal = ref.clone();

    api.back = subtractMonth;
    api.container = container;
    api.destroyed = false;
    api.destroy = destroy.bind(api, false);
    api.emitValues = emitValues;
    api.getDate = getDate;
    api.getDateString = getDateString;
    api.getMoment = getMoment;
    api.hide = hide;
    api.next = addMonth;
    api.options = changeOptions;
    api.options.reset = resetOptions;
    api.refresh = refresh;
    api.restore = napi;
    api.setValue = setValue;
    api.show = show;

    eventListening();
    ready();

    return api;
  }

  function ready () {
    api.emit('ready', clone(o));
  }

  function destroy (silent) {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }

    if (o) {
      eventListening(true);
    }

    var destroyed = api.emitterSnapshot('destroyed');
    api.back = noop;
    api.destroyed = true;
    api.destroy = napi;
    api.emitValues = napi;
    api.getDate = noop;
    api.getDateString = noop;
    api.getMoment = noop;
    api.hide = napi;
    api.next = noop;
    api.options = napi;
    api.options.reset = napi;
    api.refresh = napi;
    api.restore = init;
    api.setValue = napi;
    api.show = napi;
    api.off();

    if (silent !== true) {
      destroyed();
    }

    return api;
  }

  function eventListening (remove) {
    var op = remove ? 'remove' : 'add';
    if (o.autoHideOnBlur) { crossvent[op](document.documentElement, 'focus', hideOnBlur, true); }
    if (o.autoHideOnClick) { crossvent[op](document, 'click', hideOnClick); }
  }

  function changeOptions (options) {
    if (arguments.length === 0) {
      return clone(o);
    }
    destroy();
    init(options);
    return api;
  }

  function resetOptions () {
    return changeOptions({ appendTo: o.appendTo });
  }

  function render () {
    if (rendered) {
      return;
    }
    rendered = true;
    renderDates();
    renderTime();
    api.emit('render');
  }

  function renderDates () {
    if (!o.date) {
      return;
    }
    var i;
    calendarMonths = [];

    datewrapper = dom({ className: o.styles.date, parent: container });

    for (i = 0; i < o.monthsInCalendar; i++) {
      renderMonth(i);
    }

    crossvent.add(back, 'click', subtractMonth);
    crossvent.add(next, 'click', addMonth);
    crossvent.add(datewrapper, 'click', pickDay);

    function renderMonth (i) {
      var month = dom({ className: o.styles.month, parent: datewrapper });
      if (i === 0) {
        back = dom({ type: 'button', className: o.styles.back, attributes: { type: 'button' }, parent: month });
      }
      if (i === o.monthsInCalendar -1) {
        next = dom({ type: 'button', className: o.styles.next, attributes: { type: 'button' }, parent: month });
      }
      var label = dom({ className: o.styles.monthLabel, parent: month });
      var date = dom({ type: 'table', className: o.styles.dayTable, parent: month });
      var datehead = dom({ type: 'thead', className: o.styles.dayHead, parent: date });
      var dateheadrow = dom({ type: 'tr', className: o.styles.dayRow, parent: datehead });
      var datebody = dom({ type: 'tbody', className: o.styles.dayBody, parent: date });
      var j;

      for (j = 0; j < weekdayCount; j++) {
        dom({ type: 'th', className: o.styles.dayHeadElem, parent: dateheadrow, text: weekdays[weekday(j)] });
      }

      datebody.setAttribute(monthOffsetAttribute, i);
      calendarMonths.push({
        label: label,
        body: datebody
      });
    }
  }

  function renderTime () {
    if (!o.time || !o.timeInterval) {
      return;
    }
    var timewrapper = dom({ className: o.styles.time, parent: container });
    time = dom({ className: o.styles.selectedTime, parent: timewrapper, text: ref.format(o.timeFormat) });
    crossvent.add(time, 'click', toggleTimeList);
    timelist = dom({ className: o.styles.timeList, parent: timewrapper });
    crossvent.add(timelist, 'click', pickTime);
    var next = momentum.moment('00:00:00', 'HH:mm:ss');
    var latest = next.clone().add(1, 'days');
    while (next.isBefore(latest)) {
      dom({ className: o.styles.timeOption, parent: timelist, text: next.format(o.timeFormat) });
      next.add(o.timeInterval, 'seconds');
    }
  }

  function weekday (index, backwards) {
    var factor = backwards ? -1 : 1;
    var offset = index + o.weekStart * factor;
    if (offset >= weekdayCount || offset < 0) {
      offset += weekdayCount * -factor;
    }
    return offset;
  }

  function displayValidTimesOnly () {
    if (!o.time || !rendered) {
      return;
    }
    var times = timelist.children;
    var length = times.length;
    var date;
    var time;
    var item;
    var i;
    for (i = 0; i < length; i++) {
      item = times[i];
      time = momentum.moment(text(item), o.timeFormat);
      date = setTime(ref.clone(), time);
      item.style.display = isInRange(date, false, o.timeValidator) ? 'block' : 'none';
    }
  }

  function toggleTimeList (show) {
    var display = typeof show === 'boolean' ? show : timelist.style.display === 'none';
    if (display) {
      showTimeList();
    } else {
      hideTimeList();
    }
  }

  function showTimeList () { if (timelist) { timelist.style.display = 'block'; } }
  function hideTimeList () { if (timelist) { timelist.style.display = 'none'; } }
  function showCalendar () { container.style.display = 'inline-block'; api.emit('show'); }
  function hideCalendar () {
    if (container.style.display !== 'none') {
      container.style.display = 'none';
      api.emit('hide');
    }
  }

  function show () {
    render();
    refresh();
    toggleTimeList(!o.date);
    showCalendar();
    return api;
  }

  function hide () {
    hideTimeList();
    setTimeout(hideCalendar, 0);
    return api;
  }

  function hideConditionally () {
    hideTimeList();

    var pos = classes.contains(container, o.styles.positioned);
    if (pos) {
      setTimeout(hideCalendar, 0);
    }
    return api;
  }

  function calendarEventTarget (e) {
    var target = e.target;
    if (target === api.associated) {
      return true;
    }
    while (target) {
      if (target === container) {
        return true;
      }
      target = target.parentNode;
    }
  }

  function hideOnBlur (e) {
    if (calendarEventTarget(e)) {
      return;
    }
    hideConditionally();
  }

  function hideOnClick (e) {
    if (calendarEventTarget(e)) {
      return;
    }
    hideConditionally();
  }

  function subtractMonth () { changeMonth('subtract'); }
  function addMonth () { changeMonth('add'); }
  function changeMonth (op) {
    var bound;
    var direction = op === 'add' ? -1 : 1;
    var offset = o.monthsInCalendar + direction * getMonthOffset(lastDayElement);
    refCal[op](offset, 'months');
    bound = inRange(refCal.clone());
    ref = bound || ref;
    if (bound) { refCal = bound.clone(); }
    update();
    api.emit(op === 'add' ? 'next' : 'back', ref.month());
  }

  function update (silent) {
    updateCalendar();
    updateTime();
    if (silent !== true) { emitValues(); }
    displayValidTimesOnly();
  }

  function updateCalendar () {
    if (!o.date || !rendered) {
      return;
    }
    var y = refCal.year();
    var m = refCal.month();
    var d = refCal.date();
    if (d === lastDay && m === lastMonth && y === lastYear) {
      return;
    }
    var canStay = isDisplayed();
    lastDay = refCal.date();
    lastMonth = refCal.month();
    lastYear = refCal.year();
    if (canStay) { updateCalendarSelection(); return; }
    calendarMonths.forEach(updateMonth);
    renderAllDays();

    function updateMonth (month, i) {
      var offsetCal = refCal.clone().add(i, 'months');
      text(month.label, offsetCal.format(o.monthFormat));
      removeChildren(month.body);
    }
  }

  function updateCalendarSelection () {
    var day = refCal.date() - 1;
    selectDayElement(false);
    calendarMonths.forEach(function (cal) {
      var days;
      if (sameCalendarMonth(cal.date, refCal)) {
        days = cast(cal.body.children).map(aggregate);
        days = Array.prototype.concat.apply([], days).filter(inside);
        selectDayElement(days[day]);
      }
    });

    function cast (like) {
      var dest = [];
      var i;
      for (i = 0; i < like.length; i++) {
        dest.push(like[i]);
      }
      return dest;
    }

    function aggregate (child) {
      return cast(child.children);
    }

    function inside (child) {
      return !classes.contains(child, o.styles.dayPrevMonth) &&
             !classes.contains(child, o.styles.dayNextMonth);
    }
  }

  function isDisplayed () {
    return calendarMonths.some(matches);

    function matches (cal) {
      if (!lastYear) { return false; }
      return sameCalendarMonth(cal.date, refCal);
    }
  }

  function sameCalendarMonth (left, right) {
    return left && right && left.year() === right.year() && left.month() === right.month();
  }

  function updateTime () {
    if (!o.time || !rendered) {
      return;
    }
    text(time, ref.format(o.timeFormat));
  }

  function emitValues () {
    api.emit('data', getDateString());
    api.emit('year', ref.year());
    api.emit('month', ref.month());
    api.emit('day', ref.day());
    api.emit('time', ref.format(o.timeFormat));
    return api;
  }

  function refresh () {
    lastYear = false;
    lastMonth = false;
    lastDay = false;
    update(true);
    return api;
  }

  function setValue (value) {
    var date = parse(value, o.inputFormat);
    if (date === null) {
      return;
    }
    ref = inRange(date) || ref;
    refCal = ref.clone();
    update(true);

    return api;
  }

  function removeChildren (elem, self) {
    while (elem && elem.firstChild) {
      elem.removeChild(elem.firstChild);
    }
    if (self === true) {
      elem.parentNode.removeChild(elem);
    }
  }

  function renderAllDays () {
    var i;
    for (i = 0; i < o.monthsInCalendar; i++) {
      renderDays(i);
    }
  }

  function renderDays (offset) {
    var month = calendarMonths[offset];
    var offsetCal = refCal.clone().add(offset, 'months');
    var total = offsetCal.daysInMonth();
    var current = offsetCal.month() !== ref.month() ? -1 : ref.date(); // -1 : 1..31
    var first = offsetCal.clone().date(1);
    var firstDay = weekday(first.day(), true); // 0..6
    var tr = dom({ type: 'tr', className: o.styles.dayRow, parent: month.body });
    var prevMonth = hiddenWhen(offset !== 0, [o.styles.dayBodyElem, o.styles.dayPrevMonth]);
    var nextMonth = hiddenWhen(offset !== o.monthsInCalendar - 1, [o.styles.dayBodyElem, o.styles.dayNextMonth]);
    var disabled = o.styles.dayDisabled;
    var lastDay;

    part({
      base: first.clone().subtract(firstDay, 'days'),
      length: firstDay,
      cell: prevMonth
    });

    part({
      base: first.clone(),
      length: total,
      cell: [o.styles.dayBodyElem],
      selectable: true
    });

    lastDay = first.clone().add(total, 'days');

    part({
      base: lastDay,
      length: weekdayCount - tr.children.length,
      cell: nextMonth
    });

    back.disabled = !isInRangeLeft(first, true);
    next.disabled = !isInRangeRight(lastDay, true);
    month.date = offsetCal.clone();

    function part (data) {
      var i, day, node;
      for (i = 0; i < data.length; i++) {
        if (tr.children.length === weekdayCount) {
          tr = dom({ type: 'tr', className: o.styles.dayRow, parent: month.body });
        }
        day = data.base.clone().add(i, 'days');
        node = dom({
          type: 'td',
          parent: tr,
          text: day.format(o.dayFormat),
          className: validationTest(day, data.cell.join(' ').split(' ')).join(' ')
        });
        node.setAttribute('data-date', day.date());
        if (data.selectable && day.date() === current) {
          selectDayElement(node);
        }
      }
    }

    function validationTest (day, cell) {
      if (!isInRange(day, true, o.dateValidator)) { cell.push(disabled); }
      return cell;
    }

    function hiddenWhen (value, cell) {
      if (value) { cell.push(o.styles.dayConcealed); }
      return cell;
    }
  }

  function isInRange (date, allday, validator) {
    if (!isInRangeLeft(date, allday)) {
      return false;
    }
    if (!isInRangeRight(date, allday)) {
      return false;
    }
    var valid = (validator || Function.prototype).call(api, date.toDate());
    return valid !== false;
  }

  function isInRangeLeft (date, allday) {
    var min = !o.min ? false : (allday ? o.min.clone().startOf('day') : o.min);
    return !min || !date.isBefore(min);
  }

  function isInRangeRight (date, allday) {
    var max = !o.max ? false : (allday ? o.max.clone().endOf('day') : o.max);
    return !max || !date.isAfter(max);
  }

  function inRange (date) {
    if (o.min && date.isBefore(o.min)) {
      return inRange(o.min.clone());
    } else if (o.max && date.isAfter(o.max)) {
      return inRange(o.max.clone());
    }
    var value = date.clone().subtract(1, 'days');
    if (validateTowards(value, date, 'add')) {
      return inTimeRange(value);
    }
    value = date.clone();
    if (validateTowards(value, date, 'subtract')) {
      return inTimeRange(value);
    }
  }

  function inTimeRange (value) {
    var copy = value.clone().subtract(o.timeInterval, 'seconds');
    var times = Math.ceil(secondsInDay / o.timeInterval);
    var i;
    for (i = 0; i < times; i++) {
      copy.add(o.timeInterval, 'seconds');
      if (copy.date() > value.date()) {
        copy.subtract(1, 'days');
      }
      if (o.timeValidator.call(api, copy.toDate()) !== false) {
        return copy;
      }
    }
  }

  function validateTowards (value, date, op) {
    var valid = false;
    while (valid === false) {
      value[op](1, 'days');
      if (value.month() !== date.month()) {
        break;
      }
      valid = o.dateValidator.call(api, value.toDate());
    }
    return valid !== false;
  }

  function pickDay (e) {
    var target = e.target;
    if (classes.contains(target, o.styles.dayDisabled) || !classes.contains(target, o.styles.dayBodyElem)) {
      return;
    }
    var day = target.getAttribute('data-date');
    var prev = classes.contains(target, o.styles.dayPrevMonth);
    var next = classes.contains(target, o.styles.dayNextMonth);
    var offset = getMonthOffset(target) - getMonthOffset(lastDayElement);
    ref.add(offset, 'months');
    if (prev || next) {
      ref.add(prev ? -1 : 1, 'months');
    }
    selectDayElement(target);
    ref.date(day); // must run after setting the month
    setTime(ref, inRange(ref) || ref);
    refCal = ref.clone();
    if (o.autoClose === true) { hideConditionally(); }
    update();
  }

  function selectDayElement (node) {
    if (lastDayElement) {
      classes.remove(lastDayElement, o.styles.selectedDay);
    }
    if (node) {
      classes.add(node, o.styles.selectedDay);
    }
    lastDayElement = node;
  }

  function getMonthOffset (elem) {
    var offset;
    while (elem && elem.getAttribute) {
      offset = elem.getAttribute(monthOffsetAttribute);
      if (typeof offset === 'string') {
        return parseInt(offset, 10);
      }
      elem = elem.parentNode;
    }
    return 0;
  }

  function setTime (to, from) {
    to.hour(from.hour()).minute(from.minute()).second(from.second());
    return to;
  }

  function pickTime (e) {
    var target = e.target;
    if (!classes.contains(target, o.styles.timeOption)) {
      return;
    }
    var value = momentum.moment(text(target), o.timeFormat);
    setTime(ref, value);
    refCal = ref.clone();
    emitValues();
    updateTime();
    if ((!o.date && o.autoClose === true) || o.autoClose === 'time') {
      hideConditionally();
    } else {
      hideTimeList();
    }
  }

  function getDate () {
    return ref.toDate();
  }

  function getDateString (format) {
    return ref.format(format || o.inputFormat);
  }

  function getMoment () {
    return ref.clone();
  }
}

module.exports = calendar;

},{"./classes":22,"./clone":23,"./defaults":25,"./dom":26,"./momentum":31,"./noop":32,"./parse":33,"./text":45,"contra/emitter":6,"crossvent":7}],22:[function(require,module,exports){
'use strict';

var trim = /^\s+|\s+$/g;
var whitespace = /\s+/;

function classes (node) {
  return node.className.replace(trim, '').split(whitespace);
}

function set (node, value) {
  node.className = value.join(' ');
}

function add (node, value) {
  var values = remove(node, value);
  values.push(value);
  set(node, values);
}

function remove (node, value) {
  var values = classes(node);
  var i = values.indexOf(value);
  if (i !== -1) {
    values.splice(i, 1);
    set(node, values);
  }
  return values;
}

function contains (node, value) {
  return classes(node).indexOf(value) !== -1;
}

module.exports = {
  add: add,
  remove: remove,
  contains: contains
};

},{}],23:[function(require,module,exports){
'use strict';

var momentum = require('./momentum');

// naïve implementation, specifically meant to clone `options` objects
function clone (thing) {
  var copy = {};
  var value;

  for (var key in thing) {
    value = thing[key];

    if (!value) {
      copy[key] = value;
    } else if (momentum.isMoment(value)) {
      copy[key] = value.clone();
    } else if (value._isStylesConfiguration) {
      copy[key] = clone(value);
    } else {
      copy[key] = value;
    }
  }

  return copy;
}

module.exports = clone;

},{"./momentum":31}],24:[function(require,module,exports){
'use strict';

var index = require('./index');
var input = require('./input');
var inline = require('./inline');
var isInput = require('./isInput');

function core (elem, options) {
  var cal;
  var existing = index.find(elem);
  if (existing) {
    return existing;
  }

  if (isInput(elem)) {
    cal = input(elem, options);
  } else {
    cal = inline(elem, options);
  }
  index.assign(elem, cal);

  return cal;
}

module.exports = core;

},{"./index":27,"./inline":28,"./input":29,"./isInput":30}],25:[function(require,module,exports){
'use strict';

var parse = require('./parse');
var isInput = require('./isInput');
var momentum = require('./momentum');

function defaults (options, cal) {
  var temp;
  var no;
  var o = options || {};
  if (o.autoHideOnClick === no) { o.autoHideOnClick = true; }
  if (o.autoHideOnBlur === no) { o.autoHideOnBlur = true; }
  if (o.autoClose === no) { o.autoClose = true; }
  if (o.appendTo === no) { o.appendTo = document.body; }
  if (o.appendTo === 'parent') {
    if (isInput(cal.associated)) {
      o.appendTo = cal.associated.parentNode;
    } else {
      throw new Error('Inline calendars must be appended to a parent node explicitly.');
    }
  }
  if (o.invalidate === no) { o.invalidate = true; }
  if (o.required === no) { o.required = false; }
  if (o.date === no) { o.date = true; }
  if (o.time === no) { o.time = true; }
  if (o.date === false && o.time === false) { throw new Error('At least one of `date` or `time` must be `true`.'); }
  if (o.inputFormat === no) {
    if (o.date && o.time) {
      o.inputFormat = 'YYYY-MM-DD HH:mm';
    } else if (o.date) {
      o.inputFormat = 'YYYY-MM-DD';
    } else {
      o.inputFormat = 'HH:mm';
    }
  }
  if (o.initialValue === no) {
    o.initialValue = null;
  } else {
    o.initialValue = parse(o.initialValue, o.inputFormat);
  }
  if (o.min === no) { o.min = null; } else { o.min = parse(o.min, o.inputFormat); }
  if (o.max === no) { o.max = null; } else { o.max = parse(o.max, o.inputFormat); }
  if (o.timeInterval === no) { o.timeInterval = 60 * 30; } // 30 minutes by default
  if (o.min && o.max) {
    if (o.max.isBefore(o.min)) {
      temp = o.max;
      o.max = o.min;
      o.min = temp;
    }
    if (o.date === true) {
      if (o.max.clone().subtract(1, 'days').isBefore(o.min)) {
        throw new Error('`max` must be at least one day after `min`');
      }
    } else if (o.timeInterval * 1000 - o.min % (o.timeInterval * 1000) > o.max - o.min) {
      throw new Error('`min` to `max` range must allow for at least one time option that matches `timeInterval`');
    }
  }
  if (o.dateValidator === no) { o.dateValidator = Function.prototype; }
  if (o.timeValidator === no) { o.timeValidator = Function.prototype; }
  if (o.timeFormat === no) { o.timeFormat = 'HH:mm'; }
  if (o.weekStart === no) { o.weekStart = momentum.moment().weekday(0).day(); }
  if (o.weekdayFormat === no) { o.weekdayFormat = 'min'; }
  if (o.weekdayFormat === 'long') {
    o.weekdayFormat = momentum.moment.weekdays();
  } else if (o.weekdayFormat === 'short') {
    o.weekdayFormat = momentum.moment.weekdaysShort();
  } else if (o.weekdayFormat === 'min') {
    o.weekdayFormat = momentum.moment.weekdaysMin();
  } else if (!Array.isArray(o.weekdayFormat) || o.weekdayFormat.length < 7) {
    throw new Error('`weekdays` must be `min`, `short`, or `long`');
  }
  if (o.monthsInCalendar === no) { o.monthsInCalendar = 1; }
  if (o.monthFormat === no) { o.monthFormat = 'MMMM YYYY'; }
  if (o.dayFormat === no) { o.dayFormat = 'DD'; }
  if (o.styles === no) { o.styles = {}; }

  o.styles._isStylesConfiguration = true;

  var styl = o.styles;
  if (styl.back === no) { styl.back = 'rd-back'; }
  if (styl.container === no) { styl.container = 'rd-container'; }
  if (styl.positioned === no) { styl.positioned = 'rd-container-attachment'; }
  if (styl.date === no) { styl.date = 'rd-date'; }
  if (styl.dayBody === no) { styl.dayBody = 'rd-days-body'; }
  if (styl.dayBodyElem === no) { styl.dayBodyElem = 'rd-day-body'; }
  if (styl.dayPrevMonth === no) { styl.dayPrevMonth = 'rd-day-prev-month'; }
  if (styl.dayNextMonth === no) { styl.dayNextMonth = 'rd-day-next-month'; }
  if (styl.dayDisabled === no) { styl.dayDisabled = 'rd-day-disabled'; }
  if (styl.dayConcealed === no) { styl.dayConcealed = 'rd-day-concealed'; }
  if (styl.dayHead === no) { styl.dayHead = 'rd-days-head'; }
  if (styl.dayHeadElem === no) { styl.dayHeadElem = 'rd-day-head'; }
  if (styl.dayRow === no) { styl.dayRow = 'rd-days-row'; }
  if (styl.dayTable === no) { styl.dayTable = 'rd-days'; }
  if (styl.month === no) { styl.month = 'rd-month'; }
  if (styl.monthLabel === no) { styl.monthLabel = 'rd-month-label'; }
  if (styl.next === no) { styl.next = 'rd-next'; }
  if (styl.selectedDay === no) { styl.selectedDay = 'rd-day-selected'; }
  if (styl.selectedTime === no) { styl.selectedTime = 'rd-time-selected'; }
  if (styl.time === no) { styl.time = 'rd-time'; }
  if (styl.timeList === no) { styl.timeList = 'rd-time-list'; }
  if (styl.timeOption === no) { styl.timeOption = 'rd-time-option'; }

  return o;
}

module.exports = defaults;

},{"./isInput":30,"./momentum":31,"./parse":33}],26:[function(require,module,exports){
'use strict';

function dom (options) {
  var o = options || {};
  if (!o.type) { o.type = 'div'; }
  var elem = document.createElement(o.type);
  if (o.className) { elem.className = o.className; }
  if (o.text) { elem.innerText = elem.textContent = o.text; }
  if (o.attributes) {
    Object.keys(o.attributes).forEach(function(key) {
      elem.setAttribute(key, o.attributes[key]);
    });
  }
  if (o.parent) { o.parent.appendChild(elem); }
  return elem;
}

module.exports = dom;

},{}],27:[function(require,module,exports){
'use strict';
var no;
var ikey = 'data-rome-id';
var index = [];

function find (thing) { // can be a DOM element or a number
  if (typeof thing !== 'number' && thing && thing.getAttribute) {
    return find(thing.getAttribute(ikey));
  }
  var existing = index[thing];
  if (existing !== no) {
    return existing;
  }
  return null;
}

function assign (elem, instance) {
  elem.setAttribute(ikey, instance.id = index.push(instance) - 1);
}

module.exports = {
  find: find,
  assign: assign
};

},{}],28:[function(require,module,exports){
'use strict';

var calendar = require('./calendar');

function inline (elem, calendarOptions) {
  var o = calendarOptions || {};

  o.appendTo = elem;
  o.associated = elem;

  var cal = calendar(o);
  cal.show();
  return cal;
}

module.exports = inline;

},{"./calendar":21}],29:[function(require,module,exports){
'use strict';

var crossvent = require('crossvent');
var bullseye = require('bullseye');
var throttle = require('./throttle');
var clone = require('./clone');
var defaults = require('./defaults');
var calendar = require('./calendar');
var momentum = require('./momentum');
var classes = require('./classes');

function inputCalendar (input, calendarOptions) {
  var o = calendarOptions || {};

  o.associated = input;

  var api = calendar(o);
  var throttledTakeInput = throttle(takeInput, 30);
  var ignoreInvalidation;
  var ignoreShow;
  var eye;

  init(o);

  return api;

  function init (initOptions) {
    o = defaults(initOptions || o, api);

    classes.add(api.container, o.styles.positioned);
    crossvent.add(api.container, 'mousedown', containerMouseDown);
    crossvent.add(api.container, 'click', containerClick);

    api.getDate = unrequire(api.getDate);
    api.getDateString = unrequire(api.getDateString);
    api.getMoment = unrequire(api.getMoment);

    if (o.initialValue) {
      input.value = o.initialValue.format(o.inputFormat);
    }

    eye = bullseye(api.container, input);
    api.on('data', updateInput);
    api.on('show', eye.refresh);

    eventListening();
    throttledTakeInput();
  }

  function destroy () {
    eventListening(true);
    eye.destroy();
    eye = null;
  }

  function eventListening (remove) {
    var op = remove ? 'remove' : 'add';
    crossvent[op](input, 'click', show);
    crossvent[op](input, 'touchend', show);
    crossvent[op](input, 'focusin', show);
    crossvent[op](input, 'change', throttledTakeInput);
    crossvent[op](input, 'keypress', throttledTakeInput);
    crossvent[op](input, 'keydown', throttledTakeInput);
    crossvent[op](input, 'input', throttledTakeInput);
    if (o.invalidate) { crossvent[op](input, 'blur', invalidateInput); }

    if (remove) {
      api.once('ready', init);
      api.off('destroyed', destroy);
    } else {
      api.off('ready', init);
      api.once('destroyed', destroy);
    }
  }

  function containerClick () {
    ignoreShow = true;
    input.focus();
    ignoreShow = false;
  }

  function containerMouseDown () {
    ignoreInvalidation = true;
    setTimeout(unignore, 0);

    function unignore () {
      ignoreInvalidation = false;
    }
  }

  function invalidateInput () {
    if (!ignoreInvalidation && !isEmpty()) {
      api.emitValues();
    }
  }

  function show () {
    if (ignoreShow) {
      return;
    }
    api.show();
  }

  function takeInput () {
    var value = input.value.trim();
    if (isEmpty()) {
      return;
    }
    var date = momentum.moment(value, o.inputFormat, o.strictParse);
    api.setValue(date);
  }

  function updateInput (data) {
    input.value = data;
  }

  function isEmpty () {
    return o.required === false && input.value.trim() === '';
  }

  function unrequire (fn) {
    return function maybe () {
      return isEmpty() ? null : fn.apply(this, arguments);
    };
  }
}

module.exports = inputCalendar;

},{"./calendar":21,"./classes":22,"./clone":23,"./defaults":25,"./momentum":31,"./throttle":46,"bullseye":2,"crossvent":7}],30:[function(require,module,exports){
'use strict';

function isInput (elem) {
  return elem && elem.nodeName && elem.nodeName.toLowerCase() === 'input';
}

module.exports = isInput;

},{}],31:[function(require,module,exports){
'use strict';

function isMoment (value) {
  return value && Object.prototype.hasOwnProperty.call(value, '_isAMomentObject');
}

var api = {
  moment: null,
  isMoment: isMoment
};

module.exports = api;

},{}],32:[function(require,module,exports){
'use strict';

function noop () {}

module.exports = noop;

},{}],33:[function(require,module,exports){
'use strict';

var momentum = require('./momentum');

function raw (date, format) {
  if (typeof date === 'string') {
    return momentum.moment(date, format);
  }
  if (Object.prototype.toString.call(date) === '[object Date]') {
    return momentum.moment(date);
  }
  if (momentum.isMoment(date)) {
    return date.clone();
  }
}

function parse (date, format) {
  var m = raw(date, typeof format === 'string' ? format : null);
  return m && m.isValid() ? m : null;
}

module.exports = parse;

},{"./momentum":31}],34:[function(require,module,exports){
'use strict';

if (!Array.prototype.filter) {
  Array.prototype.filter = function (fn, ctx) {
    var f = [];
    this.forEach(function (v, i, t) {
      if (fn.call(ctx, v, i, t)) { f.push(v); }
    }, ctx);
    return f;
  };
}

},{}],35:[function(require,module,exports){
'use strict';

if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (fn, ctx) {
    if (this === void 0 || this === null || typeof fn !== 'function') {
      throw new TypeError();
    }
    var t = this;
    var len = t.length;
    for (var i = 0; i < len; i++) {
      if (i in t) { fn.call(ctx, t[i], i, t); }
    }
  };
}

},{}],36:[function(require,module,exports){
'use strict';

if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (what, start) {
    if (this === undefined || this === null) {
      throw new TypeError();
    }
    var length = this.length;
    start = +start || 0;
    if (Math.abs(start) === Infinity) {
      start = 0;
    } else if (start < 0) {
      start += length;
      if (start < 0) { start = 0; }
    }
    for (; start < length; start++) {
      if (this[start] === what) {
        return start;
      }
    }
    return -1;
  };
}

},{}],37:[function(require,module,exports){
'use strict';

Array.isArray || (Array.isArray = function (a) {
  return '' + a !== a && Object.prototype.toString.call(a) === '[object Array]';
});

},{}],38:[function(require,module,exports){
'use strict';

if (!Array.prototype.map) {
  Array.prototype.map = function (fn, ctx) {
    var context, result, i;

    if (this == null) {
      throw new TypeError('this is null or not defined');
    }

    var source = Object(this);
    var len = source.length >>> 0;

    if (typeof fn !== 'function') {
      throw new TypeError(fn + ' is not a function');
    }

    if (arguments.length > 1) {
      context = ctx;
    }

    result = new Array(len);
    i = 0;

    while (i < len) {
      if (i in source) {
        result[i] = fn.call(context, source[i], i, source);
      }
      i++;
    }
    return result;
  };
}

},{}],39:[function(require,module,exports){
'use strict';

if (!Array.prototype.some) {
  Array.prototype.some = function (fn, ctx) {
    var context, i;

    if (this == null) {
      throw new TypeError('this is null or not defined');
    }

    var source = Object(this);
    var len = source.length >>> 0;

    if (typeof fn !== 'function') {
      throw new TypeError(fn + ' is not a function');
    }

    if (arguments.length > 1) {
      context = ctx;
    }

    i = 0;

    while (i < len) {
      if (i in source) {
        var test = fn.call(context, source[i], i, source);
        if (test) {
          return true;
        }
      }
      i++;
    }
    return false;
  };
}

},{}],40:[function(require,module,exports){
'use strict';

if (!Function.prototype.bind) {
  Function.prototype.bind = function (context) {
    if (typeof this !== 'function') {
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }
    var curried = Array.prototype.slice.call(arguments, 1);
    var original = this;
    var NoOp = function () {};
    var bound = function () {
      var ctx = this instanceof NoOp && context ? this : context;
      var args = curried.concat(Array.prototype.slice.call(arguments));
      return original.apply(ctx, args);
    };
    NoOp.prototype = this.prototype;
    bound.prototype = new NoOp();
    return bound;
  };
}

},{}],41:[function(require,module,exports){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString');
var dontEnums = [
  'toString',
  'toLocaleString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'constructor'
];
var dontEnumsLength = dontEnums.length;

if (!Object.keys) {
  Object.keys = function(obj) {
    if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
      throw new TypeError('Object.keys called on non-object');
    }

    var result = [], prop, i;

    for (prop in obj) {
      if (hasOwn.call(obj, prop)) {
        result.push(prop);
      }
    }

    if (hasDontEnumBug) {
      for (i = 0; i < dontEnumsLength; i++) {
        if (hasOwn.call(obj, dontEnums[i])) {
          result.push(dontEnums[i]);
        }
      }
    }
    return result;
  };
}

},{}],42:[function(require,module,exports){
'use strict';

if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

},{}],43:[function(require,module,exports){
'use strict';

// these are only required for IE < 9
// maybe move to IE-specific distro?
require('./polyfills/function.bind');
require('./polyfills/array.foreach');
require('./polyfills/array.map');
require('./polyfills/array.filter');
require('./polyfills/array.isarray');
require('./polyfills/array.indexof');
require('./polyfills/array.some');
require('./polyfills/string.trim');
require('./polyfills/object.keys');

var core = require('./core');
var index = require('./index');
var use = require('./use');

core.use = use.bind(core);
core.find = index.find;
core.val = require('./validators');

module.exports = core;

},{"./core":24,"./index":27,"./polyfills/array.filter":34,"./polyfills/array.foreach":35,"./polyfills/array.indexof":36,"./polyfills/array.isarray":37,"./polyfills/array.map":38,"./polyfills/array.some":39,"./polyfills/function.bind":40,"./polyfills/object.keys":41,"./polyfills/string.trim":42,"./use":47,"./validators":48}],44:[function(require,module,exports){
(function (global){
var rome = require('./rome');
var momentum = require('./momentum');

rome.use(global.moment);

if (momentum.moment === void 0) {
  throw new Error('rome depends on moment.js, you can get it at http://momentjs.com, or you could use the bundled distribution file instead.');
}

module.exports = rome;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./momentum":31,"./rome":43}],45:[function(require,module,exports){
'use strict';

function text (elem, value) {
  if (arguments.length === 2) {
    elem.innerText = elem.textContent = value;
  }
  return elem.innerText || elem.textContent;
}

module.exports = text;

},{}],46:[function(require,module,exports){
'use strict';

module.exports = function throttle (fn, boundary) {
  var last = -Infinity;
  var timer;
  return function bounced () {
    if (timer) {
      return;
    }
    unbound();

    function unbound () {
      clearTimeout(timer);
      timer = null;
      var next = last + boundary;
      var now = +new Date();
      if (now > next) {
        last = now;
        fn.apply(this, arguments);
      } else {
        timer = setTimeout(unbound, next - now);
      }
    }
  };
};

},{}],47:[function(require,module,exports){
'use strict';

var momentum = require('./momentum');

function use (moment) {
  this.moment = momentum.moment = moment;
}

module.exports = use;

},{"./momentum":31}],48:[function(require,module,exports){
'use strict';

var index = require('./index');
var parse = require('./parse');
var association = require('./association');

function compareBuilder (compare) {
  return function factory (value) {
    var fixed = parse(value);

    return function validate (date) {
      var cal = index.find(value);
      var left = parse(date);
      var right = fixed || cal && cal.getMoment();
      if (!right) {
        return true;
      }
      if (cal) {
        association.add(this, cal);
      }
      return compare(left, right);
    };
  };
}

function rangeBuilder (how, compare) {
  return function factory (start, end) {
    var dates;
    var len = arguments.length;

    if (Array.isArray(start)) {
      dates = start;
    } else {
      if (len === 1) {
        dates = [start];
      } else if (len === 2) {
        dates = [[start, end]];
      }
    }

    return function validate (date) {
      return dates.map(expand.bind(this))[how](compare.bind(this, date));
    };

    function expand (value) {
      var start, end;
      var cal = index.find(value);
      if (cal) {
        start = end = cal.getMoment();
      } else if (Array.isArray(value)) {
        start = value[0]; end = value[1];
      } else {
        start = end = value;
      }
      if (cal) {
        association.add(cal, this);
      }
      return {
        start: parse(start).startOf('day').toDate(),
        end: parse(end).endOf('day').toDate()
      };
    }
  };
}

var afterEq  = compareBuilder(function (left, right) { return left >= right; });
var after    = compareBuilder(function (left, right) { return left  > right; });
var beforeEq = compareBuilder(function (left, right) { return left <= right; });
var before   = compareBuilder(function (left, right) { return left  < right; });

var except   = rangeBuilder('every', function (left, right) { return right.start  > left || right.end  < left; });
var only     = rangeBuilder('some',  function (left, right) { return right.start <= left && right.end >= left; });

module.exports = {
  afterEq: afterEq,
  after: after,
  beforeEq: beforeEq,
  before: before,
  except: except,
  only: only
};

},{"./association":20,"./index":27,"./parse":33}]},{},[44])(44)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXRvYS9hdG9hLmpzIiwibm9kZV9tb2R1bGVzL2J1bGxzZXllL2J1bGxzZXllLmpzIiwibm9kZV9tb2R1bGVzL2J1bGxzZXllL3RhaWxvcm1hZGUuanMiLCJub2RlX21vZHVsZXMvYnVsbHNleWUvdGhyb3R0bGUuanMiLCJub2RlX21vZHVsZXMvY29udHJhL2RlYm91bmNlLmpzIiwibm9kZV9tb2R1bGVzL2NvbnRyYS9lbWl0dGVyLmpzIiwibm9kZV9tb2R1bGVzL2Nyb3NzdmVudC9zcmMvY3Jvc3N2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2Nyb3NzdmVudC9zcmMvZXZlbnRtYXAuanMiLCJub2RlX21vZHVsZXMvY3VzdG9tLWV2ZW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvZ2V0U2VsZWN0aW9uLmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvZ2V0U2VsZWN0aW9uTnVsbE9wLmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvZ2V0U2VsZWN0aW9uUmF3LmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvZ2V0U2VsZWN0aW9uU3ludGhldGljLmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvaXNIb3N0LmpzIiwibm9kZV9tb2R1bGVzL3NlbGVjY2lvbi9zcmMvcmFuZ2VUb1RleHRSYW5nZS5qcyIsIm5vZGVfbW9kdWxlcy9zZWxlY2Npb24vc3JjL3NlbGVjY2lvbi5qcyIsIm5vZGVfbW9kdWxlcy9zZWxlY2Npb24vc3JjL3NldFNlbGVjdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9zZWxsL3NlbGwuanMiLCJub2RlX21vZHVsZXMvdGlja3kvdGlja3ktYnJvd3Nlci5qcyIsInNyYy9hc3NvY2lhdGlvbi5qcyIsInNyYy9jYWxlbmRhci5qcyIsInNyYy9jbGFzc2VzLmpzIiwic3JjL2Nsb25lLmpzIiwic3JjL2NvcmUuanMiLCJzcmMvZGVmYXVsdHMuanMiLCJzcmMvZG9tLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL2lubGluZS5qcyIsInNyYy9pbnB1dC5qcyIsInNyYy9pc0lucHV0LmpzIiwic3JjL21vbWVudHVtLmpzIiwic3JjL25vb3AuanMiLCJzcmMvcGFyc2UuanMiLCJzcmMvcG9seWZpbGxzL2FycmF5LmZpbHRlci5qcyIsInNyYy9wb2x5ZmlsbHMvYXJyYXkuZm9yZWFjaC5qcyIsInNyYy9wb2x5ZmlsbHMvYXJyYXkuaW5kZXhvZi5qcyIsInNyYy9wb2x5ZmlsbHMvYXJyYXkuaXNhcnJheS5qcyIsInNyYy9wb2x5ZmlsbHMvYXJyYXkubWFwLmpzIiwic3JjL3BvbHlmaWxscy9hcnJheS5zb21lLmpzIiwic3JjL3BvbHlmaWxscy9mdW5jdGlvbi5iaW5kLmpzIiwic3JjL3BvbHlmaWxscy9vYmplY3Qua2V5cy5qcyIsInNyYy9wb2x5ZmlsbHMvc3RyaW5nLnRyaW0uanMiLCJzcmMvcm9tZS5qcyIsInNyYy9yb21lLnN0YW5kYWxvbmUuanMiLCJzcmMvdGV4dC5qcyIsInNyYy90aHJvdHRsZS5qcyIsInNyYy91c2UuanMiLCJzcmMvdmFsaWRhdG9ycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNXBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYXRvYSAoYSwgbikgeyByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYSwgbik7IH1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNyb3NzdmVudCA9IHJlcXVpcmUoJ2Nyb3NzdmVudCcpO1xudmFyIHRocm90dGxlID0gcmVxdWlyZSgnLi90aHJvdHRsZScpO1xudmFyIHRhaWxvcm1hZGUgPSByZXF1aXJlKCcuL3RhaWxvcm1hZGUnKTtcblxuZnVuY3Rpb24gYnVsbHNleWUgKGVsLCB0YXJnZXQsIG9wdGlvbnMpIHtcbiAgdmFyIG8gPSBvcHRpb25zO1xuICB2YXIgZG9tVGFyZ2V0ID0gdGFyZ2V0ICYmIHRhcmdldC50YWdOYW1lO1xuXG4gIGlmICghZG9tVGFyZ2V0ICYmIGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBvID0gdGFyZ2V0O1xuICB9XG4gIGlmICghZG9tVGFyZ2V0KSB7XG4gICAgdGFyZ2V0ID0gZWw7XG4gIH1cbiAgaWYgKCFvKSB7IG8gPSB7fTsgfVxuXG4gIHZhciBkZXN0cm95ZWQgPSBmYWxzZTtcbiAgdmFyIHRocm90dGxlZFdyaXRlID0gdGhyb3R0bGUod3JpdGUsIDMwKTtcbiAgdmFyIHRhaWxvck9wdGlvbnMgPSB7IHVwZGF0ZTogby5hdXRvdXBkYXRlVG9DYXJldCAhPT0gZmFsc2UgJiYgdXBkYXRlIH07XG4gIHZhciB0YWlsb3IgPSBvLmNhcmV0ICYmIHRhaWxvcm1hZGUodGFyZ2V0LCB0YWlsb3JPcHRpb25zKTtcblxuICB3cml0ZSgpO1xuXG4gIGlmIChvLnRyYWNraW5nICE9PSBmYWxzZSkge1xuICAgIGNyb3NzdmVudC5hZGQod2luZG93LCAncmVzaXplJywgdGhyb3R0bGVkV3JpdGUpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICByZWFkOiByZWFkTnVsbCxcbiAgICByZWZyZXNoOiB3cml0ZSxcbiAgICBkZXN0cm95OiBkZXN0cm95LFxuICAgIHNsZWVwOiBzbGVlcFxuICB9O1xuXG4gIGZ1bmN0aW9uIHNsZWVwICgpIHtcbiAgICB0YWlsb3JPcHRpb25zLnNsZWVwaW5nID0gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWROdWxsICgpIHsgcmV0dXJuIHJlYWQoKTsgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKHJlYWRpbmdzKSB7XG4gICAgdmFyIGJvdW5kcyA9IHRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICB2YXIgc2Nyb2xsVG9wID0gZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcbiAgICBpZiAodGFpbG9yKSB7XG4gICAgICByZWFkaW5ncyA9IHRhaWxvci5yZWFkKCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB4OiAocmVhZGluZ3MuYWJzb2x1dGUgPyAwIDogYm91bmRzLmxlZnQpICsgcmVhZGluZ3MueCxcbiAgICAgICAgeTogKHJlYWRpbmdzLmFic29sdXRlID8gMCA6IGJvdW5kcy50b3ApICsgc2Nyb2xsVG9wICsgcmVhZGluZ3MueSArIDIwXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgeDogYm91bmRzLmxlZnQsXG4gICAgICB5OiBib3VuZHMudG9wICsgc2Nyb2xsVG9wXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSAocmVhZGluZ3MpIHtcbiAgICB3cml0ZShyZWFkaW5ncyk7XG4gIH1cblxuICBmdW5jdGlvbiB3cml0ZSAocmVhZGluZ3MpIHtcbiAgICBpZiAoZGVzdHJveWVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0J1bGxzZXllIGNhblxcJ3QgcmVmcmVzaCBhZnRlciBiZWluZyBkZXN0cm95ZWQuIENyZWF0ZSBhbm90aGVyIGluc3RhbmNlIGluc3RlYWQuJyk7XG4gICAgfVxuICAgIGlmICh0YWlsb3IgJiYgIXJlYWRpbmdzKSB7XG4gICAgICB0YWlsb3JPcHRpb25zLnNsZWVwaW5nID0gZmFsc2U7XG4gICAgICB0YWlsb3IucmVmcmVzaCgpOyByZXR1cm47XG4gICAgfVxuICAgIHZhciBwID0gcmVhZChyZWFkaW5ncyk7XG4gICAgaWYgKCF0YWlsb3IgJiYgdGFyZ2V0ICE9PSBlbCkge1xuICAgICAgcC55ICs9IHRhcmdldC5vZmZzZXRIZWlnaHQ7XG4gICAgfVxuICAgIGVsLnN0eWxlLmxlZnQgPSBwLnggKyAncHgnO1xuICAgIGVsLnN0eWxlLnRvcCA9IHAueSArICdweCc7XG4gIH1cblxuICBmdW5jdGlvbiBkZXN0cm95ICgpIHtcbiAgICBpZiAodGFpbG9yKSB7IHRhaWxvci5kZXN0cm95KCk7IH1cbiAgICBjcm9zc3ZlbnQucmVtb3ZlKHdpbmRvdywgJ3Jlc2l6ZScsIHRocm90dGxlZFdyaXRlKTtcbiAgICBkZXN0cm95ZWQgPSB0cnVlO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnVsbHNleWU7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzZWxsID0gcmVxdWlyZSgnc2VsbCcpO1xudmFyIGNyb3NzdmVudCA9IHJlcXVpcmUoJ2Nyb3NzdmVudCcpO1xudmFyIHNlbGVjY2lvbiA9IHJlcXVpcmUoJ3NlbGVjY2lvbicpO1xudmFyIHRocm90dGxlID0gcmVxdWlyZSgnLi90aHJvdHRsZScpO1xudmFyIGdldFNlbGVjdGlvbiA9IHNlbGVjY2lvbi5nZXQ7XG52YXIgcHJvcHMgPSBbXG4gICdkaXJlY3Rpb24nLFxuICAnYm94U2l6aW5nJyxcbiAgJ3dpZHRoJyxcbiAgJ2hlaWdodCcsXG4gICdvdmVyZmxvd1gnLFxuICAnb3ZlcmZsb3dZJyxcbiAgJ2JvcmRlclRvcFdpZHRoJyxcbiAgJ2JvcmRlclJpZ2h0V2lkdGgnLFxuICAnYm9yZGVyQm90dG9tV2lkdGgnLFxuICAnYm9yZGVyTGVmdFdpZHRoJyxcbiAgJ3BhZGRpbmdUb3AnLFxuICAncGFkZGluZ1JpZ2h0JyxcbiAgJ3BhZGRpbmdCb3R0b20nLFxuICAncGFkZGluZ0xlZnQnLFxuICAnZm9udFN0eWxlJyxcbiAgJ2ZvbnRWYXJpYW50JyxcbiAgJ2ZvbnRXZWlnaHQnLFxuICAnZm9udFN0cmV0Y2gnLFxuICAnZm9udFNpemUnLFxuICAnZm9udFNpemVBZGp1c3QnLFxuICAnbGluZUhlaWdodCcsXG4gICdmb250RmFtaWx5JyxcbiAgJ3RleHRBbGlnbicsXG4gICd0ZXh0VHJhbnNmb3JtJyxcbiAgJ3RleHRJbmRlbnQnLFxuICAndGV4dERlY29yYXRpb24nLFxuICAnbGV0dGVyU3BhY2luZycsXG4gICd3b3JkU3BhY2luZydcbl07XG52YXIgd2luID0gZ2xvYmFsO1xudmFyIGRvYyA9IGRvY3VtZW50O1xudmFyIGZmID0gd2luLm1veklubmVyU2NyZWVuWCAhPT0gbnVsbCAmJiB3aW4ubW96SW5uZXJTY3JlZW5YICE9PSB2b2lkIDA7XG5cbmZ1bmN0aW9uIHRhaWxvcm1hZGUgKGVsLCBvcHRpb25zKSB7XG4gIHZhciB0ZXh0SW5wdXQgPSBlbC50YWdOYW1lID09PSAnSU5QVVQnIHx8IGVsLnRhZ05hbWUgPT09ICdURVhUQVJFQSc7XG4gIHZhciB0aHJvdHRsZWRSZWZyZXNoID0gdGhyb3R0bGUocmVmcmVzaCwgMzApO1xuICB2YXIgbyA9IG9wdGlvbnMgfHwge307XG5cbiAgYmluZCgpO1xuXG4gIHJldHVybiB7XG4gICAgcmVhZDogcmVhZFBvc2l0aW9uLFxuICAgIHJlZnJlc2g6IHRocm90dGxlZFJlZnJlc2gsXG4gICAgZGVzdHJveTogZGVzdHJveVxuICB9O1xuXG4gIGZ1bmN0aW9uIG5vb3AgKCkge31cbiAgZnVuY3Rpb24gcmVhZFBvc2l0aW9uICgpIHsgcmV0dXJuICh0ZXh0SW5wdXQgPyBjb29yZHNUZXh0IDogY29vcmRzSFRNTCkoKTsgfVxuXG4gIGZ1bmN0aW9uIHJlZnJlc2ggKCkge1xuICAgIGlmIChvLnNsZWVwaW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiAoby51cGRhdGUgfHwgbm9vcCkocmVhZFBvc2l0aW9uKCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gY29vcmRzVGV4dCAoKSB7XG4gICAgdmFyIHAgPSBzZWxsKGVsKTtcbiAgICB2YXIgY29udGV4dCA9IHByZXBhcmUoKTtcbiAgICB2YXIgcmVhZGluZ3MgPSByZWFkVGV4dENvb3Jkcyhjb250ZXh0LCBwLnN0YXJ0KTtcbiAgICBkb2MuYm9keS5yZW1vdmVDaGlsZChjb250ZXh0Lm1pcnJvcik7XG4gICAgcmV0dXJuIHJlYWRpbmdzO1xuICB9XG5cbiAgZnVuY3Rpb24gY29vcmRzSFRNTCAoKSB7XG4gICAgdmFyIHNlbCA9IGdldFNlbGVjdGlvbigpO1xuICAgIGlmIChzZWwucmFuZ2VDb3VudCkge1xuICAgICAgdmFyIHJhbmdlID0gc2VsLmdldFJhbmdlQXQoMCk7XG4gICAgICB2YXIgbmVlZHNUb1dvcmtBcm91bmROZXdsaW5lQnVnID0gcmFuZ2Uuc3RhcnRDb250YWluZXIubm9kZU5hbWUgPT09ICdQJyAmJiByYW5nZS5zdGFydE9mZnNldCA9PT0gMDtcbiAgICAgIGlmIChuZWVkc1RvV29ya0Fyb3VuZE5ld2xpbmVCdWcpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB4OiByYW5nZS5zdGFydENvbnRhaW5lci5vZmZzZXRMZWZ0LFxuICAgICAgICAgIHk6IHJhbmdlLnN0YXJ0Q29udGFpbmVyLm9mZnNldFRvcCxcbiAgICAgICAgICBhYnNvbHV0ZTogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHJhbmdlLmdldENsaWVudFJlY3RzKSB7XG4gICAgICAgIHZhciByZWN0cyA9IHJhbmdlLmdldENsaWVudFJlY3RzKCk7XG4gICAgICAgIGlmIChyZWN0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHJlY3RzWzBdLmxlZnQsXG4gICAgICAgICAgICB5OiByZWN0c1swXS50b3AsXG4gICAgICAgICAgICBhYnNvbHV0ZTogdHJ1ZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHsgeDogMCwgeTogMCB9O1xuICB9XG5cbiAgZnVuY3Rpb24gcmVhZFRleHRDb29yZHMgKGNvbnRleHQsIHApIHtcbiAgICB2YXIgcmVzdCA9IGRvYy5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdmFyIG1pcnJvciA9IGNvbnRleHQubWlycm9yO1xuICAgIHZhciBjb21wdXRlZCA9IGNvbnRleHQuY29tcHV0ZWQ7XG5cbiAgICB3cml0ZShtaXJyb3IsIHJlYWQoZWwpLnN1YnN0cmluZygwLCBwKSk7XG5cbiAgICBpZiAoZWwudGFnTmFtZSA9PT0gJ0lOUFVUJykge1xuICAgICAgbWlycm9yLnRleHRDb250ZW50ID0gbWlycm9yLnRleHRDb250ZW50LnJlcGxhY2UoL1xccy9nLCAnXFx1MDBhMCcpO1xuICAgIH1cblxuICAgIHdyaXRlKHJlc3QsIHJlYWQoZWwpLnN1YnN0cmluZyhwKSB8fCAnLicpO1xuXG4gICAgbWlycm9yLmFwcGVuZENoaWxkKHJlc3QpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IHJlc3Qub2Zmc2V0TGVmdCArIHBhcnNlSW50KGNvbXB1dGVkWydib3JkZXJMZWZ0V2lkdGgnXSksXG4gICAgICB5OiByZXN0Lm9mZnNldFRvcCArIHBhcnNlSW50KGNvbXB1dGVkWydib3JkZXJUb3BXaWR0aCddKVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChlbCkge1xuICAgIHJldHVybiB0ZXh0SW5wdXQgPyBlbC52YWx1ZSA6IGVsLmlubmVySFRNTDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByZXBhcmUgKCkge1xuICAgIHZhciBjb21wdXRlZCA9IHdpbi5nZXRDb21wdXRlZFN0eWxlID8gZ2V0Q29tcHV0ZWRTdHlsZShlbCkgOiBlbC5jdXJyZW50U3R5bGU7XG4gICAgdmFyIG1pcnJvciA9IGRvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB2YXIgc3R5bGUgPSBtaXJyb3Iuc3R5bGU7XG5cbiAgICBkb2MuYm9keS5hcHBlbmRDaGlsZChtaXJyb3IpO1xuXG4gICAgaWYgKGVsLnRhZ05hbWUgIT09ICdJTlBVVCcpIHtcbiAgICAgIHN0eWxlLndvcmRXcmFwID0gJ2JyZWFrLXdvcmQnO1xuICAgIH1cbiAgICBzdHlsZS53aGl0ZVNwYWNlID0gJ3ByZS13cmFwJztcbiAgICBzdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgIHByb3BzLmZvckVhY2goY29weSk7XG5cbiAgICBpZiAoZmYpIHtcbiAgICAgIHN0eWxlLndpZHRoID0gcGFyc2VJbnQoY29tcHV0ZWQud2lkdGgpIC0gMiArICdweCc7XG4gICAgICBpZiAoZWwuc2Nyb2xsSGVpZ2h0ID4gcGFyc2VJbnQoY29tcHV0ZWQuaGVpZ2h0KSkge1xuICAgICAgICBzdHlsZS5vdmVyZmxvd1kgPSAnc2Nyb2xsJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcbiAgICB9XG4gICAgcmV0dXJuIHsgbWlycm9yOiBtaXJyb3IsIGNvbXB1dGVkOiBjb21wdXRlZCB9O1xuXG4gICAgZnVuY3Rpb24gY29weSAocHJvcCkge1xuICAgICAgc3R5bGVbcHJvcF0gPSBjb21wdXRlZFtwcm9wXTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB3cml0ZSAoZWwsIHZhbHVlKSB7XG4gICAgaWYgKHRleHRJbnB1dCkge1xuICAgICAgZWwudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYmluZCAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICBjcm9zc3ZlbnRbb3BdKGVsLCAna2V5ZG93bicsIHRocm90dGxlZFJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdrZXl1cCcsIHRocm90dGxlZFJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdpbnB1dCcsIHRocm90dGxlZFJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdwYXN0ZScsIHRocm90dGxlZFJlZnJlc2gpO1xuICAgIGNyb3NzdmVudFtvcF0oZWwsICdjaGFuZ2UnLCB0aHJvdHRsZWRSZWZyZXNoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlc3Ryb3kgKCkge1xuICAgIGJpbmQodHJ1ZSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0YWlsb3JtYWRlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiB0aHJvdHRsZSAoZm4sIGJvdW5kYXJ5KSB7XG4gIHZhciBsYXN0ID0gLUluZmluaXR5O1xuICB2YXIgdGltZXI7XG4gIHJldHVybiBmdW5jdGlvbiBib3VuY2VkICgpIHtcbiAgICBpZiAodGltZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdW5ib3VuZCgpO1xuXG4gICAgZnVuY3Rpb24gdW5ib3VuZCAoKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgdmFyIG5leHQgPSBsYXN0ICsgYm91bmRhcnk7XG4gICAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgIGlmIChub3cgPiBuZXh0KSB7XG4gICAgICAgIGxhc3QgPSBub3c7XG4gICAgICAgIGZuKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lciA9IHNldFRpbWVvdXQodW5ib3VuZCwgbmV4dCAtIG5vdyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRocm90dGxlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdGlja3kgPSByZXF1aXJlKCd0aWNreScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRlYm91bmNlIChmbiwgYXJncywgY3R4KSB7XG4gIGlmICghZm4pIHsgcmV0dXJuOyB9XG4gIHRpY2t5KGZ1bmN0aW9uIHJ1biAoKSB7XG4gICAgZm4uYXBwbHkoY3R4IHx8IG51bGwsIGFyZ3MgfHwgW10pO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBhdG9hID0gcmVxdWlyZSgnYXRvYScpO1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGVtaXR0ZXIgKHRoaW5nLCBvcHRpb25zKSB7XG4gIHZhciBvcHRzID0gb3B0aW9ucyB8fCB7fTtcbiAgdmFyIGV2dCA9IHt9O1xuICBpZiAodGhpbmcgPT09IHVuZGVmaW5lZCkgeyB0aGluZyA9IHt9OyB9XG4gIHRoaW5nLm9uID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gICAgaWYgKCFldnRbdHlwZV0pIHtcbiAgICAgIGV2dFt0eXBlXSA9IFtmbl07XG4gICAgfSBlbHNlIHtcbiAgICAgIGV2dFt0eXBlXS5wdXNoKGZuKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaW5nO1xuICB9O1xuICB0aGluZy5vbmNlID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gICAgZm4uX29uY2UgPSB0cnVlOyAvLyB0aGluZy5vZmYoZm4pIHN0aWxsIHdvcmtzIVxuICAgIHRoaW5nLm9uKHR5cGUsIGZuKTtcbiAgICByZXR1cm4gdGhpbmc7XG4gIH07XG4gIHRoaW5nLm9mZiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBpZiAoYyA9PT0gMSkge1xuICAgICAgZGVsZXRlIGV2dFt0eXBlXTtcbiAgICB9IGVsc2UgaWYgKGMgPT09IDApIHtcbiAgICAgIGV2dCA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZXQgPSBldnRbdHlwZV07XG4gICAgICBpZiAoIWV0KSB7IHJldHVybiB0aGluZzsgfVxuICAgICAgZXQuc3BsaWNlKGV0LmluZGV4T2YoZm4pLCAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaW5nO1xuICB9O1xuICB0aGluZy5lbWl0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gYXRvYShhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGluZy5lbWl0dGVyU25hcHNob3QoYXJncy5zaGlmdCgpKS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfTtcbiAgdGhpbmcuZW1pdHRlclNuYXBzaG90ID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgZXQgPSAoZXZ0W3R5cGVdIHx8IFtdKS5zbGljZSgwKTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhdG9hKGFyZ3VtZW50cyk7XG4gICAgICB2YXIgY3R4ID0gdGhpcyB8fCB0aGluZztcbiAgICAgIGlmICh0eXBlID09PSAnZXJyb3InICYmIG9wdHMudGhyb3dzICE9PSBmYWxzZSAmJiAhZXQubGVuZ3RoKSB7IHRocm93IGFyZ3MubGVuZ3RoID09PSAxID8gYXJnc1swXSA6IGFyZ3M7IH1cbiAgICAgIGV0LmZvckVhY2goZnVuY3Rpb24gZW1pdHRlciAobGlzdGVuKSB7XG4gICAgICAgIGlmIChvcHRzLmFzeW5jKSB7IGRlYm91bmNlKGxpc3RlbiwgYXJncywgY3R4KTsgfSBlbHNlIHsgbGlzdGVuLmFwcGx5KGN0eCwgYXJncyk7IH1cbiAgICAgICAgaWYgKGxpc3Rlbi5fb25jZSkgeyB0aGluZy5vZmYodHlwZSwgbGlzdGVuKTsgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdGhpbmc7XG4gICAgfTtcbiAgfTtcbiAgcmV0dXJuIHRoaW5nO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGN1c3RvbUV2ZW50ID0gcmVxdWlyZSgnY3VzdG9tLWV2ZW50Jyk7XG52YXIgZXZlbnRtYXAgPSByZXF1aXJlKCcuL2V2ZW50bWFwJyk7XG52YXIgZG9jID0gZG9jdW1lbnQ7XG52YXIgYWRkRXZlbnQgPSBhZGRFdmVudEVhc3k7XG52YXIgcmVtb3ZlRXZlbnQgPSByZW1vdmVFdmVudEVhc3k7XG52YXIgaGFyZENhY2hlID0gW107XG5cbmlmICghZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgYWRkRXZlbnQgPSBhZGRFdmVudEhhcmQ7XG4gIHJlbW92ZUV2ZW50ID0gcmVtb3ZlRXZlbnRIYXJkO1xufVxuXG5mdW5jdGlvbiBhZGRFdmVudEVhc3kgKGVsLCB0eXBlLCBmbiwgY2FwdHVyaW5nKSB7XG4gIHJldHVybiBlbC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGZuLCBjYXB0dXJpbmcpO1xufVxuXG5mdW5jdGlvbiBhZGRFdmVudEhhcmQgKGVsLCB0eXBlLCBmbikge1xuICByZXR1cm4gZWwuYXR0YWNoRXZlbnQoJ29uJyArIHR5cGUsIHdyYXAoZWwsIHR5cGUsIGZuKSk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50RWFzeSAoZWwsIHR5cGUsIGZuLCBjYXB0dXJpbmcpIHtcbiAgcmV0dXJuIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgZm4sIGNhcHR1cmluZyk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUV2ZW50SGFyZCAoZWwsIHR5cGUsIGZuKSB7XG4gIHJldHVybiBlbC5kZXRhY2hFdmVudCgnb24nICsgdHlwZSwgdW53cmFwKGVsLCB0eXBlLCBmbikpO1xufVxuXG5mdW5jdGlvbiBmYWJyaWNhdGVFdmVudCAoZWwsIHR5cGUsIG1vZGVsKSB7XG4gIHZhciBlID0gZXZlbnRtYXAuaW5kZXhPZih0eXBlKSA9PT0gLTEgPyBtYWtlQ3VzdG9tRXZlbnQoKSA6IG1ha2VDbGFzc2ljRXZlbnQoKTtcbiAgaWYgKGVsLmRpc3BhdGNoRXZlbnQpIHtcbiAgICBlbC5kaXNwYXRjaEV2ZW50KGUpO1xuICB9IGVsc2Uge1xuICAgIGVsLmZpcmVFdmVudCgnb24nICsgdHlwZSwgZSk7XG4gIH1cbiAgZnVuY3Rpb24gbWFrZUNsYXNzaWNFdmVudCAoKSB7XG4gICAgdmFyIGU7XG4gICAgaWYgKGRvYy5jcmVhdGVFdmVudCkge1xuICAgICAgZSA9IGRvYy5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgIGUuaW5pdEV2ZW50KHR5cGUsIHRydWUsIHRydWUpO1xuICAgIH0gZWxzZSBpZiAoZG9jLmNyZWF0ZUV2ZW50T2JqZWN0KSB7XG4gICAgICBlID0gZG9jLmNyZWF0ZUV2ZW50T2JqZWN0KCk7XG4gICAgfVxuICAgIHJldHVybiBlO1xuICB9XG4gIGZ1bmN0aW9uIG1ha2VDdXN0b21FdmVudCAoKSB7XG4gICAgcmV0dXJuIG5ldyBjdXN0b21FdmVudCh0eXBlLCB7IGRldGFpbDogbW9kZWwgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JhcHBlckZhY3RvcnkgKGVsLCB0eXBlLCBmbikge1xuICByZXR1cm4gZnVuY3Rpb24gd3JhcHBlciAob3JpZ2luYWxFdmVudCkge1xuICAgIHZhciBlID0gb3JpZ2luYWxFdmVudCB8fCBnbG9iYWwuZXZlbnQ7XG4gICAgZS50YXJnZXQgPSBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQ7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCA9IGUucHJldmVudERlZmF1bHQgfHwgZnVuY3Rpb24gcHJldmVudERlZmF1bHQgKCkgeyBlLnJldHVyblZhbHVlID0gZmFsc2U7IH07XG4gICAgZS5zdG9wUHJvcGFnYXRpb24gPSBlLnN0b3BQcm9wYWdhdGlvbiB8fCBmdW5jdGlvbiBzdG9wUHJvcGFnYXRpb24gKCkgeyBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7IH07XG4gICAgZS53aGljaCA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xuICAgIGZuLmNhbGwoZWwsIGUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiB3cmFwIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIHdyYXBwZXIgPSB1bndyYXAoZWwsIHR5cGUsIGZuKSB8fCB3cmFwcGVyRmFjdG9yeShlbCwgdHlwZSwgZm4pO1xuICBoYXJkQ2FjaGUucHVzaCh7XG4gICAgd3JhcHBlcjogd3JhcHBlcixcbiAgICBlbGVtZW50OiBlbCxcbiAgICB0eXBlOiB0eXBlLFxuICAgIGZuOiBmblxuICB9KTtcbiAgcmV0dXJuIHdyYXBwZXI7XG59XG5cbmZ1bmN0aW9uIHVud3JhcCAoZWwsIHR5cGUsIGZuKSB7XG4gIHZhciBpID0gZmluZChlbCwgdHlwZSwgZm4pO1xuICBpZiAoaSkge1xuICAgIHZhciB3cmFwcGVyID0gaGFyZENhY2hlW2ldLndyYXBwZXI7XG4gICAgaGFyZENhY2hlLnNwbGljZShpLCAxKTsgLy8gZnJlZSB1cCBhIHRhZCBvZiBtZW1vcnlcbiAgICByZXR1cm4gd3JhcHBlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiBmaW5kIChlbCwgdHlwZSwgZm4pIHtcbiAgdmFyIGksIGl0ZW07XG4gIGZvciAoaSA9IDA7IGkgPCBoYXJkQ2FjaGUubGVuZ3RoOyBpKyspIHtcbiAgICBpdGVtID0gaGFyZENhY2hlW2ldO1xuICAgIGlmIChpdGVtLmVsZW1lbnQgPT09IGVsICYmIGl0ZW0udHlwZSA9PT0gdHlwZSAmJiBpdGVtLmZuID09PSBmbikge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBhZGQ6IGFkZEV2ZW50LFxuICByZW1vdmU6IHJlbW92ZUV2ZW50LFxuICBmYWJyaWNhdGU6IGZhYnJpY2F0ZUV2ZW50XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXZlbnRtYXAgPSBbXTtcbnZhciBldmVudG5hbWUgPSAnJztcbnZhciByb24gPSAvXm9uLztcblxuZm9yIChldmVudG5hbWUgaW4gZ2xvYmFsKSB7XG4gIGlmIChyb24udGVzdChldmVudG5hbWUpKSB7XG4gICAgZXZlbnRtYXAucHVzaChldmVudG5hbWUuc2xpY2UoMikpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZXZlbnRtYXA7XG4iLCJcbnZhciBOYXRpdmVDdXN0b21FdmVudCA9IGdsb2JhbC5DdXN0b21FdmVudDtcblxuZnVuY3Rpb24gdXNlTmF0aXZlICgpIHtcbiAgdHJ5IHtcbiAgICB2YXIgcCA9IG5ldyBOYXRpdmVDdXN0b21FdmVudCgnY2F0JywgeyBkZXRhaWw6IHsgZm9vOiAnYmFyJyB9IH0pO1xuICAgIHJldHVybiAgJ2NhdCcgPT09IHAudHlwZSAmJiAnYmFyJyA9PT0gcC5kZXRhaWwuZm9vO1xuICB9IGNhdGNoIChlKSB7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENyb3NzLWJyb3dzZXIgYEN1c3RvbUV2ZW50YCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ3VzdG9tRXZlbnQuQ3VzdG9tRXZlbnRcbiAqXG4gKiBAcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB1c2VOYXRpdmUoKSA/IE5hdGl2ZUN1c3RvbUV2ZW50IDpcblxuLy8gSUUgPj0gOVxuJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGRvY3VtZW50LmNyZWF0ZUV2ZW50ID8gZnVuY3Rpb24gQ3VzdG9tRXZlbnQgKHR5cGUsIHBhcmFtcykge1xuICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdDdXN0b21FdmVudCcpO1xuICBpZiAocGFyYW1zKSB7XG4gICAgZS5pbml0Q3VzdG9tRXZlbnQodHlwZSwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlLCBwYXJhbXMuZGV0YWlsKTtcbiAgfSBlbHNlIHtcbiAgICBlLmluaXRDdXN0b21FdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UsIHZvaWQgMCk7XG4gIH1cbiAgcmV0dXJuIGU7XG59IDpcblxuLy8gSUUgPD0gOFxuZnVuY3Rpb24gQ3VzdG9tRXZlbnQgKHR5cGUsIHBhcmFtcykge1xuICB2YXIgZSA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KCk7XG4gIGUudHlwZSA9IHR5cGU7XG4gIGlmIChwYXJhbXMpIHtcbiAgICBlLmJ1YmJsZXMgPSBCb29sZWFuKHBhcmFtcy5idWJibGVzKTtcbiAgICBlLmNhbmNlbGFibGUgPSBCb29sZWFuKHBhcmFtcy5jYW5jZWxhYmxlKTtcbiAgICBlLmRldGFpbCA9IHBhcmFtcy5kZXRhaWw7XG4gIH0gZWxzZSB7XG4gICAgZS5idWJibGVzID0gZmFsc2U7XG4gICAgZS5jYW5jZWxhYmxlID0gZmFsc2U7XG4gICAgZS5kZXRhaWwgPSB2b2lkIDA7XG4gIH1cbiAgcmV0dXJuIGU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBnZXRTZWxlY3Rpb247XG52YXIgZG9jID0gZ2xvYmFsLmRvY3VtZW50O1xudmFyIGdldFNlbGVjdGlvblJhdyA9IHJlcXVpcmUoJy4vZ2V0U2VsZWN0aW9uUmF3Jyk7XG52YXIgZ2V0U2VsZWN0aW9uTnVsbE9wID0gcmVxdWlyZSgnLi9nZXRTZWxlY3Rpb25OdWxsT3AnKTtcbnZhciBnZXRTZWxlY3Rpb25TeW50aGV0aWMgPSByZXF1aXJlKCcuL2dldFNlbGVjdGlvblN5bnRoZXRpYycpO1xudmFyIGlzSG9zdCA9IHJlcXVpcmUoJy4vaXNIb3N0Jyk7XG5pZiAoaXNIb3N0Lm1ldGhvZChnbG9iYWwsICdnZXRTZWxlY3Rpb24nKSkge1xuICBnZXRTZWxlY3Rpb24gPSBnZXRTZWxlY3Rpb25SYXc7XG59IGVsc2UgaWYgKHR5cGVvZiBkb2Muc2VsZWN0aW9uID09PSAnb2JqZWN0JyAmJiBkb2Muc2VsZWN0aW9uKSB7XG4gIGdldFNlbGVjdGlvbiA9IGdldFNlbGVjdGlvblN5bnRoZXRpYztcbn0gZWxzZSB7XG4gIGdldFNlbGVjdGlvbiA9IGdldFNlbGVjdGlvbk51bGxPcDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRTZWxlY3Rpb247XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIG5vb3AgKCkge31cblxuZnVuY3Rpb24gZ2V0U2VsZWN0aW9uTnVsbE9wICgpIHtcbiAgcmV0dXJuIHtcbiAgICByZW1vdmVBbGxSYW5nZXM6IG5vb3AsXG4gICAgYWRkUmFuZ2U6IG5vb3BcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRTZWxlY3Rpb25OdWxsT3A7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGdldFNlbGVjdGlvblJhdyAoKSB7XG4gIHJldHVybiBnbG9iYWwuZ2V0U2VsZWN0aW9uKCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ2V0U2VsZWN0aW9uUmF3O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmFuZ2VUb1RleHRSYW5nZSA9IHJlcXVpcmUoJy4vcmFuZ2VUb1RleHRSYW5nZScpO1xudmFyIGRvYyA9IGdsb2JhbC5kb2N1bWVudDtcbnZhciBib2R5ID0gZG9jLmJvZHk7XG52YXIgR2V0U2VsZWN0aW9uUHJvdG8gPSBHZXRTZWxlY3Rpb24ucHJvdG90eXBlO1xuXG5mdW5jdGlvbiBHZXRTZWxlY3Rpb24gKHNlbGVjdGlvbikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciByYW5nZSA9IHNlbGVjdGlvbi5jcmVhdGVSYW5nZSgpO1xuXG4gIHRoaXMuX3NlbGVjdGlvbiA9IHNlbGVjdGlvbjtcbiAgdGhpcy5fcmFuZ2VzID0gW107XG5cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnQ29udHJvbCcpIHtcbiAgICB1cGRhdGVDb250cm9sU2VsZWN0aW9uKHNlbGYpO1xuICB9IGVsc2UgaWYgKGlzVGV4dFJhbmdlKHJhbmdlKSkge1xuICAgIHVwZGF0ZUZyb21UZXh0UmFuZ2Uoc2VsZiwgcmFuZ2UpO1xuICB9IGVsc2Uge1xuICAgIHVwZGF0ZUVtcHR5U2VsZWN0aW9uKHNlbGYpO1xuICB9XG59XG5cbkdldFNlbGVjdGlvblByb3RvLnJlbW92ZUFsbFJhbmdlcyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHRleHRSYW5nZTtcbiAgdHJ5IHtcbiAgICB0aGlzLl9zZWxlY3Rpb24uZW1wdHkoKTtcbiAgICBpZiAodGhpcy5fc2VsZWN0aW9uLnR5cGUgIT09ICdOb25lJykge1xuICAgICAgdGV4dFJhbmdlID0gYm9keS5jcmVhdGVUZXh0UmFuZ2UoKTtcbiAgICAgIHRleHRSYW5nZS5zZWxlY3QoKTtcbiAgICAgIHRoaXMuX3NlbGVjdGlvbi5lbXB0eSgpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICB9XG4gIHVwZGF0ZUVtcHR5U2VsZWN0aW9uKHRoaXMpO1xufTtcblxuR2V0U2VsZWN0aW9uUHJvdG8uYWRkUmFuZ2UgPSBmdW5jdGlvbiAocmFuZ2UpIHtcbiAgaWYgKHRoaXMuX3NlbGVjdGlvbi50eXBlID09PSAnQ29udHJvbCcpIHtcbiAgICBhZGRSYW5nZVRvQ29udHJvbFNlbGVjdGlvbih0aGlzLCByYW5nZSk7XG4gIH0gZWxzZSB7XG4gICAgcmFuZ2VUb1RleHRSYW5nZShyYW5nZSkuc2VsZWN0KCk7XG4gICAgdGhpcy5fcmFuZ2VzWzBdID0gcmFuZ2U7XG4gICAgdGhpcy5yYW5nZUNvdW50ID0gMTtcbiAgICB0aGlzLmlzQ29sbGFwc2VkID0gdGhpcy5fcmFuZ2VzWzBdLmNvbGxhcHNlZDtcbiAgICB1cGRhdGVBbmNob3JBbmRGb2N1c0Zyb21SYW5nZSh0aGlzLCByYW5nZSwgZmFsc2UpO1xuICB9XG59O1xuXG5HZXRTZWxlY3Rpb25Qcm90by5zZXRSYW5nZXMgPSBmdW5jdGlvbiAocmFuZ2VzKSB7XG4gIHRoaXMucmVtb3ZlQWxsUmFuZ2VzKCk7XG4gIHZhciByYW5nZUNvdW50ID0gcmFuZ2VzLmxlbmd0aDtcbiAgaWYgKHJhbmdlQ291bnQgPiAxKSB7XG4gICAgY3JlYXRlQ29udHJvbFNlbGVjdGlvbih0aGlzLCByYW5nZXMpO1xuICB9IGVsc2UgaWYgKHJhbmdlQ291bnQpIHtcbiAgICB0aGlzLmFkZFJhbmdlKHJhbmdlc1swXSk7XG4gIH1cbn07XG5cbkdldFNlbGVjdGlvblByb3RvLmdldFJhbmdlQXQgPSBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSB0aGlzLnJhbmdlQ291bnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2dldFJhbmdlQXQoKTogaW5kZXggb3V0IG9mIGJvdW5kcycpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB0aGlzLl9yYW5nZXNbaW5kZXhdLmNsb25lUmFuZ2UoKTtcbiAgfVxufTtcblxuR2V0U2VsZWN0aW9uUHJvdG8ucmVtb3ZlUmFuZ2UgPSBmdW5jdGlvbiAocmFuZ2UpIHtcbiAgaWYgKHRoaXMuX3NlbGVjdGlvbi50eXBlICE9PSAnQ29udHJvbCcpIHtcbiAgICByZW1vdmVSYW5nZU1hbnVhbGx5KHRoaXMsIHJhbmdlKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGNvbnRyb2xSYW5nZSA9IHRoaXMuX3NlbGVjdGlvbi5jcmVhdGVSYW5nZSgpO1xuICB2YXIgcmFuZ2VFbGVtZW50ID0gZ2V0U2luZ2xlRWxlbWVudEZyb21SYW5nZShyYW5nZSk7XG4gIHZhciBuZXdDb250cm9sUmFuZ2UgPSBib2R5LmNyZWF0ZUNvbnRyb2xSYW5nZSgpO1xuICB2YXIgZWw7XG4gIHZhciByZW1vdmVkID0gZmFsc2U7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjb250cm9sUmFuZ2UubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBlbCA9IGNvbnRyb2xSYW5nZS5pdGVtKGkpO1xuICAgIGlmIChlbCAhPT0gcmFuZ2VFbGVtZW50IHx8IHJlbW92ZWQpIHtcbiAgICAgIG5ld0NvbnRyb2xSYW5nZS5hZGQoY29udHJvbFJhbmdlLml0ZW0oaSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZW1vdmVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgbmV3Q29udHJvbFJhbmdlLnNlbGVjdCgpO1xuICB1cGRhdGVDb250cm9sU2VsZWN0aW9uKHRoaXMpO1xufTtcblxuR2V0U2VsZWN0aW9uUHJvdG8uZWFjaFJhbmdlID0gZnVuY3Rpb24gKGZuLCByZXR1cm5WYWx1ZSkge1xuICB2YXIgaSA9IDA7XG4gIHZhciBsZW4gPSB0aGlzLl9yYW5nZXMubGVuZ3RoO1xuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoZm4odGhpcy5nZXRSYW5nZUF0KGkpKSkge1xuICAgICAgcmV0dXJuIHJldHVyblZhbHVlO1xuICAgIH1cbiAgfVxufTtcblxuR2V0U2VsZWN0aW9uUHJvdG8uZ2V0QWxsUmFuZ2VzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcmFuZ2VzID0gW107XG4gIHRoaXMuZWFjaFJhbmdlKGZ1bmN0aW9uIChyYW5nZSkge1xuICAgIHJhbmdlcy5wdXNoKHJhbmdlKTtcbiAgfSk7XG4gIHJldHVybiByYW5nZXM7XG59O1xuXG5HZXRTZWxlY3Rpb25Qcm90by5zZXRTaW5nbGVSYW5nZSA9IGZ1bmN0aW9uIChyYW5nZSkge1xuICB0aGlzLnJlbW92ZUFsbFJhbmdlcygpO1xuICB0aGlzLmFkZFJhbmdlKHJhbmdlKTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZUNvbnRyb2xTZWxlY3Rpb24gKHNlbCwgcmFuZ2VzKSB7XG4gIHZhciBjb250cm9sUmFuZ2UgPSBib2R5LmNyZWF0ZUNvbnRyb2xSYW5nZSgpO1xuICBmb3IgKHZhciBpID0gMCwgZWwsIGxlbiA9IHJhbmdlcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGVsID0gZ2V0U2luZ2xlRWxlbWVudEZyb21SYW5nZShyYW5nZXNbaV0pO1xuICAgIHRyeSB7XG4gICAgICBjb250cm9sUmFuZ2UuYWRkKGVsKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFJhbmdlcygpOiBFbGVtZW50IGNvdWxkIG5vdCBiZSBhZGRlZCB0byBjb250cm9sIHNlbGVjdGlvbicpO1xuICAgIH1cbiAgfVxuICBjb250cm9sUmFuZ2Uuc2VsZWN0KCk7XG4gIHVwZGF0ZUNvbnRyb2xTZWxlY3Rpb24oc2VsKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlUmFuZ2VNYW51YWxseSAoc2VsLCByYW5nZSkge1xuICB2YXIgcmFuZ2VzID0gc2VsLmdldEFsbFJhbmdlcygpO1xuICBzZWwucmVtb3ZlQWxsUmFuZ2VzKCk7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSByYW5nZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoIWlzU2FtZVJhbmdlKHJhbmdlLCByYW5nZXNbaV0pKSB7XG4gICAgICBzZWwuYWRkUmFuZ2UocmFuZ2VzW2ldKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFzZWwucmFuZ2VDb3VudCkge1xuICAgIHVwZGF0ZUVtcHR5U2VsZWN0aW9uKHNlbCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlQW5jaG9yQW5kRm9jdXNGcm9tUmFuZ2UgKHNlbCwgcmFuZ2UpIHtcbiAgdmFyIGFuY2hvclByZWZpeCA9ICdzdGFydCc7XG4gIHZhciBmb2N1c1ByZWZpeCA9ICdlbmQnO1xuICBzZWwuYW5jaG9yTm9kZSA9IHJhbmdlW2FuY2hvclByZWZpeCArICdDb250YWluZXInXTtcbiAgc2VsLmFuY2hvck9mZnNldCA9IHJhbmdlW2FuY2hvclByZWZpeCArICdPZmZzZXQnXTtcbiAgc2VsLmZvY3VzTm9kZSA9IHJhbmdlW2ZvY3VzUHJlZml4ICsgJ0NvbnRhaW5lciddO1xuICBzZWwuZm9jdXNPZmZzZXQgPSByYW5nZVtmb2N1c1ByZWZpeCArICdPZmZzZXQnXTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlRW1wdHlTZWxlY3Rpb24gKHNlbCkge1xuICBzZWwuYW5jaG9yTm9kZSA9IHNlbC5mb2N1c05vZGUgPSBudWxsO1xuICBzZWwuYW5jaG9yT2Zmc2V0ID0gc2VsLmZvY3VzT2Zmc2V0ID0gMDtcbiAgc2VsLnJhbmdlQ291bnQgPSAwO1xuICBzZWwuaXNDb2xsYXBzZWQgPSB0cnVlO1xuICBzZWwuX3Jhbmdlcy5sZW5ndGggPSAwO1xufVxuXG5mdW5jdGlvbiByYW5nZUNvbnRhaW5zU2luZ2xlRWxlbWVudCAocmFuZ2VOb2Rlcykge1xuICBpZiAoIXJhbmdlTm9kZXMubGVuZ3RoIHx8IHJhbmdlTm9kZXNbMF0ubm9kZVR5cGUgIT09IDEpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgZm9yICh2YXIgaSA9IDEsIGxlbiA9IHJhbmdlTm9kZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoIWlzQW5jZXN0b3JPZihyYW5nZU5vZGVzWzBdLCByYW5nZU5vZGVzW2ldKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0U2luZ2xlRWxlbWVudEZyb21SYW5nZSAocmFuZ2UpIHtcbiAgdmFyIG5vZGVzID0gcmFuZ2UuZ2V0Tm9kZXMoKTtcbiAgaWYgKCFyYW5nZUNvbnRhaW5zU2luZ2xlRWxlbWVudChub2RlcykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2dldFNpbmdsZUVsZW1lbnRGcm9tUmFuZ2UoKTogcmFuZ2UgZGlkIG5vdCBjb25zaXN0IG9mIGEgc2luZ2xlIGVsZW1lbnQnKTtcbiAgfVxuICByZXR1cm4gbm9kZXNbMF07XG59XG5cbmZ1bmN0aW9uIGlzVGV4dFJhbmdlIChyYW5nZSkge1xuICByZXR1cm4gcmFuZ2UgJiYgcmFuZ2UudGV4dCAhPT0gdm9pZCAwO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVGcm9tVGV4dFJhbmdlIChzZWwsIHJhbmdlKSB7XG4gIHNlbC5fcmFuZ2VzID0gW3JhbmdlXTtcbiAgdXBkYXRlQW5jaG9yQW5kRm9jdXNGcm9tUmFuZ2Uoc2VsLCByYW5nZSwgZmFsc2UpO1xuICBzZWwucmFuZ2VDb3VudCA9IDE7XG4gIHNlbC5pc0NvbGxhcHNlZCA9IHJhbmdlLmNvbGxhcHNlZDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlQ29udHJvbFNlbGVjdGlvbiAoc2VsKSB7XG4gIHNlbC5fcmFuZ2VzLmxlbmd0aCA9IDA7XG4gIGlmIChzZWwuX3NlbGVjdGlvbi50eXBlID09PSAnTm9uZScpIHtcbiAgICB1cGRhdGVFbXB0eVNlbGVjdGlvbihzZWwpO1xuICB9IGVsc2Uge1xuICAgIHZhciBjb250cm9sUmFuZ2UgPSBzZWwuX3NlbGVjdGlvbi5jcmVhdGVSYW5nZSgpO1xuICAgIGlmIChpc1RleHRSYW5nZShjb250cm9sUmFuZ2UpKSB7XG4gICAgICB1cGRhdGVGcm9tVGV4dFJhbmdlKHNlbCwgY29udHJvbFJhbmdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsLnJhbmdlQ291bnQgPSBjb250cm9sUmFuZ2UubGVuZ3RoO1xuICAgICAgdmFyIHJhbmdlO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWwucmFuZ2VDb3VudDsgKytpKSB7XG4gICAgICAgIHJhbmdlID0gZG9jLmNyZWF0ZVJhbmdlKCk7XG4gICAgICAgIHJhbmdlLnNlbGVjdE5vZGUoY29udHJvbFJhbmdlLml0ZW0oaSkpO1xuICAgICAgICBzZWwuX3Jhbmdlcy5wdXNoKHJhbmdlKTtcbiAgICAgIH1cbiAgICAgIHNlbC5pc0NvbGxhcHNlZCA9IHNlbC5yYW5nZUNvdW50ID09PSAxICYmIHNlbC5fcmFuZ2VzWzBdLmNvbGxhcHNlZDtcbiAgICAgIHVwZGF0ZUFuY2hvckFuZEZvY3VzRnJvbVJhbmdlKHNlbCwgc2VsLl9yYW5nZXNbc2VsLnJhbmdlQ291bnQgLSAxXSwgZmFsc2UpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhZGRSYW5nZVRvQ29udHJvbFNlbGVjdGlvbiAoc2VsLCByYW5nZSkge1xuICB2YXIgY29udHJvbFJhbmdlID0gc2VsLl9zZWxlY3Rpb24uY3JlYXRlUmFuZ2UoKTtcbiAgdmFyIHJhbmdlRWxlbWVudCA9IGdldFNpbmdsZUVsZW1lbnRGcm9tUmFuZ2UocmFuZ2UpO1xuICB2YXIgbmV3Q29udHJvbFJhbmdlID0gYm9keS5jcmVhdGVDb250cm9sUmFuZ2UoKTtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvbnRyb2xSYW5nZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIG5ld0NvbnRyb2xSYW5nZS5hZGQoY29udHJvbFJhbmdlLml0ZW0oaSkpO1xuICB9XG4gIHRyeSB7XG4gICAgbmV3Q29udHJvbFJhbmdlLmFkZChyYW5nZUVsZW1lbnQpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdhZGRSYW5nZSgpOiBFbGVtZW50IGNvdWxkIG5vdCBiZSBhZGRlZCB0byBjb250cm9sIHNlbGVjdGlvbicpO1xuICB9XG4gIG5ld0NvbnRyb2xSYW5nZS5zZWxlY3QoKTtcbiAgdXBkYXRlQ29udHJvbFNlbGVjdGlvbihzZWwpO1xufVxuXG5mdW5jdGlvbiBpc1NhbWVSYW5nZSAobGVmdCwgcmlnaHQpIHtcbiAgcmV0dXJuIChcbiAgICBsZWZ0LnN0YXJ0Q29udGFpbmVyID09PSByaWdodC5zdGFydENvbnRhaW5lciAmJlxuICAgIGxlZnQuc3RhcnRPZmZzZXQgPT09IHJpZ2h0LnN0YXJ0T2Zmc2V0ICYmXG4gICAgbGVmdC5lbmRDb250YWluZXIgPT09IHJpZ2h0LmVuZENvbnRhaW5lciAmJlxuICAgIGxlZnQuZW5kT2Zmc2V0ID09PSByaWdodC5lbmRPZmZzZXRcbiAgKTtcbn1cblxuZnVuY3Rpb24gaXNBbmNlc3Rvck9mIChhbmNlc3RvciwgZGVzY2VuZGFudCkge1xuICB2YXIgbm9kZSA9IGRlc2NlbmRhbnQ7XG4gIHdoaWxlIChub2RlLnBhcmVudE5vZGUpIHtcbiAgICBpZiAobm9kZS5wYXJlbnROb2RlID09PSBhbmNlc3Rvcikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBnZXRTZWxlY3Rpb24gKCkge1xuICByZXR1cm4gbmV3IEdldFNlbGVjdGlvbihnbG9iYWwuZG9jdW1lbnQuc2VsZWN0aW9uKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRTZWxlY3Rpb247XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGlzSG9zdE1ldGhvZCAoaG9zdCwgcHJvcCkge1xuICB2YXIgdHlwZSA9IHR5cGVvZiBob3N0W3Byb3BdO1xuICByZXR1cm4gdHlwZSA9PT0gJ2Z1bmN0aW9uJyB8fCAhISh0eXBlID09PSAnb2JqZWN0JyAmJiBob3N0W3Byb3BdKSB8fCB0eXBlID09PSAndW5rbm93bic7XG59XG5cbmZ1bmN0aW9uIGlzSG9zdFByb3BlcnR5IChob3N0LCBwcm9wKSB7XG4gIHJldHVybiB0eXBlb2YgaG9zdFtwcm9wXSAhPT0gJ3VuZGVmaW5lZCc7XG59XG5cbmZ1bmN0aW9uIG1hbnkgKGZuKSB7XG4gIHJldHVybiBmdW5jdGlvbiBhcmVIb3N0ZWQgKGhvc3QsIHByb3BzKSB7XG4gICAgdmFyIGkgPSBwcm9wcy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgaWYgKCFmbihob3N0LCBwcm9wc1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1ldGhvZDogaXNIb3N0TWV0aG9kLFxuICBtZXRob2RzOiBtYW55KGlzSG9zdE1ldGhvZCksXG4gIHByb3BlcnR5OiBpc0hvc3RQcm9wZXJ0eSxcbiAgcHJvcGVydGllczogbWFueShpc0hvc3RQcm9wZXJ0eSlcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkb2MgPSBnbG9iYWwuZG9jdW1lbnQ7XG52YXIgYm9keSA9IGRvYy5ib2R5O1xuXG5mdW5jdGlvbiByYW5nZVRvVGV4dFJhbmdlIChwKSB7XG4gIGlmIChwLmNvbGxhcHNlZCkge1xuICAgIHJldHVybiBjcmVhdGVCb3VuZGFyeVRleHRSYW5nZSh7IG5vZGU6IHAuc3RhcnRDb250YWluZXIsIG9mZnNldDogcC5zdGFydE9mZnNldCB9LCB0cnVlKTtcbiAgfVxuICB2YXIgc3RhcnRSYW5nZSA9IGNyZWF0ZUJvdW5kYXJ5VGV4dFJhbmdlKHsgbm9kZTogcC5zdGFydENvbnRhaW5lciwgb2Zmc2V0OiBwLnN0YXJ0T2Zmc2V0IH0sIHRydWUpO1xuICB2YXIgZW5kUmFuZ2UgPSBjcmVhdGVCb3VuZGFyeVRleHRSYW5nZSh7IG5vZGU6IHAuZW5kQ29udGFpbmVyLCBvZmZzZXQ6IHAuZW5kT2Zmc2V0IH0sIGZhbHNlKTtcbiAgdmFyIHRleHRSYW5nZSA9IGJvZHkuY3JlYXRlVGV4dFJhbmdlKCk7XG4gIHRleHRSYW5nZS5zZXRFbmRQb2ludCgnU3RhcnRUb1N0YXJ0Jywgc3RhcnRSYW5nZSk7XG4gIHRleHRSYW5nZS5zZXRFbmRQb2ludCgnRW5kVG9FbmQnLCBlbmRSYW5nZSk7XG4gIHJldHVybiB0ZXh0UmFuZ2U7XG59XG5cbmZ1bmN0aW9uIGlzQ2hhcmFjdGVyRGF0YU5vZGUgKG5vZGUpIHtcbiAgdmFyIHQgPSBub2RlLm5vZGVUeXBlO1xuICByZXR1cm4gdCA9PT0gMyB8fCB0ID09PSA0IHx8IHQgPT09IDggO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVCb3VuZGFyeVRleHRSYW5nZSAocCwgc3RhcnRpbmcpIHtcbiAgdmFyIGJvdW5kO1xuICB2YXIgcGFyZW50O1xuICB2YXIgb2Zmc2V0ID0gcC5vZmZzZXQ7XG4gIHZhciB3b3JraW5nTm9kZTtcbiAgdmFyIGNoaWxkTm9kZXM7XG4gIHZhciByYW5nZSA9IGJvZHkuY3JlYXRlVGV4dFJhbmdlKCk7XG4gIHZhciBkYXRhID0gaXNDaGFyYWN0ZXJEYXRhTm9kZShwLm5vZGUpO1xuXG4gIGlmIChkYXRhKSB7XG4gICAgYm91bmQgPSBwLm5vZGU7XG4gICAgcGFyZW50ID0gYm91bmQucGFyZW50Tm9kZTtcbiAgfSBlbHNlIHtcbiAgICBjaGlsZE5vZGVzID0gcC5ub2RlLmNoaWxkTm9kZXM7XG4gICAgYm91bmQgPSBvZmZzZXQgPCBjaGlsZE5vZGVzLmxlbmd0aCA/IGNoaWxkTm9kZXNbb2Zmc2V0XSA6IG51bGw7XG4gICAgcGFyZW50ID0gcC5ub2RlO1xuICB9XG5cbiAgd29ya2luZ05vZGUgPSBkb2MuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICB3b3JraW5nTm9kZS5pbm5lckhUTUwgPSAnJiNmZWZmOyc7XG5cbiAgaWYgKGJvdW5kKSB7XG4gICAgcGFyZW50Lmluc2VydEJlZm9yZSh3b3JraW5nTm9kZSwgYm91bmQpO1xuICB9IGVsc2Uge1xuICAgIHBhcmVudC5hcHBlbmRDaGlsZCh3b3JraW5nTm9kZSk7XG4gIH1cblxuICByYW5nZS5tb3ZlVG9FbGVtZW50VGV4dCh3b3JraW5nTm9kZSk7XG4gIHJhbmdlLmNvbGxhcHNlKCFzdGFydGluZyk7XG4gIHBhcmVudC5yZW1vdmVDaGlsZCh3b3JraW5nTm9kZSk7XG5cbiAgaWYgKGRhdGEpIHtcbiAgICByYW5nZVtzdGFydGluZyA/ICdtb3ZlU3RhcnQnIDogJ21vdmVFbmQnXSgnY2hhcmFjdGVyJywgb2Zmc2V0KTtcbiAgfVxuICByZXR1cm4gcmFuZ2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmFuZ2VUb1RleHRSYW5nZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGdldFNlbGVjdGlvbiA9IHJlcXVpcmUoJy4vZ2V0U2VsZWN0aW9uJyk7XG52YXIgc2V0U2VsZWN0aW9uID0gcmVxdWlyZSgnLi9zZXRTZWxlY3Rpb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdldDogZ2V0U2VsZWN0aW9uLFxuICBzZXQ6IHNldFNlbGVjdGlvblxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGdldFNlbGVjdGlvbiA9IHJlcXVpcmUoJy4vZ2V0U2VsZWN0aW9uJyk7XG52YXIgcmFuZ2VUb1RleHRSYW5nZSA9IHJlcXVpcmUoJy4vcmFuZ2VUb1RleHRSYW5nZScpO1xudmFyIGRvYyA9IGdsb2JhbC5kb2N1bWVudDtcblxuZnVuY3Rpb24gc2V0U2VsZWN0aW9uIChwKSB7XG4gIGlmIChkb2MuY3JlYXRlUmFuZ2UpIHtcbiAgICBtb2Rlcm5TZWxlY3Rpb24oKTtcbiAgfSBlbHNlIHtcbiAgICBvbGRTZWxlY3Rpb24oKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vZGVyblNlbGVjdGlvbiAoKSB7XG4gICAgdmFyIHNlbCA9IGdldFNlbGVjdGlvbigpO1xuICAgIHZhciByYW5nZSA9IGRvYy5jcmVhdGVSYW5nZSgpO1xuICAgIGlmICghcC5zdGFydENvbnRhaW5lcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocC5lbmRDb250YWluZXIpIHtcbiAgICAgIHJhbmdlLnNldEVuZChwLmVuZENvbnRhaW5lciwgcC5lbmRPZmZzZXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByYW5nZS5zZXRFbmQocC5zdGFydENvbnRhaW5lciwgcC5zdGFydE9mZnNldCk7XG4gICAgfVxuICAgIHJhbmdlLnNldFN0YXJ0KHAuc3RhcnRDb250YWluZXIsIHAuc3RhcnRPZmZzZXQpO1xuICAgIHNlbC5yZW1vdmVBbGxSYW5nZXMoKTtcbiAgICBzZWwuYWRkUmFuZ2UocmFuZ2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gb2xkU2VsZWN0aW9uICgpIHtcbiAgICByYW5nZVRvVGV4dFJhbmdlKHApLnNlbGVjdCgpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0U2VsZWN0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZ2V0ID0gZWFzeUdldDtcbnZhciBzZXQgPSBlYXN5U2V0O1xuXG5pZiAoZG9jdW1lbnQuc2VsZWN0aW9uICYmIGRvY3VtZW50LnNlbGVjdGlvbi5jcmVhdGVSYW5nZSkge1xuICBnZXQgPSBoYXJkR2V0O1xuICBzZXQgPSBoYXJkU2V0O1xufVxuXG5mdW5jdGlvbiBlYXN5R2V0IChlbCkge1xuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBlbC5zZWxlY3Rpb25TdGFydCxcbiAgICBlbmQ6IGVsLnNlbGVjdGlvbkVuZFxuICB9O1xufVxuXG5mdW5jdGlvbiBoYXJkR2V0IChlbCkge1xuICB2YXIgYWN0aXZlID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDtcbiAgaWYgKGFjdGl2ZSAhPT0gZWwpIHtcbiAgICBlbC5mb2N1cygpO1xuICB9XG5cbiAgdmFyIHJhbmdlID0gZG9jdW1lbnQuc2VsZWN0aW9uLmNyZWF0ZVJhbmdlKCk7XG4gIHZhciBib29rbWFyayA9IHJhbmdlLmdldEJvb2ttYXJrKCk7XG4gIHZhciBvcmlnaW5hbCA9IGVsLnZhbHVlO1xuICB2YXIgbWFya2VyID0gZ2V0VW5pcXVlTWFya2VyKG9yaWdpbmFsKTtcbiAgdmFyIHBhcmVudCA9IHJhbmdlLnBhcmVudEVsZW1lbnQoKTtcbiAgaWYgKHBhcmVudCA9PT0gbnVsbCB8fCAhaW5wdXRzKHBhcmVudCkpIHtcbiAgICByZXR1cm4gcmVzdWx0KDAsIDApO1xuICB9XG4gIHJhbmdlLnRleHQgPSBtYXJrZXIgKyByYW5nZS50ZXh0ICsgbWFya2VyO1xuXG4gIHZhciBjb250ZW50cyA9IGVsLnZhbHVlO1xuXG4gIGVsLnZhbHVlID0gb3JpZ2luYWw7XG4gIHJhbmdlLm1vdmVUb0Jvb2ttYXJrKGJvb2ttYXJrKTtcbiAgcmFuZ2Uuc2VsZWN0KCk7XG5cbiAgcmV0dXJuIHJlc3VsdChjb250ZW50cy5pbmRleE9mKG1hcmtlciksIGNvbnRlbnRzLmxhc3RJbmRleE9mKG1hcmtlcikgLSBtYXJrZXIubGVuZ3RoKTtcblxuICBmdW5jdGlvbiByZXN1bHQgKHN0YXJ0LCBlbmQpIHtcbiAgICBpZiAoYWN0aXZlICE9PSBlbCkgeyAvLyBkb24ndCBkaXNydXB0IHByZS1leGlzdGluZyBzdGF0ZVxuICAgICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICBhY3RpdmUuZm9jdXMoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsLmJsdXIoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHsgc3RhcnQ6IHN0YXJ0LCBlbmQ6IGVuZCB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFVuaXF1ZU1hcmtlciAoY29udGVudHMpIHtcbiAgdmFyIG1hcmtlcjtcbiAgZG8ge1xuICAgIG1hcmtlciA9ICdAQG1hcmtlci4nICsgTWF0aC5yYW5kb20oKSAqIG5ldyBEYXRlKCk7XG4gIH0gd2hpbGUgKGNvbnRlbnRzLmluZGV4T2YobWFya2VyKSAhPT0gLTEpO1xuICByZXR1cm4gbWFya2VyO1xufVxuXG5mdW5jdGlvbiBpbnB1dHMgKGVsKSB7XG4gIHJldHVybiAoKGVsLnRhZ05hbWUgPT09ICdJTlBVVCcgJiYgZWwudHlwZSA9PT0gJ3RleHQnKSB8fCBlbC50YWdOYW1lID09PSAnVEVYVEFSRUEnKTtcbn1cblxuZnVuY3Rpb24gZWFzeVNldCAoZWwsIHApIHtcbiAgZWwuc2VsZWN0aW9uU3RhcnQgPSBwYXJzZShlbCwgcC5zdGFydCk7XG4gIGVsLnNlbGVjdGlvbkVuZCA9IHBhcnNlKGVsLCBwLmVuZCk7XG59XG5cbmZ1bmN0aW9uIGhhcmRTZXQgKGVsLCBwKSB7XG4gIHZhciByYW5nZSA9IGVsLmNyZWF0ZVRleHRSYW5nZSgpO1xuXG4gIGlmIChwLnN0YXJ0ID09PSAnZW5kJyAmJiBwLmVuZCA9PT0gJ2VuZCcpIHtcbiAgICByYW5nZS5jb2xsYXBzZShmYWxzZSk7XG4gICAgcmFuZ2Uuc2VsZWN0KCk7XG4gIH0gZWxzZSB7XG4gICAgcmFuZ2UuY29sbGFwc2UodHJ1ZSk7XG4gICAgcmFuZ2UubW92ZUVuZCgnY2hhcmFjdGVyJywgcGFyc2UoZWwsIHAuZW5kKSk7XG4gICAgcmFuZ2UubW92ZVN0YXJ0KCdjaGFyYWN0ZXInLCBwYXJzZShlbCwgcC5zdGFydCkpO1xuICAgIHJhbmdlLnNlbGVjdCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlIChlbCwgdmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09PSAnZW5kJyA/IGVsLnZhbHVlLmxlbmd0aCA6IHZhbHVlIHx8IDA7XG59XG5cbmZ1bmN0aW9uIHNlbGwgKGVsLCBwKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgc2V0KGVsLCBwKTtcbiAgfVxuICByZXR1cm4gZ2V0KGVsKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZWxsO1xuIiwidmFyIHNpID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gJ2Z1bmN0aW9uJywgdGljaztcbmlmIChzaSkge1xuICB0aWNrID0gZnVuY3Rpb24gKGZuKSB7IHNldEltbWVkaWF0ZShmbik7IH07XG59IGVsc2Uge1xuICB0aWNrID0gZnVuY3Rpb24gKGZuKSB7IHNldFRpbWVvdXQoZm4sIDApOyB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRpY2s7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXNJbnB1dCA9IHJlcXVpcmUoJy4vaXNJbnB1dCcpO1xudmFyIGJpbmRpbmdzID0ge307XG5cbmZ1bmN0aW9uIGhhcyAoc291cmNlLCB0YXJnZXQpIHtcbiAgdmFyIGJpbmRpbmcgPSBiaW5kaW5nc1tzb3VyY2UuaWRdO1xuICByZXR1cm4gYmluZGluZyAmJiBiaW5kaW5nW3RhcmdldC5pZF07XG59XG5cbmZ1bmN0aW9uIGluc2VydCAoc291cmNlLCB0YXJnZXQpIHtcbiAgdmFyIGJpbmRpbmcgPSBiaW5kaW5nc1tzb3VyY2UuaWRdO1xuICBpZiAoIWJpbmRpbmcpIHtcbiAgICBiaW5kaW5nID0gYmluZGluZ3Nbc291cmNlLmlkXSA9IHt9O1xuICB9XG4gIHZhciBpbnZhbGlkYXRlID0gaW52YWxpZGF0b3IodGFyZ2V0KTtcbiAgYmluZGluZ1t0YXJnZXQuaWRdID0gaW52YWxpZGF0ZTtcbiAgc291cmNlLm9uKCdkYXRhJywgaW52YWxpZGF0ZSk7XG4gIHNvdXJjZS5vbignZGVzdHJveWVkJywgcmVtb3ZlLmJpbmQobnVsbCwgc291cmNlLCB0YXJnZXQpKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlIChzb3VyY2UsIHRhcmdldCkge1xuICB2YXIgYmluZGluZyA9IGJpbmRpbmdzW3NvdXJjZS5pZF07XG4gIGlmICghYmluZGluZykge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgaW52YWxpZGF0ZSA9IGJpbmRpbmdbdGFyZ2V0LmlkXTtcbiAgc291cmNlLm9mZignZGF0YScsIGludmFsaWRhdGUpO1xuICBkZWxldGUgYmluZGluZ1t0YXJnZXQuaWRdO1xufVxuXG5mdW5jdGlvbiBpbnZhbGlkYXRvciAodGFyZ2V0KSB7XG4gIHJldHVybiBmdW5jdGlvbiBpbnZhbGlkYXRlICgpIHtcbiAgICB0YXJnZXQucmVmcmVzaCgpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhZGQgKHNvdXJjZSwgdGFyZ2V0KSB7XG4gIGlmIChpc0lucHV0KHRhcmdldC5hc3NvY2lhdGVkKSB8fCBoYXMoc291cmNlLCB0YXJnZXQpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGluc2VydChzb3VyY2UsIHRhcmdldCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBhZGQ6IGFkZCxcbiAgcmVtb3ZlOiByZW1vdmVcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjcm9zc3ZlbnQgPSByZXF1aXJlKCdjcm9zc3ZlbnQnKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnY29udHJhL2VtaXR0ZXInKTtcbnZhciBkb20gPSByZXF1aXJlKCcuL2RvbScpO1xudmFyIHRleHQgPSByZXF1aXJlKCcuL3RleHQnKTtcbnZhciBwYXJzZSA9IHJlcXVpcmUoJy4vcGFyc2UnKTtcbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4vY2xvbmUnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4vZGVmYXVsdHMnKTtcbnZhciBtb21lbnR1bSA9IHJlcXVpcmUoJy4vbW9tZW50dW0nKTtcbnZhciBjbGFzc2VzID0gcmVxdWlyZSgnLi9jbGFzc2VzJyk7XG52YXIgbm9vcCA9IHJlcXVpcmUoJy4vbm9vcCcpO1xudmFyIG5vO1xuXG5mdW5jdGlvbiBjYWxlbmRhciAoY2FsZW5kYXJPcHRpb25zKSB7XG4gIHZhciBvO1xuICB2YXIgcmVmO1xuICB2YXIgcmVmQ2FsO1xuICB2YXIgY29udGFpbmVyO1xuICB2YXIgcmVuZGVyZWQgPSBmYWxzZTtcblxuICAvLyBkYXRlIHZhcmlhYmxlc1xuICB2YXIgbW9udGhPZmZzZXRBdHRyaWJ1dGUgPSAnZGF0YS1yb21lLW9mZnNldCc7XG4gIHZhciB3ZWVrZGF5cztcbiAgdmFyIHdlZWtkYXlDb3VudDtcbiAgdmFyIGNhbGVuZGFyTW9udGhzID0gW107XG4gIHZhciBsYXN0WWVhcjtcbiAgdmFyIGxhc3RNb250aDtcbiAgdmFyIGxhc3REYXk7XG4gIHZhciBsYXN0RGF5RWxlbWVudDtcbiAgdmFyIGRhdGV3cmFwcGVyO1xuICB2YXIgYmFjaztcbiAgdmFyIG5leHQ7XG5cbiAgLy8gdGltZSB2YXJpYWJsZXNcbiAgdmFyIHNlY29uZHNJbkRheSA9IDYwICogNjAgKiAyNDtcbiAgdmFyIHRpbWU7XG4gIHZhciB0aW1lbGlzdDtcblxuICB2YXIgYXBpID0gZW1pdHRlcih7XG4gICAgYXNzb2NpYXRlZDogY2FsZW5kYXJPcHRpb25zLmFzc29jaWF0ZWRcbiAgfSk7XG5cbiAgaW5pdCgpO1xuICBzZXRUaW1lb3V0KHJlYWR5LCAwKTtcblxuICByZXR1cm4gYXBpO1xuXG4gIGZ1bmN0aW9uIG5hcGkgKCkgeyByZXR1cm4gYXBpOyB9XG5cbiAgZnVuY3Rpb24gaW5pdCAoaW5pdE9wdGlvbnMpIHtcbiAgICBvID0gZGVmYXVsdHMoaW5pdE9wdGlvbnMgfHwgY2FsZW5kYXJPcHRpb25zLCBhcGkpO1xuICAgIGlmICghY29udGFpbmVyKSB7IGNvbnRhaW5lciA9IGRvbSh7IGNsYXNzTmFtZTogby5zdHlsZXMuY29udGFpbmVyIH0pOyB9XG4gICAgd2Vla2RheXMgPSBvLndlZWtkYXlGb3JtYXQ7XG4gICAgd2Vla2RheUNvdW50ID0gd2Vla2RheXMubGVuZ3RoO1xuICAgIGxhc3RNb250aCA9IG5vO1xuICAgIGxhc3RZZWFyID0gbm87XG4gICAgbGFzdERheSA9IG5vO1xuICAgIGxhc3REYXlFbGVtZW50ID0gbm87XG4gICAgby5hcHBlbmRUby5hcHBlbmRDaGlsZChjb250YWluZXIpO1xuXG4gICAgcmVtb3ZlQ2hpbGRyZW4oY29udGFpbmVyKTtcbiAgICByZW5kZXJlZCA9IGZhbHNlO1xuICAgIHJlZiA9IG8uaW5pdGlhbFZhbHVlID8gby5pbml0aWFsVmFsdWUgOiBtb21lbnR1bS5tb21lbnQoKTtcbiAgICByZWZDYWwgPSByZWYuY2xvbmUoKTtcblxuICAgIGFwaS5iYWNrID0gc3VidHJhY3RNb250aDtcbiAgICBhcGkuY29udGFpbmVyID0gY29udGFpbmVyO1xuICAgIGFwaS5kZXN0cm95ZWQgPSBmYWxzZTtcbiAgICBhcGkuZGVzdHJveSA9IGRlc3Ryb3kuYmluZChhcGksIGZhbHNlKTtcbiAgICBhcGkuZW1pdFZhbHVlcyA9IGVtaXRWYWx1ZXM7XG4gICAgYXBpLmdldERhdGUgPSBnZXREYXRlO1xuICAgIGFwaS5nZXREYXRlU3RyaW5nID0gZ2V0RGF0ZVN0cmluZztcbiAgICBhcGkuZ2V0TW9tZW50ID0gZ2V0TW9tZW50O1xuICAgIGFwaS5oaWRlID0gaGlkZTtcbiAgICBhcGkubmV4dCA9IGFkZE1vbnRoO1xuICAgIGFwaS5vcHRpb25zID0gY2hhbmdlT3B0aW9ucztcbiAgICBhcGkub3B0aW9ucy5yZXNldCA9IHJlc2V0T3B0aW9ucztcbiAgICBhcGkucmVmcmVzaCA9IHJlZnJlc2g7XG4gICAgYXBpLnJlc3RvcmUgPSBuYXBpO1xuICAgIGFwaS5zZXRWYWx1ZSA9IHNldFZhbHVlO1xuICAgIGFwaS5zaG93ID0gc2hvdztcblxuICAgIGV2ZW50TGlzdGVuaW5nKCk7XG4gICAgcmVhZHkoKTtcblxuICAgIHJldHVybiBhcGk7XG4gIH1cblxuICBmdW5jdGlvbiByZWFkeSAoKSB7XG4gICAgYXBpLmVtaXQoJ3JlYWR5JywgY2xvbmUobykpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVzdHJveSAoc2lsZW50KSB7XG4gICAgaWYgKGNvbnRhaW5lciAmJiBjb250YWluZXIucGFyZW50Tm9kZSkge1xuICAgICAgY29udGFpbmVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoY29udGFpbmVyKTtcbiAgICB9XG5cbiAgICBpZiAobykge1xuICAgICAgZXZlbnRMaXN0ZW5pbmcodHJ1ZSk7XG4gICAgfVxuXG4gICAgdmFyIGRlc3Ryb3llZCA9IGFwaS5lbWl0dGVyU25hcHNob3QoJ2Rlc3Ryb3llZCcpO1xuICAgIGFwaS5iYWNrID0gbm9vcDtcbiAgICBhcGkuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICBhcGkuZGVzdHJveSA9IG5hcGk7XG4gICAgYXBpLmVtaXRWYWx1ZXMgPSBuYXBpO1xuICAgIGFwaS5nZXREYXRlID0gbm9vcDtcbiAgICBhcGkuZ2V0RGF0ZVN0cmluZyA9IG5vb3A7XG4gICAgYXBpLmdldE1vbWVudCA9IG5vb3A7XG4gICAgYXBpLmhpZGUgPSBuYXBpO1xuICAgIGFwaS5uZXh0ID0gbm9vcDtcbiAgICBhcGkub3B0aW9ucyA9IG5hcGk7XG4gICAgYXBpLm9wdGlvbnMucmVzZXQgPSBuYXBpO1xuICAgIGFwaS5yZWZyZXNoID0gbmFwaTtcbiAgICBhcGkucmVzdG9yZSA9IGluaXQ7XG4gICAgYXBpLnNldFZhbHVlID0gbmFwaTtcbiAgICBhcGkuc2hvdyA9IG5hcGk7XG4gICAgYXBpLm9mZigpO1xuXG4gICAgaWYgKHNpbGVudCAhPT0gdHJ1ZSkge1xuICAgICAgZGVzdHJveWVkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV2ZW50TGlzdGVuaW5nIChyZW1vdmUpIHtcbiAgICB2YXIgb3AgPSByZW1vdmUgPyAncmVtb3ZlJyA6ICdhZGQnO1xuICAgIGlmIChvLmF1dG9IaWRlT25CbHVyKSB7IGNyb3NzdmVudFtvcF0oZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCAnZm9jdXMnLCBoaWRlT25CbHVyLCB0cnVlKTsgfVxuICAgIGlmIChvLmF1dG9IaWRlT25DbGljaykgeyBjcm9zc3ZlbnRbb3BdKGRvY3VtZW50LCAnY2xpY2snLCBoaWRlT25DbGljayk7IH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNoYW5nZU9wdGlvbnMgKG9wdGlvbnMpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGNsb25lKG8pO1xuICAgIH1cbiAgICBkZXN0cm95KCk7XG4gICAgaW5pdChvcHRpb25zKTtcbiAgICByZXR1cm4gYXBpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzZXRPcHRpb25zICgpIHtcbiAgICByZXR1cm4gY2hhbmdlT3B0aW9ucyh7IGFwcGVuZFRvOiBvLmFwcGVuZFRvIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVuZGVyICgpIHtcbiAgICBpZiAocmVuZGVyZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVuZGVyZWQgPSB0cnVlO1xuICAgIHJlbmRlckRhdGVzKCk7XG4gICAgcmVuZGVyVGltZSgpO1xuICAgIGFwaS5lbWl0KCdyZW5kZXInKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbmRlckRhdGVzICgpIHtcbiAgICBpZiAoIW8uZGF0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgaTtcbiAgICBjYWxlbmRhck1vbnRocyA9IFtdO1xuXG4gICAgZGF0ZXdyYXBwZXIgPSBkb20oeyBjbGFzc05hbWU6IG8uc3R5bGVzLmRhdGUsIHBhcmVudDogY29udGFpbmVyIH0pO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IG8ubW9udGhzSW5DYWxlbmRhcjsgaSsrKSB7XG4gICAgICByZW5kZXJNb250aChpKTtcbiAgICB9XG5cbiAgICBjcm9zc3ZlbnQuYWRkKGJhY2ssICdjbGljaycsIHN1YnRyYWN0TW9udGgpO1xuICAgIGNyb3NzdmVudC5hZGQobmV4dCwgJ2NsaWNrJywgYWRkTW9udGgpO1xuICAgIGNyb3NzdmVudC5hZGQoZGF0ZXdyYXBwZXIsICdjbGljaycsIHBpY2tEYXkpO1xuXG4gICAgZnVuY3Rpb24gcmVuZGVyTW9udGggKGkpIHtcbiAgICAgIHZhciBtb250aCA9IGRvbSh7IGNsYXNzTmFtZTogby5zdHlsZXMubW9udGgsIHBhcmVudDogZGF0ZXdyYXBwZXIgfSk7XG4gICAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICBiYWNrID0gZG9tKHsgdHlwZTogJ2J1dHRvbicsIGNsYXNzTmFtZTogby5zdHlsZXMuYmFjaywgYXR0cmlidXRlczogeyB0eXBlOiAnYnV0dG9uJyB9LCBwYXJlbnQ6IG1vbnRoIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGkgPT09IG8ubW9udGhzSW5DYWxlbmRhciAtMSkge1xuICAgICAgICBuZXh0ID0gZG9tKHsgdHlwZTogJ2J1dHRvbicsIGNsYXNzTmFtZTogby5zdHlsZXMubmV4dCwgYXR0cmlidXRlczogeyB0eXBlOiAnYnV0dG9uJyB9LCBwYXJlbnQ6IG1vbnRoIH0pO1xuICAgICAgfVxuICAgICAgdmFyIGxhYmVsID0gZG9tKHsgY2xhc3NOYW1lOiBvLnN0eWxlcy5tb250aExhYmVsLCBwYXJlbnQ6IG1vbnRoIH0pO1xuICAgICAgdmFyIGRhdGUgPSBkb20oeyB0eXBlOiAndGFibGUnLCBjbGFzc05hbWU6IG8uc3R5bGVzLmRheVRhYmxlLCBwYXJlbnQ6IG1vbnRoIH0pO1xuICAgICAgdmFyIGRhdGVoZWFkID0gZG9tKHsgdHlwZTogJ3RoZWFkJywgY2xhc3NOYW1lOiBvLnN0eWxlcy5kYXlIZWFkLCBwYXJlbnQ6IGRhdGUgfSk7XG4gICAgICB2YXIgZGF0ZWhlYWRyb3cgPSBkb20oeyB0eXBlOiAndHInLCBjbGFzc05hbWU6IG8uc3R5bGVzLmRheVJvdywgcGFyZW50OiBkYXRlaGVhZCB9KTtcbiAgICAgIHZhciBkYXRlYm9keSA9IGRvbSh7IHR5cGU6ICd0Ym9keScsIGNsYXNzTmFtZTogby5zdHlsZXMuZGF5Qm9keSwgcGFyZW50OiBkYXRlIH0pO1xuICAgICAgdmFyIGo7XG5cbiAgICAgIGZvciAoaiA9IDA7IGogPCB3ZWVrZGF5Q291bnQ7IGorKykge1xuICAgICAgICBkb20oeyB0eXBlOiAndGgnLCBjbGFzc05hbWU6IG8uc3R5bGVzLmRheUhlYWRFbGVtLCBwYXJlbnQ6IGRhdGVoZWFkcm93LCB0ZXh0OiB3ZWVrZGF5c1t3ZWVrZGF5KGopXSB9KTtcbiAgICAgIH1cblxuICAgICAgZGF0ZWJvZHkuc2V0QXR0cmlidXRlKG1vbnRoT2Zmc2V0QXR0cmlidXRlLCBpKTtcbiAgICAgIGNhbGVuZGFyTW9udGhzLnB1c2goe1xuICAgICAgICBsYWJlbDogbGFiZWwsXG4gICAgICAgIGJvZHk6IGRhdGVib2R5XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZW5kZXJUaW1lICgpIHtcbiAgICBpZiAoIW8udGltZSB8fCAhby50aW1lSW50ZXJ2YWwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWV3cmFwcGVyID0gZG9tKHsgY2xhc3NOYW1lOiBvLnN0eWxlcy50aW1lLCBwYXJlbnQ6IGNvbnRhaW5lciB9KTtcbiAgICB0aW1lID0gZG9tKHsgY2xhc3NOYW1lOiBvLnN0eWxlcy5zZWxlY3RlZFRpbWUsIHBhcmVudDogdGltZXdyYXBwZXIsIHRleHQ6IHJlZi5mb3JtYXQoby50aW1lRm9ybWF0KSB9KTtcbiAgICBjcm9zc3ZlbnQuYWRkKHRpbWUsICdjbGljaycsIHRvZ2dsZVRpbWVMaXN0KTtcbiAgICB0aW1lbGlzdCA9IGRvbSh7IGNsYXNzTmFtZTogby5zdHlsZXMudGltZUxpc3QsIHBhcmVudDogdGltZXdyYXBwZXIgfSk7XG4gICAgY3Jvc3N2ZW50LmFkZCh0aW1lbGlzdCwgJ2NsaWNrJywgcGlja1RpbWUpO1xuICAgIHZhciBuZXh0ID0gbW9tZW50dW0ubW9tZW50KCcwMDowMDowMCcsICdISDptbTpzcycpO1xuICAgIHZhciBsYXRlc3QgPSBuZXh0LmNsb25lKCkuYWRkKDEsICdkYXlzJyk7XG4gICAgd2hpbGUgKG5leHQuaXNCZWZvcmUobGF0ZXN0KSkge1xuICAgICAgZG9tKHsgY2xhc3NOYW1lOiBvLnN0eWxlcy50aW1lT3B0aW9uLCBwYXJlbnQ6IHRpbWVsaXN0LCB0ZXh0OiBuZXh0LmZvcm1hdChvLnRpbWVGb3JtYXQpIH0pO1xuICAgICAgbmV4dC5hZGQoby50aW1lSW50ZXJ2YWwsICdzZWNvbmRzJyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gd2Vla2RheSAoaW5kZXgsIGJhY2t3YXJkcykge1xuICAgIHZhciBmYWN0b3IgPSBiYWNrd2FyZHMgPyAtMSA6IDE7XG4gICAgdmFyIG9mZnNldCA9IGluZGV4ICsgby53ZWVrU3RhcnQgKiBmYWN0b3I7XG4gICAgaWYgKG9mZnNldCA+PSB3ZWVrZGF5Q291bnQgfHwgb2Zmc2V0IDwgMCkge1xuICAgICAgb2Zmc2V0ICs9IHdlZWtkYXlDb3VudCAqIC1mYWN0b3I7XG4gICAgfVxuICAgIHJldHVybiBvZmZzZXQ7XG4gIH1cblxuICBmdW5jdGlvbiBkaXNwbGF5VmFsaWRUaW1lc09ubHkgKCkge1xuICAgIGlmICghby50aW1lIHx8ICFyZW5kZXJlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZXMgPSB0aW1lbGlzdC5jaGlsZHJlbjtcbiAgICB2YXIgbGVuZ3RoID0gdGltZXMubGVuZ3RoO1xuICAgIHZhciBkYXRlO1xuICAgIHZhciB0aW1lO1xuICAgIHZhciBpdGVtO1xuICAgIHZhciBpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaXRlbSA9IHRpbWVzW2ldO1xuICAgICAgdGltZSA9IG1vbWVudHVtLm1vbWVudCh0ZXh0KGl0ZW0pLCBvLnRpbWVGb3JtYXQpO1xuICAgICAgZGF0ZSA9IHNldFRpbWUocmVmLmNsb25lKCksIHRpbWUpO1xuICAgICAgaXRlbS5zdHlsZS5kaXNwbGF5ID0gaXNJblJhbmdlKGRhdGUsIGZhbHNlLCBvLnRpbWVWYWxpZGF0b3IpID8gJ2Jsb2NrJyA6ICdub25lJztcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB0b2dnbGVUaW1lTGlzdCAoc2hvdykge1xuICAgIHZhciBkaXNwbGF5ID0gdHlwZW9mIHNob3cgPT09ICdib29sZWFuJyA/IHNob3cgOiB0aW1lbGlzdC5zdHlsZS5kaXNwbGF5ID09PSAnbm9uZSc7XG4gICAgaWYgKGRpc3BsYXkpIHtcbiAgICAgIHNob3dUaW1lTGlzdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBoaWRlVGltZUxpc3QoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzaG93VGltZUxpc3QgKCkgeyBpZiAodGltZWxpc3QpIHsgdGltZWxpc3Quc3R5bGUuZGlzcGxheSA9ICdibG9jayc7IH0gfVxuICBmdW5jdGlvbiBoaWRlVGltZUxpc3QgKCkgeyBpZiAodGltZWxpc3QpIHsgdGltZWxpc3Quc3R5bGUuZGlzcGxheSA9ICdub25lJzsgfSB9XG4gIGZ1bmN0aW9uIHNob3dDYWxlbmRhciAoKSB7IGNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gJ2lubGluZS1ibG9jayc7IGFwaS5lbWl0KCdzaG93Jyk7IH1cbiAgZnVuY3Rpb24gaGlkZUNhbGVuZGFyICgpIHtcbiAgICBpZiAoY29udGFpbmVyLnN0eWxlLmRpc3BsYXkgIT09ICdub25lJykge1xuICAgICAgY29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICBhcGkuZW1pdCgnaGlkZScpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3cgKCkge1xuICAgIHJlbmRlcigpO1xuICAgIHJlZnJlc2goKTtcbiAgICB0b2dnbGVUaW1lTGlzdCghby5kYXRlKTtcbiAgICBzaG93Q2FsZW5kYXIoKTtcbiAgICByZXR1cm4gYXBpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZSAoKSB7XG4gICAgaGlkZVRpbWVMaXN0KCk7XG4gICAgc2V0VGltZW91dChoaWRlQ2FsZW5kYXIsIDApO1xuICAgIHJldHVybiBhcGk7XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlQ29uZGl0aW9uYWxseSAoKSB7XG4gICAgaGlkZVRpbWVMaXN0KCk7XG5cbiAgICB2YXIgcG9zID0gY2xhc3Nlcy5jb250YWlucyhjb250YWluZXIsIG8uc3R5bGVzLnBvc2l0aW9uZWQpO1xuICAgIGlmIChwb3MpIHtcbiAgICAgIHNldFRpbWVvdXQoaGlkZUNhbGVuZGFyLCAwKTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbGVuZGFyRXZlbnRUYXJnZXQgKGUpIHtcbiAgICB2YXIgdGFyZ2V0ID0gZS50YXJnZXQ7XG4gICAgaWYgKHRhcmdldCA9PT0gYXBpLmFzc29jaWF0ZWQpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB3aGlsZSAodGFyZ2V0KSB7XG4gICAgICBpZiAodGFyZ2V0ID09PSBjb250YWluZXIpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoaWRlT25CbHVyIChlKSB7XG4gICAgaWYgKGNhbGVuZGFyRXZlbnRUYXJnZXQoZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaGlkZUNvbmRpdGlvbmFsbHkoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhpZGVPbkNsaWNrIChlKSB7XG4gICAgaWYgKGNhbGVuZGFyRXZlbnRUYXJnZXQoZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaGlkZUNvbmRpdGlvbmFsbHkoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN1YnRyYWN0TW9udGggKCkgeyBjaGFuZ2VNb250aCgnc3VidHJhY3QnKTsgfVxuICBmdW5jdGlvbiBhZGRNb250aCAoKSB7IGNoYW5nZU1vbnRoKCdhZGQnKTsgfVxuICBmdW5jdGlvbiBjaGFuZ2VNb250aCAob3ApIHtcbiAgICB2YXIgYm91bmQ7XG4gICAgdmFyIGRpcmVjdGlvbiA9IG9wID09PSAnYWRkJyA/IC0xIDogMTtcbiAgICB2YXIgb2Zmc2V0ID0gby5tb250aHNJbkNhbGVuZGFyICsgZGlyZWN0aW9uICogZ2V0TW9udGhPZmZzZXQobGFzdERheUVsZW1lbnQpO1xuICAgIHJlZkNhbFtvcF0ob2Zmc2V0LCAnbW9udGhzJyk7XG4gICAgYm91bmQgPSBpblJhbmdlKHJlZkNhbC5jbG9uZSgpKTtcbiAgICByZWYgPSBib3VuZCB8fCByZWY7XG4gICAgaWYgKGJvdW5kKSB7IHJlZkNhbCA9IGJvdW5kLmNsb25lKCk7IH1cbiAgICB1cGRhdGUoKTtcbiAgICBhcGkuZW1pdChvcCA9PT0gJ2FkZCcgPyAnbmV4dCcgOiAnYmFjaycsIHJlZi5tb250aCgpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZSAoc2lsZW50KSB7XG4gICAgdXBkYXRlQ2FsZW5kYXIoKTtcbiAgICB1cGRhdGVUaW1lKCk7XG4gICAgaWYgKHNpbGVudCAhPT0gdHJ1ZSkgeyBlbWl0VmFsdWVzKCk7IH1cbiAgICBkaXNwbGF5VmFsaWRUaW1lc09ubHkoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUNhbGVuZGFyICgpIHtcbiAgICBpZiAoIW8uZGF0ZSB8fCAhcmVuZGVyZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHkgPSByZWZDYWwueWVhcigpO1xuICAgIHZhciBtID0gcmVmQ2FsLm1vbnRoKCk7XG4gICAgdmFyIGQgPSByZWZDYWwuZGF0ZSgpO1xuICAgIGlmIChkID09PSBsYXN0RGF5ICYmIG0gPT09IGxhc3RNb250aCAmJiB5ID09PSBsYXN0WWVhcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgY2FuU3RheSA9IGlzRGlzcGxheWVkKCk7XG4gICAgbGFzdERheSA9IHJlZkNhbC5kYXRlKCk7XG4gICAgbGFzdE1vbnRoID0gcmVmQ2FsLm1vbnRoKCk7XG4gICAgbGFzdFllYXIgPSByZWZDYWwueWVhcigpO1xuICAgIGlmIChjYW5TdGF5KSB7IHVwZGF0ZUNhbGVuZGFyU2VsZWN0aW9uKCk7IHJldHVybjsgfVxuICAgIGNhbGVuZGFyTW9udGhzLmZvckVhY2godXBkYXRlTW9udGgpO1xuICAgIHJlbmRlckFsbERheXMoKTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZU1vbnRoIChtb250aCwgaSkge1xuICAgICAgdmFyIG9mZnNldENhbCA9IHJlZkNhbC5jbG9uZSgpLmFkZChpLCAnbW9udGhzJyk7XG4gICAgICB0ZXh0KG1vbnRoLmxhYmVsLCBvZmZzZXRDYWwuZm9ybWF0KG8ubW9udGhGb3JtYXQpKTtcbiAgICAgIHJlbW92ZUNoaWxkcmVuKG1vbnRoLmJvZHkpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUNhbGVuZGFyU2VsZWN0aW9uICgpIHtcbiAgICB2YXIgZGF5ID0gcmVmQ2FsLmRhdGUoKSAtIDE7XG4gICAgc2VsZWN0RGF5RWxlbWVudChmYWxzZSk7XG4gICAgY2FsZW5kYXJNb250aHMuZm9yRWFjaChmdW5jdGlvbiAoY2FsKSB7XG4gICAgICB2YXIgZGF5cztcbiAgICAgIGlmIChzYW1lQ2FsZW5kYXJNb250aChjYWwuZGF0ZSwgcmVmQ2FsKSkge1xuICAgICAgICBkYXlzID0gY2FzdChjYWwuYm9keS5jaGlsZHJlbikubWFwKGFnZ3JlZ2F0ZSk7XG4gICAgICAgIGRheXMgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KFtdLCBkYXlzKS5maWx0ZXIoaW5zaWRlKTtcbiAgICAgICAgc2VsZWN0RGF5RWxlbWVudChkYXlzW2RheV0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gY2FzdCAobGlrZSkge1xuICAgICAgdmFyIGRlc3QgPSBbXTtcbiAgICAgIHZhciBpO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxpa2UubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZGVzdC5wdXNoKGxpa2VbaV0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlc3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWdncmVnYXRlIChjaGlsZCkge1xuICAgICAgcmV0dXJuIGNhc3QoY2hpbGQuY2hpbGRyZW4pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc2lkZSAoY2hpbGQpIHtcbiAgICAgIHJldHVybiAhY2xhc3Nlcy5jb250YWlucyhjaGlsZCwgby5zdHlsZXMuZGF5UHJldk1vbnRoKSAmJlxuICAgICAgICAgICAgICFjbGFzc2VzLmNvbnRhaW5zKGNoaWxkLCBvLnN0eWxlcy5kYXlOZXh0TW9udGgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRGlzcGxheWVkICgpIHtcbiAgICByZXR1cm4gY2FsZW5kYXJNb250aHMuc29tZShtYXRjaGVzKTtcblxuICAgIGZ1bmN0aW9uIG1hdGNoZXMgKGNhbCkge1xuICAgICAgaWYgKCFsYXN0WWVhcikgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgIHJldHVybiBzYW1lQ2FsZW5kYXJNb250aChjYWwuZGF0ZSwgcmVmQ2FsKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzYW1lQ2FsZW5kYXJNb250aCAobGVmdCwgcmlnaHQpIHtcbiAgICByZXR1cm4gbGVmdCAmJiByaWdodCAmJiBsZWZ0LnllYXIoKSA9PT0gcmlnaHQueWVhcigpICYmIGxlZnQubW9udGgoKSA9PT0gcmlnaHQubW9udGgoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZVRpbWUgKCkge1xuICAgIGlmICghby50aW1lIHx8ICFyZW5kZXJlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0ZXh0KHRpbWUsIHJlZi5mb3JtYXQoby50aW1lRm9ybWF0KSk7XG4gIH1cblxuICBmdW5jdGlvbiBlbWl0VmFsdWVzICgpIHtcbiAgICBhcGkuZW1pdCgnZGF0YScsIGdldERhdGVTdHJpbmcoKSk7XG4gICAgYXBpLmVtaXQoJ3llYXInLCByZWYueWVhcigpKTtcbiAgICBhcGkuZW1pdCgnbW9udGgnLCByZWYubW9udGgoKSk7XG4gICAgYXBpLmVtaXQoJ2RheScsIHJlZi5kYXkoKSk7XG4gICAgYXBpLmVtaXQoJ3RpbWUnLCByZWYuZm9ybWF0KG8udGltZUZvcm1hdCkpO1xuICAgIHJldHVybiBhcGk7XG4gIH1cblxuICBmdW5jdGlvbiByZWZyZXNoICgpIHtcbiAgICBsYXN0WWVhciA9IGZhbHNlO1xuICAgIGxhc3RNb250aCA9IGZhbHNlO1xuICAgIGxhc3REYXkgPSBmYWxzZTtcbiAgICB1cGRhdGUodHJ1ZSk7XG4gICAgcmV0dXJuIGFwaTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFZhbHVlICh2YWx1ZSkge1xuICAgIHZhciBkYXRlID0gcGFyc2UodmFsdWUsIG8uaW5wdXRGb3JtYXQpO1xuICAgIGlmIChkYXRlID09PSBudWxsKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlZiA9IGluUmFuZ2UoZGF0ZSkgfHwgcmVmO1xuICAgIHJlZkNhbCA9IHJlZi5jbG9uZSgpO1xuICAgIHVwZGF0ZSh0cnVlKTtcblxuICAgIHJldHVybiBhcGk7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVDaGlsZHJlbiAoZWxlbSwgc2VsZikge1xuICAgIHdoaWxlIChlbGVtICYmIGVsZW0uZmlyc3RDaGlsZCkge1xuICAgICAgZWxlbS5yZW1vdmVDaGlsZChlbGVtLmZpcnN0Q2hpbGQpO1xuICAgIH1cbiAgICBpZiAoc2VsZiA9PT0gdHJ1ZSkge1xuICAgICAgZWxlbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsZW0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbmRlckFsbERheXMgKCkge1xuICAgIHZhciBpO1xuICAgIGZvciAoaSA9IDA7IGkgPCBvLm1vbnRoc0luQ2FsZW5kYXI7IGkrKykge1xuICAgICAgcmVuZGVyRGF5cyhpKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZW5kZXJEYXlzIChvZmZzZXQpIHtcbiAgICB2YXIgbW9udGggPSBjYWxlbmRhck1vbnRoc1tvZmZzZXRdO1xuICAgIHZhciBvZmZzZXRDYWwgPSByZWZDYWwuY2xvbmUoKS5hZGQob2Zmc2V0LCAnbW9udGhzJyk7XG4gICAgdmFyIHRvdGFsID0gb2Zmc2V0Q2FsLmRheXNJbk1vbnRoKCk7XG4gICAgdmFyIGN1cnJlbnQgPSBvZmZzZXRDYWwubW9udGgoKSAhPT0gcmVmLm1vbnRoKCkgPyAtMSA6IHJlZi5kYXRlKCk7IC8vIC0xIDogMS4uMzFcbiAgICB2YXIgZmlyc3QgPSBvZmZzZXRDYWwuY2xvbmUoKS5kYXRlKDEpO1xuICAgIHZhciBmaXJzdERheSA9IHdlZWtkYXkoZmlyc3QuZGF5KCksIHRydWUpOyAvLyAwLi42XG4gICAgdmFyIHRyID0gZG9tKHsgdHlwZTogJ3RyJywgY2xhc3NOYW1lOiBvLnN0eWxlcy5kYXlSb3csIHBhcmVudDogbW9udGguYm9keSB9KTtcbiAgICB2YXIgcHJldk1vbnRoID0gaGlkZGVuV2hlbihvZmZzZXQgIT09IDAsIFtvLnN0eWxlcy5kYXlCb2R5RWxlbSwgby5zdHlsZXMuZGF5UHJldk1vbnRoXSk7XG4gICAgdmFyIG5leHRNb250aCA9IGhpZGRlbldoZW4ob2Zmc2V0ICE9PSBvLm1vbnRoc0luQ2FsZW5kYXIgLSAxLCBbby5zdHlsZXMuZGF5Qm9keUVsZW0sIG8uc3R5bGVzLmRheU5leHRNb250aF0pO1xuICAgIHZhciBkaXNhYmxlZCA9IG8uc3R5bGVzLmRheURpc2FibGVkO1xuICAgIHZhciBsYXN0RGF5O1xuXG4gICAgcGFydCh7XG4gICAgICBiYXNlOiBmaXJzdC5jbG9uZSgpLnN1YnRyYWN0KGZpcnN0RGF5LCAnZGF5cycpLFxuICAgICAgbGVuZ3RoOiBmaXJzdERheSxcbiAgICAgIGNlbGw6IHByZXZNb250aFxuICAgIH0pO1xuXG4gICAgcGFydCh7XG4gICAgICBiYXNlOiBmaXJzdC5jbG9uZSgpLFxuICAgICAgbGVuZ3RoOiB0b3RhbCxcbiAgICAgIGNlbGw6IFtvLnN0eWxlcy5kYXlCb2R5RWxlbV0sXG4gICAgICBzZWxlY3RhYmxlOiB0cnVlXG4gICAgfSk7XG5cbiAgICBsYXN0RGF5ID0gZmlyc3QuY2xvbmUoKS5hZGQodG90YWwsICdkYXlzJyk7XG5cbiAgICBwYXJ0KHtcbiAgICAgIGJhc2U6IGxhc3REYXksXG4gICAgICBsZW5ndGg6IHdlZWtkYXlDb3VudCAtIHRyLmNoaWxkcmVuLmxlbmd0aCxcbiAgICAgIGNlbGw6IG5leHRNb250aFxuICAgIH0pO1xuXG4gICAgYmFjay5kaXNhYmxlZCA9ICFpc0luUmFuZ2VMZWZ0KGZpcnN0LCB0cnVlKTtcbiAgICBuZXh0LmRpc2FibGVkID0gIWlzSW5SYW5nZVJpZ2h0KGxhc3REYXksIHRydWUpO1xuICAgIG1vbnRoLmRhdGUgPSBvZmZzZXRDYWwuY2xvbmUoKTtcblxuICAgIGZ1bmN0aW9uIHBhcnQgKGRhdGEpIHtcbiAgICAgIHZhciBpLCBkYXksIG5vZGU7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodHIuY2hpbGRyZW4ubGVuZ3RoID09PSB3ZWVrZGF5Q291bnQpIHtcbiAgICAgICAgICB0ciA9IGRvbSh7IHR5cGU6ICd0cicsIGNsYXNzTmFtZTogby5zdHlsZXMuZGF5Um93LCBwYXJlbnQ6IG1vbnRoLmJvZHkgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZGF5ID0gZGF0YS5iYXNlLmNsb25lKCkuYWRkKGksICdkYXlzJyk7XG4gICAgICAgIG5vZGUgPSBkb20oe1xuICAgICAgICAgIHR5cGU6ICd0ZCcsXG4gICAgICAgICAgcGFyZW50OiB0cixcbiAgICAgICAgICB0ZXh0OiBkYXkuZm9ybWF0KG8uZGF5Rm9ybWF0KSxcbiAgICAgICAgICBjbGFzc05hbWU6IHZhbGlkYXRpb25UZXN0KGRheSwgZGF0YS5jZWxsLmpvaW4oJyAnKS5zcGxpdCgnICcpKS5qb2luKCcgJylcbiAgICAgICAgfSk7XG4gICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdkYXRhLWRhdGUnLCBkYXkuZGF0ZSgpKTtcbiAgICAgICAgaWYgKGRhdGEuc2VsZWN0YWJsZSAmJiBkYXkuZGF0ZSgpID09PSBjdXJyZW50KSB7XG4gICAgICAgICAgc2VsZWN0RGF5RWxlbWVudChub2RlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZhbGlkYXRpb25UZXN0IChkYXksIGNlbGwpIHtcbiAgICAgIGlmICghaXNJblJhbmdlKGRheSwgdHJ1ZSwgby5kYXRlVmFsaWRhdG9yKSkgeyBjZWxsLnB1c2goZGlzYWJsZWQpOyB9XG4gICAgICByZXR1cm4gY2VsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoaWRkZW5XaGVuICh2YWx1ZSwgY2VsbCkge1xuICAgICAgaWYgKHZhbHVlKSB7IGNlbGwucHVzaChvLnN0eWxlcy5kYXlDb25jZWFsZWQpOyB9XG4gICAgICByZXR1cm4gY2VsbDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpc0luUmFuZ2UgKGRhdGUsIGFsbGRheSwgdmFsaWRhdG9yKSB7XG4gICAgaWYgKCFpc0luUmFuZ2VMZWZ0KGRhdGUsIGFsbGRheSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0luUmFuZ2VSaWdodChkYXRlLCBhbGxkYXkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciB2YWxpZCA9ICh2YWxpZGF0b3IgfHwgRnVuY3Rpb24ucHJvdG90eXBlKS5jYWxsKGFwaSwgZGF0ZS50b0RhdGUoKSk7XG4gICAgcmV0dXJuIHZhbGlkICE9PSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzSW5SYW5nZUxlZnQgKGRhdGUsIGFsbGRheSkge1xuICAgIHZhciBtaW4gPSAhby5taW4gPyBmYWxzZSA6IChhbGxkYXkgPyBvLm1pbi5jbG9uZSgpLnN0YXJ0T2YoJ2RheScpIDogby5taW4pO1xuICAgIHJldHVybiAhbWluIHx8ICFkYXRlLmlzQmVmb3JlKG1pbik7XG4gIH1cblxuICBmdW5jdGlvbiBpc0luUmFuZ2VSaWdodCAoZGF0ZSwgYWxsZGF5KSB7XG4gICAgdmFyIG1heCA9ICFvLm1heCA/IGZhbHNlIDogKGFsbGRheSA/IG8ubWF4LmNsb25lKCkuZW5kT2YoJ2RheScpIDogby5tYXgpO1xuICAgIHJldHVybiAhbWF4IHx8ICFkYXRlLmlzQWZ0ZXIobWF4KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGluUmFuZ2UgKGRhdGUpIHtcbiAgICBpZiAoby5taW4gJiYgZGF0ZS5pc0JlZm9yZShvLm1pbikpIHtcbiAgICAgIHJldHVybiBpblJhbmdlKG8ubWluLmNsb25lKCkpO1xuICAgIH0gZWxzZSBpZiAoby5tYXggJiYgZGF0ZS5pc0FmdGVyKG8ubWF4KSkge1xuICAgICAgcmV0dXJuIGluUmFuZ2Uoby5tYXguY2xvbmUoKSk7XG4gICAgfVxuICAgIHZhciB2YWx1ZSA9IGRhdGUuY2xvbmUoKS5zdWJ0cmFjdCgxLCAnZGF5cycpO1xuICAgIGlmICh2YWxpZGF0ZVRvd2FyZHModmFsdWUsIGRhdGUsICdhZGQnKSkge1xuICAgICAgcmV0dXJuIGluVGltZVJhbmdlKHZhbHVlKTtcbiAgICB9XG4gICAgdmFsdWUgPSBkYXRlLmNsb25lKCk7XG4gICAgaWYgKHZhbGlkYXRlVG93YXJkcyh2YWx1ZSwgZGF0ZSwgJ3N1YnRyYWN0JykpIHtcbiAgICAgIHJldHVybiBpblRpbWVSYW5nZSh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5UaW1lUmFuZ2UgKHZhbHVlKSB7XG4gICAgdmFyIGNvcHkgPSB2YWx1ZS5jbG9uZSgpLnN1YnRyYWN0KG8udGltZUludGVydmFsLCAnc2Vjb25kcycpO1xuICAgIHZhciB0aW1lcyA9IE1hdGguY2VpbChzZWNvbmRzSW5EYXkgLyBvLnRpbWVJbnRlcnZhbCk7XG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gMDsgaSA8IHRpbWVzOyBpKyspIHtcbiAgICAgIGNvcHkuYWRkKG8udGltZUludGVydmFsLCAnc2Vjb25kcycpO1xuICAgICAgaWYgKGNvcHkuZGF0ZSgpID4gdmFsdWUuZGF0ZSgpKSB7XG4gICAgICAgIGNvcHkuc3VidHJhY3QoMSwgJ2RheXMnKTtcbiAgICAgIH1cbiAgICAgIGlmIChvLnRpbWVWYWxpZGF0b3IuY2FsbChhcGksIGNvcHkudG9EYXRlKCkpICE9PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gY29weTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB2YWxpZGF0ZVRvd2FyZHMgKHZhbHVlLCBkYXRlLCBvcCkge1xuICAgIHZhciB2YWxpZCA9IGZhbHNlO1xuICAgIHdoaWxlICh2YWxpZCA9PT0gZmFsc2UpIHtcbiAgICAgIHZhbHVlW29wXSgxLCAnZGF5cycpO1xuICAgICAgaWYgKHZhbHVlLm1vbnRoKCkgIT09IGRhdGUubW9udGgoKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHZhbGlkID0gby5kYXRlVmFsaWRhdG9yLmNhbGwoYXBpLCB2YWx1ZS50b0RhdGUoKSk7XG4gICAgfVxuICAgIHJldHVybiB2YWxpZCAhPT0gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBwaWNrRGF5IChlKSB7XG4gICAgdmFyIHRhcmdldCA9IGUudGFyZ2V0O1xuICAgIGlmIChjbGFzc2VzLmNvbnRhaW5zKHRhcmdldCwgby5zdHlsZXMuZGF5RGlzYWJsZWQpIHx8ICFjbGFzc2VzLmNvbnRhaW5zKHRhcmdldCwgby5zdHlsZXMuZGF5Qm9keUVsZW0pKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkYXkgPSB0YXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWRhdGUnKTtcbiAgICB2YXIgcHJldiA9IGNsYXNzZXMuY29udGFpbnModGFyZ2V0LCBvLnN0eWxlcy5kYXlQcmV2TW9udGgpO1xuICAgIHZhciBuZXh0ID0gY2xhc3Nlcy5jb250YWlucyh0YXJnZXQsIG8uc3R5bGVzLmRheU5leHRNb250aCk7XG4gICAgdmFyIG9mZnNldCA9IGdldE1vbnRoT2Zmc2V0KHRhcmdldCkgLSBnZXRNb250aE9mZnNldChsYXN0RGF5RWxlbWVudCk7XG4gICAgcmVmLmFkZChvZmZzZXQsICdtb250aHMnKTtcbiAgICBpZiAocHJldiB8fCBuZXh0KSB7XG4gICAgICByZWYuYWRkKHByZXYgPyAtMSA6IDEsICdtb250aHMnKTtcbiAgICB9XG4gICAgc2VsZWN0RGF5RWxlbWVudCh0YXJnZXQpO1xuICAgIHJlZi5kYXRlKGRheSk7IC8vIG11c3QgcnVuIGFmdGVyIHNldHRpbmcgdGhlIG1vbnRoXG4gICAgc2V0VGltZShyZWYsIGluUmFuZ2UocmVmKSB8fCByZWYpO1xuICAgIHJlZkNhbCA9IHJlZi5jbG9uZSgpO1xuICAgIGlmIChvLmF1dG9DbG9zZSA9PT0gdHJ1ZSkgeyBoaWRlQ29uZGl0aW9uYWxseSgpOyB9XG4gICAgdXBkYXRlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBzZWxlY3REYXlFbGVtZW50IChub2RlKSB7XG4gICAgaWYgKGxhc3REYXlFbGVtZW50KSB7XG4gICAgICBjbGFzc2VzLnJlbW92ZShsYXN0RGF5RWxlbWVudCwgby5zdHlsZXMuc2VsZWN0ZWREYXkpO1xuICAgIH1cbiAgICBpZiAobm9kZSkge1xuICAgICAgY2xhc3Nlcy5hZGQobm9kZSwgby5zdHlsZXMuc2VsZWN0ZWREYXkpO1xuICAgIH1cbiAgICBsYXN0RGF5RWxlbWVudCA9IG5vZGU7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRNb250aE9mZnNldCAoZWxlbSkge1xuICAgIHZhciBvZmZzZXQ7XG4gICAgd2hpbGUgKGVsZW0gJiYgZWxlbS5nZXRBdHRyaWJ1dGUpIHtcbiAgICAgIG9mZnNldCA9IGVsZW0uZ2V0QXR0cmlidXRlKG1vbnRoT2Zmc2V0QXR0cmlidXRlKTtcbiAgICAgIGlmICh0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQob2Zmc2V0LCAxMCk7XG4gICAgICB9XG4gICAgICBlbGVtID0gZWxlbS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFRpbWUgKHRvLCBmcm9tKSB7XG4gICAgdG8uaG91cihmcm9tLmhvdXIoKSkubWludXRlKGZyb20ubWludXRlKCkpLnNlY29uZChmcm9tLnNlY29uZCgpKTtcbiAgICByZXR1cm4gdG87XG4gIH1cblxuICBmdW5jdGlvbiBwaWNrVGltZSAoZSkge1xuICAgIHZhciB0YXJnZXQgPSBlLnRhcmdldDtcbiAgICBpZiAoIWNsYXNzZXMuY29udGFpbnModGFyZ2V0LCBvLnN0eWxlcy50aW1lT3B0aW9uKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdmFsdWUgPSBtb21lbnR1bS5tb21lbnQodGV4dCh0YXJnZXQpLCBvLnRpbWVGb3JtYXQpO1xuICAgIHNldFRpbWUocmVmLCB2YWx1ZSk7XG4gICAgcmVmQ2FsID0gcmVmLmNsb25lKCk7XG4gICAgZW1pdFZhbHVlcygpO1xuICAgIHVwZGF0ZVRpbWUoKTtcbiAgICBpZiAoKCFvLmRhdGUgJiYgby5hdXRvQ2xvc2UgPT09IHRydWUpIHx8IG8uYXV0b0Nsb3NlID09PSAndGltZScpIHtcbiAgICAgIGhpZGVDb25kaXRpb25hbGx5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhpZGVUaW1lTGlzdCgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldERhdGUgKCkge1xuICAgIHJldHVybiByZWYudG9EYXRlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXREYXRlU3RyaW5nIChmb3JtYXQpIHtcbiAgICByZXR1cm4gcmVmLmZvcm1hdChmb3JtYXQgfHwgby5pbnB1dEZvcm1hdCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRNb21lbnQgKCkge1xuICAgIHJldHVybiByZWYuY2xvbmUoKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNhbGVuZGFyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdHJpbSA9IC9eXFxzK3xcXHMrJC9nO1xudmFyIHdoaXRlc3BhY2UgPSAvXFxzKy87XG5cbmZ1bmN0aW9uIGNsYXNzZXMgKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuY2xhc3NOYW1lLnJlcGxhY2UodHJpbSwgJycpLnNwbGl0KHdoaXRlc3BhY2UpO1xufVxuXG5mdW5jdGlvbiBzZXQgKG5vZGUsIHZhbHVlKSB7XG4gIG5vZGUuY2xhc3NOYW1lID0gdmFsdWUuam9pbignICcpO1xufVxuXG5mdW5jdGlvbiBhZGQgKG5vZGUsIHZhbHVlKSB7XG4gIHZhciB2YWx1ZXMgPSByZW1vdmUobm9kZSwgdmFsdWUpO1xuICB2YWx1ZXMucHVzaCh2YWx1ZSk7XG4gIHNldChub2RlLCB2YWx1ZXMpO1xufVxuXG5mdW5jdGlvbiByZW1vdmUgKG5vZGUsIHZhbHVlKSB7XG4gIHZhciB2YWx1ZXMgPSBjbGFzc2VzKG5vZGUpO1xuICB2YXIgaSA9IHZhbHVlcy5pbmRleE9mKHZhbHVlKTtcbiAgaWYgKGkgIT09IC0xKSB7XG4gICAgdmFsdWVzLnNwbGljZShpLCAxKTtcbiAgICBzZXQobm9kZSwgdmFsdWVzKTtcbiAgfVxuICByZXR1cm4gdmFsdWVzO1xufVxuXG5mdW5jdGlvbiBjb250YWlucyAobm9kZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGNsYXNzZXMobm9kZSkuaW5kZXhPZih2YWx1ZSkgIT09IC0xO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWRkOiBhZGQsXG4gIHJlbW92ZTogcmVtb3ZlLFxuICBjb250YWluczogY29udGFpbnNcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtb21lbnR1bSA9IHJlcXVpcmUoJy4vbW9tZW50dW0nKTtcblxuLy8gbmHDr3ZlIGltcGxlbWVudGF0aW9uLCBzcGVjaWZpY2FsbHkgbWVhbnQgdG8gY2xvbmUgYG9wdGlvbnNgIG9iamVjdHNcbmZ1bmN0aW9uIGNsb25lICh0aGluZykge1xuICB2YXIgY29weSA9IHt9O1xuICB2YXIgdmFsdWU7XG5cbiAgZm9yICh2YXIga2V5IGluIHRoaW5nKSB7XG4gICAgdmFsdWUgPSB0aGluZ1trZXldO1xuXG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgY29weVtrZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIGlmIChtb21lbnR1bS5pc01vbWVudCh2YWx1ZSkpIHtcbiAgICAgIGNvcHlba2V5XSA9IHZhbHVlLmNsb25lKCk7XG4gICAgfSBlbHNlIGlmICh2YWx1ZS5faXNTdHlsZXNDb25maWd1cmF0aW9uKSB7XG4gICAgICBjb3B5W2tleV0gPSBjbG9uZSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvcHlba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb3B5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW5kZXggPSByZXF1aXJlKCcuL2luZGV4Jyk7XG52YXIgaW5wdXQgPSByZXF1aXJlKCcuL2lucHV0Jyk7XG52YXIgaW5saW5lID0gcmVxdWlyZSgnLi9pbmxpbmUnKTtcbnZhciBpc0lucHV0ID0gcmVxdWlyZSgnLi9pc0lucHV0Jyk7XG5cbmZ1bmN0aW9uIGNvcmUgKGVsZW0sIG9wdGlvbnMpIHtcbiAgdmFyIGNhbDtcbiAgdmFyIGV4aXN0aW5nID0gaW5kZXguZmluZChlbGVtKTtcbiAgaWYgKGV4aXN0aW5nKSB7XG4gICAgcmV0dXJuIGV4aXN0aW5nO1xuICB9XG5cbiAgaWYgKGlzSW5wdXQoZWxlbSkpIHtcbiAgICBjYWwgPSBpbnB1dChlbGVtLCBvcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICBjYWwgPSBpbmxpbmUoZWxlbSwgb3B0aW9ucyk7XG4gIH1cbiAgaW5kZXguYXNzaWduKGVsZW0sIGNhbCk7XG5cbiAgcmV0dXJuIGNhbDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb3JlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlJyk7XG52YXIgaXNJbnB1dCA9IHJlcXVpcmUoJy4vaXNJbnB1dCcpO1xudmFyIG1vbWVudHVtID0gcmVxdWlyZSgnLi9tb21lbnR1bScpO1xuXG5mdW5jdGlvbiBkZWZhdWx0cyAob3B0aW9ucywgY2FsKSB7XG4gIHZhciB0ZW1wO1xuICB2YXIgbm87XG4gIHZhciBvID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYgKG8uYXV0b0hpZGVPbkNsaWNrID09PSBubykgeyBvLmF1dG9IaWRlT25DbGljayA9IHRydWU7IH1cbiAgaWYgKG8uYXV0b0hpZGVPbkJsdXIgPT09IG5vKSB7IG8uYXV0b0hpZGVPbkJsdXIgPSB0cnVlOyB9XG4gIGlmIChvLmF1dG9DbG9zZSA9PT0gbm8pIHsgby5hdXRvQ2xvc2UgPSB0cnVlOyB9XG4gIGlmIChvLmFwcGVuZFRvID09PSBubykgeyBvLmFwcGVuZFRvID0gZG9jdW1lbnQuYm9keTsgfVxuICBpZiAoby5hcHBlbmRUbyA9PT0gJ3BhcmVudCcpIHtcbiAgICBpZiAoaXNJbnB1dChjYWwuYXNzb2NpYXRlZCkpIHtcbiAgICAgIG8uYXBwZW5kVG8gPSBjYWwuYXNzb2NpYXRlZC5wYXJlbnROb2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0lubGluZSBjYWxlbmRhcnMgbXVzdCBiZSBhcHBlbmRlZCB0byBhIHBhcmVudCBub2RlIGV4cGxpY2l0bHkuJyk7XG4gICAgfVxuICB9XG4gIGlmIChvLmludmFsaWRhdGUgPT09IG5vKSB7IG8uaW52YWxpZGF0ZSA9IHRydWU7IH1cbiAgaWYgKG8ucmVxdWlyZWQgPT09IG5vKSB7IG8ucmVxdWlyZWQgPSBmYWxzZTsgfVxuICBpZiAoby5kYXRlID09PSBubykgeyBvLmRhdGUgPSB0cnVlOyB9XG4gIGlmIChvLnRpbWUgPT09IG5vKSB7IG8udGltZSA9IHRydWU7IH1cbiAgaWYgKG8uZGF0ZSA9PT0gZmFsc2UgJiYgby50aW1lID09PSBmYWxzZSkgeyB0aHJvdyBuZXcgRXJyb3IoJ0F0IGxlYXN0IG9uZSBvZiBgZGF0ZWAgb3IgYHRpbWVgIG11c3QgYmUgYHRydWVgLicpOyB9XG4gIGlmIChvLmlucHV0Rm9ybWF0ID09PSBubykge1xuICAgIGlmIChvLmRhdGUgJiYgby50aW1lKSB7XG4gICAgICBvLmlucHV0Rm9ybWF0ID0gJ1lZWVktTU0tREQgSEg6bW0nO1xuICAgIH0gZWxzZSBpZiAoby5kYXRlKSB7XG4gICAgICBvLmlucHV0Rm9ybWF0ID0gJ1lZWVktTU0tREQnO1xuICAgIH0gZWxzZSB7XG4gICAgICBvLmlucHV0Rm9ybWF0ID0gJ0hIOm1tJztcbiAgICB9XG4gIH1cbiAgaWYgKG8uaW5pdGlhbFZhbHVlID09PSBubykge1xuICAgIG8uaW5pdGlhbFZhbHVlID0gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICBvLmluaXRpYWxWYWx1ZSA9IHBhcnNlKG8uaW5pdGlhbFZhbHVlLCBvLmlucHV0Rm9ybWF0KTtcbiAgfVxuICBpZiAoby5taW4gPT09IG5vKSB7IG8ubWluID0gbnVsbDsgfSBlbHNlIHsgby5taW4gPSBwYXJzZShvLm1pbiwgby5pbnB1dEZvcm1hdCk7IH1cbiAgaWYgKG8ubWF4ID09PSBubykgeyBvLm1heCA9IG51bGw7IH0gZWxzZSB7IG8ubWF4ID0gcGFyc2Uoby5tYXgsIG8uaW5wdXRGb3JtYXQpOyB9XG4gIGlmIChvLnRpbWVJbnRlcnZhbCA9PT0gbm8pIHsgby50aW1lSW50ZXJ2YWwgPSA2MCAqIDMwOyB9IC8vIDMwIG1pbnV0ZXMgYnkgZGVmYXVsdFxuICBpZiAoby5taW4gJiYgby5tYXgpIHtcbiAgICBpZiAoby5tYXguaXNCZWZvcmUoby5taW4pKSB7XG4gICAgICB0ZW1wID0gby5tYXg7XG4gICAgICBvLm1heCA9IG8ubWluO1xuICAgICAgby5taW4gPSB0ZW1wO1xuICAgIH1cbiAgICBpZiAoby5kYXRlID09PSB0cnVlKSB7XG4gICAgICBpZiAoby5tYXguY2xvbmUoKS5zdWJ0cmFjdCgxLCAnZGF5cycpLmlzQmVmb3JlKG8ubWluKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2BtYXhgIG11c3QgYmUgYXQgbGVhc3Qgb25lIGRheSBhZnRlciBgbWluYCcpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoby50aW1lSW50ZXJ2YWwgKiAxMDAwIC0gby5taW4gJSAoby50aW1lSW50ZXJ2YWwgKiAxMDAwKSA+IG8ubWF4IC0gby5taW4pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignYG1pbmAgdG8gYG1heGAgcmFuZ2UgbXVzdCBhbGxvdyBmb3IgYXQgbGVhc3Qgb25lIHRpbWUgb3B0aW9uIHRoYXQgbWF0Y2hlcyBgdGltZUludGVydmFsYCcpO1xuICAgIH1cbiAgfVxuICBpZiAoby5kYXRlVmFsaWRhdG9yID09PSBubykgeyBvLmRhdGVWYWxpZGF0b3IgPSBGdW5jdGlvbi5wcm90b3R5cGU7IH1cbiAgaWYgKG8udGltZVZhbGlkYXRvciA9PT0gbm8pIHsgby50aW1lVmFsaWRhdG9yID0gRnVuY3Rpb24ucHJvdG90eXBlOyB9XG4gIGlmIChvLnRpbWVGb3JtYXQgPT09IG5vKSB7IG8udGltZUZvcm1hdCA9ICdISDptbSc7IH1cbiAgaWYgKG8ud2Vla1N0YXJ0ID09PSBubykgeyBvLndlZWtTdGFydCA9IG1vbWVudHVtLm1vbWVudCgpLndlZWtkYXkoMCkuZGF5KCk7IH1cbiAgaWYgKG8ud2Vla2RheUZvcm1hdCA9PT0gbm8pIHsgby53ZWVrZGF5Rm9ybWF0ID0gJ21pbic7IH1cbiAgaWYgKG8ud2Vla2RheUZvcm1hdCA9PT0gJ2xvbmcnKSB7XG4gICAgby53ZWVrZGF5Rm9ybWF0ID0gbW9tZW50dW0ubW9tZW50LndlZWtkYXlzKCk7XG4gIH0gZWxzZSBpZiAoby53ZWVrZGF5Rm9ybWF0ID09PSAnc2hvcnQnKSB7XG4gICAgby53ZWVrZGF5Rm9ybWF0ID0gbW9tZW50dW0ubW9tZW50LndlZWtkYXlzU2hvcnQoKTtcbiAgfSBlbHNlIGlmIChvLndlZWtkYXlGb3JtYXQgPT09ICdtaW4nKSB7XG4gICAgby53ZWVrZGF5Rm9ybWF0ID0gbW9tZW50dW0ubW9tZW50LndlZWtkYXlzTWluKCk7XG4gIH0gZWxzZSBpZiAoIUFycmF5LmlzQXJyYXkoby53ZWVrZGF5Rm9ybWF0KSB8fCBvLndlZWtkYXlGb3JtYXQubGVuZ3RoIDwgNykge1xuICAgIHRocm93IG5ldyBFcnJvcignYHdlZWtkYXlzYCBtdXN0IGJlIGBtaW5gLCBgc2hvcnRgLCBvciBgbG9uZ2AnKTtcbiAgfVxuICBpZiAoby5tb250aHNJbkNhbGVuZGFyID09PSBubykgeyBvLm1vbnRoc0luQ2FsZW5kYXIgPSAxOyB9XG4gIGlmIChvLm1vbnRoRm9ybWF0ID09PSBubykgeyBvLm1vbnRoRm9ybWF0ID0gJ01NTU0gWVlZWSc7IH1cbiAgaWYgKG8uZGF5Rm9ybWF0ID09PSBubykgeyBvLmRheUZvcm1hdCA9ICdERCc7IH1cbiAgaWYgKG8uc3R5bGVzID09PSBubykgeyBvLnN0eWxlcyA9IHt9OyB9XG5cbiAgby5zdHlsZXMuX2lzU3R5bGVzQ29uZmlndXJhdGlvbiA9IHRydWU7XG5cbiAgdmFyIHN0eWwgPSBvLnN0eWxlcztcbiAgaWYgKHN0eWwuYmFjayA9PT0gbm8pIHsgc3R5bC5iYWNrID0gJ3JkLWJhY2snOyB9XG4gIGlmIChzdHlsLmNvbnRhaW5lciA9PT0gbm8pIHsgc3R5bC5jb250YWluZXIgPSAncmQtY29udGFpbmVyJzsgfVxuICBpZiAoc3R5bC5wb3NpdGlvbmVkID09PSBubykgeyBzdHlsLnBvc2l0aW9uZWQgPSAncmQtY29udGFpbmVyLWF0dGFjaG1lbnQnOyB9XG4gIGlmIChzdHlsLmRhdGUgPT09IG5vKSB7IHN0eWwuZGF0ZSA9ICdyZC1kYXRlJzsgfVxuICBpZiAoc3R5bC5kYXlCb2R5ID09PSBubykgeyBzdHlsLmRheUJvZHkgPSAncmQtZGF5cy1ib2R5JzsgfVxuICBpZiAoc3R5bC5kYXlCb2R5RWxlbSA9PT0gbm8pIHsgc3R5bC5kYXlCb2R5RWxlbSA9ICdyZC1kYXktYm9keSc7IH1cbiAgaWYgKHN0eWwuZGF5UHJldk1vbnRoID09PSBubykgeyBzdHlsLmRheVByZXZNb250aCA9ICdyZC1kYXktcHJldi1tb250aCc7IH1cbiAgaWYgKHN0eWwuZGF5TmV4dE1vbnRoID09PSBubykgeyBzdHlsLmRheU5leHRNb250aCA9ICdyZC1kYXktbmV4dC1tb250aCc7IH1cbiAgaWYgKHN0eWwuZGF5RGlzYWJsZWQgPT09IG5vKSB7IHN0eWwuZGF5RGlzYWJsZWQgPSAncmQtZGF5LWRpc2FibGVkJzsgfVxuICBpZiAoc3R5bC5kYXlDb25jZWFsZWQgPT09IG5vKSB7IHN0eWwuZGF5Q29uY2VhbGVkID0gJ3JkLWRheS1jb25jZWFsZWQnOyB9XG4gIGlmIChzdHlsLmRheUhlYWQgPT09IG5vKSB7IHN0eWwuZGF5SGVhZCA9ICdyZC1kYXlzLWhlYWQnOyB9XG4gIGlmIChzdHlsLmRheUhlYWRFbGVtID09PSBubykgeyBzdHlsLmRheUhlYWRFbGVtID0gJ3JkLWRheS1oZWFkJzsgfVxuICBpZiAoc3R5bC5kYXlSb3cgPT09IG5vKSB7IHN0eWwuZGF5Um93ID0gJ3JkLWRheXMtcm93JzsgfVxuICBpZiAoc3R5bC5kYXlUYWJsZSA9PT0gbm8pIHsgc3R5bC5kYXlUYWJsZSA9ICdyZC1kYXlzJzsgfVxuICBpZiAoc3R5bC5tb250aCA9PT0gbm8pIHsgc3R5bC5tb250aCA9ICdyZC1tb250aCc7IH1cbiAgaWYgKHN0eWwubW9udGhMYWJlbCA9PT0gbm8pIHsgc3R5bC5tb250aExhYmVsID0gJ3JkLW1vbnRoLWxhYmVsJzsgfVxuICBpZiAoc3R5bC5uZXh0ID09PSBubykgeyBzdHlsLm5leHQgPSAncmQtbmV4dCc7IH1cbiAgaWYgKHN0eWwuc2VsZWN0ZWREYXkgPT09IG5vKSB7IHN0eWwuc2VsZWN0ZWREYXkgPSAncmQtZGF5LXNlbGVjdGVkJzsgfVxuICBpZiAoc3R5bC5zZWxlY3RlZFRpbWUgPT09IG5vKSB7IHN0eWwuc2VsZWN0ZWRUaW1lID0gJ3JkLXRpbWUtc2VsZWN0ZWQnOyB9XG4gIGlmIChzdHlsLnRpbWUgPT09IG5vKSB7IHN0eWwudGltZSA9ICdyZC10aW1lJzsgfVxuICBpZiAoc3R5bC50aW1lTGlzdCA9PT0gbm8pIHsgc3R5bC50aW1lTGlzdCA9ICdyZC10aW1lLWxpc3QnOyB9XG4gIGlmIChzdHlsLnRpbWVPcHRpb24gPT09IG5vKSB7IHN0eWwudGltZU9wdGlvbiA9ICdyZC10aW1lLW9wdGlvbic7IH1cblxuICByZXR1cm4gbztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBkZWZhdWx0cztcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gZG9tIChvcHRpb25zKSB7XG4gIHZhciBvID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYgKCFvLnR5cGUpIHsgby50eXBlID0gJ2Rpdic7IH1cbiAgdmFyIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG8udHlwZSk7XG4gIGlmIChvLmNsYXNzTmFtZSkgeyBlbGVtLmNsYXNzTmFtZSA9IG8uY2xhc3NOYW1lOyB9XG4gIGlmIChvLnRleHQpIHsgZWxlbS5pbm5lclRleHQgPSBlbGVtLnRleHRDb250ZW50ID0gby50ZXh0OyB9XG4gIGlmIChvLmF0dHJpYnV0ZXMpIHtcbiAgICBPYmplY3Qua2V5cyhvLmF0dHJpYnV0ZXMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBlbGVtLnNldEF0dHJpYnV0ZShrZXksIG8uYXR0cmlidXRlc1trZXldKTtcbiAgICB9KTtcbiAgfVxuICBpZiAoby5wYXJlbnQpIHsgby5wYXJlbnQuYXBwZW5kQ2hpbGQoZWxlbSk7IH1cbiAgcmV0dXJuIGVsZW07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZG9tO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIG5vO1xudmFyIGlrZXkgPSAnZGF0YS1yb21lLWlkJztcbnZhciBpbmRleCA9IFtdO1xuXG5mdW5jdGlvbiBmaW5kICh0aGluZykgeyAvLyBjYW4gYmUgYSBET00gZWxlbWVudCBvciBhIG51bWJlclxuICBpZiAodHlwZW9mIHRoaW5nICE9PSAnbnVtYmVyJyAmJiB0aGluZyAmJiB0aGluZy5nZXRBdHRyaWJ1dGUpIHtcbiAgICByZXR1cm4gZmluZCh0aGluZy5nZXRBdHRyaWJ1dGUoaWtleSkpO1xuICB9XG4gIHZhciBleGlzdGluZyA9IGluZGV4W3RoaW5nXTtcbiAgaWYgKGV4aXN0aW5nICE9PSBubykge1xuICAgIHJldHVybiBleGlzdGluZztcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gYXNzaWduIChlbGVtLCBpbnN0YW5jZSkge1xuICBlbGVtLnNldEF0dHJpYnV0ZShpa2V5LCBpbnN0YW5jZS5pZCA9IGluZGV4LnB1c2goaW5zdGFuY2UpIC0gMSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBmaW5kOiBmaW5kLFxuICBhc3NpZ246IGFzc2lnblxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNhbGVuZGFyID0gcmVxdWlyZSgnLi9jYWxlbmRhcicpO1xuXG5mdW5jdGlvbiBpbmxpbmUgKGVsZW0sIGNhbGVuZGFyT3B0aW9ucykge1xuICB2YXIgbyA9IGNhbGVuZGFyT3B0aW9ucyB8fCB7fTtcblxuICBvLmFwcGVuZFRvID0gZWxlbTtcbiAgby5hc3NvY2lhdGVkID0gZWxlbTtcblxuICB2YXIgY2FsID0gY2FsZW5kYXIobyk7XG4gIGNhbC5zaG93KCk7XG4gIHJldHVybiBjYWw7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5saW5lO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3Jvc3N2ZW50ID0gcmVxdWlyZSgnY3Jvc3N2ZW50Jyk7XG52YXIgYnVsbHNleWUgPSByZXF1aXJlKCdidWxsc2V5ZScpO1xudmFyIHRocm90dGxlID0gcmVxdWlyZSgnLi90aHJvdHRsZScpO1xudmFyIGNsb25lID0gcmVxdWlyZSgnLi9jbG9uZScpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi9kZWZhdWx0cycpO1xudmFyIGNhbGVuZGFyID0gcmVxdWlyZSgnLi9jYWxlbmRhcicpO1xudmFyIG1vbWVudHVtID0gcmVxdWlyZSgnLi9tb21lbnR1bScpO1xudmFyIGNsYXNzZXMgPSByZXF1aXJlKCcuL2NsYXNzZXMnKTtcblxuZnVuY3Rpb24gaW5wdXRDYWxlbmRhciAoaW5wdXQsIGNhbGVuZGFyT3B0aW9ucykge1xuICB2YXIgbyA9IGNhbGVuZGFyT3B0aW9ucyB8fCB7fTtcblxuICBvLmFzc29jaWF0ZWQgPSBpbnB1dDtcblxuICB2YXIgYXBpID0gY2FsZW5kYXIobyk7XG4gIHZhciB0aHJvdHRsZWRUYWtlSW5wdXQgPSB0aHJvdHRsZSh0YWtlSW5wdXQsIDMwKTtcbiAgdmFyIGlnbm9yZUludmFsaWRhdGlvbjtcbiAgdmFyIGlnbm9yZVNob3c7XG4gIHZhciBleWU7XG5cbiAgaW5pdChvKTtcblxuICByZXR1cm4gYXBpO1xuXG4gIGZ1bmN0aW9uIGluaXQgKGluaXRPcHRpb25zKSB7XG4gICAgbyA9IGRlZmF1bHRzKGluaXRPcHRpb25zIHx8IG8sIGFwaSk7XG5cbiAgICBjbGFzc2VzLmFkZChhcGkuY29udGFpbmVyLCBvLnN0eWxlcy5wb3NpdGlvbmVkKTtcbiAgICBjcm9zc3ZlbnQuYWRkKGFwaS5jb250YWluZXIsICdtb3VzZWRvd24nLCBjb250YWluZXJNb3VzZURvd24pO1xuICAgIGNyb3NzdmVudC5hZGQoYXBpLmNvbnRhaW5lciwgJ2NsaWNrJywgY29udGFpbmVyQ2xpY2spO1xuXG4gICAgYXBpLmdldERhdGUgPSB1bnJlcXVpcmUoYXBpLmdldERhdGUpO1xuICAgIGFwaS5nZXREYXRlU3RyaW5nID0gdW5yZXF1aXJlKGFwaS5nZXREYXRlU3RyaW5nKTtcbiAgICBhcGkuZ2V0TW9tZW50ID0gdW5yZXF1aXJlKGFwaS5nZXRNb21lbnQpO1xuXG4gICAgaWYgKG8uaW5pdGlhbFZhbHVlKSB7XG4gICAgICBpbnB1dC52YWx1ZSA9IG8uaW5pdGlhbFZhbHVlLmZvcm1hdChvLmlucHV0Rm9ybWF0KTtcbiAgICB9XG5cbiAgICBleWUgPSBidWxsc2V5ZShhcGkuY29udGFpbmVyLCBpbnB1dCk7XG4gICAgYXBpLm9uKCdkYXRhJywgdXBkYXRlSW5wdXQpO1xuICAgIGFwaS5vbignc2hvdycsIGV5ZS5yZWZyZXNoKTtcblxuICAgIGV2ZW50TGlzdGVuaW5nKCk7XG4gICAgdGhyb3R0bGVkVGFrZUlucHV0KCk7XG4gIH1cblxuICBmdW5jdGlvbiBkZXN0cm95ICgpIHtcbiAgICBldmVudExpc3RlbmluZyh0cnVlKTtcbiAgICBleWUuZGVzdHJveSgpO1xuICAgIGV5ZSA9IG51bGw7XG4gIH1cblxuICBmdW5jdGlvbiBldmVudExpc3RlbmluZyAocmVtb3ZlKSB7XG4gICAgdmFyIG9wID0gcmVtb3ZlID8gJ3JlbW92ZScgOiAnYWRkJztcbiAgICBjcm9zc3ZlbnRbb3BdKGlucHV0LCAnY2xpY2snLCBzaG93KTtcbiAgICBjcm9zc3ZlbnRbb3BdKGlucHV0LCAndG91Y2hlbmQnLCBzaG93KTtcbiAgICBjcm9zc3ZlbnRbb3BdKGlucHV0LCAnZm9jdXNpbicsIHNob3cpO1xuICAgIGNyb3NzdmVudFtvcF0oaW5wdXQsICdjaGFuZ2UnLCB0aHJvdHRsZWRUYWtlSW5wdXQpO1xuICAgIGNyb3NzdmVudFtvcF0oaW5wdXQsICdrZXlwcmVzcycsIHRocm90dGxlZFRha2VJbnB1dCk7XG4gICAgY3Jvc3N2ZW50W29wXShpbnB1dCwgJ2tleWRvd24nLCB0aHJvdHRsZWRUYWtlSW5wdXQpO1xuICAgIGNyb3NzdmVudFtvcF0oaW5wdXQsICdpbnB1dCcsIHRocm90dGxlZFRha2VJbnB1dCk7XG4gICAgaWYgKG8uaW52YWxpZGF0ZSkgeyBjcm9zc3ZlbnRbb3BdKGlucHV0LCAnYmx1cicsIGludmFsaWRhdGVJbnB1dCk7IH1cblxuICAgIGlmIChyZW1vdmUpIHtcbiAgICAgIGFwaS5vbmNlKCdyZWFkeScsIGluaXQpO1xuICAgICAgYXBpLm9mZignZGVzdHJveWVkJywgZGVzdHJveSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFwaS5vZmYoJ3JlYWR5JywgaW5pdCk7XG4gICAgICBhcGkub25jZSgnZGVzdHJveWVkJywgZGVzdHJveSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY29udGFpbmVyQ2xpY2sgKCkge1xuICAgIGlnbm9yZVNob3cgPSB0cnVlO1xuICAgIGlucHV0LmZvY3VzKCk7XG4gICAgaWdub3JlU2hvdyA9IGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gY29udGFpbmVyTW91c2VEb3duICgpIHtcbiAgICBpZ25vcmVJbnZhbGlkYXRpb24gPSB0cnVlO1xuICAgIHNldFRpbWVvdXQodW5pZ25vcmUsIDApO1xuXG4gICAgZnVuY3Rpb24gdW5pZ25vcmUgKCkge1xuICAgICAgaWdub3JlSW52YWxpZGF0aW9uID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW52YWxpZGF0ZUlucHV0ICgpIHtcbiAgICBpZiAoIWlnbm9yZUludmFsaWRhdGlvbiAmJiAhaXNFbXB0eSgpKSB7XG4gICAgICBhcGkuZW1pdFZhbHVlcygpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3cgKCkge1xuICAgIGlmIChpZ25vcmVTaG93KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGFwaS5zaG93KCk7XG4gIH1cblxuICBmdW5jdGlvbiB0YWtlSW5wdXQgKCkge1xuICAgIHZhciB2YWx1ZSA9IGlucHV0LnZhbHVlLnRyaW0oKTtcbiAgICBpZiAoaXNFbXB0eSgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBkYXRlID0gbW9tZW50dW0ubW9tZW50KHZhbHVlLCBvLmlucHV0Rm9ybWF0LCBvLnN0cmljdFBhcnNlKTtcbiAgICBhcGkuc2V0VmFsdWUoZGF0ZSk7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVJbnB1dCAoZGF0YSkge1xuICAgIGlucHV0LnZhbHVlID0gZGF0YTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRW1wdHkgKCkge1xuICAgIHJldHVybiBvLnJlcXVpcmVkID09PSBmYWxzZSAmJiBpbnB1dC52YWx1ZS50cmltKCkgPT09ICcnO1xuICB9XG5cbiAgZnVuY3Rpb24gdW5yZXF1aXJlIChmbikge1xuICAgIHJldHVybiBmdW5jdGlvbiBtYXliZSAoKSB7XG4gICAgICByZXR1cm4gaXNFbXB0eSgpID8gbnVsbCA6IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlucHV0Q2FsZW5kYXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGlzSW5wdXQgKGVsZW0pIHtcbiAgcmV0dXJuIGVsZW0gJiYgZWxlbS5ub2RlTmFtZSAmJiBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdpbnB1dCc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNJbnB1dDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gaXNNb21lbnQgKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodmFsdWUsICdfaXNBTW9tZW50T2JqZWN0Jyk7XG59XG5cbnZhciBhcGkgPSB7XG4gIG1vbWVudDogbnVsbCxcbiAgaXNNb21lbnQ6IGlzTW9tZW50XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFwaTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gbm9vcCAoKSB7fVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5vb3A7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtb21lbnR1bSA9IHJlcXVpcmUoJy4vbW9tZW50dW0nKTtcblxuZnVuY3Rpb24gcmF3IChkYXRlLCBmb3JtYXQpIHtcbiAgaWYgKHR5cGVvZiBkYXRlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBtb21lbnR1bS5tb21lbnQoZGF0ZSwgZm9ybWF0KTtcbiAgfVxuICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGRhdGUpID09PSAnW29iamVjdCBEYXRlXScpIHtcbiAgICByZXR1cm4gbW9tZW50dW0ubW9tZW50KGRhdGUpO1xuICB9XG4gIGlmIChtb21lbnR1bS5pc01vbWVudChkYXRlKSkge1xuICAgIHJldHVybiBkYXRlLmNsb25lKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFyc2UgKGRhdGUsIGZvcm1hdCkge1xuICB2YXIgbSA9IHJhdyhkYXRlLCB0eXBlb2YgZm9ybWF0ID09PSAnc3RyaW5nJyA/IGZvcm1hdCA6IG51bGwpO1xuICByZXR1cm4gbSAmJiBtLmlzVmFsaWQoKSA/IG0gOiBudWxsO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pZiAoIUFycmF5LnByb3RvdHlwZS5maWx0ZXIpIHtcbiAgQXJyYXkucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uIChmbiwgY3R4KSB7XG4gICAgdmFyIGYgPSBbXTtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHYsIGksIHQpIHtcbiAgICAgIGlmIChmbi5jYWxsKGN0eCwgdiwgaSwgdCkpIHsgZi5wdXNoKHYpOyB9XG4gICAgfSwgY3R4KTtcbiAgICByZXR1cm4gZjtcbiAgfTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaWYgKCFBcnJheS5wcm90b3R5cGUuZm9yRWFjaCkge1xuICBBcnJheS5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uIChmbiwgY3R4KSB7XG4gICAgaWYgKHRoaXMgPT09IHZvaWQgMCB8fCB0aGlzID09PSBudWxsIHx8IHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgdCA9IHRoaXM7XG4gICAgdmFyIGxlbiA9IHQubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChpIGluIHQpIHsgZm4uY2FsbChjdHgsIHRbaV0sIGksIHQpOyB9XG4gICAgfVxuICB9O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pZiAoIUFycmF5LnByb3RvdHlwZS5pbmRleE9mKSB7XG4gIEFycmF5LnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gKHdoYXQsIHN0YXJ0KSB7XG4gICAgaWYgKHRoaXMgPT09IHVuZGVmaW5lZCB8fCB0aGlzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aDtcbiAgICBzdGFydCA9ICtzdGFydCB8fCAwO1xuICAgIGlmIChNYXRoLmFicyhzdGFydCkgPT09IEluZmluaXR5KSB7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfSBlbHNlIGlmIChzdGFydCA8IDApIHtcbiAgICAgIHN0YXJ0ICs9IGxlbmd0aDtcbiAgICAgIGlmIChzdGFydCA8IDApIHsgc3RhcnQgPSAwOyB9XG4gICAgfVxuICAgIGZvciAoOyBzdGFydCA8IGxlbmd0aDsgc3RhcnQrKykge1xuICAgICAgaWYgKHRoaXNbc3RhcnRdID09PSB3aGF0KSB7XG4gICAgICAgIHJldHVybiBzdGFydDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5BcnJheS5pc0FycmF5IHx8IChBcnJheS5pc0FycmF5ID0gZnVuY3Rpb24gKGEpIHtcbiAgcmV0dXJuICcnICsgYSAhPT0gYSAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYSkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaWYgKCFBcnJheS5wcm90b3R5cGUubWFwKSB7XG4gIEFycmF5LnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiAoZm4sIGN0eCkge1xuICAgIHZhciBjb250ZXh0LCByZXN1bHQsIGk7XG5cbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd0aGlzIGlzIG51bGwgb3Igbm90IGRlZmluZWQnKTtcbiAgICB9XG5cbiAgICB2YXIgc291cmNlID0gT2JqZWN0KHRoaXMpO1xuICAgIHZhciBsZW4gPSBzb3VyY2UubGVuZ3RoID4+PiAwO1xuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihmbiArICcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgIGNvbnRleHQgPSBjdHg7XG4gICAgfVxuXG4gICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbik7XG4gICAgaSA9IDA7XG5cbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgaWYgKGkgaW4gc291cmNlKSB7XG4gICAgICAgIHJlc3VsdFtpXSA9IGZuLmNhbGwoY29udGV4dCwgc291cmNlW2ldLCBpLCBzb3VyY2UpO1xuICAgICAgfVxuICAgICAgaSsrO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pZiAoIUFycmF5LnByb3RvdHlwZS5zb21lKSB7XG4gIEFycmF5LnByb3RvdHlwZS5zb21lID0gZnVuY3Rpb24gKGZuLCBjdHgpIHtcbiAgICB2YXIgY29udGV4dCwgaTtcblxuICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3RoaXMgaXMgbnVsbCBvciBub3QgZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIHZhciBzb3VyY2UgPSBPYmplY3QodGhpcyk7XG4gICAgdmFyIGxlbiA9IHNvdXJjZS5sZW5ndGggPj4+IDA7XG5cbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGZuICsgJyBpcyBub3QgYSBmdW5jdGlvbicpO1xuICAgIH1cblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgY29udGV4dCA9IGN0eDtcbiAgICB9XG5cbiAgICBpID0gMDtcblxuICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICBpZiAoaSBpbiBzb3VyY2UpIHtcbiAgICAgICAgdmFyIHRlc3QgPSBmbi5jYWxsKGNvbnRleHQsIHNvdXJjZVtpXSwgaSwgc291cmNlKTtcbiAgICAgICAgaWYgKHRlc3QpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaSsrO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmlmICghRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQpIHtcbiAgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgIGlmICh0eXBlb2YgdGhpcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgLSB3aGF0IGlzIHRyeWluZyB0byBiZSBib3VuZCBpcyBub3QgY2FsbGFibGUnKTtcbiAgICB9XG4gICAgdmFyIGN1cnJpZWQgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHZhciBvcmlnaW5hbCA9IHRoaXM7XG4gICAgdmFyIE5vT3AgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICB2YXIgYm91bmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgY3R4ID0gdGhpcyBpbnN0YW5jZW9mIE5vT3AgJiYgY29udGV4dCA/IHRoaXMgOiBjb250ZXh0O1xuICAgICAgdmFyIGFyZ3MgPSBjdXJyaWVkLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgIHJldHVybiBvcmlnaW5hbC5hcHBseShjdHgsIGFyZ3MpO1xuICAgIH07XG4gICAgTm9PcC5wcm90b3R5cGUgPSB0aGlzLnByb3RvdHlwZTtcbiAgICBib3VuZC5wcm90b3R5cGUgPSBuZXcgTm9PcCgpO1xuICAgIHJldHVybiBib3VuZDtcbiAgfTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgaGFzRG9udEVudW1CdWcgPSAhKHsgdG9TdHJpbmc6IG51bGwgfSkucHJvcGVydHlJc0VudW1lcmFibGUoJ3RvU3RyaW5nJyk7XG52YXIgZG9udEVudW1zID0gW1xuICAndG9TdHJpbmcnLFxuICAndG9Mb2NhbGVTdHJpbmcnLFxuICAndmFsdWVPZicsXG4gICdoYXNPd25Qcm9wZXJ0eScsXG4gICdpc1Byb3RvdHlwZU9mJyxcbiAgJ3Byb3BlcnR5SXNFbnVtZXJhYmxlJyxcbiAgJ2NvbnN0cnVjdG9yJ1xuXTtcbnZhciBkb250RW51bXNMZW5ndGggPSBkb250RW51bXMubGVuZ3RoO1xuXG5pZiAoIU9iamVjdC5rZXlzKSB7XG4gIE9iamVjdC5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnICYmICh0eXBlb2Ygb2JqICE9PSAnZnVuY3Rpb24nIHx8IG9iaiA9PT0gbnVsbCkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ09iamVjdC5rZXlzIGNhbGxlZCBvbiBub24tb2JqZWN0Jyk7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdCA9IFtdLCBwcm9wLCBpO1xuXG4gICAgZm9yIChwcm9wIGluIG9iaikge1xuICAgICAgaWYgKGhhc093bi5jYWxsKG9iaiwgcHJvcCkpIHtcbiAgICAgICAgcmVzdWx0LnB1c2gocHJvcCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhc0RvbnRFbnVtQnVnKSB7XG4gICAgICBmb3IgKGkgPSAwOyBpIDwgZG9udEVudW1zTGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGhhc093bi5jYWxsKG9iaiwgZG9udEVudW1zW2ldKSkge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKGRvbnRFbnVtc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaWYgKCFTdHJpbmcucHJvdG90eXBlLnRyaW0pIHtcbiAgU3RyaW5nLnByb3RvdHlwZS50cmltID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTtcbiAgfTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gdGhlc2UgYXJlIG9ubHkgcmVxdWlyZWQgZm9yIElFIDwgOVxuLy8gbWF5YmUgbW92ZSB0byBJRS1zcGVjaWZpYyBkaXN0cm8/XG5yZXF1aXJlKCcuL3BvbHlmaWxscy9mdW5jdGlvbi5iaW5kJyk7XG5yZXF1aXJlKCcuL3BvbHlmaWxscy9hcnJheS5mb3JlYWNoJyk7XG5yZXF1aXJlKCcuL3BvbHlmaWxscy9hcnJheS5tYXAnKTtcbnJlcXVpcmUoJy4vcG9seWZpbGxzL2FycmF5LmZpbHRlcicpO1xucmVxdWlyZSgnLi9wb2x5ZmlsbHMvYXJyYXkuaXNhcnJheScpO1xucmVxdWlyZSgnLi9wb2x5ZmlsbHMvYXJyYXkuaW5kZXhvZicpO1xucmVxdWlyZSgnLi9wb2x5ZmlsbHMvYXJyYXkuc29tZScpO1xucmVxdWlyZSgnLi9wb2x5ZmlsbHMvc3RyaW5nLnRyaW0nKTtcbnJlcXVpcmUoJy4vcG9seWZpbGxzL29iamVjdC5rZXlzJyk7XG5cbnZhciBjb3JlID0gcmVxdWlyZSgnLi9jb3JlJyk7XG52YXIgaW5kZXggPSByZXF1aXJlKCcuL2luZGV4Jyk7XG52YXIgdXNlID0gcmVxdWlyZSgnLi91c2UnKTtcblxuY29yZS51c2UgPSB1c2UuYmluZChjb3JlKTtcbmNvcmUuZmluZCA9IGluZGV4LmZpbmQ7XG5jb3JlLnZhbCA9IHJlcXVpcmUoJy4vdmFsaWRhdG9ycycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvcmU7XG4iLCJ2YXIgcm9tZSA9IHJlcXVpcmUoJy4vcm9tZScpO1xudmFyIG1vbWVudHVtID0gcmVxdWlyZSgnLi9tb21lbnR1bScpO1xuXG5yb21lLnVzZShnbG9iYWwubW9tZW50KTtcblxuaWYgKG1vbWVudHVtLm1vbWVudCA9PT0gdm9pZCAwKSB7XG4gIHRocm93IG5ldyBFcnJvcigncm9tZSBkZXBlbmRzIG9uIG1vbWVudC5qcywgeW91IGNhbiBnZXQgaXQgYXQgaHR0cDovL21vbWVudGpzLmNvbSwgb3IgeW91IGNvdWxkIHVzZSB0aGUgYnVuZGxlZCBkaXN0cmlidXRpb24gZmlsZSBpbnN0ZWFkLicpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJvbWU7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIHRleHQgKGVsZW0sIHZhbHVlKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgZWxlbS5pbm5lclRleHQgPSBlbGVtLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH1cbiAgcmV0dXJuIGVsZW0uaW5uZXJUZXh0IHx8IGVsZW0udGV4dENvbnRlbnQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGV4dDtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0aHJvdHRsZSAoZm4sIGJvdW5kYXJ5KSB7XG4gIHZhciBsYXN0ID0gLUluZmluaXR5O1xuICB2YXIgdGltZXI7XG4gIHJldHVybiBmdW5jdGlvbiBib3VuY2VkICgpIHtcbiAgICBpZiAodGltZXIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdW5ib3VuZCgpO1xuXG4gICAgZnVuY3Rpb24gdW5ib3VuZCAoKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgdmFyIG5leHQgPSBsYXN0ICsgYm91bmRhcnk7XG4gICAgICB2YXIgbm93ID0gK25ldyBEYXRlKCk7XG4gICAgICBpZiAobm93ID4gbmV4dCkge1xuICAgICAgICBsYXN0ID0gbm93O1xuICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KHVuYm91bmQsIG5leHQgLSBub3cpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBtb21lbnR1bSA9IHJlcXVpcmUoJy4vbW9tZW50dW0nKTtcblxuZnVuY3Rpb24gdXNlIChtb21lbnQpIHtcbiAgdGhpcy5tb21lbnQgPSBtb21lbnR1bS5tb21lbnQgPSBtb21lbnQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdXNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW5kZXggPSByZXF1aXJlKCcuL2luZGV4Jyk7XG52YXIgcGFyc2UgPSByZXF1aXJlKCcuL3BhcnNlJyk7XG52YXIgYXNzb2NpYXRpb24gPSByZXF1aXJlKCcuL2Fzc29jaWF0aW9uJyk7XG5cbmZ1bmN0aW9uIGNvbXBhcmVCdWlsZGVyIChjb21wYXJlKSB7XG4gIHJldHVybiBmdW5jdGlvbiBmYWN0b3J5ICh2YWx1ZSkge1xuICAgIHZhciBmaXhlZCA9IHBhcnNlKHZhbHVlKTtcblxuICAgIHJldHVybiBmdW5jdGlvbiB2YWxpZGF0ZSAoZGF0ZSkge1xuICAgICAgdmFyIGNhbCA9IGluZGV4LmZpbmQodmFsdWUpO1xuICAgICAgdmFyIGxlZnQgPSBwYXJzZShkYXRlKTtcbiAgICAgIHZhciByaWdodCA9IGZpeGVkIHx8IGNhbCAmJiBjYWwuZ2V0TW9tZW50KCk7XG4gICAgICBpZiAoIXJpZ2h0KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKGNhbCkge1xuICAgICAgICBhc3NvY2lhdGlvbi5hZGQodGhpcywgY2FsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb21wYXJlKGxlZnQsIHJpZ2h0KTtcbiAgICB9O1xuICB9O1xufVxuXG5mdW5jdGlvbiByYW5nZUJ1aWxkZXIgKGhvdywgY29tcGFyZSkge1xuICByZXR1cm4gZnVuY3Rpb24gZmFjdG9yeSAoc3RhcnQsIGVuZCkge1xuICAgIHZhciBkYXRlcztcbiAgICB2YXIgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHN0YXJ0KSkge1xuICAgICAgZGF0ZXMgPSBzdGFydDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGxlbiA9PT0gMSkge1xuICAgICAgICBkYXRlcyA9IFtzdGFydF07XG4gICAgICB9IGVsc2UgaWYgKGxlbiA9PT0gMikge1xuICAgICAgICBkYXRlcyA9IFtbc3RhcnQsIGVuZF1dO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiB2YWxpZGF0ZSAoZGF0ZSkge1xuICAgICAgcmV0dXJuIGRhdGVzLm1hcChleHBhbmQuYmluZCh0aGlzKSlbaG93XShjb21wYXJlLmJpbmQodGhpcywgZGF0ZSkpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBleHBhbmQgKHZhbHVlKSB7XG4gICAgICB2YXIgc3RhcnQsIGVuZDtcbiAgICAgIHZhciBjYWwgPSBpbmRleC5maW5kKHZhbHVlKTtcbiAgICAgIGlmIChjYWwpIHtcbiAgICAgICAgc3RhcnQgPSBlbmQgPSBjYWwuZ2V0TW9tZW50KCk7XG4gICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHN0YXJ0ID0gdmFsdWVbMF07IGVuZCA9IHZhbHVlWzFdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhcnQgPSBlbmQgPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChjYWwpIHtcbiAgICAgICAgYXNzb2NpYXRpb24uYWRkKGNhbCwgdGhpcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGFydDogcGFyc2Uoc3RhcnQpLnN0YXJ0T2YoJ2RheScpLnRvRGF0ZSgpLFxuICAgICAgICBlbmQ6IHBhcnNlKGVuZCkuZW5kT2YoJ2RheScpLnRvRGF0ZSgpXG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn1cblxudmFyIGFmdGVyRXEgID0gY29tcGFyZUJ1aWxkZXIoZnVuY3Rpb24gKGxlZnQsIHJpZ2h0KSB7IHJldHVybiBsZWZ0ID49IHJpZ2h0OyB9KTtcbnZhciBhZnRlciAgICA9IGNvbXBhcmVCdWlsZGVyKGZ1bmN0aW9uIChsZWZ0LCByaWdodCkgeyByZXR1cm4gbGVmdCAgPiByaWdodDsgfSk7XG52YXIgYmVmb3JlRXEgPSBjb21wYXJlQnVpbGRlcihmdW5jdGlvbiAobGVmdCwgcmlnaHQpIHsgcmV0dXJuIGxlZnQgPD0gcmlnaHQ7IH0pO1xudmFyIGJlZm9yZSAgID0gY29tcGFyZUJ1aWxkZXIoZnVuY3Rpb24gKGxlZnQsIHJpZ2h0KSB7IHJldHVybiBsZWZ0ICA8IHJpZ2h0OyB9KTtcblxudmFyIGV4Y2VwdCAgID0gcmFuZ2VCdWlsZGVyKCdldmVyeScsIGZ1bmN0aW9uIChsZWZ0LCByaWdodCkgeyByZXR1cm4gcmlnaHQuc3RhcnQgID4gbGVmdCB8fCByaWdodC5lbmQgIDwgbGVmdDsgfSk7XG52YXIgb25seSAgICAgPSByYW5nZUJ1aWxkZXIoJ3NvbWUnLCAgZnVuY3Rpb24gKGxlZnQsIHJpZ2h0KSB7IHJldHVybiByaWdodC5zdGFydCA8PSBsZWZ0ICYmIHJpZ2h0LmVuZCA+PSBsZWZ0OyB9KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGFmdGVyRXE6IGFmdGVyRXEsXG4gIGFmdGVyOiBhZnRlcixcbiAgYmVmb3JlRXE6IGJlZm9yZUVxLFxuICBiZWZvcmU6IGJlZm9yZSxcbiAgZXhjZXB0OiBleGNlcHQsXG4gIG9ubHk6IG9ubHlcbn07XG4iXX0=
