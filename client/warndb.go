/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.4 4/11/2019
 *
 ***/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.5 4/14/2019
 *
 *************************************************************/

package warndb

import (
	"database/sql"
	"fmt"
	"log"
	"strconv"
	"strings"

	"../cap"
	_ "github.com/mattn/go-sqlite3" // driver for sql
)

var db *sql.DB
var alertID int64
var infoID int64
var areaID int64

// ToDB ...
func ToDB(alert cap.Alert, xml string) {

	db, err := sql.Open("sqlite3", "/home/pbs/warn.db")
	if err != nil {
		log.Println("DB open err:", err)
	}
	defer db.Close()

	// test if duplicate
	statement, err := db.Prepare("select count(*) from alerts where identifier = ? and sender = ? and sent = ?")
	rows, err := statement.Query(alert.Identifier, alert.Sender, alert.Sent)
	var cnt int
	for rows.Next() {
		err = rows.Scan(&cnt)
	}
	// if an existing match, ignore as dupe
	if cnt > 0 {
		log.Println("DUPLICATE:", alert.Identifier+","+alert.Sender+","+alert.Sent)

		// otherwise post to DB
	} else {

		// add the Alert
		statement, err = db.Prepare("insert into alerts (identifier, sender, sent, status, msgType, source, scope,  code, note, refs, replacedBy) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
		// , scope, restriction, addresses, references, incidents
		res, err := statement.Exec(alert.Identifier, alert.Sender, alert.Sent, alert.Status, alert.MessageType, alert.Source, alert.Scope, alert.Code, alert.Note, alert.References, "")

		if err != nil {
			log.Println("Insert alert error:", err)
		} else {
			alertID, err = res.LastInsertId()
			if err != nil {
				log.Println(err)
			}
			log.Println("Added alert number", alertID, alert.Identifier+","+alert.Sender+","+alert.Sent)
		}

		// add some less-used fields
		// alert.Restriction, alert.Addresses, alert.Incidents
		//s := "update alerts set references = '" + alert.References + "' where id = " + strconv.FormatInt(alertID, 10)
		//fmt.Println(s)
		//_, err = db.Exec(s)
		//if err != nil {
		//	log.Println("Update to alert error:", err)
		//}

		// add the raw XML
		statement, err = db.Prepare("insert into CAP (alertId, xml) values (?,?)")
		if err != nil {
			log.Println(err)
		}
		defer statement.Close()
		_, err = statement.Exec(alertID, xml)
		if err != nil {
			log.Println("Insert CAP error:", err)
		}
		// add Infos
		for _, info := range alert.Infos {
			// extract CMAM value to insert to db later
			cmam := getCMAM(info)
			// derive slug value
			slug := ""
			if len(info.Headline) != 0 {
				slug = info.Headline
			}
			if len(slug) == 0 && len(getCMAM(info)) != 0 {
				slug = getCMAM(info)
			}
			if len(slug) == 0 && len(info.Event) != 0 {
				slug = info.Event
			}
			if len(slug) == 0 && len(info.ResponseType) != 0 {
				slug = info.ResponseType
			}
			if len(slug) == 0 {
				slug = "[No Headline]"
			}
			statement, err := db.Prepare("insert into infos (alertId, language, category, event, responseType, urgency, severity, certainty, expires, senderName, slug, effective, onset, audience, headline, cmam, description, instruction, contact, web) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
			if err != nil {
				log.Fatal(err)
			}
			defer statement.Close()
			res, err := statement.Exec(strconv.FormatInt(alertID, 10), info.Language, info.Category, info.Event, info.ResponseType, info.Urgency, info.Severity, info.Certainty, info.Expires, info.SenderName, slug, info.Effective, info.Onset, info.Audience, info.Headline, cmam, info.Description, info.Instruction, info.Contact, info.Web)
			infoID, err = res.LastInsertId()
			if err != nil {
				log.Println("Insert info error", err)
			}

			// add Parameters

			for _, param := range info.Parameters {
				statement, err = db.Prepare("insert into parameters (infoId, valueName, value) values (?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				defer statement.Close()
				_, err := statement.Exec(strconv.FormatInt(infoID, 10), param.ValueName, param.Value)
				if err != nil {
					log.Println("Insert parameter error:", err)
				}
			}

			// add EventCodes
			for _, ec := range info.EventCodes {
				statement, err = db.Prepare("insert into eventCodes (infoId, valueName, value) values (?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				_, err = statement.Exec(strconv.FormatInt(infoID, 10), ec.ValueName, ec.Value)
				if err != nil {
					log.Fatal("Insert eventCode error:", err)
				}
			}

			// add Resources
			for _, resource := range info.Resources {
				statement, err = db.Prepare("insert into resources (infoId, resourceDesc, mimeType, size, uri, derefUri, digest) values (?, ?, ?, ?, ?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				_, err = statement.Exec(strconv.FormatInt(infoID, 10), resource.Description, resource.MimeType, string(resource.Size), resource.URI, resource.Digest, resource.DerefURI)
				if err != nil {
					log.Println("Insert resource error:", err)
				}
			}

			// add Areas
			for _, area := range info.Areas {
				statement, err = db.Prepare("insert into areas (infoId, areaDesc, altitude, ceiling) values (?, ?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				res, err = statement.Exec(strconv.FormatInt(infoID, 10), area.Description, area.Altitude, area.Ceiling)
				if err != nil {
					log.Println("Insert area error:", err)
				} else {
					areaID, err = res.LastInsertId()
					if err != nil {
						log.Println(err)
					}
				}

				// add Geocodes
				for _, param := range area.Geocodes {
					statement, err = db.Prepare("insert into geocodes (areaId, valueName, value) values (?, ?, ?)")
					if err != nil {
						log.Println(err)
					}
					_, err = statement.Exec(strconv.FormatInt(areaID, 10), param.ValueName, param.Value)
					if err != nil {
						log.Println("Insert geocode error:", err)
					}
				}

				// add Polygons
				for _, polygon := range area.Polygons {
					statement, err = db.Prepare("insert into polygons (areaId, polygon) values  (?, ?)")
					if err != nil {
						log.Println(err)
					}
					_, err = statement.Exec(strconv.FormatInt(areaID, 10), polygon)
					if err != nil {
						log.Println("Insert polygon error:", err)
					}
				}

				// add Circles
				for _, circle := range area.Circles {
					statement, err = db.Prepare("insert into circles (areaId, circle) values (?, ?)")
					if err != nil {
						log.Println(err)
					}
					_, err = statement.Exec(strconv.FormatInt(areaID, 10), circle)
					if err != nil {
						log.Println("Insert circle error:", err)
					}
				}
			}
		}
	}

	// if Update or Cancel, set replacedBy pointer on referenced messages
	if alert.MessageType == "Update" || alert.MessageType == "Cancel" {
		var alrt int
		ref := alert.References
		refs := strings.Split(ref, ",")
		sqlStmt := "select id from alerts where identifier ='" + refs[0] + "', sender = '" + refs[1] + "', and sent = '" + refs[2] + "'"
		fmt.Println(sqlStmt)
		_ = db.QueryRow(sqlStmt).Scan(&alrt)
		fmt.Println("replace/update alert", alrt)
		// set replacedBy in cancelled/updated alert
		sqlStmt = "update alerts set replacedBy='" + ref + "' where id='" + string(alrt) + "'"
		log.Println(sqlStmt)
		_, err = db.Exec(sqlStmt)
		if err != nil {
			log.Println("Update alert error:", err)
		}
	}
}

func getCMAM(info cap.Info) string {
	for _, param := range info.Parameters {
		if param.ValueName == "CMAMtext" {
			return param.Value
		}
	}
	return ""
}
**********************************************************/

package warndb

import (
	"database/sql"
	"fmt"
	"log"
	"strconv"
	"strings"

	"../cap"
	_ "github.com/mattn/go-sqlite3" // driver for sql
)

var db *sql.DB
var alertID int64
var infoID int64
var areaID int64

// ToDB ...
func ToDB(alert cap.Alert, xml string) {

	db, err := sql.Open("sqlite3", "/home/pbs/warn.db")
	if err != nil {
		log.Println("DB open err:", err)
	}
	defer db.Close()

	// test if duplicate
	statement, err := db.Prepare("select count(*) from alerts where identifier = ? and sender = ? and sent = ?")
	rows, err := statement.Query(alert.Identifier, alert.Sender, alert.Sent)
	var cnt int
	for rows.Next() {
		err = rows.Scan(&cnt)
	}
	// if an existing match, ignore as dupe
	if cnt > 0 {
		log.Println("DUPLICATE:", alert.Identifier+","+alert.Sender+","+alert.Sent)

		// otherwise post to DB
	} else {

		// add the Alert
		statement, err = db.Prepare("insert into alerts (identifier, sender, sent, status, msgType, source, scope,  code, note, refs, replacedBy) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
		// , scope, restriction, addresses, references, incidents
		res, err := statement.Exec(alert.Identifier, alert.Sender, alert.Sent, alert.Status, alert.MessageType, alert.Source, alert.Scope, alert.Code, alert.Note, alert.References, "")

		if err != nil {
			log.Println("Insert alert error:", err)
		} else {
			alertID, err = res.LastInsertId()
			if err != nil {
				log.Println(err)
			}
			log.Println("Added alert number", alertID, alert.Identifier+","+alert.Sender+","+alert.Sent)
		}

		// add some less-used fields
		// alert.Restriction, alert.Addresses, alert.Incidents
		//s := "update alerts set references = '" + alert.References + "' where id = " + strconv.FormatInt(alertID, 10)
		//fmt.Println(s)
		//_, err = db.Exec(s)
		//if err != nil {
		//	log.Println("Update to alert error:", err)
		//}

		// add the raw XML
		statement, err = db.Prepare("insert into CAP (alertId, xml) values (?,?)")
		if err != nil {
			log.Println(err)
		}
		defer statement.Close()
		_, err = statement.Exec(alertID, xml)
		if err != nil {
			log.Println("Insert CAP error:", err)
		}
		// add Infos
		for _, info := range alert.Infos {
			// extract CMAM value
			cmam := getCMAM(info)
			// derive slug value
			slug := ""
			if len(info.Headline) != 0 {
				slug = info.Headline
			}
			if len(slug) == 0 && len(getCMAM(info)) != 0 {
				slug = getCMAM(info)
			}
			if len(slug) == 0 && len(info.Event) != 0 {
				slug = info.Event
			}
			if len(slug) == 0 && len(info.ResponseType) != 0 {
				slug = info.ResponseType
			}
			if len(slug) == 0 {
				slug = "[No Headline]"
			}
			statement, err := db.Prepare("insert into infos (alertId, language, category, event, responseType, urgency, severity, certainty, expires, senderName, slug, effective, onset, audience, headline, cmam, description, instruction, contact, web) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
			if err != nil {
				log.Fatal(err)
			}
			defer statement.Close()
			res, err := statement.Exec(strconv.FormatInt(alertID, 10), info.Language, info.Category, info.Event, info.ResponseType, info.Urgency, info.Severity, info.Certainty, info.Expires, info.SenderName, slug, info.Effective, info.Onset, info.Audience, info.Headline, cmam, info.Description, info.Instruction, info.Contact, info.Web)
			infoID, err = res.LastInsertId()
			if err != nil {
				log.Println("Insert info error", err)
			}

			// add Parameters

			for _, param := range info.Parameters {
				statement, err = db.Prepare("insert into parameters (infoId, valueName, value) values (?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				defer statement.Close()
				_, err := statement.Exec(strconv.FormatInt(infoID, 10), param.ValueName, param.Value)
				if err != nil {
					log.Println("Insert parameter error:", err)
				}
			}

			// add EventCodes
			for _, ec := range info.EventCodes {
				statement, err = db.Prepare("insert into eventCodes (infoId, valueName, value) values (?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				_, err = statement.Exec(strconv.FormatInt(infoID, 10), ec.ValueName, ec.Value)
				if err != nil {
					log.Fatal("Insert eventCode error:", err)
				}
			}

			// add Resources
			for _, resource := range info.Resources {
				statement, err = db.Prepare("insert into resources (infoId, resourceDesc, mimeType, size, uri, derefUri, digest) values (?, ?, ?, ?, ?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				_, err = statement.Exec(strconv.FormatInt(infoID, 10), resource.Description, resource.MimeType, string(resource.Size), resource.URI, resource.Digest, resource.DerefURI)
				if err != nil {
					log.Println("Insert resource error:", err)
				}
			}

			// add Areas
			for _, area := range info.Areas {
				statement, err = db.Prepare("insert into areas (infoId, areaDesc, altitude, ceiling) values (?, ?, ?, ?)")
				if err != nil {
					log.Println(err)
				}
				res, err = statement.Exec(strconv.FormatInt(infoID, 10), area.Description, area.Altitude, area.Ceiling)
				if err != nil {
					log.Println("Insert area error:", err)
				} else {
					areaID, err = res.LastInsertId()
					if err != nil {
						log.Println(err)
					}
				}

				// add Geocodes
				for _, param := range area.Geocodes {
					statement, err = db.Prepare("insert into geocodes (areaId, valueName, value) values (?, ?, ?)")
					if err != nil {
						log.Println(err)
					}
					_, err = statement.Exec(strconv.FormatInt(areaID, 10), param.ValueName, param.Value)
					if err != nil {
						log.Println("Insert geocode error:", err)
					}
				}

				// add Polygons
				for _, polygon := range area.Polygons {
					statement, err = db.Prepare("insert into polygons (areaId, polygon) values  (?, ?)")
					if err != nil {
						log.Println(err)
					}
					_, err = statement.Exec(strconv.FormatInt(areaID, 10), polygon)
					if err != nil {
						log.Println("Insert polygon error:", err)
					}
				}

				// add Circles
				for _, circle := range area.Circles {
					statement, err = db.Prepare("insert into circles (areaId, circle) values (?, ?)")
					if err != nil {
						log.Println(err)
					}
					_, err = statement.Exec(strconv.FormatInt(areaID, 10), circle)
					if err != nil {
						log.Println("Insert circle error:", err)
					}
				}
			}
		}
	}

	// if Update or Cancel, set replacedBy pointer on referenced messages
	if alert.MessageType == "Update" || alert.MessageType == "Cancel" {
		var alrt int
		ref := alert.References
		refs := strings.Split(ref, ",")
		sqlStmt := "select id from alerts where identifier ='" + refs[0] + "', sender = '" + refs[1] + "', and sent = '" + refs[2] + "'"
		fmt.Println(sqlStmt)
		_ = db.QueryRow(sqlStmt).Scan(&alrt)
		fmt.Println("replace/update alert", alrt)
		// set replacedBy in cancelled/updated alert
		sqlStmt = "update alerts set replacedBy='" + ref + "' where id='" + string(alrt) + "'"
		fmt.Println(sqlStmt)
		_, err = db.Exec(sqlStmt)
		if err != nil {
			log.Println("Update alert error:", err)
		}
	}
}

func getCMAM(info cap.Info) string {
	for _, param := range info.Parameters {
		if param.ValueName == "CMAMtext" {
			return param.Value
		}
	}
	return ""
}
