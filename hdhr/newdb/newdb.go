/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Updated 8/15/2019
 *
 *************************************************************/

package newdb

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	config "github.com/Tkanos/gonfig"
	_ "github.com/go-sql-driver/mysql"
	"pbs.org/hdhr/cap"
)

// Configuration data structure for application config
type Configuration struct {
	Dsn     string
	Driver  string
	Tuner   int
	UDPPort int
	PID     string
	Version string
	WebPort int
	Freq    string
}

type Item struct {
	UUID       string
	Identifier string
	Sender     string
	Sent       string
	Status     string
	Scope      string
	Category   string
	MsgType    string
	Urgency    string
	Severity   string
	Certainty  string
	Slug       string
	SenderName string
	Expires    string
	Polygons	[]string
	Circles		[]string
}

type Display struct {
	UUID         string
	Sent         string
	Urgency      string
	Severity     string
	Certainty    string
	Category	 string
	Headline     string
	WEA          string
	LongWEA		 string
	Lang         string
	Response     string
	Event        string
	ResponseType string
	SenderName   string
	Expires      string
	Description  string
	Instruction  string
	Contact      string
	Web          string
	AreaDesc     string
}

var db *sql.DB
var err error
var rows *sql.Rows
var cfg Configuration

func main() {}

func init() {
	// load system configuration
	cfg = Configuration{}
	if err := config.GetConf("warnmonitor.conf", &cfg); err != nil {
		fmt.Println("(newdb.init config.GetConf)", err.Error())
	}
	// connect to db
	if db, err = sql.Open(cfg.Driver, cfg.Dsn); err != nil {
		fmt.Println("(newdb.init sql.Open)", err.Error())
	}
	//defer db.Close()
	// and confirm with the db version
	stmnt := prepStmt("select version()")
	defer stmnt.Close()
	if rows, err = stmnt.Query(); err != nil {
		fmt.Println("(newdb.init stmnt.Query())", err)
	}
	var ver string
	for rows.Next() {
		_ = rows.Scan(&ver)
		fmt.Println("(newdb.init) Connected to", ver)
	}
}

func PutAlert(alert cap.Alert) {
	// extract the UUID
	uuid := alert.Identifier + "," + alert.Sender + "," + alert.Sent
	// save to CAP table
	stmnt := prepStmt("insert into cap (uuid, sent, xml) values (?,?,?)")
	defer stmnt.Close()
	capText := cap.FormatCAP(alert)
	if _, err := stmnt.Exec(uuid, alert.Sent, capText); err != nil {
		
		if (strings.Contains(err.Error(), "Error 1062")) {
			log.Println("DUPLICATE", uuid)
		} else {
			log.Println("(newdb.PutAlert stmnt.Exec)", err)
		}
		return
	}
	// cancel
	if (alert.MessageType == "Cancel") {
		replace(alert.References, uuid)
		log.Println("Cancelling", alert.References, "per", uuid)
	}
	// update
	if (alert.MessageType == "Update") {
		replace(alert.References, uuid)
		log.Println("Updating", alert.References, "per", uuid)
	}
	// add alert to DB
	log.Println("ADDING", uuid)
	// for each Info make item and display jsons
	for _, info := range alert.Infos {
		// list item entry
		it := Item{}
		it.UUID = uuid
		it.Identifier = alert.Identifier
		it.Sender = alert.Sender
		it.Sent = alert.Sent
		it.Status = alert.Status
		it.Scope = alert.Scope
		it.MsgType = alert.MessageType
		it.Category = info.Category
		it.Urgency = info.Urgency
		it.Severity = info.Severity
		it.Certainty = info.Certainty
		it.Slug = info.Headline
		if it.Slug == "" {
			it.Slug = getCMAMText(info)
		}
		if it.Slug == "" {
			it.Slug = getCMAMLongText(info)
		}
		if (alert.MessageType == "Cancel") {
			it.Slug = "Cancel " + alert.References
		}
		it.SenderName = info.SenderName
		it.Expires = info.Expires
		// all polygons and circles for this info
		for _, area := range info.Areas {
			if (len(area.Polygons) == 0) {
				for _, g := range area.Geocodes {
					if g.ValueName == "SAME" {
						fmt.Println("(newdb.PutAlert) polygonizing ", g.Value)
						// look up polygon
						polys := sameLookup(g.Value)
						// and add to polygons array
						for _, p := range polys {
							it.Polygons = append(it.Polygons, p)
						}
					}
				}	
			} else {
				for _, p := range area.Polygons {
					it.Polygons = append(it.Polygons, p)
				}
			}
			for _, c := range area.Circles {
				it.Circles = append(it.Circles, c)
			}
		}
		jsn, _ := json.Marshal(it)
		stmnt = prepStmt("insert into items (json, sent, uuid) values (?,?,?)")
		defer stmnt.Close()
		if _, err := stmnt.Exec(jsn, alert.Sent, uuid); err != nil {
			log.Println("(newdb.init stmnt.Exec())", err)
		}
		// display entry
		disp := Display{}
		disp.UUID = uuid
		disp.Sent = alert.Sent
		disp.Urgency = info.Urgency
		disp.Severity = info.Severity
		disp.Certainty = info.Certainty
		disp.Headline = info.Headline
		disp.WEA = getCMAMText(info)
		disp.LongWEA = getCMAMLongText(info)
		disp.Lang = info.Language
		disp.Response = info.ResponseType
		disp.Event = info.Event
		disp.Category = info.Category
		disp.ResponseType = info.ResponseType
		disp.SenderName = info.SenderName
		disp.Category = info.Category
		disp.Expires = info.Expires
		disp.Description = info.Description
		disp.Instruction = info.Instruction
		disp.Contact = info.Contact
		disp.Web = info.Web
		disp.AreaDesc = info.Areas[0].Description
		jsn, _ = json.Marshal(disp)
		stmnt = prepStmt("insert into displays (json, sent, uuid) values (?,?,?)")
		defer stmnt.Close()
		if _, err := stmnt.Exec(jsn, alert.Sent, uuid); err != nil {
			log.Println("(newdb.init stmnt.Exec())", err)
		}
	}
}

// mark updated or cancelled items in items and cap tables
func replace(targetUID string, alertUID string) {
	stmnt := prepStmt("update items set replacedBy = ? where uuid = ?")
	defer stmnt.Close()
	if _, err := stmnt.Exec(alertUID, targetUID); err != nil {
		log.Println("(newdb.replace stmnt.Exec #1)", err)
	}
	stmnt = prepStmt("update cap set replacedBy = ? where uuid = ?")
	defer stmnt.Close()
	if _, err := stmnt.Exec(alertUID, targetUID); err != nil {
		log.Println("(newdb.replace stmnt.Exec #2)", err)
	}
}


// GetItems returns a JSON object containing all items for given number of days past, sorted most recent first
func GetItems(days int) string {
	stmnt := prepStmt("select json from items where sent > subdate(now(), ?) and replacedBy is null order by sent desc")
	defer stmnt.Close()
	//var rows sql.Result
	rows, err := stmnt.Query(days)
	if err != nil {
		log.Println("(newdb.GetItems stmnt.Exec)", err)
		return ""
	}
	defer rows.Close()
	// assemble items into []string
	var items []string
	for rows.Next() {
		var last string
		_ = rows.Scan(&last)
		items = append(items, last)
	}
	// return JSON for list of items
	jsn, _ := json.Marshal(items)
	return string(jsn)
}

func GetDisplay(uuid string) string {
	stmnt := prepStmt("select json from displays where uuid = ?")
	defer stmnt.Close()
	var display string
	row := stmnt.QueryRow(uuid)
	_ = row.Scan(&display)
	return display
}

func GetRaw(uuid string) string {
	stmnt := prepStmt("select xml from cap where uuid = ?")
	defer stmnt.Close()
	var raw string
	row := stmnt.QueryRow(uuid)
	_ = row.Scan(&raw)
	return raw
}

// PutUptime sets the uptime.last value to the current moment in UTC
func PutUptime() {
	loc, _ := time.LoadLocation("UTC")
	now := time.Now().In(loc)
	nowStamp := now.Format(time.RFC3339)
	stmnt := prepStmt("UPDATE uptime SET last = ?")
	defer stmnt.Close()
	if _, err := stmnt.Exec(nowStamp); err != nil {
		log.Println("(newdb.PutLastTime stmnt.Exec)", err)
		return
	}
}

// GetUptime returns the last value from the uptime table, which is stored in UTC
func GetUptime() string {
	var last string
	stmnt := prepStmt("select last from uptime where ID=1")
	defer stmnt.Close()
	row := stmnt.QueryRow()
	_ = row.Scan(&last)
	// format as ISO 8601
	uptime := strings.Replace(last, " ", "T", 1)
	uptime = uptime + "-00:00"
	return uptime
}

func TrimDB(days int) {
	stmnt := prepStmt("delete from cap where sent < subdate(now(), ?)")
	defer stmnt.Close()
	if _, err := stmnt.Exec(days); err != nil {
		log.Println("(newdb.TrimDB stmnt.Exec cap)", err)
	}
	stmnt = prepStmt("delete from items where sent < subdate(now(), ?)")
	defer stmnt.Close()
	if _, err := stmnt.Exec(days); err != nil {
		log.Println("(newdb.TrimDB stmnt.Exec items)", err)
	}
	stmnt = prepStmt("delete from displays where sent < subdate(now(), ?)")
	defer stmnt.Close()
	if _, err := stmnt.Exec(days); err != nil {
		log.Println("(newdb.TrimDB stmnt.Exec displays)", err)
	}
	fmt.Println("(newdb.TrimDB) Database trimmed to last", days, "days.")
}

func prepStmt(stmt string) *sql.Stmt {
	sqlStmt, err := db.Prepare(stmt)
	if err != nil {
	fmt.Println("(newdb.prepStmt) ", err)
	}
	return sqlStmt
}

// extract the CMAMText from an Info struct
func getCMAMText(info cap.Info) string {
	for _, param := range info.Parameters {
		if param.ValueName == "CMAMtext" {
			return param.Value
		}
	}
	return ""
}

// extract the CMAMText from an Info struct
func getCMAMLongText(info cap.Info) string {
	for _, param := range info.Parameters {
		if param.ValueName == "CMAMlongtext" {
			return param.Value
		}
	}
	return ""
}

// look up polygons for SAME code
func sameLookup(fips string) []string{
	stmnt := prepStmt("select polygon from fips where samecode = ?")
	defer stmnt.Close()
	//var rows sql.Result
	rows, err := stmnt.Query(fips)
	if err != nil {
		log.Println("(newdb.sameLookup stmnt.Exec)", err)
		return nil
	}
	defer rows.Close()
	// assemble items into []string
	var polygons []string
	for rows.Next() {
		var polygon string
		_ = rows.Scan(&polygon)
		polygons = append(polygons, polygon)
	}
	return polygons
}
