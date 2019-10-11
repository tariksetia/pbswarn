
var listDiv = document.getElementById("listDiv");

async function refreshTable() {
    db = new Dexie("AlertsDatabase")
    db.version(1).stores({ alerts: "[uuid+itemID], sent,expires,replaced" })
    db.open()
    // prepare table as HTML
    var newHtml = ""
    await db.alerts.reverse().each( item => {
        slug = item.headline
        if (slug == "") slug = item.CMAMtext
        var urgency = `<span class=\"${item.urgency}\">${item.urgency}</span>`
        var severity = `<span class=\"${item.severity}\">${item.severity}</span>`
        var certainty = `<span class=\"${item.certainty}\">${item.certainty}</span>`
        var expired = true;
        var newItem = ""
        // if item is expired, set table class of 'expired'
        if ( ! isExpired(item) ) {
            newItem = "<table class='listTable'>"
          } else {
            newItem = "<table class='listTable, expired'>"
        }
        newItem = newItem + `
<tr>
<td width="20%">${DateTime.fromMillis(parseInt(item.sent)).toFormat('HH:mm:ss d/m/yyyy ZZZZ')}</td>
<td width="30%">${item.identifier}</td>
<td>${item.sender}</td>
<td width="20%">${item.status} ${item.scope} ${item.msgType}&nbsp;-&nbsp;${item.category}</td>
</tr>
<tr>
<td>${urgency}<br>${severity}<br>${certainty}</td>
<td colspan="2" width="60%" class="slug">${slug}</td>
<td>${item.senderName}</td>
</tr>
</table><br>
        `.trim()
        console.log(newItem)
        newHtml = newHtml + newItem 
    })
    listDiv.innerHTML = newHtml + "</table>"
    //console.log(newHtml)
}

function isExpired(item) {
    now = DateTime.local()
    then = item.expires
    return now > then
}