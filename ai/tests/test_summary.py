from aangan_ai.summary import _distinct, _untag


def test_distinct_drops_a_point_repeated_in_other_words():
    lines = [
        "पापा ने रविवार के लंच के बारे में पूछा।",
        "अर्जुन ने कहा कि वह आपको रविवार को 11 बजे पिक करेगा।",
        "अर्जुन ने आपसे कहा कि वह रविवार को 11 बजे आपको पिक करेगा।",
    ]
    assert _distinct(lines) == lines[:2]


def test_distinct_keeps_different_points():
    lines = ["Papa asked about lunch on Sunday.", "Arjun will pick you up at 11.", "Meera is coming."]
    assert _distinct(lines) == lines


def test_untag_removes_the_scam_marker():
    assert "SCAM" not in _untag("[SCAM RISK] Papa got a fake SMS")
