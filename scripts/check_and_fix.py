import os
from django.contrib.auth.models import User
from inventory.models import PointOfSale, UserProfile

output_file = 'C:/Users/codeshester0011/Desktop/check_pos_status.txt'

try:
    with open(output_file, 'w') as f:
        u = User.objects.get(username='codeshester0011')
        f.write(f"Checking user: {u.username}\n")
        
        # Ensure profile exists
        profile, created = UserProfile.objects.get_or_create(user=u)
        f.write(f"Profile created: {created}\n")
        
        # Get POS
        p = PointOfSale.objects.get(id=1)
        
        # Assign if not assigned
        if profile.point_of_sale != p:
            f.write(f"Current POS: {profile.point_of_sale}. Updating to {p.name}...\n")
            profile.point_of_sale = p
            profile.save()
            f.write("Updated POS successfully.\n")
        else:
            f.write(f"POS is already correct: {profile.point_of_sale}\n")

        # Verify
        u.refresh_from_db()
        f.write(f"FINAL POS: {u.profile.point_of_sale.name} (ID: {u.profile.point_of_sale.id})\n")

except Exception as e:
    with open(output_file, 'w') as f:
        f.write(f"ERROR: {str(e)}\n")
