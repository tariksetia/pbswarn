// 5/12/2019

// Retrieve the Uptime timestamp from server
async function getUptime() {
    const result = await $.ajax({
        url: "/getUptime"
    })
    return JSON.parse(result)
}
  
// parse server data into an array of alerts (will be alertsObj)
async function getAlerts() {
    //console.log("getAlerts")
    const result = await $.ajax({
        url: "/getAlerts"
    })
    return JSON.parse(result)
}

async function getInfos(alertID) {
    var url = "/getInfos/" + alertID
    console.log(url)
    const result = await $.ajax({
        url: url
        
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
  async function getAllInfos(alertID) {
    //console.log("getAllInfos")
    const result = await $.ajax({
        url: "/getAllInfos/" + alertID
    })
    return JSON.parse(result)
}
    
