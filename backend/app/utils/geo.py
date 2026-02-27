"""
Shared utility helpers used across services and routes.
"""

from geoalchemy2.elements import WKTElement


def point_to_wkt(lat: float, lng: float) -> WKTElement:
    """Convert lat/lng to a PostGIS GEOGRAPHY(Point) WKT element."""
    return WKTElement(f"POINT({lng} {lat})", srid=4326)


def wkb_to_latlon(wkb_element) -> tuple[float, float]:
    """
    Extract (lat, lng) from a GeoAlchemy2 WKBElement.
    Falls back to (0, 0) if parsing fails.
    """
    try:
        from shapely import wkb
        point = wkb.loads(bytes(wkb_element.data))
        return (point.y, point.x)
    except Exception:
        return (0.0, 0.0)
