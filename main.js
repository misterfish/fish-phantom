var system, mainJs, preludeLs, ref$, map, each, join, fishLibNode, log, info, bullet, iwarn, warn, error, array, isArray, sprintf, yellow, magenta, brightRed, green, isPositiveInt, our, out$ = typeof exports != 'undefined' && exports || this, slice$ = [].slice, toString$ = {}.toString;
system = require('system');
import$(global, phantomMock());
mainJs = require('./main-js');
ref$ = preludeLs = require('prelude-ls'), map = ref$.map, each = ref$.each, join = ref$.join;
ref$ = fishLibNode = require('fish-lib-node'), log = ref$.log, info = ref$.info, bullet = ref$.bullet, iwarn = ref$.iwarn, warn = ref$.warn, error = ref$.error, array = ref$.array, isArray = ref$.isArray, sprintf = ref$.sprintf, yellow = ref$.yellow, magenta = ref$.magenta, brightRed = ref$.brightRed, green = ref$.green, isPositiveInt = ref$.isPositiveInt;
our = {
  page: require('webpage').create(),
  spinning: false,
  scriptName: process.argv[1]
};
out$.evaluateJavascript = evaluateJavascript;
out$.runTape = runTape;
out$.conditionWait = conditionWait;
out$.initWindow = initWindow;
out$.init = init;
our.page.onConsoleMessage = function(msg){
  log(msg);
  if (our.spinning) {
    return log('');
  }
};
our.page.onInitialized = function(){
  log('Page initialised.');
  if (our.spinning) {
    return log('');
  }
};
our.page.onError = function(msg, trace){
  var msgStack;
  msgStack = [sprintf('%s JavaScript error: %s', brightRed(bullet()), msg)];
  if (trace && trace.length) {
    trace.forEach(function(it){
      var func;
      func = it['function'] ? " (in function " + it['function'] + ")" : '';
      return msgStack.push(sprintf(' ٭ %s:%s%s', it.file, it.line, func));
    });
  }
  console.error(msgStack.join('\n'));
  if (our.spinning) {
    return console.error('');
  }
};
function init(arg$, done){
  var url, namespaceName, userAgent, simpleConfig, ref$, that, tick;
  url = arg$.url, namespaceName = arg$.namespaceName, userAgent = arg$.userAgent, simpleConfig = (ref$ = arg$.simpleConfig) != null
    ? ref$
    : {};
  if (url == null) {
    return warn('Need url');
  }
  if (namespaceName == null) {
    return warn('Need namespace-name');
  }
  if ((that = userAgent) != null) {
    our.page.settings.userAgent = that;
  }
  tick = function(){
    var n, first;
    n = 2;
    first = true;
    return setInterval(function(){
      var up;
      n = n + 1;
      if (first) {
        first = false;
        up = '';
      } else {
        up = escapeUp();
      }
      return log((up + "Waiting for initial page to load ") + repeatString$('.', n));
    }, 1000);
  }();
  return our.page.open(url, function(status){
    var err;
    info('status', status);
    if (status !== 'success') {
      err = "Couldn't browse to first page: status was " + brightRed(status);
      clearInterval(tick);
      done({
        err: err
      });
    }
    clearInterval(tick);
    info('calling init window');
    return initWindow({
      namespaceName: namespaceName,
      simpleConfig: simpleConfig
    }, done);
  });
}
function conditionWait(sandboxFunction, arg$){
  var ref$, msgStr, params, ref1$, checkInterval, noProgress, timeoutSoft, timeoutSoftMsg, timeoutSoftPrint, timeout, timeoutMsg, timeoutPrint, sandboxFunctionParams, timeoutSoftFunc, timeoutHardFunc;
  ref$ = arg$ != null
    ? arg$
    : {}, msgStr = ref$.msgStr, params = (ref1$ = ref$.params) != null
    ? ref1$
    : [], checkInterval = (ref1$ = ref$.checkInterval) != null ? ref1$ : 100, noProgress = (ref1$ = ref$.noProgress) != null ? ref1$ : false, timeoutSoft = ref$.timeoutSoft, timeoutSoftMsg = ref$.timeoutSoftMsg, timeoutSoftPrint = ref$.timeoutSoftPrint, timeout = ref$.timeout, timeoutMsg = ref$.timeoutMsg, timeoutPrint = ref$.timeoutPrint;
  sandboxFunctionParams = map(function(it){
    if (isFunction(it)) {
      return it();
    } else {
      return it;
    }
  }, params);
  if (!isPositiveInt(checkInterval)) {
    return iwarn('condition-wait: bad check-interval');
  }
  timeoutSoftFunc = conditionWaitTimeout('soft', {
    checkInterval: checkInterval,
    duration: timeoutSoft,
    msg: timeoutSoftMsg,
    print: timeoutSoftPrint
  });
  timeoutHardFunc = conditionWaitTimeout('hard', {
    checkInterval: checkInterval,
    duration: timeout,
    msg: timeoutMsg,
    print: timeoutPrint
  });
  return function(data, done){
    var n, first, spin, job;
    n = 0;
    first = true;
    spin = getSpinner();
    if (!noProgress) {
      our.spinning = true;
    }
    return job = setInterval(function(){
      var found, spinner, msg, first;
      timeoutSoftFunc();
      if (timeoutHardFunc()) {
        clearInterval(job);
        return done({
          err: 'timeout'
        });
      }
      found = evaluateJavascript(sandboxFunctionParams, sandboxFunction);
      spinner = spin();
      msg = isFunction(msgStr) ? msgStr() : msgStr;
      if (!noProgress) {
        log(sprintf('%swaiting for condition %s %s', first
          ? ''
          : escapeUp(), yellow(msg), spinner));
      }
      first = false;
      if (found === void 8) {
        true;
      } else if (found === false) {
        clearInterval(job);
        done({
          err: 'Javascript call returned an error.'
        });
      }
      if (!found) {
        return;
      }
      clearInterval(job);
      our.spinning = false;
      info("condition " + green(msg) + " successful, moving on");
      return done({
        data: found
      });
    }, checkInterval);
  };
}
function conditionWaitTimeout(type, arg$){
  var ref$, checkInterval, duration, msg, print;
  ref$ = arg$ != null
    ? arg$
    : {}, checkInterval = ref$.checkInterval, duration = ref$.duration, msg = ref$.msg, print = ref$.print;
  if (checkInterval == null) {
    return iwarn('need check-interval');
  }
  if (duration == null) {
    return function(){};
  }
  return function(){
    var n, m, msg;
    n = 0;
    m = duration / checkInterval;
    msg = void 8;
    if (type === 'soft') {
      msg = typeof timeoutSoftMsg != 'undefined' && timeoutSoftMsg !== null ? timeoutSoftMsg : '<soft timeout>';
    } else {
      msg = 'timeout';
    }
    return function(){
      n = (n + 1) % m;
      if (!n) {
        warn(msg);
        if (print) {
          our.page.render(sprintf('%s.pdf', timestamp()));
        }
        return true;
      }
    };
  }();
}
function initWindow(arg$, done){
  var namespaceName, simpleConfig, ref$, ok;
  namespaceName = arg$.namespaceName, simpleConfig = (ref$ = arg$.simpleConfig) != null
    ? ref$
    : {};
  if (namespaceName == null) {
    done({
      err: 'need namespace-name'
    });
  }
  ok = evaluateJavascript(namespaceName, simpleConfig, mainJs.initJs);
  if (!ok) {
    done({
      err: 'javascript error'
    });
  }
  return done({
    page: our.page
  });
}
function cloneArray(ary){
  var i$, x$, len$, results$ = [];
  for (i$ = 0, len$ = ary.length; i$ < len$; ++i$) {
    x$ = ary[i$];
    results$.push(x$);
  }
  return results$;
}
function evaluateJavascript(){
  var i$, passVals, func, page, x$, args, y$, ok;
  passVals = 0 < (i$ = arguments.length - 1) ? slice$.call(arguments, 0, i$) : (i$ = 0, []), func = arguments[i$];
  page = our.page;
  if (passVals.length === 1 && isArray(passVals[0])) {
    x$ = args = cloneArray(passVals[0]);
    x$.unshift(func);
  } else {
    y$ = args = passVals;
    y$.unshift(func);
  }
  return ok = page.evaluate.apply(page, args);
}
function runTape(tape){
  return tapeStep(tape, 0);
}
function tapeStep(tape, n, inputData){
  var step;
  n == null && (n = 0);
  if (!(step = tape[n])) {
    return;
  }
  return step(inputData, function(arg$){
    var ref$, err, data, nextData;
    ref$ = arg$ != null
      ? arg$
      : {}, err = ref$.err, data = ref$.data;
    nextData = data;
    if (err) {
      warn(err);
      process.exit();
    }
    return tapeStep(tape, n + 1, nextData);
  });
}
function isFunction(target){
  return toString$.call(target).slice(8, -1) === 'Function';
}
function getSpinner(){
  var m;
  m = -1;
  return function(){
    m = (m + 1) % 8;
    return sprintf("%s%s%s", m < 5
      ? repeatString$('.', m)
      : repeatString$('.', 8 - m), 'o', m < 5
      ? repeatString$('.', 4 - m)
      : repeatString$('.', m - 4));
  };
}
function escapeUp(){
  return '[A';
}
function phantomMock(){
  return {
    path: {},
    process: {
      stdin: void 8,
      stdout: {
        write: function(){
          return console.log.apply(console, arguments);
        }
      },
      stderr: {
        write: function(){
          return console.error.apply(console, arguments);
        }
      },
      exit: function(){
        return phantom.exit.call(phantom, arguments);
      },
      env: system.env,
      argv: ['__phantomjs__'].concat(system.args)
    },
    util: {
      inspect: function(){
        return array(arguments).map(function(it){
          return it.toString();
        }).join(' ');
      }
    }
  };
}
function timestamp(){
  var d;
  d = new Date();
  return sprintf('%4d-%2d-%2d-%2d-%2d.%03d', 1900 + d.getYear(), 1 + d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getMilliseconds());
}
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
function repeatString$(str, n){
  for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
  return r;
}