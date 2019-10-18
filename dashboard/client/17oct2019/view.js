async function viewItem(item) {
    var urgency = `<span class=\"${item.urgency}\">${item.urgency}</span>&nbsp;`
    var severity = `<span class=\"${item.severity}\">${item.severity}</span>&nbsp;`
    var certainty = `<span class=\"${item.certainty}\">${item.certainty}</span>`

    var newtext = `
    <div id="docDiv"><table id="viewTable" >`
    if (isExpired(item)) {
        newtext = newtext + `<tr><td colspan="4" class="statusLabel">Expired</td></tr >`
    }
    newtext = newtext + `<tr><td colspan="2" id="usc">${urgency}&nbsp;${severity}&nbsp;${certainty}</td></tr>
    <tr><td class="label">SENT</td><td class='value'>${DateTime.fromMillis(parseInt(item.sent)).toFormat('HH:mm:ss LL/dd/yyyy ZZZZ')}</td ></tr >
    <tr><td class="label">SENDER</td><td class='value'>${item.senderName}</td ></tr >
    <tr><td></td></td><td class='value'>${item.status} ${item.scope} ${item.msgType}&nbsp;-&nbsp;${item.category}</td ></tr >`
    if (item.event != "") {
        newtext = newtext + `<tr><td class="label">EVENT</td><td class='value'>${item.event}</td ></tr >`
    }
    if (item.responseType != "") {
        newtext = newtext + `<tr><td class="label">RESPONSE</td><td class='value'>${item.responseType}</td ></tr >`
    }
    if (item.headline != "") {
        newtext = newtext + `<tr><td class="label">HEADLINE</td><td class='value'>${item.headline}</td ></tr >`
    }
    if (item.cmamtext != "") {
        newtext = newtext + `<tr><td class="label">WEA</td><td class='value'>${item.CMAMtext}</td ></tr >`
    }
    if (item.CMAMlongtext != "") {
        newtext = newtext + `<tr><td class="label">LONG WEA</td><td class='value'>${item.CMAMlongtext}</td ></tr >`
    }
    if (item.areaDescs != "") {
        newtext = newtext + `<tr><td class="label">AREA</td><td class='value'>${item.areaDescs}</td ></tr >`
    }
    if (item.description != "") {
        newtext = newtext + `<tr><td class="label">DESCRIPTION</td><td class='value'>${item.description}</td ></tr >`
    }
    if (item.instruction != "") {
        newtext = newtext + `<tr><td class="label">INSTRUCTION</td><td class='value'>${item.instruction}</td ></tr >`
    }
    if (item.contact != "") {
        newtext = newtext + `<tr><td class="label">CONTACT</td><td class='value'>${item.contact}</td ></tr >`
    }
    if (item.web != "") {
        newtext = newtext + `<tr><td class="label">WEB</td><td class='value'>${item.web}</td ></tr >`
    }
    newtext = newtext + `<tr><td class="label">EXPIRES</td><td class='value'>${DateTime.fromMillis(parseInt(item.expires)).toFormat('HH:mm:ss LL/dd/yyyy ZZZZ')}</td ></tr >`
    newtext = newtext + `</table ></div>`.trim()

    var viewDiv = document.getElementById('viewDiv')
    viewDiv.innerHTML = newtext
    adjustDocDiv()

}

function viewRaw(item) {
    var newtext = `<div id="docDiv"><pre><table id="viewTable"><tr><td>${JSON.stringify(item, null, 2)}</td></tr></table ></pre></div>`.trim()
    var viewDiv = document.getElementById('viewDiv')
    viewDiv.innerHTML = newtext
    adjustDocDiv()
 }

function adjustDocDiv() {
    var viewDiv = document.getElementById('viewDiv')
    var wrapper = document.getElementById('wrapper')
    var docDiv = document.getElementById('docDiv')
    newheight = wrapper.style.height
    newheight = newheight.replace("px", "")
    if (docDiv != null) {
        docDiv.style.height = newheight - 30 + "px"
        docDiv.style.width = (viewDiv.offsetWidth - 20) + "px"
    }
}