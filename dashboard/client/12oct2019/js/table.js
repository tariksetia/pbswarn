
var listDiv = document.getElementById("listDiv");

async function refreshTable() {
    //db = new Dexie("AlertsDatabase")
    //db.version(1).stores({ alerts: "uuid, sent,expires" })
    //db.open()
    // prepare table as HTML
    var newHtml = ""
    await db.alerts.reverse().each( item => {
        slug = item.headline
        if (slug == "") slug = item.CMAMtext
        var urgency = `<span class=\"${item.urgency}\">${item.urgency}</span>`
        var severity = `<span class=\"${item.severity}\">${item.severity}</span>`
        var certainty = `<span class=\"${item.certainty}\">${item.certainty}</span>`
        var newItem = ""
        // if item is expired, set table class of 'expired'
        if ( ! isExpired(item) ) {
            newItem = "<table class='listTable' >"
          } else {
            newItem = "<table class='expired' >"
        }
        newItem = newItem + `
<tr>
<td width="20%">${DateTime.fromMillis(parseInt(item.sent)).toFormat('HH:mm:ss d/m/yyyy ZZZZ')}</td>
<td width="30%">${item.identifier}</td>
<td width="30%">${item.sender}</td>
<td width="20%">${item.status} ${item.scope} ${item.msgType}&nbsp;-&nbsp;${item.category}</td>
</tr>
<tr>
<td>${urgency}<br>${severity}<br>${certainty}</td>
<td colspan="2" width="60%"><div class="slug" onclick='javascript:display("${item.uuid} ${item.itemId}")'>${slug}</div></td>
<td>${item.senderName}</td>
</tr>
</table><br>
        `.trim()
        //console.log(newItem)
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


async function display(uuidx) {
    uuid = uuidx.split(" ")[0]
    itemId = uuidx.split(" ")[1]
    console.log("Displaying", uuid, itemId)
    p1 = getItem(uuidx)
 
}

async function getItem(uuidx) {
    uuid = uuidx.split(" ")[0]
    itemId = uuidx.split(" ")[1]
    // because where().equals() wouldn't work
    db.alerts.each(function (item) {
        if (item.uuid === uuid && item.itemId === itemId) {
            // push to View
            viewItem(item)  // from view.js
            // and push to Map

        }
    })
}



