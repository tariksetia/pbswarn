// 4/20/2019

var alertObj
var alertsObj = []
var infosObj = []
var extAlerts = []

var timer
var uptm 
var clockTimer
var stopCats
var DateTime = luxon.DateTime


function setLocalTimeZone(name) {
    DateTime.local().setZone(name)
}
  
function getLocalTimeZone() {
    return DateTime.local().zoneName
}

function showTime() {
  var now = DateTime.local()
  var clk = now.toFormat("HH':'mm':'ss ZZZZ")
  $("#clock").text(clk)
  showUptime()
}

async function showUptime() {
  var uptimeObj = await getUptime()
  var uptimeStr = uptimeObj.lastActivity
  uptimeStr = uptimeStr.replace(" ", "T")
  var uptime = DateTime.fromISO(uptimeStr)
  var up = uptime.toFormat("HH:mm:ss LL/dd/yyyy ZZZZ")
  $("#uptimer").html("Last " + up + "&nbsp;")
  // how long ago was update?
  var now = DateTime.local()
  var age = uptime.diff(now, 'seconds').seconds * -1
  // if uptime was more than five minutes ago, color red
  if (age > 300) {
    $("#uptimer").css("background-color", "red") 
    $("#uptimer").css("color", "black") 
  // if more than ninty seconds ago, color goldenrod
  } else if (age > 90) {
    $("#uptimer").css("background-color", "yellow") 
    $("#uptimer").css("color", "black") 
  // else color text color
} else {
    $("#uptimer").css("background-color", "#ffffff00")
    $("#uptimer").css("color", "#ffffff99")
  }

}

async function getUptime() {
  const result = await $.ajax({
    url: "/getUptime"
})
return JSON.parse(result)
}

$("#ExpiredCB").on('change', function () {
  clearInterval(timer) // stop existing timer
  clearDisplay()
  updateDisplay()
  $("#ExpiredCB").trigger('blur')
  timer = setInterval(update, 6000) // launch new timer
})

$(".filter").on('change', function (e) {
  clearInterval(timer) // stop existing timer
  clearDisplay()
  updateDisplay()
  $(".filter").trigger('blur')
  timer = setInterval(update, 3000) // launch new timer
})

$("#infoViewCloser").on('click', function () {
  hideInfoView()
})

$("#masterDiv").on('click', function () {
  hideInfoView()
})

// empty out the display of alerts
function clearDisplay() {
    //console.log("clearDisplay")
    $("#masterDiv").empty()
  }
  
// parse server data into an array of alerts (will be alertsObj)
async function getAlerts() {
    const result = await $.ajax({
        url: "/getAlerts"
    })
    return JSON.parse(result)
}

// get areas for an info
async function getAreas(infoID) {
  const result = await $.ajax({
    url: "/getAreas/" + infoID
  })
  return JSON.parse(result)
}

// get resources for an info
async function getResources(infoID) {
  const result = await $.ajax({
    url: "/getResources/" + infoID
  })
  return JSON.parse(result)
}

// parse server data, return infosObj
async function getAllInfos() {
    const result = await $.ajax({
      url: "/getAllInfos"
    })
    return JSON.parse(result)
  }

async function attachInfos(alertsObj) {
    //console.log('[' + new Date().toUTCString() + '] ', "attachInfos")
    infosObj = await getAllInfos()
    // for each alert
    for (var key in alertsObj) {
        var alrt = alertsObj[key]
        alrt.infos = []
        // attach linked infos
        for (var k2 in infosObj) {
        var info = infosObj[k2]
        if (info.alertID == alrt.alertID) {
            alrt.infos.push(info)
        }
        }
    } 
    return alertsObj
}
  

function sortAlertsBySentTime() {
    return  alertsObj.sort(function (a, b) {
        var x = DateTime.fromISO(a["sent"]); var y = DateTime.fromISO(b["sent"]);
        return ((x > y) ? -1 : ((x < y) ? 1 : 0));
    })
}

// determine if every info for a given alert is expired
function isExpired(alert) {
    var now = DateTime.fromISO()
    for (var key in alert["infos"]) {
        var info = alert.infos[key]
        var expires = DateTime.fromISO(info["expires"])
        //console.log("Expires", expires.toFormat("HH':'mm':'ss - LL'/'dd'/'yyyy ZZZZ"))
        return expires.ts < now.ts
    }
}

function getStopCats() {
    var cats = ""
    // get array of checkboxes
    var boxes = $(".filter")
    var len = boxes.length
    // for each checkbox, if NOT checked add label to cats
    for (var i=0; i<boxes.length; i++) {
        var box = $(boxes[i])
        if (!box.prop('checked')) { 
            cats = cats + box[0]['name'] + " "
        }
    }
    return cats
}
  

async function showInfo(infoID) {
    showInfoView()
    $.ajax({
      url: "/getInfo/" + infoID
    }).then(async function (data) {
      var info = JSON.parse(data)
      var i = info[0]
      // build info into HTML table
      var infoTab = "<table id='infoTable'>"
      infoTab = infoTab + `<tr><td></td><td>`
      infoTab = infoTab + `<table><tr>
      <td class='urgency ${i["urgency"]}'>${i["urgency"]} </td>
      <td class='severity ${i["severity"]}'>${i["severity"]}</td>
      <td class='certainty ${i["certainty"]}'>${i["certainty"]}</td>
      </tr></table>`
      infoTab = infoTab + `</td></tr>`
      if (i.headline !="") {
        infoTab = infoTab + `<tr><td class='label'>HEADLINE</td><td>${i.headline}</td></tr>`
      }
      if (i.cmam !="") {
        infoTab = infoTab + `<tr><td class='label'>WEA&nbsp;TEXT</td><td>${i.cmam}</td></tr>`
      }
  
      if (i.language != "") {
        infoTab = infoTab + `<tr><td class='label'>LANG</td><td>${i.language}</td></tr>`
      } 
      if (i.responseType != "") {
        infoTab = infoTab + `<tr><td class='label'>RESPONSE</td><td>${i.responseType} </td></tr>`
      }
      infoTab = infoTab + `
      <tr><td class='label'>EVENT</td><td>${i.event}</td></tr>
      <tr><td class='label'>SENDER</td><td>${i.senderName}</td></tr>
      <tr><td class='label'>CATEGORY</td><td>${i.categories}</td></tr>
      <tr><td class='label'>EXPIRES</td><td>${i.expires}</td></tr>`
      if (i.description != "") {
        infoTab = infoTab + 
        `<tr><td class='label'>DESCRIPTION</td><td>${i.description.replace(/\n/g, "<br>")} </td></tr>`
      }
      if (i.description != "") {
        infoTab = infoTab + 
          `<tr><td class='label'>INSTRUCTION</td><td>${i.instruction.replace(/\n/g, "<br>")}</td></tr>`
      }
      if (i.contact != "") {
        infoTab = infoTab + `<tr><td class='label'>CONTACT</td><td>${i.contact} </td></tr>`
      }
      if (i.web != "") {
        infoTab = infoTab + `<tr><td class='label'>WEB</td><td>${i.web}</td></tr>`
      }
      // add areas
      var areas = await getAreas(i.infoID)
      for (var key in areas) {
        var ar = areas[key]
        if (ar.areaDesc != "" > 0) {
          infoTab = infoTab + `<tr><td class='label'>AREA</td><td>${ar.areaDesc}</td></tr>`
        }
      }
      // add resources
      var resources = await getResources(i.infoID)
      for (var key in resources) {
        var resource = areas[key]
        if (resource.length > 0) {
          infoTab = infoTab + `<tr><td class='label'>RESOURCE</td><td>${resource.resourceDesc}</td></tr>`
        }
      }
      // add link to raw

      infoTab = infoTab + "</table>"
      $("#infoDisplay").html(infoTab)
    })
  }

async function viewArea(areaID) {

}

async function viewResource(areaID) {
    
}

async function viewRaw(alertID) {

}
