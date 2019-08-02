// 7/31/2019

// Retrieve the Uptime timestamp from server
async function getUptime() {
    const uptime = await $.ajax({
        url: "/getUptime"
    })
    return uptime
}

// Retrieve the items for the past n days
async function getItems(days) {
    const result = await $.ajax({
        url: "/getItems/"+days
    })
    return JSON.parse(result)
}

async function getDisplay(uuid) {
    var url = "/getDisplay/" + uuid
    const result = await $.ajax({
        url: url
    })
    return JSON.parse(result)
}

async function getRaw(uuid) {
    var url = "/getRaw/" + uuid
    const result = await $.ajax({
        url: url
    })
    return result
}
