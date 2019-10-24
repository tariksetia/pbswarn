/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 2.1 9/23/2019
 *
 *************************************************************/

// application globals
var alerts = [];
var map;
var markerGroup;
var polyGroup;
var center;

var scanning = true;
var listing = false;
var viewing = false;
var tableLoaded = false;
var previousCount = 0;

const consoleBG = document.getElementById("console_bg");
const consoleWindow = document.getElementById("console_window");
const consoleText = document.getElementById("console_text");
const tableBG = document.getElementById("table_window");
const tableDisp = document.getElementById("table_display");

const extreme = "#ff9999";
const severe = "#f2e765";
const moderate = "#88ffff";
const minor = "#99ff99";
const unknown = "#ffffff";

String.prototype.replaceAll = function(search, replacement) {
    return String.prototype.replace(new RegExp(search, "g"), replacement);
};

// on load complete, initialize map
document.addEventListener("DOMContentLoaded", function() {
    initMap()
});

// set up the map
const initMap = async () => {
    var centerLat, centerLon, defaultZoom;
    map = L.map("mapDiv", (zoomDelta = 0.1)).setView([50.0, -110.0], 2);
    // add the base map from OSM tile server
    L.tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
        attribution: '<a href="https://www.openstreetmap.org/copyright">OpenStreetTiles</a> | geodata &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors | FEMA IPAWS alerts from PBS WARN @ KVIE, Sacramento\n'
    }).addTo(map);
    markerGroup = L.layerGroup().addTo(map)
    polyGroup = L.layerGroup().addTo(map)
    nullGroup = L.layerGroup().addTo(map)
}

async function focusItem(item) {
    //clearMap()
    // calculate and set map view
    var viewBounds = await itemBounds(item)
    map.fitBounds(viewBounds.pad(0.3))
}

async function plotExpired(item) {
    // plot on polyGroup
    //  each polygon
    if (item.polygons && item.polygons.length > 0) {
        for (let poly of item.polygons) {
            let p = make_polygon(poly, "rgba(16,16,16,1)")
            p.on("click", function () { display(item.uuid + " " + item.itemId) })
            await p.addTo(polyGroup)
        }
    }
    //  each circle
    if (item.circles && item.circles.length > 0) {
        for (let circle of item.circles) {
            let c = await make_circle(circle, "rgba(16,16,16,1)")
            c.on("click", function () { display(item.uuid + " " + item.itemId) })
            c.addTo(polyGroup);
        }
    }
    map.invalidateSize()
}

async function plotAll() {
    clearMap()
    // get unexpired / uncancelled items
    db.alerts.each(item => {
        if (isExpired(item) || item.replacedBy != null || item.replacedBy == "") {
            return
        }
        // plot on polyGroup
        //  each polygon
        if (item.polygons && item.polygons.length > 0) {
            for (let poly of item.polygons) {
                let p = make_polygon(poly, "rgba(255,0,0,1)")
                p.on("click", function () { display(item.uuid + " " + item.itemId) })
                p.addTo(polyGroup)
            }
        }
        //  each circle
        if (item.circles && item.circles.length > 0) {
            for (let circle of item.circles) {
                let c = make_circle(circle, "rgba(255,0,0,1)")
                c.addTo(polyGroup);
            }
        }
        map.invalidateSize()
    })
}

function resetMap() {
    if (typeof map !== 'undefined') {
        map.setView([50.0, -110.0], 2)
        clearView() // view.js
        plotAll()
    }
}

// transform CAP polygon into Leaflet polygon object
const make_polygon = (polygon, color) => {
    new_polygon = [];
    var lat, lon;
    if (typeof polygon == "string") {
        // if polygon is a new-style string
        points = polygon.split(" ");
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            splitp = point.split(",");
            point = [parseFloat(splitp[0]), parseFloat(splitp[1])];
            new_polygon.push(point);
        }
    } else {
        points = polygon;
        for (var j = 0; j < points.length; j++) {
            lat = points[j][0];
            lon = points[j][1];
            new_polygon.push(L.latLng(lat, lon));
        }
    }
    p = L.polygon(new_polygon, {
        color: color,
        fillOpacity: 0.3,
        opacity: 1.0,
        weight: 1
    });
    return p
};

// transform CAP circle into Leaflet circle object
const make_circle = async (circle, color) => {
    var elements = circle.split(" ")
    var point = elements[0]
    var radius = elements[1] * 1000 // scale to meters
    splitp = point.split(",")
    lat = splitp[0]
    lon = splitp[1]
    var circ = L.circle([parseFloat(lat), parseFloat(lon)], radius, {
        color: color,
        fillOpacity: 0.3,
        opacity: 0.8,
        weight: 1
    })
    return circ
}

// get aggregate bounds of all polys and circles in an item
const itemBounds = async item => {
    var bounds
    if (item.polygons && item.polygons.length > 0) {
        bounds = make_polygon(await item.polygons[0]).getBounds()
        for (let poly of item.polygons) {
            bounds.extend(await make_polygon(poly).getBounds())
        }
    }
    if (item.circles && item.circles.length > 0) {
        c = await make_circle(item.circles[0], "transparent", "")
        // apply item to map temporarily in order to calculate bounds
        c.addTo(nullGroup)
        bounds = c.getBounds()
        // now do the same for the rest of the circles
        for (let circle of item.circles) {
            // plot item temporarily in order to get bounds
            c.addTo(nullGroup)
            bounds = c.getBounds()
            await bounds.extend(bounds)
        }
        nullGroup.clearLayers() // remove "sizing" plots
    }
    return bounds
}

// clear the map
const clearMap = () => {
    markerGroup.clearLayers()
    polyGroup.clearLayers()
    //plotAll()
};
