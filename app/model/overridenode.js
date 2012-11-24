/*
* Ordina, OSD Mobile
*
* Copyright (c) 2012 - Ordina N.V.
*
*/

(function(define) {
	
    define([ "when", "meld", "./node" ], function(when, meld, Node) {
	
	    var searchIndex = {};
	    var searchKeys = [ "id", "title" ];
	    
		meld.around(Node, /^get.*/, function(joinpoint) {
                var info = getOverrideForNode(this);
                var propName = joinpoint.method.substring(3).toLowerCase();
    
                if (info != null && propName in info && propName != "parent" && propName != "children") {
                    var override = info[propName];
                    if (override === null) {
                        return null;
                    } else {
                        return overlay(joinpoint.proceed(), override);
                    }
                } else {
                    return joinpoint.proceed();
                }
            });
        
        return {
            load: function (name, require, load, config) {
                var errback = callback.error || function(e) {
                    // Throw uncatchable exception for loaders that don't support
                    // AMD error handling.  This will propagate up to the host environment
                    setTimeout(function() { throw e; }, 0);
                };
                
                when(require(name),
                    function(def) { 
                        loadDefinition(def);
                        load(Node);
                    },
                    load.error
                );    
            }
        };

        function loadDefinition = function(overrideDef) {
            if ("searchKeys" in overrideDef)
                updateSearchKeys(overrideDef.searchKeys);
            buildIndex(overrideDef.overrides);
        }

        function updateSearchKeys(newKeys) {
            for (var i = 0; i < newKeys.length; i++ ) {
                var k = newKeys[i];
                if (searchKeys.indexOf(k) < 0) {
                    searchKeys.push(k);
                }
            }
        }

		function updateSearchIndex(overrideList) {
		    var index = searchIndex;
		    var keys = searchKeys;
		        
		    for (var i = 0; i < keys.length; i++) {
		        if (!(keys[i] in index)) {
    		        index[keys[i]] = {};
		        }
		    }
		    
		    for (var node in overrideList) {
		        for (var i = 0; i < keys.length; i++) {
		            var key = keys[i];
		            if (key in node && node[key] !== null) {
		                var idxKey = typeof node[key] == "string" ? node[key] : node[key].toString();
		                idxKey = idxKey.toLowerCase();
		                if (!(idxKey in index[key])) {
		                    index[key][idxKey] = {};
		                }
		                index[key][idxKey] = overlay(index[key][idxKey], node);
		            }
		        }
		    }
		    return index;
		}
	
	    function getOverrideForNode(node) {
	        var keys = searchKeys;
	        var index = searchIndex;
	        
	        for (var i = 0; i < keys.length; i++) {
	            var key = keys[i];
	            var fnName = "get" + key.substring(0,1).toUpperCase() + key.subString(1);
	            var idxKey = node[fnName].call(node);
	            if (idxKey !== null) {
	                idxKey = idxKey.toLowerCase();
	                return index[key][idxKey];
	            }
	        }
	        return null;
	    }
	    
	    function overlay(orig, override) {
    	    if (override === null) {
                return null;
            } else if (typeof override == "object") {
                var result = {};
                for (var prop in orig) {
                    result[prop] = orig[prop];
                }
                for (var prop in override) {
                    if (prop in result) {
                        result[prop] = overlay(orig[prop], result[prop]);
                    } else {
                        result[prop] = override[prop];
                    }
                }
                return result;
            } else {
                return override;
            }
	    }
	
	});

})(typeof define == 'function'
        // AMD
        ? define
        // CommonJS
        : function(deps, factory) {
                module.exports = factory.apply(this, [require].concat(deps.slice(1).map(function(x) {
                        return require(x);
                })));
        }
);
