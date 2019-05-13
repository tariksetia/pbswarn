/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.0 5/12/2019
 *
 *************************************************************/

package main

import (
	"net/http"
	"strings"

	"../dbapi"
	_ "github.com/davecgh/go-spew/spew"
	"github.com/go-chi/chi"
	"github.com/go-chi/cors"
)

func main() {
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
	FileServer(r, "/client", http.Dir("/home/pi/web"))
	FileServer(r, "/favicon.ico", http.Dir("/home/pi/web"))
	// Map db calls
	r.Get("/getUptime", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(dbapi.GetUptime()))
	})
	r.Get("/getAlerts", func(w http.ResponseWriter, r *http.Request) {
		//log.Println("getAlerts()")
		w.Write([]byte(dbapi.GetAlerts()))
	})
	r.Get("/getInfos/{alert}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "alert")
		//log.Println("getInfos()", val)
		w.Write([]byte(dbapi.GetInfos(val)))
	})
	r.Get("/getAllInfos/{earliest}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "earliest")
		//log.Println("getAllInfos()", val)
		w.Write([]byte(dbapi.GetAllInfos(val)))
	})
	r.Get("/getInfo/{info}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "info")
		//log.Println("getInfo()", val)
		w.Write([]byte(dbapi.GetInfo(val)))
	})
	r.Get("/getParameters/{info}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "info")
		w.Write([]byte(dbapi.GetParameters(val)))
	})
	r.Get("/getEventCodes/{info}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "info")
		w.Write([]byte(dbapi.GetEventCodes(val)))
	})
	r.Get("/getResources/{info}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "info")
		w.Write([]byte(dbapi.GetResources(val)))
	})
	r.Get("/getAreas/{info}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "info")
		w.Write([]byte(dbapi.GetAreas(val)))
	})
	r.Get("/getPolygons/{area}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "area")
		w.Write([]byte(dbapi.GetPolygons(val)))
	})
	r.Get("/getCircles/{area}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "area")
		w.Write([]byte(dbapi.GetCircles(val)))
	})
	r.Get("/getGeocodes/{area}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "area")
		w.Write([]byte(dbapi.GetGeocodes(val)))
	})
	r.Get("/getCAP/{alert}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "alert")
		w.Write([]byte(dbapi.GetCAP(val)))
	})
	// and start
	http.ListenAndServe(":9111", r)
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
