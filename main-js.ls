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
    init-js
}

# {} = fish-lib-node = require 'fish-lib-node'

# --- init the javascript environment with a window.<namespace-name>
# namespace. 
#
# must be called for each new window context if you want to access the
# environment.
#
# simple-config will be merged into the namespace.
#
# only simple values are allowed -- anything which can be serialisable as
# JSON. No functions, DOM elements, etc.

function init-js namespace-name, simple-config = {}
    throw new Error unless namespace-name?
    throw new Error if window[namespace-name]

    # allows array but rejects null
    is-obj = ->
        it and (typeof it is 'object')

    # fix indents XX
    inspect = (value, { indent = 0, key = false, str = '' } = {}) ->
        if is-obj value
            indent = indent + 1
            for k, v of value
                key = true
                str = inspect k, { indent, key, str }
                key = false
                str = inspect v, { indent, key, str }
            indent = indent - 1
        else
            # * operator won't work -- needs function magic.
            space = ['' for i from 0 to indent].join ' '
            val = value
            val += ':' if key
            str = str + space + val
        str

    window[namespace-name] =
        log: ->
            inspect = @inspect
            inspected = [].slice.call arguments
                .map -> inspect.call null it
            console.log.apply console, inspected
        warn: ->
            console.warn.apply console, arguments
        inspect: inspect

    for k, v of simple-config
        window[namespace-name][k] = v

    true
