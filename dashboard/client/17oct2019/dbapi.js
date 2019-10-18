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
  db.version(1).stores({ alerts: "uuid,sent,expires" })
  db.open();
  // the rest are tests
  //console.log(await clearAll())
  //console.log(await addItems(DBalerts))
  //console.log(await getAll())
  //console.log(await getItemsCount())
  //getClockTime()
  await syncDB()
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

function addItem(item) {
    item.sentMillis = DateTime.fromISO(item.sent).toMillis()
    item.expiresMillis = DateTime.fromISO(item.expires).toMillis()
    item.replacedMillis = DateTime.fromISO(item.replaced).toMillis()
    db.alerts.add({
      sentMillis: sentMillis,
      expiresMillis: expiresMillis,
      replacedMillis: replacedMillis,
      item: item
    });
  return "item added"
}

function addItems(items) {
  db.alerts.bulkAdd(items)
  /*db.transaction("rw", db.alerts, function() {       // transaction wrapper for reference
    db.alerts.bulkAdd(items)
  }).catch(function(error) {
      console.log(error)
  }) */
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
