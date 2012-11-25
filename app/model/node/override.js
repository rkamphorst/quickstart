/*
* Ordina, OSD Mobile
*
* Copyright (c) 2012 - Ordina N.V.
*
*/

(function(define) {
    
    define([ "when", "meld", "./node" ], function(when, meld, Node) {
    
        /**
         * Index that contains overlays for nodes.
         * It is a 2-level dictionary object. 
         * Keys on level 1 are property names, keys on level 2 are 
         * property values (all lowercase). Nodes are matched, in the order
         * specified in searchKeys, on property key-value pairs. 
         * The first match is returned.
         */
        var searchIndex = {};
        
        /**
         * Keys to match nodes on. Configurable with searchKeys in the
         * plugin configuration.
         */
        var searchKeys = [ "id", "title" ];
        
        // Change behavior of Node getters to first check index for an override,
        // and then the internal value.
        meld.around(Node, /^get.*/, function(joinpoint) {
                var info = getOverrideForNode(this);
                var propName = joinpoint.method.substring(3).toLowerCase();
    
                if (info !== null && propName in info && propName != "parent" && propName != "children") {
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
        
        /**
         * The load() method makes it possible to define() a list of node overrides.
         * Example:
         *
         * define("myoverrides", {
         *    overrides: [
         *       {
         *          nid: ...
         *          title: ...
         *       },
         *       {
         *          nid: ...
         *          ...
         *       },
         *       ...
         *    ]
         * });
         * 
         * curl(["model/node/override!myoverrides"], callback, errback);
         */
        return {
            load: function (name, require, load, config) {
                when(require([name]),
                    function(def) { 
                        loadDefinition(def);
                        load(Node);
                    },
                    load.error
                );    
            }
        };

        function loadDefinition = function(overrideDef, cfg) {
            var keys = cfg.searchKeys ? cfg.searchKeys : searchKeys;
            searchKeys = keys;
            buildIndex(overrideDef.overrides);
        }

        function updateSearchIndex(overrideList) {
            var index = searchIndex;
            var keys = searchKeys;
                
            for (var i = 0; i < keys.length; i++) {
                if (!(keys[i] in index)) {
                    index[keys[i]] = {};
                }
            }
            
            for (var override in overrideList) {
                for (var key in index) {
                    if (key in override && override[key] !== null) {
                        var idxKey = typeof override[key] == "string" 
                            ? override[key].toLowerCase() 
                            : override[key].toString().toLowerCase();
                        if (!(idxKey in index[key])) {
                            index[key][idxKey] = {};
                        }
                        index[key][idxKey] = overlay(index[key][idxKey], override);
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
                var idxKey = typeof node[fnName] == "function" ? node[fnName].call(node) : null;
                if (idxKey !== null) {
                    idxKey = idxKey.toLowerCase();
                    return idxKey in index ? index[key][idxKey] : null;
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
