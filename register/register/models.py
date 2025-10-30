from django.db import models

class Permissions(models.Model):
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=20)
    roles = models.CharField(max_length=30)

class Users(models.Model):
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=20)
    password = models.CharField(max_length=30)

class LogsData(models.Model):
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=20)
    Date = models.CharField(max_length=30)
    Month = models.CharField(max_length=30)
    IPAddress = models.CharField(max_length=30)

    # def set_password(self, raw_password):
    #     import random
    #     algo = 'sha1'
    #     salt = get_hexdigest(algo, str(random.random()), str(random.random()))[:5]
    #     hsh = get_hexdigest(algo, salt, raw_password)
    #     self.password = '%s$%s$%s' % (algo, salt, hsh)
