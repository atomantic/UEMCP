"""
Unit tests for audio operations.

Tests constants and pure Python validation logic without requiring Unreal Engine.
"""

import os
import sys
from unittest.mock import MagicMock

import pytest

if "unreal" not in sys.modules:
    mock_unreal = MagicMock()
    sys.modules["unreal"] = mock_unreal
else:
    mock_unreal = sys.modules["unreal"]

plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


class TestSupportedAudioExtensions:
    """Test _SUPPORTED_AUDIO_EXTENSIONS constant."""

    def test_is_set(self):
        from ops.audio import _SUPPORTED_AUDIO_EXTENSIONS

        assert isinstance(_SUPPORTED_AUDIO_EXTENSIONS, set)

    def test_contains_wav(self):
        from ops.audio import _SUPPORTED_AUDIO_EXTENSIONS

        assert ".wav" in _SUPPORTED_AUDIO_EXTENSIONS

    def test_contains_mp3(self):
        from ops.audio import _SUPPORTED_AUDIO_EXTENSIONS

        assert ".mp3" in _SUPPORTED_AUDIO_EXTENSIONS

    def test_contains_ogg(self):
        from ops.audio import _SUPPORTED_AUDIO_EXTENSIONS

        assert ".ogg" in _SUPPORTED_AUDIO_EXTENSIONS

    def test_contains_flac(self):
        from ops.audio import _SUPPORTED_AUDIO_EXTENSIONS

        assert ".flac" in _SUPPORTED_AUDIO_EXTENSIONS

    def test_contains_aiff_variants(self):
        from ops.audio import _SUPPORTED_AUDIO_EXTENSIONS

        assert ".aiff" in _SUPPORTED_AUDIO_EXTENSIONS
        assert ".aif" in _SUPPORTED_AUDIO_EXTENSIONS

    def test_all_lowercase(self):
        from ops.audio import _SUPPORTED_AUDIO_EXTENSIONS

        for ext in _SUPPORTED_AUDIO_EXTENSIONS:
            assert ext == ext.lower(), f"Extension should be lowercase: {ext}"

    def test_all_start_with_dot(self):
        from ops.audio import _SUPPORTED_AUDIO_EXTENSIONS

        for ext in _SUPPORTED_AUDIO_EXTENSIONS:
            assert ext.startswith("."), f"Extension should start with dot: {ext}"


class TestMetasoundTypes:
    """Test _METASOUND_TYPES constant."""

    def test_is_dict(self):
        from ops.audio import _METASOUND_TYPES

        assert isinstance(_METASOUND_TYPES, dict)

    def test_has_source(self):
        from ops.audio import _METASOUND_TYPES

        assert "source" in _METASOUND_TYPES
        assert _METASOUND_TYPES["source"] == "MetaSoundSource"

    def test_has_patch(self):
        from ops.audio import _METASOUND_TYPES

        assert "patch" in _METASOUND_TYPES
        assert _METASOUND_TYPES["patch"] == "MetaSoundPatch"


class TestValidateAudioExtension:
    """Test _validate_audio_extension pure logic."""

    def test_wav_accepted(self):
        from ops.audio import _validate_audio_extension

        result = _validate_audio_extension("sounds/theme.wav")
        assert result == ".wav"

    def test_mp3_accepted(self):
        from ops.audio import _validate_audio_extension

        result = _validate_audio_extension("track.mp3")
        assert result == ".mp3"

    def test_uppercase_normalized(self):
        from ops.audio import _validate_audio_extension

        result = _validate_audio_extension("file.WAV")
        assert result == ".wav"

    def test_unsupported_extension_raises(self):
        from ops.audio import _validate_audio_extension
        from utils.error_handling import ProcessingError

        with pytest.raises(ProcessingError):
            _validate_audio_extension("video.mp4")

    def test_no_extension_raises(self):
        from ops.audio import _validate_audio_extension
        from utils.error_handling import ProcessingError

        with pytest.raises(ProcessingError):
            _validate_audio_extension("no_extension")
