from fastapi.testclient import TestClient
from src.app import app
from urllib.parse import quote

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = quote("Chess Club", safe="")
    email = "pytest-temp@example.com"

    # Ensure not present initially
    resp0 = client.get("/activities")
    assert resp0.status_code == 200
    participants0 = resp0.json()["Chess Club"]["participants"]
    if email in participants0:
        # ensure a clean state
        client.delete(f"/activities/{activity}/unregister?email={quote(email, safe='')}")

    # Signup
    signup = client.post(f"/activities/{activity}/signup?email={quote(email, safe='')}")
    assert signup.status_code == 200
    assert "Signed up" in signup.json().get("message", "")

    # Confirm participant added
    after = client.get("/activities").json()
    assert email in after["Chess Club"]["participants"]

    # Duplicate signup should fail
    dup = client.post(f"/activities/{activity}/signup?email={quote(email, safe='')}")
    assert dup.status_code == 400

    # Unregister
    unreg = client.delete(f"/activities/{activity}/unregister?email={quote(email, safe='')}")
    assert unreg.status_code == 200
    assert "Unregistered" in unreg.json().get("message", "")

    # Confirm removed
    final = client.get("/activities").json()
    assert email not in final["Chess Club"]["participants"]


def test_unregister_not_registered_returns_400():
    activity = quote("Chess Club", safe="")
    email = "nonexistent@example.com"
    resp = client.delete(f"/activities/{activity}/unregister?email={quote(email, safe='')}")
    assert resp.status_code == 400
