import pytest

from apps.tickets import services as ticket_services
from apps.workspaces.models import Invite, Membership, Role

from .conftest import make_user, url


@pytest.fixture
def admin(ws):
    return make_user("admin@acme.test", "Ada Admin", ws, Role.ADMIN)


def _member_url(ws, user):
    return url(ws, f"members/{user.id}/")


def test_owner_changes_agent_to_admin_and_back(client_for, ws, owner, agent):
    owner_client = client_for(owner)
    resp = owner_client.patch(_member_url(ws, agent), {"role": "ADMIN"}, format="json")
    assert resp.status_code == 200 and resp.data["role"] == "ADMIN"
    assert Membership.objects.get(workspace=ws, user=agent).role == Role.ADMIN
    assert owner_client.patch(_member_url(ws, agent), {"role": "AGENT"}, format="json").data["role"] == "AGENT"


def test_role_can_only_be_admin_or_agent(client_for, ws, owner, agent):
    for bad in ("OWNER", "REQUESTER", "nonsense"):
        assert client_for(owner).patch(_member_url(ws, agent), {"role": bad}, format="json").status_code == 400


def test_admin_cannot_change_roles_but_can_remove_agents(client_for, ws, admin, agent):
    assert client_for(admin).patch(_member_url(ws, agent), {"role": "ADMIN"}, format="json").status_code == 403
    assert client_for(admin).delete(_member_url(ws, agent)).status_code == 204
    assert not Membership.objects.filter(workspace=ws, user=agent).exists()


def test_admin_cannot_remove_another_admin(client_for, ws, admin):
    other = make_user("admin2@acme.test", "Bo Admin", ws, Role.ADMIN)
    assert client_for(admin).delete(_member_url(ws, other)).status_code == 403
    assert client_for(make_user("o2@acme.test", "Second Owner", ws, Role.OWNER)).delete(_member_url(ws, other)).status_code == 204


def test_agents_cannot_manage_the_team(client_for, ws, agent, admin):
    assert client_for(agent).patch(_member_url(ws, admin), {"role": "AGENT"}, format="json").status_code == 403
    assert client_for(agent).delete(_member_url(ws, admin)).status_code == 403


def test_owner_and_self_are_protected(client_for, ws, owner, admin):
    assert client_for(admin).delete(_member_url(ws, owner)).status_code == 403
    assert client_for(owner).delete(_member_url(ws, owner)).status_code == 403
    assert client_for(owner).patch(_member_url(ws, owner), {"role": "AGENT"}, format="json").status_code == 403
    assert client_for(admin).delete(_member_url(ws, admin)).status_code == 403


def test_customers_are_not_managed_here(client_for, ws, owner, customer):
    assert client_for(owner).delete(_member_url(ws, customer)).status_code == 403


def test_cannot_reach_another_workspaces_members(client_for, ws, other_ws, owner, outsider):
    assert client_for(owner).delete(url(ws, f"members/{outsider.id}/")).status_code == 404


def test_removing_a_member_unassigns_their_open_tickets(client_for, ws, owner, agent, customer):
    ticket = ticket_services.create_ticket(workspace=ws, requester=customer, subject="Help", description="Please help me with billing")
    resp = client_for(owner).patch(url(ws, f"tickets/{ticket.id}/"), {"assigned_to": agent.id}, format="json")
    assert resp.status_code == 200
    assert client_for(owner).delete(_member_url(ws, agent)).status_code == 204
    ticket.refresh_from_db()
    assert ticket.assigned_to is None
    assert ticket.activities.filter(to_value="Unassigned").exists()


def test_team_changes_are_blocked_in_demo_workspaces(client_for, ws, owner, agent):
    ws.is_demo = True
    ws.save(update_fields=["is_demo"])
    assert client_for(owner).delete(_member_url(ws, agent)).status_code == 403
    assert client_for(owner).patch(_member_url(ws, agent), {"role": "ADMIN"}, format="json").status_code == 403


def test_revoke_invite(client_for, ws, owner, agent):
    invite = Invite.objects.create(workspace=ws, email="new@acme.test", role=Role.AGENT, token="tok123", invited_by=owner)
    assert client_for(agent).delete(url(ws, f"invites/{invite.id}/")).status_code == 403
    assert client_for(owner).delete(url(ws, f"invites/{invite.id}/")).status_code == 204
    assert not Invite.objects.filter(pk=invite.pk).exists()
    assert client_for(owner).get(url(ws, "invites/")).data == []
