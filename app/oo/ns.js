(function(define) {

    define("oo/ns", function() {
    
        var rootNs = {};
            
        /**
        * ns: get a namespace object
        */
        return function() {
            var curNs = rootNs;
            var len = arguments.length;
            var i = 0;
            if (len > 0 && typeof arguments[i] == "object") {
                curNs = arguments[i];
                i = 1;
            }
            for (i = i; i < len; i++) {
                var parts = arguments[i].split(".");
                for (var j = 0; j < parts.length; j++) {
                    if (!(parts[j] in curNs)) {
                        curNs[parts[j]] = {};
                    }
                    curNs = curNs[parts[j]];
                }
            }
            return curNs;
        };
    };
    
})(typeof define == 'function'
    // AMD
    ? define
    // CommonJS
    : function(deps, factory) {
            module.exports = factory.apply(this, [require].concat(deps.slice(1).map(function(x) {
                    return require(x);
            })));
});