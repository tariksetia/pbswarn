/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 12/15/2019
 *
 *************************************************************/

package dbapi

import (
	"database/sql"
	"encoding/json"
	//xml "encoding/xml"
	"fmt"
	"strconv"
//	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	cap "pbs.org/warnmonitor/cap"
	cmam "pbs.org/warnmonitor/cmam"
	config "pbs.org/warnmonitor/config"
)


type Resource struct{
	InfoID      string `json:"infoID"`
	Description string `json:"description"`
	MimeType    string `json:"mime_type"`
	Size        string `json:"size"`
	URI         string `json:"uri"`
	Digest      string `json:"digest"`
	DerefURI    string `json:"deref_uri"`
}

type Geocode struct {
	ValueName string `json:"valueName"`
	Value     string `json:"value"`
}

type EventCode struct {
	ValueName string `json:"valueName"`
	Value     string `json:"value"`
}

type Parameter struct {
	ValueName string `json:"valueName"`
	Value     string `json:"value"`
}

type Item struct {
	Uuid         string      `json:"uuid"`
	Identifier   string      `json:"identifier"`
	ItemID       string      `json:"itemId"`
	Sent         string      `json:"sent"`
	Expires      string      `json:"expires"`
	Replaced     string      `json:"replaced"`
	Sender       string      `json:"sender"`
	SenderName   string      `json:"senderName"`
	Status       string      `json:"status"`
	Scope        string      `json:"scope"`
	MsgType      string      `json:"msgType"`
	Lang         string      `json:"lang"`
	Category     string      `json:"category"`
	Event        string      `json:"event"`
	EventCodes   []EventCode `json:"eventCodes"`
	Urgency      string      `json:"urgency"`
	Severity     string      `json:"severity"`
	Certainty    string      `json:"certainty"`
	Headline     string      `json:"headline"`
	CMAMtext     string      `json:"CMAMtext"`
	CMAMlongtext string      `json:"CMAMlongtext"`
	ResponseType string      `json:"responseType"`
	Parameters   []Parameter `json:"parameters"`
	Description  string      `json:"description"`
	Instruction  string      `json:"instruction"`
	Contact      string      `json:"contact"`
	Web          string      `json:"web"`
	References   string      `json:"references"`
	Resources    []Resource  `json:"resources"`
	ReplacedBy   []string    `json:"replacedBy"`
	AreaDescs    []string    `json:"areaDescs"`
	Polygons     []string    `json:"polygons"`
	Circles      []string    `json:"circles"`
	Geocodes     []Geocode   `json:"geocodes"`
}

const dsn = "warn:warn@/warn"
var db *sql.DB
var err error
var cfg config.Configuration

func init() {
	cfg = config.GetConfig()
	if db, err = sql.Open("mysql", dsn); err != nil {
		fmt.Println("(dbapi.init) sql.Open error", err.Error())
	}
}


// AddAlert... adds an Alert to the DB as XML and items
func AddAlert(alert cap.Alert) {
	// save raw XML to table CAP
	addCAP(cap.FormatCAP(alert))
	uuid := alert.Identifier + "," + alert.Sender + "," + alert.Sent
	// build individual items (one per Info)
	var infoCount = 0
	// for each Info in the Alert
	for _, info := range alert.Infos {
		
		// map Info to Item
		it := new(Item)
		it.Uuid = alert.Identifier + "," + alert.Sender + "," + isoToMillis(alert.Sent)
		it.ItemID = strconv.Itoa(infoCount)
		it.Identifier = alert.Identifier
		it.Sender = alert.Sender
		it.Sent = isoToMillis(alert.Sent)
		it.Status = alert.Status
		it.Scope = alert.Scope
		it.MsgType = alert.MessageType
		it.References = alert.References
		it.Lang = info.Language
		it.Category = info.Category
		it.Event = info.Event
		it.ResponseType = info.ResponseType
		it.Urgency = info.Urgency
		it.Severity = info.Severity
		it.Certainty = info.Certainty
		it.Expires = isoToMillis(info.Expires)
		// Event Codes
		for _, ecode := range info.EventCodes {
			i := new(EventCode)
			i.ValueName = ecode.ValueName
			i.Value = ecode.Value
			it.EventCodes = append(it.EventCodes, *i)
		}
		it.SenderName = info.SenderName
		it.Headline = info.Headline
		it.Description = info.Description
		it.Instruction = info.Instruction
		it.Web = info.Web
		it.Contact = info.Contact
		// Parameters
		for _, param := range info.Parameters {
			p := new(Parameter)
			p.ValueName = param.ValueName
			p.Value = param.Value
			it.Parameters = append(it.Parameters, *p)
			if p.ValueName == "CMAMtext" {
				it.CMAMtext = p.Value
			}
			if p.ValueName == "CMAMlongtext" {
				it.CMAMlongtext = p.Value
			}
		}
		// Areas
		for _, area := range info.Areas {
			it.AreaDescs = append(it.AreaDescs, area.Description)
			for _, poly := range area.Polygons {
				it.Polygons = append(it.Polygons, poly)
			}
			for _, circle := range area.Circles {
				it.Circles = append(it.Circles, circle)
			}
			for _, geocode := range area.Geocodes {
				gc := new(Geocode)
				gc.ValueName = geocode.ValueName
				gc.Value = geocode.Value
				it.Geocodes = append(it.Geocodes, *gc)
			}
			// augment polygons from FIPS where no geometries provided
			if len(it.Polygons) == 0 && len(it.Circles) == 0 {
				for _, geo := range area.Geocodes {
					if geo.ValueName == "SAME" {
						newPolys := getFipsPolys(geo.Value)
						for _, p := range newPolys {
							p,_ = strconv.Unquote(p)
							it.Polygons = append(it.Polygons, p)
						}
					}
				}
			}
		}
		// store to Items db
		news, _ := json.MarshalIndent(it, "", "    ")
		// save Item to DB with index of Sent values as millis
		sentMillis := it.Sent
		expiresMillis := it.Expires
		addItem(uuid, strconv.Itoa(infoCount), sentMillis, expiresMillis, string(news))
		// and increment the Item ID number
		infoCount++
	}
	// purge all items prior to AllAlertsRetentionDays
	trimItems()
	// purge LinkTest items prior to LinkTestLookbackMinutes
	trimLinkTests()
}


// AddLinkTest... takes a CMAM link test message and adds it to DB as an item.
// (this must somehow update the GUI for last update)
func AddLinkTest(test []byte) {
	lt := cmam.ParseCMAM(test)
	it := new(Item)
	it.Uuid = lt.Number
	it.ItemID = "0"
	it.Identifier = lt.Number
	it.Sender = lt.Gateway
	it.Sent = isoToMillis(lt.Sent)
	unixtm, _ := strconv.ParseInt(it.Sent, 10, 64)
	unixtm = unixtm +  + 600000  // link tests expire after ten minutes
	it.Expires =  strconv.FormatInt(unixtm, 10)
	it.Status = lt.Status
	it.Category = "LinkTest"
	it.SenderName = "FEMA IPAWS"
	it.Headline = "Link Test"
	json, _ := json.MarshalIndent(it, "", "    ")
	addItem(it.Uuid, it.ItemID, it.Sent, it.Sent, string(json))
}


// insert into CAP table
func addCAP(xml string) {
	// parse raw XML
	var alert cap.Alert
	alert = cap.ParseCAP([]byte(xml))
	
	
	// prepare statement
	statement, err := db.Prepare("insert into CAP (sentMillis, uuidMillis, xml) values (?,?,?)")
	if err != nil {
		fmt.Println("(dbapi.addCAP) Prepare statement error:", err)
	}
	defer statement.Close()
	// construct values
	uuid := alert.Identifier + "," + alert.Sender + "," + alert.Sent
	
	sentMillis := isoToMillis(alert.Sent)
	uuidMillis := alert.Identifier + "," + alert.Sender + "," + sentMillis
	
	_, err = statement.Exec(sentMillis, uuidMillis, xml)
	if err != nil {
		fmt.Println("(dbapi.addCAP) Dup:", uuid)
	} else {
		fmt.Println("(dbapi.addCAP) Add:", uuid)
	}
}


// insert into Items table
func addItem(uuidMillis string, itemId string, sentMillis string, expiresMillis string, json string) {
	// store to DB
	statement, err := db.Prepare("insert into Items (uuidMillis, itemId, sentMillis, expiresMillis, json) values (?,?,?,?,?)")
	if err != nil {
		fmt.Println("(dbapi.addItem) Prepare error:", err)
	}
	defer statement.Close()
	_, err = statement.Exec(uuidMillis, itemId, sentMillis, expiresMillis, json)
	if err != nil {
		fmt.Println("(dbapi.addItem) Insert error:", err)
	}
}


//GetAll... return the latest update time and all current items 
func GetItems() string {
	// get all  items, sorted by sentMillis
	var items []Item
	stmt := "select json from Items order by sentMillis desc"
	statement, err := db.Prepare(stmt)
	if err != nil {
		fmt.Println("(dbapi.GetAlertXML) Prepare statement error:", err) 
	}
	defer statement.Close()
	rows, _ := statement.Query()
	defer rows.Close()
	// scan the rows into Items, add to return slice
	for rows.Next() {
		var jsontext string
		err := rows.Scan(&jsontext)
		var item Item
		json.Unmarshal([]byte(jsontext), &item)
		if err != nil {
			fmt.Println("(dbapi.GetItems) scanning ", err.Error())
		}
		items = append(items, item)
	}
	response, _ := json.Marshal(items)
	return string(response)
}


func trimItems() {
	retainDays, _ := strconv.ParseInt(cfg.AllAlertsRetentionDays, 10, 64)
	retainItems := retainDays * 24 * 60 * 60 * 1000
	if retainItems < 3600000 {// in case of config error, skip this action  
		return
	}
	now := time.Now().UnixNano() / 1000000
	itemWindow := now - retainItems
	stmt := "delete from Items where sentMillis<" + "\""+strconv.FormatInt(itemWindow, 10)+"\""
	statement, err := db.Prepare(stmt)
	if err != nil {
		fmt.Println("(dbapi.GetAlertXML) Prepare statement error:", err) 
	}
	defer statement.Close()
	statement.Exec()
}


func trimLinkTests() {
	retainMinutes, _ := strconv.ParseInt(cfg.LinkTestLookbackMinutes, 10, 64)
	retainLTs := retainMinutes * 60 * 1000
	now := time.Now().UnixNano() / 1000000
	itemWindow := now - retainLTs
	stmt := "delete from Items where length(uuidMillis) <  10 and sentMillis<" + "\""+strconv.FormatInt(itemWindow, 10)+"\""
	statement, err := db.Prepare(stmt)
	if err != nil {
		fmt.Println("(dbapi.GetAlertXML) Prepare statement error:", err) 
	}
	defer statement.Close()
	statement.Exec()
}


// GetAlert... retrieve CAP XML for a UUID
func GetAlertXML(uuidMillis string) string {
	//fmt.Println("(db.GetCAP)", uuid)
	stmt := "select xml from CAP where uuidMillis=" + "\""+uuidMillis+"\""
	statement, err := db.Prepare(stmt)
	if err != nil {
		fmt.Println("(dbapi.GetAlertXML) Prepare statement error:", err) 
	}
	defer statement.Close()
	row := statement.QueryRow()
	var xml string
	row.Scan(&xml)
	return xml
}


// GetInfos... retrieves all items in timeframe
func GetItemsSince(millis string) []string {
	statement, err := db.Prepare("select json from warn.Items where sentMillis>(?)")
	if err != nil {
		fmt.Println("(dbapi.GetItemsSince) Prepare statement error:", err.Error())
	}
	defer statement.Close()
	
	rows, err := statement.Query(millis)
	if err != nil {
		fmt.Println("(dbapi.GetItemsSince) DB error:", err.Error())
	}
	items := []string{}
	for rows.Next() {
		var json string
		rows.Scan(&json)
		items = append(items, json)
	}
	return items
}


// retrieve a polygon for a SAME FIPS code
func getFipsPolys(same string) []string {
	statement, err := db.Prepare("select polygon from warn.fips where samecode=(?)")
	if err != nil {
		fmt.Println("(dbapi.getFipsPolys) Prepare statement error:", err)
	}
	defer statement.Close()
	rows, err := statement.Query(same)
	if err != nil {
		fmt.Println("(dbapi.getFipsPolys) DB error:", err)
	}
	addedPolys := []string{}
	for rows.Next() {
		var polygon string
		rows.Scan(&polygon)
		addedPolys = append(addedPolys, polygon)
	}
	return addedPolys
}

// extract the CMAMtext from a CAP Info
func getCMAM(info cap.Info) string {
	for _, param := range info.Parameters {
		if param.ValueName == "CMAMtext" {
			return param.Value
		}
	}
	return ""
}


// called by AddCAP... this returns the latest expiration from an Alert in millis
func getLastExpireMillis(alrt cap.Alert) string {
	// for each info, get expiration, return latest
	var latest = ""
	infos := alrt.Infos
	for _, info := range infos {
		expires := info.Expires
		thisExpires := isoToMillis(expires)
		if thisExpires > latest {
			latest = thisExpires
		}
	}
	return latest
}


func isoToMillis(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		fmt.Println("(dbapi.isoToMillis) error parsing \"" + iso + "\"")
		return ""
	}
	return strconv.FormatInt(t.UnixNano()/int64(time.Millisecond), 10)
}


// ??
func parseISO(iso string) time.Time {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		fmt.Println("(dbapi.parseISO) error parsing time from:", iso)
	}
	return t
}
