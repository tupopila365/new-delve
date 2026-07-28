"""Unit tests for coin-toss proximity helpers."""

import math
from decimal import Decimal

from django.test import SimpleTestCase

from coin_toss.geo import (
    EARTH_RADIUS_MILES,
    bounding_box,
    haversine_miles,
    to_float,
    within_miles,
)

WINDHOEK = (-22.5609, 17.0658)


class ToFloatTests(SimpleTestCase):
    def test_converts_numbers_and_decimals(self):
        self.assertEqual(to_float(Decimal("-22.5609")), -22.5609)
        self.assertEqual(to_float("17.0658"), 17.0658)
        self.assertEqual(to_float(3), 3.0)

    def test_returns_none_for_unusable_values(self):
        for value in (None, "", "abc", [1.0], {}):
            self.assertIsNone(to_float(value))


class HaversineMilesTests(SimpleTestCase):
    def test_same_point_is_zero(self):
        self.assertEqual(haversine_miles(*WINDHOEK, *WINDHOEK), 0.0)

    def test_is_symmetric(self):
        forward = haversine_miles(-22.5609, 17.0658, -22.9576, 14.5053)
        backward = haversine_miles(-22.9576, 14.5053, -22.5609, 17.0658)
        self.assertAlmostEqual(forward, backward, places=9)

    def test_one_degree_of_latitude_is_about_69_miles(self):
        self.assertAlmostEqual(haversine_miles(0.0, 0.0, 1.0, 0.0), 69.09, places=1)

    def test_known_distance_windhoek_to_swakopmund(self):
        # ~160 miles great-circle.
        miles = haversine_miles(-22.5609, 17.0658, -22.6784, 14.5258)
        self.assertAlmostEqual(miles, 161.7, places=0)

    def test_antipodal_points_are_half_the_circumference(self):
        self.assertAlmostEqual(
            haversine_miles(0.0, 0.0, 0.0, 180.0), math.pi * EARTH_RADIUS_MILES, places=3
        )


class BoundingBoxTests(SimpleTestCase):
    def test_box_contains_the_centre(self):
        min_lat, max_lat, min_lon, max_lon = bounding_box(-22.5609, 17.0658, 1.0)
        self.assertLess(min_lat, -22.5609)
        self.assertGreater(max_lat, -22.5609)
        self.assertLess(min_lon, 17.0658)
        self.assertGreater(max_lon, 17.0658)

    def test_latitude_delta_matches_radius(self):
        min_lat, max_lat, _, _ = bounding_box(0.0, 0.0, 69.0)
        self.assertAlmostEqual(max_lat - min_lat, 2.0, places=6)

    def test_longitude_delta_widens_near_the_poles(self):
        _, _, equator_min_lon, equator_max_lon = bounding_box(0.0, 0.0, 10.0)
        _, _, polar_min_lon, polar_max_lon = bounding_box(80.0, 0.0, 10.0)
        self.assertGreater(polar_max_lon - polar_min_lon, equator_max_lon - equator_min_lon)

    def test_longitude_delta_is_bounded_at_the_pole(self):
        _, _, min_lon, max_lon = bounding_box(90.0, 0.0, 1.0)
        self.assertTrue(0 < max_lon - min_lon < 10.0)


class WithinMilesTests(SimpleTestCase):
    def test_close_points_are_within_range(self):
        self.assertTrue(within_miles(-22.5609, 17.0658, -22.5610, 17.0659, 0.15))

    def test_far_points_are_not_within_range(self):
        self.assertFalse(within_miles(-22.5609, 17.0658, -22.6784, 14.5258, 0.15))

    def test_boundary_distance_is_inclusive(self):
        miles = haversine_miles(-22.5609, 17.0658, -22.5709, 17.0658)
        self.assertTrue(within_miles(-22.5609, 17.0658, -22.5709, 17.0658, miles))
