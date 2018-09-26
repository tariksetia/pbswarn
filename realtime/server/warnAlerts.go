package main

import (
	"database/sql"
	_ "github.com/go-sql-driver/mysql"

	"io/ioutil"
	"log"
	"time"
)

var statement *sql.Stmt
var err error

func main() {
	db, err := sql.Open("mysql", "warn:warn@tcp(192.168.2.1:3306)/warn")
	check(err)
	defer db.Close()
	statement, err = db.Prepare("select json from warn.alerts where expires > now()")
	check(err)
	for {
		update()
		time.Sleep(7 * time.Second)
	}
}

func update() {

	rows, err := statement.Query() // execute our select statement
	check(err)

	// extract JSON from the retrieved alerts and construct a single JSON array string
	alert := "["
	for rows.Next() {
		var json string
		rows.Scan(&json)
		alert = alert + json + ", "
	}
	if alert == "[" {
		alert = alert + "]"
	} else {
		alert = alert[0:len(alert)-2] + "]" // trim trailing ", " before closing bracket
	}

	// save out to AJAX data file
	err = ioutil.WriteFile("/var/www/html/alerts.json", []byte(alert), 0644)
	check(err)
}

func check(e error) {
	if e != nil {
		log.Println(e)
	}
}
