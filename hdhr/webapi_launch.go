/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Updated 7/31/2019
 *
 *************************************************************/

package main

import (
	"fmt"
	"log"

	config "github.com/Tkanos/gonfig"

	//hdhr "pbs.org/hdhr/hdhr"
	"pbs.org/hdhr/webapi"
	_ "pbs.org/hdhr/webapi"
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

func main() {
	// load system configuration
	cfg = Configuration{}
	if err := config.GetConf("warnmonitor.conf", &cfg); err != nil {
		log.Println("(test.main config.GetConf)", err.Error())
	}
	fmt.Println("(webapi_launcher.init) Version", cfg.Version)

	//go hdhr.Start()
	webapi.Start()
}
