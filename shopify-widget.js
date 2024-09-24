// Main application function
var myAppJavaScript = function(jQuery) {
    // Fetch and inject the Web2Chat widget
    jQuery.get("/apps/web2chat-proxy", function(response) {
        var parser = new DOMParser();
        var parsedHtml = parser.parseFromString(response, "text/html");
        var web2chatWidgetContent = parsedHtml.querySelector("#web2chat-widget").textContent;
        
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.id = "#web2chat-widget";
        script.textContent = web2chatWidgetContent;
        
        jQuery("body").append(script);
    });
};

// Check if the site uses jQuery slim version
function isSiteUsesJQuerySlim() {
    return jQuery.fn.jquery.indexOf("-ajax") > -1;
}

// Function to load a script
var loadScript = function(url, callback) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    
    if (script.readyState) {  // For old versions of IE
        script.onreadystatechange = function() {
            if (script.readyState === "loaded" || script.readyState === "complete") {
                script.onreadystatechange = null;
                callback();
            }
        };
    } else {  // Other browsers
        script.onload = function() {
            callback();
        };
    }

    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
};

// Check jQuery version and load if necessary
if (typeof jQuery === "undefined" || parseFloat(jQuery.fn.jquery) < 1.7 || isSiteUsesJQuerySlim()) {
    loadScript("//ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js", function() {
        jQuery191 = jQuery.noConflict(true);
        myAppJavaScript(jQuery191);
    });
} else {
    myAppJavaScript(jQuery);
}
