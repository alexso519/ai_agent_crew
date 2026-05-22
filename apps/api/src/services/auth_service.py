from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.security import create_access_token, get_password_hash, verify_password
from db.models.user import User
from models.enums import UserRole
from schemas.auth import RegisterRequest


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def get_user_by_id(self, user_id: UUID) -> User | None:
        return self.db.get(User, user_id)

    def register(self, payload: RegisterRequest, *, role: UserRole = UserRole.VIEWER) -> User:
        existing = self.get_user_by_email(payload.email)
        if existing is not None:
            raise ValueError("Email already registered")

        user = User(
            email=payload.email.lower(),
            hashed_password=get_password_hash(payload.password),
            full_name=payload.full_name,
            role=role,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def authenticate(self, email: str, password: str) -> User | None:
        user = self.get_user_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            return None
        return user

    def issue_token(self, user: User) -> str:
        return create_access_token(user.id, user.role)

    def ensure_bootstrap_admin(self) -> None:
        """Create default admin when no users exist (local dev bootstrap)."""
        if self.db.scalar(select(User).limit(1)) is not None:
            return
        self.register(
            RegisterRequest(
                email="admin@crewcc.com",
                password="Admin123!ChangeMe",
                full_name="System Administrator",
            ),
            role=UserRole.ADMIN,
        )
