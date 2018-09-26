## WARN Realtime Map
# Database Setup
The database on the map server holds two tables:
- **alerts** holds received WEA alerts in CAP and JSON format, with an index on the separate 'identifier' column.  db_setup.sql is DDL that sets up the database, user, alerts table and index.  Alerts are added to this table by a remote SQL client.
- **fips** is a read-only lookup table for converting a SAME "FIPS" code (referring to a county, state or the whole US) to one or more CAP-format geospatial polygons.  'fips_setup.sql' sets up the table, 'fips_<timestamp>.sql' loads the data.
