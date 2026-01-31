from django.contrib.auth.models import User
try:
    print("RELATIONS:")
    for r in User._meta.related_objects:
        print(f"Name: {r.name}, Model: {r.related_model.__name__}")
except Exception as e:
    print(e)
