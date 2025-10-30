from django import forms
from .models import *
from django.contrib.auth.forms import AuthenticationForm
from django.forms.widgets import PasswordInput, TextInput



class CustomAuthForm(forms.Form):
    username = forms.CharField(widget=TextInput(attrs={'class':'validate','placeholder': 'Username'}))
    password = forms.CharField(widget=PasswordInput(attrs={'placeholder':'Password'}))