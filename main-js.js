/*
    functions to run in page.evaluate.

    (at the moment, it's just one function.)

    note that they exist within the javascript sandbox and can't access
    outside variables.

    and do remember to call them inside of page.evaluate() (or our
    evaluate-javascript()).

    it's recommended to follow the convention of ending sandboxed function
    names with -js as a reminder of this.

    functions and objects can be passed in to the context using
    window.<namespace-name> -- see init-js.

    functions which are being used as wait conditions for condition-wait
    begin by convention with is-, and should return *false* to indicate an
    error, a true value if the test was successful, and *undefined* to mean
    not yet.

    other functions should throw an exception if something goes wrong --
    this is the easiest (and maybe only) way to get a stack trace from
    within the sandbox, and for programmer errors the argument is optional. 
        
    these functions should return a true value if everything was ok.

    in both kinds of functions the return value will be sent to the callback
    in the 'data' field. The same caveats apply as to the simple-config
    object (see below) -- it has to be serialisable as JSON.

    livescript example using evaluate-javascript:
        ret-data = evaluate-javascript do
            param1
            param2

            xxx-js

    (javascript:
        var ret-data = evaluateJavascript(param1, param2, xxx-js);
    )

    livescript example using condition-wait:
        ok = condition-wait do
            yyy-js
            msg-str: 'some condition'

    (javascript:
        var ok = conditionWait(yyy-js, {
            msgStr: 'some condition',
        });
    )

    @livescript enthusiasts: livescript 'magic' which depends on generating
    anonymous functions to work will not work in the sandbox -- best to keep
    the syntax simple. 
    
    some things that won't work:
        export
        'str' * n
*/
module.exports = {
  initJs: initJs
};
function initJs(namespaceName, simpleConfig){
  var isObj, inspect, k, v;
  simpleConfig == null && (simpleConfig = {});
  if (namespaceName == null) {
    throw new Error;
  }
  if (window[namespaceName]) {
    throw new Error;
  }
  isObj = function(it){
    return it && typeof it === 'object';
  };
  inspect = function(value, arg$){
    var ref$, indent, ref1$, key, str, k, v, space, i, val;
    ref$ = arg$ != null
      ? arg$
      : {}, indent = (ref1$ = ref$.indent) != null ? ref1$ : 0, key = (ref1$ = ref$.key) != null ? ref1$ : false, str = (ref1$ = ref$.str) != null ? ref1$ : '';
    if (isObj(value)) {
      indent = indent + 1;
      for (k in value) {
        v = value[k];
        key = true;
        str = inspect(k, {
          indent: indent,
          key: key,
          str: str
        });
        key = false;
        str = inspect(v, {
          indent: indent,
          key: key,
          str: str
        });
      }
      indent = indent - 1;
    } else {
      space = (function(){
        var i$, to$, results$ = [];
        for (i$ = 0, to$ = indent; i$ <= to$; ++i$) {
          i = i$;
          results$.push('');
        }
        return results$;
      }()).join(' ');
      val = value;
      if (key) {
        val += ':';
      }
      str = str + space + val;
    }
    return str;
  };
  window[namespaceName] = {
    log: function(){
      var inspect, inspected;
      inspect = this.inspect;
      inspected = [].slice.call(arguments).map(function(it){
        return inspect.call(null, it);
      });
      return console.log.apply(console, inspected);
    },
    warn: function(){
      return console.warn.apply(console, arguments);
    },
    inspect: inspect
  };
  for (k in simpleConfig) {
    v = simpleConfig[k];
    window[namespaceName][k] = v;
  }
  return true;
}