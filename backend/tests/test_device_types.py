"""Device type classification (screen vs no screen) on production-style type names."""
from backend.device_types import has_screen, type_kind


def test_production_type_names():
    assert has_screen("Soundbox LED Screen (Wifi + 4G only)") is True
    # "None LED Screen" is a no-screen product even though the name contains "Screen"
    assert has_screen("Soundbox None LED Screen (Wifi + 4G only)") is False
    assert has_screen("Soundbox None LED Screen (4G only)") is False


def test_legacy_type_names():
    assert has_screen("Display Soundbox", "Y6B") is True
    assert has_screen("Display Soundbox (Screen QR)") is True
    assert has_screen("Standard Soundbox (Printed QR)") is False
    assert has_screen("Standard Soundbox", "Q3") is False


def test_unknown_text_has_no_kind():
    assert type_kind("") is None
    assert type_kind("Some other hardware") is None
    assert has_screen(None) is False
