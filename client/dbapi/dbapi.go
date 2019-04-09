/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 1.0 4/8/2019
 *
 *************************************************************/

package main

import (
	"net/http"

	"../dbapi"
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
	r.Get("/getAlerts", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(dbapi.GetAlerts()))
	})
	r.Get("/getInfos/{alert}", func(w http.ResponseWriter, r *http.Request) {
		val := chi.URLParam(r, "alert")
		w.Write([]byte(dbapi.GetInfos(val)))
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
	http.ListenAndServe(":3333", r)
}
