/*
* Ordina, OSD Mobile
*
* Copyright (c) 2012 - Ordina N.V.
*
*/
/**
 * MODULE: osd.mobile.ui.browse
 *
 * This component defines a way of browsing through a javascript
 * application, making use of different view templates and loading
 * them client-side. It makes use of the hash (#...) component
 * of the url in the address bar to determine which view template
 * to load and to maintain browser history for the application.
 *
 * HASH PARAMETERS
 *
 * The hash component of the url is treated as a param string 
 * (e.g. "#param1=val1&param2=val2&..."). One of the parameters
 * is "view". Depending on the view that is set, a template for 
 * that view is loaded. The remaining parameters are passed to
 * this view to complete loading. 
 *
 * TEMPLATE PROTOCOL
 *
 * A view template is a .html file that contains a html fragment
 * of exactly one <div> element. This outer <div> element has no 
 * id and no styling information.
 * 
 * Inside this <div>, create the basic html structure of the
 * template. Make sure none of the elements has an id attribute,
 * because two instances of the same template may be loaded 
 * simultaneously in the same document.
 *
 * At the end of the <div>, add a <script> element with
 * javascript. You can define the following functions that will
 * be used during different phases of a transition from one page
 * to another. Defining these functions is optional.
 *
 * - window.viewLoad(params, isNewView, transitionCallback):
 *   Called first. This function has responsibility to:
 *       1. If isNewView = false, decide whether the required 
 *          view can be presented within the currently loaded view.
 *          If not, return false.
 *       2. Gather information (info) needed for viewSetup or
 *          viewChanged.
 *       3. Invoke transitionCallback(info) if gathering information needs 
 *			to be done asynchronously, or if custom operations need to be
 *          carried out after the transition has been completed; return
 *          transitionCallback (the function, not its result!) in this case.
 *          Otherwise, just return info.
 *   Arguments:
 *       1. params: Object containing parameters from the hash
 *       2. isNewView: Whether the required view template is different
 *          from the previous view template. 
 *       3. transitionCallback: Function that will be called after
 *          loading has finished. If you return this transitionCallback
 *          (see below), you indicate that you assume responsibility
 *          for calling it; otherwise, it is called automatically.
 *          The transitionCallback can be called with one parameter:
 *          the information object (see (1) under Return value, below).
 *   Return value, one of:
 *       1. Object value that contains info to call viewSetup or viewChange 
 *          with. transitionCallback will be called automagically with this parameter.
 *       2. Boolean false, indicating this view template cannot
 *          load the required view (only valid if isNewView == false)
 *   	 3. The transitionCallback function that was passed as 
 *          the third parameter, indicating that the transitionCallback
 *          has been called or will be called asynchronously.
 *          If the transitionCallback is not called within 100 ms, 
 *          the "loading" dialog will appear on screen. It will disappear
 *          when transitionCallback is called.
 *
 * - window.viewTeardown(parentElem):
 *   Called by transitionCallback (on "old" view), 
 *   before the new view is setup. Only called if a *new* view template needs to
 *   be loaded.
 *   
 *   Responsibilities:
 *       1. Detach event handlers from objects that will not be
 *          unloaded (i.e., objects that are outside the parentElem
 *          element).
 *   Arguments:
 *       1. parentElem: jQuery object containing the enclosing div
 *          element of the view template.
 *   Return value: none
 *
 * - window.viewSetup(parentElem, info):
 *   Called by transitionCallback (on the "new" view), after viewTeardown on 
 *   (on the "old" view). Only called if new view needs to be loaded.
 *   Responsibilities:
 *       1. Populate the newly loaded view template using information from info
 *       2. Initialize the newly loaded and populated template
 *   Parameters:
 *       1. parentElem: jQuery object containting the enclosing div
 *          element of the view template
 *       2. info: Object with information gathered during viewLoad call.
 *   Return value: none.
 *
 * - window.viewChange(parentElem, info):
 *   Called by transitionCallback. Only called if "old" view can be changed
 *   into "new" view without reload. Responsibilities:
 *       1. Repopulate the current view so that it changes into the required view
 *   Parameters:
 *       1. parentElem: jQuery object containting the enclosing div
 *          element of the view template 
 *       2. info: Object with information gathered during viewLoad call.
 *   Return value: none.
 */
(function($) {

	// namespace
	var ns = Class.ns("osd.mobile.ui.browse");

	// css selectors
	var viewSel = ".view";
	var activeSel = ".active";
	var inactiveSel = ".inactive";
	var activeViewSel = viewSel + activeSel;
	var inactiveViewSel = viewSel + inactiveSel;
	var viewLoadingSel = ".view-loading";
	
	var viewHistory = [];
	
	// key of the view template that is currently in effect
	var currentViewKey = null;
	
	// key of the view template that was previously in effect
	var previousViewKey = null;
	
	// dictionary of view template files
	var templates = {};
	
	// objects (feeds?) that are searched for params
	var findObjects = [];
	
	/**
	 * Make sure a view key is a valid string
	 *
	 * @param viewKey  the view key to coerce
	 */
	var coerceViewKey = function(viewKey) {
		if (typeof viewKey == "undefined" || viewKey === null) {
			viewKey = "";
		} else if (typeof viewKey != "string") {
			viewKey = viewKey.toString();
		}
		return viewKey;
	};
	
	ns.getHistoryIndex = function() {
		return viewHistory.length - 1;
	};
	
	ns.getHistoryViewParams = function(idx) {
		if (viewHistory.length == 0) return {};
		
		if (typeof idx == 'undefined' || idx === null) {
			idx = viewHistory.length - 1;
		} else {
			if (typeof idx != 'number')
				idx = parseInt(idx);
			
			if (idx < 0) {
				idx += viewHistory.length - 1;
				idx = (idx < 0 ? 0 : idx);
			} else if (idx >= viewHistory.length) {
				idx = viewHistory.length - 1;
			}
		}
		
		var result = {};
		for (var prop in viewHistory[idx]) {
			result[prop] = viewHistory[idx][prop];
		}
		return result;
	};

	ns.getCurrentViewParams = function() {
		return ns.getHistoryViewParams(null);
	};
	
	ns.getPreviousViewParams = function() {
		return ns.getHistoryViewParams(-1);
	};
	
	/**
	 * Set template file url for a view.
	 *
	 * @param  viewKey       The view id 
	 * @param  templateUrl   Url of the template file
	 */
	ns.setTemplate = function(viewKey, templateUrl) {
		viewKey = coerceViewKey(viewKey);
		templates[viewKey] = templateUrl;
	};
	
	/**
	 * Set template file urls for a bunch of views
	 *
	 * @param  map  Mapping of viewKey => templateUrl pairs
	 */
	ns.setTemplates = function(map) {
		for (var viewKey in map) {
			if (typeof map[viewKey] == "string") {
				ns.setTemplate(viewKey, map[viewKey]);
			}
		}
	};
	
	/**
	 * Go to the previous page
	 */
	ns.goBack = function() {
		window.history.back();
	};
	
	
	/**
	 * Return hash part of url for given view template and given object.
	 *
	 * @param object   an object with method getViewParams that
	 *                 returns an object with the parameters 
	 *                 that route into this object.
	 * @param viewKey  id of the view template
	 */
	ns.getHashUrl = function(object, extParams, viewKey) {
		if (object && (viewKey === null || typeof viewKey == 'undefined') && typeof object.getViewKey == 'function')
			viewKey = object.getViewKey();
			
		viewKey = coerceViewKey(viewKey);
		if (object != null && typeof object.getViewParams != "function")
			throw new Error("Object " + object + " lacks method getViewParams");
		
		var params = { view: viewKey };
		
		if (object) {
			var viewParams = object.getViewParams(viewKey)
			for (var prop in viewParams) {
				params[prop] = viewParams[prop];
			}
		}
		
		for (var prop in extParams) {
			if (!(prop in params)) {
				params[prop] = extParams[prop];
			}
		}
		return $.param.fragment('#', params, 2);
	};
	
	/**
	 * Open given view template and load given object.
	 *
	 * @param object   an object with method getViewParams that
	 *                 returns an object with the parameters 
	 *                 that route into this object.
	 * @param viewKey  id of the view template
	 */
	ns.goTo = function(object, viewKey) {
		if (object && (viewKey === null || typeof viewKey == 'undefined') && typeof object.getViewKey == 'function')
			viewKey = object.getViewKey();

		viewKey = coerceViewKey(viewKey);
		if (object != null && typeof object.getViewParams != "function")
			throw new Error("Object " + object + " lacks method getViewParams");
		
		var params = { view: viewKey };
		if (object) {
			var viewParams = object.getViewParams(viewKey)
			for (var prop in viewParams) {
				params[prop] = viewParams[prop];
			}
		}
		
		$.bbq.pushState(params, 2);
	};

	/**
	 * Go to view for given hash parameters
	 *
	 * @param hash     hash part of url with parameters for a view
	 */
	ns.goToHash = function(hash) {
		if (typeof hash == "undefined" || hash === null) hash = "";
		if (typeof hash != 'string') hash = hash.toString();
		if (hash.substring(0, 1) != "#") hash = "#" + hash;
		$.bbq.pushState(hash, 2);
	};
	
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
	var createTransition = function(isNewView, $activeView, $inactiveView, loadingTimeoutId) {		
		if (isNewView) {
			return function(info) {
				window.clearTimeout(loadingTimeoutId);
				ns.hideLoading();
				
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
				ns.hideLoading();
				
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
	 * Show the "loading" dialog
	 */
	ns.showLoading = function() {
		$(viewLoadingSel).css("zIndex", "100").css("opacity", "1.0");
	};
	
	/**
	 * Hide the "loading" dialog
	 */
	ns.hideLoading = function() {
			$(viewLoadingSel).css("opacity", "0.0");
			window.setTimeout(function() {
				$(viewLoadingSel).css("zIndex", "-100");
				$(inactiveSel).empty();
			}, 1000);
	};
	
	/**
	 * Do a transition to the view with given parameters
	 *
	 * @param params  Parameters object with one compulsory property "view"
	 *                Based on this view, the view template to execute is chosen.
	 */
	ns.doTransition = function(params) {
		// make sure params is an object with valid "view" property
		if (typeof params == "string") {
			params = $.deparam.fragment(params);
		}		
		var viewKey = params.view = coerceViewKey(params.view);
		
		var isNewView = (viewKey !== currentViewKey);
		var info, parentElem;
		var $inactiveView = $(inactiveViewSel)
		var $activeView = $(activeViewSel);
		var loadingTimeoutId = window.setTimeout(ns.showLoading, 100);
		var transitionCallback = createTransition(isNewView, $activeView, $inactiveView, loadingTimeoutId);

		// update history
		var viewHistoryEntry = {};
		for (var prop in params) {
			viewHistoryEntry[prop] = params[prop];
		}
		viewHistory.push(viewHistoryEntry);
		
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
	
	/**
	 * Find the object representing view parameters in a number of (feed) objects
	 * 
	 * @param inObjects  Objects to search for given parameters (using findForViewParams)
	 * @param params     View parameters to search for
	 */
	ns.findForViewParams = function(params, inObjects, deepest) {
		if (!inObjects) inObjects = findObjects;
		var result = null;
		for (var i = 0; !result && i < inObjects.length; i++) {
			if (inObjects[i] != null && typeof inObjects[i].findForViewParams == 'function') {
				result = inObjects[i].findForViewParams(params, deepest);
			}
		}
		return result;
	};
	
	ns.setFindObjects = function(objects) {
		findObjects = [];
		if (typeof objects == "object" && objects.length) {
			for (var i = 0; i < objects.length; i++) {
				findObjects[i] = objects[i];
			}
		} else {
			objects = [];
		}
	};
	
	
	
	/**
	 * Initialize osd.mobile.ui.browse.
	 *
	 * @param templates  Object: Map of view names to template file urls
	 */
	ns.initialize = function(templates) {
		if (typeof templates == "object") {
			ns.setTemplates(templates);
		}
		
		var hashHandler = function() {
			// get options object from hash
			var params = $.deparam.fragment();
			
			// do transition on params
			ns.doTransition(params);
		};
		
		$(window).bind('hashchange', hashHandler);
		$(document).ready(hashHandler);
	};

})(jQuery);