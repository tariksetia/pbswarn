/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 8/1/2019
 *
 *************************************************************/

package webapi

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	config "github.com/Tkanos/gonfig"
	_ "github.com/davecgh/go-spew/spew"
	"github.com/go-chi/chi"
	"github.com/go-chi/cors"
	newdb "pbs.org/hdhr/newdb"
	"pbs.org/hdhr/tuner"
	_ "pbs.org/hdhr/tuner"
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

var cfg Configuration
var device string
var tnr int

func init() {
	cfg = Configuration{}
	if err := config.GetConf("warnmonitor.conf", &cfg); err != nil {
		log.Println("(test.main config.GetConf)", err.Error())
	}
}

func Start() {

	hdhr := strings.Split(tuner.Discover(), " ")
	device = hdhr[2]
	tnr := strconv.Itoa(cfg.Tuner)

	r := chi.NewRouter()
	cors := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	})
	r.Use(cors.Handler)

	// Static file server
	FileServer(r, "/", http.Dir("/home/pi/hdhr_dev/web"))

	// Map db calls
	r.Get("/getUptime", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(newdb.GetUptime()))
	})
	r.Get("/getItems/{days}", func(w http.ResponseWriter, r *http.Request) {
		days, _ := strconv.Atoi(chi.URLParam(r, "days"))
		w.Write([]byte(newdb.GetItems(days)))
	})
	r.Get("/getDisplay/{uuid}", func(w http.ResponseWriter, r *http.Request) {
		uuid := chi.URLParam(r, "uuid")
		w.Write([]byte(newdb.GetDisplay(uuid)))
	})
	r.Get("/getRaw/{uuid}", func(w http.ResponseWriter, r *http.Request) {
		uuid := chi.URLParam(r, "uuid")
		w.Write([]byte(newdb.GetRaw(uuid)))
	})

	// calls to control the HDHomeRun receiver
	// tune to frequency
	r.Get("/tuneRX/{freq}", func(w http.ResponseWriter, r *http.Request) {
		freq := chi.URLParam(r, "freq")
		tuner.TuneRX(device, tnr, freq)
	})
	// poll for status
	r.Get("/RXstatus", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(tuner.RXstatus(device, tnr)))
	})

	// and start the server
	fmt.Println("(webapi.Start) Web interface on port", cfg.WebPort)
	http.ListenAndServe(":"+strconv.Itoa(cfg.WebPort), r)
}

// FileServer ... serves a static file
func FileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit URL parameters.")
	}
	fs := http.StripPrefix(path, http.FileServer(root))
	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"
	r.Get(path, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fs.ServeHTTP(w, r)
	}))
}
