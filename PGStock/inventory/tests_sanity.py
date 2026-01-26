from django.test import TestCase

class SanityCheckTest(TestCase):
    def test_basic_addition(self):
        self.assertEqual(1 + 1, 2)
