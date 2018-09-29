## WARN Realtime Map
# Gateway application
**warnMonitor.go** uses **catcher/catcher.go** to capture UDP packets from the Harmonic receiver and reassemble the WEA CAP messages, and then posts them to the remote database on the server.  It also forwards to the DB a datestamp of the last received heartbeat or active message received over the Harmonic.
