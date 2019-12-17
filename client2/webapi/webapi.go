/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 12/17/2019
 *
 *************************************************************/

package main


import (
	//"fmt"
	//"io/ioutil"
	"net/http"
	"strings"
	//"bytes"
	_ "github.com/davecgh/go-spew/spew"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"
	dbapi "pbs.org/warnmonitor/dbapi"
	config "pbs.org/warnmonitor/config"
)

var cfg config.Configuration

func init() {
	cfg = config.GetConfig()
}

func main() {

	r := chi.NewRouter()

	// A good base middleware stack
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	//r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	cors := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	})
	r.Use(cors.Handler)

	// Static file server
	FileServer(r, "/", http.Dir("/home/pi/web"))
	
	
	r.Get("/getItems", func(w http.ResponseWriter, r *http.Request) {
		items := dbapi.GetItems()
		w.Write([]byte(items))
	})
	

	r.Get("/getSince/{millis}", func(w http.ResponseWriter, r *http.Request) {
		millis := chi.URLParam(r, "millis")
		items := dbapi.GetItemsSince(millis)
		w.Write([]byte(strings.Join(items, ",")))
	})
	
	

	r.Get("/getCAP/{uuid}", func(w http.ResponseWriter, r *http.Request) {
		uuid := chi.URLParam(r, "uuid")
		cap := dbapi.GetAlertXML(uuid)
		w.Write([]byte(cap))
	})

	// and start the server
	http.ListenAndServe(":" + cfg.WebPort, r)
	select{}
}

// FileServer ... serves a static file system
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

