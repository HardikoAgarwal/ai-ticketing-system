from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        AUTHOR = "AUTHOR", "Author"
        ADMIN = "ADMIN", "Admin"

    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.AUTHOR, db_index=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    @property
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN

    @property
    def is_author(self) -> bool:
        return self.role == self.Role.AUTHOR

    @property
    def first_name_display(self) -> str:
        return self.full_name.split(" ")[0] if self.full_name else ""


class AuthorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="author_profile")
    author_code = models.CharField(max_length=20, unique=True)
    phone = models.CharField(max_length=30, blank=True)
    city = models.CharField(max_length=80, blank=True)
    joined_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.author_code} - {self.user.full_name}"
