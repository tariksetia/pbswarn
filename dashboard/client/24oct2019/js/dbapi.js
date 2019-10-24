// var DBalerts comes from db-loader.js for now

var warn
var db

// On Load
document.addEventListener("DOMContentLoaded", function() {
  initDB()
  setInterval(syncDB, 300000)
})

async function initDB() {
  db = new Dexie("AlertsDatabase");
  db.version(1).stores({ alerts: "[uuid+itemId],sent,expires" })
  db.open();
  // the rest are tests
  console.log(await clearAll())
  //console.log(await addItems(DBalerts))
  //console.log(await getAll())
  //console.log(await getItemsCount())
  //getClockTime()
  await syncDB()
  plotAll() // map.js
  //console.log(await getAll())
}

async function getAll() {
    all = await db.alerts.toArray()
    return all
}

async function clearAll() {
    await db.alerts.clear()
    return "table cleared"
}

async function getItemsCount() {
    var foo = await db.alerts.count()
    return foo
}

// convert CAP-style UUID to a version using Unix time as the third element
function upgradeUUID(uuid) {
  let split = uuid.split(",")
  mm = DateTime.fromISO(split[2]).toMillis();
  return split[0]+","+split[1]
}

function addItem(item) {
    item.uuid = upgradeUUID(item.uuid)
    item.sentMillis = DateTime.fromISO(item.sent).toMillis()
    item.expiresMillis = DateTime.fromISO(item.expires).toMillis()
    item.replacedMillis = DateTime.fromISO(item.replaced).toMillis()
    item.uuid = item.sender+","+item.identifier+","+sentMillis
    console.log(item.uuid)
    db.alerts.add({
      sentMillis: sentMillis,
      expiresMillis: expiresMillis,
      replacedMillis: replacedMillis,
      item: item
    });
  return "item added"
}


async function getItem(uuidx) {
  let uuid = uuidx.split(" ")[0]
  let itemId = uuidx.split(" ")[1]
  // because where().equals() wouldn't work
  let foundItem = null
  await db.alerts.each(function (item) {
    if (item.uuid == uuid && item.itemId == itemId) {
      foundItem = item
    }
  })
  return foundItem
}


async function getAlert(reference) {
  let foundItems = []
  let target = upgradeUUID(reference)
  splits = reference.split(",");
  ts = DateTime.fromISO(splits[2]).toMillis();
  reference = splits[0] + "," + splits[1] + "," + ts;
  await db.alerts.each(async function(item) {
    if (upgradeUUID(item.uuid) === target) {
      foundItems.push(item);
    }
  });
  return foundItems
}


async function applyCancels() {
  let items = []
  await db.alerts.each(async function (item) {
    if (item.msgType == "Cancel" || item.msgType ==="Update") {
      uuid = item.uuid
      // get item(s) in cancelled/updated alert
      items = await getAlert(item.references)
      for (let it of items) {
          let uuidx = it.uuid + " " + it.itemId
          it.replacedBy= item.uuid
          it.replacedAt = item.sentMillis
          db.alerts.update((it.uuid, it.itemId), it)
      }
    }
  })
}

async function addItems(items) {
  p1 = await db.alerts.bulkAdd(items)
  applyCancels()
  return "array loaded"
}

const syncDB = async () => {
  // get latest sentMillis
  var last = await db.alerts.orderBy('sent').last()
  var start = "0"
  if (last != null) {
   start = last.sent
  }
  // get items since then
  var query = "http://54.149.8.236:9110/getSince/" + start
  var response = await fetch(query)
  var newItems = await response.json()

  for (item in newItems ){
    item.sentMillis = DateTime.fromISO(item.sent).toMillis()
    item.expiresMillis = DateTime.fromISO(item.expires).toMillis()
    item.replacedMillis = DateTime.fromISO(item.replaced).toMillis()
  }
  // push all into db
  addItems(newItems)
  updated()
  console.log(DateTime.local().toFormat('HH:mm:ss - dd LLL yyyy'),"(dbapi.syncDb) Got", newItems.length, "new items since", start, "for a total of", await getItemsCount(), "in cache.")
  refreshTable()  // table.js
}