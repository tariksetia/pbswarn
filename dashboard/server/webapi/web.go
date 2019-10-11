package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"

	_ "github.com/davecgh/go-spew/spew"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
	"github.com/go-chi/cors"
	db "pbs.org/warn/dbapi"

	//"golang.org/x/crypto/acme/autocert"

)

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
	FileServer(r, "/", http.Dir("./static"))

	// Map db calls
	r.Post("/addAlert", func(w http.ResponseWriter, r *http.Request) {
		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			fmt.Println("(web.main) Couldn't read POST")
			return
		}
		report := db.AddAlert(string(body))
		w.Write([]byte(report))
	})

	r.Get("/getSince/{millis}", func(w http.ResponseWriter, r *http.Request) {
		millis := chi.URLParam(r, "millis")
		items := db.GetItemsSince(millis)
		w.Write([]byte(items))
	})

	r.Get("/getCAP/{uuid}", func(w http.ResponseWriter, r *http.Request) {
		uuid := chi.URLParam(r, "uuid")
		cap := db.GetCAP(uuid)
		w.Write([]byte(cap))
	})

	// and start the server
	http.ListenAndServe(":9110", r)
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
