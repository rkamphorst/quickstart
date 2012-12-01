/*jslint nomen: true, regexp: true, white: true, browser: true, node: true, indent: 4 */

/*
 * Ordina, OSD Mobile
 *
 * Copyright (c) 2012 - Ordina N.V.
 *
 */ (function (define) {

    'use strict';

    define(["when", "meld", "./node"], function (when, meld, Node) {

        var
        /**
         * Index that contains overlays for nodes.
         * It is a 2-level dictionary object. 
         * Keys on level 1 are property names, keys on level 2 are 
         * property values (all lowercase). Nodes are matched, in the order
         * specified in searchKeys, on property key-value pairs. 
         * The first match is returned.
         */
        searchIndex = {},

        /**
         * Keys to match nodes on. Configurable with searchKeys in the
         * plugin configuration.
         */
        searchKeys = ["id", "title"];


        function overlay(orig, override) {
            var result, prop;

            if (override === null) {
                return null;
            }

            if (typeof override === "object") {
                result = {};
                for (prop in orig) {
                    if (orig.hasOwnProperty(prop)) {
                        result[prop] = orig[prop];
                    }
                }
                for (prop in override) {
                    if (override.hasOwnProperty(prop)) {
                        if (result.hasOwnProperty(prop)) {
                            result[prop] = overlay(orig[prop], result[prop]);
                        } else {
                            result[prop] = override[prop];
                        }
                    }
                }
                return result;
            }

            return override;
        }

        function updateSearchIndex(overrideList) {
            var
            i, override, key, idxKey,
            index = searchIndex,
                keys = searchKeys;

            for (i = 0; i < keys.length; i += 1) {
                if (!index.hasOwnProperty(keys[i])) {
                    index[keys[i]] = {};
                }
            }

            for (i = 0; i < overrideList.length; i += 1) {
                override = overrideList[i];
                for (key in index) {
                    if (index.hasOwnProperty(key) && override.hasOwnProperty(key) && override[key] !== null) {
                        idxKey = typeof override[key] === "string" ? override[key].toLowerCase() : override[key].toString().toLowerCase();
                        if (!index[key].hasOwnProperty(idxKey)) {
                            index[key][idxKey] = {};
                        }
                        index[key][idxKey] = overlay(index[key][idxKey], override);
                    }
                }
            }
            return index;
        }

        function loadDefinition(overrideDef, cfg) {
            var keys = cfg.searchKeys || searchKeys;
            searchKeys = keys;
            updateSearchIndex(overrideDef.overrides);
        }



        function getOverrideForNode(node) {
            var
            i, key, fnName, idxKey,
            keys = searchKeys,
                index = searchIndex;

            for (i = 0; i < keys.length; i += 1) {
                key = keys[i];
                fnName = "get" + key.substring(0, 1).toUpperCase() + key.subString(1);
                idxKey = typeof node[fnName] === "function" ? node[fnName]() : null;
                if (idxKey !== null) {
                    idxKey = idxKey.toLowerCase();
                    return index.hasOwnProperty(idxKey) ? index[key][idxKey] : null;
                }
            }
            return null;
        }

        // Change behavior of Node getters to first check index for an override,
        // and then the internal value.
        meld.around(Node, /^get/, function (joinpoint) {
            var
            override,
            info = getOverrideForNode(this),
                propName = joinpoint.method.substring(3).toLowerCase();

            if (info !== null && info.hasOwnProperty(propName) && propName !== "parent" && propName !== "children") {
                override = info[propName];
                if (override === null) {
                    return null;
                }
                return overlay(joinpoint.proceed(), override);
            }
            return joinpoint.proceed();
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
            load: function (name, require, load /*, config */ ) {
                when(require([name]),

                function (def) {
                    loadDefinition(def);
                    load(Node);
                },
                load.error);
            }
        };

    });

}(typeof this.define === 'function'
// AMD
?
this.define
// CommonJS
:


function (deps, factory) {
    'use strict';
    module.exports = factory.apply(this, [require].concat(deps.slice(1).map(function (x) {
        return require(x);
    })));
}));