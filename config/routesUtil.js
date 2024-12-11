const googleMapsClient = require('@google/maps').createClient({
    key: process.env.GOOGLE_MAPS_API_KEY,
    Promise: Promise,
});

async function calculateOptimizedRoute(waypoints) {
    const response = await googleMapsClient.directions({
        origin: waypoints[0],
        destination: waypoints[waypoints.length - 1],
        waypoints: waypoints.slice(1, -1),
        optimize: true,
    }).asPromise();

    return response.json.routes[0].legs.map(leg => ({
        start: leg.start_address,
        end: leg.end_address,
        distance: leg.distance.text,
        duration: leg.duration.text,
    }));
}

module.exports = { calculateOptimizedRoute };
