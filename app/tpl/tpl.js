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
            domSelector,
            domSelectorActive, domSelectorInactive,
            domSelectorActiveView, domSelectorInactiveView,
            currentView = null,
            currentViewKey = null,
            cachedTemplates = [];

        // set selectors ("constant")
        domSelector = ".view";
        domSelectorActive = ".active";
        domSelectorInactive = ".inactive";
        domSelectorActiveView = domSelector + domSelectorActive;
        domSelectorInactiveView = domSelector + domSelectorInactive;


        /**
        * Make sure a view key is a valid string
        *
        * @param viewKey  the view key to coerce
        */
        function coerceViewKey(viewKey) {
            if (typeof viewKey === "undefined" || viewKey === null) {
                viewKey = "";
            } else if (typeof viewKey != "string") {
                viewKey = viewKey.toString();
            }
            return viewKey;
        };

        function addHistoryEntry(viewKey, params) {
            // update history
            var viewHistoryEntry = {
                view: viewKey,

            };
            for (var prop in params) {
                viewHistoryEntry[prop] = params[prop];
            }
            viewHistory.push(viewHistoryEntry);
        }


        /**
         * Creates a transition function that can be called from within
         * viewLoad.
         * The created function requires 1 parameter, the info object that
         * is passed to viewSetup or viewChange.
         *
         * @param isNewView         Whether viewSetup should be called (true) or viewChange (false)
         * @param $activeView       The active view element (jquery)
         * @param $inactiveView     The inactive view element (jquery)
         * @param loadingTimeoutId  The time-out id of the loading dialog. If the loading dialog is not
         *                          yet shown when the transition function is called, it should never
         *                          be shown. With window.clearTimeout the execution of this dialog
         *                          can be prevented.
         */
        function createTransition (isNewView, $activeView, $inactiveView, loadingTimeoutId) {
            if (isNewView) {
                return function(info) {
                    window.clearTimeout(loadingTimeoutId);
                    hideLoading();

                    var parentElem = $inactiveView.children('div').first();

                    parentElem = $inactiveView.children('div').first();
                    if (window.viewSetup) {
                        window.viewSetup(parentElem, info);
                    }
                    if (window.globalViewSetup) {
                        window.globalViewSetup(parentElem, info);
                    }

                    $activeView.addClass('inactive').removeClass('active');
                    $inactiveView.addClass('active').removeClass('inactive');
                };
            } else {
                return function(info) {
                    window.clearTimeout(loadingTimeoutId);
                    hideLoading();

                    var parentElem = $activeView.children('div').first();
                    if (typeof window.globalViewChange == "function") {
                        window.globalViewChange(parentElem, info);
                    }
                    if (typeof window.viewChange == "function") {
                        window.viewChange(parentElem, info);
                    }
                };
            }
        };

        /**
        * Do a transition to the view with given parameters
        *
        * @param params  Parameters object with one compulsory property "view"
        *                Based on this view, the view template to execute is chosen.
        */
        function doTransition (viewKey, params) {
            var
                info, parentElem,
                viewKey = params.view = coerceViewKey(params.view),
                isNewView = (viewKey !== currentViewKey),
                $inactiveView = $(inactiveViewSel),
                $activeView = $(activeViewSel),
                transitionCallback =
                    createTransition(
                        isNewView, $activeView, $inactiveView, loadingTimeoutId
                    );

            addHistoryEntry(viewKey, params);

            if (!isNewView) {
                // The view template to be loaded is the same as the currently
                // active view template. Call the current viewLoad to see whether
                // current view can be changed into new view without load
                if (typeof window.viewLoad == "function") {
                    info = window.viewLoad(params, isNewView, transitionCallback);
                } else {
                    info = false;
                }
                if (info === false) {
                    // bad luck. need to reload :-(
                    isNewView = true;
                    transitionCallback = createTransition(isNewView, $activeView, $inactiveView, loadingTimeoutId);
                } else if (info !== transitionCallback) {
                    // directly transition :-)
                    if (typeof info == "object" && info !== null) {
                        transitionCallback(info);
                    } else {
                        transitionCallback(params);
                    }
                }
            }

            if (isNewView) {

                // first: establish template
                var template;
                if (typeof templates[viewKey] === "string") {
                    template = templates[viewKey];
                } else if (typeof templates[""] === "string") {
                    template = templates[""];
                } else {
                    throw new Error("No template for view: "  + viewKey + " and no default template defined");
                }

                // tear down currently active view. NOTE: should not change anything visually !!
                parentElem = $activeView.children('div').first();
                if (typeof window.viewTeardown == "function") {
                    window.viewTeardown(parentElem);
                }
                if (typeof window.globalViewTeardown == "function") {
                    window.globalViewTeardown(parentElem);
                }

                // remove old view* functions from window so we don't accidentally
                // call one of them if new view template doesn't overwrite one of them.
                delete window.viewLoad
                delete window.viewTeardown
                delete window.viewSetup
                delete window.viewChange

                // make sure to change te current view key when necessary
                if (viewKey !== currentViewKey) {
                    previousViewKey = currentViewKey;
                    currentViewKey = viewKey;
                }

                // load new view template into inactive (hidden) view
                $inactiveView.load(template, function() {
                    var info = null;
                    if (typeof window.viewLoad == "function") {
                        // call the new view's load
                        info = window.viewLoad(params, isNewView, transitionCallback);
                    }
                    if (info !== transitionCallback) {
                        if (typeof info == "object" && info !== null) {
                            transitionCallback(info);
                        } else {
                            transitionCallback(params);
                        }
                    }
                });
            }
        };

        function addTemplate(tplName, definition) {
            cachedTemplates.push(tplName, definition);
        }

        /**
         * Find the object representing view parameters in a number of (node) objects
         *
         * @param inObjects  Objects to search for given parameters (using findForViewParams)
         * @param params     View parameters to search for
         */
        function findForViewParams (params, inObjects, deepest) {
            if (!inObjects) inObjects = findObjects;
            var result = null;
            for (var i = 0; !result && i < inObjects.length; i++) {
                if (inObjects[i] != null && typeof inObjects[i].findForViewParams == 'function') {
                    result = inObjects[i].findForViewParams(params, deepest);
                }
            }
            return result;
        };

        function setFindObjects (objects) {
            findObjects = [];
            if (typeof objects == "object" && objects.length) {
                for (var i = 0; i < objects.length; i++) {
                    findObjects[i] = objects[i];
                }
            } else {
                objects = [];
            }
        };

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