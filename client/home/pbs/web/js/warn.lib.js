// 5/12/2019

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

// load all infos from DB, then attach them to their corresponding alerts
async function attachInfos(alertsObj) {
  infosObj = await getAllInfos(alertsObj[99].alertID)
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
  
/*// force alerts into latest-first chronological order
function sortAlertsBySentTime() {
    return  alertsObj.sort(function (a, b) {
        var x = DateTime.fromISO(a["sent"])
        var y = DateTime.fromISO(b["sent"])
        return ((x > y) ? -1 : ((x < y) ? 1 : 0))
    })
} */

// determine if every info for a given alert is expired
function isExpired(alert) {
    var now = DateTime.fromISO()
    for (var key in alert["infos"]) {
        var info = alert.infos[key]
        var expires = DateTime.fromISO(info["expires"])
        return expires.ts < now.ts
    }
}

// return a string of the unchecked (blocked) categories
function getStopCategories() {
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
  
// display a selected Info in detail
async function showInfo(infoID) {
  $("#infoViewer").show()
  $.ajax({
    url: "/getInfo/" + infoID
  }).then(async function (data) {
    var info = JSON.parse(data)
    var html = await infoToInfoDisplayHTML(info[0])
    $("#infoDisplay").html(html)
  })
}

// display the raw CAP XML for an alert
async function showRaw(alertID) {
  console.log("Show Raw " + alertID)
  // NEED TO ADD RAW PANEL TO HTML
  // ALSO NEED TO ADD CLOSER BUTTON AND FUNCTION

  // SHOW THE RAW PANEL
  $("#rawViewer").show()


}
