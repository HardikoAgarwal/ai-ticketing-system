ADMINS_GROUP = "admins"


def author_group(user_id: int) -> str:
    return f"author_{user_id}"
