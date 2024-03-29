var Geomath = (function() {
    var iface,
        PI,
        ELLIPSOID_MODEL_MAJOR_AXIS,
        ELLIPSOID_MODEL_MINOR_AXIS,
        ELLIPSOID_ECCENTRICITY_SQUARED,
        UTM_SCALE_FACTOR;

    PI = 3.14159265358979;

    UTM_SCALE_FACTOR = 0.9996;

    /* Ellipsoid model constants (actual values here are for WGS84) */
    ELLIPSOID_MODEL_MAJOR_AXIS = 6378137.0;
    ELLIPSOID_MODEL_MINOR_AXIS = 6356752.314;
    ELLIPSOID_ECCENTRICITY_SQUARED = 6.69437999013e-03;

    iface = {};

    iface.degToRad = function(deg) {
        return (deg / 180.0 * PI)
    };

    iface.radToDeg = function(rad) {
        return (rad / PI * 180.0)
    };

    iface.latLonToUTMXY = function(lat, lon, zone) {

        /*
         * LatLonToUTMXY
         *
         * Converts a latitude/longitude pair to x and y coordinates in the
         * Universal Transverse Mercator projection.
         *
         * Inputs:
         *   lat - Latitude of the point, in radians.
         *   lon - Longitude of the point, in radians.
         *   zone - UTM zone to be used for calculating values for x and y.
         *          If zone is less than 1 or greater than 60, the routine
         *          will determine the appropriate zone from the value of lon.
         *
         * Returns:
         *   A 2-element array where the UTM x and y values will be stored.
         *
         */

        var xy;

        xy = mapLatLonToXY(lat, lon, utmCentralMeridian(zone));

        /* Adjust easting and northing for UTM system. */
        xy[0] = xy[0] * UTM_SCALE_FACTOR + 500000.0;
        xy[1] = xy[1] * UTM_SCALE_FACTOR;
        if (xy[1] < 0.0) xy[1] = xy[1] + 10000000.0;

        return xy;
    };

    iface.utmXYToLatLon = function(x, y, zone, southhemi) {

        /*
         * UTMXYToLatLon
         *
         * Converts x and y coordinates in the Universal Transverse Mercator
         * projection to a latitude/longitude pair.
         *
         * Inputs:
         *	x - The easting of the point, in meters.
         *	y - The northing of the point, in meters.
         *	zone - The UTM zone in which the point lies.
         *	southhemi - True if the point is in the southern hemisphere;
         *               false otherwise.
         *
         * Returns:
         *	A 2-element array containing the latitude and
         *            longitude of the point, in radians.
         *
         */

        var cmeridian;

        x -= 500000.0;
        x /= UTM_SCALE_FACTOR;

        /* If in southern hemisphere, adjust y accordingly. */
        if (southhemi) y -= 10000000.0;

        y /= UTM_SCALE_FACTOR;

        cmeridian = utmCentralMeridian(zone);

        return mapXYToLatLon(x, y, cmeridian);
    };

    function arcLengthOfMeridian(phi) {
        /*
         * ArcLengthOfMeridian
         *
         * Computes the ellipsoidal distance from the equator to a point at a
         * given latitude.
         *
         * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
         * GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
         *
         * Inputs:
         *     phi - Latitude of the point, in radians.
         *
         * Returns:
         *     The ellipsoidal distance of the point from the equator, in meters.
         *
         */

        var alpha,
            beta,
            gamma,
            delta,
            epsilon,
            n,
            ellipsoidalDistance;

        /* Precalculate n */
        n = (ELLIPSOID_MODEL_MAJOR_AXIS - ELLIPSOID_MODEL_MINOR_AXIS) / (ELLIPSOID_MODEL_MAJOR_AXIS + ELLIPSOID_MODEL_MINOR_AXIS);

        /* Precalculate alpha */
        alpha = ((ELLIPSOID_MODEL_MAJOR_AXIS + ELLIPSOID_MODEL_MINOR_AXIS) / 2.0) * (1.0 + (Math.pow(n, 2.0) / 4.0) + (Math.pow(n, 4.0) / 64.0));

        /* Precalculate beta */
        beta = (-3.0 * n / 2.0) + (9.0 * Math.pow(n, 3.0) / 16.0) + (-3.0 * Math.pow(n, 5.0) / 32.0);

        /* Precalculate gamma */
        gamma = (15.0 * Math.pow(n, 2.0) / 16.0) + (-15.0 * Math.pow(n, 4.0) / 32.0);

        /* Precalculate delta */
        delta = (-35.0 * Math.pow(n, 3.0) / 48.0) + (105.0 * Math.pow(n, 5.0) / 256.0);

        /* Precalculate epsilon */
        epsilon = (315.0 * Math.pow(n, 4.0) / 512.0);

        /* Now calculate the sum of the series and return */
        ellipsoidalDistance = alpha * (phi + (beta * Math.sin(2.0 * phi)) + (gamma * Math.sin(4.0 * phi)) + (delta * Math.sin(6.0 * phi)) + (epsilon * Math.sin(8.0 * phi)));

        return ellipsoidalDistance;
    }

    function utmCentralMeridian(zone) {

        /*
         * UTMCentralMeridian
         *
         * Determines the central meridian for the given UTM zone.
         *
         * Inputs:
         *     zone - An integer value designating the UTM zone, range [1,60].
         *
         * Returns:
         *   The central meridian for the given UTM zone, in radians, or zero
         *   if the UTM zone parameter is outside the range [1,60].
         *   Range of the central meridian is the radian equivalent of [-177,+177].
         *
         */

        return iface.degToRad(-183.0 + (zone * 6.0));
    }

    function footpointLatitude(y) {

        /*
         * FootpointLatitude
         *
         * Computes the footpoint latitude for use in converting transverse
         * Mercator coordinates to ellipsoidal coordinates.
         *
         * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
         *   GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
         *
         * Inputs:
         *   y - The UTM northing coordinate, in meters.
         *
         * Returns:
         *   The footpoint latitude, in radians.
         *
         */

        var y_,
            alpha_,
            beta_,
            gamma_,
            delta_,
            epsilon_,
            n,
            footpointLatitude;

        /* Precalculate n (Eq. 10.18) */
        n = (ELLIPSOID_MODEL_MAJOR_AXIS - ELLIPSOID_MODEL_MINOR_AXIS) / (ELLIPSOID_MODEL_MAJOR_AXIS + ELLIPSOID_MODEL_MINOR_AXIS);

        /* Precalculate alpha_ (Eq. 10.22) */
        /* (Same as alpha in Eq. 10.17) */
        alpha_ = ((ELLIPSOID_MODEL_MAJOR_AXIS + ELLIPSOID_MODEL_MINOR_AXIS) / 2.0) * (1 + (Math.pow(n, 2.0) / 4) + (Math.pow(n, 4.0) / 64));

        /* Precalculate y_ (Eq. 10.23) */
        y_ = y / alpha_;

        /* Precalculate beta_ (Eq. 10.22) */
        beta_ = (3.0 * n / 2.0) + (-27.0 * Math.pow(n, 3.0) / 32.0) + (269.0 * Math.pow(n, 5.0) / 512.0);

        /* Precalculate gamma_ (Eq. 10.22) */
        gamma_ = (21.0 * Math.pow(n, 2.0) / 16.0) + (-55.0 * Math.pow(n, 4.0) / 32.0);

        /* Precalculate delta_ (Eq. 10.22) */
        delta_ = (151.0 * Math.pow(n, 3.0) / 96.0) + (-417.0 * Math.pow(n, 5.0) / 128.0);

        /* Precalculate epsilon_ (Eq. 10.22) */
        epsilon_ = (1097.0 * Math.pow(n, 4.0) / 512.0);

        /* Now calculate the sum of the series (Eq. 10.21) */
        footpointLatitude = y_ + (beta_ * Math.sin(2.0 * y_)) + (gamma_ * Math.sin(4.0 * y_)) + (delta_ * Math.sin(6.0 * y_)) + (epsilon_ * Math.sin(8.0 * y_));

        return footpointLatitude;
    }

    function mapLatLonToXY(phi, lambda, lambda0) {

        /*
         * MapLatLonToXY
         *
         * Converts a latitude/longitude pair to x and y coordinates in the
         * Transverse Mercator projection.  Note that Transverse Mercator is not
         * the same as UTM; a scale factor is required to convert between them.
         *
         * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
         * GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
         *
         * Inputs:
         *    phi - Latitude of the point, in radians.
         *    lambda - Longitude of the point, in radians.
         *    lambda0 - Longitude of the central meridian to be used, in radians.
         *
         * Returns:
         *    xy - A 2-element array containing the x and y coordinates
         *         of the computed point.
         *
         */

        var N,
            nu2,
            ep2,
            t,
            t2,
            l,
            l3coef,
            l4coef,
            l5coef,
            l6coef,
            l7coef,
            l8coef,
            tmp,
            xy;

        xy = new Array(2);

        /* Precalculate ep2 */
        ep2 = (Math.pow(ELLIPSOID_MODEL_MAJOR_AXIS, 2.0) - Math.pow(ELLIPSOID_MODEL_MINOR_AXIS, 2.0)) / Math.pow(ELLIPSOID_MODEL_MINOR_AXIS, 2.0);

        /* Precalculate nu2 */
        nu2 = ep2 * Math.pow(Math.cos(phi), 2.0);

        /* Precalculate N */
        N = Math.pow(ELLIPSOID_MODEL_MAJOR_AXIS, 2.0) / (ELLIPSOID_MODEL_MINOR_AXIS * Math.sqrt(1 + nu2));

        /* Precalculate t */
        t = Math.tan(phi);
        t2 = t * t;
        tmp = (t2 * t2 * t2) - Math.pow(t, 6.0);

        /* Precalculate l */
        l = lambda - lambda0;

        /* Precalculate coefficients for l**n in the equations below
           so a normal human being can read the expressions for easting
           and northing
           -- l**1 and l**2 have coefficients of 1.0 */
        l3coef = 1.0 - t2 + nu2;

        l4coef = 5.0 - t2 + 9 * nu2 + 4.0 * (nu2 * nu2);

        l5coef = 5.0 - 18.0 * t2 + (t2 * t2) + 14.0 * nu2 - 58.0 * t2 * nu2;

        l6coef = 61.0 - 58.0 * t2 + (t2 * t2) + 270.0 * nu2 - 330.0 * t2 * nu2;

        l7coef = 61.0 - 479.0 * t2 + 179.0 * (t2 * t2) - (t2 * t2 * t2);

        l8coef = 1385.0 - 3111.0 * t2 + 543.0 * (t2 * t2) - (t2 * t2 * t2);

        /* Calculate easting (x) */
        xy[0] = N * Math.cos(phi) * l + (N / 6.0 * Math.pow(Math.cos(phi), 3.0) * l3coef * Math.pow(l, 3.0)) + (N / 120.0 * Math.pow(Math.cos(phi), 5.0) * l5coef * Math.pow(l, 5.0)) + (N / 5040.0 * Math.pow(Math.cos(phi), 7.0) * l7coef * Math.pow(l, 7.0));

        /* Calculate northing (y) */
        xy[1] = arcLengthOfMeridian(phi) + (t / 2.0 * N * Math.pow(Math.cos(phi), 2.0) * Math.pow(l, 2.0)) + (t / 24.0 * N * Math.pow(Math.cos(phi), 4.0) * l4coef * Math.pow(l, 4.0)) + (t / 720.0 * N * Math.pow(Math.cos(phi), 6.0) * l6coef * Math.pow(l, 6.0)) + (t / 40320.0 * N * Math.pow(Math.cos(phi), 8.0) * l8coef * Math.pow(l, 8.0));

        return xy;
    }

    function mapXYToLatLon(x, y, lambda0) {

        /*
         * MapXYToLatLon
         *
         * Converts x and y coordinates in the Transverse Mercator projection to
         * a latitude/longitude pair.  Note that Transverse Mercator is not
         * the same as UTM; a scale factor is required to convert between them.
         *
         * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
         *   GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
         *
         * Inputs:
         *   x - The easting of the point, in meters.
         *   y - The northing of the point, in meters.
         *   lambda0 - Longitude of the central meridian to be used, in radians.
         *
         * Returns:
         *   philambda - A 2-element containing the latitude and longitude
         *               in radians.
         *
         * Remarks:
         *   The local variables Nf, nuf2, tf, and tf2 serve the same purpose as
         *   N, nu2, t, and t2 in MapLatLonToXY, but they are computed with respect
         *   to the footpoint latitude phif.
         *
         *   x1frac, x2frac, x2poly, x3poly, etc. are to enhance readability and
         *   to optimize computations.
         *
         */

        var phif,
            Nf,
            Nfpow,
            nuf2,
            ep2,
            tf,
            tf2,
            tf4,
            cf,
            x1frac,
            x2frac,
            x3frac,
            x4frac,
            x5frac,
            x6frac,
            x7frac,
            x8frac,
            x2poly,
            x3poly,
            x4poly,
            x5poly,
            x6poly,
            x7poly,
            x8poly,
            philambda;

        philambda = [];

        /* Get the value of phif, the footpoint latitude. */
        phif = footpointLatitude(y);

        /* Precalculate ep2 */
        ep2 = (Math.pow(ELLIPSOID_MODEL_MAJOR_AXIS, 2.0) - Math.pow(ELLIPSOID_MODEL_MINOR_AXIS, 2.0)) / Math.pow(ELLIPSOID_MODEL_MINOR_AXIS, 2.0);

        /* Precalculate cos (phif) */
        cf = Math.cos(phif);

        /* Precalculate nuf2 */
        nuf2 = ep2 * Math.pow(cf, 2.0);

        /* Precalculate Nf and initialize Nfpow */
        Nf = Math.pow(ELLIPSOID_MODEL_MAJOR_AXIS, 2.0) / (ELLIPSOID_MODEL_MINOR_AXIS * Math.sqrt(1 + nuf2));
        Nfpow = Nf;

        /* Precalculate tf */
        tf = Math.tan(phif);
        tf2 = tf * tf;
        tf4 = tf2 * tf2;

        /* Precalculate fractional coefficients for x**n in the equations
            below to simplify the expressions for latitude and longitude. */
        x1frac = 1.0 / (Nfpow * cf);

        Nfpow *= Nf; /* now equals Nf**2) */
        x2frac = tf / (2.0 * Nfpow);

        Nfpow *= Nf; /* now equals Nf**3) */
        x3frac = 1.0 / (6.0 * Nfpow * cf);

        Nfpow *= Nf; /* now equals Nf**4) */
        x4frac = tf / (24.0 * Nfpow);

        Nfpow *= Nf; /* now equals Nf**5) */
        x5frac = 1.0 / (120.0 * Nfpow * cf);

        Nfpow *= Nf; /* now equals Nf**6) */
        x6frac = tf / (720.0 * Nfpow);

        Nfpow *= Nf; /* now equals Nf**7) */
        x7frac = 1.0 / (5040.0 * Nfpow * cf);

        Nfpow *= Nf; /* now equals Nf**8) */
        x8frac = tf / (40320.0 * Nfpow);

        /* Precalculate polynomial coefficients for x**n.
            -- x**1 does not have a polynomial coefficient. */
        x2poly = -1.0 - nuf2;

        x3poly = -1.0 - 2 * tf2 - nuf2;

        x4poly = 5.0 + 3.0 * tf2 + 6.0 * nuf2 - 6.0 * tf2 * nuf2 - 3.0 * (nuf2 * nuf2) - 9.0 * tf2 * (nuf2 * nuf2);

        x5poly = 5.0 + 28.0 * tf2 + 24.0 * tf4 + 6.0 * nuf2 + 8.0 * tf2 * nuf2;

        x6poly = -61.0 - 90.0 * tf2 - 45.0 * tf4 - 107.0 * nuf2 + 162.0 * tf2 * nuf2;

        x7poly = -61.0 - 662.0 * tf2 - 1320.0 * tf4 - 720.0 * (tf4 * tf2);

        x8poly = 1385.0 + 3633.0 * tf2 + 4095.0 * tf4 + 1575 * (tf4 * tf2);

        /* Calculate latitude */
        philambda[0] = phif + x2frac * x2poly * (x * x) + x4frac * x4poly * Math.pow(x, 4.0) + x6frac * x6poly * Math.pow(x, 6.0) + x8frac * x8poly * Math.pow(x, 8.0);

        /* Calculate longitude */
        philambda[1] = lambda0 + x1frac * x + x3frac * x3poly * Math.pow(x, 3.0) + x5frac * x5poly * Math.pow(x, 5.0) + x7frac * x7poly * Math.pow(x, 7.0);

        return philambda;
    }

    return iface;
})();

function UTM(latitude, longitude) {
    var zone,
        xy;

    longitude = parseFloat(longitude);
    latitude  = parseFloat(latitude);
    zone      = Math.floor((longitude + 180.0) / 6) + 1;
    xy        = Geomath.latLonToUTMXY(Geomath.degToRad(latitude), Geomath.degToRad(longitude), zone);

    this.lngZone = zone;
    this.easting = xy[0];
    this.northing = xy[1];
    this.hemisphere = latitude < 0 ? "S" : "N";
}

function LL(easting, northing, zone, hemisphere) {
    var latlon;

    latlon = Geomath.utmXYToLatLon(parseFloat(easting), parseFloat(northing), parseFloat(zone), (hemisphere === "S"));

    this.longitude = Geomath.radToDeg(latlon[1]);
    this.latitude  = Geomath.radToDeg(latlon[0]);
}

var Geoconvert = {
    convertDMStoDD: function(dir, deg, min, sec) {

        if (((dir === "N") || (dir === "S")) && Math.abs(deg) > 90) {
            throw "Latitude out of range (-90 to 90)";
        }
        else if (Math.abs(deg) > 180) {
            throw "Longitude out of range (-180 to 180)";
        }

        if (dir === "S" || dir === "W") {
            deg = -deg;
            min = -min;
            sec = -sec;
        }

        deg = deg + min/60 + sec/3600;

        return deg;
    },
    convertDDtoDMS: function(decimal, optionalMaxDecimalPlaces) {
        var deg,
            min,
            sec;

        decimal = Math.abs( Math.round(decimal * 1000000000.0));

        deg = Math.floor(decimal/1000000000);
        min = Math.floor(((decimal/1000000000)-deg)*60);
        sec = Math.floor(((((decimal/1000000000)-Math.floor(decimal/1000000000))*60)-min)*100000000)*60/100000000;
        if (optionalMaxDecimalPlaces) {
            sec = Number(sec.toFixed(optionalMaxDecimalPlaces));
        }
        return (deg+"°"+min+"'"+sec+'"');
    },
    convertLatLngToUtm: function(latitude, longitude, optionalMaxDecimalPlaces) {
        var utm;

        utm = new UTM(latitude, longitude);
        return {
            "northing": utm.northing.toFixed(optionalMaxDecimalPlaces).toString(),
            "easting" : utm.easting.toFixed(optionalMaxDecimalPlaces).toString(),
            "lngZone" : utm.lngZone,
            "hemisphere" : utm.hemisphere
        }
    }
};