var alertObj
var alertsObj = []
var infosObj = []
var extAlerts = []

var timer
var stopCats
var DateTime = luxon.DateTime


function setLocalTimeZone(name) {
    DateTime.local().setZone(name)
}
  
function getLocalTimeZone() {
    return DateTime.local().zoneName
}

// empty out the display of alerts
function clearDisplay() {
    console.log("clearDisplay")
    $("#masterDiv").empty()
  }
  

// parse server data into an array of alerts (will be alertsObj)
async function getAlerts() {
    const result = await $.ajax({
        url: "/getAlerts"
    })
    return JSON.parse(result)
}

// parse server data, return infosObj
async function getAllInfos() {
    const result = await $.ajax({
      url: "/getAllInfos/"
    })
    return JSON.parse(result)
  }

async function attachInfos(alertsObj) {
    console.log('[' + new Date().toUTCString() + '] ', "attachInfos")
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
  

function showInfo(infoID) {
    console.log("showInfo", infoID)
    showInfoView()
    $.ajax({
      url: "/getInfo/" + infoID
    }).then(function (data) {
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
        infoTab = infoTab + `<tr><td class='label'>HEADLINE:</td><td>${i.headline}</td></tr>`
      }
      if (i.cmam !="") {
        infoTab = infoTab + `<tr><td class='label'>WEA&nbsp;TEXT:</td><td>${i.cmam}</td></tr>`
      }
  
      if (i.language != "") {
        infoTab = infoTab + `<tr><td class='label'>LANG:</td><td>${i.language}</td></tr>`
      } 
      if (i.responseType != "") {
        infoTab = infoTab + `<tr><td class='label'>RESPONSE:</td><td>${i.responseType} </td></tr>`
      }
      
      infoTab = infoTab + `
      <tr><td class='label'>EVENT:</td><td>${i.event}</td></tr>
      <tr><td class='label'>SENDER:</td><td>${i.senderName}</td></tr>
      <tr><td class='label'>CATEGORY:</td><td>${i.categories}</td></tr>
      <tr><td class='label'>EXPIRES:</td><td>${i.expires}</td></tr>`
      if (i.description != "") {
        infoTab = infoTab + 
        `<tr><td class='label'>DESCRIPTION:</td><td>${i.description.replace(/\n/g, "<br>")} </td></tr>`
      }
      if (i.description != "") {
        infoTab = infoTab + 
          `<tr><td class='label'>INSTRUCTION:</td><td>${i.instruction.replace(/\n/g, "<br>")}</td></tr>`
      }
      if (i.contact != "") {
        infoTab = infoTab + `<tr><td class='label'>CONTACT:</td><td>${i.contact} </td></tr>`
      }
      if (i.web != "") {
        infoTab = infoTab + `<tr><td class='label'>WEB:</td><td>${i.web}</td></tr>`
      }
      // add areas
  
      // add resources
  
      infoTab = infoTab + "</table>"
      console.log(infoTab)
      $("#infoDisplay").html(infoTab)
    })
  }
