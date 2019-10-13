var textDiv = document.getElementById("textDiv");


function viewItem(item) {
    var urgency = `<span class=\"${item.urgency}\">${item.urgency}</span>&nbsp;`
    var severity = `<span class=\"${item.severity}\">${item.severity}</span>&nbsp;`
    var certainty = `<span class=\"${item.certainty}\">${item.certainty}</span>`

    var newtext = `
    <div class="viewDiv"><table id="viewTable" width="480px">
    <tr><td colspan="2">${urgency}&nbsp;${severity}&nbsp;${certainty}</td></tr>
    <tr><td class="label">SENT</td><td>${DateTime.fromMillis(parseInt(item.sent)).toFormat('HH:mm:ss d/m/yyyy ZZZZ')}</td ></tr >
    <tr><td class="label">SENDER</td><td>${item.senderName}</td ></tr >
    <tr><td></td></td><td>${item.status} ${item.scope} ${item.msgType}&nbsp;-&nbsp;${item.category}</td ></tr >`
    if (item.Headline != "") {
        newtext = newtext + `<tr><td class="label">HEADLINE</td><td>${item.headline}</td ></tr >`
    }
    newtext = newtext + `<tr><td class="label">EVENT</td><td>${item.event}</td ></tr >
    <tr><td class="label">RESPONSE</td><td>${item.responseType}</td ></tr >
    <tr><td class="label">WEA</td><td>${item.CMAMtext}</td ></tr >`
    if (item.CMAMlongtext != "") {
        newtext = newtext + `<tr><td class="label">LONG WEA</td><td>${item.CMAMlongtext}</td ></tr >`
    }

    newtext = newtext + `<tr><td class="label">DESCRIPTION</td><td>${item.description}</td ></tr >
    <tr><td class="label">INSTRUCTION</td><td>${item.instruction}</td ></tr >


    </table ></div>`.trim()

   
    textDiv.innerHTML = newtext
    //console.log(w)
    //textDiv.style.width = w
    //textDiv.style.minWidth = w
    //console.log(w)
}

function viewRaw() { }