"""Unit tests for community group tag input parsing."""

from django.test import SimpleTestCase

from communities.tags_input import parse_group_tag_input
from tags.services import MAX_TAGS_PER_CONTENT


class ParseGroupTagInputTests(SimpleTestCase):
    def test_blank_input_returns_empty_list(self):
        for raw in (None, "", "   ", []):
            self.assertEqual(parse_group_tag_input(raw), [])

    def test_list_input_is_normalized_and_deduplicated(self):
        self.assertEqual(
            parse_group_tag_input(["#Best Time", "besttime", "Food & Drinks", "  "]),
            ["besttime", "fooddrinks"],
        )

    def test_hashtag_text_uses_hashtags_only(self):
        self.assertEqual(
            parse_group_tag_input("Join us #Hiking and #Camping, tomorrow"),
            ["hiking", "camping"],
        )

    def test_comma_separated_text_without_hashtags(self):
        self.assertEqual(
            parse_group_tag_input("Best Time, Food, Best Time"),
            ["besttime", "food"],
        )

    def test_json_array_string_is_parsed(self):
        self.assertEqual(parse_group_tag_input('["Hiking", "#Camping"]'), ["hiking", "camping"])

    def test_malformed_json_array_falls_back_to_raw_text(self):
        self.assertEqual(parse_group_tag_input('["Hiking'), ["hiking"])

    def test_non_string_scalar_is_coerced(self):
        self.assertEqual(parse_group_tag_input(2024), ["2024"])

    def test_caps_list_input_at_the_tag_limit(self):
        raw = [f"tag{i}" for i in range(MAX_TAGS_PER_CONTENT + 3)]
        self.assertEqual(parse_group_tag_input(raw), raw[:MAX_TAGS_PER_CONTENT])

    def test_caps_hashtag_text_at_the_tag_limit(self):
        text = " ".join(f"#tag{i}" for i in range(MAX_TAGS_PER_CONTENT + 3))
        self.assertEqual(len(parse_group_tag_input(text)), MAX_TAGS_PER_CONTENT)
