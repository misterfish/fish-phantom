main = require './main'
main-js = require './main-js'

export
    evaluate-javascript: main.evaluate-javascript
    run-tape: main.run-tape
    condition-wait: main.condition-wait
    init: main.init

    init-js: main-js.init-js
