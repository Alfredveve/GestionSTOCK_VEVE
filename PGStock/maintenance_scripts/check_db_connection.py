import os
import psycopg2
from decouple import config

def test_connection():
    print("--- Diagnostic de Connexion PostgreSQL ---")
    
    # Lecture des variables depuis .env
    db_name = config('DB_NAME', default=None)
    db_user = config('DB_USER', default=None)
    db_password = config('DB_PASSWORD', default=None)
    db_host = config('DB_HOST', default='localhost')
    db_port = config('DB_PORT', default='5432')
    
    if not db_name:
        print("[ERREUR] La variable DB_NAME n'est pas définie dans votre fichier .env")
        return

    print(f"Tentative de connexion à: {db_name} sur {db_host}:{db_port} avec l'utilisateur {db_user}...")
    
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port,
            connect_timeout=3
        )
        print("[SUCCÈS] Connexion établie avec succès à PostgreSQL !")
        conn.close()
        
        print("\nVérification via Django...")
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PGStock.settings')
        django.setup()
        from django.db import connection
        connection.ensure_connection()
        print("[SUCCÈS] Django arrive également à communiquer avec la base de données.")
        
    except psycopg2.OperationalError as e:
        print(f"\n[ERREUR] Impossible de se connecter à PostgreSQL.")
        print(f"Détails : {e}")
        print("\nConseils :")
        print("1. Vérifiez que le service PostgreSQL est lancé (Gestionnaire des tâches > Services).")
        print("2. Vérifiez que le mot de passe dans le .env est correct.")
        print(f"3. Vérifiez que la base de données '{db_name}' a bien été créée dans pgAdmin.")
    except Exception as e:
        print(f"\n[ERREUR INCONNUE] {e}")

if __name__ == "__main__":
    test_connection()
