from django.shortcuts import render, redirect
from .models import *
from .forms import *
from django.contrib import messages
from datetime import datetime
import socket
from ldap3 import Server, Connection, SAFE_SYNC
server = Server('toshiba-tsip.com')

def login(request):
	form = CustomAuthForm(request.POST or None)
	if request.method=='POST' and form.is_valid():
		username = form.cleaned_data.get('username')
		userid = "@toshiba-tsip.com"
		my_user = username + userid
		password = form.cleaned_data.get('password')
		flag=0
		try:
			conn = Connection(server, my_user, password, client_strategy=SAFE_SYNC, auto_bind=True)
			flag=1
			criteria = ('(&(objectClass=user)(sAMAccountName=%s))' % username).encode('utf8')
			entries = conn.extend.standard.paged_search("dc=toshiba-tsip,dc=com",criteria,attributes=['department','mail'], paged_size=5,generator=False)
			print(entries[3]['attributes']['mail'])
			now = datetime.now()
			dt_string = now.strftime("%d-%m-%Y")
			#print(dt_string)
			hostname=socket.gethostname()   
			IPAddr=socket.gethostbyname(hostname)    
			#print("Your Computer IP Address is:"+IPAddr) 
			history = LogsData(username=username,Date=dt_string,Month=now.month,IPAddress=IPAddr)
			history.save()
		except:
			users = Users.objects.all().values_list('username','password')
			for i in range(len(users)):
				if users[i][0] == username and users[i][1]==password:
					flag=1
					break
		if flag == 0:
			messages.info(request,"Invalid User Credentials")
		else:
			#request.session['username'] = username
			if username == "yuji.kyoya@toshiba.co.jp":
				request.session['username'] = "yuji.kyoya@toshiba.co.jp"
			elif username == "adminstrator":
				request.session['username'] = "adminstrator"	
			elif username == "nithyax":
				request.session['username'] = "nithyax"				
			else:
				request.session['username'] = entries[3]['attributes']['mail'].lower()
			uname=request.session['username']
			uname=uname.split('@')[0]
			request.session['username1']=uname			
			role = Permissions.objects.values_list('roles', flat=True).filter(username__exact = username)
			if role:
				request.session[(role[0])]= role[0]
			return redirect("/")

	return render(request, "registration/login.html", {"form":form})

def logout(request):
	request.session.flush()
	return redirect("/login")