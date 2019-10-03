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
    initMap();
});

// set up the map
const initMap = () => {
    var centerLat, centerLon, defaultZoom;
    map = L.map("mapDiv", (zoomDelta = 0.1)).setView([39.833, -98.583], 3);
    // add the base map from OSM tile server
    L.tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
        attribution: 'OpenStreetTiles | Map &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors | FEMA IPAWS alerts from PBS WARN @ KVIE, Sacramento\n'
    }).addTo(map);
    markerGroup = L.layerGroup().addTo(map);
    polyGroup = L.layerGroup().addTo(map);
};

// plot an alert on the map
plot = alert => {
    //var popup = make_text(alert)
    polygons = alert.Polygons;
    center = getCenterOf(alert);
    color = getColor(alert);
    if (polygons.length > 0) {
        for (var i = 0; i < polygons.length; i++) {
            var poly = make_polygon(polygons[i], color, alert);
            poly.addTo(map).addTo(polyGroup);
            poly.on("click", function(event) {
                viewAlert(alert);
            });
        }
    }
    if (alert.Circles.length > 0) {
        for (var i = 0; i < alert.Circles.length; i++) {
            var circ = make_circle(alert.Circles[i], color, alert);
            circ.on("click", function(event) {
                viewAlert(alert);
            });
        }
    }
    // add marker and label "flag" to map
    make_label(alert)
        .addTo(map)
        .addTo(markerGroup);
    make_marker(alert)
        .addTo(map)
        .addTo(markerGroup);
};

// make a label
const make_label = alert => {
    var center = getCenterOf(alert);
    var label = "Alert";
    if (typeof alert.ResponseType != "undefined") {
        label = alert.ResponseType;
    }
    if (alert.Status == "Test") label = "TEST";
    if (alert.Status == "Exercise") abel = "EXERCISE";
    iClass = "alertIconUnknown";
    if (typeof alert.Severity != "undefined") {
        iClass = "alertIcon" + alert.Severity;
    }
    var myIcon = L.divIcon({ className: iClass, iconSize: null, html: label });
    var label = L.marker(center, { icon: myIcon });
    label.addEventListener("click", function(event) {
        viewAlert(alert);
        focusOn(alert);
    });
    return label;
};

// make a marker
const make_marker = alert => {
    var center = getCenterOf(alert);
    tiptext = alert.Headline;
    if (typeof alert.Cmam != "undefined") {
        tiptext = alert.Cmam;
    }
    var icon = make_icon("unknown");
    if (typeof alert.Severity != "undefined") {
        icon = make_icon(alert.Severity.toLowerCase());
    }
    marker = L.marker(center, { icon: icon });
    marker.addEventListener("click", function(event) {
        viewAlert(alert);
        focusOn(alert);
    });
    marker.bindTooltip(tiptext);
    return marker;
};

const make_icon = severity => {
    var png = "img/" + severity + "Icon.png";
    return L.icon({
        iconUrl: png,
        iconSize: [18, 18],
        iconAnchor: [9, 18],
        popupAnchor: [18, 9]
    });
};

// get center point of supplied alert
const getCenterOf = item => {
    var bounds = getBounds(item.Polygons[0]);
    for (var i = 1; i < item.Polygons.length; i++) {
        bounds.extend(getBounds(item.Polygons[i]));
    }
    for (var i = 1; i < item.Circles.length; i++) {
        bounds.extend(getBounds(item.Circles[i]));
    }
    centerLatLng = L.latLng(bounds.getCenter().lat, bounds.getCenter().lng);
    return centerLatLng;
};

// transform CAP polygon to Leaflet polygon object
const make_polygon = (polygon, color, alert) => {
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
    return L.polygon(new_polygon, {
        color: color,
        fillOpacity: 0.4,
        opacity: 0.8
    });
};

// transform CAP circle into Leaflet circle object
const make_circle = (circle, color, alert) => {
    var elements = circle.split(" ");
    var point = elements[0];
    var radius = elements[1] * 1000; // scale to meters
    splitp = point.split(",");
    lat = splitp[0];
    lon = splitp[1];
    return L.circle([parseFloat(lat), parseFloat(lon)], radius, {
        color: color,
        fillOpacity: 0.4,
        opacity: 0.8
    });
};

// create a Leaflet LatLngBounds object from a CAP-format (lat,lon lat,lon...) polygon string
const getBounds = polygon => {
    var new_poly = [];
    points = polygon.split(" ");
    // reverse lon/lat to lat/lon
    for (var i = 0; i < points.length; i++) {
        point = points[i];
        here = L.latLng(point.split(","));
        new_poly.push(here);
    }
    return L.polygon(new_poly).getBounds();
};

// get aggregate bounds of all polys and circles in an item
const itemBounds = item => {
    var bounds = getBounds(item.Polygons[0]);
    for (var i = 1; i < item.Polygons.length; i++) {
        bounds.extend(getBounds(item.Polygons[i]));
    }
    for (var i = 1; i < item.Circles.length; i++) {
        bounds.extend(getBounds(item.Circles[i]));
    }
    return bounds;
};

// get aggregate bounds of all alerts
const allBounds = alerts => {
    if (typeof alerts != "undefined") {
        var abounds = itemBounds(alerts[0]);
        if (alerts.length > 1) {
            for (var i = 1; i < alerts.length; i++) {
                abounds.extend(itemBounds(alerts[i]));
            }
        }
        return abounds;
    } else return null;
};

// zoom the map to feature the selected JSON alert
const focusOn = item => {
    if (typeof item != "undefined") {
        bounds = itemBounds(item);
        // if text being displayed, shift the map to a better position on the screen
        if (scanning || viewing) {
            map.fitBounds(offsetBounds(bounds.pad(0.3)));
        } else {
            map.fitBounds(bounds.pad(0.3));
        }
    }
};

// shift map viewport to place alert in right half of screen
const offsetBounds = bounds => {
    // calculate new center point
    var centerLon = bounds.getWest();
    var originalWidth = Math.abs(bounds.getWest() - bounds.getEast());
    var originalHeight = Math.abs(bounds.getNorth() - bounds.getSouth());
    var centerLat = (bounds.getSouth() + bounds.getNorth()) / 2;
    // calculate new SW corner
    var swLon = centerLon + originalWidth * 1.1;
    var swLat = centerLat - originalHeight * 0.55;
    // calculate new NE corner
    var neLon = centerLon - originalWidth * 1.1;
    var neLat = centerLat + originalHeight * 0.5;
    return L.latLngBounds(L.latLng(swLat, swLon), L.latLng(neLat, neLon));
};

// clear the map
const clearMap = () => {
    markerGroup.clearLayers();
    polyGroup.clearLayers();
};

// clear and redraw alerts
const redrawMap = () => {
    clearMap();
    for (var i in alerts) {
        plot(alerts[i]);
    }
};

//
// Persistence
//

// retrieve any saved viewport parameters from LocalStorage
const resetView = evt => {
    try {
        mbdict = JSON.parse(localStorage.defaultBounds);
        var swLatLng = L.latLng([
            mbdict["_southWest"]["lat"],
            mbdict["_southWest"]["lng"]
        ]);
        var neLatLng = L.latLng([
            mbdict["_northEast"]["lat"],
            mbdict["_northEast"]["lng"]
        ]);
        mbounds = L.latLngBounds(swLatLng, neLatLng);
        map.fitBounds(mbounds);
    } catch {
        // if no default view saved, use startup view
        map.setView([39.833, -98.583], 4.2);
    }
};

// save current viewport parameters to LocalStorage
const setDefaultViewToCurrent = () => {
    $.confirm({
        title: "",
        backgroundDismiss: true,
        content: "Save current map view as default?",
        boxWidth: "15%",
        useBootstrap: false,
        buttons: {
            Yes: function() {
                localStorage.defaultBounds = JSON.stringify(map.getBounds());
            },
            No: function() {}
        }
    });
};