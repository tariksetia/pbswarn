$(document).ready(function () {
  hideInfoView()
  update()
  setInterval(update, 10000)
})

var alertObj
var alertsObj
var extAlerts = []
var DateTime = luxon.DateTime

$("#ExpiredCB").on('change', function () {
  clearDisplay()
  updateDisplay()
  $("#ExpiredCB").trigger('blur')
})

$("#infoViewCloser").on('click', function () {
  hideInfoView()
})

$("#masterDiv").on('click', function () {
  hideInfoView()
})

function setLocalTimeZone(name) {
  DateTime.local().setZone(name)
}

function getLocalTimeZone() {
  return DateTime.local().zoneName
}

function clearDisplay() {
  console.log("clearDisplay")
  $("#masterDiv").empty()
}

async function update() {
  console.log('[' + new Date().toUTCString() + '] ', "update")
  await getAlerts()
  updateDisplay()
}

// parce server data into global alertsObj, which is an array of alertObjs
async function getAlerts() {
  extAlerts = []
  $.ajax({
    url: "/getAlerts"
  }).then(function (data) {
    alertsObj = JSON.parse(data)
    addInfos()
  })
}

// to each alertObj add an [] of infoObjs
async function addInfos() {
  for (var key in alertsObj) {
    aid = alertsObj[key].alertID
    var alrt = getReferenceToAlert(aid)
    var url = "/getInfos/" + aid
    //console.log(url)
    $.ajax({
      url: url
    }).then(function (data) {
      //console.dir(data)
      infosObj = JSON.parse(data)
      if (infosObj && infosObj.length > 0) {
        //var alrt = getReferenceToAlert(a)
        // add infos to this object
        alrt.infos = []
        alrt.infos.push(infosObj)
        alrt.expired = alertIsExpired(alrt)
        // and compile into global extAlerts []
        extAlerts.push(alrt)
      }
    })
  }
}

function sortExtAlertsBySentTime() {
  return extAlerts.sort(function (a, b) {
    var x = DateTime.fromISO(a["sent"]); var y = DateTime.fromISO(b["sent"]);
    return ((x > y) ? -1 : ((x < y) ? 1 : 0));
  })
}

function showInfoView() {
  $("#infoViewer").show()
}

function hideInfoView() {
  $("#infoViewer").hide()
  $("#infoDisplay").empty()
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
    $("#infoDisplay").html(infoTab)
  })
}

// push a sorted array of alerts into the display
function updateDisplay() {
  console.log('[' + new Date().toUTCString() + '] ', "updateDisplay")
  var cellPointer = 0
  sortExtAlertsBySentTime()
  for (var key in extAlerts) {
    if (!$("#ExpiredCB").prop('checked')) {   // filter out expireds
      if (!extAlerts[key].expired) {
        replaceCell(extAlerts[key], cellPointer)
        cellPointer++
      }
    } else {                                  // display all
      replaceCell(extAlerts[key], cellPointer)
      cellPointer++
    }
  }
  // if we have more divs in masterDiv than needed, remove them
  if ($("#masterDiv")[0].len > cellPointer) {
    extAlerts = extAlerts.slice(0, cellPointer)
  }

}

function replaceCell(alert, cellPointer) {
  //console.log("replaceCell", cellPointer)
  var sent = alert["sent"]
  var newDivHTML
  sent = DateTime.fromISO(sent).toFormat("HH':'mm':'ss - LL'/'dd'/'yyyy ZZZZ")
  if (alert.expired || alert.replacedBy != "") {
    newDivHTML = "<div class='alertDiv expired' id='alert" + alert["alertID"] + "'><table><tr>"
  } else {
    newDivHTML = "<div class='alertDiv' id='alert" + alert["alertID"] + "'><table><tr>"
  }
  newDivHTML = newDivHTML +
    "<td class='sent'>" + sent + "</td>" +
    "<td class='identifier'>" + alert["identifier"] + "</td>" +
    "<td class='sender'>" + alert["sender"] + "</td>" +
    "<td class='status'>" + alert["status"] + " " + alert["scope"] + " " + alert["message_type"] + "</td>" +
    "</tr></table></div>"
  $newDiv = $(newDivHTML)
  for (var key in alert.infos) {
    var n = alert.infos[key][0]
    var $infoDiv = $("<div class='infoDiv' id='info" + n["infoID"] + "'><table><tr>" +
      "<td class='urgency " + n["urgency"] + "'>" + n["urgency"] + "</td>" +
      "<td class='severity " + n["severity"] + "'>" + n["severity"] + "</td>" +
      "<td class='certainty " + n["certainty"] + "'>" + n["certainty"] + "</td>" +
      "<td class='slug'><a href='javascript:showInfo(" + n["infoID"] + ")'>" + n["slug"] + "</a></td>" +
      "<td class='senderName'>" + n["senderName"] + "</td>" +
      "</tr></table></div>")
    $newDiv.append($infoDiv)
  }
  // if we need another divs in masterDiv, make it
  if (!$("#masterDiv")[0].children[cellPointer]) {
    $("#masterDiv").append($("<div></div>"))
  }
  var $cellDiv = $("#masterDiv")[0].children[cellPointer]
  $cellDiv.replaceWith($newDiv[0])
}

function getReferenceToAlert(id) {
  //console.log("getReferenceToAlert", id)
  for (var key in alertsObj) {
    a = alertsObj[key]
    if (a.alertID == id) {
      return a
    }
  }
}

function alertIsExpired(alert) {
  var now = DateTime.fromISO()
  for (var key in alert["infos"]) {
    var info = alert.infos[key]
    var expires = DateTime.fromISO(info[0]["expires"])
    return expires.ts < now.ts
  }
  return true
}


