from django.urls import path

from . import views

app_name = "register"

urlpatterns = [
    path("login/", views.login, name="login"),
    path("logout/", views.logout, name="logout"),
    path("api/auth/session/validate/", views.validate_session_token, name="validate_session_token"),
]
