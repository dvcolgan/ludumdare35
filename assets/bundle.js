(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/ieee754/index.js","/node_modules/ieee754")

},{"_process":2,"buffer":4}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
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
    var timeout = setTimeout(cleanUpNextTick);
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
    clearTimeout(timeout);
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
        setTimeout(drainQueue, 0);
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

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/process/browser.js","/node_modules/process")

},{"_process":2,"buffer":4}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
'use strict'

exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

function init () {
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i]
    revLookup[code.charCodeAt(i)] = i
  }

  revLookup['-'.charCodeAt(0)] = 62
  revLookup['_'.charCodeAt(0)] = 63
}

init()

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/watchify/node_modules/base64-js/lib/b64.js","/node_modules/watchify/node_modules/base64-js/lib")

},{"_process":2,"buffer":4}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(array)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/watchify/node_modules/buffer/index.js","/node_modules/watchify/node_modules/buffer")

},{"_process":2,"base64-js":3,"buffer":4,"ieee754":1,"isarray":5}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/node_modules/watchify/node_modules/buffer/node_modules/isarray/index.js","/node_modules/watchify/node_modules/buffer/node_modules/isarray")

},{"_process":2,"buffer":4}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var BootState, GameState, HowToPlayState, IntroState, LevelSelectState, MAX_HEALTH, PreloadState, SCREEN_HEIGHT, SCREEN_WIDTH, TitleState, WinLoseState, game,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

SCREEN_WIDTH = 1280;

SCREEN_HEIGHT = 720;

MAX_HEALTH = 1000;

window.selectedLevel = 'arctic';

window.player2 = false;

BootState = (function() {
  function BootState() {}

  BootState.prototype.preload = function() {
    this.game.load.spritesheet('healthbar-background', 'healthbar-background.png', 560, 50, 3);
    return this.game.load.image('healthbar-green', 'healthbar-green.png');
  };

  BootState.prototype.create = function() {
    return this.game.state.start('preload');
  };

  return BootState;

})();

PreloadState = (function() {
  function PreloadState() {
    this.fileComplete = bind(this.fileComplete, this);
  }

  PreloadState.prototype.preload = function() {
    var barX, barY, i, len, levelName, ref, results;
    this.game.load.onFileComplete.add(this.fileComplete);
    this.game.stage.backgroundColor = '#cccccc';
    barX = SCREEN_WIDTH / 2 - 560 / 2;
    barY = SCREEN_HEIGHT / 2 - 50 / 2;
    this.progressbarBackground = this.game.add.sprite(barX, barY, 'healthbar-background');
    this.progressbarBackground.animations.add('glow', [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2], 10, true);
    this.progressbarBackground.animations.play('glow');
    this.progressbarGreen = this.game.add.sprite(barX + 4, barY + 4, 'healthbar-green');
    this.progressbarGreen.scale.x = 0;
    this.game.load.spritesheet('player1', 'player1.png', 116, 160, 36);
    this.game.load.spritesheet('player2', 'player2.png', 180, 316, 21);
    this.game.load.image('title', 'title.jpg');
    this.game.load.image('how-to-play', 'how-to-play.jpg');
    this.game.load.image('how-to-play-ai', 'how-to-play-ai.jpg');
    this.game.load.audio('bgm', ['audio/bgm.mp3', 'audio/bgm.ogg']);
    this.game.load.audio('select-a-stage', ['audio/select-a-stage.mp3', 'audio/select-a-stage.ogg']);
    this.game.load.audio('fight', ['audio/fight.mp3', 'audio/fight.ogg']);
    this.game.load.audio('mortal-ro-sham-bo', ['audio/mortal-ro-sham-bo.mp3', 'audio/mortal-ro-sham-bo.ogg']);
    this.game.load.audio('rock-wins', ['audio/rock-wins.mp3', 'audio/rock-wins.ogg']);
    this.game.load.audio('paper-wins', ['audio/paper-wins.mp3', 'audio/paper-wins.ogg']);
    this.game.load.audio('scissors-wins', ['audio/scissors-wins.mp3', 'audio/scissors-wins.ogg']);
    this.game.load.image('intro1', 'intro1.png');
    this.game.load.image('intro2', 'intro1.png');
    this.game.load.image('intro3', 'intro2.png');
    this.game.load.image('intro4', 'intro3.png');
    this.game.load.image('intro5', 'intro4.png');
    this.game.load.audio('intro-talk1', ['audio/intro-talk1.mp3', 'audio/intro-talk1.mp3']);
    this.game.load.audio('intro-talk2', ['audio/intro-talk2.mp3', 'audio/intro-talk2.mp3']);
    this.game.load.audio('intro-talk3', ['audio/intro-talk3.mp3', 'audio/intro-talk3.mp3']);
    this.game.load.audio('intro-talk4', ['audio/intro-talk4.mp3', 'audio/intro-talk4.mp3']);
    this.game.load.audio('intro-talk5', ['audio/intro-talk5.mp3', 'audio/intro-talk5.mp3']);
    this.game.load.spritesheet('rock', 'rock.png', 294, 250, 3);
    this.game.load.spritesheet('paper', 'paper.png', 300, 169, 3);
    this.game.load.spritesheet('scissors', 'scissors.png', 300, 168, 3);
    this.game.load.image('sink', 'backgrounds/sink.png');
    ref = ['arctic', 'city', 'forest', 'kitchen', 'stage', 'table'];
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      levelName = ref[i];
      this.game.load.image(levelName, "backgrounds/" + levelName + ".jpg");
      results.push(this.game.load.image(levelName + '-thumbnail', "backgrounds/" + levelName + "-thumbnail.jpg"));
    }
    return results;
  };

  PreloadState.prototype.create = function() {
    this.game.add.audio('bgm').play('', 0, 0.7, true);
    return this.game.state.start('intro');
  };

  PreloadState.prototype.fileComplete = function(progress, cacheKey, success, totalLoaded, totalFiles) {
    return this.progressbarGreen.scale.x = progress / 100;
  };

  return PreloadState;

})();

IntroState = (function() {
  function IntroState() {}

  IntroState.prototype.showScene = function(which) {
    if (this.background != null) {
      this.background.destroy();
    }
    if (this.text != null) {
      this.text.destroy();
    }
    this.background = this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'intro' + which);
    this.game.add.audio('intro-talk' + which).play();
    return this.text = this.game.add.text(30, 30, this.texts[which - 1], {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 6,
      font: '80px bold monospace'
    });
  };

  IntroState.prototype.create = function() {
    this.durations = [2500, 2500, 2500, 2500, 3500];
    this.texts = ['One slice left...', 'I only had one. It\'s mine!', 'Yours was half the pie!', 'Only one way to settle this...', 'RO SHAM BO!!!'];
    this.background = null;
    this.text = null;
    this.current = 1;
    this.showScene(this.current);
    this.switchTime = this.game.time.now + this.durations[0];
    return this.spacebar = this.game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
  };

  IntroState.prototype.update = function() {
    if (this.game.time.now >= this.switchTime) {
      this.current++;
      if (this.current >= 6) {
        this.game.state.start('title');
      } else {
        this.switchTime = this.game.time.now + this.durations[this.current - 1];
        this.showScene(this.current, '');
      }
    }
    if (this.spacebar.justDown) {
      return this.game.state.start('title');
    }
  };

  return IntroState;

})();

TitleState = (function() {
  function TitleState() {}

  TitleState.prototype.create = function() {
    this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'title');
    this.startText = this.game.add.text(30, 400, 'DEPRESS\nSPACEBAR\nTO FIGHT\nTHE COMPUTER', {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 6,
      font: '60px bold monospace'
    });
    this.startText2 = this.game.add.text(980, 320, 'DEPRESS\nENTER\nTO FIGHT\nA FRIEND\nHOTSEAT', {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 6,
      font: '60px bold monospace'
    });
    this.flipperTime = this.game.time.now + 700;
    this.spacebar = this.game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
    this.enter = this.game.input.keyboard.addKey(Phaser.KeyCode.ENTER);
    return this.game.add.audio('mortal-ro-sham-bo').play();
  };

  TitleState.prototype.update = function() {
    if (this.game.time.now >= this.flipperTime) {
      this.startText.visible = !this.startText.visible;
      this.startText2.visible = !this.startText2.visible;
      if (this.startText.visible) {
        this.flipperTime = this.game.time.now + 700;
      } else {
        this.flipperTime = this.game.time.now + 200;
      }
    }
    if (this.spacebar.justDown) {
      window.player2 = false;
      this.game.state.start('how-to-play');
    }
    if (this.enter.justDown) {
      window.player2 = true;
      return this.game.state.start('how-to-play');
    }
  };

  return TitleState;

})();

HowToPlayState = (function() {
  function HowToPlayState() {}

  HowToPlayState.prototype.create = function() {
    this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, (window.player2 ? 'how-to-play' : 'how-to-play-ai'));
    return this.spacebar = this.game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
  };

  HowToPlayState.prototype.update = function() {
    if (this.spacebar.justDown) {
      return this.game.state.start('levelselect');
    }
  };

  return HowToPlayState;

})();

LevelSelectState = (function() {
  function LevelSelectState() {}

  LevelSelectState.prototype.create = function() {
    var col, row, sprite, x, y;
    this.game.add.audio('select-a-stage').play();
    this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 'sink');
    this.levels = [['arctic', 'city', 'forest'], ['kitchen', 'stage', 'table']];
    this.stageSprites = (function() {
      var i, results;
      results = [];
      for (row = i = 0; i < 2; row = ++i) {
        results.push((function() {
          var j, results1;
          results1 = [];
          for (col = j = 0; j < 3; col = ++j) {
            x = SCREEN_WIDTH / 2 - 400 + col * 300;
            y = 225 + row * 250;
            sprite = this.game.add.sprite(x + 100, y + 100, this.levels[row][col] + '-thumbnail');
            sprite.anchor.setTo(0.5, 0.5);
            this.game.add.text(x + 10, y + 150, this.levels[row][col].toUpperCase(), {
              fill: 'white',
              stroke: 'black',
              strokeThickness: 6,
              font: '30px bold monospace'
            });
            results1.push(sprite);
          }
          return results1;
        }).call(this));
      }
      return results;
    }).call(this);
    this.currentCol = 0;
    this.currentRow = 0;
    this.title = this.game.add.text(0, 0, 'SELECT STAGE', {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 12,
      boundsAlignH: 'center',
      boundsAlignV: 'middle',
      font: '100px bold monospace'
    });
    this.title.setTextBounds(0, 0, SCREEN_WIDTH, 120);
    this.directions = this.game.add.text(0, 80, 'Choose with arrows, space to start', {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 6,
      boundsAlignH: 'center',
      boundsAlignV: 'middle',
      font: '48px bold monospace'
    });
    this.directions.setTextBounds(0, 0, SCREEN_WIDTH, 120);
    this.keys = this.game.input.keyboard.addKeys({
      spacebar: Phaser.KeyCode.SPACEBAR,
      up: Phaser.KeyCode.UP,
      down: Phaser.KeyCode.DOWN,
      left: Phaser.KeyCode.LEFT,
      right: Phaser.KeyCode.RIGHT
    });
    return this.highlight();
  };

  LevelSelectState.prototype.highlight = function() {
    var col, i, len, ref, results, row, rowData, sprite;
    ref = this.stageSprites;
    results = [];
    for (row = i = 0, len = ref.length; i < len; row = ++i) {
      rowData = ref[row];
      results.push((function() {
        var j, len1, results1;
        results1 = [];
        for (col = j = 0, len1 = rowData.length; j < len1; col = ++j) {
          sprite = rowData[col];
          if (!(col === this.currentCol && row === this.currentRow)) {
            sprite.tint = 0x666666;
            sprite.scale.x = 1;
            results1.push(sprite.scale.y = 1);
          } else {
            sprite.tint = 0xffffff;
            sprite.scale.x = 1.1;
            sprite.scale.y = 1.1;
            results1.push(window.selectedLevel = this.levels[row][col]);
          }
        }
        return results1;
      }).call(this));
    }
    return results;
  };

  LevelSelectState.prototype.update = function() {
    if (this.keys.spacebar.justDown) {
      this.game.state.start('game');
    }
    if (this.keys.left.justDown) {
      this.currentCol--;
      if (this.currentCol < 0) {
        this.currentCol = 0;
      }
      this.highlight();
    }
    if (this.keys.right.justDown) {
      this.currentCol++;
      if (this.currentCol > 2) {
        this.currentCol = 2;
      }
      this.highlight();
    }
    if (this.keys.up.justDown) {
      this.currentRow--;
      if (this.currentRow < 0) {
        this.currentRow = 0;
      }
      this.highlight();
    }
    if (this.keys.down.justDown) {
      this.currentRow++;
      if (this.currentRow > 1) {
        this.currentRow = 1;
      }
      return this.highlight();
    }
  };

  return LevelSelectState;

})();

GameState = (function() {
  function GameState() {
    this.doFinished = bind(this.doFinished, this);
  }

  GameState.prototype.makePlayer = function(x, y, healthbarX, healthbarY, spriteKey, animations) {
    var attack, health, healthbarBackground, healthbarGreen, sprite;
    sprite = this.game.add.sprite(x, y, spriteKey);
    sprite.animations.add('pose', animations.pose, 5, true);
    sprite.animations.add('idle', animations.idle, 5, true);
    sprite.animations.add('paper', animations.paper, 5, true);
    sprite.animations.add('scissors', animations.scissors, 5, true);
    sprite.animations.add('rock', animations.rock, 5, true);
    sprite.animations.add('hit', animations.hit, 10, false);
    sprite.animations.add('die', animations.die, 10, false);
    sprite.animations.add('transform', animations.transform, 10, false);
    sprite.anchor.setTo(0.5, 0.5);
    attack = 'idle';
    sprite.animations.play('pose');
    health = MAX_HEALTH;
    healthbarBackground = this.game.add.sprite(healthbarX, healthbarY, 'healthbar-background');
    healthbarBackground.animations.add('glow', [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2], 10, true);
    healthbarBackground.animations.play('glow');
    healthbarGreen = this.game.add.sprite(healthbarX + 4, healthbarY + 4, 'healthbar-green');
    return {
      sprite: sprite,
      attack: attack,
      health: health,
      healthbarBackground: healthbarBackground,
      healthbarGreen: healthbarGreen
    };
  };

  GameState.prototype.create = function() {
    this.keys = this.game.input.keyboard.addKeys({
      spacebar: Phaser.KeyCode.SPACEBAR,
      p1_rock: Phaser.KeyCode.ONE,
      p1_paper: Phaser.KeyCode.TWO,
      p1_scissors: Phaser.KeyCode.THREE,
      p2_rock: Phaser.KeyCode.LEFT,
      p2_paper: Phaser.KeyCode.DOWN,
      p2_scissors: Phaser.KeyCode.RIGHT
    });
    this.game.time.desiredFps = 60;
    this.game.groups = {};
    this.game.groups.background = this.game.add.group();
    this.game.groups.actors = this.game.add.group();
    this.game.groups.player = this.game.add.group();
    this.game.groups.ui = this.game.add.group();
    this.background = this.game.add.tileSprite(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, selectedLevel);
    this.player1 = this.makePlayer(SCREEN_WIDTH / 2 - 200, SCREEN_HEIGHT / 2 + 40, 40, 40, 'player1', {
      pose: [31, 32, 33],
      idle: [6, 7, 9],
      paper: [31, 24],
      scissors: [11, 12, 14],
      rock: [20],
      hit: [21, 22],
      die: [21, 22],
      transform: [16, 17, 18, 19, 18, 19, 18, 19, 18]
    });
    this.player1.sprite.scale.x = -3;
    this.player1.sprite.scale.y = 3;
    this.player2 = this.makePlayer(SCREEN_WIDTH / 2 + 200, SCREEN_HEIGHT / 2 + 40, SCREEN_WIDTH / 2 + 40, 40, 'player2', {
      pose: [3, 4],
      idle: [15, 16, 17],
      paper: [7, 6, 7],
      scissors: [3, 4, 5],
      rock: [0, 1, 2],
      hit: [9, 10, 11],
      die: [9, 10, 11],
      transform: [12, 5, 14, 13, 5, 13, 5, 13, 5]
    });
    this.player2.sprite.scale.x = 1.7;
    this.player2.sprite.scale.y = 1.7;
    this.p1hud = this.makeHud(this.player1.sprite.x + 100, this.player1.sprite.y - 50, false);
    this.p2hud = this.makeHud(this.player2.sprite.x - 100, this.player2.sprite.y - 50, true);
    return this.doCountdown();
  };

  GameState.prototype.makeHud = function(x, y, flip) {
    var paper, rock, scissors;
    console.log(x, y);
    rock = this.game.add.sprite(x, y, 'rock');
    rock.animations.add('run', [0, 1, 2], 3, true);
    rock.animations.play('run');
    rock.anchor.set(0.5);
    rock.scale.x = 0.4 * (flip ? -1 : 1);
    rock.scale.y = 0.4;
    paper = this.game.add.sprite(x, y, 'paper');
    paper.animations.add('run', [0, 1, 2], 3, true);
    paper.animations.play('run');
    paper.anchor.set(0.5);
    paper.scale.x = 0.4 * (flip ? -1 : 1);
    paper.scale.y = 0.4;
    scissors = this.game.add.sprite(x, y, 'scissors');
    scissors.animations.add('run', [0, 1, 2], 3, true);
    scissors.animations.play('run');
    scissors.anchor.set(0.5);
    scissors.scale.x = 0.4 * (flip ? -1 : 1);
    scissors.scale.y = 0.4;
    return {
      rock: rock,
      paper: paper,
      scissors: scissors,
      idle: {
        visible: true
      }
    };
  };

  GameState.prototype.doCountdown = function() {
    this.combatState = 'countdown';
    this.startTime = this.game.time.now + 5000;
    this.countdownDisplay = this.game.add.text(1, 0, '', {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 12,
      boundsAlignH: 'center',
      boundsAlignV: 'middle',
      font: '300px bold monospace'
    });
    return this.countdownDisplay.setTextBounds(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  };

  GameState.prototype.doStartRound = function() {
    this.player1.sprite.animations.play('idle');
    this.player2.sprite.animations.play('idle');
    this.countdownDisplay.destroy();
    this.combatState = 'during';
    return this.nextAIAttack = null;
  };

  GameState.prototype.doEndRound = function() {
    this.player1.healthbarGreen.scale.x = this.player1.health / MAX_HEALTH;
    this.player2.healthbarGreen.scale.x = this.player2.health / MAX_HEALTH;
    if (this.player1.health <= 0) {
      this.player1.sprite.animations.play('die');
      this.player2.sprite.animations.play('transform').onComplete.add((function(_this) {
        return function() {
          var final, tween;
          _this.game.add.audio(_this.player2.attack + '-wins').play();
          final = _this.game.add.sprite(_this.player2.sprite.x, _this.player2.sprite.y, _this.player2.attack);
          final.anchor.setTo(0.5);
          final.scale.setTo(-2, 2);
          final.animations.add('transform', [0, 1, 2], 2, true);
          tween = _this.game.add.tween(final).to({
            x: _this.player1.sprite.x
          });
          tween.onComplete.add(function() {
            return _this.doFinished();
          });
          tween.start();
          final.animations.play('transform');
          return _this.player2.sprite.destroy();
        };
      })(this));
    } else if (this.player2.health <= 0) {
      this.player2.sprite.animations.play('die');
      this.player1.sprite.animations.play('transform').onComplete.add((function(_this) {
        return function() {
          var final, tween;
          _this.game.add.audio(_this.player1.attack + '-wins').play();
          final = _this.game.add.sprite(_this.player1.sprite.x, _this.player1.sprite.y, _this.player1.attack);
          final.anchor.setTo(0.5);
          final.scale.setTo(2, 2);
          final.animations.add('transform', [0, 1, 2], 2, true);
          tween = _this.game.add.tween(final).to({
            x: _this.player2.sprite.x
          });
          tween.onComplete.add(function() {
            return _this.doFinished();
          });
          tween.start();
          final.animations.play('transform');
          return _this.player1.sprite.destroy();
        };
      })(this));
    }
    this.combatState = 'over';
    this.finalText = this.game.add.text(0, 0, 'HIT SPACE TO PLAY AGAIN', {
      fill: 'white',
      stroke: 'black',
      strokeThickness: 12,
      boundsAlignH: 'center',
      boundsAlignV: 'middle',
      font: '90px bold monospace'
    });
    return this.finalText.setTextBounds(0, SCREEN_HEIGHT - 120, SCREEN_WIDTH, 120);
  };

  GameState.prototype.doFinished = function() {
    return this.combatState = 'finished';
  };

  GameState.prototype.updateHuds = function() {
    if (this.combatState === 'during') {
      if (!this.p1hud[this.player1.attack].visible) {
        this.p1hud.rock.visible = this.player1.attack === 'rock';
        this.p1hud.paper.visible = this.player1.attack === 'paper';
        this.p1hud.scissors.visible = this.player1.attack === 'scissors';
        this.p1hud.idle.visible = this.player1.attack === 'idle';
      }
      if (!this.p2hud[this.player2.attack].visible) {
        this.p2hud.rock.visible = this.player2.attack === 'rock';
        this.p2hud.paper.visible = this.player2.attack === 'paper';
        this.p2hud.scissors.visible = this.player2.attack === 'scissors';
        return this.p2hud.idle.visible = this.player2.attack === 'idle';
      }
    } else {
      this.p1hud.rock.visible = false;
      this.p1hud.paper.visible = false;
      this.p1hud.scissors.visible = false;
      this.p1hud.idle.visible = false;
      this.p2hud.rock.visible = false;
      this.p2hud.paper.visible = false;
      this.p2hud.scissors.visible = false;
      return this.p2hud.idle.visible = false;
    }
  };

  GameState.prototype.update = function() {
    var display, remaining;
    this.player1.healthbarGreen.scale.x = this.player1.health / MAX_HEALTH;
    this.player2.healthbarGreen.scale.x = this.player2.health / MAX_HEALTH;
    if (this.combatState === 'countdown') {
      remaining = Math.floor((this.startTime - this.game.time.now) / 1000);
      display = remaining - 1;
      if (display === 0) {
        display = 'FIGHT!';
        if (this.countdownDisplay.text === '1') {
          this.game.add.audio('fight').play();
        }
      }
      this.countdownDisplay.text = display.toString();
      if (remaining <= 0) {
        this.doStartRound();
        return;
      }
    } else if (this.combatState === 'during') {
      if (this.player1.health <= 0 || this.player2.health <= 0) {
        this.doEndRound();
        return;
      }
      if (this.keys.p1_paper.isDown || this.keys.p1_rock.isDown || this.keys.p1_scissors.isDown) {
        if (this.keys.p1_paper.isDown) {
          this.player1.attack = 'paper';
        }
        if (this.keys.p1_rock.isDown) {
          this.player1.attack = 'rock';
        }
        if (this.keys.p1_scissors.isDown) {
          this.player1.attack = 'scissors';
        }
      } else {
        this.player1.attack = 'idle';
      }
      if (this.player1.attack !== this.player1.sprite.animations.currentAnim.name) {
        this.player1.sprite.animations.play(this.player1.attack);
      }
      if (window.player2) {
        if (this.keys.p2_paper.isDown || this.keys.p2_rock.isDown || this.keys.p2_scissors.isDown) {
          if (this.keys.p2_paper.isDown) {
            this.player2.attack = 'paper';
          }
          if (this.keys.p2_rock.isDown) {
            this.player2.attack = 'rock';
          }
          if (this.keys.p2_scissors.isDown) {
            this.player2.attack = 'scissors';
          }
        } else {
          this.player2.attack = 'idle';
        }
      } else {
        if (this.nextAIAttack != null) {
          if (this.game.time.now > this.nextAIAttack) {
            this.player2.attack = ['rock', 'paper', 'scissors', 'idle'][Math.floor(Math.random() * 4)];
            this.nextAIAttack = this.game.time.now + (Math.random() * 1000) + 500;
            if (this.player2.attack === 'idle') {
              this.nextAIAttack = this.game.time.now + (Math.random() * 800);
            }
          }
        } else {
          this.player2.attack = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
          this.nextAIAttack = this.game.time.now + (Math.random() * 1000) + 500;
        }
      }
      if (this.player2.attack !== this.player2.sprite.animations.currentAnim.name) {
        this.player2.sprite.animations.play(this.player2.attack);
      }
      if (this.player1.attack !== this.player2.attack) {
        if (this.player1.attack === 'rock' && this.player2.attack === 'scissors') {
          this.player2.health -= 2;
        }
        if (this.player1.attack === 'paper' && this.player2.attack === 'rock') {
          this.player2.health -= 2;
        }
        if (this.player1.attack === 'scissors' && this.player2.attack === 'paper') {
          this.player2.health -= 2;
        }
        if (this.player2.attack === 'idle') {
          this.player2.health -= 1;
        }
      }
      if (this.player2.attack !== this.player1.attack) {
        if (this.player2.attack === 'rock' && this.player1.attack === 'scissors') {
          this.player1.health -= 2;
        }
        if (this.player2.attack === 'paper' && this.player1.attack === 'rock') {
          this.player1.health -= 2;
        }
        if (this.player2.attack === 'scissors' && this.player1.attack === 'paper') {
          this.player1.health -= 2;
        }
        if (this.player1.attack === 'idle') {
          this.player1.health -= 1;
        }
      }
    } else if (this.combatState === 'finished') {
      if (this.keys.spacebar.justDown) {
        this.game.state.start('levelselect');
      }
    }
    return this.updateHuds();
  };

  return GameState;

})();

WinLoseState = (function() {
  function WinLoseState() {}

  WinLoseState.prototype.create = function() {};

  return WinLoseState;

})();

game = new Phaser.Game(SCREEN_WIDTH, SCREEN_HEIGHT, Phaser.AUTO, 'game');

game.state.add('boot', BootState);

game.state.add('preload', PreloadState);

game.state.add('intro', IntroState);

game.state.add('title', TitleState);

game.state.add('how-to-play', HowToPlayState);

game.state.add('levelselect', LevelSelectState);

game.state.add('game', GameState);

game.state.add('winlose', WinLoseState);

game.state.start('boot');


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/src/main.coffee","/src")

},{"_process":2,"buffer":4}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2lzYXJyYXkvaW5kZXguanMiLCIvaG9tZS9kdmNvbGdhbi9wcm9qZWN0cy9sdWR1bWRhcmUzNS9zcmMvbWFpbi5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUssQ0FBQyxLQUFYLENBQWlCLE1BQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbmZ1bmN0aW9uIGluaXQgKCkge1xuICB2YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbiAgfVxuXG4gIHJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxuICByZXZMb29rdXBbJ18nLmNoYXJDb2RlQXQoMCldID0gNjNcbn1cblxuaW5pdCgpXG5cbmZ1bmN0aW9uIHRvQnl0ZUFycmF5IChiNjQpIHtcbiAgdmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcblxuICBpZiAobGVuICUgNCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuICB9XG5cbiAgLy8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcbiAgLy8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuICAvLyByZXByZXNlbnQgb25lIGJ5dGVcbiAgLy8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG4gIC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2VcbiAgcGxhY2VIb2xkZXJzID0gYjY0W2xlbiAtIDJdID09PSAnPScgPyAyIDogYjY0W2xlbiAtIDFdID09PSAnPScgPyAxIDogMFxuXG4gIC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuICBhcnIgPSBuZXcgQXJyKGxlbiAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgbCA9IHBsYWNlSG9sZGVycyA+IDAgPyBsZW4gLSA0IDogbGVuXG5cbiAgdmFyIEwgPSAwXG5cbiAgZm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfCByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltMKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICsgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICsgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gKyBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgb3V0cHV0ID0gJydcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDJdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz09J1xuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyAodWludDhbbGVuIC0gMV0pXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMTBdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPSdcbiAgfVxuXG4gIHBhcnRzLnB1c2gob3V0cHV0KVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcbnZhciBpc0FycmF5ID0gcmVxdWlyZSgnaXNhcnJheScpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG52YXIgcm9vdFBhcmVudCA9IHt9XG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFVzZSBPYmplY3QgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIER1ZSB0byB2YXJpb3VzIGJyb3dzZXIgYnVncywgc29tZXRpbWVzIHRoZSBPYmplY3QgaW1wbGVtZW50YXRpb24gd2lsbCBiZSB1c2VkIGV2ZW5cbiAqIHdoZW4gdGhlIGJyb3dzZXIgc3VwcG9ydHMgdHlwZWQgYXJyYXlzLlxuICpcbiAqIE5vdGU6XG4gKlxuICogICAtIEZpcmVmb3ggNC0yOSBsYWNrcyBzdXBwb3J0IGZvciBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgIGluc3RhbmNlcyxcbiAqICAgICBTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOC5cbiAqXG4gKiAgIC0gQ2hyb21lIDktMTAgaXMgbWlzc2luZyB0aGUgYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbi5cbiAqXG4gKiAgIC0gSUUxMCBoYXMgYSBicm9rZW4gYFR5cGVkQXJyYXkucHJvdG90eXBlLnN1YmFycmF5YCBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFycmF5cyBvZlxuICogICAgIGluY29ycmVjdCBsZW5ndGggaW4gc29tZSBzaXR1YXRpb25zLlxuXG4gKiBXZSBkZXRlY3QgdGhlc2UgYnVnZ3kgYnJvd3NlcnMgYW5kIHNldCBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgIHRvIGBmYWxzZWAgc28gdGhleVxuICogZ2V0IHRoZSBPYmplY3QgaW1wbGVtZW50YXRpb24sIHdoaWNoIGlzIHNsb3dlciBidXQgYmVoYXZlcyBjb3JyZWN0bHkuXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gZ2xvYmFsLlRZUEVEX0FSUkFZX1NVUFBPUlQgIT09IHVuZGVmaW5lZFxuICA/IGdsb2JhbC5UWVBFRF9BUlJBWV9TVVBQT1JUXG4gIDogdHlwZWRBcnJheVN1cHBvcnQoKVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MiAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nICYmIC8vIGNocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICAgICAgICBhcnIuc3ViYXJyYXkoMSwgMSkuYnl0ZUxlbmd0aCA9PT0gMCAvLyBpZTEwIGhhcyBicm9rZW4gYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuZnVuY3Rpb24ga01heExlbmd0aCAoKSB7XG4gIHJldHVybiBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVFxuICAgID8gMHg3ZmZmZmZmZlxuICAgIDogMHgzZmZmZmZmZlxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5mdW5jdGlvbiBCdWZmZXIgKGFyZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSkge1xuICAgIC8vIEF2b2lkIGdvaW5nIHRocm91Z2ggYW4gQXJndW1lbnRzQWRhcHRvclRyYW1wb2xpbmUgaW4gdGhlIGNvbW1vbiBjYXNlLlxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkgcmV0dXJuIG5ldyBCdWZmZXIoYXJnLCBhcmd1bWVudHNbMV0pXG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoYXJnKVxuICB9XG5cbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXMubGVuZ3RoID0gMFxuICAgIHRoaXMucGFyZW50ID0gdW5kZWZpbmVkXG4gIH1cblxuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIGZyb21OdW1iZXIodGhpcywgYXJnKVxuICB9XG5cbiAgLy8gU2xpZ2h0bHkgbGVzcyBjb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodGhpcywgYXJnLCBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6ICd1dGY4JylcbiAgfVxuXG4gIC8vIFVudXN1YWwuXG4gIHJldHVybiBmcm9tT2JqZWN0KHRoaXMsIGFyZylcbn1cblxuLy8gVE9ETzogTGVnYWN5LCBub3QgbmVlZGVkIGFueW1vcmUuIFJlbW92ZSBpbiBuZXh0IG1ham9yIHZlcnNpb24uXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gZnJvbU51bWJlciAodGhhdCwgbGVuZ3RoKSB7XG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGggPCAwID8gMCA6IGNoZWNrZWQobGVuZ3RoKSB8IDApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGF0W2ldID0gMFxuICAgIH1cbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nICh0aGF0LCBzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykgZW5jb2RpbmcgPSAndXRmOCdcblxuICAvLyBBc3N1bXB0aW9uOiBieXRlTGVuZ3RoKCkgcmV0dXJuIHZhbHVlIGlzIGFsd2F5cyA8IGtNYXhMZW5ndGguXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuXG4gIHRoYXQud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAodGhhdCwgb2JqZWN0KSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqZWN0KSkgcmV0dXJuIGZyb21CdWZmZXIodGhhdCwgb2JqZWN0KVxuXG4gIGlmIChpc0FycmF5KG9iamVjdCkpIHJldHVybiBmcm9tQXJyYXkodGhhdCwgb2JqZWN0KVxuXG4gIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3RhcnQgd2l0aCBudW1iZXIsIGJ1ZmZlciwgYXJyYXkgb3Igc3RyaW5nJylcbiAgfVxuXG4gIGlmICh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKG9iamVjdC5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgcmV0dXJuIGZyb21UeXBlZEFycmF5KHRoYXQsIG9iamVjdClcbiAgICB9XG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHRoYXQsIG9iamVjdClcbiAgICB9XG4gIH1cblxuICBpZiAob2JqZWN0Lmxlbmd0aCkgcmV0dXJuIGZyb21BcnJheUxpa2UodGhhdCwgb2JqZWN0KVxuXG4gIHJldHVybiBmcm9tSnNvbk9iamVjdCh0aGF0LCBvYmplY3QpXG59XG5cbmZ1bmN0aW9uIGZyb21CdWZmZXIgKHRoYXQsIGJ1ZmZlcikge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChidWZmZXIubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgYnVmZmVyLmNvcHkodGhhdCwgMCwgMCwgbGVuZ3RoKVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXkgKHRoYXQsIGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG4vLyBEdXBsaWNhdGUgb2YgZnJvbUFycmF5KCkgdG8ga2VlcCBmcm9tQXJyYXkoKSBtb25vbW9ycGhpYy5cbmZ1bmN0aW9uIGZyb21UeXBlZEFycmF5ICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICAvLyBUcnVuY2F0aW5nIHRoZSBlbGVtZW50cyBpcyBwcm9iYWJseSBub3Qgd2hhdCBwZW9wbGUgZXhwZWN0IGZyb20gdHlwZWRcbiAgLy8gYXJyYXlzIHdpdGggQllURVNfUEVSX0VMRU1FTlQgPiAxIGJ1dCBpdCdzIGNvbXBhdGlibGUgd2l0aCB0aGUgYmVoYXZpb3JcbiAgLy8gb2YgdGhlIG9sZCBCdWZmZXIgY29uc3RydWN0b3IuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKHRoYXQsIGFycmF5KSB7XG4gIGFycmF5LmJ5dGVMZW5ndGggLy8gdGhpcyB0aHJvd3MgaWYgYGFycmF5YCBpcyBub3QgYSB2YWxpZCBBcnJheUJ1ZmZlclxuXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIHRoYXQgPSBuZXcgVWludDhBcnJheShhcnJheSlcbiAgICB0aGF0Ll9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIGFuIG9iamVjdCBpbnN0YW5jZSBvZiB0aGUgQnVmZmVyIGNsYXNzXG4gICAgdGhhdCA9IGZyb21UeXBlZEFycmF5KHRoYXQsIG5ldyBVaW50OEFycmF5KGFycmF5KSlcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuLy8gRGVzZXJpYWxpemUgeyB0eXBlOiAnQnVmZmVyJywgZGF0YTogWzEsMiwzLC4uLl0gfSBpbnRvIGEgQnVmZmVyIG9iamVjdC5cbi8vIFJldHVybnMgYSB6ZXJvLWxlbmd0aCBidWZmZXIgZm9yIGlucHV0cyB0aGF0IGRvbid0IGNvbmZvcm0gdG8gdGhlIHNwZWMuXG5mdW5jdGlvbiBmcm9tSnNvbk9iamVjdCAodGhhdCwgb2JqZWN0KSB7XG4gIHZhciBhcnJheVxuICB2YXIgbGVuZ3RoID0gMFxuXG4gIGlmIChvYmplY3QudHlwZSA9PT0gJ0J1ZmZlcicgJiYgaXNBcnJheShvYmplY3QuZGF0YSkpIHtcbiAgICBhcnJheSA9IG9iamVjdC5kYXRhXG4gICAgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB9XG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbmlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICBCdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG4gIEJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG4gIGlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAmJlxuICAgICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gICAgLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLCBTeW1ib2wuc3BlY2llcywge1xuICAgICAgdmFsdWU6IG51bGwsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KVxuICB9XG59IGVsc2Uge1xuICAvLyBwcmUtc2V0IGZvciB2YWx1ZXMgdGhhdCBtYXkgZXhpc3QgaW4gdGhlIGZ1dHVyZVxuICBCdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuICBCdWZmZXIucHJvdG90eXBlLnBhcmVudCA9IHVuZGVmaW5lZFxufVxuXG5mdW5jdGlvbiBhbGxvY2F0ZSAodGhhdCwgbGVuZ3RoKSB7XG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIHRoYXQgPSBuZXcgVWludDhBcnJheShsZW5ndGgpXG4gICAgdGhhdC5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBhbiBvYmplY3QgaW5zdGFuY2Ugb2YgdGhlIEJ1ZmZlciBjbGFzc1xuICAgIHRoYXQubGVuZ3RoID0gbGVuZ3RoXG4gIH1cblxuICB2YXIgZnJvbVBvb2wgPSBsZW5ndGggIT09IDAgJiYgbGVuZ3RoIDw9IEJ1ZmZlci5wb29sU2l6ZSA+Pj4gMVxuICBpZiAoZnJvbVBvb2wpIHRoYXQucGFyZW50ID0gcm9vdFBhcmVudFxuXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBrTWF4TGVuZ3RoYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IGtNYXhMZW5ndGgoKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICdzaXplOiAweCcgKyBrTWF4TGVuZ3RoKCkudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG4gIH1cbiAgcmV0dXJuIGxlbmd0aCB8IDBcbn1cblxuZnVuY3Rpb24gU2xvd0J1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNsb3dCdWZmZXIpKSByZXR1cm4gbmV3IFNsb3dCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcpXG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcpXG4gIGRlbGV0ZSBidWYucGFyZW50XG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIWlzQXJyYXkobGlzdCkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2xpc3QgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzLicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSBzdHJpbmcgPSAnJyArIHN0cmluZ1xuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgLy8gRGVwcmVjYXRlZFxuICAgICAgY2FzZSAncmF3JzpcbiAgICAgIGNhc2UgJ3Jhd3MnOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgfCAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA9PT0gSW5maW5pdHkgPyB0aGlzLmxlbmd0aCA6IGVuZCB8IDBcblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoZW5kIDw9IHN0YXJ0KSByZXR1cm4gJydcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBiaW5hcnlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhlIHByb3BlcnR5IGlzIHVzZWQgYnkgYEJ1ZmZlci5pc0J1ZmZlcmAgYW5kIGBpcy1idWZmZXJgIChpbiBTYWZhcmkgNS03KSB0byBkZXRlY3Rcbi8vIEJ1ZmZlciBpbnN0YW5jZXMuXG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoIHwgMFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYilcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0KSB7XG4gIGlmIChieXRlT2Zmc2V0ID4gMHg3ZmZmZmZmZikgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgZWxzZSBpZiAoYnl0ZU9mZnNldCA8IC0weDgwMDAwMDAwKSBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgYnl0ZU9mZnNldCA+Pj0gMFxuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG4gIGlmIChieXRlT2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm4gLTFcblxuICAvLyBOZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IE1hdGgubWF4KHRoaXMubGVuZ3RoICsgYnl0ZU9mZnNldCwgMClcblxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xIC8vIHNwZWNpYWwgY2FzZTogbG9va2luZyBmb3IgZW1wdHkgc3RyaW5nIGFsd2F5cyBmYWlsc1xuICAgIHJldHVybiBTdHJpbmcucHJvdG90eXBlLmluZGV4T2YuY2FsbCh0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gIH1cbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQpXG4gIH1cbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKHRoaXMsIFsgdmFsIF0sIGJ5dGVPZmZzZXQpXG4gIH1cblxuICBmdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0KSB7XG4gICAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICAgIGZvciAodmFyIGkgPSAwOyBieXRlT2Zmc2V0ICsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFycltieXRlT2Zmc2V0ICsgaV0gPT09IHZhbFtmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleF0pIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWwubGVuZ3RoKSByZXR1cm4gYnl0ZU9mZnNldCArIGZvdW5kSW5kZXhcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTFcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAoaXNOYU4ocGFyc2VkKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggfCAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgLy8gbGVnYWN5IHdyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKSAtIHJlbW92ZSBpbiB2MC4xM1xuICB9IGVsc2Uge1xuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aCB8IDBcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignYXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGJpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2kgKyAxXSAqIDI1NilcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIG5ld0J1ZiA9IHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZClcbiAgICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICB9IGVsc2Uge1xuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9XG5cbiAgaWYgKG5ld0J1Zi5sZW5ndGgpIG5ld0J1Zi5wYXJlbnQgPSB0aGlzLnBhcmVudCB8fCB0aGlzXG5cbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdidWZmZXIgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3ZhbHVlIGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpLCAwKVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpLCAwKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkgdmFsdWUgPSBNYXRoLmZsb29yKHZhbHVlKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkpKSkgPj4+XG4gICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5mdW5jdGlvbiBvYmplY3RXcml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4pIHtcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4oYnVmLmxlbmd0aCAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gdmFsdWUgPCAwID8gMSA6IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gd3JpdGVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGggLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gICAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcbiAgdmFyIGlcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKGkgPSBsZW4gLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBhc2NlbmRpbmcgY29weSBmcm9tIHN0YXJ0XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbChcbiAgICAgIHRhcmdldCxcbiAgICAgIHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXitcXC8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHJpbmd0cmltKHN0cikucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuIiwidmFyIHRvU3RyaW5nID0ge30udG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCJTQ1JFRU5fV0lEVEggPSAxMjgwXG5TQ1JFRU5fSEVJR0hUID0gNzIwXG5NQVhfSEVBTFRIID0gMTAwMFxud2luZG93LnNlbGVjdGVkTGV2ZWwgPSAnYXJjdGljJ1xud2luZG93LnBsYXllcjIgPSBmYWxzZVxuXG5cbmNsYXNzIEJvb3RTdGF0ZVxuICAgIHByZWxvYWQ6IC0+XG4gICAgICAgIEBnYW1lLmxvYWQuc3ByaXRlc2hlZXQoJ2hlYWx0aGJhci1iYWNrZ3JvdW5kJywgJ2hlYWx0aGJhci1iYWNrZ3JvdW5kLnBuZycsIDU2MCwgNTAsIDMpXG4gICAgICAgIEBnYW1lLmxvYWQuaW1hZ2UoJ2hlYWx0aGJhci1ncmVlbicsICdoZWFsdGhiYXItZ3JlZW4ucG5nJylcblxuICAgIGNyZWF0ZTogLT5cbiAgICAgICAgQGdhbWUuc3RhdGUuc3RhcnQoJ3ByZWxvYWQnKVxuXG5cbmNsYXNzIFByZWxvYWRTdGF0ZVxuICAgIHByZWxvYWQ6IC0+XG4gICAgICAgIEBnYW1lLmxvYWQub25GaWxlQ29tcGxldGUuYWRkKEBmaWxlQ29tcGxldGUpXG4gICAgICAgIEBnYW1lLnN0YWdlLmJhY2tncm91bmRDb2xvciA9ICcjY2NjY2NjJ1xuXG4gICAgICAgIGJhclggPSBTQ1JFRU5fV0lEVEgvMiAtIDU2MC8yXG4gICAgICAgIGJhclkgPSBTQ1JFRU5fSEVJR0hULzIgLSA1MC8yXG4gICAgICAgIEBwcm9ncmVzc2JhckJhY2tncm91bmQgPSBAZ2FtZS5hZGQuc3ByaXRlKGJhclgsIGJhclksICdoZWFsdGhiYXItYmFja2dyb3VuZCcpXG4gICAgICAgIEBwcm9ncmVzc2JhckJhY2tncm91bmQuYW5pbWF0aW9ucy5hZGQoJ2dsb3cnLCBbMCwwLDAsMCwwLDAsMCwwLDAsMSwyXSwgMTAsIHRydWUpXG4gICAgICAgIEBwcm9ncmVzc2JhckJhY2tncm91bmQuYW5pbWF0aW9ucy5wbGF5KCdnbG93JylcbiAgICAgICAgQHByb2dyZXNzYmFyR3JlZW4gPSBAZ2FtZS5hZGQuc3ByaXRlKGJhclggKyA0LCBiYXJZICsgNCwgJ2hlYWx0aGJhci1ncmVlbicpXG4gICAgICAgIEBwcm9ncmVzc2JhckdyZWVuLnNjYWxlLnggPSAwXG5cbiAgICAgICAgQGdhbWUubG9hZC5zcHJpdGVzaGVldCgncGxheWVyMScsICdwbGF5ZXIxLnBuZycsIDExNiwgMTYwLCAzNilcbiAgICAgICAgQGdhbWUubG9hZC5zcHJpdGVzaGVldCgncGxheWVyMicsICdwbGF5ZXIyLnBuZycsIDE4MCwgMzE2LCAyMSlcbiAgICAgICAgQGdhbWUubG9hZC5pbWFnZSgndGl0bGUnLCAndGl0bGUuanBnJylcbiAgICAgICAgQGdhbWUubG9hZC5pbWFnZSgnaG93LXRvLXBsYXknLCAnaG93LXRvLXBsYXkuanBnJylcbiAgICAgICAgQGdhbWUubG9hZC5pbWFnZSgnaG93LXRvLXBsYXktYWknLCAnaG93LXRvLXBsYXktYWkuanBnJylcbiAgICAgICAgI0BnYW1lLmxvYWQuc3ByaXRlc2hlZXQoJ2hlYWx0aGJhci1iYWNrZ3JvdW5kJywgJ2hlYWx0aGJhci1iYWNrZ3JvdW5kLnBuZycsIDU2MCwgNTAsIDMpXG4gICAgICAgICNAZ2FtZS5sb2FkLmltYWdlKCdoZWFsdGhiYXItZ3JlZW4nLCAnaGVhbHRoYmFyLWdyZWVuLnBuZycpXG5cbiAgICAgICAgQGdhbWUubG9hZC5hdWRpbygnYmdtJywgWydhdWRpby9iZ20ubXAzJywgJ2F1ZGlvL2JnbS5vZ2cnXSlcblxuICAgICAgICBAZ2FtZS5sb2FkLmF1ZGlvKCdzZWxlY3QtYS1zdGFnZScsIFsnYXVkaW8vc2VsZWN0LWEtc3RhZ2UubXAzJywgJ2F1ZGlvL3NlbGVjdC1hLXN0YWdlLm9nZyddKVxuICAgICAgICBAZ2FtZS5sb2FkLmF1ZGlvKCdmaWdodCcsIFsnYXVkaW8vZmlnaHQubXAzJywgJ2F1ZGlvL2ZpZ2h0Lm9nZyddKVxuICAgICAgICBAZ2FtZS5sb2FkLmF1ZGlvKCdtb3J0YWwtcm8tc2hhbS1ibycsIFsnYXVkaW8vbW9ydGFsLXJvLXNoYW0tYm8ubXAzJywgJ2F1ZGlvL21vcnRhbC1yby1zaGFtLWJvLm9nZyddKVxuXG4gICAgICAgIEBnYW1lLmxvYWQuYXVkaW8oJ3JvY2std2lucycsIFsnYXVkaW8vcm9jay13aW5zLm1wMycsICdhdWRpby9yb2NrLXdpbnMub2dnJ10pXG4gICAgICAgIEBnYW1lLmxvYWQuYXVkaW8oJ3BhcGVyLXdpbnMnLCBbJ2F1ZGlvL3BhcGVyLXdpbnMubXAzJywgJ2F1ZGlvL3BhcGVyLXdpbnMub2dnJ10pXG4gICAgICAgIEBnYW1lLmxvYWQuYXVkaW8oJ3NjaXNzb3JzLXdpbnMnLCBbJ2F1ZGlvL3NjaXNzb3JzLXdpbnMubXAzJywgJ2F1ZGlvL3NjaXNzb3JzLXdpbnMub2dnJ10pXG5cbiAgICAgICAgQGdhbWUubG9hZC5pbWFnZSgnaW50cm8xJywgJ2ludHJvMS5wbmcnKVxuICAgICAgICBAZ2FtZS5sb2FkLmltYWdlKCdpbnRybzInLCAnaW50cm8xLnBuZycpXG4gICAgICAgIEBnYW1lLmxvYWQuaW1hZ2UoJ2ludHJvMycsICdpbnRybzIucG5nJylcbiAgICAgICAgQGdhbWUubG9hZC5pbWFnZSgnaW50cm80JywgJ2ludHJvMy5wbmcnKVxuICAgICAgICBAZ2FtZS5sb2FkLmltYWdlKCdpbnRybzUnLCAnaW50cm80LnBuZycpXG5cbiAgICAgICAgQGdhbWUubG9hZC5hdWRpbygnaW50cm8tdGFsazEnLCBbJ2F1ZGlvL2ludHJvLXRhbGsxLm1wMycsICdhdWRpby9pbnRyby10YWxrMS5tcDMnXSlcbiAgICAgICAgQGdhbWUubG9hZC5hdWRpbygnaW50cm8tdGFsazInLCBbJ2F1ZGlvL2ludHJvLXRhbGsyLm1wMycsICdhdWRpby9pbnRyby10YWxrMi5tcDMnXSlcbiAgICAgICAgQGdhbWUubG9hZC5hdWRpbygnaW50cm8tdGFsazMnLCBbJ2F1ZGlvL2ludHJvLXRhbGszLm1wMycsICdhdWRpby9pbnRyby10YWxrMy5tcDMnXSlcbiAgICAgICAgQGdhbWUubG9hZC5hdWRpbygnaW50cm8tdGFsazQnLCBbJ2F1ZGlvL2ludHJvLXRhbGs0Lm1wMycsICdhdWRpby9pbnRyby10YWxrNC5tcDMnXSlcbiAgICAgICAgQGdhbWUubG9hZC5hdWRpbygnaW50cm8tdGFsazUnLCBbJ2F1ZGlvL2ludHJvLXRhbGs1Lm1wMycsICdhdWRpby9pbnRyby10YWxrNS5tcDMnXSlcblxuICAgICAgICBAZ2FtZS5sb2FkLnNwcml0ZXNoZWV0KCdyb2NrJywgJ3JvY2sucG5nJywgMjk0LCAyNTAsIDMpXG4gICAgICAgIEBnYW1lLmxvYWQuc3ByaXRlc2hlZXQoJ3BhcGVyJywgJ3BhcGVyLnBuZycsIDMwMCwgMTY5LCAzKVxuICAgICAgICBAZ2FtZS5sb2FkLnNwcml0ZXNoZWV0KCdzY2lzc29ycycsICdzY2lzc29ycy5wbmcnLCAzMDAsIDE2OCwgMylcblxuICAgICAgICBAZ2FtZS5sb2FkLmltYWdlKCdzaW5rJywgJ2JhY2tncm91bmRzL3NpbmsucG5nJylcblxuICAgICAgICBmb3IgbGV2ZWxOYW1lIGluIFsnYXJjdGljJywgJ2NpdHknLCAnZm9yZXN0JywgJ2tpdGNoZW4nLCAnc3RhZ2UnLCAndGFibGUnXVxuICAgICAgICAgICAgQGdhbWUubG9hZC5pbWFnZShsZXZlbE5hbWUsIFwiYmFja2dyb3VuZHMvI3tsZXZlbE5hbWV9LmpwZ1wiKVxuICAgICAgICAgICAgQGdhbWUubG9hZC5pbWFnZShsZXZlbE5hbWUgKyAnLXRodW1ibmFpbCcsIFwiYmFja2dyb3VuZHMvI3tsZXZlbE5hbWV9LXRodW1ibmFpbC5qcGdcIilcblxuICAgIGNyZWF0ZTogLT5cbiAgICAgICAgQGdhbWUuYWRkLmF1ZGlvKCdiZ20nKS5wbGF5KCcnLCAwLCAwLjcsIHRydWUpXG4gICAgICAgIEBnYW1lLnN0YXRlLnN0YXJ0KCdpbnRybycpXG5cbiAgICBmaWxlQ29tcGxldGU6IChwcm9ncmVzcywgY2FjaGVLZXksIHN1Y2Nlc3MsIHRvdGFsTG9hZGVkLCB0b3RhbEZpbGVzKSA9PlxuICAgICAgICBAcHJvZ3Jlc3NiYXJHcmVlbi5zY2FsZS54ID0gcHJvZ3Jlc3MgLyAxMDBcblxuXG5jbGFzcyBJbnRyb1N0YXRlXG4gICAgc2hvd1NjZW5lOiAod2hpY2gpIC0+XG4gICAgICAgIGlmIEBiYWNrZ3JvdW5kPyB0aGVuIEBiYWNrZ3JvdW5kLmRlc3Ryb3koKVxuICAgICAgICBpZiBAdGV4dD8gdGhlbiBAdGV4dC5kZXN0cm95KClcbiAgICAgICAgQGJhY2tncm91bmQgPSBAZ2FtZS5hZGQudGlsZVNwcml0ZSgwLCAwLCBTQ1JFRU5fV0lEVEgsIFNDUkVFTl9IRUlHSFQsICdpbnRybycgKyB3aGljaClcbiAgICAgICAgQGdhbWUuYWRkLmF1ZGlvKCdpbnRyby10YWxrJyArIHdoaWNoKS5wbGF5KClcbiAgICAgICAgQHRleHQgPSBAZ2FtZS5hZGQudGV4dCgzMCwgMzAsIEB0ZXh0c1t3aGljaC0xXSwge1xuICAgICAgICAgICAgZmlsbDogJ3doaXRlJ1xuICAgICAgICAgICAgc3Ryb2tlOiAnYmxhY2snXG4gICAgICAgICAgICBzdHJva2VUaGlja25lc3M6IDZcbiAgICAgICAgICAgIGZvbnQ6ICc4MHB4IGJvbGQgbW9ub3NwYWNlJ1xuICAgICAgICB9KVxuXG4gICAgY3JlYXRlOiAtPlxuICAgICAgICBAZHVyYXRpb25zID0gW1xuICAgICAgICAgICAgMjUwMFxuICAgICAgICAgICAgMjUwMFxuICAgICAgICAgICAgMjUwMFxuICAgICAgICAgICAgMjUwMFxuICAgICAgICAgICAgMzUwMFxuICAgICAgICBdXG4gICAgICAgIEB0ZXh0cyA9IFtcbiAgICAgICAgICAgICdPbmUgc2xpY2UgbGVmdC4uLidcbiAgICAgICAgICAgICdJIG9ubHkgaGFkIG9uZS4gSXRcXCdzIG1pbmUhJ1xuICAgICAgICAgICAgJ1lvdXJzIHdhcyBoYWxmIHRoZSBwaWUhJ1xuICAgICAgICAgICAgJ09ubHkgb25lIHdheSB0byBzZXR0bGUgdGhpcy4uLidcbiAgICAgICAgICAgICdSTyBTSEFNIEJPISEhJ1xuICAgICAgICBdXG4gICAgICAgIEBiYWNrZ3JvdW5kID0gbnVsbFxuICAgICAgICBAdGV4dCA9IG51bGxcbiAgICAgICAgQGN1cnJlbnQgPSAxXG4gICAgICAgIEBzaG93U2NlbmUoQGN1cnJlbnQpXG5cbiAgICAgICAgQHN3aXRjaFRpbWUgPSBAZ2FtZS50aW1lLm5vdyArIEBkdXJhdGlvbnNbMF1cbiAgICAgICAgQHNwYWNlYmFyID0gQGdhbWUuaW5wdXQua2V5Ym9hcmQuYWRkS2V5KFBoYXNlci5LZXlDb2RlLlNQQUNFQkFSKVxuXG4gICAgdXBkYXRlOiAtPlxuICAgICAgICBpZiBAZ2FtZS50aW1lLm5vdyA+PSBAc3dpdGNoVGltZVxuICAgICAgICAgICAgQGN1cnJlbnQrK1xuICAgICAgICAgICAgaWYgQGN1cnJlbnQgPj0gNlxuICAgICAgICAgICAgICAgIEBnYW1lLnN0YXRlLnN0YXJ0KCd0aXRsZScpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgQHN3aXRjaFRpbWUgPSBAZ2FtZS50aW1lLm5vdyArIEBkdXJhdGlvbnNbQGN1cnJlbnQtMV1cbiAgICAgICAgICAgICAgICBAc2hvd1NjZW5lKEBjdXJyZW50LCAnJylcblxuXG4gICAgICAgIGlmIEBzcGFjZWJhci5qdXN0RG93blxuICAgICAgICAgICAgQGdhbWUuc3RhdGUuc3RhcnQoJ3RpdGxlJylcblxuXG5jbGFzcyBUaXRsZVN0YXRlXG4gICAgY3JlYXRlOiAtPlxuICAgICAgICBAZ2FtZS5hZGQudGlsZVNwcml0ZSgwLCAwLCBTQ1JFRU5fV0lEVEgsIFNDUkVFTl9IRUlHSFQsICd0aXRsZScpXG4gICAgICAgIEBzdGFydFRleHQgPSBAZ2FtZS5hZGQudGV4dCgzMCwgNDAwLCAnREVQUkVTU1xcblNQQUNFQkFSXFxuVE8gRklHSFRcXG5USEUgQ09NUFVURVInLCB7XG4gICAgICAgICAgICBmaWxsOiAnd2hpdGUnXG4gICAgICAgICAgICBzdHJva2U6ICdibGFjaydcbiAgICAgICAgICAgIHN0cm9rZVRoaWNrbmVzczogNlxuICAgICAgICAgICAgZm9udDogJzYwcHggYm9sZCBtb25vc3BhY2UnXG4gICAgICAgIH0pXG4gICAgICAgIEBzdGFydFRleHQyID0gQGdhbWUuYWRkLnRleHQoOTgwLCAzMjAsICdERVBSRVNTXFxuRU5URVJcXG5UTyBGSUdIVFxcbkEgRlJJRU5EXFxuSE9UU0VBVCcsIHtcbiAgICAgICAgICAgIGZpbGw6ICd3aGl0ZSdcbiAgICAgICAgICAgIHN0cm9rZTogJ2JsYWNrJ1xuICAgICAgICAgICAgc3Ryb2tlVGhpY2tuZXNzOiA2XG4gICAgICAgICAgICBmb250OiAnNjBweCBib2xkIG1vbm9zcGFjZSdcbiAgICAgICAgfSlcbiAgICAgICAgQGZsaXBwZXJUaW1lID0gQGdhbWUudGltZS5ub3cgKyA3MDBcbiAgICAgICAgQHNwYWNlYmFyID0gQGdhbWUuaW5wdXQua2V5Ym9hcmQuYWRkS2V5KFBoYXNlci5LZXlDb2RlLlNQQUNFQkFSKVxuICAgICAgICBAZW50ZXIgPSBAZ2FtZS5pbnB1dC5rZXlib2FyZC5hZGRLZXkoUGhhc2VyLktleUNvZGUuRU5URVIpXG4gICAgICAgIEBnYW1lLmFkZC5hdWRpbygnbW9ydGFsLXJvLXNoYW0tYm8nKS5wbGF5KClcblxuICAgIHVwZGF0ZTogLT5cbiAgICAgICAgaWYgQGdhbWUudGltZS5ub3cgPj0gQGZsaXBwZXJUaW1lXG4gICAgICAgICAgICBAc3RhcnRUZXh0LnZpc2libGUgPSBub3QgQHN0YXJ0VGV4dC52aXNpYmxlXG4gICAgICAgICAgICBAc3RhcnRUZXh0Mi52aXNpYmxlID0gbm90IEBzdGFydFRleHQyLnZpc2libGVcbiAgICAgICAgICAgIGlmIEBzdGFydFRleHQudmlzaWJsZVxuICAgICAgICAgICAgICAgIEBmbGlwcGVyVGltZSA9IEBnYW1lLnRpbWUubm93ICsgNzAwXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgQGZsaXBwZXJUaW1lID0gQGdhbWUudGltZS5ub3cgKyAyMDBcblxuICAgICAgICBpZiBAc3BhY2ViYXIuanVzdERvd25cbiAgICAgICAgICAgIHdpbmRvdy5wbGF5ZXIyID0gZmFsc2VcbiAgICAgICAgICAgIEBnYW1lLnN0YXRlLnN0YXJ0KCdob3ctdG8tcGxheScpXG5cbiAgICAgICAgaWYgQGVudGVyLmp1c3REb3duXG4gICAgICAgICAgICB3aW5kb3cucGxheWVyMiA9IHRydWVcbiAgICAgICAgICAgIEBnYW1lLnN0YXRlLnN0YXJ0KCdob3ctdG8tcGxheScpXG5cblxuY2xhc3MgSG93VG9QbGF5U3RhdGVcbiAgICBjcmVhdGU6IC0+XG4gICAgICAgIEBnYW1lLmFkZC50aWxlU3ByaXRlKDAsIDAsIFNDUkVFTl9XSURUSCwgU0NSRUVOX0hFSUdIVCwgKGlmIHdpbmRvdy5wbGF5ZXIyIHRoZW4gJ2hvdy10by1wbGF5JyBlbHNlICdob3ctdG8tcGxheS1haScpKVxuICAgICAgICBAc3BhY2ViYXIgPSBAZ2FtZS5pbnB1dC5rZXlib2FyZC5hZGRLZXkoUGhhc2VyLktleUNvZGUuU1BBQ0VCQVIpXG5cbiAgICB1cGRhdGU6IC0+XG4gICAgICAgIGlmIEBzcGFjZWJhci5qdXN0RG93blxuICAgICAgICAgICAgQGdhbWUuc3RhdGUuc3RhcnQoJ2xldmVsc2VsZWN0JylcblxuXG5jbGFzcyBMZXZlbFNlbGVjdFN0YXRlXG4gICAgY3JlYXRlOiAtPlxuICAgICAgICBAZ2FtZS5hZGQuYXVkaW8oJ3NlbGVjdC1hLXN0YWdlJykucGxheSgpXG4gICAgICAgIEBnYW1lLmFkZC50aWxlU3ByaXRlKDAsIDAsIFNDUkVFTl9XSURUSCwgU0NSRUVOX0hFSUdIVCwgJ3NpbmsnKVxuICAgICAgICBAbGV2ZWxzID0gW1xuICAgICAgICAgICAgWydhcmN0aWMnLCAnY2l0eScsICdmb3Jlc3QnXVxuICAgICAgICAgICAgWydraXRjaGVuJywgJ3N0YWdlJywgJ3RhYmxlJ11cbiAgICAgICAgXVxuICAgICAgICBAc3RhZ2VTcHJpdGVzID0gKFxuICAgICAgICAgICAgZm9yIHJvdyBpbiBbMC4uLjJdXG4gICAgICAgICAgICAgICAgZm9yIGNvbCBpbiBbMC4uLjNdXG4gICAgICAgICAgICAgICAgICAgIHggPSBTQ1JFRU5fV0lEVEgvMiAtIDQwMCArIGNvbCAqIDMwMFxuICAgICAgICAgICAgICAgICAgICB5ID0gMjI1ICsgcm93ICogMjUwXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZSA9IEBnYW1lLmFkZC5zcHJpdGUoeCArIDEwMCwgeSArIDEwMCwgQGxldmVsc1tyb3ddW2NvbF0gKyAnLXRodW1ibmFpbCcpXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZS5hbmNob3Iuc2V0VG8oMC41LCAwLjUpXG4gICAgICAgICAgICAgICAgICAgIEBnYW1lLmFkZC50ZXh0IHgrMTAsIHkrMTUwLCBAbGV2ZWxzW3Jvd11bY29sXS50b1VwcGVyQ2FzZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsbDogJ3doaXRlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgc3Ryb2tlOiAnYmxhY2snXG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJva2VUaGlja25lc3M6IDZcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbnQ6ICczMHB4IGJvbGQgbW9ub3NwYWNlJ1xuICAgICAgICAgICAgICAgICAgICBzcHJpdGVcbiAgICAgICAgKVxuICAgICAgICBAY3VycmVudENvbCA9IDBcbiAgICAgICAgQGN1cnJlbnRSb3cgPSAwXG5cbiAgICAgICAgQHRpdGxlID0gQGdhbWUuYWRkLnRleHQgMCwgMCwgJ1NFTEVDVCBTVEFHRScsXG4gICAgICAgICAgICBmaWxsOiAnd2hpdGUnXG4gICAgICAgICAgICBzdHJva2U6ICdibGFjaydcbiAgICAgICAgICAgIHN0cm9rZVRoaWNrbmVzczogMTJcbiAgICAgICAgICAgIGJvdW5kc0FsaWduSDogJ2NlbnRlcidcbiAgICAgICAgICAgIGJvdW5kc0FsaWduVjogJ21pZGRsZSdcbiAgICAgICAgICAgIGZvbnQ6ICcxMDBweCBib2xkIG1vbm9zcGFjZSdcbiAgICAgICAgQHRpdGxlLnNldFRleHRCb3VuZHMoMCwgMCwgU0NSRUVOX1dJRFRILCAxMjApXG5cbiAgICAgICAgQGRpcmVjdGlvbnMgPSBAZ2FtZS5hZGQudGV4dCAwLCA4MCwgJ0Nob29zZSB3aXRoIGFycm93cywgc3BhY2UgdG8gc3RhcnQnLFxuICAgICAgICAgICAgZmlsbDogJ3doaXRlJ1xuICAgICAgICAgICAgc3Ryb2tlOiAnYmxhY2snXG4gICAgICAgICAgICBzdHJva2VUaGlja25lc3M6IDZcbiAgICAgICAgICAgIGJvdW5kc0FsaWduSDogJ2NlbnRlcidcbiAgICAgICAgICAgIGJvdW5kc0FsaWduVjogJ21pZGRsZSdcbiAgICAgICAgICAgIGZvbnQ6ICc0OHB4IGJvbGQgbW9ub3NwYWNlJ1xuICAgICAgICBAZGlyZWN0aW9ucy5zZXRUZXh0Qm91bmRzKDAsIDAsIFNDUkVFTl9XSURUSCwgMTIwKVxuXG4gICAgICAgIEBrZXlzID0gQGdhbWUuaW5wdXQua2V5Ym9hcmQuYWRkS2V5c1xuICAgICAgICAgICAgc3BhY2ViYXI6IFBoYXNlci5LZXlDb2RlLlNQQUNFQkFSXG4gICAgICAgICAgICB1cDogUGhhc2VyLktleUNvZGUuVVBcbiAgICAgICAgICAgIGRvd246IFBoYXNlci5LZXlDb2RlLkRPV05cbiAgICAgICAgICAgIGxlZnQ6IFBoYXNlci5LZXlDb2RlLkxFRlRcbiAgICAgICAgICAgIHJpZ2h0OiBQaGFzZXIuS2V5Q29kZS5SSUdIVFxuXG4gICAgICAgIEBoaWdobGlnaHQoKVxuXG4gICAgaGlnaGxpZ2h0OiAtPlxuICAgICAgICBmb3Igcm93RGF0YSwgcm93IGluIEBzdGFnZVNwcml0ZXNcbiAgICAgICAgICAgIGZvciBzcHJpdGUsIGNvbCBpbiByb3dEYXRhXG4gICAgICAgICAgICAgICAgaWYgbm90IChjb2wgPT0gQGN1cnJlbnRDb2wgYW5kIHJvdyA9PSBAY3VycmVudFJvdylcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlLnRpbnQgPSAweDY2NjY2NlxuICAgICAgICAgICAgICAgICAgICBzcHJpdGUuc2NhbGUueCA9IDFcbiAgICAgICAgICAgICAgICAgICAgc3ByaXRlLnNjYWxlLnkgPSAxXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBzcHJpdGUudGludCA9IDB4ZmZmZmZmXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZS5zY2FsZS54ID0gMS4xXG4gICAgICAgICAgICAgICAgICAgIHNwcml0ZS5zY2FsZS55ID0gMS4xXG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5zZWxlY3RlZExldmVsID0gQGxldmVsc1tyb3ddW2NvbF1cblxuXG4gICAgdXBkYXRlOiAtPlxuICAgICAgICBpZiBAa2V5cy5zcGFjZWJhci5qdXN0RG93blxuICAgICAgICAgICAgQGdhbWUuc3RhdGUuc3RhcnQoJ2dhbWUnKVxuXG4gICAgICAgIGlmIEBrZXlzLmxlZnQuanVzdERvd25cbiAgICAgICAgICAgIEBjdXJyZW50Q29sLS1cbiAgICAgICAgICAgIGlmIEBjdXJyZW50Q29sIDwgMCB0aGVuIEBjdXJyZW50Q29sID0gMFxuICAgICAgICAgICAgQGhpZ2hsaWdodCgpXG4gICAgICAgIGlmIEBrZXlzLnJpZ2h0Lmp1c3REb3duXG4gICAgICAgICAgICBAY3VycmVudENvbCsrXG4gICAgICAgICAgICBpZiBAY3VycmVudENvbCA+IDIgdGhlbiBAY3VycmVudENvbCA9IDJcbiAgICAgICAgICAgIEBoaWdobGlnaHQoKVxuXG4gICAgICAgIGlmIEBrZXlzLnVwLmp1c3REb3duXG4gICAgICAgICAgICBAY3VycmVudFJvdy0tXG4gICAgICAgICAgICBpZiBAY3VycmVudFJvdyA8IDAgdGhlbiBAY3VycmVudFJvdyA9IDBcbiAgICAgICAgICAgIEBoaWdobGlnaHQoKVxuICAgICAgICBpZiBAa2V5cy5kb3duLmp1c3REb3duXG4gICAgICAgICAgICBAY3VycmVudFJvdysrXG4gICAgICAgICAgICBpZiBAY3VycmVudFJvdyA+IDEgdGhlbiBAY3VycmVudFJvdyA9IDFcbiAgICAgICAgICAgIEBoaWdobGlnaHQoKVxuXG5cbmNsYXNzIEdhbWVTdGF0ZVxuICAgIG1ha2VQbGF5ZXI6ICh4LCB5LCBoZWFsdGhiYXJYLCBoZWFsdGhiYXJZLCBzcHJpdGVLZXksIGFuaW1hdGlvbnMpIC0+XG4gICAgICAgIHNwcml0ZSA9IEBnYW1lLmFkZC5zcHJpdGUoeCwgeSwgc3ByaXRlS2V5KVxuICAgICAgICBzcHJpdGUuYW5pbWF0aW9ucy5hZGQoJ3Bvc2UnLCBhbmltYXRpb25zLnBvc2UsIDUsIHRydWUpXG4gICAgICAgIHNwcml0ZS5hbmltYXRpb25zLmFkZCgnaWRsZScsIGFuaW1hdGlvbnMuaWRsZSwgNSwgdHJ1ZSlcbiAgICAgICAgc3ByaXRlLmFuaW1hdGlvbnMuYWRkKCdwYXBlcicsIGFuaW1hdGlvbnMucGFwZXIsIDUsIHRydWUpXG4gICAgICAgIHNwcml0ZS5hbmltYXRpb25zLmFkZCgnc2Npc3NvcnMnLCBhbmltYXRpb25zLnNjaXNzb3JzLCA1LCB0cnVlKVxuICAgICAgICBzcHJpdGUuYW5pbWF0aW9ucy5hZGQoJ3JvY2snLCBhbmltYXRpb25zLnJvY2ssIDUsIHRydWUpXG4gICAgICAgIHNwcml0ZS5hbmltYXRpb25zLmFkZCgnaGl0JywgYW5pbWF0aW9ucy5oaXQsIDEwLCBmYWxzZSlcbiAgICAgICAgc3ByaXRlLmFuaW1hdGlvbnMuYWRkKCdkaWUnLCBhbmltYXRpb25zLmRpZSwgMTAsIGZhbHNlKVxuICAgICAgICBzcHJpdGUuYW5pbWF0aW9ucy5hZGQoJ3RyYW5zZm9ybScsIGFuaW1hdGlvbnMudHJhbnNmb3JtLCAxMCwgZmFsc2UpXG4gICAgICAgIHNwcml0ZS5hbmNob3Iuc2V0VG8oMC41LCAwLjUpXG4gICAgICAgIGF0dGFjayA9ICdpZGxlJ1xuICAgICAgICBzcHJpdGUuYW5pbWF0aW9ucy5wbGF5KCdwb3NlJylcblxuICAgICAgICBoZWFsdGggPSBNQVhfSEVBTFRIXG4gICAgICAgIGhlYWx0aGJhckJhY2tncm91bmQgPSBAZ2FtZS5hZGQuc3ByaXRlKGhlYWx0aGJhclgsIGhlYWx0aGJhclksICdoZWFsdGhiYXItYmFja2dyb3VuZCcpXG4gICAgICAgIGhlYWx0aGJhckJhY2tncm91bmQuYW5pbWF0aW9ucy5hZGQoJ2dsb3cnLCBbMCwwLDAsMCwwLDAsMCwwLDAsMSwyXSwgMTAsIHRydWUpXG4gICAgICAgIGhlYWx0aGJhckJhY2tncm91bmQuYW5pbWF0aW9ucy5wbGF5KCdnbG93JylcbiAgICAgICAgaGVhbHRoYmFyR3JlZW4gPSBAZ2FtZS5hZGQuc3ByaXRlKGhlYWx0aGJhclggKyA0LCBoZWFsdGhiYXJZICsgNCwgJ2hlYWx0aGJhci1ncmVlbicpXG5cbiAgICAgICAge3Nwcml0ZSwgYXR0YWNrLCBoZWFsdGgsIGhlYWx0aGJhckJhY2tncm91bmQsIGhlYWx0aGJhckdyZWVufVxuXG4gICAgY3JlYXRlOiAtPlxuICAgICAgICBAa2V5cyA9IEBnYW1lLmlucHV0LmtleWJvYXJkLmFkZEtleXNcbiAgICAgICAgICAgIHNwYWNlYmFyOiBQaGFzZXIuS2V5Q29kZS5TUEFDRUJBUlxuXG4gICAgICAgICAgICBwMV9yb2NrOiBQaGFzZXIuS2V5Q29kZS5PTkVcbiAgICAgICAgICAgIHAxX3BhcGVyOiBQaGFzZXIuS2V5Q29kZS5UV09cbiAgICAgICAgICAgIHAxX3NjaXNzb3JzOiBQaGFzZXIuS2V5Q29kZS5USFJFRVxuXG4gICAgICAgICAgICBwMl9yb2NrOiBQaGFzZXIuS2V5Q29kZS5MRUZUXG4gICAgICAgICAgICBwMl9wYXBlcjogUGhhc2VyLktleUNvZGUuRE9XTlxuICAgICAgICAgICAgcDJfc2Npc3NvcnM6IFBoYXNlci5LZXlDb2RlLlJJR0hUXG5cbiAgICAgICAgQGdhbWUudGltZS5kZXNpcmVkRnBzID0gNjBcblxuICAgICAgICBAZ2FtZS5ncm91cHMgPSB7fVxuICAgICAgICBAZ2FtZS5ncm91cHMuYmFja2dyb3VuZCA9IEBnYW1lLmFkZC5ncm91cCgpXG4gICAgICAgIEBnYW1lLmdyb3Vwcy5hY3RvcnMgPSBAZ2FtZS5hZGQuZ3JvdXAoKVxuICAgICAgICBAZ2FtZS5ncm91cHMucGxheWVyID0gQGdhbWUuYWRkLmdyb3VwKClcbiAgICAgICAgQGdhbWUuZ3JvdXBzLnVpID0gQGdhbWUuYWRkLmdyb3VwKClcblxuICAgICAgICBAYmFja2dyb3VuZCA9IEBnYW1lLmFkZC50aWxlU3ByaXRlKDAsIDAsIFNDUkVFTl9XSURUSCwgU0NSRUVOX0hFSUdIVCwgc2VsZWN0ZWRMZXZlbClcblxuICAgICAgICBAcGxheWVyMSA9IEBtYWtlUGxheWVyIFNDUkVFTl9XSURUSC8yIC0gMjAwLCBTQ1JFRU5fSEVJR0hULzIgKyA0MCwgNDAsIDQwLCAncGxheWVyMScsXG4gICAgICAgICAgICBwb3NlOiBbMzEsMzIsMzNdXG4gICAgICAgICAgICBpZGxlOiBbNiw3LDldXG4gICAgICAgICAgICBwYXBlcjogWzMxLCAyNF1cbiAgICAgICAgICAgIHNjaXNzb3JzOiBbMTEsMTIsMTRdXG4gICAgICAgICAgICByb2NrOiBbMjBdXG4gICAgICAgICAgICBoaXQ6IFsyMSwyMl1cbiAgICAgICAgICAgIGRpZTogWzIxLDIyXVxuICAgICAgICAgICAgdHJhbnNmb3JtOiBbMTYsMTcsMTgsMTksMTgsMTksMTgsMTksMThdXG4gICAgICAgIEBwbGF5ZXIxLnNwcml0ZS5zY2FsZS54ID0gLTNcbiAgICAgICAgQHBsYXllcjEuc3ByaXRlLnNjYWxlLnkgPSAzXG5cbiAgICAgICAgQHBsYXllcjIgPSBAbWFrZVBsYXllciBTQ1JFRU5fV0lEVEgvMiArIDIwMCwgU0NSRUVOX0hFSUdIVC8yICsgNDAsIFNDUkVFTl9XSURUSC8yICsgNDAsIDQwLCAncGxheWVyMicsXG4gICAgICAgICAgICBwb3NlOiBbMyw0XVxuICAgICAgICAgICAgaWRsZTogWzE1LDE2LDE3XVxuICAgICAgICAgICAgcGFwZXI6IFs3LDYsN11cbiAgICAgICAgICAgIHNjaXNzb3JzOiBbMyw0LDVdXG4gICAgICAgICAgICByb2NrOiBbMCwxLDJdXG4gICAgICAgICAgICBoaXQ6IFs5LDEwLDExXVxuICAgICAgICAgICAgZGllOiBbOSwxMCwxMV1cbiAgICAgICAgICAgIHRyYW5zZm9ybTogWzEyLDUsMTQsMTMsNSwxMyw1LDEzLDVdXG4gICAgICAgIEBwbGF5ZXIyLnNwcml0ZS5zY2FsZS54ID0gMS43XG4gICAgICAgIEBwbGF5ZXIyLnNwcml0ZS5zY2FsZS55ID0gMS43XG5cbiAgICAgICAgQHAxaHVkID0gQG1ha2VIdWQoQHBsYXllcjEuc3ByaXRlLnggKyAxMDAsIEBwbGF5ZXIxLnNwcml0ZS55IC0gNTAsIGZhbHNlKVxuICAgICAgICBAcDJodWQgPSBAbWFrZUh1ZChAcGxheWVyMi5zcHJpdGUueCAtIDEwMCwgQHBsYXllcjIuc3ByaXRlLnkgLSA1MCwgdHJ1ZSlcblxuICAgICAgICBAZG9Db3VudGRvd24oKVxuXG4gICAgbWFrZUh1ZDogKHgsIHksIGZsaXApIC0+XG4gICAgICAgIGNvbnNvbGUubG9nKHgsIHkpXG4gICAgICAgIHJvY2sgPSBAZ2FtZS5hZGQuc3ByaXRlKHgsIHksICdyb2NrJylcbiAgICAgICAgcm9jay5hbmltYXRpb25zLmFkZCgncnVuJywgWzAsMSwyXSwgMywgdHJ1ZSlcbiAgICAgICAgcm9jay5hbmltYXRpb25zLnBsYXkoJ3J1bicpXG4gICAgICAgIHJvY2suYW5jaG9yLnNldCgwLjUpXG4gICAgICAgIHJvY2suc2NhbGUueCA9IDAuNCAqIChpZiBmbGlwIHRoZW4gLTEgZWxzZSAxKVxuICAgICAgICByb2NrLnNjYWxlLnkgPSAwLjRcbiAgICAgICAgcGFwZXIgPSBAZ2FtZS5hZGQuc3ByaXRlKHgsIHksICdwYXBlcicpXG4gICAgICAgIHBhcGVyLmFuaW1hdGlvbnMuYWRkKCdydW4nLCBbMCwxLDJdLCAzLCB0cnVlKVxuICAgICAgICBwYXBlci5hbmltYXRpb25zLnBsYXkoJ3J1bicpXG4gICAgICAgIHBhcGVyLmFuY2hvci5zZXQoMC41KVxuICAgICAgICBwYXBlci5zY2FsZS54ID0gMC40ICogKGlmIGZsaXAgdGhlbiAtMSBlbHNlIDEpXG4gICAgICAgIHBhcGVyLnNjYWxlLnkgPSAwLjRcbiAgICAgICAgc2Npc3NvcnMgPSBAZ2FtZS5hZGQuc3ByaXRlKHgsIHksICdzY2lzc29ycycpXG4gICAgICAgIHNjaXNzb3JzLmFuaW1hdGlvbnMuYWRkKCdydW4nLCBbMCwxLDJdLCAzLCB0cnVlKVxuICAgICAgICBzY2lzc29ycy5hbmltYXRpb25zLnBsYXkoJ3J1bicpXG4gICAgICAgIHNjaXNzb3JzLmFuY2hvci5zZXQoMC41KVxuICAgICAgICBzY2lzc29ycy5zY2FsZS54ID0gMC40ICogKGlmIGZsaXAgdGhlbiAtMSBlbHNlIDEpXG4gICAgICAgIHNjaXNzb3JzLnNjYWxlLnkgPSAwLjRcbiAgICAgICAge3JvY2ssIHBhcGVyLCBzY2lzc29ycywgaWRsZToge3Zpc2libGU6IHRydWV9fVxuXG4gICAgZG9Db3VudGRvd246IC0+XG4gICAgICAgIEBjb21iYXRTdGF0ZSA9ICdjb3VudGRvd24nXG4gICAgICAgIEBzdGFydFRpbWUgPSBAZ2FtZS50aW1lLm5vdyArIDUwMDBcbiAgICAgICAgQGNvdW50ZG93bkRpc3BsYXkgPSBAZ2FtZS5hZGQudGV4dCAxLCAwLCAnJyxcbiAgICAgICAgICAgIGZpbGw6ICd3aGl0ZSdcbiAgICAgICAgICAgIHN0cm9rZTogJ2JsYWNrJ1xuICAgICAgICAgICAgc3Ryb2tlVGhpY2tuZXNzOiAxMlxuICAgICAgICAgICAgYm91bmRzQWxpZ25IOiAnY2VudGVyJ1xuICAgICAgICAgICAgYm91bmRzQWxpZ25WOiAnbWlkZGxlJ1xuICAgICAgICAgICAgZm9udDogJzMwMHB4IGJvbGQgbW9ub3NwYWNlJ1xuICAgICAgICBAY291bnRkb3duRGlzcGxheS5zZXRUZXh0Qm91bmRzKDAsIDAsIFNDUkVFTl9XSURUSCwgU0NSRUVOX0hFSUdIVClcblxuICAgIGRvU3RhcnRSb3VuZDogLT5cbiAgICAgICAgQHBsYXllcjEuc3ByaXRlLmFuaW1hdGlvbnMucGxheSgnaWRsZScpXG4gICAgICAgIEBwbGF5ZXIyLnNwcml0ZS5hbmltYXRpb25zLnBsYXkoJ2lkbGUnKVxuICAgICAgICBAY291bnRkb3duRGlzcGxheS5kZXN0cm95KClcbiAgICAgICAgQGNvbWJhdFN0YXRlID0gJ2R1cmluZydcbiAgICAgICAgQG5leHRBSUF0dGFjayA9IG51bGxcblxuICAgIGRvRW5kUm91bmQ6IC0+XG4gICAgICAgIEBwbGF5ZXIxLmhlYWx0aGJhckdyZWVuLnNjYWxlLnggPSBAcGxheWVyMS5oZWFsdGggLyBNQVhfSEVBTFRIXG4gICAgICAgIEBwbGF5ZXIyLmhlYWx0aGJhckdyZWVuLnNjYWxlLnggPSBAcGxheWVyMi5oZWFsdGggLyBNQVhfSEVBTFRIXG4gICAgICAgIGlmIEBwbGF5ZXIxLmhlYWx0aCA8PSAwXG4gICAgICAgICAgICBAcGxheWVyMS5zcHJpdGUuYW5pbWF0aW9ucy5wbGF5KCdkaWUnKVxuICAgICAgICAgICAgQHBsYXllcjIuc3ByaXRlLmFuaW1hdGlvbnMucGxheSgndHJhbnNmb3JtJykub25Db21wbGV0ZS5hZGQgPT5cbiAgICAgICAgICAgICAgICBAZ2FtZS5hZGQuYXVkaW8oQHBsYXllcjIuYXR0YWNrICsgJy13aW5zJykucGxheSgpXG4gICAgICAgICAgICAgICAgZmluYWwgPSBAZ2FtZS5hZGQuc3ByaXRlKEBwbGF5ZXIyLnNwcml0ZS54LCBAcGxheWVyMi5zcHJpdGUueSwgQHBsYXllcjIuYXR0YWNrKVxuICAgICAgICAgICAgICAgIGZpbmFsLmFuY2hvci5zZXRUbygwLjUpXG4gICAgICAgICAgICAgICAgZmluYWwuc2NhbGUuc2V0VG8oLTIsIDIpXG4gICAgICAgICAgICAgICAgZmluYWwuYW5pbWF0aW9ucy5hZGQoJ3RyYW5zZm9ybScsIFswLDEsMl0sIDIsIHRydWUpXG4gICAgICAgICAgICAgICAgdHdlZW4gPSBAZ2FtZS5hZGQudHdlZW4oZmluYWwpLnRvKHg6IEBwbGF5ZXIxLnNwcml0ZS54KVxuICAgICAgICAgICAgICAgIHR3ZWVuLm9uQ29tcGxldGUuYWRkID0+XG4gICAgICAgICAgICAgICAgICAgIEBkb0ZpbmlzaGVkKClcbiAgICAgICAgICAgICAgICB0d2Vlbi5zdGFydCgpXG4gICAgICAgICAgICAgICAgZmluYWwuYW5pbWF0aW9ucy5wbGF5KCd0cmFuc2Zvcm0nKVxuICAgICAgICAgICAgICAgIEBwbGF5ZXIyLnNwcml0ZS5kZXN0cm95KClcbiAgICAgICAgZWxzZSBpZiBAcGxheWVyMi5oZWFsdGggPD0gMFxuICAgICAgICAgICAgQHBsYXllcjIuc3ByaXRlLmFuaW1hdGlvbnMucGxheSgnZGllJylcbiAgICAgICAgICAgIEBwbGF5ZXIxLnNwcml0ZS5hbmltYXRpb25zLnBsYXkoJ3RyYW5zZm9ybScpLm9uQ29tcGxldGUuYWRkID0+XG4gICAgICAgICAgICAgICAgQGdhbWUuYWRkLmF1ZGlvKEBwbGF5ZXIxLmF0dGFjayArICctd2lucycpLnBsYXkoKVxuICAgICAgICAgICAgICAgIGZpbmFsID0gQGdhbWUuYWRkLnNwcml0ZShAcGxheWVyMS5zcHJpdGUueCwgQHBsYXllcjEuc3ByaXRlLnksIEBwbGF5ZXIxLmF0dGFjaylcbiAgICAgICAgICAgICAgICBmaW5hbC5hbmNob3Iuc2V0VG8oMC41KVxuICAgICAgICAgICAgICAgIGZpbmFsLnNjYWxlLnNldFRvKDIsIDIpXG4gICAgICAgICAgICAgICAgZmluYWwuYW5pbWF0aW9ucy5hZGQoJ3RyYW5zZm9ybScsIFswLDEsMl0sIDIsIHRydWUpXG4gICAgICAgICAgICAgICAgdHdlZW4gPSBAZ2FtZS5hZGQudHdlZW4oZmluYWwpLnRvKHg6IEBwbGF5ZXIyLnNwcml0ZS54KVxuICAgICAgICAgICAgICAgIHR3ZWVuLm9uQ29tcGxldGUuYWRkID0+XG4gICAgICAgICAgICAgICAgICAgIEBkb0ZpbmlzaGVkKClcbiAgICAgICAgICAgICAgICB0d2Vlbi5zdGFydCgpXG4gICAgICAgICAgICAgICAgZmluYWwuYW5pbWF0aW9ucy5wbGF5KCd0cmFuc2Zvcm0nKVxuICAgICAgICAgICAgICAgIEBwbGF5ZXIxLnNwcml0ZS5kZXN0cm95KClcbiAgICAgICAgQGNvbWJhdFN0YXRlID0gJ292ZXInXG4gICAgICAgIEBmaW5hbFRleHQgPSBAZ2FtZS5hZGQudGV4dCAwLCAwLCAnSElUIFNQQUNFIFRPIFBMQVkgQUdBSU4nLFxuICAgICAgICAgICAgZmlsbDogJ3doaXRlJ1xuICAgICAgICAgICAgc3Ryb2tlOiAnYmxhY2snXG4gICAgICAgICAgICBzdHJva2VUaGlja25lc3M6IDEyXG4gICAgICAgICAgICBib3VuZHNBbGlnbkg6ICdjZW50ZXInXG4gICAgICAgICAgICBib3VuZHNBbGlnblY6ICdtaWRkbGUnXG4gICAgICAgICAgICBmb250OiAnOTBweCBib2xkIG1vbm9zcGFjZSdcbiAgICAgICAgQGZpbmFsVGV4dC5zZXRUZXh0Qm91bmRzKDAsIFNDUkVFTl9IRUlHSFQgLSAxMjAsIFNDUkVFTl9XSURUSCwgMTIwKVxuXG4gICAgZG9GaW5pc2hlZDogPT5cbiAgICAgICAgQGNvbWJhdFN0YXRlID0gJ2ZpbmlzaGVkJ1xuXG4gICAgdXBkYXRlSHVkczogLT5cbiAgICAgICAgaWYgQGNvbWJhdFN0YXRlID09ICdkdXJpbmcnXG4gICAgICAgICAgICBpZiBub3QgQHAxaHVkW0BwbGF5ZXIxLmF0dGFja10udmlzaWJsZVxuICAgICAgICAgICAgICAgIEBwMWh1ZC5yb2NrLnZpc2libGUgPSBAcGxheWVyMS5hdHRhY2sgPT0gJ3JvY2snXG4gICAgICAgICAgICAgICAgQHAxaHVkLnBhcGVyLnZpc2libGUgPSBAcGxheWVyMS5hdHRhY2sgPT0gJ3BhcGVyJ1xuICAgICAgICAgICAgICAgIEBwMWh1ZC5zY2lzc29ycy52aXNpYmxlID0gQHBsYXllcjEuYXR0YWNrID09ICdzY2lzc29ycydcbiAgICAgICAgICAgICAgICBAcDFodWQuaWRsZS52aXNpYmxlID0gQHBsYXllcjEuYXR0YWNrID09ICdpZGxlJ1xuICAgICAgICAgICAgaWYgbm90IEBwMmh1ZFtAcGxheWVyMi5hdHRhY2tdLnZpc2libGVcbiAgICAgICAgICAgICAgICBAcDJodWQucm9jay52aXNpYmxlID0gQHBsYXllcjIuYXR0YWNrID09ICdyb2NrJ1xuICAgICAgICAgICAgICAgIEBwMmh1ZC5wYXBlci52aXNpYmxlID0gQHBsYXllcjIuYXR0YWNrID09ICdwYXBlcidcbiAgICAgICAgICAgICAgICBAcDJodWQuc2Npc3NvcnMudmlzaWJsZSA9IEBwbGF5ZXIyLmF0dGFjayA9PSAnc2Npc3NvcnMnXG4gICAgICAgICAgICAgICAgQHAyaHVkLmlkbGUudmlzaWJsZSA9IEBwbGF5ZXIyLmF0dGFjayA9PSAnaWRsZSdcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHAxaHVkLnJvY2sudmlzaWJsZSA9IGZhbHNlXG4gICAgICAgICAgICBAcDFodWQucGFwZXIudmlzaWJsZSA9IGZhbHNlXG4gICAgICAgICAgICBAcDFodWQuc2Npc3NvcnMudmlzaWJsZSA9IGZhbHNlXG4gICAgICAgICAgICBAcDFodWQuaWRsZS52aXNpYmxlID0gZmFsc2VcbiAgICAgICAgICAgIEBwMmh1ZC5yb2NrLnZpc2libGUgPSBmYWxzZVxuICAgICAgICAgICAgQHAyaHVkLnBhcGVyLnZpc2libGUgPSBmYWxzZVxuICAgICAgICAgICAgQHAyaHVkLnNjaXNzb3JzLnZpc2libGUgPSBmYWxzZVxuICAgICAgICAgICAgQHAyaHVkLmlkbGUudmlzaWJsZSA9IGZhbHNlXG5cbiAgICB1cGRhdGU6IC0+XG4gICAgICAgIEBwbGF5ZXIxLmhlYWx0aGJhckdyZWVuLnNjYWxlLnggPSBAcGxheWVyMS5oZWFsdGggLyBNQVhfSEVBTFRIXG4gICAgICAgIEBwbGF5ZXIyLmhlYWx0aGJhckdyZWVuLnNjYWxlLnggPSBAcGxheWVyMi5oZWFsdGggLyBNQVhfSEVBTFRIXG5cbiAgICAgICAgaWYgQGNvbWJhdFN0YXRlID09ICdjb3VudGRvd24nXG4gICAgICAgICAgICByZW1haW5pbmcgPSBNYXRoLmZsb29yKChAc3RhcnRUaW1lIC0gQGdhbWUudGltZS5ub3cpIC8gMTAwMClcbiAgICAgICAgICAgIGRpc3BsYXkgPSByZW1haW5pbmcgLSAxXG4gICAgICAgICAgICBpZiBkaXNwbGF5ID09IDBcbiAgICAgICAgICAgICAgICBkaXNwbGF5ID0gJ0ZJR0hUISdcbiAgICAgICAgICAgICAgICBpZiBAY291bnRkb3duRGlzcGxheS50ZXh0ID09ICcxJ1xuICAgICAgICAgICAgICAgICAgICBAZ2FtZS5hZGQuYXVkaW8oJ2ZpZ2h0JykucGxheSgpXG4gICAgICAgICAgICBAY291bnRkb3duRGlzcGxheS50ZXh0ID0gZGlzcGxheS50b1N0cmluZygpXG5cbiAgICAgICAgICAgIGlmIHJlbWFpbmluZyA8PSAwXG4gICAgICAgICAgICAgICAgQGRvU3RhcnRSb3VuZCgpXG4gICAgICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgZWxzZSBpZiBAY29tYmF0U3RhdGUgPT0gJ2R1cmluZydcblxuICAgICAgICAgICAgaWYgQHBsYXllcjEuaGVhbHRoIDw9IDAgb3IgQHBsYXllcjIuaGVhbHRoIDw9IDBcbiAgICAgICAgICAgICAgICBAZG9FbmRSb3VuZCgpXG4gICAgICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgICAgIGlmIEBrZXlzLnAxX3BhcGVyLmlzRG93biBvciBAa2V5cy5wMV9yb2NrLmlzRG93biBvciBAa2V5cy5wMV9zY2lzc29ycy5pc0Rvd25cbiAgICAgICAgICAgICAgICBpZiBAa2V5cy5wMV9wYXBlci5pc0Rvd25cbiAgICAgICAgICAgICAgICAgICAgQHBsYXllcjEuYXR0YWNrID0gJ3BhcGVyJ1xuICAgICAgICAgICAgICAgIGlmIEBrZXlzLnAxX3JvY2suaXNEb3duXG4gICAgICAgICAgICAgICAgICAgIEBwbGF5ZXIxLmF0dGFjayA9ICdyb2NrJ1xuICAgICAgICAgICAgICAgIGlmIEBrZXlzLnAxX3NjaXNzb3JzLmlzRG93blxuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMS5hdHRhY2sgPSAnc2Npc3NvcnMnXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgQHBsYXllcjEuYXR0YWNrID0gJ2lkbGUnXG4gICAgICAgICAgICBpZiBAcGxheWVyMS5hdHRhY2sgIT0gQHBsYXllcjEuc3ByaXRlLmFuaW1hdGlvbnMuY3VycmVudEFuaW0ubmFtZVxuICAgICAgICAgICAgICAgIEBwbGF5ZXIxLnNwcml0ZS5hbmltYXRpb25zLnBsYXkoQHBsYXllcjEuYXR0YWNrKVxuXG4gICAgICAgICAgICBpZiB3aW5kb3cucGxheWVyMlxuICAgICAgICAgICAgICAgIGlmIEBrZXlzLnAyX3BhcGVyLmlzRG93biBvciBAa2V5cy5wMl9yb2NrLmlzRG93biBvciBAa2V5cy5wMl9zY2lzc29ycy5pc0Rvd25cbiAgICAgICAgICAgICAgICAgICAgaWYgQGtleXMucDJfcGFwZXIuaXNEb3duXG4gICAgICAgICAgICAgICAgICAgICAgICBAcGxheWVyMi5hdHRhY2sgPSAncGFwZXInXG4gICAgICAgICAgICAgICAgICAgIGlmIEBrZXlzLnAyX3JvY2suaXNEb3duXG4gICAgICAgICAgICAgICAgICAgICAgICBAcGxheWVyMi5hdHRhY2sgPSAncm9jaydcbiAgICAgICAgICAgICAgICAgICAgaWYgQGtleXMucDJfc2Npc3NvcnMuaXNEb3duXG4gICAgICAgICAgICAgICAgICAgICAgICBAcGxheWVyMi5hdHRhY2sgPSAnc2Npc3NvcnMnXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMi5hdHRhY2sgPSAnaWRsZSdcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBpZiBAbmV4dEFJQXR0YWNrP1xuICAgICAgICAgICAgICAgICAgICBpZiBAZ2FtZS50aW1lLm5vdyA+IEBuZXh0QUlBdHRhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgIEBwbGF5ZXIyLmF0dGFjayA9IFsncm9jaycsICdwYXBlcicsICdzY2lzc29ycycsICdpZGxlJ11bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNCldXG4gICAgICAgICAgICAgICAgICAgICAgICBAbmV4dEFJQXR0YWNrID0gQGdhbWUudGltZS5ub3cgKyAoTWF0aC5yYW5kb20oKSAqIDEwMDApICsgNTAwXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiBAcGxheWVyMi5hdHRhY2sgPT0gJ2lkbGUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQG5leHRBSUF0dGFjayA9IEBnYW1lLnRpbWUubm93ICsgKE1hdGgucmFuZG9tKCkgKiA4MDApXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMi5hdHRhY2sgPSBbJ3JvY2snLCAncGFwZXInLCAnc2Npc3NvcnMnXVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAzKV1cbiAgICAgICAgICAgICAgICAgICAgQG5leHRBSUF0dGFjayA9IEBnYW1lLnRpbWUubm93ICsgKE1hdGgucmFuZG9tKCkgKiAxMDAwKSArIDUwMFxuXG4gICAgICAgICAgICBpZiBAcGxheWVyMi5hdHRhY2sgIT0gQHBsYXllcjIuc3ByaXRlLmFuaW1hdGlvbnMuY3VycmVudEFuaW0ubmFtZVxuICAgICAgICAgICAgICAgIEBwbGF5ZXIyLnNwcml0ZS5hbmltYXRpb25zLnBsYXkoQHBsYXllcjIuYXR0YWNrKVxuXG5cbiAgICAgICAgICAgIGlmIEBwbGF5ZXIxLmF0dGFjayAhPSBAcGxheWVyMi5hdHRhY2tcbiAgICAgICAgICAgICAgICBpZiBAcGxheWVyMS5hdHRhY2sgPT0gJ3JvY2snIGFuZCBAcGxheWVyMi5hdHRhY2sgPT0gJ3NjaXNzb3JzJ1xuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMi5oZWFsdGggLT0gMlxuICAgICAgICAgICAgICAgIGlmIEBwbGF5ZXIxLmF0dGFjayA9PSAncGFwZXInIGFuZCBAcGxheWVyMi5hdHRhY2sgPT0gJ3JvY2snXG4gICAgICAgICAgICAgICAgICAgIEBwbGF5ZXIyLmhlYWx0aCAtPSAyXG4gICAgICAgICAgICAgICAgaWYgQHBsYXllcjEuYXR0YWNrID09ICdzY2lzc29ycycgYW5kIEBwbGF5ZXIyLmF0dGFjayA9PSAncGFwZXInXG4gICAgICAgICAgICAgICAgICAgIEBwbGF5ZXIyLmhlYWx0aCAtPSAyXG4gICAgICAgICAgICAgICAgaWYgQHBsYXllcjIuYXR0YWNrID09ICdpZGxlJ1xuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMi5oZWFsdGggLT0gMVxuXG4gICAgICAgICAgICBpZiBAcGxheWVyMi5hdHRhY2sgIT0gQHBsYXllcjEuYXR0YWNrXG4gICAgICAgICAgICAgICAgaWYgQHBsYXllcjIuYXR0YWNrID09ICdyb2NrJyBhbmQgQHBsYXllcjEuYXR0YWNrID09ICdzY2lzc29ycydcbiAgICAgICAgICAgICAgICAgICAgQHBsYXllcjEuaGVhbHRoIC09IDJcbiAgICAgICAgICAgICAgICBpZiBAcGxheWVyMi5hdHRhY2sgPT0gJ3BhcGVyJyBhbmQgQHBsYXllcjEuYXR0YWNrID09ICdyb2NrJ1xuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMS5oZWFsdGggLT0gMlxuICAgICAgICAgICAgICAgIGlmIEBwbGF5ZXIyLmF0dGFjayA9PSAnc2Npc3NvcnMnIGFuZCBAcGxheWVyMS5hdHRhY2sgPT0gJ3BhcGVyJ1xuICAgICAgICAgICAgICAgICAgICBAcGxheWVyMS5oZWFsdGggLT0gMlxuICAgICAgICAgICAgICAgIGlmIEBwbGF5ZXIxLmF0dGFjayA9PSAnaWRsZSdcbiAgICAgICAgICAgICAgICAgICAgQHBsYXllcjEuaGVhbHRoIC09IDFcblxuICAgICAgICBlbHNlIGlmIEBjb21iYXRTdGF0ZSA9PSAnZmluaXNoZWQnXG4gICAgICAgICAgICBpZiBAa2V5cy5zcGFjZWJhci5qdXN0RG93blxuICAgICAgICAgICAgICAgIEBnYW1lLnN0YXRlLnN0YXJ0KCdsZXZlbHNlbGVjdCcpXG5cbiAgICAgICAgQHVwZGF0ZUh1ZHMoKVxuXG5cbmNsYXNzIFdpbkxvc2VTdGF0ZVxuICAgIGNyZWF0ZTogLT5cblxuXG5nYW1lID0gbmV3IFBoYXNlci5HYW1lKFNDUkVFTl9XSURUSCwgU0NSRUVOX0hFSUdIVCwgUGhhc2VyLkFVVE8sICdnYW1lJylcbmdhbWUuc3RhdGUuYWRkKCdib290JywgQm9vdFN0YXRlKVxuZ2FtZS5zdGF0ZS5hZGQoJ3ByZWxvYWQnLCBQcmVsb2FkU3RhdGUpXG5nYW1lLnN0YXRlLmFkZCgnaW50cm8nLCBJbnRyb1N0YXRlKVxuZ2FtZS5zdGF0ZS5hZGQoJ3RpdGxlJywgVGl0bGVTdGF0ZSlcbmdhbWUuc3RhdGUuYWRkKCdob3ctdG8tcGxheScsIEhvd1RvUGxheVN0YXRlKVxuZ2FtZS5zdGF0ZS5hZGQoJ2xldmVsc2VsZWN0JywgTGV2ZWxTZWxlY3RTdGF0ZSlcbmdhbWUuc3RhdGUuYWRkKCdnYW1lJywgR2FtZVN0YXRlKVxuZ2FtZS5zdGF0ZS5hZGQoJ3dpbmxvc2UnLCBXaW5Mb3NlU3RhdGUpXG5cbmdhbWUuc3RhdGUuc3RhcnQoJ2Jvb3QnKVxuIl19
