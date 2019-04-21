// 4/20/2019
package main

import (
	"log"
	"logging"
	"net"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"golang.org/x/net/ipv4"
)

var c mqtt.Client

var broker = "10.8.0.1:1883"
var multicast = "224.3.0.1:5000"
var topic = "warn_raw"

func main() {
	// set up a Producer connection
	opts := mqtt.NewClientOptions().AddBroker(broker).SetClientID("warn-rx-1")
	c = mqtt.NewClient(opts)
	if token := c.Connect(); token.Wait() && token.Error() != nil {
		panic(token.Error())
	}
	// set up the UDP monitor
	eth0, err := net.InterfaceByName("eth0")
	if err != nil {
		log.Fatal("InterfaceByName", err)
	}
	group := net.IPv4(224, 3, 0, 1)
	c, err := net.ListenPacket("udp4", multicast)
	if err != nil {
		log.Fatal("ListenPacket", err)
	}
	defer c.Close()
	p := ipv4.NewPacketConn(c)
	if err := p.JoinGroup(eth0, &net.UDPAddr{IP: group}); err != nil {
		log.Fatal("JoinGroup", err)
	}
	b := make([]byte, 1472)
	log.Println("Starting forwarding from WARN receiver multicast on " + multicast + " to MQTT broker " +
		broker + " topic " + topic)
	for {
		n, _, _, _ := p.ReadFrom(b)
		//log.Println("got packet")
		packetHandler(b, n)
	}
}

func packetHandler(b []byte, n int) {
	if token := c.Publish(topic, 1, false, string(b)); token.Wait() && token.Error() != nil {
		err := token.Error()
		estring := err.Error()
		logging.Log("datacastTester.main", estring)
	}
}
