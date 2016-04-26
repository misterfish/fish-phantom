# --- phantomjs specific
system = require 'system'

# --- mock parts of path, process, and util, which don't exist in phantomjs.
global <<< phantom-mock()

main-js = require './main-js'

{ map, each, join, } = prelude-ls = require 'prelude-ls'

{ log, info, bullet, iwarn, warn, error, array, is-array, sprintf, yellow, magenta, bright-red, green, is-positive-int, } = fish-lib = require 'fish-lib'

our =
    page: require 'webpage' .create()
    spinning: false # showing progress bar
    script-name: process.argv.1

export
    evaluate-javascript
    run-tape
    condition-wait
    init-window
    init

# --- necessary to log from within evaluate-javascript
our.page.on-console-message = (msg) ->
    log msg
    log '' if our.spinning

# --- gets called on each new page init, also when we navigate.
our.page.on-initialized = ->
    log 'Page initialised.'
    log '' if our.spinning

# --- called on evaluated javascript errors.
our.page.on-error = (msg, trace) ->
    msg-stack = [sprintf '%s JavaScript error: %s', (bright-red bullet()), msg]
    if trace and trace.length
        trace.for-each ->
            func = if it.function
                then " (in function #{it.function})"
                else ''
            msg-stack.push sprintf ' ٭ %s:%s%s', it.file, it.line, func

    console.error msg-stack.join '\n'
    console.error '' if our.spinning

# --- function for initial page open

function init { url, namespace-name, simple-config = {} }, done
    return warn 'Need url' unless url?
    return warn 'Need namespace-name' unless namespace-name?

    tick = do ->
        n = 2
        first = true
        set-interval do
            ->
                # can eat other output, e.g. 'page initialised' XX
                n := n + 1
                if first
                    first := false
                    up = ''
                else
                    up = escape-up()
                log "#{up}Waiting for initial page to load " + '.' * n
            1000

    # --- note that you can only use page.open once.
    our.page.open url, (status) ->
        info 'status' status
        if status is not 'success'
            err = "Couldn't browse to first page: status was " + bright-red status
            clear-interval tick
            done err: err

        clear-interval tick
        info 'calling init window'
        init-window { namespace-name, simple-config }, done

# --- functions to wait on a condition using page evaluated javascript, e.g.
#     to see if a page is ready
#
# opts.params: an array of positional parameters to pass.
# opts.no-progress: don't print progress info to the console.
# opts.timeout = n: give up and return after n milliseconds.
# opts.timeout-soft = n: print a warning every n milliseconds.
# opts.timeout-soft-msg, opts.timeout-msg: the timeout warning.
# opts.timeout-soft-print, opts.timeout-print: true to print a pdf each time
#   timeout occurs.
# opts.check-interval = n: check the condition every n milliseconds (default
#   100).

function condition-wait sandbox-function, {
    msg-str,
    params = [],
    check-interval = 100,
    no-progress = false,
    timeout-soft,
    timeout-soft-msg,
    timeout-soft-print,
    timeout,
    timeout-msg,
    timeout-print,
} = {}

    sandbox-function-params = map do
        ->
            # allow for accessors for later binding
            if is-function it
                then it()
                else it
        params

    return iwarn 'condition-wait: bad check-interval' unless is-positive-int check-interval

    # returns noop if no timeout duration specified
    timeout-soft-func = condition-wait-timeout 'soft',
        check-interval: check-interval
        duration: timeout-soft
        msg: timeout-soft-msg
        print: timeout-soft-print

    timeout-hard-func = condition-wait-timeout 'hard',
        check-interval: check-interval
        duration: timeout
        msg: timeout-msg
        print: timeout-print

    (data, done) ->
        n = 0
        first = true
        spin = get-spinner()
        our.spinning = true unless no-progress
        job = set-interval do
            ->
                timeout-soft-func()
                if timeout-hard-func()
                    clear-interval job
                    return done err: 'timeout'

                found = evaluate-javascript do
                    sandbox-function-params
                    sandbox-function

                spinner = spin()

                msg = if is-function msg-str
                    then msg-str()
                    else msg

                if not no-progress
                    log sprintf '%swaiting for page %s %s' (if first then '' else escape-up()), (yellow msg), spinner

                first = false

                # cycle again
                if found == void
                    true
                # error
                else if found == false
                    clear-interval job
                    done err: 'Javascript call returned an error.'

                return unless found

                clear-interval job
                our.spinning = false
                info "condition #{green msg} successful, moving on"

                done data: found
            check-interval

function condition-wait-timeout type, { check-interval, duration, msg, print } = {}
    return iwarn 'need check-interval' unless check-interval?
    return (->) unless duration? # noop

    do ->
        n = 0
        m = duration / check-interval
        msg = void
        if type is 'soft'
            msg = timeout-soft-msg ? '<soft timeout>'
        else
            msg = 'timeout'

        # timeout func, returns true if timed out
        ->
            n := (n + 1) % m
            if not n
                warn msg
                if print
                    our.page.render sprintf '%s.pdf' timestamp()
                return true

function init-window { namespace-name, simple-config = {} }, done
    done err: 'need namespace-name' unless namespace-name?

    ok = evaluate-javascript do
        namespace-name
        simple-config

        main-js.init-js

    done err: 'javascript error' unless ok
    done page: our.page

# --- tape, phantom and util functions

function clone-array ary
    [.. for ary]

# --- usage:
#   1) pass-param1, pass-param2, ... , func
#   2) [pass-param1, pass-param2, ... ,], func
#   3) func

function evaluate-javascript ...pass-vals, func
    page = our.page

    # phantom's page.evaluate takes a callback function followed by optional
    # parameters which are passed to the function.

    # note that the parameters have to be serialisable as JSON, so passing
    # complex values (e.g. DOM objects, functions) will not work.

    if pass-vals.length is 1 and is-array pass-vals.0 then
        args = clone-array pass-vals.0
            ..unshift func
    else
        args = pass-vals
            ..unshift func

    ok = page.evaluate.apply page, args

function run-tape tape
    tape-step tape, 0

# --- execute steps in the tape.
#
# each step is run as (data, done) ->

function tape-step tape, n=0, input-data
    return unless step = tape[n]
    step input-data, ({ err, data } = {}) ->
        next-data = data
        if err
            warn err
            process.exit()
        tape-step tape, n+1, next-data

function is-function target
    typeof! target is 'Function'

function get-spinner
    m = -1
    ->
        m := (m + 1) % 8
        sprintf do
            "%s%s%s"
            if m < 5
                then '.' * m
                else '.' * (8 - m)
            'o'
            if m < 5
                then '.' * (4 - m)
                else '.' * (m - 4)

function escape-up
    '[A'

# --- mock parts of path, process, and util, which don't exist in phantomjs.
function phantom-mock
    path: {}
    process:
        stdin: void # not currently necessary to mock
        # --- write methods include a '\n' -- doesn't seem to be easy to
        # avoid.
        stdout:
            write: -> console.log.apply console, arguments
        stderr:
            write: -> console.error.apply console, arguments
        exit: -> phantom.exit.call phantom, arguments
        env: system.env
        argv: ['__phantomjs__'] ++ system.args
    util:
        # just a simple inspector
        inspect: ->
            array arguments
                .map -> it.to-string()
                .join ' '

function timestamp
    d = new Date()
    sprintf '%4d-%2d-%2d-%2d-%2d.%03d',
        1900 + d.getYear(), 1 + d.getMonth(), d.getDate(),
        d.getHours(), d.getMinutes(), d.getMilliseconds()
