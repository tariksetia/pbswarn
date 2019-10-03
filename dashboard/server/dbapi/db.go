package dbapi

import (
	"fmt"
	"strconv"
	"time"

	"database/sql"

	_ "github.com/go-sql-driver/mysql"
	cap "pbs.org/warn/cap"
)

type Item struct {
	uuid         string
	identifier   string
	itemID       string
	info         string
	sent         string
	expires      string
	replaced     string
	sender       string
	senderName   string
	status       string
	scope        string
	msgType      string
	lang         string
	category     string
	event        string
	eventCodes   []cap.EventCode
	urgency      string
	severity     string
	certainty    string
	headline     string
	CMAMText     string
	CMAMLongText string
	responseType string
	parameters   []cap.Parameter
	description  string
	instruction  string
	contact      string
	web          string
	references   string
	resources    []cap.Resource
	replacedBy   []string
	areaDescs    []string
	polygons     []string
	circles      []string
	geocodes     []cap.Geocode
}

var alert cap.Alert
var db *sql.DB
var err error

const dsn = "warn:warn@/warn"

func init() {
	// change this to support Mariadb
	if db, err = sql.Open("mysql", dsn); err != nil {
		fmt.Println("(db.init) sql.Open error", err.Error())
	}
}

// AddAlert - from a raw CAP alert, stores raw and JSON-formatted version in DB
func AddAlert(raw string) string {
	// save raw XML to table CAP
	capResult := AddCAP(raw)
	var alert cap.Alert
	alert = cap.ParseCAP([]byte(raw))
	uuid := alert.Identifier + "," + alert.Sender + "," + alert.Sent

	if (alert.MessageType == "Cancel") || (alert.MessageType == "Update") {
		// get the references, for each, look up all Items, set their expired and replacedBy fields

	}
	var infoCount = 0
	// for each XML Info
	for _, info := range alert.Infos {
		//fmt.Println(info)
		// map Info to Item
		it := new(Item)
		it.uuid = uuid
		it.itemID = strconv.Itoa(infoCount)
		it.identifier = alert.Identifier
		it.sender = alert.Sender
		it.sent = alert.Sent
		it.status = alert.Status
		it.scope = alert.Scope
		it.msgType = alert.MessageType
		it.references = alert.References
		it.lang = info.Language
		it.category = info.Category
		it.event = info.Event
		it.responseType = info.ResponseType
		it.urgency = info.Urgency
		it.severity = info.Severity
		it.certainty = info.Certainty
		it.eventCodes = info.EventCodes // FLATTEN THIS

		it.expires = info.Expires
		it.senderName = info.SenderName
		it.headline = info.Headline
		it.description = info.Description
		it.instruction = info.Instruction
		it.web = info.Web
		it.contact = info.Contact
		it.parameters = info.Parameters // FLATTEN THIS

		// pull out CMAMText, CMAMLongText from parameters
		/*
			it.areas = info.Areas // FLATTEN THIS
			it.areaDescs
			it.polygons
			it.circles
			it.geocodes
			it.replacedBy = ""
		*/
		// look up geometries from SAME geocodes if none are present

		// save Item to DB with index of Sent values as millis
		//AddItem(item)
		// send Item to MQTT

		// and increment the Item ID number
		infoCount++

	}
	response := capResult + ": " + uuid
	return response
}

/*func AddItem(uuid, sentMillis, expiresMillis, item) {

}*/

func AddCAP(raw string) string {
	// parse raw XML
	var alert cap.Alert
	alert = cap.ParseCAP([]byte(raw))
	// construct indices
	uuid := alert.Identifier + "," + alert.Sender + "," + alert.Sent
	sentMillis := getMillis(alert.Sent)
	expiredMillis := getLastExpireMillis(alert)
	// store to DB
	statement, err := db.Prepare("insert into CAP (uuid, sentMillis, expiredMillis, xml) values (?,?,?,?)")
	if err != nil {
		fmt.Println("(db.AddCAP) Prepare statement error:", err)
	}
	defer statement.Close()
	_, err = statement.Exec(uuid, sentMillis, expiredMillis, raw)
	if err != nil {
		fmt.Println("(db.AddCAP) Dup:", uuid)
		return "DUP"
	} else {
		fmt.Println("(db.AddCAP) Add:", uuid)
		return "ADD"
	}
}

func parseISO(iso string) time.Time {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		fmt.Println("(db.parseISO) error parsing time from:", iso)
	}
	return t
}

func getLastExpireMillis(alrt cap.Alert) string {
	// for each info, get expiration, return latest
	var latest = ""
	infos := alrt.Infos
	for _, info := range infos {
		expires := info.Expires
		thisExpires := getMillis(expires)
		if thisExpires > latest {
			latest = thisExpires
		}
	}
	return latest
}

func getMillis(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		fmt.Println("(db.AddCAP) error parsing sent from", iso)
		return ""
	}
	return strconv.FormatInt(t.UnixNano()/int64(time.Millisecond), 10)
}

func GetItemsSince(millis string) string {
	fmt.Println("(db.GetItemsSince) " + millis)
	return ""
}

func GetCAP(uuid string) string {
	fmt.Println("(db.GetCAP) " + uuid)
	return ""
}

func getPolys(fips string) string {
	return ""
}
