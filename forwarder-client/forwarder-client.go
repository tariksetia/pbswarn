/*
Client-side utility to monitor MQTT feed.

Copyright 2019 America's Public Television Stations
4/20/2019
*/

package main

import (
	"log"
	"net"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// Configuration data structure for application config
type Configuration struct {
	Dsn         string
	Driver      string
	BrokerURL   string
	Station     string
	Topic       string
	Encoder     string
	EncoderCert string
	LogFile     string
}

var client mqtt.Client
var err error

const (
	srvAddr         = "224.3.0.1:5000"
	maxDatagramSize = 8192
	broker          = "10.8.0.1:1883"
	topic           = "warn_raw"
	//topic = "#"
)

var c *net.UDPConn

// Source initializes the MQTT source
func main() {

	// set up a Subscriber connection
	opts := mqtt.NewClientOptions().AddBroker(broker).SetClientID("mini")
	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		log.Println("forwarder-client.main: Source Connect Error:" + token.Error().Error())
	}

	// and set up multicast sender
	addr, err := net.ResolveUDPAddr("udp", srvAddr)
	if err != nil {
		log.Fatal(err)
	}
	c, err = net.DialUDP("udp", nil, addr)

	// Client's callback handler for new messages
	msgRcvd := func(client mqtt.Client, message mqtt.Message) {
		//t := time.Now()
		//src := message.Topic()
		txt := string(message.Payload())
		//log.Println(t.Format(time.Stamp), src)
		multicast(txt)

	}

	// Subscribe to a topic
	if token := client.Subscribe(topic, 0, msgRcvd); token.Wait() && token.Error() != nil {
		log.Println("forwarder-client.main: Source Subscribe Error" + token.Error().Error())
	}
	log.Println("forwarder-client.main: Subscribed to " + broker + " topic " + topic)

	for {
		time.Sleep(time.Second)
	}

}

func multicast(txt string) {
	_, err = c.Write([]byte(txt))
	if err != nil {
		log.Println("forwarder-client.multicast error:", err)
	}
	time.Sleep(1 * time.Second)
}
