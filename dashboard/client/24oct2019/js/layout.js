var handler = document.getElementsByClassName("handler")[0]
var vhandler = document.getElementsByClassName("v-handler")[0]
var wrapper = document.getElementsByClassName("wrapper")[0]
var vwrapper = document.getElementsByClassName("vwrapper")[0]
var mapDiv = document.getElementById("mapDiv")
var viewDiv = document.getElementById('viewDiv')
var tableDiv = document.getElementById("tableDiv")

var isHandlerDragging = false;
var isVHandlerDragging = false;

// on load complete, initialize layout
document.addEventListener(
    "DOMContentLoaded",
    function() {
        var split = window.innerHeight / 2;
        tableDiv.style.top = split;
        wrapper.style.height = split - 40 + "px";
        tableDiv.style.height = window.innerHeight - split + "px";
        tableDiv.style.flexGrow = 1;
        tableDiv.style.height = split - 60 + "px";
    },
    false
);

// Set flags indicating which pulltab was dragged
document.addEventListener("mousedown", function(e) {
    if (e.target === handler) {
        isHandlerDragging = true;
    } else if (e.target === vhandler) {
        isVHandlerDragging = true;
    }
});

document.addEventListener("mousemove", function(e) {
    if (isHandlerDragging) {
        var containerOffsetLeft = wrapper.offsetLeft;
        var pointerRelativeXpos = e.clientX - containerOffsetLeft;
        var boxAminWidth = 60;
        mapDiv.style.width = Math.max(boxAminWidth, pointerRelativeXpos - 2) + "px";
        mapDiv.style.flexGrow = 0;
        map.invalidateSize();
    } else if (isVHandlerDragging) {
        var offset = 20;
        var offset = vwrapper.offsetTop;
        var split = e.clientY - 60; // height of header div
        tableDiv.style.top = split
        adjustDocDiv() // from view.js
        //var foo = window.getComputedStyle(docDiv, null)
        wrapper.style.height = split + "px"
        var newHeight = split + "px"
        tableDiv.style.height = window.innerHeight - 100 - split + "px"
         tableDiv.style.flexGrow = 1
        map.invalidateSize()
    } else {
        return false;
    }
});

document.addEventListener("mouseup", function(e) {
    isHandlerDragging = false; // Turn off dragging flag when user mouse is up
    isVHandlerDragging = false;
});