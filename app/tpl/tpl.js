/*jslint nomen: true, regexp: true, white: true, browser: true, node: true, indent: 4 */

/*
 * Ordina, OSD Mobile
 *
 * Copyright (c) 2012 - Ordina N.V.
 *
 */
(function (define) {

    "use strict";

    define([ "when", "node", "jquery" ], function(when, Node, $) {

        var
            cachedTemplates = [];



        function addTemplate(tplName, definition) {
            cachedTemplates.push(tplName, definition);
        }

        return {
            load: function (name, require, load /*, config */ ) {
                var tplName = name.substring(name.lastIndexOf('/'));
                when(require([name]),
                    function (def) {
                        addTemplate(tplName, def);
                        load(def);
                    },
                    load.error
                );
            }
        };
    });

}(typeof this.define === "function"
// AMD
?
this.define
// CommonJS
:


function (deps, factory) {
    "use strict";
    module.exports = factory.apply(this,
        [require].concat(
            deps.slice(1).map(
                function (x) {
                    return require(x);
                }
            )
        )
    );
}));