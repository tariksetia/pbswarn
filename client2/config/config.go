/**************************************************************
 *
 *  Copyright (c) 2019 Public Broadcasting Service
 *  Contact: <warn@pbs.org>
 *  All Rights Reserved.
 *
 *  Version 12/9/2019
 *
 *************************************************************/

package config

import (
	"fmt"
	config "github.com/Tkanos/gonfig"

)

type Configuration struct {
	Dsn string
    Driver string
    Tuner string
    UDPport string
    PID string
    WebPort string
    Freq string 
    LinkTestLookbackMinutes string
    AllAlertsRetentionDays string
}

var (
	cfg Configuration
)

func init() {
	cfg = Configuration{}
	if err := config.GetConf("/home/pi/warnmonitor.conf", &cfg); err != nil {
		fmt.Println("(config.init) GetConf", err.Error())
	}
}

func GetConfig() Configuration {
	return cfg
}
