// 5/12/2019

// format an alert as HTML for a display cell
function alertToCellHTML(alert) {
    var newDivHTML
    var stops = getStopCategories()
    var sent = DateTime.fromISO(alert.sent).toFormat("HH':'mm':'ss - LL'/'dd'/'yyyy ZZZZ")
    // if alert is expired, mark the div as class expired
    if (isExpired(alert)) {
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
    // for each info attached to alert...
    for (var key in alert.infos) {
        var info = alert.infos[key]
        /* // determine if info passes filters
        if (stops.indexOf(info.categories) > -1) {
            //continue // skip if category is stopped
        } */
        var $infoDiv = $("<div class='infoDiv' id='info" + info["infoID"] + "'><table><tr>" +
        "<td class='urgency " + info["urgency"] + "'>" + info["urgency"] + "</td>" +
        "<td class='severity " + info["severity"] + "'>" + info["severity"] + "</td>" +
        "<td class='certainty " + info["certainty"] + "'>" + info["certainty"] + "</td>" +
        "<td class='slug'><a href='javascript:showInfo(" + info["infoID"] + ")'>" + info["slug"] + "</a></td>" +
        "<td class='senderName'>" + info["senderName"] + "</td>" +
        "</tr></table></div>")
        $newDiv.append($infoDiv)
    }
    return $newDiv
}



// build selected info into Info Viewer HTML
async function infoToInfoDisplayHTML(i) {
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
    infoTab = infoTab + `<tr><td></td><td><br><span id='rawCapButton'><a href="javascript:showRaw(` + i.alertID + `)">View Raw CAP</a></span></td></tr>`
    
    infoTab = infoTab + "</table>"
    return infoTab
}