geoconvert.js helps a JavaScript programmer transform degree decimal-formatted latitude/longitude positions to degree/minute/second-formatted positions, from degree-decimal to UTM, and from UTM to degree-decimal.

# Test code

<code>
    <pre>
test("qUnit tests", function() {
    var lat,
        lon,
        zone,
        utm,
        latLng;

    lat = 15;
    lon = 15;

    module("Going from lat/lon to UTM using WGS84 datum");

    utm = new UTM(lat, lon);

    equal(utm.northing, 1658325.9934411813);
    equal(utm.easting, 500000);
    equal(utm.lngZone, 33);
    equal(utm.hemisphere, "N");

    module("Going from UTM using WGS84 datum to lat/lon");

    latLng = new LL(utm.easting, utm.northing, utm.lngZone, utm.hemisphere);

    equal(latLng.longitude.toFixed(8), lat);
    equal(latLng.latitude.toFixed(8), lon);
});
    </pre>
</code>