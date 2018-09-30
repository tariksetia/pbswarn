var centerLat, centerLon, defaultZoom;
var map = L.map('map',zoomDelta=0.1).setView([39.833, -98.583], 4.2);
if (localStorage.defaultBounds) {
    resetView();
}
var center;
var yellow_icon = L.icon({
    iconUrl: 'wea_icon.png',
    iconSize: [24,24],
    iconAnchor: [12,24],
    popupAnchor: [24,12]
});
var bounds = {};
var marker_to_polygon = {};

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: 'Base map &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors | Wireless Emergency Alerts from PBS WARN @ KVIE, Sacramento\n'
}).addTo(map);

var markerGroup = L.layerGroup().addTo(map);
var polyGroup = L.layerGroup().addTo(map);

about.style.height="30px";

function resetView(evt) {
    mbdict = JSON.parse(localStorage.defaultBounds);
    var swLatLng = L.latLng([mbdict["_southWest"]["lat"],mbdict["_southWest"]["lng"]]);
    var neLatLng = L.latLng([mbdict["_northEast"]["lat"],mbdict["_northEast"]["lng"]]);
    mbounds = L.latLngBounds(swLatLng, neLatLng);
    map.fitBounds(mbounds);
}

function setDefaultViewToCurrent(evt) {
    if (confirm("Set Default to Current View?")) {
        localStorage.defaultBounds = JSON.stringify(map.getBounds());
    }
}

var SetControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function (map) {
        var container = L.DomUtil.create('input');
        container.type="button";
        container.title="No cat";
        container.value = "Set as Default View";

        container.style.backgroundColor = 'white';     
        container.style.backgroundSize = "30px 30px";
        container.style.width = '160px';
        container.style.height = '30px';
        container.style.fontWeight = 'normal';

        container.onmouseover = function(){
          container.style.fontWeight = 'bold'; 
        }
        container.onmouseout = function(){
           container.style.fontWeight = 'normal';
        }

        container.onclick = function(){
          setDefaultViewToCurrent();
        }
        return container;
      }
});

var ResetControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function (map) {
        var container = L.DomUtil.create('input');
        container.type="button";
        container.title="No cat";
        container.value = "Default View";

        container.style.backgroundColor = 'white';     
        container.style.backgroundSize = "30px 30px";
        container.style.width = '160px';
        container.style.height = '30px';
        container.style.fontWeight = 'normal';

        container.onmouseover = function(){
          container.style.fontWeight = 'bold'; 
        }
        container.onmouseout = function(){
           container.style.fontWeight = 'normal';
        }
        container.onclick = function(){
          resetView();
        }
        return container;
      }
});

var setControl = new SetControl();
map.addControl(setControl);
var resetControl = new ResetControl();
map.addControl(resetControl);


// create a Leaflet LatLngBounds object from a CAP-format (lat,lon lat,lon) string
function make_bounds(polygon) {
    var new_poly = [];
    //if(polygon["polygon"]){
    //    polygon = polygon["polygon"]
    //}
    points = polygon.split(" ");
    for(var i = 0; i<points.length; i++)  {
        point = points[i];
        here = L.latLng(point.split(","));
        new_poly.push(here)
    }
    return L.polygon(new_poly).getBounds()
}

function plot(item) {
    var popup = make_popup(item);
    tiptext = item["Cmam"];
    if (tiptext == '') {
        tiptext = item['Headline']
    }
    //console.log(popup);
    polygons = item["Polygons"];
    if (polygons.length > 0) {  // if there's no polygon by now, skip plotting
        for (var i = 0; i<polygons.length; i++) {
            plot_polygon(polygons[i], popup);
        }
        marker = L.marker(center, {icon: yellow_icon}).addTo(map).addTo(markerGroup); 
        var thisPoly = make_bounds(polygons[0]);
        marker_to_polygon[marker._leaflet_id] = thisPoly;
        marker.addEventListener("click", function(event) {
            var bnds = marker_to_polygon[event.target._leaflet_id];
            map.fitBounds(L.latLngBounds(bnds));
        })
        marker.bindTooltip(tiptext);
    }
}

function center_of_polygons(polygons) {
    var totLat=0.0, totLon=0.0, count = 0;
    polygon = polygons[0];
    if (polygon.length > 2) {polygons = polygon}
    for (var i = 0; i<polygons.length; i++) {
        point = polygons[i];
        totLat = totLat + parseFloat(point[1]);
        totLon = totLon + parseFloat(point[0]);
        count++;
    }   
    cLat = cLat + (Math.random() - 0.5) * 0.01;
    cLon = cLon + (Math.random() - 0.5) * 0.01;
    return L.LatLng([cLat+LatRnd, cLon+LonRnd]);
}


function plot_polygon(polygon, popup) {
    new_polygon = []
    var lat, lon
    if (typeof(polygon) == "string") { // if polygon is a new-style string
        points = polygon.split(" ");
        for (var i=0;i<points.length;i++) {
            var point = points[i]
            splitp = point.split(",");
            lat = splitp[0];
            lon = splitp[1];
            point = [parseFloat(lat),parseFloat(lon)];
            new_polygon.push(point )
        };
    } else {
        points = polygon;
        for (var j = 0; j<points.length; j++) {
            lat = points[j][0]
            lon = points[j][1]
            new_polygon.push(L.latLng(lat, lon ))
        }
    }
    thisPoly = L.polygon(new_polygon, {color:'DarkOrange '}).addTo(map).bindPopup(popup).addTo(polyGroup);
    try{
        center = thisPoly.getCenter();
    } catch(e) {
        center = center_of_polygons(thisPoly);
    }
    return thisPoly;
}

function bounds_of_polygons(polygons) {
    var polygon = polygons[0]
    thisPoly = L.polygon(polygon);
    return thisPoly.getBounds();
}

function make_popup(item) {
    if (item["Cmam"]==null) {
        text = '<b>' + item["Headline"] + '</b><br>';
    } else {
        text = '<b>' + item["Cmam"] + '</b><br>';
    }
    text = text + item["Levels"] + "<br>" + item["sent"] + "<br>"
    text = text + item["Source"] + '<br>'
    text = text + "WEA Text: <i>\"" + item["Cmam"] + "\"</i><br>"
    text = text + "<p>" + item['Description'] + '</p>'
    text = text + "<p>" + item['Instruction'] + '</p>'
    text = text + "<p>Area: " + item['AreaDesc'] + '</p>';
    text = text + "<p>Expires: " + item['Expires'] + '</p>';
    return text;
}

function clearMap() {
    markerGroup.clearLayers();
    polyGroup.clearLayers();
}

// Get the current alerts in JSON from server
function poll() {
    //console.log("polling");
    $.ajax({
      url: "alerts.json",
      data: "",
      success: success,
      error: success,
      error: success,
      dataType: "text/XML"
    });
}

function success(data) {
    clearMap();
    var now = new Date().toUTCString();
    var utc = moment().utc();
    j = JSON.parse(data.responseText);
    $('#hb').html("Updated: " + j.heartbeat + " PDT")
    f = j.alerts;
    console.log(f);
    var i=0, item;
    while(item = f[i++]) {
        var then = moment(item['Expires'], "YYYY-MM-DD HH:mm:ss").utc();
        // only plot if not expired
        if (utc < then) {
            plot(item)
        }
    }
}

$(window).bind('focus', function() {
    console.log("regained focus");
    poll();
});


$(document).ready(function () {
    poll();
    setInterval(poll, 10000);
});

