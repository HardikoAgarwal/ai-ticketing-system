def staff_group(workspace_id: int) -> str:
    return f"ws{workspace_id}_staff"


def user_group(workspace_id: int, user_id: int) -> str:
    return f"ws{workspace_id}_user{user_id}"
