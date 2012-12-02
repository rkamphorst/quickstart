/*jslint nomen: true, regexp: true, white: true, browser: true, node: true, indent: 4 */

/*
 * Ordina, OSD Mobile
 *
 * Copyright (c) 2012 - Ordina N.V.
 *
 */ 
(function (define) {
    
    "use strict";
    
    define ( [ "./node", "when", "jquery" ], function (Node, when, $) {
        
        var 
            reParam = /\{([^\{\}]+)\}/,
            callUrl = "http://www.ordina.nl/app/",
            callSignature = {
                fetchTrees: "trees.php?nids={nids}&depths={depths}",
                fetchContent: "content.php?nids={nids}",
                fetchNodes: "nodes.php?{props}"
            };
            
        
        function uriEncode(propName, value, eq) {
            var i, prop, components, encodedValue;
            
            eq = eq || "=";
            
            if (!value) {
                encodedValue = null;
            } else if (Object.prototype.toString.call(value) === "[object Array]") {
                components = [];
                for (i = 0; i < value.length; i+=1) {
                    components[i] = uriEncode("=", value[i], "%3d");
                }
                encodedValue = components.join(",");
                if (propName) {
                    encodedValue = "(" + encodedValue + ")";
                }
            } else if (typeof value === "object") {
                components = [];
                i = 0;
                for (prop in value) {
                    if (value.hasOwnProperty(prop)) {
                        if (prop) {
                            components[i] = uriEncode(prop, value[prop], "%3d");
                            i+=1;
                        }
                    }
                }
                
                if (propName) {
                    encodedValue = "(" + components.join("%26") + ")";
                } else {
                    encodedValue = components.join("&");
                }
            } else {
                encodedValue = encodeURIComponent(value);
            }
            
            if (propName && propName !== "=") {
                return propName + eq + encodedValue;
            } 
            return encodedValue;
        }
            
        function createCallUrl (method, params) {
            var
                prop,
                searchReplace = {},
                sig = callSignature[method];
                
            for (prop in params) {
                if (params.hasOwnProperty(prop)) {
                    searchReplace[prop] = uriEncode(null, params[prop]);
                }
            }
            
            sig = sig.replace(reParam, function(match, p1) {
                if (searchReplace.hasOwnProperty(p1)) {
                    return searchReplace[p1];
                } 
                return "";
            });
            
            return callUrl + sig;
        }
        
        function open(method, params) {
            var 
                url,
                deferred = when.defer();
            
            try {
                url = createCallUrl(method, params);
            } catch (ex) {
                deferred.reject(ex);
                url = null;
                return deferred.promise;
            }
           
            $.ajax({url: url, dataType: "json"})
             .done(deferred.resolve)
             .fail(function (jqXHR, textStatus, errorThrown) {
                if (errorThrown) {
                    deferred.reject(new Error("Web call failed: " + errorThrown.toString()));
                } else if (textStatus) {
                    deferred.reject(new Error("Web call failed: " + textStatus));
                } else {
                    deferred.reject(new Error("Web call failed."));
                }
             });
            
            return deferred.promise;
        }
        
        function transformToNode (data) {
            var node = new Node(data);
            if (data.children) {
                node.setChildren(transformToNodeList(data.children));
            }
            return node;
        }
        
        function transformToNodeList (dataList) {
            var i, result = [];
            for (i = 0; i < dataList.length; i+=1) {
                result[i] = transformToNode(dataList[i]);
            }
            return result;
        }
        
        function fetchTrees (nids, depths) {
            return open("fetchTrees", { nids: nids, depths: depths}).then(transformToNodeList);
        }
        
        function fetchContent (nids) {
            return open("fetchContent", { nids: nids }).then(transformToNodeList);
        }
        
        function fetchNodes (props) {
            return open("fetchNodes", { props: props }).then(transformToNodeList);
        }
 
        function configure(props) {
            var prop;
            
            if (props.hasOwnProperty("callUrl")) {
                callUrl = props.callUrl;
            }
            
            if (props.hasOwnProperty("callSignature")) {
                for (prop in props.callSignature) {
                    if (props.callSignature.hasOwnProperty(prop)) {
                        if (callSignature.hasOwnproperty(prop)) {
                            callSignature[prop] = props.callSignature[prop];
                        }
                    }
                }
            }
            
            if (props.hasOwnProperty("callSignature.fetchTrees")) {
                callSignature.fetchTrees = props["callSignature.fetchTrees"];
            }
            
            if (props.hasOwnProperty("callSignature.fetchContent")) {
                callSignature.fetchContent = props["callSignature.fetchContent"];
            }
            
            if (props.hasOwnProperty("callSignature.fetchNodes")) {
                callSignature.fetchNodes = props["callSignature.fetchNodes"];
            }
        }
        
        return {
             configure: configure,
             fetchTrees: fetchTrees,
             fetchContent: fetchContent,
             fetchNodes: fetchNodes
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
    module.exports = factory.apply(this, [require].concat(deps.slice(1)
        .map(function (x) {
        return require(x);
    })));
}));