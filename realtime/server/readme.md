## WARN Realtime Map
# Database Setup
The database on the map server holds two tables:
- **alerts** holds received WEA alerts in CAP and JSON format, with an index on the separate 'identifier' column.  The provided DDL sets up the database, user, table and index.
- **fips** is a read-only lookup table for converting a SAME "FIPS" code (referring to a county, state or the whole US) to one or more CAP-format geospatial polygons.  The DDL sets up the table, the SQL loads the data.
