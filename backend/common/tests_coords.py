"""Unit tests for WGS84 coordinate coercion."""

from decimal import Decimal

from django.test import SimpleTestCase

from common.coords import quantize_coord


class QuantizeCoordTests(SimpleTestCase):
    def test_blank_values_return_none(self):
        self.assertIsNone(quantize_coord(None))
        self.assertIsNone(quantize_coord(""))

    def test_pads_to_six_decimal_places(self):
        self.assertEqual(quantize_coord("-22.56"), Decimal("-22.560000"))
        self.assertEqual(quantize_coord(0), Decimal("0.000000"))

    def test_rounds_half_up_to_six_decimal_places(self):
        self.assertEqual(quantize_coord(17.0836775), Decimal("17.083678"))
        self.assertEqual(quantize_coord(Decimal("-22.5700005")), Decimal("-22.570001"))

    def test_accepts_padded_strings(self):
        self.assertEqual(quantize_coord("  17.083678  "), Decimal("17.083678"))

    def test_rejects_non_numeric_input(self):
        for value in ("abc", "17,08", [17.08], object()):
            with self.assertRaises(ValueError):
                quantize_coord(value)

    def test_rejects_non_finite_input(self):
        for value in (float("nan"), float("inf"), "-Infinity"):
            with self.assertRaises(ValueError):
                quantize_coord(value)
