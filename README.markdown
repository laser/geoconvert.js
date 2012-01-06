geoconvert.js helps a JavaScript programmer transform degree decimal-formatted latitude/longitude positions to degree/minute/second-formatted positions, from degree-decimal to UTM, and from UTM to degree-decimal.

# Test code

<code>
    <pre>
test("qUnit tests", function() {
    var lat,
        lon,
        zone,
        utm,
        latLng,
        dmsLat,
        ddLat;

    lat = 15;
    lon = 15;

    module("Going from DD-formatted lat/lon to UTM using WGS84 datum");
    utm = new UTM(lat, lon);
    equal(utm.northing, 1658325.9934411813);
    equal(utm.easting, 500000);
    equal(utm.lngZone, 33);
    equal(utm.hemisphere, "N");

    module("Going from UTM using WGS84 datum to DD-formatted lat/lon");
    latLng = new LL(utm.easting, utm.northing, utm.lngZone, utm.hemisphere);
    equal(latLng.longitude.toFixed(8), lat);
    equal(latLng.latitude.toFixed(8), lon);

    module("Going from DD-formatted lat/lon to DMS-formatted lat/lon");
    dmsLat = Geoconvert.convertDDtoDMS(lat, 8);
    equal(dmsLat,"15°0'0\"");

    module("Going from DMS-formatted lat/lon to DD-formatted lat/lon");
    ddLat = Geoconvert.convertDMStoDD("N", 15, 0, 0);
    equal(ddLat, 15);

    module("Blows up on out-of-range latitude");
    raises(function() {
        Geoconvert.convertDMStoDD("N", 91, 0, 0);
    }, "91 is outside of acceptable latitude range");

    module("Blows up on out-of-range longitude");
    raises(function() {
        Geoconvert.convertDMStoDD("W", -181, 0, 0);
    }, "-181 is outside of acceptable longitude range");
});
    </pre>
</code>